const {app,BrowserWindow,WebContentsView,ipcMain,session,shell,dialog,Menu,nativeImage,clipboard}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
// Separiamo le regole sulle schede dalle API Electron: così possiamo testarle
// con Node.js senza avviare una finestra o navigare su Internet.
const {shouldCloseWindow,discardHomeAfterNavigation}=require('./tab-lifecycle.cjs');
app.enableSandbox();
let win, activeId=null, tabs=[], data, nextId=1, downloads=[], downloadsOpen=false, tabMenuOpen=false, sidePanelOpen=null;
// These pixel values reserve space for the top address bar and bottom tabs.
 // Changing HEADER moves the top boundary of websites; FOOTER changes the bottom one.
 // Il drag strip (30px) e la toolbar (64px) formano l'area superiore.
 // Aumentare HEADER richiede aggiornare anche le stesse altezze in style.css.
 const HEADER=94, FOOTER=43;
 // Larghezza in pixel della sidebar per ogni modalità: cambia questi valori
 // solo insieme alle variabili CSS omonime, altrimenti i siti coprono il pannello.
 const SIDEBAR_WIDTHS={hidden:0,compact:62,expanded:198};
 function sidebarWidth(){return SIDEBAR_WIDTHS[data?.sidebarMode]??62;}
const defaultData=()=>({activeWorkspace:'Personale',workspaces:[{name:'Personale',tabs:[]},{name:'Destiny Builder',tabs:[],projectPath:'',resources:['https://www.bungie.net/7/en/Destiny','https://github.com/']},{name:'Gaming',tabs:[],projectPath:'',resources:[]}],bookmarks:[],history:[]});

function persistTabs(){
 if(!data)return;
 // A home tab belongs to the session as much as any external web page.
 data.sessionTabs=tabs.filter(t=>t.isHome||isWebUrl(t.url)).map(t=>({url:t.url,home:!!t.isHome,workspace:t.workspace,title:t.title,pinned:!!t.pinned,group:t.group||null})).slice(0,40);
 data.lastActiveUrl=visible()?.url||null;
 data.workspaceLastActive=data.workspaceLastActive||{};
 if(visible())data.workspaceLastActive[data.activeWorkspace]=visible().url;
 save();
}
const storage=()=>path.join(app.getPath('userData'),'browser-data.json');
function save(){try{fs.writeFileSync(storage(),JSON.stringify(data,null,2));}catch(e){console.error(e);}}
function load(){try{data=JSON.parse(fs.readFileSync(storage(),'utf8'));if(!Array.isArray(data.workspaces))throw Error('bad data');}catch{data=defaultData();save();}if(!Object.hasOwn(SIDEBAR_WIDTHS,data.sidebarMode))data.sidebarMode='compact';}
function workspace(){return data.workspaces.find(x=>x.name===data.activeWorkspace);}
function safeUrl(s){
  if(typeof s!=='string'||s.length>2048)return null;
  const q=s.trim();
  if(!q)return null;
  // A phrase is a search; domains/localhost and explicit http(s) are navigation.
  const isAddress=/^https?:\/\//i.test(q)||/^localhost(?::\d+)?(?:\/.*)?$/i.test(q)||
    /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i.test(q);
  if(isAddress){
    try{
      const url=new URL(/^https?:\/\//i.test(q)?q:'https://'+q);
      if(['https:','http:'].includes(url.protocol))return url.href;
    }catch{}
  }
  return 'https://www.google.com/search?q='+encodeURIComponent(q);
}
function isWebUrl(raw){try{return ['https:','http:'].includes(new URL(raw).protocol);}catch{return false;}}
const visible=()=>tabs.find(t=>t.id===activeId);
function snapshot(){return {activeWorkspace:data.activeWorkspace,sidebarMode:data.sidebarMode,sidePanelOpen,workspaces:data.workspaces.map(x=>({name:x.name,iconData:x.iconData||null,projectPath:x.projectPath||'',resources:x.resources||[],count:tabs.filter(t=>t.workspace===x.name).length})),tabs:tabs.filter(t=>t.workspace===data.activeWorkspace).map(t=>({id:t.id,title:t.title,url:t.url,isHome:!!t.isHome,active:t.id===activeId,pinned:!!t.pinned,group:t.group||null})),activeTab:activeId,downloadsOpen,downloads:downloads.map(d=>({...d})),bookmarks:data.bookmarks,history:data.history.slice(0,40),homeActive:!!visible()?.isHome,loadError:visible()?.loadError||null};}
function emit(){if(win&&!win.isDestroyed())win.webContents.send('state',snapshot());}
// Recalculate page dimensions whenever Windows resizes or the Download panel opens.
 // 340 is the width (in pixels) reserved for the downloads sidebar.
 function bounds(){
 if(!win||win.isDestroyed())return;
 const [width,height]=win.getContentSize();
 // 'x' parte dopo la barra laterale; così resta visibile anche sopra ai siti.
 // Se un pannello laterale è aperto, riserviamo altri 300px al suo contenuto.
 const x=sidebarWidth()+(sidePanelOpen?300:0);
 const reservedForDownloads=downloadsOpen?340:0;
 for(const tab of tabs){
  if(!tab.view)continue; // Home non usa WebContentsView.
  tab.view.setBounds({
   x,y:HEADER,
   width:Math.max(1,width-x-reservedForDownloads),
   height:Math.max(1,height-HEADER-FOOTER)
  });
 }
}

function show(id){const t=tabs.find(x=>x.id===id);if(!t)return;activeId=id;for(const tab of tabs)if(tab.view)win.contentView.removeChildView(tab.view);if(t.view&&t.workspace===data.activeWorkspace)win.contentView.addChildView(t.view);bounds();persistTabs();emit();}
// Inserisce una scheda immediatamente dopo quella attiva, nello stesso workspace.
 // Se non esiste una scheda attiva per quel contesto, la inserisce alla fine.
 function placeTab(tab){
 const current=tabs.findIndex(t=>t.id===activeId&&t.workspace===tab.workspace);
 if(current===-1)tabs.push(tab);else tabs.splice(current+1,0,tab);
 }
 // The homepage is a genuine tab: it shares the same activation and closing logic.
function newHomeTab(ws=data.activeWorkspace){
 if(!data.workspaces.some(w=>w.name===ws))return null;
 const t={id:nextId++,workspace:ws,url:'app://home',title:'Home',view:null,isHome:true,loadError:null,pinned:false,group:null};
 placeTab(t);
 if(ws===data.activeWorkspace)show(t.id);else persistTabs();
 return t.id;
}
function newTab(raw='https://www.google.com/',ws=data.activeWorkspace,settings={}){if(!data.workspaces.some(w=>w.name===ws))return null;const url=safeUrl(raw);if(!url)return null;const view=new WebContentsView({webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,partition:'persist:local-browser'}});const t={id:nextId++,workspace:ws,url,title:'Nuova scheda',view,isHome:false,loadError:null,pinned:!!settings.pinned,group:typeof settings.group==='string'?settings.group.slice(0,35):null};placeTab(t);// Right-click on an image: offer native Save Image, no need to open a new tab.
view.webContents.on('context-menu',(_event,params)=>{
 const items=[];
 if(params.mediaType==='image'){
  // Il click destro fornisce srcURL, coordinate dell'immagine e tipo di risorsa.
  // Le azioni di copia non richiedono di aprire una nuova scheda.
  if(isWebUrl(params.srcURL)){
   items.push({label:'Apri immagine in nuova scheda',click:()=>newTab(params.srcURL,ws)});
   items.push({label:'Copia indirizzo immagine',click:()=>clipboard.writeText(params.srcURL)});
   items.push({label:'Salva immagine con nome…',click:()=>view.webContents.downloadURL(params.srcURL)});
  }
  if(params.hasImageContents){
   items.push({label:'Copia immagine',click:()=>view.webContents.copyImageAt(params.x,params.y)});
  }
 }
 if(isWebUrl(params.linkURL)){
  items.push({label:'Apri collegamento in una nuova scheda',click:()=>newTab(params.linkURL,ws)});
 }
 if(items.length)Menu.buildFromTemplate(items).popup({window:win});
});
view.webContents.setWindowOpenHandler(({url})=>{if(isWebUrl(url))newTab(url,ws);return {action:'deny'};});view.webContents.on('will-navigate',(event,url)=>{if(!isWebUrl(url))event.preventDefault();});view.webContents.on('did-navigate',(_,url)=>{if(isWebUrl(url)){t.url=url;data.history.unshift({url,title:t.title,time:Date.now()});data.history=data.history.slice(0,200);persistTabs();emit();}});view.webContents.on('did-navigate-in-page',(_,url)=>{if(isWebUrl(url)){t.url=url;persistTabs();emit();}});view.webContents.on('page-title-updated',(_,title)=>{t.title=title.slice(0,120);persistTabs();emit();});view.webContents.on('did-start-loading',()=>{t.loadError=null;emit();});
view.webContents.on('did-fail-load',(_,code,desc,validatedURL,isMainFrame)=>{
  if(code===-3||!isMainFrame)return;
  t.loadError=`Impossibile aprire ${validatedURL || t.url} — ${desc} (${code})`;
  console.warn('Load failed:',t.loadError);emit();
});
view.webContents.on('render-process-gone',(_event,details)=>{
  t.loadError=`La pagina si è interrotta: ${details.reason}`;
  emit();
});view.webContents.loadURL(url).catch(console.warn);if(ws===data.activeWorkspace)show(t.id);else emit();persistTabs();return t.id;}
/**
 * Chiude una scheda del workspace attivo.
 *
 * @param {number} id - L'identificatore univoco della scheda da rimuovere.
 *
 * Comportamento richiesto: quando si chiude l'ULTIMA scheda del workspace
 * visibile, chiudiamo la finestra anche se in altri workspace ci sono schede.
 * Quelle schede restano salvate e saranno ripristinate al prossimo avvio.
 */
function closeTab(id){
 const index=tabs.findIndex(tab=>tab.id===id&&tab.workspace===data.activeWorkspace);
 if(index===-1)return; // Non permette a un evento UI di chiudere schede di altri workspace.

 const [closed]=tabs.splice(index,1);
 // Solo le pagine remote hanno una WebContentsView. Home non ne possiede una.
 if(closed.view){
  win.contentView.removeChildView(closed.view);
  closed.view.webContents.close();
 }

 // Prima rimuoviamo l'ID attivo: evita di salvare come attiva una scheda chiusa.
 if(activeId===id)activeId=null;

 if(shouldCloseWindow(tabs,data.activeWorkspace)){
  persistTabs(); // Salva le schede degli ALTRI workspace prima di chiudere Windows.
  win.close();
  return;
 }

 // Se rimangono schede nel workspace, apriamo una di esse anziché creare Home.
 if(activeId===null){
  const next=tabs.find(tab=>tab.workspace===data.activeWorkspace);
  if(next)show(next.id);
 }else{
  persistTabs();
  emit();
 }
}

/**
 * Quando si effettua una ricerca dalla Home, deve essere usata la stessa
 * posizione della scheda, non lasciata una Home aperta sul lato sinistro.
 *
 * @param {string} raw - Testo della ricerca oppure URL inserito.
 * @returns {boolean} false se il testo non è valido o non siamo sulla Home.
 */
function navigateFromHome(raw){
 const home=visible();
 if(!home?.isHome)return false;
 const url=safeUrl(raw); // Converte parole in una ricerca Google; mantiene gli URL.
 if(!url)return false;

 // newTab() apre la pagina subito DOPO Home e la rende attiva.
 const newId=newTab(url,home.workspace);
 if(!newId)return false;

 // Rimuoviamo esclusivamente Home: la nuova pagina ne occupa il posto.
 if(discardHomeAfterNavigation(tabs,home.id,newId,home.workspace)){
  persistTabs(); // Evita che Home torni al riavvio.
  emit();        // Aggiorna subito barra delle schede e indicatore della Home.
 }
 return true;
}

function switchWorkspace(name){if(!data.workspaces.find(x=>x.name===name))return;data.activeWorkspace=name;save();const preferred=data.workspaceLastActive?.[name];
 const t=tabs.find(x=>x.workspace===name&&x.url===preferred)||tabs.find(x=>x.workspace===name);
 if(t)show(t.id);else newHomeTab(name);}
function verify(event){return win&&!win.isDestroyed()&&event.sender===win.webContents;}
app.whenReady().then(()=>{
 load();const ses=session.fromPartition('persist:local-browser');ses.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
 ses.setPermissionCheckHandler(()=>false);
 win=new BrowserWindow({width:1280,height:800,minWidth:760,minHeight:520,
 backgroundColor:'#050505',title:'Personal Browser Beta',autoHideMenuBar:true,
 // Windows usa i veri controlli di sistema ma il bordo superiore è nostro.
 // 'height:30' riserva 30px ai pulsanti Windows (minimizza/massimizza/chiudi).
 ...(process.platform==='win32'?{titleBarStyle:'hidden',titleBarOverlay:{color:'#0b0b0b',symbolColor:'#eeeeee',height:30}}:{}),
 webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
 win.loadFile('index.html');win.webContents.on('did-finish-load',emit);
 const restored=Array.isArray(data.sessionTabs)?data.sessionTabs.slice(0,30):[];
 for(const saved of restored){
   if(saved&&(saved.home||isWebUrl(saved.url))&&data.workspaces.some(w=>w.name===saved.workspace)){
     if(saved.home)newHomeTab(saved.workspace);else newTab(saved.url,saved.workspace,{pinned:saved.pinned,group:saved.group});
   }
 }
 if(!tabs.some(t=>t.workspace===data.activeWorkspace))newHomeTab(data.activeWorkspace);
 if(data.lastActiveUrl){
   const match=tabs.find(x=>x.url===data.lastActiveUrl&&x.workspace===data.activeWorkspace);
   if(match)show(match.id);
 }
win.on('resize',bounds);
 // DownloadItem belongs to Electron's persistent browser session.
 // It must be paused while the user chooses Save / Save As / Cancel.
 ses.on('will-download',async(_event,item)=>{
   const filename=path.basename(item.getFilename()).replace(/[\\/]/g,'_');
   const id=Date.now()+'-'+Math.random().toString(36).slice(2,8);
   const record={id,name:filename,state:'waiting',received:0,total:item.getTotalBytes(),path:''};
   downloads.unshift(record);downloads=downloads.slice(0,40);
   item.pause();
   emit();
   item.on('updated',(_e,state)=>{record.state=state;record.received=item.getReceivedBytes();record.total=item.getTotalBytes();emit();});
   item.once('done',(_e,state)=>{record.state=state;record.received=item.getReceivedBytes();emit();});
   try{
     const base=app.getPath('downloads'),extension=path.extname(filename),stem=path.basename(filename,extension);
     let suggested=path.join(base,filename),n=1;
     while(fs.existsSync(suggested)){suggested=path.join(base,stem+' ('+n+++')'+extension);}
     const decision=await dialog.showMessageBox(win,{
       type:'question',title:'Download',message:'Vuoi salvare questo file?',
       detail:filename+'\\nDestinazione: '+suggested,
       buttons:['Salva','Salva in…','Annulla'],defaultId:0,cancelId:2,noLink:true
     });
     if(decision.response===2||win.isDestroyed()){item.cancel();return;}
     let destination=suggested;
     if(decision.response===1){
       const selected=await dialog.showSaveDialog(win,{title:'Salva in…',defaultPath:suggested,buttonLabel:'Salva'});
       if(selected.canceled||!selected.filePath){item.cancel();return;}
       destination=selected.filePath;
     }
     record.path=destination;
     item.setSavePath(destination);
     record.state='progressing';item.resume();emit();
   }catch(e){console.error('Download prompt failed',e);item.cancel();}
 });

 win.on('closed',()=>{for(const t of tabs)if(t.view)t.view.webContents.close();tabs=[];win=null;});
 ipcMain.handle('action',async(event,action,args={})=>{
 if(!verify(event)||typeof action!=='string'||!args||typeof args!=='object')return;
 const t=visible();
 switch(action){
 case 'newTab':return typeof args.url==='string'&&args.url.trim()?newTab(args.url):newHomeTab();
 case 'activateTab':if(Number.isInteger(args.id)&&tabs.some(t=>t.id===args.id&&t.workspace===data.activeWorkspace))show(args.id);break;
 case 'closeTab':if(Number.isInteger(args.id))closeTab(args.id);break;
 case 'duplicateTab':{const source=tabs.find(x=>x.id===args.id&&x.workspace===data.activeWorkspace);if(source){if(source.isHome)newHomeTab(source.workspace);else newTab(source.url,source.workspace,{group:source.group,pinned:source.pinned});}break;}
 case 'pinTab':{const target=tabs.find(x=>x.id===args.id&&x.workspace===data.activeWorkspace);if(target){target.pinned=!target.pinned;persistTabs();emit();}break;}
 case 'groupTab':{const target=tabs.find(x=>x.id===args.id&&x.workspace===data.activeWorkspace);
 if(target){const group=typeof args.group==='string'?args.group.trim().slice(0,35):'';target.group=group||null;persistTabs();emit();}break;}
 case 'reorderTab':{const src=tabs.findIndex(x=>x.id===args.id&&x.workspace===data.activeWorkspace);
 const dest=tabs.findIndex(x=>x.id===args.beforeId&&x.workspace===data.activeWorkspace);
 if(src>=0&&dest>=0&&src!==dest){const [item]=tabs.splice(src,1);const idx=tabs.findIndex(x=>x.id===args.beforeId);tabs.splice(idx,0,item);persistTabs();emit();}break;}
 // Tre stati: nascosta (0px), icone (62px), icone + nomi (198px).
 case 'setSidebarMode':{
  if(!Object.hasOwn(SIDEBAR_WIDTHS,args.mode))break;
  data.sidebarMode=args.mode;save();bounds();emit();break;
 }
 // L'utente sceglie un PNG/JPG/WebP locale: lo convertiamo a PNG 48x48.
 // Le immagini non vengono inviate a siti esterni; restano nel JSON locale.
 case 'chooseWorkspaceIcon':{
  if(typeof args.name!=='string')break;
  const target=data.workspaces.find(w=>w.name===args.name);if(!target)break;
  const chosen=await dialog.showOpenDialog(win,{title:'Scegli icona del workspace',
   filters:[{name:'Immagini',extensions:['png','jpg','jpeg','webp']}],
   properties:['openFile']});
  if(chosen.canceled||!chosen.filePaths[0])break;
  const file=chosen.filePaths[0];
  try{
   // 4 MiB limita le immagini originali accettate; l'icona finale è 48px.
   if(fs.statSync(file).size>4*1024*1024)throw Error('Immagine oltre 4 MiB');
   const image=nativeImage.createFromPath(file);
   if(image.isEmpty())throw Error('Formato immagine non valido');
   target.iconData='data:image/png;base64,'+image.resize({width:48,height:48,quality:'best'}).toPNG().toString('base64');
   save();emit();
  }catch(error){dialog.showErrorBox('Icona non accettata',String(error.message||error));}
  break;
 }
 // Menu di sistema dei workspace: visibile anche se una pagina copre il renderer.
 case 'showWorkspaceMenu':{
  const options=data.workspaces.map(w=>({
   label:w.name,
   type:'radio',
   checked:w.name===data.activeWorkspace,
   click:()=>switchWorkspace(w.name)
  }));
  Menu.buildFromTemplate(options).popup({window:win});
  break;
 }
 // Il pannello vive nella cornice del browser e non dentro le pagine web.
 case 'toggleSidePanel':{
  if(!['bookmarks','history','tabs'].includes(args.panel))break;
  sidePanelOpen=sidePanelOpen===args.panel?null:args.panel;
  if(sidePanelOpen)downloadsOpen=false;
  bounds();emit();break;
 }
 case 'showDownloadsFolder':shell.openPath(app.getPath('downloads'));break;
 case 'downloadCurrentFile':{
   if(!t||!t.view||!isWebUrl(t.url))break;
   // Explicit user-triggered download: some image/file links open inline instead.
   try{t.view.webContents.downloadURL(t.url);}catch(e){console.error('Download failed:',e);}
   break;
 }
 case 'toggleDownloads':downloadsOpen=!downloadsOpen;if(downloadsOpen)sidePanelOpen=null;bounds();emit();break;
 case 'setTabMenuOpen':tabMenuOpen=false;bounds();break;
 case 'tabContextMenu':{
  const selected=tabs.find(x=>x.id===args.id&&x.workspace===data.activeWorkspace);
  if(!selected)break;
  Menu.buildFromTemplate([
   {label:'Duplica scheda',click:()=>selected.isHome?newHomeTab(selected.workspace):newTab(selected.url,selected.workspace,{pinned:selected.pinned,group:selected.group})},
   {label:selected.pinned?'Rimuovi fissaggio':'Fissa scheda',click:()=>{selected.pinned=!selected.pinned;persistTabs();emit();}},
   // Native submenus stay above WebContentsView without changing the site height.
   // The default labels are examples; existing custom group names are also offered.
   {label:'Assegna a gruppo',submenu:[...new Set(['Ricerca','Sviluppo','Gaming',...tabs.filter(x=>x.workspace===data.activeWorkspace).map(x=>x.group).filter(Boolean)])].map(name=>({
     label:name,
     type:'checkbox',
     checked:selected.group===name,
     click:()=>{selected.group=name;persistTabs();emit();}
   }))},
   {label:'Rimuovi dal gruppo',enabled:!!selected.group,click:()=>{selected.group=null;persistTabs();emit();}}
  ]).popup({window:win});
  break;
 }
 // Ricerca da Home: convertiamo la scheda Home in una scheda web.
 // Ricerca da sito: navighiamo normalmente nella scheda corrente.
 case 'navigate':{
  if(typeof args.url!=='string'||!args.url.trim())break;
  if(t?.isHome){navigateFromHome(args.url);break;}
  if(t?.view){
   const url=safeUrl(args.url);
   if(url){
    t.loadError=null;t.url=url;emit();
    t.view.webContents.loadURL(url).catch(e=>{
     t.loadError=String(e.message||e);emit();
    });
   }
  }else newTab(args.url);
  break;
 }
 case 'back':if(t?.view.webContents.canGoBack())t.view.webContents.goBack();break;
 case 'forward':if(t?.view.webContents.canGoForward())t.view.webContents.goForward();break;
 case 'reload':if(t?.view){t.loadError=null;t.view.webContents.reload();}break;
 case 'home':{const existing=tabs.find(x=>x.workspace===data.activeWorkspace&&x.isHome);if(existing)show(existing.id);else newHomeTab();break;}
 case 'workspace':if(typeof args.name==='string')switchWorkspace(args.name);break;
 case 'addWorkspace':{const name=String(args.name||'').trim().slice(0,40);if(name&&!data.workspaces.some(w=>w.name===name)){data.workspaces.push({name,tabs:[],resources:[],projectPath:''});save();switchWorkspace(name);}break;}
 case 'bookmark':if(t&&!data.bookmarks.some(x=>x.url===t.url)){data.bookmarks.unshift({url:t.url,title:t.title});data.bookmarks=data.bookmarks.slice(0,100);save();emit();}break;
 // Un link cliccato dalla Home segue la stessa logica della sua barra di ricerca.
 // Da un sito già aperto, invece, le risorse continuano ad aprirsi in nuova tab.
 case 'resource':if(typeof args.url==='string'){
  const u=safeUrl(args.url);
  if(u){
   if(t?.isHome)navigateFromHome(u);
   else newTab(u);
  }
 }break;
 case 'addResource':{const u=safeUrl(args.url);if(u&&workspace()&&!workspace().resources.includes(u)){workspace().resources.push(u);save();emit();}break;}
 case 'projectFolder':{const result=await dialog.showOpenDialog(win,{properties:['openDirectory']});if(!result.canceled&&result.filePaths[0]&&workspace()){workspace().projectPath=result.filePaths[0];save();emit();}break;}
 case 'openFolder':{const p=workspace()?.projectPath;if(p&&fs.existsSync(p))shell.showItemInFolder(p);break;}
 }
 });
});
app.on('window-all-closed',()=>app.quit());
