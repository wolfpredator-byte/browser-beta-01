'use strict';

/**
 * Schede: creazione, caricamento, chiusura, workspace e stack.
 * Ogni funzione che agisce "su ciò che vedi" riceve la finestra `w`.
 */
const {WebContentsView,Menu,clipboard}=require('electron');
const {state,save,saveSoon}=require('./state.cjs');
const windows=require('./windows.cjs');
const {PARTITION,safeUrl,isWebUrl,popupAction}=require('./web-rules.cjs');
const {shouldCloseWindow,discardHomeAfterNavigation}=require('./tab-lifecycle.cjs');
const {moveTab,rememberClosed,groupName}=require('./tab-advanced.cjs');

const hasWorkspace=name=>state.data.workspaces.some(w=>w.name===name);
const tabIn=(w,id)=>state.tabs.find(t=>t.id===id&&t.workspace===w.workspace)||null;
const activeTab=w=>w?tabIn(w,w.activeId):null;

/** Salva la sessione: schede di TUTTI i workspace, anche quelli senza finestra. */
function persistTabs(){
  const {data}=state;
  if(!data)return;
  // Home appartiene alla sessione come qualunque pagina web esterna.
  data.sessionTabs=state.tabs.filter(t=>t.isHome||isWebUrl(t.url)).map(t=>({url:t.url,home:!!t.isHome,
    workspace:t.workspace,title:t.title,pinned:!!t.pinned,group:t.group||null})).slice(0,60);
  saveSoon();
}

/** Inserisce una scheda subito dopo quella attiva del suo workspace, altrimenti in fondo. */
function placeTab(tab){
  const owner=windows.windowFor(tab.workspace);
  const current=owner?state.tabs.findIndex(t=>t.id===owner.activeId):-1;
  if(current===-1)state.tabs.push(tab);else state.tabs.splice(current+1,0,tab);
}

/**
 * Crea una scheda web.
 * @param {string} raw - URL o testo di ricerca.
 * @param {string} ws - Workspace di destinazione.
 * @param {{pinned?:boolean,group?:string|null,title?:string,activate?:boolean,dormant?:boolean}} settings
 *   dormant=true: non carica la pagina finché non la apri (usato al ripristino della sessione).
 */
function newTab(raw='https://www.google.com/',ws,settings={}){
  if(!hasWorkspace(ws))return null;
  const url=safeUrl(raw);if(!url)return null;
  const t={id:state.nextId++,workspace:ws,url,title:settings.title||'Nuova scheda',view:null,isHome:false,
    loadError:null,pinned:!!settings.pinned,group:groupName(settings.group)};
  placeTab(t);
  const owner=windows.windowFor(ws);
  if(owner&&!settings.dormant){
    if(settings.activate!==false)show(owner,t.id);
    else ensureView(t);
  }
  persistTabs();windows.emitAll();
  return t.id;
}

/** La homepage è una scheda vera: stessa logica di attivazione e chiusura. Non ha View. */
function newHomeTab(ws,settings={}){
  if(!hasWorkspace(ws))return null;
  const t={id:state.nextId++,workspace:ws,url:'app://home',title:'Home',view:null,isHome:true,
    loadError:null,pinned:false,group:null};
  placeTab(t);
  const owner=windows.windowFor(ws);
  if(owner&&!settings.dormant&&settings.activate!==false)show(owner,t.id);
  persistTabs();windows.emitAll();
  return t.id;
}

/**
 * Crea la WebContentsView di una scheda dormiente e carica la pagina.
 * Tutti i listener sono qui: valgono per schede nuove e ripristinate.
 */
function ensureView(t){
  if(t.isHome||t.view)return;
  const view=new WebContentsView({webPreferences:{nodeIntegration:false,contextIsolation:true,
    sandbox:true,webSecurity:true,partition:PARTITION}});
  t.view=view;
  const contents=view.webContents;
  windows.registerShortcuts(contents);
  contents.on('context-menu',(_event,params)=>pageContextMenu(t,params));
  // Login con popup (Bungie, Google...) → finestra vera; target=_blank → nuova scheda.
  // Usiamo t.workspace, non un valore iniziale: se la scheda cambia workspace, i suoi popup la seguono.
  contents.setWindowOpenHandler(({url,disposition})=>{
    const action=popupAction(url,disposition);
    if(action==='window')return {action:'allow',overrideBrowserWindowOptions:popupOptions(t)};
    if(action==='tab')newTab(url,t.workspace);
    return {action:'deny'};
  });
  contents.on('did-create-window',child=>guardPopup(child,t));
  contents.on('will-navigate',(event,url)=>{if(!isWebUrl(url))event.preventDefault();});
  contents.on('did-navigate',(_,url)=>{
    if(!isWebUrl(url))return;
    t.url=url;
    state.data.history.unshift({url,title:t.title,time:Date.now()});
    state.data.history=state.data.history.slice(0,200);
    persistTabs();windows.emitAll();
  });
  contents.on('did-navigate-in-page',(_,url)=>{if(isWebUrl(url)){t.url=url;persistTabs();windows.emitAll();}});
  contents.on('page-title-updated',(_,title)=>{t.title=title.slice(0,120);persistTabs();windows.emitAll();});
  contents.on('did-start-loading',()=>{t.loadError=null;windows.emitAll();});
  contents.on('did-fail-load',(_,code,desc,validatedURL,isMainFrame)=>{
    if(code===-3||!isMainFrame)return;
    t.loadError=`Impossibile aprire ${validatedURL||t.url} — ${desc} (${code})`;
    console.warn('Load failed:',t.loadError);windows.emitAll();
  });
  contents.on('render-process-gone',(_event,details)=>{
    t.loadError=`La pagina si è interrotta: ${details.reason}`;windows.emitAll();
  });
  // Video a schermo intero: la pagina copre tutta la finestra, che va in fullscreen.
  contents.on('enter-html-full-screen',()=>{const w=windows.windowFor(t.workspace);if(w)windows.setPageFullscreen(w,true);});
  contents.on('leave-html-full-screen',()=>{const w=windows.windowFor(t.workspace);if(w?.fullscreen)windows.setPageFullscreen(w,false);});
  contents.loadURL(t.url).catch(console.warn);
}

/** Distrugge la pagina di una scheda (chiusura definitiva). */
function destroyView(t){
  if(!t.view)return;
  windows.detachView(t.view);
  t.view.webContents.close();
  t.view=null;
}

/** Opzioni dei popup di login: piccoli, isolati, nella stessa sessione dei cookie. */
function popupOptions(t){
  return {width:520,height:720,parent:windows.windowFor(t.workspace)?.win,autoHideMenuBar:true,
    backgroundColor:'#ffffff',
    webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,partition:PARTITION}};
}
/** Regole per la finestra popup: niente indirizzi non web; i suoi link diventano schede. */
function guardPopup(child,t){
  child.removeMenu();
  child.webContents.setWindowOpenHandler(({url})=>{
    if(isWebUrl(url))newTab(url,t.workspace);
    return {action:'deny'};
  });
  child.webContents.on('will-navigate',(event,url)=>{if(!isWebUrl(url))event.preventDefault();});
}

/** Click destro dentro una pagina: immagini e link. */
function pageContextMenu(t,params){
  const items=[];
  if(params.mediaType==='image'){
    if(isWebUrl(params.srcURL)){
      items.push({label:'Apri immagine in nuova scheda',click:()=>newTab(params.srcURL,t.workspace)});
      items.push({label:'Copia indirizzo immagine',click:()=>clipboard.writeText(params.srcURL)});
      items.push({label:'Salva immagine con nome…',click:()=>t.view?.webContents.downloadURL(params.srcURL)});
    }
    if(params.hasImageContents)items.push({label:'Copia immagine',click:()=>t.view?.webContents.copyImageAt(params.x,params.y)});
  }
  if(isWebUrl(params.linkURL))items.push({label:'Apri collegamento in una nuova scheda',click:()=>newTab(params.linkURL,t.workspace)});
  if(params.selectionText)items.push({label:'Copia',role:'copy'});
  if(params.isEditable)items.push({label:'Incolla',role:'paste'});
  if(items.length)items.push({type:'separator'});
  items.push({label:'Ispeziona elemento',click:()=>{
    // DevTools in una finestra separata: con più monitor è più comodo che agganciati.
    t.view?.webContents.openDevTools({mode:'detach'});
    t.view?.webContents.inspectElement(params.x,params.y);
  }});
  const w=windows.windowFor(t.workspace);
  Menu.buildFromTemplate(items).popup(w?{window:w.win}:{});
}

/** Rende visibile una scheda nella sua finestra, caricandola se era dormiente. */
function show(w,id){
  const t=tabIn(w,id);if(!t)return;
  w.activeId=id;
  if(w.fullscreen)windows.setPageFullscreen(w,false);
  ensureView(t);
  windows.attach(w,t.view);
  state.data.workspaceLastActive[w.workspace]=t.url;
  persistTabs();windows.emitAll();
}

/** Apre la scheda che usavi l'ultima volta nel workspace, oppure una Home. */
function openPreferredTab(w){
  const preferred=state.data.workspaceLastActive[w.workspace];
  const t=state.tabs.find(x=>x.workspace===w.workspace&&x.url===preferred)||state.tabs.find(x=>x.workspace===w.workspace);
  if(t)show(w,t.id);else newHomeTab(w.workspace);
}

/**
 * Chiude una scheda del workspace della finestra.
 * Chiudere l'ULTIMA scheda chiude la finestra; le schede degli altri workspace
 * restano salvate e saranno ripristinate.
 */
function closeTab(w,id){
  const index=state.tabs.findIndex(tab=>tab.id===id&&tab.workspace===w.workspace);
  if(index===-1)return; // Un evento UI non può chiudere schede di altri workspace.
  const [closed]=state.tabs.splice(index,1);
  // Conserviamo la pagina PRIMA di chiuderla: la View verrà distrutta qui sotto.
  rememberClosed(state.data.closedTabs,closed,20);
  destroyView(closed);
  if(w.activeId===id)w.activeId=null;
  if(shouldCloseWindow(state.tabs,w.workspace)){
    persistTabs();
    w.win.close();
    return;
  }
  // Se rimangono schede nel workspace, ne apriamo una anziché creare Home.
  if(w.activeId===null){
    const next=state.tabs.find(tab=>tab.workspace===w.workspace);
    if(next)show(w,next.id);
  }else{persistTabs();windows.emitAll();}
}

/** Ricerca dalla Home: la nuova pagina prende il posto della Home. */
function navigateFromHome(w,raw){
  const home=activeTab(w);
  if(!home?.isHome)return false;
  const url=safeUrl(raw);if(!url)return false;
  const newId=newTab(url,home.workspace);
  if(!newId)return false;
  if(discardHomeAfterNavigation(state.tabs,home.id,newId,home.workspace)){persistTabs();windows.emitAll();}
  return true;
}

/** Naviga nella scheda attiva; dalla Home apre una scheda al suo posto. */
function navigate(w,raw){
  const t=activeTab(w);
  if(!t||t.isHome){if(!navigateFromHome(w,raw))newTab(raw,w.workspace);return;}
  const url=safeUrl(raw);if(!url)return;
  t.loadError=null;t.url=url;
  // Una scheda dormiente carica direttamente il nuovo indirizzo creando la sua View.
  if(!t.view){ensureView(t);windows.attach(w,t.view);}
  else t.view.webContents.loadURL(url).catch(e=>{t.loadError=String(e.message||e);windows.emitAll();});
  windows.emitAll();
}

/**
 * Cambia il workspace mostrato da una finestra. Se quel workspace è già aperto
 * in un'altra finestra, porta in primo piano quella: uno stesso workspace non
 * può stare in due finestre (una pagina può essere visibile in un solo posto).
 */
function switchWorkspace(w,name){
  if(!hasWorkspace(name)||name===w.workspace)return;
  const other=windows.windowFor(name);
  if(other){if(other.win.isMinimized())other.win.restore();other.win.focus();return;}
  assignWorkspace(w,name);
  openPreferredTab(w);
}

/** Collega una finestra a un altro workspace, senza ancora scegliere la scheda. */
function assignWorkspace(w,name){
  if(w.fullscreen)windows.setPageFullscreen(w,false);
  windows.attach(w,null);
  w.workspace=name;w.activeId=null;
  state.data.activeWorkspace=name;
  windows.rememberOpenWindows();
}

/** Apre un workspace in una nuova finestra (o porta in primo piano quella esistente). */
function openWorkspaceWindow(name,saved={}){
  if(!hasWorkspace(name))return null;
  const existing=windows.windowFor(name);
  if(existing){if(existing.win.isMinimized())existing.win.restore();existing.win.focus();return existing;}
  const w=windows.createWindow(name,saved);
  openPreferredTab(w);
  windows.rememberOpenWindows();
  return w;
}

/** Ctrl+Shift+T: riapre la scheda chiusa più recente nel suo workspace originale. */
function reopenClosedTab(w){
  const {data}=state;
  if(!data.closedTabs.length)return false;
  const entry=data.closedTabs.shift();
  if(!entry.home&&!isWebUrl(entry.url)){save();windows.emitAll();return false;}
  const dest=hasWorkspace(entry.workspace)?entry.workspace:w.workspace;
  // Se il workspace non è aperto in nessuna finestra, lo mostriamo in quella attuale.
  // assignWorkspace (non switchWorkspace) evita di creare una Home in più.
  const moved=!windows.windowFor(dest)&&dest!==w.workspace;
  if(moved)assignWorkspace(w,dest);
  const id=entry.home?newHomeTab(dest):newTab(entry.url,dest,{pinned:entry.pinned,group:entry.group,title:entry.title});
  if(!id){
    data.closedTabs.unshift(entry);save();
    if(moved)openPreferredTab(w);
    return false;
  }
  const owner=windows.windowFor(dest);
  if(owner&&owner!==w)owner.win.focus();
  return true;
}

/**
 * Trasferisce una scheda (con la sua pagina già caricata) in un altro workspace.
 * Se era l'ultima, nasce una Home: spostare non equivale a chiudere.
 */
function moveTabToWorkspace(w,id,destination){
  const target=tabIn(w,id);if(!target)return false;
  if(!moveTab(state.tabs,id,destination,state.data.workspaces.map(x=>x.name)))return false;
  if(target.view)windows.detachView(target.view);
  if(w.activeId===id){
    w.activeId=null;
    const fallback=state.tabs.find(t=>t.workspace===w.workspace);
    if(fallback)show(w,fallback.id);else newHomeTab(w.workspace);
  }else{persistTabs();windows.emitAll();}
  return true;
}

/** Crea uno stack con due schede trascinate mantenendo Shift premuto. */
function stackTwoTabs(w,fromId,targetId){
  const first=tabIn(w,fromId),second=tabIn(w,targetId);
  if(!first||!second||first.id===second.id)return;
  let name=groupName(second.group)||groupName(first.group);
  if(!name){
    const taken=new Set(state.tabs.filter(t=>t.workspace===w.workspace).map(t=>t.group));
    let n=1;while(taken.has('Stack '+n))n++;
    name='Stack '+n;
  }
  first.group=name;second.group=name;
  // Dopo la creazione lo stack è inizialmente espanso, così si vedono le tab.
  const collapsed=state.data.collapsedStacks[w.workspace];
  if(Array.isArray(collapsed))state.data.collapsedStacks[w.workspace]=collapsed.filter(v=>v!==name);
  persistTabs();windows.emitAll();
}

/** Sposta una scheda prima di un'altra nello stesso workspace. */
function reorderTab(w,id,beforeId){
  const src=state.tabs.findIndex(x=>x.id===id&&x.workspace===w.workspace);
  const dest=state.tabs.findIndex(x=>x.id===beforeId&&x.workspace===w.workspace);
  if(src<0||dest<0||src===dest)return;
  const [item]=state.tabs.splice(src,1);
  state.tabs.splice(state.tabs.findIndex(x=>x.id===beforeId),0,item);
  persistTabs();windows.emitAll();
}

/**
 * Ripristino all'avvio: le schede salvate tornano DORMIENTI.
 * Si carica solo quella che apri, così l'avvio resta veloce anche con molte schede.
 */
function restoreSession(){
  for(const saved of state.data.sessionTabs){
    if(!saved||!hasWorkspace(saved.workspace))continue;
    if(saved.home)newHomeTab(saved.workspace,{dormant:true});
    else if(isWebUrl(saved.url))newTab(saved.url,saved.workspace,{pinned:saved.pinned,group:saved.group,title:saved.title,dormant:true});
  }
}

module.exports={persistTabs,newTab,newHomeTab,ensureView,show,openPreferredTab,closeTab,navigate,
  switchWorkspace,openWorkspaceWindow,reopenClosedTab,moveTabToWorkspace,stackTwoTabs,reorderTab,
  restoreSession,tabIn,activeTab};
