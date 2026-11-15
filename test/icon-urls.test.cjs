'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const icons=require('../lib/icon-urls.cjs');

const PNG='data:image/png;base64,'+Buffer.alloc(300,7).toString('base64');
const SVG='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg">'+' '.repeat(300)+'</svg>');

test('stessa immagine → stesso indirizzo corto; immagini diverse → indirizzi diversi',()=>{
  const a=icons.toUrl(PNG),b=icons.toUrl(PNG),c=icons.toUrl(SVG);
  assert.match(a,/^varco-icon:\/\/i\/\d+$/);
  assert.equal(a,b);assert.notEqual(a,c);
  assert.deepEqual(icons.lookup(a).body,Buffer.alloc(300,7));
  assert.equal(icons.lookup(a).type,'image/png');
  assert.equal(icons.lookup(c).type,'image/svg+xml');
  assert.match(icons.lookup(c).body.toString(),/^<svg/);
});

test('testi corti, non immagini o indirizzi strani restano come sono',()=>{
  assert.equal(icons.toUrl('data:image/png;base64,AAAA'),'data:image/png;base64,AAAA');
  assert.equal(icons.toUrl('https://a.it/'+'x'.repeat(300)),'https://a.it/'+'x'.repeat(300));
  assert.equal(icons.toUrl(null),null);
  assert.equal(icons.lookup('varco-icon://i/999999'),null);
  assert.equal(icons.lookup('https://evil/varco-icon://i/1'),null);
});

test('rewrite: copia profonda, i dati originali non cambiano',()=>{
  const bookmarks=[{url:'https://a.it',favicon:PNG}];
  const snap={bookmarks,nested:{list:[PNG,1,true,null]},n:3};
  const out=icons.rewrite(snap);
  assert.equal(bookmarks[0].favicon,PNG);
  assert.notEqual(out.bookmarks,bookmarks);
  assert.match(out.bookmarks[0].favicon,/^varco-icon:/);
  assert.match(out.nested.list[0],/^varco-icon:/);
  assert.deepEqual(out.nested.list.slice(1),[1,true,null]);
  assert.equal(out.n,3);
});
