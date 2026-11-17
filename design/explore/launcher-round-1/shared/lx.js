/* Launcher 0.39 — motore comune degli esempi: dati, ricerca, contesto, tastiera, azioni finte.
   Ogni variante chiama LX.start({render, bind, keys}) e disegna come vuole. */
window.LX=(()=>{
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
  companion:P('<path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"/>'),
  note:P('<path d="M5 4h10l4 4v12H5z"/><path d="M9 12h6M9 16h4"/>'),
  jarvis:P('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>'),
  search:P('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
  plus:P('<path d="M12 5v14M5 12h14"/>'),
  pin:P('<path d="M9 4h6l-1 6 4 3H6l4-3z"/><path d="M12 13v8"/>'),
  clock:P('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  warn:P('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>'),
  close:P('<path d="M6 6l12 12M18 6L6 18"/>'),
  kbd:P('<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'),
  globe:P('<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/>'),
  drop:P('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>'),
  back:P('<path d="M15 6l-6 6 6 6"/>'),
};
const TYPES={site:'Sito',app:'App',file:'File',folder:'Cartella',cmd:'Comando',panel:'Pannello web',game:'Gioco',companion:'Companion',note:'Nota',jarvis:'JARVIS',search:'Ricerca salvata',create:'Crea'};
const CHIPS=[['all','Tutto'],['fast','Fast link'],['app','App'],['file','File'],['site','Siti'],['cmd','Comandi'],['jarvis','JARVIS']];
const CHIP_OF={site:'site',companion:'site',panel:'site',search:'site',app:'app',game:'app',file:'file',folder:'file',cmd:'cmd',jarvis:'jarvis',note:'jarvis'};
const SCOPE={global:'Globale',ws:'Workspace',session:'Sessione'};
const WS={Gaming:'#ffb648',Sviluppo:'#00e5ff',Studio:'#9c8cff'};

/* Fast link (fissati e non) + cose del PC che il launcher trova da solo (fast:false). */
let ITEMS=[
  {id:1,type:'companion',title:'light.gg',sub:'light.gg · armi e roll',scope:'ws',ws:'Gaming',group:'Destiny',key:1,pinned:true,uses:64,last:20,c:'#ffb648',ctx:'game'},
  {id:2,type:'companion',title:'DIM',sub:'app.destinyitemmanager.com',scope:'ws',ws:'Gaming',group:'Destiny',key:2,pinned:true,uses:88,last:5,c:'#f58a2e',ctx:'game'},
  {id:3,type:'panel',title:'Discord · server del clan',sub:'Pannello web a destra',scope:'global',group:'Amici',key:3,pinned:true,uses:51,last:90,c:'#7b8cff'},
  {id:4,type:'search',title:'Cerca un\'arma su light.gg',sub:'!lg {testo}',scope:'ws',ws:'Gaming',group:'Destiny',key:4,pinned:true,uses:30,last:300,c:'#ffb648',bang:'lg',ctx:'game'},
  {id:5,type:'cmd',title:'VARCO · npm start',sub:'C:\\Projects\\browser-beta-01',scope:'ws',ws:'Sviluppo',group:'VARCO',key:5,pinned:true,uses:40,last:200,c:'#00e5ff'},
  {id:6,type:'folder',title:'Progetti',sub:'C:\\Projects',scope:'global',group:'PC',key:6,pinned:true,uses:33,last:600,c:'#5fd0a0'},
  {id:7,type:'jarvis',title:'JARVIS · spiegami questo errore',sub:'Prompt salvato',scope:'global',group:'JARVIS',key:7,pinned:true,uses:12,last:1400,c:'#00e5ff'},
  {id:8,type:'site',title:'Unity Manual · Rigidbody',sub:'docs.unity3d.com',scope:'ws',ws:'Studio',group:'Unity',uses:22,last:2900,c:'#9c8cff'},
  {id:9,type:'site',title:'GitHub · browser-beta-01',sub:'github.com/wolfpredator-byte',scope:'ws',ws:'Sviluppo',group:'VARCO',uses:45,last:60,c:'#c9d1d9'},
  {id:10,type:'note',title:'Nota · build del raid',sub:'Note di VARCO',scope:'session',ws:'Gaming',group:'Destiny',uses:6,last:30,c:'#ffb648',ctx:'game'},
  {id:11,type:'game',title:'Destiny 2',sub:'Steam',scope:'global',group:'Giochi',uses:70,last:120,c:'#e8e8e8',ctx:'game'},
  {id:12,type:'site',title:'YouTube · guida raid',sub:'youtube.com',scope:'session',ws:'Gaming',group:'Destiny',uses:9,last:15,c:'#ff4e45',ctx:'game'},
  {id:13,type:'file',title:'design-doc.pdf',sub:'C:\\Users\\Documenti\\Unity\\design-doc.pdf',scope:'ws',ws:'Studio',group:'Unity',uses:8,last:9000,c:'#ff6b6b',broken:true},
  {id:14,type:'site',title:'Spotify · playlist gaming',sub:'open.spotify.com',scope:'global',group:'Musica',uses:38,last:45,c:'#1ed760'},
  /* Trovati sul PC (non sono fast link: si possono fissare) */
  {id:20,type:'app',title:'Unity Hub',sub:'App',fast:false,uses:14,last:3000,c:'#d0d0d0'},
  {id:21,type:'app',title:'Visual Studio Code',sub:'App',fast:false,uses:52,last:240,c:'#3fa9f5'},
  {id:22,type:'app',title:'Steam',sub:'App',fast:false,uses:61,last:130,c:'#9fb6d6'},
  {id:23,type:'app',title:'Discord',sub:'App',fast:false,uses:47,last:100,c:'#7b8cff'},
  {id:24,type:'app',title:'OBS Studio',sub:'App',fast:false,uses:5,last:20000,c:'#bbbbbb'},
  {id:25,type:'file',title:'loadout-raid.txt',sub:'C:\\Users\\Documenti\\Destiny\\loadout-raid.txt',fast:false,uses:3,last:800,c:'#ffb648',ctx:'game'},
  {id:26,type:'folder',title:'Screenshot',sub:'C:\\Users\\Immagini\\Screenshot',fast:false,uses:11,last:400,c:'#5fd0a0'},
  {id:27,type:'file',title:'setup-tool.exe',sub:'C:\\Users\\Download\\setup-tool.exe',fast:false,uses:0,last:99999,c:'#ff6b6b',exe:true},
  {id:28,type:'cmd',title:'VARCO · npm test',sub:'C:\\Projects\\browser-beta-01',fast:false,uses:18,last:500,c:'#00e5ff'},
  {id:29,type:'site',title:'Bungie.net · notizie',sub:'bungie.net',fast:false,uses:7,last:2000,c:'#c9d1d9',ctx:'game'},
];
ITEMS.forEach(x=>{if(x.fast===undefined)x.fast=true;});
const BANGS=[['lg','light.gg'],['dim','DIM'],['yt','YouTube'],['gh','GitHub'],['u','Unity Docs'],['g','Google']];

const SCENES={
  game:{label:'Gioco',ctx:'game',ws:'Gaming',who:'Destiny 2 in primo piano'},
  desktop:{label:'Desktop',ctx:'desk',ws:'Sviluppo',who:'Desktop di Windows'},
  varco:{label:'VARCO',ctx:'varco',ws:'Sviluppo',who:'VARCO · Unity Manual – Rigidbody'},
};
const s={open:true,q:'',sel:0,act:0,chip:'all',scene:'game',confirm:null,toast:null,drag:false,first:true,extra:{}};
let V=null,inputEl=null,root=null;

/* Frecenza: uso × quanto di recente (minuti fa). */
const fresh=m=>m<60?4:m<1440?2:m<10080?1:.4;
const frecency=x=>x.uses*fresh(x.last);
const ctx=()=>SCENES[s.scene];
const ctxBoost=x=>(x.ctx&&x.ctx===ctx().ctx?2:1)*(x.ws&&x.ws===ctx().ws?1.5:1);
function score(x,q){
  const t=(x.title+' '+(x.sub||'')+' '+(x.group||'')+' '+TYPES[x.type]).toLowerCase();q=q.toLowerCase();
  let b=0;const ti=x.title.toLowerCase();
  if(ti.startsWith(q))b=100;else if(ti.split(/[\s·.\-]+/).some(w=>w.startsWith(q)))b=80;else if(t.includes(q))b=55;
  else{let i=0;for(const ch of ti)if(ch===q[i])i++;if(i===q.length&&q.length>1)b=25;}
  if(!b)return 0;return b+Math.min(20,Math.log2(1+frecency(x))*2)*ctxBoost(x)+(x.pinned?6:0);
}
const pass=x=>s.chip==='all'||(s.chip==='fast'?x.fast:CHIP_OF[x.type]===s.chip);
function bangOf(q){const m=q.match(/^!(\w+)\s(.*)$/);if(!m)return null;const b=BANGS.find(b=>b[0]===m[1].toLowerCase());return b?{key:b[0],site:b[1],text:m[2]}:null;}

/* Risultati: a vuoto Fissati + Frequenti (+ "aggiungi la pagina" in VARCO); scrivendo una lista con le dinamiche in fondo. */
function results(){
  const q=s.q.trim();
  if(!q){
    const pinned=ITEMS.filter(x=>x.pinned&&x.key).sort((a,b)=>a.key-b.key);
    const frequent=ITEMS.filter(x=>!x.pinned&&pass(x)).sort((a,b)=>frecency(b)*ctxBoost(b)-frecency(a)*ctxBoost(a)).slice(0,6);
    const extra=s.scene==='varco'?[{id:'addpage',type:'create',title:'Aggiungi la pagina corrente',sub:'Unity Manual – Rigidbody',dyn:true}]:[];
    return {empty:true,pinned,frequent,extra,flat:[...pinned,...frequent,...extra]};
  }
  const bang=bangOf(q);
  if(bang)return {empty:false,bang,list:[{id:'bang',type:'search',title:`Cerca «${bang.text||'…'}» su ${bang.site}`,sub:'!'+bang.key,dyn:true,c:'#ffb648'}],flat:null};
  if(/^!\w*$/.test(q)){const l=BANGS.filter(b=>b[0].startsWith(q.slice(1))).map(b=>({id:'b'+b[0],type:'search',title:'!'+b[0]+' · '+b[1],sub:'Scrivi uno spazio e il testo',dyn:true,fill:'!'+b[0]+' '}));return {empty:false,list:l,flat:l};}
  const list=ITEMS.filter(pass).map(x=>[x,score(x,q)]).filter(p=>p[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,12).map(p=>p[0]);
  const dyn=s.chip==='all'||s.chip==='site'||s.chip==='jarvis'?[
    {id:'web',type:'search',title:`Cerca «${q}» sul web`,sub:'Google · in VARCO',dyn:true},
    {id:'ask',type:'jarvis',title:`Chiedi a JARVIS: «${q}»`,sub:'La risposta arriva come notifica',dyn:true},
    {id:'nota',type:'note',title:`Nota veloce: «${q}»`,sub:'Nelle note del workspace '+ctx().ws,dyn:true}]:[];
  return {empty:false,list,dyn,flat:[...list,...dyn]};
}
function flat(){const r=results();return r.flat||r.list;}
function current(){return flat()[s.sel]||null;}

function actions(x){
  if(!x)return [];
  if(x.broken)return ['Cambia percorso','Togli dai fast link'];
  if(x.fill)return ['Usa'];
  const pin=x.dyn?[]:[x.pinned?'Togli dai fissati':'Fissa'];
  const A={site:['Apri in VARCO','Apri nel pannello','Copia link'],companion:['Apri in VARCO','Apri nel pannello','Copia link'],panel:['Apri nel pannello','Apri in una scheda'],
    app:['Avvia','Mostra nella cartella'],game:['Avvia','Apri i companion'],file:x.exe?['Avvia…','Mostra nella cartella']:['Apri','Apri con VS Code','Mostra nella cartella','Copia percorso'],
    folder:['Apri','Apri nel terminale','Copia percorso'],cmd:['Esegui','Apri il progetto','Ferma'],note:['Apri la nota'],jarvis:['Chiedi a JARVIS'],search:['Cerca'],create:['Aggiungi']}[x.type]||['Apri'];
  return [...A,...pin];
}
function toast(msg,sub){s.toast={msg,sub};clearTimeout(toast.t);toast.t=setTimeout(()=>{s.toast=null;draw();},2600);}
function run(x,ai=s.act){
  if(!x)return;const a=actions(x)[ai]||actions(x)[0];
  if(x.fill){s.q=x.fill;inputEl.value=s.q;s.sel=0;draw();return;}
  if(x.exe&&ai===0){s.confirm=x;draw();return;}
  if(a==='Fissa'||a==='Togli dai fissati'){x.pinned=!x.pinned;x.fast=true;if(x.pinned){const used=ITEMS.map(i=>i.pinned&&i.key).filter(Boolean);x.key=[1,2,3,4,5,6,7,8,9].find(k=>!used.includes(k));}else x.key=null;
    toast(x.pinned?`Fissato${x.key?' · tasto '+x.key:''}`:'Tolto dai fissati',x.title);draw();return;}
  if(a.startsWith('Copia')){toast('Copiato',x.sub);draw();return;}
  if(x.id==='addpage'){ITEMS.push({id:99,type:'site',title:'Unity Manual – Rigidbody',sub:'docs.unity3d.com',scope:'ws',ws:'Sviluppo',group:'Unity',uses:1,last:0,c:'#9c8cff',fast:true});toast('Aggiunto ai fast link','Workspace Sviluppo · gruppo Unity');draw();return;}
  x.uses++;x.last=0;
  toast(a+' · '+x.title.replace(/«|»/g,''),x.type==='game'||x.type==='app'?'Il launcher si chiude e torni dov\'eri':'');
  close();
}
function open(){s.open=true;s.first=true;s.q='';s.sel=0;s.act=0;s.confirm=null;if(inputEl)inputEl.value='';draw();}
function close(){s.open=false;s.confirm=null;draw();}

function keyName(e){return (e.ctrlKey?'Ctrl+':'')+(e.altKey?'Alt+':'')+(e.shiftKey?'Shift+':'')+e.key;}
function onKey(e){
  if(e.ctrlKey&&e.altKey&&(e.code==='Space')){e.preventDefault();s.open?close():open();return;}
  if(!s.open)return;
  if(s.confirm){if(e.key==='Enter'){const x=s.confirm;s.confirm=null;x.uses++;toast('Avviato · '+x.title,'Hai confermato tu');close();}else if(e.key==='Escape'){s.confirm=null;draw();}e.preventDefault();return;}
  if(V.keys&&V.keys(e,s)){e.preventDefault();return;}
  const n=flat().length,acts=actions(current()).length;
  if(!s.q&&/^[1-9]$/.test(e.key)&&!e.ctrlKey&&!e.altKey){const x=ITEMS.find(i=>i.pinned&&i.key===+e.key);if(x){e.preventDefault();s.sel=flat().indexOf(x);s.act=0;run(x,0);}return;}
  if(e.key==='ArrowDown'){e.preventDefault();s.sel=(s.sel+1)%Math.max(1,n);s.act=0;draw();}
  else if(e.key==='ArrowUp'){e.preventDefault();s.sel=(s.sel-1+n)%Math.max(1,n);s.act=0;draw();}
  else if(e.key==='Tab'){e.preventDefault();if(acts)s.act=(s.act+(e.shiftKey?-1:1)+acts)%acts;draw();}
  else if(e.key==='Enter'){e.preventDefault();run(current(),e.ctrlKey?1:s.act);}
  else if(e.key==='Escape'){e.preventDefault();if(s.act){s.act=0;draw();}else if(s.q){s.q='';inputEl.value='';s.sel=0;draw();}else close();}
}

/* Barra della demo (fuori dal launcher): sopra cosa, stati, combinazione. */
function demoBar(){
  return `<div class="lx-demo"><span class="t">Sopra:</span>${Object.entries(SCENES).map(([k,v])=>`<button data-scene="${k}" class="${s.scene===k?'on':''}">${v.label}</button>`).join('')}
  <span class="sep"></span><span class="t">Prova:</span><button data-try="">Vuoto</button><button data-try="un">«un»</button><button data-try="!lg ">!lg</button><button data-try="zzz">Nessun risultato</button><button data-try="design">Rotto</button><button data-try="setup">.exe</button>
  <span class="sep"></span><button data-toggle class="hot">${I.kbd}<kbd>Ctrl</kbd><kbd>Alt</kbd><kbd>Spazio</kbd></button></div>`;
}
function scene(){
  const g=s.scene;
  if(g==='game')return `<div class="sc sc-game"><div class="sky"></div><div class="hills"></div><div class="hud-tl"><i></i><i></i><i></i></div><div class="hud-hp"><b style="width:72%"></b></div><div class="hud-ammo">32<small>/ 180</small></div><div class="hud-map"></div><div class="cross"></div></div>`;
  if(g==='desktop')return `<div class="sc sc-desk"><div class="wall"></div><div class="win"><div class="wt">Visual Studio Code — command-center.js</div><div class="code">${Array.from({length:16},(_,i)=>`<i style="width:${20+((i*37)%60)}%;margin-left:${(i%4)*14}px"></i>`).join('')}</div></div><div class="task">${'<i></i>'.repeat(7)}</div></div>`;
  return `<div class="sc sc-varco"><div class="vt"><span class="dot"></span><span class="tab on">Unity Manual – Rigidbody</span><span class="tab">GitHub · browser-beta-01</span><span class="url">docs.unity3d.com/Manual/rigidbody</span></div><div class="vp"><h1>Rigidbody</h1>${Array.from({length:9},(_,i)=>`<i style="width:${55+((i*23)%40)}%"></i>`).join('')}</div></div>`;
}
function overlays(){
  let h='';
  if(s.confirm)h+=`<div class="lx-confirm"><div class="box">${I.warn}<b>Avviare ${esc(s.confirm.title)}?</b><span>È un programma scaricato. Il launcher lo avvia solo se confermi.</span><div class="row"><button class="go" data-cf="1">Avvia <kbd>Invio</kbd></button><button data-cf="0">Annulla <kbd>Esc</kbd></button></div></div></div>`;
  if(s.drag)h+=`<div class="lx-drop">${I.drop}<b>Rilascia per creare un fast link</b><span>File, cartelle o un collegamento · .exe chiede conferma all'avvio</span></div>`;
  return h;
}
function draw(){
  if(!root)return;
  const r=results();if(s.sel>=flat().length)s.sel=Math.max(0,flat().length-1);
  const el=inputEl,focused=s.first||document.activeElement===el,a=el.selectionStart,b=el.selectionEnd;
  root.innerHTML=scene()+(s.open?`<div class="lx-veil ${s.scene}"></div><div class="lx ${s.first?'enter':''}">${V.render(s,r)}</div>`:'')+overlays()+
    (s.toast?`<div class="lx-toast"><b>${esc(s.toast.msg)}</b>${s.toast.sub?`<span>${esc(s.toast.sub)}</span>`:''}</div>`:'')+
    (!s.open?`<div class="lx-closed">Launcher chiuso · premi <kbd>Ctrl</kbd><kbd>Alt</kbd><kbd>Spazio</kbd> per riaprirlo</div>`:'')+demoBar();
  const slot=root.querySelector('#lxSlot');
  if(slot){slot.replaceWith(el);if(focused){el.focus({preventScroll:true});if(!s.first&&a!==null)try{el.setSelectionRange(a,b);}catch{}}}
  if(s.first){s.first=false;setTimeout(()=>root.querySelector('.lx')?.classList.remove('enter'),350);}
  root.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>{s.scene=b.dataset.scene;s.sel=0;open();});
  root.querySelectorAll('[data-try]').forEach(b=>b.onclick=()=>{if(!s.open)open();s.q=b.dataset.try;el.value=s.q;s.sel=0;s.act=0;s.chip='all';draw();el.focus();});
  root.querySelector('[data-toggle]').onclick=()=>s.open?close():open();
  root.querySelectorAll('[data-cf]').forEach(b=>b.onclick=()=>{const x=s.confirm;s.confirm=null;if(b.dataset.cf==='1'){toast('Avviato · '+x.title,'Hai confermato tu');close();}else draw();});
  root.querySelectorAll('[data-chip]').forEach(b=>b.onclick=()=>{s.chip=b.dataset.chip;s.sel=0;draw();el.focus();});
  root.querySelectorAll('[data-i]').forEach(n=>{n.onclick=e=>{s.sel=+n.dataset.i;s.act=0;run(current(),0);};n.onmouseenter=()=>{if(s.sel!==+n.dataset.i){s.sel=+n.dataset.i;s.act=0;draw();}};});
  root.querySelectorAll('[data-a]').forEach(n=>n.onclick=e=>{e.stopPropagation();s.act=+n.dataset.a;run(current());});
  root.querySelector('.lx-veil')?.addEventListener('click',close);
  V.bind&&V.bind(root,s);
}

/* Pezzi che le varianti riusano. */
function icon(x,big){return `<span class="lx-ic${big?' big':''}" style="--c:${x.c||'var(--acc)'}">${x.type==='site'||x.type==='companion'||x.type==='panel'?`<b>${esc((x.title.match(/[A-Za-z0-9]/)||['·'])[0].toUpperCase())}</b>`:(I[x.type]||I.site)}${x.broken?'<i class="bad"></i>':''}</span>`;}
function meta(x){
  if(x.dyn)return '';
  const bits=[TYPES[x.type]];if(x.fast&&x.scope)bits.push(SCOPE[x.scope]+(x.scope==='ws'&&x.ws?' · '+x.ws:''));if(x.group)bits.push(x.group);if(!x.fast)bits.push('sul PC');
  return bits.join(' · ');
}
const ago=m=>m<1?'ora':m<60?m+' min fa':m<1440?Math.round(m/60)+' h fa':Math.round(m/1440)+' g fa';
function chips(){return `<div class="lx-chips">${CHIPS.map(([k,l])=>`<button data-chip="${k}" class="${s.chip===k?'on':''}">${l}</button>`).join('')}</div>`;}
function actbar(x){return actions(x).map((a,j)=>`<button class="lx-act${j===s.act?' on':''}" data-a="${j}">${esc(a)}</button>`).join('');}
function emptyMsg(){return `<div class="lx-none"><b>Niente per «${esc(s.q)}»</b><span>Né fast link, né app, né file. Prova un filtro diverso o premi Invio per cercarlo sul web.</span></div>`;}
const hint=`<span class="lx-hint"><span><kbd>↑</kbd><kbd>↓</kbd> scegli</span><span><kbd>Tab</kbd> azioni</span><span><kbd>Invio</kbd> apri</span><span><kbd>1</kbd>…<kbd>9</kbd> fissati</span><span><kbd>Esc</kbd> torna</span></span>`;

function start(v){
  V=v;root=document.getElementById('app');
  inputEl=document.createElement('input');inputEl.className='lx-input';inputEl.placeholder='Cerca fast link, app, file, siti…  ( ! per le ricerche salvate )';inputEl.autocomplete='off';inputEl.spellcheck=false;
  inputEl.addEventListener('input',()=>{s.q=inputEl.value;s.sel=0;s.act=0;draw();});
  document.addEventListener('keydown',onKey);
  let dc=0;
  addEventListener('dragenter',e=>{e.preventDefault();dc++;if(!s.drag){s.drag=true;draw();}});
  addEventListener('dragleave',()=>{if(--dc<=0){dc=0;s.drag=false;draw();}});
  addEventListener('dragover',e=>e.preventDefault());
  addEventListener('drop',e=>{e.preventDefault();dc=0;s.drag=false;const f=[...(e.dataTransfer.files||[])];
    f.forEach(file=>{const exe=/\.(exe|bat|cmd|ps1|msi)$/i.test(file.name);ITEMS.push({id:1000+ITEMS.length,type:file.type?'file':'file',title:file.name,sub:'Trascinato nel launcher',scope:'global',group:'PC',fast:true,uses:0,last:0,c:exe?'#ff6b6b':'#5fd0a0',exe});});
    toast(f.length?`Fast link creato${f.length>1?' ('+f.length+')':''}`:'Niente da aggiungere',f.map(x=>x.name).join(', '));if(!s.open)open();else draw();});
  const p=new URLSearchParams(location.search);if(p.get('scene'))s.scene=p.get('scene');if(p.get('q')){s.q=p.get('q');inputEl.value=s.q;}
  draw();
}
return {start,s,I,esc,icon,meta,ago,chips,actbar,actions,hint,emptyMsg,results,flat,current,run,draw,close,open,TYPES,SCOPE,WS,SCENES,frecency,ITEMS};
})();
