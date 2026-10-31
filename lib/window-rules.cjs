'use strict';

/**
 * Regole delle finestre e delle scorciatoie, senza Electron.
 */

/**
 * Altezze fisse della cornice. Devono coincidere con style.css:
 * barra del titolo 30px + toolbar 64px = HEADER; barra schede = FOOTER.
 */
const {frameLayout}=require('./frame-layout-rules.cjs');
const HEADER=94,FOOTER=43;
/** Larghezza della sidebar per modalità; coincide con --side-width in style.css. */
const SIDEBAR_WIDTHS={hidden:0,compact:62,expanded:198};
/** Pannelli laterali: preferiti/cronologia/schede (300px) e download (340px). */
const SIDE_PANEL_WIDTH=300,DOWNLOADS_WIDTH=340;
/**
 * Beta 0.14: la pagina sta in un riquadro staccato dai bordi (come Vivaldi), con
 * lo sfondo VARCO visibile intorno. Coincide con --gap e PAGE_RADIUS in style.css.
 */
const GAP=8,PAGE_RADIUS=10;

/**
 * Calcola lo spazio della pagina web dentro una finestra.
 * @param {{width:number,height:number}} content - Dimensioni interne della finestra.
 * @param {{sidebarMode:string,sidePanelOpen:boolean,downloadsOpen:boolean,fullscreen:boolean}} layout
 */
function pageBounds(content,layout){
  // Con un video a schermo intero la pagina copre tutta la finestra.
  if(layout.fullscreen)return {x:0,y:0,width:Math.max(1,content.width),height:Math.max(1,content.height)};
  // Beta 0.28: barre e schede possono stare su qualunque lato (frame-layout-rules.cjs).
  const f=frameLayout(content,layout.frame,layout.sidebarMode);
  const x=f.left+(layout.sidePanelOpen?SIDE_PANEL_WIDTH:0)+GAP;
  const right=f.right+(layout.downloadsOpen?DOWNLOADS_WIDTH:0)+GAP+(layout.webPanelWidth?layout.webPanelWidth+GAP:0);
  const y=f.top+GAP;
  return {x,y,width:Math.max(1,content.width-x-right),height:Math.max(1,content.height-y-f.bottom-GAP)};
}

/** Beta 0.27: altezza della barra del pannello web (titolo e pulsanti, disegnata dalla cornice). */
const WEB_PANEL_HEAD=40;
/** Il pannello web: una colonna a destra della pagina (a sinistra del cassetto download, se aperto). */
function webPanelBounds(content,layout){
  const width=layout.webPanelWidth||0;
  const f=frameLayout(content,layout.frame,layout.sidebarMode);
  const x=content.width-GAP-f.right-(layout.downloadsOpen?DOWNLOADS_WIDTH:0)-width;
  const y=f.top+GAP+WEB_PANEL_HEAD;
  return {x,y,width,height:Math.max(1,content.height-y-f.bottom-GAP)};
}

/**
 * Verifica che una posizione salvata sia ancora visibile.
 * Con 3 monitor capita di scollegarne uno: in quel caso la finestra non deve
 * aprirsi fuori dallo schermo. Richiediamo almeno 100x50px visibili.
 * @param {{x:number,y:number,width:number,height:number}} bounds
 * @param {Array<{x:number,y:number,width:number,height:number}>} workAreas - Aree utili dei monitor.
 */
function isVisibleOnScreens(bounds,workAreas){
  if(!bounds||![bounds.x,bounds.y,bounds.width,bounds.height].every(Number.isFinite))return false;
  return workAreas.some(area=>{
    const w=Math.min(bounds.x+bounds.width,area.x+area.width)-Math.max(bounds.x,area.x);
    const h=Math.min(bounds.y+bounds.height,area.y+area.height)-Math.max(bounds.y,area.y);
    return w>=100&&h>=50;
  });
}

/**
 * Traduce un tasto premuto in un comando del bus.
 * Funziona sia nella cornice sia dentro i siti (Electron passa lo stesso input).
 * @param {{type:string,key:string,control:boolean,shift:boolean,alt:boolean,meta?:boolean}} input
 * @returns {string|null} nome del comando, oppure null se il tasto va lasciato al sito.
 */
function shortcutCommand(input){
  if(input?.type!=='keyDown')return null;
  const key=String(input.key||'');
  const lower=key.toLowerCase();
  const ctrl=!!input.control,shift=!!input.shift,alt=!!input.alt;
  if(key==='F12'&&!ctrl&&!alt)return 'toggleDevTools';
  if(key==='F11'&&!ctrl&&!alt&&!shift)return 'toggleZen'; // Beta 0.19: modalità zen
  if(key==='F5'&&!alt)return 'reload';
  // Beta 0.11: palette dei comandi. Non Ctrl+K: Discord, GitHub e Slack lo usano già.
  if(key==='F1'&&!ctrl&&!alt&&!shift)return 'openPalette';
  if(ctrl&&shift&&!alt){
    if(lower==='t')return 'reopenClosedTab';
    if(lower==='i')return 'toggleDevTools';
    if(lower==='p')return 'openPalette';
    if(lower==='a')return 'openTabManager'; // Beta 0.24: cerca tra le schede (come in Chrome)
    if(key==='+')return 'zoomIn';
    return null;
  }
  if(ctrl&&!alt){
    if(lower==='t')return 'newTab';
    if(lower==='w')return 'closeActiveTab';
    if(lower==='r')return 'reload';
    if(lower==='l')return 'focusAddress';
    if(lower==='n')return 'newWindow';
    if(lower==='f')return 'openFind';
    if(lower==='p')return 'print';
    if(lower==='o')return 'openFileDialog'; // Beta 0.20: apri un file nel visualizzatore
    if(key===',')return 'openSettings';
    // Zoom: "+" può arrivare come "=" (stesso tasto senza Shift) o dal tastierino.
    if(key==='+'||key==='='||key==='Add')return 'zoomIn';
    if(key==='-'||key==='Subtract')return 'zoomOut';
    if(key==='0')return 'zoomReset';
    return null;
  }
  if(alt&&!ctrl&&!shift){
    if(key==='ArrowLeft')return 'back';
    if(key==='ArrowRight')return 'forward';
  }
  return null;
}

/**
 * Beta 0.18: vista divisa. Divide lo spazio della pagina in due riquadri separati
 * da GAP pixel (lo spazio in cui la cornice disegna il divisore).
 * @param {{x:number,y:number,width:number,height:number}} full - pageBounds della finestra.
 * @param {number} ratio - Quota del riquadro sinistro (0.2–0.8).
 */
function splitRects(full,ratio){
  const r=Math.min(0.8,Math.max(0.2,Number(ratio)||0.5));
  const usable=Math.max(2,full.width-GAP);
  const leftWidth=Math.round(usable*r);
  return {left:{x:full.x,y:full.y,width:leftWidth,height:full.height},
    right:{x:full.x+leftWidth+GAP,y:full.y,width:usable-leftWidth,height:full.height},
    divider:{x:full.x+leftWidth,y:full.y,width:GAP,height:full.height}};
}
module.exports={splitRects,GAP,PAGE_RADIUS,HEADER,FOOTER,SIDEBAR_WIDTHS,SIDE_PANEL_WIDTH,DOWNLOADS_WIDTH,WEB_PANEL_HEAD,pageBounds,webPanelBounds,isVisibleOnScreens,shortcutCommand};
