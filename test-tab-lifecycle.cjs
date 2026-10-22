'use strict';

// Test eseguibili con Node.js senza avviare Electron.
// Esecuzione: npm run check  (oppure: node --test test-tab-lifecycle.cjs)
const test=require('node:test');
const assert=require('node:assert/strict');
const {shouldCloseWindow,discardHomeAfterNavigation}=require('./tab-lifecycle.cjs');

test('chiudere l’ultima scheda visibile chiude la finestra, anche con tab negli altri workspace',()=>{
  // Personale ha finito le schede, Destiny Builder ne conserva due.
  const tabs=[{id:3,workspace:'Destiny Builder'},{id:4,workspace:'Destiny Builder'}];
  assert.equal(shouldCloseWindow(tabs,'Personale'),true);
});

test('se rimane una scheda nel workspace attivo la finestra deve restare aperta',()=>{
  const tabs=[{id:1,workspace:'Personale'},{id:2,workspace:'Destiny Builder'}];
  assert.equal(shouldCloseWindow(tabs,'Personale'),false);
});

test('l’ultima scheda dell’intero browser chiude la finestra',()=>{
  assert.equal(shouldCloseWindow([],'Personale'),true);
});

test('la ricerca sostituisce Home, senza spostare o perdere le altre schede',()=>{
  const tabs=[
    {id:1,workspace:'Personale',isHome:true},
    {id:2,workspace:'Personale',isHome:false,url:'https://google.com/search?q=destiny'},
    {id:3,workspace:'Gaming',isHome:false,url:'https://example.com'}
  ];
  assert.equal(discardHomeAfterNavigation(tabs,1,2,'Personale'),true);
  assert.deepEqual(tabs.map(x=>x.id),[2,3]);
});

test('se la nuova scheda non esiste, Home non viene eliminata',()=>{
  const tabs=[{id:1,workspace:'Personale',isHome:true}];
  assert.equal(discardHomeAfterNavigation(tabs,1,null,'Personale'),false);
  assert.equal(tabs.length,1);
});

test('non sostituisce una Home appartenente a un altro workspace',()=>{
  const tabs=[
    {id:1,workspace:'Gaming',isHome:true},
    {id:2,workspace:'Personale',isHome:false}
  ];
  assert.equal(discardHomeAfterNavigation(tabs,1,2,'Personale'),false);
  assert.equal(tabs.length,2);
});
