'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const m=require('../lib/media-rules.cjs');

test('stato della pagina: ripulito, azioni sconosciute e indirizzi strani scartati',()=>{
  const r=m.normalizeReport(JSON.stringify({has:true,playing:true,title:'  Brano\n uno ',artist:'X',artwork:'javascript:alert(1)',
    duration:200,position:-5,rate:99,actions:['play','pause','nexttrack','hack','play']}));
  assert.equal(r.title,'Brano uno');
  assert.equal(r.artwork,'');
  assert.equal(r.position,0);
  assert.equal(r.rate,1);
  assert.deepEqual(r.actions,['play','pause','nexttrack']);
  assert.equal(m.normalizeReport('{rotto'),null);
  assert.equal(m.normalizeReport('x'.repeat(30000)),null);
  assert.equal(m.normalizeReport(JSON.stringify({artwork:'https://i.ytimg.com/a.jpg'})).artwork,'https://i.ytimg.com/a.jpg');
});

test('controlli: dipendono da cosa il sito dichiara e da cosa ha il video',()=>{
  // YouTube: video con durata, brano successivo e precedente dichiarati.
  const yt=m.controlsFor({duration:300,video:true,actions:['play','pause','nexttrack','previoustrack','seekto']});
  assert.deepEqual(yt,{playPause:true,previous:true,next:true,seekBack:true,seekForward:true,seek:true,skipAd:false,mute:true,pip:true,volume:false,shuffle:false,repeat:false});
  // Sito con sola Media Session (nessun elemento comandabile): solo i pulsanti dichiarati.
  const s=m.controlsFor({duration:0,actions:['play','pause','nexttrack']});
  assert.equal(s.playPause,true);assert.equal(s.next,true);assert.equal(s.previous,false);
  assert.equal(s.seek,false);assert.equal(s.mute,false);assert.equal(s.pip,false);
  // Diretta: niente barra né salti, ma pausa e muto sì.
  const live=m.controlsFor({live:true,duration:0,video:true,actions:[]});
  assert.equal(live.seek,false);assert.equal(live.seekBack,false);assert.equal(live.playPause,true);assert.equal(live.mute,true);
  assert.equal(m.controlsFor({duration:30,actions:['skipad']}).skipAd,true);
});

test('volume, shuffle e ripeti: solo se la pagina li manda',()=>{
  const sp=m.normalizeReport({has:true,volume:0.4,shuffle:true,repeat:'one'});
  assert.equal(sp.volume,0.4);assert.equal(sp.shuffle,true);assert.equal(sp.repeat,'one');
  const c=m.controlsFor({...sp,duration:200,actions:[]});
  assert.equal(c.volume,true);assert.equal(c.shuffle,true);assert.equal(c.repeat,true);
  const yt=m.normalizeReport({has:true,volume:7,repeat:'sempre'});
  assert.equal(yt.volume,1);assert.equal(yt.shuffle,null);assert.equal(yt.repeat,null);
  assert.equal(m.controlsFor({...yt,duration:100,actions:[]}).shuffle,false);
  assert.equal(m.normalizeReport({has:true}).volume,null);
  assert.equal(m.isCommand('volume'),true);assert.equal(m.isCommand('repeat'),true);
});

test('ordine: prima ciò che suona, poi il più recente; al massimo 8',()=>{
  const list=[{key:'a',playing:false,updatedAt:5},{key:'b',playing:true,updatedAt:1},{key:'c',playing:false,updatedAt:9}];
  assert.deepEqual(m.sortEntries(list).map(e=>e.key),['b','c','a']);
  assert.equal(m.sortEntries(Array.from({length:12},(_,i)=>({key:i,playing:false,updatedAt:i}))).length,8);
});

test('posizione stimata e tempi',()=>{
  assert.equal(m.positionAt({position:10,playing:true,at:1000,rate:2,duration:100},4000),16);
  assert.equal(m.positionAt({position:10,playing:false,at:1000,duration:100},9000),10);
  assert.equal(m.positionAt({position:95,playing:true,at:0,duration:100},20000),100);
  assert.equal(m.formatTime(75),'1:15');
  assert.equal(m.formatTime(3725),'1:02:05');
  assert.equal(m.displayTitle({pageTitle:'YouTube'}),'YouTube');
  assert.equal(m.displaySubtitle({artist:'A',album:'B',site:'x.it'}),'A · B');
  assert.equal(m.displaySubtitle({site:'open.spotify.com'}),'open.spotify.com');
  assert.equal(m.isCommand('seekto'),true);assert.equal(m.isCommand('eval'),false);
});
