'use strict';

/**
 * Schede: creazione, caricamento, chiusura, workspace e stack.
 * Ogni funzione che agisce "su ciò che vedi" riceve la finestra `w`.
 */
const {WebContentsView,Menu,clipboard,session}=require('electron');
const {state,save,saveSoon}=require('./state.cjs');
const windows=require('./windows.cjs');
const {PARTITION,safeUrl,isWebUrl,popupAction,describeLoadError}=require('./web-rules.cjs');
const {shouldCloseWindow,discardHomeAfterNavigation}=require('./tab-lifecycle.cjs');
const {moveTab,rememberClosed,groupName,paneOf,isInWindow,nextPane}=require('./tab-advanced.cjs');

// web-session.cjs richiede windows.cjs come noi: lo carichiamo quando serve.
const webSession=()=>require('./web-session.cjs');
const hasWorkspace=name=>state.data.workspaces.some(w=>w.name===name);
/** Una scheda della finestra `w`: stesso workspace E stesso numero di finestra. */
const tabIn=(w,id)=>state.tabs.find(t=>t.id===id&&isInWindow(t,w))||null;
const tabsOf=w=>state.tabs.filter(t=>isInWindow(t,w));
/** Scheda usata per ultima: una per finestra (la principale usa la chiave delle beta precedenti). */
const lastActiveKey=w=>w.pane?`${w.workspace}#${w.pane}`:w.workspace;
const validPane=pane=>Number.isInteger(pane)&&pane>0&&pane<100?pane:0;
const activeTab=w=>w?tabIn(w,w.activeId):null;

/** Salva la sessione: schede di TUTTI i workspace, anche quelli senza finestra. */
function persistTabs(){
  const {data}=state;
  if(!data)return;
  // Home appartiene alla sessione come qualunque pagina web esterna.
  data.sessionTabs=state.tabs.filter(t=>t.isHome||isWebUrl(t.url)).map(t=>({url:t.url,home:!!t.isHome,
    workspace:t.workspace,pane:paneOf(t),title:t.title,pinned:!!t.pinned,group:t.group||null,
    favicon:t.favicon&&t.favicon.length<6000?t.favicon:null})).slice(0,60);
  saveSoon();
}

/** Inserisce una scheda subito dopo quella attiva della sua finestra, altrimenti in fondo. */
function placeTab(tab){
  const owner=windows.windowForTab(tab);
  const current=owner?state.tabs.findIndex(t=>t.id===owner.activeId):-1;
  if(current===-1)state.tabs.push(tab);else state.tabs.splice(current+1,0,tab);
}

/**
 * Crea una scheda web.
 * @param {string} raw - URL o testo di ricerca.
 * @param {string} ws - Workspace di destinazione.
 * @param {{pinned?:boolean,group?:string|null,title?:string,activate?:boolean,dormant?:boolean,pane?:number}} settings
 *   dormant=true: non carica la pagina finché non la apri (usato al ripristino della sessione).
 *   pane: numero della finestra del workspace (0 = principale).
 */
function newTab(raw='https://www.google.com/',ws,settings={}){
  if(!hasWorkspace(ws))return null;
  const url=safeUrl(raw,state.data.settings.searchEngine);if(!url)return null;
  const t={id:state.nextId++,workspace:ws,pane:validPane(settings.pane),url,title:settings.title||'Nuova scheda',view:null,isHome:false,
    loadError:null,pinned:!!settings.pinned,group:groupName(settings.group),
    favicon:typeof settings.favicon==='string'&&settings.favicon.startsWith('data:image/')?settings.favicon:null,loading:false};
  placeTab(t);
  const owner=windows.windowForTab(t);
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
  const t={id:state.nextId++,workspace:ws,pane:validPane(settings.pane),url:'app://home',title:'Home',view:null,isHome:true,
    loadError:null,pinned:false,group:null};
  placeTab(t);
  const owner=windows.windowForTab(t);
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
  t.lastVisibleAt=Date.now(); // per la sospensione (sleeper.cjs): appena caricata conta come vista
  const contents=view.webContents;
  windows.registerShortcuts(contents);
  webSession().applyIdentity(contents);
  contents.on('context-menu',(_event,params)=>pageContextMenu(t,params));
  // Login con popup (Bungie, Google...) → finestra vera; target=_blank → nuova scheda.
  // Usiamo t.workspace, non un valore iniziale: se la scheda cambia workspace, i suoi popup la seguono.
  contents.setWindowOpenHandler(({url,disposition})=>{
    const action=popupAction(url,disposition);
    if(action==='window')return {action:'allow',overrideBrowserWindowOptions:popupOptions(t)};
    if(action==='tab')newTab(url,t.workspace,{pane:paneOf(t)});
    return {action:'deny'};
  });
  contents.on('did-create-window',child=>guardPopup(child,t));
  contents.on('will-navigate',(event,url)=>{if(!isWebUrl(url))event.preventDefault();});
  contents.on('did-navigate',(_,url)=>{
    require('./adblock.cjs').resetCount(contents.id);
    if(!isWebUrl(url))return;
    t.url=url;
    state.data.history.unshift({url,title:t.title,time:Date.now()});
    state.data.history=state.data.history.slice(0,200);
    persistTabs();windows.emitAll();
  });
  contents.on('did-navigate-in-page',(_,url)=>{if(isWebUrl(url)){t.url=url;persistTabs();windows.emitAll();}});
  contents.on('page-title-updated',(_,title)=>{t.title=title.slice(0,120);persistTabs();windows.emitAll();});
  contents.on('did-start-loading',()=>{t.loadError=null;t.loading=true;windows.emitAll();});
  contents.on('did-stop-loading',()=>{t.loading=false;windows.emitAll();});
  contents.on('page-favicon-updated',(_event,favicons)=>loadFavicon(t,favicons));
  // Risultati di Ctrl+F: "3 di 12" nella barra di ricerca della finestra.
  contents.on('found-in-page',(_event,result)=>{
    const w=windows.windowForTab(t);
    if(w)windows.sendUi(w,{type:'findResult',active:result.activeMatchOrdinal,matches:result.matches});
  });
  contents.on('did-fail-load',(_,code,desc,validatedURL,isMainFrame)=>{
    if(code===-3||!isMainFrame)return;
    // Pagina di errore nella cornice (la pagina vera viene nascosta: vedi windows.pageVisible).
    t.loadError=describeLoadError(code,desc,validatedURL||t.url);
    console.warn(`Caricamento non riuscito: ${t.loadError.url} — ${desc} (${code})`);windows.emitAll();
  });
  contents.on('render-process-gone',(_event,details)=>{
    t.loadError={title:'La pagina si è interrotta',detail:`Il processo della pagina si è chiuso (${details.reason}). Riprova per ricaricarla.`,
      url:t.url,code:details.exitCode,description:details.reason,local:false,httpUrl:null};
    windows.emitAll();
  });
  // Video a schermo intero: la pagina copre tutta la finestra, che va in fullscreen.
  contents.on('enter-html-full-screen',()=>{const w=windows.windowForTab(t);if(w)windows.setPageFullscreen(w,true);});
  contents.on('leave-html-full-screen',()=>{const w=windows.windowForTab(t);if(w?.fullscreen)windows.setPageFullscreen(w,false);});
  contents.loadURL(t.url).catch(()=>{}); // l'errore arriva già da did-fail-load
}

const faviconCache=new Map();
const FAVICON_MAX_BYTES=100*1024;
/**
 * Icona del sito per la scheda. La scarichiamo noi e la passiamo alla cornice
 * come data:, così la cornice non carica mai immagini da Internet (la sua CSP
 * resta chiusa). Una cache evita di riscaricare l'icona dello stesso sito.
 */
async function loadFavicon(t,favicons){
  const url=(favicons||[]).find(u=>/^(https?:|data:image\/)/.test(u));
  if(!url)return;
  try{
    let data=faviconCache.get(url);
    if(!data){
      if(url.startsWith('data:'))data=url.length<=FAVICON_MAX_BYTES*1.4?url:null;
      else{
        const response=await session.fromPartition(PARTITION).fetch(url,{signal:AbortSignal.timeout(8000)});
        const type=response.headers.get('content-type')||'';
        const body=Buffer.from(await response.arrayBuffer());
        if(!response.ok||!/^image\//.test(type)||body.length>FAVICON_MAX_BYTES)return;
        data=`data:${type.split(';')[0]};base64,${body.toString('base64')}`;
      }
      if(!data)return;
      if(faviconCache.size>200)faviconCache.delete(faviconCache.keys().next().value);
      faviconCache.set(url,data);
    }
    if(t.favicon!==data){t.favicon=data;persistTabs();windows.emitAll();}
  }catch{/* icona non disponibile: la scheda resta senza */}
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
  return {width:520,height:720,parent:windows.windowForTab(t)?.win,autoHideMenuBar:true,
    backgroundColor:'#ffffff',
    webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,partition:PARTITION}};
}
/** Regole per la finestra popup: niente indirizzi non web; i suoi link diventano schede. */
function guardPopup(child,t){
  child.removeMenu();
  webSession().applyIdentity(child.webContents);
  child.webContents.setWindowOpenHandler(({url})=>{
    if(isWebUrl(url))newTab(url,t.workspace,{pane:paneOf(t)});
    return {action:'deny'};
  });
  child.webContents.on('will-navigate',(event,url)=>{if(!isWebUrl(url))event.preventDefault();});
}

/** Click destro dentro una pagina: immagini e link. */
function pageContextMenu(t,params){
  const items=[];
  if(params.mediaType==='image'){
    if(isWebUrl(params.srcURL)){
      items.push({label:'Apri immagine in nuova scheda',click:()=>newTab(params.srcURL,t.workspace,{pane:paneOf(t)})});
      items.push({label:'Copia indirizzo immagine',click:()=>clipboard.writeText(params.srcURL)});
      items.push({label:'Salva immagine con nome…',click:()=>t.view?.webContents.downloadURL(params.srcURL)});
    }
    if(params.hasImageContents)items.push({label:'Copia immagine',click:()=>t.view?.webContents.copyImageAt(params.x,params.y)});
  }
  if(isWebUrl(params.linkURL))items.push({label:'Apri collegamento in una nuova scheda',click:()=>newTab(params.linkURL,t.workspace,{pane:paneOf(t)})});
  if(params.selectionText)items.push({label:'Copia',role:'copy'});
  if(params.isEditable)items.push({label:'Incolla',role:'paste'});
  if(items.length)items.push({type:'separator'});
  items.push({label:'Ispeziona elemento',click:()=>{
    // DevTools in una finestra separata: con più monitor è più comodo che agganciati.
    t.view?.webContents.openDevTools({mode:'detach'});
    t.view?.webContents.inspectElement(params.x,params.y);
  }});
  const w=windows.windowForTab(t);
  Menu.buildFromTemplate(items).popup(w?{window:w.win}:{});
}

/** Rende visibile una scheda nella sua finestra, caricandola se era dormiente. */
function show(w,id){
  const t=tabIn(w,id);if(!t)return;
  w.activeId=id;
  if(w.fullscreen)windows.setPageFullscreen(w,false);
  ensureView(t);
  windows.attach(w,t.view);
  state.data.workspaceLastActive[lastActiveKey(w)]=t.url;
  persistTabs();windows.emitAll();
}

/** Apre la scheda che usavi l'ultima volta in quella finestra, oppure una Home. */
function openPreferredTab(w){
  const preferred=state.data.workspaceLastActive[lastActiveKey(w)];
  const own=tabsOf(w);
  const t=own.find(x=>x.url===preferred)||own[0];
  if(t)show(w,t.id);else newHomeTab(w.workspace,{pane:w.pane});
}

/**
 * Chiude una scheda del workspace della finestra.
 * Chiudere l'ULTIMA scheda chiude la finestra; le schede degli altri workspace
 * restano salvate e saranno ripristinate.
 */
function closeTab(w,id){
  const index=state.tabs.findIndex(tab=>tab.id===id&&isInWindow(tab,w));
  if(index===-1)return; // Un evento UI non può chiudere schede di altre finestre.
  const [closed]=state.tabs.splice(index,1);
  // Conserviamo la pagina PRIMA di chiuderla: la View verrà distrutta qui sotto.
  rememberClosed(state.data.closedTabs,closed,20);
  destroyView(closed);
  if(w.activeId===id)w.activeId=null;
  // Contano solo le schede di QUESTA finestra (stesso numero nel workspace).
  if(shouldCloseWindow(state.tabs.filter(t=>paneOf(t)===w.pane),w.workspace)){
    persistTabs();
    w.win.close();
    return;
  }
  // Se rimangono schede nel workspace, ne apriamo una anziché creare Home.
  if(w.activeId===null){
    const next=tabsOf(w)[0];
    if(next)show(w,next.id);
  }else{persistTabs();windows.emitAll();}
}

/** Ricerca dalla Home: la nuova pagina prende il posto della Home. */
function navigateFromHome(w,raw){
  const home=activeTab(w);
  if(!home?.isHome)return false;
  const url=safeUrl(raw,state.data.settings.searchEngine);if(!url)return false;
  const newId=newTab(url,home.workspace,{pane:w.pane});
  if(!newId)return false;
  if(discardHomeAfterNavigation(state.tabs,home.id,newId,home.workspace)){persistTabs();windows.emitAll();}
  return true;
}

/** Naviga nella scheda attiva; dalla Home apre una scheda al suo posto. */
function navigate(w,raw){
  const t=activeTab(w);
  if(!t||t.isHome){if(!navigateFromHome(w,raw))newTab(raw,w.workspace,{pane:w.pane});return;}
  const url=safeUrl(raw,state.data.settings.searchEngine);if(!url)return;
  t.loadError=null;t.url=url;
  // Una scheda dormiente carica direttamente il nuovo indirizzo creando la sua View.
  if(!t.view){ensureView(t);windows.attach(w,t.view);}
  else t.view.webContents.loadURL(url).catch(()=>{}); // l'errore arriva già da did-fail-load
  windows.emitAll();
}

/**
 * Cambia il workspace mostrato da una finestra. Se la finestra principale di
 * quel workspace è già aperta altrove, porta in primo piano quella.
 * Una finestra secondaria resta legata al suo workspace: da lì si apre
 * (o si mostra) la finestra principale dell'altro.
 */
function switchWorkspace(w,name){
  if(!hasWorkspace(name)||name===w.workspace)return;
  if(w.pane>0){openWorkspaceWindow(name);return;}
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

/**
 * Apre una finestra di un workspace (o porta in primo piano quella esistente).
 * @param {number} pane - 0 = finestra principale.
 */
function openWorkspaceWindow(name,saved={},pane=0){
  if(!hasWorkspace(name))return null;
  const existing=windows.windowFor(name,pane);
  if(existing){if(existing.win.isMinimized())existing.win.restore();if(!saved.inactive)existing.win.focus();return existing;}
  const w=windows.createWindow(name,saved,pane);
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
  // Stesso workspace: riapre in questa finestra. Altrimenti nella principale di quel
  // workspace; se non è aperta e siamo nella principale, la mostriamo qui.
  // assignWorkspace (non switchWorkspace) evita di creare una Home in più.
  let target=dest===w.workspace?w:windows.windowFor(dest);
  const moved=!target&&w.pane===0;
  if(moved){assignWorkspace(w,dest);target=w;}
  const settings={pinned:entry.pinned,group:entry.group,title:entry.title,pane:target?.pane||0};
  const id=entry.home?newHomeTab(dest,settings):newTab(entry.url,dest,settings);
  if(!id){
    data.closedTabs.unshift(entry);save();
    if(moved)openPreferredTab(w);
    return false;
  }
  // Da una finestra secondaria verso un workspace chiuso: apriamo la sua principale.
  if(!target){target=openWorkspaceWindow(dest);if(target)show(target,id);}
  if(target&&target!==w)target.win.focus();
  return true;
}

/**
 * Trasferisce una scheda (con la sua pagina già caricata) in un altro workspace.
 * Se era l'ultima, nasce una Home: spostare non equivale a chiudere.
 */
function moveTabToWorkspace(w,id,destination){
  const target=tabIn(w,id);if(!target)return false;
  if(!moveTab(state.tabs,id,destination,state.data.workspaces.map(x=>x.name)))return false;
  target.pane=0; // Nell'altro workspace la scheda va nella finestra principale.
  if(target.view)windows.detachView(target.view);
  leaveWindow(w,id);
  return true;
}

/**
 * Dopo che una scheda ha lasciato la finestra `w`: se era quella visibile ne
 * mostriamo un'altra. Una finestra secondaria rimasta vuota si chiude; la
 * principale invece riceve una Home (resta il "posto" del workspace).
 */
function leaveWindow(w,id){
  if(w.activeId!==id){persistTabs();windows.emitAll();return;}
  w.activeId=null;
  const fallback=tabsOf(w)[0];
  if(fallback)show(w,fallback.id);
  else if(w.pane>0){persistTabs();w.win.close();}
  else newHomeTab(w.workspace,{pane:0});
}

/** Numeri delle finestre aperte di un workspace. */
const openPanes=workspace=>windows.windowsOf(workspace).map(x=>x.pane);

/** Ctrl+N: nuova finestra dello stesso workspace (es. per un altro monitor). */
function newWindow(w){
  const pane=nextPane(openPanes(w.workspace));
  return openWorkspaceWindow(w.workspace,{},pane);
}

/**
 * Sposta una scheda in un'altra finestra dello stesso workspace.
 * @param {number|undefined} pane - Finestra di destinazione; assente = nuova finestra.
 */
function moveTabToWindow(w,id,pane){
  const target=tabIn(w,id);if(!target)return false;
  const destPane=pane===undefined?nextPane(openPanes(w.workspace)):pane;
  if(destPane===w.pane||destPane<0)return false;
  if(pane!==undefined&&!windows.windowFor(w.workspace,destPane))return false;
  target.pane=destPane;
  if(target.view)windows.detachView(target.view);
  // La finestra nuova mostra subito la scheda spostata (è la sua unica scheda).
  const dest=windows.windowFor(w.workspace,destPane)||openWorkspaceWindow(w.workspace,{},destPane);
  if(dest&&dest.activeId!==id)show(dest,id);
  leaveWindow(w,id);
  dest?.win.focus();
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
  const src=state.tabs.findIndex(x=>x.id===id&&isInWindow(x,w));
  const dest=state.tabs.findIndex(x=>x.id===beforeId&&isInWindow(x,w));
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
    if(saved.home)newHomeTab(saved.workspace,{dormant:true,pane:saved.pane});
    else if(isWebUrl(saved.url))newTab(saved.url,saved.workspace,{pinned:saved.pinned,group:saved.group,title:saved.title,dormant:true,pane:saved.pane,favicon:saved.favicon});
  }
}

/**
 * Riapre le finestre della volta scorsa (all'avvio, o dall'icona nell'area di notifica).
 * L'ultimo workspace usato viene aperto per ultimo, così resta in primo piano.
 */
function openSavedWindows(){
  const {data}=state;
  const seen=new Set();
  const key=x=>x.workspace+'#'+validPane(x.pane);
  const wanted=data.openWindows.filter(x=>x&&typeof x.workspace==='string'&&hasWorkspace(x.workspace)&&
    !seen.has(key(x))&&seen.add(key(x)));
  if(!wanted.length)wanted.push({workspace:data.activeWorkspace});
  wanted.sort((a,b)=>(a.workspace===data.activeWorkspace)-(b.workspace===data.activeWorkspace));
  for(const saved of wanted)openWorkspaceWindow(saved.workspace,{bounds:saved.bounds,maximized:saved.maximized},validPane(saved.pane));
}

module.exports={persistTabs,openSavedWindows,newTab,newHomeTab,ensureView,show,openPreferredTab,closeTab,navigate,
  switchWorkspace,openWorkspaceWindow,reopenClosedTab,moveTabToWorkspace,moveTabToWindow,newWindow,
  stackTwoTabs,reorderTab,restoreSession,tabIn,tabsOf,activeTab,lastActiveKey};
