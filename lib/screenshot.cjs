'use strict';

/**
 * Screenshot della pagina (Beta 0.28). Ctrl+Shift+S (o tasto destro → Screenshot) apre una
 * sovrapposizione disegnata dalla cornice: trascini per scegliere un'area, oppure scegli
 * "Pagina visibile" o "Pagina intera". L'immagine va negli appunti; la notifica permette di salvarla.
 * La pagina intera si cattura con il protocollo DevTools (Page.captureScreenshot oltre la parte visibile).
 *
 * Beta 0.37: dopo lo scatto compare un'anteprima (disegnata dalla cornice, con la pagina nascosta sotto):
 * l'immagine è già negli appunti, e da lì la salvi, la copi di nuovo o la apri in una scheda (visualizzatore,
 * con lo zoom: utile per la pagina intera). w.shotPreview = {image, title} finché l'anteprima è aperta.
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
  // Beta 0.46: le pagine di Bitwarden non si fotografano.
  if(require('./bitwarden-rules.cjs').isSecretUrl(t.url)){
    require('./toasts.cjs').show({id:'shot',kind:'info',title:'Pagina di Bitwarden',text:'Le pagine di Bitwarden non si fotografano.',timeout:4000},w);
    return {ok:false,error:'Le pagine di Bitwarden non si fotografano.'};
  }
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
  if(mode==='full'){
    // Il debugger può essere già occupato (DevTools aperti, un'estensione): allora resta la parte visibile.
    try{image=await fullPage(t.view.webContents);}
    catch(e){
      console.error('Screenshot pagina intera',e);
      require('./toasts.cjs').show({id:'shot-full',kind:'warning',title:'Pagina intera non disponibile',
        text:'Chiudi gli strumenti per sviluppatori della pagina e riprova. Intanto ecco la parte visibile.',timeout:8000},w);
    }
    if(image.isEmpty())image=shot.image;
  }
  if(mode==='area'&&area){
    // L'immagine è in pixel veri dello schermo: la scala tiene conto dello zoom di Windows.
    const scale=image.getSize().width/shot.bounds.width;
    const rect={x:Math.round((area.x-shot.bounds.x)*scale),y:Math.round((area.y-shot.bounds.y)*scale),
      width:Math.round(area.width*scale),height:Math.round(area.height*scale)};
    if(rect.width<4||rect.height<4)return {ok:false,error:'Area troppo piccola.'};
    image=image.crop(rect);
  }
  clipboard.writeImage(image);
  // Beta 0.44: anche indirizzo, workspace e ora, per il riferimento nel progetto.
  w.lastShot={image,title:shot.title,url:t.url,workspace:w.workspace,time:Date.now()};
  showPreview(w);
  return {ok:true};
}

/** Anteprima dell'ultimo screenshot sopra la pagina. */
function showPreview(w){
  const last=w.lastShot;
  if(!last||w.win.isDestroyed())return {ok:false,error:'Nessuno screenshot.'};
  w.shotPreview=last;
  const {width,height}=last.image.getSize();
  const target=targetOf(last.workspace);
  windows().sendUi(w,{type:'shotPreview',open:true,image:'data:image/png;base64,'+last.image.toPNG().toString('base64'),
    width,height,title:last.title,url:last.url||'',name:defaultName(last.title),
    target:target?{kind:target.kind,name:target.name,tasks:target.tasks}:null,phone:(state().data.devices||[]).length>0});
  windows().layout(w);
  return {ok:true};
}
function closePreview(w){
  if(!w.shotPreview)return {ok:true};
  w.shotPreview=null;
  windows().sendUi(w,{type:'shotPreview',open:false});
  windows().layout(w);
  return {ok:true};
}
function copy(w){
  if(!w?.lastShot)return {ok:false,error:'Nessuno screenshot da copiare.'};
  clipboard.writeImage(w.lastShot.image);
  return {ok:true};
}
/** "VARCO 16.11.2026 10.30.05 - Titolo della pagina.png" (senza caratteri vietati da Windows). */
function fileName(title){
  const stamp=new Date().toLocaleString('it-IT').replace(/[/:]/g,'.').replace(',','');
  const clean=String(title||'').replace(/[<>:"/\|?*\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,60).replace(/[. ]+$/,'');
  return 'VARCO '+stamp+(clean?' - '+clean:'')+'.png';
}
/** Apre lo screenshot in una scheda, nel visualizzatore di immagini (file temporaneo). */
function openInTab(w){
  const last=w?.lastShot;
  if(!last)return {ok:false,error:'Nessuno screenshot da aprire.'};
  const dir=path.join(app.getPath('temp'),'VARCO screenshot');
  fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,fileName(last.title));
  fs.writeFileSync(file,last.image.toPNG());
  closePreview(w);
  return require('./file-viewer.cjs').openFile(w,file);
}

let lastFolder='';
async function save(w){
  const last=w?.lastShot;
  if(!last)return {ok:false,error:'Nessuno screenshot da salvare.'};
  // Beta 0.37: la cartella proposta è l'ultima usata (all'inizio Immagini); PNG o JPEG.
  const folder=lastFolder||app.getPath('pictures');
  const r=await dialog.showSaveDialog(w.win,{title:'Salva lo screenshot',defaultPath:path.join(folder,fileName(last.title)),
    filters:[{name:'Immagine PNG',extensions:['png']},{name:'Immagine JPEG',extensions:['jpg']}]});
  if(r.canceled||!r.filePath)return {ok:true,cancelled:true};
  try{
    const jpeg=/.jpe?g$/i.test(r.filePath);
    fs.writeFileSync(r.filePath,jpeg?last.image.toJPEG(92):last.image.toPNG());
  }catch(e){return {ok:false,error:'Salvataggio non riuscito: '+e.message};}
  lastFolder=path.dirname(r.filePath);
  w.lastShotFile=r.filePath;
  closePreview(w);
  require('./toasts.cjs').show({id:'shot',kind:'success',title:'Screenshot salvato',text:path.basename(r.filePath),timeout:6000,
    actions:[{label:'Mostra nella cartella',command:'showScreenshotFile'}]},w);
  return {ok:true,file:r.filePath};
}
function showFile(w){
  if(w?.lastShotFile)require('electron').shell.showItemInFolder(w.lastShotFile);
  return {ok:true};
}


/* ══════════ Beta 0.44: azioni dopo lo scatto, cartelle con la data, riferimento nel progetto ══════════ */
const state=()=>require('./state.cjs').state;
const store=()=>require('./board-store.cjs');
const pad=n=>String(n).padStart(2,'0');
const dayOf=t=>{const d=new Date(t);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const hourOf=t=>{const d=new Date(t);return `${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())}`;};
/** Nome proposto: il titolo della pagina, pulito (lo puoi cambiare nell'anteprima). */
const cleanName=n=>String(n||'').replace(/[<>:"/\\|?*\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,80).replace(/[. ]+$/,'');
const defaultName=title=>cleanName(title)||'Screenshot';
/** Dove va lo screenshot «nel progetto»: il gioco del workspace, altrimenti il progetto (cartella collegata). */
function targetOf(ws){
  const data=state().data;
  const game=data.games.find(g=>g.workspace===ws);
  const kind=game?'game':data.workspaces.find(w=>w.name===ws)?.projectPath?'project':null;
  if(!kind)return null;
  const key=game?String(game.id):ws,ctx=store().context(kind,key);if(!ctx)return null;
  let tasks=[];try{const idx=store().readIndex(ctx);tasks=store().readBoard(ctx,idx.current).tasks.map((t,i)=>({i,t:t.t,done:t.done}));}catch{}
  return {kind,key,ctx,name:game?game.name:ctx.name,tasks};
}
function freeFile(dir,base,ext='.png'){let f=path.join(dir,base+ext),i=2;while(fs.existsSync(f))f=path.join(dir,`${base} (${i++})${ext}`);return f;}
/** Riferimento nel progetto: data, indirizzo, titolo della pagina, note e dove sta il file. */
function addReference(target,last,{file,note,kind:what,cat}){
  try{
    const f=path.join(target.ctx.shots,'riferimenti.json');let list=[];try{list=JSON.parse(fs.readFileSync(f,'utf8'));}catch{}
    if(!Array.isArray(list))list=[];
    list.unshift({data:new Date(last.time).toISOString(),url:last.url||'',titolo:last.title||'',note:String(note||'').slice(0,2000),file,azione:what,...(cat?{categoria:cat}:{})});
    fs.mkdirSync(target.ctx.shots,{recursive:true});fs.writeFileSync(f,JSON.stringify(list.slice(0,2000),null,1)+'\n','utf8');
  }catch{}
}
/** Salva nella cartella delle immagini del progetto (o del gioco): «2026-11-19 Nome.png». */
function saveIntoTarget(target,last,name){
  fs.mkdirSync(target.ctx.shots,{recursive:true});
  const file=freeFile(target.ctx.shots,`${dayOf(last.time)} ${cleanName(name)||'Screenshot'}`);
  fs.writeFileSync(file,last.image.toPNG());store().cache.delete(target.ctx.root);
  return path.basename(file);
}
/** Aggiunge riquadri alla board aperta del progetto/gioco (a destra di quelli che ci sono), collegati tra loro. */
function addTiles(target,make){
  const idx=store().readIndex(target.ctx),board=store().readBoard(target.ctx,idx.current);
  const tiles=Object.values(board.tiles),x=tiles.length?Math.max(...tiles.map(t=>t.x+t.w))+96:96,y=tiles.length?Math.min(...tiles.map(t=>t.y)):144;
  const snap=v=>Math.round(v/24)*24;
  make(board,snap(x),snap(y));
  store().writeBoard(target.ctx,idx.current,board);
}
function done(w,title,text,actions){require('./toasts.cjs').show({id:'shot',kind:'success',title,text,timeout:6000,...(actions?{actions}:{})},w);}

/** L'immagine annotata (dalla cornice) prende il posto dell'ultimo screenshot, anche negli appunti. */
function update(w,dataUrl){
  const m=/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl||''));
  if(!w?.lastShot||!m)return {ok:false,error:'Immagine non valida.'};
  const img=nativeImage.createFromBuffer(Buffer.from(m[1],'base64'));if(img.isEmpty())return {ok:false};
  w.lastShot.image=img;clipboard.writeImage(img);return {ok:true};
}

/**
 * Azioni dell'anteprima. opts: {name, note, task (indice), cat (categoria della referenza)}.
 * Ogni salvataggio fatto in un workspace con progetto lascia anche un riferimento nel progetto.
 */
async function action(w,what,opts={}){
  const last=w?.lastShot;if(!last)return {ok:false,error:'Nessuno screenshot.'};
  const name=cleanName(opts.name)||defaultName(last.title),note=String(opts.note||'').trim();
  const target=targetOf(last.workspace);
  if(what==='copy'){clipboard.writeImage(last.image);return {ok:true};}
  if(what==='viewer')return openInTab(w);
  if(what==='phone'){
    if(!/^https?:/i.test(last.url||''))return {ok:false,error:'Questa pagina non si può mandare.'};
    return require('./link.cjs').sendUrlToPhone(w,{url:last.url,title:last.title,scroll:0,time:0});
  }
  if(what==='downloads'){
    // Download\Screenshot VARCO\2026-11-19\Nome 10.30.05.png
    const dir=path.join(app.getPath('downloads'),'Screenshot VARCO',dayOf(last.time));
    fs.mkdirSync(dir,{recursive:true});
    const file=freeFile(dir,name);fs.writeFileSync(file,last.image.toPNG());
    w.lastShotFile=file;
    if(target)addReference(target,last,{file,note,kind:'download'});
    closePreview(w);
    done(w,'Screenshot salvato in Download',path.join('Screenshot VARCO',dayOf(last.time),path.basename(file)),[{label:'Mostra nella cartella',command:'showScreenshotFile'}]);
    return {ok:true,file};
  }
  if(!target)return {ok:false,error:'Questo workspace non ha un progetto o un gioco collegato.'};
  const shot=saveIntoTarget(target,last,name);
  w.lastShotFile=path.join(target.ctx.shots,shot);
  const where=target.kind==='game'?'nel gioco':'nel progetto';
  if(what==='project'){
    addReference(target,last,{file:shot,note,kind:'progetto'});
    closePreview(w);done(w,`Screenshot salvato ${where}`,`${target.name} · ${shot}`,[{label:'Mostra nella cartella',command:'showScreenshotFile'}]);return {ok:true,file:shot};
  }
  if(what==='note'){
    addReference(target,last,{file:shot,note,kind:'nota'});
    addTiles(target,(b,x,y)=>{const n=++b.n,m=++b.n;
      b.tiles['note-'+n]={x,y,w:312,h:216,text:[last.title,last.url,note].filter(Boolean).join('\n')};
      b.tiles['shot-'+m]={x:x+384,y,w:456,h:312,shot};
      b.links.push({a:'note-'+n,b:'shot-'+m,t:'',c:0});});
    closePreview(w);done(w,'Nota con lo screenshot',`Aggiunta alla board di ${target.name}`);return {ok:true};
  }
  if(what==='task'){
    const idx=store().readIndex(target.ctx),board=store().readBoard(target.ctx,idx.current),t=board.tasks[Number(opts.task)];
    if(!t)return {ok:false,error:'Attività non trovata.'};
    t.shots=[...(t.shots||[]),shot].slice(-20);store().writeBoard(target.ctx,idx.current,board);
    addReference(target,last,{file:shot,note,kind:'attività'});
    closePreview(w);done(w,'Screenshot allegato',`«${t.t}» · ${target.name}`);return {ok:true};
  }
  if(what==='reference'){
    const cat=cleanName(opts.cat).slice(0,30)||'Referenza';
    addReference(target,last,{file:shot,note,kind:'referenza',cat});
    // Le referenze stanno in un'area «Referenze» della board: la crea se non c'è.
    addTiles(target,(b,x,y)=>{
      let areaId=Object.keys(b.areas).find(k=>b.areas[k].t==='Referenze');
      if(!areaId){areaId='area-'+(++b.n);b.areas[areaId]={x:x-24,y:y-48,w:1032,h:792,t:'Referenze',c:3};}
      const a=b.areas[areaId],inside=Object.values(b.tiles).filter(t=>t.x>=a.x&&t.x<a.x+a.w&&t.y>=a.y&&t.y<a.y+a.h).length;
      const col=inside%2,row=Math.floor(inside/2),id='shot-'+(++b.n);
      b.tiles[id]={x:a.x+24+col*504,y:a.y+48+row*360,w:456,h:312,shot};
      if(row*360+408>a.h)a.h=row*360+408;
      if(note||cat){const n='note-'+(++b.n);b.tiles[n]={x:a.x+a.w+48,y:a.y+48+row*360,w:264,h:168,text:[cat,note].filter(Boolean).join('\n')};b.links.push({a:n,b:id,t:cat,c:3});}
    });
    closePreview(w);done(w,'Salvato come referenza',`${cat} · ${target.name}`);return {ok:true};
  }
  return {ok:false,error:'Azione sconosciuta.'};
}

module.exports={open,close,take,save,showPreview,closePreview,copy,openInTab,showFile,fileName,update,action,targetOf};
