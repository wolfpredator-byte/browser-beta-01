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
const fs=require('node:fs');
const {app,session,shell,dialog}=require('electron');
const {state,save}=require('./state.cjs');
const rules=require('./extension-rules.cjs');

let extensions=null,ses=null;
// Registrando una scheda, la libreria può dichiararla "attiva" e chiederci di mostrarla: in quel momento no.
let tracking=false;
const tabs=()=>require('./tabs.cjs');
const windows=()=>require('./windows.cjs');
const tabOf=contents=>state.tabs.find(t=>t.view?.webContents===contents)||null;
const extensionsDir=()=>path.join(app.getPath('userData'),'Extensions');
// Beta 0.37.2: estensioni installate da file (.crx, .zip, cartella), fuori dalla cartella gestita dal Web Store.
const localDir=()=>path.join(app.getPath('userData'),'ExtensionsLocal');
const accessOf=id=>state.data.extensionAccess?.[id]==='declared'?'declared':'all';

/** Beta 0.28: un'istanza della libreria per ogni sessione (i workspace con account separati hanno la loro). */
const instanceFor=contents=>{
  if(!extensions||!contents||contents.isDestroyed())return null;
  return require('electron-chrome-extensions').ElectronChromeExtensions.fromSession(contents.session)||null;
};
/** La scheda ha (di nuovo) una pagina o è passata a un'altra finestra: la libreria deve saperlo. */
function track(t){
  const instance=instanceFor(t?.view?.webContents);
  if(!instance)return;
  const w=windows().windowForTab(t);
  if(!w)return;
  tracking=true;
  try{instance.addTab(t.view.webContents,w.win);}catch{}
  finally{tracking=false;}
}
function select(t){
  const instance=instanceFor(t?.view?.webContents);
  if(!instance)return;
  track(t);
  try{instance.selectTab(t.view.webContents);}catch{}
}
function untrack(contents){
  const instance=instanceFor(contents);
  if(!instance)return;
  try{instance.removeTab(contents);}catch{}
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
  const answer=await confirmInstall(w,details.localizedName,details.manifest);
  if(answer.access&&details.id){state.data.extensionAccess={...(state.data.extensionAccess||{}),[details.id]:answer.access};save();}
  return {action:answer.ok?'allow':'deny'};
}
/**
 * Beta 0.37.2: dialogo di installazione unico (Web Store e file). Se l'estensione agisce sui siti con il clic o chiedendo
 * siti durante l'uso, si sceglie l'accesso: "su tutti i siti" (funziona come in Chrome) o "solo i siti dichiarati".
 */
async function confirmInstall(w,name,manifest){
  const permissions=[...(manifest.permissions||[]),...(manifest.host_permissions||[])].filter(p=>typeof p==='string').slice(0,12);
  const needs=rules.needsSiteAccess(manifest);
  const answer=await require('./popup.cjs').dialog(w,{type:'question',icon:'external',
    message:`Aggiungere «${name}» a VARCO?`,
    detail:(permissions.length?'Potrà: '+permissions.join(', ')+'.\n':'')+
      (needs?'In Chrome questa estensione agisce su un sito quando clicchi la sua icona o quando glielo permetti. VARCO non può concedere l’accesso un sito alla volta: con «Su tutti i siti» funziona come in Chrome ma può leggere e cambiare ogni pagina; con «Solo i siti dichiarati» è più chiusa, ma potrebbe non fare nulla. Puoi cambiarlo in Impostazioni → Estensioni.\n':'')+
      'Le estensioni possono leggere e cambiare le pagine dei siti a cui hanno accesso. Installa solo quelle di cui ti fidi.',
    buttons:needs?['Annulla','Solo i siti dichiarati','Su tutti i siti']:['Annulla','Aggiungi'],defaultId:needs?2:1,cancelId:0});
  if(!answer.response)return {ok:false};
  return {ok:true,access:needs?(answer.response===2?'all':'declared'):null};
}

/**
 * Beta 0.37.2 — installazione da file: .crx (pacchetto Chrome fuori dal Web Store), .zip o cartella con manifest.json.
 * La copia va in userData/ExtensionsLocal e si ricarica a ogni avvio (state.data.localExtensions).
 */
async function installFromFile(w,source){
  if(!ses)return {ok:false,error:'Estensioni non ancora pronte.'};
  let stat;try{stat=fs.statSync(source);}catch{return {ok:false,error:'File non trovato.'};}
  const staging=path.join(localDir(),'.nuova-'+Date.now());
  try{
    fs.mkdirSync(staging,{recursive:true});
    if(stat.isDirectory())fs.cpSync(source,staging,{recursive:true});
    else{
      if(stat.size>200*1024*1024)throw new Error('File troppo grande per un’estensione.');
      const AdmZip=require('adm-zip');
      const zip=new AdmZip(rules.crxToZip(fs.readFileSync(source)));
      for(const entry of zip.getEntries()){
        const target=path.resolve(staging,entry.entryName);
        if(!target.startsWith(path.resolve(staging)+path.sep))throw new Error('Il pacchetto contiene percorsi non validi.'); // niente "../"
      }
      zip.extractAllTo(staging,true);
    }
    // Il manifest può stare in una sottocartella (zip di una cartella).
    let root=staging;
    if(!fs.existsSync(path.join(root,'manifest.json'))){
      const dirs=fs.readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory());
      if(dirs.length===1&&fs.existsSync(path.join(root,dirs[0].name,'manifest.json')))root=path.join(root,dirs[0].name);
      else throw new Error('Nel pacchetto non c’è un manifest.json: non sembra un’estensione.');
    }
    const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
    if(!manifest.name||!manifest.version)throw new Error('Il manifest dell’estensione è incompleto.');
    const name=String(manifest.name).startsWith('__MSG_')?path.basename(source).replace(/\.(crx|zip)$/i,''):String(manifest.name);
    const answer=await confirmInstall(w,name,manifest);
    if(!answer.ok){fs.rmSync(staging,{recursive:true,force:true});return {ok:true,cancelled:true};}
    const slug=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'estensione';
    const dest=path.join(localDir(),slug+'-'+Date.now().toString(36));
    fs.renameSync(root,dest);
    fs.rmSync(staging,{recursive:true,force:true});
    const loaded=await ses.extensions.loadExtension(dest,{allowFileAccess:false});
    if(answer.access)state.data.extensionAccess={...(state.data.extensionAccess||{}),[loaded.id]:answer.access};
    state.data.localExtensions=[...(state.data.localExtensions||[]).filter(p=>p!==dest),dest];
    save();
    await applyAccess(loaded); // poi vale anche per le altre sessioni (extension-loaded)
    windows().emitAll();
    return {ok:true,name:loaded.name,id:loaded.id};
  }catch(e){
    fs.rmSync(staging,{recursive:true,force:true});
    return {ok:false,error:String(e.message||e)};
  }
}
async function pickAndInstall(w){
  const r=await dialog.showOpenDialog(w.win,{title:'Installa un’estensione da file',properties:['openFile'],
    filters:[{name:'Estensioni Chrome',extensions:['crx','zip']}]});
  if(r.canceled||!r.filePaths[0])return {ok:true,cancelled:true};
  return installFromFile(w,r.filePaths[0]);
}
async function pickFolderAndInstall(w){
  const r=await dialog.showOpenDialog(w.win,{title:'Installa un’estensione da una cartella',properties:['openDirectory']});
  if(r.canceled||!r.filePaths[0])return {ok:true,cancelled:true};
  return installFromFile(w,r.filePaths[0]);
}

/**
 * Beta 0.37.2 — chrome.permissions corretto. La libreria confrontava i permessi come testo ("https://a.it/*" non è
 * "<all_urls>") e ignorava i siti delle estensioni Manifest V2: chrome.permissions.contains diceva "no" e molte
 * estensioni non agivano sul sito. Qui si sostituiscono i suoi gestori con il confronto vero (extension-rules.cjs).
 */
const granted=new Map(); // id → {permissions:Set, origins:Set} concessi durante l'uso
function permissionsOf(extension){
  const extra=granted.get(extension.id)||{permissions:new Set(),origins:new Set()};
  return {permissions:[...new Set([...rules.apiPermissionsOf(extension.manifest),...extra.permissions])],
    origins:[...new Set([...rules.hostOriginsOf(extension.manifest),...extra.origins])]};
}
function fixPermissions(instance){
  const router=instance?.ctx?.router;
  if(!router?.handle)return;
  const contains=({extension},req={})=>{
    const p=permissionsOf(extension);
    return (req.permissions||[]).every(x=>p.permissions.includes(x))&&(req.origins||[]).every(o=>rules.covers(p.origins,o));
  };
  router.handle('permissions.contains',contains);
  router.handle('permissions.getAll',({extension})=>permissionsOf(extension));
  router.handle('permissions.request',async(event,req={})=>{
    const m=event.extension.manifest;
    const declared=new Set([...(m.permissions||[]),...(m.optional_permissions||[])]);
    if((req.permissions||[]).some(p=>!declared.has(p)))throw new Error('Permissions request includes undeclared permission');
    // I permessi API facoltativi (es. "tabs") Electron li ha già: si segnano come concessi.
    const extra=granted.get(event.extension.id)||{permissions:new Set(),origins:new Set()};
    for(const p of req.permissions||[])extra.permissions.add(p);
    granted.set(event.extension.id,extra);
    // I siti invece si possono "concedere" solo se l'estensione li ha davvero (manifest o "Accesso: su tutti i siti"):
    // dire sì a un sito che Electron non le apre la farebbe solo fallire più avanti.
    return contains(event,{origins:req.origins||[]});
  });
  router.handle('permissions.remove',()=>true);
}

/**
 * Beta 0.37.2 — accesso ai siti. Electron non concede l'accesso al singolo clic (activeTab) né i siti chiesti durante
 * l'uso: l'estensione veniva respinta dalla pagina ("Cannot access contents of the page"). Con "Su tutti i siti"
 * (predefinito, scelta per estensione come in Chrome) VARCO aggiunge <all_urls> al manifest della copia installata e
 * la ricarica; con "Solo i siti dichiarati" rimette il manifest originale (copia in manifest.varco-original.json).
 */
const ORIGINAL='manifest.varco-original.json';
function originalManifest(extension){
  if(!rules.isWidened(extension.manifest))return extension.manifest;
  try{return JSON.parse(fs.readFileSync(path.join(extension.path,ORIGINAL),'utf8'));}catch{return extension.manifest;}
}
async function reloadEverywhere(extension){
  for(const s of [ses,...others]){
    try{s.extensions.removeExtension(extension.id);}catch{}
    try{
      const loaded=await s.extensions.loadExtension(extension.path);
      if(loaded.manifest.manifest_version===3&&loaded.manifest.background?.service_worker)
        await s.serviceWorkers.startWorkerForScope('chrome-extension://'+loaded.id).catch(()=>{});
    }catch(e){require('./diagnostics.cjs').record('error',['Estensione',extension.name,e]);}
  }
}
const applying=new Set();
async function applyAccess(extension){
  if(!extension||applying.has(extension.id))return;
  const original=originalManifest(extension);
  if(!rules.needsSiteAccess(original))return;
  const want=accessOf(extension.id),file=path.join(extension.path,'manifest.json'),backup=path.join(extension.path,ORIGINAL);
  const widened=rules.isWidened(extension.manifest);
  if((want==='all')===widened)return;
  applying.add(extension.id);
  try{
    if(want==='all'){
      if(!fs.existsSync(backup))fs.writeFileSync(backup,JSON.stringify(original,null,2));
      fs.writeFileSync(file,JSON.stringify(rules.widenManifest(original),null,2));
    }else fs.writeFileSync(file,JSON.stringify(original,null,2));
    await reloadEverywhere(extension);
  }catch(e){require('./diagnostics.cjs').record('error',['Accesso ai siti',extension.name,e]);}
  finally{applying.delete(extension.id);windows().emitAll();}
}
async function setAccess(id,mode){
  const extension=ses?.extensions.getExtension(id);
  if(!extension)return {ok:false,error:'Estensione non trovata.'};
  state.data.extensionAccess={...(state.data.extensionAccess||{}),[id]:mode==='declared'?'declared':'all'};
  save();
  await applyAccess(extension);
  return {ok:true};
}

/** Le funzioni con cui la libreria crea, mostra e chiude schede e finestre di VARCO. */
const impl=()=>({
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

async function setup(webSession){
  ses=webSession;
  const {ElectronChromeExtensions}=require('electron-chrome-extensions');
  extensions=new ElectronChromeExtensions({session:ses,...impl()});
  fixPermissions(extensions); // Beta 0.37.2
  // Le icone delle estensioni nella barra (<browser-action-list>) arrivano da crx://, nella sessione della cornice.
  ElectronChromeExtensions.handleCRXProtocol(session.defaultSession);
  const {installChromeWebStore}=require('electron-chrome-web-store');
  await installChromeWebStore({session:ses,extensionsPath:extensionsDir(),loadExtensions:true,autoUpdate:true,beforeInstall});
  // Un'estensione installata o tolta vale anche per le sessioni dei workspace con account separati.
  ses.extensions.on('extension-loaded',(_e,extension)=>{
    for(const other of others)loadInto(other,extension);
    applyAccess(extension); // Beta 0.37.2 (anche dopo un aggiornamento dal Web Store)
    windows().emitAll();
  });
  ses.extensions.on('extension-unloaded',(_e,extension)=>{for(const other of others)try{other.extensions.removeExtension(extension.id);}catch{}windows().emitAll();});
  // Beta 0.37.2: estensioni installate da file.
  const kept=[];
  for(const dir of state.data.localExtensions||[]){
    if(!fs.existsSync(path.join(dir,'manifest.json')))continue;
    try{await ses.extensions.loadExtension(dir,{allowFileAccess:false});kept.push(dir);}catch(e){require('./diagnostics.cjs').record('error',['Estensione da file',dir,e]);}
  }
  if(kept.length!==(state.data.localExtensions||[]).length){state.data.localExtensions=kept;save();}
  for(const extension of ses.extensions.getAllExtensions())await applyAccess(extension);
  ready=true;
  for(const other of pendingSessions.splice(0))addSession(other);
  // Le schede già aperte all'avvio.
  for(const t of state.tabs)track(t);
  for(const w of state.windows){const t=state.tabs.find(x=>x.id===w.activeId);if(t)select(t);}
}

// ── Beta 0.28: sessioni dei workspace con account separati ────────────────
const others=new Set(),pendingSessions=[];
let ready=false; // la sessione principale ha caricato le sue estensioni
async function loadInto(other,extension){
  if(other.extensions.getExtension(extension.id))return;
  try{
    const loaded=await other.extensions.loadExtension(extension.path);
    if(loaded.manifest.manifest_version===3&&loaded.manifest.background?.service_worker)
      await other.serviceWorkers.startWorkerForScope('chrome-extension://'+loaded.id).catch(()=>{});
  }catch{}
}
/** Una sessione in più: stessa libreria, stesse estensioni della sessione principale. */
async function addSession(other){
  if(!ready){pendingSessions.push(other);return;} // la principale non è ancora pronta
  if(others.has(other))return;
  others.add(other);
  const {ElectronChromeExtensions}=require('electron-chrome-extensions');
  if(!ElectronChromeExtensions.fromSession(other))fixPermissions(new ElectronChromeExtensions({session:other,...impl()}));
  for(const extension of ses.extensions.getAllExtensions())await loadInto(other,extension);
}

// ── Impostazioni ─────────────────────────────────────────────────────────
function list(){
  if(!ses)return [];
  return ses.extensions.getAllExtensions().map(e=>({id:e.id,name:e.name,version:e.version,
    description:String(e.manifest.description||'').slice(0,200),
    options:e.manifest.options_ui?.page||e.manifest.options_page||'',
    fromStore:path.resolve(e.path).toLowerCase().startsWith(path.resolve(extensionsDir()).toLowerCase()),
    // Beta 0.37.2: estensioni da file e accesso ai siti.
    local:path.resolve(e.path).toLowerCase().startsWith(path.resolve(localDir()).toLowerCase()),
    siteAccess:rules.needsSiteAccess(originalManifest(e))?accessOf(e.id):null}))
    .sort((a,b)=>a.name.localeCompare(b.name));
}
function snapshot(){return {extensions:{ready:!!extensions,list:list()}};}
/** Beta 0.36: installa un'estensione dal Chrome Web Store (import da altri browser). */
async function installFromStore(id){
  if(!ses)return {ok:false,error:'Estensioni non ancora pronte.'};
  if(ses.extensions.getExtension(id))return {ok:true};
  try{
    const {installExtension}=require('electron-chrome-web-store');
    await installExtension(id,{session:ses,extensionsPath:extensionsDir()});
    return {ok:true};
  }catch(error){return {ok:false,error:String(error.message||error)};}
}
async function remove(id){
  // Beta 0.37.2: un'estensione da file si toglie da tutte le sessioni e si cancella la sua copia.
  const local=ses?.extensions.getExtension(id);
  if(local&&path.resolve(local.path).toLowerCase().startsWith(path.resolve(localDir()).toLowerCase())){
    for(const s of [ses,...others])try{s.extensions.removeExtension(id);}catch{}
    state.data.localExtensions=(state.data.localExtensions||[]).filter(p=>path.resolve(p)!==path.resolve(local.path));
    if(state.data.extensionAccess)delete state.data.extensionAccess[id];
    save();
    try{fs.rmSync(local.path,{recursive:true,force:true});}catch{}
    windows().emitAll();
    return {ok:true};
  }
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

module.exports={installFromFile,pickAndInstall,pickFolderAndInstall,setAccess,installFromStore,setup,addSession,track,select,untrack,snapshot,remove,openOptions,contextMenuItems,openFolder};
