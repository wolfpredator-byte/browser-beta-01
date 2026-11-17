/* Suggerimenti 0.41 · Round 1 — parte comune: dati di prova, motore vero (suggest-rules.js), tastiera, azioni finte.
   Ogni variante chiama SG.start({render}) e disegna i gruppi come vuole. */
window.SG=(()=>{
const S=window.SuggestRules;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const P=d=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I={
  search:P('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
  globe:P('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/>'),
  app:P('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'),
  download:P('<path d="M12 3v12M7 10l5 5 5-5M4 19h16"/>'),
  folder:P('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  tab:P('<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M8 6V3h8v3"/>'),
  cmd:P('<path d="M5 8l4 4-4 4M12 16h7"/>'),
  jarvis:P('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>'),
  link:P('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  arrow:P('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  panel:P('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>'),
  spark:P('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>'),
  clock:P('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  bolt:P('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
};
const GROUP_IC={addr:'globe',sites:'globe',search:'search',apps:'app',projects:'folder',varco:'tab',jarvis:'jarvis'};
const now=Date.now();

/* Dati di prova (realistici, come il profilo dell'utente). */
const rep=(n,url,title,step=36e5)=>Array.from({length:n},(_,i)=>({url:typeof url==='function'?url(i):url,title:typeof title==='function'?title(i):title,time:now-i*step}));
const CTX={workspace:'Gaming',now,engine:{label:'Google'},
  history:[
    ...rep(9,i=>'https://www.light.gg/db/items/'+(100+i),i=>['Fatebringer','Ace of Spades','Thorn'][i%3]+' - Destiny 2 - light.gg'),
    ...rep(6,i=>'https://www.d2foundry.gg/w/'+i,i=>'D2 Foundry - '+['Fatebringer','Ace','Thorn'][i%3]),
    ...rep(7,'https://www.youtube.com/watch?v=lofi','lofi hip hop radio 📚 - beats to relax/study to - YouTube',5e6),
    ...rep(3,'https://store.epicgames.com/it/free-games','Giochi gratis - Epic Games Store',864e5),
    ...rep(4,'https://github.com/wolfpredator-byte/browser-beta-01','wolfpredator-byte/browser-beta-01 · GitHub',4e6),
    ...rep(2,'https://www.disneyplus.com/it-it/home','Disney+',2e7),
    ...rep(5,i=>'https://www.reddit.com/r/DestinyTheGame/'+i,'r/DestinyTheGame - Reddit',9e6),
  ],
  bookmarks:[{url:'https://app.destinyitemmanager.com/',title:'DIM'},{url:'https://docs.unity3d.com/Manual/',title:'Unity Manual'}],
  fastLinks:[{url:'https://app.destinyitemmanager.com/',title:'DIM',workspace:'Gaming'},{url:'https://www.light.gg/',title:'light.gg',workspace:'Gaming'},{url:'https://claude.ai/new',title:'Claude',workspace:'Sviluppo'}],
  tabs:[{id:1,url:'https://www.youtube.com/watch?v=lofi',title:'lofi hip hop radio - YouTube',workspace:'Gaming'},{id:2,url:'https://github.com/wolfpredator-byte/browser-beta-01/pulls',title:'Pull requests · browser-beta-01',workspace:'Sviluppo'},{id:3,url:'https://docs.unity3d.com/Manual/rigidbody.html',title:'Unity Manual – Rigidbody',workspace:'Studio'}],
  apps:[{name:'Epic Games Launcher',path:'C:\\Program Files (x86)\\Epic Games\\Launcher\\EpicGamesLauncher.exe'},{name:'Spotify',path:'C:\\Users\\nobel\\AppData\\Roaming\\Spotify\\Spotify.exe'},{name:'Steam',path:'C:\\Program Files (x86)\\Steam\\steam.exe'},
    {name:'Destiny 2',path:'D:\\Steam\\steamapps\\common\\Destiny 2\\destiny2.exe',game:true},{name:'Blender 5.3',path:'C:\\Program Files\\Blender\\blender.exe'},{name:'Visual Studio Code',path:'C:\\Users\\nobel\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe'},{name:'Unity Hub',path:'C:\\Program Files\\Unity Hub\\Unity Hub.exe'}],
  projects:[{name:'Destiny Builder',path:'C:\\Projects\\destiny-builder',workspace:'Gaming'},{name:'VARCO',path:'C:\\Projects\\browser-beta-01',workspace:'Sviluppo'},{name:'MyGame',path:'C:\\Projects\\MyGame',workspace:'Studio'}],
  commands:[{id:'zen',title:'Modalità zen',keywords:'focus concentrazione'},{id:'split',title:'Dividi lo schermo',keywords:'affianca split'},{id:'epicpanel',title:'Apri il launcher',keywords:'launcher anello'}],
  choices:{}};

const s={q:'',sel:0,act:0,mode:'home',toast:null};
let ix=S.createIndex(CTX),V=null,res={groups:[]};
const MODES={address:'Barra degli indirizzi',home:'Ricerca della Home'};

function actions(x){
  const site=x.site;
  switch(x.kind){
    case 'site':return ['Apri',...(site&&/Comunicazione|Musica/.test(site.cat)?['Pannello web']:[]),...(site?.search?[`Cerca su ${site.name}…`]:[]),'Nuova scheda'];
    case 'page':return ['Apri','Nuova scheda','Copia link'];
    case 'site-search':case 'web':return ['Cerca'];
    case 'app':return ['Avvia','Mostra nella cartella'];
    case 'get-app':return ['Apri la pagina di download'];
    case 'project':return ['Apri il progetto','Apri la cartella'];
    case 'project-search':return ['Cerca nei progetti'];
    case 'tab':return ['Vai alla scheda'];
    case 'command':return ['Esegui'];
    case 'url':return ['Vai'];
    case 'jarvis':return ['Chiedi a JARVIS'];
  }
  return ['Apri'];
}
const flat=()=>res.groups.flatMap(g=>g.items);
const current=()=>flat()[s.sel]||null;
function run(x,ai=s.act){
  if(!x)return;const a=actions(x)[ai]||actions(x)[0];
  CTX.choices=S.recordChoice(CTX.choices,s.q,x.key);ix=S.createIndex(CTX);
  toast(`${a} · ${x.title}`,`Ricordato per «${s.q}»: la prossima volta sale`);
}
function toast(msg,sub){s.toast={msg,sub};clearTimeout(toast.t);toast.t=setTimeout(()=>{s.toast=null;draw();},2600);draw();}

/* Icona: l'iniziale sul colore del sito (niente loghi), o il simbolo del tipo. */
function icon(x,big){
  const site=x.site;
  if(site)return `<span class="sg-ic${big?' big':''}" style="--c:${site.color||'var(--acc)'}"><b>${esc((site.name.match(/[A-Za-z0-9]/)||['·'])[0].toUpperCase())}</b></span>`;
  const k={'site-search':'search',web:'search',app:'app','get-app':'download',project:'folder','project-search':'search',tab:'tab',command:'cmd',url:'globe',jarvis:'jarvis',page:'link'}[x.kind]||'globe';
  return `<span class="sg-ic${big?' big':''}">${I[k]}</span>`;
}
function badges(x){return (x.badges||[]).filter(Boolean).slice(0,3).map(b=>`<span class="sg-badge">${esc(b)}</span>`).join('');}
function chips(x,max=4){return x.site?.urls?.length?`<span class="sg-chips">${x.site.urls.slice(0,max).map(u=>`<span class="sg-chip">${esc(u.label)}</span>`).join('')}</span>`:'';}
function actbar(x){return actions(x).map((a,j)=>`<button class="sg-act${j===s.act?' on':''}" data-a="${j}">${esc(a)}</button>`).join('');}

function shell(inner){
  /* Cornice di VARCO finta: barra degli indirizzi in alto; Home con la ricerca; oppure il launcher sopra il desktop. */
  const input=`<span id="sgSlot"></span>`;
  if(s.mode==='launcher')return `<div class="fake-desk"></div><div class="veil"></div><div class="ln-wrap"><div class="ln-ring"><div class="ln-core"><span class="ln-name">${I.bolt} Fast launcher</span>${input}</div></div><div class="ln-fan">${inner}</div></div>`;
  return `<div class="frame"><div class="tabs"><span class="dot"></span><span class="t on">Home · Gaming</span><span class="t">light.gg</span><span class="t">YouTube</span></div>
    <div class="nav">${s.mode==='address'?`<div class="addr on">${I.search}${input}</div>`:`<div class="addr">${I.search}<span class="ph">Cerca o scrivi un indirizzo</span></div>`}</div>
    <div class="home">${s.mode==='home'?`<div class="greet">Buonasera · Gaming</div><div class="hsearch">${I.search}${input}</div>${inner?`<div class="dd at-home">${inner}</div>`:''}`:'<div class="greet dim">Buonasera · Gaming</div><div class="hsearch dim">'+I.search+'<span class="ph">Cerca sul web o in VARCO</span></div>'}
    ${s.mode==='home'&&inner?'':`<div class="cards">${'<i></i>'.repeat(6)}</div>`}</div>
    ${inner&&s.mode==='address'?`<div class="dd address">${inner}</div>`:''}</div>`;
}
function demoBar(){
  return `<div class="sg-demo"><span class="t">Dove:</span>${Object.entries(MODES).map(([k,v])=>`<button data-mode="${k}" class="${s.mode===k?'on':''}">${v}</button>`).join('')}
  <span class="sep"></span><span class="t">Prova:</span>${['epic','egs','epic game store','youtube lofi','lofi su youtube','spotify','light','destiny','foundry','github.com/wolf','come si fa il risotto?','zzqqx'].map(q=>`<button data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>`;
}

let inputEl,root;
function draw(){
  res=s.q.trim()?ix.query(s.q,{mode:s.mode==='launcher'?'launcher':s.mode}):{groups:[]};
  if(V.filter)res={...res,groups:V.filter(res.groups,s)};
  const n=flat().length;if(s.sel>=n)s.sel=Math.max(0,n-1);
  const el=inputEl,a=el.selectionStart,b=el.selectionEnd;
  const inner=s.q.trim()?V.render(res,s):'';
  root.innerHTML=shell(inner)+(s.toast?`<div class="sg-toast"><b>${esc(s.toast.msg)}</b><span>${esc(s.toast.sub)}</span></div>`:'')+demoBar();
  root.querySelector('#sgSlot').replaceWith(el);el.focus({preventScroll:true});try{el.setSelectionRange(a,b);}catch{}
  root.querySelectorAll('[data-mode]').forEach(x=>x.onclick=()=>{s.mode=x.dataset.mode;s.sel=0;draw();});
  root.querySelectorAll('[data-q]').forEach(x=>x.onclick=()=>{s.q=x.dataset.q;el.value=s.q;s.sel=0;s.act=0;draw();});
  root.querySelectorAll('[data-i]').forEach(x=>{x.onclick=()=>{s.sel=+x.dataset.i;s.act=0;run(current(),0);};x.onmousemove=()=>{if(s.sel!==+x.dataset.i){s.sel=+x.dataset.i;s.act=0;draw();}};});
  root.querySelectorAll('[data-a]').forEach(x=>x.onclick=e=>{e.stopPropagation();s.act=+x.dataset.a;run(current());});
  V.bind&&V.bind(root,s);
}
function start(v){
  V=v;root=document.getElementById('app');
  inputEl=document.createElement('input');inputEl.className='sg-input';inputEl.placeholder='Prova: epic, egs, youtube lofi…';inputEl.spellcheck=false;inputEl.autocomplete='off';
  inputEl.addEventListener('input',()=>{s.q=inputEl.value;s.sel=0;s.act=0;draw();});
  document.addEventListener('keydown',e=>{
    const n=flat().length,acts=actions(current()).length;
    if(e.key==='ArrowDown'){e.preventDefault();s.sel=(s.sel+1)%Math.max(1,n);s.act=0;draw();}
    else if(e.key==='ArrowUp'){e.preventDefault();s.sel=(s.sel-1+n)%Math.max(1,n);s.act=0;draw();}
    else if(e.key==='Tab'){e.preventDefault();if(acts)s.act=(s.act+(e.shiftKey?-1:1)+acts)%acts;draw();}
    else if(e.key==='Enter'){e.preventDefault();run(current(),e.ctrlKey?1:s.act);}
    else if(e.key==='Escape'){e.preventDefault();if(s.act){s.act=0;}else{s.q='';inputEl.value='';}draw();}
  });
  const p=new URLSearchParams(location.search);if(MODES[p.get('mode')])s.mode=p.get('mode');s.q=p.get('q')||'epic';inputEl.value=s.q;
  draw();
}
return {start,s,I,GROUP_IC,esc,icon,badges,chips,actbar,actions,flat,current,CTX};
})();
