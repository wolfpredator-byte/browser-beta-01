/* Beta 0.42 — tutorial di VARCO (cornice). Stile «Riflettore» (design/explore/tutorial-round-1/v1-riflettore).
   Tutto in penombra tranne il pulsante vero, che resta cliccabile: il riflettore non blocca mai i clic.
   - setup del primo avvio (~60 s) e tour completo (8 passi): un concetto per passo, l'azione vera completa il passo;
   - suggerimenti della prima volta (palette, progetti, pannelli, giochi, link rapidi): una volta sola ciascuno;
   - progresso salvato nel processo principale (tour-rules.js); «Non mostrare più» rispettato sempre.
   Durante il tour la pagina web (che sta sopra la cornice) è nascosta e al suo posto c'è la sua foto (lib/tour.cjs). */
(()=>{
'use strict';
const R=window.TourRules;
const act=(name,args={})=>window.browserAPI.action(name,args);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const P=d=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I={close:P('<path d="M6 6l12 12M18 6L6 18"/>'),check:P('<path d="M5 12l5 5 9-10"/>'),left:P('<path d="M15 6l-6 6 6 6"/>'),right:P('<path d="M9 6l6 6-6 6"/>'),
  eyeoff:P('<path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.8 9.8 0 0 1 12 5c5 0 9 5 9 7a10.6 10.6 0 0 1-2.5 3.5M6.6 6.6C4.4 8 3 10.4 3 12c0 2 4 7 9 7a9.6 9.6 0 0 0 4-.9"/>'),
  bulb:P('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>')};

let T=R.normalizeTour();          // stato salvato (arriva dal processo principale)
let lastHintAt=0;               // un suggerimento automatico non arriva subito dopo un altro
const s={level:null,idx:0,open:false,paused:false,pulse:false,completing:false,hint:null,theme:null};
let root;
const steps=()=>R.STEPS[s.level]||[];
const step=()=>steps()[s.idx];

function save(ev){T=R.apply(T,ev);act('tourEvent',ev).then(r=>{if(r?.result?.tour)T=r.result.tour;});}

// ── Livelli ──
function start(level,{restart=false}={}){
  if(!R.LEVELS.includes(level))return;
  if(restart)save({type:'restart',level});
  else if(T.never)return;
  s.level=level;s.idx=restart?0:T[level].idx;s.open=true;s.hint=null;s.paused=false;
  save({type:'step',level,idx:s.idx});
  act('tourMode',{on:true});
  draw();
}
function close(){
  if(!s.open)return;
  s.open=false;s.paused=false;
  act('tourMode',{on:false});
  const img=document.getElementById('paletteBackdrop');if(img&&document.getElementById('palette')?.hidden!==false){img.hidden=true;img.removeAttribute('src');}
  draw();
}
function never(){save({type:'never'});s.hint=null;close();}
function go(i){
  if(i<0)return;
  if(i>=steps().length){save({type:'finish',level:s.level});close();return;}
  s.idx=i;save({type:'step',level:s.level,idx:i});draw();
}
/** L'azione vera è stata fatta: spunta e passo successivo. */
function complete(){
  const st=step();if(!st||s.completing)return;
  s.completing=true;
  if(!T.done.includes(st.id))save({type:'done',id:st.id});
  s.pulse=true;draw();
  setTimeout(()=>{s.pulse=false;s.completing=false;if(s.open&&step()===st)go(s.idx+1);},700);
}
/** Il pulsante della scheda fa la cosa vera (clic sul pulsante reale, comando, Impostazioni → categoria). */
function runStep(st){
  const [kind,arg]=String(st.run||'').split(/:(.*)/s);
  if(kind==='click'){document.querySelector(arg)?.click();return;}         // il clic stesso completa il passo
  if(kind==='action'){act(arg);if(!st.event)complete();return;}            // palette e launcher: li completa il loro evento
  if(kind==='settings'){act('openSettings').then(()=>setTimeout(()=>window.openSettingsCategory?.(arg),250));complete();return;}
  complete();
}

// ── Disegno ──
function targetOf(st){
  for(const sel of [st.target,st.fallback].filter(Boolean)){
    const el=document.querySelector(sel);
    if(!el)continue;
    el.scrollIntoView({block:'nearest',inline:'nearest'});                  // es. la barra laterale scorre fino a Giochi
    const r=el.getBoundingClientRect();
    if(r.width>2&&r.height>2&&r.bottom>0&&r.top<innerHeight)return r;
  }
  return null;
}
function draw(){
  if(!root)return;
  if((!s.open||s.paused)&&!s.hint){root.innerHTML='';root.hidden=true;return;}
  root.hidden=false;
  if(s.hint){drawHint();return;}
  const st=step(),idx=s.idx,total=steps().length,done=T.done.includes(st.id);
  const r=st.target?targetOf(st):null;
  const dots=`<span class="tr-dots">${steps().map((x,i)=>`<i class="${i===idx?'on':T.done.includes(x.id)?'ok':''}"></i>`).join('')}</span>`;
  const themes=st.themes?`<div class="tr-swatches">${R.THEMES.map(([id,name,c])=>`<button class="tr-sw${s.theme===id?' on':''}" style="--c:${c}" data-theme="${id}"><i></i>${esc(name)}</button>`).join('')}</div>`:'';
  const main=st.themes?'':`<div><button class="tr-btn${done?' done':''}" data-do>${done?I.check+'Fatto':esc(st.action)}</button></div>`;
  const body=`<span class="tr-n">${s.level==='setup'?'Primo avvio · ':''}${idx+1} di ${total}</span><h3>${esc(st.title)}</h3><p>${esc(st.text)}</p>${themes}${main}
    <div class="tr-foot">${dots}${idx?`<button class="tr-ghost" data-prev>${I.left}Indietro</button>`:''}<button class="tr-ghost" data-next>${idx===total-1?'Fine':'Avanti'}${I.right}</button></div>
    <button class="tr-never" data-never>${I.eyeoff}Non mostrare più</button><button class="tr-x" data-close title="Chiudi (Esc)" aria-label="Chiudi il tour">${I.close}</button>`;
  if(!r){root.innerHTML=`<div class="tr-dim"></div><div class="tr-card center" role="dialog" aria-label="${esc(st.title)}">${body}</div>`;bind();return;}
  const pad=6;
  root.innerHTML=`<div class="tr-hole${s.pulse?'':' pulse'}" style="left:${r.left-pad}px;top:${r.top-pad}px;width:${r.width+pad*2}px;height:${r.height+pad*2}px"></div>
    <div class="tr-card" role="dialog" aria-label="${esc(st.title)}"><span class="tr-arrow"></span>${body}</div>`;
  place(root.querySelector('.tr-card'),r);
  bind();
}
/** Scheda accanto al pulsante: a destra della barra laterale, sotto la barra in alto, sopra il resto. Misurata, mai fuori schermo. */
function place(card,r){
  const W=innerWidth,H=innerHeight,gap=18,w=card.offsetWidth,h=card.offsetHeight,arrow=card.querySelector('.tr-arrow');
  let left,top,a;
  if(r.right<W*0.25){left=r.right+gap;top=Math.max(12,Math.min(H-h-12,r.top+r.height/2-h/2));a={left:-8,top:r.top+r.height/2-top-7,rot:-45};}
  else if(r.top<H*0.35){left=Math.max(12,Math.min(W-w-12,r.left+r.width/2-w/2));top=Math.min(H-h-12,r.bottom+gap);a={top:-8,left:r.left+r.width/2-left-7,rot:45};}
  else{left=Math.max(12,Math.min(W-w-12,r.left+r.width/2-w/2));top=Math.max(12,r.top-h-gap);a={bottom:-8,left:r.left+r.width/2-left-7,rot:225};}
  card.style.left=left+'px';card.style.top=top+'px';
  const clamp=v=>Math.max(16,Math.min((a.top!=null||a.bottom!=null?w:h)-30,v));
  Object.assign(arrow.style,{left:a.left!=null?(a.left<0?a.left+'px':clamp(a.left)+'px'):'',top:a.top!=null?(a.top<0?a.top+'px':clamp(a.top)+'px'):'',bottom:a.bottom!=null?a.bottom+'px':'',transform:`rotate(${a.rot}deg)`});
}
function bind(){
  const $=q=>root.querySelectorAll(q);
  $('[data-next]').forEach(b=>b.onclick=()=>go(s.idx+1));
  $('[data-prev]').forEach(b=>b.onclick=()=>go(s.idx-1));
  $('[data-close]').forEach(b=>b.onclick=close);
  $('[data-never]').forEach(b=>b.onclick=never);
  $('[data-do]').forEach(b=>b.onclick=()=>{const st=step();if(T.done.includes(st.id))go(s.idx+1);else if(!st.run)go(s.idx+1);else runStep(st);});
  $('[data-theme]').forEach(b=>b.onclick=()=>{s.theme=b.dataset.theme;act('setTheme',{theme:s.theme});complete();});
  $('[data-hint-ok]').forEach(b=>b.onclick=()=>{s.hint=null;draw();});
  $('[data-hint-never]').forEach(b=>b.onclick=()=>{save({type:'hints',on:false});s.hint=null;draw();});
}

// ── Suggerimenti della prima volta ──
function hint(id){
  if(s.open||!R.canHint(T,id))return;
  const h=R.HINTS[id];
  setTimeout(()=>{
    const el=document.querySelector(h.target);if(!el||s.open)return;
    const r=el.getBoundingClientRect();if(!r.width)return;
    save({type:'hint',id});                 // visto: non ricompare, anche se lo ignori
    lastHintAt=Date.now();
    s.hint={id,text:h.text,r};draw();
    clearTimeout(hint.t);hint.t=setTimeout(()=>{if(s.hint?.id===id){s.hint=null;draw();}},12000);
  },350);
}
function drawHint(){
  const {r,text}=s.hint,W=innerWidth,w=300;
  const left=r.right<W*0.25?r.right+14:Math.max(12,Math.min(W-w-12,r.left+r.width/2-w/2));
  const top=r.right<W*0.25?Math.max(12,r.top+r.height/2-40):(r.top<innerHeight*0.4?r.bottom+12:Math.max(12,r.top-120));
  root.innerHTML=`<div class="tr-tip" role="status" style="left:${left}px;top:${top}px"><b>${I.bulb}Suggerimento</b><span>${esc(text)}</span>
    <div class="tr-row"><button class="tr-btn" data-hint-ok>Capito</button><button class="tr-never" data-hint-never>${I.eyeoff}Non mostrare più suggerimenti</button></div></div>`;
  bind();
}

// ── Eventi: palette aperta/chiusa, launcher, clic sui pulsanti veri ──
function event(name){
  if(name==='palette'){
    if(s.open){if(step()?.event==='palette')complete();s.paused=true;draw();}
    else hint('palette');
    return;
  }
  if(name==='palette-closed'){if(s.open&&s.paused){s.paused=false;act('tourMode',{on:true});draw();}return;}
  if(s.open&&step()?.event===name)complete();
}
function onClick(e){
  if(e.target.closest?.('#tour'))return;
  if(s.open&&!s.paused){const st=step(),hit=st?.hit||st?.target;if(hit&&!st.themes&&e.target.closest?.(hit))complete();}
  if(s.hint&&!e.target.closest?.('.tr-tip')){s.hint=null;draw();}
  const t=e.target.closest?.('#showProject,#addWebPanel,#showGames');
  if(t)hint({showProject:'project',addWebPanel:'webpanel',showGames:'games'}[t.id]);
}
function onKey(e){
  if(!s.open||s.paused)return;
  const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||'');
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}
  else if(!typing&&e.key==='ArrowRight'){e.preventDefault();go(s.idx+1);}
  else if(!typing&&e.key==='ArrowLeft'){e.preventDefault();go(s.idx-1);}
}

async function init(){
  root=document.createElement('div');root.id='tour';root.hidden=true;document.body.append(root);
  document.addEventListener('click',onClick,true);
  document.addEventListener('keydown',onKey,true);
  let rz;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(s.hint)s.hint=null;draw();},80);});
  // La palette (command center) si apre e si chiude cambiando l'attributo hidden di #palette.
  const pal=document.getElementById('palette');
  if(pal)new MutationObserver(()=>event(pal.hidden?'palette-closed':'palette')).observe(pal,{attributes:true,attributeFilter:['hidden']});
  // Link rapidi della Home: il suggerimento compare la prima volta che li vedi.
  setInterval(()=>{if(!s.open&&!s.hint&&Date.now()-lastHintAt>20000&&document.hasFocus()&&R.canHint(T,'links')){const c=document.getElementById('linksCard');if(c&&c.offsetParent&&c.getBoundingClientRect().top<innerHeight-80)hint('links');}},2500);
  const r=await act('tourState');
  if(r?.result?.tour)T=r.result.tour;
  if(r?.result?.offer)setTimeout(()=>start('setup'),1500);   // primo avvio: il setup si propone da solo, una volta
}
window.Tour={start,close,event,restart:level=>start(level,{restart:true}),state:()=>T};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
