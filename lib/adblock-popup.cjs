'use strict';

/**
 * Finestrella dello scudo (Beta 0.45): cliccando lo scudo accanto all'indirizzo si apre sotto di lui,
 * sopra la pagina (livello di menu e dialoghi, popup.cjs). Mostra quanto è stato bloccato nella pagina,
 * il modo del blocco sul sito (normale, compatibile, spento) con la durata, e i più bloccati.
 * «Dettagli e permessi» apre il pannello del sito; «Registro e liste» le impostazioni del blocco.
 */
const {state}=require('./state.cjs');
const tabs=()=>require('./tabs.cjs');
const adblock=()=>require('./adblock.cjs');

function data(w){
  const t=tabs().activeTab(w);
  if(!t||t.isHome||!t.view)return null;
  return {kind:'site',...adblock().snapshot(t.url,t.view.webContents.id)};
}

/** x, y: dove sta lo scudo nella finestra (la finestrella si apre lì sotto). */
function open(w,{x=80,y=96}={},bus){
  const first=data(w);
  if(!first)return {ok:false,error:'Apri un sito per vedere il blocco.'};
  require('./popup.cjs').card(w,{...first,x,y},async payload=>{
    const now=data(w);if(!now)return null;
    if(payload.a==='mode'&&['normal','compat','off'].includes(payload.mode)){
      adblock().setSiteMode(now.host,payload.mode,['1h','session','always'].includes(payload.duration)?payload.duration:'always');
      return {...data(w),x,y};
    }
    if(payload.a==='enable'){adblock().setEnabled(true);return {...data(w),x,y};}
    if(payload.a==='details'){setTimeout(()=>bus?.dispatch('openSidePanel',{panel:'site'},{window:w,source:'popup'}),0);return null;}
    if(payload.a==='settings'){setTimeout(()=>bus?.dispatch('adblockOpenSettings',{},{window:w,source:'popup'}),0);return null;}
    return null;
  });
  return {ok:true};
}

module.exports={open};
