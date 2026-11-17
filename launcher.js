/* Beta 0.39 — finestra del launcher (lib/launcher.cjs).
   Due anelli: Fast launcher (profilo del programma in primo piano) e Command center (sezioni di VARCO).
   La scorciatoia di sistema, premuta di nuovo, gira l'anello; F1 Command center; F2 modifica il profilo.
   Come nel command center della 0.38.1 l'input non viene mai ricreato: si scrive di fila.
   Beta 0.40: più anelli per profilo (PagSu/PagGiù, rotella), cartelle e file del PC, media di siti e app, chiusura animata. */
(()=>{
'use strict';
const API=window.launcherAPI,R=window.LauncherRules;
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
  check:P('<path d="M5 12l5 5 9-10"/>'),
  desk:P('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
  play:P('<path d="M7 5l12 7-12 7z"/>'),pause:P('<path d="M8 5v14M16 5v14"/>'),
  next:P('<path d="M6 5l9 7-9 7zM18 5v14"/>'),prev:P('<path d="M18 5l-9 7 9 7zM6 5v14"/>'),
  music:P('<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
  browse:P('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10v6M9 13h6"/>'),
};
const CC_ICON={tab:'tabs',project:'folder',preview:'site',server:'cmd',folder:'folder',file:'file',link:'site',session:'tabs',command:'cmd',workspace:'app',bookmark:'site',history:'site',jsum:'jarvis',jsave:'jarvis',prompt:'jarvis',note:'note',task:'check',create:'plus'};

let D=null; // istantanea dal processo principale
const s={open:false,mode:'fast',q:'',sel:0,act:0,sec:0,toast:null,confirm:null,drag:false,first:true,phase:null,edit:null,page:0,pageAnim:null,leaving:false};
let inputEl,root;
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const has=()=>!!D?.profile.has;
const slots=()=>D?.profile.slots||[];
/* Beta 0.40: più anelli. slots() = tutti i posti; pageSlots() = gli 8 dell'anello che vedi. */
const pages=()=>Math.max(1,Math.ceil(slots().length/8));
const pageSlots=()=>{const a=slots().slice(s.page*8,s.page*8+8);while(a.length<8)a.push(null);return a;};
const media=()=>D?.media||[];
const fg=()=>D?.fg||{key:'*',app:'Desktop',kind:'desk'};

// ── Liste ──
function fastLists(){
  const q=s.q.trim();
  if(s.edit){
    const inSlots=new Set(slots().filter(Boolean).map(x=>x.title+'|'+x.sub));
    const base=q?R.match(D.pool,q,12):[...D.suggest,...D.profile.more,...D.pool.filter(x=>!x.mine)].slice(0,14);
    const pick=[{type:'browse',kind:'folder',title:'Scegli una cartella del PC…',sub:'Esplora file: qualsiasi cartella o disco'},{type:'browse',kind:'file',title:'Scegli un file del PC…',sub:'Esplora file: documenti, programmi, collegamenti'}];
    return {fan:[{title:'Dal computer',items:pick},{title:q?'Risultati':'Da mettere sull’anello',items:base.filter(x=>!inSlots.has(x.title+'|'+x.sub)).slice(0,10)}]};
  }
  if(q){
    const list=R.match(D.pool,q,8);
    const dyn=[{type:'search',title:`Cerca «${q}» sul web`,sub:'In una nuova scheda di VARCO',dyn:'search'},
      {type:'jarvis',title:`Chiedi a JARVIS: «${q}»`,sub:'La risposta arriva come notifica',dyn:'ask'}];
    return {fan:[{title:'Risultati',items:[...list,...dyn],none:!list.length}]};
  }
  const fan=[];
  if(!has()){if(D.suggest.length)fan.push({title:'Suggeriti per '+fg().app,note:'pronti per il profilo',items:D.suggest.map(x=>({...x,suggest:true}))});}
  else{
    if(D.profile.more.length)fan.push({title:'Altro nel profilo',items:D.profile.more});
    if(D.suggest.length)fan.push({title:'Suggeriti',note:'per '+fg().app,items:D.suggest.map(x=>({...x,suggest:true}))});
  }
  if(D.generic.length)fan.push({title:'Generali',items:D.generic});
  if(!fan.length&&fg().key==='*')fan.push({title:'Inizia da qui',items:[],hint:'Premi F2 o clicca un posto libero per scegliere cosa mettere sull’anello. Puoi anche trascinare qui file e cartelle.'});
  return {fan};
}
function ccAll(){return D.cc.sections.flatMap(sec=>sec.items.map(x=>({...x,from:sec.t})));}
function ccLists(){
  if(!D.cc.available)return {fan:[]};
  const q=s.q.trim();
  if(q){
    const list=R.match(ccAll(),q,12);
    const dyn=[{type:'search',title:`Cerca «${q}» sul web`,sub:'In una nuova scheda di VARCO',dyn:'search'},
      {type:'jarvis',title:`Chiedi a JARVIS: «${q}»`,sub:'La risposta arriva come notifica',dyn:'ask'},
      {type:'note',title:`Nota: «${q}»`,sub:`Nelle note di ${D.cc.workspace}`,dyn:'note'}];
    return {fan:[{title:'In tutte le sezioni',items:[...list,...dyn],none:!list.length}]};
  }
  const sec=D.cc.sections[s.sec];
  return {fan:[{title:sec.t,icon:sec.ic,items:sec.items,hint:sec.items.length?'':'Niente qui, per ora.'}]};
}
/* Ordine della tastiera. Fast a vuoto: gli 8 posti (anche liberi) poi il ventaglio; altrimenti solo il ventaglio. */
function flat(){
  if(!D)return [];
  if(s.mode==='cc')return ccLists().fan.flatMap(g=>g.items);
  const fan=fastLists().fan.flatMap(g=>g.items);
  return !s.q.trim()&&!s.edit&&has()?[...pageSlots().map((x,i)=>x||{type:'free',slot:s.page*8+i,title:'Posto '+(i+1)+' libero'}),...fan]:fan;
}
const current=()=>flat()[s.sel]||null;

/* Azioni del risultato: etichetta + cosa fa. Quelle "vere" le esegue il processo principale. */
function actions(x){
  if(!x)return [];
  const runMain=i=>()=>invoke('run',{id:x.id,action:i});
  if(s.mode==='cc'){
    if(x.dyn)return [{label:x.dyn==='search'?'Cerca':x.dyn==='ask'?'Chiedi':'Aggiungi la nota',run:()=>invoke('dyn',{type:x.dyn,text:s.q})}];
    return (x.actions||[]).map((label,i)=>({label,run:()=>invoke('cc',{id:x.id,action:i})}));
  }
  if(x.dyn)return [{label:x.dyn==='search'?'Cerca':'Chiedi a JARVIS',run:()=>invoke('dyn',{type:x.dyn,text:s.q})}];
  if(x.type==='browse')return [{label:x.kind==='folder'?'Scegli la cartella…':'Scegli il file…',run:()=>invoke('browse',{kind:x.kind,slot:s.edit?s.edit.slot:-1}).then(afterPut)}];
  if(s.edit)return [{label:`Metti nel ${slotName(s.edit.slot)}`,run:()=>invoke('put',{slot:s.edit.slot,id:x.id}).then(afterPut)}];
  if(x.type==='free')return [{label:'Aggiungi qui',run:()=>startEdit(x.slot)}];
  const main=(x.actions||[]).map((label,i)=>({label,run:x.confirm&&i===0?()=>{s.confirm=x;draw();}:runMain(i)}));
  if(x.suggest)return [...(has()?[{label:'Aggiungi al profilo',run:()=>invoke('add',{id:x.id})}]:[]),...main,{label:'Ignora',run:()=>invoke('ignore',{id:x.id})}];
  return main;
}
function afterPut(){
  if(!s.edit)return;
  s.q='';inputEl.value='';
  const here=pageSlots().findIndex(x=>!x);
  if(here>=0)s.edit.slot=s.page*8+here;
  s.sel=0;draw();
}

// ── Processo principale ──
async function invoke(op,args){
  let r;try{r=await API.invoke(op,args);}catch(error){r={ok:false,error:String(error)};}
  if(r&&r.toast)toast(r.toast,r.sub);
  else if(r&&r.ok===false&&r.error)toast('Non riuscito',r.error);
  return r;
}
function toast(msg,sub){s.toast={msg,sub};clearTimeout(toast.t);toast.t=setTimeout(()=>{s.toast=null;draw();},2800);draw();}
function run(x,ai=s.act){if(!x)return;const list=actions(x);const a=list[ai]||list[0];if(a)a.run();}
function createProfile(){return invoke('create',{ids:D.suggest.map(x=>x.id)}).then(r=>{if(r?.ok){s.page=0;startEdit(Math.max(0,slots().findIndex(x=>!x)));}});}
const slotName=g=>pages()>1?`posto ${g%8+1} dell’anello ${Math.floor(g/8)+1}`:`posto ${g+1}`;
/* Cambio di anello (pagina): l'anello gira di un ottavo nella direzione scelta. */
function goPage(n,{wrap=true}={}){
  const tot=pages();if(tot<2&&!s.edit)return;
  let to=wrap?(n+tot)%tot:Math.max(0,Math.min(tot-1,n));if(to===s.page)return;
  const dir=(to>s.page)!==(wrap&&Math.abs(to-s.page)>1&&tot>2)?'next':'prev';
  if(s.edit)s.edit.slot=to*8+s.edit.slot%8;
  s.page=to;s.sel=0;s.act=0;s.pageAnim=reduce.matches?null:dir;draw();
  clearTimeout(goPage.t);goPage.t=setTimeout(()=>{s.pageAnim=null;},320);
}
function addPage(){invoke('addPage').then(r=>{if(r?.ok&&Number.isInteger(r.page)){goPage(r.page,{wrap:false});if(s.edit)s.edit.slot=r.page*8;draw();}});}
function removePage(){const pg=s.page;invoke('removePage',{page:pg}).then(r=>{if(r?.ok){s.page=Math.max(0,Math.min(pg,pages()-1));if(s.edit)s.edit.slot=s.page*8;draw();}});}
/* Media: F7 indietro, F8 play/pausa, F9 avanti (sul primo, cioè quello che suona). */
function mediaCmd(m,cmd){if(m)invoke('media',{src:m.src,key:m.key,cmd});}
function startEdit(slot=0){
  if(!has()){createProfile();return;}
  s.mode='fast';const g=Math.max(0,Math.min(slots().length-1,slot));s.page=Math.floor(g/8);s.edit={slot:g};s.q='';inputEl.value='';s.sel=0;s.act=0;draw();inputEl.focus();
}
function endEdit(){s.edit=null;s.q='';inputEl.value='';s.sel=0;s.act=0;draw();}
function close(){API.invoke('hide');}

/* Giro dell'anello in due tempi: si chiude di taglio, cambia, si riapre. */
function setMode(m){
  if(!D||m===s.mode||s.phase)return;
  s.edit=null;
  const swap=()=>{s.mode=m;s.sel=0;s.act=0;s.q='';inputEl.value='';};
  if(reduce.matches){swap();draw();return;}
  const d=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--flip'))||420;
  s.phase='out';draw();
  setTimeout(()=>{swap();s.phase='in';draw();setTimeout(()=>{s.phase=null;draw();},d/2+260);},d/2);
}

function onKey(e){
  if(!D||s.leaving)return;
  // Un tasto scritto mentre il fuoco è su un pulsante (dopo un clic) va comunque nella ricerca.
  if(!e.ctrlKey&&!e.altKey&&!e.metaKey&&e.key.length===1&&document.activeElement!==inputEl&&!s.confirm)inputEl.focus({preventScroll:true});
  if(e.key==='F1'){e.preventDefault();setMode(s.mode==='cc'?'fast':'cc');return;}
  if(s.confirm){e.preventDefault();if(e.key==='Enter'){const x=s.confirm;s.confirm=null;invoke('run',{id:x.id,action:0});}else if(e.key==='Escape'){s.confirm=null;draw();}return;}
  if(e.key==='F2'){e.preventDefault();if(s.mode!=='fast')return;s.edit?endEdit():startEdit(s.page*8+(s.sel<8?s.sel:0));return;}
  if(e.key==='F7'||e.key==='F8'||e.key==='F9'){e.preventDefault();mediaCmd(media()[0],e.key==='F7'?'prev':e.key==='F8'?'toggle':'next');return;}
  if(s.mode==='fast'&&has()&&(e.key==='PageDown'||e.key==='PageUp')){e.preventDefault();goPage(s.page+(e.key==='PageDown'?1:-1));return;}
  const fl=flat(),n=fl.length,cur=current(),acts=actions(cur).length;
  if(s.edit){
    if(e.key==='Escape'){e.preventDefault();if(s.q){s.q='';inputEl.value='';draw();}else endEdit();return;}
    const base=s.page*8,step=d=>base+((s.edit.slot%8)+d+8)%8;
    if(e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();const i=s.edit.slot,j=step(e.key==='ArrowRight'?1:-1);s.edit.slot=j;invoke('swap',{slot:i,to:j});return;}
    if(!s.q&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();s.edit.slot=step(e.key==='ArrowRight'?1:-1);draw();return;}
    if(!s.q&&(e.key==='Delete'||e.key==='Backspace')){e.preventDefault();if(slots()[s.edit.slot])invoke('clear',{slot:s.edit.slot});return;}
  }
  if(s.mode==='fast'&&!s.edit&&!s.q&&/^[1-8]$/.test(e.key)&&!e.ctrlKey&&!e.altKey&&has()){e.preventDefault();const i=+e.key-1;s.sel=i;s.act=0;run(flat()[i],0);return;}
  if(s.mode==='fast'&&!s.q&&e.ctrlKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')&&has()){e.preventDefault();goPage(s.page+(e.key==='ArrowRight'?1:-1));return;}
  if(!s.q&&!s.edit&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();const d=e.key==='ArrowRight'?1:-1;
    if(s.mode==='fast'){if(has())s.sel=s.sel<8?(s.sel+d+8)%8:0;}else{s.sec=(s.sec+d+8)%8;s.sel=0;}s.act=0;draw();return;}
  if(e.key==='ArrowDown'){e.preventDefault();s.sel=(s.sel+1)%Math.max(1,n);s.act=0;draw();}
  else if(e.key==='ArrowUp'){e.preventDefault();s.sel=(s.sel-1+n)%Math.max(1,n);s.act=0;draw();}
  else if(e.key==='Tab'){e.preventDefault();if(acts)s.act=(s.act+(e.shiftKey?-1:1)+acts)%acts;draw();}
  else if(e.key==='Enter'){e.preventDefault();if(s.mode==='fast'&&!has()&&!s.q&&!s.edit&&!cur){createProfile();return;}run(cur,e.ctrlKey?1:s.act);}
  else if(e.key==='Escape'){e.preventDefault();if(s.act){s.act=0;draw();}else if(s.q){s.q='';inputEl.value='';s.sel=0;draw();}else close();}
}

// ── Disegno ──
function icon(x,big){
  if(x.type==='free')return `<span class="ic-b free${big?' big':''}">${I.plus}</span>`;
  if(x.type==='browse')return `<span class="ic-b${big?' big':''}" style="--c:var(--mc)">${I[x.kind==='folder'?'browse':'file']}</span>`;
  const c=s.mode==='cc'?'var(--acc)':'var(--mc)';
  if(x.icon)return `<span class="ic-b${big?' big':''}" style="--c:${c}"><img src="${esc(x.icon)}" alt="">${x.broken?'<i class="bad"></i>':''}</span>`;
  if(s.mode==='cc'&&x.kind)return `<span class="ic-b${big?' big':''}" style="--c:${c}">${I[CC_ICON[x.kind]||'site']}</span>`;
  const mono=x.type==='site'||x.type==='panel';
  return `<span class="ic-b${big?' big':''}" style="--c:${x.broken?'#ff6b6b':c}">${mono?`<b>${esc((String(x.title).match(/[A-Za-z0-9]/)||['·'])[0].toUpperCase())}</b>`:(I[x.type]||I.site)}${x.broken?'<i class="bad"></i>':''}</span>`;
}
const short=t=>String(t).split(' · ')[0];
function geometry(){
  const W=root.clientWidth,H=root.clientHeight,wide=W>=700;
  const R0=Math.round(Math.max(120,Math.min(240,wide?Math.min((H-180)/2,(W<1100?(W-380)/2.3:(W-430)/2.15)):Math.min((W-40)/2,(H-300)/2.2))));
  return {R:R0,Ri:Math.round(R0*.56),wide,mid:W<1100};
}
function ring(R,Ri){
  const fast=s.mode==='fast',N=8,step=360/N;
  const pt=(r,a)=>[R+r*Math.cos((a-90)*Math.PI/180),R+r*Math.sin((a-90)*Math.PI/180)];
  const gap=1.4;
  const path=(a0,a1)=>{const [x0,y0]=pt(R,a0),[x1,y1]=pt(R,a1),[x2,y2]=pt(Ri,a1),[x3,y3]=pt(Ri,a0);return `M${x0},${y0}A${R},${R} 0 0 1 ${x1},${y1}L${x2},${y2}A${Ri},${Ri} 0 0 0 ${x3},${y3}Z`;};
  const noProf=fast&&!has();
  const on=fast?(s.edit?(Math.floor(s.edit.slot/8)===s.page?s.edit.slot%8:-1):(!s.q&&s.sel<8?s.sel:-1)):s.sec;
  const ps=pageSlots();
  let segs='',labs='',arc='';
  for(let i=0;i<N;i++){
    const a=i*step,x=fast?ps[i]:null,sec=fast?null:D.cc.sections[i],isOn=i===on&&!noProf,free=fast&&!x;
    segs+=`<path class="seg${free?' free':''}${isOn?' on':''}${x?.broken?' broken':''}" style="--d:${i}" d="${path(a-step/2+gap,a+step/2-gap)}" data-seg="${i}"/>`;
    const [lx,ly]=pt((R+Ri)/2,a);
    const dup=x&&ps.some(y=>y&&y!==x&&short(y.title)===short(x.title));
    const inner=fast?(x?`${icon(x)}<span class="n">${esc(dup?x.title:short(x.title))}</span><kbd>${i+1}</kbd>`:`<span class="ic-b free">${I.plus}</span><span class="n">${noProf?'':'Libero'}</span>${noProf?'':`<kbd>${i+1}</kbd>`}`)
      :`${I[sec.ic]}<span class="n">${esc(sec.t)}</span><em>${sec.items.length}</em>`;
    labs+=`<div class="sl${isOn?' on':''}${free?' free':''}" style="left:${lx}px;top:${ly}px;--d:${i}">${inner}</div>`;
    if(isOn)arc=`<path class="arc" d="M${pt(R+8,a-step/2+5).join(',')}A${R+8},${R+8} 0 0 1 ${pt(R+8,a+step/2-5).join(',')}"/>`;
  }
  const cs=(Ri-10)*2;
  return `<div class="ring${s.edit?' editing':''}${s.pageAnim?' pg-'+s.pageAnim:''}" style="width:${2*R}px;height:${2*R}px"><svg viewBox="0 0 ${2*R} ${2*R}" width="${2*R}" height="${2*R}"><circle class="halo" cx="${R}" cy="${R}" r="${R+8}"/>${segs}${arc}</svg>${labs}
    <div class="core" style="width:${cs}px;height:${cs}px">${coreInner(cs)}</div></div>`;
}
function coreInner(cs){
  const cur=current(),fast=s.mode==='fast',f=fg();
  const head=`<span class="mode-name">${fast?I.bolt+(s.edit?'Modifica profilo':'Fast launcher'):I.spark+'Command center'}</span><span id="lxSlot"></span>`;
  let body='';
  if(fast&&!has())body=`<span class="who">${esc(f.app)} non ha un profilo</span><button class="core-btn" data-create>${I.plus}Crea il profilo</button>`;
  else if(!fast&&!D.cc.available)body=`<span class="who">VARCO non ha finestre aperte</span>`;
  else if(s.edit){const x=slots()[s.edit.slot];body=`<span class="who">${slotName(s.edit.slot).replace(/^p/,'P')} · ${x?esc(x.title):'libero'}</span>`;}
  else if(cur&&!s.q){body=`${cs>=210?`<span class="cur-ic">${icon(cur,true)}</span>`:''}<b class="cur">${esc(cur.title)}</b><span class="who">${esc(cur.type==='free'?'Invio per scegliere cosa metterci':cur.sub||'')}</span>`;}
  else body=`<span class="who">${fast?(f.key==='*'?'Generale · nessun programma in primo piano':esc(f.app)+' · profilo'):'Sezione · '+esc(D.cc.sections[s.sec].t)}</span>`;
  return head+`<div class="core-body">${body}</div>`;
}
function fan(){
  const groups=s.mode==='fast'?fastLists().fan:ccLists().fan;
  let k=s.mode==='fast'&&!s.q.trim()&&!s.edit&&has()?8:0;
  const f=fg();
  let head='';
  const pi=`<span class="pi">${f.icon?`<img src="${esc(f.icon)}" alt="">`:I[f.kind==='game'?'game':f.kind==='desk'?'desk':'app']}</span>`;
  const mediaBlock=!s.edit&&!s.q&&media().length?`<div class="media"><div class="lab">${I.music}In riproduzione <i>· F7 F8 F9</i></div>${media().slice(0,3).map((m,j)=>`<div class="mrow${m.playing?' on':''}"><button class="mart" data-mfocus="${j}" title="${m.src==='varco'?'Vai alla scheda':esc(m.from)}">${m.artwork?`<img src="${esc(m.artwork)}" alt="">`:I.music}</button><div class="t"><b>${esc(m.title)}</b><span>${esc(m.sub)}</span></div><div class="mbtn">${m.prev?`<button data-m="${j}:prev" title="Indietro (F7)">${I.prev}</button>`:''}<button class="pp" data-m="${j}:toggle" title="Play/pausa (F8)">${m.playing?I.pause:I.play}</button>${m.next?`<button data-m="${j}:next" title="Avanti (F9)">${I.next}</button>`:''}</div></div>`).join('')}</div>`:'';
  if(s.mode==='fast'&&s.edit)head=`<div class="prof edit">${pi}<div><b>Profilo · ${esc(f.app)}</b><span>${f.key==='*'?'Vale sul desktop e quando non c’è un programma con un profilo':`Si attiva quando <code>${esc(f.exe)}</code> è in primo piano`}</span></div><button class="pbtn" data-done>${I.check}Fatto</button></div>
    <div class="edit-help"><span><kbd>←</kbd><kbd>→</kbd> scegli il posto</span><span><kbd>Alt</kbd>+<kbd>←</kbd><kbd>→</kbd> spostalo</span><span><kbd>Canc</kbd> svuota</span><span><kbd>PagSu</kbd><kbd>PagGiù</kbd> anello</span><span>Scrivi per cercare</span></div>
    <div class="pg-tools"><span>Anello ${s.page+1} di ${pages()}</span>${pages()<R.MAX_PAGES?`<button class="pbtn" data-addpage>${I.plus}Nuovo anello</button>`:''}${pages()>1?`<button class="pbtn" data-rmpage>Togli questo anello</button>`:''}</div>`;
  else if(s.mode==='fast'&&!s.q)head=`<div class="prof">${pi}<div><b>${esc(f.app)}</b><span>${f.key==='*'?'Nessun programma in primo piano: fast link generali':has()?'In primo piano · '+slots().filter(Boolean).length+' fast link sull’anello':'In primo piano · ancora senza profilo'}</span></div>${has()?`<button class="pbtn" data-edit title="F2">${I.edit}Modifica</button>`:`<button class="pbtn solid" data-create>${I.plus}Crea il profilo</button>`}</div>`;
  else if(s.mode==='cc'&&!D.cc.available)head=`<div class="offline"><b>Il Command center lavora sulle finestre di VARCO</b><span>Apri VARCO e ritrovi qui schede, progetti, comandi e JARVIS.</span><button data-varco>Apri VARCO</button></div>`;
  head=mediaBlock+head;
  const body=groups.map(g=>`<div class="lab">${g.icon?I[g.icon]:''}${esc(g.title)}${g.note?` <i>· ${esc(g.note)}</i>`:''}</div>${g.none?`<div class="none"><b>Niente per «${esc(s.q.trim())}»</b><span>${s.mode==='fast'?'Né nei profili, né in VARCO, né tra le app.':'In nessuna sezione di VARCO.'} Puoi cercarlo sul web o chiederlo a JARVIS.</span></div>`:''}${g.hint?`<div class="none"><span>${esc(g.hint)}</span></div>`:''}
    ${g.items.map(x=>{const i=k++;return `<div class="item${i===s.sel?' sel':''}${x.suggest?' sug':''}${x.off?' off':''}" data-i="${i}" role="option" aria-selected="${i===s.sel}">${icon(x)}<div class="t"><b class="${x.broken?'bad-t':''}">${esc(x.title)}</b><span>${esc(x.reason||(x.from&&s.q?x.from+' · '+x.sub:x.sub))}</span></div>${x.suggest?'<span class="tag">Suggerito</span>':''}${x.confirm?'<span class="tag warn">eseguibile</span>':''}${x.keys?`<kbd>${esc(x.keys)}</kbd>`:''}</div>`;}).join('')}
    ${s.edit&&!g.items.length?'<div class="none"><span>Niente da aggiungere: scrivi per cercare tra siti, app, file e progetti.</span></div>':''}`).join('');
  return `<div class="fan" role="listbox" aria-label="Risultati">${head}${body}</div>`;
}
function bar(){
  const cur=current(),fast=s.mode==='fast';
  const acts=cur?actions(cur).map((a,j)=>`<button class="act${j===s.act?' on':''}" data-a="${j}">${esc(a.label)}</button>`).join(''):'';
  const keys=s.edit?`<span><kbd>Invio</kbd> metti</span><span><kbd>Esc</kbd> fatto</span>`
    :`<span>${esc(D.hotkey)} · ${fast?'Command center':'Fast launcher'}</span>${fast&&!has()?'':`<span><kbd>←</kbd><kbd>→</kbd> ${fast?'anello':'sezioni'}</span>`}${fast&&has()?'<span><kbd>1</kbd>–<kbd>8</kbd> apri</span>'+(pages()>1?'<span><kbd>PagSu</kbd><kbd>PagGiù</kbd> anelli</span>':'')+'<span><kbd>F2</kbd> modifica</span>':''}<span><kbd>Tab</kbd> azioni</span><span><kbd>Esc</kbd> chiudi</span>`;
  return `<div class="bar">${acts?`<div class="acts">${acts}</div>`:''}<div class="keys">${keys}</div></div>`;
}
function switcher(){return `<div class="switch" role="tablist"><button role="tab" aria-selected="${s.mode==='fast'}" data-mode="fast" class="${s.mode==='fast'?'on':''}">${I.bolt}<span>Fast launcher</span></button><button role="tab" aria-selected="${s.mode==='cc'}" data-mode="cc" class="${s.mode==='cc'?'on':''}">${I.spark}<span>Command center</span></button><kbd class="sw-k">${esc(D.hotkey)}</kbd></div>`;}
function overlays(){
  let h='';
  if(s.confirm)h+=`<div class="confirm" role="alertdialog"><div class="box">${I.warn}<b>Avviare ${esc(s.confirm.title)}?</b><span>È un file eseguibile. Il launcher lo avvia solo se confermi.</span><div class="row"><button class="go" data-cf="1">Avvia <kbd>Invio</kbd></button><button data-cf="0">Annulla <kbd>Esc</kbd></button></div></div></div>`;
  if(s.drag)h+=`<div class="dropz">${I.drop}<b>Rilascia per aggiungerlo a ${esc(fg().app)}</b><span>File, cartelle o collegamenti · un eseguibile chiederà conferma all’avvio</span></div>`;
  return h;
}

function draw(){
  if(!root||!D||!s.open||s.leaving)return;
  const n=flat().length;if(s.sel>=n)s.sel=Math.max(0,n-1);
  const el=inputEl,focused=s.first||document.activeElement===el||document.activeElement===document.body,a=el.selectionStart,b=el.selectionEnd;
  const {R:Rr,Ri,wide,mid}=geometry();
  const mc=s.mode==='fast'?(fg().color||'var(--acc)'):'var(--acc)';
  root.querySelector('#ui').innerHTML=`<div class="veil${D.game?' game':''}"></div>
    <div class="lx M-${s.mode}${wide?'':' narrow'}${mid?' mid':''}${s.first?' enter':''}${s.phase?' ph-'+s.phase:''}${s.edit?' is-edit':''}" style="--mc:${mc}">${switcher()}<div class="stage">${ring(Rr,Ri)}${s.mode==='fast'&&has()&&(pages()>1||s.edit)?`<div class="pages">${Array.from({length:pages()},(_,i)=>`<button class="pg${i===s.page?' on':''}" data-page="${i}" title="Anello ${i+1}"></button>`).join('')}${s.edit&&pages()<R.MAX_PAGES?`<button class="pg add" data-addpage title="Nuovo anello">+</button>`:''}</div>`:''}</div>${fan()}${bar()}</div>`+overlays()+
    (s.toast?`<div class="toast" role="status"><b>${esc(s.toast.msg)}</b>${s.toast.sub?`<span>${esc(s.toast.sub)}</span>`:''}</div>`:'');
  const slot=root.querySelector('#lxSlot');
  if(slot){slot.replaceWith(el);el.placeholder=s.edit?`Cerca per il posto ${s.edit.slot+1}`:s.mode==='fast'?(has()?'Cerca, o premi 1–8':'Cerca'):'Cerca in VARCO';
    if(focused&&!s.confirm){el.focus({preventScroll:true});if(!s.first&&a!==null)try{el.setSelectionRange(a,b);}catch{}}}
  if(s.first){s.first=false;setTimeout(()=>root.querySelector('.lx')?.classList.remove('enter'),700);}
  bind();
}
function bind(){
  const $=q=>root.querySelectorAll(q),el=inputEl;
  $('[data-mode]').forEach(b=>b.onclick=()=>{setMode(b.dataset.mode);el.focus();});
  $('[data-edit]').forEach(b=>b.onclick=()=>startEdit(s.sel<8?s.sel:0));
  $('[data-done]').forEach(b=>b.onclick=endEdit);
  $('[data-create]').forEach(b=>b.onclick=createProfile);
  $('[data-varco]').forEach(b=>b.onclick=()=>invoke('openVarco'));
  $('[data-page]').forEach(b=>b.onclick=()=>goPage(+b.dataset.page,{wrap:false}));
  $('[data-addpage]').forEach(b=>b.onclick=addPage);
  $('[data-rmpage]').forEach(b=>b.onclick=removePage);
  $('[data-m]').forEach(b=>b.onclick=e=>{e.stopPropagation();const [j,cmd]=b.dataset.m.split(':');mediaCmd(media()[+j],cmd);});
  $('[data-mfocus]').forEach(b=>b.onclick=()=>{const m=media()[+b.dataset.mfocus];if(m?.src==='varco')mediaCmd(m,'focus');});
  root.querySelector('.stage')?.addEventListener('wheel',e=>{if(s.mode!=='fast'||!has()||pages()<2)return;e.preventDefault();if(Math.abs(e.deltaY)<8)return;const now=Date.now();if(now-(bind.wheelAt||0)<260)return;bind.wheelAt=now;goPage(s.page+(e.deltaY>0?1:-1));},{passive:false});
  $('[data-i]').forEach(nd=>{nd.onclick=()=>{s.sel=+nd.dataset.i;s.act=0;run(current(),0);};nd.onmousemove=()=>{if(s.sel!==+nd.dataset.i){s.sel=+nd.dataset.i;s.act=0;draw();}};});
  $('[data-a]').forEach(nd=>nd.onclick=e=>{e.stopPropagation();s.act=+nd.dataset.a;run(current());});
  $('[data-seg]').forEach(g=>{const i=+g.dataset.seg;
    g.onclick=()=>{if(s.mode==='cc'){s.sec=i;s.sel=0;s.act=0;draw();return;}if(!has()){createProfile();return;}if(s.edit){s.edit.slot=s.page*8+i;draw();return;}const x=pageSlots()[i];if(!x){startEdit(s.page*8+i);return;}s.sel=i;run(x,0);};
    g.onmousemove=()=>{if(s.mode==='fast'&&!s.edit&&has()&&!s.q&&s.sel!==i){s.sel=i;s.act=0;draw();}};});
  $('[data-cf]').forEach(b=>b.onclick=()=>{const x=s.confirm;s.confirm=null;if(b.dataset.cf==='1')invoke('run',{id:x.id,action:0});else draw();});
  root.querySelector('.veil')?.addEventListener('click',close);
}

function applyTheme(){
  const r=document.documentElement.style;
  r.setProperty('--acc',D.accent);r.setProperty('--acc-rgb',D.accentRgb);
}
function start(){
  root=document.getElementById('app');root.innerHTML='<div id="ui"></div>';
  inputEl=document.createElement('input');inputEl.className='lx-input';inputEl.autocomplete='off';inputEl.spellcheck=false;inputEl.setAttribute('aria-label','Cerca');
  inputEl.addEventListener('input',()=>{s.q=inputEl.value;s.sel=0;s.act=0;draw();});
  document.addEventListener('keydown',onKey);
  let rz;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(draw,60);});
  let dc=0;
  addEventListener('dragenter',e=>{e.preventDefault();dc++;if(!s.drag){s.drag=true;draw();}});
  addEventListener('dragleave',()=>{if(--dc<=0){dc=0;s.drag=false;draw();}});
  addEventListener('dragover',e=>e.preventDefault());
  addEventListener('drop',e=>{e.preventDefault();dc=0;s.drag=false;const paths=[...(e.dataTransfer.files||[])].map(f=>API.pathOf(f)).filter(Boolean);
    if(paths.length)invoke('drop',{paths});else draw();});
  API.on('launcher:open',snap=>{D={...snap,media:[]};applyTheme();Object.assign(s,{open:true,mode:snap.mode||'fast',q:'',sel:0,act:0,sec:0,edit:null,confirm:null,phase:null,first:true,toast:null,drag:false,page:0,pageAnim:null,leaving:false});inputEl.value='';draw();});
  API.on('launcher:refresh',snap=>{D={...snap,mode:s.mode,game:D?.game,media:D?.media||[]};if(s.page>=pages())s.page=pages()-1;draw();});
  API.on('launcher:media',list=>{if(!D)return;const before=JSON.stringify(D.media||[]);D.media=Array.isArray(list)?list:[];if(before!==JSON.stringify(D.media)&&!s.leaving)draw();});
  /* Chiusura: l'animazione inversa a quella di entrata (settori, centro e ventaglio escono al contrario). */
  API.on('launcher:leave',()=>{s.leaving=true;s.confirm=null;root.querySelector('.lx')?.classList.add('leave');root.querySelector('.veil')?.classList.add('leave');root.querySelector('.toast')?.remove();});
  API.on('launcher:pool',pool=>{if(D){D.pool=pool;if(s.q||s.edit)draw();}});
  API.on('launcher:switch',()=>setMode(s.mode==='fast'?'cc':'fast'));
  API.on('launcher:close',()=>{s.open=false;s.leaving=false;s.confirm=null;s.edit=null;root.querySelector('#ui').innerHTML='';});
}
start();
})();
