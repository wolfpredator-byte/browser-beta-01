'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {categoryOf,normalizeToastSettings,shouldShow}=require('../lib/toast-rules.cjs');

test('toast: categoria dichiarata, oppure dedotta dall\'id',()=>{
  assert.equal(categoryOf({id:'x',category:'sito'}),'sito');
  assert.equal(categoryOf({id:'download-12'}),'download');
  assert.equal(categoryOf({id:'rename'}),'sistema');
  assert.equal(categoryOf({id:'y',category:'inventata'}),'sistema');
});

test('toast: impostazioni predefinite tutte accese, false le spegne',()=>{
  assert.deepEqual(normalizeToastSettings(undefined),{download:true,sito:true,jarvis:true,sistema:true});
  assert.deepEqual(normalizeToastSettings({sito:false,altro:false}),{download:true,sito:false,jarvis:true,sistema:true});
});

test('toast: categoria spenta nasconde gli avvisi ma non le domande',()=>{
  const off={sito:false,download:false};
  assert.equal(shouldShow({id:'bookmark',category:'sito'},off),false);
  assert.equal(shouldShow({id:'password-1',category:'sito',ask:true},off),true);
  assert.equal(shouldShow({id:'download-3'},off),false);
  assert.equal(shouldShow({id:'rename'},off),true);
});

test('toast: zen nasconde tutto tranne i forzati',()=>{
  assert.equal(shouldShow({id:'password-1',ask:true},{},{zen:true}),false);
  assert.equal(shouldShow({id:'zen',force:true},{},{zen:true}),true);
});
