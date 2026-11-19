'use strict';

/**
 * Pagine con le board (Beta 0.43.2 progetto, 0.43.3 anche giochi): schede interne disegnate dalla cornice
 * (app://project e app://game/<id>). Il disco lo gestisce lib/board-store.cjs; qui ci sono i comandi.
 */
const fs=require('node:fs');
const path=require('node:path');
const {shell,dialog}=require('electron');
const {state}=require('./state.cjs');
const P=require('./project-page-rules.cjs');
const store=require('./board-store.cjs');

const folderOf=ws=>state.data.workspaces.find(w=>w.name===ws)?.projectPath||'';
const keyOf=(w,kind,key)=>kind==='project'?w.workspace:String(key);

function revealRel(ws,rel){
  const folder=folderOf(ws),r=P.safeRel(rel);if(!folder||!r)return {ok:false};
  const p=path.join(folder,...r.split('/'));if(!fs.existsSync(p))return {ok:false,error:'File non trovato.'};
  shell.showItemInFolder(p);return {ok:true};
}
/** Apre (o mostra) la scheda della pagina del progetto nella finestra. */
function open(w){
  const tabs=require('./tabs.cjs');
  if(!folderOf(w.workspace))return {ok:false,error:'Collega prima una cartella al workspace (pannello Progetto).'};
  const existing=tabs.tabsOf(w).find(x=>x.isHome&&tabs.internalPage(x.url)==='project');
  if(existing)tabs.show(w,existing.id);else tabs.newHomeTab(w.workspace,{pane:w.pane,url:tabs.INTERNAL_PAGES.project.url});
  if(w.sidePanelOpen==='project')w.sidePanelOpen=null;
  return {ok:true};
}
async function chooseMedia(w,kind,key){
  const ctx=store.context(kind,key);if(!ctx)return {ok:false,error:'Cartella non trovata.'};
  const r=await dialog.showOpenDialog(w.win,{title:kind==='game'?'Aggiungi catture':'Aggiungi screenshot al progetto',properties:['openFile','multiSelections'],
    filters:[{name:'Immagini e clip',extensions:['png','jpg','jpeg','webp','gif','mp4','mkv','webm']}]});
  if(r.canceled)return {ok:false,cancelled:true};
  return {ok:true,names:store.copyIn(ctx,r.filePaths)};
}

function setup(bus){
  const windows=require('./windows.cjs');
  const reg=(name,args,description,fn)=>bus.register(name,{args,description,run:async(ctx,a)=>{
    const w=ctx.window||windows.focusedWindow();if(!w)return {ok:false,error:'Nessuna finestra.'};
    const r=await fn(w,a);windows.emitAll();return r??{ok:true};}});
  const KIND=['project','game'];
  reg('projectPageOpen',{},'Apre la pagina del progetto: tela con stato, attività, note, screenshot, collegamenti e più board.',w=>open(w));
  // Beta 0.43.5: «Apri in una scheda» apre la pagina E ci porta (scheda attiva, finestra in primo piano).
  reg('boardOpenTab',{url:'string'},'Board: apre un link in una nuova scheda e la mostra.',(w,{url})=>{
    if(!/^https?:\/\//i.test(url))return {ok:false,error:'Indirizzo non valido.'};
    const tabs=require('./tabs.cjs'),id=tabs.newTab(url,w.workspace,{pane:w.pane});if(id)tabs.show(w,id);w.win.focus();return {ok:!!id};});
  // Beta 0.43.5: foto della pagina vera per i riquadri «Link».
  reg('boardLinkThumb',{kind:KIND,key:'string',url:'string',force:'bool?'},'Board: foto della pagina di un link (miniatura).',async(w,{kind,key,url,force})=>{
    const ctx=store.context(kind,keyOf(w,kind,key));if(!ctx)return {ok:false};
    const ws=kind==='game'?ctx.game.workspace:w.workspace;return require('./link-thumbs.cjs').thumb(ctx.root,url,ws,{force:!!force});});
  reg('projectRevealRel',{rel:'string'},'Progetto: mostra un file nella sua cartella.',(w,{rel})=>revealRel(w.workspace,rel));
  reg('boardSave',{kind:KIND,key:'string',board:'string',index:'string?'},'Board: salva la board aperta (e l\'elenco: nomi, etichette, link, preset).',
    (w,{kind,key,board,index})=>store.save(kind,keyOf(w,kind,key),board,index));
  reg('boardCreate',{kind:KIND,key:'string',name:'string',from:['layout','empty','copy'],source:'string?'},'Board: ne crea una nuova (vuota, con la stessa disposizione o copia) e la apre.',
    (w,{kind,key,name,from,source})=>store.create(kind,keyOf(w,kind,key),name,from,source));
  reg('boardSwitch',{kind:KIND,key:'string',id:'string'},'Board: apre un\'altra board.',(w,{kind,key,id})=>store.switchTo(kind,keyOf(w,kind,key),id));
  reg('boardDelete',{kind:KIND,key:'string',id:'string'},'Board: elimina una board (non quella aperta).',(w,{kind,key,id})=>store.remove(kind,keyOf(w,kind,key),id));
  reg('boardAddShot',{kind:KIND,key:'string',name:'string',data:'string'},'Board: salva un\'immagine incollata o trascinata.',(w,{kind,key,name,data})=>store.addShot(kind,keyOf(w,kind,key),name,data));
  reg('boardChooseShots',{kind:KIND,key:'string'},'Board: sceglie immagini o clip dal PC.',(w,{kind,key})=>chooseMedia(w,kind,keyOf(w,kind,key)));
  reg('boardOpenShot',{kind:KIND,key:'string',name:'string'},'Board: apre un\'immagine o una clip.',(w,{kind,key,name})=>{const p=store.mediaPath(kind,keyOf(w,kind,key),name);if(!p)return {ok:false};shell.openPath(p);return {ok:true};});
}

module.exports={setup,open,folderOf,snapshot:ws=>store.snapshot('project',ws)};
