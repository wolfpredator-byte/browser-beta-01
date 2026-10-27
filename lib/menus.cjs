'use strict';

/**
 * Menu nativi di Windows. Restano visibili anche sopra una pagina web,
 * perché non sono disegnati nella cornice HTML.
 * Ogni voce esegue un comando del bus tramite `run(nome, parametri)`:
 * la regola è la stessa del pulsante equivalente.
 */
const {Menu}=require('electron');
const {state}=require('./state.cjs');
const {groupName}=require('./tab-advanced.cjs');

/** Menu ⋯ / click destro su una scheda. */
function tabMenu(w,tab,run){
  const existingGroups=[...new Set([
    'Ricerca','Sviluppo','Gaming',
    ...state.tabs.filter(x=>x.workspace===w.workspace).map(x=>groupName(x.group)).filter(Boolean)
  ])];
  Menu.buildFromTemplate([
    {label:'Ricarica',enabled:!tab.isHome,click:()=>run('reload',{id:tab.id})},
    {label:'Duplica scheda',click:()=>run('duplicateTab',{id:tab.id})},
    {label:tab.pinned?'Sblocca scheda':'Fissa scheda',click:()=>run('pinTab',{id:tab.id})},
    {type:'separator'},
    {label:'Assegna a stack',submenu:existingGroups.map(name=>({
      label:name,type:'radio',checked:groupName(tab.group)===name,
      click:()=>run('groupTab',{id:tab.id,group:name})
    }))},
    {label:'Rimuovi dallo stack',enabled:!!groupName(tab.group),click:()=>run('groupTab',{id:tab.id,group:''})},
    {label:'Comprimi / Espandi stack',enabled:!!groupName(tab.group),click:()=>run('toggleGroup',{group:tab.group})},
    {type:'separator'},
    {label:'Sposta nel workspace',submenu:state.data.workspaces.map(workspace=>({
      label:workspace.name,enabled:workspace.name!==tab.workspace,
      click:()=>run('moveTabToWorkspace',{id:tab.id,workspace:workspace.name})
    }))},
    {label:'Copia indirizzo',enabled:!tab.isHome,click:()=>run('copyTabUrl',{id:tab.id})},
    {type:'separator'},
    {label:'Riapri ultima scheda chiusa',enabled:state.data.closedTabs.length>0,
      accelerator:'CommandOrControl+Shift+T',click:()=>run('reopenClosedTab')},
    {label:'Chiudi scheda',accelerator:'CommandOrControl+W',click:()=>run('closeTab',{id:tab.id})}
  ]).popup({window:w.win});
}

/** Selettore dei workspace (pulsante in basso a sinistra). */
function workspaceMenu(w,run,openWindowFor){
  const items=state.data.workspaces.map(x=>({
    label:x.name+(openWindowFor(x.name)&&x.name!==w.workspace?'  (altra finestra)':''),
    type:'radio',checked:x.name===w.workspace,
    click:()=>run('workspace',{name:x.name})
  }));
  items.push({type:'separator'},{label:'Apri in una nuova finestra',submenu:state.data.workspaces.map(x=>({
    label:x.name,enabled:!openWindowFor(x.name),
    click:()=>run('openWorkspaceWindow',{name:x.name})
  }))});
  Menu.buildFromTemplate(items).popup({window:w.win});
}

/** Click destro su un workspace della sidebar. */
function workspaceItemMenu(w,name,run,openWindowFor){
  const owner=openWindowFor(name);
  Menu.buildFromTemplate([
    {label:owner?'Vai alla sua finestra':'Apri in una nuova finestra',enabled:owner!==w,
      click:()=>run('openWorkspaceWindow',{name})},
    {type:'separator'},
    {label:'Cambia icona…',click:()=>run('chooseWorkspaceIcon',{name})}
  ]).popup({window:w.win});
}

module.exports={tabMenu,workspaceMenu,workspaceItemMenu};
