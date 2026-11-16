/* Struttura della V4 (dock compatto), uguale nelle tre varianti del round 2: cambia solo il tema (CSS). */
let sel=null;
const art=m=>`<span class="art" style="${artStyle(m)}"></span>`;
function renderMini(slot,list,{tick}){
  if(tick){tickScrubbers(slot);return;}
  const m=Media.primary();if(!m){slot.innerHTML='';return;}
  const b=buttonsOf(m);
  const three=b.transport.filter(x=>x.main||x.id===(b.c.previous?'prev':'back')||x.id===(b.c.next?'next':'fwd'));
  slot.innerHTML=`<div class="mini" data-key="${m.key}" style="--art:${m.art[0]}" title="Apri il lettore">${art(m)}<span style="display:flex;flex-direction:column;gap:3px"><span class="txt"><b>${m.title}</b><span>${m.live?'live':Media.time(m.duration)}</span></span><span class="prog"><i class="bar-fill" style="width:${m.duration?m.position/m.duration*100:0}%"></i></span></span>${list.length>1?`<span class="cnt">${list.length}</span>`:''}<span class="k" style="display:flex"></span></div>`;
  drawButtons(slot.querySelector('.k'),three,'ib');
  slot.querySelector('.mini').onclick=()=>Media.toggleOpen();
}
function renderPanel(slot,list,{tick}){
  if(!slot.firstChild)slot.innerHTML='<div class="pop" role="dialog" aria-label="In riproduzione"></div>';
  const box=slot.firstChild;
  if(tick){tickScrubbers(box);return;}
  if(!list.length){box.innerHTML='<div class="empty">Niente in riproduzione.<br><small>Audio e video di schede, pannelli web e widget, di ogni workspace.</small></div>';return;}
  const m=list.find(x=>x.key===sel)||Media.primary();sel=m.key;
  const b=buttonsOf(m);
  box.innerHTML=`<div class="list"><header><b class="k-title">In riproduzione</b>${list.filter(x=>x.playing).length} attivi · ${list.length} totali</header><div class="rows"></div></div>
    <div class="detail" data-key="${m.key}" style="--art:${m.art[0]};--art2:${m.art[1]}"><div class="head">${art(m)}<div style="min-width:0"><h3>${m.title}</h3><div class="sub">${m.subtitle}</div>
      <div class="meta"><span class="ws">${m.workspace}</span><span>${m.where}</span><span>·</span><span>${m.site}</span></div></div></div>
      <div class="sc" style="margin-top:auto"></div><div class="trans"></div><div class="modes"></div></div>
    <div class="rail"></div>`;
  box.querySelector('.sc').append(scrubber(m));
  drawButtons(box.querySelector('.trans'),b.transport,'ib');
  drawButtons(box.querySelector('.modes'),b.modes,'ib');
  box.querySelectorAll('.modes .ib').forEach((el,i)=>el.insertAdjacentText('beforeend',b.modes[i].id==='shuffle'?'Shuffle':Media.repeatLabel(m.repeat).replace('Ripeti ','Ripeti: ')));
  const rail=box.querySelector('.rail');
  const go={id:'go',icon:IC.go,label:'Vai alla '+(m.kind==='panel'?'pannello':m.kind==='widget'?'Home':'scheda'),run:()=>Media.act(m.key,'focus')};
  const ap={id:'ap',icon:IC.pip,label:'Finestrella automatica: '+(Media.autoPip?'attiva':'spenta'),on:Media.autoPip,run:()=>Media.setAutoPip(!Media.autoPip)};
  drawButtons(rail,[...b.extra,go],'ib');
  rail.append(Object.assign(document.createElement('i'),{className:'sep'}));
  const apBox=document.createElement('div');drawButtons(apBox,[ap],'ib');rail.append(apBox.firstChild);
  rail.append(Object.assign(document.createElement('span'),{className:'kbd',textContent:'Spazio · ← → · Esc'}));
  box.querySelector('.rows').replaceChildren(...list.map(x=>{const r=document.createElement('button');r.className='r'+(x.key===m.key?' sel':'');
    r.innerHTML=`${art(x)}<span><b>${x.title}</b><small><i class="ws">${x.workspace}</i>${x.subtitle}</small></span><i class="st ${x.playing?'p':''}">${x.playing?'▶':x.live?'live':Media.time(x.position)}</i>`;
    r.onclick=()=>{sel=x.key;renderPanel(slot,Media.items,{});};return r;}));
}
Media.start({renderMini,renderPanel});
document.querySelector('.vf-page').addEventListener('click',()=>Media.open&&Media.setOpen(false));
