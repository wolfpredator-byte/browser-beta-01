'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {parseTasklistCsv,diffRunning,normalizeGame,missingSites,displayLabels,MAX_SITES}=require('../lib/game-rules.cjs');
const {createGameWatcher}=require('../lib/game-watcher.cjs');

test('tasklist: legge le righe CSV e ignora i messaggi di Windows',()=>{
  const out='"System","4","Services","0","30,992 K"\r\n"destiny2.exe","9120","Console","1","3,120,004 K"\r\n'+
    'INFORMAZIONI: nessuna attività in esecuzione corrispondente ai criteri specificati.\r\n';
  assert.deepEqual(parseTasklistCsv(out),[
    {name:'System',pid:4,session:'Services'},
    {name:'destiny2.exe',pid:9120,session:'Console'}
  ]);
  assert.deepEqual(parseTasklistCsv(''),[]);
});

const games=()=>[
  {id:1,name:'Destiny 2',exe:'destiny2.exe',enabled:true},
  {id:2,name:'Warframe',exe:'Warframe.x64.exe',enabled:true},
  {id:3,name:'Spento',exe:'spento.exe',enabled:false}
];

test('avvio e chiusura vengono segnalati una sola volta',()=>{
  let r=diffRunning(new Set(),new Set(['destiny2.exe']),games());
  assert.deepEqual(r.started.map(g=>g.id),[1]);
  r=diffRunning(r.running,new Set(['destiny2.exe']),games());
  assert.deepEqual([r.started.length,r.stopped.length],[0,0]);
  r=diffRunning(r.running,new Set(),games());
  assert.deepEqual(r.stopped.map(g=>g.id),[1]);
});

test('il nome dell’eseguibile non distingue maiuscole; i giochi disattivati sono ignorati',()=>{
  const r=diffRunning(new Set(),new Set(['warframe.x64.exe','spento.exe']),games());
  assert.deepEqual(r.started.map(g=>g.id),[2]);
});

test('disattivare un gioco mentre è in esecuzione lo considera terminato',()=>{
  const list=games();list[0].enabled=false;
  const r=diffRunning(new Set([1]),new Set(['destiny2.exe']),list);
  assert.deepEqual(r.stopped.map(g=>g.id),[1]);
  assert.equal(r.running.size,0);
});

const ws=['Personale','Gaming'];
const valid={name:' Destiny 2 ',exe:'C:\\Steam\\destiny2.exe',workspace:'Gaming',
  sites:'app.destinyitemmanager.com\n\nhttps://www.light.gg/\nlight.gg',alwaysOnTop:true,closeOnExit:false};

test('un gioco valido: nome pulito, solo il file .exe, siti normalizzati e senza doppioni',()=>{
  const r=normalizeGame(valid,ws);
  assert.equal(r.ok,true);
  assert.deepEqual(r.game,{name:'Destiny 2',exe:'destiny2.exe',workspace:'Gaming',
    sites:['https://app.destinyitemmanager.com/','https://www.light.gg/','https://light.gg/'],
    display:null,alwaysOnTop:true,closeOnExit:false});
  assert.equal(normalizeGame({...valid,display:2528732444},ws).game.display,2528732444);
});

test('errori del modulo giochi',()=>{
  assert.match(normalizeGame({...valid,name:'  '},ws).error,/nome/);
  assert.match(normalizeGame({...valid,exe:'destiny2'},ws).error,/Eseguibile/);
  assert.match(normalizeGame({...valid,exe:'a;b.exe'},ws).error,/Eseguibile/);
  assert.match(normalizeGame({...valid,workspace:'Nessuno'},ws).error,/workspace/);
  assert.match(normalizeGame({...valid,sites:'mappa del gioco'},ws).error,/non è un indirizzo/);
  const many=Array.from({length:MAX_SITES+1},(_,i)=>`sito${i}.com`).join('\n');
  assert.match(normalizeGame({...valid,sites:many},ws).error,/Al massimo/);
});

test('siti già aperti: conta il sito, non la pagina',()=>{
  const sites=['https://app.destinyitemmanager.com/','https://www.light.gg/'];
  assert.deepEqual(missingSites(sites,['https://app.destinyitemmanager.com/4611686018/d2/inventory','app://home']),['https://www.light.gg/']);
  assert.deepEqual(missingSites(sites,[]),sites);
});

test('monitor numerati da sinistra a destra',()=>{
  const labels=displayLabels([
    {id:20,bounds:{x:1920,y:0,width:2560,height:1440}},
    {id:10,bounds:{x:0,y:0,width:1920,height:1080}},
    {id:30,bounds:{x:-1920,y:0,width:1920,height:1080}}
  ],10);
  assert.deepEqual(labels.map(l=>l.id),[30,10,20]);
  assert.equal(labels[1].label,'Monitor 2 — 1920×1080 (principale)');
  assert.equal(labels[2].label,'Monitor 3 — 2560×1440');
});

test('watcher: nessun gioco configurato → nessuna lettura dei processi',async()=>{
  let calls=0;
  const watcher=createGameWatcher({games:()=>[],findRunning:async()=>{calls++;return new Set();},onStart(){},onStop(){}});
  await watcher.tick();
  assert.equal(calls,0);
});

test('watcher: avvia, ferma, e in pausa chiude i giochi in corso',async()=>{
  let running=new Set(['destiny2.exe']);const events=[];
  const watcher=createGameWatcher({games,findRunning:async names=>{
    assert.deepEqual(names,['destiny2.exe','warframe.x64.exe']);return running;},
    onStart:g=>events.push('start '+g.id),onStop:g=>events.push('stop '+g.id)});
  await watcher.tick();
  assert.equal(watcher.isRunning(1),true);
  running=new Set();await watcher.tick();
  running=new Set(['destiny2.exe']);await watcher.tick();
  watcher.setEnabled(false);await watcher.tick();
  assert.deepEqual(events,['start 1','stop 1','start 1','stop 1']);
  assert.deepEqual(watcher.runningIds(),[]);
});

test('watcher: un errore di Windows non blocca i controlli successivi',async()=>{
  let fail=true;const events=[];
  const original=console.warn;console.warn=()=>{};
  try{
    const watcher=createGameWatcher({games,findRunning:async()=>{if(fail)throw Error('tasklist');return new Set(['destiny2.exe']);},
      onStart:g=>events.push(g.id),onStop(){}});
    await watcher.tick();fail=false;await watcher.tick();
    assert.deepEqual(events,[1]);
  }finally{console.warn=original;}
});
