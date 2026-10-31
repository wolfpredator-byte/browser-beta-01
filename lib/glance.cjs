'use strict';

/**
 * Anteprima dei link (Beta 0.27, come Peek di Arc e Glance di Zen).
 * Shift+clic su un link apre la pagina in un riquadro sopra quella attuale, che resta
 * sfocata sullo sfondo. Esc o un clic fuori chiude; "Apri in scheda" la trasforma in una
 * scheda vera senza ricaricarla (stessa pagina, stessa posizione, stessi accessi).
 *
 * La pagina dell'anteprima è una WebContentsView sopra le altre; sfondo sfocato, barra e
 * pulsanti li disegna la cornice (renderer.js), come per la palette.
 */
const {WebContentsView,ipcMain}=require('electron');
const {state}=require('./state.cjs');
const {PARTITION,isWebUrl}=require('./web-rules.cjs');
const {pageBounds}=require('./window-rules.cjs');
const motion=require('./motion.cjs');

const windows=()=>require('./windows.cjs');
const BAR=46; // spazio sopra il riquadro per la barra con titolo e pulsanti

/** Il riquadro dell'anteprima: l'86% dell'area della pagina, con la barra sopra. */
function rectFor(w){
  const [width,height]=w.win.getContentSize();
  const page=pageBounds({width,height},{sidebarMode:w.sidebarMode,sidePanelOpen:!!w.sidePanelOpen,downloadsOpen:w.downloadsOpen,fullscreen:w.fullscreen||w.zen});
  const cardWidth=Math.round(Math.min(page.width*.86,Math.max(page.width-80,320)));
  return {x:page.x+Math.round((page.width-cardWidth)/2),y:page.y+BAR+8,width:cardWidth,height:Math.max(200,page.height-BAR-24)};
}

async function open(w,url){
  if(!w||!isWebUrl(url))return;
  if(w.glance)close(w);
  const backdrop=await require('./palette.cjs').backdrop(w);
  const view=new WebContentsView({webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,partition:PARTITION}});
  const contents=view.webContents;
  w.glance={view,url,title:''};
  require('./web-session.cjs').applyIdentity(contents);
  // Esc dentro l'anteprima la chiude; le altre scorciatoie funzionano come nelle schede.
  contents.on('before-input-event',(event,input)=>{
    if(input.type==='keyDown'&&input.key==='Escape'&&!input.control&&!input.alt){event.preventDefault();close(w);}
  });
  windows().registerShortcuts(contents);
  // Un link che vuole una nuova finestra, dall'anteprima, diventa una scheda.
  contents.setWindowOpenHandler(({url:target})=>{
    if(isWebUrl(target))require('./tabs.cjs').newTab(target,w.workspace,{pane:w.pane});
    return {action:'deny'};
  });
  const update=()=>{if(w.glance?.view===view){w.glance.url=contents.getURL()||w.glance.url;w.glance.title=contents.getTitle();send(w);}};
  contents.on('page-title-updated',update);
  contents.on('did-navigate',update);
  contents.on('did-navigate-in-page',update);
  view.setBorderRadius(14);
  w.win.contentView.addChildView(view);
  require('./toasts.cjs').bringToFront(w);
  const rect=rectFor(w);
  // Entra crescendo dal centro.
  const from={x:rect.x+Math.round(rect.width*.06),y:rect.y+Math.round(rect.height*.06),width:Math.round(rect.width*.88),height:Math.round(rect.height*.88)};
  motion.animateBounds(w,'glance',view,from,rect,220);
  send(w,{backdrop,bounds:w.attached?.getBounds()||null});
  windows().layout(w); // nasconde la pagina sotto (resta la sua foto sfocata)
  contents.loadURL(url).catch(()=>{});
  contents.focus();
}

function send(w,extra={}){
  if(!w.glance)return;
  windows().sendUi(w,{type:'glance',open:true,url:w.glance.url,title:w.glance.title,rect:rectFor(w),...extra});
}

/**
 * Chiude l'anteprima. toTab: la pagina diventa una scheda (attiva se activate) e
 * restituisce il suo id; altrimenti la pagina viene chiusa.
 */
function close(w,{toTab=false,activate=true}={}){
  const g=w?.glance;
  if(!g)return null;
  w.glance=null;
  motion.cancel(w,'glance');
  try{w.win.contentView.removeChildView(g.view);}catch{}
  let id=null;
  if(toTab&&!g.view.webContents.isDestroyed())id=require('./tabs.cjs').adoptView(g.view,w,{activate});
  else if(!g.view.webContents.isDestroyed())g.view.webContents.close();
  windows().sendUi(w,{type:'glance',open:false});
  windows().layout(w);windows().emit(w);
  return id;
}
/** La finestra ha cambiato dimensione: il riquadro segue. */
function relayout(w){
  if(!w.glance)return;
  motion.cancel(w,'glance');
  w.glance.view.setBounds(rectFor(w));
  send(w);
}
const isOpen=w=>!!w?.glance;

/** Shift+clic su un link in una scheda (page-preload.cjs). Vale solo se arriva da una scheda vera. */
function setup(){
  ipcMain.on('glance:open',(event,url)=>{
    const t=state.tabs.find(x=>x.view?.webContents===event.sender);
    const w=t&&windows().windowForTab(t);
    if(w&&typeof url==='string'&&isWebUrl(url))open(w,url);
  });
}

module.exports={setup,open,close,relayout,isOpen};
