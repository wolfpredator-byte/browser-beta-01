'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createMcpHandler,validateArguments,checkHttpRequest,PROTOCOL_VERSIONS,ERRORS}=require('../lib/mcp-protocol.cjs');

const activity=[];
const handler=createMcpHandler({
  serverInfo:{name:'personal-browser',version:'0.9.0'},
  instructions:'Strumenti del browser.',
  onActivity:e=>activity.push(e),
  tools:()=>[
    {name:'open_url',description:'Apre un indirizzo',inputSchema:{type:'object',
      properties:{url:{type:'string',maxLength:20},window:{type:'integer',minimum:1}},required:['url']},
      run:args=>({tab_id:7,url:args.url})},
    {name:'set_orb_state',description:'Sfera',inputSchema:{type:'object',
      properties:{state:{type:'string',enum:['idle','thinking']}},required:['state']},run:()=>undefined},
    {name:'broken',description:'Fallisce',inputSchema:{type:'object',properties:{}},run:()=>{throw Error('guasto');}}
  ]
});
const call=(method,params,id=1)=>handler.handle({jsonrpc:'2.0',id,method,params});

test('initialize: stessa versione del client se la conosciamo, altrimenti la nostra',async()=>{
  const r=await call('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'jarvis',version:'1'}});
  assert.equal(r.result.protocolVersion,'2025-03-26');
  assert.deepEqual(r.result.capabilities,{tools:{listChanged:false}});
  assert.equal(r.result.serverInfo.name,'personal-browser');
  assert.equal(r.result.instructions,'Strumenti del browser.');
  assert.equal((await call('initialize',{protocolVersion:'2099-01-01'})).result.protocolVersion,PROTOCOL_VERSIONS[0]);
});

test('notifiche e risposte del client non ricevono risposta',async()=>{
  assert.equal(await handler.handle({jsonrpc:'2.0',method:'notifications/initialized'}),null);
  assert.equal(await handler.handle({jsonrpc:'2.0',id:5,result:{}}),null);
});

test('tools/list espone nome, descrizione e schema, non la funzione',async()=>{
  const {result}=await call('tools/list',{});
  assert.deepEqual(result.tools.map(t=>t.name),['open_url','set_orb_state','broken']);
  assert.equal(result.tools[0].run,undefined);
  assert.equal(result.tools[0].inputSchema.required[0],'url');
});

test('tools/call: testo JSON e structuredContent',async()=>{
  const {result}=await call('tools/call',{name:'open_url',arguments:{url:'light.gg'}});
  assert.equal(result.isError,false);
  assert.deepEqual(result.structuredContent,{tab_id:7,url:'light.gg'});
  assert.deepEqual(JSON.parse(result.content[0].text),{tab_id:7,url:'light.gg'});
  const empty=await call('tools/call',{name:'set_orb_state',arguments:{state:'idle'}});
  assert.deepEqual(empty.result.structuredContent,{ok:true});
});

test('argomenti sbagliati ed errori degli strumenti diventano isError, non eccezioni',async()=>{
  const bad=await call('tools/call',{name:'open_url',arguments:{url:42}});
  assert.equal(bad.result.isError,true);
  assert.match(bad.result.content[0].text,/url: atteso string/);
  const broken=await call('tools/call',{name:'broken',arguments:{}});
  assert.equal(broken.result.isError,true);
  assert.equal(broken.result.content[0].text,'guasto');
  assert.deepEqual(activity.slice(-2).map(a=>a.ok),[false,false]);
});

test('strumento o metodo sconosciuto: errore JSON-RPC',async()=>{
  assert.equal((await call('tools/call',{name:'format_c',arguments:{}})).error.code,ERRORS.invalidParams);
  assert.equal((await call('resources/list',{})).error.code,ERRORS.methodNotFound);
  assert.equal((await handler.handle({id:1,method:'ping'})).error.code,ERRORS.invalidRequest);
  assert.deepEqual((await call('ping')).result,{});
});

test('validazione degli argomenti',()=>{
  const schema={type:'object',properties:{n:{type:'integer',minimum:1,maximum:3},s:{type:'string',enum:['a','b']},b:{type:'boolean'}},required:['n']};
  assert.equal(validateArguments(schema,{n:2,s:'a',b:true}),null);
  assert.match(validateArguments(schema,{}),/obbligatorio: n/);
  assert.match(validateArguments(schema,{n:5}),/massimo 3/);
  assert.match(validateArguments(schema,{n:1.5}),/atteso integer/);
  assert.match(validateArguments(schema,{n:1,s:'c'}),/valori ammessi/);
  assert.match(validateArguments(schema,{n:1,extra:1}),/sconosciuto: extra/);
  assert.match(validateArguments(schema,[1]),/oggetto/);
});

test('HTTP: solo host locale, nessuna pagina web, token obbligatorio',()=>{
  const cfg={port:37201,token:'abc'};
  const ok={method:'POST',host:'127.0.0.1:37201',authorization:'Bearer abc'};
  assert.equal(checkHttpRequest(ok,cfg),null);
  assert.equal(checkHttpRequest({...ok,host:'localhost:37201',origin:'http://localhost:37201'},cfg),null);
  // DNS rebinding: un dominio esterno che punta a 127.0.0.1.
  assert.equal(checkHttpRequest({...ok,host:'evil.example:37201'},cfg).status,403);
  // Una pagina web aperta nel browser che prova a chiamare JARVIS.
  assert.equal(checkHttpRequest({...ok,origin:'https://evil.example'},cfg).status,403);
  assert.equal(checkHttpRequest({...ok,authorization:'Bearer sbagliato'},cfg).status,401);
  assert.equal(checkHttpRequest({...ok,authorization:undefined},cfg).status,401);
  assert.equal(checkHttpRequest({...ok,method:'GET'},cfg).status,405);
});
