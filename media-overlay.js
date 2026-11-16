'use strict';
/* Lettore multimediale (Beta 0.37.1): scheda di una sorgente e lettore completo, disegnati in una vista sopra la pagina.
   Lo stato arriva da lib/media-overlay.cjs; i comandi tornano al bus (mediaControl, mediaFocus, mediaClose…).
   Niente attributi style="" (la CSP non li ammette): i valori dinamici passano da element.style. */
const api=window.mediaAPI;
const $root=document.getElementById('root');
let S={mode:null,key:null,media:[],autoPip:true};
let sel=null,dragging=false;

/* ── Icone ── */
const svg=(d,fill)=>`<svg class="ic${fill?' fill':''}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const T10=n=>`<text x="12" y="15.2" font-size="7" text-anchor="middle" fill="currentColor" stroke="none" font-weight="700">${n}</text>`;
const IC={
  play:svg('<path d="M7 5.5v13l11-6.5z"/>',true),
  pause:svg('<rect x="6.5" y="5" width="3.6" height="14" rx="1"/><rect x="13.9" y="5" width="3.6" height="14" rx="1"/>',true),
  next:svg('<path d="M6 6l9 6-9 6z"/><rect x="16.2" y="6" width="2.2" height="12" rx="1"/>',true),
  prev:svg('<path d="M18 6l-9 6 9 6z"/><rect x="5.6" y="6" width="2.2" height="12" rx="1"/>',true),
  back:svg('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 5v4h4"/>'+T10(10)),
  fwd:svg('<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 5v4h-4"/>'+T10(10)),
  shuffle:svg('<path d="M3 7h3.5c2 0 3.3 1 4.5 2.8l2 3.4c1.2 1.8 2.5 2.8 4.5 2.8H21"/><path d="M3 17h3.5c1.3 0 2.3-.5 3.1-1.3M14.4 8.3c.8-.8 1.8-1.3 3.1-1.3H21"/><path d="M18.5 4.5L21 7l-2.5 2.5M18.5 13.5L21 16l-2.5 2.5"/>'),
  repeat:svg('<path d="M4 11V9a3 3 0 0 1 3-3h12"/><path d="M16 3l3 3-3 3"/><path d="M20 13v2a3 3 0 0 1-3 3H5"/><path d="M8 21l-3-3 3-3"/>'),
  repeat1:svg('<path d="M4 11V9a3 3 0 0 1 3-3h12"/><path d="M16 3l3 3-3 3"/><path d="M20 13v2a3 3 0 0 1-3 3H5"/><path d="M8 21l-3-3 3-3"/>'+T10(1)),
  vol:svg('<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10"/>'),
  mute:svg('<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M16 10l4 4M20 10l-4 4"/>'),
  pip:svg('<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="11" width="7" height="6" rx="1" fill="currentColor"/>'),
  go:svg('<path d="M7 17L17 7M9 7h8v8"/>'),
  close:svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  note:svg('<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
  autopip:svg('<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="11" width="7" height="6" rx="1" fill="currentColor"/><path d="M6 15l4-4M6.5 11H10v3.5"/>'),
  expand:svg('<path d="M4 14v6h6M20 10V4h-6M4 20l7-7M20 4l-7 7"/>')
};

/* ── Utilità ── */
function h(tag,cls,props={},...kids){
  const el=document.createElement(tag);if(cls)el.className=cls;
  for(const [k,v] of Object.entries(props)){if(k==='text')el.textContent=v;else if(k==='html')el.innerHTML=v;else if(k.startsWith('on'))el[k]=v;else if(v!==undefined&&v!==null&&v!==false)el.setAttribute(k,v===true?'':v);}
  el.append(...kids.filter(Boolean));return el;
}
const time=s=>{s=Math.max(0,Math.floor(s||0));const hh=Math.floor(s/3600),m=Math.floor(s%3600/60),r=String(s%60).padStart(2,'0');return hh?`${hh}:${String(m).padStart(2,'0')}:${r}`:`${m}:${r}`;};
const posOf=m=>{let p=m.position||0;if(m.playing&&!m.live)p+=Math.max(0,(Date.now()-m.at)/1000)*(m.rate||1);return m.duration>0?Math.min(p,m.duration):p;};
const ctl=(m,action,value)=>api.action('mediaControl',value===undefined?{key:m.key,action}:{key:m.key,action,value});
const KIND={tab:'Scheda',panel:'Pannello web',widget:'Widget della Home'};
const closeLabel=m=>m.kind==='panel'?'Chiudi il pannello web':m.kind==='widget'?'Ferma il widget':'Chiudi la scheda';
const goLabel=m=>m.here?'È questa scheda':'Vai '+(m.kind==='panel'?'al pannello':m.kind==='widget'?'alla Home':'alla scheda');
const repeatLabel=r=>({off:'Ripeti: spento',all:'Ripeti: playlist',one:'Ripeti: brano'}[r]||'Ripeti');

function art(m,cls){
  const box=h('span','art '+(cls||''));
  if(m.artwork)box.append(h('img','',{src:m.artwork,alt:''}));else box.innerHTML=m.video?IC.pip:IC.note;
  return box;
}
function btn(icon,label,run,{cls='',on}={}){
  const b=h('button','ib '+cls+(on?' on':''),{title:label,'aria-label':label,html:icon});
  if(on!==undefined)b.setAttribute('aria-pressed',String(!!on));
  b.onclick=e=>{e.stopPropagation();run();};
  return b;
}
/** I comandi della sorgente, secondo il sito (controls arriva da media-rules.cjs). */
function transport(m){
  const c=m.controls,out=[];
  if(c.previous)out.push(btn(IC.prev,'Precedente',()=>ctl(m,'previoustrack')));
  if(c.seekBack)out.push(btn(IC.back,'Indietro 10 secondi',()=>ctl(m,'seekby',-10)));
  if(c.playPause)out.push(btn(m.playing?IC.pause:IC.play,m.playing?'Pausa':'Riproduci',()=>ctl(m,'toggle'),{cls:'main'}));
  if(c.seekForward)out.push(btn(IC.fwd,'Avanti 10 secondi',()=>ctl(m,'seekby',10)));
  if(c.next)out.push(btn(IC.next,'Successivo',()=>ctl(m,'nexttrack')));
  return out;
}
function modes(m,{labels=false}={}){
  const out=[];
  if(m.controls.shuffle){const b=btn(IC.shuffle,m.shuffle?'Shuffle attivo':'Shuffle',()=>ctl(m,'shuffle'),{on:m.shuffle});if(labels)b.append('Shuffle');out.push(b);}
  if(m.controls.repeat){const b=btn(m.repeat==='one'?IC.repeat1:IC.repeat,repeatLabel(m.repeat),()=>ctl(m,'repeat'),{on:m.repeat!=='off'});if(labels)b.append(repeatLabel(m.repeat).replace('Ripeti: ',''));out.push(b);}
  return out;
}
function scrubber(m){
  const w=h('div','scrub');w.dataset.key=m.key;
  if(m.live){w.append(h('span','live',{text:'● In diretta'}));return w;}
  if(!m.controls.seek)return null;
  const now=h('span','t-now',{text:time(posOf(m))});
  const r=h('input','',{type:'range',min:0,max:Math.max(1,Math.round(m.duration)),step:1,'aria-label':'Posizione'});
  r.value=Math.round(posOf(m));r.style.setProperty('--p',posOf(m)/m.duration*100+'%');
  r.oninput=()=>{dragging=true;now.textContent=time(+r.value);r.style.setProperty('--p',r.value/m.duration*100+'%');};
  r.onchange=()=>{dragging=false;ctl(m,'seekto',+r.value);};
  w.append(now,r,h('span','',{text:time(m.duration)}));
  return w;
}
function volume(m){
  if(!m.controls.volume&&!m.controls.mute)return null;
  const v=Math.round((m.muted?0:(m.volume??1))*100);
  const w=h('div','vol');
  const mute=btn(m.muted||v===0?IC.mute:IC.vol,m.muted?'Riattiva l’audio':'Disattiva l’audio',()=>ctl(m,'mute'));
  w.append(mute);
  if(m.controls.volume){
    const pct=h('span','vp',{text:v+'%'});
    const r=h('input','',{type:'range',min:0,max:100,'aria-label':'Volume'});r.value=v;r.style.setProperty('--p',v+'%');
    let t=null;
    r.oninput=()=>{dragging=true;pct.textContent=r.value+'%';r.style.setProperty('--p',r.value+'%');clearTimeout(t);t=setTimeout(()=>ctl(m,'volume',r.value/100),60);};
    r.onchange=()=>{dragging=false;ctl(m,'volume',r.value/100);};
    w.append(r,pct);
  }
  return w;
}

/* ── Scheda di una sorgente ── */
function renderCard(m){
  const top=h('div','c-top',{},art(m),h('div','t',{},h('b','',{text:m.title}),h('span','',{text:m.subtitle||m.site}),
    h('small','',{text:[KIND[m.kind],m.workspace].filter(Boolean).join(' · ')})),
    btn(IC.expand,'Apri il lettore',()=>api.action('openMediaPlayer',{})));
  const row=h('div','c-ctl',{},h('div','grp',{},...transport(m)),h('div','grp',{},...modes(m),
    ...(m.controls.pip?[btn(IC.pip,m.pip?'Chiudi la finestrella':'Video in finestrella',()=>ctl(m,'pip'),{on:m.pip})]:[])));
  const foot=h('div','c-vol',{},volume(m)||h('span'),btn(IC.go,goLabel(m),()=>api.action('mediaFocus',{key:m.key})),
    btn(IC.close,closeLabel(m),()=>api.action('mediaClose',{key:m.key}),{cls:'danger'}));
  return h('div','card glass',{},top,scrubber(m),row,foot);
}

/* ── Lettore completo ── */
function renderDock(list){
  if(!list.length)return h('div','empty glass',{},h('div','',{text:'Niente in riproduzione. Audio e video di schede, pannelli web e widget della Home, di qualsiasi workspace, compaiono qui.'}));
  const m=list.find(x=>x.key===sel)||list.find(x=>x.key===S.key)||list[0];sel=m.key;
  const rows=h('div','rows');
  for(const x of list){
    const r=h('div','r'+(x.key===m.key?' sel':''),{tabindex:0},art(x),
      h('span','tx',{},h('b','',{text:x.title}),h('small','',{},h('i','ws',{text:x.workspace||''}),x.subtitle||x.site)),
      h('i','st'+(x.playing?' p':''),{text:x.playing?'▶':x.live?'live':time(posOf(x))}));
    const rx=btn(IC.close,closeLabel(x),()=>{if(sel===x.key)sel=null;api.action('mediaClose',{key:x.key});},{cls:'rx'});rx.classList.remove('ib');
    r.append(rx);
    r.onclick=()=>{sel=x.key;render();};
    r.onkeydown=e=>{if(e.key==='Enter'){sel=x.key;render();}};
    rows.append(r);
  }
  const list_=h('div','list',{},h('header','',{},h('b','k-title',{text:'In riproduzione'}),
    `${list.filter(x=>x.playing).length} attivi · ${list.length} totali`),rows);
  const head=h('div','d-head',{},art(m),h('div','',{},h('h3','',{text:m.title}),h('div','sub',{text:m.subtitle||''}),
    h('div','meta',{},h('i','ws',{text:m.workspace||''}),KIND[m.kind]||'',' · ',m.site)));
  const detail=h('div','detail',{},head,scrubber(m)||h('div','scrub'),h('div','trans',{},...transport(m)),
    h('div','lower',{},h('div','modes',{},...modes(m,{labels:true})),volume(m)));
  const rail=h('div','rail',{},
    ...(m.controls.pip?[btn(IC.pip,m.pip?'Chiudi la finestrella':'Video in finestrella',()=>ctl(m,'pip'),{on:m.pip})]:[]),
    btn(IC.go,goLabel(m),()=>api.action('mediaFocus',{key:m.key})),
    h('i','sep'),
    btn(IC.autopip,'Finestrella automatica quando cambi scheda: '+(S.autoPip?'attiva':'spenta'),()=>api.action('setAutoPip',{enabled:!S.autoPip}),{on:S.autoPip}),
    h('i','sep'),
    btn(IC.close,closeLabel(m),()=>{sel=null;api.action('mediaClose',{key:m.key});},{cls:'danger'}),
    h('span','kbd',{text:'Spazio · ← → · Esc'}));
  return h('div','dock glass',{},list_,detail,rail);
}

function render(){
  if(dragging)return;
  const list=S.media||[];
  if(S.mode==='card'){
    const m=list.find(x=>x.key===S.key);
    $root.replaceChildren(m?renderCard(m):'');
    requestAnimationFrame(()=>{const c=$root.querySelector('.card');if(c)api.resize(c.offsetHeight+4);});
  }else if(S.mode==='dock')$root.replaceChildren(renderDock(list));
  else $root.replaceChildren();
}
api.onState(s=>{if(s.mode!==S.mode||s.key!==S.key)sel=s.mode==='dock'?(s.key||sel):sel;S=s;render();});

/* Ogni secondo i tempi avanzano da soli. */
setInterval(()=>{
  if(dragging||!S.mode)return;
  for(const w of document.querySelectorAll('.scrub[data-key]')){
    const m=S.media.find(x=>x.key===w.dataset.key);if(!m||!m.playing)continue;
    const r=w.querySelector('input'),now=w.querySelector('.t-now');if(!r)continue;
    const p=posOf(m);r.value=Math.round(p);r.style.setProperty('--p',p/m.duration*100+'%');now.textContent=time(p);
  }
},1000);

/* Mouse sulla scheda: resta aperta. Tasti nel lettore completo. */
document.addEventListener('mouseenter',()=>api.hover(true));
document.addEventListener('mouseleave',()=>api.hover(false));
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){api.close();return;}
  if(S.mode!=='dock'||e.target.matches('input'))return;
  const m=S.media.find(x=>x.key===sel);if(!m)return;
  if(e.key===' '){e.preventDefault();ctl(m,'toggle');}
  else if(e.key==='ArrowRight'&&m.controls.seekForward){e.preventDefault();ctl(m,'seekby',10);}
  else if(e.key==='ArrowLeft'&&m.controls.seekBack){e.preventDefault();ctl(m,'seekby',-10);}
});
