'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {parseProjectFile,placeholders,fillPlaceholders,trustKey,needsTrust,readField,expandSearch,
  detectDefaults,stripAnsi,appendLog}=require('../lib/project-rules.cjs');

const destiny={
  nome:'Destiny Builder',
  anteprima:'http://localhost:5173',
  avvio:['npm run dev',{nome:'API',comando:'node server.js'}],
  editor:'code',
  link:['https://github.com/me/destiny-builder',{nome:'Docs Bungie',url:'https://bungie-net.github.io/'}],
  ricerche:{lg:'https://www.light.gg/db/search/?q=%s'},
  segreti:['BUNGIE_API_KEY'],
  monitor:[{nome:'Manifest',url:'https://www.bungie.net/Platform/Destiny2/Manifest/',campo:'Response.version',
    header:{'X-API-Key':'{{BUNGIE_API_KEY}}'},intervalloMinuti:1}]
};

test('un file completo viene letto e normalizzato',()=>{
  const r=parseProjectFile(JSON.stringify(destiny));
  assert.equal(r.ok,true,JSON.stringify(r.errors));
  assert.equal(r.config.anteprima,'http://localhost:5173/');
  assert.deepEqual(r.config.avvio,[{nome:'npm run dev',comando:'npm run dev',pronto:null,ricarica:true},{nome:'API',comando:'node server.js',pronto:null,ricarica:true}]);
  assert.deepEqual(r.config.link.map(l=>l.nome),['https://github.com/me/destiny-builder','Docs Bungie']);
  // 1 minuto non è ammesso: il minimo è 5.
  assert.equal(r.config.monitor[0].intervalloMinuti,5);
});

test('file minimo: basta il nome, nessuna fiducia richiesta',()=>{
  const r=parseProjectFile('{"nome":"Appunti"}');
  assert.equal(r.ok,true);
  assert.equal(needsTrust(r.config),false);
});

test('tutti gli errori vengono raccolti insieme',()=>{
  const r=parseProjectFile(JSON.stringify({anteprima:'localhost',editor:'code && del *',segreti:['minuscolo'],
    ricerche:{'l g':'x'},monitor:[{nome:'M',url:'https://x.it',header:{A:'{{TOKEN}}'}}]}));
  assert.equal(r.ok,false);
  assert.equal(r.errors.length,5,r.errors.join('\n'));
  assert.ok(r.errors.some(e=>e.includes('{{TOKEN}}')));
});

test('JSON rotto o non oggetto',()=>{
  assert.match(parseProjectFile('{nome:').errors[0],/JSON non valido/);
  assert.match(parseProjectFile('[1,2]').errors[0],/oggetto/);
});

test('la fiducia dipende solo da comandi, editor e monitor',()=>{
  const a=parseProjectFile(JSON.stringify(destiny)).config;
  const renamed=parseProjectFile(JSON.stringify({...destiny,nome:'Altro',link:[]})).config;
  const changed=parseProjectFile(JSON.stringify({...destiny,avvio:['npm run dev -- --host']})).config;
  const leaking=parseProjectFile(JSON.stringify({...destiny,monitor:[{...destiny.monitor[0],url:'https://evil.example/'}]})).config;
  assert.equal(trustKey(a),trustKey(renamed));
  assert.notEqual(trustKey(a),trustKey(changed));
  assert.notEqual(trustKey(a),trustKey(leaking));
  assert.equal(needsTrust(a),true);
});

test('segnaposto dei segreti',()=>{
  assert.deepEqual(placeholders('Bearer {{TOKEN}} {{TOKEN}} {{API_KEY}}'),['TOKEN','API_KEY']);
  assert.deepEqual(fillPlaceholders('k={{A}}&j={{B}}',{A:'1'}),{value:'k=1&j=',missing:['B']});
});

test('campi annidati della risposta',()=>{
  const body={Response:{version:'228.1',paths:{en:'/x'}}};
  assert.equal(readField(body,'Response.version'),'228.1');
  assert.equal(readField(body,'Response.manca.qui'),undefined);
  assert.equal(readField(body,null),body);
});

test('ricerche rapide della barra',()=>{
  const searches={lg:'https://www.light.gg/db/search/?q=%s'};
  assert.equal(expandSearch('lg ace of spades',searches),'https://www.light.gg/db/search/?q=ace%20of%20spades');
  assert.equal(expandSearch('LG   Gjallarhorn ',searches),'https://www.light.gg/db/search/?q=Gjallarhorn');
  assert.equal(expandSearch('lg',searches),null);           // nessun testo da cercare
  assert.equal(expandSearch('google qualcosa',searches),null); // scorciatoia sconosciuta
});

test('proposta iniziale da package.json',()=>{
  const pkg=JSON.stringify({name:'destiny-builder',scripts:{dev:'vite',build:'vite build'},devDependencies:{vite:'^6'},
    repository:{type:'git',url:'git+https://github.com/me/destiny-builder.git'}});
  const c=detectDefaults('cartella',pkg);
  assert.equal(c.nome,'destiny-builder');
  assert.deepEqual(c.avvio,[{nome:'Dev server',comando:'npm run dev'}]);
  assert.equal(c.anteprima,'http://localhost:5173');
  assert.deepEqual(c.link,[{nome:'GitHub',url:'https://github.com/me/destiny-builder'}]);
  // La proposta deve essere un file valido così com'è.
  assert.equal(parseProjectFile(JSON.stringify(c)).ok,true);
});

test('proposta: porta esplicita, oppure nessun package.json',()=>{
  assert.equal(detectDefaults('x',JSON.stringify({scripts:{dev:'node server.js --port 8081'}})).anteprima,'http://localhost:8081');
  const empty=detectDefaults('Jarvis',null);
  assert.equal(empty.nome,'Jarvis');
  assert.equal(empty.avvio,undefined);
  assert.equal(parseProjectFile(JSON.stringify(empty)).ok,true);
});

test('log: righe complete, colori tolti, segreti oscurati, massimo righe',()=>{
  const log={lines:[],partial:''};
  appendLog(log,'\x1b[32mVITE\x1b[0m ready\nkey=abcd1234',['abcd1234']);
  assert.deepEqual(log.lines,['VITE ready']);
  appendLog(log,' fine\n',['abcd1234']);
  assert.deepEqual(log.lines,['VITE ready','key=•••• fine']);
  for(let i=0;i<10;i++)appendLog(log,`r${i}\n`,[],5);
  assert.deepEqual(log.lines,['r5','r6','r7','r8','r9']);
  assert.equal(stripAnsi('\x1b[1;31merrore\x1b[0m'),'errore');
});
