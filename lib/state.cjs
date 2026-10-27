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
  gameWatcher:null // creato in main.cjs (lib/game-watcher.cjs)
};

let saveTimer=null;
/** Salva browser-data.json subito, con il salvataggio atomico di storage.cjs. */
function save(){
  clearTimeout(saveTimer);saveTimer=null;
  if(state.data&&state.store)state.store.save(state.data);
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

module.exports={state,save,saveSoon,flushSave};
