'use strict';

/**
 * Sessione Chromium condivisa dalle pagine: permessi, user agent e download.
 */
const path=require('node:path');
const fs=require('node:fs');
const {app,dialog,session,shell}=require('electron');
const {state}=require('./state.cjs');
const windows=require('./windows.cjs');
const toasts=require('./toasts.cjs');
const {PARTITION,cleanUserAgent,userAgentFor,firefoxHeaders}=require('./web-rules.cjs');
const permissions=require('./permissions.cjs');
const adblock=require('./adblock.cjs');
const {safeFilename,uniquePath,nextStep}=require('./download-rules.cjs');

/** Trova la finestra che contiene la pagina che ha avviato un download. */
function windowOfPage(contents){
  const tab=state.tabs.find(t=>t.view?.webContents===contents);
  return (tab&&windows.windowForTab(tab))||windows.focusedWindow();
}

function setupWebSession(){
  const ses=session.fromPartition(PARTITION);
  // Permessi sito per sito (permissions.cjs) e blocco di pubblicità e tracker (adblock.cjs).
  permissions.setup(ses);
  require('./passwords.cjs').setup(); // Beta 0.25: salvataggio e compilazione delle password
  adblock.setup(ses);
  require('./file-viewer.cjs').setup(ses); // Beta 0.20: varco-view:// per il visualizzatore di file
  ses.setUserAgent(cleanUserAgent(ses.getUserAgent(),app.getName()));
  // Script prima delle pagine web: oggi serve solo a completare l'identità Firefox
  // sul login Google (vedi page-preload.cjs). La cornice ha il suo preload separato.
  ses.registerPreloadScript({type:'frame',id:'page-preload',filePath:path.join(__dirname,'..','page-preload.cjs')});
  // Beta 0.26: estensioni Chrome e Chrome Web Store (extensions.cjs).
  require('./extensions.cjs').setup(ses).catch(error=>require('./diagnostics.cjs').record('error',['Estensioni',error]));
  // Login Google: intestazioni da Firefox (vedi FIREFOX_UA in web-rules.cjs).
  ses.webRequest.onBeforeSendHeaders({urls:['https://accounts.google.com/*']},(details,callback)=>{
    callback({requestHeaders:firefoxHeaders(details.requestHeaders)});
  });

  // Il file parte subito verso una cartella temporanea: così Electron non apre la
  // sua finestra "Salva con nome" insieme alla nostra domanda. Dopo la risposta
  // il file viene spostato nella destinazione scelta, oppure cancellato.
  ses.on('will-download',(_event,item,contents)=>{
    const owner=windowOfPage(contents);
    const filename=safeFilename(item.getFilename());
    const id=Date.now()+'-'+Math.random().toString(36).slice(2,8);
    fs.mkdirSync(tempFolder(),{recursive:true});
    const tempPath=path.join(tempFolder(),id+'-'+filename);
    // Deve avvenire qui, in modo sincrono: è ciò che evita la finestra di Electron.
    item.setSavePath(tempPath);
    const record={id,name:filename,state:'waiting',received:0,total:item.getTotalBytes(),path:'',url:item.getURL()};
    const flow={decision:null,finished:null,destination:'',tempPath};
    items.set(id,{item,record,flow,owner}); // owner: la finestra che riceve i toast del download
    state.downloads.unshift(record);state.downloads=state.downloads.slice(0,40);
    windows.emitAll();
    item.on('updated',(_e,s)=>{
      record.received=item.getReceivedBytes();record.total=item.getTotalBytes();
      // Finché non rispondi resta "in attesa di conferma", anche se sta già scaricando.
      if(flow.decision==='save')record.state=s==='interrupted'?'interrupted':'progressing';
      emitSoon();
    });
    item.once('done',(_e,s)=>{flow.finished=s;record.received=item.getReceivedBytes();advance(id);});
    ask(id,owner,filename).catch(e=>{console.error('Download prompt failed',e);flow.decision='cancel';advance(id);});
  });
  return ses;
}

const tempFolder=()=>path.join(app.getPath('temp'),'personal-browser-downloads');
/** id → {item, record, flow}: serve ai pulsanti del pannello Download. */
const items=new Map();
let emitTimer=null;
/** L'avanzamento arriva molte volte al secondo: aggiorniamo la cornice al massimo 4 volte. */
function emitSoon(){if(!emitTimer)emitTimer=setTimeout(()=>{
  emitTimer=null;windows.emitAll();
  // Toast con l'avanzamento (Beta 0.14), allo stesso ritmo della cornice.
  for(const {record,owner} of items.values())if(record.state==='progressing')toasts.download(record,owner);
},250);}

async function ask(id,owner,filename){
  const parent=owner?.win;
  const {record,flow}=items.get(id);
  const suggested=uniquePath(app.getPath('downloads'),filename,fs.existsSync);
  const options={type:'question',icon:'download',title:'Download',message:'Vuoi salvare questo file?',
    detail:filename+'\nIn: '+path.dirname(suggested),
    buttons:['Annulla','Salva in…','Salva'],defaultId:2,cancelId:0,primaryId:2,noLink:true};
  const usable=parent&&!parent.isDestroyed();
  // Beta 0.15: dialogo VARCO. Risposte: 2=Salva, 1=Salva in…, 0=Annulla.
  const decision=await require('./popup.cjs').dialog(usable?owner:null,options);
  if(decision.response===0){flow.decision='cancel';return advance(id);}
  let destination=suggested;
  if(decision.response===1){
    const selected=usable?await dialog.showSaveDialog(parent,{title:'Salva in…',defaultPath:suggested,buttonLabel:'Salva'}):
      await dialog.showSaveDialog({title:'Salva in…',defaultPath:suggested,buttonLabel:'Salva'});
    if(selected.canceled||!selected.filePath){flow.decision='cancel';return advance(id);}
    destination=selected.filePath;
  }
  flow.decision='save';flow.destination=destination;record.path=destination;
  if(!flow.finished)record.state='progressing';
  advance(id);
}

/** Applica il passo giusto quando arriva la risposta o la fine del download. */
function advance(id){
  const entry=items.get(id);
  if(!entry)return;
  const {item,record,flow}=entry;
  const step=nextStep(flow);
  if(step==='cancel'){item.cancel();record.state='cancelled';}
  else if(step==='discard'){fs.rm(flow.tempPath,{force:true},()=>{});record.state='cancelled';}
  else if(step==='move'){
    try{moveFile(flow.tempPath,flow.destination);record.state='completed';}
    catch(e){record.state='interrupted';record.error='Impossibile spostare il file: '+e.message;}
  }else if(step==='none'&&flow.finished)record.state=flow.finished;
  windows.emitAll();
  toasts.download(record,entry.owner);
}

/** rename non funziona tra dischi diversi (es. Download su D:): allora copia e cancella. */
function moveFile(from,to){
  try{fs.renameSync(from,to);}
  catch(e){if(e.code!=='EXDEV')throw e;fs.copyFileSync(from,to);fs.rmSync(from,{force:true});}
}

// ── Pulsanti del pannello Download ───────────────────────────────────────
function openDownload(id){const r=items.get(id)?.record;if(r?.state==='completed')shell.openPath(r.path);}
function showDownload(id){const r=items.get(id)?.record;if(r?.state==='completed')shell.showItemInFolder(r.path);}
function cancelDownload(id){
  const entry=items.get(id);
  if(!entry||entry.flow.finished)return;
  entry.flow.decision='cancel';advance(id);
}
/** Toast "Riprova" (Beta 0.14): riparte lo stesso indirizzo, con la stessa domanda Salva/Annulla. */
function retryDownload(id){
  const r=items.get(id)?.record;
  if(!r?.url||!['cancelled','interrupted'].includes(r.state))return {ok:false,error:'Niente da riprovare.'};
  session.fromPartition(PARTITION).downloadURL(r.url);
  return {ok:true};
}
/** Beta 0.15: toglie un download dall'elenco (il file resta dov'è). */
function removeDownload(id){
  const entry=items.get(id);
  if(!entry||['waiting','progressing'].includes(entry.record.state))return {ok:false,error:'Il download è ancora in corso.'};
  items.delete(id);state.downloads=state.downloads.filter(r=>r!==entry.record);windows.emitAll();
  return {ok:true};
}
/** Beta 0.15: cancella il file scaricato dal disco (dopo la conferma nel menu) e lo toglie dall'elenco. */
function deleteDownloadFile(id){
  const r=items.get(id)?.record;
  if(r?.state!=='completed'||!r.path)return {ok:false,error:'Nessun file da eliminare.'};
  try{fs.rmSync(r.path,{force:true});}catch(e){return {ok:false,error:String(e.message||e)};}
  return removeDownload(id);
}
/** Il record di un download (per il menu del click destro). */
const downloadRecord=id=>items.get(id)?.record||null;
/** Toglie dall'elenco i download finiti (i file restano dove sono). */
function clearFinished(){
  state.downloads=state.downloads.filter(r=>['waiting','progressing'].includes(r.state));
  for(const [id,entry] of items)if(!state.downloads.includes(entry.record))items.delete(id);
  windows.emitAll();
}


/**
 * Anche il JavaScript della pagina deve vedere Firefox (navigator.userAgent),
 * altrimenti Google nota che intestazioni e pagina non coincidono.
 * Va chiamata per ogni pagina e per ogni popup.
 */
function applyIdentity(contents){
  const normal=()=>session.fromPartition(PARTITION).getUserAgent();
  contents.on('did-start-navigation',(details,legacyUrl,_inPlace,legacyMainFrame)=>{
    const url=details?.url??legacyUrl,mainFrame=details?.isMainFrame??legacyMainFrame;
    if(!mainFrame||!url)return;
    const wanted=userAgentFor(url,normal());
    if(contents.getUserAgent()!==wanted)contents.setUserAgent(wanted);
  });
}

module.exports={removeDownload,deleteDownloadFile,downloadRecord,retryDownload,setupWebSession,applyIdentity,openDownload,showDownload,cancelDownload,clearFinished};
