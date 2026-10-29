'use strict';

/**
 * Icona nell'area di notifica di Windows. Tiene vivo il browser quando
 * chiudi tutte le finestre, così il rilevatore dei giochi continua a funzionare.
 * Il menu viene costruito al momento del click destro: mostra sempre lo stato attuale.
 */
const path=require('node:path');
const {Tray,Menu}=require('electron');
const {state,save}=require('./state.cjs');
const autostart=require('./autostart.cjs');

let tray=null,run=null;

/**
 * @param {(name:string,args?:object)=>Promise} runCommand - Esegue un comando del bus.
 */
function createTray(runCommand){
  run=runCommand;
  tray=new Tray(path.join(__dirname,'..','assets','tray-icon.png'));
  tray.setToolTip('VARCO');
  tray.on('click',()=>run('openBrowser'));
  tray.on('right-click',()=>tray.popUpContextMenu(buildMenu()));
  return tray;
}

function buildMenu(){
  const {settings,games,workspaces}=state.data;
  const running=games.filter(g=>state.gameWatcher?.isRunning(g.id));
  return Menu.buildFromTemplate([
    {label:'Apri VARCO',click:()=>run('openBrowser')},
    {label:'Apri workspace',submenu:workspaces.map(w=>({label:w.name,click:()=>run('openWorkspaceWindow',{name:w.name})}))},
    {type:'separator'},
    {label:'Rilevamento giochi',type:'checkbox',checked:settings.gameWatcher,
      click:item=>run('setGameWatcher',{enabled:item.checked})},
    ...(running.length?[{label:'In gioco: '+running.map(g=>g.name).join(', '),enabled:false}]:[]),
    {label:games.length?`Giochi configurati: ${games.length}`:'Nessun gioco configurato',enabled:false},
    {type:'separator'},
    {label:'JARVIS (server MCP)',type:'checkbox',checked:settings.jarvis.enabled,
      click:item=>run('setJarvisEnabled',{enabled:item.checked})},
    {type:'separator'},
    {label:'Blocca pubblicità e tracker',type:'checkbox',checked:settings.adblock.enabled,
      click:item=>run('setAdblockEnabled',{enabled:item.checked})},
    {label:'Sospendi schede inattive',submenu:[[0,'Mai'],[15,'Dopo 15 minuti'],[30,'Dopo 30 minuti'],[60,'Dopo 1 ora'],[120,'Dopo 2 ore']]
      .map(([minutes,label])=>({label,type:'radio',checked:settings.sleepAfterMinutes===minutes,
        click:()=>run('setSleepMinutes',{minutes})}))},
    {type:'separator'},
    {label:'Resta attivo quando chiudo le finestre',type:'checkbox',checked:settings.runInBackground,
      click:item=>run('setRunInBackground',{enabled:item.checked})},
    {label:'Avvia con Windows',type:'checkbox',checked:autostart.isEnabled(),
      click:item=>run('setOpenAtLogin',{enabled:item.checked})},
    {type:'separator'},
    {label:'Esci',click:()=>run('quit')}
  ]);
}

/** Il suggerimento sull'icona mostra il gioco in corso. */
function refreshTooltip(){
  if(!tray)return;
  const running=state.data.games.filter(g=>state.gameWatcher?.isRunning(g.id)).map(g=>g.name);
  tray.setToolTip('VARCO'+(running.length?' — in gioco: '+running.join(', '):''));
}

/** La prima volta che chiudi tutte le finestre spieghiamo dove è finito il browser. */
function notifyBackground(){
  if(!tray||state.data.settings.backgroundNoticeShown)return;
  tray.displayBalloon({iconType:'info',title:'VARCO resta attivo',
    content:'È qui nell’area di notifica per riconoscere i giochi. Click destro sull’icona per uscire o disattivarlo.'});
  state.data.settings.backgroundNoticeShown=true;
  save();
}

/** Messaggio dall'icona, es. "Destiny 2 avviato". Silenzioso se l'icona non c'è. */
function notify(title,content){
  if(require('./windows.cjs').zenActive())return; // modalità zen: niente avvisi
  tray?.displayBalloon({iconType:'info',title,content,noSound:true});
}

module.exports={createTray,refreshTooltip,notifyBackground,notify};
