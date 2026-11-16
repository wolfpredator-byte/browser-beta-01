'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseQuery,isQuestion,buildGroups,flatten}=require('../command-center-rules.js');
const {shortcutCommand}=require('../lib/window-rules.cjs');
const {normalizeLinks}=require('../lib/appearance-rules.cjs');

const items=[
  {id:1,sec:'tabs',kind:'tab',label:'Unity Documentation – Rigidbody',detail:'docs.unity3d.com',ws:'Studio'},
  {id:2,sec:'tabs',kind:'tab',label:'GitHub · Pull request',detail:'github.com',ws:'Sviluppo',now:true},
  {id:3,sec:'tabs',kind:'tab',label:'Unity Learn',detail:'learn.unity.com',ws:'Sviluppo'},
  {id:4,sec:'projects',kind:'project',label:'VARCO',detail:'C:\\Projects\\varco',ws:'Sviluppo',now:true},
  {id:5,sec:'links',kind:'link',label:'Unity Manual',ws:'Studio'},
  {id:6,sec:'links',kind:'link',label:'Electron docs',ws:'Sviluppo',pinned:true},
  {id:7,sec:'commands',kind:'command',label:'Modalità zen',keywords:'focus'},
  {id:8,sec:'web',kind:'history',label:'Unity Asset Store',detail:'assetstore.unity.com'},
  {id:9,sec:'create',kind:'note',label:'Nota'}
];
const dyn=text=>[{id:'d0',sec:'web',kind:'web',label:`Cerca «${text}»`,dynamic:true,always:true},
  {id:'d1',sec:'jarvis',kind:'jarvis',label:`Chiedi a JARVIS: «${text}»`,dynamic:true,always:true},
  {id:'d2',sec:'create',kind:'note',label:`Nota «${text}»`,dynamic:true,always:true}];

test('prefissi: scelgono la sezione e restano fuori dal testo',()=>{
  assert.deepEqual(parseQuery('> zen'),{text:'zen',forced:'commands'});
  assert.deepEqual(parseQuery('@unity'),{text:'unity',forced:'tabs'});
  assert.deepEqual(parseQuery('g gatti'),{text:'gatti',forced:'web'});
  assert.deepEqual(parseQuery('gatti'),{text:'gatti',forced:null});
  assert.deepEqual(parseQuery('? come si fa'),{text:'come si fa',forced:'jarvis'});
});

test('domande: JARVIS sale in cima',()=>{
  assert.equal(isQuestion('come si usa rigidbody'),true);
  assert.equal(isQuestion('rigidbody?'),true);
  assert.equal(isQuestion('commit'),false);
  const groups=buildGroups(items,'come si usa unity',{active:'Sviluppo',dynamic:dyn});
  assert.equal(groups[0].id,'jarvis');
});

test('senza testo: Apri subito, poi le sezioni senza doppioni, prima il workspace attivo',()=>{
  const groups=buildGroups(items,'',{active:'Sviluppo',dynamic:dyn});
  assert.deepEqual(groups.map(g=>g.id),['now','tabs','links','commands','create']); // Progetti vuota: VARCO è già in Apri subito
  assert.deepEqual(groups[0].items.map(x=>x.id),[2,4]);
  const tabs=groups.find(g=>g.id==='tabs');
  assert.deepEqual(tabs.items.map(x=>x.id),[3,1]); // Sviluppo prima di Studio, niente scheda 2 (è in Apri subito)
  assert.equal(tabs.split,1); // riga "Altri workspace" prima di Studio
  assert.equal(groups.find(g=>g.id==='links').items[0].id,6); // fissati prima
});

test('con il testo: Apri subito con i migliori, web/JARVIS/crea dal testo',()=>{
  const groups=buildGroups(items,'unity',{active:'Sviluppo',dynamic:dyn});
  const ids=groups.map(g=>g.id);
  assert.equal(ids[0],'now');
  assert.equal(groups[0].items[0].id,3); // Unity Learn: stesso workspace, vince su Studio
  assert.ok(ids.includes('web')&&ids.includes('jarvis')&&ids.includes('create'));
  const web=groups.find(g=>g.id==='web');
  assert.equal(web.items[0].id,'d0'); // prima la ricerca, poi la cronologia
  assert.ok(web.items.some(x=>x.id===8));
  // Niente doppioni tra Apri subito e le sezioni
  const shown=flatten(groups).map(f=>f.item.id);
  assert.equal(new Set(shown).size,shown.length);
});

test('dove cercare: solo il workspace attivo, o una sezione sola',()=>{
  const ws=buildGroups(items,'unity',{active:'Sviluppo',scope:'ws',dynamic:dyn});
  assert.ok(!flatten(ws).some(f=>f.item.ws==='Studio'));
  const only=buildGroups(items,'unity',{active:'Sviluppo',scope:'tabs',dynamic:dyn});
  assert.deepEqual(only.map(g=>g.id),['tabs']);
  const forced=buildGroups(items,'> zen',{active:'Sviluppo',dynamic:dyn});
  assert.deepEqual(forced.map(g=>g.id),['commands']);
});

test('sezioni chiuse e "mostra tutti"',()=>{
  const many=Array.from({length:30},(_,i)=>({id:100+i,sec:'tabs',kind:'tab',label:'Scheda '+i,ws:'Sviluppo'}));
  let groups=buildGroups(many,'scheda',{active:'Sviluppo',dynamic:()=>[]});
  const tabs=groups.find(g=>g.id==='tabs');
  assert.equal(tabs.shown.length,5);assert.equal(tabs.more,30-5-3);
  groups=buildGroups(many,'scheda',{active:'Sviluppo',expanded:['tabs'],collapsed:['now'],dynamic:()=>[]});
  assert.equal(groups.find(g=>g.id==='tabs').shown.length,27);
  assert.ok(!flatten(groups).some(f=>f.group==='now'));
});

test('Alt+1…9: fast link; il resto di Alt come prima',()=>{
  assert.equal(shortcutCommand({type:'keyDown',key:'3',alt:true,control:false,shift:false}),'openFastLink:3');
  assert.equal(shortcutCommand({type:'keyDown',key:'0',alt:true,control:false,shift:false}),null);
  assert.equal(shortcutCommand({type:'keyDown',key:'ArrowLeft',alt:true,control:false,shift:false}),'back');
});

test('fast link: fissati e una scorciatoia per numero',()=>{
  const links=normalizeLinks([{url:'https://a.com',pinned:true,key:1},{url:'https://b.com',key:1},{url:'https://c.com',key:12,pinned:'si'}]);
  assert.deepEqual(links,[{url:'https://a.com',title:'a.com',pinned:true,key:1},{url:'https://b.com',title:'b.com'},{url:'https://c.com',title:'c.com'}]);
});
