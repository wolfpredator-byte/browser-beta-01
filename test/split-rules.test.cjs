'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeSplit,layoutSplit,addToSplit,removeFromSplit}=require('../split-rules.js');

const full={x:100,y:100,width:1008,height:808};

test('vista della 0.18 e valori sbagliati', ()=>{
  assert.deepEqual(normalizeSplit({leftId:1,rightId:2,ratio:.9}),{mode:'cols',ids:[1,2],ratioX:.8,ratioY:.5});
  assert.equal(normalizeSplit({mode:'grid',ids:[1,2,3]}),null);
  assert.equal(normalizeSplit({mode:'cols',ids:[1,1]}),null);
  assert.equal(normalizeSplit(null),null);
});

test('posizioni dei riquadri e divisori', ()=>{
  const two=layoutSplit(full,{mode:'cols',ids:[1,2],ratioX:.5},8);
  assert.deepEqual(two.rects[1],{x:100,y:100,width:500,height:808});
  assert.deepEqual(two.rects[2],{x:608,y:100,width:500,height:808});
  assert.equal(two.dividers.length,1);
  const grid=layoutSplit(full,{mode:'grid',ids:[1,2,3,4]},8);
  assert.deepEqual([grid.rects[4].x,grid.rects[4].y],[608,508]);
  assert.equal(grid.dividers.length,2);
  const m=layoutSplit(full,{mode:'main3',ids:[1,2,3]},8);
  assert.equal(m.rects[1].height,808);                 // A alta tutta
  assert.equal(m.rects[2].x,m.rects[3].x);             // B e C nella colonna di destra
  assert.deepEqual(m.dividers.map(d=>d.axis),['x','y']);
});

test('aggiungere trascinando su un lato: da 1 a 4 riquadri', ()=>{
  assert.deepEqual(addToSplit(null,1,2,'left').ids,[2,1]);
  assert.equal(addToSplit(null,1,2,'top').mode,'rows');
  const two=addToSplit(null,1,2,'right');
  const three=addToSplit(two,1,3,'bottom');
  assert.deepEqual([three.mode,three.ids],['main3',[1,2,3]]);
  const four=addToSplit(three,1,4,'left');
  assert.deepEqual([four.mode,four.ids],['grid',[1,2,4,3]]);
  assert.equal(addToSplit(four,1,5,'right'),null);       // al massimo 4
  assert.equal(addToSplit(two,1,2,'left'),null);         // già dentro
  assert.equal(addToSplit({mode:'rows',ids:[1,2]},1,3,'bottom'),null);
});

test('togliere: da 4 a nessuna vista', ()=>{
  const grid={mode:'grid',ids:[1,2,3,4]};
  assert.deepEqual(removeFromSplit(grid,1),{mode:'main3',ids:[3,2,4],ratioX:.5,ratioY:.5});
  assert.deepEqual(removeFromSplit(grid,2).mode,'main3r');
  assert.deepEqual(removeFromSplit({mode:'main3',ids:[1,2,3]},2).ids,[1,3]);
  assert.equal(removeFromSplit({mode:'cols',ids:[1,2]},2),null);
});
