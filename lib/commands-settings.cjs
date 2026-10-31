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
const updater=require('./updater.cjs');
const passwords=require('./passwords.cjs');
const extensions=require('./extensions.cjs');
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
  // Senza mode (F1, Ctrl+Shift+P, ⌘): la palette fluttuante. address: hai iniziato a scrivere
  // nella barra degli indirizzi; commands: la barra con ">" (solo comandi).
  add('openPalette',{mode:'string?'},'Palette fluttuante (F1, Ctrl+Shift+P) o suggerimenti della barra degli indirizzi.',
    (w,{mode})=>palette.open(w,['address','commands'].includes(mode)?mode:'palette'));
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
  // Beta 0.28: scorciatoie di ricerca (!yt, !w…): le tue si aggiungono a quelle pronte.
  const webRules=require('./web-rules.cjs');
  bus.register('addBang',{args:{key:'string',label:'string',url:'string'},description:'Aggiunge una scorciatoia di ricerca (!chiave).',run:(_c,{key,label,url})=>{
    const clean=webRules.normalizeBangs([{key,label,url}])[0];
    if(!clean)return {ok:false,error:'Serve una chiave di lettere o numeri e un indirizzo https con %s al posto della ricerca.'};
    if(webRules.BANGS[clean.key])return {ok:false,error:`!${clean.key} esiste già.`};
    data.settings.bangs=webRules.normalizeBangs([...data.settings.bangs.filter(b=>b.key!==clean.key),clean]);
    webRules.setCustomBangs(data.settings.bangs);save();windows.emitAll();
    return {ok:true};
  }});
  bus.register('removeBang',{args:{key:'string'},description:'Toglie una tua scorciatoia di ricerca.',run:(_c,{key})=>{
    data.settings.bangs=data.settings.bangs.filter(b=>b.key!==key);
    webRules.setCustomBangs(data.settings.bangs);save();windows.emitAll();
  }});
  // Beta 0.27: animazioni dell'interfaccia e delle pagine.
  bus.register('setMotion',{args:{motion:['auto','full','reduced','off']},description:'Animazioni: automatiche, complete, ridotte o spente.',
    run:(_c,{motion})=>{data.settings.motion=motion;save();windows.emitAll();}});
  // Beta 0.26: estensioni Chrome.
  bus.register('openWebStore',{description:'Apre il Chrome Web Store per aggiungere estensioni.',run:ctx=>{
    const w=ctx.window||windows.focusedWindow();
    if(w)tabs.newTab('https://chromewebstore.google.com/category/extensions',w.workspace,{pane:w.pane});
  }});
  bus.register('extensionRemove',{args:{id:'string'},description:'Rimuove un’estensione.',
    run:(ctx,{id})=>ctx?.source==='ui'?extensions.remove(id):{ok:false,error:'Non permesso.'}});
  bus.register('extensionOptions',{args:{id:'string'},description:'Apre le impostazioni di un’estensione.',
    run:(ctx,{id})=>{const w=ctx.window||windows.focusedWindow();return w?extensions.openOptions(w,id):{ok:false};}});
  // Beta 0.25: password. Mostrare e copiare solo dalla cornice di VARCO (non da JARVIS o altri).
  const fromFrame=ctx=>ctx?.source==='ui';
  bus.register('passwordSave',{args:{token:'string'},description:'Salva la password dell’ultimo accesso (dalla notifica).',run:(_c,{token})=>passwords.saveToken(token)});
  bus.register('passwordNever',{args:{token:'string'},description:'Non chiedere più di salvare password per questo sito.',run:(_c,{token})=>passwords.neverToken(token)});
  bus.register('passwordReveal',{args:{id:'string'},description:'Mostra una password salvata (Impostazioni).',
    run:(ctx,{id})=>fromFrame(ctx)?passwords.reveal(id):{ok:false,error:'Non permesso.'}});
  bus.register('passwordCopy',{args:{id:'string'},description:'Copia una password salvata negli appunti per 30 secondi.',
    run:(ctx,{id})=>fromFrame(ctx)?passwords.copy(id):{ok:false,error:'Non permesso.'}});
  bus.register('passwordDelete',{args:{id:'string'},description:'Elimina una password salvata.',run:(ctx,{id})=>fromFrame(ctx)?passwords.remove(id):{ok:false,error:'Non permesso.'}});
  bus.register('passwordNeverRemove',{args:{origin:'string'},description:'Torna a proporre il salvataggio per un sito escluso.',run:(_c,{origin})=>{passwords.removeNever(origin);}});
  bus.register('passwordImport',{description:'Importa password da un file CSV di Chrome, Edge o Firefox.',run:async ctx=>{
    if(!fromFrame(ctx))return {ok:false,error:'Non permesso.'};
    const r=await dialog.showOpenDialog(ctx.window?.win,{title:'Importa password (file CSV esportato da Chrome, Edge o Firefox)',
      properties:['openFile'],filters:[{name:'CSV',extensions:['csv']}]});
    if(r.canceled||!r.filePaths[0])return {ok:true,cancelled:true};
    return passwords.importFile(r.filePaths[0]);
  }});
  bus.register('setPasswordSaving',{args:{enabled:'bool'},description:'Propone di salvare le password dopo un accesso.',
    run:(_c,{enabled})=>{data.settings.passwordSaving=enabled;save();windows.emitAll();}});
  // Beta 0.23: aggiornamenti automatici da GitHub.
  bus.register('checkUpdates',{description:'Controlla subito se c’è una versione nuova di VARCO (e la scarica).',run:()=>updater.check()});
  bus.register('installUpdate',{description:'Riavvia VARCO installando l’aggiornamento scaricato.',run:()=>updater.install()});
  bus.register('setAutoUpdate',{args:{enabled:'bool'},description:'Controlla e scarica da solo gli aggiornamenti.',
    run:(_c,{enabled})=>{updater.setAuto(enabled);if(enabled)updater.check();}});
  bus.register('setAutoArchive',{args:{enabled:'bool?',days:'int?'},description:'Archivio automatico delle schede non usate da giorni.',
    run:(_c,{enabled,days})=>{
      const a=data.settings.autoArchive;
      if(typeof enabled==='boolean')a.enabled=enabled;
      if([1,3,7,14].includes(days))a.days=days;
      save();windows.emitAll();
      if(a.enabled)require('./sleeper.cjs').archiveTick();
    }});
  bus.register('restoreArchived',{args:{index:'int'},description:'Riapre una scheda dall’archivio.',run:(ctx,{index})=>{
    const item=data.archivedTabs[index];
    if(!item)return {ok:false};
    data.archivedTabs.splice(index,1);
    const w=ctx.window||windows.focusedWindow();
    const workspace=data.workspaces.some(x=>x.name===item.workspace)?item.workspace:w?.workspace;
    tabs.newTab(item.url,workspace,{pane:w&&w.workspace===workspace?w.pane:0,favicon:item.favicon,title:item.title});
    save();windows.emitAll();
    return {ok:true};
  }});
  bus.register('clearArchive',{description:'Svuota l’archivio delle schede.',run:()=>{data.archivedTabs=[];save();windows.emitAll();}});
  bus.register('setAutoPip',{args:{enabled:'bool'},description:'Video in finestrella quando cambi scheda.',
    run:(_c,{enabled})=>{data.settings.autoPip=enabled;save();windows.emitAll();}});
  bus.register('setTabAnimations',{args:{enabled:'bool'},description:'Animazione a scorrimento quando cambi scheda.',
    run:(_c,{enabled})=>{data.settings.tabAnimations=enabled;save();windows.emitAll();}});
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
      defaultPath:path.join(app.getPath('documents'),`varco-backup-${day}.json`),
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
    const answer=await require('./popup.cjs').dialog(w,{type:'warning',icon:'warning',title:'Importa backup',
      message:'Sostituire i dati attuali con questo backup?',
      detail:parsed.summary+'\n\nWorkspace, preferiti, cronologia, giochi, impostazioni e schede salvate verranno sostituiti. '+
        'Il browser si riavvia. I progetti chiederanno di nuovo se ti fidi dei loro comandi.',
      buttons:['Annulla','Importa e riavvia'],defaultId:0,cancelId:0,primaryId:1,noLink:true});
    if(answer.response!==1)return {ok:false,cancelled:true};
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
  // Riquadro "Accesso rapido" della Home (Beta 0.13).
  bus.register('openKnownFolder',{args:{name:['downloads','documents','pictures','desktop']},description:'Apre una cartella di Windows (Download, Documenti, Immagini, Desktop).',
    run:async(_c,{name})=>{const error=await shell.openPath(app.getPath(name));return error?{ok:false,error}:{ok:true};}});
  // Beta 0.21: App predefinite di Windows (browser e tipi di file).
  bus.register('openDefaultApps',{description:'Apre "App predefinite → VARCO" nelle Impostazioni di Windows.',run:()=>require('./file-types.cjs').openDefaultApps()});
  bus.register('showDataFolder',{description:'Apre la cartella dei dati del browser.',run:()=>shell.openPath(app.getPath('userData'))});
}

/** Pannello Impostazioni: inviato solo mentre è aperto (legge il registro di Windows). */
function settingsSnapshot(){
  const {data}=state,s=data.settings;
  return {settings:{
    searchEngine:s.searchEngine,
    engines:Object.entries(SEARCH_ENGINES).map(([id,e])=>({id,label:e.label})),
    runInBackground:s.runInBackground,openAtLogin:autostart.isEnabled(),gameWatcher:s.gameWatcher,
    sleepAfterMinutes:s.sleepAfterMinutes,tabAnimations:s.tabAnimations,autoPip:s.autoPip,autoArchive:s.autoArchive,
    adblock:{enabled:s.adblock.enabled,exceptions:s.adblock.allowlist.length},
    sitesWithPermissions:Object.keys(data.sitePermissions).length,
    jarvisEnabled:s.jarvis.enabled,
    historyCount:data.history.length,
    errors:diagnostics.count(),
    versions:{app:app.getVersion(),electron:process.versions.electron,chrome:process.versions.chrome},
    dataFolder:app.getPath('userData')
  },...updater.snapshot(),...passwords.snapshot(),...extensions.snapshot(),
    bangSettings:{builtIn:Object.entries(webRules.BANGS).map(([key,[label]])=>({key,label})),custom:data.settings.bangs}};
}

module.exports={registerSettingsCommands,settingsSnapshot};
