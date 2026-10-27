'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {toRelative,pickDisplay,toAbsolute,missingTabs,describeLayout,displayForBounds}=require('../lib/layout-rules.cjs');
const {paneOf,isInWindow,nextPane}=require('../lib/tab-advanced.cjs');
const {shortcutCommand}=require('../lib/window-rules.cjs');

// I tuoi tre monitor 1920×1080 affiancati, il principale al centro; barra di Windows di 40px.
const display=(id,x)=>({id,bounds:{x,y:0,width:1920,height:1080},workArea:{x,y:0,width:1920,height:1040}});
const three=[display(20,1920),display(10,0),display(30,-1920)];

test('posizione relativa: monitor da sinistra, proporzioni dell’area utile',()=>{
  const r=toRelative({x:1920+960,y:0,width:960,height:1040},three);
  assert.equal(r.displayId,20);
  assert.equal(r.displayIndex,2); // il terzo da sinistra
  assert.deepEqual(r.rect,{x:0.5,y:0,w:0.5,h:1});
});

test('andata e ritorno: la finestra torna nello stesso punto',()=>{
  const bounds={x:-1920+100,y:50,width:1200,height:800};
  const r=toRelative(bounds,three);
  assert.deepEqual(toAbsolute(r.rect,pickDisplay(r,three,10).workArea),bounds);
});

test('scelta del monitor: id, poi posizione da sinistra, poi principale',()=>{
  assert.equal(pickDisplay({displayId:30,displayIndex:0},three,10).id,30);
  // Dopo un aggiornamento dei driver gli id cambiano: conta la posizione.
  const renamed=[display(21,1920),display(11,0),display(31,-1920)];
  assert.equal(pickDisplay({displayId:20,displayIndex:2},renamed,11).id,21);
  // Il terzo monitor è scollegato: si usa il principale.
  assert.equal(pickDisplay({displayId:20,displayIndex:2},[display(10,0)],10).id,10);
});

test('mai fuori dal monitor né sotto la dimensione minima',()=>{
  const area={x:0,y:0,width:1920,height:1040};
  assert.deepEqual(toAbsolute({x:0.9,y:0.9,w:0.5,h:0.5},area),{x:960,y:520,width:960,height:520});
  assert.deepEqual(toAbsolute({x:0,y:0,w:0.1,h:0.1},area),{x:0,y:0,width:760,height:520});
  // Monitor più piccolo della finestra minima: si adatta al monitor.
  assert.deepEqual(toAbsolute({x:0,y:0,w:1,h:1},{x:0,y:0,width:700,height:500}),{x:0,y:0,width:700,height:500});
});

test('finestra a cavallo di due monitor: conta dove sta il centro',()=>{
  assert.equal(displayForBounds({x:1500,y:0,width:1000,height:600},three).id,20);
  // Fuori da tutti i monitor: il più vicino.
  assert.equal(displayForBounds({x:6000,y:0,width:100,height:100},three).id,20);
});

test('schede da aggiungere: solo quelle mancanti, Home esclusa',()=>{
  const wanted=[{url:'app://home',home:true},{url:'https://github.com/'},{url:'https://light.gg/'}];
  assert.deepEqual(missingTabs(wanted,['https://github.com/']).map(t=>t.url),['https://light.gg/']);
});

test('descrizione della disposizione',()=>{
  assert.equal(describeLayout({windows:[{displayIndex:0},{displayIndex:1},{displayIndex:2}]}),'3 finestre su 3 monitor');
  assert.equal(describeLayout({windows:[{displayIndex:1}]}),'1 finestra su 1 monitor');
  assert.equal(describeLayout(null),'');
});

test('finestre numerate: le schede vecchie stanno nella principale',()=>{
  assert.equal(paneOf({workspace:'A'}),0);
  assert.equal(paneOf({workspace:'A',pane:2}),2);
  assert.equal(paneOf({workspace:'A',pane:-1}),0);
  assert.equal(isInWindow({workspace:'A'},{workspace:'A',pane:0}),true);
  assert.equal(isInWindow({workspace:'A',pane:1},{workspace:'A',pane:0}),false);
  assert.equal(isInWindow({workspace:'B',pane:1},{workspace:'A',pane:1}),false);
});

test('numero della nuova finestra: il primo libero',()=>{
  assert.equal(nextPane([0]),1);
  assert.equal(nextPane([0,1,2]),3);
  assert.equal(nextPane([0,2]),1);
});

test('Ctrl+N apre una nuova finestra del workspace',()=>{
  assert.equal(shortcutCommand({type:'keyDown',key:'n',control:true,shift:false,alt:false}),'newWindow');
});
