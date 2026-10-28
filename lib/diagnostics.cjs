'use strict';

/**
 * Registro degli errori e diagnostica (Beta 0.11). Gli ultimi 100 errori
 * restano in memoria (mai su disco): "Copia la diagnostica" li mette negli
 * appunti insieme a versioni, memoria e impostazioni, da incollare in una
 * segnalazione. Token e segreti non vengono mai inclusi.
 */
const os=require('node:os');
const {app}=require('electron');
const {state}=require('./state.cjs');

const MAX=100;
const entries=[];

/** Una riga del registro; dello stack teniamo solo le prime righe. */
function record(level,parts){
  const text=parts.map(p=>p instanceof Error?(p.stack||p.message).split('\n').slice(0,4).join('\n'):
    typeof p==='string'?p:safeJson(p)).join(' ').slice(0,1500);
  entries.push({time:Date.now(),level,text});
  if(entries.length>MAX)entries.splice(0,entries.length-MAX);
}
const safeJson=value=>{try{return JSON.stringify(value);}catch{return String(value);}};

/** Intercetta console.error/warn e i processi che si chiudono da soli. */
function install(){
  for(const level of ['error','warn']){
    const original=console[level].bind(console);
    console[level]=(...parts)=>{record(level,parts);original(...parts);};
  }
  process.on('uncaughtException',error=>record('error',['Eccezione non gestita',error]));
  app.on('render-process-gone',(_e,contents,details)=>{
    let host='';try{host=new URL(contents.getURL()).host;}catch{}
    record('error',[`Pagina chiusa inaspettatamente (${details.reason}, codice ${details.exitCode})`,host]);
  });
  app.on('child-process-gone',(_e,details)=>{
    if(details.reason!=='clean-exit')record('error',[`Processo ${details.type} chiuso (${details.reason}, codice ${details.exitCode})`]);
  });
}

const count=()=>entries.filter(e=>e.level==='error').length;

/** Testo leggibile per gli appunti. */
function report(){
  const {data}=state;
  const metrics=app.getAppMetrics();
  const mb=kb=>Math.round(kb/1024);
  const privateKb=metrics.reduce((sum,m)=>sum+(m.memory.privateBytes||m.memory.workingSetSize||0),0);
  const s=data.settings;
  const lines=[
    `Personal Browser ${app.getVersion()} · Electron ${process.versions.electron} · Chromium ${process.versions.chrome} · Node ${process.versions.node}`,
    `${os.type()} ${os.release()} (${os.arch()}) · ${app.isPackaged?'installato':'sviluppo'} · attivo da ${Math.round(process.uptime()/60)} min`,
    `Memoria: ${mb(privateKb)} MB in ${metrics.length} processi (${metrics.map(m=>`${m.type} ${mb(m.memory.privateBytes||m.memory.workingSetSize||0)}`).join(', ')})`,
    `Finestre: ${state.windows.length} · schede: ${state.tabs.length} (caricate ${state.tabs.filter(t=>t.view).length}) · workspace: ${data.workspaces.length}`,
    `Impostazioni: ricerca ${s.searchEngine}, background ${s.runInBackground}, giochi ${s.gameWatcher} (${data.games.length}), `+
      `JARVIS ${s.jarvis.enabled}, blocco pubblicità ${s.adblock.enabled} (${s.adblock.allowlist.length} eccezioni), sospensione ${s.sleepAfterMinutes} min`,
    '',
    entries.length?`Ultimi messaggi (${entries.length}):`:'Nessun errore registrato in questa sessione.',
    ...entries.map(e=>`[${new Date(e.time).toLocaleString('it-IT')}] ${e.level==='error'?'ERRORE':'avviso'} ${e.text}`)
  ];
  return lines.join('\n');
}

module.exports={install,record,report,count,entries};
