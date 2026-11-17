'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const R=require('../launcher-rules.js');

const site=(t,u)=>({type:'site',title:t,target:u});

test('fast link: solo tipi e destinazioni valide',()=>{
  assert.deepEqual(R.normalizeItem(site('light.gg','https://www.light.gg/')),{type:'site',title:'light.gg',target:'https://www.light.gg/'});
  assert.equal(R.normalizeItem(site('x','javascript:alert(1)')),null);
  assert.equal(R.normalizeItem({type:'app',title:'x',target:'notepad.exe'}),null); // serve un percorso completo
  assert.equal(R.normalizeItem({type:'folder',target:'C:\\Projects'}).title,'Projects');
  assert.equal(R.normalizeItem({type:'cmd',title:'dev',target:'',ws:'Sviluppo',index:0}).index,0);
  assert.equal(R.normalizeItem({type:'cmd',target:'',ws:'Sviluppo'}),null);
  assert.equal(R.normalizeItem({type:'boh',target:'x'}),null);
});

test('impostazioni: valori di partenza, profili ripuliti',()=>{
  const l=R.normalizeLauncher(undefined);
  assert.equal(l.enabled,true);assert.equal(l.hotkey,'Control+Alt+Space');assert.equal(l.hotkeyChosen,false);
  assert.deepEqual(l.profiles,{});assert.equal(l.generic.slots,null);
  const l2=R.normalizeLauncher({hotkey:'Alt+F4',profiles:{'Destiny2.EXE':{app:'Destiny 2',slots:[site('a','https://a.com'),site('a2','https://a.com'),null]},'../x':{slots:[]}}});
  assert.equal(l2.hotkey,'Control+Alt+Space');
  assert.deepEqual(Object.keys(l2.profiles),['destiny2.exe']);
  const p=l2.profiles['destiny2.exe'];
  assert.equal(p.slots.length,8);assert.equal(p.slots[1],null); // doppione tolto
});

test('profilo giusto per il programma in primo piano',()=>{
  assert.equal(R.profileKeyOf('Destiny2.exe'),'destiny2.exe');
  assert.equal(R.profileKeyOf('explorer.exe'),'*');
  assert.equal(R.profileKeyOf('VARCO.exe'),'*');
  assert.equal(R.profileKeyOf(''),'*');
  assert.equal(R.colorFor('*'),null);
  assert.equal(R.colorFor('unity.exe'),R.colorFor('unity.exe'));
});

test('modifica: metti, aggiungi, sposta, svuota',()=>{
  let p={app:'X',slots:Array(8).fill(null),more:[]};
  p=R.put(p,2,site('A','https://a.com'));
  assert.equal(p.slots[2].title,'A');
  p=R.put(p,2,site('B','https://b.com'));
  assert.equal(p.slots[2].title,'B');assert.equal(p.more[0].title,'A'); // quello di prima non si perde
  p=R.put(p,0,site('B','https://b.com'));
  assert.equal(p.slots[0].title,'B');assert.equal(p.slots[2],null);     // niente doppioni sull'anello
  let r=R.add(p,site('A','https://a.com'));
  assert.equal(r.slot,1);assert.equal(r.profile.more.length,0);
  p=R.swap(r.profile,0,1);assert.equal(p.slots[0].title,'A');
  p=R.clear(p,0);assert.equal(p.slots[0],null);assert.equal(p.more[0].title,'A');
  const full={app:'X',slots:Array.from({length:8},(_,i)=>site('S'+i,'https://s'+i+'.com')),more:[]};
  r=R.add(full,site('Z','https://z.com'));
  assert.equal(r.slot,-1);assert.equal(r.profile.more[0].title,'Z'); // anello pieno → Altro nel profilo
});

test('suggeriti: siti del gioco e aperture ripetute, senza doppioni né scartati',()=>{
  const profile={slots:[site('light.gg','https://light.gg'),...Array(7).fill(null)],more:[]};
  const known={'site:https://bungie.net':site('bungie.net','https://bungie.net'),'site:https://once.com':site('once','https://once.com')};
  let usage=R.countUse({},'destiny2.exe','site:https://bungie.net');
  usage=R.countUse(usage,'destiny2.exe','site:https://bungie.net');
  usage=R.countUse(usage,'destiny2.exe','site:https://once.com');
  const s=R.suggestions({profile,usage:usage['destiny2.exe'],known,extra:[site('light.gg','https://light.gg'),site('DIM','https://app.destinyitemmanager.com')],ignored:['site:https://app.destinyitemmanager.com']});
  assert.deepEqual(s.map(x=>x.title),['bungie.net']);
  assert.match(s[0].reason,/2 volte/);
});

test('ricerca: nome prima, poi parole, poi ovunque; il profilo attuale vince',()=>{
  const list=[{title:'Unity Hub',sub:'App'},{title:'Manuale',sub:'docs.unity3d.com'},{title:'Community',sub:'x'},{title:'Unity Manual',sub:'',mine:true}];
  assert.deepEqual(R.match(list,'unity').map(x=>x.title),['Unity Manual','Unity Hub','Manuale','Community']); // «comm-unity» contiene il testo: va in fondo
  assert.deepEqual(R.match(list,''),[]);
});

test('eseguibili: conferma solo per i file, non per le app trovate da VARCO',()=>{
  assert.equal(R.needsConfirm({type:'file',target:'C:\\Download\\setup.exe'}),true);
  assert.equal(R.needsConfirm({type:'file',target:'C:\\doc.pdf'}),false);
  assert.equal(R.needsConfirm({type:'app',target:'C:\\Program Files\\Steam\\steam.exe'}),false);
});

test('più anelli: aggiungi, riempi, togli; i vuoti in fondo spariscono',()=>{
  const full={app:'X',slots:Array.from({length:8},(_,i)=>site('S'+i,'https://s'+i+'.com')),more:[]};
  let p=R.addPage(full);
  assert.equal(R.pagesOf(p),2);assert.equal(p.slots.length,16);
  let r=R.add(p,site('Z','https://z.com'));
  assert.equal(r.slot,8);                                  // primo posto libero: il primo del secondo anello
  p=R.put(r.profile,15,site('Y','https://y.com'));assert.equal(p.slots[15].title,'Y');
  p=R.swap(p,8,0);assert.equal(p.slots[0].title,'Z');
  const two=R.removePage(p,1);
  assert.equal(R.pagesOf(two),1);assert.ok(two.more.some(x=>x.title==='Y'));
  assert.equal(R.pagesOf(R.removePage(two,0)),1);          // il primo anello resta
  let many=full;for(let i=0;i<9;i++)many=R.addPage(many);
  assert.equal(R.pagesOf(many),R.MAX_PAGES);
  const norm=R.normalizeLauncher({profiles:{'a.exe':{slots:[...full.slots,...Array(16).fill(null)]}}});
  assert.equal(norm.profiles['a.exe'].slots.length,8);     // anelli vuoti in fondo tolti
});
