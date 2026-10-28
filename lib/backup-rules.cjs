'use strict';

/**
 * Esporta e importa i dati del browser (Beta 0.11), senza Electron.
 *
 * Nel file esportato NON finiscono i segreti dei progetti (sono cifrati con il
 * tuo account Windows e altrove non servono) né le fiducie nei progetti:
 * importando un file, i comandi dei progetti chiedono di nuovo conferma.
 * Così un backup ricevuto da altri non può far partire comandi da solo.
 */
const {normalize}=require('./storage.cjs');

const FORMAT='personal-browser-backup';
/** Campi legati a questo PC: restano quelli attuali anche dopo un'importazione. */
const LOCAL_ONLY=['secrets','trustedProjects'];

/** Contenuto del file di backup. */
function exportPayload(data,version,now=Date.now()){
  const copy=JSON.parse(JSON.stringify(data));
  for(const key of LOCAL_ONLY)delete copy[key];
  return {format:FORMAT,version,exportedAt:new Date(now).toISOString(),data:copy};
}

/**
 * Legge un backup e lo prepara per sostituire i dati attuali.
 * @param {string} text - Contenuto del file.
 * @param {object} current - Dati attuali (da cui si tengono segreti e fiducie).
 * @returns {{ok:true,data:object,summary:string}|{ok:false,error:string}}
 */
function parseBackup(text,current){
  let parsed;
  try{parsed=JSON.parse(text);}catch{return {ok:false,error:'Il file non è un JSON valido.'};}
  if(parsed?.format!==FORMAT||!parsed.data||typeof parsed.data!=='object')
    return {ok:false,error:'Non è un backup di Personal Browser.'};
  if(!Array.isArray(parsed.data.workspaces)||!parsed.data.workspaces.every(w=>typeof w?.name==='string'&&w.name.trim()))
    return {ok:false,error:'Il backup non contiene workspace validi.'};
  const data=JSON.parse(JSON.stringify(parsed.data));
  for(const key of LOCAL_ONLY)data[key]=JSON.parse(JSON.stringify(current?.[key]||{}));
  normalize(data);
  const summary=`${data.workspaces.length} workspace, ${data.bookmarks.length} preferiti, ${data.games.length} giochi, `+
    `${(data.sessionTabs||[]).length} schede salvate · esportato il ${String(parsed.exportedAt||'?').slice(0,10)}`+
    (parsed.version?` dalla versione ${parsed.version}`:'');
  return {ok:true,data,summary};
}

module.exports={FORMAT,exportPayload,parseBackup};
