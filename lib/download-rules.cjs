'use strict';

/**
 * Regole dei download, senza Electron.
 *
 * Electron mostra la sua finestra "Salva con nome" se la destinazione non viene
 * decisa SUBITO, dentro l'evento will-download. Per chiederti prima "Vuoi salvare
 * questo file?" senza due finestre insieme, il file parte subito verso una
 * cartella temporanea e viene spostato (o cancellato) dopo la tua risposta.
 */
const path=require('node:path');

/** Nome sicuro per Windows: niente percorsi né caratteri vietati, mai vuoto. */
function safeFilename(name){
  // Ultimo pezzo dopo / o \ (non path.basename: su Windows leggerebbe "a:" come un disco).
  const clean=String(name||'').split(/[\\/]/).pop().replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').trim().slice(0,180);
  return clean&&clean!=='.'&&clean!=='..'?clean:'download';
}

/**
 * Primo nome libero nella cartella: file.jpg, file (1).jpg, file (2).jpg…
 * @param {string} folder
 * @param {string} filename
 * @param {(fullPath:string)=>boolean} exists
 */
function uniquePath(folder,filename,exists){
  const extension=path.extname(filename),stem=path.basename(filename,extension);
  let candidate=path.join(folder,filename),n=1;
  while(exists(candidate))candidate=path.join(folder,`${stem} (${n++})${extension}`);
  return candidate;
}

/**
 * Cosa fare quando arriva un evento: la risposta dell'utente e la fine del
 * download possono arrivare in qualunque ordine.
 * @param {{decision:null|'save'|'cancel',finished:null|'completed'|'cancelled'|'interrupted'}} d
 * @returns {'wait'|'move'|'discard'|'cancel'|'none'}
 *   wait: aspettare l'altro evento · move: spostare il file finito nella destinazione
 *   discard: cancellare il file temporaneo · cancel: interrompere il download in corso
 */
function nextStep({decision,finished}){
  if(decision==='cancel')return finished===null?'cancel':finished==='completed'?'discard':'none';
  if(decision==='save')return finished==='completed'?'move':finished===null?'wait':'none';
  return finished==='completed'||finished===null?'wait':'none';
}

module.exports={safeFilename,uniquePath,nextStep};
