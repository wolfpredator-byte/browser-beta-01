'use strict';

/**
 * Beta 0.37 — contenuti protetti (Spotify, Netflix, Prime Video, Disney+…).
 *
 * VARCO usa "Electron for Content Security" di castLabs (pacchetto electron …+wvcus): è Electron
 * con il modulo Widevine di Google, gratuito. Il modulo (Widevine CDM) non viaggia nell'installer:
 * Chromium lo scarica da Google la prima volta (pochi MB, nella cartella dei dati) e poi lo aggiorna da solo.
 *
 * Alcuni servizi (Netflix, Prime Video, Disney+) vogliono anche che l'eseguibile sia firmato (VMP):
 * la firma si fa gratis con il servizio EVS di castLabs al momento di costruire l'installer
 * (scripts/build-setup.cjs). Senza firma Widevine funziona, ma quei servizi possono rifiutare la riproduzione.
 */
const status={state:'off',version:'',error:''}; // off | preparing | ready | error

/** components esiste solo nell'Electron di castLabs: con l'Electron normale resta tutto spento. */
const componentsApi=()=>{try{return require('electron').components||null;}catch{return null;}};

function widevineInfo(components){
  const all=components.status?.()||{};
  return Object.values(all).find(c=>/widevine/i.test(c.title||c.name||''))||null;
}

/** Dopo app.ready, senza bloccare l'apertura delle finestre. */
function start(){
  const components=componentsApi();
  if(!components){status.state='off';return;}
  status.state='preparing';
  // Beta 0.37.3: nessuna notifica quando il modulo è pronto (compariva a ogni avvio e a chi usa VARCO non serve).
  // Lo stato resta nella copia diagnostica e nell'avviso del widget Pagina web, se il modulo non arriva.
  components.whenReady().then(()=>{
    const info=widevineInfo(components);
    status.state='ready';status.version=info?.version||'';
    console.log('Widevine pronto',status.version);
    require('./windows.cjs').emitAll();
  }).catch(e=>{
    status.state='error';status.error=String(e?.message||e);
    console.error('Widevine non disponibile',e);
    require('./windows.cjs').emitAll();
  });
}

const snapshot=()=>({...status});
/** Per la diagnostica. */
function report(){
  const components=componentsApi();
  return {castlabs:!!components,electron:process.versions.electron,...status,
    signed:require('node:fs').existsSync(process.execPath+'.sig')};
}

module.exports={start,snapshot,report,status};
