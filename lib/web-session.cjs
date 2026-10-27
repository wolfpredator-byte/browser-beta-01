'use strict';

/**
 * Sessione Chromium condivisa dalle pagine: permessi, user agent e download.
 */
const path=require('node:path');
const fs=require('node:fs');
const {app,dialog,session}=require('electron');
const {state}=require('./state.cjs');
const windows=require('./windows.cjs');
const {PARTITION,isPermissionAllowed,cleanUserAgent}=require('./web-rules.cjs');

/** Trova la finestra che contiene la pagina che ha avviato un download. */
function windowOfPage(contents){
  const tab=state.tabs.find(t=>t.view?.webContents===contents);
  return (tab&&windows.windowFor(tab.workspace))||windows.focusedWindow();
}

function setupWebSession(){
  const ses=session.fromPartition(PARTITION);
  // Concessi solo schermo intero e "Copia" dei siti; il resto è negato (vedi web-rules.cjs).
  ses.setPermissionRequestHandler((_wc,permission,callback)=>callback(isPermissionAllowed(permission)));
  ses.setPermissionCheckHandler((_wc,permission)=>isPermissionAllowed(permission));
  ses.setUserAgent(cleanUserAgent(ses.getUserAgent(),app.getName()));

  // DownloadItem appartiene alla sessione persistente. Resta in pausa
  // mentre l'utente sceglie Salva / Salva in… / Annulla.
  ses.on('will-download',async(_event,item,contents)=>{
    const owner=windowOfPage(contents);
    const filename=path.basename(item.getFilename()).replace(/[\\/]/g,'_');
    const id=Date.now()+'-'+Math.random().toString(36).slice(2,8);
    const record={id,name:filename,state:'waiting',received:0,total:item.getTotalBytes(),path:''};
    state.downloads.unshift(record);state.downloads=state.downloads.slice(0,40);
    item.pause();
    windows.emitAll();
    item.on('updated',(_e,s)=>{record.state=s;record.received=item.getReceivedBytes();record.total=item.getTotalBytes();windows.emitAll();});
    item.once('done',(_e,s)=>{record.state=s;record.received=item.getReceivedBytes();windows.emitAll();});
    try{
      const base=app.getPath('downloads'),extension=path.extname(filename),stem=path.basename(filename,extension);
      let suggested=path.join(base,filename),n=1;
      while(fs.existsSync(suggested))suggested=path.join(base,stem+' ('+n+++')'+extension);
      const parent=owner?.win;
      const decision=await dialog.showMessageBox(parent,{
        type:'question',title:'Download',message:'Vuoi salvare questo file?',
        detail:filename+'\nDestinazione: '+suggested,
        buttons:['Salva','Salva in…','Annulla'],defaultId:0,cancelId:2,noLink:true
      });
      if(decision.response===2||parent?.isDestroyed()){item.cancel();return;}
      let destination=suggested;
      if(decision.response===1){
        const selected=await dialog.showSaveDialog(parent,{title:'Salva in…',defaultPath:suggested,buttonLabel:'Salva'});
        if(selected.canceled||!selected.filePath){item.cancel();return;}
        destination=selected.filePath;
      }
      record.path=destination;
      item.setSavePath(destination);
      record.state='progressing';item.resume();windows.emitAll();
    }catch(e){console.error('Download prompt failed',e);item.cancel();}
  });
  return ses;
}

module.exports={setupWebSession};
