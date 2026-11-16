/* Command center — motore comune agli esempi del round 1.
   Dati finti ma realistici, ricerca, sezioni, azioni, tastiera, anteprime, stati.
   Ogni variante disegna solo la sua struttura con CC.groups() / CC.flat() / CC.preview(). */
window.CC=(()=>{
const ACTIVE='Sviluppo';
const WS={Sviluppo:'#00e5ff',Gaming:'#ffb648',Studio:'#9c8cff'};

/* ── Icone (tratto 1.8 come VARCO) ── */
const S=d=>`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const I={
  search:S('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
  bolt:S('<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>'),
  tabs:S('<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10h18M8 6V4h8v2"/>'),
  folder:S('<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2h8.5A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/>'),
  file:S('<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/>'),
  server:S('<rect x="4" y="4" width="16" height="7" rx="1.5"/><rect x="4" y="13" width="16" height="7" rx="1.5"/><path d="M8 7.5h.01M8 16.5h.01"/>'),
  cmd:S('<path d="M5 7l5 5-5 5M12 18h7"/>'),
  link:S('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  pin:S('<path d="M9 4h6l-1 6 4 3v2H6v-2l4-3z"/><path d="M12 15v6"/>'),
  globe:S('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.4-3.6-8.5S9.5 6.1 12 3.5z"/>'),
  spark:S('<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/><path d="M18.5 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>'),
  plus:S('<path d="M12 5v14M5 12h14"/>'),
  note:S('<path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4M8 9h8M8 13h5"/>'),
  task:S('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>'),
  ws:S('<rect x="3" y="4" width="8" height="7" rx="1.5"/><rect x="13" y="4" width="8" height="7" rx="1.5"/><rect x="3" y="13" width="8" height="7" rx="1.5"/><rect x="13" y="13" width="8" height="7" rx="1.5"/>'),
  session:S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  prompt:S('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>'),
  chev:S('<path d="M9 6l6 6-6 6"/>'),
  down:S('<path d="M6 9l6 6 6-6"/>'),
  enter:S('<path d="M19 6v5a3 3 0 0 1-3 3H6"/><path d="M9.5 10.5L6 14l3.5 3.5"/>'),
  git:S('<circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="9" r="2"/><path d="M6 8v8M18 11c0 3-4 3-6 3H8"/>'),
  mic:S('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>'),
  close:S('<path d="M6 6l12 12M18 6L6 18"/>'),
};

/* ── Dati ── */
const commits=[
  ['74ccd4e','2 h fa','Impostazioni di nuovo funzionanti con estensioni installate'],
  ['1b30518','2 h fa','Estensioni: permessi corretti, accesso ai siti, installazione da .crx'],
  ['5418aa9','3 h fa','Verifiche anti-bot: un\'identità sola anche nei riquadri'],
  ['a3ddcd1','13 h fa','Lettore in stile 4b, barra minima con una copertina per sorgente'],
];
const SITES={ // miniature disegnate: colori del sito (niente loghi)
  unity:{bg:'#ffffff',bar:'#222c37',acc:'#2196f3',dark:false,l:'U'},
  d2:{bg:'#14161c',bar:'#0b0c10',acc:'#e3b04b',dark:true,l:'D'},
  gh:{bg:'#0d1117',bar:'#161b22',acc:'#2f81f7',dark:true,l:'G'},
  yt:{bg:'#0f0f0f',bar:'#0f0f0f',acc:'#ff3d3d',dark:true,l:'Y'},
  sp:{bg:'#121212',bar:'#000',acc:'#1ed760',dark:true,l:'S'},
  mdn:{bg:'#ffffff',bar:'#1b1b1b',acc:'#0069c2',dark:false,l:'M'},
  local:{bg:'#0b0d12',bar:'#0b0d12',acc:'#00e5ff',dark:true,l:'V'},
  g:{bg:'#ffffff',bar:'#ffffff',acc:'#4285f4',dark:false,l:'G'},
  notion:{bg:'#ffffff',bar:'#f7f6f3',acc:'#37352f',dark:false,l:'N'},
};
const A={ // azioni per tipo: la prima è la principale (Invio)
  tab:['Vai alla scheda','Affianca','Sposta in un workspace','Chiudi'],
  tabOther:['Vai (cambia workspace)','Porta qui','Affianca','Chiudi'],
  site:['Apri','In una nuova scheda','Affianca','Aggiungi ai fast link','Copia il link'],
  project:['Apri il progetto','Avvia il dev server','Apri la cartella','Apri in VS Code'],
  folder:['Apri nel visualizzatore','Mostra in Esplora file','Copia il percorso'],
  file:['Apri','Apri in VS Code','Mostra nella cartella','Copia il percorso'],
  server:['Avvia','Apri l\'anteprima','Mostra i log','Ferma'],
  serverOn:['Apri l\'anteprima','Riavvia','Mostra i log','Ferma'],
  command:['Esegui','Fissa in Apri subito','Assegna una scorciatoia'],
  link:['Apri','Nuova scheda','Togli dai fissati','Sposta nel gruppo…','Scorciatoia'],
  linkUnpinned:['Apri','Nuova scheda','Fissa','Sposta nel gruppo…','Scorciatoia'],
  web:['Cerca su Google','In una nuova scheda','Chiedi a Jarvis'],
  jarvis:['Chiedi','Chiedi a voce','Apri JARVIS'],
  jsum:['Riassumi','Riassumi e salva nelle note','Copia il riassunto'],
  jsave:['Salva nel progetto','Salva con una nota','Scegli il progetto…'],
  create:['Crea','Crea e apri'],
};
let uid=0;
const it=(sec,kind,title,sub,o={})=>({id:++uid,sec,kind,title,sub,ws:o.ws||ACTIVE,actions:A[o.act||kind],...o});

const BASE=[
  // Schede aperte
  it('tabs','tab','Unity Documentation – Scripting API: Rigidbody','docs.unity3d.com',{site:'unity',ws:'Studio',age:'aperta da 2 h',act:'tabOther',kw:'unity manuale fisica'}),
  it('tabs','tab','Destiny 2 Build Editor','d2buildeditor.app',{site:'d2',ws:'Gaming',age:'in riproduzione audio',act:'tabOther',kw:'destiny build armi'}),
  it('tabs','tab','browser-beta-01 · Pull request #41','github.com/wolfpredator-byte',{site:'gh',age:'attiva 5 min fa',kw:'github pr'}),
  it('tabs','tab','VARCO — anteprima locale','localhost:5173',{site:'local',age:'dev server attivo',kw:'anteprima dev'}),
  it('tabs','tab','Electron · WebContentsView','electronjs.org/docs/latest/api',{site:'mdn',age:'aperta da 40 min',kw:'electron docs'}),
  it('tabs','tab','MDN · CSS backdrop-filter','developer.mozilla.org',{site:'mdn',age:'ieri',kw:'css blur'}),
  it('tabs','tab','light.gg — Ergo Sum','light.gg/db/items',{site:'d2',ws:'Gaming',age:'aperta da 1 h',act:'tabOther',kw:'destiny arma'}),
  it('tabs','tab','Lofi beats · YouTube','youtube.com',{site:'yt',ws:'Gaming',age:'in pausa',act:'tabOther',kw:'musica'}),
  it('tabs','tab','Unity Learn — Pathways','learn.unity.com',{site:'unity',ws:'Studio',age:'aperta da 3 h',act:'tabOther',kw:'unity corso'}),
  // Progetti, cartelle, file, dev server
  it('projects','project','VARCO · browser-beta-01','C:\\Projects\\personal-browser-beta-0.1\\browser-beta-01',{branch:'beta-0.38',kw:'browser electron'}),
  it('projects','server','npm start · dev server','VARCO · porta 5173',{act:'serverOn',on:true,kw:'avvia anteprima'}),
  it('projects','folder','lib/','VARCO · 64 file',{path:'browser-beta-01\\lib',kw:'sorgenti'}),
  it('projects','file','palette.cjs','VARCO · lib/palette.cjs',{path:'browser-beta-01\\lib\\palette.cjs',size:'6 KB',mod:'oggi 10:12',kw:'command center'}),
  it('projects','folder','design/explore/','VARCO · esempi interattivi',{path:'browser-beta-01\\design\\explore',kw:'design'}),
  it('projects','project','Orbit · gioco Unity','D:\\Unity\\Orbit',{ws:'Studio',branch:'main',kw:'unity gioco',commits:[['c19a2e0','ieri','Fisica dei satelliti con Rigidbody'],['8f02b11','3 g fa','Menu principale']]}),
  it('projects','server','Unity · build WebGL','Orbit · non avviato',{ws:'Studio',act:'server',kw:'build'}),
  // Fast link
  it('links','link','GitHub · Issues','github.com/…/issues',{site:'gh',pinned:true,group:'Sviluppo',key:'Alt+1'}),
  it('links','link','Electron docs','electronjs.org/docs',{site:'mdn',pinned:true,group:'Sviluppo',key:'Alt+2'}),
  it('links','link','Destiny 2 Build Editor','d2buildeditor.app',{site:'d2',ws:'Gaming',pinned:true,group:'Destiny',key:'Alt+3'}),
  it('links','link','Unity Manual','docs.unity3d.com/Manual',{site:'unity',ws:'Studio',pinned:true,group:'Unity'}),
  it('links','link','Notion · Roadmap VARCO','notion.so',{site:'notion',group:'Sviluppo',act:'linkUnpinned'}),
  it('links','link','Spotify · Focus','open.spotify.com',{site:'sp',group:'Musica',act:'linkUnpinned'}),
  // Comandi
  it('commands','command','Nuova scheda','',{key:'Ctrl+T',kw:'home'}),
  it('commands','command','Riapri l\'ultima scheda chiusa','',{key:'Ctrl+Shift+T'}),
  it('commands','command','Screenshot della pagina','',{key:'Ctrl+Shift+S',kw:'cattura'}),
  it('commands','command','Modalità zen','',{key:'F11',kw:'focus schermo intero'}),
  it('commands','command','Raggruppa le schede per sito','',{kw:'stack'}),
  it('commands','command','Lettore multimediale','',{kw:'musica spotify'}),
  it('commands','command','Impostazioni','',{key:'Ctrl+,'}),
  it('commands','command','Strumenti per sviluppatori','',{key:'F12',kw:'devtools console'}),
  it('commands','command','Chiudi le schede doppie','',{kw:'duplicati'}),
  it('commands','command','Salva la disposizione delle finestre','',{kw:'monitor layout'}),
  // Crea
  it('create','create','Nota','nel workspace Sviluppo',{icon:'note'}),
  it('create','create','Task','nella lista del progetto',{icon:'task'}),
  it('create','create','Fast link','dalla scheda attiva',{icon:'link'}),
  it('create','create','Workspace','vuoto o dalle schede scelte',{icon:'ws'}),
  it('create','create','Sessione','salva le schede aperte',{icon:'session'}),
  it('create','create','Prompt','per Jarvis, riutilizzabile',{icon:'prompt'}),
  // Jarvis
  it('jarvis','jarvis','Chiedi a Jarvis','scrivi o parla',{icon:'spark'}),
  it('jarvis','jsum','Riassumi la pagina','Unity Documentation – Rigidbody',{icon:'note'}),
  it('jarvis','jsave','Salva nel progetto','la pagina va in «Orbit · gioco Unity»',{icon:'folder'}),
];
// Apri subito (vuoto): ciò che ti serve adesso nel workspace attivo
const NOW_IDS=()=>[BASE.find(x=>x.kind==='server'),BASE.find(x=>x.title.startsWith('browser-beta-01 ·')),BASE.find(x=>x.kind==='project'),BASE.find(x=>x.title==='GitHub · Issues'),BASE.find(x=>x.title.startsWith('Electron ·'))];

const SEC=[
  {id:'now',title:'Apri subito',icon:'bolt'},
  {id:'tabs',title:'Schede',icon:'tabs',prefix:'@'},
  {id:'projects',title:'Progetti',icon:'folder',prefix:'#'},
  {id:'links',title:'Fast link',icon:'pin',prefix:'/'},
  {id:'commands',title:'Comandi',icon:'cmd',prefix:'>'},
  {id:'web',title:'Web',icon:'globe',prefix:'g '},
  {id:'jarvis',title:'Jarvis',icon:'spark',prefix:'?'},
  {id:'create',title:'Crea',icon:'plus',prefix:'+'},
];
const SCOPES=[['all','Ovunque'],['ws','Questo workspace'],['tabs','Schede'],['projects','Progetti'],['links','Fast link'],['commands','Comandi'],['web','Web'],['jarvis','Jarvis']];

/* ── Stato ── */
const m={q:'',scope:'all',state:'normal',collapsed:new Set(),expanded:new Set(),sel:0,act:0,hover:null,open:true,jarvisOff:false};
let renderFn=()=>{};
const listeners=[];

const LONG=s=>s+' — versione estesa con un titolo lunghissimo che non entra nella riga e deve essere tagliato bene';
function data(){
  let d=BASE;
  if(m.state==='long')d=d.map(x=>x.sec==='tabs'||x.sec==='links'?{...x,title:LONG(x.title)}:x);
  if(m.state==='many'){
    const extra=[];const sites=[['unity','Unity Documentation – ','docs.unity3d.com','Studio'],['gh','GitHub · ','github.com',ACTIVE],['d2','light.gg — ','light.gg','Gaming'],['mdn','MDN · ','developer.mozilla.org',ACTIVE]];
    const words=['Transform','Coroutine','Issue #'+0,'Raycast','Animator','Prefab','Vector3','ScriptableObject','Input System','NavMesh'];
    for(let i=0;i<120;i++){const s=sites[i%4];extra.push(it('tabs','tab',s[1]+words[i%10]+' '+(i+1),s[2],{site:s[0],ws:s[3],age:'aperta da '+(i%9+1)+' h',act:s[3]===ACTIVE?'tab':'tabOther'}));}
    d=d.concat(extra);
  }
  return d;
}
function score(x,q){
  if(!q)return 1;
  const hay=(x.title+' '+(x.sub||'')+' '+(x.kw||'')+' '+(x.group||'')).toLowerCase();
  const t=x.title.toLowerCase();
  if(t.startsWith(q))return 100;
  if(t.split(/[\s·—–\-/]+/).some(w=>w.startsWith(q)))return 80;
  if(hay.includes(q))return 60;
  let i=0;for(const c of hay){if(c===q[i])i++;if(i===q.length)return 25;}
  return 0;
}
function parse(){
  let q=m.q.trim(),forced=null;
  for(const s of SEC)if(s.prefix&&q.toLowerCase().startsWith(s.prefix)){forced=s.id;q=q.slice(s.prefix.length).trim();break;}
  return {q:q.toLowerCase(),raw:q,forced};
}
const wsFirst=(a,b)=>(a.ws!==ACTIVE)-(b.ws!==ACTIVE);
function groups(){
  if(m.state==='none')return [];
  const {q,raw,forced}=parse();
  const scope=forced||m.scope;
  const only=id=>scope==='all'||scope==='ws'||scope===id;
  const all=data().filter(x=>scope!=='ws'||x.ws===ACTIVE||x.sec==='create'||x.sec==='jarvis'||x.sec==='commands');
  const out=[];
  const push=(id,items,extra={})=>{
    if(!items.length)return;
    const s=SEC.find(s=>s.id===id);
    const limit=m.expanded.has(id)?999:(q?(id==='now'?3:5):(id==='tabs'||id==='commands'?5:6));
    const split=items.findIndex(x=>x.ws!==ACTIVE);
    out.push({...s,items,shown:items.slice(0,limit),more:Math.max(0,items.length-limit),split:split>0&&split<limit?split:-1,collapsed:m.collapsed.has(id),...extra});
  };
  const jarvisItems=sec=>m.jarvisOff?sec.map(x=>({...x,off:true,sub:'Jarvis non è avviato · Invio per avviarlo',actions:['Avvia JARVIS']})):sec;
  if(!q&&!m.q.trim().length){ // vuoto
    const nowSet=new Set(NOW_IDS().map(x=>x.id));
    if(only('now'))push('now',NOW_IDS());
    for(const id of ['tabs','projects','links','commands','create','jarvis'])if(only(id)){
      let items=all.filter(x=>x.sec===id&&(!only('now')||!nowSet.has(x.id)));
      if(id==='links')items=items.filter(x=>x.pinned);
      items=items.slice().sort(wsFirst);
      if(id==='jarvis')items=jarvisItems(items);
      push(id,items);
    }
    return out;
  }
  const scored=all.map(x=>({x,s:score(x,q)})).filter(o=>o.s>0);
  const bySec=id=>scored.filter(o=>o.x.sec===id).sort((a,b)=>(b.s+(b.x.ws===ACTIVE?15:0))-(a.s+(a.x.ws===ACTIVE?15:0))).map(o=>o.x);
  if(only('now')&&!forced){
    const best=scored.filter(o=>!['create','jarvis','commands'].includes(o.x.sec)&&o.s>=60).sort((a,b)=>(b.s+(b.x.ws===ACTIVE?15:0))-(a.s+(a.x.ws===ACTIVE?15:0))).slice(0,3).map(o=>o.x);
    push('now',best);
  }
  const nowIds=new Set((out[0]?.id==='now'?out[0].items:[]).map(x=>x.id));
  for(const id of ['tabs','projects','links','commands'])if(only(id))push(id,bySec(id).filter(x=>!nowIds.has(x.id)).sort(wsFirst));
  if(only('web')&&raw)push('web',webSuggest(raw));
  if(only('jarvis')&&raw)push('jarvis',jarvisItems([
    it('jarvis','jarvis',`Chiedi a Jarvis: «${raw}»`,'risponde qui, senza cambiare pagina',{icon:'spark'}),
    ...bySec('jarvis').filter(x=>x.kind!=='jarvis')]));
  if(only('create')&&raw)push('create',[
    it('create','create',`Nota «${raw}»`,'nel workspace Sviluppo',{icon:'note'}),
    it('create','create',`Task «${raw}»`,'nel progetto VARCO',{icon:'task'}),
    it('create','create',`Prompt «${raw}»`,'per Jarvis',{icon:'prompt'}),
    ...bySec('create').filter(x=>!/«/.test(x.title)).slice(0,3)]);
  // Sembra una domanda: Jarvis passa in cima.
  if(/\?$|^(come|cosa|perch|quanto|quale|quali|dove|chi|spiega|riassumi)\s/i.test(raw)){const j=out.findIndex(g=>g.id==='jarvis');if(j>0)out.unshift(...out.splice(j,1));}
  return out;
}
function webSuggest(raw){
  const tail=['',' build',' guida',' 2026',' reddit'];
  const extra=/unity/i.test(raw)?[' rigidbody',' coroutine']:/destiny|d2/i.test(raw)?[' build titan',' god roll']:[' significato',' esempi'];
  return [...new Set([...tail,...extra])].slice(0,5).map((t,i)=>it('web','web',i?raw+t:`Cerca «${raw}» su Google`,i?'suggerimento di Google':'google.com',{site:'g',icon:'search'}));
}
function flat(){
  const r=[];for(const g of groups())if(!g.collapsed)for(const x of g.shown)r.push({...x,group:g.id});return r;
}
function current(){const f=flat();return f[Math.min(m.sel,f.length-1)]||null;}

/* ── Azioni ── */
function run(x,ai=m.act){
  if(!x)return;
  const label=(x.actions||['Apri'])[ai]||x.actions[0];
  toast(`<b>${label}</b> · ${esc(x.title)}`);
}
let toastT;
function toast(html){const t=document.getElementById('cc-toast');if(!t)return;t.innerHTML=html;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,1800);}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ── Icone e anteprime ── */
function icon(x,cls='cc-ico'){
  if(x.site&&x.kind!=='web'){const s=SITES[x.site];return `<span class="${cls} site" style="--sb:${s.bar};--sa:${s.acc}">${s.l}</span>`;}
  const k=x.icon||{tab:'tabs',project:'folder',server:'server',folder:'folder',file:'file',command:'cmd',link:'link',web:'search'}[x.kind]||'cmd';
  return `<span class="${cls} glyph${x.kind==='server'&&x.on?' live':''}">${I[k]}</span>`;
}
function thumb(site,title){
  const s=SITES[site]||SITES.local,fg=s.dark?'rgba(255,255,255,.16)':'rgba(0,0,0,.1)';
  return `<div class="cc-thumb" style="background:${s.bg}"><div class="t-bar" style="background:${s.bar}"><i style="background:${s.acc}"></i><span style="background:${fg}"></span></div>
   <div class="t-body"><b style="color:${s.dark?'#fff':'#111'}">${esc(title.split(/[–—·|]/)[0].trim())}</b>
   <span style="background:${fg};width:86%"></span><span style="background:${fg};width:70%"></span><span style="background:${s.acc};opacity:.7;width:32%"></span><span style="background:${fg};width:78%"></span></div></div>`;
}
function preview(x){
  if(!x)return '';
  const wsTag=`<span class="cc-ws" style="--w:${WS[x.ws]||'#888'}">${x.ws}</span>`;
  if(x.kind==='tab'||x.kind==='link'||x.kind==='web')
    return `${x.kind==='web'?'':thumb(x.site,x.title)}<div class="cc-pv-meta"><b>${esc(x.title)}</b><span>${esc(x.sub)}</span>
      <span class="row">${wsTag}${x.age?`<em>${x.age}</em>`:''}${x.group?`<em>gruppo ${x.group}</em>`:''}${x.key?`<kbd>${x.key}</kbd>`:''}</span></div>`;
  if(x.kind==='project'){const c=x.commits||commits;
    return `<div class="cc-pv-meta"><b>${esc(x.title)}</b><code>${esc(x.sub)}</code><span class="row">${wsTag}<em>${I.git} ${x.branch}</em></span></div>
      <div class="cc-pv-h">Ultime modifiche</div><ul class="cc-commits">${c.slice(0,4).map(([h,t,s])=>`<li><code>${h}</code><span>${esc(s)}</span><em>${t}</em></li>`).join('')}</ul>`;}
  if(x.kind==='file'||x.kind==='folder')
    return `<div class="cc-pv-meta"><b>${esc(x.title)}</b><code>${esc(x.path)}</code><span class="row">${wsTag}${x.size?`<em>${x.size}</em>`:''}${x.mod?`<em>modificato ${x.mod}</em>`:''}</span></div>
      ${x.kind==='file'?`<pre class="cc-code"><i>/** Palette dei comandi (Beta 0.11) … */</i>\nconst {state}=require('./state.cjs');\nconst windows=require('./windows.cjs');\n\nconst COMMANDS=[\n  ['Nuova scheda','newTab',{},'Ctrl+T'],</pre>`:
      `<ul class="cc-files"><li>${I.file}palette.cjs</li><li>${I.file}media-overlay.cjs</li><li>${I.file}extensions.cjs</li><li>${I.file}… altri 61</li></ul>`}`;
  if(x.kind==='server')return `<div class="cc-pv-meta"><b>${esc(x.title)}</b><span>${esc(x.sub)}</span><span class="row">${wsTag}<em>${x.on?'● attivo da 25 min':'○ fermo'}</em></span></div>
      ${x.on?`<pre class="cc-code">  VITE ready in 412 ms\n  ➜  Local:   http://localhost:5173/\n  page reload lib/palette.cjs</pre>`:''}`;
  if(x.kind==='command')return `<div class="cc-pv-meta"><b>${esc(x.title)}</b><span>Comando di VARCO</span><span class="row">${x.key?`<kbd>${x.key}</kbd>`:'<em>nessuna scorciatoia</em>'}</span></div>`;
  return `<div class="cc-pv-meta"><b>${esc(x.title)}</b><span>${esc(x.sub||'')}</span></div>`;
}

/* ── Cornice finta di VARCO ── */
function frame(){
  const root=document.createElement('div');root.className='vf';
  root.innerHTML=`
  <div class="vf-top"><span>VARCO</span><span class="vf-beta">BETA 0.38</span><div class="vf-win"><i></i><i></i><i></i></div></div>
  <div class="vf-nav"><span class="vf-btn"></span><span class="vf-btn"></span><span class="vf-btn"></span><div class="vf-addr">docs.unity3d.com/ScriptReference/Rigidbody.html</div></div>
  <div class="vf-body"><aside class="vf-side">${'<span></span>'.repeat(9)}</aside>
    <section class="vf-page"><div class="vf-page-in"><h2>Rigidbody</h2>${'<p></p>'.repeat(10)}</div></section></div>
  <footer class="vf-bar"><span class="vf-ws">Sviluppo</span>
    <span class="vf-tab active">Unity Documentation</span><span class="vf-tab">GitHub · PR #41</span><span class="vf-tab">VARCO — anteprima</span>
    <span class="vf-spacer"></span><span class="vf-clock">21:47<small>Dom 16 nov</small></span></footer>
  <div id="cc-root"></div>
  <div class="vf-toast" id="cc-toast" hidden></div>
  <div class="cc-reopen" id="cc-reopen" hidden>Command center chiuso · premi <kbd>F1</kbd> o clicca qui</div>`;
  document.body.prepend(root);
  const bar=document.createElement('div');bar.className='vf-states';
  bar.innerHTML='<b>Stato</b>'+[['normal','Normale'],['none','Nessun risultato'],['many','Molte schede (120)'],['long','Titoli lunghi'],['joff','Jarvis spento']].map(([k,l])=>`<button data-s="${k}">${l}</button>`).join('')+'<i class="sep"></i><b>Prova</b><button data-q="unity">unity</button><button data-q="d2">d2</button><button data-q="> zen">&gt; zen</button><button data-q="? come uso Rigidbody">? domanda</button>';
  document.body.append(bar);
  bar.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.s){const s=b.dataset.s;if(s==='joff'){m.jarvisOff=!m.jarvisOff;}else{m.state=s;m.jarvisOff=false;}m.open=true;}
    if(b.dataset.q){m.q=b.dataset.q;m.open=true;m.state=m.state==='none'?'normal':m.state;}
    m.sel=0;m.act=0;update();setTimeout(()=>document.querySelector('.cc-input')?.focus());});
  document.getElementById('cc-reopen').onclick=()=>{m.open=true;update();};
  const sync=()=>bar.querySelectorAll('[data-s]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.s==='joff'?m.jarvisOff:b.dataset.s===m.state));
  listeners.push(sync);
}

/* ── Tastiera ── */
function keys(opts={}){
  document.addEventListener('keydown',e=>{
    if(e.key==='F1'||(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='p')){e.preventDefault();m.open=true;update();setTimeout(()=>document.querySelector('.cc-input')?.focus());return;}
    if(!m.open)return;
    const f=flat(),x=f[m.sel];
    const n=x?.actions?.length||1;
    if(opts.custom&&opts.custom(e,x,f)===true)return;
    if(e.key==='ArrowDown'&&!e.altKey){e.preventDefault();m.sel=Math.min(f.length-1,m.sel+1);m.act=0;update();}
    else if(e.key==='ArrowUp'&&!e.altKey){e.preventDefault();m.sel=Math.max(0,m.sel-1);m.act=0;update();}
    else if(e.altKey&&(e.key==='ArrowDown'||e.key==='ArrowUp')){e.preventDefault();jumpSection(e.key==='ArrowDown'?1:-1);}
    else if(e.key==='Tab'){e.preventDefault();m.act=(m.act+(e.shiftKey?-1:1)+n)%n;update();}
    else if(e.key==='ArrowRight'&&(opts.lr!==false)&&caretAtEnd()){e.preventDefault();m.act=Math.min(n-1,m.act+1);update();}
    else if(e.key==='ArrowLeft'&&(opts.lr!==false)&&m.act>0){e.preventDefault();m.act--;update();}
    else if(e.key==='Enter'){e.preventDefault();run(x,e.ctrlKey?1:m.act);}
    else if(e.key==='Escape'){e.preventDefault();if(m.act){m.act=0;update();}else if(m.q){setQ('');}else{m.open=false;update();}}
  });
}
const caretAtEnd=()=>{const i=document.querySelector('.cc-input');return !i||document.activeElement!==i||i.selectionStart===i.value.length;};
function jumpSection(dir){
  const f=flat();if(!f.length)return;
  const cur=f[m.sel]?.group;let i=m.sel;
  if(dir>0){while(i<f.length&&f[i].group===cur)i++;if(i>=f.length)i=0;}
  else{while(i>0&&f[i-1].group===cur)i--;if(i===0){i=f.length-1;}else{i--;const g=f[i].group;while(i>0&&f[i-1].group===g)i--;}}
  m.sel=i;m.act=0;update();
}
function setQ(q){m.q=q;m.sel=0;m.act=0;update();}
function toggle(id){m.collapsed.has(id)?m.collapsed.delete(id):m.collapsed.add(id);update();}
function expand(id){m.expanded.has(id)?m.expanded.delete(id):m.expanded.add(id);update();}
function select(id){const i=flat().findIndex(x=>x.id===id);if(i>=0&&i!==m.sel){m.sel=i;m.act=0;update();}}
let hoverT;
function hover(x){clearTimeout(hoverT);hoverT=setTimeout(()=>{if(m.hover?.id!==x?.id){m.hover=x;update();}},x?160:60);}
function update(){
  const rr=document.getElementById('cc-root');
  document.body.classList.toggle('cc-open',m.open);
  document.getElementById('cc-reopen').hidden=m.open;
  rr.hidden=!m.open;
  if(m.open){const had=document.activeElement===inputEl||!document.activeElement||document.activeElement===document.body;
    renderFn();if(had&&inputEl&&inputEl.isConnected){inputEl.focus({preventScroll:true});}}
  listeners.forEach(f=>f());
}
function mount(render,opts){
  frame();renderFn=render;keys(opts);update();
  setTimeout(()=>document.querySelector('.cc-input')?.focus(),50);
}
/* Input comune: le varianti lo inseriscono dove vogliono (resta lo stesso elemento tra un render e l'altro). */
let inputEl;
function input(ph='Cerca o scrivi un comando…'){
  if(!inputEl){inputEl=document.createElement('input');inputEl.className='cc-input';inputEl.spellcheck=false;inputEl.autocomplete='off';
    inputEl.addEventListener('input',()=>setQ(inputEl.value));}
  inputEl.placeholder=ph;if(inputEl.value!==m.q)inputEl.value=m.q;
  return inputEl;
}
function scopeChips(){
  const {forced}=parse();
  return SCOPES.map(([k,l])=>`<button class="cc-chip${(forced||m.scope)===k?' on':''}" data-scope="${k}">${l}</button>`).join('');
}
document.addEventListener('click',e=>{
  const s=e.target.closest('[data-scope]');if(s){m.scope=s.dataset.scope;const {forced}=parse();if(forced)m.q=parse().raw;m.sel=0;m.act=0;update();document.querySelector('.cc-input')?.focus();return;}
  const t=e.target.closest('[data-toggle]');if(t){toggle(t.dataset.toggle);return;}
  const x=e.target.closest('[data-expand]');if(x){expand(x.dataset.expand);return;}
});
const hint=()=>`<span><kbd>↑</kbd><kbd>↓</kbd> scegli</span><span><kbd>Tab</kbd> <kbd>→</kbd> altre azioni</span><span><kbd>Invio</kbd> esegui</span><span><kbd>Alt</kbd><kbd>↓</kbd> sezione</span><span><kbd>Esc</kbd> chiudi</span>`;
const prefixHint=()=>`<span><kbd>&gt;</kbd> comandi</span><span><kbd>@</kbd> schede</span><span><kbd>#</kbd> progetti</span><span><kbd>/</kbd> fast link</span><span><kbd>?</kbd> Jarvis</span><span><kbd>+</kbd> crea</span>`;

return {m,I,WS,ACTIVE,SEC,SCOPES,groups,flat,current,run,preview,thumb,icon,mount,update,input,scopeChips,select,hover,toggle,expand,setQ,esc,hint,prefixHint,parse,toast};
})();
