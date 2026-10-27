'use strict';

/**
 * Comandi del pannello Progetto. Agiscono sul progetto del workspace della
 * finestra da cui arrivano (o di quella in primo piano, per JARVIS).
 */
const {shell}=require('electron');
const {state}=require('./state.cjs');
const windows=require('./windows.cjs');
const tabs=require('./tabs.cjs');
const projects=require('./projects.cjs');
const processes=require('./project-processes.cjs');
const monitors=require('./monitors.cjs');

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
  add('projectOpenPreview',{},'Mostra l’anteprima del progetto (dev server).',(ws,_a,w)=>{
    const url=projects.get(ws)?.config?.anteprima;
    if(!url)return {ok:false,error:'Nessuna "anteprima" nel file.'};
    const origin=new URL(url).origin;
    // Se l'anteprima è già aperta (anche su un'altra pagina del sito o in un'altra
    // finestra del progetto), mostriamo quella; prima cerchiamo in questa finestra.
    const sameSite=t=>t.workspace===ws&&!t.isHome&&(()=>{try{return new URL(t.url).origin===origin;}catch{return false;}})();
    const open=tabs.tabsOf(w).find(sameSite)||state.tabs.find(sameSite);
    const owner=open&&windows.windowForTab(open);
    if(owner){tabs.show(owner,open.id);owner.win.focus();}
    else tabs.newTab(url,ws,{pane:w.pane});
  });
  add('projectOpenEditor',{},'Apre la cartella nell’editor.',ws=>processes.openEditor(ws));
  add('projectRun',{index:'int'},'Avvia un comando del progetto.',(ws,{index})=>processes.start(ws,index));
  add('projectStop',{index:'int'},'Ferma un comando del progetto.',(ws,{index})=>processes.stop(ws,index));
  add('projectClearLog',{index:'int'},'Svuota il log di un comando.',(ws,{index})=>{processes.clearLog(ws,index);});
  // Il valore arriva dalla cornice e non torna mai indietro: la cornice vede solo "impostato".
  add('projectSetSecret',{name:'string',value:'string'},'Salva un segreto cifrato.',
    (ws,{name,value})=>projects.setSecret(ws,name,value));
  add('projectRemoveSecret',{name:'string'},'Elimina un segreto.',(ws,{name})=>projects.removeSecret(ws,name));
  add('projectCheckMonitor',{name:'string'},'Controlla subito un monitor.',(ws,{name})=>monitors.checkNow(ws,name));
}

module.exports={registerProjectCommands};
