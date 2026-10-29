'use strict';

/**
 * Regole dei workspace (Beta 0.17): rinomina, colore, ordine. Senza Electron,
 * quindi verificabili con `node --test`.
 *
 * Il nome di un workspace è la chiave di molte cose salvate: per rinominarlo
 * bisogna aggiornarle tutte insieme, altrimenti schede, disposizioni o giochi
 * resterebbero legati a un workspace che non esiste più.
 */

/** Colori dei workspace: chiave → colore. "" = nessun colore (viola VARCO). */
const WORKSPACE_COLORS={viola:'#7c6cff',blu:'#4f8cff',ciano:'#3cc8e0',verde:'#38c78a',
  giallo:'#f2c94c',arancio:'#ff9b4a',rosso:'#ff5a6a',rosa:'#ff6fb5'};
const COLOR_LABELS={viola:'Viola',blu:'Blu',ciano:'Ciano',verde:'Verde',giallo:'Giallo',arancio:'Arancio',rosso:'Rosso',rosa:'Rosa'};

/**
 * Controlla un nuovo nome. "gaming" e "Gaming" sarebbero indistinguibili nella barra laterale.
 * @returns {{ok:true,name:string}|{ok:false,error:string}}
 */
function checkName(workspaces,raw,except=null){
  const name=String(raw||'').trim().replace(/\s+/g,' ').slice(0,40);
  if(!name)return {ok:false,error:'Scrivi un nome.'};
  const clash=workspaces.find(w=>w.name!==except&&w.name.toLowerCase()===name.toLowerCase());
  if(clash)return {ok:false,error:`Esiste già il workspace «${clash.name}».`};
  return {ok:true,name};
}

/**
 * Rinomina un workspace in tutti i dati salvati e nelle schede aperte.
 * @param {object} data - Contenuto di browser-data.json (viene modificato).
 * @param {Array<{workspace:string}>} tabs - Schede in memoria (vengono modificate).
 * @returns {{ok:true,name:string}|{ok:false,error:string}}
 */
function renameWorkspace(data,tabs,oldName,raw){
  const workspace=data.workspaces.find(w=>w.name===oldName);
  if(!workspace)return {ok:false,error:'Workspace non trovato.'};
  const checked=checkName(data.workspaces,raw,oldName);
  if(!checked.ok)return checked;
  const name=checked.name;
  if(name===oldName)return {ok:true,name};
  const moveKey=(object,from,to)=>{if(object&&Object.hasOwn(object,from)){object[to]=object[from];delete object[from];}};
  workspace.name=name;
  for(const t of tabs)if(t.workspace===oldName)t.workspace=name;
  for(const list of [data.sessionTabs,data.closedTabs,data.openWindows,data.games])
    for(const item of list||[])if(item&&item.workspace===oldName)item.workspace=name;
  moveKey(data.layouts,oldName,name);
  moveKey(data.collapsedStacks,oldName,name);
  moveKey(data.notes,oldName,name);
  // Ultima scheda usata: "Nome" per la finestra principale, "Nome#2" per le altre.
  for(const key of Object.keys(data.workspaceLastActive||{})){
    if(key===oldName)moveKey(data.workspaceLastActive,key,name);
    else if(key.startsWith(oldName+'#'))moveKey(data.workspaceLastActive,key,name+key.slice(oldName.length));
  }
  if(data.activeWorkspace===oldName)data.activeWorkspace=name;
  return {ok:true,name};
}

/** Sposta un workspace prima di un altro (senza `before`: in fondo). */
function moveWorkspace(workspaces,name,before){
  const from=workspaces.findIndex(w=>w.name===name);
  if(from===-1||name===before)return false;
  const [item]=workspaces.splice(from,1);
  const to=before?workspaces.findIndex(w=>w.name===before):-1;
  if(to===-1)workspaces.push(item);else workspaces.splice(to,0,item);
  return true;
}

module.exports={WORKSPACE_COLORS,COLOR_LABELS,checkName,renameWorkspace,moveWorkspace};
