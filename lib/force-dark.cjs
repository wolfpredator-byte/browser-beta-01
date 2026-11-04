'use strict';

/**
 * Beta 0.35 — modalità OLED anche sui siti. Chromium ha uno "scuro forzato" (WebContentsForceDark)
 * che scurisce le pagine senza tema scuro; vale per tutto il browser e solo dall'avvio,
 * quindi cambiare modalità chiede un riavvio. I siti con un tema scuro loro lo usano
 * (nativeTheme 'dark' → prefers-color-scheme: dark).
 * La decisione segue il tema di tutti i workspace (data.appearance.mode), non i preset dei singoli workspace.
 */
const path=require('node:path');
const {app,nativeTheme}=require('electron');
const {state}=require('./state.cjs');

let activeAtStartup=false;

/** Prima di app.ready: legge il tema salvato e accende lo scuro forzato se è OLED. */
function applyAtStartup(){
  const {readData}=require('./storage.cjs');
  const file=path.join(app.getPath('userData'),'browser-data.json');
  const saved=readData(file)||readData(file+'.bak');
  activeAtStartup=saved?.appearance?.mode==='oled';
  if(!activeAtStartup)return;
  // In Electron la funzione di Chromium da sola non basta: serve anche l'impostazione di Blink.
  app.commandLine.appendSwitch('enable-features','WebContentsForceDark');
  app.commandLine.appendSwitch('blink-settings','forceDarkModeEnabled=true');
}

const wanted=()=>state.data?.appearance?.mode==='oled';

/** Tema scuro di sistema per i siti mentre è attiva la modalità OLED. */
function syncTheme(){
  nativeTheme.themeSource=wanted()?'dark':'system';
}

/** Dopo un cambio di modalità: true se serve un riavvio per applicare lo scuro forzato ai siti. */
function needsRestart(){return wanted()!==activeAtStartup;}

module.exports={applyAtStartup,syncTheme,needsRestart};
