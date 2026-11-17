'use strict';

/**
 * Comandi del pannello Progetto. Agiscono sul progetto del workspace della
 * finestra da cui arrivano (o di quella in primo piano, per JARVIS).
 */
const {shell}=require('electron');
const {state,save}=require('./state.cjs');
const windows=require('./windows.cjs');
const tabs=require('./tabs.cjs');
const projects=require('./projects.cjs');
const processes=require('./project-processes.cjs');
const monitors=require('./monitors.cjs');
const path=require('node:path');
const {dialog}=require('electron');
const workenv=require('./workenv.cjs');
const toasts=require('./toasts.cjs');

function registerProjectCommands(bus){
  /** Registra un comando che agisce sul workspace della finestra; aggiorna la cornice. */
  const add=(name,args,description,run)=>bus.register(name,{args,description,run:async(ctx,a)=>{
    const w=ctx.window||windows.focusedWindow();
    if(!w)return {ok:false,error:'Nessuna finestra aperta.'};
    const result=await run(w.workspace,a,w);
    windows.emitAll();
    return result??{ok:true};
  }});

  add('projectReload',{},'Rilegge progetto.browser.json.',ws=>{projects.load(ws);});
  add('projectCreateFile',{},'Crea progetto.browser.json con la proposta mostrata.',ws=>projects.createFile(ws));
  add('projectTrust',{},'Conferma di fidarti dei comandi e dei monitor del file.',
    ws=>projects.trust(ws)?{ok:true}:{ok:false,error:'Il file non è valido.'});
  add('projectOpenFile',{},'Apre progetto.browser.json con il programma predefinito.',async ws=>{
    const entry=projects.get(ws);
    if(entry?.status!=='ok'&&entry?.status!=='invalid')return {ok:false,error:'Il file non esiste.'};
    const error=await shell.openPath(entry.file);
    return error?{ok:false,error}:{ok:true};
  });
  // Beta 0.43: «Apri anteprima» osserva il server: se è pronto apre (o ricarica) la scheda di anteprima del progetto,
  // se si sta avviando la apre appena risponde, se è spento lo avvia.
  add('projectOpenPreview',{},'Apri l’anteprima del progetto: avvia il dev server se serve e apre la pagina quando risponde.',ws=>{
    const r=processes.openOrStartPreview(ws);
    if(r?.waiting)toasts.show({id:'preview-'+ws,kind:'info',title:'Anteprima',text:'Si apre appena il server risponde.',timeout:4000});
    return r;
  });
  add('projectOpenFolder',{},'Apre la cartella del progetto in Esplora file.',ws=>{const e=projects.get(ws);if(!e?.folder)return {ok:false,error:'Nessuna cartella collegata.'};shell.openPath(e.folder);return {ok:true};});
  add('projectRestart',{index:'int'},'Riavvia un comando del progetto (ricarica la sua anteprima).',(ws,{index})=>processes.restart(ws,index));
  add('projectStopAll',{},'Ferma tutti i comandi del progetto, anche i processi rimasti staccati.',ws=>{processes.stopWorkspace(ws);return {ok:true};});
  // ── Ambiente di lavoro (Beta 0.19) ──
  add('workStart',{},'Avvia i programmi dell’ambiente di lavoro del workspace.',ws=>{
    const result=workenv.launch(ws);
    if(!result.launched.length&&!result.errors.length)return {ok:false,error:'Aggiungi prima un programma.'};
    toasts.show({id:'workenv-'+ws,kind:result.errors.length?'error':'success',title:result.launched.length?'Ambiente di lavoro avviato':'Nessun programma avviato',
      text:[result.launched.join(', '),...result.errors].filter(Boolean).join(' · '),timeout:5000});
    return {ok:true};
  });
  add('workChooseProgram',{},'Sceglie un programma da Esplora file.',async(ws,_a,w)=>{
    const r=await dialog.showOpenDialog(w.win,{title:'Scegli il programma da avviare',properties:['openFile'],
      filters:[{name:'Programmi',extensions:['exe','lnk','bat','cmd']}]});
    if(r.canceled||!r.filePaths[0])return {ok:false,cancelled:true};
    const file=r.filePaths[0];
    return workenv.addProgram(ws,{path:file,name:workenv.displayName(file),openFolder:/code|cursor|devenv|rider|idea/i.test(path.basename(file))});
  });
  add('workAddSuggested',{path:'string',name:'string',openFolder:'bool'},'Aggiunge un programma suggerito.',(ws,a)=>workenv.addProgram(ws,a));
  add('workRemoveProgram',{index:'int'},'Toglie un programma dall’ambiente di lavoro.',(ws,{index})=>{
    const list=state.data.workspaces.find(x=>x.name===ws)?.workPrograms;if(list&&list[index]){list.splice(index,1);save();}
  });
  add('workSetOpenFolder',{index:'int',enabled:'bool'},'Passa (o no) la cartella del progetto al programma.',(ws,{index,enabled})=>{
    const p=state.data.workspaces.find(x=>x.name===ws)?.workPrograms?.[index];if(p){p.openFolder=enabled;save();}
  });
  add('workSetAutoStart',{enabled:'bool'},'Avvia da solo l’ambiente quando apri il workspace.',(ws,{enabled})=>{
    const target=state.data.workspaces.find(x=>x.name===ws);if(target){target.workAutoStart=enabled;save();}
  });
  bus.register('workSuggestions',{description:'Programmi noti trovati su questo PC.',run:()=>workenv.suggestions()});
  add('projectOpenEditor',{},'Apre la cartella nell’editor.',ws=>processes.openEditor(ws));
  add('projectRun',{index:'int',open:'bool?'},'Avvia un comando del progetto (open: apre l’anteprima quando risponde).',(ws,{index,open})=>processes.start(ws,index,{open:!!open}));
  add('projectStop',{index:'int'},'Ferma un comando del progetto.',(ws,{index})=>processes.stop(ws,index));
  add('projectClearLog',{index:'int'},'Svuota il log di un comando.',(ws,{index})=>{processes.clearLog(ws,index);});
  // Il valore arriva dalla cornice e non torna mai indietro: la cornice vede solo "impostato".
  add('projectSetSecret',{name:'string',value:'string'},'Salva un segreto cifrato.',
    (ws,{name,value})=>projects.setSecret(ws,name,value));
  add('projectRemoveSecret',{name:'string'},'Elimina un segreto.',(ws,{name})=>projects.removeSecret(ws,name));
  add('projectCheckMonitor',{name:'string'},'Controlla subito un monitor.',(ws,{name})=>monitors.checkNow(ws,name));
}

module.exports={registerProjectCommands};
