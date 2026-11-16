'use strict';

/**
 * Beta 0.37.1 — lettore multimediale di VARCO.
 *
 * Raccoglie audio e video in riproduzione in TUTTE le schede, i pannelli web e i widget della Home,
 * di qualsiasi workspace, e li comanda da un unico posto (mini-lettore nella barra delle schede e
 * pannello "In riproduzione"). Lo stato arriva da page-preload.cjs ('media:state', uno per riquadro);
 * i comandi tornano al riquadro giusto con WebFrameMain.executeJavaScript (con il gesto dell'utente,
 * che serve per play() e per la finestrella Picture-in-Picture).
 * Le regole (pulizia, controlli per sito, ordine) sono in media-rules.cjs.
 */
const {ipcMain}=require('electron');
const {state}=require('./state.cjs');
const rules=require('./media-rules.cjs');

const entries=new Map();   // "contents:processo:riquadro" → voce
const watched=new WeakSet();
const artworkCache=new Map(); // indirizzo copertina → data: (o '' se non si può avere)
const windows=()=>require('./windows.cjs');

/** A chi appartiene una pagina: scheda, pannello web o widget della Home. */
function ownerOf(contents){
  const tab=state.tabs.find(t=>t.view&&t.view.webContents===contents);
  if(tab)return {kind:'tab',tabId:tab.id,workspace:tab.workspace,pageTitle:tab.title,favicon:tab.favicon||null};
  const panel=require('./webpanels.cjs').ownerOf(contents);
  if(panel?.panel)return {kind:'panel',panelId:panel.panel.id,workspace:panel.window?.workspace||'',windowId:panel.window?.win.id,
    pageTitle:panel.panel.title,favicon:panel.panel.favicon||null};
  if(contents.getType?.()==='webview'&&contents.hostWebContents){
    const w=windows().windowOfContents(contents.hostWebContents);
    if(w)return {kind:'widget',workspace:w.workspace,windowId:w.win.id,pageTitle:contents.getTitle(),favicon:null};
  }
  return null;
}

const siteOf=url=>{try{return new URL(url).hostname.replace(/^www\./,'');}catch{return '';}};

let emitTimer=null;
/** Gli aggiornamenti arrivano a raffica (play, durata, metadati…): uno solo ogni 120 ms. */
function changed(){
  if(emitTimer)return;
  emitTimer=setTimeout(()=>{emitTimer=null;windows().emitAll();require('./media-overlay.cjs').refreshAll();},120);
}

function forget(contents){
  let any=false;
  for(const [key,e] of entries)if(e.contents===contents){entries.delete(key);any=true;}
  if(any)changed();
}
function watch(contents){
  if(watched.has(contents))return;
  watched.add(contents);
  contents.once('destroyed',()=>forget(contents));
  contents.on('did-start-navigation',details=>{if(details.isMainFrame&&!details.isSameDocument)forget(contents);});
}

/** Copertina del brano: scaricata con la sessione della pagina, passata alla cornice come data: (la sua CSP non apre la rete). */
function loadArtwork(entry,url){
  if(!url||artworkCache.has(url))return;
  artworkCache.set(url,'');
  if(artworkCache.size>60)artworkCache.delete(artworkCache.keys().next().value);
  entry.contents.session.fetch(url,{signal:AbortSignal.timeout(6000)}).then(async r=>{
    const type=(r.headers.get('content-type')||'').split(';')[0];
    if(!r.ok||!type.startsWith('image/'))return;
    const body=Buffer.from(await r.arrayBuffer());
    if(body.length>512*1024)return;
    artworkCache.set(url,`data:${type};base64,${body.toString('base64')}`);
    changed();
  }).catch(()=>{});
}

function onReport(event,raw){
  const contents=event.sender,frame=event.senderFrame;
  if(!frame||contents.isDestroyed())return;
  const report=rules.normalizeReport(raw);
  if(!report)return;
  const key=`${contents.id}:${frame.processId}:${frame.routingId}`;
  if(!report.has){if(entries.delete(key))changed();return;}
  const owner=ownerOf(contents);
  if(!owner)return; // anteprima dei link, popup… non entrano nel lettore
  watch(contents);
  const previous=entries.get(key);
  const entry={...report,key,contents,frame,owner,site:siteOf(frame.url||contents.getURL()),at:Date.now(),
    updatedAt:report.playing||!previous?Date.now():previous.updatedAt};
  entries.set(key,entry);
  loadArtwork(entry,report.artwork);
  changed();
}

function setup(){
  ipcMain.on('media:state',onReport);
}

/** Le voci ancora valide (riquadro esistente), ordinate. */
function live(){
  for(const [key,e] of entries){
    let gone=e.contents.isDestroyed();
    if(!gone)try{gone=e.frame.detached===true;}catch{gone=true;}
    if(gone)entries.delete(key);
  }
  return rules.sortEntries([...entries.values()]);
}

/** Per la cornice di una finestra. */
function snapshot(w){
  const activeId=w.activeId;
  const media=live().map(e=>{
    const owner=ownerOf(e.contents)||e.owner; // il workspace può cambiare (pannelli che seguono la finestra)
    return {key:e.key,kind:owner.kind,title:rules.displayTitle({...e,pageTitle:owner.pageTitle}),subtitle:rules.displaySubtitle(e),
      site:e.site,workspace:owner.workspace,artwork:artworkCache.get(e.artwork)||owner.favicon||null,favicon:owner.favicon||null,
      playing:e.playing,duration:e.duration,position:e.position,at:e.at,rate:e.rate,muted:e.muted,video:e.video,pip:e.pip,live:e.live,
      volume:e.volume,shuffle:e.shuffle,repeat:e.repeat, // Beta 0.37.1
      controls:rules.controlsFor(e),here:owner.kind==='tab'&&owner.tabId===activeId};
  });
  return {media,mediaAutoPip:state.data.settings.autoPip!==false};
}

/** Esegue un comando nel riquadro della voce. */
function command(key,action,value){
  const e=entries.get(key);
  if(!e||!rules.isCommand(action))return {ok:false,error:'Questo media non c\'è più.'};
  const args=[action,Number.isFinite(value)?value:0].map(v=>JSON.stringify(v)).join(',');
  try{
    e.frame.executeJavaScript(`window.__varcoMedia&&window.__varcoMedia.run(${args})`,true).catch(()=>{});
  }catch{entries.delete(key);changed();return {ok:false,error:'Questo media non c\'è più.'};}
  return {ok:true};
}

/**
 * Beta 0.37.1: chiude dal lettore ciò che suona. Scheda → si chiude (si riapre con Ctrl+Shift+T);
 * pannello web → la sua pagina si scarica (si riapre dalla barra laterale); widget della Home → si ferma.
 */
function close(key){
  const e=entries.get(key);
  if(!e)return {ok:false,error:'Questo media non c\'è più.'};
  const owner=ownerOf(e.contents)||e.owner;
  if(owner.kind==='tab')require('./tabs.cjs').closeTabAnywhere(owner.tabId);
  else if(owner.kind==='panel')require('./webpanels.cjs').unload(owner.panelId);
  else return command(key,'stop');
  entries.delete(key);changed();
  return {ok:true};
}

/** Porta in primo piano la scheda, il pannello o il widget che suona. */
function focus(key){
  const e=entries.get(key);
  if(!e)return {ok:false,error:'Questo media non c\'è più.'};
  const owner=ownerOf(e.contents)||e.owner;
  const tabs=require('./tabs.cjs');
  let target=null;
  if(owner.kind==='tab'){
    const t=state.tabs.find(x=>x.id===owner.tabId);
    if(!t)return {ok:false};
    const {paneOf}=require('./tab-advanced.cjs');
    target=windows().windowForTab(t)||tabs.openWorkspaceWindow(t.workspace,{},paneOf(t));
    if(target)tabs.show(target,t.id);
  }else{
    target=state.windows.find(w=>w.win.id===owner.windowId)||null;
    if(target&&owner.kind==='panel'&&target.webPanel!==owner.panelId)require('./webpanels.cjs').show(target,owner.panelId);
    if(target&&owner.kind==='widget'){const home=tabs.tabsOf(target).find(t=>t.isHome&&t.url!=='app://settings');if(home)tabs.show(target,home.id);}
  }
  if(!target)return {ok:false};
  if(target.win.isMinimized())target.win.restore();
  target.win.focus();
  return {ok:true};
}

module.exports={setup,snapshot,command,focus,close,live};
