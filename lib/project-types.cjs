'use strict';

/**
 * Beta 0.43.1 — tipi di progetto: scansione della cartella, tipo scelto (.varco/project.json), azioni rapide.
 * Le regole (riconoscimento, azioni, file importanti) sono in project-type-rules.cjs.
 *
 * La scansione è leggera (3 livelli, al massimo 4000 voci, senza node_modules, Library, .git…), gira in background
 * e resta in memoria 20 secondi: il pannello mostra subito l'ultima e si aggiorna quando ne arriva una nuova.
 */
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawn}=require('node:child_process');
const {shell}=require('electron');
const {state}=require('./state.cjs');
const windows=require('./windows.cjs');
const R=require('./project-type-rules.cjs');

const CACHE_MS=20000,MAX_ENTRIES=4000,MAX_DEPTH=3;
const cache=new Map();   // cartella → {at, entries, scanning, kind}
let bus=null;
const run=(w,command,args={})=>bus.dispatch(command,args,{window:w,source:'project-type'});

function folderOf(ws){return state.data.workspaces.find(x=>x.name===ws)?.projectPath||'';}
/** Un disco intero o la cartella utente non sono un progetto: niente scansione. */
function tooBroad(folder){const f=path.resolve(folder).toLowerCase();return path.parse(f).root.toLowerCase()===f||f===os.homedir().toLowerCase();}

async function scan(folder){
  const entries=[];let seen=0;
  async function walk(dir,rel,depth){
    let list;try{list=await fs.promises.readdir(dir,{withFileTypes:true});}catch{return;}
    for(const d of list){
      if(++seen>MAX_ENTRIES)return;
      const r=rel?rel+'/'+d.name:d.name;
      if(d.isDirectory()){
        if(R.SKIP_DIRS.test(d.name))continue;
        entries.push({rel:r,dir:true,mtime:0});
        if(depth<MAX_DEPTH)await walk(path.join(dir,d.name),r,depth+1);
      }else if(d.isFile()){
        let mtime=0;try{mtime=(await fs.promises.stat(path.join(dir,d.name))).mtimeMs;}catch{}
        entries.push({rel:r,dir:false,mtime});
      }
    }
  }
  await walk(folder,'',0);
  return entries;
}
function readKind(folder){try{return R.normalizeKind(JSON.parse(fs.readFileSync(path.join(folder,'.varco','project.json'),'utf8')));}catch{return null;}}
function readVarco(folder){try{return JSON.parse(fs.readFileSync(path.join(folder,'.varco','project.json'),'utf8'))||{};}catch{return {};}}

/** Ricalcola in background lo stato del tipo per un workspace (e aggiorna la cornice quando ha finito). */
function refresh(ws,{force=false}={}){
  const folder=folderOf(ws);if(!folder)return;
  const c=cache.get(folder)||{};
  if(c.scanning||(!force&&c.at&&Date.now()-c.at<CACHE_MS))return;
  c.scanning=true;cache.set(folder,c);
  (async()=>{
    const broad=tooBroad(folder);
    const entries=broad||!fs.existsSync(folder)?[]:await scan(folder).catch(()=>[]);
    const game=state.data.games.some(g=>g.workspace===ws);
    Object.assign(c,{at:Date.now(),entries,broad,detected:R.detect(entries,{game}),scanning:false});
    windows.emitAll();
  })();
}

const ago=ms=>{const s=(Date.now()-ms)/1000;if(s<60)return 'adesso';if(s<3600)return `${Math.round(s/60)} min fa`;if(s<86400)return `${Math.round(s/3600)} h fa`;if(s<86400*30)return `${Math.round(s/86400)} g fa`;return new Date(ms).toLocaleDateString('it-IT');};

/** Dati per il pannello (sincroni: usano l'ultima scansione, e ne chiedono una nuova se è vecchia). */
function snapshot(ws){
  const folder=folderOf(ws);
  if(!folder)return null;
  refresh(ws);
  const c=cache.get(folder)||{};
  const chosen=readKind(folder);
  const detected=c.detected||{type:null,engine:null,reason:''};
  const type=chosen||detected.type;
  const t=type?R.TYPES[type]:null;
  const entries=c.entries||[];
  const panels=state.data.webPanels.map(p=>p.url);
  const sameSite=(a,b)=>{try{return new URL(a).host===new URL(b).host;}catch{return false;}};
  return {type,chosen:!!chosen,detected,scanning:!!c.scanning||!c.at,broad:!!c.broad,
    types:R.TYPE_IDS.map(id=>({id,label:R.TYPES[id].label})),
    label:t?.label||'Generico',hint:t?.hint||'Scegli il tipo: cambiano azioni rapide, pannelli consigliati e file importanti.',
    engine:detected.engine,
    actions:t?t.actions.map(a=>({id:a.id,label:a.id==='engine'?({unity:'Avvia Unity',unreal:'Apri Unreal',godot:'Apri Godot'}[detected.engine]||a.label):a.label})):[],
    panels:t?t.panels.map(([title,url])=>({title,url,added:panels.some(p=>sameSite(p,url))})):[],
    important:t?R.importantFiles(type,entries).map(g=>({...g,files:g.files.map(f=>({rel:f.rel,ago:ago(f.mtime)}))})):[],
    recent:R.recentFiles(entries).map(f=>({rel:f.rel,ago:ago(f.mtime)}))};
}

// ── Azioni ──
const toast=(w,title,text,kind='info')=>require('./toasts.cjs').show({id:'ptype-'+Date.now(),category:'sistema',kind,title,text,timeout:6000},w);
const abs=(folder,rel)=>{const p=path.resolve(folder,...String(rel).split('/'));return p.toLowerCase().startsWith(path.resolve(folder).toLowerCase()+path.sep)||p.toLowerCase()===path.resolve(folder).toLowerCase()?p:null;};
async function findApp(names){
  const scan=require('./app-scan.cjs').scan;
  const apps=[...await scan('apps').catch(()=>[]),...await scan('games').catch(()=>[])];
  const want=names.map(n=>n.toLowerCase());
  return apps.find(a=>want.some(n=>a.name.toLowerCase()===n))||apps.find(a=>want.some(n=>a.name.toLowerCase().startsWith(n)))||null;
}
function detachedSpawn(exe,args,cwd){const c=spawn(exe,args,{cwd,detached:true,stdio:'ignore',windowsHide:false});c.on('error',()=>{});c.unref();}

/** Unity: l'editor della versione del progetto (Hub/Editor/<versione>), se no Unity Hub. */
async function openUnity(w,folder){
  let ver=null;try{ver=R.unityVersion(fs.readFileSync(path.join(folder,'ProjectSettings','ProjectVersion.txt'),'utf8'));}catch{}
  const roots=[path.join(process.env.ProgramFiles||'C:\\Program Files','Unity','Hub','Editor')];
  try{const extra=JSON.parse(fs.readFileSync(path.join(process.env.APPDATA||'','UnityHub','secondaryInstallPath.json'),'utf8'));if(typeof extra==='string'&&extra)roots.push(extra);}catch{}
  if(ver)for(const r of roots){const exe=path.join(r,ver,'Editor','Unity.exe');if(fs.existsSync(exe)){detachedSpawn(exe,['-projectPath',folder],folder);toast(w,'Unity '+ver,'Apro il progetto con l’editor giusto.','success');return {ok:true};}}
  const hub=await findApp(['Unity Hub']);
  if(hub){shell.openPath(hub.path);toast(w,'Unity Hub',ver?`L’editor ${ver} non è installato: aprilo dall’Hub.`:'Apri il progetto dall’Hub.');return {ok:true};}
  return {ok:false,error:'Unity non è installato su questo PC.'};
}

async function action(w,id){
  const ws=w.workspace,folder=folderOf(ws);
  if(!folder)return {ok:false,error:'Collega prima la cartella del progetto.'};
  const snap=snapshot(ws);const t=R.TYPES[snap?.type];
  const a=t?.actions.find(x=>x.id===id);
  if(!a)return {ok:false,error:'Azione non disponibile per questo tipo.'};
  const entries=cache.get(folder)?.entries||await scan(folder);
  switch(a.kind){
    case 'preview':return run(w,'projectOpenPreview');
    case 'engine':{
      if(snap.engine==='unity')return openUnity(w,folder);
      const file=entries.find(e=>!e.dir&&(snap.engine==='unreal'?/\.uproject$/i:/(^|\/)project\.godot$/i).test(e.rel));
      if(file){shell.openPath(abs(folder,file.rel));return {ok:true};}
      return {ok:false,error:'Non trovo il file del progetto del motore.'};
    }
    case 'repo':{
      let cfg='';try{cfg=fs.readFileSync(path.join(folder,'.git','config'),'utf8');}catch{}
      const url=R.repoUrl(cfg);
      if(!url)return {ok:false,error:'Nessun repository remoto (origin) in questa cartella.'};
      return run(w,'newTab',{url});
    }
    case 'logs':{
      let log=null;
      if(snap.engine==='unity')log=path.join(process.env.LOCALAPPDATA||'','Unity','Editor','Editor.log');
      else if(snap.engine==='unreal'){const dir=path.join(folder,'Saved','Logs');try{log=fs.readdirSync(dir).filter(n=>n.endsWith('.log')).map(n=>path.join(dir,n)).sort((x,y)=>fs.statSync(y).mtimeMs-fs.statSync(x).mtimeMs)[0];}catch{}}
      if(log&&fs.existsSync(log)){require('./file-viewer.cjs').openFile(w,log);return {ok:true};}
      const dir=R.folderFor({folders:['logs','log']},entries);
      if(dir){shell.openPath(abs(folder,dir.rel));return {ok:true};}
      return {ok:false,error:'Nessun log trovato.'};
    }
    case 'command':{
      const cmds=require('./projects.cjs').get(ws)?.config?.avvio||[];
      const i=cmds.findIndex(c=>a.command.test(c.nome+' '+c.comando));
      if(i<0)return {ok:false,error:'Nessun comando «build» in progetto.browser.json.'};
      return require('./project-processes.cjs').start(ws,i);
    }
    case 'open-recent':{
      const f=R.newestFor(a,entries);
      if(f){shell.openPath(abs(folder,f.rel));return {ok:true};}
      if(a.apps){const app=await findApp(a.apps);if(app){shell.openPath(app.path);return {ok:true};}}
      return {ok:false,error:`Nessun file ${a.ext.map(e=>'.'+e).join(', ')} nel progetto.`};
    }
    case 'open-folder':{
      const d=R.folderFor(a,entries);
      if(d){shell.openPath(abs(folder,d.rel));return {ok:true};}
      if(a.url)return run(w,'newTab',{url:a.url});
      return {ok:false,error:`Nessuna cartella «${a.folders[0]}» nel progetto.`};
    }
    case 'app':{
      const app=await findApp(a.apps);
      if(app){shell.openPath(app.path);return {ok:true};}
      if(a.url)return run(w,'newTab',{url:a.url});
      return {ok:false,error:`${a.apps[0]} non è installato.`};
    }
    case 'open-url':{
      // Gaming: wiki e build vengono dai siti del gioco collegato, se ci sono.
      const game=state.data.games.find(g=>g.workspace===ws);
      const sites=game?.sites||[];
      const pick=id==='wiki'?sites.find(u=>/wiki|fandom|wikia/i.test(u)):sites.find(u=>/build|light\.gg|mobalytics|maxroll|d2foundry|loadout|dim/i.test(u))||sites[0];
      const url=pick||(id==='wiki'&&game?`https://www.fandom.com/?s=${encodeURIComponent(game.name)}`:a.url);
      if(!url)return {ok:false,error:'Aggiungi i siti del gioco nel pannello Giochi.'};
      return run(w,'newTab',{url});
    }
  }
  return {ok:false};
}

function setType(ws,type){
  const folder=folderOf(ws);if(!folder)return {ok:false,error:'Collega prima la cartella del progetto.'};
  if(type&&!R.TYPE_IDS.includes(type))return {ok:false,error:'Tipo sconosciuto.'};
  const dir=path.join(folder,'.varco');
  try{
    fs.mkdirSync(dir,{recursive:true});
    const data={...readVarco(folder),tipo:type||undefined,aggiornato:new Date().toISOString()};
    if(!type)delete data.tipo;
    fs.writeFileSync(path.join(dir,'project.json'),JSON.stringify(data,null,2)+'\n');
  }catch(e){return {ok:false,error:'Non riesco a scrivere nella cartella del progetto: '+e.message};}
  windows.emitAll();
  return {ok:true};
}
function openRel(ws,rel){
  const folder=folderOf(ws);const p=folder&&abs(folder,rel);
  if(!p||!fs.existsSync(p))return {ok:false,error:'File non trovato.'};
  shell.openPath(p);return {ok:true};
}

function setup(commandBus){
  bus=commandBus;
  const reg=(name,args,description,fn)=>bus.register(name,{args,description,run:(ctx,a)=>{const w=ctx.window;if(!w)return {ok:false,error:'Nessuna finestra.'};return fn(w,a);}});
  reg('projectTypeAction',{id:'string'},'Progetto: azione rapida del tipo (motore, build, log, file recente…).',(w,{id})=>action(w,id));
  reg('projectSetType',{type:'string'},'Progetto: sceglie il tipo (salvato in .varco/project.json).',(w,{type})=>setType(w.workspace,type));
  reg('projectOpenRel',{rel:'string'},'Progetto: apre un file della cartella del progetto.',(w,{rel})=>openRel(w.workspace,rel));
  reg('projectRescan',{},'Progetto: rilegge la cartella.',w=>{refresh(w.workspace,{force:true});return {ok:true};});
}

module.exports={setup,snapshot,refresh,setType,action,scan,tooBroad};
