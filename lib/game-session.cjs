'use strict';

/**
 * Partite (Beta 0.43.3). Quando un gioco parte inizia una partita sulla board aperta, con l'ultimo preset;
 * un avviso (nel companion, se c'è) lascia cambiare preset. Quando il gioco si chiude, la partita aspetta
 * nella pagina del gioco: «Aggiungi allo storico» con le catture fatte nel frattempo (Xbox Game Bar, Steam, NVIDIA).
 * La board resta com'è: niente si perde chiudendo il gioco.
 */
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {shell}=require('electron');
const {state}=require('./state.cjs');
const R=require('./board-rules.cjs');
const store=require('./board-store.cjs');

const gameOf=id=>state.data.games.find(g=>String(g.id)===String(id))||null;
const toasts=()=>require('./toasts.cjs');
const windows=()=>require('./windows.cjs');

/** Cartelle dove i programmi di cattura salvano screenshot e clip. */
function captureFolders(game){
  const home=os.homedir(),out=[path.join(home,'Videos','Captures'),path.join(home,'Videos',game.name),path.join(home,'Pictures','Screenshots')];
  for(const steam of ['C:\\Program Files (x86)\\Steam','C:\\Program Files\\Steam']){
    const ud=path.join(steam,'userdata');
    try{for(const u of fs.readdirSync(ud)){const remote=path.join(ud,u,'760','remote');try{for(const app of fs.readdirSync(remote))out.push(path.join(remote,app,'screenshots'));}catch{}}}catch{}
  }
  return out;
}
function scanCaptures(game,since){
  const files=[];
  for(const dir of captureFolders(game)){
    let st;try{st=fs.statSync(dir);}catch{continue;}if(!st.isDirectory()||st.mtimeMs<since-60000)continue;
    try{for(const n of fs.readdirSync(dir)){const p=path.join(dir,n);try{const s=fs.statSync(p);if(s.isFile())files.push({path:p,name:n,mtime:s.mtimeMs});}catch{}}}catch{}
  }
  return R.newCaptures(files,since);
}

/** Inizia una partita (gioco rilevato oppure «Inizia partita» dalla pagina). */
function start(game,{manual=false}={}){
  const ctx=store.context('game',game.id);if(!ctx)return {ok:false};
  const index=store.readIndex(ctx);
  if(index.session)return {ok:true,already:true};
  index.session={start:Date.now(),preset:index.lastPreset,board:index.current,manual};
  store.writeIndex(ctx,index);
  const presets=Object.entries(index.presets);
  if(presets.length){
    const target=state.windows.find(w=>w.companionGameId===game.id)||windows().focusedWindow();
    const cur=index.presets[index.session.preset];
    toasts().show({id:'game-preset-'+game.id,category:'sistema',kind:'info',title:`${game.name} è partito`,
      text:`Board «${index.boards[index.current].name}» · preset «${cur?.n||'—'}». Cambia preset:`,timeout:15000,
      actions:presets.slice(0,4).map(([id,p])=>({label:p.n,command:'gameSessionPreset',args:{id:game.id,preset:id}}))},target);
  }
  windows().emitAll();return {ok:true};
}
/** Il gioco si è chiuso: la partita resta in attesa di essere salvata nello storico. */
function stop(game){
  const ctx=store.context('game',game.id);if(!ctx)return {ok:false};
  const index=store.readIndex(ctx);if(!index.session)return {ok:false};
  const s=index.session,end=Date.now();
  index.pending={start:s.start,end,preset:s.preset,board:s.board,caps:scanCaptures(game,s.start)};
  index.session=null;store.writeIndex(ctx,index);
  const m=Math.round((end-s.start)/60000);
  if(end-s.start>=60000)toasts().show({id:'game-end-'+game.id,category:'sistema',kind:'success',title:'Partita finita',
    text:`${game.name} · ${Math.floor(m/60)} h ${String(m%60).padStart(2,'0')} min · ${index.pending.caps.length} catture`,timeout:12000,
    actions:[{label:'Aggiungi allo storico',command:'gamePageOpen',args:{id:game.id}}]});
  windows().emitAll();return {ok:true};
}
function setPreset(id,preset){
  const ctx=store.context('game',id);if(!ctx)return {ok:false};
  const index=store.readIndex(ctx);if(!index.presets[preset])return {ok:false};
  index.lastPreset=preset;if(index.session)index.session.preset=preset;store.writeIndex(ctx,index);
  openPresetSites(id,preset);
  windows().emitAll();return {ok:true};
}
/** Apre i siti del preset: nel companion se il preset lo chiede, altrimenti come schede del workspace del gioco. */
function openPresetSites(id,preset){
  const game=gameOf(id),ctx=store.context('game',id);if(!game||!ctx)return;
  const index=store.readIndex(ctx),p=index.presets[preset];if(!p)return;
  const tabs=require('./tabs.cjs');
  for(const name of p.open){const l=index.quick.find(q=>q.n===name);if(!l)continue;
    const exists=state.tabs.some(t=>t.workspace===game.workspace&&t.url&&t.url.startsWith(l.u.replace(/\/$/,'')));
    if(!exists)tabs.newTab(l.u,game.workspace,{activate:false});}
}
/** Salva la partita in attesa nello storico della sua board (catture scelte copiate in catture/, riepilogo in sessioni/). */
function finish(id,json){
  const game=gameOf(id),ctx=store.context('game',id);if(!game||!ctx)return {ok:false};
  let a;try{a=JSON.parse(json);}catch{return {ok:false,error:'Dati non validi.'};}
  const index=store.readIndex(ctx),p=index.pending;if(!p)return {ok:false,error:'Nessuna partita da salvare.'};
  const keep=new Set(Array.isArray(a.keep)?a.keep:[]),chosen=p.caps.filter(c=>keep.has(c.path)).map(c=>c.path);
  const names=store.copyIn(ctx,chosen);
  const board=store.readBoard(ctx,p.board);
  const done=a.keepDone?board.tasks.filter(t=>t.done).map(t=>t.t):[];
  const session=R.normalizeSession({id:'s'+p.start,start:p.start,dur:p.end-p.start,p:p.preset,caps:[...names,...(Array.isArray(a.extra)?a.extra:[])],note:String(a.note||''),done});
  board.sessions.unshift(session);
  if(a.reset)board.tasks.forEach(t=>{t.done=false;delete t.doneAt;});
  store.writeBoard(ctx,p.board,board);
  const day=new Date(p.start).toISOString().slice(0,10),md=path.join(ctx.root,'sessioni',day+'.md');
  try{fs.mkdirSync(path.dirname(md),{recursive:true});
    if(!fs.existsSync(md))fs.writeFileSync(md,`# ${game.name} · ${day}\n\n`,'utf8');
    fs.appendFileSync(md,R.sessionMarkdown({game:game.name,board:index.boards[p.board]?.name||'',preset:index.presets[p.preset]?.n,session}),'utf8');}catch{}
  index.pending=null;index.boards[p.board].last=Date.now();store.writeIndex(ctx,index);
  return {ok:true,caps:names.length};
}
function drop(id){const ctx=store.context('game',id);if(!ctx)return {ok:false};const index=store.readIndex(ctx);index.pending=null;store.writeIndex(ctx,index);return {ok:true};}

/** Apre (o mostra) la pagina del gioco: scheda interna app://game/<id>. */
function openPage(w,id){
  const game=gameOf(id);if(!game)return {ok:false,error:'Gioco non trovato.'};
  const tabs=require('./tabs.cjs'),url='app://game/'+game.id;
  const existing=tabs.tabsOf(w).find(x=>x.isHome&&x.url===url);
  if(existing)tabs.show(w,existing.id);else tabs.newHomeTab(w.workspace,{pane:w.pane,url});
  return {ok:true};
}

function setup(bus){
  const reg=(name,args,description,fn)=>bus.register(name,{args,description,run:async(ctx,a)=>{
    const w=ctx.window||windows().focusedWindow();const r=await fn(w,a);windows().emitAll();return r??{ok:true};}});
  reg('gamePageOpen',{id:'int'},'Apre la pagina del gioco: scheda, obiettivi, timer, catture, storico delle partite e board.',(w,{id})=>w?openPage(w,id):{ok:false});
  reg('gameSessionStart',{id:'int'},'Inizia una partita a mano (se il gioco non viene rilevato).',(w,{id})=>{const g=gameOf(id);return g?start(g,{manual:true}):{ok:false};});
  reg('gameSessionStop',{id:'int'},'Chiude la partita in corso: resta da salvare nello storico.',(w,{id})=>{const g=gameOf(id);return g?stop(g):{ok:false};});
  reg('gameSessionPreset',{id:'int',preset:'string'},'Sceglie il preset della partita (apre i suoi siti).',(w,{id,preset})=>setPreset(id,preset));
  reg('gameSessionFinish',{id:'int',json:'string'},'Aggiunge la partita finita allo storico della board.',(w,{id,json})=>finish(id,json));
  reg('gameSessionDrop',{id:'int'},'Non salva la partita finita.',(w,{id})=>drop(id));
  reg('gameOpenLink',{id:'int',url:'string'},'Apre un link del gioco nel suo workspace (lo vedi nel companion).',(w,{id,url})=>{const g=gameOf(id);if(!g||!/^https?:\/\//i.test(url))return {ok:false};
    require('./tabs.cjs').newTab(url,g.workspace,{activate:w?.workspace===g.workspace});return {ok:true};});
  reg('gameOpenFolder',{id:'int'},'Apre la cartella del gioco (board, catture, sessioni).',(w,{id})=>{const c=store.context('game',id);if(!c)return {ok:false};fs.mkdirSync(c.root,{recursive:true});shell.openPath(c.root);return {ok:true};});
}

module.exports={setup,start,stop,setPreset,finish,drop,openPage,scanCaptures,captureFolders};
