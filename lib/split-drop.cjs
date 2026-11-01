'use strict';

/**
 * Trascinare una scheda sulla pagina (Beta 0.28): un livello trasparente sopra le pagine vive.
 * Le pagine sono WebContentsView e stanno sopra la cornice, quindi la cornice non può disegnarci
 * sopra e non riceve il trascinamento. Questo livello (split-drop.html) sì: sta sopra le pagine,
 * riceve il trascinamento iniziato nella barra delle schede e mostra la zona dove finirà la scheda,
 * mentre sotto le pagine restano vive e nitide.
 */
const path=require('node:path');
const {WebContentsView,ipcMain}=require('electron');
const {state}=require('./state.cjs');

let wired=false;
function wire(){
  if(wired)return;
  wired=true;
  ipcMain.on('splitdrop:drop',(event,zone)=>{
    const w=state.windows.find(x=>x.splitDrop?.view.webContents===event.sender);
    const drop=w?.splitDrop;
    close(w);
    if(drop&&typeof zone==='string')drop.onDrop(zone);
  });
}

function viewOf(w){
  if(w.splitDropView&&!w.splitDropView.webContents.isDestroyed())return w.splitDropView;
  const view=new WebContentsView({webPreferences:{preload:path.join(__dirname,'..','split-drop-preload.cjs'),
    sandbox:true,contextIsolation:true,nodeIntegration:false}});
  view.setBackgroundColor('#00000000');
  w.splitDropView=view;
  w.splitDropReady=new Promise(resolve=>view.webContents.once('did-finish-load',resolve));
  view.webContents.loadFile(path.join(__dirname,'..','split-drop.html'));
  w.win.once('closed',()=>{if(!view.webContents.isDestroyed())view.webContents.close();});
  return view;
}

/**
 * @param {{full:object,zones:object}} info - Area delle pagine e rettangolo di ogni lato (coordinate della finestra).
 * @param {(zone:string)=>void} onDrop
 */
async function open(w,info,onDrop){
  wire();
  const view=viewOf(w);
  const f=info.full;
  // Zone relative al livello, che copre esattamente l'area delle pagine.
  const zones=Object.fromEntries(Object.entries(info.zones).map(([k,r])=>[k,r&&{x:r.x-f.x,y:r.y-f.y,width:r.width,height:r.height}]));
  w.splitDrop={view,onDrop};
  view.setBounds(f);
  w.win.contentView.addChildView(view); // in cima, sopra le pagine
  await w.splitDropReady;
  if(w.splitDrop?.view===view)view.webContents.send('splitdrop:info',{zones});
}
function close(w){
  if(!w?.splitDrop)return;
  const {view}=w.splitDrop;
  w.splitDrop=null;
  try{w.win.contentView.removeChildView(view);}catch{}
}

module.exports={open,close};
