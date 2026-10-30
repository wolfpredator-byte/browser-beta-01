'use strict';

/**
 * Strumenti per tante schede (Beta 0.24), senza Electron: sito di una scheda, schede doppie,
 * raggruppamento per sito. Verificabili con node --test.
 */

/** Sito di un indirizzo: host senza "www.", '' per Home, file e indirizzi non validi. */
function siteOf(url){
  try{
    const u=new URL(url);
    if(!/^https?:$/.test(u.protocol))return '';
    return u.hostname.replace(/^www\./,'').toLowerCase();
  }catch{return '';}
}

/** Nome breve per lo stack di un sito: "github.com" → "Github", "docs.google.com" → "Google Docs". */
function siteLabel(site){
  if(!site)return '';
  if(/^\d+\.\d+\.\d+\.\d+$|^localhost$|^\[/.test(site))return site;
  const parts=site.split('.');
  // Domini come "bbc.co.uk": il nome è prima del suffisso a due parti.
  const twoPart=parts.length>2&&/^(co|com|org|net|gov|ac|edu)$/.test(parts[parts.length-2]);
  const main=parts[parts.length-(twoPart?3:2)]||parts[0];
  const sub=parts.length>(twoPart?3:2)?parts[0]:'';
  const cap=text=>text.charAt(0).toUpperCase()+text.slice(1);
  return (cap(main)+(sub&&!/^(m|app|web|en|it|www\d*)$/.test(sub)?' '+cap(sub):'')).slice(0,35);
}

/** Stessa pagina? Ignoriamo il frammento (#…) e la barra finale. */
const pageKey=url=>{
  try{const u=new URL(url);u.hash='';return u.href.replace(/\/$/,'');}catch{return url||'';}
};

/**
 * Schede doppie da chiudere: per ogni pagina aperta più volte nello stesso workspace resta
 * quella attiva (o fissata, o la prima), le altre si chiudono. Home e Impostazioni non contano.
 * @param {{id:number,url:string,workspace:string,isHome?:boolean,pinned?:boolean}[]} tabs
 * @param {Set<number>|number[]} keep - Schede da tenere comunque (es. quelle attive).
 * @returns {number[]}
 */
function duplicateIds(tabs,keep=[]){
  const keepSet=new Set(keep);
  const byPage=new Map();
  for(const t of tabs){
    if(t.isHome||!siteOf(t.url))continue;
    const key=t.workspace+'\n'+pageKey(t.url);
    if(!byPage.has(key))byPage.set(key,[]);
    byPage.get(key).push(t);
  }
  const close=[];
  for(const list of byPage.values()){
    if(list.length<2)continue;
    const kept=list.find(t=>keepSet.has(t.id))||list.find(t=>t.pinned)||list[0];
    for(const t of list)if(t!==kept&&!t.pinned)close.push(t.id);
  }
  return close;
}

/**
 * Stack da creare raggruppando per sito: le schede senza stack (e non fissate) di uno
 * stesso sito, quando sono almeno `min`. Le schede già in uno stack restano dove sono.
 * @returns {{group:string,ids:number[]}[]}
 */
function siteGroups(tabs,{min=2}={}){
  const bySite=new Map();
  for(const t of tabs){
    if(t.isHome||t.pinned||t.group)continue;
    const site=siteOf(t.url);
    if(!site)continue;
    if(!bySite.has(site))bySite.set(site,[]);
    bySite.get(site).push(t.id);
  }
  // Se esiste già uno stack con quel nome, le schede ci vanno dentro (stesso nome, stesso stack).
  // Due siti con lo stesso nome breve (example.com, example.org) usano il nome completo.
  const chosen=[...bySite].filter(([,ids])=>ids.length>=min);
  const labels=chosen.map(([site])=>siteLabel(site));
  return chosen.map(([site,ids],i)=>({group:labels.filter(l=>l===labels[i]).length>1?site.slice(0,35):labels[i],ids}));
}

/** Elenco per il gestore: schede raggruppate per sito, i siti con più schede prima. */
function bySite(tabs){
  const map=new Map();
  for(const t of tabs){
    const site=t.isHome?'':siteOf(t.url)||'altro';
    if(!map.has(site))map.set(site,[]);
    map.get(site).push(t);
  }
  return [...map.entries()].map(([site,list])=>({site,label:site?site:'VARCO',tabs:list}))
    .sort((a,b)=>b.tabs.length-a.tabs.length||a.site.localeCompare(b.site));
}

module.exports={siteOf,siteLabel,pageKey,duplicateIds,siteGroups,bySite};
