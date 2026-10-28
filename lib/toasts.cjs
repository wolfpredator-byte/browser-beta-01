'use strict';

/**
 * Notifiche "toast" in basso a destra (Beta 0.14, mock-up "Notification System").
 *
 * Le pagine web sono WebContentsView SOPRA la cornice, quindi un toast disegnato
 * nella cornice finirebbe sotto il sito. Ogni finestra ha allora un secondo livello
 * trasparente (overlay.html) appoggiato sopra la pagina, grande solo quanto i toast
 * che mostra: fuori da lì i clic arrivano normalmente al sito.
 *
 * Un toast è {id, kind, title, text?, progress?, actions?:[{label,command,args}], timeout?}.
 * Stesso id = stesso toast aggiornato (es. l'avanzamento di un download).
 * I pulsanti eseguono comandi del bus, come i pulsanti della cornice.
 */
const path=require('node:path');
const {ipcMain,WebContentsView}=require('electron');
const {state}=require('./state.cjs');
const windows=require('./windows.cjs');
const {GAP,FOOTER,DOWNLOADS_WIDTH}=require('./window-rules.cjs');

const WIDTH=392,MARGIN=12,MAX_HEIGHT=640;

function overlayOf(w){
  if(w.overlay&&!w.overlay.webContents.isDestroyed())return w.overlay;
  const view=new WebContentsView({webPreferences:{preload:path.join(__dirname,'..','overlay-preload.cjs'),
    sandbox:true,contextIsolation:true,nodeIntegration:false}});
  view.setBackgroundColor('#00000000');
  view.setVisible(false);
  view.setBounds({x:0,y:0,width:1,height:1});
  w.overlay=view;w.overlayHeight=0;
  w.overlayReady=new Promise(resolve=>view.webContents.once('did-finish-load',resolve));
  view.webContents.loadFile(path.join(__dirname,'..','overlay.html'));
  w.win.contentView.addChildView(view);
  w.win.once('closed',()=>{if(!view.webContents.isDestroyed())view.webContents.close();});
  return view;
}

/** Il livello dei toast deve restare sopra la pagina: riaggiungerlo lo porta in cima. */
function bringToFront(w){
  if(w.overlay&&!w.win.isDestroyed())w.win.contentView.addChildView(w.overlay);
}

/** Angolo in basso a destra dell'area della pagina, alto quanto i toast presenti. */
function position(w){
  if(!w.overlay||w.win.isDestroyed())return;
  if(!w.overlayHeight){w.overlay.setVisible(false);return;}
  const [width,height]=w.win.getContentSize();
  const right=(w.downloadsOpen?DOWNLOADS_WIDTH:0)+GAP+MARGIN;
  const bottom=(w.fullscreen?0:FOOTER+GAP)+MARGIN;
  w.overlay.setBounds({x:Math.max(0,width-WIDTH-right),y:Math.max(0,height-bottom-w.overlayHeight),width:WIDTH,height:w.overlayHeight});
  w.overlay.setVisible(true);
  bringToFront(w);
}

/** Mostra (o aggiorna) un toast nella finestra indicata, altrimenti in quella in primo piano. */
async function show(toast,w=windows.focusedWindow()){
  if(!w||w.win.isDestroyed())return;
  const view=overlayOf(w);
  await w.overlayReady;
  if(!view.webContents.isDestroyed())view.webContents.send('overlay:toast',toast);
}

/**
 * Toast di un download, in base al suo stato (web-session.cjs).
 * @param {object} owner - Finestra da cui è partito; se è stata chiusa, quella in primo piano.
 */
const MB=bytes=>(bytes/1048576).toLocaleString('it-IT',{maximumFractionDigits:1});
function download(record,owner){
  const show=toast=>module.exports.show(toast,owner&&!owner.win.isDestroyed()?owner:undefined);
  const id='download-'+record.id;
  if(record.state==='progressing'){
    const percent=record.total>0?Math.min(100,Math.round(100*record.received/record.total)):null;
    show({id,kind:'download',title:record.name,
      text:percent===null?`${MB(record.received)} MB`:`${percent}% · ${MB(record.received)} di ${MB(record.total)} MB`,
      progress:percent,actions:[{label:'Annulla',command:'downloadCancel',args:{id:record.id}}]});
  }else if(record.state==='completed')show({id,kind:'success',title:record.name,text:'Download completato',timeout:8000,
    actions:[{label:'Apri',command:'downloadOpen',args:{id:record.id}},{label:'Mostra',command:'downloadShow',args:{id:record.id}}]});
  else if(record.state==='cancelled')show({id,kind:'error',title:record.name,text:'Download annullato',timeout:5000,
    actions:record.url?[{label:'Riprova',command:'downloadRetry',args:{id:record.id}}]:[]});
  else if(record.state==='interrupted')show({id,kind:'error',title:'Errore di download',text:record.error||`Impossibile scaricare ${record.name}`,timeout:10000,
    actions:record.url?[{label:'Riprova',command:'downloadRetry',args:{id:record.id}}]:[]});
}

/** Collega i messaggi del livello dei toast; il mittente deve essere un nostro overlay. */
function setup(bus){
  const owner=sender=>state.windows.find(w=>w.overlay?.webContents===sender)||null;
  ipcMain.on('overlay:resize',(event,height)=>{
    const w=owner(event.sender);if(!w)return;
    w.overlayHeight=Math.max(0,Math.min(MAX_HEIGHT,Math.round(Number(height)||0)));
    position(w);
  });
  ipcMain.handle('overlay:action',(event,name,args)=>{
    const w=owner(event.sender);
    if(!w)return {ok:false,error:'mittente non autorizzato'};
    return bus.dispatch(name,args,{window:w,source:'toast'});
  });
}

module.exports={setup,show,download,position,bringToFront};
