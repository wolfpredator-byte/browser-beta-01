'use strict';

/**
 * Lettura e scrittura di browser-data.json. Usa solo `node:fs`, quindi i test
 * possono lavorare su una cartella temporanea senza Electron.
 */
const fs=require('node:fs');
const path=require('node:path');

const SIDEBAR_MODES=['hidden','compact','expanded'];
/** Minuti dopo cui una scheda non guardata viene sospesa (0 = mai). */
const SLEEP_CHOICES=[0,15,30,60,120];
const {normalizeSitePermissions}=require('./permission-rules.cjs');
const {SEARCH_ENGINES}=require('./web-rules.cjs');
const {WORKSPACE_COLORS}=require('./workspace-rules.cjs');
const {normalizeFolders}=require('./app-scan-rules.cjs');
const {normalizeAppearance,normalizeLinks,normalizePresets,normalizeWorkspacePreset}=require('./appearance-rules.cjs');

const defaultData=()=>({
  activeWorkspace:'Personale',
  // Beta 0.35: prima installazione pulita, un solo workspace vuoto (niente dati personali nel codice).
  workspaces:[{name:'Personale',resources:[],projectPath:''}],
  bookmarks:[],history:[]
});

/** Legge un file dati; restituisce null se manca o non è valido. */
function readData(file){
  try{
    const parsed=JSON.parse(fs.readFileSync(file,'utf8'));
    return Array.isArray(parsed?.workspaces)?parsed:null;
  }catch{return null;}
}

/**
 * Completa i campi mancanti, così una versione precedente del file si apre
 * senza perdere preferiti, sessioni o workspace.
 */
function normalize(data){
  if(!SIDEBAR_MODES.includes(data.sidebarMode))data.sidebarMode='compact';
  if(!data.collapsedStacks||typeof data.collapsedStacks!=='object'||Array.isArray(data.collapsedStacks))data.collapsedStacks={};
  if(!Array.isArray(data.closedTabs))data.closedTabs=[];
  data.closedTabs=data.closedTabs.slice(0,20);
  // Beta 0.28: schede archiviate in automatico.
  data.siteStyles=require('./site-styles.cjs').normalizeSiteStyles(data.siteStyles); // Beta 0.28: stile per sito
  data.link=require('./link-rules.cjs').normalizeLink(data.link); // Beta 0.31: telefono collegato
  data.archivedTabs=Array.isArray(data.archivedTabs)?data.archivedTabs.filter(t=>t&&typeof t.url==='string'&&typeof t.workspace==='string').slice(0,200):[];
  require('./sync-rules.cjs').normalizeBookmarks(data); // Beta 0.33: con l'ora e le lapidi, per il telefono
  if(!Array.isArray(data.history))data.history=[];
  // Beta 0.36: widget e animazioni della Home.
  // homeLayout 2: i riquadri di sempre sono nell'elenco dei widget (la prima volta li si aggiunge).
  {
    const hw=require('./home-widgets-rules.cjs');
    if(data.homeLayout!==2){data.homeWidgets=hw.migrateLayout(data.homeWidgets,data.appearance?.home);data.homeLayout=2;}
    else data.homeWidgets=hw.normalizeWidgets(data.homeWidgets);
  }
  data.homeMotion=require('./home-widgets-rules.cjs').normalizeMotion(data.homeMotion);
  // Beta 0.37.2: accesso ai siti per estensione ('all' | 'declared') ed estensioni installate da file (cartelle).
  data.extensionAccess=data.extensionAccess&&typeof data.extensionAccess==='object'&&!Array.isArray(data.extensionAccess)
    ?Object.fromEntries(Object.entries(data.extensionAccess).filter(([k,v])=>/^[a-p]{32}$/.test(k)&&['all','declared'].includes(v))):{};
  data.localExtensions=Array.isArray(data.localExtensions)?data.localExtensions.filter(p=>typeof p==='string'&&p.length<500).slice(0,100):[];
  data.siteIcons=data.siteIcons&&typeof data.siteIcons==='object'&&!Array.isArray(data.siteIcons)
    ?Object.fromEntries(Object.entries(data.siteIcons).filter(([k,v])=>/^https?:\/\//.test(k)&&typeof v==='string'&&v.startsWith('data:image/')).slice(-300)):{};
  if(!Array.isArray(data.sessionTabs))data.sessionTabs=[];
  // Beta 0.38: sessioni salvate (schede da riaprire insieme) e prompt per JARVIS, dal command center.
  data.savedSessions=Array.isArray(data.savedSessions)?data.savedSessions.filter(s=>s&&typeof s.name==='string'&&typeof s.workspace==='string'&&Array.isArray(s.tabs))
    .map(s=>({name:s.name.slice(0,60),workspace:s.workspace,createdAt:Number(s.createdAt)||0,
      tabs:s.tabs.filter(t=>t&&typeof t.url==='string'&&/^https?:\/\//i.test(t.url)).slice(0,60).map(t=>({url:t.url.slice(0,2000),title:String(t.title||'').slice(0,120)}))}))
    .filter(s=>s.tabs.length).slice(-30):[];
  data.jarvisPrompts=Array.isArray(data.jarvisPrompts)?data.jarvisPrompts.filter(p=>typeof p==='string'&&p.trim()).map(p=>p.slice(0,1000)).slice(-50):[];
  if(!data.workspaceLastActive||typeof data.workspaceLastActive!=='object')data.workspaceLastActive={};
  // Beta 0.5: elenco delle finestre aperte, con workspace e posizione sullo schermo.
  if(!Array.isArray(data.openWindows))data.openWindows=[];
  // Beta 0.6: impostazioni del funzionamento in background e giochi del companion.
  const settings=data.settings&&typeof data.settings==='object'?data.settings:{};
  data.settings={
    runInBackground:settings.runInBackground!==false,    // predefinito: resta nell'area di notifica
    gameWatcher:settings.gameWatcher!==false,            // predefinito: rilevamento attivo
    backgroundNoticeShown:!!settings.backgroundNoticeShown,
    // Beta 0.9: server MCP per JARVIS. Spento finché non lo attivi; lettura pagine permessa.
    jarvis:{enabled:settings.jarvis?.enabled===true,readPages:settings.jarvis?.readPages!==false},
    // Beta 0.10: blocco pubblicità attivo (con siti esclusi) e sospensione dopo 30 minuti.
    adblock:{enabled:settings.adblock?.enabled!==false,
      allowlist:Array.isArray(settings.adblock?.allowlist)?settings.adblock.allowlist.filter(h=>typeof h==='string'&&/^[\w.-]{1,253}$/.test(h)):[]},
    sleepAfterMinutes:SLEEP_CHOICES.includes(settings.sleepAfterMinutes)?settings.sleepAfterMinutes:30,
    // Beta 0.11: motore per le ricerche dalla barra degli indirizzi.
    searchEngine:Object.hasOwn(SEARCH_ENGINES,settings.searchEngine)?settings.searchEngine:'google',
    // Beta 0.15: la pagina entra scorrendo quando cambi scheda.
    tabAnimations:settings.tabAnimations!==false,
    // Beta 0.23: cartelle in cui cercare giochi e programmi.
    scanFolders:normalizeFolders(settings.scanFolders),
    // Beta 0.23: aggiornamenti automatici (controllo e download), attivi se non li spegni.
    autoUpdate:settings.autoUpdate!==false,
    // Beta 0.24: con tante schede, quelle dello stesso sito diventano da sole uno stack (spento di base).
    autoGroupTabs:settings.autoGroupTabs===true,
    // Beta 0.25: dopo un accesso, proponi di salvare la password (attivo se non lo spegni).
    passwordSaving:settings.passwordSaving!==false,
    // Beta 0.27: animazioni dell'interfaccia (auto = come Windows).
    motion:['auto','full','reduced','off'].includes(settings.motion)?settings.motion:'auto',
    // Beta 0.28: scorciatoie di ricerca tue (!chiave) e altre opzioni della 0.28.
    bangs:require('./web-rules.cjs').normalizeBangs(settings.bangs),
    autoPip:settings.autoPip!==false,
    // Beta 0.35: toast accesi o spenti per categoria (download, sito, jarvis, sistema).
    toasts:require('./toast-rules.cjs').normalizeToastSettings(settings.toasts),
    // Beta 0.38: command center (F1). Stile 'board' (bacheca) o 'ring' (anello); suggerimenti di ricerca dal motore.
    commandCenter:{style:['board','ring'].includes(settings.commandCenter?.style)?settings.commandCenter.style:'board',
      webSuggestions:settings.commandCenter?.webSuggestions!==false},
    autoArchive:{enabled:settings.autoArchive?.enabled===true,days:[1,3,7,14].includes(settings.autoArchive?.days)?settings.autoArchive.days:7}
  };
  // Beta 0.21: personalizzazione (temi, sfondo, interfaccia, Home).
  data.appearance=normalizeAppearance(data.appearance);
  // Beta 0.22: preset creati da te.
  data.presets=normalizePresets(data.presets);
  // Beta 0.28: dove stanno schede e barra laterale.
  data.layout=require('./frame-layout-rules.cjs').normalizeLayout(data.layout);
  // Beta 0.27: pannelli web (WhatsApp, Discord, Spotify… in una colonna a destra).
  data.webPanels=require('./webpanel-rules.cjs').normalizePanels(data.webPanels);
  data.sitePermissions=normalizeSitePermissions(data.sitePermissions);
  // Beta 0.7: progetti. secrets[cartella][NOME] = valore cifrato con safeStorage (base64).
  // Beta 0.8: layouts[workspace] = disposizione salvata delle sue finestre sui monitor.
  for(const key of ['trustedProjects','secrets','monitorState','layouts']){
    if(!data[key]||typeof data[key]!=='object'||Array.isArray(data[key]))data[key]={};
  }
  data.games=Array.isArray(data.games)?data.games.filter(g=>g&&Number.isInteger(g.id)&&
    typeof g.name==='string'&&typeof g.exe==='string'&&Array.isArray(g.sites)):[];
  // Beta 0.41: scelte fatte nei suggerimenti (testo → risultato scelto), per far salire quel risultato la volta dopo.
  data.suggestChoices=require('../suggest-rules.js').normalizeChoices(data.suggestChoices);
  // Beta 0.39: launcher (Ctrl+Alt+Spazio, anche fuori da VARCO): scorciatoia, profili per programma, suggeriti.
  data.launcher=require('../launcher-rules.js').normalizeLauncher(data.launcher);
  // Beta 0.17: note per workspace {nome: {text, updatedAt}}.
  if(!data.notes||typeof data.notes!=='object'||Array.isArray(data.notes))data.notes={};
  for(const [name,note] of Object.entries(data.notes))
    if(!note||typeof note.text!=='string')delete data.notes[name];
  for(const workspace of data.workspaces){
    if(!Array.isArray(workspace.resources))workspace.resources=[];
    // Beta 0.19: ambiente di lavoro (programmi da avviare) e avvio automatico.
    workspace.workPrograms=Array.isArray(workspace.workPrograms)?workspace.workPrograms.filter(p=>p&&typeof p.path==='string'&&typeof p.name==='string').slice(0,8):[];
    workspace.workAutoStart=workspace.workAutoStart===true;
    // Beta 0.21: sfondo proprio del workspace (file nella cartella dei dati) e link rapidi della Home.
    if(typeof workspace.wallpaper!=='string')workspace.wallpaper='';
    workspace.homeLinks=normalizeLinks(workspace.homeLinks);
    // Beta 0.22: preset del workspace ('' = come gli altri, 'theme:<id>', 'user:<nome>').
    workspace.preset=normalizeWorkspacePreset(workspace.preset,data.presets);
    // Beta 0.28: account separati (sessione propria, con un id che non cambia rinominando).
    workspace.isolated=workspace.isolated===true;
    if(typeof workspace.sessionId!=='string'||!/^[a-f0-9]{12}$/.test(workspace.sessionId))delete workspace.sessionId;
    if(workspace.isolated&&!workspace.sessionId)workspace.isolated=false;
    // Beta 0.17: colore del workspace (chiave di WORKSPACE_COLORS) o niente.
    if(!Object.hasOwn(WORKSPACE_COLORS,workspace.color))delete workspace.color;
    if(typeof workspace.projectPath!=='string')workspace.projectPath='';
    delete workspace.tabs; // Campo mai usato delle prime beta.
  }
  if(!data.workspaces.length)data.workspaces=defaultData().workspaces;
  if(!data.workspaces.some(w=>w.name===data.activeWorkspace))data.activeWorkspace=data.workspaces[0].name;
  return data;
}

/**
 * Beta 0.37: lettura condivisa all'avvio. force-dark.cjs legge il file prima di app.ready per
 * sapere se il tema è OLED; il primo load() riusa quella lettura invece di rifarla.
 */
const preread=new Map();
function readDataOnce(file){
  if(!preread.has(file))preread.set(file,readData(file));
  return preread.get(file);
}
function takePreread(file){
  if(!preread.has(file))return readData(file);
  const data=preread.get(file);preread.delete(file);return data;
}

/**
 * Beta 0.37: le icone dei siti (data.siteIcons, fino a 300 immagini) stanno in site-icons.json.
 * Erano due terzi di browser-data.json e venivano riscritte a ogni salvataggio anche senza cambiare.
 */
const iconsFileOf=file=>path.join(path.dirname(file),'site-icons.json');
function readIcons(file){
  try{
    const parsed=JSON.parse(fs.readFileSync(file,'utf8'));
    return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:null;
  }catch{return null;}
}

/**
 * @param {string} file - Percorso completo di browser-data.json.
 */
function createStore(file){
  const tmp=file+'.tmp',bak=file+'.bak',iconsFile=iconsFileOf(file);
  let lastIcons=null;   // testo dell'ultimo site-icons.json scritto o letto
  let generation=0;     // ogni salvataggio ha il suo numero: uno vecchio non sovrascrive mai uno più nuovo
  let writing=null;     // salvataggio asincrono in corso (promessa)
  let queued=null;      // dati da scrivere appena finisce quello in corso

  /** Testo del file principale (senza icone, senza spazi) e delle icone, solo se sono cambiate. */
  function serialize(data){
    const {siteIcons,...rest}=data;
    const icons=siteIcons?JSON.stringify(siteIcons):null;
    return {main:JSON.stringify(rest),icons:icons!==null&&icons!==lastIcons?icons:null};
  }
  /** tmpFile prende il posto di browser-data.json; il file precedente diventa .bak. */
  function commit(tmpFile){
    if(fs.existsSync(file))fs.renameSync(file,bak);
    fs.renameSync(tmpFile,file);
  }
  async function writeAsync(data){
    const mine=++generation;
    const {main,icons}=serialize(data); // subito, prima di qualsiasi attesa
    const tmpFile=tmp+'-'+mine;
    try{
      await fs.promises.writeFile(tmpFile,main);
      // Controllo e rinomina nello stesso passo sincrono: un salvataggio sincrono (uscita,
      // importazione di un backup) non può infilarsi in mezzo e venire sovrascritto.
      if(mine!==generation){await fs.promises.unlink(tmpFile).catch(()=>{});return;}
      commit(tmpFile);
      if(icons!==null){
        const iconsTmp=iconsFile+'.tmp-'+mine;
        await fs.promises.writeFile(iconsTmp,icons);
        if(mine!==generation){await fs.promises.unlink(iconsTmp).catch(()=>{});return;}
        fs.renameSync(iconsTmp,iconsFile);
        lastIcons=icons;
      }
    }catch(e){
      console.error('Salvataggio non riuscito',e);
      fs.promises.unlink(tmpFile).catch(()=>{});
    }
  }

  return {
    /**
     * Salvataggio atomico e sincrono (uscita, importazione, test): scriviamo prima su .tmp,
     * poi lo rinominiamo. Se Windows si spegne durante la scrittura, si rovina solo il .tmp e
     * browser-data.json resta quello precedente. Il file precedente diventa .bak.
     * Un salvataggio asincrono ancora in corso viene annullato: questo è più recente.
     */
    save(data){
      generation++;queued=null;
      try{
        const {main,icons}=serialize(data);
        fs.writeFileSync(tmp,main);
        commit(tmp);
        if(icons!==null){
          fs.writeFileSync(iconsFile+'.tmp',icons);
          fs.renameSync(iconsFile+'.tmp',iconsFile);
          lastIcons=icons;
        }
        return true;
      }catch(e){console.error('Salvataggio non riuscito',e);return false;}
    },
    /**
     * Beta 0.37: lo stesso salvataggio, ma la scrittura sul disco avviene fuori dal processo
     * principale, così VARCO non si ferma. Le richieste che arrivano durante una scrittura
     * diventano una sola, fatta appena quella finisce.
     */
    saveAsync(data){
      if(writing){queued=data;return writing;}
      writing=(async()=>{
        let next=data;
        while(next){const current=next;queued=null;await writeAsync(current);next=queued;}
        writing=null;
      })();
      return writing;
    },
    /** Risolta quando non c'è più nessuna scrittura asincrona in corso. */
    idle(){return writing||Promise.resolve();},
    get busy(){return !!writing;},
    load(){
      // Ordine: file principale, poi .bak (l'ultimo salvataggio valido precedente).
      let data=takePreread(file)||readData(bak);
      if(!data){
        // Non sovrascriviamo mai un file illeggibile: lo mettiamo da parte per recuperarlo a mano.
        if(fs.existsSync(file)){
          try{fs.renameSync(file,file.replace(/\.json$/,'.corrupt-'+Date.now()+'.json'));}catch(e){console.error(e);}
        }
        data=defaultData();
        this.save(data);
      }
      // Icone dal loro file; con i dati di una versione precedente restano quelle di browser-data.json
      // e al primo salvataggio passano in site-icons.json.
      const icons=readIcons(iconsFile);
      if(icons){data.siteIcons=icons;lastIcons=JSON.stringify(icons);}
      return normalize(data);
    }
  };
}

module.exports={createStore,readDataOnce,iconsFileOf,defaultData,normalize,readData,SIDEBAR_MODES,SLEEP_CHOICES};
