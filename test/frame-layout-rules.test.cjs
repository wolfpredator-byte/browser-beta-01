'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {frameLayout,normalizeLayout,presetOf,compactInsets,COMPACT_EDGE,PRESETS,HEADER,TABS_BAR,TABS_COLUMN,MERGED_COLUMN,SIDEBAR_STRIP}=require('../lib/frame-layout-rules.cjs');

const W={width:1600,height:900};

test('classico: barra laterale a sinistra, schede in basso', ()=>{
  const f=frameLayout(W,PRESETS.classico,'compact');
  assert.deepEqual([f.top,f.bottom,f.left,f.right],[HEADER,TABS_BAR,62,0]);
  assert.equal(f.tabs.orientation,'horizontal');
  assert.deepEqual([f.tabs.y,f.tabs.width],[900-TABS_BAR,1600]);
  assert.deepEqual([f.sidebar.x,f.sidebar.y,f.sidebar.height],[0,HEADER,900-HEADER-TABS_BAR]); // tra le strisce
});

test('colonna unica e icone + colonna', ()=>{
  const one=frameLayout(W,PRESETS.colonna,'compact');
  assert.equal(one.tabs,null);                       // le schede stanno dentro la colonna
  assert.equal(one.sidebar.merged,true);
  assert.deepEqual([one.left,one.bottom],[MERGED_COLUMN,0]);
  const two=frameLayout(W,PRESETS['icone-colonna'],'compact');
  assert.equal(two.sidebar.x,0);
  assert.equal(two.tabs.x,62);                       // le schede vicino alla pagina
  assert.equal(two.left,62+TABS_COLUMN);
  assert.equal(two.tabs.orientation,'vertical');
});

test('workspace in basso, tutto a destra, barra nascosta', ()=>{
  const low=frameLayout(W,PRESETS['workspace-basso'],'expanded');
  assert.deepEqual([low.bottom,low.left],[SIDEBAR_STRIP,TABS_COLUMN]);
  assert.equal(low.sidebar.orientation,'horizontal');
  assert.equal(low.tabs.height,900-HEADER-SIDEBAR_STRIP);
  const right=frameLayout(W,PRESETS.destra,'compact');
  assert.deepEqual([right.left,right.right],[0,MERGED_COLUMN]);
  assert.equal(right.sidebar.x,1600-MERGED_COLUMN);
  assert.deepEqual([right.sidebar.offset,right.sidebar.size],[0,MERGED_COLUMN]);
  assert.equal(frameLayout(W,PRESETS['icone-colonna'],'compact').tabs.offset,62);
  const hidden=frameLayout(W,PRESETS.colonna,'hidden');
  assert.equal(hidden.sidebar,null);
  assert.equal(hidden.tabs.width,TABS_COLUMN);        // la barra laterale sparisce, le schede restano
});

test('valori sbagliati e combinazioni pronte', ()=>{
  assert.deepEqual(normalizeLayout({tabs:'sopra',sidebar:42}),{tabs:'bottom',sidebar:'left',merge:true,compact:false});
  assert.equal(normalizeLayout({compact:true}).compact,true);
  assert.equal(presetOf({tabs:'left',sidebar:'left',merge:false}),'icone-colonna');
  assert.equal(presetOf({tabs:'top',sidebar:'right'}),'');
  const top=frameLayout(W,PRESETS['schede-alto'],'compact');
  assert.deepEqual([top.top,top.bottom,top.tabs.y],[HEADER+TABS_BAR,0,HEADER]);
});

test('modalità compatta: solo un bordo sottile dove ci sono barre', ()=>{
  const f=compactInsets(frameLayout(W,PRESETS.classico,'compact'));
  assert.deepEqual([f.top,f.bottom,f.left,f.right],[COMPACT_EDGE,COMPACT_EDGE,COMPACT_EDGE,0]);
  assert.ok(f.tabs&&f.sidebar);                        // le barre restano al loro posto, sotto la pagina
});
