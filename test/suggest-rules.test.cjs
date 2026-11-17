'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const S=require('../suggest-rules.js');

const now=Date.UTC(2026,10,17);
const base={workspace:'Gaming',now,engine:{label:'Google'},
  apps:[{name:'Epic Games Launcher',path:'C:\\Program Files\\Epic\\EpicGamesLauncher.exe'},{name:'Spotify',path:'C:\\Users\\x\\Spotify.exe'}],
  projects:[{name:'Destiny Builder',path:'C:\\Projects\\destiny-builder',workspace:'Gaming'}]};
const ids=r=>r.groups.map(g=>g.id);
const titles=(r,id)=>(r.groups.find(g=>g.id===id)?.items||[]).map(x=>x.title);

test('archivio: siti validi e senza doppioni',()=>{
  assert.ok(S.SITES.length>=150);
  const domains=S.SITES.map(s=>s.domain);
  assert.equal(new Set(domains).size,domains.length);
  for(const s of S.SITES){
    assert.match(s.domain,/^[a-z0-9.-]+\.[a-z]{2,}$/);
    if(s.search)assert.ok(s.search.includes('%s')&&s.search.startsWith('https://'),s.name);
    for(const u of s.urls)assert.ok(u.url.startsWith('https://')&&u.label,s.name);
  }
});

test('ricerca tollerante: epic, epc, egs, errori di battitura, parole in ordine diverso',()=>{
  const ix=S.createIndex(base);
  for(const q of ['epic','epc','egs','epic game store','epci gmaes','store epic','Epic Games'])
    assert.equal(titles(ix.query(q),'sites')[0],'Epic Games',q);
  assert.ok(S.fuzzy('yt','YouTube')===0||S.fuzzy('yt','yt')===1000);
  assert.equal(titles(ix.query('yt'),'sites')[0],'YouTube');           // nome alternativo
  assert.equal(titles(ix.query('youtub'),'sites')[0],'YouTube');
  assert.equal(titles(ix.query('spotfy'),'sites')[0],'Spotify');       // lettera mancante
});

test('Epic Games: prima i siti e le ricerche, poi l’app installata e i progetti',()=>{
  const r=S.createIndex(base).query('epic',{mode:'home',scope:'all'});
  assert.deepEqual(ids(r).slice(0,4),['sites','search','apps','projects']);
  assert.equal(titles(r,'apps')[0],'Epic Games Launcher');
  assert.match(titles(r,'projects').at(-1),/nei progetti/);
});

test('intenti: «sito + testo» cerca sul sito; domande a JARVIS; indirizzi',()=>{
  const ix=S.createIndex(base);
  for(const q of ['youtube lofi','yt lofi','lofi su youtube']){
    const r=ix.query(q);assert.equal(r.intent,'site-search',q);
    assert.equal(r.groups[0].items[0].title,'Cerca «lofi» su YouTube');
    assert.equal(r.groups[0].items[0].url,'https://www.youtube.com/results?search_query=lofi');
  }
  assert.equal(ix.query('epic game store').intent,'match'); // tutto il testo è il nome: niente «cerca game store»
  assert.equal(ix.query('come si cucina il risotto',{scope:'all'}).groups[0].id,'jarvis');
  assert.equal(ix.query('github.com/wolf').groups[0].items[0].url,'https://github.com/wolf');
  assert.equal(ix.query('localhost:5173').groups[0].items[0].url,'http://localhost:5173');
});

test('app: Avvia se installata, altrimenti Scarica',()=>{
  const ix=S.createIndex(base);
  assert.equal(titles(ix.query('spotify',{scope:'all'}),'apps')[0],'Spotify');
  assert.equal(titles(ix.query('discord',{scope:'all'}),'apps')[0],'Scarica Discord');
});

test('barra degli indirizzi: prima gli indirizzi',()=>{
  const r=S.createIndex({...base,history:[{url:'https://store.epicgames.com/it/free-games',title:'Giochi gratis - Epic Games Store',time:now}]}).query('epic',{mode:'address'});
  assert.equal(r.groups[0].id,'sites');assert.equal(r.groups[0].title,'Indirizzi');
  assert.ok(titles(r,'sites').some(t=>/Giochi gratis/.test(t)));
});

test('priorità: workspace attivo, fast link e cronologia; e le scelte passate',()=>{
  // «dis»: Discord e Disney+ — Disney+ visitato spesso e fast link del workspace attivo sale.
  const hist=[...Array(8)].map((_,i)=>({url:'https://www.disneyplus.com/home',title:'Disney+',time:now-i*1e6}));
  let ix=S.createIndex({...base,history:hist,fastLinks:[{url:'https://www.disneyplus.com/',title:'Disney+',workspace:'Gaming'}]});
  assert.equal(titles(ix.query('dis'),'sites')[0],'Disney+');
  let choices={};for(let i=0;i<3;i++)choices=S.recordChoice(choices,'dis','site:discord.com');
  ix=S.createIndex({...base,history:hist,fastLinks:[{url:'https://www.disneyplus.com/',title:'Disney+',workspace:'Gaming'}],choices});
  assert.equal(titles(ix.query('dis'),'sites')[0],'Discord');          // scelto 3 volte: vince
  assert.deepEqual(S.normalizeChoices({x:{a:2,b:'no'},['y'.repeat(200)]:{a:1}}),{x:{a:2}});
});

test('siti imparati: dopo 5 visite, con il nome del sito e non della pagina',()=>{
  const mk=n=>[...Array(n)].map((_,i)=>({url:'https://www.d2foundry.gg/w/'+i,title:['D2 Foundry - Fatebringer','D2 Foundry - Ace','D2 Foundry - Thorn'][i%3],time:now-i}));
  assert.equal(S.createIndex({...base,history:mk(4)}).learned.length,0);
  const ix=S.createIndex({...base,history:mk(5)});
  assert.deepEqual(ix.learned.map(l=>l.name),['D2 Foundry']);
  assert.equal(titles(ix.query('foundry'),'sites')[0],'D2 Foundry');
  // localhost e indirizzi di rete non si imparano
  assert.equal(S.createIndex({...base,history:[...Array(9)].map((_,i)=>({url:'http://localhost:5173/'+i,title:'Dev',time:now}))}).learned.length,0);
});

test('ripiego: niente di riconosciuto → ricerca web e risultati locali',()=>{
  const r=S.createIndex(base).query('zzqqx');
  assert.equal(r.intent,'fallback');assert.equal(r.groups[0].id,'search');
});

test('velocità: sotto i 25 ms per lettera con 1500 pagine in cronologia',()=>{
  const history=[...Array(1500)].map((_,i)=>({url:`https://site${i%300}.example.com/p/${i}`,title:`Pagina ${i} - Sito ${i%300}`,time:now-i*1000}));
  const ix=S.createIndex({...base,history});
  ix.query('warm');
  const t=process.hrtime.bigint();for(const q of ['e','ep','epi','epic','epic g'])ix.query(q);
  assert.ok(Number(process.hrtime.bigint()-t)/1e6/5<25);
});

test('solo web (barra degli indirizzi e Home): siti e ricerche, niente app, progetti né JARVIS',()=>{
  const ix=S.createIndex({...base,tabs:[{id:1,url:'https://x.com',title:'Epic tab',workspace:'Gaming'}]});
  for(const mode of ['address','home']){
    const r=ix.query('epic',{mode});
    assert.deepEqual(ids(r),['sites','search'],mode);
  }
  assert.deepEqual(ids(ix.query('come si fa il risotto?')),['search']);          // una domanda è una ricerca
  assert.deepEqual(ids(ix.query('youtube lofi')),['search','sites']);
  assert.equal(ix.query('youtube lofi').groups[0].items[0].title,'Cerca «lofi» su YouTube');
  assert.equal(ix.query('zzqqx').intent,'fallback');
});
