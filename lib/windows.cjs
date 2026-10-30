'use strict';

/**
 * Finestre del browser. Ogni finestra ha la propria cornice (index.html) e
 * mostra un workspace. Le pagine web sono WebContentsView "appoggiate" sopra
 * la cornice: in ogni finestra ne è visibile al massimo una (`attached`).
 */
const path=require('node:path');
const {BrowserWindow,screen}=require('electron');
const {state,save}=require('./state.cjs');
const {pageBounds,isVisibleOnScreens,PAGE_RADIUS,splitRects}=require('./window-rules.cjs');
// Beta 0.21: il raggio degli angoli della pagina si sceglie nelle Impostazioni (Aspetto).
// Beta 0.22: il preset del workspace può avere angoli diversi.
const pageRadius=w=>w?require('./appearance.cjs').effective(w.workspace).radius:state.data?.appearance?.radius??PAGE_RADIUS;
const {tabStripItems,toTabSnapshot,isInWindow,paneOf,rememberClosed}=require('./tab-advanced.cjs');
const {displayLabels}=require('./game-rules.cjs');
const {SIDEBAR_MODES}=require('./storage.cjs');

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

/**
 * La finestra numero `pane` di un workspace (0 = la principale).
 * Uno stesso workspace può avere più finestre, ma ognuna con un numero diverso.
 */
const windowFor=(workspace,pane=0)=>state.windows.find(w=>w.workspace===workspace&&w.pane===pane)||null;
/** Tutte le finestre aperte di un workspace, in ordine di numero. */
const windowsOf=workspace=>state.windows.filter(w=>w.workspace===workspace).sort((a,b)=>a.pane-b.pane);
/** La finestra in cui sta una scheda (o null se quella finestra è chiusa). */
const windowForTab=tab=>windowFor(tab.workspace,paneOf(tab));
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
 * @param {number} pane - Numero della finestra nel workspace (0 = principale).
 */
function createWindow(workspace,saved={},pane=0){
  // Durante la schermata di caricamento (Beta 0.13) la finestra nasce nascosta e compare quando è pronta.
  const behindSplash=require('./splash.cjs').active()&&!saved.inactive;
  const options={width:1280,height:800,minWidth:760,minHeight:520,show:!saved.inactive&&!behindSplash,
    icon:require('./appearance.cjs').iconFile(workspace),
    backgroundColor:'#07070e',title:'VARCO',autoHideMenuBar:true,
    // Windows usa i veri controlli di sistema ma il bordo superiore è nostro.
    // 'height:30' riserva 30px ai pulsanti Windows (minimizza/massimizza/chiudi).
    ...(process.platform==='win32'?{titleBarStyle:'hidden',titleBarOverlay:{color:'#00000000',symbolColor:'#e9e8f5',height:30}}:{}),
    webPreferences:{preload:path.join(__dirname,'..','preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}};
  const workAreas=screen.getAllDisplays().map(d=>d.workArea);
  if(isVisibleOnScreens(saved.bounds,workAreas))Object.assign(options,saved.bounds);
  else{
    // Nuova finestra: leggermente spostata rispetto a quella attuale, così non la copre del tutto.
    const current=focusedWindow();
    if(current){const b=current.win.getBounds();options.x=b.x+32;options.y=b.y+32;}
  }
  const win=new BrowserWindow(options);
  const w={id:win.id,win,workspace,pane,activeId:null,attached:null,
    sidePanelOpen:null,downloadsOpen:false,fullscreen:false,paletteOpen:false,split:null,splitView:null,splitDragging:false,
    // Beta 0.18.2: barra laterale per finestra. Una finestra nuova parte dall'ultima scelta fatta.
    sidebarMode:SIDEBAR_MODES.includes(saved.sidebarMode)?saved.sidebarMode:state.data.sidebarMode};
  // Beta 0.18.1: vista divisa salvata alla chiusura precedente.
  const pending=state.pendingSplits?.[workspace+'#'+pane];
  if(pending){w.split={leftId:pending.leftId,rightId:pending.rightId,ratio:pending.ratio};delete state.pendingSplits[workspace+'#'+pane];}
  state.windows.push(w);
  // Su Windows maximize() attiva la finestra: in modalità inactive non lo usiamo,
  // le dimensioni dell'area del monitor bastano a riempirlo.
  if(saved.inactive)win.once('ready-to-show',()=>win.showInactive());
  else if(behindSplash)win.once('ready-to-show',()=>{
    if(saved.maximized)win.maximize();else win.show();
    require('./splash.cjs').close();
  });
  else if(saved.maximized)win.maximize();
  win.loadFile(path.join(__dirname,'..','index.html'));
  win.webContents.on('did-finish-load',()=>emit(w));
  registerShortcuts(win.webContents);
  win.on('resize',()=>{layout(w);require('./toasts.cjs').position(w);require('./popup.cjs').resized(w);rememberSoon();});
  win.on('move',rememberSoon);
  win.on('focus',()=>{state.data.activeWorkspace=w.workspace;});
  // Se la finestra esce dallo schermo intero per altre vie, anche il video deve uscirne.
  win.on('leave-full-screen',()=>{
    // Modalità zen chiusa da Windows (es. Win+freccia): torna la finestra normale.
    if(w.zen&&!w.fullscreen){w.zen=false;layout(w);emit(w);return;}
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
 * Finestra chiusa.
 * - Principale (pane 0): le pagine diventano dormienti (niente RAM usata) ma
 *   restano nella sessione e tornano quando riapri il workspace.
 * - Secondaria: come in Chrome, chiudere la finestra chiude le sue schede
 *   (recuperabili con Ctrl+Shift+T). Eccezioni: uscita dal browser e ultima
 *   finestra aperta, che al prossimo avvio vengono riaperte con le loro schede.
 */
function onClosed(w){
  state.windows=state.windows.filter(x=>x!==w);
  const discard=w.pane>0&&!state.quitting&&state.windows.length>0;
  for(const tab of state.tabs.filter(t=>isInWindow(t,w))){
    if(tab.view){tab.view.webContents.close();tab.view=null;}
    if(discard){rememberClosed(state.data.closedTabs,tab,20);state.tabs.splice(state.tabs.indexOf(tab),1);}
  }
  tabs().persistTabs();
  emitAll(); // Le altre finestre aggiornano l'indicatore "aperto altrove".
}

/** Mostra la pagina indicata in una finestra (null = nessuna pagina, es. Home). */
function attach(w,view){
  const animate=!!view&&w.attached!==view&&!w.fullscreen&&state.data.settings.tabAnimations&&!splitPair(w);
  if(w.attached!==view){
    // La pagina che lascia il posto resta nella finestra solo se è l'altro lato della vista divisa.
    if(w.attached&&w.attached!==w.splitView)w.win.contentView.removeChildView(w.attached);
    w.attached=view||null;
    if(view){
      // Angoli arrotondati (Beta 0.14); a schermo intero la pagina torna squadrata in layout().
      view.setBorderRadius(w.fullscreen?0:pageRadius(w));
      w.win.contentView.addChildView(view);
      require('./toasts.cjs').bringToFront(w); // i toast restano sopra la nuova pagina
    }
  }
  layout(w);
  if(animate)slideIn(w,view);
}
/**
 * Beta 0.15 (mock-up "Page Slider"): la pagina appena mostrata entra scorrendo da
 * destra per circa 150 ms. Si muove solo la posizione, non la larghezza, così il sito
 * non deve ridisegnarsi a ogni passo.
 */
const SLIDE_DISTANCE=40,SLIDE_STEPS=9,SLIDE_FRAME=16;
function slideIn(w,view){
  clearInterval(w.slideTimer);
  let step=0;
  const move=()=>{
    if(w.attached!==view||view.webContents.isDestroyed()||w.win.isDestroyed()){clearInterval(w.slideTimer);return;}
    const [width,height]=w.win.getContentSize();
    const final=pageBounds({width,height},{sidebarMode:w.sidebarMode,
      sidePanelOpen:!!w.sidePanelOpen,downloadsOpen:w.downloadsOpen,fullscreen:w.fullscreen||w.zen});
    const progress=1-Math.pow(1-step/SLIDE_STEPS,3); // rallenta all'arrivo
    view.setBounds({...final,x:final.x+Math.round(SLIDE_DISTANCE*(1-progress))});
    if(step++>=SLIDE_STEPS)clearInterval(w.slideTimer);
  };
  move();
  w.slideTimer=setInterval(move,SLIDE_FRAME);
}

/** Stacca una pagina da qualunque finestra la stia mostrando. */
function detachView(view){
  for(const w of state.windows){
    if(w.splitView===view){try{w.win.contentView.removeChildView(view);}catch{}w.splitView=null;}
    if(w.attached===view)attach(w,null);
  }
}

// ── Vista divisa (Beta 0.18) ────────────────────────────────────────────
// w.split = {leftId, rightId, ratio}: due schede della finestra affiancate.
// La scheda attiva (w.activeId) è in w.attached; l'altra in w.splitView.
// La coppia resta ricordata: se mostri un'altra scheda la vista divisa si "chiude",
// tornando a una delle due ricompare.

/** La coppia da mostrare ora, oppure null (coppia non valida o scheda attiva fuori dalla coppia). */
function splitPair(w){
  const s=w.split;if(!s)return null;
  const left=state.tabs.find(t=>t.id===s.leftId),right=state.tabs.find(t=>t.id===s.rightId);
  if(!left||!right||left.isHome||right.isHome||!isInWindow(left,w)||!isInWindow(right,w)){w.split=null;return null;}
  if(w.activeId!==left.id&&w.activeId!==right.id)return null;
  return {left,right};
}
function fullBounds(w){
  const [width,height]=w.win.getContentSize();
  return pageBounds({width,height},{sidebarMode:w.sidebarMode,
    sidePanelOpen:!!w.sidePanelOpen,downloadsOpen:w.downloadsOpen,fullscreen:w.fullscreen||w.zen});
}
/** Mette (o toglie) la seconda pagina e divide lo spazio tra le due. */
/**
 * Segna sulle schede il loro lato della vista divisa: così il salvataggio della sessione
 * lo ricorda anche dopo che la finestra si è chiusa (all'uscita le finestre si chiudono prima).
 */
function markSplit(w){
  splitPair(w); // toglie una coppia non più valida
  for(const t of state.tabs){
    if(!isInWindow(t,w))continue;
    const side=w.split?.leftId===t.id?'left':w.split?.rightId===t.id?'right':null;
    if(side){if(t.splitSide!==side||t.splitRatio!==w.split.ratio){t.splitSide=side;t.splitRatio=w.split.ratio;tabs().persistTabs();}}
    else if(t.splitSide){delete t.splitSide;delete t.splitRatio;tabs().persistTabs();}
  }
}
function syncSplit(w){
  if(w.win.isDestroyed())return;
  markSplit(w);
  const pair=!w.fullscreen&&w.attached?splitPair(w):null;
  const otherTab=pair?(pair.left.id===w.activeId?pair.right:pair.left):null;
  if(otherTab&&!otherTab.view)tabs().ensureView(otherTab);
  const otherView=otherTab?.view||null;
  if(w.splitView!==otherView){
    if(w.splitView&&w.splitView!==w.attached){try{w.win.contentView.removeChildView(w.splitView);}catch{}}
    w.splitView=otherView;
    if(otherView){
      otherView.setBorderRadius(pageRadius(w));
      w.win.contentView.addChildView(otherView);
      require('./toasts.cjs').bringToFront(w);
    }
  }
  if(!pair||!otherView)return;
  const rects=splitRects(fullBounds(w),w.split.ratio);
  const activeLeft=pair.left.id===w.activeId;
  w.attached.setBounds(activeLeft?rects.left:rects.right);
  otherView.setBounds(activeLeft?rects.right:rects.left);
  otherView.setVisible(pageVisible(w));
}
/** Clic dentro l'altro lato: diventa la scheda attiva (barra degli indirizzi, zoom, Ctrl+F…). */
function focusSplitPane(w,id){
  const t=state.tabs.find(x=>x.id===id);
  if(!t?.view||w.splitView!==t.view||w.activeId===id)return;
  [w.attached,w.splitView]=[w.splitView,w.attached];
  w.activeId=id;
  state.data.workspaceLastActive[tabs().lastActiveKey(w)]=t.url;
  emitAll();
}
/** Per la cornice: lati, scheda attiva e misure (divisore, contorno del lato attivo). */
function splitSnapshot(w){
  const pair=!w.fullscreen?splitPair(w):null;
  if(!pair)return null;
  const rects=splitRects(fullBounds(w),w.split.ratio);
  return {leftId:pair.left.id,rightId:pair.right.id,focused:pair.left.id===w.activeId?'left':'right',
    ratio:w.split.ratio,rects,dragging:!!w.splitDragging,
    titles:{left:pair.left.title||pair.left.url,right:pair.right.title||pair.right.url}};
}

/** Ricalcola lo spazio della pagina: sidebar, pannelli e schermo intero. */
function layout(w){
  if(!w.attached||w.win.isDestroyed()){if(w.splitView&&!w.win.isDestroyed())syncSplit(w);return;}
  const [width,height]=w.win.getContentSize();
  w.attached.setBounds(pageBounds({width,height},{sidebarMode:w.sidebarMode,
    sidePanelOpen:!!w.sidePanelOpen,downloadsOpen:w.downloadsOpen,fullscreen:w.fullscreen||w.zen}));
  w.attached.setVisible(pageVisible(w));
  w.attached.setBorderRadius(w.fullscreen||w.zen?0:pageRadius(w));
  syncSplit(w);
}
/**
 * La pagina vera si nasconde quando la cornice disegna qualcosa al suo posto:
 * la palette (Beta 0.11) o la pagina di errore (0.11.1), che altrimenti finirebbero sotto il sito.
 */
function pageVisible(w){
  // Mentre trascini il divisore della vista divisa le pagine si nascondono: la cornice
  // non riceve il mouse quando è sopra una pagina, e il trascinamento si interromperebbe.
  return !w.paletteOpen&&!w.splitDragging&&!state.tabs.find(t=>t.id===w.activeId)?.loadError;
}
function layoutAll(){for(const w of state.windows)layout(w);}

/**
 * Beta 0.19 — modalità zen: la finestra va a schermo intero, la pagina occupa tutto
 * (niente barra del titolo, barra in alto, barra laterale, schede) e le notifiche tacciono.
 * F11 entra ed esce.
 */
function setZen(w,on){
  w.zen=!!on;
  if(!w.fullscreen)w.win.setFullScreen(w.zen);
  layout(w);emitAll();
}
const zenActive=()=>state.windows.some(w=>w.zen);

/** Video a schermo intero richiesto da una pagina (API HTML Fullscreen). */
function setPageFullscreen(w,on){
  w.fullscreen=on;
  w.win.setFullScreen(on||!!w.zen); // uscendo dal video si resta in zen, se era attiva
  layout(w);
}

/**
 * Salva quali finestre sono aperte, con workspace e posizione.
 * @param {object|null} exclude - Finestra che si sta chiudendo e non va ricordata.
 */
function rememberOpenWindows(exclude=null){
  state.data.openWindows=state.windows
    .filter(w=>w!==exclude&&!w.win.isDestroyed())
    .map(w=>({workspace:w.workspace,pane:w.pane,bounds:w.win.getNormalBounds(),maximized:w.win.isMaximized(),sidebarMode:w.sidebarMode}));
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
  const visibleTabs=state.tabs.filter(t=>isInWindow(t,w)).map(t=>toTabSnapshot(t,w.activeId));
  return {
    activeWorkspace:w.workspace,
    // Numero della finestra nel workspace e quante ne sono aperte: "Finestra 2 di 3".
    pane:w.pane,paneCount:windowsOf(w.workspace).length,
    sidebarMode:w.sidebarMode,sidePanelOpen:w.sidePanelOpen,zen:!!w.zen,
    workspaces:data.workspaces.map(x=>{
      const owner=windowFor(x.name);
      const layout=data.layouts[x.name];
      return {name:x.name,iconData:x.iconData||null,projectPath:x.projectPath||'',resources:x.resources||[],
        color:x.color?require('./workspace-rules.cjs').WORKSPACE_COLORS[x.color]:null,
        count:state.tabs.filter(t=>t.workspace===x.name).length,
        // La finestra principale è già aperta altrove: cliccarlo porta in primo piano quella.
        openElsewhere:!!owner&&owner!==w,
        layout:layout?{windows:layout.windows.length,
          monitors:new Set(layout.windows.map(x=>x.displayIndex)).size,savedAt:layout.savedAt}:null};
    }),
    // Beta 0.18: vista divisa; le due schede della coppia sono segnate nella barra.
    split:splitSnapshot(w),
    tabs:visibleTabs.map(t=>w.split&&(t.id===w.split.leftId||t.id===w.split.rightId)?{...t,inSplit:true}:t),
    tabStrip:tabStripItems(visibleTabs.map(t=>w.split&&(t.id===w.split.leftId||t.id===w.split.rightId)?{...t,inSplit:true}:t),w.workspace,data.collapsedStacks,w.activeId),
    activeTab:w.activeId,canReopenClosed:data.closedTabs.length>0,
    downloadsOpen:w.downloadsOpen,downloads:state.downloads.map(d=>({...d})),
    bookmarks:data.bookmarks,history:data.history.slice(0,40),
    homeActive:!!activeTab?.isHome,
    internalPage:activeTab?.isHome?(activeTab.url==='app://settings'?'settings':'home'):null,loadError:activeTab?.loadError||null,
    zoom:activeTab?.view?Math.round(activeTab.view.webContents.getZoomFactor()*100):100,
    site:siteSnapshot(activeTab,w.sidePanelOpen==='site'),
    // Pannello Giochi: monitor e giochi servono solo mentre è aperto.
    ...(w.sidePanelOpen==='games'?gamesSnapshot():{}),
    ...(w.sidePanelOpen==='project'?projectSnapshot(w.workspace):{}),
    // Centro notifiche (Beta 0.15): il numero di non lette sempre, l'elenco solo a pannello aperto.
    ...require('./toasts.cjs').historySnapshot(w.sidePanelOpen==='notifications'),
    // Beta 0.17: note del workspace (solo a pannello aperto) e workspace da rinominare.
    ...(w.sidePanelOpen==='notes'?{notes:data.notes[w.workspace]||{text:'',updatedAt:null}}:{}),
    ...(w.sidePanelOpen==='renameWorkspace'?{renameTarget:w.renameTarget||null}:{}),
    ...(activeTab?.isHome&&activeTab.url==='app://settings'?{...require('./commands-settings.cjs').settingsSnapshot(),
      appearanceSettings:require('./appearance.cjs').settingsSnapshot(w.workspace)}:{}),
    // Beta 0.21: colori, sfondo, pulsanti nascosti e Home su misura.
    appearance:require('./appearance.cjs').snapshot(w.workspace),
    // Sfera e stato di JARVIS: sempre; dettagli del server solo con il pannello JARVIS aperto.
    ...require('./jarvis.cjs').snapshot(w.sidePanelOpen==='jarvis')
  };
}
/** Pannello Progetto: file, comandi con log, monitor. Caricato solo quando serve. */
function projectSnapshot(workspace){
  return {workenv:require('./workenv.cjs').snapshot(workspace),project:{...require('./projects.cjs').snapshot(workspace),
    commands:require('./project-processes.cjs').snapshot(workspace),
    monitors:require('./monitors.cjs').snapshot(workspace)}};
}
/**
 * Scudo ⛉ accanto alla barra degli indirizzi: sito, connessione protetta,
 * elementi bloccati. Con il pannello del sito aperto anche permessi e blocco.
 */
function siteSnapshot(tab,full){
  if(!tab||tab.isHome)return null;
  const {originOf}=require('./permission-rules.cjs');
  const adblock=require('./adblock.cjs');
  const origin=originOf(tab.url);
  let host='';try{host=new URL(tab.url).hostname;}catch{}
  const local=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(host);
  const base={origin,host,secure:tab.url.startsWith('https:')||local,
    blocked:tab.view?adblock.countFor(tab.view.webContents.id):0};
  if(!full)return base;
  return {...base,adblock:adblock.snapshot(tab.url),...require('./permissions.cjs').snapshot(origin)};
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
function emit(w){
  if(w.win.isDestroyed())return;
  // Il titolo appare nella barra delle applicazioni: con 3 finestre aiuta a distinguerle.
  const title=w.workspace+(w.pane?` — Finestra ${w.pane+1}`:'')+' · VARCO';
  if(w.win.getTitle()!==title)w.win.setTitle(title);
  require('./appearance.cjs').syncIcon(w); // Beta 0.22: icona del preset nella barra delle applicazioni
  w.win.webContents.send('state',snapshot(w));
  if(w.attached&&w.attached.getVisible()!==pageVisible(w))w.attached.setVisible(pageVisible(w));
  if(w.splitView&&w.splitView.getVisible()!==pageVisible(w))w.splitView.setVisible(pageVisible(w));
}
/** Aggiorna tutte le finestre: i conteggi dei workspace e i download sono condivisi. */
function emitAll(){for(const w of state.windows)emit(w);}
/** Messaggi puntuali per la cornice, es. {type:'focusAddress'}. */
function sendUi(w,message){if(!w.win.isDestroyed())w.win.webContents.send('ui',message);}

module.exports={setZen,zenActive,syncSplit,focusSplitPane,splitPair,setShortcutHandler,registerShortcuts,windowFor,windowsOf,windowForTab,windowOfContents,focusedWindow,
  createWindow,attach,detachView,layout,layoutAll,setPageFullscreen,rememberOpenWindows,
  snapshot,emit,emitAll,sendUi};
