'use strict';

/**
 * Regole del gaming companion, senza Electron.
 * Un gioco è {id, name, exe, workspace, sites[], display, alwaysOnTop, closeOnExit, enabled}.
 */
const {safeUrl,looksLikeAddress}=require('./web-rules.cjs');

const MAX_SITES=10;
/** Solo il nome del file, es. destiny2.exe: niente percorsi né caratteri strani. */
const EXE_PATTERN=/^[\w .()+-]{1,80}\.exe$/i;

/**
 * Legge l'output di `tasklist /fo csv /nh`.
 * Le righe che non iniziano con " (es. "INFO: nessuna attività…", tradotto
 * nella lingua di Windows) vengono ignorate.
 * @returns {Array<{name:string,pid:number,session:string}>}
 */
function parseTasklistCsv(text){
  const result=[];
  for(const line of String(text).split(/\r?\n/)){
    if(!line.startsWith('"'))continue;
    const cells=[...line.matchAll(/"((?:[^"]|"")*)"/g)].map(m=>m[1].replace(/""/g,'"'));
    if(cells.length<3)continue;
    result.push({name:cells[0],pid:Number(cells[1]),session:cells[2]});
  }
  return result;
}

/**
 * Confronta i giochi in esecuzione prima e adesso.
 * @param {Set<number>} wasRunning - ID dei giochi già rilevati.
 * @param {Set<string>} processNames - Nomi dei processi attivi, in minuscolo.
 * @param {Array<object>} games - Giochi configurati.
 * @returns {{started:object[],stopped:object[],running:Set<number>}}
 */
function diffRunning(wasRunning,processNames,games){
  const running=new Set(),started=[],stopped=[];
  for(const game of games){
    if(!game.enabled)continue;
    if(processNames.has(game.exe.toLowerCase())){
      running.add(game.id);
      if(!wasRunning.has(game.id))started.push(game);
    }else if(wasRunning.has(game.id))stopped.push(game);
  }
  // Un gioco disattivato mentre era in esecuzione viene considerato terminato.
  for(const game of games)if(!game.enabled&&wasRunning.has(game.id))stopped.push(game);
  return {started,stopped,running};
}

/**
 * Valida i dati inseriti nel pannello Giochi.
 * @param {object} input - {name, exe, workspace, sites (testo, uno per riga), display?, alwaysOnTop, closeOnExit}
 * @param {string[]} workspaces - Nomi dei workspace esistenti.
 * @returns {{ok:true,game:object}|{ok:false,error:string}}
 */
function normalizeGame(input,workspaces){
  const name=String(input.name||'').trim().slice(0,60);
  if(!name)return {ok:false,error:'Scrivi il nome del gioco.'};
  const exe=String(input.exe||'').trim().split(/[\\/]/).pop();
  if(!EXE_PATTERN.test(exe))return {ok:false,error:'Eseguibile non valido: serve un nome tipo destiny2.exe.'};
  if(!workspaces.includes(input.workspace))return {ok:false,error:'Scegli un workspace esistente.'};
  const lines=String(input.sites||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(lines.length>MAX_SITES)return {ok:false,error:`Al massimo ${MAX_SITES} siti per gioco.`};
  const sites=[];
  for(const line of lines){
    if(!looksLikeAddress(line))return {ok:false,error:`«${line.slice(0,40)}» non è un indirizzo.`};
    const url=safeUrl(line);
    if(url&&!sites.includes(url))sites.push(url);
  }
  return {ok:true,game:{name,exe,workspace:input.workspace,sites,
    display:Number.isInteger(input.display)?input.display:null,
    alwaysOnTop:!!input.alwaysOnTop,closeOnExit:!!input.closeOnExit}};
}

/**
 * Siti del gioco non ancora aperti nel workspace. Confrontiamo l'origine
 * (https://app.destinyitemmanager.com): DIM cambia percorso mentre lo usi,
 * ma resta lo stesso sito e non va riaperto.
 */
function missingSites(sites,openUrls){
  const origin=url=>{try{return new URL(url).origin;}catch{return null;}};
  const open=new Set(openUrls.map(origin).filter(Boolean));
  return sites.filter(site=>!open.has(origin(site)));
}

/**
 * Nomi leggibili dei monitor: numerati da sinistra a destra, come li vedi sulla scrivania.
 * @param {Array<{id:number,bounds:{x:number,y:number,width:number,height:number}}>} displays
 * @param {number} primaryId
 */
function displayLabels(displays,primaryId){
  return [...displays].sort((a,b)=>a.bounds.x-b.bounds.x||a.bounds.y-b.bounds.y).map((d,i)=>({
    id:d.id,
    label:`Monitor ${i+1} — ${d.bounds.width}×${d.bounds.height}${d.id===primaryId?' (principale)':''}`
  }));
}

module.exports={parseTasklistCsv,diffRunning,normalizeGame,missingSites,displayLabels,MAX_SITES};
