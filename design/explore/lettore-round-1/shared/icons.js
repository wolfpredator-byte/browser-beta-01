/* Icone SVG inline per gli esempi (tratto 1.8, come quelle di VARCO). */
window.IC=(()=>{
  const s=(d,fill)=>`<svg class="ic${fill?' fill':''}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  return {
    play:s('<path d="M7 5.5v13l11-6.5z"/>',true),
    pause:s('<rect x="6.5" y="5" width="3.6" height="14" rx="1"/><rect x="13.9" y="5" width="3.6" height="14" rx="1"/>',true),
    next:s('<path d="M6 6l9 6-9 6z"/><rect x="16.2" y="6" width="2.2" height="12" rx="1"/>',true),
    prev:s('<path d="M18 6l-9 6 9 6z"/><rect x="5.6" y="6" width="2.2" height="12" rx="1"/>',true),
    back10:s('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 5v4h4"/><text x="12" y="15.2" font-size="7" text-anchor="middle" fill="currentColor" stroke="none" font-family="Segoe UI" font-weight="700">10</text>'),
    fwd10:s('<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 5v4h-4"/><text x="12" y="15.2" font-size="7" text-anchor="middle" fill="currentColor" stroke="none" font-family="Segoe UI" font-weight="700">10</text>'),
    shuffle:s('<path d="M3 7h3.5c2 0 3.3 1 4.5 2.8l2 3.4c1.2 1.8 2.5 2.8 4.5 2.8H21"/><path d="M3 17h3.5c1.3 0 2.3-.5 3.1-1.3M14.4 8.3c.8-.8 1.8-1.3 3.1-1.3H21"/><path d="M18.5 4.5L21 7l-2.5 2.5M18.5 13.5L21 16l-2.5 2.5"/>'),
    repeat:s('<path d="M4 11V9a3 3 0 0 1 3-3h12"/><path d="M16 3l3 3-3 3"/><path d="M20 13v2a3 3 0 0 1-3 3H5"/><path d="M8 21l-3-3 3-3"/>'),
    repeat1:s('<path d="M4 11V9a3 3 0 0 1 3-3h12"/><path d="M16 3l3 3-3 3"/><path d="M20 13v2a3 3 0 0 1-3 3H5"/><path d="M8 21l-3-3 3-3"/><text x="12" y="14.6" font-size="7" text-anchor="middle" fill="currentColor" stroke="none" font-family="Segoe UI" font-weight="700">1</text>'),
    vol:s('<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10"/>'),
    mute:s('<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M16 10l4 4M20 10l-4 4"/>'),
    pip:s('<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="11" width="7" height="6" rx="1" fill="currentColor"/>'),
    go:s('<path d="M7 17L17 7M9 7h8v8"/>'),
    close:s('<path d="M6 6l12 12M18 6L6 18"/>'),
    note:s('<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
    chevron:s('<path d="M6 15l6-6 6 6"/>')
  };
})();
/* Copertina finta: due colori della voce, più un segno per il tipo di sito. */
window.artStyle=m=>`background:radial-gradient(120% 90% at 20% 15%,${m.art[0]} 0%,transparent 60%),linear-gradient(140deg,${m.art[0]},${m.art[1]})`;
/* Pulsanti di una voce, già decisi secondo il sito. Ogni variante li disegna a modo suo.
   transport: precedente/−10 · play · +10/successivo; modes: shuffle e ripeti (Spotify); extra: muto, PiP. */
window.buttonsOf=m=>{
  const c=Media.controls(m),A=a=>v=>Media.act(m.key,a,v);
  const transport=[
    c.previous&&{id:'prev',icon:IC.prev,label:'Precedente',run:()=>A('prev')()},
    c.seekBack&&{id:'back',icon:IC.back10,label:'Indietro 10 s',run:()=>A('seekby')(-10)},
    {id:'toggle',icon:m.playing?IC.pause:IC.play,label:m.playing?'Pausa':'Riproduci',run:()=>A('toggle')(),main:true},
    c.seekForward&&{id:'fwd',icon:IC.fwd10,label:'Avanti 10 s',run:()=>A('seekby')(10)},
    c.next&&{id:'next',icon:IC.next,label:'Successivo',run:()=>A('next')()}
  ].filter(Boolean);
  const modes=[
    c.shuffle&&{id:'shuffle',icon:IC.shuffle,label:m.shuffle?'Shuffle attivo':'Shuffle',on:m.shuffle,run:()=>A('shuffle')()},
    c.repeat&&{id:'repeat',icon:m.repeat==='one'?IC.repeat1:IC.repeat,label:Media.repeatLabel(m.repeat),on:m.repeat!=='off',run:()=>A('repeat')()}
  ].filter(Boolean);
  const extra=[
    c.mute&&{id:'mute',icon:m.muted?IC.mute:IC.vol,label:m.muted?'Riattiva audio':'Muto',on:m.muted,run:()=>A('mute')()},
    c.pip&&{id:'pip',icon:IC.pip,label:m.pip?'Chiudi finestrella':'Finestrella (PiP)',on:m.pip,run:()=>A('pip')()}
  ].filter(Boolean);
  return {transport,modes,extra,c};
};
/* Disegna una lista di pulsanti in un contenitore. */
window.drawButtons=(box,list,cls='')=>{
  box.replaceChildren(...list.map(b=>{const el=document.createElement('button');el.className=`${cls} b-${b.id}${b.main?' main':''}${b.on?' on':''}`;
    el.innerHTML=b.icon;el.title=b.label;el.setAttribute('aria-label',b.label);if(b.on!==undefined)el.setAttribute('aria-pressed',!!b.on);
    el.onclick=e=>{e.stopPropagation();b.run();};return el;}));
};
/* Barra della posizione: input range, con stato di trascinamento per non saltare durante il tick. */
window.scrubber=(m,cls='')=>{
  const wrap=document.createElement('div');wrap.className='scrub '+cls;
  if(m.live){wrap.innerHTML='<span class="live">● IN DIRETTA</span>';return wrap;}
  wrap.innerHTML=`<span class="t-now">${Media.time(m.position)}</span><input type="range" min="0" max="${Math.round(m.duration)}" step="1" value="${Math.round(m.position)}" aria-label="Posizione"><span class="t-dur">${Media.time(m.duration)}</span>`;
  const r=wrap.querySelector('input');
  r.style.setProperty('--p',(m.position/m.duration*100)+'%');
  r.oninput=()=>{wrap.dataset.drag='1';wrap.querySelector('.t-now').textContent=Media.time(+r.value);r.style.setProperty('--p',(r.value/m.duration*100)+'%');};
  r.onchange=()=>{delete wrap.dataset.drag;Media.act(m.key,'seekto',+r.value);};
  return wrap;
};
/* Aggiorna solo tempi e barre (tick), senza ricostruire. */
window.tickScrubbers=(root)=>{
  root.querySelectorAll('[data-key]').forEach(el=>{
    const m=Media.items.find(x=>x.key===el.dataset.key);if(!m)return;
    el.querySelectorAll('.scrub').forEach(w=>{if(w.dataset.drag)return;const r=w.querySelector('input');if(!r)return;
      r.value=Math.round(m.position);r.style.setProperty('--p',(m.position/m.duration*100)+'%');w.querySelector('.t-now').textContent=Media.time(m.position);});
    el.querySelectorAll('.bar-fill').forEach(b=>b.style.width=(m.duration?m.position/m.duration*100:0)+'%');
  });
};
