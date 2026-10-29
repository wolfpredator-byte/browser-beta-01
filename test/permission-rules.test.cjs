'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {originOf,requestKinds,checkKind,decide,describeRequest,normalizeSitePermissions}=require('../lib/permission-rules.cjs');
const {shouldSleep}=require('../lib/tab-advanced.cjs');

test('origine: solo siti web',()=>{
  assert.equal(originOf('https://discord.com/channels/@me'),'https://discord.com');
  assert.equal(originOf('http://localhost:3000/x'),'http://localhost:3000');
  assert.equal(originOf('file:///C:/a.html'),null);
  assert.equal(originOf('non un url'),null);
});

test('richieste: media diviso in fotocamera e microfono, il resto negato',()=>{
  assert.deepEqual(requestKinds('media',{mediaTypes:['audio','video']}),['camera','microphone']);
  assert.deepEqual(requestKinds('media',{mediaTypes:['audio']}),['microphone']);
  assert.equal(requestKinds('media',{mediaTypes:[]}),null);
  assert.deepEqual(requestKinds('notifications'),['notifications']);
  assert.deepEqual(requestKinds('fullscreen'),[]);   // sempre concesso
  assert.deepEqual(requestKinds('pointerLock'),[]);  // giochi nel browser
  assert.equal(requestKinds('usb'),null);            // sempre negato
  assert.equal(requestKinds('display-capture'),null);
});

test('verifiche silenziose',()=>{
  assert.equal(checkKind('media',{mediaType:'video'}),'camera');
  assert.equal(checkKind('media',{mediaType:'unknown'}),null);
  assert.equal(checkKind('geolocation'),'geolocation');
  assert.equal(checkKind('hid'),null);
});

test('decisione: un "blocca" basta a negare, servono tutti i "consenti"',()=>{
  assert.equal(decide({camera:'allow',microphone:'allow'},['camera','microphone']),'allow');
  assert.equal(decide({camera:'allow'},['camera','microphone']),'ask');
  assert.equal(decide({camera:'allow',microphone:'deny'},['camera','microphone']),'deny');
  assert.equal(decide(undefined,['notifications']),'ask');
  assert.equal(decide(undefined,[]),'allow');
  assert.equal(decide({usb:'allow'},null),'deny');
});

test('testo della domanda',()=>{
  assert.equal(describeRequest('https://discord.com',['camera','microphone']),'discord.com vuole usare la fotocamera e il microfono');
  assert.equal(describeRequest('https://www.youtube.com',['notifications']),'www.youtube.com vuole inviarti notifiche');
});

test('permessi salvati ripuliti',()=>{
  assert.deepEqual(normalizeSitePermissions({
    'https://discord.com':{microphone:'allow',camera:'deny',usb:'allow',notifications:'forse'},
    'https://discord.com/path':{camera:'allow'},
    'file:///x':{camera:'allow'},
    'https://vuoto.it':{}
  }),{'https://discord.com':{microphone:'allow',camera:'deny'}});
  assert.deepEqual(normalizeSitePermissions(null),{});
});

test('sospensione: solo schede non guardate da abbastanza tempo e senza eccezioni',()=>{
  const now=10*60000,base={visible:false,audible:false,pinned:false,devtools:false,lastVisibleAt:0};
  assert.equal(shouldSleep(base,now,10),true);
  assert.equal(shouldSleep({...base,lastVisibleAt:now-5*60000},now,10),false);
  assert.equal(shouldSleep({...base,visible:true},now,10),false);
  assert.equal(shouldSleep({...base,audible:true},now,10),false);
  assert.equal(shouldSleep({...base,pinned:true},now,10),false);
  assert.equal(shouldSleep({...base,devtools:true},now,10),false);
  assert.equal(shouldSleep(base,now,0),false); // disattivata
});
