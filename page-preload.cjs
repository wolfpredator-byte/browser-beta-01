'use strict';

/**
 * Script eseguito prima delle pagine web (non della cornice), in un mondo isolato.
 * Agisce SOLO sulle pagine di accesso di Google; su tutti gli altri siti non fa nulla.
 * - Completa l'identità "Firefox" (vedi FIREFOX_UA in lib/web-rules.cjs) togliendo
 *   navigator.userAgentData, che Firefox non ha e che rivelerebbe Chromium.
 * - Nasconde le passkey (WebAuthn): Google prova subito l'accesso con passkey, che
 *   in Electron fallisce con la finestra "Sicurezza di Windows". Senza, Google usa
 *   il flusso classico email + password (+ verifica in due passaggi sul telefono).
 */
const {contextBridge,ipcRenderer}=require('electron');

/**
 * Beta 0.15.1 — notifiche. Electron sa rispondere ai siti solo "concesso" o "negato":
 * per un sito che non hai ancora deciso, Notification.permission diceva "denied" e
 * quasi tutti i siti (che chiedono solo se lo stato è "default") non chiedevano mai.
 * Qui mostriamo alla pagina lo stato vero: "default" finché non decidi; la richiesta
 * vera passa comunque dal dialogo VARCO (lib/permissions.cjs).
 */
if(/^https?:$/.test(location.protocol)){
  let choice='ask';
  try{choice=ipcRenderer.sendSync('varco:notification-permission')||'ask';}catch{}
  contextBridge.executeInMainWorld({args:[choice],func:initial=>{
    const N=window.Notification;
    if(!N)return;
    let current=initial;
    const toWeb={allow:'granted',deny:'denied',ask:'default'};
    try{Object.defineProperty(N,'permission',{get:()=>toWeb[current]||'default',configurable:true});}catch{}
    const request=N.requestPermission.bind(N);
    N.requestPermission=function(callback){
      return request().then(result=>{
        current=result==='granted'?'allow':result==='denied'?'deny':current;
        if(typeof callback==='function')callback(result);
        return result;
      });
    };
    const permissions=navigator.permissions;
    if(permissions?.query){
      const query=permissions.query.bind(permissions);
      permissions.query=descriptor=>query(descriptor).then(status=>{
        if(descriptor?.name==='notifications'&&current==='ask'){
          try{Object.defineProperty(status,'state',{get:()=>toWeb[current]==='default'?'prompt':toWeb[current],configurable:true});}catch{}
        }
        return status;
      });
    }
  }});
}

if(location.hostname==='accounts.google.com'){
  contextBridge.executeInMainWorld({func:()=>{
    try{Object.defineProperty(Navigator.prototype,'userAgentData',{get:()=>undefined,configurable:true});}catch{}
    try{delete window.PublicKeyCredential;}catch{}
    try{
      // navigator.credentials resta (serve anche alle password), ma senza passkey.
      const credentials=navigator.credentials;
      if(credentials){
        const refuse=()=>Promise.reject(new DOMException('Passkey non disponibili in questo browser','NotAllowedError'));
        credentials.get=options=>options&&options.publicKey?refuse():CredentialsContainer.prototype.get.call(credentials,options);
        credentials.create=options=>options&&options.publicKey?refuse():CredentialsContainer.prototype.create.call(credentials,options);
      }
    }catch{}
  }});
}

/**
 * Beta 0.20 — pagina del visualizzatore di file (varco-view://app): due pulsanti che
 * chiedono al browser di aprire il file con il programma predefinito o di mostrarlo
 * nella cartella. Il browser controlla che la richiesta arrivi davvero da lì.
 */
if(location.protocol==='varco-view:'&&location.host==='app'){
  contextBridge.exposeInMainWorld('varcoViewer',{
    openExternal:file=>ipcRenderer.invoke('viewer:action','open',file),
    showInFolder:file=>ipcRenderer.invoke('viewer:action','folder',file)
  });
}

/**
 * Beta 0.25 — password, solo nella pagina principale e solo su https (o localhost):
 * - dopo un accesso manda nome utente e password a VARCO, che chiede con una notifica se salvarli
 *   (lib/passwords.cjs: è VARCO a stabilire il sito, dall'indirizzo vero, non la pagina);
 * - cliccando in un campo di accesso mostra i tuoi account per questo sito. La password arriva
 *   solo quando ne scegli uno con un clic vero.
 * L'elenco sta in uno shadow DOM chiuso: gli script della pagina non possono leggerlo.
 */
if(window.top===window&&(location.protocol==='https:'||
  (location.protocol==='http:'&&/^(localhost|127\.0\.0\.1)$|\.localhost$/.test(location.hostname)))){
  const USER_SELECTOR='input[autocomplete~="username"],input[autocomplete~="email"],input[type="email"],'+
    'input[name*="user" i],input[name*="mail" i],input[name*="login" i],input[id*="user" i],input[id*="mail" i],input[id*="login" i]';
  const NOT_TEXT=['password','hidden','checkbox','radio','submit','button','file','image','reset','range','color','date','number'];
  const visible=el=>!!el&&el.isConnected&&!el.disabled&&el.getClientRects().length>0;
  const isPassword=el=>el instanceof HTMLInputElement&&el.type==='password';
  const scopeOf=el=>el?.form||el?.closest?.('form')||document;
  const textInputs=scope=>[...scope.querySelectorAll('input')].filter(i=>!NOT_TEXT.includes(i.type)&&visible(i));
  const passwordsIn=scope=>[...scope.querySelectorAll('input[type="password"]')].filter(visible);

  /** Il campo del nome utente che va con una password: quello marcato, o il testo subito prima. */
  function usernameFor(pass){
    const inputs=textInputs(scopeOf(pass));
    const before=inputs.filter(i=>i.compareDocumentPosition(pass)&Node.DOCUMENT_POSITION_FOLLOWING).reverse();
    return before.find(i=>i.matches(USER_SELECTOR))||before[0]||inputs.find(i=>i.matches(USER_SELECTOR))||null;
  }

  // ── Dopo un accesso ──────────────────────────────────────────────────
  let lastKey='',lastAt=0;
  function capture(scope){
    const fields=passwordsIn(scope||document).filter(p=>p.value);
    if(!fields.length){
      // Accesso in due passaggi: qui c'è solo il nome utente (la password arriva nella pagina dopo).
      const user=textInputs(scope||document).find(i=>i.value&&i.matches(USER_SELECTOR));
      if(user)ipcRenderer.send('pw:username',user.value.slice(0,200));
      return;
    }
    // Cambio password: conta quella nuova.
    const pass=fields.find(p=>/new-password/.test(p.autocomplete))||fields[0];
    const username=usernameFor(pass)?.value||'';
    const key=username+'\n'+pass.value;
    if(key===lastKey&&Date.now()-lastAt<5000)return;
    lastKey=key;lastAt=Date.now();
    ipcRenderer.send('pw:submitted',{username:username.slice(0,200),password:pass.value});
  }
  document.addEventListener('submit',event=>capture(event.target),true);
  // Molti siti non usano un vero <form>: contano anche il clic sul pulsante e Invio.
  // Solo pulsanti di invio o con testo da accesso: "mostra password" non deve far partire la domanda.
  const LOGIN_WORDS=/accedi|entra|login|log in|sign in|signin|continua|continue|avanti|next|invia|submit|conferma|ok\b/i;
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('button,input[type="submit"],input[type="button"],[role="button"]');
    if(!button)return;
    const submit=button.type==='submit';
    const words=(button.textContent||button.value||button.getAttribute('aria-label')||'').trim();
    if(submit||LOGIN_WORDS.test(words))setTimeout(()=>capture(scopeOf(button)),0);
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&event.target instanceof HTMLInputElement)setTimeout(()=>capture(scopeOf(event.target)),0);
  },true);

  // ── Compilazione ─────────────────────────────────────────────────────
  let accounts=null,host=null,list=null,target=null;
  const getAccounts=async()=>{
    if(accounts===null){try{accounts=await ipcRenderer.invoke('pw:accounts');}catch{accounts=[];}}
    return accounts||[];
  };
  function ensureBox(){
    if(host?.isConnected)return;
    host=document.createElement('varco-passwords');
    host.style.cssText='all:initial;position:fixed;z-index:2147483647;display:none';
    const shadow=host.attachShadow({mode:'closed'});
    const style=document.createElement('style');
    style.textContent=[
      '.box{min-width:220px;max-width:340px;padding:6px;border-radius:12px;background:rgba(14,13,28,.97);color:#ecebf7;',
      'border:1px solid rgba(160,150,255,.3);box-shadow:0 12px 32px rgba(0,0,0,.55);font:13px/1.35 "Segoe UI",system-ui,sans-serif}',
      '.head{padding:4px 8px 6px;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;opacity:.6}',
      'button{display:flex;align-items:center;gap:8px;width:100%;padding:8px;border:0;border-radius:8px;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}',
      'button:hover,button:focus-visible{background:rgba(124,108,255,.22);outline:none}',
      '.key{flex:none;width:22px;height:22px;border-radius:6px;display:grid;place-items:center;background:rgba(124,108,255,.25);font-size:12px}',
      '.name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'].join('');
    list=document.createElement('div');list.className='box';list.setAttribute('role','listbox');
    shadow.append(style,list);
    document.documentElement.appendChild(host);
  }
  function hide(){if(host)host.style.display='none';target=null;}
  function place(){
    if(!target||!host)return;
    if(!visible(target)){hide();return;}
    const r=target.getBoundingClientRect();
    host.style.left=Math.max(4,Math.min(r.left,innerWidth-232))+'px';
    // Sotto il campo; sopra se in fondo alla finestra non c'è posto.
    host.style.top=(r.bottom+6+list.offsetHeight>innerHeight&&r.top>list.offsetHeight+10?r.top-6-list.offsetHeight:r.bottom+6)+'px';
  }
  function setValue(input,value){
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }
  async function fill(id,field){
    hide();
    const r=await ipcRenderer.invoke('pw:fill',id).catch(()=>null);
    if(!r)return;
    const pass=isPassword(field)?field:passwordsIn(scopeOf(field))[0]||null;
    const user=isPassword(field)?usernameFor(field):field;
    if(user&&r.username)setValue(user,r.username);
    if(pass)setValue(pass,r.password);
  }
  async function show(field){
    const found=await getAccounts();
    if(!found.length||document.activeElement!==field)return;
    ensureBox();target=field;
    const head=document.createElement('div');head.className='head';head.textContent='VARCO · account salvati';
    list.replaceChildren(head,...found.map(account=>{
      const b=document.createElement('button');b.type='button';
      const key=document.createElement('span');key.className='key';key.textContent='🔑';
      const name=document.createElement('span');name.className='name';name.textContent=account.username||'(senza nome utente)';
      b.append(key,name);
      b.addEventListener('mousedown',e=>e.preventDefault()); // il campo resta selezionato
      b.addEventListener('click',e=>{if(e.isTrusted)fill(account.id,field);});
      return b;
    }));
    host.style.display='block';
    place();
  }
  /** Campo di accesso: una password, o il nome utente che va con una password (o marcato come tale). */
  function loginField(el){
    if(!(el instanceof HTMLInputElement)||!visible(el))return false;
    if(isPassword(el))return true;
    if(NOT_TEXT.includes(el.type))return false;
    const pass=passwordsIn(scopeOf(el))[0];
    return pass?usernameFor(pass)===el:/username|email/.test(el.autocomplete);
  }
  document.addEventListener('focusin',event=>{if(loginField(event.target))show(event.target);else hide();},true);
  document.addEventListener('focusout',()=>setTimeout(()=>{if(target&&document.activeElement!==target)hide();},150),true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')hide();},true);
  addEventListener('scroll',place,true);
  addEventListener('resize',place);
}

/**
 * Beta 0.27 — anteprima dei link: Shift+clic su un link apre la pagina in un riquadro sopra quella
 * attuale (lib/glance.cjs) invece che in una nuova finestra. Solo nelle pagine web.
 */
if(/^https?:$/.test(location.protocol)){
  document.addEventListener('click',event=>{
    if(!event.shiftKey||event.ctrlKey||event.altKey||event.metaKey||event.button!==0||!event.isTrusted)return;
    const link=event.target?.closest?.('a[href]');
    if(!link)return;
    let url;
    try{url=new URL(link.href,location.href);}catch{return;}
    if(!/^https?:$/.test(url.protocol))return;
    event.preventDefault();event.stopImmediatePropagation();
    ipcRenderer.send('glance:open',url.href);
  },true);
}
