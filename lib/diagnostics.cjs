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
    console[level]=(...parts)=>{
      const first=typeof parts[0]==='string'?parts[0]:'';
      // Electron ripete come avviso di Node ogni pagina che non si carica:
      // l'errore è già registrato da tabs.cjs (did-fail-load), quindi non lo doppiamo.
      if(!/electron: Failed to load URL/.test(first))record(first.startsWith('(node:')?'warn':level,parts);
      original(...parts);
    };
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
  // Per ogni processo delle pagine, i siti che contiene: "Tab 995 (localhost:3000)".
  const sites=new Map();
  for(const t of state.tabs){
    if(!t.view||t.view.webContents.isDestroyed())continue;
    let host='';try{host=new URL(t.url).host;}catch{}
    const pid=t.view.webContents.getOSProcessId();
    sites.set(pid,[...new Set([...(sites.get(pid)||[]),host])]);
  }
  const label=m=>`${m.type} ${mb(m.memory.privateBytes||m.memory.workingSetSize||0)}${sites.has(m.pid)?` (${sites.get(m.pid).join(', ')})`:''}`;
  const lines=[
    `Personal Browser ${app.getVersion()} · Electron ${process.versions.electron} · Chromium ${process.versions.chrome} · Node ${process.versions.node}`,
    `${os.type()} ${os.release()} (${os.arch()}) · ${app.isPackaged?'installato':'sviluppo'} · attivo da ${Math.round(process.uptime()/60)} min`,
    `Memoria: ${mb(privateKb)} MB in ${metrics.length} processi (${metrics.map(label).join(', ')})`,
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
