'use strict';

/**
 * Modalità compatta (Beta 0.28, come "UI Auto-Hide" di Vivaldi): la pagina va da bordo a bordo e
 * le barre compaiono quando porti il mouse sul bordo dove stanno.
 *
 * Le pagine sono WebContentsView, sempre sopra la cornice: la cornice non può disegnarci sopra.
 * Fino alla 0.35 la pagina veniva sostituita da una sua foto mentre la barra era aperta (e i video
 * sembravano fermi). Beta 0.36: la pagina vera scivola di lato quanto la barra, senza cambiare misura
 * (windows.cjs → shifted, frame-layout-rules.cjs → peekShift), e la barra compare nello spazio liberato.
 *
 * Il bordo si controlla dalla posizione del mouse (ogni 60 ms, solo con la modalità attiva):
 * così la pagina può arrivare fino al bordo della finestra. Quanto è largo il bordo si sceglie
 * nelle Impostazioni (COMPACT_EDGES). I pulsanti della finestra (–, □, ×) compaiono solo con la barra in alto.
 */
const {screen}=require('electron');
const {state}=require('./state.cjs');
const {frameLayout,COMPACT_EDGES}=require('./frame-layout-rules.cjs');
const windows=()=>require('./windows.cjs');

const trigger=()=>COMPACT_EDGES[state.data.layout?.compactEdge]||COMPACT_EDGES.medio; // px dal bordo che aprono la barra
const MARGIN=16;   // px oltre la barra prima che si richiuda
const LEAVE_MS=280;
let timer=null;

const enabled=()=>!!state.data.layout?.compact;

/** Le barre per lato (in px), con la disposizione attuale della finestra. */
function bars(w){
  const [width,height]=w.win.getContentSize();
  return {width,height,f:frameLayout({width,height},state.data.layout,w.sidebarMode)};
}
/** Il mouse in coordinate della finestra (o null se è fuori). */
function pointer(w){
  const p=screen.getCursorScreenPoint(),b=w.win.getContentBounds();
  const x=p.x-b.x,y=p.y-b.y;
  return x>=0&&y>=0&&x<b.width&&y<b.height?{x,y}:null;
}
function sideAt(w,p){
  const {width,height,f}=bars(w);
  const edge=trigger();
  if(p.y<edge&&f.top)return 'top';
  if(p.y>=height-edge&&f.bottom)return 'bottom';
  if(p.x<edge&&f.left)return 'left';
  if(p.x>=width-edge&&f.right)return 'right';
  return null;
}
/** Il mouse è ancora sulla barra aperta (o poco oltre)? */
function insideBar(w,p,side){
  const {width,height,f}=bars(w);
  if(side==='top')return p.y<f.top+MARGIN;
  if(side==='bottom')return p.y>height-f.bottom-MARGIN;
  if(side==='left')return p.x<f.left+MARGIN;
  return p.x>width-f.right-MARGIN;
}
const busy=w=>w.fullscreen||w.zen||w.glance||w.shot||w.paletteOpen||w.splitDragging||w.webPanelDragging||w.win.isMinimized();

/** Pulsanti della finestra (Windows): nascosti in modalità compatta, visibili con la barra in alto. */
const CONTROLS={color:'#00000000',symbolColor:'#e9e8f5',height:30};
function syncControls(w){
  if(process.platform!=='win32'||w.win.isDestroyed()||typeof w.win.setTitleBarOverlay!=='function')return;
  const show=!enabled()||w.compactPeek?.side==='top';
  if(w.controlsShown===show)return;
  w.controlsShown=show;
  try{w.win.setTitleBarOverlay(show?CONTROLS:{...CONTROLS,symbolColor:'#00000000',height:1});}catch{}
}
function open(w,side){
  if(w.compactPeek)return;
  w.compactPeek={side,ready:true,leftAt:0};
  windows().sendUi(w,{type:'compactPeek',side,shots:[]});
  windows().layout(w,{animate:true});
  syncControls(w);
}
/** Compatibilità con la cornice della 0.35 (foto): non serve più. */
function ready(){}
function close(w){
  if(!w.compactPeek)return;
  w.compactPeek=null;
  windows().sendUi(w,{type:'compactPeek',side:null});
  if(!w.win.isDestroyed()){windows().layout(w,{animate:true});syncControls(w);}
}
/** La cornice trattiene le barre aperte mentre scrivi (barra degli indirizzi, ricerca nella pagina). */
function hold(w,on){
  if(!w)return;
  w.compactHold=!!on;
  if(on&&enabled()&&!w.compactPeek)open(w,'top');
}

function tick(){
  if(!enabled()){for(const w of state.windows)if(w.compactPeek)close(w);return;}
  for(const w of state.windows){
    if(w.win.isDestroyed())continue;
    syncControls(w);
    if(busy(w)){if(w.compactPeek)close(w);continue;}
    const p=w.win.isFocused()||w.compactPeek?pointer(w):null;
    if(!w.compactPeek){
      const side=p&&sideAt(w,p);
      if(side)open(w,side);
      continue;
    }
    const peek=w.compactPeek;
    if(w.compactHold||require('./popup.cjs').isOpen(w)||(p&&insideBar(w,p,peek.side))){peek.leftAt=0;continue;}
    if(!peek.leftAt)peek.leftAt=Date.now();
    else if(Date.now()-peek.leftAt>LEAVE_MS)close(w);
  }
}
/** Accende o spegne il controllo del mouse (solo quando la modalità è attiva). */
function sync(){
  if(enabled()&&!timer)timer=setInterval(tick,60);
  if(!enabled()&&timer){clearInterval(timer);timer=null;for(const w of state.windows)if(w.compactPeek)close(w);}
  for(const w of state.windows)syncControls(w);
}

module.exports={sync,ready,close,hold,enabled,syncControls};
