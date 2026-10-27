'use strict';

/**
 * Gaming companion: quando parte un gioco, apre il suo workspace con i siti
 * scelti (mappa, inventario, build...) sul monitor indicato, SENZA rubare il
 * focus al gioco. Quando il gioco si chiude, toglie il "sempre in primo piano"
 * e, se richiesto, chiude la finestra (le schede restano salvate).
 */
const {screen}=require('electron');
const {state}=require('./state.cjs');
const windows=require('./windows.cjs');
const tabs=require('./tabs.cjs');
const tray=require('./tray.cjs');
const {missingSites}=require('./game-rules.cjs');

/** Area utile del monitor scelto, oppure null se non c'è (scollegato o "come l'ultima volta"). */
function displayArea(game){
  if(game.display===null)return null;
  return screen.getAllDisplays().find(d=>d.id===game.display)?.workArea||null;
}

/**
 * Sposta una finestra già aperta sul monitor scelto, occupandone l'area utile.
 * Niente maximize(): su Windows attiverebbe la finestra davanti al gioco.
 */
function moveToArea(w,area){
  if(w.win.isMaximized())w.win.unmaximize();
  w.win.setBounds(area);
}

/**
 * @param {object} game
 * @param {{test?:boolean}} options - test=true dal pulsante "Prova": stesso comportamento, messaggio diverso.
 */
function openCompanion(game,options={}){
  if(!state.data.workspaces.some(w=>w.name===game.workspace))return null;
  const area=displayArea(game);
  let w=windows.windowFor(game.workspace);
  if(!w){
    // inactive: la finestra compare senza prendere il focus, il gioco resta in primo piano.
    w=tabs.openWorkspaceWindow(game.workspace,{...(area?{bounds:area,maximized:true}:{}),inactive:!options.test});
  }else{
    if(area)moveToArea(w,area);
    if(w.win.isMinimized())w.win.restore();
    if(options.test)w.win.focus();else w.win.showInactive();
  }
  if(!w)return null;
  const openUrls=state.tabs.filter(t=>t.workspace===game.workspace).map(t=>t.url);
  // newTab inserisce ogni scheda subito dopo quella attiva: aggiungendole dall'ultima
  // alla prima, nella barra compaiono nell'ordine scritto nel pannello.
  for(const url of missingSites(game.sites,openUrls).reverse())tabs.newTab(url,game.workspace,{activate:false});
  // Mostra il primo sito del gioco (se c'è), altrimenti resta la scheda attuale.
  const first=game.sites.length&&state.tabs.find(t=>t.workspace===game.workspace&&missingSites([game.sites[0]],[t.url]).length===0);
  if(first)tabs.show(w,first.id);
  if(game.alwaysOnTop)w.win.setAlwaysOnTop(true,'floating');
  tray.notify(options.test?`Prova: ${game.name}`:`${game.name} avviato`,
    `Aperto il workspace ${game.workspace}${game.sites.length?' con '+game.sites.length+' siti':''}.`);
  tray.refreshTooltip();
  return w;
}

function closeCompanion(game){
  tray.refreshTooltip();
  const w=windows.windowFor(game.workspace);
  if(!w)return;
  if(game.alwaysOnTop&&!w.win.isDestroyed())w.win.setAlwaysOnTop(false);
  if(game.closeOnExit)w.win.close();
}

module.exports={openCompanion,closeCompanion};
