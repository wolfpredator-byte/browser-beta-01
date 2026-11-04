'use strict';

/**
 * Beta 0.36 — anteprima di un sito al passaggio del mouse sui preferiti e sui più visitati della Home.
 * Una piccola WebContentsView (420×280, pagina rimpicciolita al 50%) sopra la Home, nella sessione del
 * workspace: si vede il sito vero, con i tuoi accessi. Non riceve clic (è solo da guardare) e si chiude
 * quando il mouse esce dal riquadro. Una sola per finestra, riusata da un sito all'altro.
 */
const {WebContentsView}=require('electron');

const W=420,H=280,ZOOM=0.5;
const isWeb=url=>/^https?:\/\//i.test(url||'');

function show(w,{url,x,y}){
  if(!w||w.win.isDestroyed()||!isWeb(url))return {ok:false};
  const webSession=require('./web-session.cjs');
  webSession.sessionFor(w.workspace);
  const partition=webSession.partitionFor(w.workspace);
  if(w.sitePreview&&w.sitePreview.partition!==partition)hide(w);
  if(!w.sitePreview){
    const view=new WebContentsView({webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,partition,
      backgroundThrottling:false}});
    view.setBorderRadius(12);
    view.webContents.setAudioMuted(true);
    view.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    view.webContents.on('did-finish-load',()=>{try{view.webContents.setZoomFactor(ZOOM);}catch{}});
    view.webContents.on('before-input-event',e=>e.preventDefault()); // solo da guardare
    require('./web-session.cjs').applyIdentity(view.webContents);
    w.sitePreview={view,partition,url:''};
  }
  const p=w.sitePreview;
  const [cw,ch]=w.win.getContentSize();
  // Sotto il riquadro del sito, o sopra se non c'è spazio; sempre dentro la finestra.
  const left=Math.round(Math.min(Math.max(8,x-W/2),cw-W-8));
  const top=Math.round(y+H+8>ch?Math.max(8,y-H-60):y);
  p.view.setBounds({x:left,y:top,width:W,height:H});
  if(!w.win.contentView.children.includes(p.view))w.win.contentView.addChildView(p.view);
  p.view.setVisible(true);
  if(p.url!==url){p.url=url;p.view.webContents.loadURL(url).catch(()=>{});}
  return {ok:true};
}

function hide(w){
  const p=w?.sitePreview;
  if(!p)return;
  p.view.setVisible(false);
}

/** Finestra chiusa o workspace cambiato: via la pagina. */
function destroy(w){
  const p=w?.sitePreview;
  if(!p)return;
  w.sitePreview=null;
  try{if(!w.win.isDestroyed())w.win.contentView.removeChildView(p.view);}catch{}
  try{p.view.webContents.close();}catch{}
}

module.exports={show,hide,destroy};
