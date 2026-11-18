'use strict';

/**
 * Board (Beta 0.43.3), senza Electron. Una «raccolta» per progetto o per gioco:
 * - boards.json: elenco delle board (run, stagioni, fasi), quella aperta, etichette e link rapidi in comune,
 *   e per i giochi i preset, la partita in corso e quella appena finita (da salvare nello storico);
 * - boards/<id>.json: una board = la tela (riquadri, fili, aree), attività/obiettivi, note, configurazione e storico delle partite.
 */
const P=require('./project-page-rules.cjs');

const KINDS=['project','game'];
const COLORS=5;
const str=(v,max)=>typeof v==='string'?v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').slice(0,max):'';
const color=v=>Number.isInteger(v)&&v>=0&&v<COLORS?v:0;
const num=(v,d=0)=>Number.isFinite(v)?v:d;
const boardId=id=>typeof id==='string'&&/^b\d{1,6}$/.test(id);
const ICONS=['menu_book','map','forum','smart_display','groups','leaderboard','shield','travel_explore','storefront','calculate','school','link','sports_esports','emoji_events','music_note','live_tv','terminal','bookmark','folder','bug_report'];
const PRESET_ICONS=['group','emoji_events','videocam','person','swords','sports_esports','explore','school','nightlight'];
const OPEN_IN=['pannello','scheda','companion'];

const DEFAULT_TAGS={project:[['Bug',4],['UI',1],['Codice',0],['Arte',3],['Build',2],['Altro',1]],game:[['Missione',0],['Boss',4],['Esplorazione',2],['Sblocco',3],['Altro',1]]};

function normalizeTags(raw,kind){
  const seen=new Set(),out=[];
  for(const t of Array.isArray(raw)?raw:[]){const n=str(t?.n,24).trim();if(!n||seen.has(n.toLowerCase()))continue;seen.add(n.toLowerCase());out.push({n,c:color(t.c)});if(out.length>=30)break;}
  return out.length?out:DEFAULT_TAGS[kind].map(([n,c])=>({n,c}));
}
const cleanUrl=u=>{const v=str(u,2000).trim();if(!v)return '';const full=/^https?:\/\//i.test(v)?v:'https://'+v;try{const x=new URL(full);return /^https?:$/.test(x.protocol)&&x.hostname.includes('.')?x.href:'';}catch{return '';}};
function normalizeQuick(raw){
  return (Array.isArray(raw)?raw:[]).map(l=>({i:ICONS.includes(l?.i)?l.i:'link',n:str(l?.n,28).trim(),u:cleanUrl(l?.u),w:OPEN_IN.includes(l?.w)?l.w:'scheda',dock:l?.dock===true,sug:l?.sug===true}))
    .filter(l=>l.n&&l.u).slice(0,40);
}
function normalizePresets(raw,quickNames,timers){
  const out={};let k=1;
  for(const [id,p] of Object.entries(raw&&typeof raw==='object'?raw:{})){
    if(!/^[a-z][a-z0-9]{0,15}$/i.test(id)||!p)continue;
    out[id]={n:str(p.n,24).trim()||'Preset',i:PRESET_ICONS.includes(p.i)?p.i:'sports_esports',k:String(k++),
      open:(Array.isArray(p.open)?p.open:[]).filter(n=>quickNames.includes(n)).slice(0,10),
      companion:p.companion===true,timer:Number.isInteger(p.timer)&&p.timer>=0&&p.timer<timers?p.timer:null,notes:p.notes!==false,clips:p.clips===true};
    if(k>9)break;
  }
  return out;
}
function defaultPresets(quick){
  const names=quick.map(l=>l.n),pick=re=>names.filter(n=>re.test(n));
  return {amici:{n:'Con amici',i:'group',open:pick(/discord/i),companion:true,timer:0,notes:true},
    compet:{n:'Competitivo',i:'emoji_events',open:pick(/stat|tracker|build/i),companion:true,timer:0,notes:true},
    stream:{n:'Streaming',i:'videocam',open:pick(/discord|twitch/i),companion:true,timer:1,notes:false,clips:true},
    solo:{n:'Da solo',i:'person',open:pick(/wiki|mappa|map|guida/i),companion:false,timer:null,notes:true}};
}
/** Link suggeriti per qualsiasi gioco (ricerche, così funzionano con ogni titolo) più i siti collegati al gioco. */
function suggestedGameLinks(name,sites=[]){
  const q=encodeURIComponent(name);
  const own=sites.map(u=>{let h='';try{h=new URL(u).hostname.replace(/^www\./,'');}catch{}return {i:/discord/.test(h)?'forum':'link',n:h.split('.')[0].replace(/^\w/,c=>c.toUpperCase())||'Sito',u,w:'pannello',dock:true,sug:false};});
  return normalizeQuick([...own,
    {i:'menu_book',n:'Wiki',u:`https://www.google.com/search?q=${q}+wiki`,w:'scheda',dock:!own.length,sug:true},
    {i:'smart_display',n:'YouTube',u:`https://www.youtube.com/results?search_query=${q}+guida`,w:'scheda',sug:true},
    {i:'groups',n:'Reddit',u:`https://www.reddit.com/search/?q=${q}`,w:'scheda',sug:true},
    {i:'forum',n:'Discord',u:'https://discord.com/app',w:'pannello',sug:true}]);
}

/** boards.json: controllato a ogni lettura e scrittura. */
function normalizeIndex(raw,kind,{quickDefault=[]}={}){
  const r=raw&&typeof raw==='object'?raw:{};
  const boards={};
  for(const [id,b] of Object.entries(r.boards&&typeof r.boards==='object'?r.boards:{})){
    if(!boardId(id))continue;
    boards[id]={name:str(b?.name,40).trim()||'Board',created:num(b?.created,Date.now()),archived:b?.archived===true,last:num(b?.last,0)};
    if(Object.keys(boards).length>=60)break;
  }
  if(!Object.keys(boards).length)boards.b1={name:kind==='game'?'Board 1':'Principale',created:Date.now(),archived:false,last:0};
  const current=boards[r.current]?r.current:Object.keys(boards)[0];
  const quick=r.quick===undefined?normalizeQuick(quickDefault):normalizeQuick(r.quick);
  const out={version:1,kind,current,boards,tags:normalizeTags(r.tags,kind),quick};
  if(kind==='game'){
    out.presets=normalizePresets(r.presets&&Object.keys(r.presets).length?r.presets:defaultPresets(quick),quick.map(l=>l.n),2);
    out.lastPreset=out.presets[r.lastPreset]?r.lastPreset:Object.keys(out.presets)[0]||null;
    out.session=r.session&&Number.isFinite(r.session.start)?{start:r.session.start,preset:out.presets[r.session.preset]?r.session.preset:out.lastPreset,board:boards[r.session.board]?r.session.board:current,manual:r.session.manual===true}:null;
    out.pending=r.pending&&Number.isFinite(r.pending.start)&&Number.isFinite(r.pending.end)?{start:r.pending.start,end:r.pending.end,preset:out.presets[r.pending.preset]?r.pending.preset:out.lastPreset,
      board:boards[r.pending.board]?r.pending.board:current,caps:(Array.isArray(r.pending.caps)?r.pending.caps:[]).filter(c=>c&&typeof c.path==='string').slice(0,60).map(c=>({path:c.path,name:str(c.name,120),mtime:num(c.mtime),clip:c.clip===true}))}:null;
  }
  return out;
}

function normalizeSession(s){
  if(!s||!Number.isFinite(s.start)||!Number.isFinite(s.dur))return null;
  return {id:str(s.id,24)||'s'+s.start,start:s.start,dur:Math.max(0,s.dur),p:str(s.p,16),caps:(Array.isArray(s.caps)?s.caps:[]).map(c=>P.safeShotName(c)||(/\.(mp4|mkv|webm)$/i.test(String(c))?str(String(c).split(/[\\/]/).pop(),120):'')).filter(Boolean).slice(0,100),
    note:str(s.note,4000),done:(Array.isArray(s.done)?s.done:[]).map(t=>str(t,300)).filter(Boolean).slice(0,100)};
}
/** boards/<id>.json: la pagina (riquadri, fili, aree, attività) più note, configurazione e storico. */
function normalizeBoard(raw,kind){
  const r=raw&&typeof raw==='object'?raw:{};
  const page=P.normalizePage(r);
  return {...page,notes:str(r.notes,P.LIMITS.text),
    build:(Array.isArray(r.build)?r.build:[]).map(x=>({k:str(x?.k,40),v:str(x?.v,200)})).slice(0,40),
    sessions:(Array.isArray(r.sessions)?r.sessions:[]).map(normalizeSession).filter(Boolean).slice(0,2000)};
}
/** Disposizione della prima volta: per i giochi scheda, obiettivi, due timer, note, catture, configurazione, storico e link. */
function defaultBoard(kind,{build=[]}={}){
  if(kind==='project')return normalizeBoard(P.defaultPage(),kind);
  return normalizeBoard({n:3,
    tiles:{hero:{x:96,y:144,w:768,h:576},tasks:{x:960,y:144,w:336,h:408},'timer-1':{x:960,y:600,w:336,h:192,timer:{label:'Pausa',mode:'down',secs:600}},
      'timer-2':{x:960,y:840,w:336,h:192,timer:{label:'Reset settimanale',mode:'until',day:2,hour:18}},notes:{x:96,y:792,w:384,h:312},shots:{x:528,y:792,w:384,h:360},
      files:{x:1392,y:144,w:384,h:384},stream:{x:1392,y:576,w:384,h:360},res:{x:1872,y:144,w:336,h:408}},
    areas:{'area-1':{x:48,y:96,w:1296,h:1104,t:'Partita',c:0}},
    links:[{a:'hero',b:'stream',t:'storico',c:0},{a:'tasks',b:'timer-1',t:'',c:4},{a:'files',b:'res',t:'',c:1}],
    build:build.map(k=>({k,v:''}))},kind);
}
/** Nuova board: vuota, con la disposizione di un'altra (contenuti vuoti) o copia completa (storico da zero). */
function newBoard(kind,from,source){
  if(from==='copy'&&source)return normalizeBoard({...source,sessions:[]},kind);
  if(from==='layout'&&source)return normalizeBoard({n:source.n,tiles:Object.fromEntries(Object.entries(source.tiles).map(([id,t])=>[id,{...t,...(t.text!==undefined?{text:''}:{})}])),
    links:source.links,areas:source.areas,view:source.view,build:source.build.map(b=>({k:b.k,v:''}))},kind);
  return defaultBoard(kind,{build:(source?.build||[]).map(b=>b.k)});
}
const nextBoardId=index=>{let i=Object.keys(index.boards).length+1;while(index.boards['b'+i])i++;return 'b'+i;};

/** Riepilogo leggibile di una partita (sessioni/<data>.md), da aprire anche fuori da VARCO. */
function sessionMarkdown({game,board,preset,session}){
  const d=new Date(session.start),pad=n=>String(n).padStart(2,'0'),m=Math.round(session.dur/60000);
  return [`## ${pad(d.getHours())}:${pad(d.getMinutes())} · ${game} · ${preset||'Partita'}`,'',`- Board: ${board}`,`- Durata: ${Math.floor(m/60)} h ${pad(m%60)} min`,
    ...(session.caps.length?[`- Catture: ${session.caps.join(', ')}`]:[]),...(session.done.length?['- Obiettivi fatti:',...session.done.map(t=>`  - ${t}`)]:[]),
    ...(session.note?['',session.note]:[]),'',''].join('\n');
}

/** File di cattura (screenshot e clip) nuovi rispetto all'inizio della partita, i più recenti prima. */
function newCaptures(files,since,limit=30){
  return files.filter(f=>f.mtime>=since-60000&&/\.(png|jpe?g|webp|gif|mp4|mkv|webm)$/i.test(f.name)).sort((a,b)=>b.mtime-a.mtime).slice(0,limit)
    .map(f=>({...f,clip:/\.(mp4|mkv|webm)$/i.test(f.name)}));
}
/** Cartella di un gioco senza cartella collegata: Documenti\VARCO\Giochi\<nome>. */
const safeFolderName=name=>String(name||'Gioco').replace(/[<>:"/\\|?*\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().replace(/[. ]+$/,'').slice(0,60)||'Gioco';

module.exports={KINDS,ICONS,PRESET_ICONS,OPEN_IN,normalizeIndex,normalizeBoard,normalizeSession,normalizeQuick,normalizeTags,defaultBoard,newBoard,nextBoardId,
  suggestedGameLinks,defaultPresets,sessionMarkdown,newCaptures,safeFolderName,cleanUrl,boardId};
