'use strict';

/**
 * Punto di ingresso del processo principale. Qui colleghiamo i pezzi:
 *
 *   lib/storage.cjs      browser-data.json (salvataggio atomico, migrazioni)
 *   lib/command-bus.cjs  bus dei comandi: unico ingresso per UI, menu, tasti, JARVIS
 *   lib/commands.cjs     l'elenco dei comandi
 *   lib/windows.cjs      finestre multiple (un workspace per finestra)
 *   lib/tabs.cjs         schede, workspace, stack, popup
 *   lib/web-session.cjs  permessi, user agent, download
 *   lib/*-rules.cjs, tab-*.cjs   regole pure, testate in test/
 */
const path=require('node:path');
const {app,ipcMain,Menu}=require('electron');
const {state,flushSave}=require('./lib/state.cjs');
const {createStore}=require('./lib/storage.cjs');
const {createCommandBus}=require('./lib/command-bus.cjs');
const {registerCommands}=require('./lib/commands.cjs');
const {shortcutCommand}=require('./lib/window-rules.cjs');
const {setupWebSession}=require('./lib/web-session.cjs');
const windows=require('./lib/windows.cjs');
const tabs=require('./lib/tabs.cjs');

app.enableSandbox();
const bus=createCommandBus();

/** Trova la finestra di una cornice o di una pagina web che ha il focus. */
function windowOfAnyContents(contents){
  const owner=windows.windowOfContents(contents);
  if(owner)return owner;
  const tab=state.tabs.find(t=>t.view?.webContents===contents);
  return tab?windows.windowFor(tab.workspace):null;
}

app.whenReady().then(()=>{
  // Nessun menu applicazione: le scorciatoie sono gestite da window-rules.cjs,
  // e il menu predefinito di Electron ricaricherebbe la cornice invece della pagina.
  Menu.setApplicationMenu(null);
  state.store=createStore(path.join(app.getPath('userData'),'browser-data.json'));
  state.data=state.store.load();
  setupWebSession();
  registerCommands(bus);

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

  // Schede salvate → dormienti; poi riapriamo le finestre della volta scorsa.
  tabs.restoreSession();
  const seen=new Set();
  const wanted=state.data.openWindows.filter(x=>x&&typeof x.workspace==='string'&&
    state.data.workspaces.some(w=>w.name===x.workspace)&&!seen.has(x.workspace)&&seen.add(x.workspace));
  if(!wanted.length)wanted.push({workspace:state.data.activeWorkspace});
  // L'ultimo workspace usato viene aperto per ultimo, così resta in primo piano.
  wanted.sort((a,b)=>(a.workspace===state.data.activeWorkspace)-(b.workspace===state.data.activeWorkspace));
  for(const saved of wanted)tabs.openWorkspaceWindow(saved.workspace,saved);
});

app.on('before-quit',()=>{
  // Registriamo TUTTE le finestre prima che inizino a chiudersi una alla volta.
  if(!state.quitting&&state.windows.length)windows.rememberOpenWindows();
  state.quitting=true;
});
app.on('will-quit',flushSave);
app.on('window-all-closed',()=>app.quit());
