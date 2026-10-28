'use strict';

/**
 * Blocco di pubblicità e tracker (Beta 0.10) con le liste di uBlock/EasyList/
 * EasyPrivacy, tramite @ghostery/adblocker-electron.
 *
 * Non usiamo enableBlockingInSession() della libreria: colleghiamo noi i suoi
 * tre punti d'ingresso, così possiamo
 * - disattivarlo per singolo sito (se un sito si rompe con il blocco),
 * - contare gli elementi bloccati per scheda (numero sullo scudo ⛉).
 * Electron ammette un solo ascoltatore per tipo di evento di rete: qui usiamo
 * onBeforeRequest e onHeadersReceived; il login Google (web-session.cjs) usa
 * onBeforeSendHeaders, quindi non si pestano i piedi.
 *
 * Le liste si scaricano al primo avvio (~2 MB) e restano in cache nella cartella
 * dati; dopo 7 giorni vengono riscaricate.
 */
const fs=require('node:fs');
const path=require('node:path');
const {app,ipcMain,webContents}=require('electron');
const {state,save}=require('./state.cjs');
const windows=require('./windows.cjs');

const CACHE_DAYS=7;
const COSMETIC_CHANNEL='@ghostery/adblocker/inject-cosmetic-filters';
const OBSERVER_CHANNEL='@ghostery/adblocker/is-mutation-observer-enabled';

let blocker=null,loading=null;
const status={state:'off',error:null,updatedAt:0};
/** id della pagina (webContents) → elementi bloccati dall'ultimo caricamento. */
const counts=new Map();

const settings=()=>state.data.settings.adblock;
const cachePath=()=>path.join(app.getPath('userData'),'adblock-engine.bin');
const hostOf=url=>{try{return new URL(url).hostname;}catch{return '';}};
const isAllowlisted=host=>!!host&&settings().allowlist.includes(host);

/** Il sito della scheda che ha fatto la richiesta (non quello del singolo file). */
function pageHost(details){
  const contents=details.webContentsId?webContents.fromId(details.webContentsId):null;
  return hostOf(contents?.getURL()||details.referrer||'');
}
const active=details=>!!blocker&&settings().enabled&&!isAllowlisted(pageHost(details));

let emitTimer=null;
function emitSoon(){if(!emitTimer)emitTimer=setTimeout(()=>{emitTimer=null;windows.emitAll();},500);}

/** Scarica (o legge dalla cache) le liste e prepara il motore. */
function load(){
  if(blocker||loading)return loading;
  status.state='loading';status.error=null;
  loading=(async()=>{
    try{
      const {ElectronBlocker}=require('@ghostery/adblocker-electron');
      const file=cachePath();
      // Liste più vecchie di 7 giorni: le cancelliamo, così vengono riscaricate.
      try{if(Date.now()-fs.statSync(file).mtimeMs>CACHE_DAYS*86400000)fs.rmSync(file,{force:true});}catch{}
      blocker=await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch,
        {path:file,read:fs.promises.readFile,write:fs.promises.writeFile});
      blocker.on('request-blocked',request=>{
        if(request.tabId===undefined)return;
        counts.set(request.tabId,(counts.get(request.tabId)||0)+1);
        emitSoon();
      });
      status.state='ready';
      try{status.updatedAt=fs.statSync(file).mtimeMs;}catch{status.updatedAt=Date.now();}
    }catch(error){
      // Niente rete al primo avvio: il browser funziona, solo senza blocco. Riprova al prossimo avvio.
      status.state='error';status.error=String(error.message||error);blocker=null;
    }finally{loading=null;windows.emitAll();}
  })();
  return loading;
}

function setup(ses){
  const {PRELOAD_PATH}=require('@ghostery/adblocker-electron');
  ses.webRequest.onBeforeRequest({urls:['<all_urls>']},(details,callback)=>{
    if(!active(details))return callback({});
    blocker.onBeforeRequest(details,callback);
  });
  ses.webRequest.onHeadersReceived({urls:['<all_urls>']},(details,callback)=>{
    if(!active(details))return callback({});
    blocker.onHeadersReceived(details,callback);
  });
  // Filtri "cosmetici": nascondono i riquadri pubblicitari rimasti vuoti nella pagina.
  ses.registerPreloadScript({type:'frame',id:'adblock-cosmetic',filePath:PRELOAD_PATH||require.resolve('@ghostery/adblocker-electron-preload')});
  ipcMain.handle(COSMETIC_CHANNEL,(event,url,msg)=>{
    if(!blocker||!settings().enabled||isAllowlisted(hostOf(event.sender.getURL()||url)))return;
    return blocker.onInjectCosmeticFilters(event,url,msg);
  });
  ipcMain.handle(OBSERVER_CHANNEL,event=>blocker?blocker.onIsMutationObserverEnabled(event):false);
  if(settings().enabled)load();
}

/** Nuova pagina caricata nella scheda: il conteggio riparte da zero. */
function resetCount(contentsId){if(counts.delete(contentsId))emitSoon();}
const countFor=contentsId=>counts.get(contentsId)||0;

function setEnabled(enabled){
  settings().enabled=enabled;save();
  if(enabled)load();else status.state=blocker?'ready':'off';
  windows.emitAll();
}
function setSiteEnabled(host,enabled){
  if(!host)return {ok:false,error:'Sito non valido.'};
  const list=settings().allowlist.filter(h=>h!==host);
  if(!enabled)list.push(host);
  settings().allowlist=list.slice(-500);
  save();windows.emitAll();
  return {ok:true};
}

function snapshot(url){
  const host=hostOf(url);
  return {enabled:settings().enabled,state:settings().enabled?status.state:'off',error:status.error,
    updatedAt:status.updatedAt,host,siteEnabled:!isAllowlisted(host),allowlist:settings().allowlist};
}

module.exports={setup,load,resetCount,countFor,setEnabled,setSiteEnabled,snapshot};
