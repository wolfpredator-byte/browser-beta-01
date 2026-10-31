'use strict';

/**
 * Estensioni Chrome (Beta 0.26).
 *
 * Electron da solo supporta solo una parte delle API delle estensioni (soprattutto DevTools).
 * La libreria electron-chrome-extensions aggiunge ciò che serve a un browser: icone nella barra
 * con i loro popup (chrome.action), chrome.tabs, chrome.windows, menu contestuali, notifiche.
 * electron-chrome-web-store fa funzionare il pulsante "Aggiungi" del Chrome Web Store
 * (chromewebstore.google.com): le estensioni finiscono in userData/Extensions, si caricano
 * all'avvio e si aggiornano da sole.
 *
 * Qui colleghiamo la libreria alle schede di VARCO: quali WebContents sono schede, qual è la
 * scheda attiva di ogni finestra, e come creare o chiudere schede quando un'estensione lo chiede.
 */
const path=require('node:path');
const {app,session,shell}=require('electron');
const {state}=require('./state.cjs');

let extensions=null,ses=null;
// Registrando una scheda, la libreria può dichiararla "attiva" e chiederci di mostrarla: in quel momento no.
let tracking=false;
const tabs=()=>require('./tabs.cjs');
const windows=()=>require('./windows.cjs');
const tabOf=contents=>state.tabs.find(t=>t.view?.webContents===contents)||null;
const extensionsDir=()=>path.join(app.getPath('userData'),'Extensions');

/** La scheda ha (di nuovo) una pagina o è passata a un'altra finestra: la libreria deve saperlo. */
function track(t){
  if(!extensions||!t?.view)return;
  const w=windows().windowForTab(t);
  if(!w)return;
  tracking=true;
  try{extensions.addTab(t.view.webContents,w.win);}catch{}
  finally{tracking=false;}
}
function select(t){
  if(!extensions||!t?.view)return;
  track(t);
  try{extensions.selectTab(t.view.webContents);}catch{}
}
function untrack(contents){
  if(!extensions||!contents||contents.isDestroyed())return;
  try{extensions.removeTab(contents);}catch{}
}

/** Un'estensione chiede una nuova scheda (chrome.tabs.create, pagina delle opzioni…). */
async function createTab(details){
  const w=(details.windowId&&state.windows.find(x=>x.win.id===details.windowId))||windows().focusedWindow();
  if(!w)throw new Error('Nessuna finestra aperta.');
  const id=tabs().newTab(details.url||'https://www.google.com/',w.workspace,{pane:w.pane,activate:details.active!==false});
  const t=state.tabs.find(x=>x.id===id);
  if(!t)throw new Error('Indirizzo non valido.');
  tabs().ensureView(t);
  track(t);
  return [t.view.webContents,w.win];
}

/** Prima di installare dal Web Store chiediamo noi, con il nome e i permessi dell'estensione. */
async function beforeInstall(details){
  const permissions=[...(details.manifest.permissions||[]),...(details.manifest.host_permissions||[])]
    .filter(p=>typeof p==='string').slice(0,12);
  const w=state.windows.find(x=>x.win===details.browserWindow)||windows().focusedWindow();
  if(!w)return {action:'deny'};
  const answer=await require('./popup.cjs').dialog(w,{type:'question',icon:'external',
    message:`Aggiungere «${details.localizedName}» a VARCO?`,
    detail:(permissions.length?'Potrà: '+permissions.join(', ')+'.\n':'')+
      'Le estensioni possono leggere e cambiare le pagine dei siti a cui hanno accesso. Installa solo quelle di cui ti fidi.',
    buttons:['Annulla','Aggiungi'],defaultId:1,cancelId:0});
  return {action:answer.response===1?'allow':'deny'};
}

async function setup(webSession){
  ses=webSession;
  const {ElectronChromeExtensions}=require('electron-chrome-extensions');
  extensions=new ElectronChromeExtensions({
    session:ses,
    createTab,
    selectTab:contents=>{
      if(tracking)return;
      const t=tabOf(contents),w=t&&windows().windowForTab(t);
      if(w){tabs().show(w,t.id);if(w.win.isMinimized())w.win.restore();}
    },
    removeTab:contents=>{const t=tabOf(contents);if(t){tabs().closeTabAnywhere(t.id);tabs().persistTabs();windows().emitAll();}},
    // Una "finestra" chiesta da un'estensione diventa una scheda nella finestra attiva.
    createWindow:async details=>{
      const urls=[].concat(details.url||[]);
      const w=windows().focusedWindow();
      if(!w)throw new Error('Nessuna finestra aperta.');
      for(const url of urls.length?urls:['https://www.google.com/'])tabs().newTab(url,w.workspace,{pane:w.pane});
      return w.win;
    },
    removeWindow:win=>{const w=state.windows.find(x=>x.win===win);if(w)w.win.close();}
  });
  // Le icone delle estensioni nella barra (<browser-action-list>) arrivano da crx://, nella sessione della cornice.
  ElectronChromeExtensions.handleCRXProtocol(session.defaultSession);
  const {installChromeWebStore}=require('electron-chrome-web-store');
  await installChromeWebStore({session:ses,extensionsPath:extensionsDir(),loadExtensions:true,autoUpdate:true,beforeInstall});
  ses.extensions.on('extension-loaded',()=>windows().emitAll());
  ses.extensions.on('extension-unloaded',()=>windows().emitAll());
  // Le schede già aperte all'avvio.
  for(const t of state.tabs)track(t);
  for(const w of state.windows){const t=state.tabs.find(x=>x.id===w.activeId);if(t)select(t);}
}

// ── Impostazioni ─────────────────────────────────────────────────────────
function list(){
  if(!ses)return [];
  return ses.extensions.getAllExtensions().map(e=>({id:e.id,name:e.name,version:e.version,
    description:String(e.manifest.description||'').slice(0,200),
    options:e.manifest.options_ui?.page||e.manifest.options_page||'',
    fromStore:path.resolve(e.path).toLowerCase().startsWith(path.resolve(extensionsDir()).toLowerCase())}))
    .sort((a,b)=>a.name.localeCompare(b.name));
}
function snapshot(){return {extensions:{ready:!!extensions,list:list()}};}
async function remove(id){
  const {uninstallExtension}=require('electron-chrome-web-store');
  try{await uninstallExtension(id,{session:ses,extensionsPath:extensionsDir()});}
  catch(error){return {ok:false,error:String(error.message||error)};}
  windows().emitAll();
  return {ok:true};
}
function openOptions(w,id){
  const e=list().find(x=>x.id===id);
  if(!e?.options)return {ok:false,error:'Questa estensione non ha impostazioni.'};
  tabs().newTab(`chrome-extension://${id}/${e.options.replace(/^\//,'')}`,w.workspace,{pane:w.pane});
  return {ok:true};
}
/** Menu contestuale di una pagina: le voci aggiunte dalle estensioni (chrome.contextMenus). */
function contextMenuItems(contents,params){
  if(!extensions)return [];
  try{return extensions.getContextMenuItems(contents,params);}catch{return [];}
}
const openFolder=()=>shell.openPath(extensionsDir());

module.exports={setup,track,select,untrack,snapshot,remove,openOptions,contextMenuItems,openFolder};
