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
