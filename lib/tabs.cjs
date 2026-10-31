'use strict';

/**
 * Schede: creazione, caricamento, chiusura, workspace e stack.
 * Ogni funzione che agisce "su ciò che vedi" riceve la finestra `w`.
 */
const {WebContentsView,clipboard,session}=require('electron');
const {state,save,saveSoon}=require('./state.cjs');
const windows=require('./windows.cjs');
const {PARTITION,safeUrl,isWebUrl,isTabUrl,popupAction,describeLoadError,SCROLLBAR_CSS}=require('./web-rules.cjs');
const {shouldCloseWindow,discardHomeAfterNavigation}=require('./tab-lifecycle.cjs');
const {moveTab,rememberClosed,groupName,paneOf,isInWindow,nextPane,isCollapsed,toggleCollapsed}=require('./tab-advanced.cjs');
const tabTools=require('./tab-tools-rules.cjs');

// web-session.cjs richiede windows.cjs come noi: lo carichiamo quando serve.
const webSession=()=>require('./web-session.cjs');
const hasWorkspace=name=>state.data.workspaces.some(w=>w.name===name);
/** Una scheda della finestra `w`: stesso workspace E stesso numero di finestra. */
const tabIn=(w,id)=>state.tabs.find(t=>t.id===id&&isInWindow(t,w))||null;
const tabsOf=w=>state.tabs.filter(t=>isInWindow(t,w));
/** Pagine interne disegnate dalla cornice (nessuna WebContentsView). */
const INTERNAL_PAGES={home:{url:'app://home',title:'Home'},settings:{url:'app://settings',title:'Impostazioni'}};
const internalPage=url=>url===INTERNAL_PAGES.settings.url?'settings':'home';
/** Scheda usata per ultima: una per finestra (la principale usa la chiave delle beta precedenti). */
const lastActiveKey=w=>w.pane?`${w.workspace}#${w.pane}`:w.workspace;
const validPane=pane=>Number.isInteger(pane)&&pane>0&&pane<100?pane:0;
const activeTab=w=>w?tabIn(w,w.activeId):null;

/** Salva la sessione: schede di TUTTI i workspace, anche quelli senza finestra. */
function persistTabs(){
  const {data}=state;
  if(!data)return;
  // Home appartiene alla sessione come qualunque pagina web esterna.
  data.sessionTabs=state.tabs.filter(t=>t.isHome||isTabUrl(t.url)).map(t=>({url:t.url,home:!!t.isHome,
    workspace:t.workspace,pane:paneOf(t),title:t.title,pinned:!!t.pinned,group:t.group||null,
    favicon:t.favicon&&t.favicon.length<6000?t.favicon:null,
    // Beta 0.28: posto e disposizione nella vista divisa (fino a 4 riquadri), per ricomporla al prossimo avvio.
    ...(Number.isInteger(t.splitSlot)?{splitSlot:t.splitSlot,splitMeta:t.splitMeta}:{})})).slice(0,60);
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
  // Beta 0.20: le pagine del visualizzatore di file arrivano già pronte (varco-view://app/viewer.html?p=…).
  const url=isTabUrl(raw)&&!isWebUrl(raw)?raw:safeUrl(raw,state.data.settings.searchEngine);if(!url)return null;
  const t={id:state.nextId++,workspace:ws,pane:validPane(settings.pane),url,title:settings.title||'Nuova scheda',view:null,isHome:false,
    loadError:null,pinned:!!settings.pinned,group:groupName(settings.group),
    favicon:typeof settings.favicon==='string'&&settings.favicon.startsWith('data:image/')?settings.favicon:null,loading:false};
  placeTab(t);
  autoGroup(t);
  const owner=windows.windowForTab(t);
  if(owner&&!settings.dormant){
    if(settings.activate!==false)show(owner,t.id);
    else ensureView(t);
  }
  persistTabs();windows.emitAll();
  return t.id;
}

/**
 * La homepage è una scheda vera: stessa logica di attivazione e chiusura. Non ha View.
 * Beta 0.12: anche le Impostazioni sono una pagina interna di questo tipo
 * (settings.url='app://settings'): la cornice disegna l'una o l'altra.
 */
function newHomeTab(ws,settings={}){
  if(!hasWorkspace(ws))return null;
  const page=internalPage(settings.url);
  const t={id:state.nextId++,workspace:ws,pane:validPane(settings.pane),url:INTERNAL_PAGES[page].url,title:INTERNAL_PAGES[page].title,
    view:null,isHome:true,loadError:null,pinned:false,group:null};
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
/** adopted (Beta 0.27): una pagina già aperta (l'anteprima dei link) diventa la pagina di questa scheda. */
function ensureView(t,adopted=null){
  if(t.isHome||t.view)return;
  const view=adopted||new WebContentsView({webPreferences:{nodeIntegration:false,contextIsolation:true,
    plugins:true, // Beta 0.20: lettore PDF di Chromium nel visualizzatore di file
    
    sandbox:true,webSecurity:true,partition:PARTITION}});
  t.view=view;
  t.lastVisibleAt=Date.now(); // per la sospensione (sleeper.cjs): appena caricata conta come vista
  const contents=view.webContents;
  windows.registerShortcuts(contents);
  webSession().applyIdentity(contents);
  contents.on('context-menu',(_event,params)=>pageContextMenu(t,params));
  require('./extensions.cjs').track(t); // Beta 0.26: la scheda esiste per le estensioni (chrome.tabs)
  // Login con popup (Bungie, Google...) → finestra vera; target=_blank → nuova scheda.
  // Usiamo t.workspace, non un valore iniziale: se la scheda cambia workspace, i suoi popup la seguono.
  contents.setWindowOpenHandler(({url,disposition})=>{
    const action=popupAction(url,disposition);
    if(action==='window')return {action:'allow',overrideBrowserWindowOptions:popupOptions(t)};
    if(action==='tab')newTab(url,t.workspace,{pane:paneOf(t)});
    return {action:'deny'};
  });
  contents.on('did-create-window',child=>guardPopup(child,t));
  contents.on('will-navigate',(event,url)=>{
    if(isWebUrl(url))return;
    event.preventDefault();
    // Beta 0.20: un file trascinato su una pagina diventa una navigazione file://: lo apriamo nel visualizzatore.
    if(/^file:/i.test(url))require('./file-viewer.cjs').openFile(windows.windowForTab(t),url);
  });
  contents.on('did-navigate',(_,url)=>{
    require('./adblock.cjs').resetCount(contents.id);
    if(!isWebUrl(url))return;
    t.url=url;
    state.data.history.unshift({url,title:t.title,time:Date.now()});
    state.data.history=state.data.history.slice(0,200);
    autoGroup(t);
    persistTabs();windows.emitAll();
  });
  contents.on('did-navigate-in-page',(_,url)=>{if(isWebUrl(url)){t.url=url;persistTabs();windows.emitAll();}});
  contents.on('page-title-updated',(_,title)=>{t.title=title.slice(0,120);persistTabs();windows.emitAll();});
  contents.on('did-start-loading',()=>{t.loadError=null;t.loading=true;windows.emitAll();});
  contents.on('did-stop-loading',()=>{t.loading=false;windows.emitAll();});
  // Vista divisa (Beta 0.18): cliccando dentro l'altro lato, diventa quello attivo.
  contents.on('focus',()=>{const w=windows.windowForTab(t);if(w?.split&&w.activeId!==t.id)windows.focusSplitPane(w,t.id);});
  contents.on('dom-ready',()=>{contents.insertCSS(SCROLLBAR_CSS,{cssOrigin:'user'}).catch(()=>{});});
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
  if(!adopted)contents.loadURL(t.url).catch(()=>{}); // l'errore arriva già da did-fail-load
}
/** Beta 0.27: l'anteprima di un link diventa una scheda, senza ricaricare la pagina. */
function adoptView(view,w,{activate=true}={}){
  const contents=view.webContents;
  const t={id:state.nextId++,workspace:w.workspace,pane:w.pane||0,url:contents.getURL(),title:contents.getTitle()||'Nuova scheda',view:null,isHome:false,
    loadError:null,pinned:false,group:null,favicon:null,loading:contents.isLoading()};
  placeTab(t);
  ensureView(t,view);
  if(activate)show(w,t.id);
  persistTabs();windows.emitAll();
  return t.id;
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
  require('./extensions.cjs').untrack(t.view.webContents);
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

/**
 * Click destro dentro una pagina (Beta 0.15: menu VARCO, mock-up "Menu contestuali").
 * Le voci cambiano con quello che c'è sotto il mouse: link, immagine, testo selezionato,
 * campo di testo, oppure la pagina in generale.
 */
function pageContextMenu(t,params){
  const contents=t.view?.webContents;if(!contents)return;
  const w=windows.windowForTab(t);if(!w)return;
  const pane={pane:paneOf(t)};
  const engine=require('./web-rules.cjs').SEARCH_ENGINES[state.data.settings.searchEngine]?.label||'Google';
  const selection=String(params.selectionText||'').trim().replace(/\s+/g,' ');
  const short=selection.length>28?selection.slice(0,26)+'…':selection;
  const items=[];
  const sep=()=>items.push({type:'separator'});
  if(isWebUrl(params.linkURL)){
    items.push({label:'Apri link in nuova scheda',icon:'tab-new',click:()=>newTab(params.linkURL,t.workspace,pane)},
      {label:'Anteprima del link',icon:'external',accelerator:'Shift+Click',click:()=>require('./glance.cjs').open(w,params.linkURL)},
      {label:'Apri link in nuova finestra',icon:'external',click:()=>{
        const id=newTab(params.linkURL,t.workspace,{...pane,activate:false});if(id)moveTabToWindow(w,id);}},
      {label:'Copia indirizzo link',icon:'tab-more',click:()=>clipboard.writeText(params.linkURL)},
      {label:'Aggiungi link ai preferiti',icon:'bookmark',click:()=>{
        const b=state.data.bookmarks;
        if(!b.some(x=>x.url===params.linkURL)){b.unshift({url:params.linkURL,title:params.linkText||params.linkURL});save();windows.emitAll();}}});
    sep();
  }
  if(params.mediaType==='image'&&isWebUrl(params.srcURL)){
    items.push({label:'Apri immagine in nuova scheda',icon:'tab-new',click:()=>newTab(params.srcURL,t.workspace,pane)},
      {label:'Salva immagine con nome…',icon:'download',click:()=>contents.downloadURL(params.srcURL)},
      {label:'Copia immagine',icon:'tabs',enabled:!!params.hasImageContents,click:()=>contents.copyImageAt(params.x,params.y)},
      {label:'Copia indirizzo immagine',icon:'tab-more',click:()=>clipboard.writeText(params.srcURL)},
      {label:'Cerca immagine con Google Lens',icon:'search',click:()=>newTab('https://lens.google.com/uploadbyurl?url='+encodeURIComponent(params.srcURL),t.workspace,pane)});
    sep();
  }
  if(params.isEditable){
    const f=params.editFlags||{};
    items.push({role:'undo',icon:'tab-reopen',enabled:f.canUndo},{role:'cut',icon:'close',enabled:f.canCut},
      {role:'copy',icon:'tabs',enabled:f.canCopy},{role:'paste',icon:'download',enabled:f.canPaste},
      {role:'selectAll',icon:'check',enabled:f.canSelectAll});
    sep();
  }else if(selection){
    items.push({role:'copy',icon:'tabs'});
  }
  if(selection)items.push({label:`Cerca «${short}» con ${engine}`,icon:'search',click:()=>newTab(selection,t.workspace,pane)});
  if(!params.isEditable&&!isWebUrl(params.linkURL)&&params.mediaType!=='image'&&!selection){
    const h=contents.navigationHistory;
    items.push({label:'Indietro',icon:'back',accelerator:'Alt+Left',enabled:h.canGoBack(),click:()=>h.goBack()},
      {label:'Avanti',icon:'forward',accelerator:'Alt+Right',enabled:h.canGoForward(),click:()=>h.goForward()},
      {label:'Ricarica',icon:'reload',accelerator:'CommandOrControl+R',click:()=>contents.reload()});
    sep();
    items.push({label:'Salva pagina con nome…',icon:'download',click:()=>savePageAs(t,w)},
      {label:'Stampa…',icon:'tabs',accelerator:'CommandOrControl+P',click:()=>contents.print({},()=>{})},
      {label:'Aggiungi ai preferiti',icon:'bookmark',click:()=>{
        const b=state.data.bookmarks;if(!b.some(x=>x.url===t.url)){b.unshift({url:t.url,title:t.title});save();windows.emitAll();}}});
  }
  // Beta 0.26: voci aggiunte dalle estensioni (chrome.contextMenus).
  const extra=require('./extensions.cjs').contextMenuItems(contents,params);
  const convert=item=>item.type==='separator'?{type:'separator'}:{label:item.label,icon:'external',enabled:item.enabled!==false,
    click:()=>item.click?.(item,w.win,{}),...(item.submenu?{submenu:item.submenu.items.map(convert)}:{})};
  if(extra.length){sep();items.push(...extra.map(convert));}
  sep();
  items.push({label:'Ispeziona',icon:'commands',accelerator:'CommandOrControl+Shift+I',click:()=>{
    // DevTools in una finestra separata: con più monitor è più comodo che agganciati.
    contents.openDevTools({mode:'detach'});
    contents.inspectElement(params.x,params.y);
  }});
  // La posizione arriva relativa alla pagina, che sta dentro il suo riquadro nella finestra.
  const b=t.view.getBounds();
  require('./popup.cjs').menu(w,items,{contents,x:b.x+params.x,y:b.y+params.y});
}

/** "Salva pagina con nome": pagina completa (HTML più cartella con immagini e stili). */
async function savePageAs(t,w){
  const {dialog,app}=require('electron');
  const name=(t.title||'pagina').replace(/[\\/:*?"<>|]+/g,' ').trim().slice(0,80)||'pagina';
  const chosen=await dialog.showSaveDialog(w.win,{title:'Salva pagina con nome',
    defaultPath:require('node:path').join(app.getPath('downloads'),name+'.html'),filters:[{name:'Pagina web completa',extensions:['html']}]});
  if(chosen.canceled||!chosen.filePath||!t.view)return;
  try{await t.view.webContents.savePage(chosen.filePath,'HTMLComplete');
    require('./toasts.cjs').show({id:'saved-page',kind:'success',title:'Pagina salvata',text:chosen.filePath,timeout:6000},w);}
  catch(e){require('./toasts.cjs').show({id:'saved-page',kind:'error',title:'Pagina non salvata',text:String(e.message||e),timeout:8000},w);}
}

/** Rende visibile una scheda nella sua finestra, caricandola se era dormiente. */
function show(w,id){
  const t=tabIn(w,id);if(!t)return;
  // Vista divisa: la scheda è già visibile dall'altro lato, basta renderla attiva.
  if(t.view&&w.splitViews.includes(t.view)){windows.focusSplitPane(w,id);return;}
  if(w.glance)require('./glance.cjs').close(w); // Beta 0.27: cambiando scheda l'anteprima si chiude
  w.activeId=id;
  if(w.fullscreen)windows.setPageFullscreen(w,false);
  ensureView(t);
  windows.attach(w,t.view);
  require('./extensions.cjs').select(t); // Beta 0.26: scheda attiva per le icone delle estensioni
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
  // Beta 0.12: chiudere l'ultima scheda non chiude più la finestra: si torna alla Home.
  // La finestra si chiude solo con la sua ×.
  if(shouldCloseWindow(state.tabs.filter(t=>paneOf(t)===w.pane),w.workspace)){
    newHomeTab(w.workspace,{pane:w.pane});
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
  require('./workenv.cjs').maybeAutoStart(name); // Beta 0.19: ambiente di lavoro
}

/**
 * Beta 0.23: un workspace viene eliminato. La sua finestra principale passa a un workspace
 * che non ha finestre aperte (le altre si chiudono), poi le sue schede spariscono.
 */
function dropWorkspace(name){
  for(const w of windows.windowsOf(name)){
    const free=w.pane===0&&state.data.workspaces.find(x=>x.name!==name&&!windows.windowsOf(x.name).length);
    if(free){assignWorkspace(w,free.name);openPreferredTab(w);}
    else w.win.close();
  }
  for(let i=state.tabs.length-1;i>=0;i--){
    if(state.tabs[i].workspace!==name)continue;
    destroyView(state.tabs[i]);
    state.tabs.splice(i,1);
  }
}

// ── Tante schede (Beta 0.24) ─────────────────────────────────────────────
/** Chiude una scheda di qualunque workspace o finestra (anche senza finestra aperta). */
function closeTabAnywhere(id){
  const t=state.tabs.find(x=>x.id===id);
  if(!t)return false;
  const owner=windows.windowForTab(t);
  if(owner){closeTab(owner,id);return true;}
  state.tabs.splice(state.tabs.indexOf(t),1);
  rememberClosed(state.data.closedTabs,t,20);
  destroyView(t);
  return true;
}
/**
 * Raggruppa per sito le schede di una finestra: le schede libere dello stesso sito finiscono
 * in uno stack col nome del sito. collapse: lo stack nasce compresso (una sola pillola).
 * @returns {number} quanti stack sono stati creati o allargati
 */
function groupBySite(workspace,pane,{min=2,collapse=false}={}){
  const here=state.tabs.filter(t=>isInWindow(t,{workspace,pane}));
  const groups=tabTools.siteGroups(here.map(t=>({...t,group:groupName(t.group)})),{min});
  for(const {group,ids} of groups){
    for(const t of here)if(ids.includes(t.id))t.group=group;
    if(collapse&&!isCollapsed(state.data.collapsedStacks,workspace,group))toggleCollapsed(state.data.collapsedStacks,workspace,group);
  }
  return groups.length;
}
/** Da quante schede in una finestra parte il raggruppamento automatico. */
const AUTO_GROUP_FROM=10;
/** Raggruppamento automatico (se attivo): con tante schede, 3+ dello stesso sito diventano uno stack compresso. */
function autoGroup(t){
  if(!state.data.settings.autoGroupTabs||t.isHome)return;
  const pane=paneOf(t);
  if(state.tabs.filter(x=>isInWindow(x,{workspace:t.workspace,pane})&&!x.isHome).length<AUTO_GROUP_FROM)return;
  groupBySite(t.workspace,pane,{min:3,collapse:true});
}

/** Collega una finestra a un altro workspace, senza ancora scegliere la scheda. */
function assignWorkspace(w,name){
  if(w.fullscreen)windows.setPageFullscreen(w,false);
  w.split=null; // la vista divisa appartiene alle schede di questo workspace
  for(const t of tabsOf(w)){delete t.splitSlot;delete t.splitMeta;}
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
  if(!saved.inactive)require('./workenv.cjs').maybeAutoStart(name); // Beta 0.19: ambiente di lavoro
  windows.rememberOpenWindows();
  return w;
}

/** Ctrl+Shift+T: riapre la scheda chiusa più recente nel suo workspace originale. */
function reopenClosedTab(w){
  const {data}=state;
  if(!data.closedTabs.length)return false;
  const entry=data.closedTabs.shift();
  if(!entry.home&&!isTabUrl(entry.url)){save();windows.emitAll();return false;}
  if(!entry.home&&!isWebUrl(entry.url))require('./file-viewer.cjs').grantRestored(entry.url);
  const dest=hasWorkspace(entry.workspace)?entry.workspace:w.workspace;
  // Stesso workspace: riapre in questa finestra. Altrimenti nella principale di quel
  // workspace; se non è aperta e siamo nella principale, la mostriamo qui.
  // assignWorkspace (non switchWorkspace) evita di creare una Home in più.
  let target=dest===w.workspace?w:windows.windowFor(dest);
  const moved=!target&&w.pane===0;
  if(moved){assignWorkspace(w,dest);target=w;}
  const settings={pinned:entry.pinned,group:entry.group,title:entry.title,pane:target?.pane||0};
  const id=entry.home?newHomeTab(dest,{...settings,url:entry.url}):newTab(entry.url,dest,settings);
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
/** after (Beta 0.28): la scheda va dopo quella indicata invece che prima. */
function reorderTab(w,id,beforeId,after=false){
  const src=state.tabs.findIndex(x=>x.id===id&&isInWindow(x,w));
  const dest=state.tabs.findIndex(x=>x.id===beforeId&&isInWindow(x,w));
  if(src<0||dest<0||src===dest)return;
  const [item]=state.tabs.splice(src,1);
  state.tabs.splice(state.tabs.findIndex(x=>x.id===beforeId)+(after?1:0),0,item);
  persistTabs();windows.emitAll();
}

/**
 * Ripristino all'avvio: le schede salvate tornano DORMIENTI.
 * Si carica solo quella che apri, così l'avvio resta veloce anche con molte schede.
 */
function restoreSession(){
  // Beta 0.18.1: le coppie della vista divisa, per finestra ("workspace#numero").
  const pairs={};
  for(const saved of state.data.sessionTabs){
    if(!saved||!hasWorkspace(saved.workspace))continue;
    if(saved.home)newHomeTab(saved.workspace,{dormant:true,pane:saved.pane,url:saved.url});
    else if(isTabUrl(saved.url)){
      if(!isWebUrl(saved.url))require('./file-viewer.cjs').grantRestored(saved.url); // file del visualizzatore
      const id=newTab(saved.url,saved.workspace,{pinned:saved.pinned,group:saved.group,title:saved.title,dormant:true,pane:saved.pane,favicon:saved.favicon});
      // Vista divisa: posto (0–3) e disposizione. La 0.18 salvava splitSide 'left'/'right'.
      const slot=Number.isInteger(saved.splitSlot)?saved.splitSlot:saved.splitSide==='left'?0:saved.splitSide==='right'?1:-1;
      if(id&&slot>=0&&slot<4){
        const meta=saved.splitMeta||{mode:'cols',ratioX:saved.splitRatio,ratioY:.5};
        const pair=pairs[saved.workspace+'#'+validPane(saved.pane)]??={mode:meta.mode,ratioX:meta.ratioX,ratioY:meta.ratioY,ids:[]};
        pair.ids[slot]=id;
      }
    }
  }
  // Le finestre nascono dopo: le prendono in createWindow (windows.cjs).
  state.pendingSplits={};
  for(const [key,pair] of Object.entries(pairs)){
    const split=require('../split-rules.js').normalizeSplit({...pair,ids:pair.ids.filter(Number.isInteger)});
    if(split)state.pendingSplits[key]=split;
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
  for(const saved of wanted)openWorkspaceWindow(saved.workspace,{bounds:saved.bounds,maximized:saved.maximized,sidebarMode:saved.sidebarMode},validPane(saved.pane));
}

module.exports={INTERNAL_PAGES,internalPage,persistTabs,openSavedWindows,newTab,newHomeTab,ensureView,show,openPreferredTab,closeTab,navigate,
  switchWorkspace,dropWorkspace,adoptView,loadFavicon,closeTabAnywhere,groupBySite,AUTO_GROUP_FROM,openWorkspaceWindow,reopenClosedTab,moveTabToWorkspace,moveTabToWindow,newWindow,
  stackTwoTabs,reorderTab,restoreSession,tabIn,tabsOf,activeTab,lastActiveKey};
