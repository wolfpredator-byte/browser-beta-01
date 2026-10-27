'use strict';

/**
 * Lettura dei processi di Windows con `tasklist` (incluso in Windows, niente
 * permessi di amministratore). Tempi misurati su Windows 11:
 *   tasklist /fi "IMAGENAME eq x.exe"   ~95ms
 *   tasklist completo                    ~360ms
 * Con pochi giochi conviene una domanda mirata per gioco; con molti, l'elenco completo.
 */
const {execFile}=require('node:child_process');
const {parseTasklistCsv}=require('./game-rules.cjs');

/** Oltre questo numero di giochi, un elenco completo costa meno di tante domande. */
const TARGETED_LIMIT=3;

function tasklist(args){
  return new Promise((resolve,reject)=>{
    execFile('tasklist',['/fo','csv','/nh',...args],{windowsHide:true,timeout:15000,maxBuffer:4*1024*1024},
      (error,stdout)=>error?reject(error):resolve(parseTasklistCsv(stdout)));
  });
}

/**
 * @param {string[]} exeNames - Eseguibili da cercare, in minuscolo.
 * @returns {Promise<Set<string>>} quelli attivi, in minuscolo.
 */
async function findRunning(exeNames){
  if(process.platform!=='win32'||!exeNames.length)return new Set();
  if(exeNames.length>TARGETED_LIMIT){
    const all=await tasklist([]);
    return new Set(all.map(p=>p.name.toLowerCase()).filter(name=>exeNames.includes(name)));
  }
  const found=new Set();
  // In sequenza, non in parallelo: un solo processo tasklist alla volta.
  for(const name of exeNames){
    const rows=await tasklist(['/fi',`IMAGENAME eq ${name}`]);
    if(rows.some(p=>p.name.toLowerCase()===name))found.add(name);
  }
  return found;
}

/**
 * Programmi aperti dall'utente, per scegliere l'eseguibile mentre il gioco è avviato.
 * Esclude i servizi di Windows (sessione "Services") e i duplicati.
 */
async function userProcessNames(){
  if(process.platform!=='win32')return [];
  const all=await tasklist([]);
  const names=new Set(all.filter(p=>p.session!=='Services'&&/\.exe$/i.test(p.name)).map(p=>p.name));
  return [...names].sort((a,b)=>a.localeCompare(b,'it',{sensitivity:'base'}));
}

module.exports={findRunning,userProcessNames,TARGETED_LIMIT};
