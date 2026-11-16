'use strict';

/**
 * Beta 0.37.1 — vista del lettore multimediale sopra la pagina (design "4b · Vetro VARCO", design/explore/lettore-final).
 *
 * Le pagine web stanno SOPRA la cornice: la scheda che compare passando il mouse su una sorgente nella barra
 * e il lettore completo (dock) sono quindi un livello trasparente a parte (media-overlay.html), come i toast.
 * È grande solo quanto ciò che mostra: fuori i clic arrivano al sito.
 *
 * w.mediaOv = {mode:null|'card'|'dock', key, anchorX, height, hovered}
 *  - card: la scheda di UNA sorgente, sopra la sua copertina nella barra (resta finché il mouse è lì o sulla scheda);
 *  - dock: il lettore completo (elenco + dettaglio + barra verticale), ancorato a destra sopra la barra.
 */
const path=require('node:path');
const {ipcMain,WebContentsView}=require('electron');
const {state}=require('./state.cjs');
const {GAP,FOOTER}=require('./window-rules.cjs');

const DOCK_W=720,DOCK_H=390,CARD_W=300,MARGIN=10;
const windows=()=>require('./windows.cjs');

function viewOf(w){
  if(w.mediaView&&!w.mediaView.webContents.isDestroyed())return w.mediaView;
  const view=new WebContentsView({webPreferences:{preload:path.join(__dirname,'..','media-overlay-preload.cjs'),
    sandbox:true,contextIsolation:true,nodeIntegration:false}});
  view.setBackgroundColor('#00000000');
  view.setVisible(false);
  view.setBounds({x:0,y:0,width:1,height:1});
  w.mediaView=view;
  w.mediaOv=w.mediaOv||{mode:null};
  w.mediaReady=new Promise(resolve=>view.webContents.once('did-finish-load',()=>{require('./appearance.cjs').applyTo(view.webContents,w.workspace);resolve();}));
  view.webContents.loadFile(path.join(__dirname,'..','media-overlay.html'));
  // Clic fuori (sulla pagina o sulla cornice): il lettore completo si chiude, come un menu.
  view.webContents.on('blur',()=>{if(w.mediaOv?.mode==='dock'){w.mediaOv.blurredAt=Date.now();hide(w);}});
  w.win.contentView.addChildView(view);
  w.win.once('closed',()=>{if(!view.webContents.isDestroyed())view.webContents.close();});
  return view;
}

/** Posizione e dimensioni della vista secondo la modalità. */
function position(w){
  const ov=w.mediaOv;
  if(!w.mediaView||w.win.isDestroyed()||!ov?.mode){w.mediaView?.setVisible(false);return;}
  const [width,height]=w.win.getContentSize();
  const bottom=height-(w.fullscreen?0:FOOTER)-GAP;
  let bounds;
  if(ov.mode==='dock'){
    const dw=Math.min(DOCK_W,width-2*MARGIN),dh=Math.min(DOCK_H,bottom-100);
    bounds={x:Math.max(MARGIN,width-dw-MARGIN-GAP),y:Math.max(0,bottom-dh),width:dw,height:dh};
  }else{
    const h=Math.max(60,Math.min(320,ov.height||210));
    const x=Math.max(MARGIN,Math.min(width-CARD_W-MARGIN,(ov.anchorX||width)-CARD_W+24));
    bounds={x,y:Math.max(0,bottom-h-2),width:CARD_W,height:h};
  }
  w.mediaView.setBounds(bounds);
  w.mediaView.setVisible(true);
  w.win.contentView.addChildView(w.mediaView); // in cima, sopra pagina, pannelli e toast
}

/** Manda alla vista lo stato attuale (sorgenti, modalità, finestrella automatica). */
function send(w){
  if(!w.mediaView||w.mediaView.webContents.isDestroyed()||!w.mediaOv?.mode)return;
  const snap=require('./media.cjs').snapshot(w);
  w.mediaView.webContents.send('mediaov:state',require('./icon-urls.cjs').rewrite({mode:w.mediaOv.mode,key:w.mediaOv.key||null,
    media:snap.media,autoPip:snap.mediaAutoPip}));
}

async function show(w,mode,{key=null,anchorX=0}={}){
  viewOf(w);
  w.mediaOv={...w.mediaOv,mode,key,anchorX,hovered:false};
  clearTimeout(w.mediaOv.hideTimer);
  await w.mediaReady;
  if(w.mediaOv.mode!==mode)return; // nel frattempo è cambiato
  send(w);position(w);
  if(mode==='dock')w.mediaView.webContents.focus();
}
function hide(w){
  if(!w.mediaOv)return;
  clearTimeout(w.mediaOv.hideTimer);
  w.mediaOv.mode=null;
  w.mediaView?.setVisible(false);
  windows().sendUi(w,{type:'mediaOverlay',mode:null});
}

/** Scheda di una sorgente (mouse sulla sua copertina nella barra). */
function card(w,key,anchorX){
  if(w.mediaOv?.mode==='dock')return {ok:true}; // il lettore completo ha la precedenza
  if(w.mediaOv?.mode==='card'&&w.mediaOv.key===key){clearTimeout(w.mediaOv.hideTimer);return {ok:true};}
  show(w,'card',{key,anchorX});
  return {ok:true};
}
/** Il mouse lascia la copertina: la scheda resta se il mouse è passato sulla scheda stessa. */
function cardLeave(w){
  if(w.mediaOv?.mode!=='card')return {ok:true};
  clearTimeout(w.mediaOv.hideTimer);
  w.mediaOv.hideTimer=setTimeout(()=>{if(w.mediaOv?.mode==='card'&&!w.mediaOv.hovered)hide(w);},280);
  return {ok:true};
}
/** Lettore completo: apre o chiude. */
function toggleDock(w,key=null){
  if(w.mediaOv?.mode==='dock'){hide(w);return {ok:true};}
  // Il clic che ha tolto il focus al lettore (e quindi l'ha chiuso) non deve riaprirlo subito.
  if(Date.now()-(w.mediaOv?.blurredAt||0)<250)return {ok:true};
  show(w,'dock',{key});
  return {ok:true};
}

/** Dopo ogni cambiamento dei media: aggiorna le viste aperte (e chiude la scheda di una sorgente sparita). */
function refreshAll(){
  for(const w of state.windows){
    if(!w.mediaOv?.mode)continue;
    if(w.mediaOv.mode==='card'&&!require('./media.cjs').live().some(e=>e.key===w.mediaOv.key)){hide(w);continue;}
    send(w);
  }
}

function setup(bus){
  const owner=sender=>state.windows.find(w=>w.mediaView?.webContents===sender)||null;
  ipcMain.handle('mediaov:action',(event,name,args)=>{
    const w=owner(event.sender);
    if(!w)return {ok:false,error:'mittente non autorizzato'};
    return bus.dispatch(name,args,{window:w,source:'media'});
  });
  ipcMain.on('mediaov:resize',(event,height)=>{
    const w=owner(event.sender);if(!w||w.mediaOv?.mode!=='card')return;
    w.mediaOv.height=Math.round(Number(height)||0);position(w);
  });
  ipcMain.on('mediaov:hover',(event,inside)=>{
    const w=owner(event.sender);if(!w?.mediaOv)return;
    w.mediaOv.hovered=!!inside;
    if(!inside)cardLeave(w);else clearTimeout(w.mediaOv.hideTimer);
  });
  ipcMain.on('mediaov:close',event=>{const w=owner(event.sender);if(w)hide(w);});
}

module.exports={setup,position,card,cardLeave,toggleDock,hide,refreshAll};
