'use strict';

/**
 * Workspace di tipo progetto. Se un workspace ha una cartella collegata,
 * leggiamo `progetto.browser.json` da lì e lo teniamo aggiornato mentre lo modifichi.
 *
 * Sicurezza:
 * - Un file può avviare comandi o inviare segreti a un indirizzo: prima di
 *   usarlo chiediamo se ti fidi. La fiducia vale per quella versione dei
 *   comandi/monitor (trustKey); se cambiano, la chiediamo di nuovo.
 * - I segreti sono cifrati con safeStorage (su Windows: DPAPI, legato al tuo
 *   account) e non vengono mai inviati alla cornice: lei sa solo se esistono.
 */
const fs=require('node:fs');
const path=require('node:path');
const {safeStorage}=require('electron');
const {state,save}=require('./state.cjs');
const windows=require('./windows.cjs');
const rules=require('./project-rules.cjs');

/** workspace → {folder, file, status, errors, config, proposal, watcher} */
const projects=new Map();

const data=()=>state.data;
const workspaceRecord=name=>data().workspaces.find(w=>w.name===name);
const get=workspaceName=>projects.get(workspaceName)||null;

/** true se il progetto può essere usato: file valido e, se serve, fidato. */
function isUsable(entry){return entry?.status==='ok'&&(entry.trusted||!rules.needsTrust(entry.config));}

/**
 * Legge (o rilegge) il progetto di un workspace.
 * Stati: none (nessuna cartella), missing (manca il file), invalid, ok.
 */
function load(workspaceName){
  const previous=projects.get(workspaceName);
  const folder=workspaceRecord(workspaceName)?.projectPath||'';
  if(previous&&previous.folder!==folder){previous.watcher?.close();}
  const entry={workspace:workspaceName,folder,file:folder?path.join(folder,rules.FILE_NAME):'',
    status:'none',errors:[],config:null,proposal:null,trusted:false,
    watcher:previous?.folder===folder?previous.watcher:null};
  projects.set(workspaceName,entry);
  if(!folder)return entry;
  if(!fs.existsSync(folder)){entry.status='invalid';entry.errors=['La cartella collegata non esiste più: '+folder];return entry;}
  if(!entry.watcher)entry.watcher=watchFolder(workspaceName,folder);
  let raw=null;
  try{raw=fs.readFileSync(entry.file,'utf8');}catch{}
  if(raw===null){
    entry.status='missing';
    let pkg=null;
    try{pkg=fs.readFileSync(path.join(folder,'package.json'),'utf8');}catch{}
    entry.proposal=rules.detectDefaults(path.basename(folder),pkg);
    return entry;
  }
  const parsed=rules.parseProjectFile(raw);
  if(!parsed.ok){entry.status='invalid';entry.errors=parsed.errors;return entry;}
  entry.status='ok';
  entry.config=parsed.config;
  entry.trusted=data().trustedProjects[entry.file]===rules.trustKey(parsed.config);
  return entry;
}
function loadAll(){for(const w of data().workspaces)load(w.name);}

/** Beta 0.17: il workspace ha cambiato nome. Il controllo della cartella va rifatto col nome nuovo. */
function rename(oldName,newName){
  const entry=projects.get(oldName);
  if(entry){entry.watcher?.close();projects.delete(oldName);}
  load(newName);
}

/**
 * Gli editor salvano spesso scrivendo un file temporaneo e rinominandolo:
 * osserviamo la cartella (non il file) e rileggiamo dopo 300ms di calma.
 */
function watchFolder(workspaceName,folder){
  let timer=null;
  try{
    const watcher=fs.watch(folder,{persistent:false},(_event,filename)=>{
      if(filename&&filename.toLowerCase()!==rules.FILE_NAME)return;
      clearTimeout(timer);
      timer=setTimeout(()=>{load(workspaceName);windows.emitAll();},300);
    });
    watcher.on('error',()=>{});
    return watcher;
  }catch{return null;}
}

/** Crea il file con la proposta iniziale. Lo hai appena visto e confermato: è fidato. */
function createFile(workspaceName){
  const entry=get(workspaceName);
  if(entry?.status!=='missing'||!entry.proposal)return {ok:false,error:'Il file esiste già o manca la cartella.'};
  try{fs.writeFileSync(entry.file,JSON.stringify(entry.proposal,null,2)+'\n',{flag:'wx'});}
  catch(e){return {ok:false,error:'Impossibile creare il file: '+e.message};}
  const created=load(workspaceName);
  if(created.status==='ok')trust(workspaceName);
  return {ok:true};
}

function trust(workspaceName){
  const entry=get(workspaceName);
  if(entry?.status!=='ok')return false;
  data().trustedProjects[entry.file]=rules.trustKey(entry.config);
  entry.trusted=true;
  save();
  return true;
}

// ── Segreti ──────────────────────────────────────────────────────────────
const secretStore=folder=>(data().secrets[folder]??={});

function setSecret(workspaceName,name,value){
  const entry=get(workspaceName);
  if(entry?.status!=='ok')return {ok:false,error:'Progetto non disponibile.'};
  if(!entry.config.segreti.includes(name))return {ok:false,error:`${name} non è nell'elenco "segreti" del file.`};
  if(!value||value.length>4096)return {ok:false,error:'Valore vuoto o troppo lungo.'};
  if(!safeStorage.isEncryptionAvailable())return {ok:false,error:'La cifratura di Windows non è disponibile: il segreto non viene salvato.'};
  secretStore(entry.folder)[name]=safeStorage.encryptString(value).toString('base64');
  save();
  return {ok:true};
}
function removeSecret(workspaceName,name){
  const entry=get(workspaceName);
  if(!entry?.folder)return {ok:false,error:'Progetto non disponibile.'};
  delete secretStore(entry.folder)[name];
  save();
  return {ok:true};
}
/**
 * Valori in chiaro, SOLO per il processo principale (variabili d'ambiente
 * dei comandi, header dei monitor). Solo i nomi dichiarati nel file.
 */
function secretValues(workspaceName){
  const entry=get(workspaceName);
  const result={};
  if(entry?.status!=='ok')return result;
  const stored=data().secrets[entry.folder]||{};
  for(const name of entry.config.segreti){
    if(!stored[name])continue;
    try{result[name]=safeStorage.decryptString(Buffer.from(stored[name],'base64'));}
    catch{/* cifrato da un altro account Windows: va reimpostato */}
  }
  return result;
}

/** Barra degli indirizzi: "lg ace of spades" con le ricerche del progetto. */
function expandSearch(workspaceName,input){
  const entry=get(workspaceName);
  return entry?.status==='ok'?rules.expandSearch(input,entry.config.ricerche):null;
}

/** Dati per il pannello Progetto. Niente valori dei segreti, solo se sono impostati. */
function snapshot(workspaceName){
  const entry=get(workspaceName)||load(workspaceName);
  const stored=entry.folder?data().secrets[entry.folder]||{}:{};
  return {status:entry.status,folder:entry.folder,file:entry.file,errors:entry.errors,
    proposal:entry.proposal,config:entry.config,trusted:isUsable(entry),
    needsTrust:entry.config?rules.needsTrust(entry.config):false,
    secrets:entry.config?entry.config.segreti.map(name=>({name,set:!!stored[name]})):[]};
}

function closeAll(){for(const entry of projects.values())entry.watcher?.close();}

module.exports={rename,load,loadAll,get,isUsable,createFile,trust,setSecret,removeSecret,secretValues,
  expandSearch,snapshot,closeAll,projects};
