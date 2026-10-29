'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {pageBounds,isVisibleOnScreens,shortcutCommand,HEADER,FOOTER,GAP,splitRects}=require('../lib/window-rules.cjs');

const content={width:1280,height:800};
const base={sidebarMode:'compact',sidePanelOpen:false,downloadsOpen:false,fullscreen:false};

test('la pagina lascia spazio a cornice, sidebar e barra schede, staccata dai bordi',()=>{
  assert.deepEqual(pageBounds(content,base),{x:62+GAP,y:HEADER+GAP,width:1280-62-2*GAP,height:800-HEADER-FOOTER-2*GAP});
  assert.equal(pageBounds(content,{...base,sidebarMode:'hidden'}).x,GAP);
  assert.equal(pageBounds(content,{...base,sidebarMode:'expanded',sidePanelOpen:true}).x,198+300+GAP);
  assert.equal(pageBounds(content,{...base,downloadsOpen:true}).width,1280-62-340-2*GAP);
});

test('video a schermo intero: la pagina copre tutta la finestra',()=>{
  assert.deepEqual(pageBounds({width:1920,height:1080},{...base,fullscreen:true}),{x:0,y:0,width:1920,height:1080});
});

test('posizione salvata su un monitor scollegato: non è più visibile',()=>{
  // Tre monitor affiancati; poi resta solo quello principale.
  const three=[{x:-1920,y:0,width:1920,height:1040},{x:0,y:0,width:1920,height:1040},{x:1920,y:0,width:1920,height:1040}];
  const onThird={x:2100,y:100,width:1200,height:800};
  assert.equal(isVisibleOnScreens(onThird,three),true);
  assert.equal(isVisibleOnScreens(onThird,[three[1]]),false);
  assert.equal(isVisibleOnScreens(undefined,three),false);
  assert.equal(isVisibleOnScreens({x:NaN,y:0,width:1,height:1},three),false);
});

test('scorciatoie principali',()=>{
  const key=(key,mods={})=>shortcutCommand({type:'keyDown',key,control:false,shift:false,alt:false,...mods});
  assert.equal(key('F12'),'toggleDevTools');
  assert.equal(key('I',{control:true,shift:true}),'toggleDevTools');
  assert.equal(key('T',{control:true,shift:true}),'reopenClosedTab');
  assert.equal(key('t',{control:true}),'newTab');
  assert.equal(key('w',{control:true}),'closeActiveTab');
  assert.equal(key('l',{control:true}),'focusAddress');
  assert.equal(key('F5'),'reload');
  assert.equal(key('ArrowLeft',{alt:true}),'back');
});

test('i tasti normali e i rilasci restano ai siti',()=>{
  assert.equal(shortcutCommand({type:'keyDown',key:'a',control:false,shift:false,alt:false}),null);
  assert.equal(shortcutCommand({type:'keyDown',key:'c',control:true,shift:false,alt:false}),null); // Copia
  assert.equal(shortcutCommand({type:'keyUp',key:'F12',control:false,shift:false,alt:false}),null);
  assert.equal(shortcutCommand(null),null);
});

test('Beta 0.9.1: cerca, stampa e zoom',()=>{
  const key=(key,mods={})=>shortcutCommand({type:'keyDown',key,control:true,shift:false,alt:false,...mods});
  assert.equal(key('f'),'openFind');
  assert.equal(key('p'),'print');
  assert.equal(key('='),'zoomIn');
  assert.equal(key('+',{shift:true}),'zoomIn'); // tastiera italiana: + con Shift
  assert.equal(key('-'),'zoomOut');
  assert.equal(key('0'),'zoomReset');
});

test('vista divisa: due riquadri separati dal divisore, quote tra 20% e 80%',()=>{
  const full={x:70,y:102,width:1208,height:600};
  const r=splitRects(full,0.5);
  assert.equal(r.left.x,70);assert.equal(r.left.width+GAP+r.right.width,1208);
  assert.equal(r.divider.x,r.left.x+r.left.width);assert.equal(r.right.x,r.divider.x+GAP);
  assert.equal(r.left.height,600);
  assert.equal(splitRects(full,0.05).left.width,Math.round((1208-GAP)*0.2));
  assert.equal(splitRects(full,0.99).left.width,Math.round((1208-GAP)*0.8));
});
