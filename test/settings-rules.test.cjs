'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {CATEGORIES,categoryOf,summaries,problems}=require('../settings-rules.js');

const base={
  settings:{engines:[{id:'google',label:'Google'}],searchEngine:'google',sleepAfterMinutes:30,autoArchive:{enabled:true,days:7},
    adblock:{enabled:true,exceptions:2},sitesWithPermissions:3,errors:0},
  appearanceSettings:{themes:[{id:'varco',label:'VARCO'}],theme:'varco',mode:'scuro',wallpaper:{kind:'image'},wallpaperName:'Celestial Fjord'},
  passwords:{available:true,entries:[{},{}]},
  link:{enabled:true,error:'',devices:[{name:'Pixel 8',lastSeen:1}]},
  extensions:{list:[{},{},{}]},
  update:{state:'latest',current:'0.34.0',supported:true},
  bangSettings:{builtIn:[{},{}],custom:[{}]},
};

test('ogni sezione delle Impostazioni ha una categoria, una sola volta', ()=>{
  const all=CATEGORIES.flatMap(c=>c.sections);
  assert.equal(new Set(all).size,all.length);
  assert.equal(categoryOf('Password'),'privacy');
  assert.equal(categoryOf('Disposizione'),'aspetto');
  assert.equal(categoryOf('Sezione nuova'),'sistema');
});

test('riassunti in parole', ()=>{
  const s=summaries(base,()=>'4 minuti fa');
  assert.equal(s.aspetto.text,'VARCO · tema scuro · Celestial Fjord');
  assert.equal(s.navigazione.text,'Google · 3 scorciatoie');
  assert.equal(s.schede.text,'Sospese dopo 30 min · archivio dopo 7 giorni');
  assert.equal(s.privacy.text,'Blocco attivo · 2 password · 3 siti con permessi');
  assert.equal(s.telefono.text,'Pixel 8 collegato · visto 4 minuti fa');
  assert.equal(s.estensioni.text,'3 estensioni');
  assert.equal(s.sistema.text,'VARCO 0.34.0');
  assert.deepEqual(problems(base),[]);
});

test('stato mancante o spento non rompe la panoramica', ()=>{
  const s=summaries({});
  for(const c of CATEGORIES)assert.equal(typeof s[c.id].text,'string');
  assert.equal(s.telefono.text,'Collegamento spento');
});

test('errori di telefono e aggiornamenti finiscono in "Da sistemare"', ()=>{
  const st={...base,link:{...base.link,error:'EADDRINUSE'},update:{...base.update,state:'error',error:'ETIMEDOUT'}};
  assert.deepEqual(problems(st).map(p=>p.id),['telefono','sistema']);
  assert.equal(summaries(st).sistema.error,true);
});
