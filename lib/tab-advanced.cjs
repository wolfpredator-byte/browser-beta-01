'use strict';

/**
 * Modello delle schede avanzate. Non importa Electron, quindi le regole
 * possono essere testate con Node senza aprire una finestra.
 */

/**
 * Restituisce la chiave del gruppo, o null per le schede senza gruppo.
 * Il limite di 35 caratteri evita etichette troppo lunghe nella UI.
 * @param {string|null|undefined} name
 */
function groupName(name) {
  const value=typeof name==='string'?name.trim().slice(0,35):'';
  return value || null;
}

/**
 * Verifica se uno stack è compresso in un workspace.
 * @param {Record<string,string[]>} state - Mappa workspace -> gruppi compressi.
 * @param {string} workspace - Nome workspace.
 * @param {string} group - Nome gruppo.
 */
function isCollapsed(state,workspace,group) {
  return Array.isArray(state?.[workspace])&&state[workspace].includes(group);
}

/**
 * Attiva/disattiva la compressione. Mutiamo solo lo stato persistente,
 * non le singole schede: collassare un gruppo NON chiude alcun sito.
 * @returns {boolean} true se il gruppo è ora compresso.
 */
function toggleCollapsed(state,workspace,group) {
  const name=groupName(group);
  if(!name)return false;
  if(!Array.isArray(state[workspace]))state[workspace]=[];
  const previous=state[workspace];
  const index=previous.indexOf(name);
  if(index===-1){previous.push(name);return true;}
  previous.splice(index,1);
  return false;
}

/**
 * Trasforma le schede in elementi grafici per la barra inferiore.
 * Lo stack appare una sola volta, nel punto della prima scheda del gruppo.
 * La proprietà `active` serve per evidenziare gruppi compressi.
 * @returns {Array<object>} elementi {kind:'group'|'tab',...}
 */
function tabStripItems(tabs,workspace,collapsed,activeId) {
  const inWorkspace=tabs.filter(tab=>tab.workspace===workspace);
  const seen=new Set(),result=[];
  for(const tab of inWorkspace) {
    const name=groupName(tab.group);
    if(!name){result.push({kind:'tab',tab});continue;}
    if(seen.has(name))continue;
    seen.add(name);
    const members=inWorkspace.filter(other=>groupName(other.group)===name);
    const active=members.some(member=>member.id===activeId);
    result.push({kind:'group',group:name,count:members.length,
      collapsed:isCollapsed(collapsed,workspace,name),active,
      tabIds:members.map(member=>member.id),
      // Beta 0.18: per lo stack compatto (più schede in una sola "pillola" con le loro icone).
      members:members.map(m=>({id:m.id,title:m.title||m.url||'',favicon:m.favicon||null,
        active:m.id===activeId,isHome:!!m.isHome,loading:!!m.loading}))});
    if(!isCollapsed(collapsed,workspace,name)){
      for(const member of members)result.push({kind:'tab',tab:member,inGroup:name});
    }
  }
  return result;
}

/**
 * Cambia workspace senza distruggere la WebContentsView già aperta.
 * @returns {boolean} false quando ID o destinazione non sono validi.
 */
function moveTab(tabs,id,target,knownWorkspaces) {
  if(!knownWorkspaces.includes(target))return false;
  const tab=tabs.find(t=>t.id===id);
  if(!tab||tab.workspace===target)return false;
  tab.workspace=target;
  return true;
}

/**
 * Conserva un massimo di 20 schede recentemente chiuse.
 * Il valore massimo riduce la quantità di dati scritti su disco.
 * Non vengono salvati cookie, contenuti di pagine o password.
 */
function rememberClosed(closed,tab,max=20) {
  if(!tab)return;
  if(!tab.isHome&&!/^(https?:\/\/|varco-view:\/\/app\/viewer\.html)/i.test(tab.url||''))return;
  closed.unshift({url:tab.url,home:!!tab.isHome,workspace:tab.workspace,
    title:String(tab.title||'').slice(0,120),
    pinned:!!tab.pinned,group:groupName(tab.group)});
  if(closed.length>max)closed.length=max;
}

/**
 * Serializza una scheda per l'interfaccia senza inviare l'oggetto Electron.
 *
 * @param {object} tab - Scheda completa, che nel main contiene anche la View.
 * @param {number|null} activeId - ID della scheda attualmente selezionata.
 *
 * ATTENZIONE: `workspace` è indispensabile. Se viene dimenticato,
 * tabStripItems() non riconosce più nessuna scheda perché filtra con
 * `tab.workspace === workspace`. Il risultato è la barra vuota della 0.4.
 * Gli altri campi servono a titolo, icona Home, fissaggio e Tab Stacks.
 */
function toTabSnapshot(tab,activeId) {
  return {
    id:tab.id,
    // Il workspace non deve essere inferito dal contesto UI:
    // ci serve esplicitamente per classificare la scheda.
    workspace:tab.workspace,
    title:tab.title,
    url:tab.url,
    isHome:!!tab.isHome,
    // Beta 0.12: quale pagina interna è (Home o Impostazioni).
    page:tab.isHome?(tab.url==='app://settings'?'settings':'home'):null,
    active:tab.id===activeId,
    pinned:!!tab.pinned,
    group:groupName(tab.group),
    // Beta 0.9.1: icona del sito (solo immagini già convertite in data:) e caricamento.
    favicon:typeof tab.favicon==='string'&&tab.favicon.startsWith('data:image/')?tab.favicon:null,
    loading:!!tab.loading,
    // Beta 0.10: pagina chiusa per risparmiare memoria (si ricarica quando la apri).
    sleeping:!tab.isHome&&!tab.view
  };
}

/**
 * Beta 0.8: un workspace può avere più finestre, numerate da 0 (la principale).
 * Ogni scheda appartiene a una di esse tramite `pane`; le schede delle beta
 * precedenti non hanno il campo e stanno nella principale.
 */
const paneOf=tab=>Number.isInteger(tab?.pane)&&tab.pane>0?tab.pane:0;

/** true se la scheda va mostrata nella finestra {workspace, pane}. */
function isInWindow(tab,w){return tab.workspace===w.workspace&&paneOf(tab)===(w.pane||0);}

/**
 * Primo numero libero per una nuova finestra del workspace (1, 2, 3...).
 * @param {number[]} used - Numeri già usati da finestre aperte.
 */
function nextPane(used){
  let pane=1;
  while(used.includes(pane))pane++;
  return pane;
}

/**
 * Beta 0.10: una scheda caricata ma non guardata da `minutes` minuti torna
 * dormiente (la pagina si chiude, la scheda resta e si ricarica quando la apri).
 * Mai: se la stai guardando, se suona (musica, chiamate), se è fissata
 * (es. Discord web per le notifiche), se ha gli strumenti per sviluppatori aperti.
 * @param {{visible:boolean,audible:boolean,pinned:boolean,devtools:boolean,lastVisibleAt:number}} tab
 * @param {number} now - Data.now().
 * @param {number} minutes - 0 = sospensione disattivata.
 */
function shouldSleep(tab,now,minutes){
  if(!minutes||minutes<=0)return false;
  if(tab.visible||tab.audible||tab.pinned||tab.devtools)return false;
  return now-(tab.lastVisibleAt||0)>=minutes*60000;
}

module.exports={shouldSleep,groupName,isCollapsed,toggleCollapsed,tabStripItems,moveTab,rememberClosed,toTabSnapshot,
  paneOf,isInWindow,nextPane};
