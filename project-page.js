/* Beta 0.43.2 — Pagina del progetto (scheda interna app://project), disegnata dalla cornice.
 * Beta 0.43.3 — anche la pagina del gioco (app://game/<id>): stessa tela, riquadri del gioco, partite e storico;
 *   per entrambe più board (run, stagioni, fasi), etichette e link rapidi modificabili.
 * Una tela libera: riquadri messi dove vuoi, collegati da fili (cavi con la spina), raggruppati in aree.
 * Dati veri del progetto: stato del server, file recenti, risorse; attività, note e screenshot in <progetto>/.varco.
 * La disposizione vive qui mentre la modifichi e si salva in .varco/pagina.json (lib/project-page.cjs).
 * I colori sono le variabili --s-* del tema di VARCO (lib/appearance-rules.cjs → strumentoTokens). */
(function(){
'use strict';
// Beta 0.43.5: il bus risponde {ok,result}; qui serve il risultato del comando (rev, nomi, miniature…).
const act=(name,args={})=>window.browserAPI.action(name,args).then(r=>r&&r.ok&&'result' in r?(r.result&&typeof r.result==='object'?r.result:{ok:true}):r);
const SNAP=24;
const SINGLE=['hero','tasks','shots','files','stream','notes','res'];
const SIZES={hero:[768,576],tasks:[336,504],shots:[624,408],files:[432,360],stream:[336,312],notes:[432,288],res:[336,384],note:[312,216],shot:[456,312],link:[336,240],file:[312,144],timer:[336,192]};
const SIZE_CHOICES={hero:[[768,576],[624,520],[960,600]],tasks:[[336,504],[432,504],[336,624]],shots:[[624,408],[456,408],[816,480]],files:[[432,360],[624,360]],
  stream:[[336,312],[432,360]],notes:[[432,288],[624,360]],res:[[336,384],[432,384]],note:[[312,216],[264,168],[432,288]],shot:[[456,312],[336,232],[624,408]],link:[[336,240],[456,312],[312,120]],file:[[312,144],[408,144]],timer:[[336,192],[288,168],[432,216]]};
const GROUP={hero:'lavoro',tasks:'lavoro',files:'lavoro',stream:'lavoro',notes:'lavoro',note:'lavoro',file:'lavoro',shots:'media',shot:'media',res:'link',link:'link',timer:'lavoro'};
const LABELS={project:{hero:'Stato del progetto',tasks:'Attività',shots:'Screenshot',files:'File recenti',stream:'Cronologia',notes:'Note del progetto',res:'Link rapidi',note:'Nota',shot:'Screenshot',link:'Link',file:'File',timer:'Timer'},
  game:{hero:'Scheda del gioco',tasks:'Obiettivi',shots:'Catture',files:'Configurazione',stream:'Storico partite',notes:'Note tattiche',res:'Link rapidi',note:'Nota',shot:'Cattura',link:'Link',file:'File',timer:'Timer'}};
const LABEL=new Proxy({},{get:(o,k)=>LABELS[D.mode||'project'][k]});
const TITLES={project:{tasks:'Da fare',shots:'Galleria',files:'Dove eri rimasto',stream:'Cosa è successo',res:'Sempre a portata'},game:{tasks:'In questa board',shots:'Screenshot e clip',files:'Build e impostazioni',stream:'Le partite',res:'Sempre a portata'}};
const TAGS=['Bug','UI','Codice','Arte','Build','Altro'];
const TAGC={Bug:'--s-err',UI:'--s-alt',Codice:'--s-sig-ink',Arte:'--s-warn',Build:'--s-ok',Altro:'--s-dim'};

/* Icone a tratto (prendono il colore del testo) */
const IP={drag:'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',size:'M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6',close:'M6 6l12 12M18 6L6 18',link:'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  plus:'M12 5v14M5 12h14',minus:'M5 12h14',note:'M5 4h10l4 4v12H5zM15 4v4h4M8 12h8M8 16h5',image:'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15.5 9.5h.01',upload:'M12 16V4M7 9l5-5 5 5M4 16v4h16v-4',
  area:'M4 4h4M12 4h4M20 4v4M20 12v4M20 20h-4M12 20H8M4 20v-4M4 12V8',grid:'M4 4h16v16H4zM4 10h16M4 16h16M10 4v16M16 4v16',fit:'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',reset:'M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5',
  play:'M7 4l13 8-13 8z',cube:'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',build:'M14 6l4 4-9 9H5v-4zM12 8l4 4',log:'M5 5h14M5 10h14M5 15h9M5 20h6',folder:'M3 6h6l2 2h10v11H3z',
  pointer:'M5 3l14 7-6 2-2 6z',hand:'M8 13V5a1.5 1.5 0 0 1 3 0v6V4a1.5 1.5 0 0 1 3 0v7V6a1.5 1.5 0 0 1 3 0v8c0 4-2.5 7-6.5 7S5 18 4 15l-1-3a1.5 1.5 0 0 1 2.7-1.2L8 13',wire:'M5 19c0-8 14-6 14-14M5 19h.01M19 5h.01',
  focus:'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',check:'M5 12l5 5 9-10',error:'M12 3l9 17H3zM12 10v4M12 17h.01',task:'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  gallery:'M3 7h14v12H3zM7 3h14v12',files:'M7 3h8l4 4v10H7zM15 3v4h4M3 7v14h12',stream:'M4 6h10M4 12h16M4 18h7',bookmark:'M6 3h12v18l-6-4-6 4z',open:'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  search:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',back:'M15 5l-7 7 7 7',trash:'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',swap:'M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4',zoom:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M11 8v6M8 11h6',
  server:'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01',file:'M7 3h8l4 4v14H7zM15 3v4h4',panel:'M4 4h16v16H4zM14 4v16',palette:'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 2-1 3-1a4 4 0 0 0 4-4c0-4.4-4-8-9-8zM7.5 11h.01M10 7h.01M15 7h.01',
  terminal:'M4 5h16v14H4zM7 9l3 3-3 3M12 15h5'};
const svg=(n,s=16)=>`<svg class="pi" viewBox="0 0 24 24" width="${s}" height="${s}"><path d="${IP[n]||IP.file}"/></svg>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const typeOf=id=>id.split('-')[0];
const baseName=rel=>String(rel||'').split('/').pop();
const dirName=rel=>{const p=String(rel||'').split('/');p.pop();return p.join('/');};
function ago(ms){if(!ms)return '';const s=(Date.now()-ms)/1000;if(s<60)return 'adesso';if(s<3600)return Math.floor(s/60)+' min';if(s<86400)return Math.floor(s/3600)+' h';if(s<172800)return 'ieri';return Math.floor(s/86400)+' g';}
const fileIcon=rel=>/\.(png|jpe?g|webp|gif|psd|blend|fbx|obj)$/i.test(rel)?'image':/\.(md|txt|pdf|docx?)$/i.test(rel)?'note':/\.(unity|prefab|uproject|tscn|godot)$/i.test(rel)?'cube':'file';

/* ── Stato locale ── */
let root=null,built=false,curKey=null,lastRev=null,savedRev=null,dirty=false,saveTimer=null,notesTimer=null,notesSent=null;
let P=null;               // pagina: {n,tiles,links,areas,tasks,cover,view}
let D={};                 // dati dal processo principale: progetto, comandi, tipo, screenshot, note
let view={x:0,y:0,z:1},tool='sel',snap=true,selTile=null,selWire=null,filter='all',hoverId=null,temp=null,space=false,linkFrom=null,galSel=null;
const sigs={};            // firma dei dati dei riquadri dinamici: si ridisegnano solo quando cambia qualcosa
let E={};                 // elementi

const tok=n=>getComputedStyle(root).getPropertyValue(n).trim();
const wireColor=c=>[tok('--s-sig'),tok('--s-alt'),tok('--s-ok'),tok('--s-warn'),tok('--s-err')][c]||tok('--s-sig');
const snapv=v=>snap?Math.round(v/SNAP)*SNAP:Math.round(v);
const box=id=>P.tiles[id];
const linksOf=id=>P.links.filter(l=>l.a===id||l.b===id);
const match=id=>filter==='all'||GROUP[typeOf(id)]===filter;
const shotByName=n=>(D.shots||[]).find(s=>s.name===n)||null;

/* ── Costruzione della pagina (una volta) ── */
function build(){
  root=document.getElementById('projectPage');
  root.innerHTML=`
  <div class="pp-view" data-r="view"><div class="pp-dots" data-r="dots"></div><div class="pp-world" data-r="world"><div class="pp-areas" data-r="areas"></div><svg class="pp-wires" data-r="wires"></svg><div class="pp-tiles" data-r="tiles"></div><div class="pp-labels" data-r="labels"></div></div></div>
  <header class="pp-top"><div class="pp-logo" data-r="logo"></div><div class="pp-name"><span data-r="name"></span><span class="pp-mono pp-type" data-r="type"></span></div><div class="pp-sep"></div>
    <div class="pp-path" data-r="path" title="Apri la cartella del progetto">${svg('folder',15)}<span data-r="pathText"></span></div>
    <button class="pp-bchip" data-r="bchip" title="Board: run, stagioni, fasi del lavoro">${svg('grid',15)}<span><span class="pp-mono">Board</span><b data-r="bname"></b></span></button>
    <div class="pp-grow"></div><span class="pp-mono pp-saved" data-r="saved">● salvato</span>
    <button class="pp-btn" data-r="panelBtn" title="Pannello Progetto: comandi, log, ambiente di lavoro">${svg('panel',15)}Pannello</button>
    <button class="pp-btn pri" data-r="addTop">${svg('plus',15)}Aggiungi</button></header>
  <div class="pp-ribbon"><div class="pp-meta pp-mono" data-r="meta"></div>
    <div class="pp-chips" data-r="chips"><button aria-pressed="true" data-f="all">Tutto</button><button data-f="lavoro">Lavoro</button><button data-f="media">Media</button><button data-f="link">Collegamenti</button></div></div>
  <aside class="pp-rail" data-r="rail">
    <button aria-pressed="true" data-tool="sel" data-tip="Seleziona e sposta (V)">${svg('pointer',18)}</button>
    <button data-tool="pan" data-tip="Muovi la tela (H o Spazio)">${svg('hand',18)}</button>
    <button data-tool="link" data-tip="Collega: clic su un riquadro, poi su un altro (C)">${svg('wire',18)}</button><hr>
    <button data-act="add" data-tip="Aggiungi riquadro">${svg('plus',18)}</button>
    <button data-act="note" data-tip="Nota (N)">${svg('note',18)}</button>
    <button data-act="shot" data-tip="Screenshot dal PC (o trascina un'immagine sulla tela)">${svg('image',18)}</button>
    <button data-act="area" data-tip="Area: raggruppa riquadri vicini">${svg('area',18)}</button><hr>
    <button data-act="snap" aria-pressed="true" data-tip="Aggancia ai puntini">${svg('grid',18)}</button>
    <button data-act="fit" data-tip="Vedi tutto (F)">${svg('fit',18)}</button>
    <button data-act="reset" data-tip="Disposizione iniziale">${svg('reset',18)}</button></aside>
  <div class="pp-hint" data-r="hint"></div>
  <div class="pp-dock"><div class="grp"><div class="pp-mini" data-r="mini" title="Clic per andare lì"><canvas width="232" height="104"></canvas></div></div><div class="vr"></div>
    <div class="grp" data-r="quick"></div><div class="vr"></div>
    <div class="grp"><button data-r="zout" title="Rimpicciolisci">${svg('minus')}</button><span class="pp-mono pp-zl" data-r="zl">100%</span><button data-r="zin" title="Ingrandisci">${svg('plus')}</button>
    <button class="pri" data-r="addDock" title="Aggiungi">${svg('plus')}</button><button data-r="focus" title="Concentrati sul riquadro scelto e sui suoi collegati">${svg('focus')}<span class="lbl">Concentrati</span></button></div></div>
  <div class="pp-menu" data-r="menu"></div><div class="pp-menu" data-r="sizeMenu"></div><div class="pp-cmenu" data-r="cmenu"></div>
  <div class="pp-wbar" data-r="wbar"><input data-r="wlab" placeholder="Etichetta del filo…"><span data-r="wsw" style="display:flex;gap:5px;padding:0 4px"></span><button class="b" data-r="wrev" title="Inverti verso">${svg('swap')}</button><button class="b" data-r="wdel" title="Togli il filo">${svg('trash')}</button></div>
  <div class="pp-lb" data-r="lb"><img alt=""></div>
  <div class="pp-scrim" data-r="scrim"></div><section class="pp-modal" data-r="modal"></section><aside class="pp-sheet" data-r="sheet"></aside><div class="pp-toast" data-r="toast"></div>
  <div class="pp-missing" data-r="missing" hidden><div><h2 data-r="missTitle">Cartella non trovata</h2><p data-r="missText">Collega una cartella al workspace dal pannello Progetto.</p></div></div>
  <input type="file" data-r="file" accept="image/*" multiple hidden>`;
  E={};root.querySelectorAll('[data-r]').forEach(el=>E[el.dataset.r]=el);
  wireChrome();built=true;
}

/* ── Dati dal processo principale ── */
function render(state){
  if(!built)build();
  const pp=state.boardPage;if(!pp)return;
  E.missing.hidden=!pp.missing;E.view.hidden=!!pp.missing;
  if(pp.missing){E.missTitle.textContent=pp.kind==='game'?'Gioco non trovato':'Cartella del progetto non trovata';E.missText.textContent=pp.kind==='game'?'Il gioco è stato tolto dalle Impostazioni.':'Collega una cartella al workspace dal pannello Progetto.';return;}
  D={pp,mode:pp.kind,gk:pp.key,game:pp.game||null,index:pp.index,project:state.project||{},kind:pp.kind==='project'?state.project?.kind||null:null,commands:pp.kind==='project'?state.project?.commands||[]:[],shots:pp.shots||[],
    resources:(state.workspaces||[]).find(x=>x.name===state.activeWorkspace)?.resources||[],workspace:state.activeWorkspace};
  const key=pp.kind+'|'+pp.key+'|'+pp.folder+'|'+pp.index.current;
  if(key!==curKey){const first=!curKey||curKey.split('|').slice(0,3).join('|')!==key.split('|').slice(0,3).join('|');curKey=key;load(pp,true,first);}
  else if(pp.rev!==lastRev&&pp.rev!==savedRev&&!dirty&&!busy()){load(pp,false);}   // cambiata da fuori (git pull, un'altra finestra)
  else if(!dirty)IX=mergeIndex(pp.index);
  lastRev=pp.rev;
  chrome();refreshDynamic();boardExtras();
}
let moving=false;const busy=()=>moving||!!temp;
let IX=null;   // elenco delle board, etichette, link rapidi, preset (in comune tra le board)
const mergeIndex=ix=>JSON.parse(JSON.stringify(ix));

function load(pp,first,newPage){
  P=JSON.parse(JSON.stringify(pp.board));IX=mergeIndex(pp.index);
  P.links=P.links||[];P.areas=P.areas||{};P.tasks=P.tasks||[];P.tiles=P.tiles||{};P.build=P.build||[];P.sessions=P.sessions||[];P.notes=P.notes||'';
  selTile=null;selWire=null;E.wbar.classList.remove('on');if(newPage!==false){E.sheet.classList.remove('on');}
  for(const k in sigs)delete sigs[k];
  menuLabels();renderAll();
  if(first||!P.view){if(P.view){view={...P.view};applyView();}else requestAnimationFrame(firstView);}
}

/* Salvataggio: mezzo secondo dopo l'ultima modifica (la board aperta e, se cambiato, l'elenco) */
let indexDirty=false;
function save(withIndex){
  dirty=true;if(withIndex)indexDirty=true;clearTimeout(saveTimer);
  saveTimer=setTimeout(async()=>{
    saveTimer=null;P.view={x:Math.round(view.x),y:Math.round(view.y),z:+view.z.toFixed(3)};
    const args={kind:D.mode,key:String(D.gk),board:JSON.stringify(P)};
    if(indexDirty){args.index=JSON.stringify({tags:IX.tags,quick:IX.quick,presets:IX.presets,lastPreset:IX.lastPreset,boards:IX.boards});indexDirty=false;}
    const r=await act('boardSave',args).catch(()=>null);
    if(r?.ok){savedRev=r.rev;flashSaved();}
    if(!saveTimer)dirty=false;
  },500);
}
const saveIndex=()=>save(true);
function saveNotes(text){P.notes=text;save();}
function flashSaved(){E.saved.textContent='● salvato in '+(D.mode==='game'?D.pp.root:'.varco');E.saved.classList.add('on');clearTimeout(flashSaved.t);flashSaved.t=setTimeout(()=>E.saved.classList.remove('on'),1100);}

/* ── Testata, nastro, dock ── */
function chrome(){
  E.bname.textContent=IX?.boards?.[IX.current]?.name||'';
  if(D.mode==='game')return chromeGame();
  const pp=D.pp,k=D.kind,name=pp.name||D.workspace;
  E.logo.textContent=name.replace(/[^A-Za-z0-9À-ÿ ]/g,' ').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('')||'P';
  E.name.textContent=name;E.type.textContent=k?.label||'Progetto';
  E.pathText.textContent=pp.folder;
  const running=D.commands.filter(c=>c.status==='running').length;
  const metaSig=JSON.stringify([pp.folder,k?.engine,running,D.commands.length,Object.keys(P.tiles).length,P.links.length,Math.round(view.z*100)]);
  if(metaSig!==sigs.meta){sigs.meta=metaSig;
    E.meta.innerHTML=`${k?.engine?`MOTORE <i>${esc(k.engine)}</i><span class="bar"></span>`:''}COMANDI <i>${running}/${D.commands.length}</i><span class="bar"></span>RIQUADRI <i>${Object.keys(P.tiles).length}</i><span class="bar"></span>FILI <i>${P.links.length}</i><span class="bar"></span>ZOOM <i>${Math.round(view.z*100)}%</i><span class="bar"></span>.VARCO`;}
  // Azioni rapide nel dock: anteprima (se ci sono comandi) + le azioni del tipo di progetto
  const quick=[];
  if(D.commands.length)quick.push(['projectOpenPreview',{},'play','Anteprima']);
  for(const a of (k?.actions||[]).slice(0,4))quick.push(['projectTypeAction',{id:a.id},({engine:'cube',build:'build',logs:'log','open-folder':'folder',repo:'link'})[a.id]||'open',a.label]);
  for(const l of (IX?.quick||[]).filter(l=>l.dock).slice(0,3))quick.push(['@link',l,'link',l.n]);
  const qSig=JSON.stringify(quick);
  if(qSig!==sigs.quick){sigs.quick=qSig;E.quick.innerHTML=quick.map(([c,a,i,l],n)=>`<button data-q="${n}" title="${esc(l)}">${svg(i)}<span class="lbl">${esc(l)}</span></button>`).join('')||'<span class="pp-mono" style="color:var(--s-dim);padding:0 8px">Nessuna azione</span>';
    E.quick.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{const q=quick[+b.dataset.q];if(q[0]==='@link')openQuick(q[1]);else act(q[0],q[1]);});}
}

/* ── Riquadri ── */
function head(id,right='',title=null){
  const t=typeOf(id),n=linksOf(id).length;
  const h=title??TITLES[D.mode||'project'][t];
  return `<div class="pp-th"><div style="min-width:0"><span class="pp-mono k">${LABEL[t]}</span>${h?`<h3>${esc(h)}</h3>`:''}</div><div class="pp-tools">${n?`<span class="pp-mono pp-links-n" title="Collegamenti">${svg('link',13)}${n}</span>`:''}${right}<button data-tool="grip" title="Trascina per spostare">${svg('drag',15)}</button><button data-tool="size" title="Dimensione">${svg('size',15)}</button><button data-tool="remove" title="Togli dalla tela">${svg('close',15)}</button></div></div>`;
}
const mainCommand=()=>D.commands.find(c=>c.status==='running')||D.commands.find(c=>c.error)||D.commands[0]||null;
const coverShot=()=>shotByName(P.cover)||D.shots[0]||null;

const BODY={
  hero(id){
    const c=mainCommand(),k=D.kind,cfg=D.project.status==='ok';
    let tag='<span class="pp-tag idle">Nessun comando</span>';
    if(cfg&&c){tag=c.error||c.phase==='error'?`<span class="pp-tag err">${esc(c.phaseLabel||'Errore')}</span>`:c.ready||c.phase==='ready'?`<span class="pp-tag ok">${esc(c.phaseLabel||'Pronto')}</span>`
      :c.status==='running'?`<span class="pp-tag warn">${esc(c.phaseLabel||'Si avvia')}</span>`:'<span class="pp-tag idle">Spento</span>';}
    const cov=coverShot(),errs=D.commands.filter(x=>x.error),done=P.tasks.filter(t=>t.done).length,total=P.tasks.length,run=D.commands.filter(x=>x.status==='running').length;
    const ready=D.commands.some(x=>x.ready);
    const line=c&&c.url?`${c.url}${c.network?' · rete '+c.network:''}${c.ports?.length?' · porte '+c.ports.join(', '):''}`:cfg?'Server spento':'Nessun server configurato';
    const engineAct=(k?.actions||[]).find(a=>a.id==='engine');
    const err=errs[0]?.error||null,warn=!err&&c?.warning?c.warning:null;
    return head(id,tag,'')+`<div class="pp-stage">${cov?`<div class="art" style="background-image:url('${cov.url}')"></div><span class="chip">${esc(cov.name)}</span>`:'<div class="noart">Aggiungi uno screenshot per la copertina</div>'}
      <div class="over"><div style="flex:1;min-width:0"><span class="pp-mono url">${esc(line)}</span><h2>${esc(D.pp.name||D.workspace)}</h2><p>${esc([k?.label,k?.engine].filter(Boolean).join(' · ')||'Progetto')}</p></div>
      ${D.commands.length?`<button class="pp-btn" data-do="panel">${svg('log',15)}Log</button><button class="pp-btn pri" data-do="preview">${svg('play',15)}Apri anteprima</button>`
        :engineAct?`<button class="pp-btn pri" data-do="engine">${svg('cube',15)}${esc(engineAct.label)}</button>`:`<button class="pp-btn" data-do="panel">${svg('panel',15)}Pannello Progetto</button>`}</div></div>
      ${err?`<div class="pp-err">${svg('error',17)}<div style="flex:1;min-width:0"><span class="pp-mono">${errs.length} ${errs.length===1?'errore':'errori'}</span><code>${esc(err.text||String(err))}</code></div></div>`:warn?`<div class="pp-err warn">${svg('error',17)}<code>${esc(warn.text||String(warn))}</code></div>`:''}
      <div class="pp-metrics">
        <div class="pp-metric${errs.length?' err':''}"><div class="row pp-mono"><span>Errori</span></div><div class="val">${errs.length}</div></div>
        <div class="pp-metric"><div class="row pp-mono"><span>Attività</span><span class="ink">${total?Math.round(done/total*100)+'%':'—'}</span></div><div class="val">${done} / ${total}</div></div>
        <div class="pp-metric${ready?' ok':''}"><div class="row pp-mono"><span>Comandi</span><span>${ready?'pronto':run?'attivi':''}</span></div><div class="val">${run}<small>/ ${D.commands.length}</small></div></div>
        <div class="pp-metric"><div class="row pp-mono"><span>File oggi</span></div><div class="val">${k?.changedToday??'—'}</div></div></div>`;
  },
  tasks(id){
    const done=P.tasks.filter(t=>t.done).length,p=P.tasks.length?Math.round(done/P.tasks.length*100):0;
    return head(id,`<span class="pp-kbd" style="color:var(--s-sig-ink)">${p}%</span>`)+`<div class="pp-tb"><div class="pp-prog"><i style="width:${p}%"></i></div><div class="pp-tasks">${P.tasks.map((x,i)=>`
      <label class="pp-task${x.done?' done':''}" data-i="${i}"><input type="checkbox"${x.done?' checked':''}><div class="t"><span>${esc(x.t)}</span><div class="meta"><span class="pp-kbd" style="color:var(${TAGC[x.tag]||'--s-dim'})">${esc(x.tag)}</span></div></div>
      <button class="del" title="Elimina">${svg('close',14)}</button></label>`).join('')||'<div class="pp-empty">Nessuna attività. Scrivine una qui sotto.</div>'}</div>
      <form class="pp-add">${svg('task',15)}<input placeholder="Nuova attività…" maxlength="300"><select>${TAGS.map(t=>`<option>${t}</option>`).join('')}</select><button class="pp-btn sm" type="submit">${svg('plus',13)}</button></form></div>`;
  },
  shots(id){
    const list=D.shots,sel=shotByName(galSel)||coverShot();
    return head(id,`<span class="pp-kbd">${list.length}</span>`)+`<div class="pp-tb">${sel?`<div class="pp-feature" data-feat><div class="art" style="background-image:url('${sel.url}')"></div>
      <div class="bl"><b>${esc(sel.name)}</b><span class="pp-mono" style="opacity:.7">${ago(sel.mtime)}</span><span class="pp-grow"></span>
      <button class="pp-btn sm" data-do="cover" title="Mettila nel riquadro dello stato">${P.cover===sel.name?'In copertina':'Copertina'}</button><button class="pp-btn sm" data-do="pull" title="Mettila sulla tela come riquadro a sé">${svg('open',13)}Sulla tela</button></div></div>`
      :'<div class="pp-empty">Nessuno screenshot. Caricali col + o trascinali qui: finiscono in .varco/screenshot.</div>'}
      <div class="pp-thumbs">${list.slice(0,40).map(s=>`<div class="pp-thumb${sel&&s.name===sel.name?' on':''}" data-n="${esc(s.name)}" title="${esc(s.name)}" style="background-image:url('${s.url}')"></div>`).join('')}<button class="pp-thumb up" data-do="upload" title="Aggiungi dal PC">${svg('upload')}</button></div></div>`;
  },
  files(id){
    const rec=D.kind?.recent||[];
    return head(id,`<button data-do="rescan" title="Rileggi la cartella">${svg('reset',14)}</button>`)+`<div class="pp-tb">${rec.length?`<div class="pp-files">${rec.map(f=>`<div class="pp-f" data-rel="${esc(f.rel)}" title="Clic per aprire · trascina fuori per metterlo sulla tela"><div class="k">${svg(fileIcon(f.rel),14)}<span class="pp-mono">${esc((f.rel.match(/\.([a-z0-9]+)$/i)||['',''])[1]||'file')}</span></div><h4>${esc(baseName(f.rel))}</h4><p>${esc(dirName(f.rel)||'.')} · ${esc(f.ago||ago(f.mtime))}</p></div>`).join('')}</div>`:`<div class="pp-empty">${D.kind?.scanning?'Sto leggendo la cartella…':'Nessun file recente.'}</div>`}</div>`;
  },
  stream(id){
    const ev=[];
    for(const c of D.commands){if(c.error)ev.push({i:'error',c:'--s-err',t:c.name||'Server',p:c.error.text||'Errore',w:0,top:2});else if(c.status==='running')ev.push({i:'server',c:'--s-ok',t:c.name||'Server',p:(c.phaseLabel||'In esecuzione')+(c.url?' · '+c.url:''),w:0,top:1});}
    for(const f of (D.kind?.recent||[]).slice(0,4))ev.push({i:fileIcon(f.rel),c:'--s-sig-ink',t:'File',p:'Modificato '+baseName(f.rel),w:f.mtime});
    for(const s of D.shots.slice(0,3))ev.push({i:'image',c:'--s-alt',t:'Screenshot',p:'Aggiunto '+s.name,w:s.mtime});
    for(const t of P.tasks.filter(t=>t.done&&t.doneAt))ev.push({i:'check',c:'--s-ok',t:'Attività',p:'Fatta: '+t.t,w:t.doneAt});
    ev.sort((a,b)=>(b.top||0)-(a.top||0)||b.w-a.w);
    return head(id,D.commands.some(c=>c.status==='running')?'<span class="pp-tag ok">Live</span>':'')+`<div class="pp-tb"><div class="pp-list">${ev.slice(0,10).map(e=>`<div class="pp-ev"><div class="av" style="color:var(${e.c})">${svg(e.i,15)}</div><div class="w"><div class="h"><b>${esc(e.t)}</b><span class="pp-mono" style="color:var(--s-dim)">${e.w?ago(e.w):'ora'}</span></div><p>${esc(e.p)}</p></div></div>`).join('')||'<div class="pp-empty">Ancora niente: qui compaiono server, file modificati, screenshot e attività fatte.</div>'}</div></div>`;
  },
  notes(id){return head(id,'','')+`<div class="pp-tb"><div class="pp-note"><textarea spellcheck="false" data-k="notes" placeholder="${D.mode==='game'?'Strategie, rotazioni, cose da ricordare…':'Appunti del progetto…'}">${esc(P.notes||'')}</textarea></div></div>`;},
  res(id){
    const items=[];
    for(const u of D.resources)items.push({i:'bookmark',n:hostOf(u),s:u,url:u});
    for(const p of D.kind?.panels||[])items.push({i:'open',n:p.title,s:p.url,url:p.url});
    if((D.kind?.actions||[]).some(a=>a.id==='repo'))items.unshift({i:'terminal',n:'Repository',s:'apre il repository del progetto',repo:true});
    return head(id)+`<div class="pp-tb"><div class="pp-list">${items.map((r,n)=>`<button class="pp-re" data-n="${n}"><span class="ic">${svg(r.i,15)}</span><span class="w"><b>${esc(r.n)}</b><small>${esc(r.s)}</small></span></button>`).join('')||'<div class="pp-empty">Nessuna risorsa. Aggiungile dal pannello Progetto o metti dei Link sulla tela.</div>'}</div></div>`;
  },
  note(id){return head(id,'','')+`<div class="pp-tb"><div class="pp-note"><textarea spellcheck="false" placeholder="Scrivi qui…" data-own="text">${esc(P.tiles[id].text||'')}</textarea></div></div>`;},
  shot(id){const s=shotByName(P.tiles[id].shot);
    return (s?`<div class="pp-solo" style="background-image:url('${s.url}')"></div>`:'<div class="pp-solo" style="background:repeating-linear-gradient(135deg,var(--s-well) 0 12px,var(--s-row) 12px 13px)"></div>')+head(id,'','')+
      `<div class="pp-cap"><b>${esc(P.tiles[id].shot||'')}</b>${s?`<span class="pp-mono" style="color:var(--s-dim)">${ago(s.mtime)}</span>`:'<span class="pp-mono" style="color:var(--s-err)">non trovata</span>'}<span class="pp-grow"></span>${s?`<button class="pp-btn sm" data-do="zoom">${svg('zoom',13)}</button>`:''}</div>`;},
  link(id){const l=P.tiles[id];return head(id,'','')+`<div class="pp-tb"><div class="pp-ln"><span class="ic">${svg('link',15)}</span><div style="flex:1;min-width:0"><b><input class="pp-field" data-own="title" value="${esc(l.title)}" maxlength="80"></b><small><input class="pp-field" data-own="url" value="${esc(l.url)}" placeholder="https://…" spellcheck="false"></small></div><button class="pp-btn sm" data-do="openlink" title="Apri in una scheda">${svg('open',13)}</button></div></div>`;},
  file(id){const r=P.tiles[id].rel;return head(id,'','')+`<div class="pp-tb"><div class="pp-ln"><span class="ic">${svg(fileIcon(r),15)}</span><div style="flex:1;min-width:0"><b style="font-weight:600;font-size:14px">${esc(baseName(r))}</b><small style="display:block;font:10.5px var(--pm);color:var(--s-dim)">${esc(dirName(r)||'.')}</small></div></div>
    <div class="pp-acts"><button class="pp-btn sm" data-do="openrel">Apri</button><button class="pp-btn sm" data-do="reveal">Cartella</button></div></div>`;}
};
const hostOf=u=>{try{return new URL(u).hostname.replace(/^www\./,'');}catch{return u;}};
/* Firma dei dati di un riquadro dinamico: si ridisegna solo se cambia (lo stato arriva molte volte al secondo) */
function sigOf(id){
  const t=typeOf(id);
  if(t==='hero')return JSON.stringify([D.commands.map(c=>[c.status,c.phase,c.phaseLabel,c.url,c.network,c.ports,c.error?.text,c.warning?.text,c.ready]),D.project.status,D.kind?.label,D.kind?.engine,D.kind?.changedToday,(D.kind?.actions||[]).map(a=>a.label),P.cover,D.shots[0]?.name,P.tasks.length,P.tasks.filter(x=>x.done).length,linksOf(id).length]);
  if(t==='files')return JSON.stringify([D.kind?.recent,D.kind?.scanning,linksOf(id).length]);
  if(t==='stream')return JSON.stringify([D.commands.map(c=>[c.status,c.phaseLabel,c.url,c.error?.text]),(D.kind?.recent||[]).slice(0,4),D.shots.slice(0,3).map(s=>s.name),P.tasks.filter(x=>x.doneAt).length,Math.floor(Date.now()/60000),linksOf(id).length]);
  if(t==='res')return JSON.stringify([D.resources,D.kind?.panels,(D.kind?.actions||[]).map(a=>a.id),linksOf(id).length]);
  if(t==='shots')return JSON.stringify([D.shots.map(s=>s.name+s.mtime),galSel,P.cover,linksOf(id).length]);
  if(t==='shot')return JSON.stringify([P.tiles[id].shot,!!shotByName(P.tiles[id].shot),linksOf(id).length]);
  return null;
}
function refreshDynamic(){
  for(const id of Object.keys(P.tiles)){const s=sigOf(id);if(s===null||s===sigs[id])continue;
    const el=tileEl(id);if(!el)continue;
    if(el.contains(document.activeElement)&&document.activeElement.matches('input,textarea,select'))continue;  // non disturbare chi scrive
    sigs[id]=s;fill(el,id);}
}
const tileEl=id=>E.tiles.querySelector(`[data-id="${CSS.escape(id)}"]`);

function renderAll(){
  E.tiles.innerHTML='';E.areas.innerHTML='';
  for(const [id,a] of Object.entries(P.areas)){const el=document.createElement('div');el.className='pp-area';el.dataset.id=id;
    el.innerHTML=`<div class="pp-ah">${svg('area',14)}<input value="${esc(a.t)}" maxlength="60"><button title="Togli l'area (i riquadri restano)">${svg('close',13)}</button></div><span class="pp-rs"></span>`;
    E.areas.appendChild(el);place(el,a);wireArea(el,id);}
  for(const id of Object.keys(P.tiles)){const el=document.createElement('section');el.className='pp-tile t-'+typeOf(id);el.dataset.id=id;
    E.tiles.appendChild(el);place(el,P.tiles[id]);sigs[id]=sigOf(id);fill(el,id);}
  tapeColors();drawWires();applyFilter();sigs.meta=null;
}
function place(el,p){el.style.left=p.x+'px';el.style.top=p.y+'px';el.style.width=p.w+'px';el.style.height=p.h+'px';}
function fill(el,id){
  el.innerHTML=BODY[typeOf(id)](id)+'<span class="pp-port t" data-s="t"></span><span class="pp-port r" data-s="r"></span><span class="pp-port b" data-s="b"></span><span class="pp-port l" data-s="l"></span><span class="pp-rs"></span>';
  wireTile(el,id);
  if(selTile===id)el.classList.add('sel');
}
const refill=id=>{const el=tileEl(id);if(el){sigs[id]=sigOf(id);fill(el,id);}};
function tapeColors(){E.areas.querySelectorAll('.pp-area').forEach(el=>{const a=P.areas[el.dataset.id];if(!a)return;const c=wireColor(a.c);el.style.setProperty('--ac',c);
  el.style.setProperty('--on-ac',onColor(c));el.querySelector('input').style.setProperty('--lw',Math.max(60,a.t.length*7.6+12)+'px');});}
function onColor(hex){const m=/^#?([0-9a-f]{6})$/i.exec(hex);if(!m)return '#111';const [r,g,b]=[0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));
  const L=.2126*r+.7152*g+.0722*b;return 1.05/(L+.05)>=3?'#fff':'#111';}

/* ── Fili: cavi morbidi che pendono un po', con la spina alle due estremità ── */
function anchors(a,b){const ca={x:a.x+a.w/2,y:a.y+a.h/2},cb={x:b.x+b.w/2,y:b.y+b.h/2},dx=cb.x-ca.x,dy=cb.y-ca.y;
  const gx=dx>0?b.x-(a.x+a.w):a.x-(b.x+b.w),gy=dy>0?b.y-(a.y+a.h):a.y-(b.y+b.h);
  if(gx>=gy)return dx>0?[{x:a.x+a.w,y:ca.y,n:[1,0]},{x:b.x,y:cb.y,n:[-1,0]}]:[{x:a.x,y:ca.y,n:[-1,0]},{x:b.x+b.w,y:cb.y,n:[1,0]}];
  return dy>0?[{x:ca.x,y:a.y+a.h,n:[0,1]},{x:cb.x,y:b.y,n:[0,-1]}]:[{x:ca.x,y:a.y,n:[0,-1]},{x:cb.x,y:b.y+b.h,n:[0,1]}];}
function geo(p,q){const dist=Math.hypot(q.x-p.x,q.y-p.y),k=Math.max(50,dist*.4),sag=Math.min(110,dist*.22);
  const P1={x:p.x+p.n[0]*k,y:p.y+p.n[1]*k+sag},P2={x:q.x+q.n[0]*k,y:q.y+q.n[1]*k+sag};
  return {d:`M${p.x},${p.y} C${P1.x},${P1.y} ${P2.x},${P2.y} ${q.x},${q.y}`,mid:{x:.125*p.x+.375*P1.x+.375*P2.x+.125*q.x,y:.125*p.y+.375*P1.y+.375*P2.y+.125*q.y}};}
function plug(p,c,g){const x=p.x+p.n[0]*7,y=p.y+p.n[1]*7,w=p.n[0]?14:10,h=p.n[0]?10:14;return `<rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="2" fill="${g}" stroke="${c}" stroke-width="2"/>`;}
function drawWires(){
  if(!P)return;
  const ground=tok('--s-ground'),cols=[0,1,2,3,4].map(wireColor);let s='',lab='';
  P.links.forEach((l,i)=>{const A=box(l.a),B=box(l.b);if(!A||!B)return;const [p,q]=anchors(A,B),g=geo(p,q),c=cols[l.c]||cols[0];
    const lit=hoverId&&(l.a===hoverId||l.b===hoverId),dim=filter!=='all'&&!(match(l.a)&&match(l.b));
    s+=`<g data-i="${i}" class="${lit?'lit':''}${selWire===i?' sel':''}${dim?' dim':''}"><path class="w0" d="${g.d}"/><path class="w" d="${g.d}" stroke="${c}"/><path class="hit" d="${g.d}"/>${plug(p,c,ground)}${plug(q,c,ground)}</g>`;
    if(l.t)lab+=`<span class="pp-wl" data-i="${i}" style="left:${g.mid.x}px;top:${g.mid.y}px;color:${c}">${esc(l.t)}</span>`;});
  if(temp)s+=`<path class="tempw" d="${geo(temp.p,temp.q).d}"/>`;
  E.wires.innerHTML=s;E.labels.innerHTML=lab;
  E.wires.querySelectorAll('g[data-i]').forEach(g=>g.addEventListener('click',e=>{e.stopPropagation();pickWire(+g.dataset.i);}));
  E.labels.querySelectorAll('.pp-wl').forEach(x=>x.addEventListener('click',e=>{e.stopPropagation();pickWire(+x.dataset.i);}));
  drawMini();
}
function addLink(a,b){if(!a||!b||a===b||!P.tiles[a]||!P.tiles[b])return;
  if(P.links.some(l=>l.a===a&&l.b===b||l.a===b&&l.b===a)){flash(a);return;}
  P.links.push({a,b,t:'',c:P.links.length%5});drawWires();refill(a);refill(b);save();pickWire(P.links.length-1);}
function pickWire(i){const l=P.links[i];if(!l)return;selWire=i;selectTile(null);E.wlab.value=l.t||'';
  E.wsw.innerHTML=[0,1,2,3,4].map(c=>`<button class="sw${c===l.c?' on':''}" data-c="${c}" style="background:${wireColor(c)}"></button>`).join('');
  E.wsw.querySelectorAll('.sw').forEach(b=>b.onclick=()=>{l.c=+b.dataset.c;pickWire(i);drawWires();save();});
  E.wbar.classList.add('on');drawWires();placeWbar();}
function placeWbar(){if(selWire==null||!P.links[selWire])return E.wbar.classList.remove('on');const l=P.links[selWire];if(!box(l.a)||!box(l.b))return;
  const [p,q]=anchors(box(l.a),box(l.b)),m=geo(p,q).mid,r=root.getBoundingClientRect();
  E.wbar.style.left=Math.max(8,Math.min(r.width-330,view.x+m.x*view.z-150))+'px';E.wbar.style.top=Math.min(r.height-50,view.y+m.y*view.z+18)+'px';}
function dropWire(){if(selWire==null&&!E.wbar.classList.contains('on'))return;selWire=null;E.wbar.classList.remove('on');drawWires();}

/* ── Interazioni dei riquadri ── */
function selectTile(id){selTile=id;E.tiles.querySelectorAll('.pp-tile').forEach(t=>t.classList.toggle('sel',t.dataset.id===id));drawMini();}
function lightUp(id){hoverId=id;const set=new Set(id?linksOf(id).flatMap(l=>[l.a,l.b]):[]);
  E.tiles.querySelectorAll('.pp-tile').forEach(t=>t.classList.toggle('lit',!!id&&t.dataset.id!==id&&set.has(t.dataset.id)));drawWires();}
function toWorld(cx,cy){const r=E.view.getBoundingClientRect();return {x:(cx-r.left-view.x)/view.z,y:(cy-r.top-view.y)/view.z};}
function local(cx,cy){const r=root.getBoundingClientRect();return {x:cx-r.left,y:cy-r.top};}
function wireTile(el,id){
  const T=P.tiles[id],type=typeOf(id);
  el.onpointerenter=()=>lightUp(id);el.onpointerleave=()=>lightUp(null);
  el.onpointerdown=e=>{
    if(tool==='link'){e.stopPropagation();e.preventDefault();linkClick(id);return;}
    if(e.button!==0||e.target.closest('.pp-port,.pp-rs,button,input,textarea,select,a,label,.pp-thumb,.pp-f,[data-feat],.pp-re'))return;
    if(tool==='pan'||space)return;
    selectTile(id);dropWire();
    if(e.target.closest('.pp-th')||['shot','link','file'].includes(type))moveTile(e,id,el);
  };
  el.querySelector('[data-tool=remove]').onclick=()=>{delete P.tiles[id];P.links=P.links.filter(l=>l.a!==id&&l.b!==id);if(selTile===id)selTile=null;renderAll();save();};
  el.querySelector('[data-tool=size]').onclick=e=>sizeMenu(e,id);
  el.querySelectorAll('.pp-port').forEach(p=>p.addEventListener('pointerdown',e=>dragLink(e,id,p.dataset.s)));
  el.querySelector('.pp-rs').addEventListener('pointerdown',e=>resize(e,T,el,drawWires));
  el.ondblclick=e=>{if(type==='shot'&&!e.target.closest('button'))act('boardOpenShot',{kind:D.mode,key:String(D.gk),name:T.shot});};
  el.querySelectorAll('[data-own]').forEach(f=>f.addEventListener('input',()=>{T[f.dataset.own]=f.value;save();}));
  const ta=el.querySelector('[data-k=notes]');if(ta)ta.addEventListener('input',()=>saveNotes(ta.value));
  el.querySelectorAll('[data-do]').forEach(b=>b.onclick=e=>{e.stopPropagation();doAction(b.dataset.do,id,b);});
  if(type==='tasks'){
    el.querySelectorAll('.pp-task').forEach(li=>{const i=+li.dataset.i;
      li.querySelector('input').addEventListener('change',e=>{const t=P.tasks[i];t.done=e.target.checked;if(t.done)t.doneAt=Date.now();else delete t.doneAt;refill('tasks');refreshDynamic();save();});
      li.querySelector('.del').addEventListener('click',e=>{e.preventDefault();P.tasks.splice(i,1);refill('tasks');refreshDynamic();save();});});
    el.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const inp=e.target.querySelector('input'),v=inp.value.trim();if(!v)return;
      P.tasks.push({t:v.slice(0,300),tag:e.target.querySelector('select').value,done:false});refill('tasks');refreshDynamic();save();tileEl('tasks')?.querySelector('.pp-add input')?.focus();});
  }
  if(type==='shots'){
    el.querySelectorAll('.pp-thumb[data-n]').forEach(t=>{t.onclick=()=>{galSel=t.dataset.n;refill('shots');};
      t.addEventListener('pointerdown',e=>pullOut(e,()=>({type:'shot',data:{shot:t.dataset.n}}),t));});
    const f=el.querySelector('[data-feat]');if(f)f.onclick=e=>{if(!e.target.closest('button'))lightbox((shotByName(galSel)||coverShot())?.url);};
    el.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('Files')){e.preventDefault();e.stopPropagation();el.classList.add('over');}});
    el.addEventListener('dragleave',()=>el.classList.remove('over'));
    el.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();el.classList.remove('over');addImages(e.dataTransfer.files,null);});
  }
  if(type==='files')el.querySelectorAll('.pp-f').forEach(f=>{f.onclick=()=>act('projectOpenRel',{rel:f.dataset.rel});
    f.addEventListener('pointerdown',e=>pullOut(e,()=>({type:'file',data:{rel:f.dataset.rel}}),f));});
  extraWire(el,id,type);
}
function doAction(what,id,btn){
  const T=P.tiles[id];
  if(what==='preview')act('projectOpenPreview');
  else if(what==='panel')act('openSidePanel',{panel:'project'});
  else if(what==='engine')act('projectTypeAction',{id:'engine'});
  else if(what==='upload')chooseShots(null);
  else if(what==='rescan')act('projectRescan');
  else if(what==='cover'){const s=shotByName(galSel)||coverShot();if(s){P.cover=s.name;refreshDynamic();refill('shots');save();flash('hero');}}
  else if(what==='pull'){const s=shotByName(galSel)||coverShot();if(s){const nid=newTile('shot',{shot:s.name},T.x+T.w+72,T.y);addLink(id,nid);}}
  else if(what==='zoom')lightbox(shotByName(T.shot)?.url);
  else if(what==='openlink'){if(/^https?:\/\//i.test(T.url||''))openQuick({u:T.url,n:T.title,w:'scheda'});else flash(id);}
  else if(extraAction(what,id,btn))return;
  else if(what==='openrel')act('projectOpenRel',{rel:T.rel});
  else if(what==='reveal')act('projectRevealRel',{rel:T.rel});
}
function moveTile(e,id,el){e.preventDefault();const T=P.tiles[id],s=toWorld(e.clientX,e.clientY),ox=s.x-T.x,oy=s.y-T.y;el.classList.add('moving');moving=true;
  const mv=ev=>{const p=toWorld(ev.clientX,ev.clientY);T.x=snapv(p.x-ox);T.y=snapv(p.y-oy);place(el,T);drawWires();placeWbar();};
  const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);el.classList.remove('moving');moving=false;save();};
  addEventListener('pointermove',mv);addEventListener('pointerup',up);}
function resize(e,T,el,after){e.preventDefault();e.stopPropagation();const s=toWorld(e.clientX,e.clientY),w0=T.w,h0=T.h;moving=true;
  const mv=ev=>{const p=toWorld(ev.clientX,ev.clientY);T.w=Math.max(216,snapv(w0+p.x-s.x));T.h=Math.max(96,snapv(h0+p.y-s.y));place(el,T);after&&after();};
  const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);moving=false;save();};
  addEventListener('pointermove',mv);addEventListener('pointerup',up);}
function tileAt(cx,cy,not){const n=document.elementsFromPoint(cx,cy).find(x=>x.classList?.contains('pp-tile')&&x.dataset.id!==not);return n?.dataset.id;}
function dragLink(e,from,side){e.preventDefault();e.stopPropagation();root.classList.add('linking');const A=box(from);
  const start={t:{x:A.x+A.w/2,y:A.y,n:[0,-1]},b:{x:A.x+A.w/2,y:A.y+A.h,n:[0,1]},l:{x:A.x,y:A.y+A.h/2,n:[-1,0]},r:{x:A.x+A.w,y:A.y+A.h/2,n:[1,0]}}[side];
  let over=null;
  const mark=o=>{if(o===over)return;if(over)tileEl(over)?.classList.remove('target');over=o;if(over)tileEl(over)?.classList.add('target');};
  const mv=ev=>{const p=toWorld(ev.clientX,ev.clientY),dx=p.x-start.x,dy=p.y-start.y;temp={p:start,q:{x:p.x,y:p.y,n:Math.abs(dx)>Math.abs(dy)?[-Math.sign(dx)||-1,0]:[0,-Math.sign(dy)||-1]}};mark(tileAt(ev.clientX,ev.clientY,from));drawWires();};
  const up=ev=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);root.classList.remove('linking');const target=over;mark(null);
    if(target){temp=null;addLink(from,target);return;}
    const p=toWorld(ev.clientX,ev.clientY);if(Math.hypot(p.x-start.x,p.y-start.y)<60){temp=null;drawWires();return;}
    createMenu(ev.clientX,ev.clientY,p,from);};   // rilasciato sul vuoto: «Cosa vuoi creare?»
  addEventListener('pointermove',mv);addEventListener('pointerup',up);}
function linkClick(id){if(!linkFrom){linkFrom=id;selectTile(id);hint('Ora clicca il riquadro da collegare · Esc per annullare');return;}
  addLink(linkFrom,id);linkFrom=null;selectTile(null);hint('Clicca il primo riquadro da collegare');}
function hint(t){E.hint.textContent=t||'';E.hint.classList.toggle('on',!!t);}
/* Trascinare fuori una miniatura o un file: diventa un riquadro sulla tela, collegato alla sua origine */
function pullOut(e,make,src){if(e.button!==0||tool!=='sel')return;const sx=e.clientX,sy=e.clientY,from=src.closest('.pp-tile').dataset.id;let gh=null;
  const mv=ev=>{if(!gh&&Math.hypot(ev.clientX-sx,ev.clientY-sy)<12)return;
    if(!gh){gh=src.cloneNode(true);Object.assign(gh.style,{position:'absolute',zIndex:60,pointerEvents:'none',width:src.offsetWidth+'px',height:src.offsetHeight+'px',opacity:.9,transform:'rotate(2deg)'});root.appendChild(gh);}
    const l=local(ev.clientX,ev.clientY);gh.style.left=l.x-20+'px';gh.style.top=l.y-20+'px';};
  const up=ev=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);if(!gh)return;gh.remove();
    if(tileAt(ev.clientX,ev.clientY)===from)return;const p=toWorld(ev.clientX,ev.clientY),m=make(),nid=newTile(m.type,m.data,p.x-60,p.y-30);addLink(from,nid);};
  addEventListener('pointermove',mv);addEventListener('pointerup',up);}
function newTile(type,data,x,y){const id=type+'-'+(++P.n),[w,h]=SIZES[type];P.tiles[id]=Object.assign({x:snapv(x),y:snapv(y),w,h},data);
  const el=document.createElement('section');el.className='pp-tile t-'+type;el.dataset.id=id;E.tiles.appendChild(el);place(el,P.tiles[id]);sigs[id]=sigOf(id);fill(el,id);
  applyFilter();save();flash(id);selectTile(id);sigs.meta=null;return id;}
function addSingle(type,x,y){const [w,h]=SIZES[type];P.tiles[type]={x:snapv(x),y:snapv(y),w,h};
  const el=document.createElement('section');el.className='pp-tile t-'+type;el.dataset.id=type;E.tiles.appendChild(el);place(el,P.tiles[type]);sigs[type]=sigOf(type);fill(el,type);
  applyFilter();save();flash(type);sigs.meta=null;}
function flash(id){tileEl(id)?.animate([{outline:'3px solid '+tok('--s-sig'),outlineOffset:'3px'},{outline:'3px solid transparent',outlineOffset:'3px'}],{duration:900});}
function lightbox(url){if(!url)return;E.lb.querySelector('img').src=url;E.lb.classList.add('on');}

/* ── Aree ── */
function wireArea(el,id){const a=P.areas[id],h=el.querySelector('.pp-ah'),inp=h.querySelector('input');
  inp.addEventListener('input',()=>{a.t=inp.value;inp.style.setProperty('--lw',Math.max(60,a.t.length*7.6+12)+'px');save();});
  h.querySelector('button').onclick=()=>{delete P.areas[id];renderAll();save();};
  h.addEventListener('pointerdown',e=>{if(e.target.closest('input,button')||tool!=='sel'||e.button!==0)return;e.preventDefault();moving=true;
    const inside=Object.entries(P.tiles).filter(([,t])=>t.x+t.w/2>a.x&&t.x+t.w/2<a.x+a.w&&t.y+t.h/2>a.y&&t.y+t.h/2<a.y+a.h).map(([k])=>k);
    const s=toWorld(e.clientX,e.clientY),o={x:a.x,y:a.y},start=inside.map(k=>[k,P.tiles[k].x,P.tiles[k].y]);
    const mv=ev=>{const p=toWorld(ev.clientX,ev.clientY),dx=snapv(o.x+p.x-s.x)-o.x,dy=snapv(o.y+p.y-s.y)-o.y;a.x=o.x+dx;a.y=o.y+dy;place(el,a);
      for(const [k,x,y] of start){P.tiles[k].x=x+dx;P.tiles[k].y=y+dy;place(tileEl(k),P.tiles[k]);}drawWires();};
    const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);moving=false;save();};
    addEventListener('pointermove',mv);addEventListener('pointerup',up);});
  el.querySelector('.pp-rs').addEventListener('pointerdown',e=>resize(e,a,el,null));}
function addArea(c){const id='area-'+(++P.n);P.areas[id]={x:snapv(c.x-300),y:snapv(c.y-200),w:600,h:400,t:'Nuova area',c:P.n%5};renderAll();save();
  setTimeout(()=>{const i=E.areas.querySelector(`[data-id="${id}"] input`);if(i){i.focus();i.select();}},30);}

/* ── Menu ── */
function placeMenu(m,anchorRect,below=true){const r=root.getBoundingClientRect();m.style.left='0px';m.style.top='0px';m.classList.add('on');
  const mr=m.getBoundingClientRect();let x=anchorRect.left-r.left,y=below?anchorRect.bottom-r.top+6:anchorRect.top-r.top-mr.height-8;
  if(y+mr.height>r.height-8)y=anchorRect.top-r.top-mr.height-8;
  m.style.left=Math.max(8,Math.min(r.width-mr.width-8,x))+'px';m.style.top=Math.max(8,y)+'px';}
function sizeMenu(e,id){e.stopPropagation();const m=E.sizeMenu,cur=P.tiles[id],ch=SIZE_CHOICES[typeOf(id)];
  m.innerHTML=ch.map(s=>`<button data-s="${s}">${svg(s[0]===cur.w&&s[1]===cur.h?'check':'size',15)}${s[0]} × ${s[1]}</button>`).join('');
  placeMenu(m,e.currentTarget.getBoundingClientRect());
  m.querySelectorAll('button').forEach(b=>b.onclick=()=>{const [w,h]=b.dataset.s.split(',').map(Number);Object.assign(P.tiles[id],{w,h});place(tileEl(id),P.tiles[id]);drawWires();save();m.classList.remove('on');});}
const ADD=[['note','note','Nota','tante'],['shot','image','Screenshot','dal PC'],['link','link','Link','tanti'],['area','area','Area','raggruppa'],
  ['hero','server','Stato del progetto','uno'],['tasks','task','Attività','uno'],['shots','gallery','Cartella screenshot','uno'],['files','files','File recenti','uno'],
  ['stream','stream','Cronologia','uno'],['notes','note','Note del progetto','uno'],['res','bookmark','Risorse','uno']];
function center(){const r=E.view.getBoundingClientRect();return toWorld(r.left+r.width/2,r.top+r.height/2);}
function addMenu(anchor){const m=E.menu;
  m.innerHTML=ADD.map(([k,i,n,s])=>{const has=SINGLE.includes(k)&&P.tiles[k];return `<button data-k="${k}"${has?' disabled':''}>${svg(i,15)}${n}<small>${has?'c\'è già':s}</small></button>`;}).join('');
  placeMenu(m,anchor.getBoundingClientRect(),anchor.closest('.pp-dock')?false:true);
  m.querySelectorAll('button:not([disabled])').forEach(b=>b.onclick=()=>{m.classList.remove('on');const k=b.dataset.k,c=center();
    if(k==='shot')return chooseShots(c);if(k==='area')return addArea(c);
    if(SINGLE.includes(k)){const [w,h]=SIZES[k];addSingle(k,c.x-w/2,c.y-h/2);return;}
    const id=newTile(k,k==='timer'?{timer:{label:'Timer',mode:'down',secs:300,left:300,run:false}}:k==='note'?{text:''}:{title:'Nuovo link',url:''},c.x-150,c.y-60);
    setTimeout(()=>tileEl(id)?.querySelector(k==='note'?'textarea':'[data-own=url]')?.focus(),30);});}
/* «Cosa vuoi creare?»: appare dove rilasci il filo sul vuoto; si può scrivere per cercare (Invio = il primo). */
const CREATE=[['Contenuti','note','note','Nota','testo libero'],['Contenuti','shot-pick','image','Screenshot del progetto','scegli ›'],['Contenuti','shot-pc','upload','Screenshot dal PC','sfoglia'],
  ['Contenuti','file-pick','file','File','scegli ›'],['Contenuti','link','link','Link','sito o pagina'],
  ['Contenitori','shots','gallery','Cartella screenshot','galleria'],['Contenitori','files','files','File recenti','elenco'],['Contenitori','tasks','task','Attività','lista'],
  ['Contenitori','res','bookmark','Risorse','collegamenti'],['Contenitori','stream','stream','Cronologia','eventi'],['Contenitori','notes','note','Note del progetto','note.md'],['Contenitori','hero','server','Stato del progetto','server']];
function createMenu(cx,cy,p,from){const m=E.cmenu,A=box(from),dx=p.x-(A.x+A.w/2),dy=p.y-(A.y+A.h/2);
  const at=(w,h)=>Math.abs(dx)>Math.abs(dy)?{x:dx>0?p.x:p.x-w,y:p.y-Math.min(h/2,60)}:{x:p.x-w/2,y:dy>0?p.y:p.y-h};
  const close=()=>{m.classList.remove('on');temp=null;drawWires();document.removeEventListener('pointerdown',outside,true);removeEventListener('keydown',key,true);};
  const outside=e=>{if(!e.target.closest('.pp-cmenu'))close();};
  const make=(type,data)=>{close();const [w,h]=SIZES[type],q=at(w,h),nid=newTile(type,data,q.x,q.y);addLink(from,nid);
    if(type==='note')setTimeout(()=>tileEl(nid)?.querySelector('textarea')?.focus(),30);if(type==='link')setTimeout(()=>tileEl(nid)?.querySelector('[data-own=url]')?.focus(),30);};
  const pick=k=>{
    if(k==='timer')return make('timer',{timer:{label:'Timer',mode:'down',secs:300,left:300,run:false}});
    if(k==='note')return make('note',{text:''});
    if(k==='link')return make('link',{title:'Nuovo link',url:''});
    if(k==='shot-pc'){close();const [w,h]=SIZES.shot,q=at(w,h);return chooseShots({x:q.x+w/2,y:q.y+h/2},from);}
    if(k==='shot-pick')return sub('Screenshot del progetto',D.shots.length?`<div class="pp-cm-shots">${D.shots.slice(0,40).map((s,i)=>`<button data-i="${i}" title="${esc(s.name)}" style="background-image:url('${s.url}')"></button>`).join('')}</div>`:'<div class="pp-empty" style="padding:12px">Nessuno screenshot nel progetto.</div>',
      b=>make('shot',{shot:D.shots[+b.dataset.i].name}));
    if(k==='file-pick'){const rec=D.kind?.recent||[];return sub('File',rec.length?`<div class="pp-cm-list">${rec.map((f,i)=>`<button data-i="${i}">${svg(fileIcon(f.rel),15)}${esc(baseName(f.rel))}<small>${esc(f.ago||'')}</small></button>`).join('')}</div>`:'<div class="pp-empty" style="padding:12px">Nessun file recente.</div>',
      b=>make('file',{rel:rec[+b.dataset.i].rel}));}
    if(P.tiles[k]){close();addLink(from,k);flash(k);return;}   // contenitore già sulla tela: lo collego
    const [w,h]=SIZES[k],q=at(w,h);close();addSingle(k,q.x,q.y);addLink(from,k);};
  function list(f=''){const items=CREATE.filter(c=>!f||c[3].toLowerCase().includes(f.toLowerCase()));let g='';
    m.querySelector('.pp-cm-body').innerHTML=items.map(([sec,k,i,n,s])=>{const has=SINGLE.includes(k)&&P.tiles[k],h=sec!==g?`<div class="pp-cm-sec">${(g=sec)}</div>`:'';
      return h+`<button data-k="${k}">${svg(i,15)}${n}<small>${has?'collega quello che c\'è':s}</small></button>`;}).join('')||'<div class="pp-empty" style="padding:12px">Niente con questo nome.</div>';
    m.querySelectorAll('.pp-cm-body [data-k]').forEach((b,i)=>{b.onclick=()=>pick(b.dataset.k);if(i===0)b.classList.add('first');});}
  function sub(title,html,onPick){m.querySelector('.pp-cm-head').innerHTML=`<button class="b" data-back>${svg('back',15)}</button><b>${title}</b>`;
    m.querySelector('.pp-cm-body').innerHTML=html;m.querySelector('[data-back]').onclick=()=>{headIn();list();};
    m.querySelectorAll('.pp-cm-body [data-i]').forEach(b=>b.onclick=()=>onPick(b));}
  function headIn(){m.querySelector('.pp-cm-head').innerHTML=`${svg('plus',15)}<input placeholder="Cosa vuoi creare?">`;const inp=m.querySelector('input');inp.oninput=()=>list(inp.value);setTimeout(()=>inp.focus(),0);}
  const key=e=>{if(e.key==='Escape'){e.stopPropagation();e.preventDefault();close();}else if(e.key==='Enter'){const f=m.querySelector('.pp-cm-body .first');if(f){e.preventDefault();f.click();}}};
  m.innerHTML='<div class="pp-cm-head"></div><div class="pp-cm-body"></div>';headIn();list();
  const l=local(cx,cy),r=root.getBoundingClientRect();m.classList.add('on');const mr=m.getBoundingClientRect();
  m.style.left=Math.max(8,Math.min(l.x+8,r.width-mr.width-12))+'px';m.style.top=Math.max(60,Math.min(l.y-20,r.height-mr.height-12))+'px';
  setTimeout(()=>{document.addEventListener('pointerdown',outside,true);addEventListener('keydown',key,true);},0);}

/* ── Screenshot dal PC: pulsante (Esplora file) o immagini trascinate sulla tela ── */
async function chooseShots(at,linkTo=null){
  const r=await act('boardChooseShots',{kind:D.mode,key:String(D.gk)}).catch(()=>null);
  if(!r?.ok||!r.names?.length||!at)return;
  await waitForShots(r.names);
  r.names.forEach((n,i)=>{const nid=newTile('shot',{shot:n},at.x-228+i*48,at.y-156+i*48);if(linkTo)addLink(linkTo,nid);});
}
function addImages(files,at){
  [...files].filter(f=>f.type.startsWith('image/')).slice(0,12).forEach((f,i)=>{const rd=new FileReader();
    rd.onload=async()=>{const r=await act('boardAddShot',{kind:D.mode,key:String(D.gk),name:f.name,data:rd.result}).catch(()=>null);if(!r?.ok)return;
      galSel=r.name;await waitForShots([r.name]);if(at){newTile('shot',{shot:r.name},at.x-228+i*48,at.y-156+i*48);}else refill('shots');};
    rd.readAsDataURL(f);});
}
/* Lo stato con le immagini nuove arriva subito dopo il salvataggio: aspettiamo che ci siano (al massimo 2 s) */
function waitForShots(names){return new Promise(res=>{const t0=Date.now();const ok=()=>names.every(n=>shotByName(n));(function loop(){if(ok()||Date.now()-t0>2000)return res();setTimeout(loop,80);})();});}

/* ── Tela: muoversi, zoom, filtri, strumenti, tastiera ── */
function applyView(){E.world.style.transform=`translate(${view.x}px,${view.y}px) scale(${view.z})`;
  E.dots.style.backgroundPosition=`${view.x}px ${view.y}px`;E.dots.style.backgroundSize=`${24*view.z}px ${24*view.z}px`;
  E.zl.textContent=Math.round(view.z*100)+'%';drawMini();placeWbar();}
function zoomAt(f,cx,cy){const r=E.view.getBoundingClientRect();cx??=r.width/2;cy??=r.height/2;const z=Math.min(1.6,Math.max(.25,view.z*f));
  view.x=cx-(cx-view.x)*z/view.z;view.y=cy-(cy-view.y)*z/view.z;view.z=z;applyView();saveView();}
let viewTimer=null;function saveView(){clearTimeout(viewTimer);viewTimer=setTimeout(()=>{if(P)save();sigs.meta=null;chrome();},700);}
function bounds(ids,withAreas){const all=[...ids.map(k=>P.tiles[k]).filter(Boolean),...(withAreas?Object.values(P.areas):[])];if(!all.length)return null;
  return {x0:Math.min(...all.map(t=>t.x)),y0:Math.min(...all.map(t=>t.y))-20,x1:Math.max(...all.map(t=>t.x+t.w)),y1:Math.max(...all.map(t=>t.y+t.h))};}
function goTo(b,anim){if(!b)return;const r=E.view.getBoundingClientRect();if(!r.width)return;const pad={l:90,r:40,t:100,b:90};
  const z=Math.max(.25,Math.min(1.2,(r.width-pad.l-pad.r)/(b.x1-b.x0),(r.height-pad.t-pad.b)/(b.y1-b.y0)));
  if(anim){E.world.classList.add('anim');setTimeout(()=>E.world.classList.remove('anim'),500);}
  view={z,x:pad.l+((r.width-pad.l-pad.r)-(b.x1-b.x0)*z)/2-b.x0*z,y:pad.t+((r.height-pad.t-pad.b)-(b.y1-b.y0)*z)/2-b.y0*z};applyView();}
function fit(anim){goTo(bounds(Object.keys(P.tiles),true),anim);}
/* Prima apertura: tutto in vista se si legge, altrimenti almeno al 60% partendo dall'alto a sinistra */
function firstView(){const b=bounds(Object.keys(P.tiles),true);if(!b)return;goTo(b,false);if(view.z>=.6)return;
  view={z:.6,x:90-b.x0*.6,y:100-b.y0*.6};applyView();}
function applyFilter(){E.tiles.querySelectorAll('.pp-tile').forEach(t=>t.classList.toggle('dim',!match(t.dataset.id)));E.areas.querySelectorAll('.pp-area').forEach(a=>a.classList.toggle('dim',filter!=='all'));drawWires();}
function setTool(t){tool=t;linkFrom=null;E.rail.querySelectorAll('[data-tool]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.tool===t));E.view.classList.toggle('pan',t==='pan');
  root.classList.toggle('linking',t==='link');hint(t==='link'?'Clicca il primo riquadro da collegare':'');}
const visible=()=>root&&!root.hidden&&root.offsetParent!==null;

function drawMini(){const cv=E.mini?.querySelector('canvas');if(!cv||!P)return;const g=cv.getContext('2d'),W=cv.width,H=cv.height;g.clearRect(0,0,W,H);
  g.fillStyle=tok('--s-row');g.fillRect(0,0,W,H);const b=bounds(Object.keys(P.tiles),true);if(!b){drawMini.map=null;return;}
  const pad=60,sx=b.x1-b.x0+pad*2,sy=b.y1-b.y0+pad*2,k=Math.min(W/sx,H/sy),ox=(W-sx*k)/2,oy=(H-sy*k)/2,m=(x,y)=>[ox+(x-b.x0+pad)*k,oy+(y-b.y0+pad)*k];
  g.setLineDash([3,3]);g.strokeStyle=tok('--s-edge-2');for(const a of Object.values(P.areas)){const [x,y]=m(a.x,a.y);g.strokeRect(x,y,a.w*k,a.h*k);}g.setLineDash([]);
  g.strokeStyle=tok('--s-dim');g.lineWidth=1;for(const l of P.links){const A=P.tiles[l.a],B=P.tiles[l.b];if(!A||!B)continue;const [x1,y1]=m(A.x+A.w/2,A.y+A.h/2),[x2,y2]=m(B.x+B.w/2,B.y+B.h/2);g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();}
  for(const [id,t] of Object.entries(P.tiles)){const [x,y]=m(t.x,t.y);g.fillStyle=id===selTile?tok('--s-sig'):tok('--s-edge-2');g.fillRect(x,y,Math.max(2,t.w*k),Math.max(2,t.h*k));}
  const r=E.view.getBoundingClientRect(),[vx,vy]=m(-view.x/view.z,-view.y/view.z);g.strokeStyle=tok('--s-sig');g.lineWidth=2;g.strokeRect(vx,vy,r.width/view.z*k,r.height/view.z*k);
  drawMini.map={b,pad,k,ox,oy};}

function wireChrome(){
  E.path.onclick=()=>D.mode==='game'?act('gameOpenFolder',{id:+D.gk}):act('projectOpenFolder');
  E.panelBtn.onclick=()=>act('openSidePanel',{panel:D.mode==='game'?'games':'project'});
  E.bchip.onclick=()=>boardsPanel();
  E.addTop.onclick=e=>{e.stopPropagation();addMenu(E.addTop);};
  E.addDock.onclick=e=>{e.stopPropagation();addMenu(E.addDock);};
  E.zin.onclick=()=>zoomAt(1.15);E.zout.onclick=()=>zoomAt(1/1.15);
  E.focus.onclick=()=>{const id=selTile||lastHover;if(!id||!P.tiles[id])return fit(true);goTo(bounds([...new Set([id,...linksOf(id).flatMap(l=>[l.a,l.b])])]),true);selectTile(id);lightUp(id);saveView();};
  E.chips.querySelectorAll('button').forEach(b=>b.onclick=()=>{E.chips.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));filter=b.dataset.f;applyFilter();});
  E.rail.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
  const ra=n=>E.rail.querySelector(`[data-act=${n}]`);
  ra('add').onclick=e=>{e.stopPropagation();addMenu(ra('add'));};
  ra('note').onclick=()=>{const c=center(),id=newTile('note',{text:''},c.x-156,c.y-108);setTimeout(()=>tileEl(id)?.querySelector('textarea')?.focus(),30);};
  ra('shot').onclick=()=>chooseShots(center());
  ra('area').onclick=()=>addArea(center());
  ra('snap').onclick=e=>{snap=!snap;e.currentTarget.setAttribute('aria-pressed',snap);};
  ra('fit').onclick=()=>{fit(true);saveView();};
  ra('reset').onclick=()=>{if(!confirm('Tornare alla disposizione iniziale? Riquadri, fili e aree tornano come all\'inizio (attività, note e screenshot restano).'))return;
    const keep={tasks:P.tasks,cover:P.cover,notes:P.notes,build:P.build,sessions:P.sessions};P=Object.assign(JSON.parse(JSON.stringify(D.mode==='game'?DEFAULT_GAME:DEFAULT)),keep);renderAll();fit(true);save();};
  E.wlab.addEventListener('input',()=>{const l=P.links[selWire];if(!l)return;l.t=E.wlab.value.slice(0,60);drawWires();save();});
  E.wlab.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key==='Escape')dropWire();});
  E.wrev.onclick=()=>{const l=P.links[selWire];if(!l)return;[l.a,l.b]=[l.b,l.a];drawWires();save();};
  E.wdel.onclick=()=>{const l=P.links.splice(selWire,1)[0];dropWire();if(l){refill(l.a);refill(l.b);}save();};
  E.lb.onclick=()=>E.lb.classList.remove('on');
  root.addEventListener('click',e=>{if(!e.target.closest('.pp-menu,[data-tool=size],[data-r=addTop],[data-r=addDock],[data-act=add]'))root.querySelectorAll('.pp-menu').forEach(m=>m.classList.remove('on'));});
  // Tela
  E.view.addEventListener('wheel',e=>{if(e.target.closest('.pp-tb')&&!e.ctrlKey)return;e.preventDefault();const r=E.view.getBoundingClientRect();
    if(e.ctrlKey)zoomAt(e.deltaY<0?1.1:1/1.1,e.clientX-r.left,e.clientY-r.top);else{view.x-=e.shiftKey?e.deltaY:e.deltaX;view.y-=e.shiftKey?0:e.deltaY;applyView();saveView();}},{passive:false});
  E.view.addEventListener('pointerdown',e=>{const bg=e.target===E.view||e.target===E.world||e.target===E.wires||e.target===E.tiles||e.target===E.areas||e.target===E.dots||e.target.classList.contains('pp-area');
    if(bg&&e.button===0){dropWire();selectTile(null);}
    if(!(bg||tool==='pan'||space||e.button===1))return;if(tool==='link'&&!bg)return;e.preventDefault();let lx=e.clientX,ly=e.clientY;E.view.classList.add('grabbing');
    const mv=ev=>{view.x+=ev.clientX-lx;view.y+=ev.clientY-ly;lx=ev.clientX;ly=ev.clientY;applyView();};
    const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);E.view.classList.remove('grabbing');saveView();};
    addEventListener('pointermove',mv);addEventListener('pointerup',up);});
  E.view.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('Files')){e.preventDefault();E.view.classList.add('drop');}});
  E.view.addEventListener('dragleave',e=>{if(e.target===E.view||!E.view.contains(e.relatedTarget))E.view.classList.remove('drop');});
  E.view.addEventListener('drop',e=>{e.preventDefault();E.view.classList.remove('drop');addImages(e.dataTransfer.files,toWorld(e.clientX,e.clientY));});
  E.tiles.addEventListener('pointerover',e=>{const t=e.target.closest('.pp-tile');if(t)lastHover=t.dataset.id;});
  E.mini.onclick=e=>{const M=drawMini.map;if(!M)return;const cv=E.mini.querySelector('canvas'),r=cv.getBoundingClientRect(),s=cv.width/r.width,px=(e.clientX-r.left)*s,py=(e.clientY-r.top)*s;
    const wx=(px-M.ox)/M.k+M.b.x0-M.pad,wy=(py-M.oy)/M.k+M.b.y0-M.pad,v=E.view.getBoundingClientRect();
    E.world.classList.add('anim');setTimeout(()=>E.world.classList.remove('anim'),500);view.x=v.width/2-wx*view.z;view.y=v.height/2-wy*view.z;applyView();saveView();};
  // Tastiera: solo con la pagina in vista e senza un campo di testo attivo
  addEventListener('keydown',e=>{if(!visible()||e.target.closest?.('input,textarea,select,[contenteditable]')||e.ctrlKey||e.altKey||e.metaKey)return;
    const k=e.key.toLowerCase();
    if(e.code==='Space'){space=true;E.view.classList.add('pan');e.preventDefault();}
    else if(k==='escape'){setTool('sel');dropWire();selectTile(null);root.querySelectorAll('.pp-menu').forEach(m=>m.classList.remove('on'));}
    else if(k==='v')setTool('sel');else if(k==='h')setTool('pan');else if(k==='c')setTool('link');else if(k==='f'){fit(true);saveView();}
    else if(k==='n')ra('note').click();
    else if((k==='delete'||k==='backspace')&&selWire!=null)E.wdel.click();});
  addEventListener('keyup',e=>{if(e.code==='Space'){space=false;if(tool!=='pan')E.view.classList.remove('pan');}});
  addEventListener('resize',()=>{if(visible())drawMini();});
}
let lastHover=null;
/* Disposizione iniziale per «Ripristina» (la stessa di lib/project-page-rules.cjs → defaultPage) */
const DEFAULT={version:1,n:2,tiles:{hero:{x:96,y:144,w:768,h:576},tasks:{x:960,y:144,w:336,h:504},stream:{x:960,y:744,w:336,h:312},files:{x:1416,y:144,w:432,h:360},
  notes:{x:96,y:816,w:432,h:288},shots:{x:624,y:816,w:624,h:408},res:{x:1416,y:600,w:336,h:384}},
  links:[{a:'hero',b:'stream',t:'eventi',c:0},{a:'tasks',b:'files',t:'',c:1}],areas:{'area-1':{x:48,y:96,w:1296,h:1176,t:'Lavoro',c:0}},tasks:[],cover:'',view:null};

/* Il tema cambia le variabili: ridisegniamo fili, nastri e minimappa */
let themeKey='';
function themeChanged(){if(!root||!P)return;const k=tok('--s-sig')+tok('--s-ground')+tok('--s-alt');if(k===themeKey)return;themeKey=k;tapeColors();drawWires();if(selWire!=null)pickWire(selWire);}

/* ══════════ Beta 0.43.3: board (run, stagioni, fasi), etichette e link modificabili, timer, pagina del gioco ══════════ */
const DEFAULT_GAME={version:1,n:3,tiles:{hero:{x:96,y:144,w:768,h:576},tasks:{x:960,y:144,w:336,h:408},'timer-1':{x:960,y:600,w:336,h:192,timer:{label:'Pausa',mode:'down',secs:600,left:600,run:false}},
  'timer-2':{x:960,y:840,w:336,h:192,timer:{label:'Reset settimanale',mode:'until',secs:300,left:300,run:false,day:2,hour:18}},notes:{x:96,y:792,w:384,h:312},shots:{x:528,y:792,w:384,h:360},
  files:{x:1392,y:144,w:384,h:384},stream:{x:1392,y:576,w:384,h:360},res:{x:1872,y:144,w:336,h:408}},
  links:[{a:'hero',b:'stream',t:'storico',c:0},{a:'tasks',b:'timer-1',t:'',c:4},{a:'files',b:'res',t:'',c:1}],areas:{'area-1':{x:48,y:96,w:1296,h:1104,t:'Partita',c:0}},tasks:[],cover:'',view:null};
IP.timer='M12 8v5l3 2M9 3h6M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z';IP.tag='M3 12V4h8l10 10-8 8zM7.5 8.5h.01';IP.edit='M4 20h4L19 9l-4-4L4 16zM14 6l4 4';IP.history='M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 8v4l3 2';
IP.pause='M8 5v14M16 5v14';IP.replay='M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5';IP.stop='M6 6h12v12H6z';IP.gamepad='M6 9h12a4 4 0 0 1 3.9 4.8l-.8 3.6a2.4 2.4 0 0 1-4.3.9L15 16H9l-1.8 2.3a2.4 2.4 0 0 1-4.3-.9l-.8-3.6A4 4 0 0 1 6 9zM8 11v4M6 13h4M16 12h.01M18 14h.01';
IP.archive='M3 5h18v4H3zM5 9v10h14V9M10 13h4';IP.copy='M8 8h12v12H8zM4 16V4h12';IP.list='M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01';
const fileUrl=p=>'file:///'+String(p).replace(/\\/g,'/').split('/').map(encodeURIComponent).join('/').replace(/^file:\/\/\/([a-z])%3A/i,'file:///$1:');
const hm=ms=>{const m=Math.floor(ms/60000);return Math.floor(m/60)+':'+String(m%60).padStart(2,'0');};
const hms=ms=>{const x=Math.floor(ms/1000);return Math.floor(x/3600)+':'+String(Math.floor(x/60)%60).padStart(2,'0')+':'+String(x%60).padStart(2,'0');};
const fmtDur=ms=>{const m=Math.round(ms/60000);return m<60?m+' min':Math.floor(m/60)+' h '+String(m%60).padStart(2,'0')+' min';};
function fmtDay(t){const d=new Date(t),diff=Math.round((new Date().setHours(0,0,0,0)-new Date(t).setHours(0,0,0,0))/86400e3);
  return (diff===0?'Oggi':diff===1?'Ieri':d.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'short'}))+' · '+d.toTimeString().slice(0,5);}
function toast(t){E.toast.textContent=t;E.toast.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>E.toast.classList.remove('on'),3200);}
const kk=()=>({kind:D.mode,key:String(D.gk)});
async function flushSave(){if(!saveTimer)return;clearTimeout(saveTimer);saveTimer=null;P.view={x:Math.round(view.x),y:Math.round(view.y),z:+view.z.toFixed(3)};
  const args={...kk(),board:JSON.stringify(P)};if(indexDirty){args.index=JSON.stringify({tags:IX.tags,quick:IX.quick,presets:IX.presets,lastPreset:IX.lastPreset,boards:IX.boards});indexDirty=false;}
  const r=await act('boardSave',args).catch(()=>null);if(r?.ok)savedRev=r.rev;dirty=false;}

/* Menu «Aggiungi» e «Cosa vuoi creare?»: timer per tutti, nomi del gioco o del progetto */
let menusDone=false;
function menuLabels(){
  if(!menusDone){menusDone=true;ADD.unshift(['timer','timer','Timer','tanti']);CREATE.splice(1,0,['Contenuti','timer','timer','Timer','conto alla rovescia']);}
  const L=LABELS[D.mode||'project'],names={hero:L.hero,tasks:L.tasks,shots:D.mode==='game'?'Catture':'Cartella screenshot',files:L.files,stream:L.stream,notes:L.notes,res:L.res};
  for(const a of ADD)if(names[a[0]])a[2]=names[a[0]];
  for(const c of CREATE)if(names[c[1]])c[3]=names[c[1]];
}

/* ── Etichette (colorate, in comune tra le board) ── */
function tagStyle(n){const t=(IX?.tags||[]).find(t=>t.n===n);if(!t)return '';const c=wireColor(t.c);return `background:${c};color:${onColor(c)}`;}
/* ── Link rapidi (in comune tra le board) ── */
function openQuick(l){
  if(!/^https?:\/\//i.test(l.u||''))return;
  if(l.w==='pannello')act('webPanelAdd',{url:l.u,title:l.n});
  else if(l.w==='companion'&&D.mode==='game')act('gameOpenLink',{id:+D.gk,url:l.u});
  else act('boardOpenTab',{url:l.u});   // Beta 0.43.5: apre la scheda E ci porta
}

/* ── Timer: conto alla rovescia o «fino a» un giorno e un'ora ── */
function nextReset(t){const d=new Date(),r=new Date(d);r.setHours(t.hour??18,0,0,0);r.setDate(d.getDate()+(((t.day??2)-d.getDay()+7)%7));if(r<=d)r.setDate(r.getDate()+7);return r;}
function timerLeft(t){if(t.mode==='until')return Math.max(0,(nextReset(t)-Date.now())/1000);if(t.run&&t.at)return t.left-(Date.now()-t.at)/1000;return t.left;}
function fmtLeft(x,t){if(t.mode==='until'){const d=Math.floor(x/86400),h=Math.floor(x/3600)%24,m=Math.floor(x/60)%60;return d?`${d}g ${h}h`:`${h}:${String(m).padStart(2,'0')}`;}
  x=Math.max(0,Math.ceil(x));return Math.floor(x/60)+':'+String(x%60).padStart(2,'0');}
const DAYS=['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];
BODY.timer=id=>{const t=P.tiles[id].timer,left=timerLeft(t),st=t.mode==='until'?'idle':left<=0?'err':left<=10?'warn':t.run?'ok':'idle';
  return head(id,`<button data-tm="edit" title="Nome e durata">${svg('edit',14)}</button>`,t.label)+`<div class="pp-tb"><div class="pp-tm pp-tm-${st}" data-timer="${id}"><span class="v">${fmtLeft(left,t)}</span>
    ${t.mode==='until'?`<span class="pp-mono sub">${DAYS[t.day??2]} · ${String(t.hour??18).padStart(2,'0')}:00</span>`:`<span class="btns"><button data-tm="toggle" title="Avvia o pausa">${svg(t.run?'pause':'play',17)}</button><button data-tm="reset" title="Ricomincia">${svg('replay',17)}</button></span>`}</div></div>`;};
const beeped=new Set();
setInterval(()=>{if(!P||!root||root.hidden)return;
  for(const [id,tile] of Object.entries(P.tiles)){if(!tile.timer)continue;const t=tile.timer,box=E.tiles.querySelector(`[data-timer="${CSS.escape(id)}"]`);if(!box)continue;
    const left=timerLeft(t);box.querySelector('.v').textContent=fmtLeft(left,t);box.className='pp-tm pp-tm-'+(t.mode==='until'?'idle':left<=0?'err':left<=10?'warn':t.run?'ok':'idle');
    if(t.mode!=='until'&&t.run&&left<=0&&!beeped.has(id)){beeped.add(id);toast(`«${t.label}» è scaduto`);box.animate([{transform:'scale(1)'},{transform:'scale(1.04)'},{transform:'scale(1)'}],{duration:400,iterations:3});}
    if(left>0)beeped.delete(id);}
  const live=E.tiles.querySelector('[data-live=sess]');if(live&&IX?.session)live.textContent=hm(Date.now()-IX.session.start);
  const bar=E.tiles.querySelector('.pp-gbar');if(bar&&IX?.session){const d=Date.now()-IX.session.start;bar.querySelector('i').style.width=Math.min(100,d/(4*3600e3)*100)+'%';bar.querySelector('span').textContent='partita '+hms(d);}
},500);
function editTimer(id){const t=P.tiles[id].timer;
  modal(`<h2>Timer</h2><div class="pp-form">
    <label class="pp-row"><span class="pp-mono">Nome</span><input data-f="label" value="${esc(t.label)}" maxlength="40"></label>
    <div class="pp-row"><span class="pp-mono">Tipo</span><div class="pp-seg"><button data-mode="down" class="${t.mode!=='until'?'on':''}">Conto alla rovescia</button><button data-mode="until" class="${t.mode==='until'?'on':''}">Fino a un giorno e un'ora</button></div></div>
    <label class="pp-row" data-for="down"><span class="pp-mono">Durata</span><input data-f="dur" value="${Math.floor(t.secs/60)}:${String(t.secs%60).padStart(2,'0')}" placeholder="mm:ss"></label>
    <label class="pp-row" data-for="until"><span class="pp-mono">Quando</span><select data-f="day">${DAYS.map((d,i)=>`<option value="${i}"${i===(t.day??2)?' selected':''}>${d}</option>`).join('')}</select><input data-f="hour" type="number" min="0" max="23" value="${t.hour??18}" style="max-width:80px"><span class="pp-mono">:00</span></label>
  </div>`,[['Annulla'],['Salva',true,()=>{const m=E.modal,mode=m.querySelector('.pp-seg .on').dataset.mode,dur=(m.querySelector('[data-f=dur]').value.match(/^(\d+)(?::(\d{1,2}))?$/)||[]);
    t.label=m.querySelector('[data-f=label]').value.trim()||'Timer';t.mode=mode;if(mode==='down'&&dur[1]){t.secs=Math.max(1,+dur[1]*60+ +(dur[2]||0));t.left=t.secs;t.run=false;delete t.at;}
    if(mode==='until'){t.day=+m.querySelector('[data-f=day]').value;t.hour=Math.max(0,Math.min(23,+m.querySelector('[data-f=hour]').value||0));t.run=false;}refill(id);save();}]]);
  const sync=()=>{const mode=E.modal.querySelector('.pp-seg .on').dataset.mode;E.modal.querySelectorAll('[data-for]').forEach(r=>r.hidden=r.dataset.for!==mode);};
  E.modal.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{E.modal.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('on',x===b));sync();});sync();
}

/* ── Riquadri che cambiano: attività/obiettivi con etichette, link rapidi, e quelli del gioco ── */
const _BODY={...BODY};
BODY.tasks=id=>{const done=P.tasks.filter(t=>t.done).length,p=P.tasks.length?Math.round(done/P.tasks.length*100):0;
  return head(id,`<span class="pp-kbd" style="color:var(--s-sig-ink)">${p}%</span><button data-tags title="Gestisci le etichette">${svg('tag',14)}</button>`)+`<div class="pp-tb"><div class="pp-prog"><i style="width:${p}%"></i></div><div class="pp-tasks">${P.tasks.map((x,i)=>`
    <label class="pp-task${x.done?' done':''}" data-i="${i}"><input type="checkbox"${x.done?' checked':''}><div class="t"><span>${esc(x.t)}</span><div class="meta"><button class="pp-tagc" data-tagof="${i}" style="${tagStyle(x.tag)}" title="Cambia etichetta">${esc(x.tag)}</button></div></div>
    <button class="del" title="Elimina">${svg('close',14)}</button></label>`).join('')||`<div class="pp-empty">${D.mode==='game'?'Nessun obiettivo. Scrivine uno qui sotto.':'Nessuna attività. Scrivine una qui sotto.'}</div>`}</div>
    <form class="pp-add">${svg('task',15)}<input placeholder="${D.mode==='game'?'Nuovo obiettivo…':'Nuova attività…'}" maxlength="300"><select>${(IX?.tags||[]).map(t=>`<option>${esc(t.n)}</option>`).join('')}</select><button class="pp-btn sm" type="submit">${svg('plus',13)}</button></form></div>`;};
BODY.res=id=>head(id,`<button data-addlink title="Aggiungi un link">${svg('plus',14)}</button>`)+`<div class="pp-tb"><div class="pp-list">${(IX?.quick||[]).map((l,i)=>`<div class="pp-re" data-li="${i}" title="${esc(l.u)}"><span class="ic">${svg('link',15)}</span><span class="w"><b>${esc(l.n)}</b><small>${esc(hostOf(l.u))}${l.sug?' · suggerito':''}</small></span>
  <span class="pp-kbd">${l.w}</span><span class="re-tools"><button data-le="${i}" title="Modifica">${svg('edit',14)}</button><button data-ld="${i}" title="Togli">${svg('close',14)}</button></span></div>`).join('')||'<div class="pp-empty">Nessun link: aggiungine uno col +.</div>'}</div></div>`;
BODY.hero=id=>D.mode==='game'?gameHero(id):_BODY.hero(id);
BODY.shots=id=>D.mode==='game'?gameShots(id):_BODY.shots(id);
BODY.files=id=>D.mode==='game'?gameConfig(id):_BODY.files(id);
BODY.stream=id=>D.mode==='game'?gameHistory(id):_BODY.stream(id);
const imgShots=()=>D.shots.filter(s=>!s.clip);
function gameHero(id){
  const g=D.game||{},s=IX.session,pr=s?IX.presets?.[s.preset]:null,cov=shotByName(P.cover)||imgShots()[0],tot=P.sessions.reduce((a,x)=>a+x.dur,0),done=P.tasks.filter(t=>t.done).length;
  const dur=s?Date.now()-s.start:0;
  return head(id,s?'<span class="pp-tag ok">In gioco</span>':g.running?'<span class="pp-tag warn">Aperto</span>':'<span class="pp-tag idle">Non in esecuzione</span>','')+`<div class="pp-stage">${cov?`<div class="art" style="background-image:url('${cov.url}')"></div>`:'<div class="noart">La copertina è l\'ultima cattura: aggiungine una</div>'}
    <span class="chip">${esc(g.exe||'')}</span>
    <div class="over"><div style="flex:1;min-width:0"><span class="pp-mono url">${s?`board «${esc(IX.boards[s.board]?.name||'')}» · preset «${esc(pr?.n||'—')}»`+(g.companion?` · companion su ${esc(g.companion)}`:''):P.sessions[0]?'Ultima partita: '+esc(fmtDay(P.sessions[0].start).toLowerCase())+' · '+fmtDur(P.sessions[0].dur):'Nessuna partita su questa board'}</span>
      <h2>${esc(g.name||D.pp.name)}</h2><p>${s?'Partita iniziata alle '+new Date(s.start).toTimeString().slice(0,5):g.watcher?'La partita inizia da sola quando apri il gioco':'Rilevamento dei giochi spento: inizia la partita da qui'}</p></div>
      ${s?`<button class="pp-btn" data-do="gpreset">${svg('list',15)}Preset</button><button class="pp-btn pri" data-do="gstop">${svg('stop',15)}Chiudi partita</button>`:`<button class="pp-btn" data-do="gpreset">${svg('list',15)}Preset</button><button class="pp-btn pri" data-do="gstart">${svg('play',15)}Inizia partita</button>`}</div></div>
    <div class="pp-gbar"><i style="width:${Math.min(100,dur/(4*3600e3)*100)}%"></i><span class="pp-mono">${s?'partita '+hms(dur):'—'}</span></div>
    <div class="pp-metrics">
      <div class="pp-metric"><div class="row pp-mono"><span>Partita</span></div><div class="val" data-live="sess">${s?hm(dur):'—'}</div></div>
      <div class="pp-metric"><div class="row pp-mono"><span>Board</span><span>totale</span></div><div class="val">${hm(tot)}</div></div>
      <div class="pp-metric${P.sessions.length?' ok':''}"><div class="row pp-mono"><span>Partite</span></div><div class="val">${P.sessions.length}</div></div>
      <div class="pp-metric"><div class="row pp-mono"><span>${LABEL.tasks}</span></div><div class="val">${done} / ${P.tasks.length}</div></div></div>`;
}
function gameShots(id){
  const list=D.shots,sel=shotByName(galSel)||list[0];
  const bg=x=>x.clip?'':`background-image:url('${x.url}')`;
  return head(id,`<span class="pp-kbd">${list.length}</span>`)+`<div class="pp-tb">${sel?`<div class="pp-feature${sel.clip?' clip':''}" data-feat><div class="art" style="${bg(sel)}"></div>${sel.clip?'<span class="pp-play">▶</span>':''}
    <div class="bl"><b>${esc(sel.name)}</b><span class="pp-mono" style="opacity:.7">${ago(sel.mtime)}</span><span class="pp-grow"></span>${sel.clip?'':`<button class="pp-btn sm" data-do="cover">${P.cover===sel.name?'In copertina':'Copertina'}</button>`}<button class="pp-btn sm" data-do="pull">${svg('open',13)}</button></div></div>`
    :'<div class="pp-empty">Nessuna cattura. Alla fine di ogni partita VARCO propone quelle fatte (Xbox Game Bar, Steam, NVIDIA); puoi anche aggiungerle col +.</div>'}
    <div class="pp-thumbs">${list.slice(0,40).map(x=>`<div class="pp-thumb${sel&&x.name===sel.name?' on':''}${x.clip?' clip':''}" data-n="${esc(x.name)}" title="${esc(x.name)}" style="${bg(x)}"></div>`).join('')}<button class="pp-thumb up" data-do="upload" title="Aggiungi dal PC">${svg('upload')}</button></div></div>`;
}
function gameConfig(id){
  return head(id,`<button data-addrow title="Aggiungi una riga">${svg('plus',14)}</button>`)+`<div class="pp-tb"><div class="pp-slots">${P.build.map((r,i)=>`<div class="pp-slot"><input class="pp-field pp-mono" data-bk="${i}" value="${esc(r.k)}" placeholder="Voce"><input class="pp-field" data-bv="${i}" value="${esc(r.v)}" placeholder="Valore"><button class="del" data-bd="${i}" title="Togli">${svg('close',12)}</button></div>`).join('')}</div>
    <p class="pp-hint2">Scrivi tu cosa conta in questo gioco: personaggio, classe, armi, agente, seme del mondo…</p></div>`;
}
function gameHistory(id){
  const tot=P.sessions.reduce((a,x)=>a+x.dur,0)+(IX.session&&IX.session.board===IX.current?Date.now()-IX.session.start:0),live=IX.session&&IX.session.board===IX.current;
  const row=(x,i,isLive)=>`<button class="pp-ev pp-evb" ${isLive?'data-live-s':`data-si="${i}"`}><div class="av">${svg(isLive?'play':'gamepad',15)}</div><div class="w"><div class="h"><b>${esc(IX.presets?.[x.p||x.preset]?.n||'Partita')}</b><span class="pp-mono" style="color:var(--s-dim)">${esc(fmtDay(x.start))}</span></div>
    <p>${isLive?'<span style="color:var(--s-sig-ink)">● in corso</span>':fmtDur(x.dur)+' · '+x.caps.length+' catture'+(x.note?' · nota':'')+(x.done?.length?' · '+x.done.length+' fatti':'')}</p></div></button>`;
  return head(id,`<span class="pp-kbd">${P.sessions.length+(live?1:0)} · ${fmtDur(tot)}</span>`)+`<div class="pp-tb"><div class="pp-list">${live?row(IX.session,-1,true):''}${P.sessions.map((x,i)=>row(x,i,false)).join('')||(live?'':'<div class="pp-empty">Ancora nessuna partita su questa board.</div>')}</div></div>`;
}
/* Firma dei riquadri dinamici: progetto come prima, gioco con partita e storico */
function sigOf(id){
  const t=typeOf(id),L=linksOf(id).length;
  if(t==='tasks')return JSON.stringify([IX?.tags,L]);
  if(t==='res')return JSON.stringify([IX?.quick,L]);
  if(D.mode==='game'){
    if(t==='hero')return JSON.stringify([IX.session,IX.boards[IX.current]?.name,D.game,P.cover,imgShots()[0]?.name,P.sessions.length,P.tasks.length,P.tasks.filter(x=>x.done).length,L,IX.session?0:Math.floor(Date.now()/60000)]);
    if(t==='stream')return JSON.stringify([IX.session,P.sessions.length,Math.floor(Date.now()/60000),L]);
    if(t==='shots')return JSON.stringify([D.shots.map(s=>s.name+s.mtime),galSel,P.cover,L]);
    if(t==='shot')return JSON.stringify([P.tiles[id].shot,!!shotByName(P.tiles[id].shot),L]);
    return null;
  }
  if(t==='hero')return JSON.stringify([D.commands.map(c=>[c.status,c.phase,c.phaseLabel,c.url,c.network,c.ports,c.error?.text,c.warning?.text,c.ready]),D.project.status,D.kind?.label,D.kind?.engine,D.kind?.changedToday,(D.kind?.actions||[]).map(a=>a.label),P.cover,D.shots[0]?.name,P.tasks.length,P.tasks.filter(x=>x.done).length,L]);
  if(t==='files')return JSON.stringify([D.kind?.recent,D.kind?.scanning,L]);
  if(t==='stream')return JSON.stringify([D.commands.map(c=>[c.status,c.phaseLabel,c.url,c.error?.text]),(D.kind?.recent||[]).slice(0,4),D.shots.slice(0,3).map(s=>s.name),P.tasks.filter(x=>x.doneAt).length,Math.floor(Date.now()/60000),L]);
  if(t==='shots')return JSON.stringify([D.shots.map(s=>s.name+s.mtime),galSel,P.cover,L]);
  if(t==='shot')return JSON.stringify([P.tiles[id].shot,!!shotByName(P.tiles[id].shot),L]);
  return null;
}

/* ── Collegamenti dei riquadri nuovi ── */
var extraWire=function(el,id,type){
  if(type==='tasks'){
    el.querySelectorAll('[data-tagof]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const i=+b.dataset.tagof;
      pop(b,[...IX.tags.map(t=>({t:t.n,sw:wireColor(t.c),on:t.n===P.tasks[i].tag})),{t:'Gestisci le etichette…',manage:1}],it=>{if(it.manage)return tagEditor();P.tasks[i].tag=it.t;refill('tasks');save();});}));
    const m=el.querySelector('[data-tags]');if(m)m.onclick=e=>{e.stopPropagation();tagEditor();};
  }
  if(type==='res'){
    el.querySelectorAll('[data-li]').forEach(r=>r.onclick=e=>{if(e.target.closest('button'))return;openQuick(IX.quick[+r.dataset.li]);});
    el.querySelectorAll('[data-le]').forEach(b=>b.onclick=e=>{e.stopPropagation();linkEditor(+b.dataset.le);});
    el.querySelectorAll('[data-ld]').forEach(b=>b.onclick=e=>{e.stopPropagation();const l=IX.quick.splice(+b.dataset.ld,1)[0];refill('res');saveIndex();sigs.quick=null;chrome();toast(`«${l.n}» tolto dai link rapidi`);});
    const a=el.querySelector('[data-addlink]');if(a)a.onclick=e=>{e.stopPropagation();linkEditor(-1);};
  }
  if(type==='timer'){const t=P.tiles[id].timer;
    el.querySelectorAll('[data-tm]').forEach(b=>b.onclick=e=>{e.stopPropagation();const k=b.dataset.tm;
      if(k==='edit')return editTimer(id);
      if(k==='toggle'){if(t.run){t.left=timerLeft(t);t.run=false;delete t.at;}else{if(t.left<=0)t.left=t.secs;t.run=true;t.at=Date.now();}}else{t.left=t.secs;t.run=false;delete t.at;}
      refill(id);save();});}
  if(D.mode!=='game')return;
  if(type==='files'){
    el.querySelectorAll('[data-bk],[data-bv]').forEach(f=>f.addEventListener('input',()=>{const i=+(f.dataset.bk??f.dataset.bv);P.build[i][f.dataset.bk!=null?'k':'v']=f.value;save();}));
    el.querySelectorAll('[data-bd]').forEach(b=>b.onclick=e=>{e.stopPropagation();P.build.splice(+b.dataset.bd,1);refill('files');save();});
    const a=el.querySelector('[data-addrow]');if(a)a.onclick=e=>{e.stopPropagation();P.build.push({k:'',v:''});refill('files');save();setTimeout(()=>tileEl('files')?.querySelector(`[data-bk="${P.build.length-1}"]`)?.focus(),30);};
  }
  if(type==='stream'){
    el.querySelectorAll('[data-si]').forEach(b=>b.onclick=e=>{e.stopPropagation();history(+b.dataset.si);});
    const l=el.querySelector('[data-live-s]');if(l)l.onclick=e=>{e.stopPropagation();history(-1);};
  }
  if(type==='shots')el.querySelectorAll('.pp-thumb.clip[data-n]').forEach(t=>t.ondblclick=()=>act('boardOpenShot',{...kk(),name:t.dataset.n}));
}
var extraAction=function(what,id,btn){
  if(what==='gstart'){act('gameSessionStart',{id:+D.gk});return true;}
  if(what==='gstop'){flushSave().then(()=>act('gameSessionStop',{id:+D.gk}));return true;}
  if(what==='gpreset'){presetMenu(btn);return true;}
  return false;
}

/* ── Menu piccolo, modale e pannello a lato ── */
function pop(anchor,items,onPick){const m=E.menu;
  m.innerHTML=items.map((it,i)=>`<button data-i="${i}">${it.sw?`<i class="pp-sw" style="background:${it.sw}"></i>`:''}${esc(it.t)}${it.on?'<small>✓</small>':it.sub?`<small>${esc(it.sub)}</small>`:''}</button>`).join('');
  placeMenu(m,anchor.getBoundingClientRect());m.querySelectorAll('[data-i]').forEach(b=>b.onclick=e=>{e.stopPropagation();m.classList.remove('on');onPick(items[+b.dataset.i]);});}
function modal(html,actions=[],{wide=false}={}){
  const m=E.modal;m.classList.toggle('wide',wide);
  m.innerHTML=`<button class="pp-x" data-close title="Chiudi">${svg('close',15)}</button>${html}<div class="pp-actions">${actions.map(([t,pri],i)=>`<button class="pp-btn${pri?' pri':''}" data-a="${i}">${t}</button>`).join('')}</div>`;
  const close=()=>{m.classList.remove('on');E.scrim.classList.remove('on');};
  m.querySelector('[data-close]').onclick=close;E.scrim.onclick=close;
  m.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{const fn=actions[+b.dataset.a][2];if(fn&&fn()===false)return;close();});
  m.classList.add('on');E.scrim.classList.add('on');return m;
}
function tagEditor(){
  const draw=()=>{modal(`<span class="pp-mono pp-kick">Etichette · ${esc(D.pp.name)}</span><h2>${D.mode==='game'?'Etichette degli obiettivi':'Etichette delle attività'}</h2>
    <p class="pp-hint2">Valgono per tutte le board. Rinominare un'etichetta aggiorna anche ${D.mode==='game'?'gli obiettivi':'le attività'} che la usano.</p>
    <div class="pp-tags">${IX.tags.map((t,i)=>`<div class="pp-tagrow"><span class="pp-tagc big" style="${tagStyle(t.n)}">${esc(t.n)}</span><input data-tn="${i}" value="${esc(t.n)}" maxlength="24">
      <span class="pp-sws">${[0,1,2,3,4].map(c=>`<button data-tc="${i}:${c}" class="${c===t.c?'on':''}" style="background:${wireColor(c)}"></button>`).join('')}</span><span class="pp-mono">${P.tasks.filter(x=>x.tag===t.n).length}</span>
      <button class="pp-x2" data-td="${i}" title="Elimina">${svg('close',13)}</button></div>`).join('')}</div>
    <button class="pp-btn" data-tadd style="margin-top:10px">${svg('plus',14)}Nuova etichetta</button>`,[['Fatto',true,()=>{refill('tasks');}]]);
    const m=E.modal;
    m.querySelectorAll('[data-tn]').forEach(inp=>inp.onchange=()=>{const t=IX.tags[+inp.dataset.tn],old=t.n,v=inp.value.trim()||old;P.tasks.forEach(x=>{if(x.tag===old)x.tag=v;});t.n=v;saveIndex();draw();});
    m.querySelectorAll('[data-tc]').forEach(b=>b.onclick=()=>{const [i,c]=b.dataset.tc.split(':').map(Number);IX.tags[i].c=c;saveIndex();draw();});
    m.querySelectorAll('[data-td]').forEach(b=>b.onclick=()=>{if(IX.tags.length<2)return;const t=IX.tags.splice(+b.dataset.td,1)[0];P.tasks.forEach(x=>{if(x.tag===t.n)x.tag=IX.tags[0].n;});saveIndex();draw();});
    m.querySelector('[data-tadd]').onclick=()=>{IX.tags.push({n:'Nuova',c:IX.tags.length%5});saveIndex();draw();const ins=E.modal.querySelectorAll('[data-tn]');ins[ins.length-1].select();};};
  draw();
}
function linkEditor(i){
  const isNew=i<0,l=isNew?{i:'link',n:'',u:'',w:'scheda',dock:false}:{...IX.quick[i]};
  const wheres=D.mode==='game'?[['pannello','Pannello'],['scheda','Scheda'],['companion','Companion']]:[['pannello','Pannello'],['scheda','Scheda']];
  modal(`<span class="pp-mono pp-kick">Link rapidi · ${esc(D.pp.name)}</span><h2>${isNew?'Nuovo link':'Modifica link'}</h2><div class="pp-form">
    <label class="pp-row"><span class="pp-mono">Nome</span><input data-f="n" value="${esc(l.n)}" placeholder="es. Wiki, Mappa, Documentazione" maxlength="28"></label>
    <label class="pp-row"><span class="pp-mono">Indirizzo</span><input data-f="u" value="${esc(l.u)}" placeholder="https://…" spellcheck="false"></label>
    <div class="pp-row"><span class="pp-mono">Si apre</span><div class="pp-seg">${wheres.map(([k,t])=>`<button data-w="${k}" class="${l.w===k?'on':''}">${t}</button>`).join('')}</div></div>
    <label class="pp-row"><span class="pp-mono">Dock</span><span class="pp-check"><input type="checkbox" data-f="dock"${l.dock?' checked':''}> mostra il pulsante nel dock in basso</span></label></div>`,
    [['Annulla'],[isNew?'Aggiungi':'Salva',true,()=>{const m=E.modal;l.n=m.querySelector('[data-f=n]').value.trim();let u=m.querySelector('[data-f=u]').value.trim();if(u&&!/^https?:\/\//i.test(u))u='https://'+u;l.u=u;
      l.w=m.querySelector('[data-w].on')?.dataset.w||'scheda';l.dock=m.querySelector('[data-f=dock]').checked;l.sug=false;
      if(!l.n||!/^https?:\/\/[^\s.]+\.[^\s]+/i.test(l.u)){toast('Servono un nome e un indirizzo valido');return false;}
      if(isNew)IX.quick.push(l);else IX.quick[i]=l;refill('res');saveIndex();sigs.quick=null;chrome();}]]);
  E.modal.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>E.modal.querySelectorAll('[data-w]').forEach(x=>x.classList.toggle('on',x===b)));
  setTimeout(()=>E.modal.querySelector('[data-f=n]').focus(),30);
}

/* ── Collezione di board ── */
function boardStats(id){if(id===IX.current)return {n:P.sessions.length,t:P.sessions.reduce((a,x)=>a+x.dur,0),done:P.tasks.filter(t=>t.done).length,tasks:P.tasks.length,last:P.sessions[0]?.start||IX.boards[id].last};
  return D.pp.stats?.[id]||{n:0,t:0,done:0,tasks:0,last:IX.boards[id].last};}
async function openBoard(id){await flushSave();await act('boardSwitch',{...kk(),id});}
function boardsPanel(creating=false,showArch=false){
  const ids=Object.keys(IX.boards).sort((a,b)=>(boardStats(b).last||IX.boards[b].created)-(boardStats(a).last||IX.boards[a].created));
  const vis=ids.filter(id=>showArch||!IX.boards[id].archived),arch=ids.filter(id=>IX.boards[id].archived).length;
  const what=D.mode==='game'?'run, stagione o mondo':'fase, versione o filone di lavoro';
  modal(`<span class="pp-mono pp-kick">Board · ${esc(D.pp.name)}</span><h2>Le tue board</h2><p class="pp-hint2">Una board per ogni ${what}. Ognuna ha i suoi riquadri, ${LABEL.tasks.toLowerCase()}, note${D.mode==='game'?', configurazione e storico delle partite':''}; etichette e link rapidi${D.mode==='game'?' e preset':''} sono in comune.</p>
    <div class="pp-bgrid">${vis.map(id=>{const b=IX.boards[id],st=boardStats(id),cur=id===IX.current;
      return `<div class="pp-bcard${cur?' cur':''}${b.archived?' arch':''}"><div class="pp-bhead"><span class="pp-mono">${cur?'● aperta':b.archived?'archiviata':'in corso'}</span></div>
        <input class="pp-bname" data-rn="${id}" value="${esc(b.name)}" maxlength="40" title="Rinomina">
        <div class="pp-bmeta pp-mono">${D.mode==='game'?`<span>${st.n} partite</span><span>${hm(st.t)} ore</span>`:''}<span>${st.done}/${st.tasks} fatti</span></div>
        <div class="pp-mono pp-blast">${st.last?'ultima: '+esc(fmtDay(st.last)):'creata '+esc(fmtDay(b.created))}</div>
        <div class="pp-bacts">${cur?'':`<button class="pp-btn sm pri" data-open="${id}">Apri</button>`}<button class="pp-btn sm" data-dup="${id}" title="Duplica">${svg('copy',13)}</button>
        <button class="pp-btn sm" data-arc="${id}" title="${b.archived?'Ripristina':'Archivia'}">${svg('archive',13)}</button>${cur?'':`<button class="pp-btn sm" data-del="${id}" title="Elimina">${svg('trash',13)}</button>`}</div></div>`;}).join('')}
      <button class="pp-bcard pp-bnew" data-new>${svg('plus',26)}<b>Nuova board</b><small>una nuova ${what}</small></button></div>
    ${arch?`<button class="pp-btn sm" data-arch style="margin-top:10px">${showArch?'Nascondi':'Mostra'} le archiviate (${arch})</button>`:''}
    ${creating?`<div class="pp-bform"><span class="pp-mono">Nuova board</span><label class="pp-row"><span class="pp-mono">Nome</span><input data-nn placeholder="${D.mode==='game'?'es. Run 2 · Mago, Stagione 25, Mondo hardcore':'es. Versione 2, Refactor, Demo'}" maxlength="40"></label>
      <div class="pp-row top"><span class="pp-mono">Parti da</span><div class="pp-from">
        <label><input type="radio" name="from" value="layout" checked><b>La disposizione di «${esc(IX.boards[IX.current].name)}»</b><small>stessi riquadri, fili e aree; contenuti vuoti</small></label>
        <label><input type="radio" name="from" value="empty"><b>Una board pulita</b><small>i riquadri di base, tutto da riempire</small></label>
        <label><input type="radio" name="from" value="copy"><b>Una copia completa</b><small>anche ${LABEL.tasks.toLowerCase()} e note${D.mode==='game'?' (lo storico riparte da zero)':''}</small></label></div></div></div>`:''}`,
    creating?[['Annulla',false,()=>{setTimeout(()=>boardsPanel(false,showArch),0);}],['Crea e apri',true,()=>{const m=E.modal;const name=m.querySelector('[data-nn]').value.trim(),from=m.querySelector('input[name=from]:checked').value;
      flushSave().then(()=>act('boardCreate',{...kk(),name,from}));}]]:[['Chiudi',true]],{wide:true});
  const m=E.modal;
  m.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{m.classList.remove('on');E.scrim.classList.remove('on');openBoard(b.dataset.open);});
  m.querySelectorAll('[data-rn]').forEach(inp=>inp.onchange=()=>{IX.boards[inp.dataset.rn].name=inp.value.trim()||IX.boards[inp.dataset.rn].name;saveIndex();chrome();});
  m.querySelectorAll('[data-dup]').forEach(b=>b.onclick=()=>{flushSave().then(()=>act('boardCreate',{...kk(),name:IX.boards[b.dataset.dup].name+' (copia)',from:'copy',source:b.dataset.dup}));m.classList.remove('on');E.scrim.classList.remove('on');});
  m.querySelectorAll('[data-arc]').forEach(b=>b.onclick=()=>{const bd=IX.boards[b.dataset.arc];bd.archived=!bd.archived;saveIndex();boardsPanel(false,showArch);});
  m.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{const bd=IX.boards[b.dataset.del];if(!confirm(`Eliminare la board «${bd.name}»${D.mode==='game'?' con il suo storico':''}? Non si può annullare.`))return;
    act('boardDelete',{...kk(),id:b.dataset.del}).then(()=>{delete IX.boards[b.dataset.del];boardsPanel(false,showArch);});});
  const ab=m.querySelector('[data-arch]');if(ab)ab.onclick=()=>boardsPanel(creating,!showArch);
  m.querySelector('[data-new]').onclick=()=>{boardsPanel(true,showArch);setTimeout(()=>E.modal.querySelector('[data-nn]')?.focus(),30);};
}

/* ── Preset (giochi): scegli quello della partita, modificali ── */
function presetMenu(anchor){
  const items=Object.entries(IX.presets||{}).map(([k,p])=>({t:p.n,k,on:k===(IX.session?.preset||IX.lastPreset)}));
  pop(anchor,[...items,{t:'Modifica i preset…',manage:1}],it=>{if(it.manage)return presetEditor(IX.session?.preset||IX.lastPreset);act('gameSessionPreset',{id:+D.gk,preset:it.k});toast(`Preset «${it.t}»: si aprono i suoi siti`);});
}
const PICONS=['group','emoji_events','videocam','person','swords','sports_esports','explore','school','nightlight'];
const WIDGET_LIST=[['partita','Partita'],['timer','Timer'],['obiettivi','Obiettivi'],['note','Note tattiche'],['catture','Ultime catture'],['link','Link rapidi']];
const PI={group:'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 3-5 6-5s6 2 6 5M14 15c3 0 8 1 8 5',emoji_events:'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 21h8M10 17h4',
  videocam:'M3 7h12v10H3zM15 10l6-3v10l-6-3',person:'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6',swords:'M4 4l10 10M4 4h4M4 4v4M20 4L10 14M20 4h-4M20 4v4M8 16l-4 4M16 16l4 4',
  sports_esports:IP.gamepad,explore:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM16 8l-2 6-6 2 2-6z',school:'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5',nightlight:'M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z'};
for(const [k,v] of Object.entries(PI))IP['p-'+k]=v;
function presetDesc(p){const tl=Object.values(P.tiles).filter(t=>t.timer);const d=[p.open.length?p.open.join(' + ')+(p.companion?' nel companion':' in schede'):'nessun sito'];
  d.push(p.timer!=null&&tl[p.timer]?'timer «'+tl[p.timer].timer.label+'»':'niente timer');d.push(p.clips?'clip in automatico':p.notes?'note tattiche':'niente note');return d.join(' · ');}
function presetEditor(sel){
  let cur=IX.presets[sel]?sel:Object.keys(IX.presets)[0];
  const draw=()=>{const p=IX.presets[cur];if(!p)return;const timers=Object.values(P.tiles).filter(t=>t.timer);
    p.comp=p.comp||{widgets:['partita','obiettivi','link'],mode:'strip',side:'right',size:22,op:85,top:true,through:false};const c=p.comp;
    modal(`<span class="pp-mono pp-kick">Preset · ${esc(D.pp.name)}</span><h2>Cosa apre ogni preset</h2>
    <div class="pp-ptabs">${Object.entries(IX.presets).map(([k,v])=>`<button data-k="${k}" class="${k===cur?'on':''}">${svg('p-'+v.i,15)}${esc(v.n)}</button>`).join('')}<button data-pnew title="Nuovo preset">${svg('plus',15)}</button></div>
    <div class="pp-form"><label class="pp-row"><span class="pp-mono">Nome</span><input data-f="n" value="${esc(p.n)}" maxlength="24"></label>
      <div class="pp-row"><span class="pp-mono">Icona</span><div class="pp-icons">${PICONS.map(i=>`<button data-ic="${i}" class="${i===p.i?'on':''}">${svg('p-'+i,16)}</button>`).join('')}</div></div>
      <div class="pp-row top"><span class="pp-mono">Apri</span><div class="pp-sites">${IX.quick.map(l=>`<label><input type="checkbox" data-site="${esc(l.n)}"${p.open.includes(l.n)?' checked':''}>${esc(l.n)}</label>`).join('')||'<span class="pp-hint2">Aggiungi prima dei link rapidi.</span>'}</div></div>
      <label class="pp-row"><span class="pp-mono">Companion</span><span class="pp-check"><input type="checkbox" data-f="companion"${p.companion?' checked':''}> i siti si aprono nel workspace del gioco (companion)</span></label>
      <label class="pp-row"><span class="pp-mono">Timer</span><select data-f="timer"><option value="">Nessuno</option>${timers.map((t,i)=>`<option value="${i}"${p.timer===i?' selected':''}>${esc(t.timer.label)}</option>`).join('')}</select></label>
      <label class="pp-row"><span class="pp-mono">Note</span><span class="pp-check"><input type="checkbox" data-f="notes"${p.notes?' checked':''}> mostra le note tattiche</span></label>
      <label class="pp-row"><span class="pp-mono">Clip</span><span class="pp-check"><input type="checkbox" data-f="clips"${p.clips?' checked':''}> proponi le clip della partita in automatico</span></label>
      <div class="pp-prev pp-mono">${esc(presetDesc(p))}</div>
      <span class="pp-mono pp-kick" style="margin-top:8px">Companion compatto</span>
      <div class="pp-row top"><span class="pp-mono">Widget</span><div class="pp-sites">${WIDGET_LIST.map(([k,n])=>`<label><input type="checkbox" data-cw="${k}"${c.widgets.includes(k)?' checked':''}>${n}</label>`).join('')}</div></div>
      <div class="pp-row"><span class="pp-mono">Misura</span><div class="pp-seg"><button data-cm="strip" class="${c.mode==='strip'?'on':''}">Striscia</button><button data-cm="wide" class="${c.mode==='wide'?'on':''}">Estesa (con le pagine)</button></div></div>
      <div class="pp-row"><span class="pp-mono">Lato</span><div class="pp-seg"><button data-cs="left" class="${c.side==='left'?'on':''}">Sinistra</button><button data-cs="right" class="${c.side==='right'?'on':''}">Destra</button></div></div>
      <label class="pp-row"><span class="pp-mono">Larghezza</span><input type="range" min="16" max="60" value="${c.size}" data-cr="size"><span class="pp-mono" style="width:40px">${c.size}%</span></label>
      <label class="pp-row"><span class="pp-mono">Trasparenza</span><input type="range" min="30" max="100" value="${c.op}" data-cr="op"><span class="pp-mono" style="width:40px">${c.op}%</span></label>
      <label class="pp-row"><span class="pp-mono">Sopra il gioco</span><span class="pp-check"><input type="checkbox" data-cc="top"${c.top?' checked':''}> sempre in primo piano</span></label>
      <label class="pp-row"><span class="pp-mono">Clic</span><span class="pp-check"><input type="checkbox" data-cc="through"${c.through?' checked':''}> attraversabile: i clic vanno al gioco finché non premi Ctrl+Shift+G</span></label>
      <p class="pp-hint2">Le pagine del companion sono i siti in «Apri». Il monitor è quello scelto per il gioco (pannello Giochi).</p></div>`,
      [...(Object.keys(IX.presets).length>1?[['Elimina',false,()=>{delete IX.presets[cur];if(IX.lastPreset===cur)IX.lastPreset=Object.keys(IX.presets)[0];cur=Object.keys(IX.presets)[0];saveIndex();setTimeout(draw,0);}]]:[]),['Fatto',true,()=>{refreshDynamic();}]]);
    const m=E.modal;
    m.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{cur=b.dataset.k;draw();});
    m.querySelector('[data-pnew]').onclick=()=>{const k='p'+Date.now().toString(36).slice(-6);IX.presets[k]={n:'Nuovo preset',i:'sports_esports',open:[],companion:false,timer:null,notes:true,clips:false};cur=k;saveIndex();draw();E.modal.querySelector('[data-f=n]').select();};
    m.querySelectorAll('[data-ic]').forEach(b=>b.onclick=()=>{p.i=b.dataset.ic;saveIndex();draw();});
    m.querySelectorAll('[data-site]').forEach(c=>c.onchange=()=>{const n=c.dataset.site;p.open=c.checked?[...p.open,n]:p.open.filter(x=>x!==n);saveIndex();m.querySelector('.pp-prev').textContent=presetDesc(p);});
    // Beta 0.43.4: companion compatto del preset
    m.querySelectorAll('[data-cw]').forEach(i=>i.onchange=()=>{const w=i.dataset.cw;c.widgets=i.checked?[...c.widgets,w]:c.widgets.filter(x=>x!==w);saveIndex();});
    m.querySelectorAll('[data-cm]').forEach(b=>b.onclick=()=>{c.mode=b.dataset.cm;saveIndex();draw();});
    m.querySelectorAll('[data-cs]').forEach(b=>b.onclick=()=>{c.side=b.dataset.cs;saveIndex();draw();});
    m.querySelectorAll('[data-cr]').forEach(r=>r.oninput=()=>{c[r.dataset.cr]=+r.value;r.nextElementSibling.textContent=r.value+'%';saveIndex();});
    m.querySelectorAll('[data-cc]').forEach(i=>i.onchange=()=>{c[i.dataset.cc]=i.checked;saveIndex();});
    m.querySelectorAll('[data-f]').forEach(f=>f.oninput=f.onchange=()=>{const k=f.dataset.f;p[k]=f.type==='checkbox'?f.checked:k==='timer'?(f.value===''?null:+f.value):f.value;saveIndex();m.querySelector('.pp-prev').textContent=presetDesc(p);});};
  draw();
}

/* ── Storico delle partite (pannello a lato) ── */
function history(sel){
  const list=P.sessions,tot=list.reduce((a,x)=>a+x.dur,0),url=n=>shotByName(n)?.url;
  const one=x=>{const p=IX.presets?.[x.p]||{n:'Partita'};
    return `<div class="pp-hdet"><div class="pp-sum"><div><h2>${esc(p.n)}</h2><p>${esc(fmtDay(x.start))}</p></div><div class="pp-dur">${hm(x.dur)}<small>ore</small></div></div>
    <div class="pp-gbar"><i style="width:${Math.min(100,x.dur/(4*3600e3)*100)}%"></i><span class="pp-mono">${fmtDur(x.dur)}</span></div>
    <h3 class="pp-mono">Catture · ${x.caps.length}</h3><div class="pp-caps">${x.caps.slice(0,12).map(c=>`<div class="pp-cap${/\.(mp4|mkv|webm)$/i.test(c)?' clip':''}" style="${url(c)&&!/\.(mp4|mkv|webm)$/i.test(c)?`background-image:url('${url(c)}')`:''}" title="${esc(c)}" data-cap="${esc(c)}"><span>${esc(c)}</span></div>`).join('')||'<p class="pp-hint2">Nessuna cattura.</p>'}</div>
    <h3 class="pp-mono">Nota</h3><p class="pp-hnote">${x.note?esc(x.note):'<span class="pp-hint2">Nessuna nota.</span>'}</p>
    <h3 class="pp-mono">${LABEL.tasks} fatti</h3>${x.done?.length?`<ul class="pp-hdone">${x.done.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:'<p class="pp-hint2">Nessuno.</p>'}
    <div class="pp-dest pp-mono">sessioni\\${new Date(x.start).toISOString().slice(0,10)}.md</div></div>`;};
  const draw=i=>{E.sheet.innerHTML=`<div class="pp-shead"><span class="pp-mono">Storico · ${esc(IX.boards[IX.current].name)}</span><button class="pp-x" data-close>${svg('close',15)}</button></div>
    <div class="pp-htot"><div><b>${list.length}</b><span class="pp-mono">partite</span></div><div><b>${hm(tot)}</b><span class="pp-mono">ore</span></div><div><b>${list.reduce((a,x)=>a+x.caps.length,0)}</b><span class="pp-mono">catture</span></div></div>
    <div class="pp-hlist">${list.map((x,j)=>`<button class="pp-hit${j===i?' on':''}" data-j="${j}">${svg('gamepad',16)}<span><b>${esc(IX.presets?.[x.p]?.n||'Partita')}</b><small>${esc(fmtDay(x.start))}</small></span><span class="pp-mono">${fmtDur(x.dur)}</span></button>`).join('')}</div>
    ${i>=0&&list[i]?one(list[i]):`<p class="pp-hint2">${IX.session?'La partita in corso entra nello storico quando chiudi il gioco.':'Scegli una partita.'}</p>`}`;
    E.sheet.querySelectorAll('[data-j]').forEach(x=>x.onclick=()=>draw(+x.dataset.j));
    E.sheet.querySelectorAll('[data-cap]').forEach(x=>x.ondblclick=()=>act('boardOpenShot',{...kk(),name:x.dataset.cap}));
    E.sheet.querySelector('[data-close]').onclick=()=>E.sheet.classList.remove('on');};
  draw(sel);E.sheet.classList.add('on');
}

/* ── Fine della partita: la board resta, la partita va nello storico ── */
let endShownFor=null;
function endDialog(){
  const pd=IX.pending;if(!pd)return;endShownFor=pd.end;
  const dur=pd.end-pd.start,p=IX.presets?.[pd.preset]||{n:'Partita'},bname=IX.boards[pd.board]?.name||'';
  const done=pd.board===IX.current?P.tasks.filter(t=>t.done).length:null;
  modal(`<span class="pp-mono pp-kick">Partita finita · board «${esc(bname)}»</span>
    <div class="pp-sum"><div><h2>${esc(D.game?.name||'')} · ${esc(p.n)}</h2><p>dalle ${new Date(pd.start).toTimeString().slice(0,5)} alle ${new Date(pd.end).toTimeString().slice(0,5)}</p></div><div class="pp-dur">${hm(dur)}<small>ore</small></div></div>
    <div class="pp-gbar"><i style="width:${Math.min(100,dur/(4*3600e3)*100)}%"></i><span class="pp-mono">${hms(dur)}</span></div>
    <h3 class="pp-mono">Catture fatte durante la partita · ${pd.caps.length}</h3>
    <div class="pp-caps">${pd.caps.map((c,i)=>`<label class="pp-cap${c.clip?' clip':''}" style="${c.clip?'':`background-image:url('${fileUrl(c.path)}')`}"><input type="checkbox" checked data-c="${i}"><span>${esc(c.name)}</span></label>`).join('')||'<p class="pp-hint2">Nessuna cattura trovata (Xbox Game Bar, Steam, NVIDIA).</p>'}</div>
    <h3 class="pp-mono">Com'è andata?</h3><textarea class="pp-endnote" placeholder="Una riga per ricordartela nello storico."></textarea>
    <label class="pp-check"><input type="checkbox" checked data-keep> Segna nello storico ${LABEL.tasks.toLowerCase()} fatti${done!=null?' ('+done+')':''}</label>
    <label class="pp-check"><input type="checkbox" data-reset> Per la prossima partita, togli la spunta a ${LABEL.tasks.toLowerCase()} fatti</label>
    <p class="pp-hint2">La board resta com'è: riquadri, ${LABEL.tasks.toLowerCase()}, note e catture non si perdono.</p>`,
    [['Non salvare',false,()=>{act('gameSessionDrop',{id:+D.gk});}],['Dopo',false,()=>{}],['Aggiungi allo storico',true,()=>{const m=E.modal;
      const keep=[...m.querySelectorAll('[data-c]')].filter(x=>x.checked).map(x=>pd.caps[+x.dataset.c].path);
      const json=JSON.stringify({keep,note:m.querySelector('.pp-endnote').value.trim(),keepDone:m.querySelector('[data-keep]').checked,reset:m.querySelector('[data-reset]').checked});
      flushSave().then(()=>act('gameSessionFinish',{id:+D.gk,json})).then(r=>{if(r?.ok!==false)toast(`Partita aggiunta allo storico di «${bname}»`);});}]],{wide:true});
}
/* Dopo ogni stato: partita finita da salvare, testata */
function boardExtras(){
  if(D.mode==='game'&&IX.pending&&endShownFor!==IX.pending.end&&!E.modal.classList.contains('on'))endDialog();
}
function chromeGame(){
  const g=D.game||{},name=g.name||D.pp.name;
  E.logo.textContent=name.replace(/[^A-Za-z0-9À-ÿ ]/g,' ').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('')||'G';
  E.name.textContent=name;E.type.textContent='Gioco';E.pathText.textContent=D.pp.root;
  const metaSig=JSON.stringify([g.running,IX.session?.start,Object.keys(IX.boards).length,Object.keys(P.tiles).length,P.links.length,Math.round(view.z*100)]);
  if(metaSig!==sigs.meta){sigs.meta=metaSig;
    E.meta.innerHTML=`${esc(g.exe||'')} <i>${g.running?'in esecuzione':'chiuso'}</i><span class="bar"></span>BOARD <i>${Object.keys(IX.boards).length}</i><span class="bar"></span>RIQUADRI <i>${Object.keys(P.tiles).length}</i><span class="bar"></span>FILI <i>${P.links.length}</i><span class="bar"></span>ZOOM <i>${Math.round(view.z*100)}%</i>`;}
  const quick=[...(IX.quick||[]).filter(l=>l.dock).slice(0,4).map(l=>['@link',l,'link',l.n]),['gameOpenFolder',{id:+D.gk},'folder','Cartella']];
  const qSig=JSON.stringify(quick);
  if(qSig!==sigs.quick){sigs.quick=qSig;E.quick.innerHTML=quick.map(([c,a,i,l],n)=>`<button data-q="${n}" title="${esc(l)}">${svg(i)}<span class="lbl">${esc(l)}</span></button>`).join('');
    E.quick.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{const q=quick[+b.dataset.q];if(q[0]==='@link')openQuick(q[1]);else act(q[0],q[1]);});}
}


/* ── Beta 0.43.5: i link mostrano la pagina vera ── */
const THUMB={};   // indirizzo → {url} | 'wait' | 'err'
function linkThumb(u,force){
  if(!/^https?:\/\//i.test(u||''))return null;
  const t=THUMB[u];if(t&&!force)return t;
  THUMB[u]='wait';
  act('boardLinkThumb',{kind:D.mode,key:String(D.gk),url:u,force:!!force}).then(r=>{THUMB[u]=r?.ok?{url:r.url}:'err';
    for(const [id,tl] of Object.entries(P.tiles))if(typeOf(id)==='link'&&tl.url===u)refill(id);}).catch(()=>{THUMB[u]='err';});
  return 'wait';
}
BODY.link=id=>{const l=P.tiles[id],t=linkThumb(l.url),big=l.h>=180;
  const pic=!/^https?:\/\//i.test(l.url||'')?'<div class="pp-lthumb empty">Scrivi un indirizzo qui sotto</div>':t==='wait'?'<div class="pp-lthumb empty">Carico la pagina…</div>':t==='err'?'<div class="pp-lthumb empty">Pagina non raggiungibile</div>':`<div class="pp-lthumb" style="background-image:url('${t.url}')" data-do="openlink" title="Apri in una scheda"></div>`;
  return head(id,`<button data-do="relink" title="Rifai la foto della pagina">${svg('reset',14)}</button>`,'')+`<div class="pp-tb pp-lbody">${big?pic:''}<div class="pp-ln"><span class="ic">${svg('link',15)}</span><div style="flex:1;min-width:0"><b><input class="pp-field" data-own="title" value="${esc(l.title)}" maxlength="80"></b><small><input class="pp-field" data-own="url" value="${esc(l.url)}" placeholder="https://…" spellcheck="false"></small></div>
    <button class="pp-btn sm" data-do="openlink" title="Apri in una scheda (e vai lì)">${svg('open',13)}</button></div></div>`;};
const _extraAction=extraAction;
extraAction=function(what,id,btn){
  if(what==='relink'){const u=P.tiles[id].url;if(u){linkThumb(u,true);refill(id);}return true;}
  return _extraAction(what,id,btn);
};
/* Anteprima della pagina vera passando sopra un link rapido (come nella Home) */
let pvT=null,pvOn=false;
function previewOn(el,u){clearTimeout(pvT);pvT=setTimeout(()=>{const r=el.getBoundingClientRect();pvOn=true;act('sitePreview',{url:u,x:Math.round(r.left+r.width/2),y:Math.round(r.bottom+6)});},450);}
function previewOff(){clearTimeout(pvT);if(pvOn){pvOn=false;act('sitePreviewHide');}}
const _extraWire=extraWire;
extraWire=function(el,id,type){
  _extraWire(el,id,type);
  if(type==='res')el.querySelectorAll('[data-li]').forEach(r=>{const l=IX.quick[+r.dataset.li];r.onmouseenter=()=>previewOn(r,l.u);r.onmouseleave=previewOff;r.addEventListener('click',previewOff);});
  if(type==='link'){const u=el.querySelector('[data-own=url]');if(u)u.addEventListener('change',()=>{let v=u.value.trim();if(v&&!/^https?:\/\//i.test(v)){v='https://'+v;P.tiles[id].url=v;save();}previewOff();refill(id);});}
};

window.ProjectPage={render(state){render(state);themeChanged();},hide(){if(root){root.querySelectorAll('.pp-menu,.pp-cmenu').forEach(m=>m.classList.remove('on'));}}};
})();
