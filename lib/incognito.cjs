'use strict';

/**
 * Beta 0.36 — navigazione in incognito (Ctrl+Shift+N).
 * Le finestre in incognito sono un workspace speciale che NON sta in data.workspaces: non compare
 * negli elenchi, non viene salvato e non ha dati suoi. Le sue schede usano una sessione solo in
 * memoria (partizione senza "persist:"): cookie, cache e accessi spariscono alla chiusura
 * dell'ultima finestra in incognito, che cancella anche la sessione.
 * Niente cronologia, niente schede chiuse da riaprire, niente proposta di salvare password.
 */
const {session}=require('electron');
const {state,INCOGNITO}=require('./state.cjs');

const NAME=INCOGNITO;
const PARTITION='varco-incognito'; // senza "persist:" → solo in memoria
const is=name=>name===NAME;
const isSession=ses=>!!ses&&ses===session.fromPartition(PARTITION);

/** Apre una finestra in incognito (una in più se ce n'è già una). */
function open(){
  const windows=require('./windows.cjs'),tabs=require('./tabs.cjs');
  const used=windows.windowsOf(NAME).map(w=>w.pane);
  let pane=0;while(used.includes(pane))pane++;
  const w=tabs.openWorkspaceWindow(NAME,{},pane);
  return w?{ok:true}:{ok:false};
}

/** Chiusa una finestra: se era l'ultima in incognito, via schede e dati della sessione. */
function onWindowClosed(w){
  if(!is(w.workspace))return;
  const windows=require('./windows.cjs');
  if(windows.windowsOf(NAME).length)return;
  for(let i=state.tabs.length-1;i>=0;i--){
    const t=state.tabs[i];
    if(!is(t.workspace))continue;
    try{if(t.view&&!t.view.webContents.isDestroyed())t.view.webContents.close();}catch{}
    state.tabs.splice(i,1);
  }
  for(const key of Object.keys(state.data.workspaceLastActive||{}))if(key===NAME||key.startsWith(NAME+'#'))delete state.data.workspaceLastActive[key];
  const ses=session.fromPartition(PARTITION);
  ses.clearStorageData().catch(()=>{});
  ses.clearCache().catch(()=>{});
  ses.clearAuthCache?.().catch?.(()=>{});
}

module.exports={NAME,PARTITION,is,isSession,open,onWindowClosed};
