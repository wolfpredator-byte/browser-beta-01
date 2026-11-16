'use strict';

/**
 * Beta 0.37.1 — regole del lettore multimediale (senza Electron, con test).
 *
 * Ogni pagina, pannello web o widget che riproduce audio o video manda il suo stato
 * (page-preload.cjs → 'media:state'). Qui lo stato viene ripulito, ordinato e trasformato
 * nei controlli da mostrare: dipendono da cosa il sito sa fare (Media Session: brano successivo,
 * precedente, salta pubblicità…) e da cosa ha il suo elemento audio/video (avanti/indietro, muto, finestrella).
 */
/** Azioni della Media Session che il lettore sa usare. */
const SESSION_ACTIONS=['play','pause','stop','previoustrack','nexttrack','seekbackward','seekforward','seekto','skipad'];
/** Comandi che la cornice può chiedere. */
const COMMANDS=['toggle','play','pause','stop','previoustrack','nexttrack','skipad','seekby','seekto','mute','pip'];
const MAX_ENTRIES=8;

const text=(v,max)=>typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,max):'';
const num=(v,max=1e7)=>Number.isFinite(v)&&v>=0?Math.min(v,max):0;

/** Lo stato mandato da una pagina (JSON), ripulito. null se non è valido. */
function normalizeReport(raw){
  let r=raw;
  if(typeof raw==='string'){if(raw.length>20000)return null;try{r=JSON.parse(raw);}catch{return null;}}
  if(!r||typeof r!=='object')return null;
  const artwork=text(r.artwork,2000);
  return {
    has:r.has===true,
    playing:r.playing===true,
    title:text(r.title,300),artist:text(r.artist,200),album:text(r.album,200),
    artwork:/^https?:\/\//i.test(artwork)?artwork:'',
    duration:num(r.duration),position:num(r.position),
    rate:Number.isFinite(r.rate)&&r.rate>0&&r.rate<=16?r.rate:1,
    muted:r.muted===true,video:r.video===true,pip:r.pip===true,live:r.live===true,
    actions:Array.isArray(r.actions)?[...new Set(r.actions.filter(a=>SESSION_ACTIONS.includes(a)))]:[]
  };
}

/**
 * I pulsanti del lettore per una voce. "element": la pagina ha un elemento audio/video da comandare
 * direttamente (durata nota). Senza, contano solo le azioni dichiarate dal sito.
 */
function controlsFor(entry){
  const a=new Set(entry.actions||[]);
  const element=entry.duration>0||entry.live===true;
  const seekable=entry.live!==true&&entry.duration>0;
  return {
    playPause:element||a.has('play')||a.has('pause'),
    previous:a.has('previoustrack'),
    next:a.has('nexttrack'),
    seekBack:seekable||a.has('seekbackward'),
    seekForward:seekable||a.has('seekforward'),
    seek:seekable||(a.has('seekto')&&entry.duration>0),
    skipAd:a.has('skipad'),
    mute:element,
    pip:entry.video===true
  };
}

/** Ordine: prima ciò che suona, poi l'ultimo aggiornato; al massimo MAX_ENTRIES. */
function sortEntries(list){
  return [...list].sort((a,b)=>(b.playing-a.playing)||((b.updatedAt||0)-(a.updatedAt||0))).slice(0,MAX_ENTRIES);
}

/** Posizione attuale stimata: quella riferita più il tempo passato (se suona), entro la durata. */
function positionAt(entry,now){
  let p=entry.position||0;
  if(entry.playing&&!entry.live)p+=Math.max(0,(now-(Number.isFinite(entry.at)?entry.at:now))/1000)*(entry.rate||1);
  return entry.duration>0?Math.min(p,entry.duration):p;
}

/** 75 → "1:15", 3725 → "1:02:05". */
function formatTime(seconds){
  const s=Math.max(0,Math.floor(seconds||0));
  const h=Math.floor(s/3600),m=Math.floor(s%3600/60),r=String(s%60).padStart(2,'0');
  return h?`${h}:${String(m).padStart(2,'0')}:${r}`:`${m}:${r}`;
}

/** Il titolo da mostrare: quello del brano, altrimenti quello della pagina. */
function displayTitle(entry){return entry.title||entry.pageTitle||entry.site||'Audio';}
/** La seconda riga: artista (e album), altrimenti il sito. */
function displaySubtitle(entry){
  const who=[entry.artist,entry.album].filter(Boolean).join(' · ');
  return who||entry.site||'';
}

const isCommand=c=>COMMANDS.includes(c);

module.exports={SESSION_ACTIONS,COMMANDS,MAX_ENTRIES,normalizeReport,controlsFor,sortEntries,positionAt,formatTime,displayTitle,displaySubtitle,isCommand};
