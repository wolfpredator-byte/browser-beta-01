'use strict';
// Questi test descrivono il comportamento desiderato senza avviare Electron.
const test=require('node:test'),assert=require('node:assert/strict');
const {tabStripItems,toggleCollapsed,moveTab,rememberClosed,groupName}=require('./tab-advanced.cjs');

const tabs=()=>[
 {id:1,workspace:'Personale',url:'https://a.it',group:'Ricerca'},
 {id:2,workspace:'Personale',url:'https://b.it',group:null},
 {id:3,workspace:'Personale',url:'https://c.it',group:'Ricerca'},
 {id:4,workspace:'Gaming',url:'https://game.it',group:'Ricerca'}
];

test('due schede con lo stesso gruppo compaiono in uno stack',()=>{
 const entries=tabStripItems(tabs(),'Personale',{},3);
 assert.deepEqual(entries.map(e=>e.kind),['group','tab','tab','tab']);
 assert.equal(entries[0].count,2);
 assert.equal(entries[0].active,true);
});

test('collassare nasconde solo i figli: non elimina le schede',()=>{
 const source=tabs(),state={};
 assert.equal(toggleCollapsed(state,'Personale','Ricerca'),true);
 const entries=tabStripItems(source,'Personale',state,3);
 assert.equal(source.length,4);
 assert.deepEqual(entries.map(e=>e.kind),['group','tab']);
 assert.equal(entries[0].active,true);
 assert.equal(entries[0].collapsed,true);
 assert.equal(toggleCollapsed(state,'Personale','Ricerca'),false);
});

test('la compressione è indipendente tra workspace',()=>{
 const state={};toggleCollapsed(state,'Personale','Ricerca');
 assert.equal(tabStripItems(tabs(),'Gaming',state,4)[0].collapsed,false);
});

test('spostare una tab cambia il workspace, non la sua identità',()=>{
 const source=tabs(),tab=source[0];
 assert.equal(moveTab(source,1,'Gaming',['Personale','Gaming']),true);
 assert.equal(tab.workspace,'Gaming');assert.equal(tab.id,1);
 assert.equal(source.length,4);
 assert.equal(moveTab(source,1,'NonEsiste',['Personale','Gaming']),false);
});

test('nessuna modifica per un gruppo senza nome',()=>{
 assert.equal(groupName('    '),null);
 const state={};assert.equal(toggleCollapsed(state,'Personale',''),false);
 assert.deepEqual(state,{});
});

test('riapertura: cronologia in ordine inverso, massimo 20 elementi',()=>{
 const closed=[];
 for(let i=0;i<23;i++)rememberClosed(closed,{url:'https://example.org/'+i,workspace:'Personale',title:'T'+i});
 assert.equal(closed.length,20);
 assert.equal(closed[0].url,'https://example.org/22');
 assert.equal(closed[19].url,'https://example.org/3');
});

test('Home può essere riaperta; URL non web vengono ignorati',()=>{
 const closed=[];
 rememberClosed(closed,{isHome:true,url:'app://home',workspace:'Personale'});
 rememberClosed(closed,{url:'javascript:alert(1)',workspace:'Personale'});
 assert.equal(closed.length,1);
 assert.equal(closed[0].home,true);
});
