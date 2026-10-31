'use strict';

/**
 * Punto di ingresso del processo principale. Qui colleghiamo i pezzi:
 *
 *   lib/storage.cjs        browser-data.json (salvataggio atomico, migrazioni)
 *   lib/command-bus.cjs    bus dei comandi: unico ingresso per UI, menu, tasti, icona, JARVIS
 *   lib/commands*.cjs      l'elenco dei comandi
 *   lib/windows.cjs        finestre multiple (un workspace per finestra)
 *   lib/tabs.cjs           schede, workspace, stack, popup
 *   lib/web-session.cjs    permessi, user agent, download
 *   lib/tray.cjs           icona nell'area di notifica, funzionamento in background
 *   lib/game-watcher.cjs   rilevamento dei giochi → lib/companion.cjs
 *   lib/projects.cjs       progetto.browser.json, fiducia, segreti → project-processes, monitors
 *   lib/jarvis.cjs         server MCP su 127.0.0.1 per JARVIS (protocollo in mcp-protocol.cjs)
 *   lib/*-rules.cjs, tab-*.cjs   regole pure, testate in test/
 */
const path=require('node:path');
const {app,ipcMain,Menu}=require('electron');
const {state,flushSave}=require('./lib/state.cjs');
const {createStore}=require('./lib/storage.cjs');
const {createCommandBus}=require('./lib/command-bus.cjs');
const {registerCommands}=require('./lib/commands.cjs');
const {registerGameCommands}=require('./lib/commands-games.cjs');
const {registerProjectCommands}=require('./lib/commands-projects.cjs');
const {registerSettingsCommands}=require('./lib/commands-settings.cjs');
const {registerAppearanceCommands}=require('./lib/commands-appearance.cjs');
const diagnostics=require('./lib/diagnostics.cjs');
// Beta 0.20: varco-view:// (visualizzatore di file) va registrato prima di app.ready.
require('./lib/file-viewer.cjs').registerScheme();
// Prima di tutto il resto: anche gli errori dell'avvio finiscono nella diagnostica.
diagnostics.install();
const {shortcutCommand}=require('./lib/window-rules.cjs');
const {setupWebSession}=require('./lib/web-session.cjs');
const {createGameWatcher}=require('./lib/game-watcher.cjs');
const {findRunning}=require('./lib/processes.cjs');
const companion=require('./lib/companion.cjs');
const tray=require('./lib/tray.cjs');
const autostart=require('./lib/autostart.cjs');
const projects=require('./lib/projects.cjs');
const projectProcesses=require('./lib/project-processes.cjs');
const monitors=require('./lib/monitors.cjs');
const jarvis=require('./lib/jarvis.cjs');
const sleeper=require('./lib/sleeper.cjs');
const windows=require('./lib/windows.cjs');
const tabs=require('./lib/tabs.cjs');

app.enableSandbox();
// Beta 0.26: la libreria delle estensioni registra lo schema crx:// (icone) quando viene caricata,
// e va fatto prima che l'app sia pronta.
require('electron-chrome-extensions');
// Stessa cartella dati per `npm start` e per l'eseguibile installato: workspace,
// sessioni, segreti e jarvis-mcp.json restano in %APPDATA%\personal-workspace-browser.
// --user-data-dir (profili di prova) ha la precedenza.
if(!app.commandLine.hasSwitch('user-data-dir'))app.setPath('userData',path.join(app.getPath('appData'),'personal-workspace-browser'));
const bus=createCommandBus();

/** Trova la finestra di una cornice o di una pagina web che ha il focus. */
function windowOfAnyContents(contents){
  const owner=windows.windowOfContents(contents);
  if(owner)return owner;
  const tab=state.tabs.find(t=>t.view?.webContents===contents);
  return tab?windows.windowForTab(tab):null;
}

function start(){
  // Nessun menu applicazione: le scorciatoie sono gestite da window-rules.cjs,
  // e il menu predefinito di Electron ricaricherebbe la cornice invece della pagina.
  Menu.setApplicationMenu(null);
  // Identità dell'app per Windows (notifiche, barra delle applicazioni): coincide con
  // build.appId di package.json nell'eseguibile; durante lo sviluppo è electron.exe.
  app.setAppUserModelId(app.isPackaged?'local.personal-workspace-browser':process.execPath);
  state.store=createStore(path.join(app.getPath('userData'),'browser-data.json'));
  state.data=state.store.load();
  require('./lib/web-rules.cjs').setCustomBangs(state.data.settings.bangs); // Beta 0.28: scorciatoie di ricerca tue
  setupWebSession();
  registerCommands(bus);
  registerGameCommands(bus);
  registerProjectCommands(bus);
  registerSettingsCommands(bus);
  registerAppearanceCommands(bus);
  require('./lib/toasts.cjs').setup(bus);
  require('./lib/popup.cjs').setup();

  windows.setShortcutHandler((contents,input)=>{
    const command=shortcutCommand(input);
    if(!command)return false;
    const w=windowOfAnyContents(contents);
    if(!w)return false;
    bus.dispatch(command,{},{window:w,source:'shortcut'});
    return true; // Il tasto non arriva al sito: evita doppie azioni.
  });

  // La cornice chiede azioni con browserAPI.action(nome, parametri).
  // Accettiamo solo messaggi dalle nostre cornici, mai dalle pagine web.
  ipcMain.handle('action',async(event,action,args)=>{
    const w=windows.windowOfContents(event.sender);
    if(!w)return {ok:false,error:'mittente non autorizzato'};
    return bus.dispatch(action,args,{window:w,source:'ui'});
  });

  tray.createTray((name,args={})=>bus.dispatch(name,args,{source:'tray'}));
  require('./lib/system-icons.cjs').sync(); // Beta 0.23: icone del preset in Windows

  state.gameWatcher=createGameWatcher({
    games:()=>state.data.games,
    findRunning,
    onStart:game=>companion.openCompanion(game),
    onStop:game=>companion.closeCompanion(game)
  });
  state.gameWatcher.setEnabled(state.data.settings.gameWatcher);
  state.gameWatcher.start();

  // Progetti: legge progetto.browser.json di ogni workspace con cartella e avvia i monitor.
  projects.loadAll();
  monitors.start();

  // JARVIS: server MCP locale, solo se attivato dal pannello o dall'icona.
  jarvis.init(bus);
  // Schede non guardate da tempo tornano dormienti (impostazione nell'icona).
  sleeper.start();
  require('./lib/compact.cjs').sync(); // Beta 0.28: modalità compatta

  // Schede salvate → dormienti. Avviato con Windows: solo l'icona, nessuna finestra.
  tabs.restoreSession();
  if(!autostart.startedInBackground()){require('./lib/splash.cjs').open();tabs.openSavedWindows();}
  // Beta 0.21: VARCO in "Apri con" e "App predefinite" per i file (solo l'eseguibile installato).
  setTimeout(()=>require('./lib/file-types.cjs').register().catch(()=>{}),8000);
  require('./lib/updater.cjs').start(); // Beta 0.23: aggiornamenti da GitHub
}

// Una sola copia del browser: aprirlo di nuovo (es. dal collegamento mentre è
// nell'area di notifica) mostra le finestre della copia già attiva.
/**
 * Beta 0.16: VARCO come browser predefinito. Windows lo avvia con l'indirizzo come
 * argomento ("VARCO.exe https://…"): lo apriamo in una nuova scheda della finestra
 * in primo piano (se il browser era già aperto arriva tramite second-instance).
 */
const urlsIn=argv=>argv.filter(arg=>/^https?:\/\//i.test(arg)).slice(0,10);
// Beta 0.20: anche i file ("Apri con → VARCO", o trascinati sull'icona) si aprono nel visualizzatore.
const filesIn=argv=>argv.slice(1).filter(arg=>!arg.startsWith('-')&&/^[a-zA-Z]:\\|^\\\\/.test(arg)&&
  !/\.(exe|asar)$/i.test(arg)&&(()=>{try{return require('node:fs').statSync(arg).isFile();}catch{return false;}})()).slice(0,10);
function openUrls(urls){
  if(!urls.length)return false;
  let w=windows.focusedWindow();
  if(!w){tabs.openSavedWindows();w=windows.focusedWindow();}
  if(!w)return false;
  for(const url of urls){
    if(/^https?:/i.test(url))tabs.newTab(url,w.workspace,{pane:w.pane});
    else require('./lib/file-viewer.cjs').openFile(w,url);
  }
  if(w.win.isMinimized())w.win.restore();
  w.win.focus();
  return true;
}

if(process.argv.includes('--uninstall')){
  // Disinstallazione avviata da Windows: niente browser, solo la finestra di conferma.
  require('./lib/uninstall.cjs').run();
}else if(!app.requestSingleInstanceLock())app.quit();
else{
  app.on('second-instance',(_event,argv)=>{
    if(!openUrls([...urlsIn(argv),...filesIn(argv)]))bus.dispatch('openBrowser',{},{source:'second-instance'});
  });
  app.whenReady().then(()=>{start();openUrls([...urlsIn(process.argv),...filesIn(process.argv)]);});
}

/**
 * Beta 0.17.1: i dev server in https (es. Next.js --experimental-https) usano un certificato
 * fatto in casa. Solo per gli indirizzi locali lo accettiamo, come Chrome con
 * "allow-insecure-localhost"; per tutti gli altri siti il controllo resta quello normale.
 */
app.on('certificate-error',(event,_contents,url,_error,_certificate,callback)=>{
  let host='';try{host=new URL(url).hostname;}catch{}
  if(['localhost','127.0.0.1','[::1]'].includes(host)){event.preventDefault();callback(true);}
  else callback(false);
});

app.on('before-quit',()=>{
  // Registriamo TUTTE le finestre prima che inizino a chiudersi una alla volta.
  if(!state.quitting&&state.windows.length)windows.rememberOpenWindows();
  state.quitting=true;
  state.gameWatcher?.stop();
  monitors.stop();
  sleeper.stop();
  projects.closeAll();
  projectProcesses.stopAll(); // I dev server non devono restare aperti senza il browser.
  jarvis.stop();
});
app.on('will-quit',flushSave);
app.on('window-all-closed',()=>{
  // In background restano solo il processo principale e l'icona: le pagine
  // delle finestre chiuse sono già state distrutte (windows.cjs → onClosed).
  if(state.data?.settings.runInBackground&&!state.quitting)tray.notifyBackground();
  else app.quit();
});
