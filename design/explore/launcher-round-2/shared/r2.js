/* Launcher · Round 2 — due anelli (Fast launcher e Command center) e profili per app.
   Ogni variante chiama R2.start({layout:'flip'|'orbits'|'carousel'}). */
window.R2=(()=>{
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const P=d=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I={
  site:P('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/>'),
  app:P('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'),
  file:P('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'),
  folder:P('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  cmd:P('<path d="M5 8l4 4-4 4M12 16h7"/>'),
  panel:P('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>'),
  game:P('<path d="M6 9h4M8 7v4M15 10h.01M18 8h.01"/><path d="M7 5h10a5 5 0 0 1 4.8 6.4l-1.2 4.2a2.6 2.6 0 0 1-4.5.9L14 14h-4l-2.1 2.5a2.6 2.6 0 0 1-4.5-.9l-1.2-4.2A5 5 0 0 1 7 5z"/>'),
  note:P('<path d="M5 4h10l4 4v12H5z"/><path d="M9 12h6M9 16h4"/>'),
  jarvis:P('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>'),
  search:P('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
  plus:P('<path d="M12 5v14M5 12h14"/>'),
  bolt:P('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
  tabs:P('<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M8 6V3h8v3"/>'),
  pin:P('<path d="M9 4h6l-1 6 4 3H6l4-3z"/><path d="M12 13v8"/>'),
  globe:P('<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/>'),
  spark:P('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>'),
  swap:P('<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>'),
  edit:P('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
  kbd:P('<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'),
};
const TYPES={site:'Sito',app:'App',file:'File',folder:'Cartella',cmd:'Comando',panel:'Pannello web',game:'Gioco',note:'Nota',jarvis:'JARVIS',tab:'Scheda',create:'Crea',web:'Web'};

/* ── Profili per app: li sceglie l'utente; VARCO suggerisce cosa apri spesso mentre l'app è in primo piano ── */
const L=(type,title,sub,c,extra={})=>({type,title,sub,c,...extra});
const PROFILES={
  destiny:{app:'Destiny 2',kind:'Gioco',c:'#ffb648',ws:'Gaming',scene:'game',items:[
    L('site','light.gg','Armi e roll','#ffb648'),L('site','DIM','Destiny Item Manager','#f58a2e'),
    L('cmd','Destiny Builder · dev','npm run dev · C:\\Projects\\destiny-builder','#00e5ff'),L('site','Destiny Builder','localhost:5173','#00e5ff'),
    L('panel','Discord · clan','Pannello web','#7b8cff'),L('site','YouTube · guida raid','youtube.com','#ff4e45'),
    L('note','Build del raid','Nota del profilo','#ffb648'),L('site','d2foundry','Statistiche armi','#c9a26b')],
    suggest:[L('site','bungie.net','Aperto 6 volte mentre giocavi','#c9d1d9'),L('site','Braytech','Aperto 3 volte mentre giocavi','#9fb6d6')]},
  cod:{app:'Call of Duty',kind:'Gioco',c:'#9fd36b',ws:'Gaming',scene:'cod',items:[
    L('site','WZ Stats','Loadout del meta','#9fd36b'),L('site','CODMunity','Classi e statistiche','#e0c050'),
    L('site','Sym.gg','Dati delle armi','#7fc8a9'),L('site','Patch notes','callofduty.com','#e8e8e8'),
    L('panel','Discord · squadra','Pannello web','#7b8cff'),L('site','YouTube · loadout','youtube.com','#ff4e45'),
    L('note','Classi preferite','Nota del profilo','#9fd36b')],
    suggest:[L('site','r/CODWarzone','Aperto 4 volte mentre giocavi','#ff7a45')]},
  unity:{app:'Unity',kind:'Programma',c:'#9c8cff',ws:'Studio',scene:'unity',items:[
    L('site','Unity Manual','docs.unity3d.com','#9c8cff'),L('site','Scripting API','docs.unity3d.com/ScriptReference','#b5a8ff'),
    L('app','Visual Studio Code','App','#3fa9f5'),L('folder','Assets','C:\\Projects\\MyGame\\Assets','#5fd0a0'),
    L('site','Asset Store','assetstore.unity.com','#d0d0d0'),L('site','Unity Discussions','discussions.unity.com','#c9d1d9'),
    L('jarvis','Spiegami questo errore','Prompt salvato','#00e5ff'),L('note','TODO del gioco','Nota del profilo','#9c8cff')],
    suggest:[L('site','Stack Overflow','Aperto 9 volte mentre usavi Unity','#f48024')]},
  desktop:{app:'Desktop',kind:'Generale',c:'#00e5ff',ws:'Sviluppo',scene:'desktop',generic:true,items:[
    L('site','GitHub','github.com/wolfpredator-byte','#c9d1d9'),L('site','Spotify','open.spotify.com','#1ed760'),
    L('folder','Progetti','C:\\Projects','#5fd0a0'),L('cmd','VARCO · npm start','C:\\Projects\\browser-beta-01','#00e5ff'),
    L('panel','Discord','Pannello web','#7b8cff'),L('jarvis','JARVIS · chiedi','Prompt libero','#00e5ff'),
    L('app','Steam','App','#9fb6d6'),L('folder','Download','C:\\Users\\Download','#5fd0a0')],suggest:[]},
};
const PC=[L('app','Unity Hub','App · sul PC','#d0d0d0'),L('app','OBS Studio','App · sul PC','#bbbbbb'),L('app','Discord','App · sul PC','#7b8cff'),L('folder','Screenshot','C:\\Users\\Immagini\\Screenshot','#5fd0a0'),L('file','loadout-raid.txt','C:\\Users\\Documenti\\Destiny','#ffb648')];

/* ── Command center (come nella 0.38) ── */
const SECTIONS=[
  {id:'now',t:'Apri subito',ic:'bolt',items:[L('tab','GitHub · Pull request','github.com · Sviluppo','#c9d1d9'),L('cmd','Destiny Builder · dev','In esecuzione · :5173','#00e5ff'),L('tab','Unity Manual – Rigidbody','docs.unity3d.com','#9c8cff')]},
  {id:'tabs',t:'Schede',ic:'tabs',items:[L('tab','Unity Manual – Rigidbody','docs.unity3d.com · Studio','#9c8cff'),L('tab','light.gg · Fatebringer','light.gg · Gaming','#ffb648'),L('tab','YouTube · guida raid','youtube.com · Gaming','#ff4e45'),L('tab','GitHub · Pull request','github.com · Sviluppo','#c9d1d9'),L('tab','Electron docs','electronjs.org · Sviluppo','#9fe0f0')]},
  {id:'projects',t:'Progetti',ic:'folder',items:[L('folder','Destiny Builder','C:\\Projects\\destiny-builder','#ffb648'),L('folder','VARCO','C:\\Projects\\browser-beta-01','#00e5ff'),L('folder','MyGame','C:\\Projects\\MyGame','#9c8cff')]},
  {id:'links',t:'Fast link',ic:'pin',items:[L('site','light.gg','Profilo Destiny 2','#ffb648'),L('site','GitHub','Generale','#c9d1d9'),L('site','Unity Manual','Profilo Unity','#9c8cff')]},
  {id:'commands',t:'Comandi',ic:'cmd',items:[L('cmd','Modalità zen','Nasconde tutto tranne la pagina','#00e5ff'),L('cmd','Dividi lo schermo','Due schede affiancate','#00e5ff'),L('cmd','Cambia tema','Cyan Flash','#00e5ff'),L('cmd','Blocco pubblicità','Attivo','#00e5ff')]},
  {id:'web',t:'Web',ic:'globe',items:[L('web','Cerca sul web','Google con i suggerimenti','#c9d1d9'),L('web','unity rigidbody velocity','Cronologia','#c9d1d9')]},
  {id:'jarvis',t:'JARVIS',ic:'jarvis',items:[L('jarvis','Chiedi a JARVIS','Scrivi una domanda','#00e5ff'),L('jarvis','Riassumi la pagina','Unity Manual – Rigidbody','#00e5ff'),L('jarvis','Salva nel progetto','Nelle note del progetto','#00e5ff')]},
  {id:'create',t:'Crea',ic:'plus',items:[L('create','Nota','Nel workspace','#00e5ff'),L('create','Task','- [ ] …','#00e5ff'),L('create','Fast link','Per il profilo o generale','#00e5ff'),L('create','Workspace','Nuovo spazio','#00e5ff')]},
];

const s={open:true,mode:'fast',q:'',sel:0,act:0,sec:0,scene:'destiny',toast:null,first:true,anim:null,layout:'flip'};
let inputEl,root;
const prof=()=>PROFILES[s.scene];

/* ── Liste ── */
function fastLists(){
  const p=prof();const q=s.q.trim().toLowerCase();
  if(q){
    const seen=new Set(),pool=[];
    for(const [k,pp] of Object.entries(PROFILES))for(const x of pp.items){if(seen.has(x.title))continue;seen.add(x.title);pool.push({...x,from:pp.generic?'Generale':'Profilo '+pp.app,mine:k===s.scene});}
    PC.forEach(x=>pool.push({...x,from:'Sul PC'}));
    const sc=x=>{const t=x.title.toLowerCase(),a=(t+' '+x.sub+' '+x.from).toLowerCase();const b=t.startsWith(q)?100:t.split(/[\s·.]+/).some(w=>w.startsWith(q))?80:a.includes(q)?50:0;return b?b+(x.mine?25:0):0;};
    const list=pool.map(x=>[x,sc(x)]).filter(a=>a[1]>0).sort((a,b)=>b[1]-a[1]).map(a=>a[0]).slice(0,8);
    list.push({type:'web',title:`Cerca «${s.q.trim()}» sul web`,sub:'Google · in VARCO',c:'#c9d1d9',dyn:true},{type:'jarvis',title:`Chiedi a JARVIS: «${s.q.trim()}»`,sub:'Risposta come notifica',c:'#00e5ff',dyn:true});
    return {ring:p.items.slice(0,8),fan:[{title:'Risultati',items:list}]};
  }
  const fan=[];
  if(p.items.length>8)fan.push({title:'Altro nel profilo',items:p.items.slice(8)});
  if(p.suggest.length)fan.push({title:'Suggeriti per '+p.app,note:'li apri spesso mentre è in primo piano',items:p.suggest.map(x=>({...x,suggest:true}))});
  if(!p.generic)fan.push({title:'Generali',items:PROFILES.desktop.items.slice(0,3).map(x=>({...x,from:'Generale'}))});
  else fan.push({title:'Sul PC',items:PC.slice(0,4)});
  return {ring:p.items.slice(0,8),fan};
}
function ccLists(){
  const q=s.q.trim().toLowerCase();
  if(q){const res=[];SECTIONS.forEach(sec=>sec.items.forEach(x=>{if((x.title+' '+x.sub).toLowerCase().includes(q))res.push({...x,from:sec.t});}));
    res.push({type:'web',title:`Cerca «${s.q.trim()}» sul web`,sub:'Google',c:'#c9d1d9',dyn:true},{type:'jarvis',title:`Chiedi a JARVIS: «${s.q.trim()}»`,sub:'',c:'#00e5ff',dyn:true});
    return {fan:[{title:'Risultati in tutte le sezioni',items:res}]};}
  const sec=SECTIONS[s.sec];return {fan:[{title:sec.t,items:sec.items}]};
}
/* Ordine della tastiera: nel fast launcher prima i settori (1–8) poi il ventaglio; nel command center solo il ventaglio. */
function flat(){if(s.mode==='fast'){const l=fastLists();return [...(s.q.trim()?[]:l.ring),...l.fan.flatMap(g=>g.items)];}return ccLists().fan.flatMap(g=>g.items);}
const current=()=>flat()[s.sel]||null;
function actions(x){
  if(!x)return [];
  if(x.suggest)return ['Aggiungi al profilo','Apri','Ignora'];
  return ({site:['Apri in VARCO','Apri nel pannello','Copia link'],panel:['Apri nel pannello','Apri in una scheda'],app:['Avvia','Mostra nella cartella'],
    folder:['Apri','Apri nel terminale','Copia percorso'],file:['Apri','Mostra nella cartella'],cmd:['Esegui','Apri il progetto','Ferma'],note:['Apri la nota'],
    jarvis:['Chiedi a JARVIS'],tab:['Vai alla scheda','Affianca','Chiudi'],web:['Cerca'],create:['Crea']}[x.type]||['Apri']);
}

/* ── Azioni ── */
function toast(msg,sub){s.toast={msg,sub};clearTimeout(toast.t);toast.t=setTimeout(()=>{s.toast=null;draw();},2600);}
function run(x,ai=s.act){
  if(!x)return;const a=actions(x)[ai]||actions(x)[0];
  if(x.suggest&&a==='Aggiungi al profilo'){const p=prof();p.suggest=p.suggest.filter(y=>y.title!==x.title);delete x.suggest;x.sub=x.sub.replace(/Aperto.*/,'Aggiunto ora');p.items.push(x);toast('Aggiunto al profilo '+p.app,x.title+(p.items.length>8?' · nel ventaglio (l\'anello ne tiene 8)':''));draw();return;}
  if(a==='Ignora'){const p=prof();p.suggest=p.suggest.filter(y=>y.title!==x.title);toast('Non lo suggerisco più',x.title);draw();return;}
  if(a.startsWith('Copia')){toast('Copiato',x.sub);draw();return;}
  toast(a+' · '+x.title.replace(/«|»/g,''),s.mode==='fast'?'Il launcher si chiude e torni a '+prof().app:'');close();
}
function setMode(m){if(m===s.mode)return;s.anim=s.mode+'>'+m;s.mode=m;s.sel=0;s.act=0;draw();setTimeout(()=>{s.anim=null;},450);}
function open(m='fast'){s.open=true;s.first=true;s.mode=m;s.q='';s.sel=0;s.act=0;if(inputEl)inputEl.value='';draw();}
function close(){s.open=false;draw();}

function onKey(e){
  if(e.ctrlKey&&e.altKey&&e.code==='Space'){e.preventDefault();if(!s.open)open('fast');else setMode(s.mode==='fast'?'cc':'fast');return;}
  if(e.key==='F1'){e.preventDefault();if(!s.open)open('cc');else setMode('cc');return;}
  if(!s.open)return;
  const fl=flat(),n=fl.length,acts=actions(current()).length;
  if(s.mode==='fast'&&!s.q&&/^[1-8]$/.test(e.key)&&!e.ctrlKey&&!e.altKey){const x=fastLists().ring[+e.key-1];if(x){e.preventDefault();s.sel=+e.key-1;run(x,0);}return;}
  if(!s.q&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();const d=e.key==='ArrowRight'?1:-1;
    if(s.mode==='fast'){const r=fastLists().ring.length;s.sel=s.sel<r?(s.sel+d+r)%r:0;}else{s.sec=(s.sec+d+SECTIONS.length)%SECTIONS.length;s.sel=0;}s.act=0;draw();return;}
  if(e.key==='ArrowDown'){e.preventDefault();s.sel=(s.sel+1)%Math.max(1,n);s.act=0;draw();}
  else if(e.key==='ArrowUp'){e.preventDefault();s.sel=(s.sel-1+n)%Math.max(1,n);s.act=0;draw();}
  else if(e.key==='Tab'){e.preventDefault();if(acts)s.act=(s.act+(e.shiftKey?-1:1)+acts)%acts;draw();}
  else if(e.key==='Enter'){e.preventDefault();run(current(),e.ctrlKey?1:s.act);}
  else if(e.key==='Escape'){e.preventDefault();if(s.act){s.act=0;draw();}else if(s.q){s.q='';inputEl.value='';s.sel=0;draw();}else close();}
}

/* ── Disegno ── */
function icon(x){const mono=x.type==='site'||x.type==='panel'||x.type==='tab'||x.type==='web';return `<span class="lx-ic" style="--c:${x.c||'var(--acc)'}">${mono?`<b>${esc((x.title.match(/[A-Za-z0-9]/)||['·'])[0].toUpperCase())}</b>`:(I[x.type]||I.site)}</span>`;}
const short=t=>t.split(' · ')[0];
/* Un anello generico: settori, etichette e arco della scelta. */
function ring({R,Ri,secs,onIdx,color,cls='',core='',data='fs'}){
  const N=secs.length,step=360/N;
  const pt=(r,a)=>[R+r*Math.cos((a-90)*Math.PI/180),R+r*Math.sin((a-90)*Math.PI/180)];
  const path=(a0,a1)=>{const [x0,y0]=pt(R,a0),[x1,y1]=pt(R,a1),[x2,y2]=pt(Ri,a1),[x3,y3]=pt(Ri,a0);return `M${x0},${y0}A${R},${R} 0 0 1 ${x1},${y1}L${x2},${y2}A${Ri},${Ri} 0 0 0 ${x3},${y3}Z`;};
  let segs='',labs='',arc='';
  secs.forEach((sec,i)=>{const a=i*step,on=i===onIdx;
    segs+=`<g class="seg${sec.free?' free':''}${on?' on':''}" data-${data}="${i}"><path d="${path(a-step/2+1.2,a+step/2-1.2)}"/></g>`;
    const [lx,ly]=pt((R+Ri)/2,a);labs+=`<div class="sl${on?' on':''}" style="left:${lx}px;top:${ly}px">${sec.html}</div>`;
    if(on)arc=`<path class="arc" d="M${pt(R+7,a-step/2+5).join(',')}A${R+7},${R+7} 0 0 1 ${pt(R+7,a+step/2-5).join(',')}"/>`;});
  return `<div class="ring ${cls}" style="width:${2*R}px;height:${2*R}px;--mc:${color}"><svg viewBox="0 0 ${2*R} ${2*R}" width="${2*R}" height="${2*R}">${segs}${arc}</svg>${labs}${core}</div>`;
}
function fastRing(R,Ri,opt={}){
  const l=fastLists(),secs=[];
  for(let i=0;i<8;i++){const x=l.ring[i];secs.push(x?{html:`${icon(x)}${opt.small?'':`<span>${esc(short(x.title))}</span>`}<kbd>${i+1}</kbd>`}:{free:true,html:`<span class="lx-ic" style="--c:#667">${I.plus}</span>${opt.small?'':'<span>Libero</span>'}`});}
  return ring({R,Ri,secs,onIdx:s.mode==='fast'&&!s.q.trim()&&s.sel<8?s.sel:-1,color:prof().c,cls:'fast '+(opt.cls||''),core:opt.core||'',data:'fs'});
}
function ccRing(R,Ri,opt={}){
  const secs=SECTIONS.map(sec=>({html:`${I[sec.ic]}${opt.small?'':`<span>${sec.t}</span>`}${opt.small?'':`<em>${sec.items.length}</em>`}`}));
  return ring({R,Ri,secs,onIdx:s.mode==='cc'?s.sec:-1,color:'var(--acc)',cls:'cc '+(opt.cls||''),core:opt.core||'',data:'cs'});
}
function core(size,label=true){
  const p=prof(),cur=current();
  return `<div class="core" style="width:${size}px;height:${size}px"><span class="mode-name">${s.mode==='fast'?I.bolt+'Fast launcher':I.spark+'Command center'}</span><span id="lxSlot"></span>
    ${label?`<span class="who">${s.mode==='fast'?`<i style="--w:${p.c}"></i>${esc(p.generic?'Generale · Desktop':p.app+' · profilo')}`:'Sezione: '+SECTIONS[s.sec].t}</span>`:''}${cur&&label?`<span class="cur">${esc(cur.title)}</span>`:''}</div>`;
}
function fan(){
  const groups=s.mode==='fast'?fastLists().fan:ccLists().fan;let k=s.mode==='fast'&&!s.q.trim()?fastLists().ring.length:0;
  return `<div class="fan">${s.mode==='fast'&&!s.q?`<div class="prof"><span class="pi" style="--c:${prof().c}">${I[prof().kind==='Gioco'?'game':'app']}</span><div><b>${esc(prof().app)}</b><span>${prof().generic?'Nessuna app in primo piano: fast link generali':'In primo piano · profilo con '+prof().items.length+' fast link'}</span></div><button class="edit" data-edit>${I.edit}Modifica</button></div>`:''}
  ${groups.map(g=>`<div class="lab">${esc(g.title)}${g.note?` <i>· ${esc(g.note)}</i>`:''}</div>${g.items.length?g.items.map(x=>{const i=k++;return `<div class="item${i===s.sel?' sel':''}${x.suggest?' sug':''}" data-i="${i}">${icon(x)}<div class="t"><b>${esc(x.title)}</b><span>${esc(x.from?x.from+' · '+x.sub:x.sub)}</span></div>${x.suggest?'<span class="tag">Suggerito</span>':''}</div>`;}).join(''):`<div class="item none">Niente per «${esc(s.q)}»</div>`}`).join('')}</div>`;
}
function bar(){const cur=current();return `<div class="acts">${cur?actions(cur).map((a,j)=>`<button class="lx-act${j===s.act?' on':''}" data-a="${j}">${a}</button>`).join(''):''}
  <span class="lx-hint"><span><kbd>Ctrl</kbd><kbd>Alt</kbd><kbd>Spazio</kbd> ${s.mode==='fast'?'→ Command center':'→ Fast launcher'}</span><span><kbd>←</kbd><kbd>→</kbd> ${s.mode==='fast'?'anello':'sezioni'}</span>${s.mode==='fast'?'<span><kbd>1</kbd>…<kbd>8</kbd> apri</span>':''}<span><kbd>Tab</kbd> azioni</span><span><kbd>Esc</kbd> chiudi</span></span></div>`;}
function switcher(){return `<div class="switch"><button data-mode="fast" class="${s.mode==='fast'?'on':''}" style="--mc:${prof().c}">${I.bolt}Fast launcher</button><button data-mode="cc" class="${s.mode==='cc'?'on':''}">${I.spark}Command center</button></div>`;}

function scene(){
  const g=s.scene;
  if(g==='destiny'||g==='cod')return `<div class="sc sc-game ${g}"><div class="sky"></div><div class="hills"></div><div class="hud-tl"><i></i><i></i><i></i></div><div class="hud-hp"><b style="width:72%"></b></div><div class="hud-ammo">${g==='cod'?'30<small>/ 120</small>':'32<small>/ 180</small>'}</div><div class="hud-map"></div><div class="cross"></div></div>`;
  return `<div class="sc sc-desk"><div class="wall"></div>${g==='unity'?`<div class="win unity"><div class="wt">Unity 6 — MyGame — Main.unity</div><div class="u-grid"><i></i><i></i><i></i></div></div>`:`<div class="win"><div class="wt">Esplora file — Progetti</div><div class="code">${Array.from({length:10},(_,i)=>`<i style="width:${30+((i*37)%50)}%"></i>`).join('')}</div></div>`}<div class="task">${'<i></i>'.repeat(7)}</div></div>`;
}
function demo(){return `<div class="lx-demo"><span class="t">In primo piano:</span>${Object.entries(PROFILES).map(([k,v])=>`<button data-scene="${k}" class="${s.scene===k?'on':''}">${v.app}</button>`).join('')}
  <span class="sep"></span><span class="t">Prova:</span><button data-try="">Vuoto</button><button data-try="dis">«dis»</button><button data-try="zzz">Nessun risultato</button>
  <span class="sep"></span><button data-open="cc">${I.kbd}<kbd>F1</kbd> command center</button><button data-open="fast" class="hot"><kbd>Ctrl</kbd><kbd>Alt</kbd><kbd>Spazio</kbd> fast launcher</button></div>`;}

let LAYOUT;
function draw(){
  if(!root)return;
  if(s.sel>=flat().length)s.sel=Math.max(0,flat().length-1);
  const el=inputEl,focused=s.first||document.activeElement===el,a=el.selectionStart,b=el.selectionEnd;
  root.innerHTML=scene()+(s.open?`<div class="lx-veil ${s.scene==='destiny'||s.scene==='cod'?'game':''}"></div><div class="lx L-${s.layout} M-${s.mode}${s.first?' enter':''}${s.anim?' anim a-'+s.anim.replace('>','-'):''}" style="--mc:${s.mode==='fast'?prof().c:'var(--acc)'}">${LAYOUT(s)}</div>`:`<div class="lx-closed">Chiuso · <kbd>Ctrl</kbd><kbd>Alt</kbd><kbd>Spazio</kbd> fast launcher · <kbd>F1</kbd> command center</div>`)+
    (s.toast?`<div class="lx-toast"><b>${esc(s.toast.msg)}</b>${s.toast.sub?`<span>${esc(s.toast.sub)}</span>`:''}</div>`:'')+demo();
  const slot=root.querySelector('#lxSlot');
  if(slot){slot.replaceWith(el);el.placeholder=s.mode==='fast'?'Cerca o premi 1–8':'Cerca in VARCO…';if(focused){el.focus({preventScroll:true});if(!s.first&&a!==null)try{el.setSelectionRange(a,b);}catch{}}}
  if(s.first){s.first=false;setTimeout(()=>root.querySelector('.lx')?.classList.remove('enter'),400);}
  const $=q=>root.querySelectorAll(q);
  $('[data-scene]').forEach(b=>b.onclick=()=>{s.scene=b.dataset.scene;open('fast');});
  $('[data-try]').forEach(b=>b.onclick=()=>{if(!s.open)open(s.mode);s.q=b.dataset.try;el.value=s.q;s.sel=0;s.act=0;draw();el.focus();});
  $('[data-open]').forEach(b=>b.onclick=()=>{s.open?setMode(b.dataset.open):open(b.dataset.open);});
  $('[data-mode]').forEach(b=>b.onclick=()=>{setMode(b.dataset.mode);el.focus();});
  $('[data-edit]').forEach(b=>b.onclick=()=>{toast('Modifica profilo '+prof().app,'Scegli cosa sta sull\'anello quando '+prof().app+' è in primo piano (prossimo giro)');draw();});
  $('[data-i]').forEach(n=>{n.onclick=()=>{s.sel=+n.dataset.i;s.act=0;run(current(),0);};n.onmouseenter=()=>{if(s.sel!==+n.dataset.i){s.sel=+n.dataset.i;s.act=0;draw();}};});
  $('[data-a]').forEach(n=>n.onclick=e=>{e.stopPropagation();s.act=+n.dataset.a;run(current());});
  $('[data-fs]').forEach(g=>{const i=+g.dataset.fs;g.onclick=()=>{if(s.mode!=='fast'){setMode('fast');return;}const x=fastLists().ring[i];if(x){s.sel=i;run(x,0);}};
    g.onmouseenter=()=>{if(s.mode==='fast'&&fastLists().ring[i]&&s.sel!==i){s.sel=i;s.act=0;draw();}};});
  $('[data-cs]').forEach(g=>{const i=+g.dataset.cs;g.onclick=()=>{if(s.mode!=='cc'){s.sec=i;setMode('cc');return;}s.sec=i;s.sel=0;s.act=0;draw();};});
  $('[data-goto]').forEach(g=>g.onclick=()=>setMode(g.dataset.goto));
  root.querySelector('.lx-veil')?.addEventListener('click',close);
}
function start(opt){
  LAYOUT=opt.render;s.layout=opt.layout;root=document.getElementById('app');
  inputEl=document.createElement('input');inputEl.className='lx-input';inputEl.autocomplete='off';inputEl.spellcheck=false;
  inputEl.addEventListener('input',()=>{s.q=inputEl.value;s.sel=0;s.act=0;draw();});
  document.addEventListener('keydown',onKey);addEventListener('resize',draw);
  const p=new URLSearchParams(location.search);if(p.get('scene'))s.scene=p.get('scene');if(p.get('mode'))s.mode=p.get('mode');
  draw();
}
return {start,s,I,fastRing,ccRing,core,fan,bar,switcher,prof,SECTIONS};
})();
