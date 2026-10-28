'use strict';

/**
 * Menu di schede e workspace. Dalla Beta 0.15 sono menu VARCO (lib/popup.cjs),
 * disegnati in un livello sopra la pagina; il formato delle voci è quello di Electron.
 * Ogni voce esegue un comando del bus tramite `run(nome, parametri)`:
 * la regola è la stessa del pulsante equivalente.
 */
const popup=require('./popup.cjs');
const {state}=require('./state.cjs');
const {groupName,isInWindow}=require('./tab-advanced.cjs');
const {describeLayout}=require('./layout-rules.cjs');

/** Menu ⋯ / click destro su una scheda. */
function tabMenu(w,tab,run){
  const existingGroups=[...new Set([
    'Ricerca','Sviluppo','Gaming',
    ...state.tabs.filter(x=>isInWindow(x,w)).map(x=>groupName(x.group)).filter(Boolean)
  ])];
  const audible=!!tab.view&&!tab.view.webContents.isDestroyed()&&tab.view.webContents.isCurrentlyAudible();
  const muted=!!tab.view&&!tab.view.webContents.isDestroyed()&&tab.view.webContents.isAudioMuted();
  const others=state.tabs.filter(x=>isInWindow(x,w)&&x.id!==tab.id&&!x.pinned);
  popup.menu(w,[
    {label:'Nuova scheda',icon:'tab-new',accelerator:'CommandOrControl+T',click:()=>run('newTab')},
    {label:'Duplica scheda',icon:'tabs',click:()=>run('duplicateTab',{id:tab.id})},
    {label:'Ricarica',icon:'reload',enabled:!tab.isHome,click:()=>run('reload',{id:tab.id})},
    {label:tab.pinned?'Sblocca scheda':'Fissa scheda',icon:'bookmark',click:()=>run('pinTab',{id:tab.id})},
    {label:muted?'Riattiva audio':'Disattiva audio sito',icon:'jarvis',enabled:!!tab.view&&(audible||muted),click:()=>run('muteTab',{id:tab.id})},
    {type:'separator'},
    {label:'Aggiungi allo stack',icon:'stack-open',submenu:existingGroups.map(name=>({
      label:name,type:'radio',checked:groupName(tab.group)===name,
      click:()=>run('groupTab',{id:tab.id,group:name})
    }))},
    {label:'Rimuovi dallo stack',icon:'stack-closed',enabled:!!groupName(tab.group),click:()=>run('groupTab',{id:tab.id,group:''})},
    {label:'Comprimi / Espandi stack',icon:'stack-closed',enabled:!!groupName(tab.group),click:()=>run('toggleGroup',{group:tab.group})},
    {type:'separator'},
    {label:'Sposta nel workspace',icon:'workspace-switch',submenu:state.data.workspaces.map(workspace=>({
      label:workspace.name,enabled:workspace.name!==tab.workspace,
      click:()=>run('moveTabToWorkspace',{id:tab.id,workspace:workspace.name})
    }))},
    // Con più monitor: porta la scheda in un'altra finestra dello stesso workspace.
    {label:'Sposta in un’altra finestra',icon:'external',submenu:[
      ...state.windows.filter(x=>x.workspace===w.workspace&&x!==w).sort((a,b)=>a.pane-b.pane).map(x=>({
        label:'Finestra '+(x.pane+1)+(x.pane?'':' (principale)'),click:()=>run('moveTabToWindow',{id:tab.id,pane:x.pane})})),
      {label:'Nuova finestra',click:()=>run('moveTabToWindow',{id:tab.id})}
    ]},
    {label:'Copia indirizzo',icon:'tab-more',enabled:!tab.isHome,click:()=>run('copyTabUrl',{id:tab.id})},
    {type:'separator'},
    {label:'Riapri ultima scheda chiusa',icon:'tab-reopen',enabled:state.data.closedTabs.length>0,
      accelerator:'CommandOrControl+Shift+T',click:()=>run('reopenClosedTab')},
    {type:'separator'},
    {label:'Chiudi scheda',icon:'close',accelerator:'CommandOrControl+W',click:()=>run('closeTab',{id:tab.id})},
    {label:'Chiudi altre schede',enabled:others.length>0,click:()=>run('closeOtherTabs',{id:tab.id})},
    {label:'Chiudi schede a destra',click:()=>run('closeTabsToRight',{id:tab.id})}
  ]);
}

/** Selettore dei workspace (pulsante in basso a sinistra). */
function workspaceMenu(w,run,openWindowFor){
  const items=state.data.workspaces.map(x=>({
    label:x.name+(openWindowFor(x.name)&&x.name!==w.workspace?'  (altra finestra)':''),
    type:'radio',checked:x.name===w.workspace,
    click:()=>run('workspace',{name:x.name})
  }));
  items.push({type:'separator'},{label:'Apri in una nuova finestra',icon:'external',submenu:state.data.workspaces.map(x=>({
    label:x.name,enabled:!openWindowFor(x.name),
    click:()=>run('openWorkspaceWindow',{name:x.name})
  }))},
  {label:`Nuova finestra di «${w.workspace}»`,icon:'tab-new',accelerator:'CommandOrControl+N',click:()=>run('newWindow')},
  {type:'separator'},...layoutItems(w.workspace,run));
  popup.menu(w,items);
}

/** Click destro su un workspace della sidebar. */
function workspaceItemMenu(w,name,run,openWindowFor){
  const owner=openWindowFor(name);
  popup.menu(w,[
    {label:'Nuova scheda nel workspace',icon:'tab-new',click:()=>run('newTabInWorkspace',{name})},
    {label:owner?'Vai alla sua finestra':'Apri in una nuova finestra',icon:'external',enabled:owner!==w,
      click:()=>run('openWorkspaceWindow',{name})},
    {type:'separator'},...layoutItems(name,run),
    {type:'separator'},
    {label:'Cambia icona…',icon:'ws-default',click:()=>run('chooseWorkspaceIcon',{name})},
    {label:'Chiudi le finestre del workspace',icon:'close',enabled:!!owner,click:()=>run('closeWorkspaceWindows',{name})}
  ]);
}

/** Voci delle disposizioni sui monitor, uguali nei due menu dei workspace. */
function layoutItems(name,run){
  const layout=state.data.layouts[name];
  const open=state.windows.filter(x=>x.workspace===name).length;
  return [
    {label:`Salva disposizione finestre${open?` (${open} aperte)`:''}`,icon:'workspace-switch',enabled:open>0,click:()=>run('saveLayout',{name})},
    {label:layout?`Ripristina disposizione (${describeLayout(layout)})`:'Ripristina disposizione',enabled:!!layout,
      click:()=>run('applyLayout',{name})},
    {label:'Elimina disposizione',icon:'close',danger:true,enabled:!!layout,click:()=>run('deleteLayout',{name})}
  ];
}

module.exports={tabMenu,workspaceMenu,workspaceItemMenu};
