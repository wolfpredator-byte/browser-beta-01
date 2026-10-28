const $=id=>document.getElementById(id);
// Icone VARCO (Beta 0.13): SVG in assets/icons usati come maschera, così prendono il colore del testo.
function icon(name){const span=document.createElement('span');span.className='i i-'+name;span.setAttribute('aria-hidden','true');return span;}
window.icon=icon;
function iconButton(parent,name,label,fn,cls=''){const b=document.createElement('button');b.className='tool '+cls;b.title=label;b.setAttribute('aria-label',label);b.append(icon(name));b.onclick=fn;parent.appendChild(b);return b;}
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

 // ── Pannello Progetto (Beta 0.7) ────────────────────────────────────────
 // Si ricostruisce solo quando i dati cambiano davvero (nuove righe di log,
 // stato di un comando) e mai mentre stai scrivendo in un suo campo.
 let renderedProject=null;
 const projectUi={openLogs:new Set(),editingSecret:null};
 const STATUS_LABELS={idle:'Fermo',running:'In esecuzione',stopped:'Fermato',exited:'Terminato',error:'Errore'};
 function timeAgo(ms){
   if(!ms)return 'mai';
   const minutes=Math.round((Date.now()-ms)/60000);
   return minutes<1?'adesso':minutes<60?minutes+' min fa':Math.round(minutes/60)+' h fa';
 }
 function section(title,...children){return el('section',{className:'project-section'},el('h4',{textContent:title}),...children);}
 function projectButtons(...specs){
   const row=el('div',{className:'inline-buttons'});
   for(const [label,fn,cls] of specs)addButton(row,label,fn,cls||'');
   return row;
 }
 async function runAndReport(command,args,errorBox){
   const response=await act(command,args);
   const error=response?.ok?response.result?.ok===false&&response.result.error:response?.error;
   if(error&&errorBox)errorBox.textContent=error;
   return !error;
 }
 function renderProject(){
   const p=state.project;
   $('sidePanelTitle').textContent=p?.config?.nome||'Progetto';
   const list=$('sidePanelItems');
   if(list.contains(document.activeElement)&&document.activeElement.matches('input,textarea'))return;
   const key=JSON.stringify([p,[...projectUi.openLogs],projectUi.editingSecret]);
   if(key===renderedProject)return;
   renderedProject=key;
   // Conserviamo lo scorrimento del pannello e dei log tra una ricostruzione e l'altra.
   const panel=$('sidePanel'),scroll=panel.scrollTop;
   const logScroll={};
   for(const pre of list.querySelectorAll('pre.log'))logScroll[pre.dataset.index]={top:pre.scrollTop,atEnd:pre.scrollTop+pre.clientHeight>=pre.scrollHeight-4};
   list.replaceChildren();
   const error=el('p',{className:'panel-error',role:'alert'});
   if(!p||p.status==='none'){
     list.append(el('p',{className:'panel-hint',textContent:'Collega la cartella del progetto: il browser leggerà progetto.browser.json da lì.'}),
       projectButtons(['Collega cartella',()=>act('projectFolder')]));
     return;
   }
   list.append(el('p',{className:'project-folder',textContent:p.folder,title:p.folder}));
   if(p.status==='missing'){
     list.append(el('p',{className:'panel-hint',textContent:'Nella cartella non c’è progetto.browser.json. Questa è la proposta, ricavata da package.json:'}),
       el('pre',{className:'json-preview',textContent:JSON.stringify(p.proposal,null,2)}),
       projectButtons(['Crea il file',()=>runAndReport('projectCreateFile',{},error)]),error,
       el('p',{className:'panel-hint',textContent:'Puoi modificarlo quando vuoi: il browser lo rilegge da solo.'}));
     return;
   }
   if(p.status==='invalid'){
     list.append(el('p',{className:'panel-error',textContent:'Il file ha degli errori:'}),
       el('ul',{className:'project-errors'},...p.errors.map(e=>el('li',{textContent:e}))),
       projectButtons(['Apri il file',()=>act('projectOpenFile')],['Rileggi',()=>act('projectReload')]));
     return;
   }
   const c=p.config;
   if(!p.trusted){
     // Un file scaricato con un progetto altrui potrebbe contenere comandi dannosi:
     // mostriamo esattamente cosa farà prima di permetterlo.
     const items=[...c.avvio.map(x=>el('li',{},'Comando: ',el('code',{textContent:x.comando}))),
       ...(c.editor?[el('li',{},'Editor: ',el('code',{textContent:c.editor}))]:[]),
       ...c.monitor.map(m=>el('li',{},`Monitor «${m.nome}» → ${new URL(m.url).host}`+
         (Object.keys(m.header).length?` (header: ${Object.keys(m.header).join(', ')})`:'')))];
     list.append(el('div',{className:'trust-box'},
       el('strong',{textContent:'Ti fidi di questo progetto?'}),
       el('p',{textContent:'Questo file può avviare comandi sul tuo PC e inviare i segreti a questi indirizzi:'}),
       el('ul',{},...items),
       projectButtons(['Mi fido',()=>act('projectTrust'),'primary'],['Apri il file',()=>act('projectOpenFile')]),
       el('p',{className:'panel-hint',textContent:'Se comandi o monitor cambiano, te lo chiederò di nuovo.'})));
     return;
   }
   list.append(projectButtons(
     ...(c.anteprima?[['Anteprima',()=>act('projectOpenPreview')]]:[]),
     ...(c.editor?[['Apri in '+c.editor,()=>runAndReport('projectOpenEditor',{},error)]]:[]),
     ['Modifica file',()=>act('projectOpenFile')]),error);

   if(p.commands.length){
     const rows=p.commands.map(cmd=>{
       const running=cmd.status==='running';
       const status=STATUS_LABELS[cmd.status]+(cmd.status==='exited'&&cmd.exitCode!==null?` (${cmd.exitCode})`:'');
       const head=el('div',{className:'command-head'},el('span',{className:'command-name',textContent:cmd.name}),
         el('span',{className:'command-status '+cmd.status,textContent:status}));
       const buttons=projectButtons(
         running?['■ Ferma',()=>runAndReport('projectStop',{index:cmd.index},error)]:['▶ Avvia',()=>{projectUi.openLogs.add(cmd.index);runAndReport('projectRun',{index:cmd.index},error);}],
         [projectUi.openLogs.has(cmd.index)?'Nascondi log':'Log',()=>{
           projectUi.openLogs.has(cmd.index)?projectUi.openLogs.delete(cmd.index):projectUi.openLogs.add(cmd.index);renderProject();}],
         ...(cmd.lines.length?[['Svuota',()=>act('projectClearLog',{index:cmd.index})]]:[]));
       const row=el('div',{className:'command-row'},head,el('code',{className:'command-text',textContent:cmd.command}),buttons);
       if(projectUi.openLogs.has(cmd.index)){
         const pre=el('pre',{className:'log',textContent:cmd.lines.join('\n')||'Nessun output.'});
         pre.dataset.index=cmd.index;row.append(pre);
       }
       return row;
     });
     list.append(section('Comandi',...rows));
   }

   if(p.secrets.length){
     const rows=p.secrets.map(s=>{
       const row=el('div',{className:'secret-row'},el('code',{textContent:s.name}),
         el('span',{className:s.set?'secret-ok':'secret-missing',textContent:s.set?'impostato':'mancante'}));
       if(projectUi.editingSecret===s.name){
         const input=el('input',{type:'password',placeholder:'Valore di '+s.name,autocomplete:'off'});
         const form=el('form',{className:'secret-form'},input,el('button',{type:'submit',textContent:'Salva'}));
         form.onsubmit=async e=>{
           e.preventDefault();
           if(await runAndReport('projectSetSecret',{name:s.name,value:input.value},error)){projectUi.editingSecret=null;input.blur();renderedProject=null;renderProject();}
         };
         input.onkeydown=e=>{if(e.key==='Escape'){projectUi.editingSecret=null;input.blur();renderedProject=null;renderProject();}};
         row.append(form);
         setTimeout(()=>input.focus());
       }else row.append(projectButtons([s.set?'Cambia':'Imposta',()=>{projectUi.editingSecret=s.name;renderProject();}],
         ...(s.set?[['Rimuovi',()=>act('projectRemoveSecret',{name:s.name})]]:[])));
       return row;
     });
     list.append(section('Segreti',...rows,el('p',{className:'panel-hint',
       textContent:'Cifrati con il tuo account Windows. Arrivano ai comandi come variabili d’ambiente e ai monitor come {{NOME}}.'})));
   }

   if(p.monitors.length){
     const rows=p.monitors.map(m=>{
       const changed=m.changedAt&&Date.now()-m.changedAt<24*3600000;
       const title=el('div',{className:'command-head'},el('span',{className:'command-name',textContent:m.name}),
         changed?el('span',{className:'game-badge',textContent:'cambiato'}):'');
       const value=m.error?el('div',{className:'panel-error',textContent:m.error}):
         el('div',{className:'monitor-value',textContent:m.value??'—'});
       const meta=el('div',{className:'game-meta',textContent:
         `${m.host}${m.field?' · '+m.field:''} · ogni ${m.minutes} min · ${m.checking?'controllo…':'controllato '+timeAgo(m.checkedAt)}`+
         (changed&&m.previous?` · prima: ${m.previous}`:'')});
       return el('div',{className:'command-row'},title,value,meta,projectButtons(['Controlla ora',()=>runAndReport('projectCheckMonitor',{name:m.name},error)]));
     });
     list.append(section('Monitor',...rows));
   }

   const searches=Object.entries(c.ricerche);
   if(searches.length)list.append(section('Ricerche rapide',
     ...searches.map(([k,t])=>el('div',{className:'game-meta'},el('code',{textContent:k}),' → '+new URL(t.replace('%s','x')).host)),
     el('p',{className:'panel-hint',textContent:`Scrivi «${searches[0][0]} testo» nella barra degli indirizzi.`})));
   if(c.link.length)list.append(section('Link',...c.link.map(l=>addButton(el('div'),l.nome,()=>act('resource',{url:l.url}),'item'))));

   panel.scrollTop=scroll;
   for(const pre of list.querySelectorAll('pre.log')){
     const saved=logScroll[pre.dataset.index];
     pre.scrollTop=!saved||saved.atEnd?pre.scrollHeight:saved.top;
   }
 }

 // ── Pannello JARVIS (Beta 0.9) ──────────────────────────────────────────
 let renderedJarvis=null;
 function renderJarvis(){
   const j=state.jarvis;
   $('sidePanelTitle').textContent='JARVIS';
   const key=JSON.stringify(j)+Math.floor(Date.now()/30000); // aggiorna anche "x min fa"
   if(key===renderedJarvis)return;
   renderedJarvis=key;
   const list=$('sidePanelItems');list.replaceChildren();
   if(!j)return;
   const error=el('p',{className:'panel-error',role:'alert'});
   list.append(checkRow('Server MCP attivo',j.enabled,enabled=>act('setJarvisEnabled',{enabled})));
   const status=j.error?el('p',{className:'panel-error',textContent:'Non avviato: '+j.error}):
     j.url?el('p',{className:'game-meta'},'In ascolto su ',el('code',{textContent:j.url})):
     el('p',{className:'panel-hint',textContent:'Spento: nessun programma può comandare il browser.'});
   list.append(status);
   if(j.enabled&&j.url){
     list.append(el('p',{className:'game-meta',textContent:j.lastSeen?
       `Ultimo client: ${j.clientName||'sconosciuto'} · ${timeAgo(j.lastSeen)}`:'Nessun client collegato finora.'}));
     list.append(checkRow('Può leggere il testo delle pagine',j.readPages,enabled=>act('setJarvisReadPages',{enabled})));
     const regen=addButton(el('span'),'Rigenera token',async()=>{
       if(!regen.dataset.armed){regen.dataset.armed='1';regen.textContent='Conferma: i client andranno riconfigurati';regen.classList.add('danger');return;}
       await act('regenerateJarvisToken');renderedJarvis=null;renderJarvis();
     });
     list.append(projectButtons(['Copia configurazione',async()=>{
       if(await runAndReport('copyJarvisConfig',{},error)){error.textContent='';copied.textContent='Copiata negli appunti.';}
     }],['Mostra file',()=>act('showJarvisConfigFile')]),el('div',{className:'inline-buttons'},regen));
     const copied=el('p',{className:'panel-hint'});
     list.append(copied,error,el('p',{className:'panel-hint',
       textContent:'JARVIS legge url e token da jarvis-mcp.json (vedi examples/jarvis_browser.py). Avviare comandi del progetto chiede sempre la tua conferma.'}));
     list.append(section('Strumenti',el('div',{className:'tool-chips'},...j.tools.map(name=>el('code',{textContent:name})))));
     list.append(section('Attività',...(j.activity.length?j.activity.map(a=>el('div',{className:'activity-row'+(a.ok?'':' failed')},
       el('span',{textContent:new Date(a.time).toLocaleTimeString('it-IT')}),el('code',{textContent:a.tool}),
       el('span',{textContent:a.ok?'ok':a.error||'errore',title:a.error||''}))):[el('p',{className:'panel-hint',textContent:'Nessuna richiesta.'})])));
   }else list.append(el('p',{className:'panel-hint',textContent:
     'Attivalo per permettere a JARVIS (o a un altro client MCP, come Claude Code) di usare il browser. '+
     'Ascolta solo su questo PC (127.0.0.1) e richiede un token.'}));
 }
 // La sfera segue JARVIS quando è collegato; altrimenti resta la demo con i pulsanti.
 // Beta 0.13: al centro della Home c'è il logo VARCO; quando JARVIS è collegato
 // al suo posto compare la sfera, che segue i suoi stati (idle, pensa, parla).
 function renderOrb(){
   const connected=!!state.jarvisConnected;
   $('jarvisMini').dataset.mode=connected?state.orb.mode:'idle';
   $('jarvisMini').classList.toggle('connected',connected);
   $('heroLogo').hidden=connected;$('orbStage').hidden=!connected;
   const message=document.querySelector('.offline');
   message.hidden=!connected;
   if(connected){setOrb(state.orb.mode);message.textContent=state.orb.message||`JARVIS connesso · ${state.jarvisClient||'client MCP'}`;}
   // Riquadro JARVIS
   $('jarvisCardTitle').textContent=connected?'Pronto ad aiutarti.':state.jarvisEnabled?'In attesa di JARVIS…':'JARVIS è spento.';
   $('jarvisCardText').textContent=connected?`Collegato: ${state.jarvisClient||'client MCP'}`:
     state.jarvisEnabled?'Il server è acceso: avvia JARVIS sul PC.':'Accendilo per permettere a JARVIS di usare il browser.';
   document.querySelector('.jarvis-card').classList.toggle('connected',connected);
 }
 // Riquadri della Home: progetti (workspace con una cartella) e cartelle di Windows.
 const QUICK_FOLDERS=[['downloads','Download','downloads'],['documents','Documenti','project'],['pictures','Immagini','external'],['desktop','Desktop','ws-default']];
 let renderedHomeCards=null;
 function renderHomeCards(){
   const projects=state.workspaces.filter(w=>w.projectPath);
   const list=projects.length?projects:state.workspaces;
   const key=JSON.stringify(list.map(w=>[w.name,w.projectPath,w.name===state.activeWorkspace]));
   if(key===renderedHomeCards)return;
   renderedHomeCards=key;
   const box=$('homeProjects');box.replaceChildren();
   for(const w of list){
     const row=el('div',{className:'card-row'+(w.name===state.activeWorkspace?' current':'')});
     const open=el('button',{className:'card-link',title:w.projectPath||w.name},icon(w.projectPath?'ws-project':'ws-default'),el('span',{textContent:w.name}));
     open.onclick=()=>act('workspace',{name:w.name});
     row.append(open);
     iconButton(row,'external','Apri in una nuova finestra',()=>act('openWorkspaceWindow',{name:w.name}),'card-side');
     box.append(row);
   }
   const quick=$('homeQuick');
   if(!quick.childElementCount)for(const [name,label,ic] of QUICK_FOLDERS){
     const b=el('button',{className:'card-link'},icon(ic),el('span',{textContent:label}));
     b.onclick=()=>act('openKnownFolder',{name});
     quick.append(b);
   }
 }
 $('jarvisCardButton').onclick=()=>act('openSidePanel',{panel:'jarvis'});

 // ── Pannello del sito (Beta 0.10): permessi e blocco pubblicità ──────────
 let renderedSite=null;
 const PERMISSION_CHOICES=[['ask','Chiedi'],['allow','Consenti'],['deny','Blocca']];
 function renderSite(){
   const s=state.site;
   $('sidePanelTitle').textContent=s?.host||'Sito';
   const list=$('sidePanelItems');
   // Non ricostruire mentre scegli in un menu a tendina: perderebbe la scelta.
   if(list.contains(document.activeElement)&&document.activeElement.matches('select'))return;
   const key=JSON.stringify(s);
   if(key===renderedSite)return;
   renderedSite=key;
   list.replaceChildren();
   if(!s){list.append(el('p',{className:'panel-hint',textContent:'Apri un sito per vederne permessi e blocco pubblicità.'}));return;}
   list.append(el('p',{className:s.secure?'site-secure':'site-insecure',textContent:s.secure?
     '🔒 Connessione protetta':'⚠ Connessione non protetta (http): non inserire password o dati personali.'}));
   // Blocco pubblicità
   const a=s.adblock;
   const status=!a.enabled?'Spento su tutti i siti.':a.state==='loading'?'Scarico le liste di blocco…':
     a.state==='error'?'Liste non disponibili: '+a.error:
     `${s.blocked} ${s.blocked===1?'elemento bloccato':'elementi bloccati'} in questa pagina · liste del ${new Date(a.updatedAt).toLocaleDateString('it-IT')}`;
   list.append(section('Pubblicità e tracker',
     checkRow('Blocca su tutti i siti',a.enabled,enabled=>act('setAdblockEnabled',{enabled})),
     ...(a.enabled?[checkRow(`Blocca su ${s.host}`,a.siteEnabled,enabled=>act('setAdblockForSite',{host:s.host,enabled}))]:[]),
     el('p',{className:'panel-hint',textContent:status}),
     ...(a.enabled&&!a.siteEnabled?[el('p',{className:'panel-hint',textContent:'Su questo sito il blocco è disattivato (es. perché la pagina non funzionava).'})]:[])));
   // Permessi
   if(s.origin){
     const rows=s.permissions.map(p=>{
       const select=el('select',{className:'permission-select'});
       for(const [value,label] of PERMISSION_CHOICES)select.append(el('option',{value,textContent:label,selected:p.value===value}));
       select.onchange=()=>{select.blur();act('setSitePermission',{origin:s.origin,kind:p.kind,value:select.value});};
       return el('label',{className:'permission-row'},el('span',{textContent:p.label[0].toUpperCase()+p.label.slice(1)}),select);
     });
     list.append(section('Permessi di questo sito',...rows,
       projectButtons(['Dimentica questo sito',()=>act('forgetSite',{origin:s.origin})])));
   }
   const others=s.sites.filter(x=>x.origin!==s.origin);
   if(others.length)list.append(section('Altri siti con scelte salvate',...others.map(x=>el('div',{className:'command-row'},
     el('div',{className:'command-name',textContent:new URL(x.origin).host}),el('div',{className:'game-meta',textContent:x.summary}),
     projectButtons(['Dimentica',()=>act('forgetSite',{origin:x.origin})])))));
 }
 // Scudo accanto alla barra: numero di elementi bloccati e avviso per le pagine http.
 function renderSiteButton(){
   const button=$('siteButton'),s=state.site;
   button.hidden=!s;
   if(!s)return;
   button.classList.toggle('insecure',!s.secure);
   button.title=(s.secure?'':'Connessione non protetta · ')+`${s.blocked} elementi bloccati · permessi del sito`;
   $('siteBlocked').textContent=s.blocked>0?(s.blocked>99?'99+':String(s.blocked)):'';
 }

 // ── Pannello Impostazioni (Beta 0.11) ───────────────────────────────────
 let renderedSettings=null;
 const settingsUi={status:'',statusError:false};
 const SLEEP_LABELS=[[0,'Mai'],[15,'Dopo 15 minuti'],[30,'Dopo 30 minuti'],[60,'Dopo 1 ora'],[120,'Dopo 2 ore']];
 function selectBox(options,value,onchange){
   const select=el('select',{className:'permission-select'});
   for(const [v,label] of options)select.append(el('option',{value:String(v),textContent:label,selected:String(v)===String(value)}));
   select.onchange=()=>{select.blur();onchange(select.value);};
   return select;
 }
 // Azioni che non si possono annullare: il primo clic chiede conferma, il secondo esegue.
 function confirmButton(label,confirmLabel,fn){
   const button=addButton(el('span'),label,async()=>{
     if(!button.dataset.armed){button.dataset.armed='1';button.textContent=confirmLabel;button.classList.add('danger');return;}
     await fn();
   });
   return button;
 }
 function settingsStatus(text,isError=false){settingsUi.status=text;settingsUi.statusError=isError;renderedSettings=null;renderSettings();}
 async function settingsAction(command,okText){
   const response=await act(command);
   const r=response?.result;
   if(!response?.ok)settingsStatus(response?.error||'Operazione non riuscita',true);
   else if(r?.cancelled)return;
   else if(r?.ok===false)settingsStatus(r.error||'Operazione non riuscita',true);
   else if(okText)settingsStatus(typeof okText==='function'?okText(r):okText);
 }
 function renderSettings(){
   const s=state.settings;
   const list=$('settingsBody');
   if(list.contains(document.activeElement)&&document.activeElement.matches('select'))return;
   const key=JSON.stringify([s,settingsUi]);
   if(key===renderedSettings)return;
   renderedSettings=key;
   const panel=$('settingsPage'),scroll=panel.scrollTop;
   list.replaceChildren();
   if(!s)return;
   const row=(label,control)=>el('label',{className:'permission-row'},el('span',{textContent:label}),control);
   const hint=text=>el('p',{className:'panel-hint',textContent:text});
   if(settingsUi.status)list.append(el('p',{className:settingsUi.statusError?'panel-error':'settings-status',role:'status',textContent:settingsUi.status}));
   list.append(
     section('Ricerca',
       row('Motore di ricerca',selectBox(s.engines.map(e=>[e.id,e.label]),s.searchEngine,engine=>act('setSearchEngine',{engine}))),
       hint('Per le frasi scritte nella barra degli indirizzi e nella Home. Le ricerche rapide dei progetti non cambiano.')),
     section('Avvio e background',
       checkRow('Resta nell’area di notifica quando chiudo le finestre',s.runInBackground,enabled=>act('setRunInBackground',{enabled})),
       checkRow('Avvia con Windows (solo l’icona, nessuna finestra)',s.openAtLogin,enabled=>act('setOpenAtLogin',{enabled})),
       checkRow('Rileva l’avvio dei giochi',s.gameWatcher,enabled=>act('setGameWatcher',{enabled}))),
     section('Schede',
       row('Sospendi le schede non guardate',selectBox(SLEEP_LABELS,s.sleepAfterMinutes,v=>act('setSleepMinutes',{minutes:Number(v)}))),
       hint('Mai sospese: la scheda che guardi, quelle fissate, quelle che suonano e quelle con i DevTools aperti.')),
     section('Privacy e sicurezza',
       checkRow('Blocca pubblicità e tracker',s.adblock.enabled,enabled=>act('setAdblockEnabled',{enabled})),
       hint(`${s.adblock.exceptions} ${s.adblock.exceptions===1?'sito escluso':'siti esclusi'} dal blocco · ${s.sitesWithPermissions} ${s.sitesWithPermissions===1?'sito':'siti'} con permessi salvati. Si gestiscono dallo scudo ⛉ accanto alla barra degli indirizzi.`),
       el('div',{className:'inline-buttons'},
         confirmButton(`Cancella la cronologia (${s.historyCount})`,'Conferma: cancella la cronologia',()=>settingsAction('clearHistory','Cronologia cancellata.')),
         confirmButton('Cancella cookie e dati dei siti','Conferma: esci da tutti i siti',()=>settingsAction('clearSiteData','Cookie, dati dei siti e cache cancellati. Le pagine aperte sono state ricaricate.'))),
       hint('Cancellare i cookie ti fa uscire da tutti gli account (Google, Discord…).')),
     section('JARVIS',
       hint(s.jarvisEnabled?'Server MCP attivo.':'Server MCP spento: nessun programma può comandare il browser.'),
       projectButtons(['Apri il pannello JARVIS',()=>act('openSidePanel',{panel:'jarvis'})])),
     section('Dati',
       projectButtons(['Esporta…',()=>settingsAction('exportData',r=>'Backup salvato: '+r.file)],
         ['Importa…',()=>settingsAction('importData')],['Apri la cartella dei dati',()=>act('showDataFolder')]),
       hint('Il backup contiene workspace, preferiti, cronologia, giochi, disposizioni, permessi e impostazioni. Non contiene i segreti dei progetti né le password dei siti.')),
     section('Informazioni',
       el('p',{className:'game-meta',textContent:`VARCO ${s.versions.app} · Electron ${s.versions.electron} · Chromium ${s.versions.chrome}`}),
       el('p',{className:s.errors?'panel-error':'game-meta',textContent:s.errors?`${s.errors} ${s.errors===1?'errore registrato':'errori registrati'} in questa sessione.`:'Nessun errore in questa sessione.'}),
       projectButtons(['Copia la diagnostica',()=>settingsAction('copyDiagnostics','Diagnostica copiata negli appunti: incollala dove ti serve.')]),
       hint('Versioni, memoria, impostazioni e ultimi errori. Non contiene token né segreti.'))
   );
   panel.scrollTop=scroll;
 }
 // Crea un pannello realmente visibile sui siti (i siti sono WebContentsView).
 // L'interfaccia del pannello non dipende dall'esistenza della homepage.
 function renderSidePanel(){
   const mode=state.sidePanelOpen;
   $('sidePanel').hidden=!mode;
   if(mode!=='site')renderedSite=null;
   else return renderSite();
   if(mode!=='jarvis')renderedJarvis=null;
   else return renderJarvis();
   if(mode!=='project')renderedProject=null;
   else return renderProject();
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
 const DOWNLOAD_STATES={waiting:'In attesa di conferma',progressing:'In corso',completed:'Completato',cancelled:'Annullato',interrupted:'Interrotto'};
 function renderDownloads(){
 $('downloadDrawer').hidden=!state.downloadsOpen;
 const list=$('downloadList');list.replaceChildren();
 const downloads=state.downloads||[];
 for(const item of downloads){
  const row=document.createElement('div');row.className='download-row';
  const title=document.createElement('div');title.className='download-name';title.textContent=item.name;
  const percent=item.total>0&&item.state!=='completed'?' · '+Math.min(100,Math.round(100*item.received/item.total))+'%':'';
  const desc=document.createElement('div');desc.className='download-state';desc.textContent=(DOWNLOAD_STATES[item.state]||'In corso')+percent;
  row.append(title,desc);
  if(item.error)row.append(el('div',{className:'panel-error',textContent:item.error}));
  if(item.total>0&&['waiting','progressing'].includes(item.state)){const track=document.createElement('progress');track.max=item.total;track.value=item.received;row.appendChild(track);}
  // Azioni: apri e mostra a download finito, annulla mentre è in corso.
  const actions=el('div',{className:'inline-buttons'});
  if(item.state==='completed'){addButton(actions,'Apri',()=>act('downloadOpen',{id:item.id}));addButton(actions,'Mostra nella cartella',()=>act('downloadShow',{id:item.id}));}
  else if(['waiting','progressing'].includes(item.state))addButton(actions,'Annulla',()=>act('downloadCancel',{id:item.id}));
  if(actions.childElementCount)row.append(actions);
  list.appendChild(row);
 }
 if(!list.childElementCount)list.textContent='Nessun download in questa sessione.';
 $('clearDownloads').hidden=!downloads.some(d=>!['waiting','progressing'].includes(d.state));
 // Pallino sul pulsante ↓ mentre qualcosa si sta scaricando.
 $('showDownloads').classList.toggle('busy',downloads.some(d=>['waiting','progressing'].includes(d.state)));
}
$('clearDownloads').onclick=()=>act('downloadsClear');
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
 // Beta 0.12: la scheda interna può essere la Home o le Impostazioni.
 const onSettings=state.internalPage==='settings';
 document.querySelector('.home-content').hidden=onSettings;
 $('settingsPage').hidden=!onSettings;
 if(onSettings)renderSettings();else{renderedSettings=null;settingsUi.status='';}
 // Con più finestre dello stesso workspace: "Destiny Builder · 2".
 $('footerWorkspaceName').textContent=(state.activeWorkspace||'Personale')+(state.pane?' · '+(state.pane+1):'');
 renderLayoutInfo();
 renderOrb();
 renderHomeCards();
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
     toggle.replaceChildren(icon(entry.collapsed?'stack-closed':'stack-open'),entry.group+' ('+entry.count+')');
     toggle.title=entry.collapsed?'Espandi stack':'Comprimi stack';
     toggle.setAttribute('aria-expanded',String(!entry.collapsed));
     toggle.onclick=()=>act('toggleGroup',{group:entry.group});
     group.appendChild(toggle);
     const actions=iconButton(group,'tab-more','Azioni stack',()=>act('tabContextMenu',{id:entry.tabIds[0]}),'stack-actions');
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
   // sleeping: pagina sospesa per risparmiare memoria, si ricarica al clic.
   tab.className='tab'+(t.active?' active':'')+(t.pinned?' pinned':'')+(t.sleeping?' sleeping':'')+
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
   // Icona del sito, oppure un cerchio che gira mentre la pagina carica.
   if(t.loading)tab.append(el('span',{className:'tab-spinner','aria-label':'Caricamento'}));
   else if(t.favicon)tab.append(el('img',{className:'tab-favicon',src:t.favicon,alt:''}));
   const title=document.createElement('span');
   if(t.isHome)title.replaceChildren(icon(t.page==='settings'?'settings-tab':'home-tab'),t.page==='settings'?'Impostazioni':'Home');
   else title.textContent=t.title||t.url;
   title.title=(t.title||t.url)+' — Shift+trascina per creare uno stack';
   title.onclick=()=>act('activateTab',{id:t.id});
   tab.appendChild(title);
   // Il menu contestuale è nativo Windows, anche con una pagina web aperta.
   tab.oncontextmenu=event=>{event.preventDefault();act('tabContextMenu',{id:t.id});};
   const menu=iconButton(tab,'tab-more','Menu scheda',()=>act('tabContextMenu',{id:t.id}),'tab-more');
   menu.title='Menu scheda';
   iconButton(tab,'close','Chiudi scheda',()=>act('closeTab',{id:t.id}),'tab-close');
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
     // Icone predefinite del set VARCO: personale, gaming, progetto (con cartella), altro.
     icon.append(window.icon(workspace.name==='Personale'?'ws-personal':workspace.name==='Gaming'?'ws-gaming':workspace.projectPath?'ws-project':'ws-default'));
   }
   const text=document.createElement('span');text.className='workspace-name';text.textContent=workspace.name;
   const count=document.createElement('span');count.className='workspace-count';count.textContent=String(workspace.count);
   button.append(icon,text,count);
   button.onclick=()=>act('workspace',{name:workspace.name});
   // Click destro: menu nativo con "Apri in una nuova finestra" e "Cambia icona".
   button.oncontextmenu=event=>{event.preventDefault();act('workspaceContextMenu',{name:workspace.name});};
   w.appendChild(button);
 }$('title').textContent=state.activeWorkspace;const current=state.workspaces.find(x=>x.name===state.activeWorkspace);$('folder').textContent=current?.projectPath?'Cartella: '+current.projectPath:'Nessuna cartella locale associata';const res=$('resources');res.replaceChildren();for(const u of current?.resources||[])addButton(res,u,()=>act('resource',{url:u}),'item');if(!current?.resources?.length)res.textContent='Nessuna risorsa salvata.';renderPanel();renderSidePanel();renderDownloads();renderLoadError();const activeTab=state.tabs.find(t=>t.active);
// Sulla Home niente "app://home": la barra invita a cercare.
$('address').placeholder=activeTab&&!activeTab.isHome?activeTab.url:'Cerca o inserisci un indirizzo web';
renderZoom();renderFindForTab();renderSiteButton();renderLoadLine();}
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
$('showGames').onclick=()=>act('toggleSidePanel',{panel:'games'});
$('showProject').onclick=()=>act('toggleSidePanel',{panel:'project'});
$('saveLayout').onclick=()=>act('saveLayout');
$('showJarvis').onclick=()=>act('toggleSidePanel',{panel:'jarvis'});
$('siteButton').onclick=()=>act('toggleSidePanel',{panel:'site'});
$('showSettings').onclick=()=>act('openSettings');
$('applyLayout').onclick=()=>act('applyLayout');
$('openProject').onclick=()=>act('toggleSidePanel',{panel:'project'});window.browserAPI.onState(next=>{state=next;render();});
// Ctrl+L dal processo principale: il focus può essere dentro una pagina web.
window.browserAPI.onUi(message=>{
 if(message?.type==='focusAddress'){closeFind(false);const a=$('address');a.focus();a.select();}
 else if(message?.type==='closeSuggestions')closeSuggestions();
 else if(message?.type==='openFind')openFind();
 else if(message?.type==='palette')showSuggestions(message);
 else if(message?.type==='findResult'){
   const found=$('findCount');
   found.textContent=message.matches?`${message.active} di ${message.matches}`:'Nessun risultato';
   found.classList.toggle('none',!message.matches);
 }
});
// ── Cerca nella pagina (Ctrl+F) e zoom ─────────────────────────────────
let findTab=null;
function openFind(){
 if(state.homeActive)return;
 findTab=state.activeTab;
 $('addressPill').hidden=true;$('findBar').hidden=false;
 const input=$('findInput');input.focus();input.select();
 if(input.value)act('findInPage',{text:input.value,forward:true,findNext:true});
}
function closeFind(stop=true){
 if($('findBar').hidden)return;
 $('findBar').hidden=true;$('addressPill').hidden=false;$('findCount').textContent='';
 if(stop)act('stopFind');
}
// Cambiando scheda la ricerca si chiude: apparteneva alla pagina precedente.
function renderFindForTab(){if(!$('findBar').hidden&&state.activeTab!==findTab)closeFind(false);}
$('findInput').oninput=()=>{
 const text=$('findInput').value;
 if(!text){$('findCount').textContent='';act('stopFind');return;}
 act('findInPage',{text,forward:true,findNext:true}); // nuova ricerca
};
// Risultato successivo/precedente della stessa ricerca (findNext:false, vedi commands.cjs).
const findStep=forward=>{const text=$('findInput').value;if(text)act('findInPage',{text,forward,findNext:false});};
$('findBar').onsubmit=e=>{e.preventDefault();findStep(true);};
$('findPrev').onclick=()=>findStep(false);
$('findClose').onclick=()=>closeFind();
$('findInput').onkeydown=e=>{
 if(e.key==='Escape'){e.preventDefault();closeFind();}
 else if(e.key==='Enter'&&e.shiftKey){e.preventDefault();findStep(false);}
};
function renderZoom(){
 const button=$('zoomLevel');
 button.hidden=!state.zoom||state.zoom===100||state.homeActive;
 button.textContent=state.zoom+'%';
}
$('zoomLevel').onclick=()=>act('zoomReset');

// Disposizione delle finestre sui monitor (Beta 0.8): riepilogo nella Home del workspace.
function renderLayoutInfo(){
 const layout=state.workspaces.find(x=>x.name===state.activeWorkspace)?.layout;
 const info=$('layoutInfo');
 info.hidden=!layout;$('applyLayout').hidden=!layout;
 if(!layout)return;
 const when=new Date(layout.savedAt).toLocaleString('it-IT',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
 info.textContent=`Disposizione salvata: ${layout.windows} ${layout.windows===1?'finestra':'finestre'} su ${layout.monitors} monitor · ${when}`;
}

// ── Barra degli indirizzi con suggerimenti (Beta 0.12) ──────────────────
// Prende il posto della palette della 0.11: scrivendo nella barra compaiono pochi
// suggerimenti (schede, comandi, workspace, preferiti, cronologia). Con ">" all'inizio
// solo i comandi. La palette vera e propria (F1, Ctrl+Shift+P, ⌘) è più sotto.
// Invio senza scegliere nulla fa quello che ha sempre fatto: apre l'indirizzo o la ricerca.
const KIND_LABELS={tab:'Scheda',command:'Comando',workspace:'Workspace',project:'Progetto',game:'Gioco',bookmark:'Preferito',history:'Cronologia',web:''};
const COMMAND_KINDS=new Set(['command','project','workspace','game']);
const MAX_SUGGESTIONS=8;
let suggestItems=[],suggestShown=[],suggestIndex=0,suggestOpen=false,suggestRequested=false;
/** Foto della pagina al posto della pagina vera (che il processo principale ha nascosto). */
function setBackdrop(message,blur){
 const img=$('paletteBackdrop'),b=message.bounds;
 if(!message.keepBackdrop){
   img.hidden=!(message.backdrop&&b);
   if(!img.hidden){img.src=message.backdrop;Object.assign(img.style,{left:b.x+'px',top:b.y+'px',width:b.width+'px',height:b.height+'px'});}
 }
 img.classList.toggle('blur',blur);
}
function showSuggestions(message){
 if(message.mode==='palette'){openFloatingPalette(message);return;}
 const input=$('address');
 suggestItems=message.items||[];suggestRequested=false;
 setBackdrop(message,false);
 suggestOpen=true;
 closeFind(false);
 if(message.mode==='commands'&&!input.value.startsWith('>'))input.value='>';
 // Hai cancellato tutto mentre i suggerimenti arrivavano: niente da mostrare.
 if(!input.value.trim()){closeSuggestions();return;}
 input.focus();
 const r=$('nav').getBoundingClientRect();
 Object.assign($('suggest').style,{left:r.left+'px',width:r.width+'px',top:(r.bottom+4)+'px'});
 renderSuggestions();
}
function closeSuggestions(){
 suggestRequested=false;
 if(!suggestOpen)return Promise.resolve();
 suggestOpen=false;
 $('suggest').hidden=true;
 const img=$('paletteBackdrop');img.hidden=true;img.removeAttribute('src');
 return act('closePalette');
}
/** Il testo scritto, come indirizzo o ricerca: è la scelta predefinita di Invio. */
function webItem(q){
 const address=/^https?:\/\//i.test(q)||/^localhost\b/i.test(q)||/^[^\s/]+\.[a-z]{2,}(?::\d+)?(?:[/?#]\S*)?$/i.test(q);
 return {kind:'web',label:address?q:`Cerca «${q}»`,detail:address?'Apri l’indirizzo':'Ricerca sul web',run:{command:'navigate',args:{url:q}}};
}
function renderSuggestions(){
 if(!suggestOpen)return;
 const raw=$('address').value,commandsOnly=raw.startsWith('>');
 const q=(commandsOnly?raw.slice(1):raw).trim();
 if(!raw.trim()){closeSuggestions();return;}
 if(commandsOnly){
   const pool=suggestItems.filter(i=>COMMAND_KINDS.has(i.kind));
   suggestShown=q?window.paletteRules.filterItems(pool,q,30):pool.filter(i=>i.kind==='command');
 }else suggestShown=[webItem(q),...window.paletteRules.filterItems(suggestItems,q,MAX_SUGGESTIONS-1)];
 suggestIndex=0;
 const list=$('suggest');list.replaceChildren();
 suggestShown.forEach((item,index)=>{
   const icon=item.favicon?el('img',{className:'palette-icon',src:item.favicon,alt:''}):
     el('span',{className:'palette-icon glyph',textContent:item.kind==='web'?'⌕':item.kind==='command'?'›':''});
   const text=el('span',{className:'palette-text'},el('span',{className:'palette-label',textContent:item.label}),
     ...(item.detail?[el('span',{className:'palette-detail',textContent:item.detail})]:[]));
   const row=el('div',{className:'palette-row',role:'option'},icon,text,
     ...(item.keys?[el('kbd',{textContent:item.keys})]:[]),
     ...(KIND_LABELS[item.kind]?[el('span',{className:'palette-kind kind-'+item.kind,textContent:KIND_LABELS[item.kind]})]:[]));
   row.onmousedown=e=>e.preventDefault(); // la barra non perde il focus
   row.onmousemove=()=>{if(suggestIndex!==index){suggestIndex=index;highlightSuggestion(false);}};
   row.onclick=()=>runSuggestion(item);
   list.append(row);
 });
 if(!suggestShown.length)list.append(el('p',{className:'panel-hint',textContent:'Nessun comando trovato.'}));
 list.hidden=false;
 highlightSuggestion(true);
}
function highlightSuggestion(scroll){
 const rows=$('suggest').querySelectorAll('.palette-row');
 rows.forEach((row,i)=>row.classList.toggle('selected',i===suggestIndex));
 if(scroll)rows[suggestIndex]?.scrollIntoView({block:'nearest'});
}
async function runSuggestion(item){
 if(!item)return;
 const input=$('address');
 await closeSuggestions();
 input.value='';input.blur();
 act(item.run.command,item.run.args||{});
}
$('address').addEventListener('input',()=>{
 if(!$('address').value.trim()){closeSuggestions();return;}
 if(suggestOpen)renderSuggestions();
 else if(!suggestRequested){suggestRequested=true;act('openPalette',{mode:'address'});}
});
$('address').addEventListener('keydown',e=>{
 if(!suggestOpen){if(e.key==='Escape'){$('address').value='';$('address').blur();}return;}
 const move=step=>{e.preventDefault();if(!suggestShown.length)return;suggestIndex=(suggestIndex+step+suggestShown.length)%suggestShown.length;highlightSuggestion(true);};
 if(e.key==='ArrowDown')move(1);
 else if(e.key==='ArrowUp')move(-1);
 else if(e.key==='Enter'){e.preventDefault();runSuggestion(suggestShown[suggestIndex]);}
 else if(e.key==='Escape'){e.preventDefault();$('address').value='';closeSuggestions();$('address').blur();}
});
// Clic altrove: i suggerimenti si chiudono (il testo resta nella barra).
$('address').addEventListener('blur',()=>setTimeout(()=>{if(document.activeElement!==$('address'))closeSuggestions();},120));
$('paletteBackdrop').onmousedown=()=>{closeSuggestions();$('address').blur();};
$('paletteButton').onclick=()=>act('openPalette');

// ── Palette fluttuante (Beta 0.12.1) ────────────────────────────────────
// Una sola barra di ricerca al centro della finestra, sopra la pagina sfocata.
// Vuota non mostra niente; scrivendo compaiono al massimo 6 risultati.
const MAX_PALETTE=6;
let paletteItems=[],paletteShown=[],paletteIndex=0;
function openFloatingPalette(message){
 paletteItems=message.items||[];
 // F1 mentre i suggerimenti della barra erano aperti: la pagina è già nascosta, cambiamo solo vista.
 suggestOpen=false;suggestRequested=false;$('suggest').hidden=true;
 closeFind(false);
 setBackdrop(message,true);
 $('palette').hidden=false;
 const input=$('paletteInput');input.value='';
 renderPalette();
 input.focus();
}
function closeFloatingPalette(){
 if($('palette').hidden)return Promise.resolve();
 $('palette').hidden=true;
 const img=$('paletteBackdrop');img.hidden=true;img.removeAttribute('src');
 return act('closePalette');
}
function renderPalette(){
 const q=$('paletteInput').value.trim();
 const list=$('paletteList');list.replaceChildren();
 paletteShown=q?window.paletteRules.filterItems(paletteItems,q,MAX_PALETTE):[];
 if(q){const web=webItem(q);web.run={command:'newTab',args:{url:q}};web.detail=web.detail+' · nuova scheda';
   if(/^Cerca/.test(web.label)&&paletteShown.length)paletteShown.push(web);else paletteShown.unshift(web);}
 paletteIndex=0;
 paletteShown.forEach((item,index)=>{
   const icon=item.favicon?el('img',{className:'palette-icon',src:item.favicon,alt:''}):
     el('span',{className:'palette-icon glyph',textContent:item.kind==='web'?'⌕':item.kind==='command'?'›':''});
   const text=el('span',{className:'palette-text'},el('span',{className:'palette-label',textContent:item.label}),
     ...(item.detail?[el('span',{className:'palette-detail',textContent:item.detail})]:[]));
   const row=el('div',{className:'palette-row',role:'option'},icon,text,
     ...(item.keys?[el('kbd',{textContent:item.keys})]:[]),
     ...(KIND_LABELS[item.kind]?[el('span',{className:'palette-kind kind-'+item.kind,textContent:KIND_LABELS[item.kind]})]:[]));
   row.onmousemove=()=>{if(paletteIndex!==index){paletteIndex=index;highlightPalette();}};
   row.onclick=()=>runPaletteItem(item);
   list.append(row);
 });
 list.hidden=!paletteShown.length;
 highlightPalette();
}
function highlightPalette(){
 const rows=$('paletteList').children;
 for(let i=0;i<rows.length;i++)rows[i].classList.toggle('selected',i===paletteIndex);
}
async function runPaletteItem(item){
 if(!item)return;
 await closeFloatingPalette();
 act(item.run.command,item.run.args||{});
}
$('paletteInput').oninput=renderPalette;
$('paletteInput').onkeydown=e=>{
 const move=step=>{e.preventDefault();if(!paletteShown.length)return;paletteIndex=(paletteIndex+step+paletteShown.length)%paletteShown.length;highlightPalette();};
 if(e.key==='ArrowDown')move(1);
 else if(e.key==='ArrowUp')move(-1);
 else if(e.key==='Enter'){e.preventDefault();runPaletteItem(paletteShown[paletteIndex]);}
 else if(e.key==='Escape'){e.preventDefault();closeFloatingPalette();}
};
// Clic fuori dalla barra: chiude.
$('palette').onmousedown=e=>{if(!e.target.closest('.palette-float'))closeFloatingPalette();};

// ── Pagina di errore (Beta 0.11.1) ──────────────────────────────────────
// Prima era un avviso sopra la pagina, ma le pagine stanno sopra la cornice e lo coprivano.
// Ora la pagina si nasconde e la cornice disegna l'errore nel suo spazio.
function renderLoadError(){
 const e=state.loadError;
 document.body.dataset.downloadsOpen=state.downloadsOpen?'true':'false';
 $('loadError').hidden=!e||state.homeActive;
 if(!e)return;
 $('loadErrorTitle').textContent=e.title;
 $('loadErrorDetail').textContent=e.detail;
 $('loadErrorUrl').textContent=e.url||'';
 $('loadErrorCode').textContent=e.description?`${e.description}${e.code?` (${e.code})`:''}`:'';
 const http=$('loadErrorHttp');http.hidden=!e.httpUrl;
 if(e.httpUrl)http.textContent='Prova con http://';
 $('loadErrorProject').hidden=!e.local;
}
$('loadErrorRetry').onclick=()=>act('reload');
$('loadErrorHttp').onclick=()=>{if(state.loadError?.httpUrl)act('navigate',{url:state.loadError.httpUrl});};
$('loadErrorProject').onclick=()=>act('openSidePanel',{panel:'project'});

// ── Linea di caricamento sotto la barra degli indirizzi (Beta 0.14) ──────
// Electron non dà la percentuale: la linea avanza fino all'85% mentre la pagina carica,
// si completa e sfuma quando ha finito, diventa rossa se il caricamento fallisce.
let lineTab=null,lineState='idle';
function renderLoadLine(){
 const t=state.tabs.find(x=>x.active),line=$('loadLine');
 const next=state.loadError?'error':t?.loading&&!t.isHome?'loading':'idle';
 const restart=cls=>{line.className='';void line.offsetWidth;line.className=cls;};
 if(t?.id!==lineTab){lineTab=t?.id;lineState=next;restart(next==='loading'?'loading':'');return;}
 if(next===lineState)return;
 if(next==='loading')restart('loading');
 else if(next==='error'){line.className='error';setTimeout(()=>line.classList.add('fade'),30);}
 else if(lineState==='loading')line.className='done';
 lineState=next;
}
