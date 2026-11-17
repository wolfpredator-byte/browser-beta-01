/**
 * Beta 0.41 — motore dei suggerimenti, uno solo per barra degli indirizzi, Home, launcher e command center.
 *
 *   createIndex(ctx)  prepara una volta (all'apertura) siti dell'archivio, siti imparati, pagine, app, progetti, schede;
 *   index.query(q,{mode})  a ogni lettera restituisce i gruppi già ordinati:
 *     - mode 'address': prima gli indirizzi (siti e pagine), poi ricerche, app, progetti, VARCO;
 *     - mode 'home' / 'launcher' / 'cc': siti, ricerche, app, progetti, VARCO; con l'intento giusto cambia l'ordine
 *       («youtube lofi» → prima «Cerca lofi su YouTube»; una domanda → prima JARVIS).
 *
 * Tutto in locale: niente rete. I suggerimenti del motore di ricerca (se attivi) li aggiunge chi chiama.
 * Condiviso da processo principale, cornice, launcher e test (UMD, niente Electron né DOM).
 */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./suggest-sites.js'));
  else root.SuggestRules=factory(root.SuggestSites);
})(typeof self!=='undefined'?self:this,function(DB){
  'use strict';
  const LEARN_AFTER=5;          // visite dopo cui un sito che non è nell'archivio diventa "imparato"
  const MIN_SITE=420,MIN_ITEM=480;
  const QUESTION=/^(come|cosa|che cosa|perch[eé]|quando|chi|dove|qual[ei]?|quanto|quanti|quante|spiegami|dimmi|how|what|why|when|who|where)\b/i;

  // ── Testo ──
  const normalize=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const compact=s=>normalize(s).replace(/ /g,'');
  const consonants=s=>s.replace(/[aeiou]/g,'');
  const initials=n=>n.split(' ').filter(Boolean).map(w=>w[0]).join('');
  function subseq(q,t){let i=0;for(const ch of t){if(ch===q[i])i++;if(i===q.length)return true;}return false;}
  /** Distanza di Damerau-Levenshtein (scambio di due lettere = 1), con taglio oltre max. */
  function distance(a,b,max=2){
    if(Math.abs(a.length-b.length)>max)return max+1;
    const d=[];for(let i=0;i<=a.length;i++){d.push([i]);}for(let j=1;j<=b.length;j++)d[0][j]=j;
    for(let i=1;i<=a.length;i++){let best=99;for(let j=1;j<=b.length;j++){
      const c=a[i-1]===b[j-1]?0:1;d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+c);
      if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);
      best=Math.min(best,d[i][j]);}if(best>max)return max+1;}
    return d[a.length][b.length];
  }
  /**
   * Quanto un testo corrisponde a un nome (0 = per niente, 1000 = uguale). Tollera:
   * inizio del nome o di una parola, parole in ordine diverso, iniziali («egs»), lettere mancanti («epc»), errori di 1–2 lettere.
   */
  function fuzzy(query,name){
    const qn=normalize(query),qc=qn.replace(/ /g,'');
    if(!qc)return 0;
    const n=normalize(name),c=n.replace(/ /g,'');
    if(!c)return 0;
    if(c===qc)return 1000;
    if(c.startsWith(qc))return 900-Math.min(100,c.length-qc.length);
    const words=n.split(' ');
    if(words.some(w=>w.startsWith(qn)))return 820;
    const qt=qn.split(' ');
    if(qt.length>1&&qt.every(t=>words.some(w=>w.startsWith(t))))return 780;
    if(qt.length>1&&qt.every(t=>words.some(w=>w.startsWith(t)||(t.length>=4&&distance(t,w.slice(0,t.length),1)<=1))))return 740;
    if(qc.length>=2&&initials(n).startsWith(qc))return 700;
    if(qc.length>=3&&c.includes(qc))return 600;
    if(qc.length>=4){
      const dPrefix=distance(qc,c.slice(0,qc.length),2),dWhole=distance(qc,c,2);
      const d=Math.min(dPrefix,dWhole);
      if(d<=1)return 560-(dWhole<=1?0:20);
      if(d<=2&&qc.length>=7)return 470;
    }
    if(qc.length>=3&&qc[0]===c[0]&&(subseq(qc,c)||consonants(c).startsWith(consonants(qc))))return 520-Math.min(60,c.length-qc.length);
    return 0;
  }
  const bestOf=(query,names)=>names.reduce((m,n)=>Math.max(m,fuzzy(query,n)),0);

  // ── Indirizzi ──
  const hostOf=url=>{try{return new URL(url).hostname.replace(/^www\./,'').toLowerCase();}catch{return '';}};
  const isUrlLike=q=>/^[a-z]+:\/\//i.test(q)||/^localhost(:\d+)?(\/|$)/i.test(q)||/^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/i.test(q.trim());
  /** Il sito dell'archivio a cui appartiene un dominio (anche i sottodomini: it.wikipedia.org → Wikipedia). */
  function siteOfHost(host,sites){
    if(!host)return null;
    let best=null;
    for(const s of sites){if(host===s.domain||host.endsWith('.'+s.domain)){if(!best||s.domain.length>best.domain.length)best=s;}}
    return best;
  }
  /** Il nome corto di un sito dal titolo di una sua pagina: il pezzo più corto tra « - », « | », « · ». */
  function shortTitle(title,host){
    const parts=String(title||'').split(/\s+[-–—|·:]\s+/).map(p=>p.trim()).filter(p=>p.length>=2&&p.length<=40);
    return parts.sort((a,b)=>a.length-b.length)[0]||host.replace(/^(app|m|web|www)\./,'');
  }
  /** Nome di un sito imparato: il pezzo di titolo che ritorna in più pagine (il nome del sito, non quello della pagina). */
  function siteNameFrom(titles,host){
    const count=new Map(),label=host.replace(/^(app|m|web|www)\./,'').split('.')[0];
    for(const t of titles)for(const p of new Set(String(t||'').split(/\s+[-–—|·:]\s+/).map(x=>x.trim()).filter(x=>x.length>=2&&x.length<=40)))count.set(p,(count.get(p)||0)+1);
    const best=[...count.entries()].sort((a,b)=>b[1]-a[1]||fuzzy(label,b[0])-fuzzy(label,a[0])||a[0].length-b[0].length)[0];
    return best&&(best[1]>1||fuzzy(label,best[0])>=520)?best[0]:host.replace(/^(www)\./,'');
  }
  const recencyBoost=(t,now)=>!t?0:now-t<864e5?60:now-t<7*864e5?30:now-t<30*864e5?10:0;

  /**
   * @param {object} ctx
   *   history:[{url,title,time}], bookmarks:[{url,title}], fastLinks:[{url,title,workspace,pinned}],
   *   tabs:[{id,url,title,workspace}], workspace, apps:[{name,path}], projects:[{name,path,workspace}],
   *   commands:[{id,title,keywords}], choices:{query:{key:count}}, engine:{label,url}, now, sites (per i test)
   */
  function createIndex(ctx={}){
    const now=ctx.now||Date.now();
    const sites=(ctx.sites||DB.SITES).map(s=>({...s,names:[s.name,...s.aliases,s.domain.split('.')[0]]}));
    // Segnali per dominio: visite, ultima visita, preferito, fast link (e del workspace attivo), scheda aperta.
    const sig=new Map();
    const S=host=>{let x=sig.get(host);if(!x){x={visits:0,last:0,bookmark:false,fast:false,fastHere:false,tab:false,tabHere:false,titles:[]};sig.set(host,x);}return x;};
    for(const h of ctx.history||[]){const host=hostOf(h.url);if(!host)continue;const x=S(host);x.visits++;x.last=Math.max(x.last,h.time||0);if(x.titles.length<6&&h.title)x.titles.push(h.title);}
    for(const b of ctx.bookmarks||[])S(hostOf(b.url)).bookmark=true;
    for(const f of ctx.fastLinks||[]){const x=S(hostOf(f.url));x.fast=true;if(f.workspace===ctx.workspace)x.fastHere=true;}
    for(const t of ctx.tabs||[]){const x=S(hostOf(t.url));x.tab=true;if(t.workspace===ctx.workspace)x.tabHere=true;}
    // Siti imparati: visitati almeno LEARN_AFTER volte e non nell'archivio.
    const learned=[];
    for(const [host,x] of sig){
      if(!host||x.visits<LEARN_AFTER||siteOfHost(host,sites)||/^(localhost|127\.|192\.168\.|10\.)/.test(host))continue;
      const name=siteNameFrom(x.titles,host);
      learned.push({id:'l:'+host,name,domain:host,cat:'Imparato',color:null,aliases:[],search:'',urls:[],apps:[],learned:true,names:[name,host.split('.')[0],host]});
    }
    const allSites=[...sites,...learned];
    // Pagine: cronologia, preferiti e fast link, una per indirizzo.
    const pages=new Map();
    const addPage=(url,title,from)=>{if(!/^https?:/i.test(url||''))return;const k=url.replace(/#.*$/,'');const p=pages.get(k);if(p){p.from.add(from);if(!p.title&&title)p.title=title;}else pages.set(k,{url,title:title||'',host:hostOf(url),from:new Set([from])});};
    for(const f of ctx.fastLinks||[])addPage(f.url,f.title,'fast');
    for(const b of ctx.bookmarks||[])addPage(b.url,b.title,'bookmark');
    for(const h of (ctx.history||[]).slice(0,1500))addPage(h.url,h.title,'history');
    const choices=ctx.choices||{};

    const boostOf=host=>{
      const x=sig.get(host);if(!x)return 0;
      return Math.round(Math.log2(1+x.visits)*40)+recencyBoost(x.last,now)+(x.bookmark?50:0)+(x.fast?70:0)+(x.fastHere?60:0)+(x.tab?40:0)+(x.tabHere?30:0);
    };
    const badgesOf=host=>{const x=sig.get(host);const b=[];if(!x)return b;if(x.fastHere||x.fast)b.push('fast link');if(x.bookmark)b.push('preferito');if(x.tab)b.push('aperto');if(x.visits)b.push(x.visits===1?'1 visita':`${x.visits} visite`);return b;};
    const choiceBoost=(q,key)=>{const m=choices[normalize(q)];return m&&m[key]?Math.min(400,m[key]*120):0;};
    const appFor=site=>{
      if(!site.apps.length)return null;
      const names=site.apps.map(normalize);
      const found=(ctx.apps||[]).find(a=>{const n=normalize(a.name),file=normalize(String(a.path||'').split('\\').pop().replace(/\.exe$/i,''));return names.includes(n)||names.includes(file);});
      return {wanted:site.apps[0],installed:found||null};
    };

    /**
     * scope 'web' (barra degli indirizzi e ricerca della Home, come un browser normale): solo indirizzi, siti e ricerche.
     * scope 'all': anche app, progetti, VARCO e JARVIS (per chi li vuole: oggi nessuna casella).
     */
    function query(raw,{mode='home',limit=6,scope='web'}={}){
      const web=scope==='web';
      const q=String(raw||'').trim();
      if(!q)return {groups:[],intent:null};
      const qn=normalize(q);
      const groups={addr:[],sites:[],search:[],apps:[],projects:[],varco:[],jarvis:[]};
      let intent=null;

      // 1. Intenti: indirizzo, domanda, «sito + testo» (o «testo su sito»).
      if(isUrlLike(q)){
        const url=/^[a-z]+:\/\//i.test(q)?q:(/^localhost/i.test(q)?'http://':'https://')+q;
        groups.addr.push({kind:'url',key:'url:'+url,title:q,sub:'Vai all’indirizzo',url,score:2000});
        intent='address';
      }
      const question=!web&&(QUESTION.test(qn)||/\?\s*$/.test(q));
      if(question){groups.jarvis.push({kind:'jarvis',key:'jarvis',title:`Chiedi a JARVIS: «${q}»`,sub:'La risposta arriva come notifica',score:1500});intent=intent||'question';}
      const tokens=q.split(/\s+/);
      let siteSearch=null;
      // Se tutto il testo è già il nome di un sito («epic game store»), non è «cerca game store su Epic».
      const wholeSite=tokens.length>1&&allSites.some(s=>bestOf(q,s.names)>=740);
      if(!intent&&tokens.length>1&&!wholeSite){
        const tryHead=(head,rest)=>{if(!rest)return null;const s=allSites.filter(s=>s.search).map(s=>[s,Math.max(...s.names.map(n=>compact(n)===compact(head)?1000:fuzzy(head,n)>=900&&compact(head).length>=3?900:0))]).sort((a,b)=>b[1]-a[1])[0];return s&&s[1]>=900?{site:s[0],text:rest}:null;};
        for(let k=Math.min(3,tokens.length-1);k>=1&&!siteSearch;k--)siteSearch=tryHead(tokens.slice(0,k).join(' '),tokens.slice(k).join(' '));
        const m=!siteSearch&&q.match(/^(.+?)\s+(?:su|on|in)\s+(.+)$/i);
        if(m)siteSearch=tryHead(m[2],m[1]);
      }
      if(siteSearch){
        intent='site-search';
        const {site,text}=siteSearch;
        groups.search.push({kind:'site-search',key:'ss:'+site.domain,title:`Cerca «${text}» su ${site.name}`,sub:site.domain,url:site.search.replace('%s',encodeURIComponent(text)),site,score:1400});
      }

      // 2. Siti (archivio + imparati), con i segnali e le scelte passate.
      const siteHits=[];
      for(const s of allSites){
        const m=bestOf(q,s.names);
        if(m<MIN_SITE)continue;
        const score=m+boostOf(s.domain)+[...sig.keys()].filter(h=>h!==s.domain&&h.endsWith('.'+s.domain)).reduce((a,h)=>a+boostOf(h)/2,0)+choiceBoost(q,'site:'+s.domain);
        siteHits.push({kind:'site',key:'site:'+s.domain,title:s.name,sub:s.domain+(s.learned?' · imparato':''),url:'https://'+s.domain,
          site:s,app:appFor(s),badges:badgesOf(s.domain),score,match:m});
      }
      // «youtube lofi»: sotto la ricerca su YouTube c'è anche il sito.
      if(siteSearch&&!siteHits.some(h=>h.site.domain===siteSearch.site.domain)){const st=siteSearch.site;siteHits.push({kind:'site',key:'site:'+st.domain,title:st.name,sub:st.domain,url:'https://'+st.domain,site:st,app:appFor(st),badges:badgesOf(st.domain),score:600,match:600});}
      siteHits.sort((a,b)=>b.score-a.score);
      // 3. Pagine (titolo o indirizzo), senza ripetere la home di un sito già trovato.
      const siteDomains=new Set(siteHits.map(h=>h.site.domain));
      const pageHits=[];
      for(const p of pages.values()){
        const m=Math.max(fuzzy(q,p.title),p.host.startsWith(qn.replace(/ /g,''))?880:0,normalize(p.url).includes(qn)&&qn.length>=3?560:0);
        if(m<MIN_ITEM)continue;
        const site=siteOfHost(p.host,allSites);
        const isHome=/^https?:\/\/[^/]+\/?$/.test(p.url);
        if(isHome&&site&&siteDomains.has(site.domain))continue;
        pageHits.push({kind:'page',key:'page:'+p.url,title:p.title||p.url,sub:p.host,url:p.url,site,badges:[...p.from].map(f=>({fast:'fast link',bookmark:'preferito',history:'cronologia'})[f]),
          score:m-80+boostOf(p.host)/2+(p.from.has('fast')?60:0)+(p.from.has('bookmark')?40:0)+choiceBoost(q,'page:'+p.url),match:m});
      }
      pageHits.sort((a,b)=>b.score-a.score);
      { // Stesso titolo sullo stesso sito una volta sola, e al massimo 2 pagine per sito.
        const seenT=new Set(),perHost=new Map();
        const kept=[];for(const h of pageHits){const t=h.sub+'|'+normalize(h.title);const n=perHost.get(h.sub)||0;if(seenT.has(t)||n>=2)continue;seenT.add(t);perHost.set(h.sub,n+1);kept.push(h);}
        pageHits.length=0;pageHits.push(...kept);
      }
      groups.sites.push(...siteHits.slice(0,4),...pageHits.slice(0,mode==='address'?4:3));
      groups.sites.sort((a,b)=>b.score-a.score);

      // 4. Ricerche: sul sito trovato (se ha una ricerca e hai scritto più del suo nome) e sul web.
      const top=siteHits[0];
      if(!siteSearch&&top&&top.site.search&&top.match<740&&tokens.length>1)groups.search.push({kind:'site-search',key:'ss:'+top.site.domain,title:`Cerca «${q}» su ${top.site.name}`,sub:top.site.domain,url:top.site.search.replace('%s',encodeURIComponent(q)),site:top.site,score:700});
      groups.search.push({kind:'web',key:'web',title:`Cerca «${q}»`,sub:ctx.engine?.label?`Sul web · ${ctx.engine.label}`:'Sul web',score:650});

      // 5. App: quelle installate che corrispondono, e quella collegata al sito trovato.
      const appHits=new Map();
      for(const a of ctx.apps||[]){const m=fuzzy(q,a.name);if(m>=MIN_ITEM)appHits.set(a.path,{kind:'app',key:'app:'+a.path,title:a.name,sub:a.game?'Gioco installato':'App installata',path:a.path,score:m+choiceBoost(q,'app:'+a.path)});}
      for(const h of siteHits.slice(0,2)){
        if(!h.app)continue;
        if(h.app.installed){const a=h.app.installed;const prev=appHits.get(a.path);appHits.set(a.path,{kind:'app',key:'app:'+a.path,title:a.name,sub:`App di ${h.site.name}`,path:a.path,score:Math.max(prev?.score||0,h.match-50)+choiceBoost(q,'app:'+a.path)});}
        else groups.apps.push({kind:'get-app',key:'get:'+h.site.domain,title:`Scarica ${h.app.wanted}`,sub:`Non è sul PC · dal sito di ${h.site.name}`,url:h.url,site:h.site,score:h.match-200});
      }
      groups.apps.unshift(...[...appHits.values()].sort((a,b)=>b.score-a.score).slice(0,3));

      // 6. Progetti: per nome o cartella, e «cerca nei progetti».
      for(const p of ctx.projects||[]){const m=Math.max(fuzzy(q,p.name),fuzzy(q,String(p.path).split('\\').pop()));if(m>=MIN_ITEM)groups.projects.push({kind:'project',key:'proj:'+p.path,title:p.name,sub:p.path,path:p.path,workspace:p.workspace,score:m+(p.workspace===ctx.workspace?80:0)});}
      groups.projects.sort((a,b)=>b.score-a.score);
      if((ctx.projects||[]).length&&q.length>=2)groups.projects.push({kind:'project-search',key:'psearch',title:`Cerca «${q}» nei progetti`,sub:'File e cartelle dei tuoi progetti',score:300});

      // 7. In VARCO: schede aperte e comandi.
      for(const t of ctx.tabs||[]){const m=Math.max(fuzzy(q,t.title),hostOf(t.url).startsWith(qn.replace(/ /g,''))?860:0);if(m>=MIN_ITEM)groups.varco.push({kind:'tab',key:'tab:'+t.id,title:t.title||t.url,sub:`Scheda aperta · ${t.workspace}`,tabId:t.id,score:m+(t.workspace===ctx.workspace?80:0)});}
      for(const c of ctx.commands||[]){const m=Math.max(fuzzy(q,c.title),...String(c.keywords||'').split(/\s+/).filter(Boolean).map(k=>fuzzy(q,k)>=900?700:0));if(m>=MIN_ITEM+100)groups.varco.push({kind:'command',key:'cmd:'+c.id,title:c.title,sub:'Comando di VARCO',command:c.id,score:m-100});}
      groups.varco.sort((a,b)=>b.score-a.score);

      // 8. Ordine dei gruppi.
      const G=[
        ['addr','Indirizzo'],['jarvis','JARVIS'],['sites',mode==='address'?'Indirizzi':'Siti'],['search','Ricerche'],['apps','App'],['projects','Progetti'],['varco','In VARCO']];
      let order=mode==='address'?['addr','sites','search','apps','varco','projects','jarvis']:['addr','sites','search','apps','projects','varco','jarvis'];
      if(intent==='site-search')order=['search','sites','apps','projects','varco','jarvis'];
      if(intent==='question'&&mode!=='address')order=['jarvis','search','sites','apps','projects','varco'];
      // Un'app che corrisponde meglio di qualsiasi sito (es. il nome esatto di un programma) passa davanti, tranne nella barra degli indirizzi.
      if(web)order=intent==='site-search'?['search','sites']:['addr','sites','search'];
      else if(mode!=='address'&&groups.apps[0]&&groups.apps[0].kind==='app'&&(groups.apps[0].score>=(groups.sites[0]?.match||0)+100))order=order.filter(g=>g!=='apps').reduce((a,g)=>g==='sites'?[...a,'apps',g]:[...a,g],[]);
      const caps={sites:web?(mode==='address'?7:6):(mode==='address'?6:5),search:web?3:2,apps:3,projects:3,varco:4,addr:1,jarvis:1};
      const out=order.map(id=>({id,title:G.find(g=>g[0]===id)[1],items:groups[id].slice(0,Math.min(caps[id],limit+2))})).filter(g=>g.items.length);
      const recognized=web?groups.sites.length:groups.sites.length||groups.apps.some(a=>a.kind==='app')||groups.projects.some(p=>p.kind==='project')||groups.varco.length||intent;
      return {groups:out,intent:intent||(recognized?'match':'fallback'),top:out[0]?.items[0]||null};
    }
    return {query,learned,sites:allSites};
  }

  /** Ricorda la scelta fatta per un testo (la volta dopo quel risultato sale). */
  function recordChoice(choices,query,key){
    const q=normalize(query);if(!q||!key)return choices;
    const next={...choices};const m={...(next[q]||{})};m[key]=(m[key]||0)+1;
    next[q]=Object.fromEntries(Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,5));
    const keys=Object.keys(next);if(keys.length>300)delete next[keys[0]];
    return next;
  }
  function normalizeChoices(raw){
    const out={};if(!raw||typeof raw!=='object')return out;
    for(const [q,m] of Object.entries(raw).slice(-300)){
      if(typeof q!=='string'||q.length>80||!m||typeof m!=='object')continue;
      const e=Object.entries(m).filter(([k,n])=>typeof k==='string'&&k.length<2100&&Number.isInteger(n)&&n>0).slice(0,5);
      if(e.length)out[q]=Object.fromEntries(e);
    }
    return out;
  }

  return {LEARN_AFTER,normalize,fuzzy,distance,createIndex,recordChoice,normalizeChoices,isUrlLike,hostOf,siteOfHost,SITES:DB.SITES};
});
