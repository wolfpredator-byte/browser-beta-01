'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {hostOf,normalizeSiteStyles}=require('../lib/site-styles.cjs');

test('sito di una pagina: senza www, solo pagine web', ()=>{
  assert.equal(hostOf('https://www.Example.com/a?b=1'),'example.com');
  assert.equal(hostOf('http://news.ycombinator.com/'),'news.ycombinator.com');
  assert.equal(hostOf('app://home'),'');
  assert.equal(hostOf('file:///C:/x.html'),'');
  assert.equal(hostOf('non un url'),'');
});

test('stili salvati: tiene solo quelli validi', ()=>{
  assert.deepEqual(normalizeSiteStyles(null),{});
  assert.deepEqual(normalizeSiteStyles({'example.com':'body{}','Bad Host':'a{}','vuoto.it':'   ','num.it':3}),{'example.com':'body{}'});
  assert.equal(normalizeSiteStyles({'a.it':'x'.repeat(60000)})['a.it'].length,50000);
  const many=Object.fromEntries(Array.from({length:150},(_,i)=>[`s${i}.it`,'a{}']));
  assert.equal(Object.keys(normalizeSiteStyles(many)).length,100);
});
