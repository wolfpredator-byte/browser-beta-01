'use strict';

/**
 * Visualizzatore di file (Beta 0.20). Apre i file del PC in una scheda VARCO:
 * codice, Markdown, CSV, immagini, video, audio, PDF, Word, Excel, PowerPoint,
 * modelli 3D, ZIP, font (la pagina è viewer/viewer.html; le regole in viewer-rules.cjs).
 *
 * Sicurezza: il protocollo varco-view:// serve SOLO
 * - i file che hai aperto tu (Ctrl+O, trascinandoli, dalla barra degli indirizzi),
 *   più quelli accanto a loro (immagini di un Markdown, texture di un modello);
 * - i file dentro le cartelle progetto collegate ai workspace;
 * e solo alla pagina del visualizzatore: una richiesta che arriva da un sito web
 * (per esempio un <img src="varco-view://…"> in una pagina https) viene rifiutata.
 */
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {Readable}=require('node:stream');
const {protocol,ipcMain,shell}=require('electron');
const {state}=require('./state.cjs');
const rules=require('./viewer-rules.cjs');

const VIEWER_DIR=path.join(__dirname,'..','viewer');
/** File aperti esplicitamente e cartelle in cui stanno (per i riferimenti relativi). */
const grantedFiles=new Set(),grantedDirs=new Set();
const key=p=>path.win32.normalize(p).toLowerCase();

/** Va chiamata prima di app.ready: rende varco-view:// un'origine "vera" (fetch, video, sicura). */
function registerScheme(){
  protocol.registerSchemesAsPrivileged([{scheme:rules.SCHEME,
    privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true,corsEnabled:false}}]);
}

/** Rende leggibile un file (e la sua cartella, se non è la radice di un disco o la cartella utente). */
function grant(file){
  grantedFiles.add(key(file));
  const dir=path.win32.dirname(file);
  const home=os.homedir();
  // Mai un disco intero (C:\) o la cartella utente intera: solo la cartella del file.
  const tooBroad=key(dir)===key(path.win32.parse(dir).root)||key(dir)===key(home)||key(dir)===key(path.dirname(home));
  if(!tooBroad)grantedDirs.add(key(dir));
}
function isAllowed(file){
  const k=key(file);
  if(grantedFiles.has(k))return true;
  for(const dir of grantedDirs)if(rules.isInside(k,dir))return true;
  return state.data.workspaces.some(w=>w.projectPath&&rules.isInside(file,w.projectPath));
}

const textResponse=(status,text)=>new Response(text,{status,headers:{'content-type':'text/plain; charset=utf-8'}});

/** Solo la pagina del visualizzatore (o la navigazione diretta) può chiedere i file, mai un sito. */
function fromViewer(request){
  const referrer=request.headers.get('referer')||request.referrer||'';
  return !referrer||referrer==='about:client'||referrer.startsWith(rules.ORIGIN+'/');
}

async function serveFile(request,file){
  if(!isAllowed(file))return textResponse(403,'File non concesso.');
  let stat;try{stat=await fs.promises.stat(file);}catch{return textResponse(404,'File non trovato.');}
  if(!stat.isFile())return textResponse(404,'Non è un file.');
  const range=rules.parseRange(request.headers.get('range'),stat.size);
  const headers={'content-type':rules.contentTypeOf(file),'accept-ranges':'bytes','cache-control':'no-store',
    'x-content-type-options':'nosniff'};
  if(range==='invalid')return new Response(null,{status:416,headers:{...headers,'content-range':`bytes */${stat.size}`}});
  const {start,end}=range||{start:0,end:Math.max(0,stat.size-1)};
  const stream=stat.size?Readable.toWeb(fs.createReadStream(file,{start,end})):null;
  return new Response(stream,{status:range?206:200,headers:{...headers,'content-length':String(stat.size?end-start+1:0),
    ...(range?{'content-range':`bytes ${start}-${end}/${stat.size}`}:{})}});
}

async function serveInfo(file){
  if(!isAllowed(file))return textResponse(403,'File non concesso.');
  try{
    const stat=await fs.promises.stat(file);
    return Response.json({path:file,name:path.basename(file),dir:path.dirname(file),size:stat.size,modified:stat.mtimeMs,
      ext:rules.extOf(file),kind:rules.kindOf(file),url:rules.fileUrl(file)});
  }catch{return textResponse(404,'File non trovato.');}
}

/** Pagina del visualizzatore e librerie (solo dalla cartella viewer/ dell'app). */
async function serveApp(pathname){
  const rel=decodeURIComponent(pathname).replace(/^\/+/,'');
  const file=path.join(VIEWER_DIR,rel);
  if(!rules.isInside(file,VIEWER_DIR))return textResponse(403,'');
  try{
    const data=await fs.promises.readFile(file);
    const ext=rules.extOf(file);
    const type={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',
      css:'text/css; charset=utf-8',svg:'image/svg+xml',png:'image/png',json:'application/json'}[ext]||'application/octet-stream';
    return new Response(data,{headers:{'content-type':type,'cache-control':'no-cache'}});
  }catch{return textResponse(404,'');}
}

function setup(ses){
  ses.protocol.handle(rules.SCHEME,async request=>{
    const url=new URL(request.url);
    if(url.host!=='app')return textResponse(404,'');
    if(url.pathname.startsWith('/fs/')){
      if(!fromViewer(request))return textResponse(403,'Solo il visualizzatore di VARCO può leggere i file.');
      const file=rules.pathFromFileUrl(request.url);
      return file?serveFile(request,file):textResponse(400,'Indirizzo non valido.');
    }
    if(url.pathname==='/info'){
      if(!fromViewer(request))return textResponse(403,'');
      const file=url.searchParams.get('p');
      return file?serveInfo(path.win32.normalize(file)):textResponse(400,'');
    }
    return serveApp(url.pathname);
  });
  // Pulsanti della pagina del visualizzatore ("Apri con…", "Mostra nella cartella"), via page-preload.cjs.
  ipcMain.handle('viewer:action',(event,action,file)=>{
    const sender=event.senderFrame?.url||'';
    if(!sender.startsWith(rules.ORIGIN+'/viewer.html')||typeof file!=='string'||!isAllowed(file))return {ok:false};
    if(action==='open'){shell.openPath(file);return {ok:true};}
    if(action==='folder'){shell.showItemInFolder(file);return {ok:true};}
    return {ok:false};
  });
}

/** Apre un file in una nuova scheda della finestra (o in quella in primo piano). */
function openFile(w,raw){
  const file=rules.normalizeLocalPath(raw);
  if(!file)return {ok:false,error:'Percorso non valido.'};
  let stat;try{stat=fs.statSync(file);}catch{return {ok:false,error:'Il file non esiste: '+file};}
  if(stat.isDirectory())return {ok:false,error:'È una cartella: usa il pannello File del progetto.'};
  grant(file);
  const tabs=require('./tabs.cjs');
  const target=w||require('./windows.cjs').focusedWindow();
  if(!target)return {ok:false,error:'Nessuna finestra aperta.'};
  // Se il file è già aperto in questa finestra, lo mostriamo.
  const existing=tabs.tabsOf(target).find(t=>rules.pathFromViewerUrl(t.url)?.toLowerCase()===file.toLowerCase());
  if(existing){tabs.show(target,existing.id);return {ok:true,id:existing.id};}
  const id=tabs.newTab(rules.viewerUrl(file),target.workspace,{pane:target.pane,title:path.basename(file)});
  return {ok:true,id};
}

/** Contenuto di una cartella del progetto (pannello File del progetto). */
const HIDDEN=new Set(['.git','node_modules','.next','dist','build','out','.vs','bin','obj','library','temp','logs','__pycache__','.venv','venv']);
function listDir(dir){
  if(!state.data.workspaces.some(w=>w.projectPath&&rules.isInside(dir,w.projectPath))&&!isAllowed(path.join(dir,'_')))
    return {ok:false,error:'Cartella non concessa.'};
  let entries;try{entries=fs.readdirSync(dir,{withFileTypes:true});}catch(e){return {ok:false,error:String(e.message||e)};}
  const items=entries.filter(e=>!e.name.startsWith('.')||['.env.example','.gitignore','.editorconfig'].includes(e.name))
    .map(e=>({name:e.name,path:path.join(dir,e.name),dir:e.isDirectory(),heavy:e.isDirectory()&&HIDDEN.has(e.name.toLowerCase()),
      kind:e.isDirectory()?'folder':rules.kindOf(e.name)}))
    .sort((a,b)=>Number(b.dir)-Number(a.dir)||a.name.localeCompare(b.name,'it',{numeric:true}));
  return {ok:true,dir,items:items.slice(0,500),truncated:items.length>500};
}

/** All'avvio: le schede del visualizzatore salvate tornano leggibili. */
function grantRestored(url){const file=rules.pathFromViewerUrl(url);if(file)grant(file);}

module.exports={registerScheme,setup,grant,isAllowed,openFile,listDir,grantRestored};
