/**
 * Beta 0.39 — regole del launcher (fast launcher + command center ad anello).
 * Condivise dal processo principale (lib/launcher.cjs), dalla finestra del launcher (launcher.js)
 * e dai test: niente Electron, niente DOM.
 *
 * Un profilo appartiene a un programma (chiave = nome dell'eseguibile in minuscolo, es. "destiny2.exe")
 * e ha 8 posti sull'anello (null = libero) più "Altro nel profilo". Il profilo generale vale sul desktop
 * e quando in primo piano c'è VARCO o Esplora file.
 */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.LauncherRules=factory();
})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  const SLOTS=8;          // posti per anello
  const MAX_PAGES=5;      // Beta 0.40: più anelli per profilo, come pagine
  const MAX_MORE=40;
  const MAX_PROFILES=60;
  const TYPES=['site','panel','app','file','folder','cmd','note','jarvis'];
  /** Combinazioni proposte: tutte con due modificatori, così nei giochi non fanno niente. */
  const HOTKEYS=[
    ['Control+Alt+Space','Ctrl + Alt + Spazio'],
    ['Control+Shift+Space','Ctrl + Maiusc + Spazio'],
    ['Alt+Shift+Space','Alt + Maiusc + Spazio'],
    ['Control+Alt+L','Ctrl + Alt + L'],
    ['Control+Alt+K','Ctrl + Alt + K']
  ];
  /** Programmi che non sono "un'attività": per loro vale il profilo generale. */
  const DESKTOP_PROCESSES=new Set(['','explorer.exe','searchhost.exe','searchapp.exe','startmenuexperiencehost.exe','shellexperiencehost.exe',
    'lockapp.exe','textinputhost.exe','varco.exe','electron.exe','systemsettings.exe','taskmgr.exe']);
  const COLORS=['#ffb648','#9fd36b','#a493ff','#f5a050','#ff7a9a','#5fd0e0','#e8d26b','#7fc8a9','#ff8f6b','#8fb4ff'];
  const EXEC_EXT=/\.(exe|bat|cmd|ps1|msi|vbs|lnk|com|scr)$/i;

  const str=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
  const isUrl=v=>/^https?:\/\/[^\s]+$/i.test(v);
  const isPath=v=>/^[a-zA-Z]:\\/.test(v)||/^\\\\[^\\]+\\/.test(v);

  /** Un fast link valido, o null. */
  function normalizeItem(x){
    if(!x||typeof x!=='object'||!TYPES.includes(x.type))return null;
    const out={type:x.type,title:str(x.title,80),target:str(x.target,2000)};
    if(x.type==='site'||x.type==='panel'){if(!isUrl(out.target))return null;}
    else if(x.type==='app'||x.type==='file'||x.type==='folder'){if(!isPath(out.target))return null;}
    else if(x.type==='cmd'){out.ws=str(x.ws,60);out.index=Number.isInteger(x.index)&&x.index>=0&&x.index<50?x.index:-1;if(!out.ws||out.index<0)return null;}
    else if(x.type==='note'){out.ws=str(x.ws,60);if(!out.ws)return null;}
    else if(x.type==='jarvis'){if(!out.target)return null;}
    if(!out.title)out.title=titleFrom(out);
    return out;
  }
  function titleFrom(x){
    if(x.type==='site'||x.type==='panel'){try{return new URL(x.target).host.replace(/^www\./,'');}catch{return x.target;}}
    if(x.type==='app'||x.type==='file'||x.type==='folder')return x.target.split('\\').filter(Boolean).pop()||x.target;
    if(x.type==='note')return 'Note di '+x.ws;
    return x.target.slice(0,40);
  }
  /** Chiave che identifica un fast link (per doppioni, suggeriti scartati e conteggi). */
  const itemKey=x=>x.type==='cmd'?`cmd:${x.ws}#${x.index}`:x.type==='note'?`note:${x.ws}`:`${x.type==='panel'?'site':x.type}:${String(x.target).toLowerCase()}`;

  /** Posti di tutti gli anelli (8 per anello, fino a 5 anelli). Gli anelli vuoti in fondo si tolgono (almeno uno resta). */
  function normalizeSlots(slots){
    if(!Array.isArray(slots))return null;
    const len=Math.min(MAX_PAGES,Math.max(1,Math.ceil(slots.length/SLOTS)))*SLOTS;
    const out=[],seen=new Set();
    for(let i=0;i<len;i++){
      const x=normalizeItem(slots[i]);
      if(x&&!seen.has(itemKey(x))){seen.add(itemKey(x));out.push(x);}else out.push(null);
    }
    while(out.length>SLOTS&&out.slice(-SLOTS).every(x=>!x))out.length-=SLOTS;
    return out;
  }
  const pagesOf=p=>Math.max(1,Math.ceil((p?.slots?.length||SLOTS)/SLOTS));
  function normalizeMore(more,slots){
    const seen=new Set((slots||[]).filter(Boolean).map(itemKey)),out=[];
    for(const raw of Array.isArray(more)?more:[]){
      const x=normalizeItem(raw);
      if(x&&!seen.has(itemKey(x))){seen.add(itemKey(x));out.push(x);}
      if(out.length>=MAX_MORE)break;
    }
    return out;
  }
  function normalizeProfile(p){
    if(!p||typeof p!=='object')return null;
    const slots=normalizeSlots(p.slots);
    return {app:str(p.app,60),slots,more:normalizeMore(p.more,slots)};
  }
  const exeKey=v=>{const s=str(v,120).toLowerCase();return /^[\w .()+\-]+\.exe$/.test(s)?s:'';};

  function normalizeLauncher(raw){
    const l=raw&&typeof raw==='object'?raw:{};
    // hotkeyChosen: l'hai scelta tu. Se no e quella di base è occupata, VARCO ne prende un'altra libera.
    const out={enabled:l.enabled!==false,hotkey:HOTKEYS.some(h=>h[0]===l.hotkey)?l.hotkey:HOTKEYS[0][0],hotkeyChosen:l.hotkeyChosen===true,
      profiles:{},generic:normalizeProfile(l.generic)||{app:'',slots:null,more:[]},usage:{},ignored:{}};
    for(const [k,p] of Object.entries(l.profiles&&typeof l.profiles==='object'?l.profiles:{}).slice(0,MAX_PROFILES)){
      const key=exeKey(k),profile=normalizeProfile(p);
      if(key&&profile&&profile.slots)out.profiles[key]=profile;
    }
    for(const [k,map] of Object.entries(l.usage&&typeof l.usage==='object'?l.usage:{}).slice(0,MAX_PROFILES)){
      const key=k==='*'?'*':exeKey(k);if(!key||!map||typeof map!=='object')continue;
      const entries=Object.entries(map).filter(([ik,n])=>typeof ik==='string'&&ik.length<2100&&Number.isInteger(n)&&n>0).sort((a,b)=>b[1]-a[1]).slice(0,30);
      if(entries.length)out.usage[key]=Object.fromEntries(entries);
    }
    for(const [k,list] of Object.entries(l.ignored&&typeof l.ignored==='object'?l.ignored:{}).slice(0,MAX_PROFILES)){
      const key=k==='*'?'*':exeKey(k);
      if(key&&Array.isArray(list))out.ignored[key]=list.filter(x=>typeof x==='string'&&x.length<2100).slice(-50);
    }
    return out;
  }

  /** Il profilo che vale per il programma in primo piano: chiave dell'eseguibile, o '*' per il generale. */
  const profileKeyOf=exe=>{const k=exeKey(exe||'');return !k||DESKTOP_PROCESSES.has(k)?'*':k;};
  function colorFor(key){
    if(key==='*')return null;
    let h=0;for(const ch of key)h=(h*31+ch.charCodeAt(0))>>>0;
    return COLORS[h%COLORS.length];
  }

  // ── Modifica di un profilo (restituiscono un profilo nuovo) ──
  const copy=p=>({app:p.app,slots:(p.slots||Array(SLOTS).fill(null)).map(x=>x&&{...x}),more:(p.more||[]).map(x=>({...x}))});
  /** Mette un fast link nel posto: quello che c'era passa in cima ad "Altro nel profilo". */
  function put(profile,slot,item){
    const p=copy(profile),x=normalizeItem(item);
    if(!x||slot<0||slot>=p.slots.length)return p;
    const key=itemKey(x);
    p.slots=p.slots.map((y,i)=>y&&itemKey(y)===key&&i!==slot?null:y);
    p.more=p.more.filter(y=>itemKey(y)!==key);
    const old=p.slots[slot];
    p.slots[slot]=x;
    if(old&&itemKey(old)!==key)p.more.unshift(old);
    p.more=p.more.slice(0,MAX_MORE);
    return p;
  }
  /** Aggiunge nel primo posto libero, o in "Altro nel profilo" se l'anello è pieno. */
  function add(profile,item){
    const p=copy(profile),x=normalizeItem(item);
    if(!x)return {profile:p,slot:-2};
    const key=itemKey(x);
    const at=p.slots.findIndex(y=>y&&itemKey(y)===key);
    if(at>=0)return {profile:p,slot:at};
    const free=p.slots.findIndex(y=>!y);
    if(free>=0)return {profile:put(p,free,x),slot:free};
    if(!p.more.some(y=>itemKey(y)===key))p.more=[...p.more,x].slice(0,MAX_MORE);
    return {profile:p,slot:-1};
  }
  function clear(profile,slot){
    const p=copy(profile);const old=p.slots[slot];
    if(old){p.slots[slot]=null;p.more=[old,...p.more].slice(0,MAX_MORE);}
    return p;
  }
  function swap(profile,a,b){
    const p=copy(profile);if(a<0||b<0||a>=p.slots.length||b>=p.slots.length)return p;
    [p.slots[a],p.slots[b]]=[p.slots[b],p.slots[a]];return p;
  }
  /** Un anello in più (vuoto), fino a MAX_PAGES. */
  function addPage(profile){
    const p=copy(profile);
    if(pagesOf(p)<MAX_PAGES)p.slots=[...p.slots,...Array(SLOTS).fill(null)];
    return p;
  }
  /** Toglie un anello: quello che c'era passa in "Altro nel profilo". Il primo anello resta sempre. */
  function removePage(profile,page){
    const p=copy(profile);
    if(pagesOf(p)<=1||page<0||page>=pagesOf(p))return p;
    const removed=p.slots.splice(page*SLOTS,SLOTS).filter(Boolean);
    p.more=[...removed,...p.more].slice(0,MAX_MORE);
    return p;
  }
  function removeItem(profile,key){
    const p=copy(profile);
    p.slots=p.slots.map(y=>y&&itemKey(y)===key?null:y);p.more=p.more.filter(y=>itemKey(y)!==key);return p;
  }

  /**
   * Suggeriti: i siti del gioco (pannello Giochi) e quello che hai aperto almeno 2 volte dal launcher
   * con questo programma in primo piano, tranne ciò che è già nel profilo o che hai scartato.
   */
  function suggestions({profile,usage={},ignored=[],extra=[],known={}}){
    const inProfile=new Set([...(profile?.slots||[]).filter(Boolean),...(profile?.more||[])].map(itemKey));
    const skip=new Set(ignored);const out=[],seen=new Set();
    const push=(x,reason)=>{const n=normalizeItem(x);if(!n)return;const k=itemKey(n);if(inProfile.has(k)||skip.has(k)||seen.has(k))return;seen.add(k);out.push({...n,reason});};
    for(const x of extra)push(x,x.reason||'');
    for(const [k,n] of Object.entries(usage).sort((a,b)=>b[1]-a[1]))if(n>=2&&known[k])push(known[k],`Aperto ${n} volte con questo programma`);
    return out.slice(0,6);
  }
  /** Conta un'apertura dal launcher (per i suggeriti). */
  function countUse(usage,key,itemK){
    const map={...(usage[key]||{})};map[itemK]=(map[itemK]||0)+1;
    const entries=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,30);
    return {...usage,[key]:Object.fromEntries(entries)};
  }

  /** Ricerca mentre scrivi: inizio del nome, inizio di una parola, poi ovunque; +25 se è del profilo attuale. */
  function match(list,q,limit=8){
    q=String(q||'').trim().toLowerCase();if(!q)return [];
    const score=x=>{
      const t=String(x.title||'').toLowerCase(),all=(t+' '+(x.sub||'')+' '+(x.from||'')).toLowerCase();
      const b=t.startsWith(q)?100:t.split(/[\s·.\-_/]+/).some(w=>w.startsWith(q))?80:all.includes(q)?50:0;
      return b?b+(x.mine?25:0):0;
    };
    return list.map((x,i)=>[x,score(x),i]).filter(a=>a[1]>0).sort((a,b)=>b[1]-a[1]||a[2]-b[2]).slice(0,limit).map(a=>a[0]);
  }
  /** Un file eseguibile (trascinato o scelto da te) parte solo dopo una conferma; le app trovate da VARCO no. */
  const needsConfirm=x=>!!x&&x.type==='file'&&EXEC_EXT.test(x.target||'');

  return {SLOTS,MAX_PAGES,pagesOf,addPage,removePage,MAX_MORE,TYPES,HOTKEYS,DESKTOP_PROCESSES,EXEC_EXT,normalizeItem,normalizeLauncher,normalizeProfile,itemKey,titleFrom,
    profileKeyOf,colorFor,put,add,clear,swap,removeItem,suggestions,countUse,match,needsConfirm,exeKey};
});
