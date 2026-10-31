'use strict';

/**
 * Screenshot della pagina (Beta 0.28). Ctrl+Shift+S (o tasto destro → Screenshot) apre una
 * sovrapposizione disegnata dalla cornice: trascini per scegliere un'area, oppure scegli
 * "Pagina visibile" o "Pagina intera". L'immagine va negli appunti; la notifica permette di salvarla.
 * La pagina intera si cattura con il protocollo DevTools (Page.captureScreenshot oltre la parte visibile).
 */
const fs=require('node:fs');
const path=require('node:path');
const {app,clipboard,dialog,nativeImage}=require('electron');
const windows=()=>require('./windows.cjs');
const tabs=()=>require('./tabs.cjs');

const MAX_HEIGHT=16000; // oltre, l'immagine sarebbe enorme: la pagina intera si ferma qui

function activePage(w){
  const t=tabs().activeTab(w);
  return t&&!t.isHome&&t.view&&!t.view.webContents.isDestroyed()?t:null;
}

/** Apre la sovrapposizione: foto della parte visibile come sfondo, su cui scegliere l'area. */
async function open(w){
  const t=activePage(w);
  if(!t)return {ok:false,error:'Apri una pagina web per fare uno screenshot.'};
  const image=await t.view.webContents.capturePage();
  w.shot={image,bounds:t.view.getBounds(),title:t.title||'pagina'};
  windows().sendUi(w,{type:'shot',open:true,image:'data:image/png;base64,'+image.toPNG().toString('base64'),bounds:w.shot.bounds});
  windows().layout(w); // la pagina vera si nasconde sotto la sovrapposizione
  return {ok:true};
}
function close(w){
  if(!w.shot)return;
  w.shot=null;
  windows().sendUi(w,{type:'shot',open:false});
  windows().layout(w);
}

/** Pagina intera: misura il documento e chiede a Chromium di fotografarlo tutto. */
async function fullPage(contents){
  const dbg=contents.debugger;
  const attached=dbg.isAttached();
  if(!attached)dbg.attach('1.3');
  try{
    const metrics=await dbg.sendCommand('Page.getLayoutMetrics');
    const size=metrics.cssContentSize||metrics.contentSize;
    const width=Math.ceil(size.width),height=Math.min(MAX_HEIGHT,Math.ceil(size.height));
    const shot=await dbg.sendCommand('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height,scale:1}});
    return nativeImage.createFromBuffer(Buffer.from(shot.data,'base64'));
  }finally{if(!attached)try{dbg.detach();}catch{}}
}

/**
 * Esegue lo screenshot. area: rettangolo in coordinate della finestra (dalla cornice).
 * @param {'visible'|'full'|'area'} mode
 */
async function take(w,mode,area){
  const shot=w.shot,t=activePage(w);
  close(w);
  if(!t||!shot)return {ok:false,error:'Pagina non disponibile.'};
  let image=shot.image;
  if(mode==='full')image=await fullPage(t.view.webContents);
  if(mode==='area'&&area){
    // L'immagine è in pixel veri dello schermo: la scala tiene conto dello zoom di Windows.
    const scale=image.getSize().width/shot.bounds.width;
    const rect={x:Math.round((area.x-shot.bounds.x)*scale),y:Math.round((area.y-shot.bounds.y)*scale),
      width:Math.round(area.width*scale),height:Math.round(area.height*scale)};
    if(rect.width<4||rect.height<4)return {ok:false,error:'Area troppo piccola.'};
    image=image.crop(rect);
  }
  clipboard.writeImage(image);
  w.lastShot={image,title:shot.title};
  const {width,height}=image.getSize();
  require('./toasts.cjs').show({id:'shot',kind:'success',title:'Screenshot copiato',text:`${width}×${height} · incollalo dove vuoi`,timeout:8000,
    actions:[{label:'Salva…',command:'saveScreenshot'}]},w);
  return {ok:true};
}

async function save(w){
  const last=w?.lastShot;
  if(!last)return {ok:false,error:'Nessuno screenshot da salvare.'};
  const stamp=new Date().toLocaleString('it-IT').replace(/[/:]/g,'.').replace(',','');
  const name=`VARCO ${stamp}.png`;
  const r=await dialog.showSaveDialog(w.win,{title:'Salva lo screenshot',defaultPath:path.join(app.getPath('pictures'),name),
    filters:[{name:'Immagine PNG',extensions:['png']}]});
  if(r.canceled||!r.filePath)return {ok:true,cancelled:true};
  fs.writeFileSync(r.filePath,last.image.toPNG());
  return {ok:true,file:r.filePath};
}

module.exports={open,close,take,save};
