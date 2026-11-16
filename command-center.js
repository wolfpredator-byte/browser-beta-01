'use strict';

/**
 * Beta 0.38 — command center della cornice (F1, Ctrl+Shift+P).
 * Due stili a scelta (Impostazioni → Interfaccia, o il pulsante in alto):
 *   board: la Bacheca — "Apri subito" come tessere con miniatura, le sezioni come card richiudibili,
 *          le azioni in una barra in basso;
 *   ring:  l'Anello — le sezioni sono settori attorno alla ricerca, i risultati escono a ventaglio,
 *          le azioni girano attorno all'anello.
 * Stesso motore per entrambi: command-center-rules.js (sezioni e ordine) e lib/command-center.cjs
 * (risultati, azioni, anteprime). Il testo di pagine e titoli è sempre trattato come testo (esc).
 */
(function(){
  const R=window.commandCenterRules;
  const act=(name,args={})=>window.browserAPI.action(name,args);
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // ── Icone (tratto 1.8 come le altre di VARCO) ──
  const S=d=>`<svg class="cc-svg" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const I={
    search:S('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
    now:S('<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>'),
    tabs:S('<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10h18M8 6V4h8v2"/>'),
    projects:S('<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2h8.5A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/>'),
    file:S('<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/>'),
    server:S('<rect x="4" y="4" width="16" height="7" rx="1.5"/><rect x="4" y="13" width="16" height="7" rx="1.5"/><path d="M8 7.5h.01M8 16.5h.01"/>'),
    commands:S('<path d="M5 7l5 5-5 5M12 18h7"/>'),
    links:S('<path d="M9 4h6l-1 6 4 3v2H6v-2l4-3z"/><path d="M12 15v6"/>'),
    link:S('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    web:S('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.4-3.6-8.5S9.5 6.1 12 3.5z"/>'),
    jarvis:S('<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/><path d="M18.5 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>'),
    create:S('<path d="M12 5v14M5 12h14"/>'),
    note:S('<path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4M8 9h8M8 13h5"/>'),
    task:S('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>'),
    workspace:S('<rect x="3" y="4" width="8" height="7" rx="1.5"/><rect x="13" y="4" width="8" height="7" rx="1.5"/><rect x="3" y="13" width="8" height="7" rx="1.5"/><rect x="13" y="13" width="8" height="7" rx="1.5"/>'),
    session:S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    prompt:S('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>'),
    down:S('<path d="M6 9l6 6 6-6"/>'),
    git:S('<circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="9" r="2"/><path d="M6 8v8M18 11c0 3-4 3-6 3H8"/>'),
    ring:S('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/><path d="M12 3.5v5M12 15.5v5M3.5 12h5M15.5 12h5"/>'),
    board:S('<rect x="3.5" y="4" width="17" height="5" rx="1.5"/><rect x="3.5" y="11" width="7.5" height="9" rx="1.5"/><rect x="13" y="11" width="7.5" height="9" rx="1.5"/>'),
    mic:S('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>')
  };
  const KIND_ICON={tab:'tabs',project:'projects',preview:'server',server:'server',folder:'projects',file:'file',link:'link',session:'session',
    command:'commands',workspace:'workspace',bookmark:'link',history:'session',web:'search',jarvis:'jarvis',jsum:'note',jsave:'projects',
    prompt:'prompt',note:'note',task:'task',suggest:'search'};
  const SEC_ICON={now:'now',tabs:'tabs',projects:'projects',links:'links',commands:'commands',web:'web',jarvis:'jarvis',create:'create'};
  const NO_PREVIEW=new Set(['jarvis','jsum','jsave','prompt','note','task','workspace','web','suggest']);

  // ── Stato ──
  const st={open:false,items:[],style:'board',active:'',engine:'Google',jarvis:false,wsColors:{},q:'',scope:'all',
    collapsed:new Set(),expanded:new Set(),sel:0,act:0,hover:null,hoverAt:null,suggest:{text:'',list:[]},previews:new Map(),bounds:null,lastFocus:null};
  let groups=[],flat=[];

  // ── Elementi che dipendono dal testo ──
  const looksLikeAddress=q=>/^https?:\/\//i.test(q)||/^localhost\b/i.test(q)||/^[^\s/]+\.[a-z]{2,}(?::\d+)?(?:[/?#]\S*)?$/i.test(q);
  function dynamic(text){
    if(!text)return [];
    const t=text.slice(0,500),list=[];
    const D=(sec,kind,label,detail,acts,extra={})=>list.push({id:'d'+list.length,sec,kind,label,detail,dynamic:true,always:true,
      actions:acts.map(a=>a[0]),dynActs:acts.map(a=>a[1]),...extra});
    const address=looksLikeAddress(t);
    D('web','web',address?t:`Cerca «${t}» su ${st.engine}`,address?'Apri l’indirizzo':'nuova scheda',
      [[address?'Apri in una nuova scheda':'Cerca in una nuova scheda',{type:'search',option:0,text:t}],[address?'Apri qui':'Cerca qui',{type:'search',option:1,text:t}],
       ...(st.jarvis&&!address?[['Chiedi a JARVIS',{type:'ask',option:0,text:t}]]:[])]);
    if(st.suggest.text===t)for(const s of st.suggest.list)D('web','suggest',s,'suggerimento di '+st.engine,[['Cerca',{type:'search',option:0,text:s}],['Cerca qui',{type:'search',option:1,text:s}]]);
    if(st.jarvis)D('jarvis','jarvis',`Chiedi a JARVIS: «${t}»`,'la risposta arriva come notifica',[['Chiedi',{type:'ask',option:0,text:t}],['Chiedi sulla pagina aperta',{type:'ask',option:1,text:t}]]);
    else D('jarvis','jarvis',`Chiedi a JARVIS: «${t}»`,'JARVIS è spento',[['Accendi JARVIS',{panel:'jarvis'}]],{off:true});
    D('create','note',`Nota «${t}»`,`nelle note di ${st.active}`,[['Aggiungi alla nota',{type:'note',option:0,text:t}],['Aggiungi e apri le note',{type:'note',option:1,text:t}]]);
    D('create','task',`Task «${t}»`,`nella lista di ${st.active}`,[['Aggiungi il task',{type:'task',option:0,text:t}],['Aggiungi e apri le note',{type:'task',option:1,text:t}]]);
    if(address)D('create','link',`Fast link «${t}»`,`nel workspace ${st.active}`,[['Crea',{type:'link',option:0,text:t}],['Crea e fissa',{type:'link',option:1,text:t}]]);
    D('create','prompt',`Prompt «${t}»`,'per JARVIS, riutilizzabile',[['Salva il prompt',{type:'prompt',option:0,text:t}],...(st.jarvis?[['Salva e manda a JARVIS',{type:'prompt',option:1,text:t}]]:[])]);
    D('create','workspace',`Workspace «${t.slice(0,40)}»`,'nuovo workspace vuoto',[['Crea il workspace',{type:'workspace',option:0,text:t}]]);
    D('create','session',`Sessione «${t.slice(0,60)}»`,'salva le schede di questa finestra',[['Salva le schede',{type:'session',option:0,text:t}]]);
    return list;
  }

  function compute(){
    groups=R.buildGroups(st.items,st.q,{active:st.active,scope:st.scope,collapsed:[...st.collapsed],expanded:[...st.expanded],dynamic});
    flat=R.flatten(groups);
    if(st.sel>=flat.length)st.sel=Math.max(0,flat.length-1);
  }
  const current=()=>flat[st.sel]?.item||null;
  const indexOf=(gid,i)=>{let k=0;for(const g of groups){if(g.collapsed)continue;if(g.id===gid)return k+i;k+=g.shown.length;}return -1;};

  // ── Apertura e chiusura ──
  function open(message){
    const cc=message.cc||{};
    Object.assign(st,{open:true,items:cc.items||[],style:cc.style==='ring'?'ring':'board',active:cc.active||'',engine:cc.engine||'Google',
      jarvis:!!cc.jarvis,q:'',scope:'all',sel:0,act:0,hover:null,previews:new Map(),bounds:message.bounds||st.bounds});
    st.wsColors=Object.fromEntries((cc.workspaces||[]).map(w=>[w.name,w.color]));
    st.collapsed=new Set();st.expanded=new Set();
    $('palette').hidden=false;
    render(true);
    input().focus();
    // Le tessere di "Apri subito" vogliono subito la miniatura (schede e siti aperti).
    for(const x of st.items.filter(x=>x.now&&(x.pv==='tab'||x.pv==='site')).slice(0,5)){
      st.previews.set(x.id,null);
      act('ccPreview',{id:x.id}).then(r=>{st.previews.set(x.id,r?.ok?r.result:null);if(st.open)render();});
    }
  }
  function close(){
    if(!st.open)return Promise.resolve();
    st.open=false;st.hover=null;
    $('palette').hidden=true;
    $('cc').replaceChildren();
    const img=$('paletteBackdrop');img.hidden=true;img.removeAttribute('src');
    return act('closePalette');
  }

  // ── Esecuzione ──
  async function runItem(x,index=st.act){
    if(!x)return;
    const i=Math.min(index,(x.actions?.length||1)-1);
    // "Nota", "Task", "Workspace", "Prompt" senza testo: scrivi il testo nella barra (+ …).
    if(x.fill&&i===0){st.q=x.fill;input().value=x.fill;st.sel=0;st.act=0;render();input().focus();return;}
    await close();
    if(x.dynActs){
      const d=x.dynActs[i];
      if(d.panel)return act('openSidePanel',{panel:d.panel});
      return act('ccDynamic',{type:d.type,text:d.text,option:d.option});
    }
    return act('ccAction',{id:x.id,action:i});
  }

  // ── Anteprime (al passaggio del mouse o scegliendo con la tastiera) ──
  let previewTimer=null;
  function wantPreview(x){
    clearTimeout(previewTimer);
    if(!x||x.dynamic||NO_PREVIEW.has(x.kind)||!x.pv)return;
    if(st.previews.has(x.id))return;
    previewTimer=setTimeout(()=>{
      st.previews.set(x.id,null);
      act('ccPreview',{id:x.id}).then(r=>{st.previews.set(x.id,r?.ok?r.result:null);if(st.open)render();});
    },140);
  }
  function previewHtml(x){
    if(!x)return '';
    const p=st.previews.get(x.id);
    const ws=x.ws?`<span class="cc-ws" style="--w:${wsColor(x.ws)}">${esc(x.ws)}</span>`:'';
    if(!p)return `<div class="cc-pv-meta"><b>${esc(x.label)}</b>${x.detail?`<span>${esc(x.detail)}</span>`:''}<span class="row">${ws}${x.keys?`<kbd>${esc(x.keys)}</kbd>`:''}</span></div>`;
    if(p.type==='tab'||p.type==='site'){
      const img=p.image?`<img class="cc-shot" src="${esc(p.image)}" alt="">`:`<div class="cc-shot empty">${p.favicon?`<img src="${esc(p.favicon)}" alt="">`:I.web}<span>${p.asleep?'Scheda sospesa: nessuna anteprima':'Nessuna anteprima'}</span></div>`;
      return `${img}<div class="cc-pv-meta"><b>${esc(p.title||x.label)}</b><span>${esc(p.url||'')}</span>
        <span class="row">${ws}${p.window>1?`<em>finestra ${p.window}</em>`:''}${p.audible?'<em>audio</em>':''}${p.visited?`<em>visitato ${esc(p.visited)}</em>`:''}${x.keys?`<kbd>${esc(x.keys)}</kbd>`:''}</span></div>`;
    }
    if(p.type==='project')return `<div class="cc-pv-meta"><b>${esc(p.title)}</b><code>${esc(p.path||'')}</code><span class="row">${ws}${p.branch?`<em>${I.git}${esc(p.branch)}</em>`:''}</span></div>
      ${p.commits.length?`<div class="cc-pv-h">Ultime modifiche</div><ul class="cc-commits">${p.commits.map(c=>`<li><code>${esc(c.hash)}</code><span>${esc(c.subject)}</span><em>${esc(c.when)}</em></li>`).join('')}</ul>`:'<div class="cc-pv-h">Nessuna modifica registrata (git)</div>'}`;
    if(p.type==='server')return `<div class="cc-pv-meta"><b>${esc(p.title)}</b><code>${esc(p.command)}</code><span class="row">${ws}<em>${p.status==='running'?'● attivo':'○ fermo'}</em></span></div>
      ${p.log.length?`<pre class="cc-code">${esc(p.log.join('\n'))}</pre>`:''}`;
    if(p.type==='file'||p.type==='folder')return `<div class="cc-pv-meta"><b>${esc(p.title)}</b><code>${esc(p.path)}</code><span class="row">${ws}${p.missing?'<em>non trovato</em>':`<em>modificato ${esc(p.modified)}</em>${p.type==='file'?`<em>${Math.max(1,Math.round(p.size/1024))} KB</em>`:''}`}</span></div>
      ${p.lines?`<pre class="cc-code">${esc(p.lines.join('\n'))}</pre>`:''}${p.entries?`<ul class="cc-files">${p.entries.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:''}`;
    if(p.type==='session')return `<div class="cc-pv-meta"><b>${esc(p.title)}</b><span class="row">${ws}</span></div><ul class="cc-files">${p.tabs.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`;
    return `<div class="cc-pv-meta"><b>${esc(x.label)}</b><span>Comando di VARCO</span><span class="row">${x.keys?`<kbd>${esc(x.keys)}</kbd>`:''}</span></div>`;
  }
  const wsColor=name=>({violet:'#9c8cff',blue:'#5aa9ff',cyan:'#00e5ff',green:'#4ade80',yellow:'#facc15',orange:'#ffb648',red:'#ff6b6b',pink:'#ff7ad9'}[st.wsColors[name]]||'rgba(var(--v-ink-rgb),.45)');
  function icon(x,cls='cc-ico'){
    if(x.favicon)return `<span class="${cls} fav"><img src="${esc(x.favicon)}" alt=""></span>`;
    return `<span class="${cls}${x.kind==='server'&&x.on?' live':''}">${I[KIND_ICON[x.kind]]||I.commands}</span>`;
  }

  // ── Disegno ──
  let inputEl=null,enterTimer=null;
  function input(){
    if(inputEl)return inputEl;
    inputEl=document.createElement('input');
    inputEl.className='cc-input';inputEl.spellcheck=false;inputEl.autocomplete='off';
    inputEl.setAttribute('aria-label','Cerca nel command center');
    inputEl.addEventListener('input',()=>{st.q=inputEl.value;st.sel=0;st.act=0;askSuggestions();render();});
    inputEl.addEventListener('keydown',onKey);
    return inputEl;
  }
  let suggestTimer=null;
  function askSuggestions(){
    clearTimeout(suggestTimer);
    const {text,forced}=R.parseQuery(st.q);
    if(!text||text.length<2||(forced&&forced!=='web')||(st.scope!=='all'&&st.scope!=='web'&&st.scope!=='ws'))return;
    suggestTimer=setTimeout(()=>act('ccSuggest',{text}).then(r=>{
      if(!st.open||R.parseQuery(st.q).text!==text)return;
      st.suggest={text,list:r?.ok&&Array.isArray(r.result)?r.result:[]};render();
    }),200);
  }
  const placeholder=()=>st.style==='ring'?'Cerca…':'Cerca, apri o crea qualcosa…  (> comandi · @ schede · # progetti · / fast link · ? JARVIS · + crea)';
  const scopeChips=()=>{const {forced}=R.parseQuery(st.q);return R.SCOPES.map(([k,l])=>`<button class="cc-chip${(forced||st.scope)===k?' on':''}" data-scope="${k}">${esc(l)}</button>`).join('');};
  const styleToggle=()=>`<button class="cc-style" data-style="${st.style==='ring'?'board':'ring'}" title="${st.style==='ring'?'Passa alla bacheca':'Passa all’anello'} (si ricorda la scelta)">${st.style==='ring'?I.board:I.ring}</button>`;
  const emptyHtml=()=>{const {text}=R.parseQuery(st.q);return `<div class="cc-empty"><b>Nessun risultato per «${esc(text)}»</b>Cambia «Dove cercare», oppure scrivi «? ${esc(text)}» per chiederlo a JARVIS.</div>`;};

  function render(first=false){
    if(!st.open)return;
    compute();
    const root=$('cc');
    const keep=root.querySelector('.cc-scroll');const top=keep?keep.scrollTop:0;
    const b=st.bounds;
    // Dentro lo spazio della pagina (la sua foto sfocata fa da sfondo), con un po' di margine.
    root.style.cssText=b?`left:${b.x+12}px;top:${b.y+10}px;width:${Math.max(300,b.width-24)}px;height:${Math.max(300,b.height-20)}px`:'';
    root.dataset.style=st.style;
    root.dataset.narrow=b&&b.width<1050?'1':'0';
    // Beta 0.38.1: ridisegnare toglie la casella dalla pagina e le fa perdere il focus (si scriveva una lettera alla volta).
    // Ricordiamo focus e cursore e li rimettiamo subito dopo.
    const el=input(),focused=first||document.activeElement===el,s0=el.selectionStart,s1=el.selectionEnd,dir=el.selectionDirection;
    root.innerHTML=st.style==='ring'?renderRing():renderBoard();
    root.querySelector('#ccSlot').replaceWith(el);
    if(focused){el.focus({preventScroll:true});if(!first&&s0!==null){try{el.setSelectionRange(s0,s1,dir);}catch{}}}
    input().placeholder=placeholder();
    if(input().value!==st.q)input().value=st.q;
    const sc=root.querySelector('.cc-scroll');
    if(sc){sc.scrollTop=top;sc.querySelector('.sel')?.scrollIntoView({block:'nearest'});}
    bind(root);
    // L'animazione d'ingresso solo all'apertura: i ridisegni (anteprime, mouse) non devono ripartire da trasparente.
    if(first){root.classList.add('enter');clearTimeout(enterTimer);enterTimer=setTimeout(()=>root.classList.remove('enter'),350);}
    const cur=current();if(cur)wantPreview(cur);
  }

  // Bacheca
  function renderBoard(){
    const cur=current();
    const nowG=groups.find(g=>g.id==='now');
    const tiles=nowG&&!nowG.collapsed?`<div class="cc-lab">${I.now}${esc(nowG.title)}${st.q?'':' · '+esc(st.active)}</div>
      <div class="cc-tiles">${nowG.shown.map((x,i)=>{const k=indexOf('now',i);const p=st.previews.get(x.id);
        const shot=p?.image?`<img class="cc-shot" src="${esc(p.image)}" alt="">`:`<div class="cc-shot empty">${x.favicon?`<img src="${esc(x.favicon)}" alt="">`:I[KIND_ICON[x.kind]]||I.commands}</div>`;
        return `<button class="cc-tile${k===st.sel?' sel':''}" data-i="${k}">${shot}<b>${esc(x.label)}</b><span>${esc(x.detail||'')}</span></button>`;}).join('')}</div>`:'';
    const cards=groups.filter(g=>g.id!=='now').map(g=>{
      let inner='';
      if(!g.collapsed){
        const rows=g.shown.map((x,i)=>row(x,indexOf(g.id,i),i===g.split));
        inner=g.id==='create'&&!st.q?`<div class="cc-grid">${rows.join('')}</div>`:rows.join('');
        if(g.more)inner+=`<button class="cc-more" data-expand="${g.id}">Mostra tutti (${g.items.length})</button>`;
        else if(st.expanded.has(g.id)&&g.items.length>5)inner+=`<button class="cc-more" data-expand="${g.id}">Mostra meno</button>`;
      }
      return `<section class="cc-card${g.collapsed?' closed':''}${g.id==='jarvis'?' j':''}"><button class="cc-ch" data-toggle="${g.id}">${I[SEC_ICON[g.id]]}<b>${esc(g.title)}</b><span class="n">${g.items.length}</span>${g.prefix?`<kbd>${esc(g.prefix.trim())}</kbd>`:''}<span class="tog">${I.down}</span></button>${inner}</section>`;
    }).join('');
    const pv=st.hover&&st.hoverAt&&!NO_PREVIEW.has(st.hover.kind)&&!st.hover.dynamic?`<div class="cc-pop" style="left:${st.hoverAt.x}px;top:${st.hoverAt.y}px">${previewHtml(st.hover)}</div>`:'';
    return `<div class="cc-board"><div class="cc-top"><div class="cc-search">${I.search}<span id="ccSlot"></span><kbd>Esc</kbd></div><div class="cc-scopes">${scopeChips()}</div>${styleToggle()}</div>
      <div class="cc-scroll">${tiles}${cards?`<div class="cc-cards">${cards}</div>`:''}${!groups.length?emptyHtml():''}</div>
      ${cur?actionBar(cur):''}</div>${pv}`;
  }
  function row(x,k,split){
    return `${split?'<div class="cc-split">Altri workspace</div>':''}<div class="cc-r${k===st.sel?' sel':''}${x.off?' off':''}" data-i="${k}">${icon(x)}
      <div class="t"><b>${esc(x.label)}</b>${x.detail?`<span>${esc(x.detail)}</span>`:''}</div>
      ${x.ws&&x.ws!==st.active?`<span class="cc-ws" style="--w:${wsColor(x.ws)}" title="${esc(x.ws)}">${esc(x.ws)}</span>`:''}${x.keys?`<kbd>${esc(x.keys)}</kbd>`:''}${x.kind==='server'&&x.on?'<span class="cc-live">attivo</span>':''}</div>`;
  }
  function actionBar(x){
    return `<div class="cc-bar"><span class="who">${icon(x)}<span>${esc(x.label)}</span></span><span class="sep"></span>
      ${(x.actions||[]).map((a,j)=>`<button class="cc-act${j===st.act?' on':''}" data-a="${j}">${esc(a)}</button>`).join('')}
      <span class="sep"></span><span class="cc-hint"><kbd>Tab</kbd><kbd>Invio</kbd></span></div>`;
  }

  // Anello
  const ORDER=['now','tabs','projects','links','commands','web','jarvis','create'];
  function renderRing(){
    const cur=current();const curG=flat[st.sel]?.group;
    const b=st.bounds||{width:innerWidth,height:innerHeight};
    // Beta 0.38.1: l'anello sta nello spazio che resta tolte la barra in alto, le azioni sotto e i suggerimenti (niente sovrapposizioni).
    const H=Math.max(300,b.height-20);
    const Rr=Math.round(Math.max(120,Math.min(230,(H-170)/2,(b.width-460)/2.2)));const RI=Math.round(Rr*0.56);
    const step=360/ORDER.length,GAP=1.6;
    const pt=(r,a)=>[Rr+r*Math.cos((a-90)*Math.PI/180),Rr+r*Math.sin((a-90)*Math.PI/180)];
    const path=(a0,a1,r0,r1)=>{const [x0,y0]=pt(r1,a0),[x1,y1]=pt(r1,a1),[x2,y2]=pt(r0,a1),[x3,y3]=pt(r0,a0);return `M${x0},${y0}A${r1},${r1} 0 0 1 ${x1},${y1}L${x2},${y2}A${r0},${r0} 0 0 0 ${x3},${y3}Z`;};
    const segs=ORDER.map((id,i)=>{const g=groups.find(g=>g.id===id);return `<g class="cc-seg${g?'':' empty'}${id===curG?' on':''}" data-seg="${id}"><path d="${path(i*step-step/2+GAP,i*step+step/2-GAP,RI,Rr)}"/></g>`;}).join('');
    const labs=ORDER.map((id,i)=>{const g=groups.find(g=>g.id===id),s=R.SECTIONS.find(s=>s.id===id);const [lx,ly]=pt((Rr+RI)/2+3,i*step);
      return `<div class="cc-rlab${id===curG?' on':''}" style="left:${lx}px;top:${ly}px">${I[SEC_ICON[id]]}<span>${esc(s.title)}</span><span class="n">${g?g.items.length:'—'}</span></div>`;}).join('');
    const ci=ORDER.indexOf(curG);
    const arc=ci>=0?`<path class="cc-arc" d="M${pt(Rr+8,ci*step-step/2+5).join(',')}A${Rr+8},${Rr+8} 0 0 1 ${pt(Rr+8,ci*step+step/2-5).join(',')}"/>`:'';
    const acts=cur?.actions||[];
    // Le azioni in una fila sotto l'anello (prima erano su un'orbita e finivano sopra l'anello e sui suggerimenti).
    const orbit=acts.map((a,j)=>`<button class="cc-act${j===st.act?' on':''}" data-a="${j}">${esc(a)}</button>`).join('');
    const g=groups.find(g=>g.id===curG);
    const items=g&&!g.collapsed?g.shown:[];
    const i0=indexOf(curG,0);
    const fan=items.map((x,i)=>{const k=i0+i;const d=Math.abs(k-st.sel);
      return `${i===g.split?'<div class="cc-split">Altri workspace</div>':''}<div class="cc-fi${k===st.sel?' sel':''}${x.off?' off':''}" data-i="${k}" style="transform:translateX(${Math.min(d,4)*-7}px)">${icon(x)}
        <div class="t"><b>${esc(x.label)}</b>${x.detail?`<span>${esc(x.detail)}</span>`:''}</div>${x.ws&&x.ws!==st.active?`<span class="cc-ws" style="--w:${wsColor(x.ws)}">${esc(x.ws)}</span>`:''}${x.keys?`<kbd>${esc(x.keys)}</kbd>`:''}</div>`;}).join('');
    const pvItem=st.hover||cur;
    const pv=pvItem&&!NO_PREVIEW.has(pvItem.kind)&&!pvItem.dynamic?`<div class="cc-rpv">${previewHtml(pvItem)}</div>`:'';
    const cs=(RI-8)*2;
    return `<div class="cc-ringwrap"><div class="cc-scopes floating">${scopeChips()}${styleToggle()}</div>
      <div class="cc-ringcol"><div class="cc-ring" style="width:${2*Rr}px;height:${2*Rr}px"><svg viewBox="0 0 ${2*Rr} ${2*Rr}" width="${2*Rr}" height="${2*Rr}">${segs}${arc}</svg>${labs}
        <div class="cc-core" style="width:${cs}px;height:${cs}px"><span class="k">Command center</span><div class="cc-rinp">${I.search}<span id="ccSlot"></span></div>
          <span class="t">${g?esc(g.title):'Nessun risultato'}</span><span class="k">${esc(st.active)} prima</span></div>
        </div><div class="cc-ractions" style="max-width:${Math.max(2*Rr+80,360)}px">${orbit}</div></div>
      <div class="cc-fan"><h3>${g?I[SEC_ICON[g.id]]+esc(g.title):''}<kbd>←</kbd><kbd>→</kbd></h3><div class="cc-scroll">${fan}
        ${g&&g.more?`<button class="cc-more" data-expand="${g.id}">Mostra tutti (${g.items.length})</button>`:''}${!groups.length?emptyHtml():''}</div>${pv}</div></div>
      <div class="cc-foot cc-hint"><span><kbd>←</kbd><kbd>→</kbd> sezione</span><span><kbd>↑</kbd><kbd>↓</kbd> scegli</span><span><kbd>Tab</kbd> azioni</span><span><kbd>Invio</kbd> esegui</span><span><kbd>Esc</kbd> chiudi</span></div>`;
  }

  // ── Mouse ──
  function bind(root){
    root.querySelectorAll('[data-i]').forEach(el=>{
      const k=+el.dataset.i;const x=flat[k]?.item;if(!x)return;
      el.onmouseenter=()=>{
        if(st.style==='board'&&!el.classList.contains('cc-tile')){
          const r=el.getBoundingClientRect(),base=root.getBoundingClientRect();
          const w=320,left=r.right+12+w>base.right?r.left-w-12:r.right+12;
          st.hoverAt={x:Math.max(base.left+8,left)-base.left,y:Math.max(8,Math.min(r.top-base.top,base.height-360))};
        }
        if(st.hover?.id!==x.id){st.hover=x;wantPreview(x);render();}
      };
      el.onmouseleave=()=>{if(st.hover?.id===x.id){st.hover=null;setTimeout(()=>{if(!st.hover&&st.open)render();},60);}};
      el.onclick=()=>{st.sel=k;st.act=0;runItem(x,0);};
    });
    root.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{st.act=+b.dataset.a;runItem(current(),st.act);});
    root.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>{const id=b.dataset.toggle;st.collapsed.has(id)?st.collapsed.delete(id):st.collapsed.add(id);render();input().focus();});
    root.querySelectorAll('[data-expand]').forEach(b=>b.onclick=()=>{const id=b.dataset.expand;st.expanded.has(id)?st.expanded.delete(id):st.expanded.add(id);render();input().focus();});
    root.querySelectorAll('[data-scope]').forEach(b=>b.onclick=()=>{
      st.scope=b.dataset.scope;const {forced,text}=R.parseQuery(st.q);if(forced){st.q=text;}st.sel=0;st.act=0;askSuggestions();render();input().focus();});
    root.querySelectorAll('[data-seg]').forEach(s=>s.onclick=()=>{goSection(s.dataset.seg);input().focus();});
    root.querySelectorAll('[data-style]').forEach(b=>b.onclick=()=>{st.style=b.dataset.style;act('ccSetStyle',{style:st.style});render();input().focus();});
  }

  // ── Tastiera ──
  function goSection(id){const k=flat.findIndex(f=>f.group===id);if(k>=0){st.sel=k;st.act=0;render();}}
  function stepSection(dir){
    const present=(st.style==='ring'?ORDER:groups.map(g=>g.id)).filter(id=>flat.some(f=>f.group===id));
    if(!present.length)return;
    const i=present.indexOf(flat[st.sel]?.group);
    goSection(present[(i+dir+present.length)%present.length]);
  }
  function onKey(e){
    const x=current();const n=x?.actions?.length||1;
    const caretEnd=inputEl.selectionStart===inputEl.value.length&&inputEl.selectionEnd===inputEl.value.length;
    const caretStart=inputEl.selectionStart===0&&inputEl.selectionEnd===0;
    if(e.key==='ArrowDown'&&e.altKey){e.preventDefault();stepSection(1);}
    else if(e.key==='ArrowUp'&&e.altKey){e.preventDefault();stepSection(-1);}
    else if(e.key==='ArrowDown'){e.preventDefault();if(flat.length){st.sel=(st.sel+1)%flat.length;st.act=0;st.hover=null;render();}}
    else if(e.key==='ArrowUp'){e.preventDefault();if(flat.length){st.sel=(st.sel-1+flat.length)%flat.length;st.act=0;st.hover=null;render();}}
    else if(e.key==='Tab'){e.preventDefault();st.act=(st.act+(e.shiftKey?-1:1)+n)%n;render();}
    else if(st.style==='ring'&&(e.key==='ArrowRight'&&caretEnd||e.key==='ArrowLeft'&&(caretStart||!st.q))){e.preventDefault();stepSection(e.key==='ArrowRight'?1:-1);}
    else if(st.style==='board'&&e.key==='ArrowRight'&&caretEnd&&st.act<n-1){e.preventDefault();st.act++;render();}
    else if(st.style==='board'&&e.key==='ArrowLeft'&&st.act>0){e.preventDefault();st.act--;render();}
    else if(e.key==='Enter'){e.preventDefault();runItem(x,e.ctrlKey?1:st.act);}
    else if(e.key==='Escape'){e.preventDefault();if(st.act){st.act=0;render();}else if(st.q){st.q='';inputEl.value='';st.sel=0;render();}else close();}
  }

  $('palette').addEventListener('mousedown',e=>{if(!e.target.closest('#cc .cc-board,#cc .cc-ringwrap>*,#cc .cc-pop,#cc .cc-foot'))close();});

  window.CommandCenter={open,close,isOpen:()=>st.open,refreshStyle:style=>{if(['board','ring'].includes(style))st.style=style;if(st.open)render();}};
})();
