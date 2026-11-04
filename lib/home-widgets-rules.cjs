'use strict';

/**
 * Beta 0.36 — widget della Home: cosa c'è, in che ordine e con quali impostazioni, più le animazioni.
 * Senza Electron, testato in test/home-widgets-rules.test.cjs.
 * data.homeWidgets = [{id,type,...}], data.homeMotion = {enter,background,hover}.
 */
const WIDGET_TYPES={clock:'Orologio e data',weather:'Meteo',notes:'Note veloci',sites:'Preferiti e più visitati',recent:'Schede recenti',webframe:'Pagina web'};
/**
 * Beta 0.36: anche i riquadri di sempre della Home sono widget (si spostano e si tolgono come gli altri).
 * Ce n'è al massimo uno per tipo; la chiave è la stessa di HOME_CARDS in appearance-rules.cjs.
 */
const BUILTIN={links:'Link rapidi',projects:'Progetti',quick:'Accesso rapido',jarvis:'JARVIS',workspace:'Workspace attivo'};
const ALL_TYPES={...BUILTIN,...WIDGET_TYPES};
const MAX_WIDGETS=16;
/** Widget web: larghezza in colonne della griglia (1–3) e altezza in pixel, scelte trascinando l'angolo. */
const WEB_COLS=[1,3],WEB_HEIGHT=[160,1000];
const MOTION={enter:'Entrata morbida dei riquadri',background:'Sfondo animato',hover:'Effetto al passaggio del mouse'};
const WEB_HEIGHTS={small:260,medium:380,large:520};

const isWeb=url=>typeof url==='string'&&/^https?:\/\//i.test(url)&&url.length<=2000;
const newId=()=>Math.random().toString(36).slice(2,10);

/** Campi ammessi di ogni tipo, ripuliti. */
function cleanFields(type,w){
  if(type==='weather')return {city:String(w.city||'').slice(0,80),lat:Number.isFinite(w.lat)?w.lat:null,lon:Number.isFinite(w.lon)?w.lon:null,place:String(w.place||'').slice(0,120)};
  if(type==='notes')return {text:String(w.text||'').slice(0,4000)};
  if(type==='webframe'){
    const fromSize=WEB_HEIGHTS[w.size]; // 0.36 prima versione: altezza scelta da un menu
    const height=Number.isFinite(w.height)?w.height:fromSize||WEB_HEIGHTS.medium;
    const cols=Number.isFinite(w.cols)?w.cols:3;
    return {url:isWeb(w.url)?w.url:'',cols:Math.round(Math.min(WEB_COLS[1],Math.max(WEB_COLS[0],cols))),
      height:Math.round(Math.min(WEB_HEIGHT[1],Math.max(WEB_HEIGHT[0],height)))};
  }
  if(type==='clock')return {seconds:w.seconds===true};
  return {};
}
function normalizeWidgets(raw){
  const seen=new Set(),builtins=new Set();
  return (Array.isArray(raw)?raw:[]).filter(w=>{
    if(!w||!Object.hasOwn(ALL_TYPES,w.type))return false;
    if(!Object.hasOwn(BUILTIN,w.type))return true;
    if(builtins.has(w.type))return false; // uno solo per tipo
    builtins.add(w.type);return true;
  }).slice(0,MAX_WIDGETS).map(w=>{
    let id=typeof w.id==='string'&&/^[a-z0-9]{4,16}$/.test(w.id)?w.id:newId();
    while(seen.has(id))id=newId();
    seen.add(id);
    return {id,type:w.type,...cleanFields(w.type,w)};
  });
}
function addWidget(list,type){
  if(!Object.hasOwn(ALL_TYPES,type))return {ok:false,error:'Widget sconosciuto.'};
  if(Object.hasOwn(BUILTIN,type)&&list.some(w=>w.type===type))return {ok:false,error:'È già nella Home.'};
  if(list.length>=MAX_WIDGETS)return {ok:false,error:`Al massimo ${MAX_WIDGETS} widget.`};
  const widget=normalizeWidgets([{type}])[0];
  return {ok:true,list:[...list,widget],widget};
}
function removeWidget(list,id){return list.filter(w=>w.id!==id);}
/** Sposta di un posto (dir -1 = prima, +1 = dopo). */
function moveWidget(list,id,dir){
  const i=list.findIndex(w=>w.id===id),j=i+(dir<0?-1:1);
  if(i<0||j<0||j>=list.length)return list;
  const out=[...list];[out[i],out[j]]=[out[j],out[i]];
  return out;
}
function updateWidget(list,id,changes){
  return list.map(w=>w.id===id?{id,type:w.type,...cleanFields(w.type,{...w,...changes})}:w);
}
/**
 * Prima volta con la 0.36 (homeLayout assente): i riquadri di sempre entrano nell'elenco, dopo i widget,
 * tranne quelli che avevi nascosto dalle Impostazioni (appearance.home[tipo]===false).
 */
function migrateLayout(widgets,home){
  const list=normalizeWidgets(widgets);
  const missing=Object.keys(BUILTIN).filter(k=>home?.[k]!==false&&!list.some(w=>w.type===k));
  return normalizeWidgets([...list,...missing.map(type=>({type}))]);
}
function normalizeMotion(raw){
  const m=raw&&typeof raw==='object'?raw:{};
  return Object.fromEntries(Object.keys(MOTION).map(k=>[k,m[k]!==false]));
}

/**
 * Beta 0.36: siti che per suonare chiedono Widevine (DRM), che VARCO (Electron) non ha.
 * Restituisce il nome del servizio, oppure '' se il sito non ne ha bisogno.
 */
const DRM_SITES=[['spotify.com','Spotify'],['netflix.com','Netflix'],['primevideo.com','Prime Video'],['disneyplus.com','Disney+'],
  ['music.apple.com','Apple Music'],['tv.apple.com','Apple TV+'],['music.amazon.','Amazon Music'],['tidal.com','Tidal'],['deezer.com','Deezer']];
function drmService(url){
  let host='';try{host=new URL(url).hostname.toLowerCase();}catch{return '';}
  const hit=DRM_SITES.find(([d])=>d.endsWith('.')?host.startsWith(d)||host.includes('.'+d):host===d||host.endsWith('.'+d));
  return hit?hit[1]:'';
}

/** Siti più visitati: contati per indirizzo d'origine nella cronologia. */
function topSites(history,limit=8){
  const counts=new Map();
  for(const h of history||[]){
    let origin;try{const u=new URL(h.url);if(!/^https?:$/.test(u.protocol))continue;origin=u.origin;}catch{continue;}
    const c=counts.get(origin)||{url:origin+'/',title:origin.replace(/^https?:\/\/(www\.)?/,''),count:0};
    c.count++;counts.set(origin,c);
  }
  return [...counts.values()].sort((a,b)=>b.count-a.count).slice(0,limit);
}

/** Codici meteo WMO (Open-Meteo) → testo e simbolo. */
function weatherText(code){
  const c=Number(code);
  if(c===0)return ['Sereno','☀️'];
  if(c<=2)return ['Poco nuvoloso','🌤️'];
  if(c===3)return ['Nuvoloso','☁️'];
  if(c===45||c===48)return ['Nebbia','🌫️'];
  if(c>=51&&c<=57)return ['Pioviggine','🌦️'];
  if(c>=61&&c<=67||c>=80&&c<=82)return ['Pioggia','🌧️'];
  if(c>=71&&c<=77||c===85||c===86)return ['Neve','🌨️'];
  if(c>=95)return ['Temporale','⛈️'];
  return ['—','🌡️'];
}

module.exports={drmService,WIDGET_TYPES,BUILTIN,ALL_TYPES,WEB_COLS,WEB_HEIGHT,migrateLayout,MAX_WIDGETS,MOTION,WEB_HEIGHTS,normalizeWidgets,addWidget,removeWidget,moveWidget,updateWidget,normalizeMotion,topSites,weatherText};
