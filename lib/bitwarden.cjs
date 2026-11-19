'use strict';

/**
 * Bitwarden come gestore delle password (Beta 0.46).
 *
 * VARCO fa solo da interfaccia e da ambiente sicuro per l'estensione ufficiale di Bitwarden
 * (Chrome Web Store). Non memorizza mai la master password, i segreti di Bitwarden o i cookie del Vault:
 * - l'estensione tiene i suoi dati cifrati nel suo spazio, come in Chrome; VARCO non li legge;
 * - il Vault web (vault.bitwarden.com / .eu) non si apre dentro VARCO: ogni caricamento di pagina verso
 *   il Vault, da qualunque scheda, companion o anteprima, viene fermato e aperto nel browser di sistema;
 * - le pagine di Bitwarden restano fuori da cronologia, schede da riaprire, screenshot e JARVIS
 *   (bitwarden-rules.cjs isSecretUrl).
 * I workspace con account separati hanno la loro sessione, quindi il loro Bitwarden: ci si può entrare
 * con un altro account. In incognito Bitwarden non ricorda niente dopo la chiusura.
 */
const {app,shell}=require('electron');
const {state,save}=require('./state.cjs');
const windows=require('./windows.cjs');
const R=require('./bitwarden-rules.cjs');

const primarySession=()=>require('electron').session.fromPartition(require('./web-session.cjs').partitionFor(
  (state.data.workspaces.find(w=>!w.isolated)||state.data.workspaces[0])?.name));
const extensionIn=ses=>{try{return ses?.extensions?.getExtension(R.EXTENSION_ID)||null;}catch{return null;}};
const appInstalled=()=>{try{return !!app.getApplicationNameForProtocol('bitwarden://');}catch{return false;}};

function status(){
  const ext=extensionIn(primarySession());
  return {installed:!!ext,version:ext?.version||'',appInstalled:appInstalled(),hint:state.data.settings.bitwardenHint!==false,
    workspaces:state.data.workspaces.filter(w=>!require('./incognito.cjs').is(w.name)).map(w=>({name:w.name,isolated:!!w.isolated}))};
}

async function install(w){
  if(extensionIn(primarySession()))return {ok:true,already:true};
  const answer=await require('./popup.cjs').dialog(w,{type:'question',icon:'shield',message:'Installare Bitwarden?',
    detail:'Estensione ufficiale e gratuita dal Chrome Web Store. Le password restano cifrate in Bitwarden: VARCO non le vede e non le salva.',
    buttons:['Installa','Annulla'],defaultId:0,cancelId:1});
  if(answer.response!==0)return {ok:false,cancelled:true};
  const r=await require('./extensions.cjs').installFromStore(R.EXTENSION_ID);
  if(!r.ok)return r;
  require('./toasts.cjs').show({id:'bw-installed',kind:'success',category:'sistema',title:'Bitwarden installato',
    text:'L’icona è nella barra in alto. Entra nel tuo account: da lì riempi le pagine di accesso.',timeout:8000,
    actions:[{label:'Apri Bitwarden',command:'bitwardenOpen'}]},w);
  windows.emitAll();
  return {ok:true};
}

/** Apre il popup di Bitwarden come se cliccassi la sua icona (sulla scheda attiva). */
function open(w){
  const t=require('./tabs.cjs').activeTab(w);
  const ses=t?.view?.webContents?.session||primarySession();
  if(!extensionIn(ses))return install(w);
  windows.sendUi(w,{type:'openExtensionAction',id:R.EXTENSION_ID});
  return {ok:true};
}
function openWebVault(){shell.openExternal(R.WEB_VAULT);return {ok:true};}
function openApp(){
  // L'app per Windows registra bitwarden://; se non c'è, la pagina per scaricarla (nel browser di sistema).
  shell.openExternal(appInstalled()?'bitwarden://':R.DOWNLOAD_URL);
  return {ok:true,app:appInstalled()};
}
function setHint(on){state.data.settings.bitwardenHint=!!on;save();windows.emitAll();return {ok:true};}

/** Campo password in una pagina (page-preload, solo il fatto: nessun valore). Se manca Bitwarden, lo proponiamo. */
const hinted=new Set();
function loginField(contents,origin){
  if(state.data.settings.bitwardenHint===false)return;
  if(require('./incognito.cjs').isSession(contents.session))return;
  if(extensionIn(contents.session))return; // c'è Bitwarden: ci pensa il suo menu sul campo
  const host=(()=>{try{return new URL(origin).hostname;}catch{return '';}})();
  if(!host||hinted.has(host))return;
  hinted.add(host);
  const t=state.tabs.find(x=>x.view?.webContents===contents);
  require('./toasts.cjs').show({id:'bw-hint',kind:'info',category:'sito',title:'Pagina di accesso',
    text:'Con Bitwarden riempi nome e password da qui. VARCO non salva più le password.',timeout:12000,
    actions:[{label:'Installa Bitwarden',command:'bitwardenInstall'},{label:'Non chiedere più',command:'bitwardenHintOff'}]},
    t?windows.windowForTab(t):undefined);
}

/**
 * Guardia del Vault web, chiamata per ogni richiesta delle pagine (adblock.cjs onBeforeRequest):
 * un caricamento di pagina verso il Vault viene fermato e aperto nel browser di sistema.
 * Restituisce true se la richiesta va annullata.
 */
let lastExternal=0;
function guardRequest(details){
  if(details.resourceType!=='mainFrame'&&details.resourceType!=='subFrame')return false;
  if(!R.isVaultUrl(details.url))return false;
  if(Date.now()-lastExternal>3000){
    lastExternal=Date.now();
    shell.openExternal(details.url);
    require('./toasts.cjs').show({id:'bw-vault',kind:'info',category:'sistema',title:'Vault di Bitwarden nel browser di sistema',
      text:'VARCO non apre il Vault web: così i suoi cookie non restano qui.',timeout:6000});
  }
  return true;
}

module.exports={status,install,open,openWebVault,openApp,setHint,loginField,guardRequest};
