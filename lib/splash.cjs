'use strict';

/**
 * Schermata di caricamento all'avvio (Beta 0.13). Compare subito; le finestre
 * del browser nascono nascoste e si mostrano quando la loro cornice è pronta,
 * poi la schermata si chiude. Così non si vede mai una finestra vuota.
 * Non compare all'avvio con Windows (--background): lì non si apre nessuna finestra.
 */
const path=require('node:path');
const {BrowserWindow}=require('electron');

/** Tempo minimo a schermo: evita un lampo di pochi millisecondi. */
const MIN_MS=600;
/** Se qualcosa va storto, la schermata non resta mai aperta oltre questo tempo. */
const MAX_MS=8000;

let splash=null,openedAt=0,failsafe=null;

function open(){
  splash=new BrowserWindow({width:460,height:320,frame:false,resizable:false,movable:true,show:false,
    center:true,skipTaskbar:false,backgroundColor:'#07070e',title:'VARCO',
    icon:path.join(__dirname,'..','assets','app-icon.png'),
    webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
  splash.once('ready-to-show',()=>splash?.show());
  splash.loadFile(path.join(__dirname,'..','splash.html'));
  // Beta 0.23: logo e colori del preset del workspace attivo (la pagina non ha script: basta il CSS).
  try{
    const appearance=require('./appearance.cjs');
    const workspace=require('./state.cjs').state.data.activeWorkspace;
    const vars=require('./appearance-rules.cjs').cssVariables(appearance.effective(workspace));
    const logo=appearance.snapshot(workspace).logo;
    splash.setIcon(appearance.iconFile(workspace));
    splash.webContents.insertCSS(`img{content:url("${logo}")${logo.includes('presets')?';-webkit-mask:none;mask:none':''}}
      img{filter:drop-shadow(0 0 26px rgba(${vars['--v-accent-rgb']},.6))}
      body{background:radial-gradient(ellipse 70% 45% at 50% 70%,rgba(${vars['--v-accent-rgb']},.28),transparent 70%),linear-gradient(180deg,${vars['--v-bg']},#050508);border-color:rgba(${vars['--v-accent-2-rgb']},.28)}
      .bar i{background:linear-gradient(90deg,${vars['--v-accent']},${vars['--v-accent-alt']})}`);
  }catch{} // in caso di problemi resta la schermata VARCO
  splash.on('closed',()=>{splash=null;clearTimeout(failsafe);});
  openedAt=Date.now();
  failsafe=setTimeout(close,MAX_MS);
}

/** true mentre la schermata è aperta: le finestre nuove nascono nascoste. */
const active=()=>!!splash;

/** Una finestra del browser è pronta: chiude la schermata (rispettando il tempo minimo). */
function close(){
  if(!splash)return;
  const wait=Math.max(0,MIN_MS-(Date.now()-openedAt));
  setTimeout(()=>{if(splash&&!splash.isDestroyed())splash.close();},wait);
}

module.exports={open,close,active};
