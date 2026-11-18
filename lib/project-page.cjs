'use strict';

/**
 * Pagina del progetto (Beta 0.43.2): una scheda interna (app://project) disegnata dalla cornice.
 * Qui c'è solo il disco: .varco/pagina.json (tela e attività), .varco/note.md, .varco/screenshot/.
 * Ogni scrittura passa da un file temporaneo e poi rinomina, così un salvataggio a metà non rovina la pagina.
 */
const fs=require('node:fs');
const path=require('node:path');
const {shell,dialog}=require('electron');
const {state}=require('./state.cjs');
const R=require('./project-page-rules.cjs');

const folderOf=ws=>state.data.workspaces.find(w=>w.name===ws)?.projectPath||'';
const varcoDir=folder=>path.join(folder,'.varco');
const shotDir=folder=>path.join(varcoDir(folder),'screenshot');
const fileUrl=p=>'file:///'+p.replace(/\\/g,'/').split('/').map(encodeURIComponent).join('/').replace(/^file:\/\/\/([a-z])%3A/i,'file:///$1:');

function writeAtomic(file,text){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const tmp=file+'.tmp-'+process.pid;
  fs.writeFileSync(tmp,text,'utf8');
  fs.renameSync(tmp,file);
}
const statKey=file=>{try{const s=fs.statSync(file);return s.mtimeMs+':'+s.size;}catch{return '';}};

/** Cache per cartella: la cornice chiede lo stato spesso, il disco lo leggiamo solo quando cambia. */
const cache=new Map();
function read(folder){
  const pageFile=path.join(varcoDir(folder),'pagina.json'),notesFile=path.join(varcoDir(folder),'note.md'),dir=shotDir(folder);
  const key=[statKey(pageFile),statKey(notesFile),statKey(dir)].join('|');
  const hit=cache.get(folder);
  if(hit&&hit.key===key&&Date.now()-hit.at<4000)return hit.value;
  let page=null,fresh=false;
  try{page=R.normalizePage(JSON.parse(fs.readFileSync(pageFile,'utf8')));}catch{page=R.defaultPage();fresh=true;}
  let notes='';try{notes=fs.readFileSync(notesFile,'utf8').slice(0,R.LIMITS.text);}catch{}
  let shots=[];
  try{
    shots=fs.readdirSync(dir).filter(n=>R.safeShotName(n)===n).map(n=>{const p=path.join(dir,n);let m=0;try{m=fs.statSync(p).mtimeMs;}catch{}return {name:n,url:fileUrl(p),mtime:m};})
      .sort((a,b)=>b.mtime-a.mtime).slice(0,300);
  }catch{}
  const value={page,fresh,rev:key,notes,shots};
  cache.set(folder,{key,at:Date.now(),value});
  return value;
}

/** Quello che serve alla cornice per disegnare la pagina (null se il workspace non ha cartella). */
function snapshot(ws){
  const folder=folderOf(ws);
  if(!folder||!fs.existsSync(folder))return {folder,missing:true};
  return {folder,name:path.basename(folder),...read(folder)};
}

function savePage(ws,json){
  const folder=folderOf(ws);if(!folder)return {ok:false,error:'Questo workspace non ha una cartella di progetto.'};
  let raw;try{raw=JSON.parse(json);}catch{return {ok:false,error:'Dati della pagina non validi.'};}
  writeAtomic(path.join(varcoDir(folder),'pagina.json'),R.serialize(raw));
  cache.delete(folder);
  return {ok:true,rev:read(folder).rev};
}
function saveNotes(ws,text){
  const folder=folderOf(ws);if(!folder)return {ok:false,error:'Nessuna cartella.'};
  writeAtomic(path.join(varcoDir(folder),'note.md'),String(text).slice(0,R.LIMITS.text));
  cache.delete(folder);
  return {ok:true,rev:read(folder).rev};
}
/** Nome libero nella cartella: «foto.png», poi «foto (2).png»… */
function freeName(dir,name){
  const ext=path.extname(name),base=name.slice(0,-ext.length);let n=name,i=2;
  while(fs.existsSync(path.join(dir,n)))n=`${base} (${i++})${ext}`;
  return n;
}
/** Immagine incollata o trascinata nella cornice (data:image/…;base64). */
function addShot(ws,name,data){
  const folder=folderOf(ws);if(!folder)return {ok:false,error:'Nessuna cartella.'};
  const m=/^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(String(data));
  if(!m)return {ok:false,error:'Non è un\'immagine.'};
  const buf=Buffer.from(m[2],'base64');
  if(buf.length>R.MAX_SHOT_BYTES)return {ok:false,error:'Immagine troppo grande (massimo 20 MB).'};
  const ext='.'+(m[1]==='jpeg'?'jpg':m[1]);
  let clean=R.safeShotName(name)||R.safeShotName(String(name||'').replace(/\.[a-z0-9]+$/i,'')+ext)||('screenshot-'+new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')+ext);
  const dir=shotDir(folder);fs.mkdirSync(dir,{recursive:true});
  clean=freeName(dir,clean);
  fs.writeFileSync(path.join(dir,clean),buf);
  cache.delete(folder);
  return {ok:true,name:clean};
}
/** Sceglie le immagini da Esplora file e le copia in .varco/screenshot. */
async function chooseShots(w){
  const folder=folderOf(w.workspace);if(!folder)return {ok:false,error:'Nessuna cartella.'};
  const r=await dialog.showOpenDialog(w.win,{title:'Aggiungi screenshot al progetto',properties:['openFile','multiSelections'],
    filters:[{name:'Immagini',extensions:['png','jpg','jpeg','webp','gif']}]});
  if(r.canceled)return {ok:false,cancelled:true};
  const dir=shotDir(folder);fs.mkdirSync(dir,{recursive:true});
  const names=[];
  for(const file of r.filePaths){
    const n=R.safeShotName(path.basename(file));if(!n)continue;
    try{if(fs.statSync(file).size>R.MAX_SHOT_BYTES)continue;}catch{continue;}
    const dest=freeName(dir,n);fs.copyFileSync(file,path.join(dir,dest));names.push(dest);
  }
  cache.delete(folder);
  return {ok:true,names};
}
function openShot(ws,name){
  const folder=folderOf(ws),n=R.safeShotName(name);if(!folder||!n)return {ok:false};
  const p=path.join(shotDir(folder),n);if(!fs.existsSync(p))return {ok:false,error:'Immagine non trovata.'};
  shell.openPath(p);return {ok:true};
}
function revealRel(ws,rel){
  const folder=folderOf(ws),r=R.safeRel(rel);if(!folder||!r)return {ok:false};
  const p=path.join(folder,...r.split('/'));if(!fs.existsSync(p))return {ok:false,error:'File non trovato.'};
  shell.showItemInFolder(p);return {ok:true};
}

/** Apre (o mostra) la scheda della pagina del progetto nella finestra. */
function open(w){
  const tabs=require('./tabs.cjs');
  if(!folderOf(w.workspace))return {ok:false,error:'Collega prima una cartella al workspace (pannello Progetto).'};
  const existing=tabs.tabsOf(w).find(x=>x.isHome&&tabs.internalPage(x.url)==='project');
  if(existing)tabs.show(w,existing.id);else tabs.newHomeTab(w.workspace,{pane:w.pane,url:tabs.INTERNAL_PAGES.project.url});
  if(w.sidePanelOpen==='project'){w.sidePanelOpen=null;}
  return {ok:true};
}

function setup(bus){
  const windows=require('./windows.cjs');
  const reg=(name,args,description,fn)=>bus.register(name,{args,description,run:async(ctx,a)=>{
    const w=ctx.window||windows.focusedWindow();if(!w)return {ok:false,error:'Nessuna finestra.'};
    const r=await fn(w,a);windows.emitAll();return r??{ok:true};}});
  reg('projectPageOpen',{},'Apre la pagina del progetto: tela con stato, attività, note, screenshot e collegamenti.',w=>open(w));
  reg('projectPageSave',{json:'string'},'Pagina del progetto: salva la tela in .varco/pagina.json.',(w,{json})=>savePage(w.workspace,json));
  reg('projectPageNotes',{text:'string'},'Pagina del progetto: salva le note in .varco/note.md.',(w,{text})=>saveNotes(w.workspace,text));
  reg('projectPageAddShot',{name:'string',data:'string'},'Pagina del progetto: salva un\'immagine in .varco/screenshot.',(w,{name,data})=>addShot(w.workspace,name,data));
  reg('projectPageChooseShots',{},'Pagina del progetto: sceglie screenshot dal PC.',w=>chooseShots(w));
  reg('projectPageOpenShot',{name:'string'},'Pagina del progetto: apre uno screenshot.',(w,{name})=>openShot(w.workspace,name));
  reg('projectRevealRel',{rel:'string'},'Progetto: mostra un file nella sua cartella.',(w,{rel})=>revealRel(w.workspace,rel));
}

module.exports={setup,snapshot,open,savePage,saveNotes,addShot,read,folderOf};
