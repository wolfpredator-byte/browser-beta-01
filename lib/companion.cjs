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

const policy=require('./window-policy-rules.cjs');
/**
 * Beta 0.43: dove si apre il companion. Regola del gioco (monitor per impronta fisica, lato, dimensione),
 * poi la posizione predefinita del companion, poi il monitor principale. Con «Dove era l'ultima volta»
 * vale la posizione ricordata, se quel posto esiste ancora. Mai accanto all'ultima finestra di VARCO.
 */
function companionRect(game){
  const displays=screen.getAllDisplays(),primary=screen.getPrimaryDisplay();
  const remember=!game.place?.display&&!Number.isInteger(game.display);
  if(remember&&game.lastBounds&&displays.some(d=>{const a=d.workArea,b=game.lastBounds;return b.x<a.x+a.width&&b.x+b.width>a.x&&b.y<a.y+a.height&&b.y+b.height>a.y;}))
    return {rect:game.lastBounds,maximize:false,display:screen.getDisplayMatching(game.lastBounds)};
  const t=policy.companionTarget(game,state.data.settings.companionDefault,displays,primary);
  // L'id del monitor è cambiato ma l'impronta l'ha ritrovato: aggiorniamo il gioco.
  if(Number.isInteger(game.display)&&game.display!==t.display.id&&game.place?.display){game.display=t.display.id;game.place.display=policy.displayKey(t.display);require('./state.cjs').save();}
  return t;
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
  const target=companionRect(game);
  let w=windows.windowFor(game.workspace);
  if(!w){
    // inactive: la finestra compare senza prendere il focus, il gioco resta in primo piano.
    w=tabs.openWorkspaceWindow(game.workspace,{bounds:target.rect,maximized:target.maximize,inactive:!options.test});
  }else{
    moveToArea(w,target.rect);
    if(w.win.isMinimized())w.win.restore();
    if(options.test)w.win.focus();else w.win.showInactive();
  }
  if(!w)return null;
  watchCompanion(w,game);
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

/** La finestra è il companion di questo gioco: con «Dove era l'ultima volta» ricordiamo dove la sposti. */
function watchCompanion(w,game){
  w.companionGameId=game.id;
  if(w.companionWatched)return;
  w.companionWatched=true;
  let t=null;
  const remember=()=>{clearTimeout(t);t=setTimeout(()=>{
    const g=state.data.games.find(x=>x.id===w.companionGameId);
    if(!g||w.win.isDestroyed()||w.win.isMinimized()||w.win.isMaximized())return;
    if(!g.place?.display&&!Number.isInteger(g.display)){g.lastBounds=w.win.getBounds();require('./state.cjs').save();}
  },600);};
  w.win.on('move',remember);w.win.on('resize',remember);
}
/** «Apri sempre qui»: il monitor e la posizione attuali diventano la regola del gioco. */
function pinHere(w){
  const g=state.data.games.find(x=>x.id===w?.companionGameId);
  if(!g)return {ok:false,error:'Questa finestra non è un companion.'};
  const b=w.win.getBounds(),d=screen.getDisplayMatching(b);
  g.display=d.id;g.place={display:policy.displayKey(d),side:'custom',size:100,rel:policy.relativeTo(d.workArea,b)};
  require('./state.cjs').save();
  tray.notify(`Companion di ${g.name}`,'Si aprirà sempre qui.');
  return {ok:true};
}
/** «Sposta sull'altro monitor»: stesso lato e dimensione, monitor successivo; diventa la regola del gioco. */
function moveToNextMonitor(w){
  const g=state.data.games.find(x=>x.id===w?.companionGameId);
  if(!g)return {ok:false,error:'Questa finestra non è un companion.'};
  const displays=screen.getAllDisplays();
  const next=policy.nextDisplay(screen.getDisplayMatching(w.win.getBounds()),displays);
  if(!next||displays.length<2)return {ok:false,error:'C’è un solo monitor.'};
  const place=policy.normalizePlace(g.place)||{side:'full',size:100,rel:null};
  g.display=next.id;g.place={...place,display:policy.displayKey(next)};
  moveToArea(w,policy.placeRect(next.workArea,g.place));
  require('./state.cjs').save();
  return {ok:true};
}
/** «Ricorda la posizione»: niente regola fissa, il companion torna dove l'hai lasciato l'ultima volta. */
function rememberPosition(w){
  const g=state.data.games.find(x=>x.id===w?.companionGameId);
  if(!g)return {ok:false,error:'Questa finestra non è un companion.'};
  g.display=null;g.place={display:null,side:'full',size:100,rel:null};g.lastBounds=w.win.getBounds();
  require('./state.cjs').save();
  return {ok:true};
}

function closeCompanion(game){
  tray.refreshTooltip();
  const w=windows.windowFor(game.workspace);
  if(!w)return;
  if(game.alwaysOnTop&&!w.win.isDestroyed())w.win.setAlwaysOnTop(false);
  if(game.closeOnExit)w.win.close();
}

module.exports={openCompanion,closeCompanion,pinHere,moveToNextMonitor,rememberPosition,companionRect};
