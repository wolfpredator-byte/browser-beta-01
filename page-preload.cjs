'use strict';

/**
 * Script eseguito prima delle pagine web (non della cornice), in un mondo isolato.
 * Agisce SOLO sulle pagine di accesso di Google; su tutti gli altri siti non fa nulla.
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
// Beta 0.35: page-preload gira anche nei riquadri (per il login Google): le notifiche restano solo nella pagina principale, come prima.
if(window.top===window&&/^https?:$/.test(location.protocol)){
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

// Login Google: niente passkey (Beta 0.35: l'identità resta quella originale, vedi lib/web-rules.cjs).
// Senza PublicKeyCredential Google propone la password invece di una passkey che qui non funzionerebbe.
if(window.top===window&&location.hostname==='accounts.google.com'){
  contextBridge.executeInMainWorld({func:()=>{
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
if(window.top===window&&/^https?:$/.test(location.protocol)){
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

// Beta 0.28: "Torna alla scheda" nella finestrella del video. Chromium chiude la finestrella e
// lascia il video in riproduzione (con la × invece lo mette in pausa): in quel caso VARCO mostra la scheda.
document.addEventListener('leavepictureinpicture',event=>{
  const video=event.target;
  setTimeout(()=>{if(video instanceof HTMLVideoElement&&!video.paused&&!video.ended)ipcRenderer.send('pip:back');},120);
},true);

/**
 * Beta 0.37.1 — lettore multimediale di VARCO. In ogni pagina e riquadro (anche pannelli web e widget):
 * - nel mondo della pagina si annotano gli elementi audio/video che partono e le azioni che il sito
 *   dichiara alla Media Session (brano successivo, precedente, salta pubblicità…), con titolo e copertina;
 * - lo stato arriva qui come evento DOM (solo testo) e va al processo principale ('media:state');
 * - i comandi arrivano dal processo principale direttamente nel mondo della pagina
 *   (WebFrameMain.executeJavaScript con il gesto dell'utente) e chiamano window.__varcoMedia.run().
 */
if(/^https?:$/.test(location.protocol)){
  const EV='varco-media-'+Math.random().toString(36).slice(2);
  let last='';
  document.addEventListener(EV,event=>{
    const detail=event.detail;
    if(typeof detail!=='string'||detail.length>20000||detail===last)return;
    last=detail;
    ipcRenderer.send('media:state',detail);
  },true);
  contextBridge.executeInMainWorld({args:[EV],func:EV=>{
    if(window.__varcoMedia)return;
    const els=new Set(),handlers=new Map();
    let primary=null,position=null,timer=null;
    const ms=navigator.mediaSession;
    const queue=()=>{if(!timer)timer=setTimeout(send,150);};
    if(ms){
      const setHandler=ms.setActionHandler.bind(ms);
      ms.setActionHandler=function(action,handler){
        if(typeof handler==='function')handlers.set(action,handler);else handlers.delete(action);
        queue();
        return setHandler(action,handler);
      };
      const proto=Object.getPrototypeOf(ms);
      for(const prop of ['metadata','playbackState']){
        const d=Object.getOwnPropertyDescriptor(proto,prop);
        if(d?.get&&d?.set)try{Object.defineProperty(ms,prop,{configurable:true,get(){return d.get.call(ms);},set(v){d.set.call(ms,v);queue();}});}catch{}
      }
      if(ms.setPositionState){
        const setPosition=ms.setPositionState.bind(ms);
        ms.setPositionState=function(s){position=s?{...s}:null;queue();return setPosition(s);};
      }
    }
    const EVENTS=['play','playing','pause','ended','loadedmetadata','durationchange','ratechange','seeked','volumechange','emptied','enterpictureinpicture','leavepictureinpicture'];
    const onEvent=event=>{if(event.type==='play'||event.type==='playing')primary=event.target;queue();};
    const track=el=>{if(els.has(el))return;els.add(el);for(const type of EVENTS)el.addEventListener(type,onEvent);};
    const play=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(){track(this);primary=this;queue();return play.apply(this,arguments);};
    // Elementi che partono da soli (autoplay) senza chiamare play().
    document.addEventListener('play',event=>{if(event.target instanceof HTMLMediaElement){track(event.target);primary=event.target;queue();}},true);
    function pick(){
      const list=[...els].filter(el=>el.isConnected||!el.paused);
      const playing=list.filter(el=>!el.paused&&!el.ended);
      if(primary&&list.includes(primary)&&(!primary.paused||!playing.length))return primary;
      return playing.sort((a,b)=>(b.duration||0)-(a.duration||0))[0]||null;
    }
    const area=a=>{const m=/(\d+)x(\d+)/.exec(a?.sizes||'');return m?m[1]*m[2]:0;};
    function send(){
      timer=null;
      const el=pick(),md=ms?.metadata||null;
      const art=md?.artwork?.length?[...md.artwork].sort((a,b)=>area(b)-area(a))[0]?.src||'':'';
      const finite=el&&Number.isFinite(el.duration)&&el.duration>0;
      const state={
        has:!!el||!!md?.title,
        playing:el?!el.paused&&!el.ended:ms?.playbackState==='playing',
        title:md?.title||'',artist:md?.artist||'',album:md?.album||'',artwork:art,
        duration:finite?el.duration:(position?.duration||0),
        position:el?el.currentTime:(position?.position||0),
        rate:el?el.playbackRate:(position?.playbackRate||1),
        muted:el?el.muted:false,
        video:el instanceof HTMLVideoElement&&el.videoWidth>0,
        pip:!!document.pictureInPictureElement,
        live:!!el&&el.duration===Infinity,
        actions:[...handlers.keys()]
      };
      document.dispatchEvent(new CustomEvent(EV,{detail:JSON.stringify(state)}));
    }
    const call=(name,details={})=>{const f=handlers.get(name);if(!f)return false;try{f({action:name,...details});return true;}catch{return false;}};
    function run(action,value){
      const el=pick()||primary;
      switch(action){
        case 'toggle':{const playing=el?!el.paused&&!el.ended:ms?.playbackState==='playing';return run(playing?'pause':'play');}
        case 'play':if(!call('play')&&el)el.play().catch(()=>{});break;
        case 'pause':if(!call('pause')&&el)el.pause();break;
        case 'stop':if(!call('stop')&&el)el.pause();break;
        case 'previoustrack':case 'nexttrack':case 'skipad':call(action);break;
        case 'seekby':{const d=Number(value)||0;if(!call(d<0?'seekbackward':'seekforward',{seekOffset:Math.abs(d)})&&el)el.currentTime=Math.max(0,el.currentTime+d);break;}
        case 'seekto':{const t=Math.max(0,Number(value)||0);if(!call('seekto',{seekTime:t,fastSeek:false})&&el)el.currentTime=t;break;}
        case 'mute':if(el)el.muted=!el.muted;break;
        case 'pip':{
          if(document.pictureInPictureElement){document.exitPictureInPicture().catch(()=>{});break;}
          const v=el instanceof HTMLVideoElement?el:[...els].find(x=>x instanceof HTMLVideoElement&&!x.paused);
          if(v&&!v.disablePictureInPicture)v.requestPictureInPicture().catch(()=>{});
          break;
        }
      }
      queue();
      return true;
    }
    Object.defineProperty(window,'__varcoMedia',{value:Object.freeze({run}),enumerable:false});
    addEventListener('pagehide',()=>document.dispatchEvent(new CustomEvent(EV,{detail:JSON.stringify({has:false})})));
  }});
}
