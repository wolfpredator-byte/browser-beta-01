/* VARCO · Launcher finale (dalla 2a · Scambio).
   Due anelli: Fast launcher (profilo dell'app in primo piano) e Command center (sezioni di VARCO).
   Ctrl+Alt+Spazio apre il Fast launcher e, di nuovo, gira l'anello; F1 Command center; F2 modifica il profilo.
   Stesso schema della 0.38.1: l'input non viene mai ricreato (si scrive di fila). */
(()=>{
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const P=d=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
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
  edit:P('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
  warn:P('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>'),
  drop:P('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>'),
  trash:P('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  left:P('<path d="M15 6l-6 6 6 6"/>'),right:P('<path d="M9 6l6 6-6 6"/>'),
  check:P('<path d="M5 12l5 5 9-10"/>'),
  sliders:P('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
};
const TYPES={site:'Sito',app:'App',file:'File',folder:'Cartella',cmd:'Comando',panel:'Pannello web',note:'Nota',jarvis:'JARVIS',tab:'Scheda',create:'Crea',web:'Web'};
const L=(type,title,sub,c,extra={})=>({type,title,sub,c,...extra});

/* ── Profili per app. slots = gli 8 posti dell'anello (null = libero); more = il resto del profilo. ── */
const PROFILES={
  destiny:{app:'Destiny 2',exe:'destiny2.exe',kind:'game',c:'#ffb648',scene:'game',slots:[
    L('site','light.gg','Armi e roll · light.gg','#ffb648'),L('site','DIM','Destiny Item Manager','#f58a2e'),
    L('cmd','Destiny Builder · dev','npm run dev · C:\\Projects\\destiny-builder','#00e5ff'),L('site','Destiny Builder','localhost:5173','#00e5ff'),
    L('panel','Discord · clan','Pannello web a destra','#7b8cff'),L('site','Guida del raid','youtube.com','#ff4e45'),
    L('note','Build del raid','Nota del profilo','#ffb648'),L('site','d2foundry','Statistiche delle armi','#c9a26b')],more:[],
    suggest:[L('site','bungie.net','Aperto 6 volte mentre giocavi','#c9d1d9'),L('site','Braytech','Aperto 3 volte mentre giocavi','#9fb6d6')]},
  cod:{app:'Call of Duty',exe:'cod.exe',kind:'game',c:'#9fd36b',scene:'cod',slots:[
    L('site','WZ Stats','Loadout del meta','#9fd36b'),L('site','CODMunity','Classi e statistiche','#e0c050'),
    L('site','Sym.gg','Dati delle armi','#7fc8a9'),L('site','Patch notes','callofduty.com','#e8e8e8'),
    L('panel','Discord · squadra','Pannello web a destra','#7b8cff'),L('site','Loadout su YouTube','youtube.com','#ff4e45'),
    L('note','Classi preferite','Nota del profilo','#9fd36b'),null],more:[],
    suggest:[L('site','r/CODWarzone','Aperto 4 volte mentre giocavi','#ff7a45')]},
  unity:{app:'Unity',exe:'Unity.exe',kind:'app',c:'#a493ff',scene:'unity',slots:[
    L('site','Unity Manual','docs.unity3d.com','#a493ff'),L('site','Scripting API','docs.unity3d.com/ScriptReference','#b5a8ff'),
    L('app','Visual Studio Code','App','#3fa9f5'),L('folder','Assets','C:\\Projects\\MyGame\\Assets','#5fd0a0'),
    L('site','Asset Store','assetstore.unity.com','#d0d0d0'),L('file','design-doc.pdf','C:\\Users\\Documenti\\Unity\\design-doc.pdf','#ff6b6b',{broken:true}),
    L('jarvis','Spiegami questo errore','Prompt salvato di JARVIS','#00e5ff'),L('note','TODO del gioco','Nota del profilo','#a493ff')],more:[L('site','Unity Discussions','discussions.unity.com','#c9d1d9')],
    suggest:[L('site','Stack Overflow','Aperto 9 volte mentre usavi Unity','#f48024')]},
  blender:{app:'Blender',exe:'blender.exe',kind:'app',c:'#f5a050',scene:'blender',slots:null,more:[],
    suggest:[L('site','Blender Manual','Aperto 5 volte mentre usavi Blender','#f5a050'),L('site','Poly Haven','Aperto 3 volte mentre usavi Blender','#c9d1d9'),L('folder','Modelli','C:\\Users\\Documenti\\Blender','#5fd0a0')]},
  desktop:{app:'Desktop',exe:'',kind:'desk',c:'#00e5ff',scene:'desktop',generic:true,slots:[
    L('site','GitHub','github.com/wolfpredator-byte','#c9d1d9'),L('site','Spotify','open.spotify.com','#1ed760'),
    L('folder','Progetti','C:\\Projects','#5fd0a0'),L('cmd','VARCO · npm start','C:\\Projects\\browser-beta-01','#00e5ff'),
    L('panel','Discord','Pannello web a destra','#7b8cff'),L('jarvis','Chiedi a JARVIS','Prompt libero','#00e5ff'),
    L('app','Steam','App','#9fb6d6'),L('folder','Download','C:\\Users\\Download','#5fd0a0')],more:[],suggest:[]},
};
const PC=[L('app','Unity Hub','App · sul PC','#d0d0d0'),L('app','OBS Studio','App · sul PC','#bbbbbb'),L('app','Discord','App · sul PC','#7b8cff'),
  L('folder','Screenshot','C:\\Users\\Immagini\\Screenshot','#5fd0a0'),L('file','loadout-raid.txt','C:\\Users\\Documenti\\Destiny','#ffb648'),
  L('file','setup-tool.exe','C:\\Users\\Download\\setup-tool.exe','#ff6b6b',{exe:true})];
const SECTIONS=[
  {id:'now',t:'Apri subito',ic:'bolt',items:[L('tab','GitHub · Pull request','github.com · Sviluppo','#c9d1d9'),L('cmd','Destiny Builder · dev','In esecuzione su :5173','#00e5ff'),L('tab','Unity Manual – Rigidbody','docs.unity3d.com · Studio','#a493ff')]},
  {id:'tabs',t:'Schede',ic:'tabs',items:[L('tab','Unity Manual – Rigidbody','docs.unity3d.com · Studio','#a493ff'),L('tab','light.gg · Fatebringer','light.gg · Gaming','#ffb648'),L('tab','Guida del raid','youtube.com · Gaming','#ff4e45'),L('tab','GitHub · Pull request','github.com · Sviluppo','#c9d1d9'),L('tab','Electron docs','electronjs.org · Sviluppo','#9fe0f0')]},
  {id:'projects',t:'Progetti',ic:'folder',items:[L('folder','Destiny Builder','C:\\Projects\\destiny-builder','#ffb648'),L('folder','VARCO','C:\\Projects\\browser-beta-01','#00e5ff'),L('folder','MyGame','C:\\Projects\\MyGame','#a493ff')]},
  {id:'links',t:'Fast link',ic:'pin',items:[L('site','light.gg','Profilo Destiny 2','#ffb648'),L('site','GitHub','Generale','#c9d1d9'),L('site','Unity Manual','Profilo Unity','#a493ff')]},
  {id:'commands',t:'Comandi',ic:'cmd',items:[L('cmd','Modalità zen','Nasconde tutto tranne la pagina','#00e5ff'),L('cmd','Dividi lo schermo','Due schede affiancate','#00e5ff'),L('cmd','Cambia tema','Ora: Cyan Flash','#00e5ff'),L('cmd','Blocco pubblicità','Attivo su questo sito','#00e5ff')]},
  {id:'web',t:'Web',ic:'globe',items:[L('web','Cerca sul web','Google, con i suggerimenti','#c9d1d9'),L('web','unity rigidbody velocity','Dalla cronologia','#c9d1d9')]},
  {id:'jarvis',t:'JARVIS',ic:'jarvis',items:[L('jarvis','Chiedi a JARVIS','Scrivi una domanda','#00e5ff'),L('jarvis','Riassumi la pagina','Unity Manual – Rigidbody','#00e5ff'),L('jarvis','Salva nel progetto','Nelle note del progetto','#00e5ff')]},
  {id:'create',t:'Crea',ic:'plus',items:[L('create','Nota','Nel workspace attivo','#00e5ff'),L('create','Task','- [ ] …','#00e5ff'),L('create','Fast link','Per un profilo o generale','#00e5ff'),L('create','Workspace','Nuovo spazio','#00e5ff')]},
];

const s={open:true,mode:'fast',q:'',sel:0,act:0,sec:0,scene:'destiny',toast:null,confirm:null,drag:false,first:true,phase:null,edit:null};
/* edit = {slot, cand} mentre si modifica il profilo */
let inputEl,root;
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const prof=()=>PROFILES[s.scene];
const hasProfile=()=>!!prof().slots;

/* ── Liste ── */
function pool(){
  const seen=new Set(),out=[];
  for(const [k,p] of Object.entries(PROFILES))for(const x of [...(p.slots||[]),...p.more])if(x&&!seen.has(x.title)){seen.add(x.title);out.push({...x,from:p.generic?'Generale':'Profilo '+p.app,mine:k===s.scene,ref:x});}
  PC.forEach(x=>out.push({...x,from:'Sul PC',ref:x}));return out;
}
function match(list,q){
  q=q.toLowerCase();
  const sc=x=>{const t=x.title.toLowerCase(),a=(t+' '+x.sub+' '+(x.from||'')).toLowerCase();const b=t.startsWith(q)?100:t.split(/[\s·.\-]+/).some(w=>w.startsWith(q))?80:a.includes(q)?50:0;return b?b+(x.mine?25:0):0;};
  return list.map(x=>[x,sc(x)]).filter(a=>a[1]>0).sort((a,b)=>b[1]-a[1]).map(a=>a[0]);
}
function fastLists(){
  const p=prof(),q=s.q.trim();
  if(s.edit){
    const inSlots=new Set((p.slots||[]).filter(Boolean).map(x=>x.title));
    const cands=(q?match(pool(),q):[...p.suggest.map(x=>({...x,suggest:true,ref:x})),...p.more.map(x=>({...x,from:'Nel profilo',ref:x})),...PROFILES.desktop.slots.map(x=>({...x,from:'Generale',ref:x}))]).filter(x=>!inSlots.has(x.title)).slice(0,7);
    return {fan:[{title:q?'Risultati':'Da mettere sull\'anello',items:cands}]};
  }
  if(q){
    const list=match(pool(),q).slice(0,8);
    list.push({type:'web',title:`Cerca «${q}» sul web`,sub:'Google · in VARCO',c:'#c9d1d9',dyn:true},{type:'jarvis',title:`Chiedi a JARVIS: «${q}»`,sub:'La risposta arriva come notifica',c:'#00e5ff',dyn:true});
    return {fan:[{title:'Risultati',items:list,none:list.length===2}]};
  }
  const fan=[];
  if(!hasProfile()){fan.push({title:'Suggeriti per '+p.app,note:'li apri spesso mentre è in primo piano',items:p.suggest.map(x=>({...x,suggest:true}))});}
  else{
    if(p.more.length)fan.push({title:'Altro nel profilo',items:p.more});
    if(p.suggest.length)fan.push({title:'Suggeriti',note:'li apri spesso con '+p.app,items:p.suggest.map(x=>({...x,suggest:true}))});
  }
  fan.push(p.generic?{title:'Sul PC',items:PC.slice(0,3)}:{title:'Generali',items:PROFILES.desktop.slots.slice(0,3).map(x=>({...x,from:'Generale'}))});
  return {fan};
}
function ccLists(){
  const q=s.q.trim().toLowerCase();
  if(q){const res=[];SECTIONS.forEach(sec=>sec.items.forEach(x=>{if((x.title+' '+x.sub).toLowerCase().includes(q))res.push({...x,from:sec.t});}));
    res.push({type:'web',title:`Cerca «${s.q.trim()}» sul web`,sub:'Google',c:'#c9d1d9',dyn:true},{type:'jarvis',title:`Chiedi a JARVIS: «${s.q.trim()}»`,sub:'La risposta arriva come notifica',c:'#00e5ff',dyn:true});
    return {fan:[{title:'In tutte le sezioni',items:res,none:res.length===2}]};}
  const sec=SECTIONS[s.sec];return {fan:[{title:sec.t,icon:sec.ic,items:sec.items}]};
}
const ringItems=()=>s.mode==='fast'&&hasProfile()?prof().slots:[];
/* Ordine della tastiera. Fast a vuoto: gli 8 posti (anche liberi) poi il ventaglio; scrivendo, in modifica e nel Command center: solo il ventaglio. */
function flat(){
  if(s.mode==='cc')return ccLists().fan.flatMap(g=>g.items);
  const fan=fastLists().fan.flatMap(g=>g.items);
  return !s.q.trim()&&!s.edit&&hasProfile()?[...prof().slots.map((x,i)=>x||{type:'free',slot:i,title:'Posto '+(i+1)+' libero'}),...fan]:fan;
}
const current=()=>flat()[s.sel]||null;
function actions(x){
  if(!x)return [];
  if(s.edit)return [`Metti nel posto ${s.edit.slot+1}`];
  if(x.type==='free')return ['Aggiungi qui'];
  if(x.broken)return ['Cambia percorso','Togli dal profilo'];
  if(x.suggest)return hasProfile()?['Aggiungi al profilo','Apri','Ignora']:['Apri','Ignora'];
  return ({site:['Apri in VARCO','Apri nel pannello','Copia link'],panel:['Apri nel pannello','Apri in una scheda'],app:['Avvia','Mostra nella cartella'],
    folder:['Apri','Apri nel terminale','Copia percorso'],file:x.exe?['Avvia…','Mostra nella cartella']:['Apri','Mostra nella cartella','Copia percorso'],cmd:['Esegui','Apri il progetto','Ferma'],note:['Apri la nota'],
    jarvis:['Chiedi a JARVIS'],tab:['Vai alla scheda','Affianca','Chiudi la scheda'],web:['Cerca'],create:['Crea']}[x.type]||['Apri']);
}

/* ── Azioni ── */
function toast(msg,sub,kind){s.toast={msg,sub,kind};clearTimeout(toast.t);toast.t=setTimeout(()=>{s.toast=null;draw();},2800);}
const firstFree=()=>prof().slots.findIndex(x=>!x);
function put(x,slot){
  const p=prof(),clean={...x};['suggest','from','mine','ref','dyn'].forEach(k=>delete clean[k]);if(x.suggest)clean.sub=clean.sub.replace(/Aperto.*/,'Aggiunto ora');
  p.suggest=p.suggest.filter(y=>y.title!==x.title);p.more=p.more.filter(y=>y.title!==x.title);
  const old=p.slots[slot];if(old)p.more.unshift(old);p.slots[slot]=clean;return old;
}
function run(x,ai=s.act){
  if(!x)return;const p=prof(),a=actions(x)[ai]||actions(x)[0];
  if(s.edit){const old=put(x,s.edit.slot);toast(`Nel posto ${s.edit.slot+1}: ${x.title}`,old?old.title+' passa in «Altro nel profilo»':'');s.q='';inputEl.value='';const f=firstFree();if(f>=0)s.edit.slot=f;s.sel=0;draw();return;}
  if(x.type==='free'){startEdit(x.slot);return;}
  if(a==='Aggiungi al profilo'){const f=firstFree();if(f>=0){put(x,f);toast('Aggiunto al profilo '+p.app,`${x.title} · posto ${f+1}`);}else{p.suggest=p.suggest.filter(y=>y.title!==x.title);p.more.push({...x,suggest:undefined,sub:'Aggiunto ora'});toast('Aggiunto al profilo '+p.app,'L\'anello è pieno: lo trovi in «Altro nel profilo»');}draw();return;}
  if(a==='Ignora'){p.suggest=p.suggest.filter(y=>y.title!==x.title);toast('Non lo suggerisco più',x.title);draw();return;}
  if(a==='Togli dal profilo'){const i=p.slots.indexOf(x);if(i>=0)p.slots[i]=null;toast('Tolto dal profilo',x.title);draw();return;}
  if(a==='Cambia percorso'){toast('Scegli il nuovo percorso',`Si apre Esplora file per ritrovare ${x.title}`);draw();return;}
  if(a.startsWith('Copia')){toast('Copiato',x.sub);draw();return;}
  if(x.exe&&ai===0){s.confirm=x;draw();return;}
  toast(a+' · '+x.title.replace(/«|»/g,''),s.mode==='fast'&&!p.generic?'Il launcher si chiude e torni a '+p.app:'');close();
}
function createProfile(){const p=prof();p.slots=Array(8).fill(null);p.suggest.slice().forEach((x,i)=>put({...x,suggest:true},i));toast('Profilo di '+p.app+' creato',`Si attiva quando ${p.exe} è in primo piano`);startEdit(firstFree()>=0?firstFree():0);}
function startEdit(slot=0){if(!hasProfile()){createProfile();return;}s.mode='fast';s.edit={slot};s.q='';inputEl.value='';s.sel=0;s.act=0;draw();inputEl.focus();}
function endEdit(){s.edit=null;s.q='';inputEl.value='';s.sel=0;s.act=0;draw();}

/* Giro dell'anello in due tempi: si chiude di taglio, cambia, si riapre. */
function setMode(m){
  if(m===s.mode||s.phase)return;s.edit=null;
  if(reduce.matches||document.body.dataset.motion==='off'){s.mode=m;s.sel=0;s.act=0;s.q='';inputEl.value='';draw();return;}
  const d=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--flip'))||420;
  s.phase='out';draw();
  setTimeout(()=>{s.mode=m;s.sel=0;s.act=0;s.q='';inputEl.value='';s.phase='in';draw();setTimeout(()=>{s.phase=null;draw();},d/2+260);},d/2);
}
function open(m='fast'){s.open=true;s.first=true;s.mode=m;s.q='';s.sel=0;s.act=0;s.edit=null;s.confirm=null;if(inputEl)inputEl.value='';draw();}
function close(){s.open=false;s.edit=null;s.confirm=null;draw();}

function onKey(e){
  if(e.target.closest&&e.target.closest('.tweaks'))return;
  if(e.ctrlKey&&e.altKey&&e.code==='Space'){e.preventDefault();if(!s.open)open('fast');else setMode(s.mode==='fast'?'cc':'fast');return;}
  if(e.key==='F1'){e.preventDefault();if(!s.open)open('cc');else setMode('cc');return;}
  if(!s.open)return;
  if(s.confirm){e.preventDefault();if(e.key==='Enter'){const x=s.confirm;s.confirm=null;toast('Avviato · '+x.title,'Hai confermato tu');close();}else if(e.key==='Escape'){s.confirm=null;draw();}return;}
  if(e.key==='F2'||(e.ctrlKey&&(e.key==='e'||e.key==='E'))){e.preventDefault();if(s.mode!=='fast')return;s.edit?endEdit():startEdit(s.sel<8?s.sel:0);return;}
  const fl=flat(),n=fl.length,cur=current(),acts=actions(cur).length;
  /* Modifica del profilo */
  if(s.edit){
    const p=prof();
    if(e.key==='Escape'){e.preventDefault();if(s.q){s.q='';inputEl.value='';draw();}else endEdit();return;}
    if(e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();const i=s.edit.slot,j=(i+(e.key==='ArrowRight'?1:-1)+8)%8;[p.slots[i],p.slots[j]]=[p.slots[j],p.slots[i]];s.edit.slot=j;draw();return;}
    if(!s.q&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();s.edit.slot=(s.edit.slot+(e.key==='ArrowRight'?1:-1)+8)%8;draw();return;}
    if(!s.q&&(e.key==='Delete'||e.key==='Backspace')){e.preventDefault();const x=p.slots[s.edit.slot];if(x){p.slots[s.edit.slot]=null;p.more.unshift(x);toast('Tolto dal posto '+(s.edit.slot+1),x.title+' resta in «Altro nel profilo»');}draw();return;}
  }
  if(s.mode==='fast'&&!s.edit&&!s.q&&/^[1-8]$/.test(e.key)&&!e.ctrlKey&&!e.altKey&&hasProfile()){e.preventDefault();const i=+e.key-1;s.sel=i;s.act=0;run(flat()[i],0);return;}
  if(!s.q&&!s.edit&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();const d=e.key==='ArrowRight'?1:-1;
    if(s.mode==='fast'){if(hasProfile())s.sel=s.sel<8?(s.sel+d+8)%8:0;}else{s.sec=(s.sec+d+SECTIONS.length)%SECTIONS.length;s.sel=0;}s.act=0;draw();return;}
  if(e.key==='ArrowDown'){e.preventDefault();s.sel=(s.sel+1)%Math.max(1,n);s.act=0;draw();}
  else if(e.key==='ArrowUp'){e.preventDefault();s.sel=(s.sel-1+n)%Math.max(1,n);s.act=0;draw();}
  else if(e.key==='Tab'){e.preventDefault();if(acts)s.act=(s.act+(e.shiftKey?-1:1)+acts)%acts;draw();}
  else if(e.key==='Enter'){e.preventDefault();if(!s.edit&&!hasProfile()&&s.mode==='fast'&&!s.q&&!cur){createProfile();return;}run(cur,e.ctrlKey?1:s.act);}
  else if(e.key==='Escape'){e.preventDefault();if(s.act){s.act=0;draw();}else if(s.q){s.q='';inputEl.value='';s.sel=0;draw();}else close();}
}

/* ── Disegno ── */
function icon(x,big){
  if(x.type==='free')return `<span class="ic-b free${big?' big':''}">${I.plus}</span>`;
  const mono=x.type==='site'||x.type==='panel'||x.type==='tab'||x.type==='web';
  return `<span class="ic-b${big?' big':''}" style="--c:${x.c||'var(--mc)'}">${mono?`<b>${esc((x.title.match(/[A-Za-z0-9]/)||['·'])[0].toUpperCase())}</b>`:(I[x.type]||I.site)}${x.broken?'<i class="bad" title="Non trovato"></i>':''}</span>`;
}
const short=t=>t.split(' · ')[0];
function geometry(){
  const tw=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ring-scale'))||1;
  const W=root.clientWidth,H=root.clientHeight;
  /* Largo: anello + ventaglio affiancati (il ventaglio si stringe fino a 280px). Stretto: uno sopra l'altro. */
  const wide=W>=700;
  const R=Math.round(Math.max(120,Math.min(230,wide?Math.min((H-180)/2,(W<1100?(W-380)/2.3:(W-430)/2.15)):Math.min((W-40)/2,(H-300)/2.2)))*tw);
  return {R,Ri:Math.round(R*.56),wide,mid:W<1100};
}
function ring(R,Ri){
  const fast=s.mode==='fast',N=8,step=360/N;
  const pt=(r,a)=>[R+r*Math.cos((a-90)*Math.PI/180),R+r*Math.sin((a-90)*Math.PI/180)];
  const gap=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gap'))||1.4;
  const path=(a0,a1)=>{const [x0,y0]=pt(R,a0),[x1,y1]=pt(R,a1),[x2,y2]=pt(Ri,a1),[x3,y3]=pt(Ri,a0);return `M${x0},${y0}A${R},${R} 0 0 1 ${x1},${y1}L${x2},${y2}A${Ri},${Ri} 0 0 0 ${x3},${y3}Z`;};
  const noProf=fast&&!hasProfile();
  const on=fast?(s.edit?s.edit.slot:(!s.q&&s.sel<8?s.sel:-1)):s.sec;
  let segs='',labs='',arc='';
  for(let i=0;i<N;i++){
    const a=i*step,x=fast?(hasProfile()?prof().slots[i]:null):null,sec=fast?null:SECTIONS[i],isOn=i===on&&!noProf,free=fast&&!x;
    segs+=`<path class="seg${free?' free':''}${isOn?' on':''}${x?.broken?' broken':''}" style="--d:${i}" d="${path(a-step/2+gap,a+step/2-gap)}" data-seg="${i}" role="button" aria-label="${esc(fast?(x?x.title:'Posto '+(i+1)+' libero'):sec.t)}"/>`;
    const [lx,ly]=pt((R+Ri)/2,a);
    const inner=fast?(x?`${icon(x)}<span class="n">${esc(prof().slots.some(y=>y&&y!==x&&short(y.title)===short(x.title))?x.title:short(x.title))}</span><kbd>${i+1}</kbd>`:`<span class="ic-b free">${I.plus}</span><span class="n">${noProf?'':'Libero'}</span>${noProf?'':`<kbd>${i+1}</kbd>`}`)
      :`${I[sec.ic]}<span class="n">${sec.t}</span><em>${sec.items.length}</em>`;
    labs+=`<div class="sl${isOn?' on':''}${free?' free':''}" style="left:${lx}px;top:${ly}px;--d:${i}">${inner}</div>`;
    if(isOn)arc=`<path class="arc" d="M${pt(R+8,a-step/2+5).join(',')}A${R+8},${R+8} 0 0 1 ${pt(R+8,a+step/2-5).join(',')}"/>`;
  }
  const cs=(Ri-10)*2;
  return `<div class="ring${s.edit?' editing':''}" style="width:${2*R}px;height:${2*R}px"><svg viewBox="0 0 ${2*R} ${2*R}" width="${2*R}" height="${2*R}"><circle class="halo" cx="${R}" cy="${R}" r="${R+8}"/>${segs}${arc}</svg>${labs}
    <div class="core" style="width:${cs}px;height:${cs}px">${coreInner(cs)}</div></div>`;
}
function coreInner(cs){
  const p=prof(),cur=current(),fast=s.mode==='fast';
  const head=`<span class="mode-name">${fast?I.bolt+(s.edit?'Modifica profilo':'Fast launcher'):I.spark+'Command center'}</span><span class="slot-in" id="lxSlot"></span>`;
  let body='';
  if(fast&&!hasProfile())body=`<span class="who">${esc(p.app)} non ha un profilo</span><button class="core-btn" data-create>${I.plus}Crea il profilo</button>`;
  else if(s.edit){const x=p.slots[s.edit.slot];body=`<span class="who">Posto ${s.edit.slot+1} · ${x?esc(x.title):'libero'}</span>`;}
  else if(cur&&!s.q){body=`${cs>=210?`<span class="cur-ic">${icon(cur,true)}</span>`:''}<b class="cur">${esc(cur.title)}</b><span class="who">${esc(cur.type==='free'?'Invio per scegliere cosa metterci':cur.broken?'Non trovato':cur.sub||'')}</span>`;}
  else body=`<span class="who">${fast?(p.generic?'Generale · nessuna app in primo piano':esc(p.app)+' · profilo'):'Sezione · '+SECTIONS[s.sec].t}</span>`;
  return head+`<div class="core-body">${body}</div>`;
}
function fan(){
  const groups=s.mode==='fast'?fastLists().fan:ccLists().fan;
  let k=s.mode==='fast'&&!s.q.trim()&&!s.edit&&hasProfile()?8:0;
  const p=prof();
  let head='';
  if(s.mode==='fast'&&s.edit)head=`<div class="prof edit"><span class="pi">${I.edit}</span><div><b>Profilo · ${esc(p.app)}</b><span>Si attiva quando <code>${esc(p.exe)}</code> è in primo piano</span></div><button class="pbtn" data-done>${I.check}Fatto</button></div>
    <div class="edit-help"><span><kbd>←</kbd><kbd>→</kbd> scegli il posto</span><span><kbd>Alt</kbd>+<kbd>←</kbd><kbd>→</kbd> spostalo</span><span><kbd>Canc</kbd> svuota</span><span>Scrivi per cercare</span></div>`;
  else if(s.mode==='fast'&&!s.q)head=`<div class="prof"><span class="pi">${I[p.kind==='game'?'game':p.kind==='desk'?'app':'app']}</span><div><b>${esc(p.app)}</b><span>${p.generic?'Nessuna app in primo piano: fast link generali':hasProfile()?'In primo piano · '+p.slots.filter(Boolean).length+' fast link sull\'anello':'In primo piano · ancora senza profilo'}</span></div>${hasProfile()?`<button class="pbtn" data-edit title="F2">${I.edit}Modifica</button>`:`<button class="pbtn solid" data-create>${I.plus}Crea il profilo</button>`}</div>`;
  else if(s.mode==='cc'&&!s.q)head='';
  const body=groups.map(g=>`<div class="lab">${g.icon?I[g.icon]:''}${esc(g.title)}${g.note?` <i>· ${esc(g.note)}</i>`:''}</div>${g.none?`<div class="none"><b>Niente per «${esc(s.q.trim())}»</b><span>${s.mode==='fast'?'Né nei profili, né sul PC.':'In nessuna sezione di VARCO.'} Puoi cercarlo sul web o chiederlo a JARVIS.</span></div>`:''}
    ${g.items.length?g.items.map(x=>{const i=k++;return `<div class="item${i===s.sel?' sel':''}${x.suggest?' sug':''}" data-i="${i}" role="option" aria-selected="${i===s.sel}">${icon(x)}<div class="t"><b class="${x.broken?'bad-t':''}">${esc(x.title)}</b><span>${esc(x.broken?'Non trovato · '+x.sub:x.from?x.from+' · '+x.sub:x.sub)}</span></div>${x.suggest?'<span class="tag">Suggerito</span>':''}${x.exe?'<span class="tag warn">.exe</span>':''}</div>`;}).join(''):(s.edit?'<div class="none"><span>Niente da aggiungere: scrivi per cercare tra siti, app e file.</span></div>':'')}`).join('');
  return `<div class="fan" role="listbox" aria-label="Risultati">${head}${body}</div>`;
}
function bar(){
  const cur=current(),fast=s.mode==='fast';
  const acts=cur?actions(cur).map((a,j)=>`<button class="act${j===s.act?' on':''}" data-a="${j}">${a}</button>`).join(''):'';
  const keys=s.edit?`<span><kbd>Invio</kbd> metti</span><span><kbd>Esc</kbd> fatto</span>`
    :`<span><kbd>Ctrl</kbd><kbd>Alt</kbd><kbd>Spazio</kbd> ${fast?'Command center':'Fast launcher'}</span>${fast&&!hasProfile()?'':`<span><kbd>←</kbd><kbd>→</kbd> ${fast?'anello':'sezioni'}</span>`}${fast&&hasProfile()?'<span><kbd>1</kbd>–<kbd>8</kbd> apri</span><span><kbd>F2</kbd> modifica</span>':''}<span><kbd>Tab</kbd> azioni</span><span><kbd>Esc</kbd> chiudi</span>`;
  return `<div class="bar">${acts?`<div class="acts">${acts}</div>`:''}<div class="keys">${keys}</div></div>`;
}
function switcher(){return `<div class="switch" role="tablist"><button role="tab" aria-selected="${s.mode==='fast'}" data-mode="fast" class="f${s.mode==='fast'?' on':''}">${I.bolt}<span>Fast launcher</span></button><button role="tab" aria-selected="${s.mode==='cc'}" data-mode="cc" class="c${s.mode==='cc'?' on':''}">${I.spark}<span>Command center</span></button><kbd class="sw-k">Ctrl Alt Spazio</kbd></div>`;}

function scene(){
  const g=prof().scene;
  if(g==='game'||g==='cod')return `<div class="sc sc-game ${g}"><div class="sky"></div><div class="hills"></div><div class="hud-tl"><i></i><i></i><i></i></div><div class="hud-hp"><b style="width:72%"></b></div><div class="hud-ammo">${g==='cod'?'30<small>/ 120</small>':'32<small>/ 180</small>'}</div><div class="hud-map"></div><div class="cross"></div></div>`;
  const win=g==='unity'?`<div class="win unity"><div class="wt">Unity 6 — MyGame — Main.unity</div><div class="u-grid"><i></i><i></i><i></i></div></div>`
    :g==='blender'?`<div class="win blender"><div class="wt">Blender 4 — scena.blend</div><div class="b-view"><i></i></div></div>`
    :`<div class="win"><div class="wt">Esplora file — Progetti</div><div class="code">${Array.from({length:10},(_,i)=>`<i style="width:${30+((i*37)%50)}%"></i>`).join('')}</div></div>`;
  return `<div class="sc sc-desk"><div class="wall"></div>${win}<div class="task">${'<i></i>'.repeat(7)}</div></div>`;
}
function demo(){return `<div class="lx-demo" aria-label="Solo per l'esempio"><span class="t">In primo piano:</span>${Object.entries(PROFILES).map(([k,v])=>`<button data-scene="${k}" class="${s.scene===k?'on':''}">${v.app}</button>`).join('')}
  <span class="sep"></span><span class="t">Prova:</span><button data-try="">Vuoto</button><button data-try="dis">«dis»</button><button data-try="setup">.exe</button><button data-try="zzz">Nessun risultato</button><button data-small>Finestra piccola</button>
  <span class="sep"></span><button data-open="cc"><kbd>F1</kbd></button><button data-open="fast"><kbd>Ctrl</kbd><kbd>Alt</kbd><kbd>Spazio</kbd></button></div>`;}
function overlays(){
  let h='';
  if(s.confirm)h+=`<div class="confirm" role="alertdialog"><div class="box">${I.warn}<b>Avviare ${esc(s.confirm.title)}?</b><span>È un programma scaricato. Il launcher lo avvia solo se confermi.</span><div class="row"><button class="go" data-cf="1">Avvia <kbd>Invio</kbd></button><button data-cf="0">Annulla <kbd>Esc</kbd></button></div></div></div>`;
  if(s.drag)h+=`<div class="dropz">${I.drop}<b>Rilascia per aggiungerlo a ${esc(prof().app)}</b><span>File, cartelle o collegamenti · un .exe chiederà conferma all'avvio</span></div>`;
  return h;
}

function draw(){
  if(!root)return;
  const n=flat().length;if(s.sel>=n)s.sel=Math.max(0,n-1);
  const el=inputEl,focused=s.first||document.activeElement===el||document.activeElement===document.body,a=el.selectionStart,b=el.selectionEnd;
  const {R,Ri,wide,mid}=geometry();
  const mc=s.mode==='fast'?prof().c:'var(--acc)';
  root.querySelector('#scene').innerHTML=scene();
  root.querySelector('#ui').innerHTML=(s.open?`<div class="veil ${prof().scene==='game'||prof().scene==='cod'?'game':''}"></div>
    <div class="lx M-${s.mode}${wide?'':' narrow'}${mid?' mid':''}${s.first?' enter':''}${s.phase?' ph-'+s.phase:''}${s.edit?' is-edit':''}" style="--mc:${mc}">${switcher()}<div class="stage">${ring(R,Ri)}</div>${fan()}${bar()}</div>`
    :`<div class="closed">Chiuso · <kbd>Ctrl</kbd><kbd>Alt</kbd><kbd>Spazio</kbd> Fast launcher · <kbd>F1</kbd> Command center</div>`)+overlays()+
    (s.toast?`<div class="toast" role="status"><b>${esc(s.toast.msg)}</b>${s.toast.sub?`<span>${esc(s.toast.sub)}</span>`:''}</div>`:'');
  document.getElementById('demo').innerHTML=demo();
  const slot=root.querySelector('#lxSlot');
  if(slot){slot.replaceWith(el);el.placeholder=s.edit?`Cerca per il posto ${s.edit.slot+1}`:s.mode==='fast'?(hasProfile()?'Cerca, o premi 1–8':'Cerca'):'Cerca in VARCO';
    if(focused&&!s.confirm){el.focus({preventScroll:true});if(!s.first&&a!==null)try{el.setSelectionRange(a,b);}catch{}}}
  if(s.first){s.first=false;setTimeout(()=>root.querySelector('.lx')?.classList.remove('enter'),700);}
  bind();
}
function bind(){
  const $=q=>[...document.querySelectorAll(q)].filter(n=>!n.closest('#tweaks')),el=inputEl;
  $('[data-scene]').forEach(b=>b.onclick=()=>{s.scene=b.dataset.scene;open('fast');});
  $('[data-try]').forEach(b=>b.onclick=()=>{if(!s.open)open('fast');s.edit=null;s.q=b.dataset.try;el.value=s.q;s.sel=0;s.act=0;draw();el.focus();});
  $('[data-small]').forEach(b=>b.onclick=()=>{document.body.classList.toggle('small');b.classList.toggle('on');setTimeout(draw,50);});
  $('[data-open]').forEach(b=>b.onclick=()=>{s.open?setMode(b.dataset.open):open(b.dataset.open);});
  $('[data-mode]').forEach(b=>b.onclick=()=>{setMode(b.dataset.mode);el.focus();});
  $('[data-edit]').forEach(b=>b.onclick=()=>startEdit(s.sel<8?s.sel:0));
  $('[data-done]').forEach(b=>b.onclick=endEdit);
  $('[data-create]').forEach(b=>b.onclick=createProfile);
  $('[data-i]').forEach(n=>{n.onclick=()=>{s.sel=+n.dataset.i;s.act=0;run(current(),0);};n.onmousemove=()=>{if(s.sel!==+n.dataset.i){s.sel=+n.dataset.i;s.act=0;draw();}};});
  $('[data-a]').forEach(n=>n.onclick=e=>{e.stopPropagation();s.act=+n.dataset.a;run(current());});
  $('[data-seg]').forEach(g=>{const i=+g.dataset.seg;
    g.onclick=()=>{if(s.mode==='cc'){s.sec=i;s.sel=0;s.act=0;draw();return;}if(!hasProfile()){createProfile();return;}if(s.edit){s.edit.slot=i;draw();return;}const x=prof().slots[i];if(!x){startEdit(i);return;}s.sel=i;run(x,0);};
    g.onmousemove=()=>{if(s.mode==='fast'&&!s.edit&&hasProfile()&&!s.q&&s.sel!==i){s.sel=i;s.act=0;draw();}};});
  $('[data-cf]').forEach(b=>b.onclick=()=>{const x=s.confirm;s.confirm=null;if(b.dataset.cf==='1'){toast('Avviato · '+x.title,'Hai confermato tu');close();}else draw();});
  root.querySelector('.veil')?.addEventListener('click',close);
}

/* ── Tweaks (solo negli esempi): ogni decisione aperta è un token CSS ── */
const TW=[
  ['--ring-scale','Grandezza anello',.8,1.2,.05,1,''],['--gap','Spazio tra i settori',0,4,.2,1.4,''],['--flip','Durata del giro (ms)',200,800,20,420,''],
  ['--stagger','Ritardo tra i settori (ms)',0,60,5,28,'ms'],['--glass','Opacità del vetro',.5,.95,.01,.78,''],['--blur','Sfocatura del vetro (px)',0,40,1,20,'px'],
  ['--veil-game','Velo sopra il gioco',0,.6,.02,.22,''],['--veil','Velo sopra il desktop',0,.8,.02,.42,''],['--glow','Bagliore della scelta (px)',0,20,1,8,'px'],['--radius','Raggio delle card (px)',6,22,1,14,'px'],
];
function tweaks(){
  const box=document.getElementById('tweaks'),root=document.documentElement;
  box.innerHTML=`<button class="tw-open" aria-expanded="false">${I.sliders}Tweaks</button><div class="tw-panel" hidden><b>Tweaks</b>
    <label class="tw-c">Colore Command center <input type="color" data-tc value="#00e5ff"></label>
    ${TW.map(([v,l,mi,ma,st,d,u])=>`<label>${l}<span><input type="range" min="${mi}" max="${ma}" step="${st}" value="${d}" data-tw="${v}" data-u="${u}"><output>${d}</output></span></label>`).join('')}
    <label class="tw-c">Movimento <select data-motion><option value="on">Completo</option><option value="off">Ridotto</option></select></label>
    <label class="tw-c">Barra dell'esempio <select data-demo><option value="on">Visibile</option><option value="off">Nascosta</option></select></label>
    <div class="tw-row"><button data-copy>Copia token</button><button data-reset>Ripristina</button></div></div>`;
  const panel=box.querySelector('.tw-panel'),btn=box.querySelector('.tw-open');
  btn.onclick=()=>{panel.hidden=!panel.hidden;btn.setAttribute('aria-expanded',!panel.hidden);};
  box.querySelectorAll('[data-tw]').forEach(r=>r.oninput=()=>{root.style.setProperty(r.dataset.tw,r.value+r.dataset.u);r.nextElementSibling.value=r.value;if(['--ring-scale','--gap'].includes(r.dataset.tw))draw();});
  box.querySelector('[data-tc]').oninput=e=>{const h=e.target.value;root.style.setProperty('--acc',h);root.style.setProperty('--acc-rgb',[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)).join(','));draw();};
  box.querySelector('[data-motion]').onchange=e=>{document.body.dataset.motion=e.target.value;};
  box.querySelector('[data-demo]').onchange=e=>{document.body.dataset.demo=e.target.value;draw();};
  box.querySelector('[data-copy]').onclick=async()=>{const out={'--acc':getComputedStyle(root).getPropertyValue('--acc').trim()};TW.forEach(([v])=>out[v]=getComputedStyle(root).getPropertyValue(v).trim());
    const css=':root{'+Object.entries(out).map(([k,v])=>`${k}:${v}`).join(';')+'}';try{await navigator.clipboard.writeText(css);toast('Token copiati',css.slice(0,90)+'…');}catch{toast('Copia non riuscita',css);}draw();};
  box.querySelector('[data-reset]').onclick=()=>{root.removeAttribute('style');tweaks();draw();};
}

function start(){
  root=document.getElementById('app');
  inputEl=document.createElement('input');inputEl.className='lx-input';inputEl.autocomplete='off';inputEl.spellcheck=false;inputEl.setAttribute('aria-label','Cerca');
  inputEl.addEventListener('input',()=>{s.q=inputEl.value;s.sel=0;s.act=0;draw();});
  document.addEventListener('keydown',onKey);
  let rz;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(draw,60);});
  let dc=0;
  addEventListener('dragenter',e=>{e.preventDefault();dc++;if(!s.drag){s.drag=true;draw();}});
  addEventListener('dragleave',()=>{if(--dc<=0){dc=0;s.drag=false;draw();}});
  addEventListener('dragover',e=>e.preventDefault());
  addEventListener('drop',e=>{e.preventDefault();dc=0;s.drag=false;const files=[...(e.dataTransfer.files||[])];
    if(!hasProfile())createProfile();
    files.forEach(f=>{const exe=/\.(exe|bat|cmd|ps1|msi)$/i.test(f.name);const x=L('file',f.name,'Trascinato nel launcher','#5fd0a0',{exe});const i=firstFree();if(i>=0)prof().slots[i]=x;else prof().more.push(x);});
    toast(files.length?`Aggiunto a ${prof().app}`:'Niente da aggiungere',files.map(f=>f.name).join(', '));if(!s.open)open('fast');else draw();});
  const p=new URLSearchParams(location.search);if(p.get('scene'))s.scene=p.get('scene');if(p.get('mode'))s.mode=p.get('mode');if(p.get('edit'))s.edit={slot:0};if(p.get('q')){s.q=p.get('q');inputEl.value=s.q;}
  tweaks();draw();
}
window.LF={s,draw,prof,PROFILES};
start();
})();
