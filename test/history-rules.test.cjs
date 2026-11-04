'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('../lib/history-rules.cjs');

const NOW=Date.UTC(2026,10,4,12);
const sample=[
  {url:'https://www.youtube.com/watch?v=1',title:'Video uno',time:NOW-60e3},
  {url:'https://m.youtube.com/x',title:'Mobile',time:NOW-2*3600e3},
  {url:'https://github.com/a',title:'Repo A',time:NOW-3*86400e3},
  {url:'https://notyoutube.com/',title:'Altro',time:NOW-40*86400e3}
];

test('cronologia: niente doppioni ricaricando, limite di voci',()=>{
  let list=h.addVisit([],{url:'https://a.it',title:'A',time:1});
  list=h.addVisit(list,{url:'https://a.it',title:'',time:2});
  assert.deepEqual(list,[{url:'https://a.it',title:'A',time:2}]);
  list=h.addVisit(list,{url:'https://b.it',title:'B',time:3});
  assert.equal(list.length,2);
  const big=Array.from({length:h.MAX_HISTORY},(_,i)=>({url:'https://x.it/'+i,title:'',time:i}));
  assert.equal(h.addVisit(big,{url:'https://new.it',time:9}).length,h.MAX_HISTORY);
});

test('cronologia: ricerca per parole in titolo e indirizzo',()=>{
  assert.deepEqual(h.search(sample,'repo').map(x=>x.title),['Repo A']);
  assert.deepEqual(h.search(sample,'youtube video').map(x=>x.title),['Video uno']);
  assert.equal(h.search(sample,'').length,4);
  assert.equal(h.search(sample,'',2).length,2);
});

test('cronologia: elimina voci, un sito con i sottodomini, un periodo',()=>{
  assert.deepEqual(h.removeItems(sample,[{url:sample[2].url,time:sample[2].time}]).map(x=>x.title),['Video uno','Mobile','Altro']);
  assert.deepEqual(h.removeSite(sample,'youtube.com').map(x=>x.title),['Repo A','Altro']);
  assert.deepEqual(h.removeSite(sample,'www.github.com').map(x=>x.title),['Video uno','Mobile','Altro']);
  assert.deepEqual(h.removeRange(sample,'hour',NOW).map(x=>x.title),['Mobile','Repo A','Altro']);
  assert.deepEqual(h.removeRange(sample,'week',NOW).map(x=>x.title),['Altro']);
  assert.deepEqual(h.removeRange(sample,'all',NOW),[]);
  assert.equal(h.removeRange(sample,'boh',NOW).length,4);
});

test('cronologia: giorni Oggi e Ieri',()=>{
  const now=new Date(2026,10,4,12).getTime();
  assert.equal(h.dayLabel(now-3600e3,now),'Oggi');
  assert.equal(h.dayLabel(now-86400e3,now),'Ieri');
  assert.match(h.dayLabel(now-3*86400e3,now),/novembre/);
});

test('Beta 0.36: niente tracce dell\'incognito nei dati salvati',()=>{
  const {persistable,INCOGNITO}=require('../lib/state.cjs');
  const data={workspaceLastActive:{Personale:'https://a.it',[INCOGNITO]:'https://segreto.it',[INCOGNITO+'#1']:'https://b.it'},history:[]};
  assert.deepEqual(persistable(data).workspaceLastActive,{Personale:'https://a.it'});
  const clean={workspaceLastActive:{Personale:'x'}};
  assert.equal(persistable(clean),clean);
});
