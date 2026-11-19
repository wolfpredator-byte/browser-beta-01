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

// ── Beta 0.45 ──
const R=require('../lib/adblock-rules.cjs');
test('liste divise per tipo (Beta 0.45)',()=>{
  const base='https://raw.githubusercontent.com/ghostery/adblocker/master/packages/adblocker/assets/';
  assert.strictEqual(R.listCategory(base+'easylist/easylist.txt'),'ads');
  assert.strictEqual(R.listCategory(base+'easylist/easyprivacy.txt'),'trk');
  assert.strictEqual(R.listCategory(base+'ublock-origin/privacy.txt'),'trk');
  assert.strictEqual(R.listCategory(base+'easylist/easylist-cookie.txt'),'ck');
  assert.strictEqual(R.listCategory(base+'ublock-origin/annoyances-cookies.txt'),'ck');
  assert.strictEqual(R.listCategory(base+'ublock-origin/annoyances-others.txt'),'soc');
  assert.strictEqual(R.listCategory(base+'ublock-origin/unbreak.txt'),'fix');
  assert.strictEqual(R.listCategory(base+'ublock-origin/filters-2024.txt'),'ads');
});
test('impostazioni del blocco: valori vecchi e sbagliati (Beta 0.45)',()=>{
  const a=R.normalizeSettings({enabled:true,allowlist:['www.Bank.it','x','bank.it'],compat:['bank.it','yt.com'],temp:{'a.com':{mode:'off',until:5},'b':{mode:'off',until:5},'c.com':{mode:'zz',until:5}},lists:{soc:true,ads:'no'}});
  assert.deepStrictEqual(a.allowlist,['bank.it']);
  assert.deepStrictEqual(a.compat,['yt.com']);
  assert.deepStrictEqual(a.temp,{'a.com':{mode:'off',until:5}});
  assert.deepStrictEqual(a.lists,{ads:true,trk:true,ck:true,soc:true,fix:true});
  assert.strictEqual(a.autoUpdate,true);
  assert.strictEqual(R.normalizeSettings(undefined).enabled,true);
});
test('modo per sito: sessione, 1 ora, sempre, sito genitore (Beta 0.45)',()=>{
  const a=R.normalizeSettings({}),s=new Map(),now=1000;
  assert.strictEqual(R.siteMode(a,s,'www.youtube.com',now).mode,'normal');
  R.setSiteMode(a,s,'www.youtube.com','compat','session',now);
  assert.deepStrictEqual(R.siteMode(a,s,'m.youtube.com',now),{mode:'compat',until:'session',site:'youtube.com'});
  R.setSiteMode(a,s,'youtube.com','off','1h',now);
  assert.strictEqual(s.size,0);
  assert.deepStrictEqual(R.siteMode(a,s,'youtube.com',now+10),{mode:'off',until:now+3600000,site:'youtube.com'});
  assert.strictEqual(R.siteMode(a,s,'youtube.com',now+3600001).mode,'normal');
  assert.strictEqual(R.pruneTemp(a,now+3600001),true);
  R.setSiteMode(a,s,'bank.it','off','always');R.setSiteMode(a,s,'tw.tv','compat','always');
  assert.deepStrictEqual(R.exceptions(a,s).map(e=>[e.site,e.mode,e.until]),[['bank.it','off',null],['tw.tv','compat',null]]);
  R.setSiteMode(a,s,'www.bank.it','normal');
  assert.deepStrictEqual(a.allowlist,[]);
  assert.strictEqual(R.setSiteMode(a,s,'nohost','off'),false);
});
test('avviso: ricariche a ripetizione ed errori degli script (Beta 0.45)',()=>{
  const d=R.createDetector();
  assert.strictEqual(d.load('youtube.com','https://www.youtube.com/watch?v=a',0),null);
  assert.strictEqual(d.load('youtube.com','https://www.youtube.com/watch?v=b',1000),null);
  assert.strictEqual(d.load('youtube.com','https://www.youtube.com/watch?v=a',2000),null);
  assert.deepStrictEqual(d.load('youtube.com','https://www.youtube.com/watch?v=a#t',3000),{kind:'loop',count:3});
  assert.strictEqual(d.load('youtube.com','https://www.youtube.com/watch?v=a',4000),null,'una volta sola');
  // ricariche lente: niente
  const e=R.createDetector();
  for(let i=0;i<5;i++)assert.strictEqual(e.load('x.com','https://x.com/',i*15000),null);
  assert.strictEqual(e.error('x.com','Uncaught TypeError: foo'),null);
  assert.deepStrictEqual(e.error('x.com',"Identifier 'JSONPath' has already been declared"),{kind:'script'});
  assert.strictEqual(R.reasonText({kind:'loop',count:3}),'3 ricariche in 20 secondi');
});
test('registro locale e controllo degli aggiornamenti (Beta 0.45)',()=>{
  const log=[];
  for(let i=0;i<2005;i++)R.addLog(log,{site:'a.com',url:'https://t.com/'+i,cat:'ads'},10*86400000+i);
  assert.strictEqual(log.length,2000);
  R.addLog(log,{site:'b.com',url:'u',cat:'trk'},20*86400000);
  assert.strictEqual(log.length,1,'più vecchi di 7 giorni: via');
  const body=n=>'! titolo\n'+Array.from({length:n},(_,i)=>'||ad'+i+'.com^').join('\n');
  const base='https://h/assets/';
  const files=[['easylist/easylist.txt',100],['easylist/easyprivacy.txt',50],['easylist/easylist-cookie.txt',30],['ublock-origin/annoyances-others.txt',25],['ublock-origin/unbreak.txt',25]].map(([f,n])=>({url:base+f,text:body(n)}));
  const ok=R.verifyUpdate(files,null);
  assert.strictEqual(ok.ok,true);assert.deepStrictEqual(ok.counts,{ads:100,trk:50,ck:30,soc:25,fix:25});
  assert.match(R.verifyUpdate(files,{ads:300}).problems[0],/Pubblicità: regole dimezzate/);
  const bad=R.verifyUpdate([{url:base+'easylist/easylist.txt',text:'<html>404</html>'.repeat(30)},...files.slice(1)],null);
  assert.strictEqual(bad.ok,false);assert.ok(bad.problems.some(p=>/easylist.txt: file non valido/.test(p)));
});
