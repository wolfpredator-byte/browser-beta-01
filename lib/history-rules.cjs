'use strict';

/**
 * Beta 0.36 — cronologia: quante visite si tengono, ricerca e cancellazione selettiva
 * (singole voci, un sito intero, un periodo). Senza Electron, testato in test/history-rules.test.cjs.
 * Una visita è {url,title,time}; url+time la identificano.
 */
const MAX_HISTORY=5000;
const RANGES={hour:3600e3,day:86400e3,week:7*86400e3,month:30*86400e3,all:Infinity};
const RANGE_LABELS={hour:'Ultima ora',day:'Ultime 24 ore',week:'Ultimi 7 giorni',month:'Ultimi 30 giorni',all:'Tutta'};

const hostOf=url=>{try{return new URL(url).hostname.replace(/^www\./,'');}catch{return '';}};

/** Aggiunge una visita in cima. Ricaricare la stessa pagina non crea doppioni. */
function addVisit(history,{url,title='',time=Date.now()}){
  const list=Array.isArray(history)?history:[];
  if(list[0]?.url===url){list[0]={...list[0],title:title||list[0].title,time};return list.slice(0,MAX_HISTORY);}
  return [{url,title,time},...list].slice(0,MAX_HISTORY);
}

/** Cerca in titolo e indirizzo (tutte le parole). Restituisce al massimo `limit` voci. */
function search(history,query='',limit=300){
  const words=String(query).toLowerCase().split(/\s+/).filter(Boolean);
  const out=[];
  for(const h of history||[]){
    const text=((h.title||'')+' '+h.url).toLowerCase();
    if(words.every(w=>text.includes(w)))out.push(h);
    if(out.length>=limit)break;
  }
  return out;
}

/** Toglie le voci indicate ({url,time}). */
function removeItems(history,items){
  const keys=new Set((items||[]).map(i=>i.url+'\n'+i.time));
  return (history||[]).filter(h=>!keys.has(h.url+'\n'+h.time));
}
/** Toglie tutte le visite di un sito (anche i sottodomini: youtube.com toglie anche m.youtube.com). */
function removeSite(history,host){
  const target=String(host||'').replace(/^www\./,'').toLowerCase();
  if(!target)return history||[];
  return (history||[]).filter(h=>{const x=hostOf(h.url);return !(x===target||x.endsWith('.'+target));});
}
/** Toglie le visite dell'ultimo periodo (hour, day, week, month, all). */
function removeRange(history,range,now=Date.now()){
  const span=RANGES[range];
  if(!span)return history||[];
  return span===Infinity?[]:(history||[]).filter(h=>h.time<now-span);
}

/** Etichetta del giorno, per raggruppare: Oggi, Ieri, oppure la data. */
function dayLabel(time,now=Date.now()){
  const d=new Date(time),today=new Date(now);
  const start=x=>new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime();
  const diff=Math.round((start(today)-start(d))/86400e3);
  if(diff===0)return 'Oggi';
  if(diff===1)return 'Ieri';
  return d.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'});
}

module.exports={MAX_HISTORY,RANGES,RANGE_LABELS,hostOf,addVisit,search,removeItems,removeSite,removeRange,dayLabel};
