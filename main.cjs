const {app,BrowserWindow,WebContentsView,ipcMain,session,shell,dialog}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
app.enableSandbox();
let win, activeId=null, tabs=[], data, nextId=1;
const HEADER=64, FOOTER=43;
const defaultData=()=>({activeWorkspace:'Personale',workspaces:[{name:'Personale',tabs:[]},{name:'Destiny Builder',tabs:[],projectPath:'',resources:['https://www.bungie.net/7/en/Destiny','https://github.com/']},{name:'Gaming',tabs:[],projectPath:'',resources:[]}],bookmarks:[],history:[]});
let restorePending=false;
function persistTabs(){
 if(!data)return;
 data.sessionTabs=tabs.filter(t=>isWebUrl(t.url)).map(t=>({url:t.url,workspace:t.workspace,title:t.title})).slice(0,40);
 data.lastActiveUrl=visible()?.url||null;
 save();
}
const storage=()=>path.join(app.getPath('userData'),'browser-data.json');
function save(){try{fs.writeFileSync(storage(),JSON.stringify(data,null,2));}catch(e){console.error(e);}}
function load(){try{data=JSON.parse(fs.readFileSync(storage(),'utf8'));if(!Array.isArray(data.workspaces))throw Error('bad data');}catch{data=defaultData();save();}}
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
function snapshot(){return {activeWorkspace:data.activeWorkspace,workspaces:data.workspaces.map(x=>({name:x.name,projectPath:x.projectPath||'',resources:x.resources||[],count:tabs.filter(t=>t.workspace===x.name).length})),tabs:tabs.filter(t=>t.workspace===data.activeWorkspace).map(t=>({id:t.id,title:t.title,url:t.url,active:t.id===activeId})),activeTab:activeId,bookmarks:data.bookmarks,history:data.history.slice(0,40),loadError:visible()?.loadError||null};}
function emit(){if(win&&!win.isDestroyed())win.webContents.send('state',snapshot());}
function bounds(){if(!win||win.isDestroyed())return;const [w,h]=win.getContentSize();for(const t of tabs){t.view.setBounds({x:0,y:HEADER,width:Math.max(1,w),height:Math.max(1,h-HEADER-FOOTER)});}}
function show(id){const t=tabs.find(x=>x.id===id);if(!t)return;activeId=id;for(const tab of tabs)win.contentView.removeChildView(tab.view);if(t.workspace===data.activeWorkspace)win.contentView.addChildView(t.view);bounds();emit();}
function newTab(raw='https://www.google.com/',ws=data.activeWorkspace){if(!data.workspaces.some(w=>w.name===ws))return null;const url=safeUrl(raw);if(!url)return null;const view=new WebContentsView({webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,partition:'persist:local-browser'}});const t={id:nextId++,workspace:ws,url,title:'Nuova scheda',view,loadError:null};tabs.push(t);view.webContents.setWindowOpenHandler(({url})=>{if(isWebUrl(url))newTab(url,ws);return {action:'deny'};});view.webContents.on('will-navigate',(event,url)=>{if(!isWebUrl(url))event.preventDefault();});view.webContents.on('did-navigate',(_,url)=>{if(isWebUrl(url)){t.url=url;data.history.unshift({url,title:t.title,time:Date.now()});data.history=data.history.slice(0,200);persistTabs();emit();}});view.webContents.on('did-navigate-in-page',(_,url)=>{if(isWebUrl(url)){t.url=url;persistTabs();emit();}});view.webContents.on('page-title-updated',(_,title)=>{t.title=title.slice(0,120);persistTabs();emit();});view.webContents.on('did-start-loading',()=>{t.loadError=null;emit();});
view.webContents.on('did-fail-load',(_,code,desc,validatedURL,isMainFrame)=>{
  if(code===-3||!isMainFrame)return;
  t.loadError=`Impossibile aprire ${validatedURL || t.url} — ${desc} (${code})`;
  console.warn('Load failed:',t.loadError);emit();
});
view.webContents.on('render-process-gone',(_event,details)=>{
  t.loadError=`La pagina si è interrotta: ${details.reason}`;
  emit();
});view.webContents.loadURL(url).catch(console.warn);if(ws===data.activeWorkspace)show(t.id);else emit();persistTabs();return t.id;}
function closeTab(id){const i=tabs.findIndex(x=>x.id===id);if(i<0)return;const [t]=tabs.splice(i,1);win.contentView.removeChildView(t.view);t.view.webContents.close();if(activeId===id){activeId=null;const candidate=tabs.find(x=>x.workspace===data.activeWorkspace);if(candidate)show(candidate.id);else emit();}else emit();persistTabs();}
function switchWorkspace(name){if(!data.workspaces.find(x=>x.name===name))return;data.activeWorkspace=name;save();const t=tabs.find(x=>x.workspace===name);if(t)show(t.id);else{activeId=null;for(const t of tabs)win.contentView.removeChildView(t.view);emit();}}
function verify(event){return win&&!win.isDestroyed()&&event.sender===win.webContents;}
app.whenReady().then(()=>{
 load();const ses=session.fromPartition('persist:local-browser');ses.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
 ses.setPermissionCheckHandler(()=>false);
 win=new BrowserWindow({width:1280,height:800,minWidth:760,minHeight:520,backgroundColor:'#10141c',title:'Personal Browser Beta',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
 win.loadFile('index.html');win.webContents.on('did-finish-load',emit);
 const restored=Array.isArray(data.sessionTabs)?data.sessionTabs.slice(0,30):[];
 for(const saved of restored){
   if(saved&&isWebUrl(saved.url)&&data.workspaces.some(w=>w.name===saved.workspace)){
     newTab(saved.url,saved.workspace);
   }
 }
 if(data.lastActiveUrl){
   const match=tabs.find(x=>x.url===data.lastActiveUrl&&x.workspace===data.activeWorkspace);
   if(match)show(match.id);
 }
win.on('resize',bounds);
 win.on('closed',()=>{for(const t of tabs)t.view.webContents.close();tabs=[];win=null;});
 ipcMain.handle('action',async(event,action,args={})=>{
 if(!verify(event)||typeof action!=='string'||!args||typeof args!=='object')return;
 const t=visible();
 switch(action){
 case 'newTab':return newTab(args.url||'https://www.google.com/');
 case 'activateTab':if(Number.isInteger(args.id)&&tabs.some(t=>t.id===args.id&&t.workspace===data.activeWorkspace))show(args.id);break;
 case 'closeTab':if(Number.isInteger(args.id))closeTab(args.id);break;
 case 'navigate':if(t){const url=safeUrl(args.url);if(url){
 t.loadError=null;t.url=url;emit();
 t.view.webContents.loadURL(url).catch(e=>{t.loadError=String(e.message||e);emit();});
 }}else newTab(args.url);break;
 case 'back':if(t&&t.view.webContents.canGoBack())t.view.webContents.goBack();break;
 case 'forward':if(t&&t.view.webContents.canGoForward())t.view.webContents.goForward();break;
 case 'reload':if(t){t.loadError=null;t.view.webContents.reload();}break;
 case 'home':{if(t)win.contentView.removeChildView(t.view);activeId=null;emit();break;}
 case 'workspace':if(typeof args.name==='string')switchWorkspace(args.name);break;
 case 'addWorkspace':{const name=String(args.name||'').trim().slice(0,40);if(name&&!data.workspaces.some(w=>w.name===name)){data.workspaces.push({name,tabs:[],resources:[],projectPath:''});save();switchWorkspace(name);}break;}
 case 'bookmark':if(t&&!data.bookmarks.some(x=>x.url===t.url)){data.bookmarks.unshift({url:t.url,title:t.title});data.bookmarks=data.bookmarks.slice(0,100);save();emit();}break;
 case 'resource':if(typeof args.url==='string'){const u=safeUrl(args.url);if(u)newTab(u);}break;
 case 'addResource':{const u=safeUrl(args.url);if(u&&workspace()&&!workspace().resources.includes(u)){workspace().resources.push(u);save();emit();}break;}
 case 'projectFolder':{const result=await dialog.showOpenDialog(win,{properties:['openDirectory']});if(!result.canceled&&result.filePaths[0]&&workspace()){workspace().projectPath=result.filePaths[0];save();emit();}break;}
 case 'openFolder':{const p=workspace()?.projectPath;if(p&&fs.existsSync(p))shell.showItemInFolder(p);break;}
 }
 });
});
app.on('window-all-closed',()=>app.quit());
