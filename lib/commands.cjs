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
const {SIDEBAR_MODES,SLEEP_CHOICES}=require('./storage.cjs');
const permissions=require('./permissions.cjs');
const adblock=require('./adblock.cjs');
const projects=require('./projects.cjs');
const layouts=require('./layouts.cjs');
const webSession=require('./web-session.cjs');
const toasts=require('./toasts.cjs');

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
    (w,{url})=>url?.trim()?tabs.newTab(url,w.workspace,{pane:w.pane}):tabs.newHomeTab(w.workspace,{pane:w.pane}));
  add('activateTab',{id:'int'},'Mostra una scheda del workspace della finestra.',
    (w,{id})=>{if(tabs.tabIn(w,id))tabs.show(w,id);});
  // Beta 0.14: chiudere una pagina mostra un toast con "Annulla" (riapre la scheda).
  const closeWithUndo=(w,id)=>{
    const t=tabs.tabIn(w,id);if(!t)return;
    const title=t.title||t.url;
    tabs.closeTab(w,id);
    if(!t.isHome&&!w.win.isDestroyed())toasts.show({id:'tab-closed',kind:'undo',title:'Scheda chiusa',text:`«${title}» è stata chiusa.`,
      timeout:6000,actions:[{label:'Annulla',command:'reopenClosedTab'}]},w);
  };
  add('closeTab',{id:'int'},'Chiude una scheda.',(w,{id})=>closeWithUndo(w,id));
  add('closeActiveTab',{},'Chiude la scheda attiva (Ctrl+W).',
    w=>{if(w.activeId!==null)closeWithUndo(w,w.activeId);});
  // Beta 0.15: voci dei menu VARCO.
  add('muteTab',{id:'int'},'Disattiva o riattiva l’audio di una scheda.',(w,{id})=>{
    const c=tabs.tabIn(w,id)?.view?.webContents;if(c)c.setAudioMuted(!c.isAudioMuted());
  });
  add('closeOtherTabs',{id:'int'},'Chiude le altre schede della finestra (non quelle fissate).',(w,{id})=>{
    for(const t of tabs.tabsOf(w).filter(x=>x.id!==id&&!x.pinned))tabs.closeTab(w,t.id);
    if(tabs.tabIn(w,id))tabs.show(w,id);
  });
  add('closeTabsToRight',{id:'int'},'Chiude le schede a destra (non quelle fissate).',(w,{id})=>{
    const list=tabs.tabsOf(w),index=list.findIndex(x=>x.id===id);
    for(const t of list.slice(index+1).filter(x=>!x.pinned))tabs.closeTab(w,t.id);
  });
  add('newTabInWorkspace',{name:'string'},'Nuova scheda Home in un workspace (apre la sua finestra se serve).',(w,{name})=>{
    const target=windows.windowFor(name)||tabs.openWorkspaceWindow(name);
    if(target){tabs.newHomeTab(name,{pane:target.pane});target.win.focus();}
  });
  bus.register('closeWorkspaceWindows',{args:{name:'string'},description:'Chiude tutte le finestre di un workspace (le schede restano salvate).',
    run:(_c,{name})=>{for(const x of windows.windowsOf(name))x.win.close();}});
  add('reopenClosedTab',{},'Riapre l’ultima scheda chiusa (Ctrl+Shift+T).',w=>tabs.reopenClosedTab(w));
  add('duplicateTab',{id:'int'},'Duplica una scheda.',(w,{id})=>{
    const source=tabs.tabIn(w,id);if(!source)return;
    if(source.isHome)tabs.newHomeTab(source.workspace,{pane:w.pane,url:source.url});
    else tabs.newTab(source.url,source.workspace,{group:source.group,pinned:source.pinned,pane:w.pane});
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
    if(!name||!tabs.tabsOf(w).some(t=>groupName(t.group)===name))return;
    // Il flag è persistente: al riavvio i gruppi restano nello stesso stato.
    toggleCollapsed(data.collapsedStacks,w.workspace,name);save();windows.emitAll();
  });
  add('moveTabToWorkspace',{id:'int',workspace:'string'},'Sposta una scheda in un altro workspace.',
    (w,{id,workspace})=>tabs.moveTabToWorkspace(w,id,workspace));
  add('moveTabToWindow',{id:'int',pane:'int?'},'Sposta una scheda in un’altra finestra del workspace (senza pane: in una nuova).',
    (w,{id,pane})=>tabs.moveTabToWindow(w,id,pane));
  add('newWindow',{},'Nuova finestra dello stesso workspace (Ctrl+N).',w=>{tabs.newWindow(w);});
  add('copyTabUrl',{id:'int'},'Copia l’indirizzo di una scheda.',(w,{id})=>{
    const t=tabs.tabIn(w,id);if(t&&!t.isHome)clipboard.writeText(t.url);
  });
  add('tabContextMenu',{id:'int'},'Menu nativo di una scheda.',(w,{id})=>{
    const t=tabs.tabIn(w,id);if(t)menus.tabMenu(w,t,runner(w));
  });

  // ── Navigazione ──────────────────────────────────────────────────────
  // Prima le ricerche rapide del progetto ("lg ace of spades"), poi indirizzo o Google.
  add('navigate',{url:'string'},'Apre un indirizzo o una ricerca nella scheda attiva.',
    (w,{url})=>{if(url.trim())tabs.navigate(w,projects.expandSearch(w.workspace,url)||url);});
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
    const existing=tabs.tabsOf(w).find(x=>x.isHome&&tabs.internalPage(x.url)==='home');
    if(existing)tabs.show(w,existing.id);else tabs.newHomeTab(w.workspace,{pane:w.pane});
  });
  add('resource',{url:'string'},'Apre una risorsa: dalla Home ne prende il posto, altrimenti nuova scheda.',(w,{url})=>{
    const u=safeUrl(url);if(!u)return;
    if(tabs.activeTab(w)?.isHome)tabs.navigate(w,u);else tabs.newTab(u,w.workspace,{pane:w.pane});
  });
  add('bookmark',{},'Aggiunge la scheda attiva ai preferiti.',w=>{
    const t=tabs.activeTab(w);
    if(!t||t.isHome||data.bookmarks.some(x=>x.url===t.url))return;
    data.bookmarks.unshift({url:t.url,title:t.title});data.bookmarks=data.bookmarks.slice(0,100);
    save();windows.emitAll();
    let host='';try{host=new URL(t.url).host;}catch{}
    toasts.show({id:'bookmark',kind:'bookmark',title:'Aggiunto ai preferiti',text:host,timeout:5000,
      actions:[{label:'Annulla',command:'removeBookmark',args:{url:t.url}}]},w);
  });
  add('removeBookmark',{url:'string'},'Toglie un indirizzo dai preferiti.',(_w,{url})=>{
    data.bookmarks=data.bookmarks.filter(x=>x.url!==url);save();windows.emitAll();
  });
  add('toggleDevTools',{},'Strumenti per sviluppatori (F12) della scheda attiva, o della cornice sulla Home.',w=>{
    const t=tabs.activeTab(w);
    const contents=t?.view?.webContents||w.win.webContents;
    if(contents.isDevToolsOpened())contents.closeDevTools();
    else contents.openDevTools({mode:'detach'});
  });
  // ── Cerca nella pagina, zoom, stampa (Beta 0.9.1) ──
  const activeContents=w=>tabs.activeTab(w)?.view?.webContents||null;
  add('openFind',{},'Apre la ricerca nella pagina (Ctrl+F).',w=>{
    if(!activeContents(w))return;
    w.win.webContents.focus();windows.sendUi(w,{type:'openFind'});
  });
  // Attenzione al nome di Electron: findNext=true AVVIA una nuova ricerca,
  // findNext=false passa al risultato successivo/precedente della ricerca in corso.
  add('findInPage',{text:'string',forward:'bool?',findNext:'bool?'},'Cerca un testo nella pagina attiva.',(w,{text,forward=true,findNext=true})=>{
    const contents=activeContents(w);if(!contents)return;
    if(!text)contents.stopFindInPage('clearSelection');
    else contents.findInPage(text.slice(0,200),{forward,findNext});
  });
  add('stopFind',{},'Chiude la ricerca nella pagina.',w=>{activeContents(w)?.stopFindInPage('clearSelection');});
  // Livelli di zoom di Chromium: 0 = 100%, ogni passo ±20% circa. Limiti: 25%–500%.
  const zoom=(w,change)=>{
    const contents=activeContents(w);if(!contents)return;
    const level=change===null?0:Math.min(9,Math.max(-7.6,contents.getZoomLevel()+change));
    contents.setZoomLevel(level);
    windows.emit(w);
  };
  add('zoomIn',{},'Ingrandisce la pagina (Ctrl +).',w=>zoom(w,0.5));
  add('zoomOut',{},'Rimpicciolisce la pagina (Ctrl -).',w=>zoom(w,-0.5));
  add('zoomReset',{},'Riporta lo zoom al 100% (Ctrl 0).',w=>zoom(w,null));
  add('print',{},'Stampa la pagina attiva (Ctrl+P).',w=>{activeContents(w)?.print({},()=>{});});

  // ── Sito: permessi, blocco pubblicità, sospensione (Beta 0.10) ──
  bus.register('setSitePermission',{args:{origin:'string',kind:'string',value:['allow','deny','ask']},
    description:'Cambia un permesso di un sito (ask = chiedi di nuovo).',
    run:(_c,{origin,kind,value})=>permissions.setPermission(origin,kind,value)});
  bus.register('forgetSite',{args:{origin:'string'},description:'Dimentica tutti i permessi di un sito.',
    run:(_c,{origin})=>permissions.forgetSite(origin)});
  bus.register('setAdblockEnabled',{args:{enabled:'bool'},description:'Attiva o spegne il blocco di pubblicità e tracker.',
    run:(_c,{enabled})=>{adblock.setEnabled(enabled);}});
  add('setAdblockForSite',{host:'string',enabled:'bool'},'Blocco pubblicità sì/no su un sito; ricarica la scheda.',(w,{host,enabled})=>{
    const result=adblock.setSiteEnabled(host,enabled);
    const t=tabs.activeTab(w);
    if(result.ok&&t?.view)t.view.webContents.reload(); // il cambio vale dal prossimo caricamento
    return result;
  });
  bus.register('setSleepMinutes',{args:{minutes:SLEEP_CHOICES},description:'Minuti dopo cui sospendere le schede non guardate (0 = mai).',
    run:(_c,{minutes})=>{data.settings.sleepAfterMinutes=minutes;save();windows.emitAll();}});

  add('focusAddress',{},'Porta il cursore nella barra degli indirizzi (Ctrl+L).',w=>{
    w.win.webContents.focus();windows.sendUi(w,{type:'focusAddress'});
  });

  // ── Workspace e finestre ─────────────────────────────────────────────
  add('workspace',{name:'string'},'Mostra un workspace in questa finestra (o va alla sua finestra).',
    (w,{name})=>tabs.switchWorkspace(w,name));
  // Senza add(): deve funzionare anche dall'area di notifica, senza finestre aperte.
  // Un workspace chiuso con una disposizione salvata si riapre con tutte le sue finestre.
  bus.register('openWorkspaceWindow',{args:{name:'string'},description:'Apre un workspace in una nuova finestra.',
    run:(_ctx,{name})=>{
      if(!windows.windowsOf(name).length&&data.layouts[name])layouts.applyLayout(name);
      else tabs.openWorkspaceWindow(name);
    }});
  // Disposizioni: senza name agiscono sul workspace della finestra.
  const layoutCommand=(command,description,fn)=>bus.register(command,{args:{name:'string?'},description,run:(ctx,{name})=>{
    const workspace=name??win(ctx)?.workspace;
    if(!data.workspaces.some(x=>x.name===workspace))return {ok:false,error:'Workspace non trovato.'};
    return fn(workspace);
  }});
  layoutCommand('saveLayout','Salva monitor, posizione e schede delle finestre del workspace.',workspace=>{
    const result=layouts.saveLayout(workspace);
    toasts.show(result.ok?{id:'layout',kind:'success',title:'Disposizione salvata',text:result.description,timeout:5000}:
      {id:'layout',kind:'error',title:'Disposizione non salvata',text:result.error,timeout:6000});
    return result;
  });
  layoutCommand('applyLayout','Ripristina la disposizione salvata delle finestre.',layouts.applyLayout);
  layoutCommand('deleteLayout','Elimina la disposizione salvata.',layouts.deleteLayout);
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
    if(!result.canceled&&result.filePaths[0]&&ws){
      ws.projectPath=result.filePaths[0];save();
      projects.load(ws.name); // Legge subito progetto.browser.json della nuova cartella.
      windows.emitAll();
    }
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
  const PANELS=['bookmarks','history','tabs','newWorkspace','addResource','games','project','jarvis','site','settings','notifications'];
  const setPanel=(w,panel)=>{
    w.sidePanelOpen=panel;
    if(panel==='notifications')toasts.markRead(); // aprire il centro notifiche le segna come lette
    if(panel)w.downloadsOpen=false;
    windows.layout(w);windows.emit(w);
  };
  // 'settings' resta accettato per compatibilità, ma apre la pagina Impostazioni.
  add('toggleSidePanel',{panel:PANELS},'Apre o chiude un pannello laterale.',(w,{panel})=>panel==='settings'?bus.dispatch('openSettings',{},{window:w}):setPanel(w,w.sidePanelOpen===panel?null:panel));
  // Dalla palette: apre sempre, anche se il pannello era già aperto.
  add('openSidePanel',{panel:PANELS},'Apre un pannello laterale.',(w,{panel})=>panel==='settings'?bus.dispatch('openSettings',{},{window:w}):setPanel(w,panel));
  // Beta 0.12: le Impostazioni sono una pagina in una scheda (come la Home), non più un pannello.
  add('openSettings',{},'Apre la pagina Impostazioni (Ctrl+,).',w=>{
    const existing=tabs.tabsOf(w).find(x=>x.isHome&&tabs.internalPage(x.url)==='settings');
    if(w.sidePanelOpen==='settings')setPanel(w,null);
    if(existing)tabs.show(w,existing.id);else tabs.newHomeTab(w.workspace,{pane:w.pane,url:tabs.INTERNAL_PAGES.settings.url});
  });
  add('toggleDownloads',{},'Apre o chiude il pannello download.',w=>{
    w.downloadsOpen=!w.downloadsOpen;if(w.downloadsOpen)w.sidePanelOpen=null;
    windows.layout(w);windows.emit(w);
  });
  bus.register('downloadOpen',{args:{id:'string'},description:'Apre un file scaricato.',run:(_c,{id})=>webSession.openDownload(id)});
  bus.register('downloadShow',{args:{id:'string'},description:'Mostra un file scaricato nella cartella.',run:(_c,{id})=>webSession.showDownload(id)});
  bus.register('downloadCancel',{args:{id:'string'},description:'Annulla un download in corso.',run:(_c,{id})=>webSession.cancelDownload(id)});
  bus.register('downloadRetry',{args:{id:'string'},description:'Scarica di nuovo un file annullato o interrotto.',run:(_c,{id})=>webSession.retryDownload(id)});
  // Click destro su un file del pannello Download (mock-up "File nei download").
  add('downloadContextMenu',{id:'string'},'Menu di un file scaricato.',(w,{id})=>{
    const r=webSession.downloadRecord(id);if(!r)return;
    const running=['waiting','progressing'].includes(r.state),done=r.state==='completed';
    require('./popup.cjs').menu(w,[
      {label:'Apri file',icon:'external',enabled:done,click:()=>webSession.openDownload(id)},
      {label:'Apri cartella',icon:'downloads',enabled:done,click:()=>webSession.showDownload(id)},
      {label:'Copia percorso',icon:'tab-more',enabled:done&&!!r.path,click:()=>clipboard.writeText(r.path)},
      {label:'Copia indirizzo di origine',icon:'tab-more',enabled:!!r.url,click:()=>clipboard.writeText(r.url)},
      {type:'separator'},
      {label:'Riprova',icon:'reload',visible:['cancelled','interrupted'].includes(r.state),click:()=>webSession.retryDownload(id)},
      {label:'Rimuovi dalla lista',icon:'close',enabled:!running,click:()=>webSession.removeDownload(id)},
      {label:'Elimina file',icon:'warning',danger:true,enabled:done,click:async()=>{
        const answer=await require('./popup.cjs').dialog(w,{type:'warning',icon:'warning',message:'Eliminare il file?',
          detail:`Sei sicuro di voler eliminare «${r.name}»?\nQuesta azione non può essere annullata.`,
          buttons:['Annulla','Elimina'],defaultId:0,cancelId:0,dangerId:1});
        if(answer.response===1){
          const result=webSession.deleteDownloadFile(id);
          toasts.show(result.ok?{id:'deleted-'+id,kind:'info',title:'File eliminato',text:r.name,timeout:4000}:
            {id:'deleted-'+id,kind:'error',title:'File non eliminato',text:result.error,timeout:6000},w);
        }
      }},
      {type:'separator'},
      {label:'Annulla download',icon:'close',visible:running,click:()=>webSession.cancelDownload(id)}
    ]);
  });
  bus.register('clearNotifications',{description:'Svuota il centro notifiche.',run:()=>{toasts.clearNotifications();}});
  bus.register('removeNotification',{args:{id:'string'},description:'Toglie una voce dal centro notifiche.',run:(_c,{id})=>{toasts.removeNotification(id);}});
  bus.register('downloadsClear',{description:'Toglie dall’elenco i download finiti.',run:()=>webSession.clearFinished()});
  add('showDownloadsFolder',{},'Apre la cartella Download.',()=>shell.openPath(app.getPath('downloads')));
  add('downloadCurrentFile',{},'Scarica il file mostrato nella scheda attiva.',w=>{
    const t=tabs.activeTab(w);
    // Download esplicito: alcune immagini/file si aprono nella pagina invece di scaricarsi.
    if(t?.view&&isWebUrl(t.url))t.view.webContents.downloadURL(t.url);
  });
}

module.exports={registerCommands};
