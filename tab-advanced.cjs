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
      tabIds:members.map(member=>member.id)});
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
  if(!tab.isHome&&!/^https?:\/\//i.test(tab.url||''))return;
  closed.unshift({url:tab.url,home:!!tab.isHome,workspace:tab.workspace,
    title:String(tab.title||'').slice(0,120),
    pinned:!!tab.pinned,group:groupName(tab.group)});
  if(closed.length>max)closed.length=max;
}

module.exports={groupName,isCollapsed,toggleCollapsed,tabStripItems,moveTab,rememberClosed};
