'use strict';

/**
 * Comandi della 0.11: palette dei comandi, pannello Impostazioni,
 * dati del browser (esporta/importa, cancella) e diagnostica.
 */
const fs=require('node:fs');
const path=require('node:path');
const {app,dialog,shell,clipboard,session}=require('electron');
const {state,save}=require('./state.cjs');
const windows=require('./windows.cjs');
const tabs=require('./tabs.cjs');
const palette=require('./palette.cjs');
const diagnostics=require('./diagnostics.cjs');
const autostart=require('./autostart.cjs');
const {paneOf}=require('./tab-advanced.cjs');
const {PARTITION,SEARCH_ENGINES}=require('./web-rules.cjs');
const {exportPayload,parseBackup}=require('./backup-rules.cjs');

function registerSettingsCommands(bus){
  const {data}=state;
  const win=ctx=>ctx.window||windows.focusedWindow();
  const add=(name,args,description,run)=>bus.register(name,{args,description,run:(ctx,a)=>{
    const w=win(ctx);
    return w?run(w,a,ctx):undefined;
  }});

  // ── Palette ──────────────────────────────────────────────────────────
  add('openPalette',{},'Apre la palette dei comandi (F1, Ctrl+Shift+P).',w=>palette.open(w));
  add('closePalette',{},'Chiude la palette e mostra di nuovo la pagina.',w=>palette.close(w));
  // Una scheda di qualunque workspace: va alla sua finestra (aprendola se serve).
  add('focusTab',{id:'int'},'Mostra una scheda di qualunque workspace o finestra.',(_w,{id})=>{
    const t=state.tabs.find(x=>x.id===id);
    if(!t)return {ok:false,error:'Scheda non trovata.'};
    const target=windows.windowForTab(t)||tabs.openWorkspaceWindow(t.workspace,{},paneOf(t));
    if(!target)return {ok:false,error:'Workspace non trovato.'};
    tabs.show(target,id);
    if(target.win.isMinimized())target.win.restore();
    target.win.focus();
    return {ok:true};
  });

  // ── Impostazioni ─────────────────────────────────────────────────────
  bus.register('setSearchEngine',{args:{engine:Object.keys(SEARCH_ENGINES)},description:'Motore per le ricerche dalla barra degli indirizzi.',
    run:(_c,{engine})=>{data.settings.searchEngine=engine;save();windows.emitAll();}});
  bus.register('clearHistory',{description:'Cancella la cronologia e le schede chiuse di recente.',run:()=>{
    data.history=[];data.closedTabs=[];save();windows.emitAll();
  }});
  // Esce da tutti i siti: lo chiede sempre la cornice con un secondo clic di conferma.
  bus.register('clearSiteData',{description:'Cancella cookie, dati salvati dai siti e cache (esci da tutti gli account).',run:async()=>{
    const ses=session.fromPartition(PARTITION);
    await ses.clearStorageData();
    await ses.clearCache();
    for(const t of state.tabs)if(t.view)t.view.webContents.reload();
    return {ok:true};
  }});

  // ── Dati e diagnostica ───────────────────────────────────────────────
  add('exportData',{},'Salva un backup di workspace, preferiti, giochi e impostazioni.',async w=>{
    tabs.persistTabs();
    const day=new Date().toISOString().slice(0,10);
    const chosen=await dialog.showSaveDialog(w.win,{title:'Esporta i dati del browser',
      defaultPath:path.join(app.getPath('documents'),`personal-browser-backup-${day}.json`),
      filters:[{name:'Backup JSON',extensions:['json']}]});
    if(chosen.canceled||!chosen.filePath)return {ok:false,cancelled:true};
    fs.writeFileSync(chosen.filePath,JSON.stringify(exportPayload(data,app.getVersion()),null,2));
    shell.showItemInFolder(chosen.filePath);
    return {ok:true,file:chosen.filePath};
  });
  add('importData',{},'Sostituisce i dati con un backup e riavvia il browser.',async w=>{
    const chosen=await dialog.showOpenDialog(w.win,{title:'Importa un backup',properties:['openFile'],
      filters:[{name:'Backup JSON',extensions:['json']}]});
    if(chosen.canceled||!chosen.filePaths[0])return {ok:false,cancelled:true};
    const file=chosen.filePaths[0];
    if(fs.statSync(file).size>50*1024*1024)return {ok:false,error:'File troppo grande per essere un backup.'};
    const parsed=parseBackup(fs.readFileSync(file,'utf8'),data);
    if(!parsed.ok)return parsed;
    const answer=await dialog.showMessageBox(w.win,{type:'warning',title:'Importa backup',
      message:'Sostituire i dati attuali con questo backup?',
      detail:parsed.summary+'\n\nWorkspace, preferiti, cronologia, giochi, impostazioni e schede salvate verranno sostituiti. '+
        'Il browser si riavvia. I progetti chiederanno di nuovo se ti fidi dei loro comandi.',
      buttons:['Importa e riavvia','Annulla'],defaultId:1,cancelId:1,noLink:true});
    if(answer.response!==0)return {ok:false,cancelled:true};
    // Copia di sicurezza dei dati attuali, poi il file importato; da qui in poi
    // nessun salvataggio deve sovrascriverlo (all'uscita il browser salverebbe le schede aperte).
    const dataFile=path.join(app.getPath('userData'),'browser-data.json');
    fs.copyFileSync(dataFile,dataFile.replace(/\.json$/,`.before-import-${Date.now()}.json`));
    state.store.save(parsed.data);
    state.frozen=true;
    app.relaunch();
    app.quit();
    return {ok:true};
  });
  bus.register('copyDiagnostics',{description:'Copia negli appunti versioni, memoria, impostazioni e ultimi errori.',run:()=>{
    clipboard.writeText(diagnostics.report());
    return {ok:true};
  }});
  bus.register('showDataFolder',{description:'Apre la cartella dei dati del browser.',run:()=>shell.openPath(app.getPath('userData'))});
}

/** Pannello Impostazioni: inviato solo mentre è aperto (legge il registro di Windows). */
function settingsSnapshot(){
  const {data}=state,s=data.settings;
  return {settings:{
    searchEngine:s.searchEngine,
    engines:Object.entries(SEARCH_ENGINES).map(([id,e])=>({id,label:e.label})),
    runInBackground:s.runInBackground,openAtLogin:autostart.isEnabled(),gameWatcher:s.gameWatcher,
    sleepAfterMinutes:s.sleepAfterMinutes,
    adblock:{enabled:s.adblock.enabled,exceptions:s.adblock.allowlist.length},
    sitesWithPermissions:Object.keys(data.sitePermissions).length,
    jarvisEnabled:s.jarvis.enabled,
    historyCount:data.history.length,
    errors:diagnostics.count(),
    versions:{app:app.getVersion(),electron:process.versions.electron,chrome:process.versions.chrome},
    dataFolder:app.getPath('userData')
  }};
}

module.exports={registerSettingsCommands,settingsSnapshot};
