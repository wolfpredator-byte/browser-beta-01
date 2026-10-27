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
 // Crea un pannello realmente visibile sui siti (i siti sono WebContentsView).
 // L'interfaccia del pannello non dipende dall'esistenza della homepage.
 function renderSidePanel(){
   const mode=state.sidePanelOpen;
   $('sidePanel').hidden=!mode;
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
$('showTabs').onclick=()=>act('toggleSidePanel',{panel:'tabs'});window.browserAPI.onState(next=>{state=next;render();});
// Ctrl+L dal processo principale: il focus può essere dentro una pagina web.
window.browserAPI.onUi(message=>{if(message?.type==='focusAddress'){const a=$('address');a.focus();a.select();}});
