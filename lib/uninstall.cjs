'use strict';

/**
 * Disinstallazione (Beta 0.16). Windows ("App installate") avvia `VARCO.exe --uninstall`,
 * come scritto nel registro dall'installer (setup/setup-main.cjs).
 * Toglie collegamenti, voci di registro e avvio automatico; i dati del browser restano,
 * a meno che tu non spunti "Elimina anche i miei dati". La cartella del programma viene
 * cancellata subito dopo la chiusura (un programma non può cancellare se stesso mentre gira).
 */
const fs=require('node:fs');
const path=require('node:path');
const {execFile,spawn}=require('node:child_process');
const {app,BrowserWindow,ipcMain}=require('electron');

// Modalità di prova dell'installer (VARCO_SETUP_TEST): stesse voci, ma sotto HKCU\Software\VARCO-SetupTest.
const TEST=process.env.VARCO_SETUP_TEST||'';
const key=k=>TEST?k.replace('HKCU\\Software','HKCU\\Software\\VARCO-SetupTest'):k;
const KEYS=['HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\VARCO',
  'HKCU\\Software\\Clients\\StartMenuInternet\\VARCO','HKCU\\Software\\Classes\\VARCOURL'].map(key);
const reg=args=>new Promise(resolve=>execFile('reg',args,{windowsHide:true},()=>resolve()));

/** Solo una cartella che contiene davvero VARCO viene cancellata. */
function installDir(){
  const dir=path.dirname(process.execPath);
  const looksRight=app.isPackaged&&fs.existsSync(path.join(dir,'VARCO.exe'))&&fs.existsSync(path.join(dir,'resources','app.asar'));
  return looksRight?dir:null;
}

async function uninstall({deleteData}){
  const links=TEST?[path.join(TEST,'Desktop','VARCO.lnk'),path.join(TEST,'StartMenu','VARCO.lnk')]:
    [path.join(app.getPath('desktop'),'VARCO.lnk'),path.join(app.getPath('appData'),'Microsoft','Windows','Start Menu','Programs','VARCO.lnk')];
  for(const file of links)try{fs.rmSync(file,{force:true});}catch{}
  // Avvio con Windows (stesse opzioni di lib/autostart.cjs).
  if(!TEST)app.setLoginItemSettings({path:process.execPath,args:['--background'],openAtLogin:false});
  for(const k of KEYS)await reg(['delete',k,'/f']);
  await reg(['delete',key('HKCU\\Software\\RegisteredApplications'),'/v','VARCO','/f']);
  // Cartella del programma e (se richiesto) dati: si cancellano DOPO la chiusura, perché
  // mentre questa finestra è aperta i file sono in uso e Chromium riscriverebbe i dati.
  const dir=installDir();
  const targets=[dir,deleteData?app.getPath('userData'):null].filter(Boolean);
  if(targets.length){
    const command=`ping 127.0.0.1 -n 4 >nul & `+targets.map(t=>`rmdir /s /q "${t}"`).join(' & ');
    // windowsVerbatimArguments: senza, Node aggiunge barre rovesciate alle virgolette e cmd non trova la cartella.
    spawn('cmd.exe',['/d','/c',`"${command}"`],{detached:true,stdio:'ignore',windowsHide:true,windowsVerbatimArguments:true}).unref();
  }
  return {ok:true,dir};
}

function run(){
  app.whenReady().then(()=>{
    // Un'altra copia di VARCO aperta userebbe ancora i file: va chiusa prima.
    const alone=app.requestSingleInstanceLock();
    const win=new BrowserWindow({width:460,height:400,resizable:false,maximizable:false,frame:false,show:false,
      backgroundColor:'#07070e',title:'Disinstalla VARCO',icon:path.join(__dirname,'..','assets','app-icon.png'),
      webPreferences:{preload:path.join(__dirname,'..','uninstall-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}});
    win.once('ready-to-show',()=>win.show());
    win.loadFile(path.join(__dirname,'..','uninstall.html'),{query:{running:alone?'0':'1'}});
    ipcMain.handle('uninstall:run',(_e,options)=>uninstall({deleteData:!!options?.deleteData}));
    ipcMain.on('uninstall:close',()=>app.exit(0));
  });
}

module.exports={run};
