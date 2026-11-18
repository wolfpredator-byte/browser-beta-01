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
const appScan=require('./app-scan.cjs');
const {normalizeFolders}=require('./app-scan-rules.cjs');

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
      windows.emitAll(); // il pannello Impostazioni rilegge lo stato da Windows
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
    args:{id:'int?',name:'string',exe:'string',workspace:'string',sites:'string',display:'int?',side:'string?',size:'int?',alwaysOnTop:'bool',closeOnExit:'bool',companionKind:'string?'},
    description:'Aggiunge o modifica un gioco del companion.',
    run:(_ctx,args)=>{
      const checked=normalizeGame(args,data.workspaces.map(w=>w.name));
      if(!checked.ok)return checked;
      const existing=args.id!==undefined?game(args.id):null;
      if(args.id!==undefined&&!existing)return {ok:false,error:'Gioco non trovato.'};
      const clash=data.games.find(g=>g.exe.toLowerCase()===checked.game.exe.toLowerCase()&&g!==existing);
      if(clash)return {ok:false,error:`${checked.game.exe} è già usato da «${clash.name}».`};
      // Beta 0.43: il monitor si salva anche per impronta fisica (l'id di Windows può cambiare).
      const {screen}=require('electron');const policy=require('./window-policy-rules.cjs');
      const {side,size,...g}=checked.game;
      const d=Number.isInteger(g.display)?screen.getAllDisplays().find(x=>x.id===g.display):null;
      g.place={display:d?policy.displayKey(d):null,side,size,rel:null};
      checked.game=g;
      if(existing)Object.assign(existing,checked.game);
      else data.games.push({id:Math.max(0,...data.games.map(g=>g.id))+1,enabled:true,...checked.game});
      changed();
      return {ok:true};
    }});
  // Beta 0.43: posizione del companion, dalla finestra del companion (palette) o dalle Impostazioni.
  bus.register('companionPinHere',{description:'Companion: apri sempre qui (questo monitor e questa posizione).',run:ctx=>companion.pinHere(ctx.window)});
  bus.register('companionMoveMonitor',{description:'Companion: sposta sull’altro monitor.',run:ctx=>companion.moveToNextMonitor(ctx.window)});
  bus.register('companionRemember',{description:'Companion: ricorda la posizione (dove lo lasci).',run:ctx=>companion.rememberPosition(ctx.window)});
  bus.register('setCompanionDefault',{args:{display:'int?',side:'string',size:'int'},description:'Posizione predefinita del companion.',run:(_ctx,{display,side,size})=>{
    const {screen}=require('electron');const policy=require('./window-policy-rules.cjs');
    const d=Number.isInteger(display)?screen.getAllDisplays().find(x=>x.id===display):null;
    data.settings.companionDefault=policy.normalizePlace({display:d?policy.displayKey(d):null,side,size})||{display:null,side:'full',size:100,rel:null};
    changed();return {ok:true};
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
    const target=game(id);if(!target)return;
    if(target.companionKind==='finestra')companion.openCompanion(target,{test:true});else require('./companion-panel.cjs').open(target); // Beta 0.43.4
  }});

  // Aiuti per compilare il modulo: l'eseguibile si sceglie dal PC o tra i programmi aperti.
  bus.register('chooseGameExe',{description:'Sceglie un .exe dal disco e ne restituisce il nome.',run:async ctx=>{
    const parent=(ctx.window||windows.focusedWindow())?.win;
    const result=await dialog.showOpenDialog(parent,{title:'Scegli l’eseguibile del gioco',
      filters:[{name:'Programmi',extensions:['exe']}],properties:['openFile']});
    if(result.canceled||!result.filePaths[0])return {ok:false};
    return {ok:true,exe:path.basename(result.filePaths[0])};
  }});
  // Beta 0.23: giochi e programmi installati, senza dover sapere dove stanno.
  bus.register('scanApps',{args:{kind:['games','apps'],refresh:'bool?'},description:'Giochi (Steam, Epic, tue cartelle) o programmi (menu Start, tue cartelle) trovati sul PC.',
    run:async(_c,{kind,refresh})=>({ok:true,items:await appScan.scan(kind,{refresh:!!refresh}),folders:state.data.settings.scanFolders})});
  bus.register('addScanFolder',{description:'Aggiunge una cartella in cui cercare giochi e programmi.',run:async ctx=>{
    const parent=(ctx.window||windows.focusedWindow())?.win;
    const result=await dialog.showOpenDialog(parent,{title:'Cartella con giochi o programmi (es. C:\\Giochi)',properties:['openDirectory']});
    if(result.canceled||!result.filePaths[0])return {ok:true,cancelled:true};
    const folders=normalizeFolders([...state.data.settings.scanFolders,result.filePaths[0]]);
    if(folders.length===state.data.settings.scanFolders.length)return {ok:false,error:'Cartella già presente (o già 20 cartelle).'};
    state.data.settings.scanFolders=folders;appScan.forget();save();
    return {ok:true};
  }});
  bus.register('removeScanFolder',{args:{path:'string'},description:'Toglie una cartella dalla ricerca di giochi e programmi.',run:(_c,{path:dir})=>{
    state.data.settings.scanFolders=state.data.settings.scanFolders.filter(x=>x!==dir);appScan.forget();save();
    return {ok:true};
  }});
  bus.register('listUserProcesses',{description:'Programmi aperti in questo momento (nomi .exe).',
    run:async()=>({ok:true,names:await userProcessNames()})});
}

module.exports={registerGameCommands};
