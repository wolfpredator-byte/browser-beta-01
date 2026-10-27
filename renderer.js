const $=id=>document.getElementById(id);
function setOrb(mode){
 if(!['idle','thinking','speaking'].includes(mode))return;
 const orb=$('jarvisOrb');orb.className='orb '+mode;
 orb.setAttribute('aria-label','JARVIS: '+mode+' (anteprima dimostrativa)');
 document.querySelectorAll('[data-orb]').forEach(btn=>btn.classList.toggle('chosen',btn.dataset.orb===mode));
}
document.querySelectorAll('[data-orb]').forEach(btn=>btn.onclick=()=>setOrb(btn.dataset.orb));
// La modalità è salvata nel processo principale, così sopravvive al riavvio.
 // compact=62px (icone); expanded=198px (icone+nomi); hidden=0px.
 let previousSidebarMode='compact';
 $('toggleSidebar').onclick=()=>{
   const mode=state.sidebarMode==='expanded'?'compact':'expanded';
   act('setSidebarMode',{mode});
 };
 $('toggleSidebarVisibility').onclick=()=>{
   const current=state.sidebarMode||'compact';
   if(current==='hidden')act('setSidebarMode',{mode:previousSidebarMode});
   else {previousSidebarMode=current;act('setSidebarMode',{mode:'hidden'});}
 };
$('jarvisMini').onclick=()=>window.browserAPI.action('home');
$('homeSearch').onsubmit=e=>{e.preventDefault();const q=$('homeQuery').value.trim();if(q){window.browserAPI.action('navigate',{url:q});$('homeQuery').value='';}};
let state={tabs:[],workspaces:[],bookmarks:[],history:[],downloads:[]},panel='bookmarks';const act=(name,args={})=>window.browserAPI.action(name,args);
function addButton(parent,label,fn,cls=''){const b=document.createElement('button');b.textContent=label;b.className=cls;b.onclick=fn;parent.appendChild(b);return b;}
// Moduli nel pannello laterale. Sostituiscono prompt(), che Electron non supporta.
 // Il pannello è l'unica zona della cornice mai coperta dalle pagine web.
 // command/field: comando del bus e nome del parametro che riceve il testo.
 const FORMS={
   newWorkspace:{title:()=>'Nuovo workspace',label:'Nome',placeholder:'Es. Destiny Builder',
     max:40,submit:'Crea',command:'addWorkspace',field:'name'},
   addResource:{title:()=>'Risorsa per '+state.activeWorkspace,label:'Indirizzo web',
     placeholder:'Es. light.gg oppure https://github.com/…',max:2048,submit:'Aggiungi',
     command:'addResource',field:'url'}
 };
 // Lo stato arriva più volte al secondo (titoli, caricamenti): il modulo
 // si ricostruisce solo quando cambia, altrimenti perderesti quello che stai scrivendo.
 let renderedForm=null;
 function renderForm(mode){
   const def=FORMS[mode];
   $('sidePanelTitle').textContent=def.title();
   if(renderedForm===mode)return;
   renderedForm=mode;
   const list=$('sidePanelItems');list.replaceChildren();
   const form=document.createElement('form');form.className='panel-form';
   const label=document.createElement('label');label.textContent=def.label;label.htmlFor='panelInput';
   const input=document.createElement('input');input.id='panelInput';input.maxLength=def.max;
   input.placeholder=def.placeholder;input.autocomplete='off';
   const error=document.createElement('p');error.className='panel-error';error.setAttribute('role','alert');
   const submit=document.createElement('button');submit.type='submit';submit.textContent=def.submit;
   const hint=document.createElement('p');hint.className='panel-hint';hint.textContent='Invio per confermare · Esc per annullare';
   const close=()=>act('toggleSidePanel',{panel:mode});
   input.onkeydown=event=>{if(event.key==='Escape')close();};
   input.oninput=()=>{error.textContent='';};
   form.onsubmit=async event=>{
     event.preventDefault();
     error.textContent='';submit.disabled=true;
     const response=await act(def.command,{[def.field]:input.value});
     submit.disabled=false;
     // Il comando risponde {ok:true} oppure {ok:false,error}: l'errore resta nel modulo.
     if(response?.ok&&response.result?.ok)close();
     else{error.textContent=response?.result?.error||response?.error||'Operazione non riuscita';input.focus();}
   };
   form.append(label,input,error,submit,hint);list.appendChild(form);
   input.focus();
 }

 // ── Pannello Giochi (Beta 0.6) ──────────────────────────────────────────
 // Due viste: elenco dei giochi e modulo di modifica. La vista è locale alla
 // cornice: il processo principale sa solo che il pannello 'games' è aperto.
 let gamesView={mode:'list'},renderedGames=null;
 const el=(tag,props={},...children)=>{const node=Object.assign(document.createElement(tag),props);node.append(...children);return node;};
 function checkRow(text,checked,onchange){
   const box=el('input',{type:'checkbox',checked});box.onchange=()=>onchange(box.checked);
   return el('label',{className:'check-row'},box,el('span',{textContent:text}));
 }
 function renderGames(){
   $('sidePanelTitle').textContent=gamesView.mode==='edit'?(gamesView.id?'Modifica gioco':'Nuovo gioco'):'Giochi';
   if(gamesView.mode==='edit'){
     // Il modulo non si ricostruisce a ogni aggiornamento: perderesti ciò che scrivi.
     const key='edit:'+gamesView.id;
     if(renderedGames!==key){renderedGames=key;renderGameForm(gamesView.id);}
     return;
   }
   renderedGames='list';
   const list=$('sidePanelItems');list.replaceChildren();
   if(!state.platformSupported)list.append(el('p',{className:'panel-error',textContent:'Il rilevamento dei giochi funziona solo su Windows.'}));
   list.append(checkRow('Rilevamento giochi attivo',state.gameWatcher,enabled=>act('setGameWatcher',{enabled})));
   for(const game of state.games||[]){
     const title=el('div',{className:'game-title',textContent:game.name});
     if(game.running)title.append(el('span',{className:'game-badge',textContent:'in gioco'}));
     const meta=el('div',{className:'game-meta',
       textContent:`${game.exe} · ${game.workspace} · ${game.sites.length} ${game.sites.length===1?'sito':'siti'}`});
     const actions=el('div',{className:'game-actions'},
       checkRow('Attivo',game.enabled,enabled=>act('setGameEnabled',{id:game.id,enabled})));
     addButton(actions,'Modifica',()=>{gamesView={mode:'edit',id:game.id};renderGames();});
     addButton(actions,'Prova',()=>act('testGame',{id:game.id})).title='Apre il companion come se il gioco fosse partito';
     list.append(el('div',{className:'game-row'+(game.enabled?'':' disabled')},title,meta,actions));
   }
   if(!(state.games||[]).length)list.append(el('p',{className:'panel-hint',
     textContent:'Aggiungi un gioco: quando lo avvii, il browser apre da solo i siti che scegli (mappa, inventario, build).'}));
   addButton(list,'＋ Aggiungi gioco',()=>{gamesView={mode:'edit',id:null};renderGames();},'game-add');
   list.append(el('p',{className:'panel-hint',textContent:'Controllo ogni 5 secondi, solo per i giochi attivi. Nessun gioco attivo = nessun controllo.'}));
 }
 function renderGameForm(id){
   const game=(state.games||[]).find(g=>g.id===id)||{name:'',exe:'',sites:[],display:null,alwaysOnTop:false,closeOnExit:false,
     workspace:state.workspaces.some(w=>w.name==='Gaming')?'Gaming':state.activeWorkspace};
   const list=$('sidePanelItems');list.replaceChildren();
   const back=()=>{gamesView={mode:'list'};renderGames();};
   const field=(label,input)=>el('label',{className:'field'},el('span',{textContent:label}),input);
   const name=el('input',{value:game.name,maxLength:60,placeholder:'Es. Destiny 2',autocomplete:'off'});
   const exe=el('input',{value:game.exe,maxLength:84,placeholder:'Es. destiny2.exe',autocomplete:'off'});
   const processes=el('select',{hidden:true});
   processes.onchange=()=>{if(processes.value)exe.value=processes.value;};
   const exeTools=el('div',{className:'inline-buttons'});
   addButton(exeTools,'Sfoglia…',async()=>{const r=await act('chooseGameExe');if(r?.result?.ok)exe.value=r.result.exe;});
   addButton(exeTools,'Programmi aperti',async()=>{
     // Comodo con il gioco avviato: lo scegli dall'elenco invece di cercare il file.
     const r=await act('listUserProcesses');
     processes.replaceChildren(el('option',{value:'',textContent:'Scegli un programma aperto…'}),
       ...(r?.result?.names||[]).map(n=>el('option',{value:n,textContent:n})));
     processes.hidden=false;processes.focus();
   });
   const workspace=el('select');
   for(const w of state.workspaces)workspace.append(el('option',{value:w.name,textContent:w.name,selected:w.name===game.workspace}));
   const sites=el('textarea',{value:game.sites.join('\n'),rows:5,
     placeholder:'Un indirizzo per riga, es.\napp.destinyitemmanager.com\nlight.gg'});
   const display=el('select');
   display.append(el('option',{value:'',textContent:'Dove era l’ultima volta'}));
   for(const d of state.displays||[])display.append(el('option',{value:String(d.id),textContent:d.label,selected:d.id===game.display}));
   let alwaysOnTop=game.alwaysOnTop,closeOnExit=game.closeOnExit;
   const error=el('p',{className:'panel-error',role:'alert'});
   const submit=el('button',{type:'submit',textContent:'Salva'});
   const buttons=el('div',{className:'inline-buttons'},submit);
   addButton(buttons,'Annulla',back);
   if(id){
     // Due click per eliminare: confirm() non è adatto a una cornice senza menu.
     const remove=addButton(buttons,'Elimina',async()=>{
       if(remove.dataset.armed){await act('deleteGame',{id});back();return;}
       remove.dataset.armed='1';remove.textContent='Conferma eliminazione';remove.classList.add('danger');
     });
   }
   const form=el('form',{className:'panel-form'},
     field('Nome',name),field('Eseguibile',exe),exeTools,processes,field('Workspace da aprire',workspace),
     field('Siti da aprire',sites),field('Monitor',display),
     checkRow('Sempre in primo piano mentre giochi',alwaysOnTop,v=>{alwaysOnTop=v;}),
     checkRow('Chiudi la finestra quando esci dal gioco',closeOnExit,v=>{closeOnExit=v;}),
     error,buttons);
   form.onkeydown=event=>{if(event.key==='Escape')back();};
   form.oninput=()=>{error.textContent='';};
   form.onsubmit=async event=>{
     event.preventDefault();error.textContent='';submit.disabled=true;
     const args={name:name.value,exe:exe.value,workspace:workspace.value,sites:sites.value,alwaysOnTop,closeOnExit};
     if(id)args.id=id;
     if(display.value)args.display=Number(display.value);
     const response=await act('saveGame',args);
     submit.disabled=false;
     if(response?.ok&&response.result?.ok)back();
     else{error.textContent=response?.result?.error||response?.error||'Salvataggio non riuscito';}
   };
   list.append(form);
   name.focus();
 }
 // Crea un pannello realmente visibile sui siti (i siti sono WebContentsView).
 // L'interfaccia del pannello non dipende dall'esistenza della homepage.
 function renderSidePanel(){
   const mode=state.sidePanelOpen;
   $('sidePanel').hidden=!mode;
   if(mode!=='games'){gamesView={mode:'list'};renderedGames=null;}
   else return renderGames();
   if(FORMS[mode])return renderForm(mode);
   renderedForm=null;
   if(!mode)return;
   const title=mode==='bookmarks'?'Preferiti':mode==='history'?'Cronologia':'Schede';
   $('sidePanelTitle').textContent=title;
   const list=$('sidePanelItems');list.replaceChildren();
   const items=mode==='bookmarks'?state.bookmarks:mode==='history'?state.history:state.tabs;
   for(const item of (items||[]).slice(0,100)){
     const url=item.url||'';
     const label=item.title||url;
     const button=document.createElement('button');button.className='panel-item';button.textContent=label;
     button.title=url;button.onclick=()=>mode==='tabs'?act('activateTab',{id:item.id}):act('resource',{url});
     list.appendChild(button);
   }
   if(!list.childElementCount)list.textContent='Nessun elemento da mostrare.';
 }
 $('closeSidePanel').onclick=()=>act('toggleSidePanel',{panel:state.sidePanelOpen});
 function renderDownloads(){
 $('downloadDrawer').hidden=!state.downloadsOpen;
 const list=$('downloadList');list.replaceChildren();
 for(const item of state.downloads||[]){
  const row=document.createElement('div');row.className='download-row';
  const title=document.createElement('div');title.className='download-name';title.textContent=item.name;
  const desc=document.createElement('div');desc.className='download-state';desc.textContent=(item.state==='completed'?'Completato':item.state==='cancelled'?'Annullato':item.state==='interrupted'?'Interrotto':'In corso')+(item.total>0?' · '+Math.min(100,Math.round(100*item.received/item.total))+'%':'');
  row.append(title,desc);
  if(item.total>0){const track=document.createElement('progress');track.max=item.total;track.value=item.received;row.appendChild(track);}
  list.appendChild(row);
 }
 if(!list.childElementCount)list.textContent='Nessun download in questa sessione.';
}
$('closeDownloads').onclick=()=>act('toggleDownloads');
$('openDownloadsFolder').onclick=()=>act('showDownloadsFolder');
$('downloadCurrentFile').onclick=()=>act('downloadCurrentFile');
// Homepage lives inside a tab; it is displayed only when that tab is active.
function render(){
 // Il CSS nasconde le etichette quando sidebarMode è compact e libera lo spazio se hidden.
 document.body.dataset.sidebarMode=state.sidebarMode||'compact';
 document.body.dataset.panelOpen=state.sidePanelOpen?'true':'false';
 $('globalSidebar').hidden=state.sidebarMode==='hidden';
 $('dashboard').hidden=!state.homeActive;
 $('footerWorkspaceName').textContent=state.activeWorkspace||'Personale';
 $('reopenClosed').disabled=!state.canReopenClosed;
 // Gli elementi 'group' e 'tab' arrivano dal modello tab-advanced.cjs.
 // I gruppi compressi visualizzano solo l'intestazione; i siti rimangono aperti.
 const tabs=$('tabs');tabs.replaceChildren();
 for(const entry of state.tabStrip||[]){
   if(entry.kind==='group'){
     const group=document.createElement('div');
     group.className='stack-heading'+(entry.collapsed?' collapsed':'')+(entry.active?' contains-active':'');
     const toggle=document.createElement('button');
     toggle.className='stack-toggle';
     toggle.textContent=(entry.collapsed?'▸ ':'▾ ')+entry.group+' ('+entry.count+')';
     toggle.title=entry.collapsed?'Espandi stack':'Comprimi stack';
     toggle.setAttribute('aria-expanded',String(!entry.collapsed));
     toggle.onclick=()=>act('toggleGroup',{group:entry.group});
     group.appendChild(toggle);
     const actions=addButton(group,'⋯',()=>act('tabContextMenu',{id:entry.tabIds[0]}),'stack-actions');
     actions.title='Azioni stack';
     // Trascinare un'altra scheda SOPRA lo stack la aggiunge al gruppo.
     group.ondragover=event=>event.preventDefault();
     group.ondrop=event=>{
       event.preventDefault();
       const fromId=Number(event.dataTransfer.getData('text/plain'));
       if(Number.isInteger(fromId)&&fromId!==entry.tabIds[0])
         act('stackTabs',{fromId,targetId:entry.tabIds[0]});
     };
     tabs.appendChild(group);
     continue;
   }
   const t=entry.tab;
   const tab=document.createElement('div');
   tab.className='tab'+(t.active?' active':'')+(t.pinned?' pinned':'')+
     (entry.inGroup?' stacked':'');
   tab.draggable=true;
   tab.ondragstart=event=>{
     event.dataTransfer.setData('text/plain',String(t.id));
     event.dataTransfer.effectAllowed='move';
   };
   tab.ondragover=event=>event.preventDefault();
   tab.ondrop=event=>{
     event.preventDefault();
     const fromId=Number(event.dataTransfer.getData('text/plain'));
     if(!Number.isInteger(fromId)||fromId===t.id)return;
     // Shift + trascina: crea/assegna uno stack. Senza Shift: riordina soltanto.
     if(event.shiftKey)act('stackTabs',{fromId,targetId:t.id});
     else act('reorderTab',{id:fromId,beforeId:t.id});
   };
   const title=document.createElement('span');
   title.textContent=t.isHome?'⌂ Home':(t.title||t.url);
   title.title=(t.title||t.url)+' — Shift+trascina per creare uno stack';
   title.onclick=()=>act('activateTab',{id:t.id});
   tab.appendChild(title);
   // Il menu contestuale è nativo Windows, anche con una pagina web aperta.
   tab.oncontextmenu=event=>{event.preventDefault();act('tabContextMenu',{id:t.id});};
   const menu=addButton(tab,'⋯',()=>act('tabContextMenu',{id:t.id}),'tab-more');
   menu.title='Menu scheda';
   addButton(tab,'×',()=>act('closeTab',{id:t.id}));
   tabs.appendChild(tab);
 }
 // Ciascun workspace è un pulsante con icona 20px e nome separato.
 const w=$('workspaces');w.replaceChildren();
 for(const workspace of state.workspaces){
   const button=document.createElement('button');
   button.className='workspace-button'+(workspace.name===state.activeWorkspace?' selected':'')+
     (workspace.openElsewhere?' elsewhere':'');
   // Un workspace può stare in una sola finestra: il clic porta in primo piano quella.
   button.title=workspace.name+(workspace.openElsewhere?' — aperto in un’altra finestra':'')+
     ' — click destro per altre opzioni';
   button.setAttribute('aria-label',workspace.name+' ('+workspace.count+' schede)');
   const icon=document.createElement('span');icon.className='workspace-icon';
   if(workspace.iconData&&workspace.iconData.startsWith('data:image/png;base64,')){
     const image=document.createElement('img');image.src=workspace.iconData;
     image.alt='';image.width=20;image.height=20;icon.appendChild(image);
   }else{
     icon.textContent=workspace.name==='Destiny Builder'?'◈':workspace.name==='Gaming'?'♜':workspace.name==='Personale'?'⌂':'▣';
   }
   const text=document.createElement('span');text.className='workspace-name';text.textContent=workspace.name;
   const count=document.createElement('span');count.className='workspace-count';count.textContent=String(workspace.count);
   button.append(icon,text,count);
   button.onclick=()=>act('workspace',{name:workspace.name});
   // Click destro: menu nativo con "Apri in una nuova finestra" e "Cambia icona".
   button.oncontextmenu=event=>{event.preventDefault();act('workspaceContextMenu',{name:workspace.name});};
   w.appendChild(button);
 }$('title').textContent=state.activeWorkspace;const current=state.workspaces.find(x=>x.name===state.activeWorkspace);$('folder').textContent=current?.projectPath?'Cartella: '+current.projectPath:'Nessuna cartella locale associata';const res=$('resources');res.replaceChildren();for(const u of current?.resources||[])addButton(res,u,()=>act('resource',{url:u}),'item');if(!current?.resources?.length)res.textContent='Nessuna risorsa salvata.';renderPanel();renderSidePanel();renderDownloads();const err=$('loadError');err.hidden=!state.loadError;err.textContent=state.loadError||'';$('address').placeholder=state.tabs.find(t=>t.active)?.url||'Cerca o inserisci un URL...';}
function renderPanel(){const list=panel==='history'?state.history:panel==='downloads'?state.downloads:state.bookmarks;$('secondaryTitle').textContent=panel==='history'?'Cronologia':panel==='downloads'?'Download':'Preferiti';const el=$('secondary');el.replaceChildren();for(const item of list.slice(0,25)){
if(panel==='downloads'){const label=item.name+' — '+item.state+(item.total>0?' ('+Math.round(100*item.received/item.total)+'%)':'');addButton(el,label,()=>act('showDownloadsFolder'), 'item');}
else addButton(el,item.title||item.url,()=>act('resource',{url:item.url}),'item');
}if(!list.length)el.textContent='Nessun elemento.';}
$('workspaceSwitcher').onclick=()=>act('showWorkspaceMenu');
// Questo pulsante è una scorciatoia visuale alla stessa funzione di Ctrl+Shift+T.
$('reopenClosed').onclick=()=>act('reopenClosedTab');
$('new').onclick=()=>act('newTab');$('back').onclick=()=>act('back');$('forward').onclick=()=>act('forward');$('reload').onclick=()=>act('reload');$('home').onclick=()=>act('home');$('bookmark').onclick=()=>act('bookmark');$('nav').onsubmit=e=>{e.preventDefault();act('navigate',{url:$('address').value});$('address').value='';};$('addWorkspace').onclick=()=>act('toggleSidePanel',{panel:'newWorkspace'});$('chooseFolder').onclick=()=>act('projectFolder');$('openFolder').onclick=()=>act('openFolder');$('addResource').onclick=()=>act('toggleSidePanel',{panel:'addResource'});$('showDownloads').onclick=()=>act('toggleDownloads');$('sideDownloads').onclick=()=>act('toggleDownloads');$('showHistory').onclick=()=>act('toggleSidePanel',{panel:'history'});
$('showBookmarks').onclick=()=>act('toggleSidePanel',{panel:'bookmarks'});
$('showTabs').onclick=()=>act('toggleSidePanel',{panel:'tabs'});
$('showGames').onclick=()=>act('toggleSidePanel',{panel:'games'});window.browserAPI.onState(next=>{state=next;render();});
// Ctrl+L dal processo principale: il focus può essere dentro una pagina web.
window.browserAPI.onUi(message=>{if(message?.type==='focusAddress'){const a=$('address');a.focus();a.select();}});
