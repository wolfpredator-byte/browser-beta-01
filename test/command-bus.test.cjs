'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createCommandBus,validateArgs}=require('../lib/command-bus.cjs');

test('un comando riceve solo i parametri dichiarati',async()=>{
  const bus=createCommandBus();let received;
  bus.register('closeTab',{args:{id:'int'},run:(_ctx,args)=>{received=args;return 'ok';}});
  const result=await bus.dispatch('closeTab',{id:4,extra:'ignorato'},{});
  assert.deepEqual(result,{ok:true,result:'ok'});
  assert.deepEqual(received,{id:4});
});

test('tipi sbagliati o campi mancanti non arrivano alla funzione',async()=>{
  const bus=createCommandBus();let calls=0;
  bus.register('closeTab',{args:{id:'int'},run:()=>{calls++;}});
  assert.equal((await bus.dispatch('closeTab',{id:'4'})).ok,false);
  assert.equal((await bus.dispatch('closeTab',{})).ok,false);
  assert.equal((await bus.dispatch('closeTab',null)).ok,false);
  assert.equal(calls,0);
});

test('campi facoltativi ed elenchi di valori ammessi',()=>{
  assert.deepEqual(validateArgs({url:'string?'},{}),{ok:true,args:{}});
  assert.deepEqual(validateArgs({mode:['compact','hidden']},{mode:'hidden'}),{ok:true,args:{mode:'hidden'}});
  assert.equal(validateArgs({mode:['compact','hidden']},{mode:'gigante'}).ok,false);
  assert.equal(validateArgs({id:'int'},[1]).ok,false);
});

test('comandi sconosciuti ed errori interni non lanciano eccezioni',async()=>{
  const bus=createCommandBus();
  bus.register('rotto',{run:()=>{throw Error('guasto');}});
  assert.deepEqual(await bus.dispatch('nonEsiste',{}),{ok:false,error:'comando sconosciuto: nonEsiste'});
  const original=console.error;console.error=()=>{};
  try{assert.deepEqual(await bus.dispatch('rotto',{}),{ok:false,error:'guasto'});}
  finally{console.error=original;}
});

test('il contesto (finestra, provenienza) arriva al comando',async()=>{
  const bus=createCommandBus();
  bus.register('chi',{run:ctx=>ctx.source});
  assert.equal((await bus.dispatch('chi',{},{source:'jarvis'})).result,'jarvis');
});

test('nomi duplicati vengono rifiutati; list() descrive i comandi',()=>{
  const bus=createCommandBus();
  bus.register('newTab',{args:{url:'string?'},description:'Apre una scheda',run:()=>{}});
  assert.throws(()=>bus.register('newTab',{run:()=>{}}));
  assert.deepEqual(bus.list(),[{name:'newTab',args:{url:'string?'},description:'Apre una scheda'}]);
});
