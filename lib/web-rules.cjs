'use strict';

/**
 * Regole sui siti web: indirizzi, popup, permessi e user agent.
 * Non importa Electron, quindi ogni regola è verificabile con `node --test`.
 */

/**
 * Converte il testo della barra in un URL navigabile.
 * Una frase diventa una ricerca; domini, localhost e http(s) espliciti sono indirizzi.
 * @param {string} s - Testo scritto dall'utente (massimo 2048 caratteri).
 * @param {string} [engine] - Chiave di SEARCH_ENGINES per le frasi.
 * @returns {string|null} URL completo, oppure null se il testo non è utilizzabile.
 */
/**
 * Beta 0.11: motori di ricerca tra cui scegliere nelle Impostazioni.
 * %s viene sostituito dal testo cercato.
 */
const SEARCH_ENGINES={
  google:{label:'Google',url:'https://www.google.com/search?q=%s'},
  duckduckgo:{label:'DuckDuckGo',url:'https://duckduckgo.com/?q=%s'},
  bing:{label:'Bing',url:'https://www.bing.com/search?q=%s'},
  brave:{label:'Brave Search',url:'https://search.brave.com/search?q=%s'},
  startpage:{label:'Startpage',url:'https://www.startpage.com/do/search?q=%s'},
  ecosia:{label:'Ecosia',url:'https://www.ecosia.org/search?q=%s'}
};
/** Indirizzo di ricerca per un testo; un motore sconosciuto diventa Google. */
const searchUrl=(q,engine)=>(SEARCH_ENGINES[engine]||SEARCH_ENGINES.google).url.replace('%s',encodeURIComponent(q));

function safeUrl(s,engine='google'){
  if(typeof s!=='string'||s.length>2048)return null;
  const q=s.trim();
  if(!q)return null;
  if(looksLikeAddress(q)){
    try{
      // localhost senza protocollo è quasi sempre un dev server locale: usa http.
      const prefix=/^localhost/i.test(q)?'http://':'https://';
      const url=new URL(/^https?:\/\//i.test(q)?q:prefix+q);
      if(['https:','http:'].includes(url.protocol))return url.href;
    }catch{}
  }
  return searchUrl(q,engine);
}

/**
 * true se il testo è un indirizzo (http(s), localhost o dominio), false se è una frase.
 * @param {string} s
 */
function looksLikeAddress(s){
  const q=typeof s==='string'?s.trim():'';
  return /^https?:\/\//i.test(q)||/^localhost(?::\d+)?(?:\/.*)?$/i.test(q)||
    /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i.test(q);
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

/**
 * Google rifiuta il login ("questo browser potrebbe non essere sicuro") dai
 * browser basati su Electron, anche con lo user agent di Chrome: li riconosce da
 * altri segnali. Firefox invece è accettato e non ha quei segnali. Per questo,
 * SOLO sulle pagine di accesso di Google, ci presentiamo come Firefox.
 */
const FIREFOX_UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0';
const GOOGLE_LOGIN_HOSTS=['accounts.google.com'];
const isGoogleLogin=url=>{try{return GOOGLE_LOGIN_HOSTS.includes(new URL(url).hostname);}catch{return false;}};
/** Identità da usare per una pagina: Firefox sul login Google, altrimenti quella normale. */
const userAgentFor=(url,normal)=>isGoogleLogin(url)?FIREFOX_UA:normal;
/** Firefox non invia le intestazioni Sec-CH-UA: le togliamo, o tradirebbero Chromium. */
function firefoxHeaders(headers){
  const result={};
  for(const [name,value] of Object.entries(headers))if(!/^sec-ch-ua/i.test(name))result[name]=value;
  result['User-Agent']=FIREFOX_UA;
  return result;
}

/** Sessione Chromium persistente condivisa da tutte le pagine (cookie, cache, login). */
const PARTITION='persist:local-browser';

/**
 * Beta 0.11.1: spiega un errore di caricamento con parole semplici.
 * Il risultato diventa la pagina di errore disegnata dalla cornice al posto del sito.
 * @param {number} code - Codice di rete di Chromium (es. -102).
 * @param {string} description - Nome dell'errore (es. ERR_CONNECTION_REFUSED).
 * @param {string} url - Indirizzo che non si è aperto.
 * @returns {{title:string,detail:string,url:string,code:number,description:string,local:boolean,altUrl:string|null,altLabel:string|null}}
 */
function describeLoadError(code,description,url){
  let host='',https=false;
  try{const u=new URL(url);host=u.host;https=u.protocol==='https:';}catch{}
  const local=/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);
  const name=host||url;
  let title=`Non riesco ad aprire ${name}`,detail='La pagina non si è caricata.';
  if(code===-102||code===-109)detail=local?
    'Nessun programma risponde a questo indirizzo: se è un tuo progetto, il server di sviluppo è spento.':
    'Il server ha rifiutato la connessione: potrebbe essere spento o in manutenzione.';
  else if(code===-105){title=`${name} non esiste`;detail='L’indirizzo non è stato trovato: controlla che sia scritto bene, o la connessione a internet.';}
  else if(code===-106){title='Sei offline';detail='Il computer non è collegato a internet.';}
  else if(code===-7||code===-118){title=`${name} non risponde`;detail='Il server ci sta mettendo troppo a rispondere.';}
  else if(code===-100||code===-101||code===-324)detail='La connessione si è chiusa prima che arrivasse la pagina. Riprova tra poco.';
  else if(code===-21)detail='La rete è cambiata durante il caricamento. Riprova.';
  else if(code===-107)detail=local?'Il server locale non usa https: prova con http.':'La connessione sicura non è riuscita.';
  else if(code<=-200&&code>-300){title='Connessione non sicura';detail=`Il certificato di ${name} non è valido: il browser non apre la pagina per proteggerti.`;}
  // Server locale con il protocollo "sbagliato":
  // - https → http: quasi tutti i dev server usano http (l'https arriva spesso da un redirect di login);
  // - http → https: un server in https (es. Next.js --experimental-https) chiude subito le connessioni http.
  let altUrl=null,altLabel=null;
  if(local&&https){altUrl=url.replace(/^https:/i,'http:');altLabel='Prova con http://';}
  else if(local&&[-324,-100,-101].includes(code)){altUrl=url.replace(/^http:/i,'https:');altLabel='Prova con https://';
    detail='Il server ha chiuso la connessione: forse usa https. Prova con https://, oppure riprova tra poco.';}
  return {title,detail,url,code,description,local,altUrl,altLabel};
}

/**
 * Beta 0.14: barre di scorrimento minimal dentro i siti (mock-up "Scrollbar pagine").
 * Inserite come foglio di stile dell'utente: i siti che disegnano le proprie le tengono.
 * Il colore semitrasparente si legge sia su pagine scure sia chiare.
 */
const SCROLLBAR_CSS=`::-webkit-scrollbar{width:10px;height:10px;background:transparent}
::-webkit-scrollbar-thumb{background:rgba(124,112,200,.45);border-radius:8px;border:3px solid transparent;background-clip:padding-box}
::-webkit-scrollbar-thumb:hover{background:rgba(124,108,255,.85);border-width:2px}
::-webkit-scrollbar-thumb:active{background:#7c6cff;border-width:2px}
::-webkit-scrollbar-track,::-webkit-scrollbar-corner{background:transparent}`;
module.exports={SCROLLBAR_CSS,describeLoadError,SEARCH_ENGINES,searchUrl,PARTITION,FIREFOX_UA,isGoogleLogin,userAgentFor,firefoxHeaders,safeUrl,looksLikeAddress,isWebUrl,popupAction,cleanUserAgent};
