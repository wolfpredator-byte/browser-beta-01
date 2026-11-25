'use strict';

/**
 * Link che aprono un'app del PC (Beta 0.46.2), senza Electron.
 *
 * Dopo un accesso (Steam, Epic, Discord…) molti siti rimandano al launcher del gioco con un link
 * «nomegioco://login?token=…». Prima VARCO li bloccava tutti: il login finiva nel browser e il launcher
 * non riceveva niente. Ora, come Chrome, chiede «Aprire l'app?» (con «consenti sempre per questo sito»).
 * Alcuni tipi di link non si aprono mai: sono quelli usati per far partire programmi o file pericolosi.
 */

/** Indirizzi che restano nel browser (non sono app esterne). */
const INTERNAL=['http','https','file','about','data','blob','javascript','chrome','chrome-extension','chrome-untrusted','devtools',
  'view-source','ws','wss','ftp','crx','varco-view','app','varco-icon','filesystem','edge','brave','opera','vivaldi'];
/** Mai aperti, nemmeno se lo chiedi: avviano programmi, script o file in modo pericoloso. */
const BLOCKED=['javascript','vbscript','file','data','blob','ms-msdt','search-ms','search','ms-officecmd','ms-appinstaller',
  'mk','ms-its','its','hcp','res','shell','ms-cxh','ms-cxh-full','ms-word','ms-excel','ms-powerpoint','ms-visio','ms-access',
  'ms-project','ms-publisher','ms-spd','ms-infopath','ms-excel','ms-officeapp','jar','vscode','vscode-insiders'];

/** Tipo di link in minuscolo («steam» per steam://…), oppure ''. */
function schemeOf(url){
  const m=/^([a-z][a-z0-9+.-]{0,40}):/i.exec(String(url||''));
  return m?m[1].toLowerCase():'';
}
const isExternal=url=>{const s=schemeOf(url);return !!s&&!INTERNAL.includes(s);};
const isBlocked=url=>BLOCKED.includes(schemeOf(url));

/** Scelte salvate: {origine: [tipi]} — «consenti sempre a questo sito di aprire i link steam:». */
function normalizeAllowed(raw){
  const out={};
  for(const [origin,list] of Object.entries(raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{}).slice(0,300)){
    if(!/^https?:\/\/[^/\s]+$/i.test(origin)||!Array.isArray(list))continue;
    const kept=[...new Set(list.filter(s=>typeof s==='string'&&/^[a-z][a-z0-9+.-]{0,40}$/.test(s)&&!BLOCKED.includes(s)&&!INTERNAL.includes(s)))].slice(0,30);
    if(kept.length)out[origin]=kept;
  }
  return out;
}
const isAllowed=(allowed,origin,scheme)=>!!origin&&(allowed?.[origin]||[]).includes(scheme);
function allow(allowed,origin,scheme){
  if(!origin||!scheme||BLOCKED.includes(scheme))return allowed;
  return normalizeAllowed({...allowed,[origin]:[...(allowed?.[origin]||[]),scheme]});
}
/** Indirizzo da mostrare nella domanda: corto, senza token lunghi. */
const shortUrl=url=>{const s=String(url||'');return s.length>90?s.slice(0,87)+'…':s;};

module.exports={INTERNAL,BLOCKED,schemeOf,isExternal,isBlocked,normalizeAllowed,isAllowed,allow,shortUrl};
