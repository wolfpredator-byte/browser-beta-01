'use strict';

/**
 * Tutti i comandi del browser, registrati nel bus.
 * `ctx.window` è la finestra da cui arriva il comando (cornice, scorciatoia,
 * menu). Chi chiama dall'esterno, come in futuro JARVIS, può ometterla:
 * in quel caso si usa la finestra in primo piano.
 */
const fs=require('node:fs');
const {app,dialog,shell,clipboard,nativeImage}=require('electron');
const {state,save}=require('./state.cjs');
const windows=require('./windows.cjs');
const tabs=require('./tabs.cjs');
const menus=require('./menus.cjs');
const {safeUrl,isWebUrl,looksLikeAddress}=require('./web-rules.cjs');
const {toggleCollapsed,groupName}=require('./tab-advanced.cjs');
const {SIDEBAR_MODES}=require('./storage.cjs');

/**
 * @param {ReturnType<import('./command-bus.cjs').createCommandBus>} bus
 */
function registerCommands(bus){
  const {data}=state;
  const win=ctx=>ctx.window||windows.focusedWindow();
  const workspaceOf=ctx=>data.workspaces.find(x=>x.name===win(ctx)?.workspace);
  /** Chiamata da menu e scorciatoie: stessa finestra, stessa regola. */
  const runner=w=>(name,args={})=>bus.dispatch(name,args,{window:w,source:'menu'});
  /** Registra un comando che ha bisogno di una finestra; senza finestre non fa nulla. */
  const add=(name,args,description,run)=>bus.register(name,{args,description,run:(ctx,a)=>{
    const w=win(ctx);
    return w?run(w,a,ctx):undefined;
  }});

  // ── Schede ───────────────────────────────────────────────────────────
  add('newTab',{url:'string?'},'Apre una scheda: con url naviga, senza apre una Home.',
    (w,{url})=>url?.trim()?tabs.newTab(url,w.workspace):tabs.newHomeTab(w.workspace));
  add('activateTab',{id:'int'},'Mostra una scheda del workspace della finestra.',
    (w,{id})=>{if(tabs.tabIn(w,id))tabs.show(w,id);});
  add('closeTab',{id:'int'},'Chiude una scheda.',(w,{id})=>tabs.closeTab(w,id));
  add('closeActiveTab',{},'Chiude la scheda attiva (Ctrl+W).',
    w=>{if(w.activeId!==null)tabs.closeTab(w,w.activeId);});
  add('reopenClosedTab',{},'Riapre l’ultima scheda chiusa (Ctrl+Shift+T).',w=>tabs.reopenClosedTab(w));
  add('duplicateTab',{id:'int'},'Duplica una scheda.',(w,{id})=>{
    const source=tabs.tabIn(w,id);if(!source)return;
    if(source.isHome)tabs.newHomeTab(source.workspace);
    else tabs.newTab(source.url,source.workspace,{group:source.group,pinned:source.pinned});
  });
  add('pinTab',{id:'int'},'Fissa o sblocca una scheda.',(w,{id})=>{
    const target=tabs.tabIn(w,id);if(!target)return;
    target.pinned=!target.pinned;tabs.persistTabs();windows.emitAll();
  });
  add('groupTab',{id:'int',group:'string'},'Assegna una scheda a uno stack ("" la toglie).',(w,{id,group})=>{
    const target=tabs.tabIn(w,id);if(!target)return;
    target.group=groupName(group);tabs.persistTabs();windows.emitAll();
  });
  add('reorderTab',{id:'int',beforeId:'int'},'Sposta una scheda prima di un’altra.',
    (w,{id,beforeId})=>tabs.reorderTab(w,id,beforeId));
  add('stackTabs',{fromId:'int',targetId:'int'},'Unisce due schede in uno stack.',
    (w,{fromId,targetId})=>tabs.stackTwoTabs(w,fromId,targetId));
  add('toggleGroup',{group:'string'},'Comprime o espande uno stack.',(w,{group})=>{
    const name=groupName(group);
    if(!name||!state.tabs.some(t=>t.workspace===w.workspace&&groupName(t.group)===name))return;
    // Il flag è persistente: al riavvio i gruppi restano nello stesso stato.
    toggleCollapsed(data.collapsedStacks,w.workspace,name);save();windows.emitAll();
  });
  add('moveTabToWorkspace',{id:'int',workspace:'string'},'Sposta una scheda in un altro workspace.',
    (w,{id,workspace})=>tabs.moveTabToWorkspace(w,id,workspace));
  add('copyTabUrl',{id:'int'},'Copia l’indirizzo di una scheda.',(w,{id})=>{
    const t=tabs.tabIn(w,id);if(t&&!t.isHome)clipboard.writeText(t.url);
  });
  add('tabContextMenu',{id:'int'},'Menu nativo di una scheda.',(w,{id})=>{
    const t=tabs.tabIn(w,id);if(t)menus.tabMenu(w,t,runner(w));
  });

  // ── Navigazione ──────────────────────────────────────────────────────
  add('navigate',{url:'string'},'Apre un indirizzo o una ricerca nella scheda attiva.',
    (w,{url})=>{if(url.trim())tabs.navigate(w,url);});
  // Home non ha una View: per questo usiamo sempre view?.
  add('back',{},'Pagina precedente.',w=>{
    const c=tabs.activeTab(w)?.view?.webContents;
    if(c?.navigationHistory.canGoBack())c.navigationHistory.goBack();
  });
  add('forward',{},'Pagina successiva.',w=>{
    const c=tabs.activeTab(w)?.view?.webContents;
    if(c?.navigationHistory.canGoForward())c.navigationHistory.goForward();
  });
  add('reload',{id:'int?'},'Ricarica la scheda indicata o quella attiva.',(w,{id})=>{
    const t=tabs.tabIn(w,id??w.activeId);
    if(t?.view){t.loadError=null;t.view.webContents.reload();}
  });
  add('home',{},'Mostra la Home del workspace.',w=>{
    const existing=state.tabs.find(x=>x.workspace===w.workspace&&x.isHome);
    if(existing)tabs.show(w,existing.id);else tabs.newHomeTab(w.workspace);
  });
  add('resource',{url:'string'},'Apre una risorsa: dalla Home ne prende il posto, altrimenti nuova scheda.',(w,{url})=>{
    const u=safeUrl(url);if(!u)return;
    if(tabs.activeTab(w)?.isHome)tabs.navigate(w,u);else tabs.newTab(u,w.workspace);
  });
  add('bookmark',{},'Aggiunge la scheda attiva ai preferiti.',w=>{
    const t=tabs.activeTab(w);
    if(!t||t.isHome||data.bookmarks.some(x=>x.url===t.url))return;
    data.bookmarks.unshift({url:t.url,title:t.title});data.bookmarks=data.bookmarks.slice(0,100);
    save();windows.emitAll();
  });
  add('toggleDevTools',{},'Strumenti per sviluppatori (F12) della scheda attiva, o della cornice sulla Home.',w=>{
    const t=tabs.activeTab(w);
    const contents=t?.view?.webContents||w.win.webContents;
    if(contents.isDevToolsOpened())contents.closeDevTools();
    else contents.openDevTools({mode:'detach'});
  });
  add('focusAddress',{},'Porta il cursore nella barra degli indirizzi (Ctrl+L).',w=>{
    w.win.webContents.focus();windows.sendUi(w,{type:'focusAddress'});
  });

  // ── Workspace e finestre ─────────────────────────────────────────────
  add('workspace',{name:'string'},'Mostra un workspace in questa finestra (o va alla sua finestra).',
    (w,{name})=>tabs.switchWorkspace(w,name));
  add('openWorkspaceWindow',{name:'string'},'Apre un workspace in una nuova finestra.',
    (_w,{name})=>{tabs.openWorkspaceWindow(name);});
  // Rispondono {ok, error}: il modulo della cornice mostra l'errore senza chiudersi.
  add('addWorkspace',{name:'string'},'Crea un workspace e lo mostra.',(w,{name})=>{
    const clean=name.trim().slice(0,40);
    if(!clean)return {ok:false,error:'Scrivi un nome.'};
    // "gaming" e "Gaming" sarebbero indistinguibili nella sidebar.
    const existing=data.workspaces.find(x=>x.name.toLowerCase()===clean.toLowerCase());
    if(existing)return {ok:false,error:`Esiste già il workspace «${existing.name}».`};
    data.workspaces.push({name:clean,resources:[],projectPath:''});save();
    tabs.switchWorkspace(w,clean);
    return {ok:true};
  });
  add('showWorkspaceMenu',{},'Menu nativo dei workspace.',w=>menus.workspaceMenu(w,runner(w),windows.windowFor));
  add('workspaceContextMenu',{name:'string'},'Click destro su un workspace.',(w,{name})=>{
    if(data.workspaces.some(x=>x.name===name))menus.workspaceItemMenu(w,name,runner(w),windows.windowFor);
  });
  // L'utente sceglie un PNG/JPG/WebP locale: lo convertiamo a PNG 48x48.
  // Le immagini non vengono inviate a siti esterni; restano nel JSON locale.
  add('chooseWorkspaceIcon',{name:'string'},'Sceglie l’icona di un workspace.',async(w,{name})=>{
    const target=data.workspaces.find(x=>x.name===name);if(!target)return;
    const chosen=await dialog.showOpenDialog(w.win,{title:'Scegli icona del workspace',
      filters:[{name:'Immagini',extensions:['png','jpg','jpeg','webp']}],properties:['openFile']});
    if(chosen.canceled||!chosen.filePaths[0])return;
    const file=chosen.filePaths[0];
    try{
      // 4 MiB limita le immagini originali accettate; l'icona finale è 48px.
      if(fs.statSync(file).size>4*1024*1024)throw Error('Immagine oltre 4 MiB');
      const image=nativeImage.createFromPath(file);
      if(image.isEmpty())throw Error('Formato immagine non valido');
      target.iconData='data:image/png;base64,'+image.resize({width:48,height:48,quality:'best'}).toPNG().toString('base64');
      save();windows.emitAll();
    }catch(error){dialog.showErrorBox('Icona non accettata',String(error.message||error));}
  });
  add('addResource',{url:'string'},'Associa un link al workspace.',(w,{url})=>{
    const ws=workspaceOf({window:w});
    if(!ws)return {ok:false,error:'Workspace non trovato.'};
    // Una risorsa è un indirizzo: una frase diventerebbe una ricerca Google, non un link.
    if(!looksLikeAddress(url))return {ok:false,error:'Inserisci un indirizzo, es. light.gg o https://…'};
    const u=safeUrl(url);
    if(!u)return {ok:false,error:'Indirizzo non valido.'};
    if(ws.resources.includes(u))return {ok:false,error:'Questa risorsa è già salvata.'};
    ws.resources.push(u);save();windows.emitAll();
    return {ok:true};
  });
  add('projectFolder',{},'Collega una cartella locale al workspace.',async w=>{
    const result=await dialog.showOpenDialog(w.win,{properties:['openDirectory']});
    const ws=workspaceOf({window:w});
    if(!result.canceled&&result.filePaths[0]&&ws){ws.projectPath=result.filePaths[0];save();windows.emitAll();}
  });
  add('openFolder',{},'Apre la cartella collegata in Esplora file.',w=>{
    const p=workspaceOf({window:w})?.projectPath;
    if(p&&fs.existsSync(p))shell.showItemInFolder(p);
  });

  // ── Cornice: sidebar, pannelli, download ─────────────────────────────
  // Tre stati: nascosta (0px), icone (62px), icone + nomi (198px). Vale per tutte le finestre.
  add('setSidebarMode',{mode:SIDEBAR_MODES},'Cambia la larghezza della sidebar.',(_w,{mode})=>{
    data.sidebarMode=mode;save();windows.layoutAll();windows.emitAll();
  });
  // newWorkspace e addResource sono moduli da compilare, disegnati nel pannello.
  add('toggleSidePanel',{panel:['bookmarks','history','tabs','newWorkspace','addResource']},'Apre o chiude un pannello laterale.',(w,{panel})=>{
    w.sidePanelOpen=w.sidePanelOpen===panel?null:panel;
    if(w.sidePanelOpen)w.downloadsOpen=false;
    windows.layout(w);windows.emit(w);
  });
  add('toggleDownloads',{},'Apre o chiude il pannello download.',w=>{
    w.downloadsOpen=!w.downloadsOpen;if(w.downloadsOpen)w.sidePanelOpen=null;
    windows.layout(w);windows.emit(w);
  });
  add('showDownloadsFolder',{},'Apre la cartella Download.',()=>shell.openPath(app.getPath('downloads')));
  add('downloadCurrentFile',{},'Scarica il file mostrato nella scheda attiva.',w=>{
    const t=tabs.activeTab(w);
    // Download esplicito: alcune immagini/file si aprono nella pagina invece di scaricarsi.
    if(t?.view&&isWebUrl(t.url))t.view.webContents.downloadURL(t.url);
  });
}

module.exports={registerCommands};
