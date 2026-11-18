/* Pagina del gioco — timer, catture, scelta del preset all'avvio e avviso di fine sessione (esempio).
   Usa le funzioni della tela (S, refill, save, ART…) definite nella pagina: qui solo funzioni, chiamate più tardi. */

/* ── Timer ── */
function wireTimer(el,id){
  el.querySelectorAll('[data-tm]').forEach(b=>b.onclick=e=>{e.stopPropagation();const t=S.tiles[id].timer;
    if(b.dataset.tm==='toggle'){if(t.run){t.left=timerLeft(t);t.run=false;t.at=null;}else{if(t.left<=0)t.left=t.secs;t.run=true;t.at=Date.now();}}
    else{t.left=t.secs;t.run=false;t.at=null;}
    save();refill(id);});
  // doppio clic sul nome: cambia la durata
  const h=el.querySelector('.th h3');if(h&&S.tiles[id].timer.mode!=='until')h.ondblclick=()=>{const t=S.tiles[id].timer;const v=prompt('Nome e durata (es. «Fase DPS 0:45»)',t.label+' '+fmtLeft(t.secs,t));
    if(!v)return;const m=v.match(/^(.*?)\s*(\d+):(\d{2})$/);if(m){t.label=m[1]||t.label;t.secs=t.left=+m[2]*60+ +m[3];t.run=false;}else t.label=v;save();refill(id);};
}
const beeped=new Set();
setInterval(()=>{
  for(const [id,tile] of Object.entries(S.tiles)){if(typeOf(id)!=='timer')continue;const t=tile.timer,box=document.querySelector(`[data-timer="${id}"]`);if(!box)continue;
    const left=timerLeft(t);box.querySelector('.tm-val').textContent=fmtLeft(left,t);
    const st=t.mode==='until'?'idle':left<=0?'err':left<=10?'warn':t.run?'ok':'idle';box.className='tm tm-'+st;
    if(t.mode!=='until'&&t.run&&left<=0&&!beeped.has(id)){beeped.add(id);flashMsg(`«${t.label}» è scaduto`);box.animate([{transform:'scale(1)'},{transform:'scale(1.04)'},{transform:'scale(1)'}],{duration:400,iterations:3});}
    if(left>0)beeped.delete(id);}
  const s=S.session,dur=s.on?Date.now()-s.start:0;
  const sess=document.querySelector('[data-live=sess]');if(sess)sess.textContent=s.on?hm(dur):'—';
  const today=document.querySelector('[data-live=today]');if(today)today.textContent=hm(dur+20*60e3);
  const bar=document.querySelector('.gbar');if(bar){bar.querySelector('i').style.width=Math.min(100,dur/(4*3600e3)*100)+'%';bar.querySelector('span').textContent=s.on?'sessione '+hms(dur):'—';}
  const mp=document.getElementById('mpreset'),ms=document.getElementById('msess');
  if(mp)mp.textContent=s.on?(PRESETS[s.preset]?.n||'—'):'—';if(ms)ms.textContent=s.on?hms(dur):'ferma';
},500);

/* ── Catture: durante la sessione VARCO guarda le cartelle di Steam / Game Bar / NVIDIA ── */
function capture(){
  if(!S.session.on){flashMsg('Nessuna sessione in corso: avvia il gioco');return;}
  const d=new Date(),clip=Math.random()<.3,n=(clip?'clip_':'cattura_')+d.toTimeString().slice(0,5).replace(':','')+(clip?'.mp4':'.png');
  S.shots.unshift({a:Math.floor(Math.random()*4),n,w:'adesso',...(clip?{clip:'0:'+String(10+Math.floor(Math.random()*40))}:{})});
  S.session.shots=S.session.shots.map(i=>i+1);S.session.shots.unshift(0);S.sel=0;
  save();refill('shots');refill('hero');refill('stream');flashMsg((clip?'Clip':'Screenshot')+' aggiunto alla sessione · '+n);
}

/* ── Avvio: scelta del preset (sopra il gioco, in un angolo) ── */
let pickTimer=null;
function showPreset(){
  if(S.session.on){S.session.on=false;refill('hero');refill('stream');}
  const box=document.getElementById('gmPick'),last=GS.presets[GS.lastPreset]?GS.lastPreset:Object.keys(GS.presets)[0],T0=Date.now(),WAIT=10000;
  box.innerHTML=`<div class="gm-head"><span class="mono">${esc(G.name)} è partito</span><button class="gm-x" title="Senza preset">✕</button></div>
    <h2>Che sessione è?</h2>
    <div class="gm-grid">${Object.entries(PRESETS).map(([k,p])=>`<button class="gm-p${k===last?' last':''}" data-p="${k}"><span class="gm-key">${p.k}</span><span class="ms">${p.i}</span><b>${p.n}</b><small>${p.d.join('<br>')}</small>${k===last?'<i class="gm-count"></i>':''}</button>`).join('')}</div>
    <div class="gm-foot"><span class="mono">Tra 10 s: ${PRESETS[last].n} (l'ultimo usato)</span><span><button data-edit>Modifica i preset</button><button data-p="none">Senza preset</button></span></div>`;
  box.classList.add('on');
  const choose=p=>{clearInterval(pickTimer);box.classList.remove('on');removeEventListener('keydown',key,true);
    S.session={on:true,preset:p==='none'?'solo':p,start:Date.now(),shots:[]};if(p!=='none')GS.lastPreset=p;save();refill('hero');refill('stream');refill('shots');
    flashMsg(p==='none'?'Sessione iniziata senza preset':`Sessione «${PRESETS[p].n}» iniziata · ${PRESETS[p].d[0]}`);};
  box.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>choose(b.dataset.p));
  box.querySelector('[data-edit]').onclick=()=>{clearInterval(pickTimer);box.classList.remove('on');removeEventListener('keydown',key,true);showPresetEditor(last,()=>showPreset());};
  box.querySelector('.gm-x').onclick=()=>choose('none');
  const key=e=>{const p=Object.entries(PRESETS).find(([,v])=>v.k===e.key);if(p){e.preventDefault();choose(p[0]);}if(e.key==='Escape')choose('none');};
  addEventListener('keydown',key,true);
  clearInterval(pickTimer);pickTimer=setInterval(()=>{const f=Math.min(1,(Date.now()-T0)/WAIT),c=box.querySelector('.gm-count');if(c)c.style.width=(f*100)+'%';
    const lbl=box.querySelector('.gm-foot .mono');if(lbl)lbl.textContent=`Tra ${Math.ceil((WAIT-(Date.now()-T0))/1000)} s: ${PRESETS[last].n} (l'ultimo usato)`;if(f>=1)choose(last);},100);
}

/* ── Fine: salvare note e catture nella sessione di oggi? ── */
function showEnd(){
  const s=S.session;if(!s.on){flashMsg('Nessuna sessione in corso');return;}
  const dur=Date.now()-s.start,p=PRESETS[s.preset],caps=s.shots.map(i=>S.shots[i]).filter(Boolean),done=S.tasks.filter(t=>t.s==='done');
  const date=new Date().toISOString().slice(0,10),box=document.getElementById('gmEnd'),scrim=document.getElementById('gmScrim');
  box.innerHTML=`<div class="gm-head"><span class="mono">Sessione finita</span><button class="gm-x" data-e="later" title="Ricordamelo dopo">✕</button></div>
    <div class="gm-sum"><div><h2>${esc(G.name)} · ${p.n}</h2><p>dalle ${new Date(s.start).toTimeString().slice(0,5)} alle ${new Date().toTimeString().slice(0,5)}</p></div><div class="gm-dur">${hm(dur)}<small>ore</small></div></div>
    <div class="gbar"><i style="width:${Math.min(100,dur/(4*3600e3)*100)}%"></i><span class="mono">${hms(dur)}</span></div>
    <h3 class="mono">Catture · ${caps.length}</h3>
    <div class="gm-caps">${caps.map((c,i)=>`<label class="gm-cap${c.clip?' clip':''}" style="background:${shotBg(c)} center/cover"><input type="checkbox" checked data-c="${i}"><span>${esc(c.n)}</span></label>`).join('')||'<p class="gm-empty">Nessuna cattura in questa sessione.</p>'}</div>
    <h3 class="mono">Note</h3>
    <textarea class="gm-note" placeholder="Com'è andata? Si aggiunge alla sessione di oggi."></textarea>
    <label class="gm-check"><input type="checkbox" checked> Includi le note tattiche e gli obiettivi fatti (${done.length})</label>
    <div class="gm-dest mono">Documenti\\VARCO\\Giochi\\${esc(G.name)}\\sessioni\\${date}.md</div>
    <div class="gm-actions"><button class="btn" data-e="drop">Non salvare</button><button class="btn" data-e="later">Ricordamelo dopo</button><button class="btn pri" data-e="save"><span class="ms">save</span>Salva nella sessione di oggi</button></div>`;
  box.classList.add('on');scrim.classList.add('on');
  const close=()=>{box.classList.remove('on');scrim.classList.remove('on');};
  box.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{const e=b.dataset.e;
    if(e==='later'){close();flashMsg('Te lo richiedo la prossima volta che apri la pagina del gioco');return;}
    const kept=[...box.querySelectorAll('[data-c]')].filter(x=>x.checked).length;
    S.sessions.unshift({d:'Oggi · '+new Date(s.start).toTimeString().slice(0,5),p:s.preset,dur:hm(dur).replace(':',' h ')+' min',c:e==='save'?kept:0,saved:e==='save'});
    S.session={...s,on:false};save();close();refill('hero');refill('stream');refill('shots');
    flashMsg(e==='save'?`Salvata: ${kept} catture e note in sessioni\\${date}.md`:'Sessione chiusa senza salvare');});
}

function flashMsg(t){const m=document.getElementById('gmMsg');m.textContent=t;m.classList.add('on');clearTimeout(flashMsg.t);flashMsg.t=setTimeout(()=>m.classList.remove('on'),3200);}

addEventListener('DOMContentLoaded',()=>{
  document.getElementById('simStart').onclick=showPreset;
  document.getElementById('simEnd').onclick=showEnd;
  document.getElementById('simShot').onclick=capture;
  document.getElementById('dockShot').onclick=capture;
});

/* ── Build: righe libere ── */
function wireBuild(el){
  el.querySelectorAll('[data-bk],[data-bv]').forEach(f=>f.addEventListener('input',()=>{const i=+(f.dataset.bk??f.dataset.bv);if(f.dataset.bk!=null)S.build[i].k=f.value;else S.build[i].v=f.value;save();}));
  const add=el.querySelector('[data-addrow]');if(add)add.onclick=e=>{e.stopPropagation();S.build.push({k:'',v:''});save();refill('files');setTimeout(()=>el.querySelector(`[data-bk="${S.build.length-1}"]`)?.focus(),20);};
}

/* ── Preset: si modificano, uguali per ogni gioco ── */
const ICONS=['group','emoji_events','videocam','person','swords','sports_esports','explore','school','nightlight'];
function showPresetEditor(sel,after){
  const box=document.getElementById('gmEnd'),scrim=document.getElementById('gmScrim');let cur=sel||Object.keys(GS.presets)[0];
  const draw=()=>{const p=GS.presets[cur];
    box.innerHTML=`<div class="gm-head"><span class="mono">Preset · ${esc(G.name)}</span><button class="gm-x" data-close>✕</button></div>
    <h2>Che cosa apre ogni preset</h2>
    <div class="pe-tabs">${Object.entries(GS.presets).map(([k,v])=>`<button data-k="${k}" class="${k===cur?'on':''}"><span class="ms">${v.i}</span>${esc(v.n)}<span class="gm-key">${v.k}</span></button>`).join('')}<button data-new title="Nuovo preset"><span class="ms">add</span></button></div>
    <div class="pe-body">
      <label class="pe-row"><span class="mono">Nome</span><input data-f="n" value="${esc(p.n)}" maxlength="24"></label>
      <div class="pe-row"><span class="mono">Icona</span><div class="pe-icons">${ICONS.map(i=>`<button data-i="${i}" class="${i===p.i?'on':''}"><span class="ms">${i}</span></button>`).join('')}</div></div>
      <div class="pe-row pe-top"><span class="mono">Apri</span><div class="pe-sites">${GS.links.map(l=>`<label><input type="checkbox" data-site="${esc(l.n)}"${p.open.includes(l.n)?' checked':''}><span class="ms">${esc(l.i)}</span>${esc(l.n)}</label>`).join('')}</div></div>
      <label class="pe-row"><span class="mono">Companion</span><span class="pe-sw"><input type="checkbox" data-f="companion"${p.companion?' checked':''}> i siti si aprono nel companion, sull'altro monitor</span></label>
      <label class="pe-row"><span class="mono">Timer</span><select data-f="timer"><option value="">Nessuno</option>${G.timers.map((t,i)=>`<option value="${i}"${p.timer===i?' selected':''}>${esc(t.label)}</option>`).join('')}</select></label>
      <label class="pe-row"><span class="mono">Note</span><span class="pe-sw"><input type="checkbox" data-f="notes"${p.notes?' checked':''}> mostra le note tattiche</span></label>
      <label class="pe-row"><span class="mono">Clip</span><span class="pe-sw"><input type="checkbox" data-f="clips"${p.clips?' checked':''}> salva le clip della sessione in automatico</span></label>
      <div class="pe-prev mono">${presetDesc(p).join(' · ')}</div>
    </div>
    <div class="gm-actions">${Object.keys(GS.presets).length>1?'<button class="btn" data-del>Elimina</button>':''}<span class="grow"></span><button class="btn pri" data-close>Fatto</button></div>`;
    box.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{cur=b.dataset.k;draw();});
    box.querySelector('[data-new]').onclick=()=>{const k='p'+Date.now().toString(36),n=Object.keys(GS.presets).length+1;GS.presets[k]={n:'Nuovo preset',i:'sports_esports',k:String(n),open:[],companion:false,timer:null,notes:true};cur=k;save();draw();box.querySelector('[data-f=n]').select();};
    box.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{p.i=b.dataset.i;save();draw();});
    box.querySelectorAll('[data-site]').forEach(c=>c.onchange=()=>{const n=c.dataset.site;p.open=c.checked?[...p.open,n]:p.open.filter(x=>x!==n);save();box.querySelector('.pe-prev').textContent=presetDesc(p).join(' · ');});
    box.querySelectorAll('[data-f]').forEach(f=>f.oninput=f.onchange=()=>{const k=f.dataset.f;p[k]=f.type==='checkbox'?f.checked:k==='timer'?(f.value===''?null:+f.value):f.value;save();
      box.querySelector('.pe-prev').textContent=presetDesc(p).join(' · ');if(k==='n')box.querySelector(`.pe-tabs [data-k="${cur}"]`).childNodes[1].textContent=p.n;});
    const del=box.querySelector('[data-del]');if(del)del.onclick=()=>{delete GS.presets[cur];Object.values(GS.presets).forEach((v,i)=>v.k=String(i+1));if(GS.lastPreset===cur)GS.lastPreset=Object.keys(GS.presets)[0];cur=Object.keys(GS.presets)[0];save();draw();};
    box.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{box.classList.remove('on');scrim.classList.remove('on');refill('hero');refill('stream');after&&after();});};
  draw();box.classList.add('on');scrim.classList.add('on');
}

addEventListener('DOMContentLoaded',()=>{
  document.getElementById('gLogo').textContent=G.short;document.getElementById('gName').textContent=G.name;document.getElementById('gGenre').textContent=G.genre;
  document.getElementById('gWs').textContent='Gaming / '+G.name;document.getElementById('gPlat').textContent=G.plat.toUpperCase();document.getElementById('gExe').textContent=G.exe;
  document.getElementById('saved').textContent='● salvato in Documenti\\VARCO\\Giochi\\'+G.name;document.title='Pagina del gioco · '+G.name;
  document.getElementById('gDock').innerHTML=G.links.slice(0,3).map(l=>`<button title="${esc(l[2])}"><span class="ms">${l[0]}</span>${esc(l[1])}</button>`).join('');
  const pick=document.getElementById('gPick');pick.innerHTML=Object.entries(GAMES).map(([k,v])=>`<option value="${k}"${k===GID?' selected':''}>${v.name}</option>`).join('');
  pick.onchange=()=>{try{localStorage.setItem(GKEY,pick.value)}catch{};location.reload();};
  const sims=document.querySelectorAll('.tp-sim'),sim=sims[sims.length-1];const b=document.createElement('button');b.textContent='Preset';b.onclick=()=>showPresetEditor(GS.lastPreset);sim.appendChild(b);
});


/* ══════════ Round 3: tutto personalizzabile, board persistenti, storico, collezione di board ══════════ */
const ICONSET=['menu_book','map','forum','smart_display','groups','leaderboard','shield','travel_explore','storefront','calculate','school','link','sports_esports','emoji_events','music_note','live_tv'];
function popMenu(anchor,items,onPick){const m=document.getElementById('menu');
  m.innerHTML=items.map((it,i)=>`<button data-i="${i}">${it.sw?`<i class="sw" style="background:${it.sw}"></i>`:''}${it.ms?`<span class="ms">${it.ms}</span>`:''}${esc(it.t)}${it.on?'<small>✓</small>':''}</button>`).join('');
  const r=anchor.getBoundingClientRect();m.style.left=Math.min(r.left,innerWidth-250)+'px';m.style.top=(r.bottom+6)+'px';m.classList.add('on');
  m.querySelectorAll('[data-i]').forEach(b=>b.onclick=e=>{e.stopPropagation();m.classList.remove('on');onPick(items[+b.dataset.i]);});}

/* ── Etichette degli obiettivi (in comune tra le board del gioco) ── */
function wireTags(el){
  el.querySelectorAll('[data-tagof]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const i=+b.dataset.tagof;
    popMenu(b,[...GS.tags.map(t=>({t:t.n,sw:linkCol(t.c),on:t.n===S.tasks[i].tag})),{t:'Gestisci le etichette…',ms:'tune',manage:1}],it=>{if(it.manage)return showTagEditor();S.tasks[i].tag=it.t;save();refill('tasks');});}));
  const m=el.querySelector('[data-tags]');if(m)m.onclick=e=>{e.stopPropagation();showTagEditor();};
}
function showTagEditor(){
  const box=document.getElementById('gmEnd'),scrim=document.getElementById('gmScrim');
  const draw=()=>{box.innerHTML=`<div class="gm-head"><span class="mono">Etichette · ${esc(G.name)}</span><button class="gm-x" data-close>✕</button></div>
    <h2>Etichette degli obiettivi</h2><p class="hintline" style="margin:-4px 0 12px">Valgono per tutte le board di questo gioco. Rinominare un'etichetta aggiorna anche gli obiettivi che la usano.</p>
    <div class="te-list">${GS.tags.map((t,i)=>`<div class="te-row"><span class="te-chip" style="${tagStyle(t.n)}">${esc(t.n)||'—'}</span>
      <input data-tn="${i}" value="${esc(t.n)}" maxlength="18"><span class="te-sw">${[0,1,2,3,4].map(c=>`<button data-tc="${i}:${c}" class="${c===t.c?'on':''}" style="background:${linkCol(c)}"></button>`).join('')}</span>
      <span class="mono te-n">${S.tasks.filter(x=>x.tag===t.n).length}</span><button class="gm-x" data-td="${i}" title="Elimina">✕</button></div>`).join('')}</div>
    <button class="btn" data-tadd style="margin-top:10px"><span class="ms">add</span>Nuova etichetta</button>
    <div class="gm-actions"><button class="btn pri" data-close>Fatto</button></div>`;
    box.querySelectorAll('[data-tn]').forEach(inp=>inp.onchange=()=>{const t=GS.tags[+inp.dataset.tn],old=t.n,v=inp.value.trim()||old;
      for(const b of Object.values(GS.boards))b.state.tasks.forEach(x=>{if(x.tag===old)x.tag=v;});t.n=v;save();draw();});
    box.querySelectorAll('[data-tc]').forEach(b=>b.onclick=()=>{const [i,c]=b.dataset.tc.split(':').map(Number);GS.tags[i].c=c;save();draw();});
    box.querySelectorAll('[data-td]').forEach(b=>b.onclick=()=>{const t=GS.tags[+b.dataset.td];if(GS.tags.length<2)return;GS.tags.splice(+b.dataset.td,1);
      for(const bd of Object.values(GS.boards))bd.state.tasks.forEach(x=>{if(x.tag===t.n)x.tag=GS.tags[0].n;});save();draw();});
    box.querySelector('[data-tadd]').onclick=()=>{GS.tags.push({n:'Nuova',c:GS.tags.length%5});save();draw();const ins=box.querySelectorAll('[data-tn]');ins[ins.length-1].select();};
    box.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{box.classList.remove('on');scrim.classList.remove('on');refill('tasks');});};
  draw();box.classList.add('on');scrim.classList.add('on');
}

/* ── Link rapidi (in comune tra le board del gioco) ── */
function wireLinks(el){
  const a=el.querySelector('[data-addlink]');if(a)a.onclick=e=>{e.stopPropagation();showLinkEditor(-1);};
  el.querySelectorAll('[data-le]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();showLinkEditor(+b.dataset.le);});
  el.querySelectorAll('[data-ld]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();const l=GS.links.splice(+b.dataset.ld,1)[0];save();refill('res');dockLinks();flashMsg(`«${l.n}» tolto dai link rapidi`);});
}
function showLinkEditor(i){
  const box=document.getElementById('gmEnd'),scrim=document.getElementById('gmScrim'),isNew=i<0,l=isNew?{i:'link',n:'',u:'',w:'scheda',dock:false}:{...GS.links[i]};
  box.innerHTML=`<div class="gm-head"><span class="mono">Link rapidi · ${esc(G.name)}</span><button class="gm-x" data-close>✕</button></div>
    <h2>${isNew?'Nuovo link':'Modifica link'}</h2>
    <div class="pe-body">
      <label class="pe-row"><span class="mono">Nome</span><input data-f="n" value="${esc(l.n)}" placeholder="es. Wiki, Mappa, Calcolatore build" maxlength="28"></label>
      <label class="pe-row"><span class="mono">Indirizzo</span><input data-f="u" value="${esc(l.u)}" placeholder="https://…" spellcheck="false"></label>
      <div class="pe-row"><span class="mono">Icona</span><div class="pe-icons">${ICONSET.map(x=>`<button data-ic="${x}" class="${x===l.i?'on':''}"><span class="ms">${x}</span></button>`).join('')}</div></div>
      <div class="pe-row"><span class="mono">Si apre</span><div class="tp-seg pe-seg"><button data-w="pannello" class="${l.w==='pannello'?'on':''}">Pannello</button><button data-w="scheda" class="${l.w==='scheda'?'on':''}">Scheda</button><button data-w="companion" class="${l.w==='companion'?'on':''}">Companion</button></div></div>
      <label class="pe-row"><span class="mono">Dock</span><span class="pe-sw"><input type="checkbox" data-f="dock"${l.dock?' checked':''}> mostra il pulsante nel dock in basso</span></label>
    </div>
    <div class="gm-actions"><button class="btn" data-close>Annulla</button><button class="btn pri" data-ok>${isNew?'Aggiungi':'Salva'}</button></div>`;
  box.querySelectorAll('[data-ic]').forEach(b=>b.onclick=()=>{l.i=b.dataset.ic;box.querySelectorAll('[data-ic]').forEach(x=>x.classList.toggle('on',x===b));});
  box.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{l.w=b.dataset.w;box.querySelectorAll('[data-w]').forEach(x=>x.classList.toggle('on',x===b));});
  const close=()=>{box.classList.remove('on');scrim.classList.remove('on');};
  box.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);
  box.querySelector('[data-ok]').onclick=()=>{l.n=box.querySelector('[data-f=n]').value.trim();l.u=box.querySelector('[data-f=u]').value.trim().replace(/^https?:\/\//,'');l.dock=box.querySelector('[data-f=dock]').checked;
    if(!l.n){box.querySelector('[data-f=n]').focus();return;}l.sug=false;if(isNew)GS.links.push(l);else GS.links[i]=l;save();close();refill('res');dockLinks();};
  box.classList.add('on');scrim.classList.add('on');setTimeout(()=>box.querySelector('[data-f=n]').focus(),30);
}
function dockLinks(){document.getElementById('gDock').innerHTML=GS.links.filter(l=>l.dock).slice(0,4).map(l=>`<button title="${esc(l.u)}"><span class="ms">${esc(l.i)}</span>${esc(l.n)}</button>`).join('');}

/* ── Storico delle partite: ogni partita resta, con catture, note e obiettivi fatti ── */
function wireHistory(el){
  el.querySelectorAll('[data-si]').forEach(b=>b.onclick=e=>{e.stopPropagation();showHistory(+b.dataset.si);});
  const live=el.querySelector('[data-live-s]');if(live)live.onclick=e=>{e.stopPropagation();showHistory(-1);};
}
function showHistory(sel){
  const sh=document.getElementById('gmSheet'),list=S.sessions,b=GS.boards[GS.current];
  const tot=list.reduce((a,x)=>a+x.dur,0);
  const one=x=>{const p=PRESETS[x.p]||{n:'Partita',i:'sports_esports'};
    return `<div class="hs-detail"><div class="gm-sum"><div><h2>${esc(p.n)}</h2><p>${esc(fmtDay(x.start))}</p></div><div class="gm-dur">${hm(x.dur)}<small>ore</small></div></div>
    <div class="gbar"><i style="width:${Math.min(100,x.dur/(4*3600e3)*100)}%"></i><span class="mono">${fmtDur(x.dur)}</span></div>
    <h3 class="mono">Catture · ${x.caps.length}</h3><div class="gm-caps">${x.caps.slice(0,8).map((c,i)=>`<div class="gm-cap${/mp4$/.test(c)?' clip':''}" style="background:${ART[(i+x.start/1e5|0)%4]} center/cover"><span>${esc(c)}</span></div>`).join('')||'<p class="gm-empty">Nessuna cattura.</p>'}</div>
    <h3 class="mono">Nota</h3><p class="hs-note">${esc(x.note)||'<span class="gm-empty">Nessuna nota.</span>'}</p>
    <h3 class="mono">Obiettivi fatti</h3>${x.done?.length?`<ul class="hs-done">${x.done.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:'<p class="gm-empty">Nessuno.</p>'}
    <div class="gm-dest mono">sessioni\\${new Date(x.start).toISOString().slice(0,10)}.md</div></div>`;};
  const draw=i=>{sh.innerHTML=`<div class="gm-head"><span class="mono">Storico · ${esc(b.name)}</span><button class="gm-x" data-close>✕</button></div>
    <div class="hs-tot"><div><b>${list.length}</b><span class="mono">partite</span></div><div><b>${hm(tot)}</b><span class="mono">ore</span></div><div><b>${list.reduce((a,x)=>a+x.caps.length,0)}</b><span class="mono">catture</span></div></div>
    <div class="hs-list">${list.map((x,j)=>`<button class="hs-it${j===i?' on':''}" data-j="${j}"><span class="ms">${(PRESETS[x.p]||{}).i||'sports_esports'}</span><span><b>${esc((PRESETS[x.p]||{}).n||'Partita')}</b><small>${esc(fmtDay(x.start))}</small></span><span class="mono">${fmtDur(x.dur)}</span></button>`).join('')}</div>
    ${i>=0&&list[i]?one(list[i]):`<p class="hintline">${S.session.on?'La partita in corso entra nello storico quando chiudi il gioco.':'Scegli una partita.'}</p>`}`;
    sh.querySelectorAll('[data-j]').forEach(x=>x.onclick=()=>draw(+x.dataset.j));sh.querySelector('[data-close]').onclick=()=>sh.classList.remove('on');};
  draw(sel);sh.classList.add('on');
}

/* ── Fine della partita: la board resta com'è, la partita entra nello storico ── */
function showEnd(){
  const s=S.session;if(!s.on){flashMsg('Nessuna partita in corso');return;}
  const dur=Date.now()-s.start,p=PRESETS[s.preset]||{n:'Partita'},caps=s.shots.map(i=>S.shots[i]).filter(Boolean),done=S.tasks.filter(t=>t.s==='done'&&!(t.doneIn&&t.doneIn<s.start));
  const date=new Date().toISOString().slice(0,10),box=document.getElementById('gmEnd'),scrim=document.getElementById('gmScrim'),b=GS.boards[GS.current];
  box.innerHTML=`<div class="gm-head"><span class="mono">Partita finita · board «${esc(b.name)}»</span><button class="gm-x" data-e="later" title="Ricordamelo dopo">✕</button></div>
    <div class="gm-sum"><div><h2>${esc(G.name)} · ${esc(p.n)}</h2><p>dalle ${new Date(s.start).toTimeString().slice(0,5)} alle ${new Date().toTimeString().slice(0,5)}</p></div><div class="gm-dur">${hm(dur)}<small>ore</small></div></div>
    <div class="gbar"><i style="width:${Math.min(100,dur/(4*3600e3)*100)}%"></i><span class="mono">${hms(dur)}</span></div>
    <h3 class="mono">Catture · ${caps.length}</h3>
    <div class="gm-caps">${caps.map((c,i)=>`<label class="gm-cap${c.clip?' clip':''}" style="background:${shotBg(c)} center/cover"><input type="checkbox" checked data-c="${i}"><span>${esc(c.n)}</span></label>`).join('')||'<p class="gm-empty">Nessuna cattura in questa partita.</p>'}</div>
    <h3 class="mono">Com'è andata?</h3>
    <textarea class="gm-note" placeholder="Una riga per ricordartela nello storico."></textarea>
    <label class="gm-check"><input type="checkbox" checked data-keep> Segna nello storico gli obiettivi fatti (${done.length})</label>
    <label class="gm-check"><input type="checkbox" data-reset> Per la prossima partita, togli la spunta agli obiettivi fatti</label>
    <p class="hintline">La board resta com'è: riquadri, obiettivi, note e catture non si perdono quando chiudi il gioco.</p>
    <div class="gm-actions"><button class="btn" data-e="drop">Non salvare la partita</button><button class="btn" data-e="later">Dopo</button><button class="btn pri" data-e="save"><span class="ms">history</span>Aggiungi allo storico</button></div>`;
  box.classList.add('on');scrim.classList.add('on');
  const close=()=>{box.classList.remove('on');scrim.classList.remove('on');};
  box.querySelectorAll('[data-e]').forEach(bt=>bt.onclick=()=>{const e=bt.dataset.e;
    if(e==='later'){close();flashMsg('Te lo richiedo la prossima volta che apri la pagina del gioco');return;}
    if(e==='save'){const kept=[...box.querySelectorAll('[data-c]')].filter(x=>x.checked).map(x=>caps[+x.dataset.c].n);
      S.sessions.unshift({id:'s'+Date.now(),start:s.start,dur,p:s.preset,caps:kept,note:box.querySelector('.gm-note').value.trim(),done:box.querySelector('[data-keep]').checked?done.map(t=>t.t):[],saved:true});}
    if(box.querySelector('[data-reset]').checked)S.tasks.forEach(t=>t.s='todo');
    S.session={...s,on:false};b.last=Date.now();save();close();refill('hero');refill('stream');refill('shots');refill('tasks');
    flashMsg(e==='save'?`Partita aggiunta allo storico di «${b.name}»`:'Partita chiusa senza salvarla nello storico');});
}

/* ── Collezione di board: run, stagioni, mondi ── */
function boardStats(bd){const ss=bd.state.sessions;return {n:ss.length,t:ss.reduce((a,x)=>a+x.dur,0),last:ss[0]?.start||bd.created,done:bd.state.tasks.filter(t=>t.s==='done').length,tasks:bd.state.tasks.length};}
function switchBoard(id){if(!GS.boards[id])return;
  GS.current=id;S=GS.boards[id].state;save();render();fit(true);headerBoard();flashMsg('Board «'+GS.boards[id].name+'»');}
function headerBoard(){document.getElementById('bName').textContent=GS.boards[GS.current].name;}
function showBoards(mode){
  const box=document.getElementById('gmBoards'),scrim=document.getElementById('gmScrim');let creating=mode==='new',showArch=false;
  const draw=()=>{const ids=Object.keys(GS.boards).sort((a,b)=>boardStats(GS.boards[b]).last-boardStats(GS.boards[a]).last);
    const vis=ids.filter(id=>showArch||!GS.boards[id].archived),arch=ids.length-ids.filter(id=>!GS.boards[id].archived).length;
    box.innerHTML=`<div class="gm-head"><span class="mono">Board · ${esc(G.name)}</span><button class="gm-x" data-close>✕</button></div>
    <h2>Le tue board</h2><p class="hintline" style="margin:-4px 0 12px">Una board per ogni run, stagione o mondo. Ognuna ha i suoi riquadri, obiettivi, note, catture e il suo storico; etichette, link e preset sono in comune.</p>
    <div class="bd-grid">${vis.map((id,i)=>{const bd=GS.boards[id],st=boardStats(bd),cur=id===GS.current;
      return `<div class="bd-card${cur?' cur':''}${bd.archived?' arch':''}"><div class="bd-art" style="background:${ART[(i+G.art)%4]} center/cover"><span class="chip-glass">${cur?'● aperta':bd.archived?'archiviata':'in corso'}</span></div>
        <div class="bd-b"><input class="bd-name" data-rn="${id}" value="${esc(bd.name)}" maxlength="40" title="Rinomina">
        <div class="bd-meta mono"><span>${st.n} partite</span><span>${hm(st.t)} ore</span><span>${st.done}/${st.tasks} obiettivi</span></div>
        <div class="mono bd-last">ultima: ${esc(fmtDay(st.last))}</div>
        <div class="bd-acts">${cur?'':`<button class="btn pri" data-open="${id}">Apri</button>`}<button class="btn" data-dup="${id}" title="Duplica"><span class="ms">content_copy</span></button>
        <button class="btn" data-arc="${id}" title="${bd.archived?'Ripristina':'Archivia'}"><span class="ms">${bd.archived?'unarchive':'archive'}</span></button>${cur?'':`<button class="btn" data-del="${id}" title="Elimina"><span class="ms">delete</span></button>`}</div></div></div>`;}).join('')}
      <button class="bd-card bd-new" data-new><span class="ms">add</span><b>Nuova board</b><small>una nuova run, stagione o mondo</small></button></div>
    ${arch?`<button class="btn" data-arch style="margin-top:10px">${showArch?'Nascondi':'Mostra'} le archiviate (${arch})</button>`:''}
    ${creating?`<div class="bd-form"><h3 class="mono">Nuova board</h3><label class="pe-row"><span class="mono">Nome</span><input data-nn placeholder="es. Run 2 · Mago, Stagione 25, Mondo hardcore" maxlength="40"></label>
      <div class="pe-row pe-top"><span class="mono">Parti da</span><div class="bd-from">
        <label><input type="radio" name="from" value="layout" checked><b>La disposizione di «${esc(GS.boards[GS.current].name)}»</b><small>stessi riquadri, fili e aree; obiettivi, note e storico vuoti</small></label>
        <label><input type="radio" name="from" value="empty"><b>Una board pulita</b><small>i riquadri di base, tutto da riempire</small></label>
        <label><input type="radio" name="from" value="copy"><b>Una copia completa</b><small>anche obiettivi, note e catture (lo storico riparte da zero)</small></label></div></div>
      <div class="gm-actions"><button class="btn" data-cancel>Annulla</button><button class="btn pri" data-create><span class="ms">add</span>Crea e apri</button></div></div>`:''}`;
    box.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{box.classList.remove('on');scrim.classList.remove('on');});
    box.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{box.classList.remove('on');scrim.classList.remove('on');switchBoard(b.dataset.open);});
    box.querySelectorAll('[data-rn]').forEach(inp=>inp.onchange=()=>{GS.boards[inp.dataset.rn].name=inp.value.trim()||GS.boards[inp.dataset.rn].name;save();headerBoard();});
    box.querySelectorAll('[data-dup]').forEach(b=>b.onclick=()=>{const src=GS.boards[b.dataset.dup],id='b'+Date.now().toString(36);GS.boards[id]={...structuredClone(src),name:src.name+' (copia)',created:Date.now(),archived:false};
      GS.boards[id].state.session={...GS.boards[id].state.session,on:false};save();draw();});
    box.querySelectorAll('[data-arc]').forEach(b=>b.onclick=()=>{const bd=GS.boards[b.dataset.arc];if(b.dataset.arc===GS.current&&!bd.archived&&S.session.on){flashMsg('Partita in corso: chiudila prima');return;}bd.archived=!bd.archived;save();draw();});
    box.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{const bd=GS.boards[b.dataset.del];if(!confirm(`Eliminare la board «${bd.name}» con il suo storico (${bd.state.sessions.length} partite)? Non si può annullare.`))return;delete GS.boards[b.dataset.del];save();draw();});
    const arb=box.querySelector('[data-arch]');if(arb)arb.onclick=()=>{showArch=!showArch;draw();};
    box.querySelector('[data-new]').onclick=()=>{creating=true;draw();box.querySelector('[data-nn]').focus();box.querySelector('.bd-form').scrollIntoView({block:'nearest'});};
    const cancel=box.querySelector('[data-cancel]');if(cancel)cancel.onclick=()=>{creating=false;draw();};
    const create=box.querySelector('[data-create]');if(create)create.onclick=()=>{const name=box.querySelector('[data-nn]').value.trim()||('Board '+(Object.keys(GS.boards).length+1));
      const from=box.querySelector('input[name=from]:checked').value,id='b'+Date.now().toString(36);GS.boards[id]=freshBoard(name,from);save();
      box.classList.remove('on');scrim.classList.remove('on');switchBoard(id);};};
  draw();box.classList.add('on');scrim.classList.add('on');
}

/* All'avvio del gioco: anche su quale board stai giocando */
const _showPreset=showPreset;
showPreset=function(){_showPreset();const box=document.getElementById('gmPick'),h=box.querySelector('.gm-head');
  const act=Object.entries(GS.boards).filter(([,b])=>!b.archived);
  h.insertAdjacentHTML('afterend',`<label class="gm-board"><span class="mono">Board</span><select>${act.map(([id,b])=>`<option value="${id}"${id===GS.current?' selected':''}>${esc(b.name)}</option>`).join('')}</select></label>`);
  box.querySelector('.gm-board select').onchange=e=>{const id=e.target.value;S.session={...S.session,on:false};GS.current=id;S=GS.boards[id].state;save();render();headerBoard();};
};

addEventListener('DOMContentLoaded',()=>{
  dockLinks();headerBoard();
  document.getElementById('bChip').onclick=()=>showBoards();
  const sims=document.querySelectorAll('.tp-sim'),sim=sims[sims.length-1];
  const b=document.createElement('button');b.textContent='Board';b.onclick=()=>showBoards();sim.appendChild(b);
  document.getElementById('simStart').onclick=()=>showPreset();
});
