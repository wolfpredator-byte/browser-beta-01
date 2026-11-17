'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const T=require('../tour-rules.js');

test('passi: setup breve, tour di 8 passi, un concetto ciascuno',()=>{
  assert.equal(T.STEPS.tour.length,8);
  assert.ok(T.STEPS.setup.length<=7);
  assert.deepEqual(T.STEPS.tour.map(s=>s.title),['VARCO, il tuo spazio','Workspace','Palette','Fast link','Progetti','Pannelli','Giochi','Sicurezza']);
  for(const s of [...T.STEPS.setup,...T.STEPS.tour]){assert.ok(s.text.length<=120,s.id);assert.ok(s.action||s.themes,s.id);}
  assert.ok(T.STEPS.tour.find(s=>s.id==='t-sec').text.includes('password manager esterno'));
});

test('stato: valori di partenza e ripulitura',()=>{
  const t=T.normalizeTour(undefined);
  assert.deepEqual(t,{never:false,hints:true,offered:false,pending:false,setup:{idx:0,finished:false},tour:{idx:0,finished:false},done:[],seenHints:[]});
  const bad=T.normalizeTour({never:'si',setup:{idx:99},done:['x','t-ws','t-ws'],seenHints:['palette','boh']});
  assert.equal(bad.never,false);assert.equal(bad.setup.idx,0);assert.deepEqual(bad.done,['t-ws']);assert.deepEqual(bad.seenHints,['palette']);
});

test('primo avvio: il setup parte da solo una volta sola',()=>{
  assert.equal(T.isFirstRun({history:[],bookmarks:[]}),true);
  assert.equal(T.isFirstRun({history:[{url:'x'}]}),false);              // chi aggiorna da una versione precedente
  assert.equal(T.isFirstRun({tour:{},history:[]}),false);
  let t=T.initTour({history:[],bookmarks:[]});
  assert.equal(T.shouldOffer(t),true);
  assert.equal(T.shouldOffer(T.initTour({history:[{url:'x'}]})),false);
  assert.equal(T.shouldOffer(T.initTour({tour:t,history:[]})),true);    // ricaricato prima di aprirlo: ancora da proporre
  t=T.apply(t,{type:'step',level:'setup',idx:2});
  assert.equal(T.shouldOffer(t),false);                                  // già proposto: non riparte a ogni avvio
});

test('progresso: riprende dal passo, poi «finito»',()=>{
  let t=T.apply(T.normalizeTour(),{type:'step',level:'tour',idx:4});
  assert.equal(t.tour.idx,4);
  t=T.apply(t,{type:'done',id:'t-proj'});assert.deepEqual(t.done,['t-proj']);
  t=T.apply(t,{type:'finish',level:'tour'});assert.equal(t.tour.finished,true);assert.equal(t.tour.idx,0);
});

test('«Non mostrare più» rispettato al 100%: niente setup, niente suggerimenti, finché non lo riapri tu',()=>{
  let t=T.apply(T.initTour({}),{type:'never'});
  assert.equal(T.shouldOffer(t),false);
  for(const id of Object.keys(T.HINTS))assert.equal(T.canHint(t,id),false);
  t=T.apply(t,{type:'restart',level:'tour'});                            // «Ripeti il tour» dalle Impostazioni
  assert.equal(t.never,false);assert.equal(t.tour.idx,0);
});

test('suggerimenti: una volta sola ciascuno, e si possono spegnere',()=>{
  let t=T.normalizeTour();
  assert.equal(T.canHint(t,'palette'),true);
  t=T.apply(t,{type:'hint',id:'palette'});
  assert.equal(T.canHint(t,'palette'),false);
  assert.equal(T.canHint(t,'project'),true);
  t=T.apply(t,{type:'hints',on:false});
  assert.equal(T.canHint(t,'project'),false);
  assert.equal(T.canHint(t,'inesistente'),false);
});
