'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const r=require('../lib/viewer-rules.cjs');

test('tipo di file per estensione (anche file senza estensione come Dockerfile)',()=>{
  assert.equal(r.kindOf('C:\\p\\app.tsx'),'code');
  assert.equal(r.kindOf('README.md'),'markdown');
  assert.equal(r.kindOf('dati.CSV'),'csv');
  assert.equal(r.kindOf('logo.SVG'),'image');
  assert.equal(r.kindOf('clip.mp4'),'video');
  assert.equal(r.kindOf('report.pdf'),'pdf');
  assert.equal(r.kindOf('note.docx'),'docx');
  assert.equal(r.kindOf('build.xlsx'),'sheet');
  assert.equal(r.kindOf('slide.pptx'),'pptx');
  assert.equal(r.kindOf('ghost.glb'),'model');
  assert.equal(r.kindOf('mod.zip'),'zip');
  assert.equal(r.kindOf('Dockerfile'),'code');
  assert.equal(r.kindOf('.gitignore'),'text');
  assert.equal(r.kindOf('game.exe'),'binary');
});

test('le pagine HTML locali si servono come testo (mostrate, non eseguite)',()=>{
  assert.equal(r.contentTypeOf('index.html'),'text/plain');
  assert.equal(r.contentTypeOf('a.png'),'image/png');
  assert.equal(r.contentTypeOf('main.py'),'text/plain; charset=utf-8');
  assert.equal(r.contentTypeOf('x.bin'),'application/octet-stream');
});

test('percorsi scritti nella barra degli indirizzi',()=>{
  assert.equal(r.isLocalPath('C:\\Projects\\a.txt'),true);
  assert.equal(r.isLocalPath('"D:/foto/x.png"'),true);
  assert.equal(r.isLocalPath('\\\\nas\\condivisa\\doc.pdf'),true);
  assert.equal(r.isLocalPath('file:///C:/Users/x/a.md'),true);
  assert.equal(r.isLocalPath('light.gg'),false);
  assert.equal(r.normalizeLocalPath('file:///C:/Users/x/a%20b.md'),'C:\\Users\\x\\a b.md');
  assert.equal(r.normalizeLocalPath('"C:/p/./q/../a.txt"'),'C:\\p\\a.txt');
});

test('indirizzi del visualizzatore: andata e ritorno, niente ".." nascosti',()=>{
  const file='C:\\Progetti\\Destiny Builder\\modelli\\ghost #1.glb';
  assert.equal(r.pathFromViewerUrl(r.viewerUrl(file)),file);
  assert.equal(r.pathFromFileUrl(r.fileUrl(file)),file);
  assert.equal(r.isViewerUrl(r.viewerUrl(file)),true);
  assert.equal(r.isViewerUrl('https://light.gg/viewer.html?p=x'),false);
  // Un riferimento relativo in un .gltf ("texture.png") si risolve nella stessa cartella.
  assert.equal(r.pathFromFileUrl(new URL('texture.png',r.fileUrl(file)).href),'C:\\Progetti\\Destiny Builder\\modelli\\texture.png');
  assert.equal(r.pathFromFileUrl('varco-view://app/fs/C%3A/a/..%5C..%5Cwindows/x'),null);
  assert.equal(r.pathFromFileUrl('varco-view://altro/fs/C%3A/a'),null);
});

test('Range per video e audio',()=>{
  assert.equal(r.parseRange(null,1000),null);
  assert.deepEqual(r.parseRange('bytes=0-99',1000),{start:0,end:99});
  assert.deepEqual(r.parseRange('bytes=900-',1000),{start:900,end:999});
  assert.deepEqual(r.parseRange('bytes=-100',1000),{start:900,end:999});
  assert.deepEqual(r.parseRange('bytes=0-5000',1000),{start:0,end:999});
  assert.equal(r.parseRange('bytes=2000-',1000),'invalid');
  assert.equal(r.parseRange('items=0-1',1000),'invalid');
});

test('file dentro una cartella concessa',()=>{
  assert.equal(r.isInside('C:\\p\\src\\a.js','C:\\p'),true);
  assert.equal(r.isInside('C:\\p','C:\\p'),true);
  assert.equal(r.isInside('C:\\pippo\\a.js','C:\\p'),false);
  assert.equal(r.isInside('D:\\p\\a.js','C:\\p'),false);
});
