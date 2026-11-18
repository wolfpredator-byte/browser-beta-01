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
  const box=document.getElementById('gmPick'),last=S.lastPreset||'raid',T0=Date.now(),WAIT=10000;
  box.innerHTML=`<div class="gm-head"><span class="mono">Destiny 2 è partito</span><button class="gm-x" title="Senza preset">✕</button></div>
    <h2>Che sessione è?</h2>
    <div class="gm-grid">${Object.entries(PRESETS).map(([k,p])=>`<button class="gm-p${k===last?' last':''}" data-p="${k}"><span class="gm-key">${p.k}</span><span class="ms">${p.i}</span><b>${p.n}</b><small>${p.d.join('<br>')}</small>${k===last?'<i class="gm-count"></i>':''}</button>`).join('')}</div>
    <div class="gm-foot"><span class="mono">Tra 10 s: ${PRESETS[last].n} (l'ultimo usato)</span><button data-p="none">Senza preset</button></div>`;
  box.classList.add('on');
  const choose=p=>{clearInterval(pickTimer);box.classList.remove('on');removeEventListener('keydown',key,true);
    S.session={on:true,preset:p==='none'?'solo':p,start:Date.now(),shots:[]};if(p!=='none')S.lastPreset=p;save();refill('hero');refill('stream');refill('shots');
    flashMsg(p==='none'?'Sessione iniziata senza preset':`Sessione «${PRESETS[p].n}» iniziata · ${PRESETS[p].d[0]}`);};
  box.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>choose(b.dataset.p));
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
    <div class="gm-sum"><div><h2>Destiny 2 · ${p.n}</h2><p>dalle ${new Date(s.start).toTimeString().slice(0,5)} alle ${new Date().toTimeString().slice(0,5)}</p></div><div class="gm-dur">${hm(dur)}<small>ore</small></div></div>
    <div class="gbar"><i style="width:${Math.min(100,dur/(4*3600e3)*100)}%"></i><span class="mono">${hms(dur)}</span></div>
    <h3 class="mono">Catture · ${caps.length}</h3>
    <div class="gm-caps">${caps.map((c,i)=>`<label class="gm-cap${c.clip?' clip':''}" style="background:${shotBg(c)} center/cover"><input type="checkbox" checked data-c="${i}"><span>${esc(c.n)}</span></label>`).join('')||'<p class="gm-empty">Nessuna cattura in questa sessione.</p>'}</div>
    <h3 class="mono">Note</h3>
    <textarea class="gm-note" placeholder="Com'è andata? Si aggiunge alla sessione di oggi."></textarea>
    <label class="gm-check"><input type="checkbox" checked> Includi le note tattiche e gli obiettivi fatti (${done.length})</label>
    <div class="gm-dest mono">Documenti\\VARCO\\Giochi\\Destiny 2\\sessioni\\${date}.md</div>
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
