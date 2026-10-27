'use strict';

/**
 * Regole sui siti web: indirizzi, popup, permessi e user agent.
 * Non importa Electron, quindi ogni regola è verificabile con `node --test`.
 */

/**
 * Converte il testo della barra in un URL navigabile.
 * Una frase diventa una ricerca; domini, localhost e http(s) espliciti sono indirizzi.
 * @param {string} s - Testo scritto dall'utente (massimo 2048 caratteri).
 * @returns {string|null} URL completo, oppure null se il testo non è utilizzabile.
 */
function safeUrl(s){
  if(typeof s!=='string'||s.length>2048)return null;
  const q=s.trim();
  if(!q)return null;
  const isAddress=/^https?:\/\//i.test(q)||/^localhost(?::\d+)?(?:\/.*)?$/i.test(q)||
    /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i.test(q);
  if(isAddress){
    try{
      // localhost senza protocollo è quasi sempre un dev server locale: usa http.
      const prefix=/^localhost/i.test(q)?'http://':'https://';
      const url=new URL(/^https?:\/\//i.test(q)?q:prefix+q);
      if(['https:','http:'].includes(url.protocol))return url.href;
    }catch{}
  }
  return 'https://www.google.com/search?q='+encodeURIComponent(q);
}

/** true solo per indirizzi http/https: blocca file:, javascript:, app: ecc. */
function isWebUrl(raw){try{return ['https:','http:'].includes(new URL(raw).protocol);}catch{return false;}}

/**
 * Decide come aprire una richiesta window.open / target=_blank.
 *
 * - 'window': popup vero (window.open con dimensioni). Serve ai login
 *   "Accedi con Bungie/Google", che comunicano con la pagina tramite window.opener.
 *   about:blank è ammesso perché molti login aprono un popup vuoto e poi lo indirizzano.
 * - 'tab': link normale con target=_blank o Ctrl+clic: diventa una scheda.
 * - 'deny': tutto ciò che non è web.
 *
 * @param {string} url
 * @param {string} disposition - Valore fornito da Electron (new-window, foreground-tab, ...).
 */
function popupAction(url,disposition){
  if(disposition==='new-window'&&(isWebUrl(url)||url==='about:blank'))return 'window';
  return isWebUrl(url)?'tab':'deny';
}

/**
 * Permessi concessi senza chiedere. Tutto il resto resta negato finché non
 * esiste una finestra di consenso (prevista più avanti).
 * - fullscreen: video a schermo intero (YouTube, Twitch).
 * - clipboard-sanitized-write: pulsanti "Copia" dei siti (GitHub, DIM). Solo scrittura.
 */
const ALLOWED_PERMISSIONS=new Set(['fullscreen','clipboard-sanitized-write']);
function isPermissionAllowed(permission){return ALLOWED_PERMISSIONS.has(permission);}

/**
 * Rimuove "Electron/x.y" e il nome dell'app dallo user agent.
 * Alcuni siti (es. login Google) rifiutano i browser che si dichiarano Electron.
 * @param {string} ua - User agent originale della sessione.
 * @param {string} appName - Nome del pacchetto, presente nello user agent di Electron.
 */
function cleanUserAgent(ua,appName=''){
  let result=String(ua).replace(/\sElectron\/\S+/g,'');
  if(appName){
    const escaped=appName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    result=result.replace(new RegExp('\\s'+escaped+'\\/\\S+','g'),'');
  }
  return result.replace(/\s{2,}/g,' ').trim();
}

/** Sessione Chromium persistente condivisa da tutte le pagine (cookie, cache, login). */
const PARTITION='persist:local-browser';

module.exports={PARTITION,safeUrl,isWebUrl,popupAction,isPermissionAllowed,cleanUserAgent,ALLOWED_PERMISSIONS};
