/* Kit condiviso degli esempi del lettore multimediale (round 1).
   Dati finti ma realistici, simulazione dei comandi, cornice di VARCO finta, barra degli stati.
   Ogni variante chiama Media.start({renderMini, renderPanel}) e disegna mini-lettore e pannello a modo suo. */
(function(){
const TRACKS=[
  {title:'Luci sul porto',subtitle:'Nora Vale · Marea',duration:221,art:['#ff7a59','#7b2ff7']},
  {title:'Treni di notte',subtitle:'Kairo & Sole · Binario 9',duration:252,art:['#1fd1b9','#123c69']},
  {title:'Vetro freddo',subtitle:'Lumen Drift · Superfici',duration:185,art:['#8fd3ff','#2b2d42']},
  {title:'Settembre lento',subtitle:'Nora Vale · Marea',duration:302,art:['#ffd166','#ef476f']}
];
const BASE={
  spotify:()=>({key:'spotify',source:'spotify',kind:'panel',site:'open.spotify.com',workspace:'Personale',where:'Pannello web',
    ...TRACKS[0],track:0,position:64,playing:true,muted:false,shuffle:false,repeat:'off',video:false,pip:false,live:false}),
  youtube:()=>({key:'youtube',source:'youtube',kind:'tab',site:'youtube.com',workspace:'Gaming',where:'Scheda',
    title:'Montare un PC da gaming nel 2026: guida completa passo per passo',subtitle:'Officina Hardware',duration:1104,position:412,
    playing:false,muted:false,video:true,pip:false,live:false,art:['#ff3b3b','#2a0a0a']}),
  whatsapp:()=>({key:'whatsapp',source:'whatsapp',kind:'panel',site:'web.whatsapp.com',workspace:'Personale',where:'Pannello web',
    title:'Messaggio vocale di Marco',subtitle:'Gruppo "Raid del giovedì"',duration:47,position:12,playing:false,muted:false,video:false,pip:false,live:false,art:['#25d366','#0b3d2e']}),
  live:()=>({key:'live',source:'live',kind:'tab',site:'twitch.tv',workspace:'Gaming',where:'Scheda',
    title:'Raid notturno, tentativo 14',subtitle:'lunaplays · in diretta',duration:0,position:0,playing:true,muted:true,video:true,pip:false,live:true,art:['#9146ff','#1b0b3a']}),
  widget:()=>({key:'widget',source:'radio',kind:'widget',site:'radio-studio.it',workspace:'Lavoro',where:'Widget della Home',
    title:'Radio studio 24/7',subtitle:'Musica per concentrarsi',duration:0,position:0,playing:false,muted:false,video:false,pip:false,live:true,art:['#f4a261','#264653']})
};
const LONG={title:'Recensione onesta dopo sei mesi di uso quotidiano: pregi, difetti, batteria, schermo, fotocamera e tutto quello che nessuno ti dice prima di comprarlo',subtitle:'Un canale con un nome davvero molto lungo che non entra da nessuna parte · 1,2 Mln di iscritti'};
const SCENARIOS={
  normale:()=>[BASE.spotify(),{...BASE.youtube(),playing:true},BASE.whatsapp()],
  youtube:()=>[{...BASE.youtube(),playing:true}],
  molti:()=>{
    const list=[BASE.spotify(),BASE.youtube(),BASE.whatsapp(),BASE.live(),BASE.widget()];
    const extra=['Podcast: storie di montagna, ep. 41','Lezione di chitarra 7 — accordi aperti','Trailer ufficiale — versione estesa','Documentario: le città sotto il mare','Allenamento 30 minuti senza attrezzi','Notiziario delle 13','Corso Rust, capitolo 12'];
    extra.forEach((title,i)=>list.push({key:'x'+i,source:'video',kind:'tab',site:['podcast.it','youtube.com','vimeo.com','raiplay.it','youtube.com','rainews.it','youtube.com'][i],
      workspace:['Personale','Lavoro','Gaming','Personale','Personale','Lavoro','Lavoro'][i],where:'Scheda',title,subtitle:'Pausa',duration:600+i*300,position:120+i*40,
      playing:false,muted:false,video:i!==0,pip:false,live:false,art:[['#e76f51','#2a9d8f','#e9c46a','#3a86ff','#8338ec','#06d6a0','#ff006e'][i],'#111']}));
    return list;
  },
  lunghi:()=>[{...BASE.youtube(),...LONG,playing:true},{...BASE.spotify(),title:'Un titolo di canzone lunghissimo (versione estesa dal vivo, rimasterizzata 2026)',subtitle:'Artista con nome lungo feat. Altra artista con nome lungo · Album'}],
  vuoto:()=>[]
};
for(const k of Object.keys(SCENARIOS)){const f=SCENARIOS[k];SCENARIOS[k]=()=>f().map(m=>({volume:m.source==='spotify'?.62:.85,...m}));}
let items=SCENARIOS.normale(),scenario='normale';
const subs=[];
const notify=()=>subs.forEach(f=>f(items));
const now=()=>performance.now();
let last=now();
// Tempo che scorre: un secondo vero = un secondo del brano.
setInterval(()=>{
  const t=now(),dt=(t-last)/1000;last=t;
  let changed=false;
  for(const m of items)if(m.playing&&!m.live&&m.duration){
    m.position+=dt;changed=true;
    if(m.position>=m.duration){
      if(m.source==='spotify'){if(m.repeat==='one')m.position=0;else next(m,true);}
      else{m.position=m.duration;m.playing=false;}
    }
  }
  if(changed)subs.forEach(f=>f(items,true));
},250);
function setTrack(m,i){const tr=TRACKS[(i+TRACKS.length)%TRACKS.length];Object.assign(m,tr,{track:(i+TRACKS.length)%TRACKS.length,position:0});}
function next(m,auto){
  if(m.shuffle){let i;do{i=Math.floor(Math.random()*TRACKS.length);}while(i===m.track);setTrack(m,i);}
  else if(m.track===TRACKS.length-1&&m.repeat==='off'&&auto){m.playing=false;m.position=m.duration;}
  else setTrack(m,m.track+1);
}
/** Controlli per sito: quello che VARCO vede (Media Session + elemento audio/video + adattatori per sito). */
function controls(m){
  const sp=m.source==='spotify';
  return {
    playPause:true,
    previous:sp,next:sp,
    seekBack:!m.live&&m.source!=='spotify',seekForward:!m.live&&m.source!=='spotify',
    seek:!m.live,
    shuffle:sp,repeat:sp,
    mute:m.source!=='whatsapp',
    pip:m.video
  };
}
function act(key,action,value){
  const m=items.find(x=>x.key===key);
  if(!m)return;
  switch(action){
    case 'toggle':m.playing=!m.playing;if(m.playing&&m.duration&&m.position>=m.duration)m.position=0;break;
    case 'next':next(m);break;
    case 'prev':if(m.position>3)m.position=0;else setTrack(m,m.track-1);break;
    case 'seekby':m.position=Math.max(0,Math.min(m.duration,m.position+value));break;
    case 'seekto':m.position=Math.max(0,Math.min(m.duration,value));break;
    case 'shuffle':m.shuffle=!m.shuffle;toast(m.shuffle?'Shuffle attivo':'Shuffle spento');break;
    case 'repeat':m.repeat={off:'all',all:'one',one:'off'}[m.repeat];toast({off:'Ripeti: spento',all:'Ripeti: tutta la playlist',one:'Ripeti: questo brano'}[m.repeat]);break;
    case 'mute':m.muted=!m.muted;break;
    case 'volume':m.volume=Math.max(0,Math.min(1,value));m.muted=m.volume===0;break;
    case 'pip':m.pip=!m.pip;toast(m.pip?'Video in finestrella':'Finestrella chiusa');break;
    case 'focus':toast(`Vai a «${m.title.slice(0,40)}${m.title.length>40?'…':''}» · ${m.where} in ${m.workspace}`);break;
    case 'close':items=items.filter(x=>x!==m);toast(m.kind==='panel'?'Pannello web chiuso (si riapre dalla barra laterale)':m.kind==='widget'?'Widget fermato':'Scheda chiusa · Ctrl+Shift+T per riaprirla');break;
  }
  notify();
}
const pos=m=>m.position;
const time=s=>{s=Math.max(0,Math.floor(s||0));const h=Math.floor(s/3600),mm=Math.floor(s%3600/60),r=String(s%60).padStart(2,'0');return h?`${h}:${String(mm).padStart(2,'0')}:${r}`:`${mm}:${r}`;};
const primary=()=>items.find(m=>m.playing)||items[0]||null;
let autoPip=true;

/* ── Cornice di VARCO finta ── */
function frame(){
  const root=document.createElement('div');root.className='vf';
  root.innerHTML=`
  <div class="vf-top"><span class="vf-logo">VARCO</span><span class="vf-beta">BETA 0.37.1</span><div class="vf-win"><i></i><i></i><i></i></div></div>
  <div class="vf-nav"><span class="vf-btn"></span><span class="vf-btn"></span><span class="vf-btn"></span><div class="vf-addr">github.com/varco/varco/issues/214</div></div>
  <div class="vf-body"><aside class="vf-side">${'<span></span>'.repeat(9)}</aside>
    <section class="vf-page"><div class="vf-page-in"><h2>Issue #214 · Il lettore non mostra lo shuffle</h2>${'<p></p>'.repeat(9)}</div></section></div>
  <div class="vf-panel-slot" id="panelSlot"></div>
  <footer class="vf-bar"><span class="vf-ws">Personale</span>
    <span class="vf-tab active">GitHub · Issue #214</span><span class="vf-tab">Documentazione</span><span class="vf-tab">Calendario</span>
    <span class="vf-spacer"></span><div id="miniSlot" class="vf-mini-slot"></div><span class="vf-clock">21:47<small>Dom 16 nov</small></span></footer>
  <div class="vf-toast" id="toast" hidden></div>`;
  return root;
}
let toastTimer;
function toast(text){const t=document.getElementById('toast');if(!t)return;t.textContent=text;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.hidden=true,2200);}

/* ── Barra degli stati (in basso a destra) ── */
function stateBar(){
  const bar=document.createElement('div');bar.className='vf-states';
  bar.innerHTML='<b>Stato</b>'+Object.keys(SCENARIOS).map(k=>`<button data-s="${k}" ${k===scenario?'aria-pressed="true"':''}>${{normale:'Normale',youtube:'Solo YouTube',molti:'Molti (12)',lunghi:'Titoli lunghi',vuoto:'Niente'}[k]}</button>`).join('');
  bar.onclick=e=>{const b=e.target.closest('button');if(!b)return;scenario=b.dataset.s;items=SCENARIOS[scenario]();bar.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));notify();};
  return bar;
}

let panelOpen=false;
function start({renderMini,renderPanel,onOpen}){
  const f=frame();document.body.prepend(f);document.body.append(stateBar());
  const mini=document.getElementById('miniSlot'),panel=document.getElementById('panelSlot');
  const draw=(list,tick)=>{renderMini(mini,list,{tick});renderPanel(panel,list,{tick,open:panelOpen});document.body.classList.toggle('panel-open',panelOpen);};
  subs.push(draw);
  Media.setOpen=open=>{panelOpen=open;onOpen?.(open);draw(items,false);};
  Media.toggleOpen=()=>Media.setOpen(!panelOpen);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&panelOpen){Media.setOpen(false);return;}
    if(!panelOpen)return;
    const p=primary();if(!p)return;
    if(e.key===' '){e.preventDefault();act(p.key,'toggle');}
    else if(e.key==='ArrowRight'&&controls(p).seekForward){e.preventDefault();act(p.key,'seekby',10);}
    else if(e.key==='ArrowLeft'&&controls(p).seekBack){e.preventDefault();act(p.key,'seekby',-10);}
  });
  draw(items,false);
  // ?open=1: il lettore si apre da solo (miniature della pagina di confronto).
  if(/[?&]open=1/.test(location.search))setTimeout(()=>Media.setOpen(true),300);
}
window.Media={start,act,controls,time,pos,primary,toast,get items(){return items;},get open(){return panelOpen;},
  get autoPip(){return autoPip;},setAutoPip(v){autoPip=v;toast(v?'Finestrella automatica attiva':'Finestrella automatica spenta');notify();},
  repeatLabel:r=>({off:'Ripeti spento',all:'Ripeti la playlist',one:'Ripeti il brano'}[r])};
})();
