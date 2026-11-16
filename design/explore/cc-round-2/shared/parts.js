/* Round 2 — pezzi comuni: anello (dalla V3) e bacheca (dalla V4). */
window.P=(()=>{
const {m,I,esc}=CC;
const ORDER=['now','tabs','projects','links','commands','web','jarvis','create'];

/* Indice di ogni risultato nell'ordine della tastiera (lo stesso di CC.flat()). */
function indexer(gs){const map=new Map();let k=0;gs.forEach(g=>{if(!g.collapsed)g.shown.forEach((x,i)=>map.set(g.id+':'+i,k++));});return (g,i)=>map.get(g.id+':'+i);}

/* ── Anello ── */
function ring({R=230,RI=128,gs,cur,small=false,core='',arcs=true}){
  const step=360/ORDER.length,GAP=1.6;
  const pt=(r,a)=>[R+r*Math.cos((a-90)*Math.PI/180),R+r*Math.sin((a-90)*Math.PI/180)];
  const path=(a0,a1,r0,r1)=>{const [x0,y0]=pt(r1,a0),[x1,y1]=pt(r1,a1),[x2,y2]=pt(r0,a1),[x3,y3]=pt(r0,a0);
    return `M${x0},${y0}A${r1},${r1} 0 0 1 ${x1},${y1}L${x2},${y2}A${r0},${r0} 0 0 0 ${x3},${y3}Z`;};
  const curG=cur?.group;
  const segs=ORDER.map((id,i)=>{const g=gs.find(g=>g.id===id),s=CC.SEC.find(s=>s.id===id);const [lx,ly]=pt((R+RI)/2+3,i*step);
    return `<g class="rg-seg${g?'':' empty'}${id===curG?' on':''}" data-seg="${id}"><path d="${path(i*step-step/2+GAP,i*step+step/2-GAP,RI,R)}"/></g>`;}).join('');
  const labs=ORDER.map((id,i)=>{const g=gs.find(g=>g.id===id),s=CC.SEC.find(s=>s.id===id);const [lx,ly]=pt((R+RI)/2+3,i*step);
    return `<div class="rg-lab${id===curG?' on':''}" style="left:${lx}px;top:${ly}px">${I[s.icon]}<span>${s.title}</span><span class="n">${g?g.items.length:'—'}</span></div>`;}).join('');
  const ci=ORDER.indexOf(curG);
  const arc=arcs&&ci>=0?`<path class="rg-arc" d="M${pt(R+7,ci*step-step/2+5).join(',')}A${R+7},${R+7} 0 0 1 ${pt(R+7,ci*step+step/2-5).join(',')}"/>`:'';
  const cs=(RI-8)*2;
  return `<div class="rg${small?' small':''}" style="width:${2*R}px;height:${2*R}px"><svg viewBox="0 0 ${2*R} ${2*R}" width="${2*R}" height="${2*R}">${segs}${arc}</svg>${labs}
    <div class="rg-core" style="width:${cs}px;height:${cs}px">${core}</div></div>`;
}
/* Clic su un settore: va al primo risultato di quella sezione. */
function bindRing(root){
  root.querySelectorAll('[data-seg]').forEach(s=>s.onclick=()=>goSection(s.dataset.seg));
}
function goSection(id){const i=CC.flat().findIndex(x=>x.group===id);if(i>=0){m.sel=i;m.act=0;CC.update();}}
/* ← → tra le sezioni nell'ordine dell'anello. */
function stepSection(dir){
  const f=CC.flat();const present=ORDER.filter(id=>f.some(x=>x.group===id));if(!present.length)return;
  const i=present.indexOf(f[m.sel]?.group);goSection(present[(i+dir+present.length)%present.length]);
}

/* ── Bacheca ── */
const GROUPS=[['Sviluppo','#00e5ff'],['Destiny','#ffb648'],['Unity','#9c8cff'],['Musica','#1ed760']];
function board({gs,tiles=true,focus=null,only=null,cols=3}){
  const ix=indexer(gs);
  const nowG=gs.find(g=>g.id==='now');
  const row=(x,i,g)=>{const idx=ix(g,i);return `${i===g.split?'<div class="bd-split">Altri workspace</div>':''}<div class="bd-r${idx===m.sel?' sel':''}${x.off?' cc-off':''}" data-i="${idx}">${CC.icon(x)}<div class="t"><b>${esc(x.title)}</b>${x.sub?`<span>${esc(x.sub)}</span>`:''}</div>${x.ws!==CC.ACTIVE?`<span class="cc-ws" style="--w:${CC.WS[x.ws]}"></span>`:''}${x.key?`<kbd>${x.key}</kbd>`:''}</div>`;};
  const tileHtml=nowG&&tiles&&!nowG.collapsed?`<div class="bd-lab">${I.bolt}${nowG.title}${m.q?'':' · '+CC.ACTIVE}</div><div class="bd-now" style="--tiles:${Math.max(5,nowG.shown.length)}">${nowG.shown.map((x,i)=>{const idx=ix(nowG,i);
    return `<button class="bd-tile${idx===m.sel?' sel':''}" data-i="${idx}">${x.site?CC.thumb(x.site,x.title):`<div class="big">${I[x.kind==='server'?'server':x.kind==='project'?'folder':'cmd']}</div>`}<b>${esc(x.title)}</b><span>${esc(x.sub||'')}</span></button>`;}).join('')}</div>`:'';
  const cards=gs.filter(g=>(tiles?g.id!=='now':true)&&(!only||only.includes(g.id))).map(g=>{
    let inner='';
    if(!g.collapsed){
      if(g.id==='create'&&!m.q)inner=`<div class="bd-grid6">${g.shown.map((x,i)=>row(x,i,g)).join('')}</div>`;
      else if(g.id==='jarvis')inner=`<div class="bd-ask">${I.spark}${m.q?esc(CC.parse().raw):'Chiedi qualcosa, o scrivi «?» nella barra…'}<span class="mic">${I.mic}</span></div>${g.shown.map((x,i)=>row(x,i,g)).join('')}`;
      else inner=(g.id==='links'?`<div class="bd-groups">${GROUPS.map(([n,c])=>`<i style="--c:${c}">${n}</i>`).join('')}</div>`:'')+g.shown.map((x,i)=>row(x,i,g)).join('');
      if(g.more)inner+=`<button class="bd-more" data-expand="${g.id}">Mostra tutti (${g.items.length})</button>`;
    }
    return `<section class="bd-card${g.collapsed?' closed':''}${g.id==='jarvis'?' bd-j':''}${focus===g.id?' focus':''}" data-card="${g.id}"><button class="bd-ch" data-toggle="${g.id}">${I[g.icon]}<b>${g.title}</b><span class="n">${g.items.length}</span>${g.prefix?`<kbd>${esc(g.prefix.trim())}</kbd>`:''}${I.down.replace('class="ic"','class="ic tog"')}</button>${inner}</section>`;
  }).join('');
  return `${tileHtml}${cards?`<div class="bd-cards${focus?' dim':''}" style="--cols:${cols}">${cards}</div>`:''}`;
}
const empty=()=>`<div class="cc-empty"><b>Nessun risultato per «${esc(m.q)}»</b>Nessuna scheda, progetto o comando. Prova «? ${esc(m.q)}» per chiederlo a Jarvis.</div>`;
function actionBar(cur){
  if(!cur)return '';
  return `<div class="bd-bar"><span class="who">${CC.icon(cur)}${esc(cur.title)}</span><span class="sep"></span>${cur.actions.map((a,j)=>`<button class="cc-act${j===m.act?' on':''}" data-a="${j}">${a}</button>`).join('')}<span class="sep"></span><span class="cc-hint"><span><kbd>Tab</kbd></span><span><kbd>Invio</kbd></span></span></div>`;
}
/* Passaggio del mouse: anteprima in un riquadro accanto al risultato. */
let popAt=null;
const NO_PV=['create','jarvis','jsum','jsave'];
function pop(){return m.hover&&popAt&&!NO_PV.includes(m.hover.kind)?`<div class="bd-pop" style="left:${popAt.x}px;top:${popAt.y}px">${CC.preview(m.hover)}</div>`:'';}
function bindBoard(root,{onClickItem}={}){
  root.querySelectorAll('[data-i]').forEach(r=>{const x=CC.flat()[+r.dataset.i];
    r.onmouseenter=()=>{const b=r.getBoundingClientRect();const x0=b.right+10+300>innerWidth?b.left-310:b.right+10;popAt={x:Math.max(8,x0),y:Math.max(8,Math.min(b.top,innerHeight-330))};CC.hover(x);};
    r.onmouseleave=()=>CC.hover(null);
    r.onclick=e=>{m.sel=+r.dataset.i;m.act=0;if(onClickItem)onClickItem(x,e);else{CC.run(x,0);CC.update();}};});
  root.querySelectorAll('.bd-bar [data-a]').forEach(b=>b.onclick=()=>{const cur=CC.current();m.act=+b.dataset.a;CC.run(cur,m.act);CC.update();});
}
/* Mantiene lo scorrimento tra un disegno e l'altro e mostra il risultato scelto. */
function keepScroll(root,sel,fn){const old=root.querySelector(sel);const top=old?old.scrollTop:0;fn();const nw=root.querySelector(sel);if(nw){nw.scrollTop=top;nw.querySelector('.sel')?.scrollIntoView({block:'nearest'});}}
return {ORDER,ring,bindRing,goSection,stepSection,board,bindBoard,actionBar,pop,empty,keepScroll,indexer};
})();
