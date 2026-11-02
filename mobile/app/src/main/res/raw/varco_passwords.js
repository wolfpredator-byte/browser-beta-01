// Beta 0.33: password nelle pagine (come page-preload.cjs del PC). Gira solo nella pagina principale.
// Dice a VARCO quando tocchi un campo di accesso (VarcoPw.focus) e quando accedi (VarcoPw.submitted).
// Il sito lo stabilisce VARCO dall'indirizzo vero della pagina; la password arriva solo dopo lo sblocco,
// con window.__varcoPwFill, e va nel campo che avevi toccato.
(()=>{
  if(window.top!==window||window.__varcoPw||typeof VarcoPw==='undefined')return;
  window.__varcoPw=true;
  const USER_SELECTOR='input[autocomplete~="username"],input[autocomplete~="email"],input[type="email"],'+
    'input[name*="user" i],input[name*="mail" i],input[name*="login" i],input[id*="user" i],input[id*="mail" i],input[id*="login" i]';
  const NOT_TEXT=['password','hidden','checkbox','radio','submit','button','file','image','reset','range','color','date','number'];
  const visible=el=>!!el&&el.isConnected&&!el.disabled&&el.getClientRects().length>0;
  const isPassword=el=>el instanceof HTMLInputElement&&el.type==='password';
  const scopeOf=el=>el?.form||el?.closest?.('form')||document;
  const textInputs=scope=>[...scope.querySelectorAll('input')].filter(i=>!NOT_TEXT.includes(i.type)&&visible(i));
  const passwordsIn=scope=>[...scope.querySelectorAll('input[type="password"]')].filter(visible);
  function usernameFor(pass){
    const inputs=textInputs(scopeOf(pass));
    const before=inputs.filter(i=>i.compareDocumentPosition(pass)&Node.DOCUMENT_POSITION_FOLLOWING).reverse();
    return before.find(i=>i.matches(USER_SELECTOR))||before[0]||inputs.find(i=>i.matches(USER_SELECTOR))||null;
  }

  let lastKey='',lastAt=0;
  function capture(scope){
    const fields=passwordsIn(scope||document).filter(p=>p.value);
    if(!fields.length){
      const user=textInputs(scope||document).find(i=>i.value&&i.matches(USER_SELECTOR));
      if(user)VarcoPw.username(user.value.slice(0,200));
      return;
    }
    const pass=fields.find(p=>/new-password/.test(p.autocomplete))||fields[0];
    const username=usernameFor(pass)?.value||'';
    const key=username+'\n'+pass.value;
    if(key===lastKey&&Date.now()-lastAt<5000)return;
    lastKey=key;lastAt=Date.now();
    VarcoPw.submitted(username.slice(0,200),pass.value);
  }
  document.addEventListener('submit',e=>capture(e.target),true);
  const LOGIN_WORDS=/accedi|entra|login|log in|sign in|signin|continua|continue|avanti|next|invia|submit|conferma|ok\b/i;
  document.addEventListener('click',e=>{
    const button=e.target?.closest?.('button,input[type="submit"],input[type="button"],[role="button"]');
    if(!button)return;
    const words=(button.textContent||button.value||button.getAttribute('aria-label')||'').trim();
    if(button.type==='submit'||LOGIN_WORDS.test(words))setTimeout(()=>capture(scopeOf(button)),0);
  },true);
  document.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&e.target instanceof HTMLInputElement)setTimeout(()=>capture(scopeOf(e.target)),0);
  },true);

  let target=null;
  function loginField(el){
    if(!(el instanceof HTMLInputElement)||!visible(el))return false;
    if(isPassword(el))return true;
    if(NOT_TEXT.includes(el.type))return false;
    const pass=passwordsIn(scopeOf(el))[0];
    return pass?usernameFor(pass)===el:/username|email/.test(el.autocomplete);
  }
  document.addEventListener('focusin',e=>{
    if(loginField(e.target)){target=e.target;VarcoPw.focus();}
  },true);
  document.addEventListener('focusout',()=>setTimeout(()=>{if(target&&document.activeElement!==target)VarcoPw.blur();},300),true);

  function setValue(input,value){
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }
  window.__varcoPwFill=(username,password)=>{
    const field=target&&target.isConnected?target:passwordsIn(document)[0];
    if(!field)return false;
    const pass=isPassword(field)?field:passwordsIn(scopeOf(field))[0]||null;
    const user=isPassword(field)?usernameFor(field):field;
    if(user&&username)setValue(user,username);
    if(pass)setValue(pass,password);
    return true;
  };
  // Se il campo era già selezionato quando lo script è arrivato.
  if(loginField(document.activeElement)){target=document.activeElement;VarcoPw.focus();}
})();
