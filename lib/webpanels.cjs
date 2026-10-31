'use strict';

/**
 * Pannelli web (Beta 0.27, come Vivaldi, Zen e Opera): siti come WhatsApp, Discord o Spotify
 * in una colonna a destra, sempre carichi anche quando li chiudi, senza occupare schede.
 * I pulsanti stanno nella barra laterale; la barra del pannello (titolo, ricarica, apri in
 * scheda, chiudi) la disegna la cornice sopra la colonna.
 *
 * data.webPanels = [{id, url, title, size, mobile, favicon}] (regole in webpanel-rules.cjs).
 * Ogni finestra ha le sue pagine (una WebContentsView appartiene a una sola finestra).
 */
const crypto=require('node:crypto');
const {WebContentsView}=require('electron');
const {state,save}=require('./state.cjs');
const rules=require('./webpanel-rules.cjs');
const {PARTITION,isWebUrl}=require('./web-rules.cjs');
const {webPanelBounds}=require('./window-rules.cjs');
const motion=require('./motion.cjs');

const MOBILE_UA='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36';
const views=new Map(); // "finestra:pannello" → {view, title, unread}
const windows=()=>require('./windows.cjs');
const panelOf=id=>state.data.webPanels.find(p=>p.id===id)||null;
const keyOf=(w,id)=>(w.winId??w.win.id)+':'+id;

const widthOf=id=>rules.SIZES[panelOf(id)?.size]||rules.SIZES.medio;

function boundsFor(w){
  const [width,height]=w.win.getContentSize();
  return webPanelBounds({width,height},windows().layoutOf(w));
}

/** La pagina del pannello per questa finestra (creata la prima volta, poi resta carica). */
function viewFor(w,panel){
  const key=keyOf(w,panel.id);
  if(views.has(key))return views.get(key);
  const view=new WebContentsView({webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,partition:PARTITION}});
  const contents=view.webContents;
  const record={view,title:panel.title,unread:0};
  views.set(key,record);
  require('./web-session.cjs').applyIdentity(contents);
  if(panel.mobile)contents.setUserAgent(MOBILE_UA);
  windows().registerShortcuts(contents);
  // Un link che vuole una nuova finestra diventa una scheda della finestra.
  contents.setWindowOpenHandler(({url})=>{
    if(isWebUrl(url))require('./tabs.cjs').newTab(url,w.workspace,{pane:w.pane});
    return {action:'deny'};
  });
  contents.on('page-title-updated',(_e,title)=>{
    record.title=title;
    const unread=rules.unreadFrom(title);
    if(unread!==record.unread){record.unread=unread;windows().emitAll();}
  });
  // L'icona del sito, salvata con il pannello: si vede anche prima che la pagina carichi.
  contents.on('page-favicon-updated',(_e,favicons)=>{
    const holder={favicon:panel.favicon};
    require('./tabs.cjs').loadFavicon(holder,favicons).then(()=>{
      const p=panelOf(panel.id);
      if(p&&holder.favicon&&holder.favicon!==p.favicon){p.favicon=holder.favicon;save();windows().emitAll();}
    });
  });
  view.setBorderRadius(12);
  contents.loadURL(panel.url).catch(()=>{});
  return record;
}

function show(w,id){
  const panel=panelOf(id);
  if(!panel)return {ok:false,error:'Pannello non trovato.'};
  if(w.webPanel&&w.webPanel!==id)detach(w);
  const record=viewFor(w,panel);
  const opening=w.webPanel!==id;
  w.webPanel=id;
  w.win.contentView.addChildView(record.view);
  require('./toasts.cjs').bringToFront(w);
  const target=boundsFor(w);
  if(opening)motion.animateBounds(w,'webpanel',record.view,{...target,x:target.x+48},target,220);
  else record.view.setBounds(target);
  windows().layout(w,{animate:true});windows().emit(w);
  return {ok:true};
}
/** Toglie la pagina del pannello dalla finestra (resta carica, per riaprirla subito). */
function detach(w){
  const record=w.webPanel&&views.get(keyOf(w,w.webPanel));
  motion.cancel(w,'webpanel');
  if(record)try{w.win.contentView.removeChildView(record.view);}catch{}
}
function close(w){
  if(!w.webPanel)return;
  detach(w);
  w.webPanel=null;
  windows().layout(w,{animate:true});windows().emit(w);
}
const toggle=(w,id)=>w.webPanel===id?(close(w),{ok:true}):show(w,id);

/** Dopo ogni layout: la colonna segue la finestra (con la stessa animazione della pagina). */
function relayout(w,{animate=false}={}){
  const record=w.webPanel&&views.get(keyOf(w,w.webPanel));
  if(!record||w.win.isDestroyed())return;
  const full=w.fullscreen||w.zen;
  record.view.setVisible(!full&&!w.paletteOpen&&!w.glance);
  if(full)return;
  const target=boundsFor(w);
  if(animate)motion.animateBounds(w,'webpanel',record.view,record.view.getBounds(),target,200);
  else{motion.cancel(w,'webpanel');record.view.setBounds(target);}
}

function add(url,title){
  const clean=rules.cleanUrl(url);
  if(!clean)return {ok:false,error:'Indirizzo non valido (serve https).'};
  if(state.data.webPanels.length>=rules.MAX_PANELS)return {ok:false,error:`Al massimo ${rules.MAX_PANELS} pannelli.`};
  if(state.data.webPanels.some(p=>p.url===clean))return {ok:false,error:'Questo sito è già un pannello.'};
  const id=crypto.randomBytes(5).toString('hex');
  state.data.webPanels=rules.normalizePanels([...state.data.webPanels,{id,url:clean,title:title||rules.hostOf(clean)}]);
  save();windows().emitAll();
  return {ok:true,id};
}
/** Elimina un pannello: chiude le sue pagine in tutte le finestre. */
function remove(id){
  for(const w of state.windows)if(w.webPanel===id)close(w);
  for(const [key,record] of views)if(key.endsWith(':'+id)){views.delete(key);if(!record.view.webContents.isDestroyed())record.view.webContents.close();}
  state.data.webPanels=state.data.webPanels.filter(p=>p.id!==id);
  save();windows().emitAll();
  return {ok:true};
}
/** Cambia larghezza o versione mobile (la versione mobile ricarica la pagina). */
function update(id,changes){
  const panel=panelOf(id);
  if(!panel)return {ok:false};
  if(changes.size&&rules.SIZES[changes.size])panel.size=changes.size;
  if(typeof changes.mobile==='boolean'&&changes.mobile!==panel.mobile){
    panel.mobile=changes.mobile;
    for(const [key,record] of views)if(key.endsWith(':'+id)){
      record.view.webContents.setUserAgent(changes.mobile?MOBILE_UA:record.view.webContents.session.getUserAgent());
      record.view.webContents.reload();
    }
  }
  save();
  for(const w of state.windows)if(w.webPanel===id)windows().layout(w,{animate:true});
  windows().emitAll();
  return {ok:true};
}
function reload(w){views.get(keyOf(w,w.webPanel))?.view.webContents.reload();}
function openInTab(w){
  const record=w.webPanel&&views.get(keyOf(w,w.webPanel));
  if(!record)return;
  require('./tabs.cjs').newTab(record.view.webContents.getURL()||panelOf(w.webPanel).url,w.workspace,{pane:w.pane});
}
/** La finestra si chiude: le sue pagine dei pannelli si chiudono con lei. */
function forget(w){
  for(const [key,record] of views)if(key.startsWith((w.winId??w.win.id)+':')){views.delete(key);if(!record.view.webContents.isDestroyed())record.view.webContents.close();}
}

function snapshot(w){
  const open=w.webPanel&&panelOf(w.webPanel);
  return {webPanels:state.data.webPanels.map(p=>({id:p.id,title:p.title,url:p.url,favicon:p.favicon,size:p.size,mobile:p.mobile,
      unread:state.windows.reduce((n,x)=>Math.max(n,views.get(keyOf(x,p.id))?.unread||0),0)})),
    webPanelOpen:open&&!w.fullscreen&&!w.zen?{id:open.id,hidden:!!(w.paletteOpen||w.glance),title:views.get(keyOf(w,open.id))?.title||open.title,rect:boundsFor(w)}:null};
}

module.exports={widthOf,show,close,toggle,relayout,add,remove,update,reload,openInTab,forget,snapshot,SUGGESTIONS:rules.SUGGESTIONS,SIZES:rules.SIZES};
