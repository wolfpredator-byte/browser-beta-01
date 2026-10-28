'use strict';

/**
 * Permessi dei siti (Beta 0.10), senza Electron.
 *
 * Tre gruppi:
 * - sempre concessi: innocui e attesi (schermo intero, pulsanti "Copia", blocco del
 *   puntatore dei giochi nel browser — Esc lo libera);
 * - da chiedere: fotocamera, microfono, notifiche, posizione, lettura degli appunti.
 *   La risposta può essere ricordata per sito;
 * - tutto il resto è negato (USB, seriale, MIDI, condivisione schermo…).
 */

const ALWAYS_ALLOWED=new Set(['fullscreen','clipboard-sanitized-write','pointerLock']);
const ASKABLE={camera:'fotocamera',microphone:'microfono',notifications:'notifiche',
  geolocation:'posizione','clipboard-read':'lettura degli appunti'};
const DECISIONS=['allow','deny'];

/** Origine di un indirizzo web (https://light.gg), o null se non è http(s). */
function originOf(url){
  try{const u=new URL(url);return ['http:','https:'].includes(u.protocol)?u.origin:null;}catch{return null;}
}

/**
 * Traduce una richiesta di Electron nei permessi da chiedere.
 * "media" contiene fotocamera e/o microfono: li trattiamo separatamente.
 * @returns {string[]|null} null = da negare sempre; [] = da concedere sempre.
 */
function requestKinds(permission,details={}){
  if(ALWAYS_ALLOWED.has(permission))return [];
  if(permission==='media'){
    const types=details.mediaTypes||[];
    const kinds=[...(types.includes('video')?['camera']:[]),...(types.includes('audio')?['microphone']:[])];
    return kinds.length?kinds:null;
  }
  return ASKABLE[permission]?[permission]:null;
}

/**
 * Lo stesso per le verifiche silenziose (permissions.query, Notification.permission):
 * qui Electron indica un solo tipo di media alla volta.
 */
function checkKind(permission,details={}){
  if(permission==='media')return details.mediaType==='video'?'camera':details.mediaType==='audio'?'microphone':null;
  return ASKABLE[permission]?permission:null;
}

/**
 * Decisione per un gruppo di permessi già salvati per l'origine.
 * @param {Record<string,'allow'|'deny'>|undefined} stored
 * @returns {'allow'|'deny'|'ask'}
 */
function decide(stored,kinds){
  if(!kinds)return 'deny';
  if(!kinds.length)return 'allow';
  const values=kinds.map(kind=>stored?.[kind]);
  if(values.includes('deny'))return 'deny';
  return values.every(v=>v==='allow')?'allow':'ask';
}

/** "light.gg vuole usare fotocamera e microfono" */
function describeRequest(origin,kinds){
  const host=new URL(origin).host;
  const labels=kinds.map(kind=>ASKABLE[kind]);
  const list=labels.length>1?labels.slice(0,-1).join(', ')+' e '+labels.at(-1):labels[0];
  const verb=kinds.includes('notifications')&&kinds.length===1?'vuole inviarti':'vuole usare';
  return `${host} ${verb} ${list}`;
}

/** Ripulisce i permessi salvati: solo origini web, tipi noti, valori allow/deny. */
function normalizeSitePermissions(raw){
  const result={};
  if(!raw||typeof raw!=='object')return result;
  for(const [origin,kinds] of Object.entries(raw)){
    if(originOf(origin)!==origin||!kinds||typeof kinds!=='object')continue;
    const clean={};
    for(const [kind,value] of Object.entries(kinds))if(ASKABLE[kind]&&DECISIONS.includes(value))clean[kind]=value;
    if(Object.keys(clean).length)result[origin]=clean;
  }
  return result;
}

module.exports={ALWAYS_ALLOWED,ASKABLE,originOf,requestKinds,checkKind,decide,describeRequest,normalizeSitePermissions};
