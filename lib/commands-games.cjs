'use strict';

/**
 * Comandi del gaming companion e del funzionamento in background.
 * Non richiedono una finestra: possono arrivare dall'icona nell'area di
 * notifica quando nessuna finestra è aperta.
 */
const path=require('node:path');
const {app,dialog}=require('electron');
const {state,save}=require('./state.cjs');
const windows=require('./windows.cjs');
const tabs=require('./tabs.cjs');
const companion=require('./companion.cjs');
const tray=require('./tray.cjs');
const autostart=require('./autostart.cjs');
const {normalizeGame}=require('./game-rules.cjs');
const {userProcessNames}=require('./processes.cjs');
const jarvis=require('./jarvis.cjs');

function registerGameCommands(bus){
  const {data}=state;
  const changed=()=>{save();windows.emitAll();tray.refreshTooltip();};
  const game=id=>data.games.find(g=>g.id===id);

  bus.register('openBrowser',{description:'Mostra le finestre aperte o riapre quelle della volta scorsa.',run:()=>{
    if(state.windows.length){
      for(const w of state.windows)if(w.win.isMinimized())w.win.restore();
      windows.focusedWindow()?.win.focus();
    }else tabs.openSavedWindows();
  }});
  bus.register('quit',{description:'Chiude il browser, anche dall’area di notifica.',run:()=>app.quit()});

  bus.register('setRunInBackground',{args:{enabled:'bool'},description:'Resta nell’area di notifica quando chiudi le finestre.',
    run:(_ctx,{enabled})=>{data.settings.runInBackground=enabled;changed();}});
  bus.register('setOpenAtLogin',{args:{enabled:'bool'},description:'Avvia il browser (solo icona) all’accensione.',
    run:(_ctx,{enabled})=>{
      autostart.setEnabled(enabled);
      // Senza background, l'avvio con Windows aprirebbe e chiuderebbe subito il browser.
      if(enabled&&!data.settings.runInBackground){data.settings.runInBackground=true;changed();}
      return {ok:true,enabled:autostart.isEnabled()};
    }});
  // ── JARVIS (server MCP) ──
  bus.register('setJarvisEnabled',{args:{enabled:'bool'},description:'Attiva o spegne il server MCP per JARVIS.',
    run:(_ctx,{enabled})=>{jarvis.setEnabled(enabled);}});
  bus.register('setJarvisReadPages',{args:{enabled:'bool'},description:'Permette a JARVIS di leggere il testo delle pagine.',
    run:(_ctx,{enabled})=>{jarvis.setReadPages(enabled);}});
  bus.register('regenerateJarvisToken',{description:'Crea un nuovo token: i client con quello vecchio vengono rifiutati.',
    run:()=>{jarvis.regenerateToken();}});
  bus.register('copyJarvisConfig',{description:'Copia la configurazione MCP (url e token) negli appunti.',run:()=>jarvis.copyClientConfig()});
  bus.register('showJarvisConfigFile',{description:'Mostra jarvis-mcp.json in Esplora file.',run:()=>{jarvis.showConfigFile();}});
  bus.register('setGameWatcher',{args:{enabled:'bool'},description:'Attiva o mette in pausa il rilevamento dei giochi.',
    run:async(_ctx,{enabled})=>{
      data.settings.gameWatcher=enabled;
      state.gameWatcher?.setEnabled(enabled);
      await state.gameWatcher?.tick(); // In pausa chiude subito il companion in corso.
      changed();
    }});

  bus.register('saveGame',{
    args:{id:'int?',name:'string',exe:'string',workspace:'string',sites:'string',display:'int?',alwaysOnTop:'bool',closeOnExit:'bool'},
    description:'Aggiunge o modifica un gioco del companion.',
    run:(_ctx,args)=>{
      const checked=normalizeGame(args,data.workspaces.map(w=>w.name));
      if(!checked.ok)return checked;
      const existing=args.id!==undefined?game(args.id):null;
      if(args.id!==undefined&&!existing)return {ok:false,error:'Gioco non trovato.'};
      const clash=data.games.find(g=>g.exe.toLowerCase()===checked.game.exe.toLowerCase()&&g!==existing);
      if(clash)return {ok:false,error:`${checked.game.exe} è già usato da «${clash.name}».`};
      if(existing)Object.assign(existing,checked.game);
      else data.games.push({id:Math.max(0,...data.games.map(g=>g.id))+1,enabled:true,...checked.game});
      changed();
      return {ok:true};
    }});
  bus.register('deleteGame',{args:{id:'int'},description:'Elimina un gioco.',run:(_ctx,{id})=>{
    data.games=data.games.filter(g=>g.id!==id);changed();return {ok:true};
  }});
  bus.register('setGameEnabled',{args:{id:'int',enabled:'bool'},description:'Attiva o disattiva il rilevamento di un gioco.',
    run:async(_ctx,{id,enabled})=>{
      const target=game(id);if(!target)return;
      target.enabled=enabled;
      await state.gameWatcher?.tick();
      changed();
    }});
  bus.register('testGame',{args:{id:'int'},description:'Apre il companion come se il gioco fosse partito.',run:(_ctx,{id})=>{
    const target=game(id);if(target)companion.openCompanion(target,{test:true});
  }});

  // Aiuti per compilare il modulo: l'eseguibile si sceglie dal PC o tra i programmi aperti.
  bus.register('chooseGameExe',{description:'Sceglie un .exe dal disco e ne restituisce il nome.',run:async ctx=>{
    const parent=(ctx.window||windows.focusedWindow())?.win;
    const result=await dialog.showOpenDialog(parent,{title:'Scegli l’eseguibile del gioco',
      filters:[{name:'Programmi',extensions:['exe']}],properties:['openFile']});
    if(result.canceled||!result.filePaths[0])return {ok:false};
    return {ok:true,exe:path.basename(result.filePaths[0])};
  }});
  bus.register('listUserProcesses',{description:'Programmi aperti in questo momento (nomi .exe).',
    run:async()=>({ok:true,names:await userProcessNames()})});
}

module.exports={registerGameCommands};
