'use strict';

/**
 * Finestre del browser. Ogni finestra ha la propria cornice (index.html) e
 * mostra un workspace. Le pagine web sono WebContentsView "appoggiate" sopra
 * la cornice: in ogni finestra ne è visibile al massimo una (`attached`).
 */
const path=require('node:path');
const {BrowserWindow,screen}=require('electron');
const {state,save}=require('./state.cjs');
const {pageBounds,isVisibleOnScreens}=require('./window-rules.cjs');
const {tabStripItems,toTabSnapshot}=require('./tab-advanced.cjs');
const {displayLabels}=require('./game-rules.cjs');

// tabs.cjs richiede questo file: lo carichiamo solo quando serve per evitare
// un riferimento circolare incompleto durante l'avvio.
const tabs=()=>require('./tabs.cjs');

let shortcutHandler=null;
/** Imposta chi riceve le scorciatoie da tastiera (main.cjs collega il bus dei comandi). */
function setShortcutHandler(fn){shortcutHandler=fn;}
/** Ascolta i tasti sia nella cornice sia nei siti: il focus può stare in entrambi. */
function registerShortcuts(contents){
  contents.on('before-input-event',(event,input)=>{
    if(shortcutHandler?.(contents,input))event.preventDefault();
  });
}

const windowFor=workspace=>state.windows.find(w=>w.workspace===workspace)||null;
const windowOfContents=contents=>state.windows.find(w=>w.win.webContents===contents)||null;
/** Finestra in primo piano, oppure la prima aperta (per chiamanti esterni come JARVIS). */
function focusedWindow(){
  const focused=BrowserWindow.getFocusedWindow();
  return state.windows.find(w=>w.win===focused)||state.windows[0]||null;
}

/**
 * Crea una finestra per un workspace.
 * @param {string} workspace
 * @param {{bounds?:object,maximized?:boolean,inactive?:boolean}} saved - Posizione salvata, se ancora visibile.
 *   inactive=true: la finestra compare senza prendere il focus (companion: il gioco resta davanti).
 */
function createWindow(workspace,saved={}){
  const options={width:1280,height:800,minWidth:760,minHeight:520,show:!saved.inactive,
    icon:path.join(__dirname,'..','assets','app-icon.png'),
    backgroundColor:'#050505',title:'Personal Browser Beta',autoHideMenuBar:true,
    // Windows usa i veri controlli di sistema ma il bordo superiore è nostro.
    // 'height:30' riserva 30px ai pulsanti Windows (minimizza/massimizza/chiudi).
    ...(process.platform==='win32'?{titleBarStyle:'hidden',titleBarOverlay:{color:'#0b0b0b',symbolColor:'#eeeeee',height:30}}:{}),
    webPreferences:{preload:path.join(__dirname,'..','preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}};
  const workAreas=screen.getAllDisplays().map(d=>d.workArea);
  if(isVisibleOnScreens(saved.bounds,workAreas))Object.assign(options,saved.bounds);
  else{
    // Nuova finestra: leggermente spostata rispetto a quella attuale, così non la copre del tutto.
    const current=focusedWindow();
    if(current){const b=current.win.getBounds();options.x=b.x+32;options.y=b.y+32;}
  }
  const win=new BrowserWindow(options);
  const w={id:win.id,win,workspace,activeId:null,attached:null,
    sidePanelOpen:null,downloadsOpen:false,fullscreen:false};
  state.windows.push(w);
  // Su Windows maximize() attiva la finestra: in modalità inactive non lo usiamo,
  // le dimensioni dell'area del monitor bastano a riempirlo.
  if(saved.inactive)win.once('ready-to-show',()=>win.showInactive());
  else if(saved.maximized)win.maximize();
  win.loadFile(path.join(__dirname,'..','index.html'));
  win.webContents.on('did-finish-load',()=>emit(w));
  registerShortcuts(win.webContents);
  win.on('resize',()=>{layout(w);rememberSoon();});
  win.on('move',rememberSoon);
  win.on('focus',()=>{state.data.activeWorkspace=w.workspace;});
  // Se la finestra esce dallo schermo intero per altre vie, anche il video deve uscirne.
  win.on('leave-full-screen',()=>{
    if(!w.fullscreen)return;
    w.fullscreen=false;layout(w);
    w.attached?.webContents.executeJavaScript('document.exitFullscreen?.()',true).catch(()=>{});
  });
  win.on('close',()=>{
    if(state.quitting)return; // before-quit ha già registrato tutte le finestre.
    // L'ultima finestra resta nell'elenco: al prossimo avvio si riapre lei.
    rememberOpenWindows(state.windows.length>1?w:null);
  });
  win.on('closed',()=>onClosed(w));
  return w;
}

/**
 * Finestra chiusa: le sue pagine diventano dormienti (niente RAM usata),
 * ma restano nella sessione e si ricaricano quando il workspace viene riaperto.
 */
function onClosed(w){
  state.windows=state.windows.filter(x=>x!==w);
  for(const tab of state.tabs){
    if(tab.workspace!==w.workspace||!tab.view)continue;
    tab.view.webContents.close();
    tab.view=null;
  }
  tabs().persistTabs();
  emitAll(); // Le altre finestre aggiornano l'indicatore "aperto altrove".
}

/** Mostra la pagina indicata in una finestra (null = nessuna pagina, es. Home). */
function attach(w,view){
  if(w.attached!==view){
    if(w.attached)w.win.contentView.removeChildView(w.attached);
    w.attached=view||null;
    if(view)w.win.contentView.addChildView(view);
  }
  layout(w);
}
/** Stacca una pagina da qualunque finestra la stia mostrando. */
function detachView(view){
  for(const w of state.windows)if(w.attached===view)attach(w,null);
}

/** Ricalcola lo spazio della pagina: sidebar, pannelli e schermo intero. */
function layout(w){
  if(!w.attached||w.win.isDestroyed())return;
  const [width,height]=w.win.getContentSize();
  w.attached.setBounds(pageBounds({width,height},{sidebarMode:state.data.sidebarMode,
    sidePanelOpen:!!w.sidePanelOpen,downloadsOpen:w.downloadsOpen,fullscreen:w.fullscreen}));
}
function layoutAll(){for(const w of state.windows)layout(w);}

/** Video a schermo intero richiesto da una pagina (API HTML Fullscreen). */
function setPageFullscreen(w,on){
  w.fullscreen=on;
  w.win.setFullScreen(on);
  layout(w);
}

/**
 * Salva quali finestre sono aperte, con workspace e posizione.
 * @param {object|null} exclude - Finestra che si sta chiudendo e non va ricordata.
 */
function rememberOpenWindows(exclude=null){
  state.data.openWindows=state.windows
    .filter(w=>w!==exclude&&!w.win.isDestroyed())
    .map(w=>({workspace:w.workspace,bounds:w.win.getNormalBounds(),maximized:w.win.isMaximized()}));
  save();
}
let rememberTimer=null;
/** Spostamenti e ridimensionamenti arrivano a raffica: salviamo dopo 500ms di calma. */
function rememberSoon(){
  clearTimeout(rememberTimer);
  rememberTimer=setTimeout(()=>{if(!state.quitting)rememberOpenWindows();},500);
}

/**
 * Prepara soltanto informazioni serializzabili per la UI di UNA finestra.
 * NON inviare view/webContents: sono oggetti Electron del processo principale.
 */
function snapshot(w){
  const {data}=state;
  const activeTab=state.tabs.find(t=>t.id===w.activeId);
  // Ogni scheda mantiene la propria proprietà workspace (regressione 0.4).
  const visibleTabs=state.tabs.filter(t=>t.workspace===w.workspace).map(t=>toTabSnapshot(t,w.activeId));
  return {
    activeWorkspace:w.workspace,
    sidebarMode:data.sidebarMode,sidePanelOpen:w.sidePanelOpen,
    workspaces:data.workspaces.map(x=>{
      const owner=windowFor(x.name);
      return {name:x.name,iconData:x.iconData||null,projectPath:x.projectPath||'',resources:x.resources||[],
        count:state.tabs.filter(t=>t.workspace===x.name).length,
        // Già aperto in un'altra finestra: cliccarlo porta in primo piano quella.
        openElsewhere:!!owner&&owner!==w};
    }),
    tabs:visibleTabs,
    tabStrip:tabStripItems(visibleTabs,w.workspace,data.collapsedStacks,w.activeId),
    activeTab:w.activeId,canReopenClosed:data.closedTabs.length>0,
    downloadsOpen:w.downloadsOpen,downloads:state.downloads.map(d=>({...d})),
    bookmarks:data.bookmarks,history:data.history.slice(0,40),
    homeActive:!!activeTab?.isHome,loadError:activeTab?.loadError||null,
    // Pannello Giochi: monitor e giochi servono solo mentre è aperto.
    ...(w.sidePanelOpen==='games'?gamesSnapshot():{}),
    ...(w.sidePanelOpen==='project'?projectSnapshot(w.workspace):{})
  };
}
/** Pannello Progetto: file, comandi con log, monitor. Caricato solo quando serve. */
function projectSnapshot(workspace){
  return {project:{...require('./projects.cjs').snapshot(workspace),
    commands:require('./project-processes.cjs').snapshot(workspace),
    monitors:require('./monitors.cjs').snapshot(workspace)}};
}
function gamesSnapshot(){
  const {data}=state;
  return {
    games:data.games.map(g=>({...g,running:!!state.gameWatcher?.isRunning(g.id)})),
    gameWatcher:data.settings.gameWatcher,
    displays:displayLabels(screen.getAllDisplays(),screen.getPrimaryDisplay().id),
    platformSupported:process.platform==='win32'
  };
}
function emit(w){if(!w.win.isDestroyed())w.win.webContents.send('state',snapshot(w));}
/** Aggiorna tutte le finestre: i conteggi dei workspace e i download sono condivisi. */
function emitAll(){for(const w of state.windows)emit(w);}
/** Messaggi puntuali per la cornice, es. {type:'focusAddress'}. */
function sendUi(w,message){if(!w.win.isDestroyed())w.win.webContents.send('ui',message);}

module.exports={setShortcutHandler,registerShortcuts,windowFor,windowOfContents,focusedWindow,
  createWindow,attach,detachView,layout,layoutAll,setPageFullscreen,rememberOpenWindows,
  snapshot,emit,emitAll,sendUi};
