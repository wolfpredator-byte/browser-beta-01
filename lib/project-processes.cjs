'use strict';

/**
 * Comandi del progetto (dev server, script) e apertura dell'editor.
 *
 * Beta 0.43: VARCO osserva il processo invece di aprire un indirizzo fisso.
 *   avvio → legge il log (indirizzi, errori) e chiede a Windows le porte in ascolto dell'albero di processi
 *   → in attesa: prova l'indirizzo finché risponde → pronto: apre o ricarica LA scheda di anteprima del progetto.
 * Funziona anche se il server cambia porta, non stampa l'indirizzo o resta acceso dopo la fine del comando.
 * I comandi partono nella cartella del progetto, con i segreti come variabili
 * d'ambiente: `npm run dev` vede BUNGIE_API_KEY senza file .env in chiaro.
 */
const {spawn,execFile,execFileSync}=require('node:child_process');
const windows=require('./windows.cjs');
const projects=require('./projects.cjs');
const {appendLog,isReadyLine}=require('./project-rules.cjs');
const D=require('./dev-server-rules.cjs');
const http=require('node:http'),https=require('node:https');

const WATCH_MS=1500,GIVE_UP_MS=120000;
/** workspace → id della scheda di anteprima (una per progetto: si ricarica invece di aprirne un'altra). */
const previewTabs=new Map();

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

function start(workspaceName,index,{open=false}={}){
  const {entry,error}=usableProject(workspaceName);
  if(error)return {ok:false,error};
  const command=entry.config.avvio[index];
  if(!command)return {ok:false,error:'Comando non trovato.'};
  const id=key(entry.folder,index);
  const current=running.get(id);
  if(current?.status==='running')return {ok:false,error:'È già in esecuzione.'};
  const secrets=projects.secretValues(workspaceName);
  const record={name:command.nome,command:command.comando,child:null,status:'running',exitCode:null,
    log:{lines:[`> ${command.comando}`],partial:''},startedAt:Date.now(),ready:false,url:null,
    // Beta 0.43: fase (starting → waiting → ready | error), indirizzo di rete, porte, processi figli.
    phase:'starting',network:null,error:null,warning:null,ports:[],pids:[],openOnReady:open,https:false,workspace:workspaceName,reload:!!command.ricarica};
  running.set(id,record);
  const mask=Object.values(secrets);
  try{
    // shell:true: il comando è scritto come lo scriveresti nel terminale (npm, &&, ecc.).
    record.child=spawn(command.comando,{cwd:entry.folder,shell:true,windowsHide:true,
      env:{...process.env,...secrets,FORCE_COLOR:'0',BROWSER:'none'}});
  }catch(e){record.status='error';record.log.lines.push('Avvio non riuscito: '+e.message);emitSoon();return {ok:false,error:e.message};}
  const preview=entry.config.anteprima;
  record.expected=preview||null;
  const onData=chunk=>{
    const text=chunk.toString('utf8');
    appendLog(record.log,text,mask);
    if(/https:\/\/(localhost|127\.0\.0\.1)/i.test(text))record.https=true;
    // Indirizzi dal log: l'ultimo locale vince (Vite che cambia porta ne stampa uno nuovo).
    const found=D.pickUrl(D.urlsFromLog(text));
    if(found.url&&found.url!==record.url){record.url=found.url;if(record.phase==='ready')record.phase='waiting';if(record.phase==='starting')record.phase='waiting';probeSoon(record);}
    if(found.network)record.network=found.network;
    for(const line of text.split(/\r?\n/)){
      const err=D.errorFromLine(line);
      if(err?.soft)record.warning=err;
      else if(err&&!record.error){record.error=err;if(err.code==='port')describePortOwner(record,err.port);}
      if(record.ready&&/compiled successfully|ready in|✓ compiled/i.test(line))record.warning=null;
      // Testo «pronto» scritto nel file del progetto: vale ancora (senza indirizzo = pronto subito).
      if(command.pronto&&record.phase!=='ready'&&isReadyLine(line,preview,command.pronto)){if(record.url)probeSoon(record);else ready(record);}
    }
    emitSoon();
  };
  record.child.stdout.on('data',onData);
  record.child.stderr.on('data',onData);
  record.child.on('error',e=>{record.status='error';record.phase='error';record.error={code:'spawn',text:'Avvio non riuscito: '+e.message};record.log.lines.push('Errore: '+e.message);emitSoon();});
  record.child.on('exit',async code=>{
    if(record.log.partial){record.log.lines.push(record.log.partial);record.log.partial='';}
    record.exitCode=code;
    if(record.status==='stopped'){record.phase='stopped';record.log.lines.push('— fermato —');emitSoon();return;}
    // Il comando è finito, ma il server può essere rimasto acceso (processo staccato): guardiamo le porte.
    const fg=require('./foreground.cjs');
    let tree=await fg.processPorts(record.child.pid).catch(()=>null);
    // Il processo intermedio può essere già morto (la catena padre→figlio si interrompe): cerchiamo allora le porte
    // aperte da processi nati dopo l'avvio del comando, esclusi VARCO e le porte che erano già aperte prima.
    if(!(tree&&tree.ports.length)&&code===0){
      const since=await fg.newPorts(record.startedAt-500,[process.pid,...require('electron').app.getAppMetrics().map(m=>m.pid)]).catch(()=>null);
      if(since&&since.ports.length){tree=since;}
    }
    if(tree&&tree.ports.length&&tree.pids.length){
      record.pids=tree.pids;record.ports=tree.ports;record.detached=true;
      if(!record.url)record.url=D.urlFromPorts(tree.ports,{https:record.https});
      record.log.lines.push('— il comando è finito, il server resta acceso —');
      probeSoon(record);emitSoon();return;
    }
    record.status='exited';
    record.phase=code===0&&!record.error?'exited':'error';
    if(record.phase==='error'&&!record.error)record.error={code:'exit',text:`Il comando si è fermato (codice ${code}).`};
    record.log.lines.push(`— terminato con codice ${code} —`);
    emitSoon();
  });
  watch(record);
  emitSoon();
  return {ok:true};
}

// ── Osservatore (Beta 0.43) ──────────────────────────────────────────────
/** Ogni 1,5 s, finché il server non è pronto: porte dell'albero di processi e prova dell'indirizzo. */
function watch(record){
  clearInterval(record.timer);
  record.timer=setInterval(async()=>{
    if(record.status==='stopped'||(record.status!=='running'&&!record.detached)){clearInterval(record.timer);return;}
    const age=Date.now()-record.startedAt;
    if(record.phase!=='ready'){
      const tree=await require('./foreground.cjs').processPorts(record.child.pid).catch(()=>null);
      if(tree){record.pids=tree.pids;record.ports=tree.ports;}
      // Nessun indirizzo nel log, ma il processo ascolta su una porta: usiamo quella.
      let preferPort=null;try{preferPort=record.expected?Number(new URL(record.expected).port)||null:null;}catch{}
      if(!record.url&&record.ports.length){record.url=D.urlFromPorts(record.ports,{https:record.https,preferPort});record.phase='waiting';}
      // Né indirizzo né porte dopo qualche secondo: è un comando normale (build, script), non un server.
      if(!record.url&&record.phase==='starting'&&age>8000){record.phase='running';emitSoon();}
      if(record.url)await probe(record);
      if(record.phase!=='ready'&&age>GIVE_UP_MS&&record.url){
        record.phase='error';record.error=record.error||{code:'timeout',text:`Il server non risponde su ${new URL(record.url).host}.`};emitSoon();clearInterval(record.timer);
      }
    }else if(age>GIVE_UP_MS*2){clearInterval(record.timer);}
  },WATCH_MS);
}
let probeTimer=null;
function probeSoon(record){clearTimeout(probeTimer);probeTimer=setTimeout(()=>probe(record),300);}
/** L'indirizzo risponde (qualsiasi codice HTTP, anche 404)? Allora il server è pronto. */
function probe(record){
  if(!record.url||record.phase==='ready'||record.status==='stopped')return Promise.resolve();
  if(record.phase==='starting')record.phase='waiting';
  return new Promise(resolve=>{
    let u;try{u=new URL(record.url);}catch{return resolve();}
    const lib=u.protocol==='https:'?https:http;
    // Solo per gli indirizzi locali accettiamo il certificato fatto in casa del dev server.
    const req=lib.request({hostname:u.hostname==='localhost'?'127.0.0.1':u.hostname.replace(/^\[|\]$/g,''),port:u.port||(u.protocol==='https:'?443:80),path:u.pathname||'/',method:'GET',timeout:1500,
      headers:{Host:u.host},rejectUnauthorized:!D.isLocalHost(u.hostname)},res=>{res.resume();ready(record);resolve();});
    req.on('timeout',()=>{req.destroy();resolve();});
    req.on('error',()=>{
      // localhost può essere solo IPv6 (::1): riprova lì prima di arrendersi.
      if(u.hostname==='localhost'&&!record.triedV6){record.triedV6=true;const r2=lib.request({hostname:'::1',port:u.port,path:'/',method:'GET',timeout:1500,headers:{Host:u.host},rejectUnauthorized:false},res=>{res.resume();ready(record);resolve();});r2.on('error',()=>resolve());r2.on('timeout',()=>{r2.destroy();resolve();});r2.end();}
      else resolve();
    });
    req.end();
  });
}
function ready(record){
  if(record.phase==='ready')return;
  record.phase='ready';record.ready=true;record.triedV6=false;
  if(record.error?.code==='port')record.error=null;
  emitSoon();
  if(record.openOnReady){record.openOnReady=false;openPreview(record.workspace,record.url,{focus:true});}
  else if(record.reload)reloadPreview(record.workspace,record.url,record.name,record.expected);
  else{
    const toasts=require('./toasts.cjs');
    toasts.show({id:'preview-'+record.workspace,kind:'success',title:`«${record.name}» è pronto`,text:new URL(record.url).host,timeout:7000,
      actions:[{label:'Apri anteprima',command:'projectOpenPreview'}]},windows.windowFor(record.workspace)||undefined);
  }
}
async function describePortOwner(record,port){
  const owner=await require('./foreground.cjs').portOwner(port).catch(()=>null);
  if(owner?.name&&record.error?.code==='port'){record.error={...record.error,text:`La porta ${port} è usata da ${owner.name}.`,owner};emitSoon();}
}

/**
 * Apre o ricarica la scheda di anteprima del progetto (una per progetto). Stesso server su un'altra porta o
 * protocollo: la scheda va al nuovo indirizzo, mantenendo la pagina in cui eri.
 */
function openPreview(workspaceName,url,{focus=true}={}){
  const {state}=require('./state.cjs');
  const tabs=require('./tabs.cjs');
  let target;try{target=new URL(url);}catch{return {ok:false,error:'Indirizzo non valido.'};}
  let tab=state.tabs.find(t=>t.id===previewTabs.get(workspaceName));
  if(!tab)tab=state.tabs.find(t=>t.workspace===workspaceName&&!t.isHome&&(()=>{try{const u=new URL(t.url);return D.isLocalHost(u.hostname)&&u.port===target.port;}catch{return false;}})());
  if(tab){
    previewTabs.set(workspaceName,tab.id);
    tab.loadError=null;
    let current;try{current=new URL(tab.url);}catch{current=target;}
    const next=current.origin===target.origin?null:target.origin+current.pathname+current.search+current.hash;
    if(next){tab.url=next;tab.view?.webContents.loadURL(next).catch(()=>{});}
    else if(tab.view&&!tab.view.webContents.isDestroyed())tab.view.webContents.reload();
    const owner=windows.windowForTab(tab);
    if(owner&&focus){tabs.show(owner,tab.id);owner.win.focus();}
    return {ok:true};
  }
  const w=windows.windowFor(workspaceName)||tabs.openWorkspaceWindow(workspaceName);
  if(!w)return {ok:false,error:'Workspace non trovato.'};
  const t=tabs.newTab(target.href,workspaceName,{pane:w.pane});
  if(t)previewTabs.set(workspaceName,t.id);
  if(focus)w.win.focus();
  return {ok:true};
}

/** Il comando che fa da server: quello in esecuzione con un indirizzo, se no il primo con dev/serve/start/preview nel nome. */
function serverIndex(entry){
  const cmds=entry.config.avvio;
  for(let i=0;i<cmds.length;i++){const r=running.get(key(entry.folder,i));if(r&&(r.status==='running'||r.detached)&&r.url)return i;}
  const i=cmds.findIndex(c=>/\b(dev|serve|server|start|preview|watch)\b/i.test(c.nome+' '+c.comando));
  return i>=0?i:(cmds.length?0:-1);
}
/** «Apri anteprima»: se il server è pronto la apre; se si sta avviando la apre appena è pronto; se è spento lo avvia. */
function openOrStartPreview(workspaceName){
  const {entry,error}=usableProject(workspaceName);
  if(error)return {ok:false,error};
  const i=serverIndex(entry);
  const r=i>=0?running.get(key(entry.folder,i)):null;
  if(r&&r.phase==='ready'&&r.url)return openPreview(workspaceName,r.url);
  if(r&&(r.status==='running'||r.detached)){r.openOnReady=true;return {ok:true,waiting:true};}
  if(i>=0)return start(workspaceName,i,{open:true});
  if(entry.config.anteprima)return openPreview(workspaceName,entry.config.anteprima);
  return {ok:false,error:'Nessun comando di avvio né anteprima nel file del progetto.'};
}
/** Riavvia: ferma (anche i processi staccati) e riparte, riaprendo l'anteprima se era aperta. */
function restart(workspaceName,index){
  const entry=projects.get(workspaceName);
  const r=entry&&running.get(key(entry.folder,index));
  const reopen=previewTabs.has(workspaceName);   // la scheda di anteprima si ricarica quando è di nuovo pronto
  if(r&&(r.status==='running'||r.detached))stop(workspaceName,index);
  setTimeout(()=>start(workspaceName,index,{open:reopen}),r?900:0);
  return {ok:true};
}

/**
 * Ricarica le schede dell'anteprima (stessa origine, es. http://localhost:3000) nel workspace.
 * Le schede con la pagina di errore "server spento" tornano così alla pagina vera.
 * Se l'anteprima non è aperta, il toast offre di aprirla.
 */
function reloadPreview(workspaceName,preview,commandName,configured){
  const {state}=require('./state.cjs');
  const toasts=require('./toasts.cjs');
  let target;try{target=new URL(preview);}catch{return;}
  // Stesso indirizzo e porta, anche con http/https diverso: è sempre la stessa anteprima.
  const hosts=new Set([target.host]);
  try{if(configured)hosts.add(new URL(configured).host);}catch{}
  const same=t=>{try{return hosts.has(new URL(t.url).host);}catch{return false;}};
  const open=state.tabs.filter(t=>t.workspace===workspaceName&&!t.isHome&&same(t));
  for(const t of open){
    t.loadError=null;
    const current=new URL(t.url);
    if(current.origin===target.origin){if(t.view&&!t.view.webContents.isDestroyed())t.view.webContents.reload();continue;}
    // Protocollo o porta diversi da quelli del server: stessa pagina, indirizzo giusto.
    const url=target.origin+current.pathname+current.search+current.hash;
    t.url=url;
    if(t.view&&!t.view.webContents.isDestroyed())t.view.webContents.loadURL(url).catch(()=>{});
  }
  const owner=windows.windowFor(workspaceName)||undefined;
  toasts.show(open.length?{id:'preview-'+workspaceName,kind:'success',title:`«${commandName}» è pronto`,
      text:`Anteprima ricaricata (${open.length} ${open.length===1?'scheda':'schede'}).`,timeout:5000}:
    {id:'preview-'+workspaceName,kind:'info',title:`«${commandName}» è pronto`,text:target.origin,timeout:8000,
      actions:[{label:'Apri anteprima',command:'projectOpenPreview'}]},owner);
}

function stop(workspaceName,index){
  const entry=projects.get(workspaceName);
  const record=entry&&running.get(key(entry.folder,index));
  if(!record||!(record.status==='running'||record.detached)||!record.child)return {ok:false,error:'Non è in esecuzione.'};
  record.status='stopped';record.phase='stopped';record.detached=false;clearInterval(record.timer);
  killTree(record.child.pid);
  for(const pid of record.pids||[])if(pid!==record.child.pid)killTree(pid);   // anche i processi rimasti staccati
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
    if((record.status==='running'||record.detached)&&record.child){record.status='stopped';killTree(record.child.pid,true);for(const pid of record.pids||[])killTree(pid,true);}
  }
}

/** Beta 0.23: ferma i comandi di un solo workspace (quando viene eliminato). */
function stopWorkspace(workspaceName){
  const entry=projects.get(workspaceName);
  if(!entry)return;
  for(const [id,record] of running){
    if(id.startsWith(entry.folder+'|')&&(record.status==='running'||record.detached)&&record.child){record.status='stopped';record.phase='stopped';record.detached=false;clearInterval(record.timer);killTree(record.child.pid,true);for(const pid of record.pids||[])killTree(pid,true);}
  }
  emitSoon();
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
    const live=!!record&&(record.status==='running'||record.detached);
    return {index,name:command.nome,command:command.comando,status:record?(record.detached&&record.status!=='stopped'?'running':record.status):'idle',ready:live&&record.phase==='ready',
      exitCode:record?.exitCode??null,lines:record?record.log.lines.slice(-200):[],
      // Beta 0.43: fase, indirizzi, porte, errore riconosciuto.
      phase:record?record.phase:'idle',phaseLabel:D.phaseLabel(record),url:live?record.url:null,network:live?record.network:null,
      ports:live?record.ports:[],error:record?.error||null,warning:live?record.warning:null,detached:!!record?.detached};
  });
}
/** Indirizzo del dev server in esecuzione letto dal log (Beta 0.17.1), se c'è. */
function liveUrl(workspaceName){
  const entry=projects.get(workspaceName);
  if(entry?.status!=='ok')return null;
  for(let index=0;index<entry.config.avvio.length;index++){
    const record=running.get(key(entry.folder,index));
    if((record?.status==='running'||record?.detached)&&record.url)return record.url;
  }
  return null;
}
const anyRunning=()=>[...running.values()].some(r=>r.status==='running'||r.detached);

module.exports={start,stop,stopAll,stopWorkspace,clearLog,openEditor,snapshot,anyRunning,liveUrl,reloadPreview,openPreview,openOrStartPreview,restart};
