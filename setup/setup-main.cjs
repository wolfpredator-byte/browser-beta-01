'use strict';

/**
 * Installer di VARCO (Beta 0.16, mock-up "Futuristic Installer Walkthrough").
 *
 * È una piccola app Electron con la stessa versione del browser. Viene distribuita
 * come eseguibile "portable": Windows la estrae in una cartella temporanea e la avvia.
 * Per non raddoppiare il peso, l'installazione copia il motore Electron dell'installer
 * stesso (exe, dll, pak…) e ci aggiunge l'app vera, che viaggia in resources/payload.
 *
 * Tutto per l'utente corrente, senza permessi di amministratore:
 * - cartella predefinita %LOCALAPPDATA%\Programs\VARCO;
 * - registro solo in HKEY_CURRENT_USER;
 * - i dati del browser (%APPDATA%\personal-workspace-browser) non vengono toccati.
 */
// original-fs: il fs normale di Electron tratta i file .asar come cartelle e non li copia.
const fs=require('original-fs');
const path=require('node:path');
const {execFile,spawn}=require('node:child_process');
const {app,BrowserWindow,ipcMain,dialog,shell}=require('electron');

// L'installer non deve lasciare una sua cartella dati in %APPDATA%.
app.setPath('userData',path.join(app.getPath('temp'),'varco-setup-data'));

const APP_ID='local.personal-workspace-browser';   // uguale al browser: stessa icona raggruppata
/**
 * Modalità di prova (VARCO_SETUP_TEST=cartella): registro sotto HKCU\Software\VARCO-SetupTest,
 * collegamenti nella cartella indicata, nessuna versione precedente rimossa e dati del
 * browser intatti. Serve a provare l'installer senza toccare l'installazione vera.
 */
const TEST=process.env.VARCO_SETUP_TEST||'';
const key=k=>TEST?k.replace('HKCU\\Software','HKCU\\Software\\VARCO-SetupTest'):k;
const UNINSTALL_KEY=key('HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\VARCO');
const runtimeDir=path.dirname(process.execPath);
const payloadDir=path.join(process.resourcesPath,'payload');
const version=app.getVersion();

let win=null;

// ── Utilità ─────────────────────────────────────────────────────────────
const run=(file,args)=>new Promise(resolve=>execFile(file,args,{windowsHide:true},(error,stdout,stderr)=>resolve({ok:!error,stdout:String(stdout||''),stderr:String(stderr||'')})));
const reg=(...args)=>run('reg',args);
const powershell=script=>run('powershell',['-NoProfile','-NonInteractive','-Command',script]);

/** File del motore da copiare: tutto tranne l'app dell'installer e il pacchetto. */
function runtimeFiles(){
  const out=[];
  const walk=(dir,rel)=>{
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const relPath=path.join(rel,entry.name);
      if(rel===''&&entry.name==='VARCO Setup.exe')continue;              // diventa VARCO.exe
      if(rel==='resources'&&['app.asar','app.asar.unpacked','payload','app-update.yml','default_app.asar'].includes(entry.name))continue;
      if(entry.isDirectory())walk(path.join(dir,entry.name),relPath);
      else out.push({from:path.join(dir,entry.name),to:relPath,size:fs.statSync(path.join(dir,entry.name)).size});
    }
  };
  walk(runtimeDir,'');
  out.push({from:process.execPath,to:'VARCO.exe',size:fs.statSync(process.execPath).size});
  // L'app vera: payload/app.asar → resources/app.asar (Electron la apre come archivio, va copiata come file).
  const asar=path.join(payloadDir,'app.asar');
  out.push({from:asar,to:path.join('resources','app.asar'),size:statSize(asar)});
  return out;
}
function statSize(file){try{return fs.statSync(file).size;}catch{return 0;}}

/** Installazioni già presenti (VARCO o il vecchio "Personal Browser"), per toglierle prima. */
async function findInstalls(){
  if(TEST)return [];
  const r=await powershell(`Get-ChildItem 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall' | ForEach-Object { $p=Get-ItemProperty $_.PSPath; if($p.DisplayName -match '^(VARCO|Personal Browser)'){ [pscustomobject]@{key=$_.PSChildName;name=$p.DisplayName;quiet=$p.QuietUninstallString;uninstall=$p.UninstallString;location=$p.InstallLocation} } } | ConvertTo-Json -Compress`);
  if(!r.ok||!r.stdout.trim())return [];
  const parsed=JSON.parse(r.stdout);
  return (Array.isArray(parsed)?parsed:[parsed]).map(x=>({...x,
    // Il vecchio installer non scrive InstallLocation: la ricaviamo dal percorso del disinstallatore.
    location:x.location||(String(x.uninstall||'').match(/"([^"]+)\\[^\\"]+\.exe"/)||[])[1]||''}));
}

/** VARCO è aperto? (L'installer si chiama "VARCO Setup.exe", quindi non conta.) */
async function varcoRunning(){
  if(TEST)return false; // in prova il VARCO vero resta aperto e intoccato
  const r=await run('tasklist',['/FI','IMAGENAME eq VARCO.exe','/FO','CSV','/NH']);
  return /"VARCO\.exe"/i.test(r.stdout);
}

function send(channel,payload){if(win&&!win.isDestroyed())win.webContents.send(channel,payload);}

// ── Passaggi dell'installazione ─────────────────────────────────────────
async function removeOld(installs,destination){
  for(const old of installs){
    // Disinstallatore di electron-builder (vecchie versioni): ha la modalità silenziosa /S.
    if(old.quiet){
      const exe=(old.quiet.match(/^"([^"]+)"/)||[])[1];
      if(exe&&fs.existsSync(exe)){
        await new Promise(resolve=>{
          // "_?=cartella" fa lavorare il disinstallatore sul posto e aspettarne la fine; NSIS lo vuole
          // ultimo e SENZA virgolette anche con spazi: per questo la riga di comando è scritta a mano.
          // start /wait aspetta il disinstallatore (è un programma con finestra, cmd da solo non aspetterebbe).
          const line=`start "" /wait "${exe}" /currentuser /S _?=${path.dirname(exe)}`;
          const child=spawn('cmd.exe',['/d','/s','/c',`"${line}"`],{windowsHide:true,windowsVerbatimArguments:true});
          child.on('exit',resolve);child.on('error',resolve);
        });
      }
      await reg('delete',`HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${old.key}`,'/f');
    }
    // Stessa cartella: resta solo il vecchio disinstallatore da togliere (i file vengono sovrascritti).
    if(old.location&&path.resolve(old.location)===path.resolve(destination))
      try{fs.rmSync(path.join(old.location,'Uninstall VARCO.exe'),{force:true});}catch{}
    // Cartella vecchia: la togliamo solo se non è quella in cui stiamo installando.
    if(old.location&&path.resolve(old.location)!==path.resolve(destination)){
      try{fs.rmSync(old.location,{recursive:true,force:true});}catch{}
      // "Programs\Personal Browser\VARCO": se la cartella sopra resta vuota, via anche lei.
      const parent=path.dirname(old.location);
      try{if(/Personal Browser$/i.test(parent)&&!fs.readdirSync(parent).length)fs.rmdirSync(parent);}catch{}
    }
  }
}

async function copyFiles(destination){
  const files=runtimeFiles();
  const total=files.reduce((sum,f)=>sum+f.size,0);
  let done=0;
  fs.mkdirSync(destination,{recursive:true});
  for(const f of files){
    const target=path.join(destination,f.to);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    await fs.promises.copyFile(f.from,target);
    done+=f.size;
    send('setup:progress',{step:'extract',percent:Math.round(80*done/total)});
  }
  return total;
}

async function registerUninstall(destination,size){
  const exe=path.join(destination,'VARCO.exe');
  const values=[['DisplayName','REG_SZ','VARCO'],['DisplayVersion','REG_SZ',version],['Publisher','REG_SZ','VARCO'],
    ['DisplayIcon','REG_SZ',`"${exe}",0`],['InstallLocation','REG_SZ',destination],
    ['UninstallString','REG_SZ',`"${exe}" --uninstall`],['EstimatedSize','REG_DWORD',String(Math.round(size/1024))],
    ['NoModify','REG_DWORD','1'],['NoRepair','REG_DWORD','1']];
  for(const [name,type,data] of values)await reg('add',UNINSTALL_KEY,'/v',name,'/t',type,'/d',data,'/f');
}

/**
 * "Imposta VARCO come browser predefinito": Windows non permette più ai programmi di
 * sceglierlo da soli. Registriamo VARCO tra i browser (solo per questo utente) e apriamo
 * la pagina di Impostazioni dove la scelta è a un clic.
 */
async function registerBrowser(destination){
  const exe=path.join(destination,'VARCO.exe');
  const base='HKCU\\Software\\Clients\\StartMenuInternet\\VARCO';
  const command=`"${exe}" "%1"`;
  const entries=[
    [base,'','VARCO'],[base+'\\DefaultIcon','',`"${exe}",0`],[base+'\\shell\\open\\command','',`"${exe}"`],
    [base+'\\Capabilities','ApplicationName','VARCO'],[base+'\\Capabilities','ApplicationDescription','VARCO — your space, beyond the web'],
    [base+'\\Capabilities','ApplicationIcon',`"${exe}",0`],
    [base+'\\Capabilities\\URLAssociations','http','VARCOURL'],[base+'\\Capabilities\\URLAssociations','https','VARCOURL'],
    [base+'\\Capabilities\\StartMenu','StartMenuInternet','VARCO'],
    ['HKCU\\Software\\RegisteredApplications','VARCO','Software\\Clients\\StartMenuInternet\\VARCO\\Capabilities'],
    ['HKCU\\Software\\Classes\\VARCOURL','','Pagina web (VARCO)'],['HKCU\\Software\\Classes\\VARCOURL','URL Protocol',''],
    ['HKCU\\Software\\Classes\\VARCOURL\\DefaultIcon','',`"${exe}",0`],
    ['HKCU\\Software\\Classes\\VARCOURL\\shell\\open\\command','',command]
  ];
  for(const [k,name,data] of entries)await reg('add',key(k),...(name?['/v',name]:['/ve']),'/t','REG_SZ','/d',data,'/f');
}

function createShortcuts(destination,options){
  const exe=path.join(destination,'VARCO.exe');
  const link={target:exe,cwd:destination,icon:exe,iconIndex:0,appUserModelId:APP_ID,description:'VARCO — your space, beyond the web'};
  const desktop=TEST?path.join(TEST,'Desktop'):app.getPath('desktop');
  fs.mkdirSync(desktop,{recursive:true});
  if(options.desktop)shell.writeShortcutLink(path.join(desktop,'VARCO.lnk'),'create',link)||
    shell.writeShortcutLink(path.join(desktop,'VARCO.lnk'),'replace',link);
  if(options.startMenu){
    const folder=TEST?path.join(TEST,'StartMenu'):path.join(app.getPath('appData'),'Microsoft','Windows','Start Menu','Programs');
    fs.mkdirSync(folder,{recursive:true});
    shell.writeShortcutLink(path.join(folder,'VARCO.lnk'),'create',link)||shell.writeShortcutLink(path.join(folder,'VARCO.lnk'),'replace',link);
  }
}

/** "Collegamento con JARVIS": accende il server MCP nelle impostazioni del browser. */
function enableJarvis(){
  if(TEST)return;
  const file=path.join(app.getPath('appData'),'personal-workspace-browser','browser-data.json');
  try{
    const data=JSON.parse(fs.readFileSync(file,'utf8'));
    data.settings=data.settings||{};
    data.settings.jarvis={...(data.settings.jarvis||{}),enabled:true};
    fs.writeFileSync(file+'.tmp',JSON.stringify(data,null,2));
    fs.renameSync(file+'.tmp',file);
  }catch{} // primo avvio: il browser crea il file, e JARVIS si accende dal pannello
}

async function install(options){
  const destination=path.resolve(options.destination);
  const steps=['remove','extract','components','config','shortcuts','finish'];
  const step=(name,percent)=>send('setup:progress',{step:name,percent,steps});
  step('remove',2);
  await removeOld(await findInstalls(),destination);
  step('extract',5);
  const size=await copyFiles(destination);
  step('components',84);
  await registerUninstall(destination,size);
  step('config',90);
  if(options.defaultBrowser)await registerBrowser(destination);
  if(options.jarvis)enableJarvis();
  step('shortcuts',95);
  createShortcuts(destination,options);
  step('finish',100);
  return {ok:true,exe:path.join(destination,'VARCO.exe'),openDefaultApps:!!options.defaultBrowser};
}

// ── Finestra e canali ───────────────────────────────────────────────────
function setupIpc(){
  ipcMain.handle('setup:info',async()=>{
    const defaultDir=TEST?path.join(TEST,'Programs','VARCO'):path.join(app.getPath('home'),'AppData','Local','Programs','VARCO');
    const required=runtimeFiles().reduce((sum,f)=>sum+f.size,0);
    let license='';try{license=fs.readFileSync(path.join(__dirname,'licenza.txt'),'utf8');}catch{}
    return {version,defaultDir,required,installs:await findInstalls(),running:await varcoRunning(),license};
  });
  ipcMain.handle('setup:free',(_e,dir)=>{
    // Spazio libero sul disco della cartella (risale alla prima cartella esistente).
    let probe=path.resolve(dir);
    while(!fs.existsSync(probe)&&path.dirname(probe)!==probe)probe=path.dirname(probe);
    try{const s=fs.statfsSync(probe);return s.bavail*s.bsize;}catch{return null;}
  });
  ipcMain.handle('setup:chooseDir',async(_e,current)=>{
    const r=await dialog.showOpenDialog(win,{title:'Scegli dove installare VARCO',defaultPath:current,properties:['openDirectory','createDirectory']});
    if(r.canceled||!r.filePaths[0])return null;
    const chosen=r.filePaths[0];
    return /[\\/]VARCO$/i.test(chosen)?chosen:path.join(chosen,'VARCO');
  });
  ipcMain.handle('setup:running',()=>varcoRunning());
  // Chiude VARCO se è aperto (anche nell'area di notifica). I dati sono salvati a ogni modifica.
  ipcMain.handle('setup:closeVarco',async()=>{await run('taskkill',['/IM','VARCO.exe','/T','/F']);await new Promise(r=>setTimeout(r,800));return !(await varcoRunning());});
  ipcMain.handle('setup:install',async(_e,options)=>{
    try{return await install(options);}
    catch(error){return {ok:false,error:String(error.message||error)};}
  });
  ipcMain.handle('setup:finish',async(_e,{launch,exe,openDefaultApps})=>{
    if(openDefaultApps&&!TEST)await shell.openExternal('ms-settings:defaultapps?registeredAppUser=VARCO');
    if(launch&&exe&&fs.existsSync(exe))spawn(exe,[],{detached:true,stdio:'ignore'}).unref();
    app.quit();
  });
  ipcMain.on('setup:window',(_e,action)=>{
    if(action==='minimize')win?.minimize();
    else if(action==='close')app.quit();
  });
}

// ── Aggiornamento (Beta 0.23) ───────────────────────────────────────────
/**
 * Avviato da VARCO stesso (lib/updater.cjs): "VARCO Setup X.exe" --update "<cartella di VARCO>" --pid <processo>.
 * Niente procedura guidata: aspetta che VARCO si chiuda, sostituisce i file, aggiorna la voce
 * in "App installate" e lo riapre. Mostra solo una piccola finestra con l'avanzamento.
 */
function updateTarget(){
  const index=process.argv.indexOf('--update');
  const dir=index>0?process.argv[index+1]:'';
  if(!dir)return null;
  const destination=path.resolve(dir);
  // Solo una cartella che contiene già VARCO: l'aggiornamento non installa altrove.
  const looksRight=fs.existsSync(path.join(destination,'VARCO.exe'))&&fs.existsSync(path.join(destination,'resources','app.asar'));
  return looksRight?destination:null;
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
/** Registro dell'aggiornamento in %TEMP%\varco-update.log: se qualcosa va storto, lì c'è il perché. */
function updateLog(...parts){
  try{fs.appendFileSync(path.join(app.getPath('temp'),'varco-update.log'),`${new Date().toISOString()} ${parts.join(' ')}\n`);}catch{}
}
/** Il VARCO che ha chiesto l'aggiornamento è ancora aperto? */
function callerAlive(){
  const index=process.argv.indexOf('--pid');
  const pid=index>0?Number(process.argv[index+1]):0;
  if(!Number.isInteger(pid)||pid<=0)return false;
  try{process.kill(pid,0);return true;}catch{return false;}
}
async function runUpdate(destination){
  const exe=path.join(destination,'VARCO.exe');
  try{
    send('setup:progress',{step:'remove',percent:2});
    // VARCO si sta chiudendo da solo: gli diamo fino a 20 secondi, poi lo chiudiamo noi.
    for(let i=0;i<40&&(callerAlive()||await varcoRunning());i++)await sleep(500);
    if(await varcoRunning()){updateLog('VARCO ancora aperto: lo chiudo');await run('taskkill',['/IM','VARCO.exe','/T','/F']);await sleep(1000);}
    updateLog('copio in',destination);
    const size=await copyFiles(destination);
    send('setup:progress',{step:'config',percent:92});
    await registerUninstall(destination,size);
    send('setup:progress',{step:'finish',percent:100});
    updateLog('fatto,',Math.round(size/1048576),'MB');
  }catch(error){
    updateLog('errore:',error.stack||error);
    dialog.showErrorBox('Aggiornamento di VARCO non riuscito',`${error.message||error}\n\nVARCO si riapre con la versione di prima. Puoi installare la nuova a mano con questo stesso file.`);
  }
  // Gli argomenti che VARCO aveva (es. --user-data-dir) tornano nel nuovo avvio.
  const relaunch=process.argv.flatMap((arg,i,all)=>arg==='--relaunch-arg'&&/^--user-data-dir=/.test(all[i+1]||'')?[all[i+1]]:[]);
  if(fs.existsSync(exe))spawn(exe,relaunch,{detached:true,stdio:'ignore'}).unref();
  setTimeout(()=>app.quit(),400);
}

if(process.argv.includes('--update')){
  updateLog('avvio',version,JSON.stringify(process.argv.slice(1)));
  process.on('uncaughtException',error=>updateLog('eccezione:',error.stack||error));
  app.on('quit',(_e,code)=>updateLog('uscita',code));
}
app.whenReady().then(()=>{
  const updateDir=updateTarget();
  if(process.argv.includes('--update'))updateLog('cartella',updateDir||'NON VALIDA');
  if(updateDir){
    win=new BrowserWindow({width:420,height:150,resizable:false,maximizable:false,minimizable:false,frame:false,show:false,
      backgroundColor:'#07070e',title:'Aggiornamento di VARCO',icon:path.join(__dirname,'assets','app-icon-256.png'),
      webPreferences:{preload:path.join(__dirname,'setup-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}});
    win.once('ready-to-show',()=>win.show());
    win.loadFile(path.join(__dirname,'update.html'),{query:{version}});
    win.webContents.once('did-finish-load',()=>{
      // VARCO aspetta questo file per chiudersi (vedi lib/updater.cjs).
      const index=process.argv.indexOf('--ready-file');
      const readyFile=index>0?process.argv[index+1]:'';
      if(readyFile&&/installer-ready$/.test(readyFile))try{fs.writeFileSync(readyFile,String(process.pid));}catch{}
      runUpdate(updateDir);
    });
    return;
  }
  setupIpc();
  win=new BrowserWindow({width:1000,height:640,resizable:false,maximizable:false,frame:false,show:false,
    backgroundColor:'#07070e',title:'Installazione di VARCO',icon:path.join(__dirname,'assets','app-icon-256.png'),
    webPreferences:{preload:path.join(__dirname,'setup-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}});
  win.once('ready-to-show',()=>win.show());
  win.loadFile(path.join(__dirname,'setup.html'));
});
app.on('window-all-closed',()=>app.quit());
