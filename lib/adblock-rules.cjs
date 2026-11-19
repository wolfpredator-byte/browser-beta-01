'use strict';

/**
 * Filtri cosmetici nel frame giusto (Beta 0.36).
 *
 * La libreria @ghostery esegue gli "scriptlet" con event.sender.executeJavaScript,
 * cioè sempre nel frame PRINCIPALE della scheda, anche quando a chiederli è un
 * iframe. Su YouTube (molti iframe) gli stessi scriptlet finivano iniettati più
 * volte nella pagina: "Identifier 'JSONPath' has already been declared",
 * ricorsione infinita e niente player (schermo nero al click sul video).
 *
 * Qui costruiamo un finto "sender" da passare alla libreria che esegue script e
 * stili nel frame che li ha chiesti (event.senderFrame), una volta sola per
 * documento.
 */

/**
 * Ogni scriptlet arriva come script "nudo": quelli json-edit dichiarano tutti
 * `class JSONPath` al livello globale, quindi dal secondo in poi la pagina dà
 * "Identifier 'JSONPath' has already been declared" e l'intercettazione resta
 * a metà (ricorsione infinita, player di YouTube che non parte). Racchiuso in un
 * blocco { } ognuno ha le sue class/let/const; `var scriptletGlobals` resta
 * comunque condiviso.
 */
const isolate=code=>`{
${code}
}`;

const STYLE_JS=css=>`(()=>{const s=document.createElement('style');s.textContent=${JSON.stringify(css)};(document.head||document.documentElement).appendChild(s);})();`;

/**
 * event: l'evento IPC (sender = webContents, senderFrame = WebFrameMain).
 * seen: Set condiviso dove ricordare i documenti già serviti.
 * Restituisce un evento con lo stesso frameId/processId ma un sender "di frame",
 * oppure null se il frame non c'è più o ha già ricevuto i suoi script.
 */
function frameEvent(event,url,msg,seen){
  const frame=event.senderFrame;
  if(!frame||frame.isDestroyed?.())return null;
  const main=frame===event.sender.mainFrame||!frame.parent;
  // Solo la prima richiesta (msg undefined) porta gli scriptlet: una volta per documento.
  if(msg===undefined){
    const key=`${frame.processId}:${frame.routingId}:${url}`;
    if(seen.has(key))return null;
    seen.add(key);
    if(seen.size>2000)seen.delete(seen.values().next().value);
  }
  const run=code=>{try{const p=frame.executeJavaScript(code,true);p?.catch?.(()=>{});}catch{}};
  const sender={
    getURL:()=>frame.url||url,
    executeJavaScript:code=>run(isolate(code)),
    insertCSS:(css,options)=>main?event.sender.insertCSS(css,options):run(STYLE_JS(css)),
  };
  return {frameId:event.frameId,processId:event.processId,sender,senderFrame:frame};
}

/* ══════════ Beta 0.45: liste separate, eccezioni con durata, avviso quando un sito si rompe, registro ══════════ */

/**
 * Le liste, divise per tipo. Ogni tipo ha il suo motore: così sai cosa è stato bloccato
 * (pubblicità o tracker) e accendi o spegni un tipo senza riscaricare niente.
 * «Correzioni» (uBlock quick-fixes e unbreak) non è un motore: entra in tutti gli altri,
 * perché le sue eccezioni (@@) devono valere su ogni lista.
 */
const LISTS=[
  {id:'ads',label:'Pubblicità',desc:'EasyList, uBlock filters, Peter Lowe',defaultOn:true},
  {id:'trk',label:'Tracker',desc:'EasyPrivacy, uBlock privacy',defaultOn:true},
  {id:'ck',label:'Banner dei cookie',desc:'EasyList Cookie, uBlock cookie',defaultOn:true},
  {id:'soc',label:'Social e fastidi',desc:'Pulsanti social, popup, «iscriviti»',defaultOn:false},
  {id:'fix',label:'Correzioni per siti',desc:'uBlock quick-fixes e unbreak: sistemano i siti rotti',defaultOn:true},
];
const ENGINES=['ads','trk','ck','soc'];
/** Tipo di una lista dal nome del file (gli indirizzi arrivano dalla libreria). */
function listCategory(url){
  const f=String(url).split('/').slice(-2).join('/').toLowerCase();
  if(/easyprivacy|ublock-origin\/privacy/.test(f))return 'trk';
  if(/cookie/.test(f))return 'ck';
  if(/annoyances/.test(f))return 'soc';
  if(/quick-fixes|unbreak/.test(f))return 'fix';
  return 'ads';
}
const MODES=['normal','compat','off'];
const DURATIONS=['1h','session','always'];
const HOUR=3600000;

const validHost=h=>typeof h==='string'&&/^[a-z0-9.-]{1,253}$/i.test(h)&&h.includes('.');
/** youtube.com e www.youtube.com sono lo stesso sito per le eccezioni. */
const siteOf=host=>String(host||'').toLowerCase().replace(/^www\./,'');

/** Impostazioni del blocco da disco: valori sbagliati sistemati, il resto scartato. */
function normalizeSettings(raw){
  const a=raw&&typeof raw==='object'?raw:{};
  const hosts=v=>Array.isArray(v)?[...new Set(v.filter(validHost).map(siteOf))].slice(-500):[];
  const lists={};for(const l of LISTS)lists[l.id]=typeof a.lists?.[l.id]==='boolean'?a.lists[l.id]:l.defaultOn;
  const temp={};
  for(const [h,e] of Object.entries(a.temp&&typeof a.temp==='object'?a.temp:{}))
    if(validHost(h)&&(e?.mode==='compat'||e?.mode==='off')&&Number.isFinite(e.until))temp[siteOf(h)]={mode:e.mode,until:e.until};
  const allowlist=hosts(a.allowlist),compat=hosts(a.compat).filter(h=>!allowlist.includes(h));
  return {enabled:a.enabled!==false,allowlist,compat,temp,lists,autoUpdate:a.autoUpdate!==false,
    quiet:hosts(a.quiet)}; // siti dove hai detto «Tieni i filtri»: niente più avvisi
}

/** Il sito e i suoi «genitori»: m.youtube.com → m.youtube.com, youtube.com. */
function parents(host){
  const parts=siteOf(host).split('.'),out=[];
  for(let i=0;i<parts.length-1;i++)out.push(parts.slice(i).join('.'));
  return out;
}
/**
 * Come si blocca su un sito: {mode:'normal'|'compat'|'off', until:null|numero|'session', site}.
 * session: Map sito → mode, solo per questa sessione.
 */
function siteMode(a,session,host,now=Date.now()){
  for(const h of parents(host)){
    if(session?.has(h))return {mode:session.get(h),until:'session',site:h};
    const t=a.temp[h];if(t&&t.until>now)return {mode:t.mode,until:t.until,site:h};
    if(a.allowlist.includes(h))return {mode:'off',until:null,site:h};
    if(a.compat.includes(h))return {mode:'compat',until:null,site:h};
  }
  return {mode:'normal',until:null,site:siteOf(host)};
}
/** Cambia il modo di un sito. duration: '1h' | 'session' | 'always'. mode 'normal' toglie ogni eccezione. */
function setSiteMode(a,session,host,mode,duration='always',now=Date.now()){
  const h=siteOf(host);
  if(!validHost(h)||!MODES.includes(mode))return false;
  for(const p of parents(h)){ // anche le eccezioni messe sul sito «genitore»
    session?.delete(p);delete a.temp[p];
    a.allowlist=a.allowlist.filter(x=>x!==p);a.compat=a.compat.filter(x=>x!==p);
  }
  if(mode==='normal')return true;
  if(duration==='session')session?.set(h,mode);
  else if(duration==='1h')a.temp[h]={mode,until:now+HOUR};
  else if(mode==='off')a.allowlist=[...a.allowlist,h].slice(-500);
  else a.compat=[...a.compat,h].slice(-500);
  return true;
}
/** Eccezioni scadute: via. Restituisce true se ha tolto qualcosa. */
function pruneTemp(a,now=Date.now()){
  let changed=false;
  for(const [h,t] of Object.entries(a.temp))if(!(t.until>now)){delete a.temp[h];changed=true;}
  return changed;
}
/** Tutte le eccezioni, per le impostazioni. */
function exceptions(a,session,now=Date.now()){
  const out=[];
  for(const [h,mode] of session||[])out.push({site:h,mode,until:'session'});
  for(const [h,t] of Object.entries(a.temp))if(t.until>now&&!session?.has(h))out.push({site:h,mode:t.mode,until:t.until});
  for(const h of a.allowlist)if(!out.some(x=>x.site===h))out.push({site:h,mode:'off',until:null});
  for(const h of a.compat)if(!out.some(x=>x.site===h))out.push({site:h,mode:'compat',until:null});
  return out;
}

/**
 * Avviso quando un sito si rompe. Si accorge di:
 * - ricariche a ripetizione: 3 caricamenti della stessa pagina in 20 secondi (il «loop» di YouTube);
 * - errori degli script del blocco nella pagina (scriptlet iniettati due volte, ricorsione infinita);
 * - player di YouTube fermo (lo segnala adblock.cjs dopo aver guardato la pagina).
 * Restituisce il motivo la prima volta, poi tace per quel sito.
 */
const LOOP_COUNT=3,LOOP_MS=20000;
const SCRIPT_ERRORS=[/has already been declared/i,/Maximum call stack size exceeded/i,/scriptletGlobals/i,/JSONPath/];
function createDetector(){
  const loads=new Map(),warned=new Set();
  const pageKey=url=>{try{const u=new URL(url);return u.origin+u.pathname+(u.searchParams.get('v')||'');}catch{return '';}};
  function hit(site,reason){if(warned.has(site))return null;warned.add(site);return reason;}
  return {
    /** Caricamento della pagina principale. */
    load(site,url,now=Date.now()){
      const key=pageKey(url);if(!key)return null;
      const list=(loads.get(site)||[]).filter(x=>now-x.t<LOOP_MS);
      list.push({t:now,key});loads.set(site,list.slice(-10));
      const same=list.filter(x=>x.key===key).length;
      return same>=LOOP_COUNT?hit(site,{kind:'loop',count:same}):null;
    },
    /** Messaggio d'errore nella console della pagina. */
    error(site,message){
      return SCRIPT_ERRORS.some(r=>r.test(String(message||'')))?hit(site,{kind:'script'}):null;
    },
    player(site){return hit(site,{kind:'player'});},
    /** Dopo una scelta si ricomincia a contare da zero. */
    reset(site){warned.delete(site);loads.delete(site);},
    warned:site=>warned.has(site),
  };
}
const REASON_TEXT={loop:r=>`${r.count} ricariche in 20 secondi`,script:()=>'errori degli script del blocco nella pagina',player:()=>'il video non parte'};
const reasonText=r=>(REASON_TEXT[r?.kind]||(()=>'la pagina non risponde'))(r);

/** Registro locale: ultimi 2000 eventi, al massimo 7 giorni. */
const LOG_MAX=2000,LOG_DAYS=7;
function addLog(log,entry,now=Date.now()){
  const e={t:now,site:String(entry.site||'').slice(0,120),url:String(entry.url||'').slice(0,300),cat:entry.cat};
  if(entry.text)e.text=String(entry.text).slice(0,200);
  log.push(e);
  const min=now-LOG_DAYS*86400000;
  let drop=0;while(drop<log.length&&log[drop].t<min)drop++;
  if(log.length-drop>LOG_MAX)drop=log.length-LOG_MAX;
  if(drop)log.splice(0,drop);
  return log;
}

/** Regole in un testo di lista (righe che non sono commenti né intestazioni). */
function countRules(text){
  let n=0;for(const line of String(text).split('\n')){const l=line.trim();if(l&&l[0]!=='!'&&l[0]!=='[')n++;}
  return n;
}
/**
 * Controllo di un aggiornamento prima di usarlo.
 * files: [{url, text}] appena scaricati; prev: {tipo: regole} di prima (o null la prima volta).
 * Ok solo se ogni lista è un testo vero con regole e nessun tipo è sceso sotto la metà di prima.
 */
function verifyUpdate(files,prev){
  const problems=[],counts={},perList={};
  for(const f of files){
    const text=String(f.text||''),name=String(f.url).split('/').pop();
    if(text.length<200||/^\s*</.test(text)){problems.push(`${name}: file non valido`);continue;}
    const n=countRules(text);
    if(n<10){problems.push(`${name}: quasi vuota`);continue;}
    const cat=listCategory(f.url);counts[cat]=(counts[cat]||0)+n;perList[f.url]=n;
  }
  for(const l of LISTS){
    if(!counts[l.id]){problems.push(`${l.label}: nessuna regola`);continue;}
    if(prev?.[l.id]&&counts[l.id]<prev[l.id]*0.5)problems.push(`${l.label}: regole dimezzate (${counts[l.id]} invece di ${prev[l.id]})`);
  }
  return {ok:problems.length===0,problems,counts,perList};
}

module.exports={frameEvent,isolate,STYLE_JS,LISTS,ENGINES,MODES,DURATIONS,listCategory,siteOf,validHost,normalizeSettings,parents,
  siteMode,setSiteMode,pruneTemp,exceptions,createDetector,reasonText,addLog,LOG_MAX,countRules,verifyUpdate};

