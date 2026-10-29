'use strict';

/**
 * Comandi del progetto (dev server, script) e apertura dell'editor.
 * I comandi partono nella cartella del progetto, con i segreti come variabili
 * d'ambiente: `npm run dev` vede BUNGIE_API_KEY senza file .env in chiaro.
 */
const {spawn,execFile,execFileSync}=require('node:child_process');
const windows=require('./windows.cjs');
const projects=require('./projects.cjs');
const {appendLog,isReadyLine}=require('./project-rules.cjs');

/** cartella|indice → {name, command, child, status, exitCode, log, startedAt} */
const running=new Map();
const key=(folder,index)=>folder+'|'+index;

let emitTimer=null;
/** I log arrivano a raffica: aggiorniamo la cornice al massimo 4 volte al secondo. */
function emitSoon(){
  if(emitTimer)return;
  emitTimer=setTimeout(()=>{emitTimer=null;windows.emitAll();},250);
}

/**
 * Su Windows `child.kill()` chiude solo la shell, non `node`/`vite` che ha avviato:
 * taskkill /T chiude tutto l'albero dei processi.
 */
function killTree(pid,sync=false){
  const args=['/pid',String(pid),'/T','/F'];
  if(process.platform!=='win32'){try{process.kill(-pid);}catch{}return;}
  if(sync){try{execFileSync('taskkill',args,{windowsHide:true,stdio:'ignore'});}catch{}}
  else execFile('taskkill',args,{windowsHide:true},()=>{});
}

/** Controlli comuni: progetto valido e fidato. */
function usableProject(workspaceName){
  const entry=projects.get(workspaceName);
  if(!entry||entry.status!=='ok')return {error:'Il file del progetto non è valido.'};
  if(!projects.isUsable(entry))return {error:'Prima conferma di fidarti di questo progetto.'};
  return {entry};
}

function start(workspaceName,index){
  const {entry,error}=usableProject(workspaceName);
  if(error)return {ok:false,error};
  const command=entry.config.avvio[index];
  if(!command)return {ok:false,error:'Comando non trovato.'};
  const id=key(entry.folder,index);
  const current=running.get(id);
  if(current?.status==='running')return {ok:false,error:'È già in esecuzione.'};
  const secrets=projects.secretValues(workspaceName);
  const record={name:command.nome,command:command.comando,child:null,status:'running',exitCode:null,
    log:{lines:[`> ${command.comando}`],partial:''},startedAt:Date.now(),ready:false};
  running.set(id,record);
  const mask=Object.values(secrets);
  try{
    // shell:true: il comando è scritto come lo scriveresti nel terminale (npm, &&, ecc.).
    record.child=spawn(command.comando,{cwd:entry.folder,shell:true,windowsHide:true,
      env:{...process.env,...secrets,FORCE_COLOR:'0',BROWSER:'none'}});
  }catch(e){record.status='error';record.log.lines.push('Avvio non riuscito: '+e.message);emitSoon();return {ok:false,error:e.message};}
  const preview=entry.config.anteprima;
  const onData=chunk=>{
    const text=chunk.toString('utf8');
    appendLog(record.log,text,mask);
    // Beta 0.17: la prima volta che il log dice "pronto", ricarichiamo l'anteprima.
    if(!record.ready&&text.split(/\r?\n/).some(line=>isReadyLine(line,preview,command.pronto))){
      record.ready=true;
      if(command.ricarica&&preview)reloadPreview(workspaceName,preview,record.name);
    }
    emitSoon();
  };
  record.child.stdout.on('data',onData);
  record.child.stderr.on('data',onData);
  record.child.on('error',e=>{record.status='error';record.log.lines.push('Errore: '+e.message);emitSoon();});
  record.child.on('exit',code=>{
    if(record.log.partial){record.log.lines.push(record.log.partial);record.log.partial='';}
    if(record.status==='running')record.status='exited';
    record.exitCode=code;
    record.log.lines.push(record.status==='stopped'?'— fermato —':`— terminato con codice ${code} —`);
    emitSoon();
  });
  emitSoon();
  return {ok:true};
}

/**
 * Ricarica le schede dell'anteprima (stessa origine, es. http://localhost:3000) nel workspace.
 * Le schede con la pagina di errore "server spento" tornano così alla pagina vera.
 * Se l'anteprima non è aperta, il toast offre di aprirla.
 */
function reloadPreview(workspaceName,preview,commandName){
  const {state}=require('./state.cjs');
  const toasts=require('./toasts.cjs');
  let origin='';try{origin=new URL(preview).origin;}catch{return;}
  const same=t=>{try{return new URL(t.url).origin===origin;}catch{return false;}};
  const open=state.tabs.filter(t=>t.workspace===workspaceName&&!t.isHome&&same(t));
  for(const t of open){
    t.loadError=null;
    if(t.view&&!t.view.webContents.isDestroyed())t.view.webContents.reload();
  }
  const owner=windows.windowFor(workspaceName)||undefined;
  toasts.show(open.length?{id:'preview-'+workspaceName,kind:'success',title:`«${commandName}» è pronto`,
      text:`Anteprima ricaricata (${open.length} ${open.length===1?'scheda':'schede'}).`,timeout:5000}:
    {id:'preview-'+workspaceName,kind:'info',title:`«${commandName}» è pronto`,text:new URL(preview).host,timeout:8000,
      actions:[{label:'Apri anteprima',command:'projectOpenPreview'}]},owner);
}

function stop(workspaceName,index){
  const entry=projects.get(workspaceName);
  const record=entry&&running.get(key(entry.folder,index));
  if(record?.status!=='running'||!record.child)return {ok:false,error:'Non è in esecuzione.'};
  record.status='stopped';
  killTree(record.child.pid);
  emitSoon();
  return {ok:true};
}

function clearLog(workspaceName,index){
  const entry=projects.get(workspaceName);
  const record=entry&&running.get(key(entry.folder,index));
  if(record)record.log={lines:[],partial:''};
  emitSoon();
}

/** All'uscita dal browser fermiamo i dev server: non devono restare orfani. */
function stopAll(){
  for(const record of running.values()){
    if(record.status==='running'&&record.child){record.status='stopped';killTree(record.child.pid,true);}
  }
}

/** Apre la cartella nell'editor indicato nel file (es. "code"). */
function openEditor(workspaceName){
  const {entry,error}=usableProject(workspaceName);
  if(error)return {ok:false,error};
  if(!entry.config.editor)return {ok:false,error:'Nessun "editor" nel file del progetto.'};
  // Il nome dell'editor è già validato (solo lettere, numeri, . _ -): niente iniezioni di shell.
  const child=spawn(`${entry.config.editor} "${entry.folder}"`,{shell:true,detached:true,stdio:'ignore',windowsHide:true});
  child.on('error',()=>{});
  child.unref();
  return {ok:true};
}

/** Stato dei comandi di un progetto per il pannello (ultime 200 righe di log). */
function snapshot(workspaceName){
  const entry=projects.get(workspaceName);
  if(entry?.status!=='ok')return [];
  return entry.config.avvio.map((command,index)=>{
    const record=running.get(key(entry.folder,index));
    return {index,name:command.nome,command:command.comando,status:record?.status||'idle',ready:!!record?.ready&&record.status==='running',
      exitCode:record?.exitCode??null,lines:record?record.log.lines.slice(-200):[]};
  });
}
const anyRunning=()=>[...running.values()].some(r=>r.status==='running');

module.exports={start,stop,stopAll,clearLog,openEditor,snapshot,anyRunning};
