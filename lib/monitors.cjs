'use strict';

/**
 * Monitor delle API: "controlla questo indirizzo, guarda questo campo,
 * avvisami quando cambia". Esempio: la versione del Manifest di Destiny 2,
 * che cambia dopo ogni patch e richiede di rigenerare i dati del sito.
 *
 * Un solo timer per tutti i monitor, una volta al minuto: decide quali sono
 * "scaduti" in base al loro intervallo (minimo 5 minuti).
 */
const {net}=require('electron');
const {state,saveSoon}=require('./state.cjs');
const windows=require('./windows.cjs');
const projects=require('./projects.cjs');
const tray=require('./tray.cjs');
const {fillPlaceholders,readField}=require('./project-rules.cjs');

let timer=null;
const checking=new Set();

const store=folder=>(state.data.monitorState[folder]??={});

/** Esegue un controllo e registra valore, errore e cambiamento. */
async function check(workspaceName,monitor){
  const entry=projects.get(workspaceName);
  if(!projects.isUsable(entry))return;
  const id=entry.folder+'|'+monitor.nome;
  if(checking.has(id))return;
  checking.add(id);
  const record=store(entry.folder)[monitor.nome]??={value:null,checkedAt:0,changedAt:0,error:null,previous:null};
  try{
    const secrets=projects.secretValues(workspaceName);
    const url=fillPlaceholders(monitor.url,secrets);
    const headers={},missing=[...url.missing];
    for(const [name,template] of Object.entries(monitor.header)){
      const filled=fillPlaceholders(template,secrets);
      headers[name]=filled.value;missing.push(...filled.missing);
    }
    if(missing.length)throw Error('Imposta il segreto '+[...new Set(missing)].join(', '));
    // net.fetch usa la sessione predefinita: niente cookie delle tue pagine.
    const response=await net.fetch(url.value,{headers,signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error(`HTTP ${response.status}`);
    let value;
    if(monitor.campo){
      const field=readField(await response.json(),monitor.campo);
      if(field===undefined)throw Error(`Campo «${monitor.campo}» non trovato nella risposta`);
      value=typeof field==='string'?field:JSON.stringify(field);
    }else value='raggiungibile';
    value=String(value).slice(0,200);
    if(record.value!==null&&record.value!==value){
      record.previous=record.value;record.changedAt=Date.now();
      tray.notify(`${monitor.nome} è cambiato`,`${entry.config.nome||workspaceName}: ${record.previous} → ${value}`);
    }
    record.value=value;record.error=null;
  }catch(error){
    record.error=error.name==='TimeoutError'?'Nessuna risposta in 15 secondi':String(error.message||error);
  }finally{
    record.checkedAt=Date.now();
    checking.delete(id);
    saveSoon();windows.emitAll();
  }
}

/** Controlla i monitor scaduti di tutti i progetti utilizzabili. */
function checkDue(){
  const now=Date.now();
  for(const [workspaceName,entry] of projects.projects){
    if(!projects.isUsable(entry))continue;
    for(const monitor of entry.config.monitor){
      const last=state.data.monitorState[entry.folder]?.[monitor.nome]?.checkedAt||0;
      if(now-last>=monitor.intervalloMinuti*60000)check(workspaceName,monitor);
    }
  }
}

function start(){if(!timer){timer=setInterval(checkDue,60000);checkDue();}}
function stop(){clearInterval(timer);timer=null;}

/** "Controlla ora" dal pannello. */
function checkNow(workspaceName,name){
  const entry=projects.get(workspaceName);
  const monitor=entry?.config?.monitor.find(m=>m.nome===name);
  if(!monitor)return {ok:false,error:'Monitor non trovato.'};
  if(!projects.isUsable(entry))return {ok:false,error:'Prima conferma di fidarti di questo progetto.'};
  check(workspaceName,monitor);
  return {ok:true};
}

/** Stato dei monitor di un progetto, per il pannello. */
function snapshot(workspaceName){
  const entry=projects.get(workspaceName);
  if(entry?.status!=='ok')return [];
  const saved=state.data.monitorState[entry.folder]||{};
  return entry.config.monitor.map(m=>({name:m.nome,host:new URL(m.url).host,field:m.campo,
    minutes:m.intervalloMinuti,headers:Object.keys(m.header),...(saved[m.nome]||{}),checking:checking.has(entry.folder+'|'+m.nome)}));
}

module.exports={start,stop,checkNow,snapshot};
