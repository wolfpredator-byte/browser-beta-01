'use strict';

/**
 * Board su disco (Beta 0.43.3): stesse regole per progetti e giochi (lib/board-rules.cjs).
 * - Progetto: <cartella del progetto>/.varco/ (viaggia con git). Le immagini in .varco/screenshot/.
 * - Gioco: la cartella del workspace del gioco (.varco/), altrimenti Documenti\VARCO\Giochi\<nome>\. Catture in catture/, storico in sessioni/.
 * Ogni scrittura passa da un file temporaneo e poi rinomina.
 */
const fs=require('node:fs');
const path=require('node:path');
const {app}=require('electron');
const {state}=require('./state.cjs');
const R=require('./board-rules.cjs');
const P=require('./project-page-rules.cjs');

const fileUrl=p=>'file:///'+p.replace(/\\/g,'/').split('/').map(encodeURIComponent).join('/').replace(/^file:\/\/\/([a-z])%3A/i,'file:///$1:');
function writeAtomic(file,text){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+'.tmp-'+process.pid;fs.writeFileSync(tmp,text,'utf8');fs.renameSync(tmp,file);}
const readJson=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch{return null;}};
const statKey=f=>{try{const s=fs.statSync(f);return s.mtimeMs+':'+s.size;}catch{return '';}};
const MEDIA=/\.(png|jpe?g|webp|gif|mp4|mkv|webm)$/i;

/** Dove stanno le board di un progetto (workspace) o di un gioco (id). null se non c'è una cartella. */
function context(kind,key){
  const data=state.data;
  if(kind==='project'){
    const folder=data.workspaces.find(w=>w.name===key)?.projectPath||'';
    if(!folder||!fs.existsSync(folder))return null;
    const root=path.join(folder,'.varco');
    // Link rapidi della prima volta: risorse del workspace + pannelli consigliati del tipo di progetto (suggeriti).
    const ws=data.workspaces.find(w=>w.name===key),host=u=>{try{return new URL(u).hostname.replace(/^www\./,'');}catch{return u;}};
    let panels=[];try{panels=require('./project-types.cjs').snapshot(key)?.panels||[];}catch{}
    const quickDefault=[...(ws.resources||[]).map(u=>({i:'bookmark',n:host(u).slice(0,28),u,w:'scheda'})),...panels.map(p=>({i:'link',n:p.title,u:p.url,w:'pannello',sug:true}))];
    return {kind,key,folder,root,shots:path.join(root,'screenshot'),name:path.basename(folder),quickDefault,build:[]};
  }
  const game=data.games.find(g=>String(g.id)===String(key));if(!game)return null;
  const wsFolder=data.workspaces.find(w=>w.name===game.workspace)?.projectPath||'';
  const root=wsFolder&&fs.existsSync(wsFolder)?path.join(wsFolder,'.varco'):path.join(app.getPath('documents'),'VARCO','Giochi',R.safeFolderName(game.name));
  return {kind,key:String(game.id),game,folder:wsFolder||root,root,shots:path.join(root,'catture'),name:game.name,
    quickDefault:R.suggestedGameLinks(game.name,game.sites||[]),build:['Personaggio','Livello','Equipaggiamento']};
}
const indexFile=ctx=>path.join(ctx.root,'boards.json');
const boardFile=(ctx,id)=>path.join(ctx.root,'boards',id+'.json');

/** Prima volta su un progetto della 0.43.2: pagina.json e note.md diventano la board «Principale». */
function migrate(ctx){
  if(fs.existsSync(indexFile(ctx)))return;
  if(ctx.kind!=='project')return;
  const old=readJson(path.join(ctx.root,'pagina.json'));if(!old)return;
  let notes='';try{notes=fs.readFileSync(path.join(ctx.root,'note.md'),'utf8');}catch{}
  writeAtomic(boardFile(ctx,'b1'),JSON.stringify(R.normalizeBoard({...old,notes},'project'),null,1)+'\n');
  // Etichette: quelle di partenza più quelle già usate nelle attività. Link rapidi: risorse e pannelli consigliati.
  const tags=R.normalizeTags(undefined,'project'),have=new Set(tags.map(t=>t.n.toLowerCase()));
  for(const n of new Set((old.tasks||[]).map(t=>t.tag).filter(Boolean)))if(!have.has(n.toLowerCase()))tags.push({n,c:tags.length%5});
  writeAtomic(indexFile(ctx),JSON.stringify(R.normalizeIndex({current:'b1',boards:{b1:{name:'Principale',created:Date.now()}},tags},ctx.kind,{quickDefault:ctx.quickDefault}),null,1)+'\n');
}
function readIndex(ctx){migrate(ctx);return R.normalizeIndex(readJson(indexFile(ctx)),ctx.kind,{quickDefault:ctx.quickDefault});}
function readBoard(ctx,id){const raw=readJson(boardFile(ctx,id));return raw?R.normalizeBoard(raw,ctx.kind):R.defaultBoard(ctx.kind,{build:ctx.build});}
function writeIndex(ctx,index){writeAtomic(indexFile(ctx),JSON.stringify(R.normalizeIndex(index,ctx.kind,{quickDefault:ctx.quickDefault}),null,1)+'\n');cache.delete(ctx.root);}
function writeBoard(ctx,id,board){if(!R.boardId(id))return;writeAtomic(boardFile(ctx,id),JSON.stringify(R.normalizeBoard(board,ctx.kind),null,1)+'\n');cache.delete(ctx.root);}

function listMedia(dir,limit=300){
  try{return fs.readdirSync(dir).filter(n=>MEDIA.test(n)&&(P.safeShotName(n)===n||/\.(mp4|mkv|webm)$/i.test(n))).map(n=>{const p=path.join(dir,n);let m=0;try{m=fs.statSync(p).mtimeMs;}catch{}
    return {name:n,url:fileUrl(p),mtime:m,clip:/\.(mp4|mkv|webm)$/i.test(n)};}).sort((a,b)=>b.mtime-a.mtime).slice(0,limit);}catch{return [];}
}
/** Stato per la cornice. Il disco si rilegge solo quando cambia (la cornice chiede spesso). */
const cache=new Map();
function snapshot(kind,key){
  const ctx=context(kind,key);
  if(!ctx)return {kind,key:String(key),missing:true};
  const idxKey=statKey(indexFile(ctx)),hit=cache.get(ctx.root);
  const curId=hit?.value.index.current;
  const key2=[idxKey,curId?statKey(boardFile(ctx,curId)):'',statKey(ctx.shots)].join('|');
  if(hit&&hit.key===key2&&Date.now()-hit.at<4000)return hit.value;
  const index=readIndex(ctx);
  const value={kind,key:ctx.key,folder:ctx.folder,root:ctx.root,name:ctx.name,index,board:readBoard(ctx,index.current),shots:listMedia(ctx.shots),
    rev:[statKey(indexFile(ctx)),statKey(boardFile(ctx,index.current)),statKey(ctx.shots)].join('|'),
    stats:Object.fromEntries(Object.keys(index.boards).map(id=>{const b=id===index.current?null:readJson(boardFile(ctx,id));const ss=(b||{}).sessions||[];return [id,b?{n:ss.length,t:ss.reduce((a,x)=>a+(x.dur||0),0),
      done:(b.tasks||[]).filter(t=>t.done).length,tasks:(b.tasks||[]).length,last:ss[0]?.start||0}:null];}))};
  cache.set(ctx.root,{key:[statKey(indexFile(ctx)),statKey(boardFile(ctx,index.current)),statKey(ctx.shots)].join('|'),at:Date.now(),value});
  return value;
}

/** Salva la board aperta (e, se arriva, l'elenco: nomi, etichette, link, preset). */
function save(kind,key,boardJson,indexJson){
  const ctx=context(kind,key);if(!ctx)return {ok:false,error:'Cartella non trovata.'};
  let board,idx;try{board=JSON.parse(boardJson);idx=indexJson?JSON.parse(indexJson):null;}catch{return {ok:false,error:'Dati non validi.'};}
  const index=readIndex(ctx);
  if(idx){for(const k of ['tags','quick','presets','lastPreset'])if(idx[k]!==undefined)index[k]=idx[k];
    for(const [id,b] of Object.entries(idx.boards||{}))if(index.boards[id])Object.assign(index.boards[id],{name:b.name,archived:b.archived});}
  index.boards[index.current].last=Date.now();
  writeBoard(ctx,index.current,board);writeIndex(ctx,index);
  return {ok:true,rev:snapshot(kind,key).rev};
}
function create(kind,key,name,from,sourceId){
  const ctx=context(kind,key);if(!ctx)return {ok:false};
  const index=readIndex(ctx),id=R.nextBoardId(index),src=readBoard(ctx,R.boardId(sourceId)&&index.boards[sourceId]?sourceId:index.current);
  writeBoard(ctx,id,R.newBoard(kind,from,src));
  index.boards[id]={name:String(name||'').trim().slice(0,40)||('Board '+(Object.keys(index.boards).length+1)),created:Date.now(),archived:false,last:Date.now()};
  index.current=id;writeIndex(ctx,index);return {ok:true,id};
}
function switchTo(kind,key,id){const ctx=context(kind,key);if(!ctx)return {ok:false};const index=readIndex(ctx);if(!index.boards[id])return {ok:false};index.current=id;writeIndex(ctx,index);return {ok:true};}
function remove(kind,key,id){
  const ctx=context(kind,key);if(!ctx)return {ok:false};const index=readIndex(ctx);
  if(!index.boards[id]||id===index.current||Object.keys(index.boards).length<2)return {ok:false,error:'Non si può eliminare la board aperta.'};
  delete index.boards[id];try{fs.rmSync(boardFile(ctx,id),{force:true});}catch{}writeIndex(ctx,index);return {ok:true};
}

/** Immagine incollata o trascinata (data:image/…;base64) nella cartella delle immagini. */
function freeName(dir,name){const ext=path.extname(name),base=name.slice(0,-ext.length);let n=name,i=2;while(fs.existsSync(path.join(dir,n)))n=`${base} (${i++})${ext}`;return n;}
function addShot(kind,key,name,data){
  const ctx=context(kind,key);if(!ctx)return {ok:false,error:'Cartella non trovata.'};
  const m=/^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(String(data));if(!m)return {ok:false,error:'Non è un\'immagine.'};
  const buf=Buffer.from(m[2],'base64');if(buf.length>P.MAX_SHOT_BYTES)return {ok:false,error:'Immagine troppo grande (massimo 20 MB).'};
  const ext='.'+(m[1]==='jpeg'?'jpg':m[1]);
  let clean=P.safeShotName(name)||P.safeShotName(String(name||'').replace(/\.[a-z0-9]+$/i,'')+ext)||('cattura-'+new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')+ext);
  fs.mkdirSync(ctx.shots,{recursive:true});clean=freeName(ctx.shots,clean);fs.writeFileSync(path.join(ctx.shots,clean),buf);cache.delete(ctx.root);
  return {ok:true,name:clean};
}
function copyIn(ctx,files){
  fs.mkdirSync(ctx.shots,{recursive:true});const names=[];
  for(const file of files){const n=path.basename(file);if(!MEDIA.test(n))continue;try{if(fs.statSync(file).size>500*1024*1024)continue;}catch{continue;}
    const dest=freeName(ctx.shots,P.safeShotName(n)||n.replace(/[<>:"|?*]/g,'_'));fs.copyFileSync(file,path.join(ctx.shots,dest));names.push(dest);}
  cache.delete(ctx.root);return names;
}
const mediaPath=(kind,key,name)=>{const ctx=context(kind,key);if(!ctx)return null;const n=path.basename(String(name||''));if(!MEDIA.test(n))return null;const p=path.join(ctx.shots,n);return fs.existsSync(p)?p:null;};

module.exports={context,snapshot,save,create,switchTo,remove,addShot,copyIn,mediaPath,readIndex,readBoard,writeIndex,writeBoard,listMedia,cache};
