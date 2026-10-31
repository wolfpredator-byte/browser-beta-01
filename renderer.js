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
     command:'addResource',field:'url'},
   // Beta 0.17: rinomina (il workspace scelto arriva dal processo principale come renameTarget).
   renameWorkspace:{title:()=>`Rinomina «${state.renameTarget||''}»`,label:'Nuovo nome',placeholder:'Es. Destiny Builder',
     max:40,submit:'Rinomina',command:'renameWorkspace',initial:()=>state.renameTarget||'',
     args:value=>({name:state.renameTarget||'',newName:value}),key:()=>state.renameTarget}
 };
 // Lo stato arriva più volte al secondo (titoli, caricamenti): il modulo
 // si ricostruisce solo quando cambia, altrimenti perderesti quello che stai scrivendo.
 let renderedForm=null;
 function renderForm(mode){
   const def=FORMS[mode];
   $('sidePanelTitle').textContent=def.title();
   const formKey=mode+'|'+(def.key?.()||'');
   if(renderedForm===formKey)return;
   renderedForm=formKey;
   const list=$('sidePanelItems');list.replaceChildren();
   const form=document.createElement('form');form.className='panel-form';
   const label=document.createElement('label');label.textContent=def.label;label.htmlFor='panelInput';
   const input=document.createElement('input');input.id='panelInput';input.maxLength=def.max;
   input.placeholder=def.placeholder;input.autocomplete='off';
   if(def.initial){input.value=def.initial();setTimeout(()=>input.select());}
   const error=document.createElement('p');error.className='panel-error';error.setAttribute('role','alert');
   const submit=document.createElement('button');submit.type='submit';submit.textContent=def.submit;
   const hint=document.createElement('p');hint.className='panel-hint';hint.textContent='Invio per confermare · Esc per annullare';
   const close=()=>act('toggleSidePanel',{panel:mode});
   input.onkeydown=event=>{if(event.key==='Escape')close();};
   input.oninput=()=>{error.textContent='';};
   form.onsubmit=async event=>{
     event.preventDefault();
     error.textContent='';submit.disabled=true;
     const response=await act(def.command,def.args?def.args(input.value):{[def.field]:input.value});
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
 // ── Giochi e programmi installati (Beta 0.23) ───────────────────────────
 // Elenco trovato sul PC (Steam, Epic, menu Start, cartelle tue) con ricerca: niente più percorsi a memoria.
 // Lo stato sta fuori dal riquadro, così sopravvive quando il pannello si ricostruisce.
 const pickerUi={games:{query:'',items:null,folders:[],pending:null,error:''},apps:{query:'',items:null,folders:[],pending:null,error:'',open:false}};
 function appPicker(kind,onPick){
   const ui=pickerUi[kind];
   const list=el('div',{className:'app-picker-list'});
   const folders=el('div',{className:'app-picker-folders'});
   const search=el('input',{type:'text',value:ui.query,placeholder:kind==='games'?'Cerca un gioco…':'Cerca un programma…',autocomplete:'off',spellcheck:false});
   const load=refresh=>{
     ui.pending=act('scanApps',{kind,refresh}).then(r=>{ui.items=r?.result?.items||[];ui.folders=r?.result?.folders||[];ui.pending=null;});
     draw();ui.pending.then(draw);
   };
   const button=(label,fn,title='')=>{const b=el('button',{type:'button',textContent:label,title});b.onclick=fn;return b;};
   function draw(){
     const q=ui.query.trim().toLowerCase();
     const items=(ui.items||[]).filter(i=>!q||i.name.toLowerCase().includes(q)||i.path.toLowerCase().includes(q));
     list.replaceChildren(...(ui.pending?[el('p',{className:'panel-hint',textContent:'Cerco sul PC…'})]:
       items.length?items.slice(0,200).map(item=>{
         const b=el('button',{type:'button',className:'app-picker-item',title:item.path},
           el('span',{className:'app-name',textContent:item.name}),el('span',{className:'app-source',textContent:item.source}));
         b.onclick=()=>onPick(item);return b;
       }):[el('p',{className:'panel-hint',textContent:q?'Nessun risultato.':'Non ho trovato niente: aggiungi una cartella qui sotto.'})]));
     folders.replaceChildren(
       el('span',{className:'panel-hint',textContent:kind==='games'?'Steam ed Epic Games li trovo da solo. Altre cartelle:':'Il menu Start lo leggo da solo. Altre cartelle:'}),
       ...ui.folders.map(dir=>el('span',{className:'folder-chip',title:dir},el('span',{textContent:dir}),
         button('×',async()=>{await act('removeScanFolder',{path:dir});load(true);},'Togli la cartella'))),
       button('＋ Cartella…',async()=>{
         const r=await act('addScanFolder');
         ui.error=r?.result?.ok===false?r.result.error:'';
         if(r?.result?.ok&&!r.result.cancelled)load(true);else draw();
       }),
       button('Aggiorna',()=>load(true),'Cerca di nuovo'),
       ...(ui.error?[el('p',{className:'panel-error',textContent:ui.error})]:[]));
   }
   search.oninput=()=>{ui.query=search.value;draw();};
   if(ui.items===null&&!ui.pending)load(false);
   else{draw();ui.pending?.then(draw);}
   return el('div',{className:'app-picker'},search,list,folders);
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
   // Beta 0.23: scegli dai giochi installati; il nome si compila da solo se è vuoto.
   let picker=null;
   addButton(exeTools,'Giochi installati…',()=>{
     if(picker){picker.remove();picker=null;return;}
     picker=appPicker('games',item=>{
       exe.value=item.path.split(/[\\/]/).pop();
       if(!name.value.trim())name.value=item.name;
       picker.remove();picker=null;
     });
     exeTools.after(picker);
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
   const key=JSON.stringify([p,state.workenv,[...projectUi.openLogs],projectUi.editingSecret]);
   if(key===renderedProject)return;
   renderedProject=key;
   // Conserviamo lo scorrimento del pannello e dei log tra una ricostruzione e l'altra.
   const panel=$('sidePanel'),scroll=panel.scrollTop;
   const logScroll={};
   for(const pre of list.querySelectorAll('pre.log'))logScroll[pre.dataset.index]={top:pre.scrollTop,atEnd:pre.scrollTop+pre.clientHeight>=pre.scrollHeight-4};
   list.replaceChildren();
   const error=el('p',{className:'panel-error',role:'alert'});
   list.append(workEnvSection());
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

 // ── Ambiente di lavoro (Beta 0.19) ───────────────────────────────────────
 // Programmi da avviare per lavorare al progetto: il companion dei giochi al contrario.
 let workSuggestions=null;
 function workEnvSection(){
   const env=state.workenv||{programs:[],autoStart:false};
   const box=section('Ambiente di lavoro');
   if(!env.programs.length)box.append(el('p',{className:'panel-hint',textContent:'Scegli i programmi che usi per questo progetto (VS Code, Visual Studio, Unity…): partono con un clic, o da soli quando apri il workspace.'}));
   env.programs.forEach(p=>{
     const row=el('div',{className:'work-row'+(p.missing?' missing':'')},
       el('div',{className:'command-name',textContent:p.name}),
       el('div',{className:'game-meta',textContent:p.missing?'File non trovato: '+p.path:p.path,title:p.path}));
     if(env.hasFolder)row.append(checkRow('Apri la cartella del progetto',p.openFolder,enabled=>act('workSetOpenFolder',{index:p.index,enabled})));
     row.append(projectButtons(['Togli',()=>act('workRemoveProgram',{index:p.index})]));
     box.append(row);
   });
   const error=el('p',{className:'panel-error',role:'alert'});
   box.append(projectButtons(
     ...(env.programs.length?[['▶ Inizia a lavorare',()=>runAndReport('workStart',{},error),'primary']]:[]),
     ['＋ Programma…',()=>runAndReport('workChooseProgram',{},error)],
     // Beta 0.23: dai programmi installati, con ricerca.
     [pickerUi.apps.open?'Chiudi l’elenco':'＋ Dai programmi installati…',()=>{pickerUi.apps.open=!pickerUi.apps.open;renderedProject=null;renderProject();}]),error);
   if(pickerUi.apps.open)box.append(appPicker('apps',async item=>{
     pickerUi.apps.open=false;
     const file=item.path.split(/[\\/]/).pop();
     await runAndReport('workAddSuggested',{path:item.path,name:item.name,openFolder:/code|cursor|devenv|rider|idea/i.test(file)},error);
     renderedProject=null;renderProject();
   }));
   // Programmi noti trovati su questo PC, non ancora aggiunti.
   const known=(workSuggestions||[]).filter(s=>!env.programs.some(p=>p.path.toLowerCase()===s.path.toLowerCase()));
   if(known.length)box.append(el('div',{className:'inline-buttons suggest-row'},el('span',{className:'panel-hint',textContent:'Trovati sul PC:'}),
     ...known.map(s=>{const b=el('button',{textContent:'＋ '+s.name,title:s.path});b.onclick=()=>act('workAddSuggested',{path:s.path,name:s.name,openFolder:s.openFolder});return b;})));
   if(workSuggestions===null){workSuggestions=[];act('workSuggestions').then(r=>{workSuggestions=r?.result||[];renderedProject=null;renderProject();});}
   if(env.programs.length)box.append(checkRow('Avvia da solo quando apro il workspace',env.autoStart,enabled=>act('workSetAutoStart',{enabled})));
   return box;
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
 async function settingsAction(command,okText,args){
   const response=await act(command,args);
   const r=response?.result;
   if(!response?.ok)settingsStatus(response?.error||'Operazione non riuscita',true);
   else if(r?.cancelled)return;
   else if(r?.ok===false)settingsStatus(r.error||'Operazione non riuscita',true);
   else if(okText)settingsStatus(typeof okText==='function'?okText(r):okText);
 }
 // Aggiornamenti (Beta 0.23): stato, controllo manuale e "Riavvia e aggiorna".
 // Password (Beta 0.25): elenco con ricerca, mostra/copia/elimina, siti esclusi, importazione.
 // Una password mostrata resta visibile 30 secondi, e mai dopo che esci dalle Impostazioni.
 const pwUi={query:'',shown:{}};
 function passwordSection(hint){
   const p=state.passwords;
   if(!p)return el('span');
   if(!p.available)return section('Password',hint('La cifratura di Windows non è disponibile: VARCO non salva password su questo PC.'));
   const search=el('input',{type:'text',className:'tab-search',placeholder:'Cerca sito o nome utente…',value:pwUi.query,autocomplete:'off',spellcheck:false});
   const box=el('div',{className:'pw-list'});
   const button=(label,fn,cls='')=>{const b=el('button',{type:'button',textContent:label,className:cls});b.onclick=fn;return b;};
   const draw=()=>{
     const q=pwUi.query.trim().toLowerCase();
     const shown=p.entries.filter(e=>!q||e.host.toLowerCase().includes(q)||e.username.toLowerCase().includes(q));
     box.replaceChildren(...shown.map(e=>{
       const secret=pwUi.shown[e.id];
       const remove=confirmButton('Elimina','Conferma',()=>settingsAction('passwordDelete',`Password di ${e.host} eliminata.`,{id:e.id}));
       return el('div',{className:'pw-row'},
         el('div',{className:'pw-site'},el('span',{className:'pw-host',textContent:e.host,title:e.origin}),el('span',{className:'pw-user',textContent:e.username||'(senza nome utente)'})),
         el('code',{className:'pw-secret',textContent:secret??'••••••••'}),
         el('span',{className:'inline-buttons'},
           button(secret?'Nascondi':'Mostra',async()=>{
             if(secret){delete pwUi.shown[e.id];draw();return;}
             const r=await act('passwordReveal',{id:e.id});
             if(r?.result?.ok){pwUi.shown[e.id]=r.result.password;draw();setTimeout(()=>{delete pwUi.shown[e.id];draw();},30000);}
           }),
           button('Copia',()=>settingsAction('passwordCopy','Copiata: resta negli appunti 30 secondi.',{id:e.id})),remove));
     }));
     if(!shown.length)box.append(hint(q?'Nessuna password trovata.':'Ancora nessuna password: VARCO te le propone dopo un accesso.'));
   };
   search.oninput=()=>{pwUi.query=search.value;draw();};
   draw();
   return section('Password',
     checkRow('Proponi di salvare le password dopo un accesso',p.enabled,enabled=>act('setPasswordSaving',{enabled})),
     ...(p.entries.length?[el('p',{className:'game-meta',textContent:`${p.entries.length} ${p.entries.length===1?'password salvata':'password salvate'}`}),search]:[]),
     box,
     ...(p.never.length?[el('p',{className:'settings-sub',textContent:'Mai salvare per'}),
       el('div',{className:'tab-tools'},...p.never.map(n=>el('span',{className:'folder-chip',title:n.origin},el('span',{textContent:n.host}),
         button('×',()=>act('passwordNeverRemove',{origin:n.origin})))))]:[]),
     projectButtons(['Importa da Chrome, Edge o Firefox (CSV)…',()=>settingsAction('passwordImport',
       r=>`Importate ${r.added} nuove e ${r.updated} aggiornate${r.skipped?` (${r.skipped} righe saltate)`:''}.`)]),
     hint('Cifrate con la protezione dati di Windows: solo il tuo account può leggerle. Le pagine ricevono una password solo quando scegli un account dall’elenco sotto il campo. Per esportare da Chrome: Impostazioni → Password → Esporta password.'));
 }
 // Estensioni Chrome (Beta 0.26): si aggiungono dal Chrome Web Store, qui si gestiscono.
 function extensionSection(hint){
   const x=state.extensions;
   if(!x)return el('span');
   const rows=x.list.map(e=>el('div',{className:'pw-row'},
     el('div',{className:'pw-site'},el('span',{className:'pw-host',textContent:`${e.name} ${e.version}`}),
       el('span',{className:'pw-user',textContent:e.description||e.id,title:e.id})),
     el('span',{className:'inline-buttons'},
       ...(e.options?[addButton(el('span'),'Impostazioni',()=>act('extensionOptions',{id:e.id}))]:[]),
       confirmButton('Rimuovi','Conferma',()=>settingsAction('extensionRemove',`«${e.name}» rimossa.`,{id:e.id})))));
   return section('Estensioni',
     ...(x.list.length?rows:[hint('Nessuna estensione. Aprile dal Chrome Web Store: il pulsante «Aggiungi» funziona anche in VARCO.')]),
     projectButtons(['Apri il Chrome Web Store',()=>act('openWebStore'),'primary']),
     hint('Le icone delle estensioni compaiono accanto alla barra degli indirizzi; un clic apre il loro menu. Funzionano quasi tutte le estensioni comuni (blocchi, temi scuri, gestori di password, traduttori); quelle che usano funzioni rare di Chrome possono funzionare solo in parte. VARCO chiede sempre prima di installare.'));
 }
 function updateSection(row,hint){
   const u=state.update;
   if(!u)return el('span');
   const when=u.checkedAt?' · controllato '+timeAgo(u.checkedAt):'';
   const text={idle:`VARCO ${u.current}`,checking:'Controllo…',latest:`VARCO ${u.current} è l’ultima versione${when}`,
     downloading:`Scarico VARCO ${u.version}… ${u.percent}%`,ready:`VARCO ${u.version} è pronto da installare`,
     installing:`Preparo l’installazione di VARCO ${u.version}: VARCO si chiude da solo fra poco`,
     error:`Controllo non riuscito: ${u.error}`}[u.state]||'';
   if(!u.supported)return section('Aggiornamenti',hint(`VARCO ${u.current}. Gli aggiornamenti automatici funzionano con VARCO installato, non avviato da npm start.`));
   return section('Aggiornamenti',
     el('p',{className:u.state==='error'?'panel-error':'game-meta',textContent:text}),
     ...(u.state==='ready'&&u.notes?[el('pre',{className:'update-notes',textContent:u.notes})]:[]),
     projectButtons(...(u.state==='ready'?[['Riavvia e aggiorna',()=>act('installUpdate'),'primary']]:[]),
       ...(['checking','downloading','installing'].includes(u.state)?[]:[['Controlla ora',()=>settingsAction('checkUpdates')]]),
       ...(u.page?[['Novità della versione',()=>act('navigate',{url:u.page})]]:[])),
     checkRow('Controlla e scarica da solo gli aggiornamenti',u.auto,enabled=>act('setAutoUpdate',{enabled})),
     hint('VARCO guarda le versioni pubblicate su GitHub all’avvio e ogni 6 ore. Si installa solo quando premi «Riavvia e aggiorna»: schede e dati restano.'));
 }
 function renderSettings(){
   const s=state.settings;
   const list=$('settingsBody');
   if(list.contains(document.activeElement)&&document.activeElement.matches('select,input[type=range],input[type=color],input[type=text]'))return;
   const key=JSON.stringify([s,settingsUi,state.appearanceSettings,state.update,state.passwords,state.extensions]);
   if(key===renderedSettings)return;
   renderedSettings=key;
   const panel=$('settingsPage'),scroll=panel.scrollTop;
   list.replaceChildren();
   if(!s)return;
   const row=(label,control)=>el('label',{className:'permission-row'},el('span',{textContent:label}),control);
   const hint=text=>el('p',{className:'panel-hint',textContent:text});
   if(settingsUi.status)list.append(el('p',{className:settingsUi.statusError?'panel-error':'settings-status',role:'status',textContent:settingsUi.status}));
   list.append(
     ...appearanceSections(),
     section('Ricerca',
       row('Motore di ricerca',selectBox(s.engines.map(e=>[e.id,e.label]),s.searchEngine,engine=>act('setSearchEngine',{engine}))),
       hint('Per le frasi scritte nella barra degli indirizzi e nella Home. Le ricerche rapide dei progetti non cambiano.')),
     updateSection(row,hint),
     passwordSection(hint),
     extensionSection(hint),
     section('Browser e file',
       projectButtons(['Apri le App predefinite di Windows',()=>act('openDefaultApps')]),
       hint('VARCO compare in "Apri con" per i file che sa mostrare (PDF, immagini, video, codice, modelli 3D…). Per aprirli sempre con VARCO, o per usarlo come browser, sceglilo lì per ogni tipo.')),
     section('Avvio e background',
       checkRow('Resta nell’area di notifica quando chiudo le finestre',s.runInBackground,enabled=>act('setRunInBackground',{enabled})),
       checkRow('Avvia con Windows (solo l’icona, nessuna finestra)',s.openAtLogin,enabled=>act('setOpenAtLogin',{enabled})),
       checkRow('Rileva l’avvio dei giochi',s.gameWatcher,enabled=>act('setGameWatcher',{enabled}))),
     section('Schede',
       row('Sospendi le schede non guardate',selectBox(SLEEP_LABELS,s.sleepAfterMinutes,v=>act('setSleepMinutes',{minutes:Number(v)}))),
       checkRow('Animazione a scorrimento quando cambi scheda',s.tabAnimations,enabled=>act('setTabAnimations',{enabled})),
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
   decorateSettings();
 }
 // Beta 0.27: indice delle sezioni (un clic ci porta) e ricerca dentro le Impostazioni.
 function decorateSettings(){
   const sections=[...$('settingsBody').children].filter(n=>n.matches('section'));
   $('settingsIndex').replaceChildren(...sections.map(sec=>{
     const chip=el('button',{type:'button',className:'settings-chip',textContent:sec.querySelector('h4')?.textContent||''});
     chip.onclick=()=>{
       $('settingsSearch').value='';filterSettings();
       sec.scrollIntoView({behavior:document.body.dataset.motion==='off'?'auto':'smooth',block:'start'});
       sec.classList.remove('flash');void sec.offsetWidth;sec.classList.add('flash');
     };
     return chip;
   }));
   filterSettings();
 }
 function filterSettings(){
   const q=$('settingsSearch').value.trim().toLowerCase();
   const sections=[...$('settingsBody').children].filter(n=>n.matches('section'));
   const chips=[...$('settingsIndex').children];
   let shown=0;
   sections.forEach((sec,i)=>{
     const match=!q||sec.innerText.toLowerCase().includes(q);
     sec.hidden=!match;if(chips[i])chips[i].hidden=!match;
     if(match)shown++;
   });
   $('settingsEmpty').hidden=!q||shown>0;
 }
 $('settingsSearch').oninput=filterSettings;
 $('settingsSearch').onkeydown=e=>{if(e.key==='Escape'){$('settingsSearch').value='';filterSettings();}};
 // ── Personalizzazione (Beta 0.21) ─────────────────────────────────────────
 // Il processo principale manda le variabili CSS già calcolate (tema, sfondo, testo, angoli):
 // qui le applichiamo e nascondiamo i pulsanti e i riquadri della Home che hai tolto.
 let appliedAppearance=null,renderedLinks=null;
 const HOME_CARD_NODES={hero:()=>[document.querySelector('.hero'),document.querySelector('.wordmark'),document.querySelector('.motto')],
   search:()=>[$('homeSearch')],links:()=>[$('linksCard')],projects:()=>[$('homeProjects').closest('.card')],
   quick:()=>[$('homeQuick').closest('.card')],jarvis:()=>[document.querySelector('.jarvis-card')],workspace:()=>[document.querySelector('.workspace-panel')]};
 function applyAppearance(){
   const a=state.appearance;
   if(!a)return;
   document.body.dataset.motion=a.motion||'auto'; // Beta 0.27: Impostazioni → Animazioni
   const key=JSON.stringify([a.vars,a.hidden,a.density,a.home,a.logo]);
   if(key!==appliedAppearance){
     // Beta 0.27: cambiando tema o workspace i colori sfumano e lo sfondo nuovo entra in dissolvenza.
     const wallChanged=appliedAppearance!==null&&document.documentElement.style.getPropertyValue('--v-wallpaper')!==a.vars['--v-wallpaper'];
     if(appliedAppearance!==null){
       document.body.classList.add('theming');
       clearTimeout(themingTimer);themingTimer=setTimeout(()=>document.body.classList.remove('theming'),520);
     }
     if(wallChanged){document.body.classList.remove('wall-in');void document.body.offsetWidth;document.body.classList.add('wall-in');}
     appliedAppearance=key;
     for(const [name,value] of Object.entries(a.vars))document.documentElement.style.setProperty(name,value);
     // Beta 0.22: logo del preset nella Home e nella barra del titolo.
     if($('heroLogo').getAttribute('src')!==a.logo)$('heroLogo').src=a.logo;
     $('titlebarLogo').classList.toggle('themed',a.themedLogo);
     document.body.dataset.density=a.density;
     for(const node of document.querySelectorAll('.user-hidden'))node.classList.remove('user-hidden');
     for(const id of a.hidden)$(id)?.classList.add('user-hidden');
     for(const [card,nodes] of Object.entries(HOME_CARD_NODES))if(a.home[card]===false)for(const node of nodes())node?.classList.add('user-hidden');
     const cards=document.querySelector('.home-cards');
     cards.classList.toggle('user-hidden',[...cards.children].every(c=>c.classList.contains('user-hidden')));
     // I riquadri rimasti si allargano a tutta la riga (i link rapidi ne hanno una tutta loro).
     const visible=[...cards.children].filter(c=>c.id!=='linksCard'&&!c.classList.contains('user-hidden')).length;
     cards.style.setProperty('--home-cols',String(Math.max(1,visible)));
   }
   renderHomeLinks();
 }
 // Link rapidi: i siti che usi in questo workspace, sempre a un clic dalla Home.
 function renderHomeLinks(){
   const links=state.appearance?.homeLinks||[];
   const key=JSON.stringify([state.activeWorkspace,links]);
   if(key===renderedLinks)return;
   renderedLinks=key;
   const box=$('homeLinks');
   const grid=el('div',{className:'home-links'});
   links.forEach((link,index)=>{
     const button=el('button',{className:'home-link',title:link.url},
       el('span',{className:'link-letter',textContent:(link.title[0]||'?').toUpperCase()}),el('span',{textContent:link.title}));
     const remove=el('span',{className:'link-remove',textContent:'×',title:'Togli dalla Home',role:'button'});
     remove.onclick=e=>{e.stopPropagation();act('removeHomeLink',{index});};
     button.append(remove);
     button.onclick=()=>act('navigate',{url:link.url});
     grid.append(button);
   });
   const input=el('input',{placeholder:'Aggiungi un sito (es. github.com)',maxLength:2000,autocomplete:'off',spellcheck:false});
   const error=el('p',{className:'panel-error',hidden:true});
   const form=el('form',{className:'link-form'},input,el('button',{type:'submit',textContent:'Aggiungi'}));
   form.onsubmit=async e=>{
     e.preventDefault();
     if(!input.value.trim())return;
     const r=await act('addHomeLink',{url:input.value});
     if(r?.result?.ok===false){error.textContent=r.result.error;error.hidden=false;}
   };
   box.replaceChildren(...(links.length?[grid]:[el('p',{className:'muted',textContent:'I siti che usi in questo workspace, a un clic dalla Home.'})]),form,error);
 }
 // Cursore: anteprima mentre trascini (con una piccola pausa, per non salvare a ogni pixel).
 function rangeRow(label,key,value,[min,max],format){
   const input=el('input',{type:'range',min,max,step:1,value});
   const out=el('output',{textContent:format(value)});
   let timer=null;
   input.oninput=()=>{out.textContent=format(Number(input.value));clearTimeout(timer);timer=setTimeout(()=>act('setAppearanceValue',{key,value:Number(input.value)}),90);};
   input.onchange=()=>{clearTimeout(timer);act('setAppearanceValue',{key,value:Number(input.value)});input.blur();};
   return el('label',{className:'range-row'},el('span',{textContent:label}),input,out);
 }
 function appearanceSections(){
   const a=state.appearanceSettings;
   if(!a)return [];
   const hint=text=>el('p',{className:'panel-hint',textContent:text});
   const sub=text=>el('p',{className:'settings-sub',textContent:text});
   // Preset pronti (Beta 0.22): miniatura dello sfondo, logo e i due colori.
   const custom=!!(a.accent||a.accent2);
   const presetGrid=el('div',{className:'preset-grid'});
   for(const t of a.themes.filter(t=>t.group==='preset')){
     const card=el('button',{className:'preset-card'+(a.theme===t.id&&!custom?' chosen':''),title:t.label},
       el('img',{src:t.logo,alt:''}),
       el('span',{className:'preset-dots'},...[t.accent,t.accent2].filter(Boolean).map(c=>{const dot=el('i');dot.style.background=c;return dot;})),
       el('span',{className:'preset-label',textContent:t.label}));
     card.style.backgroundImage=`url(${t.thumb})`;
     card.style.backgroundColor=t.bg;
     card.onclick=()=>act('setTheme',{theme:t.id});
     presetGrid.append(card);
   }
   // Tinte: solo colori, lo sfondo resta quello che hai.
   const grid=el('div',{className:'theme-grid'});
   for(const t of a.themes.filter(t=>t.group!=='preset')){
     const swatch=el('span',{className:'theme-swatch'});
     swatch.style.background=`linear-gradient(120deg,${t.bg} 35%,${t.accent})`;
     const chip=el('button',{className:'theme-chip'+(a.theme===t.id&&!custom?' chosen':'')},swatch,el('span',{textContent:t.label}));
     chip.onclick=()=>act('setTheme',{theme:t.id});
     grid.append(chip);
   }
   const theme=a.themes.find(t=>t.id===a.theme);
   const colorRow=(command,value,fallback,label,customLabel)=>{
     const color=el('input',{type:'color',className:'color-input',value:value||fallback});
     let timer=null;
     color.oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>act(command,{color:color.value}),120);};
     color.onchange=()=>{clearTimeout(timer);act(command,{color:color.value});color.blur();};
     return el('div',{className:'permission-row'},el('span',{textContent:value?customLabel:label}),
       el('span',{className:'inline-buttons'},color,...(value?[addButton(el('span'),'Usa quello del tema',()=>act(command,{color:''}))]:[])));
   };
   const accentRow=colorRow('setAccent',a.accent,theme?.accent||'#7c6cff','Colore d’accento (del tema)','Colore d’accento personalizzato');
   const accent2Row=colorRow('setAccent2',a.accent2,theme?.accent2||'#6fd3ff','Secondo colore (del tema)','Secondo colore personalizzato');
   // I miei preset: salvano colori, sfondo, trasparenza, testo, angoli e densità.
   const mine=a.presets.map(p=>{
     const dots=el('span',{className:'preset-dots inline'},...[p.accent||a.themes.find(t=>t.id===p.theme)?.accent,p.accent2||a.themes.find(t=>t.id===p.theme)?.accent2]
       .filter(Boolean).map(c=>{const dot=el('i');dot.style.background=c;return dot;}));
     return el('div',{className:'permission-row'},el('span',{className:'preset-name'},dots,el('span',{textContent:p.name})),
       el('span',{className:'inline-buttons'},
         addButton(el('span'),'Usa',()=>settingsAction('applyPreset',`Preset «${p.name}» in uso.`,{name:p.name})),
         addButton(el('span'),'Aggiorna',()=>settingsAction('savePreset',`«${p.name}» aggiornato con l’aspetto attuale.`,{name:p.name})),
         confirmButton('Elimina','Conferma',()=>settingsAction('deletePreset',`«${p.name}» eliminato.`,{name:p.name}))));
   });
   const nameInput=el('input',{type:'text',placeholder:'Nome del preset',maxLength:40,autocomplete:'off',spellcheck:false});
   const saveForm=el('form',{className:'link-form'},nameInput,el('button',{type:'submit',textContent:'Salva l’aspetto attuale'}));
   saveForm.onsubmit=e=>{e.preventDefault();const name=nameInput.value.trim();if(name)settingsAction('savePreset',r=>r.updated?`«${name}» aggiornato.`:`Preset «${name}» salvato.`,{name});};
   // Preset del workspace attivo.
   const wsOptions=[['','Come gli altri workspace'],...a.themes.map(t=>['theme:'+t.id,t.label]),...a.presets.map(p=>['user:'+p.name,p.name+' (tuo)'])];
   const wsRow=el('label',{className:'permission-row'},el('span',{textContent:`Preset di «${a.workspace}»`}),
     selectBox(wsOptions,a.workspacePreset,preset=>act('setWorkspacePreset',{preset})));
   // Sfondo
   const wallNow=a.wallpaper.kind==='image'?a.wallpaperName:a.wallpaper.kind==='none'?'Nessuno (tinta unita)':
     theme?.group==='preset'&&a.theme!=='varco'?'Sfondo del preset '+theme.label:'Sfondo VARCO';
   const wallAll=el('div',{className:'permission-row'},el('span',{textContent:'Tutti i workspace: '+wallNow}),
     projectButtons(['Immagine…',()=>act('chooseWallpaper',{scope:'all'})],[theme?.group==='preset'&&a.theme!=='varco'?'Del preset':'VARCO',()=>act('setWallpaperKind',{kind:'default'})],['Nessuno',()=>act('setWallpaperKind',{kind:'none'})]));
   const wallWs=el('div',{className:'permission-row'},el('span',{textContent:`Solo «${a.workspace}»: `+(a.workspaceWallpaper||'come gli altri')}),
     projectButtons(['Immagine…',()=>act('chooseWallpaper',{scope:'workspace'})],...(a.workspaceWallpaper?[['Togli',()=>act('clearWorkspaceWallpaper')]]:[])));
   const L=a.limits;
   return [
     section('Preset',presetGrid,
       hint('Ogni preset porta colori, sfondo, logo e icona della finestra. Scegline uno diverso per un singolo workspace qui sotto.'),wsRow,
       ...(a.workspacePreset?[hint('Questo workspace ha un suo preset: le scelte qui sotto valgono per gli altri workspace.')]:[])),
     section('Tema e colori',sub('Tinte (solo colori)'),grid,accentRow,accent2Row,
       rangeRow('Opacità delle barre','glass',a.glass,L.glass,v=>v+'%'),
       hint('Più bassa: barre più trasparenti, si vede di più lo sfondo.')),
     section('I miei preset',...(mine.length?mine:[hint('Personalizza colori, sfondo e interfaccia, poi salva qui il risultato con un nome.')]),
       saveForm,
       el('div',{className:'inline-buttons'},
         addButton(el('span'),'Importa…',()=>settingsAction('importPresets',r=>`${r.count} preset importati.`)),
         ...(mine.length?[addButton(el('span'),'Esporta…',()=>settingsAction('exportPresets',r=>`${r.count} preset esportati.`))]:[])),
       hint(`Al massimo ${a.maxPresets}. Il file esportato contiene anche gli sfondi: puoi passarlo a un altro PC.`)),
     section('Sfondo',wallAll,wallWs,
       rangeRow('Sfocatura','blur',a.wallpaper.blur,L.blur,v=>v+' px'),
       rangeRow('Luminosità','brightness',a.wallpaper.brightness,L.brightness,v=>v+'%'),
       hint('L’immagine viene copiata nella cartella dei dati di VARCO: puoi spostare o cancellare l’originale.')),
     section('Interfaccia',
       el('label',{className:'permission-row'},el('span',{textContent:'Densità'}),selectBox(a.densities.map(d=>[d,d[0].toUpperCase()+d.slice(1)]),a.density,density=>act('setDensity',{density}))),
       el('label',{className:'permission-row'},el('span',{textContent:'Animazioni'}),selectBox([['auto','Automatiche (come Windows)'],['full','Complete'],['reduced','Ridotte'],['off','Spente']],
         state.appearance?.motion||'auto',motion=>act('setMotion',{motion}))),
       rangeRow('Dimensione del testo','fontScale',a.fontScale,L.fontScale,v=>v+'%'),
       rangeRow('Angoli delle pagine','radius',a.radius,L.radius,v=>v+' px'),
       sub('Barra laterale'),
       el('div',{className:'toggle-grid'},...Object.entries(a.hideable.sidebar).map(([id,label])=>checkRow(label,!a.hidden.includes(id),v=>act('setButtonHidden',{id,hidden:!v})))),
       sub('Barre in alto e in basso'),
       el('div',{className:'toggle-grid'},...Object.entries(a.hideable.toolbar).map(([id,label])=>checkRow(label,!a.hidden.includes(id),v=>act('setButtonHidden',{id,hidden:!v})))),
       hint('I pulsanti nascosti restano raggiungibili dalla palette (F1) e dalle scorciatoie.')),
     section('Home',
       el('div',{className:'toggle-grid'},...Object.entries(a.homeCards).map(([card,label])=>checkRow(label,a.home[card],visible=>act('setHomeCard',{card,visible})))),
       hint('I link rapidi sono diversi per ogni workspace: si aggiungono dal riquadro sulla Home.'),
       el('div',{className:'inline-buttons'},confirmButton('Ripristina l’aspetto predefinito','Conferma: torna all’aspetto di VARCO',()=>act('resetAppearance'))))
   ];
 }

 // ── File del progetto (Beta 0.20) ────────────────────────────────────────
 // Albero della cartella collegata al workspace: le cartelle si aprono al clic,
 // i file si aprono nel visualizzatore. Le cartelle pesanti (node_modules, .git…) restano chiuse.
 const FILE_ICONS={folder:'folder',code:'commands',markdown:'notes',text:'notes',json:'commands',csv:'tabs',image:'external',
   video:'tabs',audio:'jarvis',pdf:'notes',docx:'notes',sheet:'tabs',pptx:'tabs',model:'ws-project',zip:'downloads',font:'notes',binary:'ws-default'};
 let renderedFiles=null;
 const filesUi={workspace:null,root:null,open:new Set(),cache:new Map(),error:''};
 async function loadDir(dir){
   const r=await act('listDir',dir?{path:dir}:{});
   const res=r?.result;
   if(!res?.ok){filesUi.error=res?.error||r?.error||'Cartella non leggibile.';return null;}
   filesUi.cache.set(res.dir,res);
   return res;
 }
 async function renderFiles(force=false){
   $('sidePanelTitle').textContent='File · '+state.activeWorkspace;
   const list=$('sidePanelItems');
   if(filesUi.workspace!==state.activeWorkspace){Object.assign(filesUi,{workspace:state.activeWorkspace,root:null,open:new Set(),cache:new Map(),error:''});}
   if(renderedFiles===state.activeWorkspace&&!force)return;
   renderedFiles=state.activeWorkspace;
   if(!filesUi.root){filesUi.error='';const res=await loadDir(null);filesUi.root=res?.dir||null;}
   list.replaceChildren();
   list.append(projectButtons(['Apri un file… (Ctrl+O)',()=>act('openFileDialog')]));
   if(!filesUi.root){
     list.append(el('p',{className:'panel-hint',textContent:filesUi.error||'Collega una cartella al workspace.'}),
       projectButtons(['Collega cartella',()=>act('projectFolder')]),
       el('p',{className:'panel-hint',textContent:'Puoi anche trascinare un file qualsiasi sulla finestra, o scrivere il suo percorso nella barra degli indirizzi.'}));
     return;
   }
   list.append(el('p',{className:'project-folder',textContent:filesUi.root,title:filesUi.root}));
   const tree=el('div',{className:'file-tree'});
   const draw=(dir,depth)=>{
     const res=filesUi.cache.get(dir);if(!res)return;
     for(const item of res.items){
       const row=el('button',{className:'file-row'+(item.dir?' is-dir':'')+(item.heavy?' heavy':''),title:item.path});
       row.style.paddingLeft=(6+depth*14)+'px';
       const open=item.dir&&filesUi.open.has(item.path);
       row.append(el('span',{className:'file-caret',textContent:item.dir?(open?'▾':'▸'):''}),icon(FILE_ICONS[item.kind]||'notes'),el('span',{className:'file-name',textContent:item.name}));
       row.onclick=async()=>{
         if(!item.dir){act('openLocalFile',{path:item.path});return;}
         if(open)filesUi.open.delete(item.path);
         else{filesUi.open.add(item.path);if(!filesUi.cache.has(item.path))await loadDir(item.path);}
         renderFiles(true);
       };
       tree.append(row);
       if(open)draw(item.path,depth+1);
     }
     if(res.truncated)tree.append(el('p',{className:'panel-hint',textContent:'…e altri file (ne mostro 500).'}));
   };
   draw(filesUi.root,0);
   list.append(tree);
 }

 // ── Note del workspace (Beta 0.17) ───────────────────────────────────────
 // Un blocco note per ogni workspace: si salva da solo mentre scrivi.
 let renderedNotes=null,notesTimer=null;
 function renderNotes(){
   $('sidePanelTitle').textContent='Note · '+state.activeWorkspace;
   const list=$('sidePanelItems');
   // Non ricostruire mentre scrivi (lo stato arriva di continuo).
   if(renderedNotes===state.activeWorkspace)return;
   renderedNotes=state.activeWorkspace;
   const note=state.notes||{text:'',updatedAt:null};
   const area=el('textarea',{className:'notes-area',value:note.text,placeholder:'Appunti, cose da fare, idee per questo workspace…',spellcheck:true});
   area.maxLength=100000;
   const status=el('p',{className:'panel-hint notes-status',textContent:note.updatedAt?'Salvato '+timeAgo(note.updatedAt):'Si salva da solo mentre scrivi.'});
   area.oninput=()=>{
     status.textContent='Sto salvando…';
     clearTimeout(notesTimer);
     notesTimer=setTimeout(async()=>{
       const r=await act('saveNotes',{text:area.value});
       status.textContent=r?.result?.updatedAt?'Salvato alle '+new Date(r.result.updatedAt).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}):'Note vuote.';
     },600);
   };
   list.replaceChildren(area,status);
   setTimeout(()=>area.focus());
 }
 // ── Centro notifiche (Beta 0.15, mock-up "Notification System") ─────────
 const NOTIFY_FILTERS=[['all','Tutte'],['download','Download'],['sito','Sito'],['jarvis','JARVIS'],['sistema','Sistema']];
 const NOTIFY_ICONS={download:'download',success:'check',error:'warning',undo:'tab-reopen',bookmark:'bookmark-filled',info:'info'};
 let notifyFilter='all',renderedNotify=null;
 function renderNotifications(){
   $('sidePanelTitle').textContent='Centro notifiche';
   const all=state.notifications||[];
   const key=JSON.stringify([all,notifyFilter])+Math.floor(Date.now()/30000);
   if(key===renderedNotify)return;
   renderedNotify=key;
   const list=$('sidePanelItems');list.replaceChildren();
   const filters=el('div',{className:'notify-filters'});
   for(const [k,label] of NOTIFY_FILTERS){
     const b=el('button',{className:'filter'+(notifyFilter===k?' chosen':''),textContent:label});
     b.onclick=()=>{notifyFilter=k;renderNotifications();};filters.append(b);
   }
   list.append(filters);
   const shown=all.filter(n=>notifyFilter==='all'||n.category===notifyFilter);
   for(const n of shown){
     const row=el('div',{className:'notify-row '+n.kind});
     const badge=el('span',{className:'download-badge'},icon(NOTIFY_ICONS[n.kind]||'info'));
     const text=el('div',{className:'download-text'},
       el('div',{className:'notify-head'},el('span',{className:'download-name',textContent:n.title}),el('span',{className:'notify-time',textContent:timeAgo(n.time)})),
       ...(n.text?[el('div',{className:'download-state',textContent:n.text})]:[]));
     if(n.actions.length){const row2=el('div',{className:'inline-buttons'});for(const a of n.actions)addButton(row2,a.label,()=>act(a.command,a.args||{}));text.append(row2);}
     row.append(badge,text);
     iconButton(row,'close','Togli dall’elenco',()=>act('removeNotification',{id:n.id}),'download-action');
     list.append(row);
   }
   if(!shown.length)list.append(el('p',{className:'panel-hint',textContent:all.length?'Niente in questa categoria.':'Nessuna notifica in questa sessione.'}));
   if(all.length)list.append(projectButtons(['Cancella tutto',()=>act('clearNotifications')]));
 }
 function renderNotifyBadge(){
   const n=state.notificationsUnread||0,badge=$('notifyBadge');
   badge.hidden=!n;badge.textContent=n>9?'9+':String(n);
 }
 // Crea un pannello realmente visibile sui siti (i siti sono WebContentsView).
 // L'interfaccia del pannello non dipende dall'esistenza della homepage.
 function renderSidePanel(){
   const mode=state.sidePanelOpen;
   // Beta 0.27: chiudendo, il pannello esce scorrendo prima di sparire.
   const panel=$('sidePanel');
   clearTimeout(panelCloseTimer);
   if(mode){panel.classList.remove('closing');panel.hidden=false;}
   else if(!panel.hidden&&!panel.classList.contains('closing')){
     panel.classList.add('closing');
     panelCloseTimer=setTimeout(()=>{panel.hidden=true;panel.classList.remove('closing');},130);
   }
   if(mode!=='site')renderedSite=null;
   else return renderSite();
   if(mode!=='notifications')renderedNotify=null;
   else return renderNotifications();
   if(mode!=='notes')renderedNotes=null;
   else return renderNotes();
   if(mode!=='files')renderedFiles=null;
   else return renderFiles();
   if(mode!=='tabs')tabManager=null;
   else return renderTabManager();
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
 // ── Pannello Download (Beta 0.15): schede In corso / Completati / Annullati / Errori ──
 const DOWNLOAD_STATES={waiting:'In attesa di conferma',progressing:'In corso',completed:'Completato',cancelled:'Annullato',interrupted:'Errore'};
 const DOWNLOAD_FILTERS=[['all','Tutti',()=>true],['running','In corso',d=>['waiting','progressing'].includes(d.state)],
   ['completed','Completati',d=>d.state==='completed'],['cancelled','Annullati',d=>d.state==='cancelled'],['error','Errori',d=>d.state==='interrupted']];
 let downloadFilter='all';
 const sizeText=bytes=>bytes>=1073741824?(bytes/1073741824).toFixed(1)+' GB':bytes>=1048576?(bytes/1048576).toFixed(1)+' MB':Math.max(1,Math.round(bytes/1024))+' KB';
 function renderDownloads(){
 $('downloadDrawer').hidden=!state.downloadsOpen;
 const downloads=state.downloads||[];
 // Schede con il conteggio; quelle vuote restano visibili ma spente.
 const filters=$('downloadFilters');filters.replaceChildren();
 for(const [key,label,test] of DOWNLOAD_FILTERS){
   const count=downloads.filter(test).length;
   const b=el('button',{className:'filter'+(downloadFilter===key?' chosen':''),textContent:count&&key!=='all'?`${label} (${count})`:label});
   b.disabled=!count&&key!=='all';
   b.onclick=()=>{downloadFilter=key;renderDownloads();};
   filters.append(b);
 }
 const test=DOWNLOAD_FILTERS.find(f=>f[0]===downloadFilter)[2];
 const list=$('downloadList');list.replaceChildren();
 for(const item of downloads.filter(test)){
  const running=['waiting','progressing'].includes(item.state);
  const kind=item.state==='completed'?'done':item.state==='interrupted'?'error':item.state==='cancelled'?'cancelled':'running';
  const row=el('div',{className:'download-row '+kind,title:item.path||item.name});
  const percent=item.total>0?Math.min(100,Math.round(100*item.received/item.total)):null;
  const meta=running?(percent===null?sizeText(item.received):`${sizeText(item.received)} di ${sizeText(item.total)} · ${percent}%`):
    (item.state==='completed'?sizeText(item.total||item.received)+' · Completato':DOWNLOAD_STATES[item.state]);
  const text=el('div',{className:'download-text'},el('div',{className:'download-name',textContent:item.name}),
    el('div',{className:'download-state',textContent:meta}));
  if(item.error)text.append(el('div',{className:'panel-error',textContent:item.error}));
  if(running&&item.total>0){const bar=el('div',{className:'download-bar'},el('i'));bar.firstChild.style.width=percent+'%';text.append(bar);}
  const badge=el('span',{className:'download-badge'},icon(kind==='done'?'check':kind==='error'?'warning':kind==='cancelled'?'close':'download'));
  row.append(badge,text);
  if(item.state==='completed')iconButton(row,'downloads','Mostra nella cartella',()=>act('downloadShow',{id:item.id}),'download-action');
  else if(running)iconButton(row,'close','Annulla download',()=>act('downloadCancel',{id:item.id}),'download-action danger');
  else if(item.url)iconButton(row,'reload','Riprova',()=>act('downloadRetry',{id:item.id}),'download-action');
  // Doppio clic apre il file; click destro: menu VARCO del file.
  if(item.state==='completed')row.ondblclick=()=>act('downloadOpen',{id:item.id});
  row.oncontextmenu=e=>{e.preventDefault();act('downloadContextMenu',{id:item.id});};
  list.appendChild(row);
 }
 if(!list.childElementCount)list.append(el('p',{className:'panel-hint',textContent:downloads.length?'Niente in questa scheda.':'Nessun download in questa sessione.'}));
 $('clearDownloads').hidden=!downloads.some(d=>!['waiting','progressing'].includes(d.state));
 // Pallino sul pulsante ↓ mentre qualcosa si sta scaricando.
 $('showDownloads').classList.toggle('busy',downloads.some(d=>['waiting','progressing'].includes(d.state)));
}
$('clearDownloads').onclick=()=>act('downloadsClear');
$('closeDownloads').onclick=()=>act('toggleDownloads');
$('openDownloadsFolder').onclick=()=>act('showDownloadsFolder');
$('downloadCurrentFile').onclick=()=>act('downloadCurrentFile');
// ── Gestore delle schede (Beta 0.24) ─────────────────────────────────────
// Pannello Schede: ricerca, schede raggruppate per sito, anche di tutti i workspace.
// L'intestazione (ricerca) resta; si ridisegna solo l'elenco, così non perdi ciò che scrivi.
const tabUi={query:'',all:false};
let tabManager=null,scrolledToTab=null,panelCloseTimer=null,themingTimer=null,shownHome=null;
const siteOfUrl=url=>{try{const u=new URL(url);return /^https?:$/.test(u.protocol)?u.hostname.replace(/^www\./,''):'';}catch{return '';}};
const pageKeyOf=url=>{try{const u=new URL(url);u.hash='';return u.href.replace(/\/$/,'');}catch{return url||'';}};
function renderTabManager(){
 $('sidePanelTitle').textContent='Schede';
 const list=$('sidePanelItems');
 if(!tabManager||!list.contains(tabManager.root)){
  const input=el('input',{type:'search',className:'tab-search',placeholder:'Cerca per titolo o indirizzo…',value:tabUi.query,autocomplete:'off',spellcheck:false});
  input.oninput=()=>{tabUi.query=input.value;drawTabManager();};
  input.onkeydown=e=>{
   if(e.key==='Enter'){e.preventDefault();tabManager.results.querySelector('.tab-row-main')?.click();}
   if(e.key==='Escape'){e.preventDefault();act('openTabManager');}
  };
  const scope=el('div',{className:'segmented'});
  for(const [label,all] of [['Questo workspace',false],['Tutti',true]]){
   const b=el('button',{type:'button',textContent:label});
   b.onclick=()=>{tabUi.all=all;drawTabManager();};
   scope.append(b);
  }
  const tools=el('div',{className:'tab-tools'}),results=el('div',{className:'tab-results'});
  const root=el('div',{className:'tab-manager'},input,scope,tools,results);
  list.replaceChildren(root);
  tabManager={root,input,scope,tools,results};
  setTimeout(()=>input.focus(),0);
 }
 drawTabManager();
}
function drawTabManager(){
 const m=tabManager;if(!m)return;
 const pool=(state.allTabs||[]).filter(t=>!t.isHome&&(tabUi.all||t.workspace===state.activeWorkspace));
 const q=tabUi.query.trim().toLowerCase();
 const shown=pool.filter(t=>!q||(t.title||'').toLowerCase().includes(q)||(t.url||'').toLowerCase().includes(q));
 [...m.scope.children].forEach((b,i)=>b.classList.toggle('chosen',(i===1)===tabUi.all));
 // Doppie: stessa pagina più volte nello stesso workspace (il conto lo rifà main con le stesse regole).
 const seen=new Set();let doubles=0;
 for(const t of pool){const key=t.workspace+'\n'+pageKeyOf(t.url);if(seen.has(key))doubles++;else seen.add(key);}
 const tool=(label,fn,title,disabled=false)=>{const b=el('button',{type:'button',textContent:label,title,disabled});b.onclick=fn;return b;};
 m.tools.replaceChildren(
  el('span',{className:'tab-total',textContent:q?`${shown.length} di ${pool.length} schede`:`${pool.length} ${pool.length===1?'scheda':'schede'}`}),
  tool('Raggruppa per sito',()=>act('groupTabsBySite'),'Le schede dello stesso sito diventano uno stack (in questa finestra)'),
  tool(doubles?`Chiudi doppie (${doubles})`:'Nessuna doppia',()=>act('closeDuplicateTabs',{all:tabUi.all}),'Stessa pagina aperta più volte: ne resta una',!doubles),
  checkRow('Raggruppa da solo quando sono tante',!!state.autoGroupTabs,enabled=>act('setAutoGroupTabs',{enabled})));
 // Raggruppate per sito, i siti con più schede prima.
 const sites=new Map();
 for(const t of shown){const s=siteOfUrl(t.url)||'altro';if(!sites.has(s))sites.set(s,[]);sites.get(s).push(t);}
 const blocks=[...sites].sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0]));
 m.results.replaceChildren(...blocks.map(([site,list])=>{
  const head=el('div',{className:'tab-site'},
   list[0].favicon?el('img',{src:list[0].favicon,alt:''}):icon('external'),
   el('span',{className:'tab-site-name',textContent:site==='altro'?'Altre pagine':site}),
   el('span',{className:'tab-site-count',textContent:String(list.length)}));
  if(list.length>1){
   const close=el('button',{type:'button',className:'tab-site-close',textContent:'Chiudi tutte',title:`Chiude le ${list.length} schede di ${site}`});
   close.onclick=()=>{
    if(!close.dataset.armed){close.dataset.armed='1';close.textContent='Conferma';close.classList.add('danger');return;}
    act('closeTabs',{ids:list.map(t=>t.id).join(',')});
   };
   head.append(close);
  }
  return el('div',{className:'tab-site-block'},head,...list.map(t=>{
   const meta=[tabUi.all&&t.workspace!==state.activeWorkspace?t.workspace:'',t.pane?'finestra '+(t.pane+1):'',
     t.group?'stack '+t.group:'',t.pinned?'fissata':'',t.sleeping?'sospesa':''].filter(Boolean).join(' · ');
   const main=el('button',{type:'button',className:'tab-row-main',title:t.url},
    el('span',{className:'tab-row-title',textContent:t.title||t.url}),
    ...(meta?[el('span',{className:'tab-row-meta',textContent:meta})]:[]));
   main.onclick=()=>act('focusTab',{id:t.id});
   const close=iconButton(el('span'),'close','Chiudi',()=>act('closeTabs',{ids:String(t.id)}),'tab-row-close');
   return el('div',{className:'tab-row'+(t.active?' active':t.shown?' shown':'')+(t.sleeping?' sleeping':'')},main,close);
  }));
 }));
 if(!shown.length)m.results.append(el('p',{className:'panel-hint',textContent:q?'Nessuna scheda trovata.':'Nessuna scheda aperta.'}));
}
// Un elemento della barra delle schede (scheda, intestazione di stack o stack compatto).
function buildStripNode(entry){
   if(entry.kind==='group'&&entry.collapsed)return compactStack(entry);
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
     return group;
   }
   const t=entry.tab;
   const tab=document.createElement('div');
   // sleeping: pagina sospesa per risparmiare memoria, si ricarica al clic.
   tab.className='tab'+(t.active?' active':'')+(t.pinned?' pinned':'')+(t.sleeping?' sleeping':'')+(t.inSplit?' in-split':'')+
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
   return tab;
}
const stripKey=entry=>entry.kind==='group'?'g:'+entry.group+(entry.collapsed?':c':''):'t:'+entry.tab.id;
const motionMs=name=>parseFloat(getComputedStyle(document.body).getPropertyValue(name))||0;
function renderTabStrip(strip,entries){
 const old=new Map([...strip.children].filter(n=>n.dataset.key).map(n=>[n.dataset.key,n]));
 const before=new Map([...old].map(([key,node])=>[key,node.getBoundingClientRect()]));
 const nodes=entries.map(entry=>{
   const key=stripKey(entry),sig=JSON.stringify(entry),previous=old.get(key);
   old.delete(key);
   if(previous&&previous.dataset.sig===sig)return previous;
   const node=buildStripNode(entry);
   node.dataset.key=key;node.dataset.sig=sig;
   if(!previous&&before.size)node.classList.add('strip-enter'); // al primo disegno niente entrate
   return node;
 });
 const ms=motionMs('--dur-2');
 // Le schede chiuse: una copia resta dov'era e sfuma, mentre le altre scorrono nel buco.
 if(ms)for(const [key,node] of old){
   const r=before.get(key);
   if(!r||!r.width)continue;
   const ghost=node.cloneNode(true);
   Object.assign(ghost.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',margin:'0',pointerEvents:'none',zIndex:'5'});
   ghost.classList.add('strip-ghost');
   document.body.append(ghost);
   ghost.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(6px) scale(.92)'}],{duration:ms,easing:'cubic-bezier(.65,0,.35,1)'}).onfinish=()=>ghost.remove();
 }
 strip.replaceChildren(...nodes);
 if(!ms)return;
 for(const node of nodes){
   const r0=before.get(node.dataset.key);
   if(!r0||node.classList.contains('strip-enter'))continue;
   const dx=r0.left-node.getBoundingClientRect().left;
   if(Math.abs(dx)>1)node.animate([{transform:`translateX(${dx}px)`},{transform:'none'}],{duration:ms,easing:'cubic-bezier(.2,.8,.2,1)'});
 }
 setTimeout(()=>{for(const node of nodes)node.classList.remove('strip-enter');},ms+50);
}
// Homepage lives inside a tab; it is displayed only when that tab is active.
// ── Stack compatto (Beta 0.18) ───────────────────────────────────────────
// Uno stack compresso diventa una sola "pillola": le icone delle sue schede una accanto
// all'altra (clic su un'icona = vai a quella scheda) e il titolo della scheda attiva.
function compactStack(entry){
 const pill=el('div',{className:'stack-pill'+(entry.active?' active':'')});
 const expand=iconButton(pill,'stack-closed','Espandi lo stack «'+entry.group+'»',()=>act('toggleGroup',{group:entry.group}),'stack-expand');
 expand.setAttribute('aria-expanded','false');
 const icons=el('span',{className:'stack-icons'});
 const members=entry.members||[];
 for(const m of members.slice(0,5)){
   const b=el('button',{className:'stack-icon'+(m.active?' active':''),title:m.title});
   if(m.loading)b.append(el('span',{className:'tab-spinner'}));
   else if(m.favicon)b.append(el('img',{src:m.favicon,alt:''}));
   else if(m.isHome)b.append(icon('home-tab'));
   else b.append(el('span',{className:'stack-letter',textContent:(m.title||'?').trim().charAt(0).toUpperCase()}));
   b.onclick=()=>act('activateTab',{id:m.id});
   b.oncontextmenu=e=>{e.preventDefault();act('tabContextMenu',{id:m.id});};
   icons.append(b);
 }
 if(members.length>5)icons.append(el('span',{className:'stack-more',textContent:'+'+(members.length-5)}));
 const current=members.find(m=>m.active);
 const label=el('span',{className:'stack-label',textContent:current?current.title:entry.group,title:entry.group+' · '+members.length+' schede'});
 // Clic sul titolo: la scheda attiva dello stack, altrimenti la prima.
 label.onclick=()=>act('activateTab',{id:(current||members[0]).id});
 pill.append(icons,label);
 pill.oncontextmenu=e=>{if(e.target===pill||e.target===label){e.preventDefault();act('tabContextMenu',{id:(current||members[0]).id});}};
 pill.ondragover=e=>e.preventDefault();
 pill.ondrop=e=>{
   e.preventDefault();
   const fromId=Number(e.dataTransfer.getData('text/plain'));
   if(Number.isInteger(fromId)&&!entry.tabIds.includes(fromId))act('stackTabs',{fromId,targetId:entry.tabIds[0]});
 };
 return pill;
}

// ── Vista divisa (Beta 0.18) ─────────────────────────────────────────────
// Le due pagine sono WebContentsView: la cornice disegna solo ciò che sta tra e intorno a loro
// (contorno del lato attivo, divisore). Durante il trascinamento del divisore le pagine si
// nascondono e al loro posto compaiono due riquadri col titolo, che seguono il mouse.
let splitDrag=null;
function renderSplit(){
 const s=state.split,layer=$('splitLayer');
 $('splitControls').hidden=!s;
 layer.hidden=!s;
 if(!s)return;
 const place=(node,r,grow=0)=>Object.assign(node.style,{left:(r.x-grow)+'px',top:(r.y-grow)+'px',width:(r.width+2*grow)+'px',height:(r.height+2*grow)+'px'});
 if(splitDrag)return; // mentre trascini comanda il mouse
 place($('splitFocus'),s.rects[s.focused],2);
 place($('splitDivider'),s.rects.divider);
 place($('splitGhostLeft'),s.rects.left);place($('splitGhostRight'),s.rects.right);
 $('splitGhostLeft').textContent=s.titles.left;$('splitGhostRight').textContent=s.titles.right;
 layer.classList.toggle('dragging',!!s.dragging);
}
$('splitDivider').addEventListener('pointerdown',e=>{
 const s=state.split;if(!s)return;
 e.preventDefault();
 $('splitDivider').setPointerCapture(e.pointerId);
 const left=s.rects.left,right=s.rects.right;
 splitDrag={x0:left.x,total:right.x+right.width-left.x,percent:Math.round(s.ratio*100)};
 $('splitLayer').classList.add('dragging');
 act('splitDragging',{on:true});
});
$('splitDivider').addEventListener('pointermove',e=>{
 if(!splitDrag)return;
 const s=state.split,gap=s.rects.divider.width;
 const percent=Math.min(80,Math.max(20,Math.round(100*(e.clientX-splitDrag.x0)/splitDrag.total)));
 splitDrag.percent=percent;
 const usable=splitDrag.total-gap,leftWidth=Math.round(usable*percent/100);
 const place=(node,x,width)=>Object.assign(node.style,{left:x+'px',width:width+'px'});
 place($('splitGhostLeft'),splitDrag.x0,leftWidth);
 place($('splitDivider'),splitDrag.x0+leftWidth,gap);
 place($('splitGhostRight'),splitDrag.x0+leftWidth+gap,usable-leftWidth);
 $('splitFocus').style.display='none';
});
const endSplitDrag=async()=>{
 if(!splitDrag)return;
 const percent=splitDrag.percent;splitDrag=null;
 $('splitFocus').style.display='';
 await act('setSplitRatio',{percent});
 act('splitDragging',{on:false});
};
$('splitDivider').addEventListener('pointerup',endSplitDrag);
$('splitDivider').addEventListener('lostpointercapture',endSplitDrag);
// Sicurezza: il trascinamento finisce anche rilasciando il mouse altrove o se la finestra perde il focus,
// altrimenti le pagine resterebbero nascoste.
window.addEventListener('pointerup',endSplitDrag);
window.addEventListener('blur',endSplitDrag);
$('splitDivider').addEventListener('dblclick',()=>act('setSplitRatio',{percent:50}));
$('splitSwap').onclick=()=>act('swapSplit');
$('splitClose').onclick=()=>act('closeSplit');

function render(){
 // Il CSS nasconde le etichette quando sidebarMode è compact e libera lo spazio se hidden.
 document.body.dataset.sidebarMode=state.sidebarMode||'compact';
 document.body.dataset.zen=state.zen?'true':'false';
 // Beta 0.17: il colore del workspace attivo colora la scheda attiva e il selettore in basso.
 const activeColor=state.workspaces.find(x=>x.name===state.activeWorkspace)?.color;
 if(activeColor)document.body.style.setProperty('--ws-active',activeColor);else document.body.style.removeProperty('--ws-active');
 document.body.dataset.panelOpen=state.sidePanelOpen?'true':'false';
 document.body.dataset.panelName=state.sidePanelOpen||'';
 applyAppearance();
 $('globalSidebar').hidden=state.sidebarMode==='hidden';
 // Beta 0.27: la Home (o un altro workspace sulla Home) entra con logo, ricerca e riquadri uno dopo l'altro.
 const homeKey=state.homeActive?state.activeWorkspace+':'+state.internalPage:null;
 if(homeKey&&homeKey!==shownHome&&state.internalPage==='home'){
   const home=document.querySelector('.home-content');
   home.classList.remove('home-enter');void home.offsetWidth;home.classList.add('home-enter');
   setTimeout(()=>home.classList.remove('home-enter'),800);
 }
 if(homeKey&&homeKey!==shownHome&&state.internalPage==='settings'){
   const page=$('settingsPage');
   page.classList.remove('settings-enter');void page.offsetWidth;page.classList.add('settings-enter');
   setTimeout(()=>page.classList.remove('settings-enter'),600);
 }
 shownHome=homeKey;
 $('dashboard').hidden=!state.homeActive;
 // Beta 0.12: la scheda interna può essere la Home o le Impostazioni.
 const onSettings=state.internalPage==='settings';
 document.querySelector('.home-content').hidden=onSettings;
 $('settingsPage').hidden=!onSettings;
 if(onSettings)renderSettings();else{renderedSettings=null;settingsUi.status='';pwUi.shown={};}
 // Con più finestre dello stesso workspace: "Destiny Builder · 2".
 $('footerWorkspaceName').textContent=(state.activeWorkspace||'Personale')+(state.pane?' · '+(state.pane+1):'');
 renderLayoutInfo();
 renderOrb();
 renderHomeCards();
 $('reopenClosed').disabled=!state.canReopenClosed;
 // Gli elementi 'group' e 'tab' arrivano dal modello tab-advanced.cjs.
 // I gruppi compressi visualizzano solo l'intestazione; i siti rimangono aperti.
 // Beta 0.27: la barra non si ricrea da zero. Ogni scheda tiene il suo elemento finché non cambia;
 // le nuove entrano, le chiuse escono sfumando e le altre scorrono al loro posto (FLIP).
 const tabs=$('tabs');
 renderTabStrip(tabs,state.tabStrip||[]);
 // Beta 0.24: contatore delle schede e scheda attiva sempre in vista (solo quando cambia,
 // così non ti riporta indietro mentre scorri la barra).
 const tabTotal=(state.tabs||[]).filter(t=>!t.isHome).length;
 $('tabCountNumber').textContent=String(tabTotal);
 $('tabCount').title=`${tabTotal} ${tabTotal===1?'scheda':'schede'} · cerca tra le schede (Ctrl+Shift+A)`;
 const activeTabId=(state.tabs||[]).find(t=>t.active)?.id;
 if(activeTabId!==scrolledToTab){
   scrolledToTab=activeTabId;
   tabs.querySelector('.tab.active,.stack-pill.active')?.scrollIntoView({block:'nearest',inline:'nearest'});
 }
 updateTabFades();
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
   // Beta 0.17: colore scelto dal menu del workspace (click destro → Colore).
   if(workspace.color){button.style.setProperty('--ws-color',workspace.color);button.classList.add('colored');}
   // Trascina un workspace sopra un altro per metterlo prima.
   button.draggable=true;
   button.ondragstart=e=>{e.dataTransfer.setData('application/x-varco-workspace',workspace.name);e.dataTransfer.effectAllowed='move';};
   button.ondragover=e=>{if(e.dataTransfer.types.includes('application/x-varco-workspace')){e.preventDefault();button.classList.add('drop-target');}};
   button.ondragleave=()=>button.classList.remove('drop-target');
   button.ondrop=e=>{
     button.classList.remove('drop-target');
     const moved=e.dataTransfer.getData('application/x-varco-workspace');
     if(moved&&moved!==workspace.name){e.preventDefault();act('moveWorkspace',{name:moved,before:workspace.name});}
   };
   // Click destro: menu nativo con "Apri in una nuova finestra" e "Cambia icona".
   button.oncontextmenu=event=>{event.preventDefault();act('workspaceContextMenu',{name:workspace.name});};
   w.appendChild(button);
 }$('title').textContent=state.activeWorkspace;const current=state.workspaces.find(x=>x.name===state.activeWorkspace);$('folder').textContent=current?.projectPath?'Cartella: '+current.projectPath:'Nessuna cartella locale associata';const res=$('resources');res.replaceChildren();for(const u of current?.resources||[])addButton(res,u,()=>act('resource',{url:u}),'item');if(!current?.resources?.length)res.textContent='Nessuna risorsa salvata.';renderPanel();renderSidePanel();renderDownloads();renderLoadError();const activeTab=state.tabs.find(t=>t.active);
// Sulla Home niente "app://home": la barra invita a cercare.
syncAddress(activeTab);
renderZoom();renderFindForTab();renderSiteButton();renderLoadLine();renderNotifyBadge();renderSplit();}
function renderPanel(){const list=panel==='history'?state.history:panel==='downloads'?state.downloads:state.bookmarks;$('secondaryTitle').textContent=panel==='history'?'Cronologia':panel==='downloads'?'Download':'Preferiti';const el=$('secondary');el.replaceChildren();for(const item of list.slice(0,25)){
if(panel==='downloads'){const label=item.name+' — '+item.state+(item.total>0?' ('+Math.round(100*item.received/item.total)+'%)':'');addButton(el,label,()=>act('showDownloadsFolder'), 'item');}
else addButton(el,item.title||item.url,()=>act('resource',{url:item.url}),'item');
}if(!list.length)el.textContent='Nessun elemento.';}
$('workspaceSwitcher').onclick=()=>act('showWorkspaceMenu');
// Questo pulsante è una scorciatoia visuale alla stessa funzione di Ctrl+Shift+T.
$('reopenClosed').onclick=()=>act('reopenClosedTab');
$('new').onclick=()=>act('newTab');$('back').onclick=()=>act('back');$('forward').onclick=()=>act('forward');$('reload').onclick=()=>act('reload');$('home').onclick=()=>act('home');$('bookmark').onclick=()=>act('bookmark');$('nav').onsubmit=e=>{e.preventDefault();const value=$('address').value;addressEdited=false;$('address').blur();if(value.trim())act('navigate',{url:value});};$('addWorkspace').onclick=()=>act('toggleSidePanel',{panel:'newWorkspace'});$('chooseFolder').onclick=()=>act('projectFolder');$('openFolder').onclick=()=>act('openFolder');$('addResource').onclick=()=>act('toggleSidePanel',{panel:'addResource'});$('showDownloads').onclick=()=>act('toggleDownloads');$('sideDownloads').onclick=()=>act('toggleDownloads');$('showHistory').onclick=()=>act('toggleSidePanel',{panel:'history'});
$('showBookmarks').onclick=()=>act('toggleSidePanel',{panel:'bookmarks'});
$('showTabs').onclick=()=>act('toggleSidePanel',{panel:'tabs'});
$('tabCount').onclick=()=>act('openTabManager');
// Beta 0.24: con tante schede la barra scorre anche con la rotellina (su e giù = sinistra e destra).
$('tabs').addEventListener('wheel',event=>{
 const strip=$('tabs');
 if(strip.scrollWidth<=strip.clientWidth||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
 strip.scrollLeft+=event.deltaY;
 event.preventDefault();
},{passive:false});
// Beta 0.24.1: niente barra di scorrimento. Avvicinando il mouse a un bordo della striscia
// le schede scorrono da sole, più veloci quanto più sei vicino al bordo (anche trascinando una scheda).
const EDGE_ZONE=56,EDGE_SPEED=14; // px dal bordo · px per fotogramma al massimo
let edgeSpeed=0,edgeFrame=0;
function updateTabFades(){
 const strip=$('tabs'),max=strip.scrollWidth-strip.clientWidth;
 strip.classList.toggle('more-left',max>1&&strip.scrollLeft>1);
 strip.classList.toggle('more-right',max>1&&strip.scrollLeft<max-1);
}
function edgeStep(){
 const strip=$('tabs');
 if(!edgeSpeed){edgeFrame=0;return;}
 const before=strip.scrollLeft;
 strip.scrollLeft+=edgeSpeed;
 if(strip.scrollLeft===before){edgeSpeed=0;edgeFrame=0;return;} // arrivati in fondo
 edgeFrame=requestAnimationFrame(edgeStep);
}
function edgeFromPointer(event){
 const strip=$('tabs');
 if(strip.scrollWidth<=strip.clientWidth){edgeSpeed=0;return;}
 const box=strip.getBoundingClientRect();
 const zone=Math.min(EDGE_ZONE,box.width/4),x=event.clientX-box.left;
 // Spinta da 0 (inizio della zona) a 1 (sul bordo), con una curva morbida.
 const push=x<zone?-(1-x/zone):x>box.width-zone?1-(box.width-x)/zone:0;
 edgeSpeed=Math.sign(push)*Math.ceil(EDGE_SPEED*push*push);
 if(edgeSpeed&&!edgeFrame)edgeFrame=requestAnimationFrame(edgeStep);
}
$('tabs').addEventListener('mousemove',edgeFromPointer);
$('tabs').addEventListener('dragover',edgeFromPointer);
for(const name of ['mouseleave','dragleave','drop','dragend'])$('tabs').addEventListener(name,()=>{edgeSpeed=0;});
$('tabs').addEventListener('scroll',updateTabFades,{passive:true});
window.addEventListener('resize',updateTabFades);
$('showGames').onclick=()=>act('toggleSidePanel',{panel:'games'});
$('showProject').onclick=()=>act('toggleSidePanel',{panel:'project'});
$('saveLayout').onclick=()=>act('saveLayout');
$('showJarvis').onclick=()=>act('toggleSidePanel',{panel:'jarvis'});
$('siteButton').onclick=()=>act('toggleSidePanel',{panel:'site'});
$('showSettings').onclick=()=>act('openSettings');
$('showNotifications').onclick=()=>act('toggleSidePanel',{panel:'notifications'});
$('showNotes').onclick=()=>act('toggleSidePanel',{panel:'notes'});
$('showFiles').onclick=()=>act('toggleSidePanel',{panel:'files'});
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

// ── Barra degli indirizzi modificabile (Beta 0.17.1) ─────────────────────
// Prima l'indirizzo era solo il testo d'aiuto: per cambiarlo andava riscritto da capo.
// Ora la barra contiene l'indirizzo vero; mentre la stai modificando non viene toccata.
let addressEdited=false;
function syncAddress(tab=state.tabs.find(t=>t.active)){
 const input=$('address');
 if(addressEdited&&document.activeElement===input)return;
 let value=tab&&!tab.isHome?tab.url:'';
 // Beta 0.20: per un file del visualizzatore mostriamo il suo percorso (si può modificare e riaprire).
 if(value.startsWith('varco-view://app/viewer.html')){try{value=new URL(value).searchParams.get('p')||value;}catch{}}
 if(input.value!==value)input.value=value;
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
 addressEdited=true;
 if(!$('address').value.trim()){closeSuggestions();return;}
 if(suggestOpen)renderSuggestions();
 else if(!suggestRequested){suggestRequested=true;act('openPalette',{mode:'address'});}
});
$('address').addEventListener('keydown',e=>{
 // Esc senza suggerimenti: torna all'indirizzo della pagina (come in Chrome).
 if(!suggestOpen){if(e.key==='Escape'){addressEdited=false;syncAddress();$('address').blur();}return;}
 const move=step=>{e.preventDefault();if(!suggestShown.length)return;suggestIndex=(suggestIndex+step+suggestShown.length)%suggestShown.length;highlightSuggestion(true);};
 if(e.key==='ArrowDown')move(1);
 else if(e.key==='ArrowUp')move(-1);
 else if(e.key==='Enter'){e.preventDefault();runSuggestion(suggestShown[suggestIndex]);}
 else if(e.key==='Escape'){e.preventDefault();closeSuggestions();addressEdited=false;syncAddress();$('address').blur();}
});
// Clic altrove: i suggerimenti si chiudono (il testo resta nella barra).
$('address').addEventListener('blur',()=>setTimeout(()=>{
 if(document.activeElement===$('address'))return;
 closeSuggestions();
 // Uscendo senza premere Invio, la barra torna a mostrare l'indirizzo della pagina.
 addressEdited=false;syncAddress();
},120));
// Clic nella barra: seleziona tutto l'indirizzo, pronto da modificare o sostituire.
$('address').addEventListener('focus',()=>{if(!addressEdited)setTimeout(()=>$('address').select());});
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
 const alt=$('loadErrorHttp');alt.hidden=!e.altUrl;
 if(e.altUrl)alt.textContent=e.altLabel;
 $('loadErrorProject').hidden=!e.local;
}
$('loadErrorRetry').onclick=()=>act('reload');
$('loadErrorHttp').onclick=()=>{if(state.loadError?.altUrl)act('navigate',{url:state.loadError.altUrl});};
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

// ── Orologio in basso a destra e modalità zen (Beta 0.19) ────────────────
function renderClock(){
 const now=new Date();
 $('clockTime').textContent=now.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
 $('clockDate').textContent=now.toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short'});
 $('clock').title=now.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}
renderClock();
// Si aggiorna allo scoccare di ogni minuto.
setTimeout(()=>{renderClock();setInterval(renderClock,60000);},(60-new Date().getSeconds())*1000+50);
$('zenButton').onclick=()=>act('toggleZen');

// ── File trascinati sulla finestra → visualizzatore (Beta 0.20) ──────────
// (Quelli lasciati sopra una pagina web li intercetta il processo principale.)
document.addEventListener('dragover',e=>{if(e.dataTransfer?.types?.includes('Files')){e.preventDefault();e.dataTransfer.dropEffect='copy';}});
document.addEventListener('drop',e=>{
 if(!e.dataTransfer?.files?.length)return;
 e.preventDefault();
 for(const file of [...e.dataTransfer.files].slice(0,10)){
   const path=window.browserAPI.pathForFile(file);
   if(path)act('openLocalFile',{path});
 }
});
