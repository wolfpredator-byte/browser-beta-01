'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {pageBounds,isVisibleOnScreens,shortcutCommand,HEADER,FOOTER}=require('../lib/window-rules.cjs');

const content={width:1280,height:800};
const base={sidebarMode:'compact',sidePanelOpen:false,downloadsOpen:false,fullscreen:false};

test('la pagina lascia spazio a cornice, sidebar e barra schede',()=>{
  assert.deepEqual(pageBounds(content,base),{x:62,y:HEADER,width:1218,height:800-HEADER-FOOTER});
  assert.equal(pageBounds(content,{...base,sidebarMode:'hidden'}).x,0);
  assert.equal(pageBounds(content,{...base,sidebarMode:'expanded',sidePanelOpen:true}).x,198+300);
  assert.equal(pageBounds(content,{...base,downloadsOpen:true}).width,1280-62-340);
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
