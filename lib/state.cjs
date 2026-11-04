'use strict';

/**
 * Stato condiviso del processo principale. Un solo oggetto, letto e modificato
 * da windows.cjs, tabs.cjs e commands.cjs: così non esistono copie divergenti.
 *
 * - data: contenuto di browser-data.json (workspace, preferiti, sessione...).
 * - tabs: tutte le schede di tutti i workspace. Una scheda con `view:null`
 *   e `isHome:false` è "dormiente": la pagina viene caricata solo quando la apri.
 * - windows: una voce per finestra aperta; ogni finestra mostra UN workspace,
 *   e uno stesso workspace non può stare in due finestre contemporaneamente.
 * - downloads: download di questa sessione (non salvati su disco).
 */
const state={
  data:null,
  store:null,
  tabs:[],
  windows:[],
  downloads:[],
  nextId:1,
  quitting:false,
  frozen:false, // Beta 0.11: dopo un'importazione nessun salvataggio deve sovrascrivere il backup
  gameWatcher:null // creato in main.cjs (lib/game-watcher.cjs)
};

let saveTimer=null;
/** Beta 0.36: nome del workspace delle finestre in incognito (lib/incognito.cjs). Non si salva mai nulla di suo. */
const INCOGNITO='Navigazione in incognito';
const isIncognitoKey=key=>key===INCOGNITO||String(key).startsWith(INCOGNITO+'#');
/** I dati da scrivere su disco, senza tracce delle finestre in incognito. */
function persistable(data){
  const last=data.workspaceLastActive||{};
  if(!Object.keys(last).some(isIncognitoKey))return data;
  return {...data,workspaceLastActive:Object.fromEntries(Object.entries(last).filter(([k])=>!isIncognitoKey(k)))};
}
/** Salva browser-data.json subito, con il salvataggio atomico di storage.cjs. */
function save(){
  clearTimeout(saveTimer);saveTimer=null;
  if(state.data&&state.store&&!state.frozen)state.store.save(persistable(state.data));
}
/**
 * Salva entro 400ms. Titoli e navigazioni arrivano a raffica: invece di
 * riscrivere il file a ogni evento, lo scriviamo una volta sola.
 */
function saveSoon(){
  if(saveTimer)return;
  saveTimer=setTimeout(save,400);
}
/** Da chiamare all'uscita: scrive subito un eventuale salvataggio in attesa. */
function flushSave(){if(saveTimer)save();}

module.exports={state,save,saveSoon,flushSave,INCOGNITO,persistable};
