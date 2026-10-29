'use strict';

/**
 * Personalizzazione (Beta 0.21) nel processo principale: risolve lo sfondo di ogni
 * workspace, prepara le variabili CSS per la cornice e le passa anche a menu e notifiche.
 * Le regole (temi, limiti, colori) stanno in appearance-rules.cjs.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {app}=require('electron');
const {state}=require('./state.cjs');
const rules=require('./appearance-rules.cjs');

const IMAGE_EXTS=['jpg','jpeg','png','webp','gif','avif','bmp'];
const wallpaperDir=()=>path.join(app.getPath('userData'),'wallpapers');
const exists=file=>{try{return !!file&&fs.statSync(file).isFile();}catch{return false;}};

/** Sfondo in uso per un workspace: il suo, poi quello di tutti, poi lo sfondo VARCO (''). */
function wallpaperFor(workspaceName){
  const a=state.data.appearance;
  const ws=state.data.workspaces.find(x=>x.name===workspaceName);
  if(ws?.wallpaper&&exists(ws.wallpaper))return {file:ws.wallpaper,scope:'workspace'};
  if(a.wallpaper.kind==='image'&&exists(a.wallpaper.file))return {file:a.wallpaper.file,scope:'all'};
  return {file:'',scope:a.wallpaper.kind==='none'?'none':'default'};
}

/** Per la cornice di una finestra: variabili, pulsanti nascosti, densità, Home. */
function snapshot(workspaceName){
  const a=state.data.appearance;
  const wall=wallpaperFor(workspaceName);
  const ws=state.data.workspaces.find(x=>x.name===workspaceName);
  return {
    vars:rules.cssVariables(a,{wallpaperUrl:wall.file?pathToFileURL(wall.file).href:''}),
    hidden:a.hidden,density:a.density,home:a.home,homeLinks:ws?.homeLinks||[]
  };
}

/** Per la pagina Impostazioni. */
function settingsSnapshot(workspaceName){
  const a=state.data.appearance;
  const ws=state.data.workspaces.find(x=>x.name===workspaceName);
  return {...a,
    themes:Object.entries(rules.THEMES).map(([id,t])=>({id,label:t.label,accent:t.accent,bg:t.bg})),
    hideable:rules.HIDEABLE,homeCards:rules.HOME_CARDS,limits:rules.LIMITS,densities:rules.DENSITIES,
    wallpaperName:a.wallpaper.kind==='image'?path.basename(a.wallpaper.file):'',
    workspace:workspaceName,workspaceWallpaper:ws?.wallpaper?path.basename(ws.wallpaper):''};
}

/** Copia l'immagine scelta nella cartella dei dati: lo sfondo resta anche se sposti l'originale. */
function importWallpaper(source){
  const ext=path.extname(source).slice(1).toLowerCase();
  if(!IMAGE_EXTS.includes(ext))return {ok:false,error:'Scegli un\'immagine (JPG, PNG, WebP, GIF, AVIF).'};
  const stat=fs.statSync(source);
  if(stat.size>40*1024*1024)return {ok:false,error:'Immagine troppo grande (oltre 40 MB).'};
  const bytes=fs.readFileSync(source);
  const name=crypto.createHash('sha1').update(bytes).digest('hex').slice(0,16)+'.'+ext;
  fs.mkdirSync(wallpaperDir(),{recursive:true});
  const target=path.join(wallpaperDir(),name);
  if(!exists(target))fs.writeFileSync(target,bytes);
  return {ok:true,file:target};
}
/** Toglie dalla cartella degli sfondi le immagini che nessuno usa più. */
function cleanWallpapers(){
  const used=new Set([state.data.appearance.wallpaper.file,...state.data.workspaces.map(w=>w.wallpaper)].filter(Boolean).map(f=>path.resolve(f)));
  try{
    for(const name of fs.readdirSync(wallpaperDir())){
      const file=path.resolve(wallpaperDir(),name);
      if(!used.has(file))fs.rmSync(file,{force:true});
    }
  }catch{}
}

// ── Menu e notifiche: stessi colori della cornice ────────────────────────
const inserted=new WeakMap();
async function applyTo(contents){
  if(!contents||contents.isDestroyed())return;
  const vars=rules.cssVariables(state.data.appearance);
  const css=':root{'+['--v-accent','--v-accent-2','--v-accent-rgb','--v-accent-2-rgb'].map(k=>`${k}:${vars[k]}`).join(';')+'}';
  const old=inserted.get(contents);
  try{
    inserted.set(contents,await contents.insertCSS(css));
    if(old)await contents.removeInsertedCSS(old);
  }catch{}
}
function refreshOverlays(){
  for(const w of state.windows)for(const view of [w.popup,w.overlay])if(view)applyTo(view.webContents);
}

module.exports={wallpaperFor,snapshot,settingsSnapshot,importWallpaper,cleanWallpapers,applyTo,refreshOverlays};
