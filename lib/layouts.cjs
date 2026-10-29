'use strict';

/**
 * Salva e ripristina la disposizione delle finestre di un workspace sui monitor.
 * Esempio per un progetto: finestra 1 con l'anteprima sul monitor centrale,
 * finestra 2 con documentazione e GitHub a sinistra, finestra 3 con le API a destra.
 * Le regole di calcolo sono in layout-rules.cjs (testate senza Electron).
 */
const {screen}=require('electron');
const {state,save}=require('./state.cjs');
const windows=require('./windows.cjs');
const tabs=require('./tabs.cjs');
const {isTabUrl:isWebUrl}=require('./web-rules.cjs'); // anche le schede del visualizzatore
const {toRelative,pickDisplay,toAbsolute,missingTabs,describeLayout}=require('./layout-rules.cjs');

const MAX_TABS_PER_WINDOW=30;

/** Fotografa le finestre aperte del workspace: monitor, posizione, schede. */
function saveLayout(workspace){
  const open=windows.windowsOf(workspace);
  if(!open.length)return {ok:false,error:'Nessuna finestra aperta per questo workspace.'};
  const displays=screen.getAllDisplays();
  state.data.layouts[workspace]={savedAt:Date.now(),windows:open.map(w=>({
    pane:w.pane,
    // getNormalBounds: la posizione "da non massimizzata", così il ripristino sa dove rimetterla.
    ...toRelative(w.win.getNormalBounds(),displays),
    maximized:w.win.isMaximized(),sidebarMode:w.sidebarMode,
    activeUrl:tabs.activeTab(w)?.url||null,
    tabs:tabs.tabsOf(w).filter(t=>t.isHome||isWebUrl(t.url)).slice(0,MAX_TABS_PER_WINDOW)
      .map(t=>({url:t.url,home:!!t.isHome,title:t.title,pinned:!!t.pinned,group:t.group||null}))
  }))};
  save();windows.emitAll();
  return {ok:true,description:describeLayout(state.data.layouts[workspace])};
}

/**
 * Rimette le finestre come le avevi salvate. Le finestre chiuse vengono
 * riaperte, quelle aperte spostate; le schede mancanti vengono aggiunte,
 * quelle in più che hai aperto nel frattempo restano.
 */
function applyLayout(workspace){
  const layout=state.data.layouts[workspace];
  if(!layout)return {ok:false,error:'Nessuna disposizione salvata per questo workspace.'};
  const displays=screen.getAllDisplays(),primary=screen.getPrimaryDisplay().id;
  let main=null;
  for(const spec of layout.windows){
    const display=pickDisplay(spec,displays,primary);
    if(!display)continue;
    const bounds=toAbsolute(spec.rect,display.workArea);
    let w=windows.windowFor(workspace,spec.pane);
    const addMissing=(openUrls,dormant)=>{
      for(const t of missingTabs(spec.tabs,openUrls))
        tabs.newTab(t.url,workspace,{pane:spec.pane,title:t.title,pinned:t.pinned,group:t.group,activate:false,dormant});
    };
    if(!w){
      // Finestra chiusa: prima le schede (dormienti), poi la finestra che mostra quella salvata come attiva.
      const existing=state.tabs.filter(t=>t.workspace===workspace&&(t.pane||0)===spec.pane).map(t=>t.url);
      addMissing(existing,true);
      if(spec.activeUrl)state.data.workspaceLastActive[tabs.lastActiveKey({workspace,pane:spec.pane})]=spec.activeUrl;
      w=tabs.openWorkspaceWindow(workspace,{bounds,maximized:spec.maximized,sidebarMode:spec.sidebarMode},spec.pane);
    }else{
      if(w.fullscreen)windows.setPageFullscreen(w,false);
      if(w.win.isMinimized())w.win.restore();
      if(w.win.isMaximized())w.win.unmaximize();
      // Prima sul monitor giusto, poi massimizzata lì.
      w.win.setBounds(bounds);
      if(spec.maximized)w.win.maximize();
      addMissing(tabs.tabsOf(w).map(t=>t.url),false);
      const active=spec.activeUrl&&tabs.tabsOf(w).find(t=>t.url===spec.activeUrl);
      if(active)tabs.show(w,active.id);
    }
    if(spec.pane===0)main=w;
  }
  // La finestra principale finisce in primo piano.
  (main||windows.windowFor(workspace))?.win.focus();
  windows.rememberOpenWindows();
  return {ok:true};
}

function deleteLayout(workspace){
  delete state.data.layouts[workspace];
  save();windows.emitAll();
  return {ok:true};
}

module.exports={saveLayout,applyLayout,deleteLayout};
