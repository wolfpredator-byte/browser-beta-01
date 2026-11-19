'use strict';

/**
 * Pagina del progetto (Beta 0.43.2), senza Electron: forma della tela salvata in <progetto>/.varco/pagina.json.
 * La tela ha riquadri messi dove vuoi, fili che li collegano, aree che li raggruppano e le attività.
 * Note in .varco/note.md, immagini in .varco/screenshot/. Tutto viaggia con la cartella (e con git).
 */

const VERSION=1;
/** Riquadri unici (uno per pagina) e riquadri che puoi creare quanti ne vuoi. */
const SINGLE=['hero','tasks','shots','files','stream','notes','res'];
const MULTI=['note','shot','link','file','timer'];
const TILE_TYPES=[...SINGLE,...MULTI];
const SIZES={hero:[768,576],tasks:[336,504],shots:[624,408],files:[432,360],stream:[336,312],notes:[432,288],res:[336,384],
  note:[312,216],shot:[456,312],link:[336,240],file:[312,144],timer:[336,192]};
/** Colori dei fili e delle aree: indici di una tavolozza che segue il tema (accento, secondo, riuscito, attenzione, errore). */
const COLORS=5;
const TAGS=['Bug','UI','Codice','Arte','Build','Altro'];
const LIMITS={tiles:200,links:400,areas:40,tasks:300,text:20000,label:60,title:80,coord:200000};
const SHOT_EXT=['.png','.jpg','.jpeg','.webp','.gif'];
const MAX_SHOT_BYTES=20*1024*1024;

const num=(v,d=0)=>Number.isFinite(v)?Math.max(-LIMITS.coord,Math.min(LIMITS.coord,Math.round(v))):d;
const str=(v,max)=>typeof v==='string'?v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').slice(0,max):'';
const color=v=>Number.isInteger(v)&&v>=0&&v<COLORS?v:0;
const idOk=id=>typeof id==='string'&&(SINGLE.includes(id)||/^[a-z]+-\d{1,6}$/.test(id)&&MULTI.includes(id.split('-')[0]));
const typeOf=id=>id.split('-')[0];
/** Percorso relativo dentro il progetto: niente risalite né percorsi assoluti. */
function safeRel(rel){
  if(typeof rel!=='string')return '';
  const r=rel.replace(/\\/g,'/').replace(/^\/+/,'');
  if(!r||r.length>400||/^[a-z]:/i.test(r)||r.split('/').some(p=>p==='..'))return '';
  return r;
}
/** Nome di un file in .varco/screenshot: solo il nome, estensione d'immagine. */
function safeShotName(name){
  if(typeof name!=='string')return '';
  const base=name.replace(/\\/g,'/').split('/').pop().replace(/[<>:"|?*\u0000-\u001f]/g,'_').trim().slice(0,120);
  const ext=(base.match(/\.[a-z0-9]+$/i)||[''])[0].toLowerCase();
  return base&&SHOT_EXT.includes(ext)&&!base.startsWith('.')?base:'';
}
const safeUrl=u=>typeof u==='string'&&/^https?:\/\//i.test(u)&&u.length<=2000?u:'';

/** Timer: conto alla rovescia (secs) oppure «fino a» un giorno della settimana e un'ora (es. reset settimanale). */
function normalizeTimer(t){
  const mode=t?.mode==='until'?'until':'down',secs=Math.max(1,Math.min(86400,Math.round(Number(t?.secs)||300)));
  const out={label:str(t?.label,40)||'Timer',mode,secs,left:Math.max(0,Math.min(secs,Number.isFinite(t?.left)?t.left:secs)),run:t?.run===true&&mode==='down'};
  if(out.run&&Number.isFinite(t?.at))out.at=t.at;
  if(mode==='until'){out.day=Number.isInteger(t?.day)&&t.day>=0&&t.day<7?t.day:2;out.hour=Number.isInteger(t?.hour)&&t.hour>=0&&t.hour<24?t.hour:18;}
  return out;
}
function normalizeTile(id,t){
  const type=typeOf(id),[w0,h0]=SIZES[type];
  const out={x:num(t?.x),y:num(t?.y),w:Math.max(216,Math.min(2400,num(t?.w,w0))),h:Math.max(96,Math.min(2400,num(t?.h,h0)))};
  if(type==='note')out.text=str(t?.text,LIMITS.text);
  if(type==='shot')out.shot=safeShotName(t?.shot);
  if(type==='link'){out.title=str(t?.title,LIMITS.title)||'Link';out.url=safeUrl(t?.url);}
  if(type==='file')out.rel=safeRel(t?.rel);
  if(type==='timer')out.timer=normalizeTimer(t?.timer);
  return out;
}

/** Controlla quello che arriva da disco o dalla cornice: valori fuori misura sistemati, il resto scartato. */
function normalizePage(raw){
  const p=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const tiles={};
  for(const [id,t] of Object.entries(p.tiles&&typeof p.tiles==='object'?p.tiles:{}).slice(0,LIMITS.tiles))
    if(idOk(id))tiles[id]=normalizeTile(id,t);
  const seen=new Set(),links=[];
  for(const l of Array.isArray(p.links)?p.links:[]){
    if(links.length>=LIMITS.links)break;
    if(!l||!tiles[l.a]||!tiles[l.b]||l.a===l.b)continue;
    const key=[l.a,l.b].sort().join('|');if(seen.has(key))continue;seen.add(key);
    links.push({a:l.a,b:l.b,t:str(l.t,LIMITS.label),c:color(l.c)});
  }
  const areas={};
  for(const [id,a] of Object.entries(p.areas&&typeof p.areas==='object'?p.areas:{}).slice(0,LIMITS.areas)){
    if(!/^area-\d{1,6}$/.test(id))continue;
    areas[id]={x:num(a?.x),y:num(a?.y),w:Math.max(200,Math.min(8000,num(a?.w,600))),h:Math.max(140,Math.min(8000,num(a?.h,400))),t:str(a?.t,LIMITS.label)||'Area',c:color(a?.c)};
  }
  const tasks=(Array.isArray(p.tasks)?p.tasks:[]).slice(0,LIMITS.tasks).filter(t=>t&&str(t.t,300).trim())
    .map(t=>({t:str(t.t,300).trim(),tag:str(t.tag,24).trim()||'Altro',done:t.done===true,...(Number.isFinite(t.doneAt)&&t.done===true?{doneAt:t.doneAt}:{}),
      // Beta 0.44: screenshot allegati all'attività (nomi di file nella cartella delle immagini)
      ...(Array.isArray(t.shots)&&t.shots.some(safeShotName)?{shots:t.shots.map(safeShotName).filter(Boolean).slice(0,20)}:{})}));
  const ids=[...Object.keys(tiles),...Object.keys(areas)].map(id=>Number((id.match(/-(\d+)$/)||[])[1]||0));
  return {version:VERSION,n:Math.max(Number.isInteger(p.n)?p.n:0,...ids,0),tiles,links,areas,tasks,
    cover:safeShotName(p.cover),view:p.view&&Number.isFinite(p.view.z)?{x:num(p.view.x),y:num(p.view.y),z:Math.max(.25,Math.min(1.6,p.view.z))}:null};
}

/**
 * Disposizione della prima volta: i riquadri del progetto in ordine, un'area «Lavoro» e un filo
 * fra lo stato e la cronologia. Poi l'utente sposta e collega come vuole.
 */
function defaultPage(){
  return normalizePage({n:2,
    tiles:{hero:{x:96,y:144},tasks:{x:960,y:144},stream:{x:960,y:744},files:{x:1416,y:144},notes:{x:96,y:816},shots:{x:624,y:816},res:{x:1416,y:600}},
    areas:{'area-1':{x:48,y:96,w:1296,h:1176,t:'Lavoro',c:0}},
    links:[{a:'hero',b:'stream',t:'eventi',c:0},{a:'tasks',b:'files',t:'',c:1}],
    tasks:[]});
}

/** Testo da salvare su disco: leggibile, così i cambi si vedono bene anche in git. */
const serialize=page=>JSON.stringify(normalizePage(page),null,1)+'\n';

module.exports={normalizeTimer,VERSION,SINGLE,MULTI,TILE_TYPES,SIZES,TAGS,COLORS,LIMITS,MAX_SHOT_BYTES,normalizePage,defaultPage,serialize,safeRel,safeShotName,safeUrl,typeOf};
