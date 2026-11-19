/* Beta 0.43.4 — Companion compatto: widget della board del gioco, pagine del preset, scelta del preset all'avvio.
 * Lo stato arriva da lib/companion-panel.cjs (canale 'companion'); le modifiche (obiettivi, timer) vanno nella board. */
(function(){
'use strict';
const C=window.companion,$=s=>document.querySelector(s);
const IP={timer:'M12 8v5l3 2M9 3h6M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',link:'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  wide:'M4 5h16v14H4zM10 5v14',strip:'M15 5h5v14h-5zM4 5h8v14H4z',pin:'M9 4h6l-1 6 4 3H6l4-3zM12 13v8',page:'M4 4h16v16H4zM14 4v16',close:'M6 6l12 12M18 6L6 18',
  play:'M7 4l13 8-13 8z',plus:'M12 5v14M5 12h14',back:'M15 5l-7 7 7 7',fwd:'M9 5l7 7-7 7',reload:'M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5',pause:'M8 5v14M16 5v14',down:'M6 9l6 6 6-6',open:'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',window:'M3 5h18v14H3zM3 9h18'};
const svg=(n,s=16)=>`<svg class="i" viewBox="0 0 24 24" width="${s}" height="${s}"><path d="${IP[n]}"/></svg>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hm=ms=>{const m=Math.floor(ms/60000);return Math.floor(m/60)+':'+String(m%60).padStart(2,'0');};
const mmss=x=>{x=Math.max(0,Math.ceil(x));return Math.floor(x/60)+':'+String(x%60).padStart(2,'0');};
const tok=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const lum=h=>{const m=/^#?([0-9a-f]{6})$/i.exec(h);if(!m)return 0;return [0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);};
const onColor=h=>1.05/(lum(h)+.05)>=3?'#fff':'#111';
let S=null,lastKey='',pickT=null,pickShown=false,menuOn=false;

function timerLeft(t){if(t.mode==='until'){const d=new Date(),r=new Date(d);r.setHours(t.hour??18,0,0,0);r.setDate(d.getDate()+(((t.day??2)-d.getDay()+7)%7));if(r<=d)r.setDate(r.getDate()+7);return (r-d)/1000;}
  return t.run&&t.at?t.left-(Date.now()-t.at)/1000:t.left;}
function fmtLeft(x,t){if(t.mode==='until'){const d=Math.floor(x/86400),h=Math.floor(x/3600)%24,m=Math.floor(x/60)%60;return d?`${d}g ${h}h`:`${h}:${String(m).padStart(2,'0')}`;}return mmss(x);}
const timers=()=>Object.entries(S.board.tiles).filter(([,t])=>t.timer);
const tagStyle=n=>{const t=S.index.tags.find(t=>t.n===n);if(!t)return '';const c=[tok('--s-sig'),tok('--s-alt'),tok('--s-ok'),tok('--s-warn'),tok('--s-err')][t.c]||tok('--s-dim');return `background:${c};color:${onColor(c)}`;};
const presetOf=()=>S.index.presets[S.index.session?.preset||S.index.lastPreset]||{n:'—',open:[]};

function widget(k){
  const s=S.index.session;
  if(k==='partita'){const d=s?Date.now()-s.start:0;return `<div class="w"><div class="w-h mono">Partita<span class="r">${esc(presetOf().n)}</span></div><div class="big" data-live>${s?hm(d):'—'}</div><div class="bar"><i data-livebar style="width:${Math.min(100,d/(4*3600e3)*100)}%"></i></div></div>`;}
  if(k==='timer'){const list=timers();return `<div class="w"><div class="w-h mono">Timer</div>${list.map(([id,{timer:t}])=>{const l=timerLeft(t),st=t.mode==='until'?'':l<=0?'err':l<=10?'warn':t.run?'ok':'';
    return `<div class="tm ${st}" data-t="${esc(id)}"><span><span class="mono" style="opacity:.75">${esc(t.label)}</span><br><span class="v">${fmtLeft(l,t)}</span></span>${t.mode==='until'?'':`<button data-tt="${esc(id)}" title="Avvia o pausa">${svg(t.run?'pause':'play',15)}</button>`}</div>`;}).join('')||'<span class="empty">Nessun timer sulla board.</span>'}</div>`;}
  if(k==='obiettivi'){const tk=S.board.tasks;return `<div class="w"><div class="w-h mono">Obiettivi<span class="r">${tk.filter(t=>t.done).length}/${tk.length}</span></div>${tk.slice(0,12).map((t,i)=>`<label class="task${t.done?' done':''}"><input type="checkbox" data-task="${i}"${t.done?' checked':''}><span>${esc(t.t)}</span><span class="tag" style="${tagStyle(t.tag)}">${esc(t.tag)}</span></label>`).join('')||'<span class="empty">Nessun obiettivo.</span>'}</div>`;}
  if(k==='note')return `<div class="w"><div class="w-h mono">Note tattiche</div>${S.board.notes?`<div class="note">${esc(S.board.notes)}</div>`:'<span class="empty">Nessuna nota.</span>'}</div>`;
  if(k==='catture')return `<div class="w"><div class="w-h mono">Ultime catture<span class="r">${S.shots.length}</span></div>${S.shots.length?`<div class="caps">${S.shots.slice(0,6).map(x=>`<button class="${x.clip?'clip':''}" data-shot="${esc(x.name)}" title="${esc(x.name)}" style="${x.clip?'':`background-image:url('${x.url}')`}"></button>`).join('')}</div>`:'<span class="empty">Nessuna cattura.</span>'}</div>`;
  if(k==='link')return `<div class="w"><div class="w-h mono">Link rapidi</div><div class="links">${S.index.quick.map((l,i)=>`<button data-link="${i}" title="${esc(l.u)}">${svg('link',13)}${esc(l.n)}</button>`).join('')||'<span class="empty">Nessun link.</span>'}</div></div>`;
  return '';
}

function render(){
  const cfg=S.cfg,p=presetOf(),comp=$('#comp');
  comp.classList.toggle('wide',cfg.mode==='wide');
  const pages=[...(p.open||[]),...(S.temp||[]).map(t=>t.n)];
  comp.innerHTML=`<header class="head"><div class="logo">${esc(S.game.name.split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase())}</div>
    <div class="title"><b>${esc(S.game.name)}</b><button class="preset" data-presetmenu title="Cambia preset">${esc(p.n)} ${svg('down',12)}</button></div>
    <button class="tb${cfg.mode==='wide'?' on':''}" data-mode title="${cfg.mode==='wide'?'Striscia':'Estesa'}">${svg(cfg.mode==='wide'?'strip':'wide')}</button>
    <button class="tb${cfg.top?' on':''}" data-top title="Sempre in primo piano">${svg('pin')}</button>
    <button class="tb" data-page2 title="Apri la pagina del gioco">${svg('page')}</button>
    <button class="tb" data-close title="Chiudi (riapri con Prova o al prossimo avvio)">${svg('close')}</button></header>
  <nav class="tabs">${pages.map(n=>`<span class="tab${n===S.page?' on':''}"><button data-pg="${esc(n)}">${svg('link',12)}${esc(n)}</button><button class="x" data-pgx="${esc(n)}" title="Togli questa pagina">${svg('close',11)}</button></span>`).join('')}
    <button class="tb sm" data-pgadd title="Apri un'altra pagina: un link rapido o un indirizzo">${svg('plus',14)}</button>
    <span class="navs"><button class="tb sm" data-nav="back"${S.nav?.back?'':' disabled'} title="Indietro">${svg('back',14)}</button><button class="tb sm" data-nav="forward"${S.nav?.fwd?'':' disabled'} title="Avanti">${svg('fwd',14)}</button>
    <button class="tb sm" data-nav="reload" title="Ricarica">${svg('reload',14)}</button><button class="tb sm" data-opentab title="Apri in una scheda di VARCO (e vai lì)">${svg('open',14)}</button></span></nav>
  <section class="body"><div class="widgets">${cfg.widgets.map(widget).join('')||'<span class="empty">Nessun widget: sceglili nelle impostazioni del preset (pagina del gioco).</span>'}</div></section>
  <footer class="foot"><span class="mono">${cfg.mode==='wide'?'estesa':'striscia'} · ${cfg.op}%${S.through?' · attraversabile':''}</span>${cfg.mode==='strip'?pages.map(n=>`<button class="chip" data-pgw="${esc(n)}" title="Apri ${esc(n)}">${svg('link',12)}${esc(n)}</button>`).join(''):''}</footer>
  ${S.through?'<div class="badge">I clic vanno al gioco · Ctrl+Shift+G per usarlo</div>':''}`;
  wire();
  if(S.pick)showPick();else{pickShown=false;clearInterval(pickT);}
}
function wire(){
  const comp=$('#comp');
  comp.onmouseenter=()=>C.call('hover',{on:true});comp.onmouseleave=()=>C.call('hover',{on:false});
  comp.querySelector('[data-mode]').onclick=()=>C.call('mode',{mode:S.cfg.mode==='wide'?'strip':'wide'}).then(refresh);
  comp.querySelector('[data-top]').onclick=()=>C.call('top').then(refresh);
  comp.querySelector('[data-page2]').onclick=()=>C.call('gamePage');
  comp.querySelector('[data-close]').onclick=()=>C.call('close');
  comp.querySelector('[data-presetmenu]').onclick=e=>{e.stopPropagation();presetMenu();};
  comp.querySelectorAll('[data-pg],[data-pgw]').forEach(b=>b.onclick=()=>C.call('page',{name:b.dataset.pg||b.dataset.pgw}).then(refresh));
  comp.querySelectorAll('[data-pgx]').forEach(b=>b.onclick=e=>{e.stopPropagation();C.call('pageRemove',{name:b.dataset.pgx}).then(refresh);});
  comp.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>C.call('nav',{dir:b.dataset.nav}));
  const ot=comp.querySelector('[data-opentab]');if(ot)ot.onclick=()=>C.call('openTab');
  const pa=comp.querySelector('[data-pgadd]');if(pa)pa.onclick=e=>{e.stopPropagation();pageMenu(pa);};
  comp.querySelectorAll('[data-link]').forEach(b=>b.onclick=()=>C.call('link',{i:+b.dataset.link}).then(refresh));
  comp.querySelectorAll('[data-shot]').forEach(b=>b.onclick=()=>C.call('openShot',{name:b.dataset.shot}));
  comp.querySelectorAll('[data-task]').forEach(i=>i.onchange=()=>{const t=S.board.tasks[+i.dataset.task];t.done=i.checked;if(t.done)t.doneAt=Date.now();else delete t.doneAt;saveBoard();render();});
  comp.querySelectorAll('[data-tt]').forEach(b=>b.onclick=()=>{const t=S.board.tiles[b.dataset.tt].timer;
    if(t.run){t.left=timerLeft(t);t.run=false;delete t.at;}else{if(t.left<=0)t.left=t.secs;t.run=true;t.at=Date.now();}saveBoard();render();});
}
/* «+»: un altro link rapido (resta nel preset) o un indirizzo qualsiasi (solo per ora) */
function pageMenu(anchor){
  const have=new Set([...(presetOf().open||[]),...(S.temp||[]).map(t=>t.n)]);
  const m=document.createElement('div');m.className='menu';const r=anchor.getBoundingClientRect();m.style.top=(r.bottom+4)+'px';m.style.left=Math.max(8,Math.min(r.left,innerWidth-250))+'px';
  m.innerHTML=`<form class="addr"><input placeholder="Indirizzo o ricerca…" spellcheck="false"></form>${S.index.quick.filter(l=>!have.has(l.n)).map(l=>`<button data-q="${esc(l.n)}">${svg('link',13)}${esc(l.n)}<small>link rapido</small></button>`).join('')}`;
  document.body.appendChild(m);C.call('cover',{on:true});const off=e=>{if(e&&m.contains(e.target))return;m.remove();C.call('cover',{on:false});removeEventListener('mousedown',off);};setTimeout(()=>addEventListener('mousedown',off),0);
  m.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{off();C.call('pageAdd',{name:b.dataset.q}).then(refresh);});
  const f=m.querySelector('form');f.onsubmit=e=>{e.preventDefault();const v=f.querySelector('input').value.trim();if(!v)return;off();C.call('pageUrl',{url:v}).then(refresh);};
  setTimeout(()=>f.querySelector('input').focus(),20);
}
function presetMenu(){
  const m=document.createElement('div');m.className='menu';
  m.innerHTML=Object.entries(S.index.presets).map(([k,p])=>`<button data-k="${k}">${esc(p.n)}<small>${p.k}</small></button>`).join('');
  document.body.appendChild(m);C.call('cover',{on:true});const off=()=>{m.remove();C.call('cover',{on:false});removeEventListener('click',off);};setTimeout(()=>addEventListener('click',off),0);
  m.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{off();C.call('pick',{preset:b.dataset.k}).then(refresh);});
}
/* «Che partita è?»: tasti 1–4, dopo 10 s resta l'ultimo preset */
function showPick(){
  if(pickShown)return;pickShown=true;
  const last=S.index.session?.preset||S.index.lastPreset,T0=Date.now(),box=document.createElement('div');box.className='pick';
  box.innerHTML=`<span class="mono kick">${esc(S.game.name)} è partito</span><h2>Che partita è?</h2><div class="grid">${Object.entries(S.index.presets).map(([k,v])=>`<button class="p${k===last?' last':''}" data-p="${k}"><span><b>${esc(v.n)}</b><small>${esc((v.comp?.widgets||[]).join(' · '))}${v.open?.length?' · '+esc(v.open.join(', ')):''}</small></span><span class="k">${v.k}</span>${k===last?'<i class="cnt"></i>':''}</button>`).join('')}</div>
    <div class="foot2"><span class="mono" data-left>tra 10 s: ${esc(S.index.presets[last]?.n||'')}</span><button class="mono" data-p="${last}">Tieni questo</button></div>`;
  $('#comp').appendChild(box);
  const choose=k=>{clearInterval(pickT);removeEventListener('keydown',key,true);box.remove();C.call('pick',{preset:k}).then(refresh);};
  box.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>choose(b.dataset.p));
  const key=e=>{const f=Object.entries(S.index.presets).find(([,v])=>v.k===e.key);if(f){e.preventDefault();choose(f[0]);}};addEventListener('keydown',key,true);
  clearInterval(pickT);pickT=setInterval(()=>{const f=Math.min(1,(Date.now()-T0)/10000),c=box.querySelector('.cnt');if(c)c.style.width=f*100+'%';
    const l=box.querySelector('[data-left]');if(l)l.textContent='tra '+Math.ceil((10000-(Date.now()-T0))/1000)+' s: '+(S.index.presets[last]?.n||'');if(f>=1)choose(last);},100);
}
let saveT=null;function saveBoard(){clearTimeout(saveT);saveT=setTimeout(()=>C.call('saveBoard',{board:JSON.stringify(S.board)}).then(r=>{if(r?.rev)lastKey=keyOf({...S,rev:r.rev});}),300);}
const keyOf=s=>JSON.stringify([s.nav,s.temp,s.rev,s.cfg,s.page,s.through,s.pick,s.index.session,s.index.lastPreset,s.index.presets,s.index.quick,s.index.tags,s.vars]);
async function refresh(){
  const s=await C.call('state');if(!s||s.missing)return;
  for(const [k,v] of Object.entries(s.vars||{}))document.documentElement.style.setProperty(k,v);
  const k=keyOf(s);S=s;if(k===lastKey||document.activeElement?.matches?.('input[type=checkbox]')&&saveT)return;lastKey=k;render();
}
setInterval(()=>{if(!S)return;const s=S.index.session;
  const l=document.querySelector('[data-live]');if(l&&s)l.textContent=hm(Date.now()-s.start);
  const b=document.querySelector('[data-livebar]');if(b&&s)b.style.width=Math.min(100,(Date.now()-s.start)/(4*3600e3)*100)+'%';
  document.querySelectorAll('[data-t]').forEach(el=>{const t=S.board.tiles[el.dataset.t]?.timer;if(!t)return;const x=timerLeft(t);el.querySelector('.v').textContent=fmtLeft(x,t);
    el.className='tm '+(t.mode==='until'?'':x<=0?'err':x<=10?'warn':t.run?'ok':'');});},500);
setInterval(refresh,1500);C.onPoke(refresh);refresh();
})();
