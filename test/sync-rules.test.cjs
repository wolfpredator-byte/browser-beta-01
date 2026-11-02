'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('../lib/sync-rules.cjs');

const NOW=1_800_000_000_000;
const T=n=>NOW-1000+n;

test('sincronizzazione: vince la modifica più recente, la lapide a parità', ()=>{
  // Stessi casi di SyncRulesTest.kt.
  const pc=[{url:'https://a.it/',title:'A',at:T(10)},{url:'https://b.it/',title:'B',at:T(10)},{url:'https://c.it/',at:T(30),del:true}];
  const phone=[{url:'https://a.it/',title:'A nuovo',at:T(20)},{url:'https://b.it/',at:T(10),del:true},{url:'https://c.it/',title:'C',at:T(20)},{url:'https://d.it/',title:'D',at:T(5)}];
  const m=s.mergeItems(pc,phone,s.bookmarkKey,NOW);
  const by=Object.fromEntries(m.map(x=>[x.url,x]));
  assert.equal(by['https://a.it/'].title,'A nuovo');
  assert.equal(by['https://b.it/'].del,true);
  assert.equal(by['https://c.it/'].del,true);
  assert.equal(by['https://d.it/'].title,'D');
  assert.equal(m.length,4);
  // Le lapidi vecchie si dimenticano.
  assert.equal(s.mergeItems([{url:'x',at:NOW-s.TOMB_MS-1,del:true}],[],s.bookmarkKey,NOW).length,0);
});

test('preferiti del PC: aggiungi, togli, fondi col telefono', ()=>{
  const data={bookmarks:[{url:'https://vecchio.it/',title:'Vecchio'}]};
  s.normalizeBookmarks(data);
  assert.equal(data.bookmarks[0].at,0);
  assert.ok(s.addBookmark(data,'https://nuovo.it/','Nuovo',T(100)));
  assert.equal(s.addBookmark(data,'https://nuovo.it/','Doppio',T(101)),false);
  assert.ok(s.removeBookmark(data,'https://vecchio.it/',T(200)));
  assert.deepEqual(data.bookmarksRemoved,{'https://vecchio.it/':T(200)});
  const v1=s.version(s.bookmarkItems(data),s.bookmarkKey);
  const out=s.applyBookmarks(data,[{url:'https://telefono.it/',title:'Dal telefono',at:T(300)},{url:'https://nuovo.it/',at:T(150),del:true},
    {url:'javascript:alert(1)',title:'no',at:T(999)}],NOW);
  assert.deepEqual(data.bookmarks.map(b=>b.url),['https://telefono.it/']);
  assert.equal(data.bookmarksRemoved['https://nuovo.it/'],T(150));
  assert.ok(out.some(x=>x.url==='https://vecchio.it/'&&x.del));
  assert.notEqual(s.version(s.bookmarkItems(data),s.bookmarkKey),v1);
  // Rifare la stessa fusione non cambia niente.
  const v2=s.version(s.bookmarkItems(data),s.bookmarkKey);
  s.applyBookmarks(data,out,NOW);
  assert.equal(s.version(s.bookmarkItems(data),s.bookmarkKey),v2);
});

test('password dal telefono: solo siti https e campi validi', ()=>{
  const originOf=u=>{try{const x=new URL(u);return x.protocol==='https:'?x.origin:'';}catch{return '';}};
  const out=s.cleanPasswords([
    {origin:'https://a.it',username:'io',password:'segreta',at:5},
    {origin:'http://a.it',username:'io',password:'x',at:5},
    {origin:'https://a.it/pagina',username:'io',password:'x',at:5},
    {origin:'https://b.it',username:'io',at:7,del:true},
    {origin:'https://c.it',username:'io',password:'',at:5}],originOf);
  assert.deepEqual(out,[{origin:'https://a.it',username:'io',at:5,password:'segreta'},{origin:'https://b.it',username:'io',at:7,del:true}]);
});
