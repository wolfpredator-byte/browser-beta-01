'use strict';

/**
 * Beta 0.39 — launcher: due anelli, anche fuori da VARCO (in gioco, sul desktop).
 * Beta 0.40 — più anelli per profilo (pagine), cartelle del PC, media di siti e app, chiusura animata.
 *
 *   Ctrl+Alt+Spazio (scorciatoia di sistema, cambiabile) → Fast launcher: i fast link del programma in primo piano
 *   (profilo per eseguibile; sul desktop il profilo generale). Premuta di nuovo → gira l'anello sul Command center
 *   (le sezioni della 0.38, dalla finestra di VARCO usata per ultima).
 *
 * Vive in una finestra trasparente sempre in primo piano (launcher.html) che copre lo schermo dove sta il mouse.
 * Come nel command center, le azioni restano qui: la finestra conosce solo etichette e numeri e chiede
 * "esegui l'azione N del risultato X". Così non può aprire percorsi o indirizzi qualunque.
 */
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {app,BrowserWindow,globalShortcut,ipcMain,screen,shell,clipboard,dialog}=require('electron');
const {state,save}=require('./state.cjs');
const windows=require('./windows.cjs');
const R=require('../launcher-rules.js');
const foreground=require('./foreground.cjs');

let bus=null,win=null,winReady=null,visible=false,registered='',current=null;
/** id → {item (normalizzato, per metterlo in un profilo), fns:[], profileSlot?} dell'ultima apertura. */
let registry=new Map(),seq=0;
let appsCache=null,appsLoading=null;
const fileIcons=new Map();

const L=()=>state.data.launcher;
const hostOf=url=>{try{return new URL(url).host.replace(/^www\./,'');}catch{return '';}};
const iconOf=url=>{try{return require('./icon-urls.cjs').toUrl(state.data.siteIcons?.[new URL(url).origin]||null);}catch{return null;}};
const tabs=()=>require('./tabs.cjs');
const jarvis=()=>require('./jarvis.cjs');
const isWeb=url=>/^https?:\/\//i.test(url||'');

// ── Finestra di VARCO a cui mandare le azioni ──
function varcoWindow({open=false}={}){
  let w=windows.focusedWindow()||state.windows[state.windows.length-1]||null;
  if(!w&&open){tabs().openSavedWindows();w=windows.focusedWindow()||state.windows[0]||null;}
  return w;
}
function bringVarco(w){
  if(!w||w.win.isDestroyed())return;
  if(w.win.isMinimized())w.win.restore();
  w.win.show();w.win.focus();
}
const run=(w,command,args={})=>bus.dispatch(command,args,{window:w,source:'launcher'});
/** Esegue un comando in VARCO e porta davanti la sua finestra. */
async function inVarco(fn){
  const w=varcoWindow({open:true});
  if(!w)return {ok:false,error:'Nessuna finestra di VARCO.'};
  bringVarco(w);
  return fn(w);
}

// ── Programma in primo piano → profilo ──
async function describeForeground(){
  const fg=await foreground.query();
  const exe=fg?.exe||'';
  let key=R.profileKeyOf(exe);
  if(fg&&/^(Progman|WorkerW|Shell_TrayWnd)$/.test(fg.cls))key='*';
  const lower=exe.toLowerCase();
  const game=state.data.games.find(g=>g.exe.toLowerCase()===lower);
  const app=key==='*'?'Desktop':(game?.name||L().profiles[key]?.app||cleanName(fg?.desc)||cleanName(fg?.title)||exe.replace(/\.exe$/i,''));
  let icon=null;
  if(key!=='*'&&fg?.path)icon=await fileIcon(fg.path);
  return {key,exe:lower,app,kind:key==='*'?'desk':game?'game':'app',color:R.colorFor(key),icon,path:fg?.path||'',game:game||null};
}
const cleanName=s=>String(s||'').replace(/\s+[-–—|].*$/,'').trim().slice(0,40);
/** Nome corto di un sito: dal titolo che VARCO conosce (cronologia, preferiti, fast link) il pezzo più corto, se no il dominio. */
function siteName(url){
  const known=[...state.data.workspaces.flatMap(w=>w.homeLinks||[]),...state.data.bookmarks,...state.data.history.slice(0,400)].find(x=>x.url===url&&x.title);
  if(known){const parts=String(known.title).split(/\s+[-–—|·]\s+/).map(p=>p.trim()).filter(p=>p.length>=2);if(parts.length)return parts.sort((a,b)=>a.length-b.length)[0].slice(0,40);}
  return hostOf(url).replace(/^(app|m|web)\./,'');
}
async function fileIcon(file){
  if(!file)return null;
  if(fileIcons.has(file))return fileIcons.get(file);
  let url=null;
  try{const img=await app.getFileIcon(file,{size:'normal'});if(!img.isEmpty())url=img.toDataURL();}catch{}
  fileIcons.set(file,url);if(fileIcons.size>200)fileIcons.delete(fileIcons.keys().next().value);
  return url;
}

function profileOf(key){
  if(key==='*'){
    const g=L().generic;
    if(!g.slots){
      // Prima volta: il profilo generale parte dai fast link del workspace attivo (prima i fissati).
      const ws=state.data.workspaces.find(x=>x.name===state.data.activeWorkspace)||state.data.workspaces[0];
      const links=[...(ws?.homeLinks||[])].sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)).slice(0,6);
      g.slots=Array(R.SLOTS).fill(null);
      links.forEach((l,i)=>{g.slots[i]=R.normalizeItem({type:'site',title:l.title||siteName(l.url),target:l.url});});
      save();
    }
    return g;
  }
  return L().profiles[key]||null;
}
function setProfile(key,profile){
  if(key==='*')L().generic={app:'',slots:profile.slots,more:profile.more};
  else L().profiles[key]={app:profile.app||current?.fg.app||key,slots:profile.slots,more:profile.more};
  save();
}

// ── Elementi: ogni elemento ha un id, le sue etichette e le sue azioni ──
function exists(p){try{fs.accessSync(p);return true;}catch{return false;}}
function subOf(x){
  if(x.type==='site'||x.type==='panel')return hostOf(x.target)+(x.type==='panel'?' · pannello web':'');
  if(x.type==='cmd'){const p=require('./project-processes.cjs').snapshot(x.ws).find(c=>c.index===x.index);return `${x.ws} · ${p?(p.status==='running'?'attivo':'fermo')+' · '+p.command:'comando del progetto'}`;}
  if(x.type==='note')return 'Note del workspace';
  if(x.type==='jarvis')return 'Prompt per JARVIS';
  return x.target;
}
function register(x,{from='',mine=false,inProfile=null,reason=''}={}){
  const id=++seq;
  const broken=(x.type==='file'||x.type==='folder'||x.type==='app')&&!exists(x.target);
  const confirm=R.needsConfirm(x);
  const acts=[];
  const open=(label,fn)=>acts.push([label,async()=>{countUse(x,inProfile);hide();return fn();}]);
  if(broken&&inProfile){
    acts.push(['Cambia percorso',()=>repath(inProfile,x)]);
    acts.push(['Togli dal profilo',()=>removeFromProfile(inProfile,x)]);
  }else{
    switch(x.type){
      case 'site':open('Apri in VARCO',()=>inVarco(w=>run(w,'newTab',{url:x.target})));open('Apri nel pannello',()=>inVarco(w=>openPanel(w,x)));acts.push(['Copia link',()=>{clipboard.writeText(x.target);return {ok:true,toast:'Link copiato'};}]);break;
      case 'panel':open('Apri nel pannello',()=>inVarco(w=>openPanel(w,x)));open('Apri in una scheda',()=>inVarco(w=>run(w,'newTab',{url:x.target})));break;
      case 'app':open('Avvia',()=>shell.openPath(x.target));open('Mostra nella cartella',()=>shell.showItemInFolder(x.target));break;
      case 'file':open(confirm?'Avvia…':'Apri',()=>shell.openPath(x.target));open('Mostra nella cartella',()=>shell.showItemInFolder(x.target));acts.push(['Copia percorso',()=>{clipboard.writeText(x.target);return {ok:true,toast:'Percorso copiato'};}]);break;
      case 'folder':open('Apri',()=>shell.openPath(x.target));open('Apri nel terminale',()=>terminal(x.target));acts.push(['Copia percorso',()=>{clipboard.writeText(x.target);return {ok:true,toast:'Percorso copiato'};}]);break;
      case 'cmd':open('Esegui',()=>startCommand(x));open('Ferma',()=>require('./project-processes.cjs').stop(x.ws,x.index));open('Apri il progetto',()=>inVarco(async w=>{if(w.workspace!==x.ws)await run(w,'workspace',{name:x.ws});return run(varcoWindow(),'openSidePanel',{panel:'project'});}));break;
      case 'note':open('Apri le note',()=>inVarco(async w=>{if(w.workspace!==x.ws)await run(w,'workspace',{name:x.ws});return run(varcoWindow(),'openSidePanel',{panel:'notes'});}));break;
      case 'jarvis':open('Chiedi a JARVIS',()=>askJarvis(x.target));break;
    }
    if(inProfile)acts.push(['Togli dal profilo',()=>removeFromProfile(inProfile,x)]);
  }
  registry.set(id,{item:x,fns:acts.map(a=>a[1]),inProfile});
  const icon=x.type==='site'||x.type==='panel'?iconOf(x.target):x.type==='app'?(fileIcons.get(x.target)||null):null;
  return {id,type:x.type,title:x.title,sub:broken?'Non trovato · '+x.target:subOf(x),icon,broken,confirm,from,mine,reason,actions:acts.map(a=>a[0])};
}
function openPanel(w,x){
  const panel=state.data.webPanels.find(p=>p.url===x.target||hostOf(p.url)===hostOf(x.target));
  if(panel){w.sidePanelOpen=null;return require('./webpanels.cjs').show(w,panel.id);}
  return run(w,'webPanelAdd',{url:x.target,title:x.title});
}
function terminal(dir){
  try{spawn('cmd.exe',['/c','start','""','cmd.exe','/k'],{cwd:dir,windowsHide:true,detached:true,stdio:'ignore'}).unref();return {ok:true};}
  catch(error){return {ok:false,error:String(error.message||error)};}
}
function startCommand(x){
  const pp=require('./project-processes.cjs');
  const r=pp.start(x.ws,x.index);
  if(r&&r.ok===false)inVarco(w=>{require('./toasts.cjs').show({id:'ln-'+Date.now(),category:'sistema',kind:'info',title:x.title,text:r.error,timeout:6000},w);});
  return r;
}
function askJarvis(text){
  if(!state.data.settings.jarvis.enabled)return inVarco(w=>run(w,'openSidePanel',{panel:'jarvis'}));
  return jarvis().request('ask',{text,workspace:state.data.activeWorkspace});
}
/** Conta le aperture dal launcher di ciò che non è nel profilo: dopo 2 volte diventa un suggerito. */
function countUse(x,inProfile){
  if(inProfile||!current||current.fg.key==='*')return;
  L().usage=R.countUse(L().usage,current.fg.key,R.itemKey(x));
  knownItems().set(R.itemKey(x),x);
  save();
}
const known=new Map();
const knownItems=()=>known;

async function repath(key,x){
  const r=await dialog.showOpenDialog(win,{title:`Nuovo percorso per ${x.title}`,properties:[x.type==='folder'?'openDirectory':'openFile']});
  if(r.canceled||!r.filePaths[0])return {ok:false};
  const p=profileOf(key);if(!p)return {ok:false};
  const k=R.itemKey(x);
  const fix=y=>y&&R.itemKey(y)===k?{...y,target:r.filePaths[0]}:y;
  setProfile(key,{...p,slots:p.slots.map(fix),more:p.more.map(fix)});
  return {ok:true,refresh:true,toast:'Percorso aggiornato'};
}
function removeFromProfile(key,x){
  const p=profileOf(key);if(!p)return {ok:false};
  setProfile(key,R.removeItem(p,R.itemKey(x)));
  return {ok:true,refresh:true,toast:'Tolto dal profilo',sub:x.title};
}

// ── Cosa si può cercare e mettere sull'anello ──
async function installedApps(){
  if(appsCache)return appsCache;
  if(!appsLoading){
    const scan=require('./app-scan.cjs').scan;
    appsLoading=Promise.all([scan('apps').catch(()=>[]),scan('games').catch(()=>[])]).then(([apps,games])=>{
      const seen=new Set();appsCache=[];
      for(const a of [...games.map(g=>({...g,game:true})),...apps])if(!seen.has(a.path.toLowerCase())){seen.add(a.path.toLowerCase());appsCache.push(a);}
      setTimeout(()=>{appsCache=null;appsLoading=null;},10*60*1000); // si rinfresca ogni 10 minuti
      return appsCache;
    });
  }
  return appsLoading;
}
/** Beta 0.40: le cartelle del computer (quelle di Windows e i dischi), da mettere sull'anello o cercare. */
const FOLDER_NAMES=[['desktop','Desktop'],['documents','Documenti'],['downloads','Download'],['pictures','Immagini'],['videos','Video'],['music','Musica'],['home','Cartella utente']];
let drivesCache=null;
function pcFolders(){
  const out=[];
  for(const [key,title] of FOLDER_NAMES){try{const p=app.getPath(key);if(p&&exists(p))out.push({type:'folder',title,target:p,from:'Cartella del PC'});}catch{}}
  if(!drivesCache){drivesCache=[];for(const l of 'CDEFGHIJKLMNOPQRSTUVWXYZ'){const d=l+':\\';if(exists(d))drivesCache.push({type:'folder',title:`Disco ${l}:`,target:d,from:'Disco del PC'});}setTimeout(()=>{drivesCache=null;},60000);}
  return [...out,...drivesCache];
}
function poolItems(fg,apps){
  const out=[];const seen=new Set();
  const push=(raw,from,mine=false)=>{const x=R.normalizeItem(raw);if(!x)return;const k=R.itemKey(x);if(seen.has(k))return;seen.add(k);known.set(k,x);out.push(register(x,{from,mine}));};
  const p=profileOf(fg.key);
  // Prima il profilo attuale (anche "Altro nel profilo"), poi gli altri profili, poi il resto di VARCO e del PC.
  if(p&&p.slots)[...p.slots.filter(Boolean),...p.more].forEach(x=>push(x,fg.key==='*'?'Generale':'Profilo '+fg.app,true));
  if(fg.key!=='*'){const g=profileOf('*');[...g.slots.filter(Boolean),...g.more].forEach(x=>push(x,'Generale'));}
  for(const [k,pr] of Object.entries(L().profiles))if(k!==fg.key)[...pr.slots.filter(Boolean),...pr.more].forEach(x=>push(x,'Profilo '+(pr.app||k)));
  const active=varcoWindow()&&state.tabs.find(t=>t.id===varcoWindow().activeId);
  if(active&&!active.isHome&&isWeb(active.url))push({type:'site',title:active.title,target:active.url},'Pagina aperta in VARCO');
  for(const ws of state.data.workspaces){
    for(const l of ws.homeLinks||[])push({type:'site',title:l.title,target:l.url},'Fast link · '+ws.name);
    if(ws.projectPath){
      push({type:'folder',title:path.basename(ws.projectPath)||ws.name,target:ws.projectPath},'Progetto · '+ws.name);
      for(const c of require('./project-processes.cjs').snapshot(ws.name))push({type:'cmd',title:`${c.name}`,target:'',ws:ws.name,index:c.index},'Comando · '+ws.name);
    }
    push({type:'note',title:'Note di '+ws.name,target:'',ws:ws.name},'Note');
  }
  for(const pnl of state.data.webPanels)push({type:'panel',title:pnl.title,target:pnl.url},'Pannello web');
  for(const f of pcFolders())push(f,f.from);
  for(const b of state.data.bookmarks.slice(0,60))push({type:'site',title:b.title,target:b.url},'Preferiti');
  for(const text of state.data.jarvisPrompts)push({type:'jarvis',title:text.slice(0,60),target:text},'Prompt di JARVIS');
  for(const a of apps||[])push({type:'app',title:a.name,target:a.path},a.game?'Gioco · '+a.source:'App · '+a.source);
  return out;
}

// ── Command center (le sezioni della 0.38) ──
const CC_SECTIONS=[['now','Apri subito','bolt'],['tabs','Schede','tabs'],['projects','Progetti','folder'],['links','Fast link','pin'],
  ['commands','Comandi','cmd'],['web','Web','globe'],['jarvis','JARVIS','jarvis'],['create','Crea','plus']];
function ccSnapshot(){
  const w=varcoWindow();
  if(!w)return {available:false,sections:CC_SECTIONS.map(([id,t,ic])=>({id,t,ic,items:[]}))};
  const cc=require('./command-center.cjs');
  const items=cc.build(w).filter(x=>!x.fill);
  const toIcon=u=>require('./icon-urls.cjs').toUrl(u);
  const view=x=>({id:x.id,title:x.label,sub:x.detail||'',kind:x.kind,off:!!x.off,actions:x.actions,icon:x.favicon?toIcon(x.favicon):null,keys:x.keys||''});
  return {available:true,workspace:w.workspace,sections:CC_SECTIONS.map(([id,t,ic])=>({id,t,ic,
    items:(id==='now'?items.filter(x=>x.now):items.filter(x=>x.sec===id&&!x.now)).slice(0,40).map(view)}))};
}

// ── Istantanea per la finestra ──
async function snapshot(fg){
  registry=new Map();seq=0;
  const p=profileOf(fg.key);
  const has=!!p?.slots;
  const view=(x,i)=>x?register(x,{inProfile:fg.key,from:fg.key==='*'?'Generale':'Profilo '+fg.app,mine:true}):null;
  // Icone delle app nei posti (una volta sola, poi restano in memoria).
  if(has)await Promise.all([...p.slots,...p.more].filter(x=>x?.type==='app').map(x=>fileIcon(x.target)));
  const extra=fg.game?(fg.game.sites||[]).map(u=>({type:'site',title:siteName(u),target:u,reason:'Dal pannello Giochi'})):[];
  const knownMap=Object.fromEntries([...known.entries()]);
  const sugg=R.suggestions({profile:has?p:null,usage:L().usage[fg.key]||{},ignored:L().ignored[fg.key]||[],extra,known:knownMap}).map(x=>{const {reason,...item}=x;return register(item,{reason,from:'Suggerito'});});
  const generic=fg.key!=='*'?profileOf('*').slots.filter(Boolean).slice(0,3).map(x=>register(x,{from:'Generale'})):[];
  const pool=poolItems(fg,appsCache);
  let appearance={};try{appearance=require('./appearance-rules.cjs').cssVariables(require('./appearance.cjs').effective(state.data.activeWorkspace));}catch{}
  return {fg:{key:fg.key,app:fg.app,exe:fg.exe,kind:fg.kind,color:fg.color,icon:fg.icon},
    accent:appearance['--v-accent']||'#00e5ff',accentRgb:appearance['--v-accent-rgb']||'0,229,255',
    profile:{has,slots:has?p.slots.map(view):Array(R.SLOTS).fill(null),more:has?p.more.map(x=>view(x)):[]},
    suggest:sugg,generic,pool,cc:ccSnapshot(),
    hotkey:(R.HOTKEYS.find(h=>h[0]===L().hotkey)||R.HOTKEYS[0])[1],appsReady:!!appsCache};
}

// ── Finestra ──
function ensureWindow(){
  if(win&&!win.isDestroyed())return win;
  win=new BrowserWindow({show:false,frame:false,transparent:true,backgroundColor:'#00000000',resizable:false,movable:false,minimizable:false,maximizable:false,
    fullscreenable:false,skipTaskbar:true,hasShadow:false,alwaysOnTop:true,title:'Launcher di VARCO',
    webPreferences:{preload:path.join(__dirname,'..','launcher-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  win.setAlwaysOnTop(true,'screen-saver');
  win.setVisibleOnAllWorkspaces?.(true);
  winReady=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));
  win.loadFile(path.join(__dirname,'..','launcher.html'));
  win.on('blur',()=>{if(visible&&!dialogOpen)hide();});
  win.on('closed',()=>{win=null;visible=false;});
  win.webContents.on('will-navigate',e=>e.preventDefault());
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  return win;
}
let dialogOpen=false,opening=false;

async function open(mode='fast'){
  if(opening)return;opening=true;
  try{
    const fg=await describeForeground(); // prima di mostrarsi: dopo, in primo piano ci sarebbe il launcher
    const w=ensureWindow();
    await winReady;
    const display=screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    clearTimeout(hideTimer);
    w.setBounds(display.bounds);
    current={fg};
    const snap=await snapshot(fg);
    w.webContents.send('launcher:open',{...snap,mode,game:fg.kind==='game'});
    w.show();w.focus();w.webContents.focus();
    visible=true;
    startMediaPolling();
    // Le app installate arrivano dopo (la prima ricerca può richiedere qualche secondo).
    if(!appsCache)installedApps().then(apps=>{if(visible&&current?.fg===fg&&win)win.webContents.send('launcher:pool',poolItems(fg,apps));}).catch(()=>{});
  }finally{opening=false;}
}
/** Chiusura: la finestra fa l'animazione inversa a quella di entrata, poi si nasconde. */
const LEAVE_MS=300;
let hideTimer=null;
function hide({instant=false}={}){
  if(!win||win.isDestroyed()||!visible)return;
  visible=false;stopMediaPolling();
  win.webContents.send('launcher:leave');
  clearTimeout(hideTimer);
  hideTimer=setTimeout(()=>{if(!visible&&win&&!win.isDestroyed()){win.hide();win.webContents.send('launcher:close');}},instant?0:LEAVE_MS);
}
async function refresh(){
  if(!win||!current)return;
  const snap=await snapshot(current.fg);
  win.webContents.send('launcher:refresh',snap);
}
function toggle(){
  if(visible&&win){win.webContents.send('launcher:switch');return;}
  open('fast');
}

// ── Modifiche dalla finestra ──
async function edit(op,a){
  const key=current?.fg.key;if(!key)return {ok:false};
  let p=profileOf(key);
  if(op==='create'){
    // Profilo nuovo: parte con i suggeriti (es. i siti del gioco).
    let np={app:current.fg.app,slots:Array(R.SLOTS).fill(null),more:[]};
    for(const id of a.ids||[]){const e=registry.get(id);if(e)np=R.add(np,e.item).profile;}
    setProfile(key,np);await refresh();
    return {ok:true,toast:`Profilo di ${current.fg.app} creato`,sub:current.fg.exe?`Si attiva quando ${current.fg.exe} è in primo piano`:''};
  }
  if(!p?.slots)return {ok:false,error:'Prima crea il profilo.'};
  const entry=a.id!=null?registry.get(a.id):null;
  let msg={};
  const slotName=i=>R.pagesOf(p)>1?`posto ${i%R.SLOTS+1} dell’anello ${Math.floor(i/R.SLOTS)+1}`:`posto ${i+1}`;
  if(op==='put'&&entry){const old=p.slots[a.slot];p=R.put(p,a.slot,entry.item);msg={toast:`Nel ${slotName(a.slot)}: ${entry.item.title}`,sub:old&&R.itemKey(old)!==R.itemKey(entry.item)?`${old.title} passa in «Altro nel profilo»`:''};}
  else if(op==='add'&&entry){const r=R.add(p,entry.item);p=r.profile;msg={toast:`Aggiunto al profilo ${current.fg.app}`,sub:r.slot>=0?`${entry.item.title} · ${slotName(r.slot)}`:'L’anello è pieno: lo trovi in «Altro nel profilo»'};}
  else if(op==='clear'){const old=p.slots[a.slot];p=R.clear(p,a.slot);msg=old?{toast:`${slotName(a.slot).replace(/^p/,'P')} svuotato`,sub:`${old.title} resta in «Altro nel profilo»`}:{};}
  else if(op==='swap')p=R.swap(p,a.slot,a.to);
  else if(op==='addPage'){if(R.pagesOf(p)>=R.MAX_PAGES)return {ok:false,error:`Al massimo ${R.MAX_PAGES} anelli per profilo.`};p=R.addPage(p);msg={toast:`Anello ${R.pagesOf(p)} aggiunto`,sub:'PagSu e PagGiù (o la rotella) passano da un anello all’altro',page:R.pagesOf(p)-1};}
  else if(op==='removePage'){const n=p.slots.slice(a.page*R.SLOTS,(a.page+1)*R.SLOTS).filter(Boolean).length;p=R.removePage(p,a.page);msg={toast:`Anello ${a.page+1} tolto`,sub:n?`I suoi ${n} fast link sono in «Altro nel profilo»`:''};}
  else if(op==='ignore'&&entry){L().ignored[key]=[...(L().ignored[key]||[]),R.itemKey(entry.item)].slice(-50);save();await refresh();return {ok:true,toast:'Non lo suggerisco più',sub:entry.item.title};}
  else return {ok:false};
  setProfile(key,p);await refresh();
  return {ok:true,...msg};
}
async function drop(paths){
  const key=current?.fg.key;if(!key)return {ok:false};
  let p=profileOf(key);
  if(!p?.slots){p={app:current.fg.app,slots:Array(R.SLOTS).fill(null),more:[]};}
  const added=[];
  for(const raw of (paths||[]).slice(0,10)){
    if(typeof raw!=='string'||!path.isAbsolute(raw))continue;
    let file=raw,type='file';
    try{
      if(fs.statSync(file).isDirectory())type='folder';
      else if(/\.lnk$/i.test(file)){const t=shell.readShortcutLink(file).target;if(t&&/\.exe$/i.test(t)){file=t;type='app';}}
    }catch{continue;}
    const name=path.basename(raw).replace(/\.(lnk|url)$/i,'');
    p=R.add(p,{type,title:name,target:file}).profile;added.push(name);
  }
  setProfile(key,p);await refresh();
  return {ok:true,toast:added.length?`Aggiunto a ${current.fg.app}`:'Niente da aggiungere',sub:added.join(', ')};
}

/** Beta 0.40: «Scegli una cartella / un file del PC…» per il posto che stai modificando. */
async function browse({kind='folder',slot=-1}={}){
  const key=current?.fg.key;if(!key)return {ok:false};
  dialogOpen=true;
  let r;try{r=await dialog.showOpenDialog(win,{title:kind==='folder'?'Scegli una cartella per il launcher':'Scegli un file per il launcher',properties:[kind==='folder'?'openDirectory':'openFile']});}
  finally{dialogOpen=false;if(win&&visible){win.focus();win.webContents.focus();}}
  if(r.canceled||!r.filePaths[0])return {ok:false};
  const target=r.filePaths[0];
  let p=profileOf(key);if(!p?.slots)p={app:current.fg.app,slots:Array(R.SLOTS).fill(null),more:[]};
  const item={type:kind==='folder'?'folder':'file',title:path.basename(target)||target,target};
  let where;
  if(slot>=0&&slot<p.slots.length){p=R.put(p,slot,item);where=`posto ${slot+1}`;}
  else{const res=R.add(p,item);p=res.profile;where=res.slot>=0?`posto ${res.slot+1}`:'Altro nel profilo';}
  setProfile(key,p);await refresh();
  return {ok:true,toast:`${item.title} · ${where}`,sub:target};
}

// ── Beta 0.40: media dei siti (lettore di VARCO) e delle app (controlli multimediali di Windows) ──
let mediaTimer=null;
const selfIds=()=>[app.getAppUserModelId?.()||'',process.execPath,'local.personal-workspace-browser'].filter(Boolean).map(x=>x.toLowerCase());
function appLabel(id){
  const known={spotify:'Spotify',zunemusic:'Lettore multimediale',zunevideo:'Film e TV',chrome:'Chrome',msedge:'Edge',firefox:'Firefox',vlc:'VLC',discord:'Discord',foobar2000:'foobar2000',itunes:'iTunes',applemusic:'Apple Music'};
  let s=String(id||'');s=s.includes('!')?s.split('!').pop():s.split('\\').pop();s=s.replace(/\.exe$/i,'');s=s.split('.').pop()||s;
  return known[s.toLowerCase()]||(s.charAt(0).toUpperCase()+s.slice(1)).slice(0,30);
}
async function mediaSnapshot(){
  const media=require('./media.cjs');
  const w=varcoWindow();
  const sites=(w?media.snapshot(w).media:[]).slice(0,4).map(m=>({src:'varco',key:m.key,title:m.title,sub:[m.subtitle,m.site].filter(Boolean).join(' · '),
    playing:!!m.playing,artwork:m.artwork?require('./icon-urls.cjs').toUrl(m.artwork):null,
    prev:!Array.isArray(m.controls)||m.controls.includes('previoustrack'),next:!Array.isArray(m.controls)||m.controls.includes('nexttrack'),from:'VARCO'}));
  const self=selfIds();
  const apps=(await foreground.media()).filter(x=>x&&x.app&&(x.title||x.artist)&&!self.includes(String(x.app).toLowerCase())&&!/personal-workspace-browser|electron\.exe$|varco\.exe$/i.test(String(x.app)))
    .slice(0,3).map(x=>({src:'app',key:x.app,title:x.title||appLabel(x.app),sub:[x.artist,appLabel(x.app)].filter(Boolean).join(' · '),playing:x.status==='Playing',prev:!!x.prev,next:!!x.next,from:appLabel(x.app)}));
  return [...sites.filter(m=>m.playing),...apps.filter(m=>m.playing),...sites.filter(m=>!m.playing),...apps.filter(m=>!m.playing)];
}
async function pushMedia(){
  if(!visible||!win)return;
  try{const list=await mediaSnapshot();if(visible&&win)win.webContents.send('launcher:media',list);}catch{}
}
function startMediaPolling(){stopMediaPolling();pushMedia();mediaTimer=setInterval(pushMedia,2500);}
function stopMediaPolling(){clearInterval(mediaTimer);mediaTimer=null;}
async function mediaControl({src,key,cmd}){
  if(!['toggle','next','prev','focus'].includes(cmd)||typeof key!=='string')return {ok:false};
  let r;
  if(src==='varco'){
    const media=require('./media.cjs');
    if(cmd==='focus'){hide();r=media.focus(key);}
    else r=media.command(key,cmd==='next'?'nexttrack':cmd==='prev'?'previoustrack':'toggle');
  }else if(src==='app'){
    if(cmd==='focus')return {ok:false};
    r=await foreground.mediaCommand(key,cmd);
    if(!r.ok)r={ok:false,error:'L’app non ha accettato il comando.'};
  }else return {ok:false};
  setTimeout(pushMedia,350);
  return r;
}

// ── Scorciatoia di sistema ──
function applyHotkey(){
  if(registered){try{globalShortcut.unregister(registered);}catch{}registered='';}
  if(!L().enabled)return {ok:true};
  const tryKey=accel=>{let ok=false;try{ok=globalShortcut.register(accel,toggle);}catch{}if(ok)registered=accel;return ok;};
  if(tryKey(L().hotkey)){foreground.start();return {ok:true};}
  // Combinazione di base occupata (es. da un'altra app) e mai scelta da te: si passa alla prima libera.
  if(!L().hotkeyChosen){
    for(const [accel,label] of R.HOTKEYS){
      if(accel!==L().hotkey&&tryKey(accel)){
        const old=(R.HOTKEYS.find(h=>h[0]===L().hotkey)||[])[1];
        L().hotkey=accel;save();foreground.start();
        setTimeout(()=>require('./toasts.cjs').show({id:'ln-key',category:'sistema',kind:'info',title:'Launcher: '+label,timeout:9000,
          text:`${old} è già usata da un altro programma, quindi il launcher si apre con ${label}. Puoi cambiarla in Impostazioni → Launcher.`}),4000);
        return {ok:true};
      }
    }
  }
  return {ok:false,error:'Questa combinazione è già usata da un altro programma: scegline un’altra.'};
}

function setup(commandBus){
  bus=commandBus;
  ipcMain.handle('launcher:invoke',async(event,op,a={})=>{
    if(!win||event.sender!==win.webContents)return {ok:false,error:'mittente non autorizzato'};
    try{
      switch(op){
        case 'hide':hide();return {ok:true};
        case 'run':{
          const e=registry.get(a.id);if(!e)return {ok:false,error:'Elemento non più valido.'};
          const fn=e.fns[a.action]??e.fns[0];if(!fn)return {ok:false};
          dialogOpen=true;
          try{const r=await fn();if(r?.refresh)await refresh();return r&&typeof r==='object'?r:{ok:true};}finally{dialogOpen=false;}
        }
        case 'cc':{
          const w=varcoWindow({open:true});if(!w)return {ok:false,error:'VARCO non è aperto.'};
          hide();bringVarco(w);
          return require('./command-center.cjs').action(w,a.id,a.action);
        }
        case 'dyn':{
          const text=String(a.text||'').trim().slice(0,1000);if(!text)return {ok:false};
          hide();
          if(a.type==='ask')return askJarvis(text);
          if(a.type==='note')return inVarco(w=>require('./command-center.cjs').dynamic(w,{type:'note',text}));
          return inVarco(w=>run(w,'newTab',{url:text}));
        }
        case 'put':case 'add':case 'clear':case 'swap':case 'ignore':case 'create':case 'addPage':case 'removePage':return edit(op,a);
        case 'browse':return browse(a);
        case 'media':return mediaControl(a);
        case 'drop':return drop(a.paths);
        case 'openVarco':hide();return inVarco(()=>({ok:true}));
      }
    }catch(error){return {ok:false,error:String(error?.message||error)};}
    return {ok:false,error:'Operazione sconosciuta.'};
  });
  bus.register('launcherOpen',{args:{mode:'string?'},description:'Apre il launcher (fast launcher o command center ad anello).',run:(_ctx,{mode})=>{open(mode==='cc'?'cc':'fast');return {ok:true};}});
  bus.register('launcherDeleteProfile',{args:{exe:'string'},description:'Launcher: elimina il profilo di un programma.',run:(_ctx,{exe})=>{const r=deleteProfile(String(exe).toLowerCase());windows.emitAll();return r;}});
  bus.register('launcherSettings',{args:{enabled:'bool?',hotkey:'string?'},description:'Launcher: acceso o spento e scorciatoia di sistema.',run:(_ctx,{enabled,hotkey})=>{
    const before={enabled:L().enabled,hotkey:L().hotkey,hotkeyChosen:L().hotkeyChosen};
    if(typeof enabled==='boolean')L().enabled=enabled;
    if(hotkey){if(!R.HOTKEYS.some(h=>h[0]===hotkey))return {ok:false,error:'Combinazione non ammessa.'};L().hotkey=hotkey;L().hotkeyChosen=true;}
    const r=applyHotkey();
    if(!r.ok){Object.assign(L(),before);applyHotkey();require('./toasts.cjs').show({id:'ln-key',category:'sistema',kind:'info',title:'Scorciatoia del launcher',text:r.error,timeout:7000});}
    save();windows.emitAll();
    return r;
  }});
  applyHotkey();
  // Pronto in anticipo: la prima apertura non aspetta PowerShell né la finestra.
  setTimeout(()=>{if(L().enabled){foreground.start();ensureWindow();installedApps().catch(()=>{});}},8000);
  app.on('will-quit',()=>{globalShortcut.unregisterAll();foreground.stop();});
}

function settingsSnapshot(){
  return {enabled:L().enabled,hotkey:L().hotkey,registered:!!registered,hotkeys:R.HOTKEYS.map(([value,label])=>({value,label})),
    profiles:Object.entries(L().profiles).map(([exe,p])=>({exe,app:p.app||exe,count:p.slots.filter(Boolean).length+p.more.length}))};
}
function deleteProfile(exe){if(L().profiles[exe]){delete L().profiles[exe];save();}return {ok:true};}

module.exports={setup,open,hide,toggle,settingsSnapshot,deleteProfile};
