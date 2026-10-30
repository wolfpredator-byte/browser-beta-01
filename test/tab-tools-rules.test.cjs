'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {siteOf,siteLabel,duplicateIds,siteGroups,bySite}=require('../lib/tab-tools-rules.cjs');

test('sito e nome dello stack', ()=>{
  assert.equal(siteOf('https://www.YouTube.com/watch?v=1'),'youtube.com');
  assert.equal(siteOf('app://home'),'');
  assert.equal(siteOf('non un url'),'');
  assert.equal(siteLabel('github.com'),'Github');
  assert.equal(siteLabel('docs.google.com'),'Google Docs');
  assert.equal(siteLabel('m.youtube.com'),'Youtube');
  assert.equal(siteLabel('bbc.co.uk'),'Bbc');
  assert.equal(siteLabel('localhost'),'localhost');
  assert.equal(siteLabel(''),'');
});

test('doppioni: resta l\'attiva o la fissata, conta il workspace, il # non cambia la pagina', ()=>{
  const tabs=[
    {id:1,workspace:'A',url:'https://a.it/x'},{id:2,workspace:'A',url:'https://a.it/x#parte'},{id:3,workspace:'A',url:'https://a.it/x/'},
    {id:4,workspace:'B',url:'https://a.it/x'},
    {id:5,workspace:'A',url:'https://b.it',pinned:true},{id:6,workspace:'A',url:'https://b.it'},
    {id:7,workspace:'A',url:'app://home',isHome:true},{id:8,workspace:'A',url:'app://home',isHome:true}];
  assert.deepEqual(duplicateIds(tabs,[2]).sort(),[1,3,6]);
  assert.deepEqual(duplicateIds(tabs).sort(),[2,3,6]);
});

test('raggruppa per sito: solo schede libere, almeno `min`', ()=>{
  const tabs=[{id:1,url:'https://github.com/a'},{id:2,url:'https://github.com/b'},{id:3,url:'https://github.com/c',group:'Lavoro'},
    {id:4,url:'https://youtube.com/1'},{id:5,url:'https://youtube.com/2',pinned:true},{id:6,url:'app://home',isHome:true}];
  assert.deepEqual(siteGroups(tabs),[{group:'Github',ids:[1,2]}]);
  assert.deepEqual(siteGroups(tabs,{min:3}),[]);
  assert.deepEqual(siteGroups([{id:1,url:'https://example.com'},{id:2,url:'https://example.com/a'},{id:3,url:'https://example.org'},{id:4,url:'https://example.org/b'}]).map(g=>g.group),['example.com','example.org']);
  const sites=bySite(tabs);
  assert.equal(sites[0].site,'github.com');
  assert.equal(sites[0].tabs.length,3);
  assert.ok(sites.some(s=>s.label==='VARCO'));
});
