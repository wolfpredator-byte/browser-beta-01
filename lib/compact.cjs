'use strict';

/**
 * Modalità compatta (Beta 0.28, come "UI Auto-Hide" di Vivaldi): la pagina va da bordo a bordo e
 * le barre compaiono SOPRA la pagina quando porti il mouse sul bordo dove stanno, senza spostarla.
 *
 * Le pagine sono WebContentsView, sempre sopra la cornice: la cornice non può disegnarci sopra.
 * Per questo, quando una barra deve comparire:
 *   1. fotografiamo le pagine visibili (capturePage);
 *   2. la cornice mette le foto esattamente al loro posto e fa entrare la barra sopra;
 *   3. solo allora nascondiamo le pagine vere (che sono identiche alla foto).
 * Quando il mouse lascia la barra, le pagine vere tornano e la foto sparisce.
 *
 * Il bordo si controlla dalla posizione del mouse (ogni 60 ms, solo con la modalità attiva):
 * così la pagina può arrivare fino al bordo della finestra.
 */
const {screen}=require('electron');
const {state}=require('./state.cjs');
const {frameLayout}=require('./frame-layout-rules.cjs');
const windows=()=>require('./windows.cjs');

const TRIGGER=3;   // px dal bordo della finestra che aprono la barra
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
  if(p.y<TRIGGER&&f.top)return 'top';
  if(p.y>=height-TRIGGER&&f.bottom)return 'bottom';
  if(p.x<TRIGGER&&f.left)return 'left';
  if(p.x>=width-TRIGGER&&f.right)return 'right';
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
const busy=w=>w.fullscreen||w.zen||w.glance||w.shot||w.paletteOpen||w.splitDragging||w.win.isMinimized();

/** Fotografa le pagine visibili (quella attiva e, in vista divisa, le altre) e le manda alla cornice. */
async function capture(w,side){
  const views=[w.attached,...w.splitViews].filter(v=>v&&!v.webContents.isDestroyed());
  const shots=[];
  for(const view of views){
    // JPEG: codificarlo costa pochi ms (il PNG a tutto schermo quasi 200) e la foto resta sotto la barra per poco.
    try{const image=await view.webContents.capturePage();shots.push({image:'data:image/jpeg;base64,'+image.toJPEG(90).toString('base64'),bounds:view.getBounds()});}catch{}
  }
  if(w.compactPeek?.side!==side)return; // nel frattempo si è richiusa
  windows().sendUi(w,{type:'compactPeek',side,shots});
}
function open(w,side){
  if(w.compactPeek)return;
  w.compactPeek={side,ready:false,leftAt:0,activeId:w.activeId};
  capture(w,side);
}
/**
 * Hai cambiato scheda dalla barra aperta: la foto sotto è vecchia. La pagina nuova torna visibile
 * un istante (una pagina nascosta non si può fotografare) e si rifà la foto.
 */
function refresh(w){
  const peek=w.compactPeek;
  peek.activeId=w.activeId;peek.ready=false;
  windows().layout(w);
  setTimeout(()=>{if(w.compactPeek===peek&&!w.win.isDestroyed())capture(w,peek.side);},120);
}
/** La cornice ha disegnato le foto: ora si possono nascondere le pagine vere. */
function ready(w){
  if(!w?.compactPeek||w.compactPeek.ready)return;
  w.compactPeek.ready=true;
  windows().layout(w);
}
function close(w){
  if(!w.compactPeek)return;
  const wasReady=w.compactPeek.ready;
  w.compactPeek=null;
  windows().sendUi(w,{type:'compactPeek',side:null});
  // La barra esce scorrendo sopra la foto, poi tornano le pagine vere.
  if(wasReady)setTimeout(()=>{if(!w.win.isDestroyed()&&!w.compactPeek)windows().layout(w);},150);
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
    if(busy(w)){if(w.compactPeek)close(w);continue;}
    const p=w.win.isFocused()||w.compactPeek?pointer(w):null;
    if(!w.compactPeek){
      const side=p&&sideAt(w,p);
      if(side)open(w,side);
      continue;
    }
    const peek=w.compactPeek;
    if(peek.ready&&peek.activeId!==w.activeId)refresh(w);
    if(w.compactHold||require('./popup.cjs').isOpen(w)||(p&&insideBar(w,p,peek.side))){peek.leftAt=0;continue;}
    if(!peek.leftAt)peek.leftAt=Date.now();
    else if(Date.now()-peek.leftAt>LEAVE_MS)close(w);
  }
}
/** Accende o spegne il controllo del mouse (solo quando la modalità è attiva). */
function sync(){
  if(enabled()&&!timer)timer=setInterval(tick,60);
  if(!enabled()&&timer){clearInterval(timer);timer=null;for(const w of state.windows)if(w.compactPeek)close(w);}
}

module.exports={sync,ready,close,hold,enabled};
