'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const r=require('../lib/link-rules.cjs');

test('collegamento: cifra e decifra, e rifiuta buste toccate', ()=>{
  const key=r.deriveKey(r.newSecret());
  const box=r.seal(key,'tel1',{type:'tab',url:'https://a.it'});
  assert.deepEqual(r.open(key,'tel1',box),{type:'tab',url:'https://a.it'});
  assert.equal(r.open(key,'tel2',box),null,'busta spostata su un altro telefono');
  assert.equal(r.open(r.deriveKey(r.newSecret()),'tel1',box),null,'chiave sbagliata');
  const c=r.fromB64u(box.c);c[0]^=1;
  assert.equal(r.open(key,'tel1',{n:box.n,c:r.b64u(c)}),null,'testo cambiato');
  assert.equal(r.open(key,'tel1',null),null);
});

test('collegamento: chiave uguale a quella di Kotlin (HKDF-SHA256)', ()=>{
  // Stesso vettore di LinkRulesTest.kt: segreto 0x00..0x1f.
  const key=r.deriveKey(Buffer.from(Array.from({length:32},(_,i)=>i)));
  assert.equal(key.toString('hex'),'450d84e76896b22556a090f75650ff177283d2072b30a3793a6b924cdc427927');
});

test('collegamento: niente messaggi vecchi o ripetuti', ()=>{
  const seen=new Map();
  const m=r.message('hello');
  assert.equal(r.checkFresh(m,seen),null);
  assert.match(r.checkFresh(m,seen),/ripetuto/);
  assert.match(r.checkFresh({...r.message('hello'),t:Date.now()-11*60*1000},seen),/scaduto/);
  assert.match(r.checkFresh({type:'x',id:'nope',t:Date.now()},seen),/non valido/);
});

test('collegamento: il QR porta indirizzi, porta e segreto', ()=>{
  const secret=r.newSecret();
  const code=r.pairingCode({pcId:'0123456789abcdef',name:'PC di casa',hosts:['192.168.1.5'],port:47820,secret});
  assert.ok(code.startsWith('varco-link:'));
  const back=r.parsePairingCode(code);
  assert.equal(back.pcId,'0123456789abcdef');
  assert.deepEqual(back.hosts,['192.168.1.5']);
  assert.equal(back.port,47820);
  assert.ok(back.secret.equals(secret));
  assert.equal(r.parsePairingCode('https://example.com'),null);
  assert.equal(r.parsePairingCode('varco-link:xxx'),null);
});

test('collegamento: solo indirizzi della rete di casa', ()=>{
  assert.deepEqual(r.lanAddresses({
    'Wi-Fi':[{family:'IPv4',address:'192.168.1.5',internal:false},{family:'IPv6',address:'fe80::1',internal:false}],
    'vEthernet (WSL)':[{family:'IPv4',address:'172.20.0.1',internal:false}],
    'Loopback':[{family:'IPv4',address:'127.0.0.1',internal:true}],
    'Ethernet':[{family:'IPv4',address:'10.0.0.7',internal:false},{family:'IPv4',address:'8.8.8.8',internal:false}]}),
  ['192.168.1.5','10.0.0.7']);
});

test('collegamento: schede e destinazioni ripulite', ()=>{
  assert.equal(r.normalizeTab({url:'javascript:alert(1)'}),null);
  assert.equal(r.normalizeTab({url:'file:///C:/x'}),null);
  const t=r.normalizeTab({url:'https://a.it/x',title:'A'.repeat(300),scroll:3,time:-4});
  assert.equal(t.title.length,200);assert.equal(t.scroll,1);assert.equal(t.time,0);assert.match(t.id,/^[a-f0-9]{16}$/);
  assert.deepEqual(r.normalizeTarget({kind:'workspace',workspace:'Lavoro'},['Personale','Lavoro']),{kind:'workspace',workspace:'Lavoro'});
  assert.deepEqual(r.normalizeTarget({kind:'workspace',workspace:'Sparito'},['Personale']),{kind:'tab'});
  assert.deepEqual(r.normalizeTarget({kind:'boh'},[]),{kind:'tab'});
  assert.deepEqual(r.normalizeTarget({kind:'ask'},[]),{kind:'ask'});
});

test('collegamento: il minuto del video di YouTube va nell’indirizzo', ()=>{
  assert.equal(r.withTime('https://m.youtube.com/watch?v=abc',125.7),'https://m.youtube.com/watch?v=abc&t=125s');
  assert.equal(r.withTime('https://youtu.be/abc?t=3',61),'https://youtu.be/abc?t=61s');
  assert.equal(r.withTime('https://www.youtube.com/watch?v=abc',2),'https://www.youtube.com/watch?v=abc');
  assert.equal(r.withTime('https://example.com/v',100),'https://example.com/v');
  assert.match(r.restoreScript(.5,30),/scrollTo\(0,Math.round\(h\*0.5\)\)/);
});

test('collegamento: dati salvati ripuliti', ()=>{
  const l=r.normalizeLink({devices:[{id:'a'.repeat(16),name:'Pixel\n9',key:'k'},{id:'bad',key:'k'}],inbox:{['a'.repeat(16)]:[{url:'https://a.it'},{url:'ftp://x'}]}});
  assert.match(l.pcId,/^[a-f0-9]{16}$/);
  assert.equal(l.port,47820);
  assert.equal(l.devices.length,1);
  assert.equal(l.devices[0].name,'Pixel9');
  assert.equal(l.inbox['a'.repeat(16)].length,1);
  assert.equal(r.normalizeLink({pcId:'0123456789abcdef'}).pcId,'0123456789abcdef');
});

test('relay: argomenti segreti uguali a quelli di Kotlin, diversi per verso', ()=>{
  // Stesso vettore di LinkRulesTest.kt.
  const t=r.relayTopics(Buffer.from(Array.from({length:32},(_,i)=>i)));
  assert.equal(t.pc,'varco-3a5d5d12ad73eb5dcbb6534cc288162d');
  assert.equal(t.phone,'varco-7b338f56ccf5636292767f9104be6d05');
  assert.notEqual(r.relayTopics(r.newSecret()).pc,t.pc);
});

test('relay: buste fino a 13 ore, mai due volte, mai troppo lunghe', ()=>{
  const seen={},now=Date.now();
  assert.equal(r.checkFreshRelay({...r.message('tab'),t:now-12*3600*1000},seen,now),null);
  assert.match(r.checkFreshRelay({...r.message('tab'),t:now-14*3600*1000},seen,now),/scaduto/);
  assert.match(r.checkFreshRelay({...r.message('tab'),t:now+11*60*1000},seen,now),/scaduto/);
  const m=r.message('tab');
  assert.equal(r.checkFreshRelay(m,seen,now),null);
  assert.match(r.checkFreshRelay(m,seen,now),/ripetuto/);
  const key=r.deriveKey(r.newSecret());
  assert.ok(r.relayBody('ab'.repeat(8),r.seal(key,'x',{url:'https://a.it/'})));
  assert.equal(r.relayBody('ab'.repeat(8),r.seal(key,'x',{url:'https://a.it/'+'a'.repeat(3500)})),null);
  const link=r.normalizeLink({relaySince:'8Leass06uiRO',relaySeen:{abcdef12:now,bad:1}});
  assert.equal(link.relay,true);
  assert.equal(link.relaySince,'8Leass06uiRO');
  assert.deepEqual(Object.keys(link.relaySeen),['abcdef12']);
});
