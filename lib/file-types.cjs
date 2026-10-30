'use strict';

/**
 * Beta 0.21: VARCO in "Apri con" e in "App predefinite" per i file del visualizzatore.
 * Lo fa VARCO installato all'avvio (una volta per versione e percorso), così funziona anche
 * per chi aveva già installato una beta precedente. Le regole stanno in file-types-rules.cjs.
 */
const fs=require('node:fs');
const path=require('node:path');
const {execFile}=require('node:child_process');
const {app,shell}=require('electron');
const rules=require('./file-types-rules.cjs');

// Modalità di prova dell'installer: stesse voci sotto HKCU\Software\VARCO-SetupTest.
const TEST=process.env.VARCO_SETUP_TEST||'';
const ROOT='HKEY_CURRENT_USER\\Software'+(TEST?'\\VARCO-SetupTest':'');
const run=(file,args)=>new Promise(resolve=>execFile(file,args,{windowsHide:true},error=>resolve(!error)));
const markerFile=()=>path.join(app.getPath('userData'),'file-types.json');

/** Scrive il .reg in UTF-16 (accetta qualunque carattere nel percorso) e lo importa. */
async function importText(text){
  const file=path.join(app.getPath('temp'),`varco-file-types-${process.pid}.reg`);
  fs.writeFileSync(file,'\ufeff'+text,'utf16le');
  const ok=await run('reg',['import',file]);
  try{fs.rmSync(file,{force:true});}catch{}
  return ok;
}
/** Avvisa Esplora file che le associazioni sono cambiate (altrimenti le vede al riavvio). */
function notifyShell(){
  const script='Add-Type -Namespace V -Name S -MemberDefinition \'[DllImport("shell32.dll")] public static extern void SHChangeNotify(int e,int f,System.IntPtr a,System.IntPtr b);\';[V.S]::SHChangeNotify(0x08000000,0,[System.IntPtr]::Zero,[System.IntPtr]::Zero)';
  return run('powershell',['-NoProfile','-NonInteractive','-Command',script]);
}

/**
 * @param {{force?:boolean, exe?:string}} options force: anche fuori dall'eseguibile
 *   installato e anche se già fatto (prove). exe: percorso da registrare.
 */
async function register({force=false,exe=process.execPath}={}){
  if(process.platform!=='win32')return {ok:false,error:'Solo su Windows.'};
  if(!force&&(!app.isPackaged||path.basename(exe).toLowerCase()!=='varco.exe'))return {ok:false,skipped:true};
  const marker={version:app.getVersion(),exe,count:rules.extensions().length};
  if(!force){try{if(JSON.stringify(JSON.parse(fs.readFileSync(markerFile(),'utf8')))===JSON.stringify(marker))return {ok:true,already:true};}catch{}}
  const browserRegistered=await run('reg',['query',ROOT.replace('HKEY_CURRENT_USER','HKCU')+'\\'+rules.CLIENT_KEY.replace(/^Software\\/,'')]);
  const ok=await importText(rules.registerText(exe,{browserRegistered,root:ROOT}));
  if(!ok)return {ok:false,error:'Registro di Windows non aggiornato.'};
  try{fs.writeFileSync(markerFile(),JSON.stringify(marker));}catch{}
  notifyShell();
  return {ok:true,count:marker.count,browserRegistered};
}
async function unregister(){
  if(process.platform!=='win32')return false;
  const ok=await importText(rules.unregisterText({root:ROOT}));
  try{fs.rmSync(markerFile(),{force:true});}catch{}
  return ok;
}
/** La pagina di Impostazioni dove scegli VARCO per i tipi di file (o come browser). */
const openDefaultApps=()=>shell.openExternal('ms-settings:defaultapps?registeredAppUser=VARCO');

module.exports={register,unregister,openDefaultApps,notifyShell};
