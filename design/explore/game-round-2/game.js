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
  const box=document.getElementById('gmPick'),last=S.presets[S.lastPreset]?S.lastPreset:Object.keys(S.presets)[0],T0=Date.now(),WAIT=10000;
  box.innerHTML=`<div class="gm-head"><span class="mono">${esc(G.name)} è partito</span><button class="gm-x" title="Senza preset">✕</button></div>
    <h2>Che sessione è?</h2>
    <div class="gm-grid">${Object.entries(PRESETS).map(([k,p])=>`<button class="gm-p${k===last?' last':''}" data-p="${k}"><span class="gm-key">${p.k}</span><span class="ms">${p.i}</span><b>${p.n}</b><small>${p.d.join('<br>')}</small>${k===last?'<i class="gm-count"></i>':''}</button>`).join('')}</div>
    <div class="gm-foot"><span class="mono">Tra 10 s: ${PRESETS[last].n} (l'ultimo usato)</span><span><button data-edit>Modifica i preset</button><button data-p="none">Senza preset</button></span></div>`;
  box.classList.add('on');
  const choose=p=>{clearInterval(pickTimer);box.classList.remove('on');removeEventListener('keydown',key,true);
    S.session={on:true,preset:p==='none'?'solo':p,start:Date.now(),shots:[]};if(p!=='none')S.lastPreset=p;save();refill('hero');refill('stream');refill('shots');
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
  const box=document.getElementById('gmEnd'),scrim=document.getElementById('gmScrim');let cur=sel||Object.keys(S.presets)[0];
  const draw=()=>{const p=S.presets[cur];
    box.innerHTML=`<div class="gm-head"><span class="mono">Preset · ${esc(G.name)}</span><button class="gm-x" data-close>✕</button></div>
    <h2>Che cosa apre ogni preset</h2>
    <div class="pe-tabs">${Object.entries(S.presets).map(([k,v])=>`<button data-k="${k}" class="${k===cur?'on':''}"><span class="ms">${v.i}</span>${esc(v.n)}<span class="gm-key">${v.k}</span></button>`).join('')}<button data-new title="Nuovo preset"><span class="ms">add</span></button></div>
    <div class="pe-body">
      <label class="pe-row"><span class="mono">Nome</span><input data-f="n" value="${esc(p.n)}" maxlength="24"></label>
      <div class="pe-row"><span class="mono">Icona</span><div class="pe-icons">${ICONS.map(i=>`<button data-i="${i}" class="${i===p.i?'on':''}"><span class="ms">${i}</span></button>`).join('')}</div></div>
      <div class="pe-row pe-top"><span class="mono">Apri</span><div class="pe-sites">${G.links.map(l=>`<label><input type="checkbox" data-site="${esc(l[1])}"${p.open.includes(l[1])?' checked':''}><span class="ms">${l[0]}</span>${esc(l[1])}</label>`).join('')}</div></div>
      <label class="pe-row"><span class="mono">Companion</span><span class="pe-sw"><input type="checkbox" data-f="companion"${p.companion?' checked':''}> i siti si aprono nel companion, sull'altro monitor</span></label>
      <label class="pe-row"><span class="mono">Timer</span><select data-f="timer"><option value="">Nessuno</option>${G.timers.map((t,i)=>`<option value="${i}"${p.timer===i?' selected':''}>${esc(t.label)}</option>`).join('')}</select></label>
      <label class="pe-row"><span class="mono">Note</span><span class="pe-sw"><input type="checkbox" data-f="notes"${p.notes?' checked':''}> mostra le note tattiche</span></label>
      <label class="pe-row"><span class="mono">Clip</span><span class="pe-sw"><input type="checkbox" data-f="clips"${p.clips?' checked':''}> salva le clip della sessione in automatico</span></label>
      <div class="pe-prev mono">${presetDesc(p).join(' · ')}</div>
    </div>
    <div class="gm-actions">${Object.keys(S.presets).length>1?'<button class="btn" data-del>Elimina</button>':''}<span class="grow"></span><button class="btn pri" data-close>Fatto</button></div>`;
    box.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{cur=b.dataset.k;draw();});
    box.querySelector('[data-new]').onclick=()=>{const k='p'+Date.now().toString(36),n=Object.keys(S.presets).length+1;S.presets[k]={n:'Nuovo preset',i:'sports_esports',k:String(n),open:[],companion:false,timer:null,notes:true};cur=k;save();draw();box.querySelector('[data-f=n]').select();};
    box.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{p.i=b.dataset.i;save();draw();});
    box.querySelectorAll('[data-site]').forEach(c=>c.onchange=()=>{const n=c.dataset.site;p.open=c.checked?[...p.open,n]:p.open.filter(x=>x!==n);save();box.querySelector('.pe-prev').textContent=presetDesc(p).join(' · ');});
    box.querySelectorAll('[data-f]').forEach(f=>f.oninput=f.onchange=()=>{const k=f.dataset.f;p[k]=f.type==='checkbox'?f.checked:k==='timer'?(f.value===''?null:+f.value):f.value;save();
      box.querySelector('.pe-prev').textContent=presetDesc(p).join(' · ');if(k==='n')box.querySelector(`.pe-tabs [data-k="${cur}"]`).childNodes[1].textContent=p.n;});
    const del=box.querySelector('[data-del]');if(del)del.onclick=()=>{delete S.presets[cur];Object.values(S.presets).forEach((v,i)=>v.k=String(i+1));if(S.lastPreset===cur)S.lastPreset=Object.keys(S.presets)[0];cur=Object.keys(S.presets)[0];save();draw();};
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
  const sims=document.querySelectorAll('.tp-sim'),sim=sims[sims.length-1];const b=document.createElement('button');b.textContent='Preset';b.onclick=()=>showPresetEditor(S.lastPreset);sim.appendChild(b);
});
