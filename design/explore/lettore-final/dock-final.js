/* 4b finale: struttura della V4 + richieste dell'utente:
   - nella barra in basso i comandi di OGNI sorgente attiva (fino a 3, poi "+N");
   - volume per sorgente (nella barra: icona con cursore a comparsa; nel pannello: cursore con percentuale);
   - chiudi la scheda / il pannello / il widget direttamente dal lettore. */
let sel=null;
const art=m=>`<span class="art" style="${artStyle(m)}"></span>`;
const closeLabel=m=>m.kind==='panel'?'Chiudi il pannello web':m.kind==='widget'?'Ferma il widget':'Chiudi la scheda';
const volIcon=m=>m.muted||m.volume===0?IC.mute:IC.vol;

/** Cursore del volume: icona (muto sì/no) + barra + percentuale. */
function volumeControl(m,{compact=false}={}){
  const w=document.createElement('div');w.className='vol'+(compact?' compact':'');w.dataset.vol=m.key;
  const v=Math.round((m.muted?0:m.volume)*100);
  w.innerHTML=`<button class="ib vmute" title="${m.muted?'Riattiva audio':'Muto'}" aria-label="${m.muted?'Riattiva audio':'Muto'}">${volIcon(m)}</button>
    <input type="range" min="0" max="100" value="${v}" aria-label="Volume di ${m.title}" style="--p:${v}%"><span class="vp">${v}%</span>`;
  const r=w.querySelector('input');
  r.oninput=e=>{e.stopPropagation();r.style.setProperty('--p',r.value+'%');w.querySelector('.vp').textContent=r.value+'%';Media.act(m.key,'volume',r.value/100);};
  r.onclick=e=>e.stopPropagation();
  w.querySelector('.vmute').onclick=e=>{e.stopPropagation();Media.act(m.key,'mute');};
  return w;
}

/* Densità della barra (selettore in alto a destra): completa (titolo + comandi + volume), compatta (copertina con anello
   di avanzamento + 3 comandi), minima (solo la copertina: clic = play/pausa). Nelle due strette il resto (titolo, volume,
   shuffle…) compare in una scheda sopra la barra al passaggio del mouse, senza allargare la barra. */
let density='compatta';try{density=localStorage.getItem('lettore-density')||'compatta';}catch{}
const ringArt=m=>`<span class="ring" style="--p:${m.duration?m.position/m.duration*100:0}%">${art(m)}<span class="ov">${m.playing?IC.pause:IC.play}</span></span>`;
/** Scheda sopra la barra (densità strette): tutto ciò che nella barra non c'è. */
function hoverCard(m){
  const b=buttonsOf(m),card=document.createElement('div');card.className='hcard';card.dataset.key=m.key;
  card.innerHTML=`<div class="hc-top">${art(m)}<div style="min-width:0"><b>${m.title}</b><span>${m.subtitle}</span><small>${m.where} · ${m.workspace}</small></div></div><div class="sc"></div><div class="hc-ctl"><div class="t"></div><div class="mo"></div></div><div class="hc-vol"></div>`;
  card.querySelector('.sc').append(scrubber(m));
  drawButtons(card.querySelector('.t'),b.transport,'ib');
  drawButtons(card.querySelector('.mo'),b.modes,'ib');
  card.querySelector('.hc-vol').append(volumeControl(m,{compact:true}));
  card.onclick=e=>e.stopPropagation();
  return card;
}
function renderMini(slot,list,{tick}){
  if(tick){tickScrubbers(slot);slot.querySelectorAll('[data-key] .ring').forEach(r=>{const m=Media.items.find(x=>x.key===r.closest('[data-key]').dataset.key);if(m&&m.duration)r.style.setProperty('--p',m.position/m.duration*100+'%');});return;}
  if(slot.querySelector('.vol input:active')||slot.querySelector('.hcard:hover'))return; // non ricostruire mentre la usi
  if(!list.length){slot.innerHTML='';return;}
  const playing=list.filter(m=>m.playing);
  const shown=(playing.length?playing:[Media.primary()]).slice(0,density==='minima'?4:3);
  const hidden=list.length-shown.length;
  const many=shown.length>1;
  const wrap=document.createElement('div');wrap.className='minis d-'+density+(many?' many':'');
  for(const m of shown){
    const b=buttonsOf(m);
    const three=b.transport.filter(x=>x.main||x.id===(b.c.previous?'prev':'back')||x.id===(b.c.next?'next':'fwd'));
    if(density!=='completa'){
      const seg=document.createElement('div');seg.className='mini slim'+(m.playing?' playing':'');seg.dataset.key=m.key;
      seg.innerHTML=`${ringArt(m)}<span class="k"></span>`;
      if(density==='compatta')drawButtons(seg.querySelector('.k'),three,'ib');
      // Minima: la copertina è il pulsante play/pausa. Compatta: la copertina apre il lettore.
      seg.querySelector('.ring').onclick=e=>{e.stopPropagation();if(density==='minima')Media.act(m.key,'toggle');else{sel=m.key;Media.setOpen(true);}};
      seg.querySelector('.ring').title=density==='minima'?(m.playing?'Pausa':'Riproduci')+' · '+m.title:'Apri il lettore · '+m.title;
      seg.append(hoverCard(m));
      wrap.append(seg);
      continue;
    }
    const seg=document.createElement('div');seg.className='mini'+(m.playing?' playing':'');seg.dataset.key=m.key;seg.title='Apri il lettore';
    seg.innerHTML=`${art(m)}<span class="mt"><span class="txt"><b>${m.title}</b>${many?'':`<span>${m.live?'live':Media.time(m.duration)}</span>`}</span><span class="prog"><i class="bar-fill" style="width:${m.duration?m.position/m.duration*100:0}%"></i></span></span><span class="k"></span><span class="vwrap"><button class="ib vbtn" aria-label="Volume">${volIcon(m)}</button><div class="vpop"></div></span>`;
    drawButtons(seg.querySelector('.k'),[...three,...(many?[]:b.modes)],'ib');
    seg.querySelector('.vpop').append(volumeControl(m,{compact:true}));
    seg.querySelector('.vbtn').onclick=e=>{e.stopPropagation();seg.querySelector('.vwrap').classList.toggle('open');};
    seg.onclick=()=>{sel=m.key;Media.setOpen(true);};
    wrap.append(seg);
  }
  if(hidden>0){const c=document.createElement('button');c.className='cnt';c.textContent='+'+hidden;c.title='Altri media: apri il lettore';c.onclick=()=>Media.setOpen(true);wrap.append(c);}
  slot.replaceChildren(wrap);
}

function renderPanel(slot,list,{tick}){
  if(!slot.firstChild)slot.innerHTML='<div class="pop" role="dialog" aria-label="In riproduzione"></div>';
  const box=slot.firstChild;
  if(tick){tickScrubbers(box);return;}
  if(box.querySelector('.vol input:active'))return;
  if(!list.length){box.innerHTML='<div class="empty">Niente in riproduzione.<br><small>Audio e video di schede, pannelli web e widget, di ogni workspace.</small></div>';return;}
  const m=list.find(x=>x.key===sel)||Media.primary();sel=m.key;
  const b=buttonsOf(m);
  box.innerHTML=`<div class="list"><header><b class="k-title">In riproduzione</b>${list.filter(x=>x.playing).length} attivi · ${list.length} totali</header><div class="rows"></div></div>
    <div class="detail" data-key="${m.key}"><div class="head">${art(m)}<div style="min-width:0"><h3>${m.title}</h3><div class="sub">${m.subtitle}</div>
      <div class="meta"><span class="ws">${m.workspace}</span><span>${m.where}</span><span>·</span><span>${m.site}</span></div></div></div>
      <div class="sc" style="margin-top:auto"></div><div class="trans"></div><div class="lower"><div class="modes"></div><div class="vslot"></div></div></div>
    <div class="rail"></div>`;
  box.querySelector('.sc').append(scrubber(m));
  drawButtons(box.querySelector('.trans'),b.transport,'ib');
  drawButtons(box.querySelector('.modes'),b.modes,'ib');
  box.querySelectorAll('.modes .ib').forEach((el,i)=>el.insertAdjacentText('beforeend',b.modes[i].id==='shuffle'?'Shuffle':Media.repeatLabel(m.repeat).replace('Ripeti ','Ripeti: ')));
  box.querySelector('.vslot').append(volumeControl(m));
  const rail=box.querySelector('.rail');
  const go={id:'go',icon:IC.go,label:'Vai alla '+(m.kind==='panel'?'pannello':m.kind==='widget'?'Home':'scheda'),run:()=>Media.act(m.key,'focus')};
  const pip=b.extra.filter(x=>x.id==='pip');
  const ap={id:'ap',icon:IC.pip,label:'Finestrella automatica: '+(Media.autoPip?'attiva':'spenta'),on:Media.autoPip,run:()=>Media.setAutoPip(!Media.autoPip)};
  const close={id:'close',icon:IC.close,label:closeLabel(m),run:()=>{sel=null;Media.act(m.key,'close');}};
  drawButtons(rail,[...pip,go],'ib');
  rail.append(Object.assign(document.createElement('i'),{className:'sep'}));
  const tmp=document.createElement('div');drawButtons(tmp,[ap],'ib');rail.append(tmp.firstChild);
  rail.append(Object.assign(document.createElement('i'),{className:'sep'}));
  drawButtons(tmp,[close],'ib danger');rail.append(tmp.firstChild);
  rail.append(Object.assign(document.createElement('span'),{className:'kbd',textContent:'Spazio · ← → · Esc'}));
  box.querySelector('.rows').replaceChildren(...list.map(x=>{const r=document.createElement('div');r.className='r'+(x.key===m.key?' sel':'');r.tabIndex=0;
    r.innerHTML=`${art(x)}<span><b>${x.title}</b><small><i class="ws">${x.workspace}</i>${x.subtitle}</small></span><i class="st ${x.playing?'p':''}">${x.playing?'▶':x.live?'live':Media.time(x.position)}</i><button class="rx" title="${closeLabel(x)}" aria-label="${closeLabel(x)}">${IC.close}</button>`;
    r.onclick=()=>{sel=x.key;renderPanel(slot,Media.items,{});};
    r.querySelector('.rx').onclick=e=>{e.stopPropagation();if(sel===x.key)sel=null;Media.act(x.key,'close');};
    return r;}));
}
Media.start({renderMini,renderPanel});
// Selettore della densità della barra, accanto a stato e tema.
setTimeout(()=>{
  const bar=document.querySelector('.vf-states');
  bar.insertAdjacentHTML('beforeend','<i class="sep"></i><b>Barra</b>'+['completa','compatta','minima'].map(d=>`<button data-d="${d}">${d[0].toUpperCase()+d.slice(1)}</button>`).join(''));
  const sync=()=>bar.querySelectorAll('[data-d]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.d===density));
  bar.addEventListener('click',e=>{const b=e.target.closest('[data-d]');if(!b)return;e.stopPropagation();density=b.dataset.d;try{localStorage.setItem('lettore-density',density);}catch{}sync();renderMini(document.getElementById('miniSlot'),Media.items,{});});
  sync();
},10);
document.querySelector('.vf-page').addEventListener('click',()=>Media.open&&Media.setOpen(false));
document.addEventListener('click',e=>{if(!e.target.closest('.vwrap'))document.querySelectorAll('.vwrap.open').forEach(v=>v.classList.remove('open'));});
