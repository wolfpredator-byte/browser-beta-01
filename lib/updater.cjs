'use strict';

/**
 * Aggiornamenti automatici (Beta 0.23). VARCO controlla le release del suo repository su
 * GitHub poco dopo l'avvio e poi ogni 6 ore. Quando c'è una versione nuova scarica
 * l'installer in background e lo dice con una notifica: "Riavvia e aggiorna" chiude
 * VARCO e avvia l'installer in modalità --update, che sostituisce i file e lo riapre.
 *
 * Funziona solo con VARCO installato (non con `npm start`). Le regole stanno in update-rules.cjs.
 * Per le prove: VARCO_UPDATE_FEED=<indirizzo di un JSON come quello di GitHub> (anche http locale).
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {app,net}=require('electron');
const {state,save}=require('./state.cjs');
const rules=require('./update-rules.cjs');

const FEED=process.env.VARCO_UPDATE_FEED||'https://api.github.com/repos/wolfpredator-byte/browser-beta-01/releases/latest';
const TEST_FEED=!!process.env.VARCO_UPDATE_FEED;
const FIRST_CHECK_MS=30*1000,EVERY_MS=6*60*60*1000;

/** idle · checking · latest · downloading · ready · error */
const status={state:'idle',version:'',notes:'',page:'',percent:0,error:'',checkedAt:null,file:''};
let timer=null,busy=null;

const updatesDir=()=>path.join(app.getPath('userData'),'updates');
/** Cartella di VARCO installato, o null (npm start, cartella strana). */
function installDir(){
  const dir=path.dirname(process.execPath);
  const ok=(app.isPackaged||TEST_FEED)&&fs.existsSync(path.join(dir,'VARCO.exe'))&&fs.existsSync(path.join(dir,'resources','app.asar'));
  return ok?dir:null;
}
const supported=()=>!!installDir();

function set(patch){
  Object.assign(status,patch);
  require('./windows.cjs').emitAll();
}

/** Controlla se c'è una versione nuova e, se sì, la scarica. */
function check(){
  if(busy)return busy;
  busy=(async()=>{
    if(!supported())return {ok:false,error:'Gli aggiornamenti funzionano con VARCO installato, non avviato da npm start.'};
    set({state:'checking',error:''});
    try{
      const response=await net.fetch(FEED,{headers:{Accept:'application/vnd.github+json','User-Agent':'VARCO/'+app.getVersion()},cache:'no-store'});
      if(response.status===404){set({state:'latest',checkedAt:Date.now()});return {ok:true,latest:true};} // nessuna release ancora
      if(!response.ok)throw new Error('GitHub ha risposto '+response.status);
      const info=rules.releaseInfo(await response.json());
      if(!info||!rules.isNewer(info.version,app.getVersion())){set({state:'latest',checkedAt:Date.now()});return {ok:true,latest:true};}
      set({version:info.version,notes:info.notes,page:info.page,checkedAt:Date.now()});
      await download(info);
      return {ok:true,version:info.version};
    }catch(error){
      set({state:'error',error:String(error.message||error),checkedAt:Date.now()});
      return {ok:false,error:status.error};
    }
  })().finally(()=>{busy=null;});
  return busy;
}

/** Scarica l'installer (una volta sola per versione) e ne controlla dimensione e impronta. */
async function download(info){
  if(!rules.trustedDownload(info.asset.url,{allowLocal:TEST_FEED}))throw new Error('Indirizzo di download non attendibile.');
  fs.mkdirSync(updatesDir(),{recursive:true});
  const target=path.join(updatesDir(),`VARCO Setup ${info.version}.exe`);
  if(fs.existsSync(target)&&(!info.asset.size||fs.statSync(target).size===info.asset.size)&&(!info.asset.sha256||await sha256(target)===info.asset.sha256)){
    ready(info,target);return;
  }
  // Via le versioni scaricate prima: ne serve una sola.
  for(const name of fs.readdirSync(updatesDir()))fs.rmSync(path.join(updatesDir(),name),{force:true});
  set({state:'downloading',percent:0});
  const response=await net.fetch(info.asset.url,{headers:{'User-Agent':'VARCO/'+app.getVersion()}});
  if(!response.ok||!response.body)throw new Error('Download non riuscito ('+response.status+').');
  const total=info.asset.size||Number(response.headers.get('content-length'))||0;
  const partial=target+'.part';
  const out=fs.createWriteStream(partial);
  const hash=crypto.createHash('sha256');
  let received=0,lastPercent=-1;
  try{
    const reader=response.body.getReader();
    for(;;){
      const {done,value}=await reader.read();
      if(done)break;
      hash.update(value);received+=value.length;
      if(!out.write(value))await new Promise(resolve=>out.once('drain',resolve));
      const percent=total?Math.floor(received*100/total):0;
      if(percent!==lastPercent&&percent%5===0){lastPercent=percent;set({percent});}
    }
  }finally{await new Promise(resolve=>out.end(resolve));}
  if(total&&received!==total){fs.rmSync(partial,{force:true});throw new Error('Download incompleto.');}
  if(info.asset.sha256&&hash.digest('hex')!==info.asset.sha256){fs.rmSync(partial,{force:true});throw new Error('Il file scaricato non corrisponde (impronta diversa).');}
  fs.renameSync(partial,target);
  ready(info,target);
}
function sha256(file){
  return new Promise((resolve,reject)=>{
    const hash=crypto.createHash('sha256');
    fs.createReadStream(file).on('data',d=>hash.update(d)).on('end',()=>resolve(hash.digest('hex'))).on('error',reject);
  });
}
function ready(info,file){
  const already=status.state==='ready'&&status.version===info.version;
  set({state:'ready',percent:100,file});
  if(!already)require('./toasts.cjs').show({id:'update-ready',kind:'success',title:`VARCO ${info.version} è pronto`,
    text:'Riavvia per aggiornare: schede e dati restano.',
    actions:[{label:'Riavvia e aggiorna',command:'installUpdate'}]});
}

/** Chiude VARCO e avvia l'installer in modalità aggiornamento. */
function install(){
  const dir=installDir();
  if(status.state!=='ready'||!status.file||!fs.existsSync(status.file))return {ok:false,error:'Nessun aggiornamento pronto.'};
  if(!dir)return {ok:false,error:'VARCO non è installato.'};
  // Un profilo diverso dal solito (--user-data-dir) resta lo stesso anche dopo il riavvio.
  const keep=process.argv.filter(arg=>/^--user-data-dir=/.test(arg)).flatMap(arg=>['--relaunch-arg',arg]);
  spawn(status.file,['--update',dir,'--pid',String(process.pid),...keep],{detached:true,stdio:'ignore'}).unref();
  // Un'uscita vera, anche con "resta nell'area di notifica" attivo: before-quit salva finestre e schede.
  setTimeout(()=>app.quit(),300);
  return {ok:true};
}

function snapshot(){
  return {update:{...status,current:app.getVersion(),supported:supported(),auto:state.data.settings.autoUpdate}};
}

/** All'avvio: primo controllo dopo 30 secondi, poi ogni 6 ore (se attivo). */
function start(){
  clearInterval(timer);timer=null;
  if(!supported())return;
  // Un aggiornamento appena installato: l'installer scaricato non serve più.
  try{for(const name of fs.readdirSync(updatesDir()))if(!rules.isNewer(name.replace(/^VARCO Setup |\.exe(\.part)?$/g,''),app.getVersion()))fs.rmSync(path.join(updatesDir(),name),{force:true});}catch{}
  setTimeout(()=>{if(state.data.settings.autoUpdate)check();},FIRST_CHECK_MS);
  timer=setInterval(()=>{if(state.data.settings.autoUpdate)check();},EVERY_MS);
}
function setAuto(enabled){state.data.settings.autoUpdate=enabled;save();require('./windows.cjs').emitAll();}

module.exports={check,install,snapshot,start,setAuto,supported};
