const $=id=>document.getElementById(id);
let orbMode='idle';
function setOrb(mode){
 if(!['idle','thinking','speaking'].includes(mode))return;
 orbMode=mode;
 const orb=$('jarvisOrb');orb.className='orb '+mode;
 orb.setAttribute('aria-label','JARVIS: '+mode+' (anteprima dimostrativa)');
 document.querySelectorAll('[data-orb]').forEach(btn=>btn.classList.toggle('chosen',btn.dataset.orb===mode));
}
document.querySelectorAll('[data-orb]').forEach(btn=>btn.onclick=()=>setOrb(btn.dataset.orb));
$('toggleSidebar').onclick=()=>$('dashboard').querySelector('.sidebar').classList.toggle('compact');
$('jarvisMini').onclick=()=>window.browserAPI.action('home');
$('homeSearch').onsubmit=e=>{e.preventDefault();const q=$('homeQuery').value.trim();if(q){window.browserAPI.action('navigate',{url:q});$('homeQuery').value='';}};
let state={tabs:[],workspaces:[],bookmarks:[],history:[],downloads:[]},panel='bookmarks';const act=(name,args={})=>window.browserAPI.action(name,args);
function addButton(parent,label,fn,cls=''){const b=document.createElement('button');b.textContent=label;b.className=cls;b.onclick=fn;parent.appendChild(b);return b;}
function render(){const tabs=$('tabs');tabs.replaceChildren();state.tabs.forEach(t=>{const d=document.createElement('div');d.className='tab'+(t.active?' active':'');d.draggable=true;d.ondragstart=e=>{e.dataTransfer.setData('text/plain',String(t.id));e.dataTransfer.effectAllowed='move';};d.ondragover=e=>e.preventDefault();d.ondrop=e=>{e.preventDefault();const id=Number(e.dataTransfer.getData('text/plain'));if(Number.isInteger(id))act('reorderTab',{id,beforeId:t.id});};
if(t.group){const g=document.createElement('small');g.className='tab-group';g.textContent=t.group;d.appendChild(g);}
const title=document.createElement('span');title.textContent=t.title||t.url;title.onclick=()=>act('activateTab',{id:t.id});d.appendChild(title);
const menu=addButton(d,'⋯',()=>{const choice=prompt('Scheda: D = duplica, P = fissa/sblocca, G = gruppo, U = rimuovi gruppo');if(!choice)return;const c=choice.trim().toUpperCase();if(c==='D')act('duplicateTab',{id:t.id});else if(c==='P')act('pinTab',{id:t.id});else if(c==='U')act('groupTab',{id:t.id,group:''});else if(c==='G'){const name=prompt('Nome dello stack (stesso nome per raggruppare le schede):',t.group||'');if(name!==null)act('groupTab',{id:t.id,group:name});}},'tab-more');menu.title='Azioni scheda';if(t.pinned)d.classList.add('pinned');
addButton(d,'×',()=>act('closeTab',{id:t.id}));tabs.appendChild(d);});const w=$('workspaces');w.replaceChildren();state.workspaces.forEach(x=>addButton(w,`${x.name} (${x.count})`,()=>act('workspace',{name:x.name}),x.name===state.activeWorkspace?'selected':''));$('title').textContent=state.activeWorkspace;const current=state.workspaces.find(x=>x.name===state.activeWorkspace);$('folder').textContent=current?.projectPath?'Cartella: '+current.projectPath:'Nessuna cartella locale associata';const res=$('resources');res.replaceChildren();for(const u of current?.resources||[])addButton(res,u,()=>act('resource',{url:u}),'item');if(!current?.resources?.length)res.textContent='Nessuna risorsa salvata.';renderPanel();const err=$('loadError');err.hidden=!state.loadError;err.textContent=state.loadError||'';$('address').placeholder=state.tabs.find(t=>t.active)?.url||'Cerca o inserisci un URL...';}
function renderPanel(){const list=panel==='history'?state.history:panel==='downloads'?state.downloads:state.bookmarks;$('secondaryTitle').textContent=panel==='history'?'Cronologia':panel==='downloads'?'Download':'Preferiti';const el=$('secondary');el.replaceChildren();for(const item of list.slice(0,25)){
if(panel==='downloads'){const label=item.name+' — '+item.state+(item.total>0?' ('+Math.round(100*item.received/item.total)+'%)':'');addButton(el,label,()=>act('showDownloadsFolder'), 'item');}
else addButton(el,item.title||item.url,()=>act('resource',{url:item.url}),'item');
}if(!list.length)el.textContent='Nessun elemento.';}
$('new').onclick=()=>act('newTab');$('back').onclick=()=>act('back');$('forward').onclick=()=>act('forward');$('reload').onclick=()=>act('reload');$('home').onclick=()=>act('home');$('bookmark').onclick=()=>act('bookmark');$('nav').onsubmit=e=>{e.preventDefault();act('navigate',{url:$('address').value});$('address').value='';};$('addWorkspace').onclick=()=>{const name=prompt('Nome del workspace:');if(name)act('addWorkspace',{name});};$('chooseFolder').onclick=()=>act('projectFolder');$('openFolder').onclick=()=>act('openFolder');$('addResource').onclick=()=>{const url=prompt('URL risorsa da associare al workspace:');if(url)act('addResource',{url});};$('showDownloads').onclick=()=>{act('home');panel='downloads';renderPanel();};$('showHistory').onclick=()=>{panel='history';renderPanel();};$('showBookmarks').onclick=()=>{panel='bookmarks';renderPanel();};window.browserAPI.onState(next=>{state=next;render();});
