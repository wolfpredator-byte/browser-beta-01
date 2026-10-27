'use strict';

/**
 * Avvio con Windows. Il browser parte con `--background`: solo l'icona
 * nell'area di notifica, nessuna finestra, nessuna pagina caricata.
 */
const {app}=require('electron');

const BACKGROUND_FLAG='--background';

/**
 * Durante lo sviluppo l'eseguibile è electron.exe e va indicata la cartella
 * del progetto; nella versione impacchettata basta l'eseguibile.
 */
function loginOptions(){
  return {path:process.execPath,args:app.isPackaged?[BACKGROUND_FLAG]:[app.getAppPath(),BACKGROUND_FLAG]};
}

function isEnabled(){return app.getLoginItemSettings(loginOptions()).openAtLogin;}
function setEnabled(enabled){app.setLoginItemSettings({...loginOptions(),openAtLogin:!!enabled});}
/** true se Windows ci ha avviato all'accensione (o se l'utente ha usato --background). */
const startedInBackground=()=>process.argv.includes(BACKGROUND_FLAG);

module.exports={isEnabled,setEnabled,startedInBackground,BACKGROUND_FLAG};
