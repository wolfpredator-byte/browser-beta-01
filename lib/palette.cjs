'use strict';

/**
 * Palette dei comandi (Beta 0.11), dalla 0.12 dentro la barra degli indirizzi:
 * scrivendo compaiono i suggerimenti; F1 o Ctrl+Shift+P la apre con ">" (solo comandi). Il processo principale
 * prepara l'elenco (comandi, schede di tutti i workspace, workspace, progetto,
 * giochi, preferiti, cronologia); la cornice lo filtra mentre scrivi
 * (palette-rules.js) ed esegue il comando scelto con lo stesso bus dei pulsanti.
 *
 * Le pagine web sono WebContentsView sopra la cornice: mentre la palette è
 * aperta la pagina viene nascosta e al suo posto la cornice mostra una sua
 * fotografia sfocata, così la palette non finisce sotto il sito.
 */
const {state}=require('./state.cjs');
const windows=require('./windows.cjs');
const {paneOf}=require('./tab-advanced.cjs');

/** [etichetta, comando, parametri, scorciatoia, parole chiave] */
const COMMANDS=[
  ['Nuova scheda','newTab',{},'Ctrl+T','home apri'],
  ['Chiudi la scheda','closeActiveTab',{},'Ctrl+W'],
  ['Riapri l’ultima scheda chiusa','reopenClosedTab',{},'Ctrl+Shift+T','ripristina'],
  ['Nuova finestra di questo workspace','newWindow',{},'Ctrl+N'],
  ['Ricarica la pagina','reload',{},'F5','aggiorna refresh'],
  ['Home del workspace','home',{},'','inizio'],
  ['Cerca nella pagina','openFind',{},'Ctrl+F','trova find'],
  ['Stampa','print',{},'Ctrl+P','pdf'],
  ['Strumenti per sviluppatori','toggleDevTools',{},'F12','devtools console ispeziona'],
  ['Zoom avanti','zoomIn',{},'Ctrl +','ingrandisci'],
  ['Zoom indietro','zoomOut',{},'Ctrl −','rimpicciolisci'],
  ['Zoom al 100%','zoomReset',{},'Ctrl 0','reimposta'],
  ['Aggiungi ai preferiti','bookmark',{},'','segnalibro'],
  ['Impostazioni','openSettings',{},'Ctrl+,','settings opzioni preferenze motore di ricerca'],
  ['Preferiti','openSidePanel',{panel:'bookmarks'},'','segnalibri'],
  ['Cronologia','openSidePanel',{panel:'history'},'','storia visitati'],
  ['Elenco delle schede','openSidePanel',{panel:'tabs'}],
  ['Download','toggleDownloads',{},'','scaricati'],
  ['Apri la cartella Download','showDownloadsFolder',{}],
  ['Scarica il file della scheda','downloadCurrentFile',{}],
  ['Permessi e blocco pubblicità del sito','openSidePanel',{panel:'site'},'','scudo adblock fotocamera microfono notifiche'],
  ['Giochi (companion)','openSidePanel',{panel:'games'}],
  ['Note del workspace','openSidePanel',{panel:'notes'},'','appunti blocco note'],
  ['Apri un file…','openFileDialog',{},'Ctrl+O','visualizzatore pdf immagine codice documento'],
  ['File del progetto','openSidePanel',{panel:'files'},'','cartella esplora sorgenti visualizzatore'],
  ['Modalità zen','toggleZen',{},'F11','zen schermo intero concentrazione focus'],
  ['Inizia a lavorare (ambiente di lavoro)','workStart',{},'','programmi visual studio code avvia'],
  ['Chiudi la vista divisa','closeSplit',{},'','split affianca'],
  ['Scambia i lati della vista divisa','swapSplit',{},'','split affianca'],
  ['Progetto del workspace','openSidePanel',{panel:'project'},'','dev server comandi monitor'],
  ['JARVIS','openSidePanel',{panel:'jarvis'},'','mcp server assistente'],
  ['Nuovo workspace','openSidePanel',{panel:'newWorkspace'},'','spazio crea'],
  ['Aggiungi una risorsa al workspace','openSidePanel',{panel:'addResource'},'','link'],
  ['Salva la disposizione delle finestre','saveLayout',{},'','monitor layout'],
  ['Copia la diagnostica','copyDiagnostics',{},'','errori log versione']
];

const hostOf=url=>{try{return new URL(url).host;}catch{return '';}};

/** Tutti gli elementi della palette per una finestra, nell'ordine "senza testo". */
function items(w){
  const {data}=state;
  const list=[];
  const add=(kind,label,command,args={},extra={})=>list.push({kind,label,run:{command,args},...extra});

  // Senza testo: le schede di questa finestra, poi i comandi, poi le schede degli altri
  // workspace. Scrivendo conta solo il punteggio (palette-rules.js), non quest'ordine.
  const tabItem=t=>add('tab',t.title||t.url,'focusTab',{id:t.id},
    {detail:`${hostOf(t.url)} · ${t.workspace}${paneOf(t)?' · finestra '+(paneOf(t)+1):''}`,keywords:t.url,favicon:typeof t.favicon==='string'&&t.favicon.startsWith('data:image/')?t.favicon:null});
  const others=state.tabs.filter(t=>!t.isHome&&t.id!==w.activeId);
  const here=others.filter(t=>t.workspace===w.workspace&&paneOf(t)===w.pane);
  here.forEach(tabItem);

  for(const [label,command,args,keys,keywords] of COMMANDS)add('command',label,command,args,{keys,keywords});
  // Interruttori: l'etichetta dice cosa succede cliccando.
  add('command',data.settings.adblock.enabled?'Spegni il blocco pubblicità su tutti i siti':'Attiva il blocco pubblicità',
    'setAdblockEnabled',{enabled:!data.settings.adblock.enabled},{keywords:'adblock tracker'});
  if(data.layouts[w.workspace])add('command','Ripristina la disposizione delle finestre','applyLayout',{},{keywords:'monitor layout'});
  others.filter(t=>!here.includes(t)).forEach(tabItem);

  for(const x of data.workspaces){
    if(x.name!==w.workspace)add('workspace','Vai a '+x.name,'workspace',{name:x.name},{detail:'workspace'});
    add('workspace','Apri '+x.name+' in una nuova finestra','openWorkspaceWindow',{name:x.name},{detail:'workspace',keywords:'finestra'});
  }

  // Progetto del workspace: avvio e arresto dei comandi, anteprima.
  const projects=require('./projects.cjs');
  const project=projects.get(w.workspace);
  if(projects.isUsable(project)){
    const name=project.config.nome||w.workspace;
    if(project.config.anteprima)add('project',`Anteprima di ${name}`,'projectOpenPreview',{},{detail:project.config.anteprima});
    for(const cmd of require('./project-processes.cjs').snapshot(w.workspace)){
      if(cmd.status==='running')add('project',`Ferma «${cmd.name}»`,'projectStop',{index:cmd.index},{detail:name,keywords:'stop'});
      else add('project',`Avvia «${cmd.name}»`,'projectRun',{index:cmd.index},{detail:`${name} · ${cmd.command}`,keywords:'start esegui'});
    }
  }
  for(const g of data.games.filter(g=>g.enabled))
    add('game',`Apri il companion di ${g.name}`,'testGame',{id:g.id},{detail:g.sites.map(hostOf).join(', '),keywords:'gioco'});

  for(const b of data.bookmarks)add('bookmark',b.title||b.url,'newTab',{url:b.url},{detail:hostOf(b.url),keywords:b.url});
  // Cronologia: ogni indirizzo una volta sola, i più recenti.
  const pageKey=(title,url)=>`${title||url}|${hostOf(url)}`;
  const seen=new Set(data.bookmarks.flatMap(b=>[b.url,pageKey(b.title,b.url)]));
  let count=0;
  for(const h of data.history){
    if(count>=60||seen.has(h.url)||seen.has(pageKey(h.title,h.url)))continue;
    seen.add(h.url);seen.add(pageKey(h.title,h.url));count++;
    add('history',h.title||h.url,'newTab',{url:h.url},{detail:hostOf(h.url),keywords:h.url});
  }
  return list;
}

/** Fotografia della pagina attiva, rimpicciolita: fa da sfondo sfocato alla palette. */
async function backdrop(w){
  const view=w.attached;
  if(!view)return null;
  try{
    const image=await view.webContents.capturePage();
    if(image.isEmpty())return null;
    const {width}=image.getSize();
    return 'data:image/jpeg;base64,'+image.resize({width:Math.max(1,Math.round(width/2))}).toJPEG(60).toString('base64');
  }catch{return null;}
}

/**
 * Apre la palette o i suggerimenti della barra degli indirizzi.
 * @param {'palette'|'address'|'commands'} mode -
 *   palette (Beta 0.12.1): barra di ricerca fluttuante al centro, F1 / Ctrl+Shift+P / ⌘;
 *   address: hai iniziato a scrivere nella barra degli indirizzi;
 *   commands: la barra degli indirizzi con ">" (solo comandi).
 */
async function open(w,mode='palette'){
  // Già aperti (es. F1 mentre scrivi nella barra): la cornice cambia solo modalità.
  if(w.paletteOpen){windows.sendUi(w,{type:'palette',mode,items:items(w),backdrop:null,keepBackdrop:true});w.win.webContents.focus();return;}
  const picture=await backdrop(w);
  const bounds=w.attached?.getBounds()||null;
  w.paletteOpen=true;
  windows.sendUi(w,{type:'palette',mode,items:items(w),backdrop:picture,bounds});
  w.win.webContents.focus();
  windows.layout(w); // nasconde la pagina
}
function close(w){
  if(!w.paletteOpen)return;
  w.paletteOpen=false;
  windows.layout(w);
}

module.exports={items,open,close,COMMANDS};
