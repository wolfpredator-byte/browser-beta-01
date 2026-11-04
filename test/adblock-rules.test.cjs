'use strict';
const test=require('node:test');
const assert=require('node:assert');
const {frameEvent}=require('../lib/adblock-rules.cjs');

function fakeEvent(){
  const calls={main:[],sub:[],css:[]};
  const mainFrame={processId:1,routingId:1,url:'https://www.youtube.com/',parent:null,executeJavaScript:c=>{calls.main.push(c);return Promise.resolve();}};
  const sub={processId:1,routingId:7,url:'https://www.youtube.com/embed',parent:mainFrame,executeJavaScript:c=>{calls.sub.push(c);return Promise.resolve();}};
  const sender={mainFrame,insertCSS:c=>calls.css.push(c),executeJavaScript:c=>calls.main.push(c)};
  return {calls,main:{sender,senderFrame:mainFrame,frameId:1,processId:1},sub:{sender,senderFrame:sub,frameId:7,processId:1}};
}

test('gli script di un iframe vanno nell\'iframe, non nella pagina principale',()=>{
  const {calls,sub}=fakeEvent();
  const ev=frameEvent(sub,'https://www.youtube.com/embed',undefined,new Set());
  ev.sender.executeJavaScript('x()');assert.match(calls.sub[0],/^{/);
  ev.sender.insertCSS('.ad{display:none}');
  assert.deepStrictEqual(calls.main,[]);
  assert.strictEqual(calls.sub.length,2);
  assert.match(calls.sub[1],/display:none/);
});

test('la prima richiesta di un documento vale una volta sola',()=>{
  const {main}=fakeEvent();const seen=new Set();
  assert.ok(frameEvent(main,'https://www.youtube.com/',undefined,seen));
  assert.strictEqual(frameEvent(main,'https://www.youtube.com/',undefined,seen),null);
  // gli aggiornamenti (msg presente) passano sempre: portano solo stili
  assert.ok(frameEvent(main,'https://www.youtube.com/',{classes:[]},seen));
  // nuova pagina nello stesso frame: di nuovo ammessa
  assert.ok(frameEvent(main,'https://www.youtube.com/watch?v=1',undefined,seen));
});

test('frame chiuso: niente da fare',()=>{
  const {main}=fakeEvent();
  assert.strictEqual(frameEvent({...main,senderFrame:null},'u',undefined,new Set()),null);
});

test('due scriptlet che dichiarano la stessa class non si scontrano',()=>{
  const vm=require('node:vm');const {isolate}=require('../lib/adblock-rules.cjs');
  const ctx=vm.createContext({});
  const code="if (typeof scriptletGlobals === 'undefined') { var scriptletGlobals = {n:0}; };class JSONPath{};scriptletGlobals.n++;";
  vm.runInContext(isolate(code),ctx);
  vm.runInContext(isolate(code),ctx);
  assert.strictEqual(vm.runInContext('scriptletGlobals.n',ctx),2);
  assert.throws(()=>{vm.runInContext(code,ctx);vm.runInContext(code,ctx);},/already been declared/);
});
