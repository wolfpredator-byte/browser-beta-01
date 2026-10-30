'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {originOf,hostOf,decideSave,accountsFor,parseCsv,importCsv}=require('../lib/password-rules.cjs');

test('origine: https, oppure http solo in locale', ()=>{
  assert.equal(originOf('https://accounts.google.com/signin?x=1'),'https://accounts.google.com');
  assert.equal(originOf('http://localhost:5173/login'),'http://localhost:5173');
  assert.equal(originOf('http://127.0.0.1:8080/'),'http://127.0.0.1:8080');
  assert.equal(originOf('http://sito.it/login'),'');      // in chiaro su Internet: mai
  assert.equal(originOf('file:///C:/x.html'),'');
  assert.equal(originOf('varco-view://app/viewer.html'),'');
  assert.equal(hostOf('https://www.github.com'),'github.com');
});

test('salvare o aggiornare', ()=>{
  const entries=[{origin:'https://a.it',username:'anna',password:'uno'}];
  assert.equal(decideSave(entries,[],'https://a.it','anna','uno'),'same');
  assert.equal(decideSave(entries,[],'https://a.it','anna','due'),'update');
  assert.equal(decideSave(entries,[],'https://a.it','bea','uno'),'new');
  assert.equal(decideSave(entries,[],'https://b.it','anna','uno'),'new');
  assert.equal(decideSave(entries,['https://a.it'],'https://a.it','bea','x'),'never');
  assert.equal(decideSave(entries,[],'','anna','x'),'skip');
  assert.equal(decideSave(entries,[],'https://a.it','anna',''),'skip');
  const list=accountsFor([{origin:'https://a.it',username:'x',used:1},{origin:'https://a.it',username:'y',used:5},{origin:'https://b.it',username:'z'}],'https://a.it');
  assert.deepEqual(list.map(e=>e.username),['y','x']);
});

test('CSV di Chrome e Firefox, con virgolette, a capo e BOM', ()=>{
  assert.deepEqual(parseCsv('a,"b,c","d ""e"""\r\n1,"due\nrighe",3'),[['a','b,c','d "e"'],['1','due\nrighe','3']]);
  const chrome='\uFEFFname,url,username,password,note\r\ngithub.com,https://github.com/login,anna,"p,w""1",\r\nsito,http://sito.it,bea,x,\r\nvuoto,https://v.it,c,,\r\n';
  const r=importCsv(chrome);
  assert.deepEqual(r.entries,[{origin:'https://github.com',username:'anna',password:'p,w"1'}]);
  assert.equal(r.skipped,2); // http su Internet e password vuota
  const firefox='"url","username","password","httpRealm","formActionOrigin","guid"\n"https://www.reddit.com","bea","segreta","","https://www.reddit.com","{x}"';
  assert.deepEqual(importCsv(firefox).entries,[{origin:'https://www.reddit.com',username:'bea',password:'segreta'}]);
  assert.ok(importCsv('a,b\n1,2').error);
});
