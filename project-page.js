/* Beta 0.43.2 — Pagina del progetto (scheda interna app://project), disegnata dalla cornice.
 * Una tela libera: riquadri messi dove vuoi, collegati da fili (cavi con la spina), raggruppati in aree.
 * Dati veri del progetto: stato del server, file recenti, risorse; attività, note e screenshot in <progetto>/.varco.
 * La disposizione vive qui mentre la modifichi e si salva in .varco/pagina.json (lib/project-page.cjs).
 * I colori sono le variabili --s-* del tema di VARCO (lib/appearance-rules.cjs → strumentoTokens). */
(function(){
'use strict';
const act=(name,args={})=>window.browserAPI.action(name,args);
const SNAP=24;
const SINGLE=['hero','tasks','shots','files','stream','notes','res'];
const SIZES={hero:[768,576],tasks:[336,504],shots:[624,408],files:[432,360],stream:[336,312],notes:[432,288],res:[336,384],note:[312,216],shot:[456,312],link:[312,120],file:[312,144]};
const SIZE_CHOICES={hero:[[768,576],[624,520],[960,600]],tasks:[[336,504],[432,504],[336,624]],shots:[[624,408],[456,408],[816,480]],files:[[432,360],[624,360]],
  stream:[[336,312],[432,360]],notes:[[432,288],[624,360]],res:[[336,384],[432,384]],note:[[312,216],[264,168],[432,288]],shot:[[456,312],[336,232],[624,408]],link:[[312,120],[408,120]],file:[[312,144],[408,144]]};
const GROUP={hero:'lavoro',tasks:'lavoro',files:'lavoro',stream:'lavoro',notes:'lavoro',note:'lavoro',file:'lavoro',shots:'media',shot:'media',res:'link',link:'link'};
const LABEL={hero:'Stato del progetto',tasks:'Attività',shots:'Screenshot',files:'File recenti',stream:'Cronologia',notes:'Note del progetto',res:'Risorse',note:'Nota',shot:'Screenshot',link:'Link',file:'File'};
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
    <div class="pp-grow"></div><span class="pp-mono pp-saved" data-r="saved">● salvato in .varco</span>
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
  <div class="pp-missing" data-r="missing" hidden><div><h2>Cartella del progetto non trovata</h2><p>Collega una cartella al workspace dal pannello Progetto.</p></div></div>
  <input type="file" data-r="file" accept="image/*" multiple hidden>`;
  E={};root.querySelectorAll('[data-r]').forEach(el=>E[el.dataset.r]=el);
  wireChrome();built=true;
}

/* ── Dati dal processo principale ── */
function render(state){
  if(!built)build();
  const pp=state.projectPage;if(!pp)return;
  E.missing.hidden=!pp.missing;E.view.hidden=!!pp.missing;
  if(pp.missing)return;
  D={pp,project:state.project||{},kind:state.project?.kind||null,commands:state.project?.commands||[],shots:pp.shots||[],
    resources:(state.workspaces||[]).find(x=>x.name===state.activeWorkspace)?.resources||[],workspace:state.activeWorkspace};
  const key=state.activeWorkspace+'|'+pp.folder;
  if(key!==curKey){curKey=key;load(pp,true);}
  else if(pp.rev!==lastRev&&pp.rev!==savedRev&&!dirty&&!busy()){load(pp,false);}   // cambiata da fuori (git pull, un'altra finestra)
  lastRev=pp.rev;
  chrome();refreshDynamic();
  if(document.activeElement?.dataset?.k!=='notes'&&pp.notes!==notesSent){notesSent=null;const ta=E.tiles.querySelector('[data-k=notes]');if(ta&&ta.value!==pp.notes&&!notesTimer)ta.value=pp.notes;}
}
let moving=false;const busy=()=>moving||!!temp;

function load(pp,first){
  P=JSON.parse(JSON.stringify(pp.page));
  P.links=P.links||[];P.areas=P.areas||{};P.tasks=P.tasks||[];P.tiles=P.tiles||{};
  selTile=null;selWire=null;E.wbar.classList.remove('on');
  for(const k in sigs)delete sigs[k];
  renderAll();
  if(first||!P.view){if(P.view){view={...P.view};applyView();}else requestAnimationFrame(firstView);}
}

/* Salvataggio: mezzo secondo dopo l'ultima modifica */
function save(){
  dirty=true;clearTimeout(saveTimer);
  saveTimer=setTimeout(async()=>{
    saveTimer=null;P.view={x:Math.round(view.x),y:Math.round(view.y),z:+view.z.toFixed(3)};
    const r=await act('projectPageSave',{json:JSON.stringify(P)}).catch(()=>null);
    if(r?.ok){savedRev=r.rev;flashSaved();}
    if(!saveTimer)dirty=false;
  },500);
}
function saveNotes(text){
  notesSent=text;clearTimeout(notesTimer);
  notesTimer=setTimeout(async()=>{notesTimer=null;const r=await act('projectPageNotes',{text}).catch(()=>null);if(r?.ok){savedRev=r.rev;flashSaved();}},600);
}
function flashSaved(){E.saved.classList.add('on');clearTimeout(flashSaved.t);flashSaved.t=setTimeout(()=>E.saved.classList.remove('on'),1100);}

/* ── Testata, nastro, dock ── */
function chrome(){
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
  const qSig=JSON.stringify(quick);
  if(qSig!==sigs.quick){sigs.quick=qSig;E.quick.innerHTML=quick.map(([c,a,i,l],n)=>`<button data-q="${n}" title="${esc(l)}">${svg(i)}<span class="lbl">${esc(l)}</span></button>`).join('')||'<span class="pp-mono" style="color:var(--s-dim);padding:0 8px">Nessuna azione</span>';
    E.quick.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{const q=quick[+b.dataset.q];act(q[0],q[1]);});}
}

/* ── Riquadri ── */
function head(id,right='',title=null){
  const t=typeOf(id),n=linksOf(id).length;
  const h=title??({tasks:'Da fare',shots:'Galleria',files:'Dove eri rimasto',stream:'Cosa è successo',res:'Collegamenti fissi'})[t];
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
  notes(id){return head(id,'<span class="pp-mono" style="color:var(--s-dim)">note.md</span>','')+`<div class="pp-tb"><div class="pp-note"><textarea spellcheck="false" data-k="notes" placeholder="Appunti del progetto…">${esc(D.pp.notes||'')}</textarea></div></div>`;},
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
  el.ondblclick=e=>{if(type==='shot'&&!e.target.closest('button'))act('projectPageOpenShot',{name:T.shot});};
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
  if(type==='res'){const items=[];for(const u of D.resources)items.push({url:u});for(const p of D.kind?.panels||[])items.push({url:p.url});
    if((D.kind?.actions||[]).some(a=>a.id==='repo'))items.unshift({repo:true});
    el.querySelectorAll('.pp-re').forEach(b=>b.onclick=()=>{const r=items[+b.dataset.n];if(!r)return;if(r.repo)act('projectTypeAction',{id:'repo'});else act('resource',{url:r.url});});}
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
  else if(what==='openlink'){if(/^https?:\/\//i.test(T.url||''))act('resource',{url:T.url});else flash(id);}
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
    const id=newTile(k,k==='note'?{text:''}:{title:'Nuovo link',url:''},c.x-150,c.y-60);
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
  const r=await act('projectPageChooseShots').catch(()=>null);
  if(!r?.ok||!r.names?.length||!at)return;
  await waitForShots(r.names);
  r.names.forEach((n,i)=>{const nid=newTile('shot',{shot:n},at.x-228+i*48,at.y-156+i*48);if(linkTo)addLink(linkTo,nid);});
}
function addImages(files,at){
  [...files].filter(f=>f.type.startsWith('image/')).slice(0,12).forEach((f,i)=>{const rd=new FileReader();
    rd.onload=async()=>{const r=await act('projectPageAddShot',{name:f.name,data:rd.result}).catch(()=>null);if(!r?.ok)return;
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
  E.path.onclick=()=>act('projectOpenFolder');
  E.panelBtn.onclick=()=>act('openSidePanel',{panel:'project'});
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
    const tasks=P.tasks,cover=P.cover;P=JSON.parse(JSON.stringify(DEFAULT));P.tasks=tasks;P.cover=cover;renderAll();fit(true);save();};
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

window.ProjectPage={render(state){render(state);themeChanged();},hide(){if(root){root.querySelectorAll('.pp-menu,.pp-cmenu').forEach(m=>m.classList.remove('on'));}}};
})();
