'use strict';

/**
 * Icone di Windows che seguono il preset (Beta 0.23).
 *
 * La barra delle applicazioni e il menu Start non usano l'icona della finestra: mostrano
 * quella del collegamento di VARCO (menu Start, desktop, barra fissata), che di solito è
 * l'icona dell'eseguibile. Per questo, quando cambi il preset di tutti i workspace:
 *   - aggiorniamo l'icona di quei collegamenti (con un .ico copiato nella cartella dei dati,
 *     perché Windows non sa leggere dentro app.asar) e avvisiamo Esplora risorse;
 *   - cambiamo l'icona nell'area di notifica.
 * Le finestre ricevono anche l'icona del loro preset (appearance.syncIcon).
 */
const fs=require('node:fs');
const path=require('node:path');
const {app,shell,nativeImage}=require('electron');
const {execFile}=require('node:child_process');
const {state}=require('./state.cjs');
const rules=require('./appearance-rules.cjs');

const programDir=path.join(__dirname,'..');
const APP_ID='local.personal-workspace-browser';
let applied=null;

/** .ico del tema come file vero (copiato dall'archivio dell'app), o '' per l'icona dell'eseguibile. */
function icoFile(themeId){
  const folder=rules.THEMES[themeId]?.assets;
  if(!folder)return '';
  const target=path.join(app.getPath('userData'),'icons',folder+'.ico');
  try{
    if(!fs.existsSync(target)){
      fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.writeFileSync(target,fs.readFileSync(path.join(programDir,'assets','presets',folder,'icon.ico')));
    }
    return target;
  }catch{return '';}
}
/** Immagine per l'area di notifica: il logo del preset, o la sagoma VARCO. */
function trayImage(themeId){
  const folder=rules.THEMES[themeId]?.assets;
  const file=folder?path.join(programDir,'assets','presets',folder,'tray.png'):path.join(programDir,'assets','tray-icon.png');
  const image=nativeImage.createFromPath(file);
  return image.isEmpty()?null:folder?image.resize({width:16,height:16,quality:'best'}):image;
}

/** Collegamenti di VARCO che conosciamo: desktop, menu Start e quelli fissati sulla barra. */
function shortcutFiles(){
  // Modalità di prova dell'installer: collegamenti nelle sue cartelle, quelli veri restano intatti.
  const test=process.env.VARCO_SETUP_TEST;
  if(test)return [path.join(test,'Desktop','VARCO.lnk'),path.join(test,'StartMenu','VARCO.lnk')];
  const appData=app.getPath('appData');
  const pinned=path.join(appData,'Microsoft','Internet Explorer','Quick Launch','User Pinned','TaskBar');
  let pins=[];
  try{pins=fs.readdirSync(pinned).filter(f=>/\.lnk$/i.test(f)).map(f=>path.join(pinned,f));}catch{}
  return [path.join(app.getPath('desktop'),'VARCO.lnk'),path.join(appData,'Microsoft','Windows','Start Menu','Programs','VARCO.lnk'),...pins];
}
/** Solo i collegamenti che puntano proprio a questo VARCO.exe. */
function updateShortcuts(ico){
  let changed=0;
  for(const file of shortcutFiles()){
    let link;
    try{link=shell.readShortcutLink(file);}catch{continue;}
    if(path.resolve(link.target||'').toLowerCase()!==path.resolve(process.execPath).toLowerCase())continue;
    const icon=ico||process.execPath;
    if(path.resolve(link.icon||'').toLowerCase()===path.resolve(icon).toLowerCase())continue;
    if(shell.writeShortcutLink(file,'update',{...link,icon,iconIndex:0}))changed++;
  }
  return changed;
}
/** Esplora risorse rilegge le icone (cache delle icone e notifica di cambio). */
function refreshShell(){
  const system=process.env.SystemRoot||'C:\\Windows';
  execFile(path.join(system,'System32','ie4uinit.exe'),['-show'],{windowsHide:true},()=>{});
  require('./file-types.cjs').notifyShell?.();
}

/** Allinea le icone di Windows al preset di tutti i workspace (solo quando cambia). */
function sync(){
  const theme=state.data?.appearance?.theme||'varco';
  if(theme===applied)return;
  applied=theme;
  const image=trayImage(theme);
  if(image)require('./tray.cjs').setImage(image);
  // I collegamenti solo con VARCO installato: con npm start punterebbero a electron.exe.
  if(!app.isPackaged||path.basename(process.execPath).toLowerCase()!=='varco.exe')return;
  const ico=icoFile(theme);
  if(updateShortcuts(ico))refreshShell();
}

/** Proprietà della finestra per la barra delle applicazioni (icona del suo preset). */
function windowDetails(win,themeId){
  if(process.platform!=='win32'||!app.isPackaged||win.isDestroyed())return;
  const ico=icoFile(themeId);
  try{win.setAppDetails({appId:APP_ID,appIconPath:ico||process.execPath,appIconIndex:0,
    relaunchCommand:`"${process.execPath}"`,relaunchDisplayName:'VARCO'});}catch{}
}

module.exports={sync,windowDetails,icoFile};
