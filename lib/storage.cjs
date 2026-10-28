'use strict';

/**
 * Lettura e scrittura di browser-data.json. Usa solo `node:fs`, quindi i test
 * possono lavorare su una cartella temporanea senza Electron.
 */
const fs=require('node:fs');

const SIDEBAR_MODES=['hidden','compact','expanded'];
/** Minuti dopo cui una scheda non guardata viene sospesa (0 = mai). */
const SLEEP_CHOICES=[0,15,30,60,120];
const {normalizeSitePermissions}=require('./permission-rules.cjs');
const {SEARCH_ENGINES}=require('./web-rules.cjs');

const defaultData=()=>({
  activeWorkspace:'Personale',
  workspaces:[
    {name:'Personale',resources:[],projectPath:''},
    {name:'Destiny Builder',projectPath:'',resources:['https://www.bungie.net/7/en/Destiny','https://github.com/']},
    {name:'Gaming',projectPath:'',resources:[]}
  ],
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
  if(!Array.isArray(data.bookmarks))data.bookmarks=[];
  if(!Array.isArray(data.history))data.history=[];
  if(!Array.isArray(data.sessionTabs))data.sessionTabs=[];
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
    searchEngine:Object.hasOwn(SEARCH_ENGINES,settings.searchEngine)?settings.searchEngine:'google'
  };
  data.sitePermissions=normalizeSitePermissions(data.sitePermissions);
  // Beta 0.7: progetti. secrets[cartella][NOME] = valore cifrato con safeStorage (base64).
  // Beta 0.8: layouts[workspace] = disposizione salvata delle sue finestre sui monitor.
  for(const key of ['trustedProjects','secrets','monitorState','layouts']){
    if(!data[key]||typeof data[key]!=='object'||Array.isArray(data[key]))data[key]={};
  }
  data.games=Array.isArray(data.games)?data.games.filter(g=>g&&Number.isInteger(g.id)&&
    typeof g.name==='string'&&typeof g.exe==='string'&&Array.isArray(g.sites)):[];
  for(const workspace of data.workspaces){
    if(!Array.isArray(workspace.resources))workspace.resources=[];
    if(typeof workspace.projectPath!=='string')workspace.projectPath='';
    delete workspace.tabs; // Campo mai usato delle prime beta.
  }
  if(!data.workspaces.length)data.workspaces=defaultData().workspaces;
  if(!data.workspaces.some(w=>w.name===data.activeWorkspace))data.activeWorkspace=data.workspaces[0].name;
  return data;
}

/**
 * @param {string} file - Percorso completo di browser-data.json.
 */
function createStore(file){
  const tmp=file+'.tmp',bak=file+'.bak';
  return {
    /**
     * Salvataggio atomico: scriviamo prima su .tmp, poi lo rinominiamo.
     * Se Windows si spegne durante la scrittura, si rovina solo il .tmp e
     * browser-data.json resta quello precedente. Il file precedente diventa .bak.
     */
    save(data){
      try{
        fs.writeFileSync(tmp,JSON.stringify(data,null,2));
        if(fs.existsSync(file))fs.renameSync(file,bak);
        fs.renameSync(tmp,file);
        return true;
      }catch(e){console.error('Salvataggio non riuscito',e);return false;}
    },
    load(){
      // Ordine: file principale, poi .bak (l'ultimo salvataggio valido precedente).
      let data=readData(file)||readData(bak);
      if(!data){
        // Non sovrascriviamo mai un file illeggibile: lo mettiamo da parte per recuperarlo a mano.
        if(fs.existsSync(file)){
          try{fs.renameSync(file,file.replace(/\.json$/,'.corrupt-'+Date.now()+'.json'));}catch(e){console.error(e);}
        }
        data=defaultData();
        this.save(data);
      }
      return normalize(data);
    }
  };
}

module.exports={createStore,defaultData,normalize,readData,SIDEBAR_MODES,SLEEP_CHOICES};
