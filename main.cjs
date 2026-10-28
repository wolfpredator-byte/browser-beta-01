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
const windows=require('./lib/windows.cjs');
const tabs=require('./lib/tabs.cjs');

app.enableSandbox();
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
  setupWebSession();
  registerCommands(bus);
  registerGameCommands(bus);
  registerProjectCommands(bus);

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

  // Schede salvate → dormienti. Avviato con Windows: solo l'icona, nessuna finestra.
  tabs.restoreSession();
  if(!autostart.startedInBackground())tabs.openSavedWindows();
}

// Una sola copia del browser: aprirlo di nuovo (es. dal collegamento mentre è
// nell'area di notifica) mostra le finestre della copia già attiva.
if(!app.requestSingleInstanceLock())app.quit();
else{
  app.on('second-instance',()=>bus.dispatch('openBrowser',{},{source:'second-instance'}));
  app.whenReady().then(start);
}

app.on('before-quit',()=>{
  // Registriamo TUTTE le finestre prima che inizino a chiudersi una alla volta.
  if(!state.quitting&&state.windows.length)windows.rememberOpenWindows();
  state.quitting=true;
  state.gameWatcher?.stop();
  monitors.stop();
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
