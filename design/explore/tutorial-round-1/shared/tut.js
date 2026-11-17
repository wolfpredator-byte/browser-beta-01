/* Tutorial 0.42 · Round 1 — parte comune: passi dei tre livelli, fondo con la vera interfaccia di VARCO,
   punti cliccabili sui pulsanti veri, progresso salvato, «Non mostrare più». Ogni variante: TUT.start({render, hint}). */
window.TUT=(()=>{
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const P=d=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I={
  close:P('<path d="M6 6l12 12M18 6L6 18"/>'),check:P('<path d="M5 12l5 5 9-10"/>'),
  left:P('<path d="M15 6l-6 6 6 6"/>'),right:P('<path d="M9 6l6 6-6 6"/>'),
  eyeoff:P('<path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.8 9.8 0 0 1 12 5c5 0 9 5 9 7a10.6 10.6 0 0 1-2.5 3.5M6.6 6.6C4.4 8 3 10.4 3 12c0 2 4 7 9 7a9.6 9.6 0 0 0 4-.9"/>'),
  spark:P('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>'),
  play:P('<path d="M7 5l12 7-12 7z"/>'),bulb:P('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>'),
};
const STEPS={
  setup:[
    {id:'s-welcome',title:'Benvenuto in VARCO',text:'Il tuo spazio: web, progetti e strumenti. Un minuto per prepararlo, poi è tuo.',action:{label:'Inizia'}},
    {id:'s-ws',title:'Il tuo primo workspace',text:'Un workspace per ogni cosa che fai: studio, gioco, lavoro.',target:'#workspaces',action:{label:'Crea un workspace',hit:'#addWorkspace'}},
    {id:'s-theme',title:'Scegli un tema',text:'Lo cambi quando vuoi in Impostazioni → Aspetto.',themes:true,action:{label:'Scegli un colore'}},
    {id:'s-phone',title:'Collega il telefono',text:'Manda le schede dal telefono al PC e viceversa. Inquadri un QR con l’app VARCO.',target:'#showSettings',scrolled:true,action:{label:'Apri il collegamento',hit:'#showSettings'}},
    {id:'s-jarvis',title:'Attiva JARVIS',text:'Il tuo assistente legge le pagine e salva nei progetti, solo se lo accendi tu.',target:'#showJarvis',scrolled:true,action:{label:'Apri JARVIS',hit:'#showJarvis'}},
    {id:'s-import',title:'Porta i tuoi preferiti',text:'Da Chrome, Edge o Firefox, con la cronologia se vuoi.',target:'#showBookmarks',action:{label:'Importa i preferiti',hit:'#showBookmarks'}},
    {id:'s-done',title:'Fatto',text:'Il tour completo e questo setup li ritrovi in Impostazioni → Guida.',action:{label:'Inizia a navigare'}},
  ],
  tour:[
    {id:'t-welcome',title:'VARCO, il tuo spazio',text:'Web, progetti e strumenti nello stesso posto. Otto passi, uno alla volta.',action:{label:'Avanti'}},
    {id:'t-ws',title:'Workspace',text:'Ogni spazio ha schede, account e progetti separati.',target:'#workspaces',action:{label:'Crea o scegli un workspace',hit:'#workspaces'}},
    {id:'t-palette',title:'Palette',text:'Premi F1 per cercare qualsiasi cosa.',target:'#paletteButton',action:{label:'Premi F1',key:'F1',hit:'#paletteButton'}},
    {id:'t-fast',title:'Fast link',text:'I tuoi siti e strumenti sempre a portata di tasto, anche in gioco.',target:'#linksCard',action:{label:'Apri il launcher · Ctrl+Maiusc+Spazio',key:'launcher',hit:'#linksCard'}},
    {id:'t-proj',title:'Progetti',text:'Collega una cartella e lancia il tuo lavoro da qui.',target:'#showProject',scrolled:true,action:{label:'Collega una cartella',hit:'#showProject'}},
    {id:'t-panels',title:'Pannelli',text:'WhatsApp, Discord o Spotify accanto al web.',target:'#addWebPanel',scrolled:true,action:{label:'Aggiungi un pannello',hit:'#addWebPanel'}},
    {id:'t-games',title:'Giochi',text:'VARCO riconosce i giochi e apre il companion.',target:'#showGames',scrolled:true,action:{label:'Apri Giochi',hit:'#showGames'}},
    {id:'t-sec',title:'Sicurezza',text:'Usa l’incognito (Ctrl+Maiusc+N) e un password manager esterno.',target:'#showSettings',scrolled:true,action:{label:'Apri le Impostazioni',hit:'#showSettings'}},
  ],
};
const HINTS=[
  {id:'h-palette',label:'Prima palette',target:'#paletteButton',text:'Qui cerchi siti, schede, progetti e comandi. Con «>» solo i comandi.'},
  {id:'h-address',label:'Prima ricerca',target:'#address',text:'Scrivi «yt lofi» per cercare direttamente su YouTube.'},
  {id:'h-proj',label:'Primo progetto',target:'#showProject',scrolled:true,text:'Collega la cartella: VARCO avvia i dev server e apre l’anteprima.'},
  {id:'h-panel',label:'Primo pannello',target:'#addWebPanel',scrolled:true,text:'Il pannello resta accanto alla pagina in tutti i workspace.'},
  {id:'h-links',label:'Primo fast link',target:'#linksCard',text:'Fissa un link e aprilo con Alt+1…9, o dal launcher.'},
];
const THEMES=[['Cyan Flash','#00e5ff'],['Viola VARCO','#7c6cff'],['Ambra','#ffb648'],['Smeraldo','#2fd38a'],['Rosa neon','#ff5fa2']];

/* Ogni variante ha il suo progresso (stessa origine per tutte). */
const NS='tut:'+location.pathname+':';
const LS={get(k,d){try{return JSON.parse(localStorage.getItem(NS+k))??d;}catch{return d;}},set(k,v){try{localStorage.setItem(NS+k,JSON.stringify(v));}catch{}}};
const s={level:LS.get('level','setup'),idx:0,open:true,done:new Set(LS.get('done',[])),never:LS.get('never',false),hint:null,seenHints:new Set(LS.get('seenHints',[])),toast:null,accent:LS.get('accent','#00e5ff'),pulse:false};
s.idx=LS.get('idx:'+s.level,0);
let V,root,k=1,ox=0,oy=0;
const steps=()=>STEPS[s.level]||[];
const step=()=>steps()[s.idx];

function layout(){
  const W=innerWidth,H=innerHeight-50;
  k=Math.min(W/FRAME.size[0],H/FRAME.size[1]);
  ox=Math.round((W-FRAME.size[0]*k)/2);oy=Math.round((H-FRAME.size[1]*k)/2);
}
/** Posizione reale di un elemento, in pixel della pagina dell'esempio. */
function rect(sel,scrolled){
  const r=(scrolled&&FRAME.scrolled?.[sel])||FRAME.rects[sel];
  if(!r)return null;
  return {x:ox+r.x*k,y:oy+r.y*k,w:r.w*k,h:r.h*k,cx:ox+(r.x+r.w/2)*k,cy:oy+(r.y+r.h/2)*k};
}
function save(){LS.set('level',s.level);LS.set('idx:'+s.level,s.idx);LS.set('done',[...s.done]);LS.set('never',s.never);LS.set('seenHints',[...s.seenHints]);LS.set('accent',s.accent);}
function toast(msg){s.toast=msg;clearTimeout(toast.t);toast.t=setTimeout(()=>{s.toast=null;draw();},2400);}

function go(i){if(i<0)return;if(i>=steps().length){finish();return;}s.idx=i;save();draw();}
function finish(){s.open=false;LS.set('idx:'+s.level,0);toast(s.level==='setup'?'Setup completato':'Tour completato');s.idx=0;save();draw();}
function close(){s.open=false;save();toast('Tour chiuso · riprende da qui quando lo riapri');draw();}
function never(){s.never=true;s.open=false;s.hint=null;save();toast('Non lo mostrerò più · lo riattivi in Impostazioni → Guida');draw();}
/** Azione fatta davvero: il passo si completa da solo. */
function complete(){
  const st=step();if(!st||s.done.has(st.id))return;
  s.done.add(st.id);s.pulse=true;save();draw();
  setTimeout(()=>{s.pulse=false;go(s.idx+1);},700);
}
function startLevel(level,{fromSettings=false}={}){
  if(s.never&&!fromSettings){toast('«Non mostrare più» è attivo');draw();return;}
  if(fromSettings)s.never=false;
  s.level=level;s.idx=LS.get('idx:'+level,0);if(fromSettings){s.idx=0;for(const x of STEPS[level])s.done.delete(x.id);}s.open=true;s.hint=null;save();draw();
}
function showHint(id){
  if(s.never){toast('«Non mostrare più» è attivo: nessun suggerimento');draw();return;}
  if(s.seenHints.has(id)){toast('Già visto: un suggerimento compare una volta sola');draw();return;}
  s.open=false;s.hint=HINTS.find(h=>h.id===id);draw();
}

function demo(){
  const lv=[['setup','Primo avvio (60 s)'],['tour','Tour completo'],['hints','Suggerimenti']];
  return `<div class="tut-demo"><span class="t">Livello:</span>${lv.map(([k2,l])=>`<button data-level="${k2}" class="${(k2==='hints'?(!s.open&&!!s.hint):s.open&&s.level===k2)?'on':''}">${l}</button>`).join('')}
  <span class="sep"></span><span class="t">Prima volta che usi:</span>${HINTS.map(h=>`<button data-hint="${h.id}" class="${s.seenHints.has(h.id)?'seen':''}">${h.label}</button>`).join('')}
  <span class="sep"></span><span class="t">Impostazioni → Guida:</span><button data-repeat>Ripeti il tour</button><button data-setup>Apri il setup</button><button data-reset>Azzera l’esempio</button></div>`;
}
function draw(){
  layout();
  const st=step(),scrolled=s.open?st?.scrolled:s.hint?.scrolled;
  const img=scrolled?'../shared/frame-scrolled.png':'../shared/frame.png';
  let overlay='';
  if(s.open&&st){
    const r=st.target?rect(st.target,st.scrolled):null;
    overlay=V.render({st,idx:s.idx,total:steps().length,r,level:s.level,done:s.done.has(st.id),pulse:s.pulse,steps:steps(),doneSet:s.done,THEMES,accent:s.accent,k});
  }else if(s.hint){
    overlay=V.hint({h:s.hint,r:rect(s.hint.target,s.hint.scrolled),k});
  }
  root.innerHTML=`<div class="stage" style="left:${ox}px;top:${oy}px;width:${FRAME.size[0]*k}px;height:${FRAME.size[1]*k}px;background-image:url(${img})"></div>
    ${hotspots(scrolled)}<div class="layer" style="--acc:${s.accent}">${overlay}</div>
    ${s.toast?`<div class="tut-toast">${esc(s.toast)}</div>`:''}${demo()}`;
  bind();
}
/** Punti cliccabili sopra i pulsanti veri: cliccando quello giusto il passo si completa. */
function hotspots(scrolled){
  const sels=Object.keys(scrolled?{...FRAME.rects,...FRAME.scrolled}:FRAME.rects);
  return sels.map(sel=>{const r=rect(sel,scrolled);if(!r||r.y>innerHeight-50)return '';return `<div class="hot" data-hot="${sel}" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px"></div>`;}).join('');
}
function bind(){
  const $=q=>root.querySelectorAll(q);
  $('[data-level]').forEach(b=>b.onclick=()=>{if(b.dataset.level==='hints'){s.open=false;showHint(HINTS.find(h=>!s.seenHints.has(h.id))?.id||HINTS[0].id);}else startLevel(b.dataset.level);});
  $('[data-hint]').forEach(b=>b.onclick=()=>showHint(b.dataset.hint));
  $('[data-repeat]').forEach(b=>b.onclick=()=>startLevel('tour',{fromSettings:true}));
  $('[data-setup]').forEach(b=>b.onclick=()=>startLevel('setup',{fromSettings:true}));
  $('[data-reset]').forEach(b=>b.onclick=()=>{try{Object.keys(localStorage).filter(x=>x.startsWith(NS)).forEach(x=>localStorage.removeItem(x));}catch{}location.reload();});
  $('[data-next]').forEach(b=>b.onclick=e=>{e.stopPropagation();go(s.idx+1);});
  $('[data-prev]').forEach(b=>b.onclick=e=>{e.stopPropagation();go(s.idx-1);});
  $('[data-close]').forEach(b=>b.onclick=e=>{e.stopPropagation();close();});
  $('[data-never]').forEach(b=>b.onclick=e=>{e.stopPropagation();never();});
  $('[data-do]').forEach(b=>b.onclick=e=>{e.stopPropagation();complete();});
  $('[data-goto]').forEach(b=>b.onclick=e=>{e.stopPropagation();go(+b.dataset.goto);});
  $('[data-theme]').forEach(b=>b.onclick=e=>{e.stopPropagation();s.accent=b.dataset.theme;save();complete();});
  $('[data-hint-ok]').forEach(b=>b.onclick=e=>{e.stopPropagation();s.seenHints.add(s.hint.id);s.hint=null;save();draw();});
  $('[data-hint-never]').forEach(b=>b.onclick=e=>{e.stopPropagation();s.seenHints.add(s.hint.id);never();});
  $('[data-hot]').forEach(h=>h.onclick=()=>{
    const st=step();
    if(s.open&&st?.action?.hit===h.dataset.hot){complete();return;}
    if(s.hint&&s.hint.target===h.dataset.hot){s.seenHints.add(s.hint.id);s.hint=null;save();draw();}
  });
}
function start(v){
  V=v;root=document.getElementById('app');
  addEventListener('resize',draw);
  addEventListener('keydown',e=>{
    const st=step();
    if(e.key==='F1'||(e.ctrlKey&&e.shiftKey&&e.code==='Space')){e.preventDefault();
      if(s.open&&st?.action?.key&&((st.action.key==='F1'&&e.key==='F1')||(st.action.key==='launcher'&&e.code==='Space')))complete();
      else if(e.key==='F1'&&!s.open)showHint('h-palette');return;}
    if(!s.open)return;
    if(e.key==='Escape'){e.preventDefault();close();}
    else if(e.key==='ArrowRight'||e.key==='Enter'){e.preventDefault();go(s.idx+1);}
    else if(e.key==='ArrowLeft'){e.preventDefault();go(s.idx-1);}
  });
  if(s.never)s.open=false;
  draw();
}
return {start,s,I,esc,THEMES};
})();
