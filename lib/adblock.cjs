'use strict';

/**
 * Blocco di pubblicità e tracker (Beta 0.10) con le liste di uBlock/EasyList/
 * EasyPrivacy, tramite @ghostery/adblocker-electron.
 *
 * Non usiamo enableBlockingInSession() della libreria: colleghiamo noi i suoi
 * tre punti d'ingresso. Electron ammette un solo ascoltatore per tipo di evento
 * di rete: qui usiamo onBeforeRequest e onHeadersReceived; il login Google
 * (web-session.cjs) usa onBeforeSendHeaders, quindi non si pestano i piedi.
 *
 * Beta 0.45:
 * - un motore per tipo di lista (pubblicità, tracker, cookie, social): si sa cosa è stato
 *   bloccato e i tipi si accendono e spengono senza riscaricare. Le «correzioni» entrano in tutti.
 * - per sito: normale, compatibile (solo richieste di pubblicità e tracker, niente script né
 *   stili nella pagina) o spento; per 1 ora, per la sessione o sempre (adblock-rules.cjs).
 * - avviso quando un sito sembra rotto dal blocco (ricariche a ripetizione, errori degli script, video fermo).
 * - aggiornamenti controllati: si scaricano le liste, si verificano, e solo allora si usano;
 *   quelle di prima restano come scorta («Torna alle liste di prima»).
 * - registro locale degli elementi bloccati e degli avvisi (adblock/registro.json, 7 giorni).
 *
 * Tutto in <dati>/adblock/: liste/ (testi verificati), liste-prima/ (scorta), motore-<tipo>.bin, info.json.
 */
const fs=require('node:fs');
const path=require('node:path');
const {app,ipcMain,webContents}=require('electron');
const {state,save}=require('./state.cjs');
const windows=require('./windows.cjs');
const rules=require('./adblock-rules.cjs');
const {frameEvent,ENGINES,LISTS,listCategory,siteOf,siteMode:modeOf}=rules;

const UPDATE_DAYS=7;
const COSMETIC_CHANNEL='@ghostery/adblocker/inject-cosmetic-filters';
const OBSERVER_CHANNEL='@ghostery/adblocker/is-mutation-observer-enabled';

/** tipo → motore (ElectronBlocker) */
let engines={},loading=null,updating=null;
/** Documenti (processo:frame:url) che hanno già ricevuto gli scriptlet. */
const served=new Set();
const status={state:'off',error:null,updatedAt:0,counts:{},lastCheck:null,canRollback:false};
/** id della pagina (webContents) → {ads,trk,ck,soc, domains: Map host→{cat,n}} dall'ultimo caricamento. */
const counts=new Map();
/** Eccezioni «per questa sessione»: sito → modo. */
const session=new Map();
const detector=rules.createDetector();
let log=null,logTimer=null;

const settings=()=>state.data.settings.adblock;
const dir=()=>path.join(app.getPath('userData'),'adblock');
const listsDir=()=>path.join(dir(),'liste');
const prevDir=()=>path.join(dir(),'liste-prima');
const infoPath=()=>path.join(dir(),'info.json');
const enginePath=cat=>path.join(dir(),`motore-${cat}.bin`);
const hostOf=url=>{try{return new URL(url).hostname;}catch{return '';}};
const fileOf=url=>url.split('/').slice(-2).join('-');

/** Il sito della scheda che ha fatto la richiesta (non quello del singolo file). */
function pageHost(details){
  const contents=details.webContentsId?webContents.fromId(details.webContentsId):null;
  return hostOf(contents?.getURL()||details.referrer||'');
}
// Beta 0.37.2: le richieste dei servizi di verifica (CAPTCHA, controlli anti-bot) non si bloccano mai.
const {isVerificationUrl}=require('./verification-rules.cjs');
const modeFor=host=>modeOf(settings(),session,host);
/** Tipi di lista da usare su un sito in un certo modo. */
function catsFor(mode){
  if(mode==='off')return [];
  const on=settings().lists;
  // Prima i tracker: le liste di pubblicità hanno anche regole per i tracker, così il conteggio dice il tipo giusto.
  return ['trk','ads','ck','soc'].filter(c=>on[c]&&engines[c]&&(mode==='normal'||c==='ads'||c==='trk'));
}

let emitTimer=null;
function emitSoon(){if(!emitTimer)emitTimer=setTimeout(()=>{emitTimer=null;windows.emitAll();},500);}

/* ── Registro locale ── */
const logPath=()=>path.join(dir(),'registro.json');
function readLog(){
  if(log)return log;
  try{log=JSON.parse(fs.readFileSync(logPath(),'utf8'));if(!Array.isArray(log))log=[];}catch{log=[];}
  return log;
}
function addLog(entry){
  rules.addLog(readLog(),entry);
  if(!logTimer)logTimer=setTimeout(()=>{logTimer=null;
    try{fs.mkdirSync(dir(),{recursive:true});fs.writeFileSync(logPath(),JSON.stringify(log),'utf8');}catch{}},10000);
}

/* ── Liste e motori ── */
function allUrls(){return require('@ghostery/adblocker').fullLists;}
let infoCache=null;
function readInfo(){if(!infoCache){try{infoCache=JSON.parse(fs.readFileSync(infoPath(),'utf8'))||{};}catch{infoCache={};}}return {...infoCache};}
function writeInfo(info){infoCache={...info};fs.mkdirSync(dir(),{recursive:true});fs.writeFileSync(infoPath(),JSON.stringify(info,null,1),'utf8');}
/** I motori dipendono dalle liste e dalle correzioni accese o spente. */
const engineKey=info=>`${info.updatedAt||0}:${settings().lists.fix?1:0}`;

/** Costruisce i motori dai testi delle liste (in liste/). */
function buildEngines(from){
  const {ElectronBlocker}=require('@ghostery/adblocker-electron');
  const texts={};for(const c of [...ENGINES,'fix'])texts[c]=[];
  for(const url of allUrls()){
    try{texts[listCategory(url)].push(fs.readFileSync(path.join(from,fileOf(url)),'utf8'));}catch{}
  }
  const fix=settings().lists.fix?texts.fix.join('\n'):'';
  const out={};
  for(const c of ENGINES)if(texts[c].length)out[c]=ElectronBlocker.parse(texts[c].join('\n')+'\n'+fix);
  return out;
}
function saveEngines(built,info){
  for(const c of ENGINES){if(built[c])fs.writeFileSync(enginePath(c),built[c].serialize());}
  info.engineKey=engineKey(info);writeInfo(info);
}
function useEngines(built,info){
  engines=built;served.clear();
  status.state='ready';status.error=null;status.updatedAt=info.updatedAt||0;status.counts=info.counts||{};
  status.canRollback=fs.existsSync(prevDir());status.lastCheck=info.lastCheck||null;
}

/** Legge i motori salvati (o li ricostruisce dalle liste). Senza liste le scarica. */
function load(){
  if(loading)return loading;
  status.state='loading';status.error=null;windows.emitAll();
  loading=(async()=>{
    try{
      try{fs.rmSync(path.join(app.getPath('userData'),'adblock-engine.bin'),{force:true});}catch{} // motore unico fino alla 0.44
      const info=readInfo();
      if(!info.updatedAt||!fs.existsSync(listsDir())){await update({first:true});return;}
      const {ElectronBlocker}=require('@ghostery/adblocker-electron');
      let built=null;
      if(info.engineKey===engineKey(info)){
        try{built={};for(const c of ENGINES)if(fs.existsSync(enginePath(c)))built[c]=ElectronBlocker.deserialize(fs.readFileSync(enginePath(c)));}
        catch{built=null;}
      }
      if(!built||!Object.keys(built).length){built=buildEngines(listsDir());saveEngines(built,info);}
      useEngines(built,info);
      // Liste vecchie di 7 giorni: si controlla se ce ne sono di nuove, intanto si usano queste.
      if(settings().autoUpdate&&Date.now()-info.updatedAt>UPDATE_DAYS*86400000)setTimeout(()=>update().catch(()=>{}),15000);
    }catch(error){
      status.state='error';status.error=String(error.message||error);
    }finally{loading=null;windows.emitAll();}
  })();
  return loading;
}

async function fetchText(url){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),45000);
  try{
    // Solo gli indirizzi delle liste che conosce la libreria (raw.githubusercontent.com/ghostery/adblocker).
    if(!/^https:\/\/raw\.githubusercontent\.com\/ghostery\/adblocker\//.test(url))throw new Error('indirizzo non previsto');
    const r=await fetch(url,{signal:ctrl.signal});
    if(!r.ok)throw new Error('HTTP '+r.status);
    return await r.text();
  }finally{clearTimeout(timer);}
}

/**
 * Aggiornamento controllato: scarica tutte le liste, le verifica (adblock-rules verifyUpdate),
 * e solo se vanno bene sposta quelle di prima in liste-prima/ e usa le nuove.
 */
function update({first=false,manual=false}={}){
  if(updating)return updating;
  updating=(async()=>{
    const info=readInfo();
    const check={t:Date.now(),ok:false,problems:[]};
    try{
      const files=[];
      for(const url of allUrls()){
        try{files.push({url,text:await fetchText(url)});}
        catch(e){check.problems.push(`${url.split('/').pop()}: ${e.name==='AbortError'?'tempo scaduto':e.message}`);}
      }
      if(check.problems.length)throw new Error('download');
      const v=rules.verifyUpdate(files,info.counts||null);
      if(!v.ok){check.problems=v.problems;throw new Error('verifica');}
      // Liste verificate: si scrivono in una cartella nuova, poi si scambiano.
      const fresh=path.join(dir(),'liste-nuove');
      fs.rmSync(fresh,{recursive:true,force:true});fs.mkdirSync(fresh,{recursive:true});
      for(const f of files)fs.writeFileSync(path.join(fresh,fileOf(f.url)),f.text,'utf8');
      const built=buildEngines(fresh);
      if(!Object.keys(built).length){check.problems=['nessun motore costruito'];throw new Error('verifica');}
      if(fs.existsSync(listsDir())){fs.rmSync(prevDir(),{recursive:true,force:true});fs.renameSync(listsDir(),prevDir());}
      fs.renameSync(fresh,listsDir());
      const next={updatedAt:Date.now(),counts:v.counts,perList:v.perList,
        prev:info.updatedAt?{updatedAt:info.updatedAt,counts:info.counts,perList:info.perList}:null};
      check.ok=true;next.lastCheck=check;
      saveEngines(built,next);useEngines(built,next);
      addLog({site:'',url:'',cat:'upd',text:`Liste aggiornate e verificate: ${Object.values(v.counts).reduce((a,b)=>a+b,0).toLocaleString('it-IT')} regole`});
      return {ok:true};
    }catch(error){
      if(!check.problems.length)check.problems=[String(error.message||error)];
      info.lastCheck=check;try{writeInfo(info);}catch{}
      status.lastCheck=check;
      addLog({site:'',url:'',cat:'upd',text:'Aggiornamento scartato: '+check.problems[0]});
      // Prima volta senza rete: il browser funziona, solo senza blocco. Riprova al prossimo avvio.
      if(first||!Object.keys(engines).length){status.state='error';status.error=check.problems[0];}
      return {ok:false,error:check.problems.slice(0,3).join(' · ')};
    }finally{updating=null;windows.emitAll();}
  })();
  return updating;
}

/** «Torna alle liste di prima»: scambia liste/ e liste-prima/. */
function rollback(){
  const info=readInfo();
  if(!fs.existsSync(prevDir())||!info.prev)return {ok:false,error:'Non ci sono liste di prima.'};
  const tmp=path.join(dir(),'liste-scambio');
  fs.rmSync(tmp,{recursive:true,force:true});
  fs.renameSync(listsDir(),tmp);fs.renameSync(prevDir(),listsDir());fs.renameSync(tmp,prevDir());
  const next={...info.prev,prev:{updatedAt:info.updatedAt,counts:info.counts,perList:info.perList},lastCheck:info.lastCheck};
  const built=buildEngines(listsDir());saveEngines(built,next);useEngines(built,next);
  addLog({site:'',url:'',cat:'upd',text:'Tornato alle liste del '+new Date(next.updatedAt).toLocaleDateString('it-IT')});
  windows.emitAll();
  return {ok:true};
}

/* ── Richieste, intestazioni, filtri cosmetici ── */
const tabOf=id=>state.tabs.find(t=>t.view&&!t.view.webContents.isDestroyed()&&t.view.webContents.id===id)||null;
function record(details,cat,host){
  const id=details.webContentsId;
  if(id!==undefined){
    let c=counts.get(id);if(!c){c={ads:0,trk:0,ck:0,soc:0,domains:new Map()};counts.set(id,c);}
    c[cat]++;
    const h=hostOf(details.url),d=c.domains.get(h)||{cat,n:0};d.n++;c.domains.set(h,d);
    if(c.domains.size>200)c.domains.delete(c.domains.keys().next().value);
  }
  // In incognito niente registro.
  const tab=id!==undefined?tabOf(id):null;
  if(!tab||!require('./incognito.cjs').is(tab.workspace))addLog({site:siteOf(host),url:details.url,cat});
  emitSoon();
}

/** global (Beta 0.28): canali con le pagine una volta sola; le altre sessioni ricevono solo i blocchi. */
function setup(ses,{global=true}={}){
  const {PRELOAD_PATH}=require('@ghostery/adblocker-electron');
  ses.webRequest.onBeforeRequest({urls:['<all_urls>']},(details,callback)=>{
    if(!settings().enabled||isVerificationUrl(details.url))return callback({});
    const host=pageHost(details),cats=catsFor(modeFor(host).mode);
    // Ogni motore a turno: il primo che blocca (o reindirizza) decide.
    const next=i=>{
      if(i>=cats.length)return callback({});
      engines[cats[i]].onBeforeRequest(details,r=>{
        if(r&&(r.cancel||r.redirectURL)){record(details,cats[i],host);callback(r);}
        else next(i+1);
      });
    };
    next(0);
  });
  ses.webRequest.onHeadersReceived({urls:['<all_urls>']},(details,callback)=>{
    // Le regole CSP stanno nelle liste di pubblicità; in compatibile la pagina non si tocca.
    if(!settings().enabled||!engines.ads||!settings().lists.ads||isVerificationUrl(details.url)||modeFor(pageHost(details)).mode!=='normal')return callback({});
    engines.ads.onHeadersReceived(details,callback);
  });
  // Filtri "cosmetici": nascondono i riquadri pubblicitari rimasti vuoti nella pagina.
  ses.registerPreloadScript({type:'frame',id:'adblock-cosmetic',filePath:PRELOAD_PATH||require.resolve('@ghostery/adblocker-electron-preload')});
  if(!global)return;
  ipcMain.handle(COSMETIC_CHANNEL,async(event,url,msg)=>{
    if(!settings().enabled)return;
    const cats=catsFor(modeFor(hostOf(event.sender.getURL()||url)).mode==='normal'?'normal':'off');
    if(!cats.length)return;
    // Script e stili nel frame che li chiede, una volta per documento (vedi adblock-rules.cjs).
    const target=frameEvent(event,url,msg,served);
    if(!target)return;
    // Le correzioni stanno in ogni motore: lo stesso script si inietta una volta sola.
    const done=new Set(),run=target.sender.executeJavaScript;
    target.sender.executeJavaScript=code=>{if(done.has(code))return;done.add(code);run(code);};
    for(const c of cats){try{await engines[c].onInjectCosmeticFilters(target,url,msg);}catch{}}
  });
  ipcMain.handle(OBSERVER_CHANNEL,()=>Object.keys(engines).length>0);
  if(settings().enabled)load();
  // Eccezioni da 1 ora scadute: via (e lo scudo si aggiorna).
  setInterval(()=>{if(rules.pruneTemp(settings())){save();windows.emitAll();}},60000).unref?.();
}

/* ── Avviso quando un sito si rompe ── */
function warn(contents,site,reason){
  const a=settings();
  if(!reason||!a.enabled||a.quiet.includes(site)||modeFor(site).mode!=='normal'||!Object.keys(engines).length)return;
  const tab=tabOf(contents.id),w=tab?windows.windowForTab(tab):null;
  if(!w)return;
  const text=rules.reasonText(reason);
  addLog({site,url:contents.getURL(),cat:'warn',text:'Avviso: '+text});
  const name=site.replace(/\.(com|it|net|org|tv|io)$/,'');
  require('./toasts.cjs').show({id:'adblock-break-'+site,category:'sito',kind:'warning',
    title:`${name.charAt(0).toUpperCase()+name.slice(1)} sembra non funzionare`,
    text:`Il blocco potrebbe aver rotto la pagina (${text}). Vale solo per ${site}.`,timeout:45000,
    actions:[{label:'Modalità compatibile',command:'adblockSiteMode',args:{host:site,mode:'compat',duration:'session'}},
      {label:'Spegni per 1 ora',command:'adblockSiteMode',args:{host:site,mode:'off',duration:'1h'}},
      {label:'Tieni i filtri',command:'adblockKeepFilters',args:{host:site}}]},w);
}
/** Caricamento della pagina principale di una scheda (da tabs.cjs). */
function pageLoad(contents,url){
  const site=siteOf(hostOf(url));if(!site)return;
  // Si conta solo dove l'avviso ha senso: blocco acceso, sito in modo normale, avvisi non spenti.
  const a=settings();if(!a.enabled||a.quiet.includes(site)||modeFor(site).mode!=='normal'||!Object.keys(engines).length)return;
  warn(contents,site,detector.load(site,url));
  // YouTube: dopo 12 secondi il video di una pagina /watch deve aver caricato qualcosa.
  if(/(^|\.)youtube\.com$/.test(site)&&/\/watch/.test(url)){
    setTimeout(async()=>{
      if(contents.isDestroyed()||contents.getURL()!==url)return;
      try{
        const v=await contents.executeJavaScript(`(()=>{const v=document.querySelector('video.html5-main-video')||document.querySelector('video');return v?{rs:v.readyState,hidden:document.hidden}:null})()`,true);
        if(v&&v.rs===0&&!v.hidden)warn(contents,site,detector.player(site));
      }catch{}
    },12000);
  }
}
/** Errore nella console della pagina (da tabs.cjs). */
function pageError(contents,message){
  const site=siteOf(hostOf(contents.getURL()));if(!site||modeFor(site).mode!=='normal')return;
  warn(contents,site,detector.error(site,message));
}

/* ── Comandi ── */
/** Nuova pagina caricata nella scheda: il conteggio riparte da zero. */
function resetCount(contentsId){if(counts.delete(contentsId))emitSoon();}
const countFor=contentsId=>{const c=counts.get(contentsId);return c?c.ads+c.trk+c.ck+c.soc:0;};

function setEnabled(enabled){
  settings().enabled=enabled;save();
  if(enabled&&!Object.keys(engines).length)load();
  windows.emitAll();
}
/** Le schede aperte su un sito si ricaricano: il nuovo modo vale dal prossimo caricamento. */
function reloadSite(site){
  for(const t of state.tabs){
    const c=t.view?.webContents;
    if(c&&!c.isDestroyed()&&rules.parents(hostOf(c.getURL())).includes(site))c.reload();
  }
}
function setSiteMode(host,mode,duration='always'){
  const site=siteOf(host);
  if(!rules.setSiteMode(settings(),session,site,mode,duration))return {ok:false,error:'Sito non valido.'};
  detector.reset(site);
  addLog({site,url:'',cat:'mode',text:{normal:'Blocco normale',compat:'Modalità compatibile',off:'Blocco spento'}[mode]+
    (mode==='normal'?'':{'1h':' per 1 ora',session:' per questa sessione',always:' sempre'}[duration])});
  save();reloadSite(site);windows.emitAll();
  return {ok:true};
}
/** Vecchio comando (scudo fino alla 0.44): sì/no sempre. */
const setSiteEnabled=(host,enabled)=>setSiteMode(host,enabled?'normal':'off','always');
function keepFilters(host,undo=false){
  const site=siteOf(host),a=settings();
  if(!rules.validHost(site))return {ok:false};
  if(undo){a.quiet=a.quiet.filter(h=>h!==site);detector.reset(site);}
  else if(!a.quiet.includes(site))a.quiet=[...a.quiet,site].slice(-500);
  addLog({site,url:'',cat:'mode',text:undo?'Avvisi riattivati':'Tenuti i filtri: niente più avvisi'});
  save();windows.emitAll();return {ok:true};
}
function setList(id,enabled){
  if(!LISTS.some(l=>l.id===id))return {ok:false};
  settings().lists[id]=enabled;save();
  // Le correzioni stanno dentro i motori: vanno ricostruiti (le liste sono già sul PC).
  if(id==='fix'&&Object.keys(engines).length){
    const info=readInfo();
    try{const built=buildEngines(listsDir());saveEngines(built,info);useEngines(built,info);}catch(e){status.error=String(e.message||e);}
  }
  windows.emitAll();return {ok:true};
}
function setAutoUpdate(enabled){settings().autoUpdate=enabled;save();windows.emitAll();}
function getLog(){return readLog().slice(-500).reverse();}
function clearLog(){log=[];try{fs.rmSync(logPath(),{force:true});}catch{}return {ok:true};}

const UNTIL=e=>e.until==='session'?'per questa sessione':e.until===null?'sempre':'fino alle '+new Date(e.until).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
/** Per il pannello del sito e la finestrella dello scudo. */
function snapshot(url,contentsId){
  const host=hostOf(url),m=modeFor(host),a=settings();
  const c=contentsId!==undefined?counts.get(contentsId):null;
  const domains=c?[...c.domains].map(([h,d])=>({host:h,cat:d.cat,n:d.n})).sort((x,y)=>y.n-x.n).slice(0,30):[];
  return {enabled:a.enabled,state:a.enabled?status.state:'off',error:status.error,updatedAt:status.updatedAt,
    host,site:m.site,mode:m.mode,until:m.until,untilText:m.mode==='normal'?'':UNTIL(m),
    siteEnabled:m.mode!=='off',quiet:a.quiet.includes(siteOf(host)),
    blocked:{ads:c?.ads||0,trk:c?.trk||0,ck:c?.ck||0,soc:c?.soc||0},domains,
    lists:LISTS.map(l=>({id:l.id,label:l.label,on:a.lists[l.id]})),allowlist:a.allowlist};
}
/** Per le impostazioni. */
function settingsSnapshot(){
  const a=settings(),info=readInfo();
  return {enabled:a.enabled,state:a.enabled?status.state:'off',error:status.error,autoUpdate:a.autoUpdate,updating:!!updating,
    updatedAt:status.updatedAt,nextCheck:status.updatedAt?status.updatedAt+UPDATE_DAYS*86400000:0,lastCheck:status.lastCheck,
    canRollback:status.canRollback&&!!info.prev,prevDate:info.prev?.updatedAt||0,
    lists:LISTS.map(l=>({...l,on:a.lists[l.id],rules:status.counts[l.id]||0})),
    exceptions:rules.exceptions(a,session).map(e=>({...e,untilText:UNTIL(e)})),quiet:a.quiet,
    exceptionCount:rules.exceptions(a,session).length};
}

const modeForUrl=url=>settings().enabled?modeFor(hostOf(url)).mode:'off';
module.exports={modeForUrl,setup,load,update,rollback,resetCount,countFor,setEnabled,setSiteEnabled,setSiteMode,keepFilters,setList,setAutoUpdate,
  getLog,clearLog,snapshot,settingsSnapshot,pageLoad,pageError};
