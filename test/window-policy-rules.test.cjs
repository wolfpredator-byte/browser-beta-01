'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const W=require('../lib/window-policy-rules.cjs');

const mk=(id,x,w,h,label)=>({id,label,bounds:{x,y:0,width:w,height:h},size:{width:w,height:h},workArea:{x,y:0,width:w,height:h-40}});
const left=mk(111,0,1920,1080,'DELL U2419H'),right=mk(222,1920,2560,1440,'LG 27GL850');
const primary=left;

test('monitor ritrovato per impronta anche se Windows gli cambia l’id',()=>{
  const key=W.displayKey(right);
  assert.equal(W.findDisplay(key,[left,right]).id,222);
  const renumbered=[mk(5,0,1920,1080,'DELL U2419H'),mk(9,1920,2560,1440,'LG 27GL850')];
  assert.equal(W.findDisplay(key,renumbered).id,9);              // stesso nome e risoluzione
  const moved=[mk(5,0,1920,1080,''),mk(9,-2560,2560,1440,'')];
  assert.equal(W.findDisplay(key,moved),null);                    // niente nome, posizione diversa: non indoviniamo
  assert.equal(W.findDisplay(null,[left]),null);
});

test('il companion va sul monitor del gioco, non dove era l’ultima finestra di VARCO',()=>{
  const game={display:111,place:{display:W.displayKey(right),side:'right',size:50}};
  const t=W.companionTarget(game,null,[left,right],primary);
  assert.equal(t.display.id,222);
  assert.deepEqual(t.rect,{x:1920+1280,y:0,width:1280,height:1400});
  assert.equal(t.maximize,false);
});

test('monitor scollegato → principale; nessuna regola → posizione predefinita del companion',()=>{
  const gone={place:{display:{id:999,label:'TV',w:3840,h:2160,x:5000,y:0},side:'full',size:100}};
  assert.equal(W.companionTarget(gone,null,[left,right],primary).display.id,111);
  const def={display:W.displayKey(right),side:'left',size:50};
  const t=W.companionTarget({display:null},def,[left,right],primary);
  assert.equal(t.display.id,222);assert.equal(t.rect.width,1280);
  assert.equal(W.companionTarget({display:null},null,[left,right],primary).maximize,true); // tutto schermo sul principale
});

test('vecchi giochi (solo id del monitor) funzionano ancora',()=>{
  assert.equal(W.companionTarget({display:222},null,[left,right],primary).display.id,222);
});

test('«Apri sempre qui»: posizione relativa che resta giusta anche se cambia la risoluzione',()=>{
  const rel=W.relativeTo(right.workArea,{x:1920+640,y:100,width:1280,height:700});
  assert.deepEqual(rel,{x:0.25,y:0.071,w:0.5,h:0.5});
  const rect=W.placeRect(right.workArea,{side:'custom',rel});
  assert.deepEqual(rect,{x:2560,y:99,width:1280,height:700});
  assert.equal(W.normalizePlace({side:'custom'}).side,'full');      // custom senza posizione: tutto schermo
});

test('«Sposta sull’altro monitor»: il successivo, poi si ricomincia',()=>{
  assert.equal(W.nextDisplay(left,[right,left]).id,222);
  assert.equal(W.nextDisplay(right,[right,left]).id,111);
});
