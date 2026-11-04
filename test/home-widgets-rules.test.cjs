'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const r=require('../lib/home-widgets-rules.cjs');

test('widget: solo tipi noti, campi ripuliti, id unici',()=>{
  const list=r.normalizeWidgets([{type:'clock',id:'aaaa'},{type:'boh'},{type:'webframe',url:'javascript:x',id:'aaaa'},{type:'notes',text:'ciao',extra:1}]);
  assert.deepEqual(list.map(w=>w.type),['clock','webframe','notes']);
  assert.equal(list[1].url,'');
  assert.notEqual(list[1].id,'aaaa');
  assert.deepEqual(Object.keys(list[2]).sort(),['id','text','type']);
});

test('widget: aggiungi, sposta, aggiorna, togli, limite',()=>{
  let a=r.addWidget([],'clock');assert.ok(a.ok);
  let list=a.list;
  list=r.addWidget(list,'weather').list;
  const [c,w]=list;
  assert.deepEqual(r.moveWidget(list,w.id,-1).map(x=>x.type),['weather','clock']);
  assert.equal(r.moveWidget(list,c.id,-1),list);
  list=r.updateWidget(list,w.id,{city:'Roma',lat:41.9,lon:12.5,type:'notes'});
  assert.equal(list[1].type,'weather');assert.equal(list[1].city,'Roma');
  assert.deepEqual(r.removeWidget(list,c.id).map(x=>x.type),['weather']);
  assert.equal(r.addWidget(list,'boh').ok,false);
  const full=Array.from({length:r.MAX_WIDGETS},()=>({type:'clock'}));
  assert.equal(r.addWidget(r.normalizeWidgets(full),'clock').ok,false);
});

test('animazioni della Home accese salvo scelta',()=>{
  assert.deepEqual(r.normalizeMotion(undefined),{enter:true,background:true,hover:true});
  assert.deepEqual(r.normalizeMotion({background:false}),{enter:true,background:false,hover:true});
});

test('siti più visitati e meteo',()=>{
  const h=[{url:'https://www.a.it/1'},{url:'https://www.a.it/2'},{url:'https://b.it/'},{url:'file:///c'},{url:'boh'}];
  assert.deepEqual(r.topSites(h).map(s=>[s.title,s.count]),[['a.it',2],['b.it',1]]);
  assert.deepEqual(r.weatherText(0),['Sereno','☀️']);
  assert.equal(r.weatherText(63)[0],'Pioggia');
  assert.equal(r.weatherText(96)[0],'Temporale');
});

test('Beta 0.36: riquadri di sempre come widget (uno per tipo) e prima migrazione',()=>{
  const list=r.normalizeWidgets([{type:'links'},{type:'links'},{type:'clock'},{type:'clock'}]);
  assert.deepEqual(list.map(w=>w.type),['links','clock','clock']);
  assert.equal(r.addWidget(list,'links').ok,false);
  assert.equal(r.addWidget(list,'quick').ok,true);
  assert.deepEqual(r.migrateLayout([{type:'clock'}],{quick:false,jarvis:false}).map(w=>w.type),['clock','links','projects','workspace']);
  assert.deepEqual(r.migrateLayout([],undefined).map(w=>w.type),['links','projects','quick','jarvis','workspace']);
});

test('Beta 0.36: widget web con larghezza a colonne e altezza libera',()=>{
  const [a,b,c]=r.normalizeWidgets([{type:'webframe',url:'https://a.it',size:'large'},{type:'webframe',cols:9,height:5},{type:'webframe',cols:2,height:444}]);
  assert.deepEqual([a.cols,a.height],[3,520]);
  assert.deepEqual([b.cols,b.height],[3,160]);
  assert.deepEqual([c.cols,c.height],[2,444]);
  assert.equal('size' in a,false);
  const [d]=r.updateWidget([c],c.id,{cols:1,height:300});
  assert.deepEqual([d.cols,d.height,d.url],[1,300,'']);
});

test('Beta 0.36: avviso per i siti che chiedono Widevine (Spotify & co.)',()=>{
  assert.equal(r.drmService('https://open.spotify.com/?flow=1'),'Spotify');
  assert.equal(r.drmService('https://www.netflix.com/browse'),'Netflix');
  assert.equal(r.drmService('https://music.amazon.it/'),'Amazon Music');
  assert.equal(r.drmService('https://www.youtube.com/watch?v=1'),'');
  assert.equal(r.drmService('https://notspotify.com/'),'');
  assert.equal(r.drmService('boh'),'');
});
