'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const R=require('../lib/project-page-rules.cjs');
const A=require('../lib/appearance-rules.cjs');

test('la pagina salvata viene controllata: riquadri, fili, aree, attività',()=>{
  const p=R.normalizePage({n:3,
    tiles:{hero:{x:10.4,y:20,w:5,h:99999},'note-3':{x:1,y:2,text:'ciao'},'shot-4':{shot:'../../evil.exe'},'link-5':{url:'javascript:alert(1)',title:'x'},
      'file-6':{rel:'../fuori.txt'},'boh-1':{},'hero-2':{},'note':{}},
    links:[{a:'hero',b:'note-3',t:'eventi',c:9},{a:'note-3',b:'hero'},{a:'hero',b:'manca'},{a:'hero',b:'hero'}],
    areas:{'area-1':{x:0,y:0,w:10,h:10,t:'',c:2},'zona':{}},
    tasks:[{t:'  Fare la build ',tag:'Build',done:true,doneAt:5},{t:'',tag:'UI'},{t:'Altro',tag:'Strano'}],
    cover:'C:\\x\\foto.png',view:{x:1,y:2,z:9}});
  assert.deepEqual(Object.keys(p.tiles).sort(),['file-6','hero','link-5','note-3','shot-4']);
  assert.deepEqual(p.tiles.hero,{x:10,y:20,w:216,h:2400});              // misure entro i limiti
  assert.equal(p.tiles['note-3'].text,'ciao');
  assert.equal(p.tiles['shot-4'].shot,'');                               // niente percorsi né estensioni pericolose
  assert.equal(p.tiles['link-5'].url,'');                                 // solo http(s)
  assert.equal(p.tiles['file-6'].rel,'');                                 // niente risalite fuori dal progetto
  assert.deepEqual(p.links,[{a:'hero',b:'note-3',t:'eventi',c:0}]);       // doppione, filo verso il nulla e anello scartati
  assert.deepEqual(Object.keys(p.areas),['area-1']);
  assert.equal(p.areas['area-1'].t,'Area');
  assert.deepEqual(p.tasks,[{t:'Fare la build',tag:'Build',done:true,doneAt:5},{t:'Altro',tag:'Altro',done:false}]);
  assert.equal(p.cover,'foto.png');
  assert.equal(p.view.z,1.6);
  assert.equal(p.n,6);                                                    // il contatore non riusa numeri già presi
});

test('disposizione iniziale e testo su disco',()=>{
  const d=R.defaultPage();
  assert.deepEqual(Object.keys(d.tiles),['hero','tasks','stream','files','notes','shots','res']);
  assert.equal(d.links.length,2);
  assert.equal(d.areas['area-1'].t,'Lavoro');
  const text=R.serialize(d);
  assert.ok(text.endsWith('\n')&&text.includes('\n "tiles"'));             // leggibile in git
  assert.deepEqual(R.normalizePage(JSON.parse(text)),d);
});

test('nomi degli screenshot e percorsi relativi',()=>{
  assert.equal(R.safeShotName('build finale.PNG'),'build finale.PNG');
  assert.equal(R.safeShotName('a/b/c.jpg'),'c.jpg');
  assert.equal(R.safeShotName('virus.exe'),'');
  assert.equal(R.safeShotName('.png'),'');
  assert.equal(R.safeShotName('a<b>.webp'),'a_b_.webp');
  assert.equal(R.safeRel('Assets\\Scripts\\Player.cs'),'Assets/Scripts/Player.cs');
  assert.equal(R.safeRel('C:/Windows/x'),'');
  assert.equal(R.safeRel('a/../../b'),'');
});

test('colori dello stile Strumento dal tema di VARCO',()=>{
  const dark=A.strumentoTokens({accent:'#7c6cff',accent2:'#6fd3ff',bg:'#07070e',mode:'scuro'});
  assert.equal(dark['--s-sig'],'#7c6cff');
  assert.equal(dark['--s-on-sig'],'#ffffff');                             // testo bianco sui pulsanti, come in VARCO
  assert.equal(dark['--s-alt'],'#6fd3ff');
  assert.equal(dark['--s-err'],'#ff5b2e');                                // gli stati non cambiano col tema
  const lime=A.strumentoTokens({accent:'#bef532',accent2:'#e8ffb0',bg:'#0a0a0a',mode:'chiaro'});
  assert.equal(lime['--s-on-sig'],'#111111');                             // sui colori chiari il testo è nero
  assert.ok(A.contrast(lime['--s-sig-ink'],lime['--s-tile'])>=3.2);       // l'accento usato come scritta si legge
  assert.notEqual(A.strumentoTokens({accent:'#7c6cff',accent2:'#7d6df0',bg:'#000000'})['--s-alt'],'#7d6df0'); // secondo colore troppo simile: si sposta
  assert.equal(A.strumentoTokens({accent:'#3d8bff',bg:'#050a13',mode:'oled'})['--s-ground'],'#000000');
  // cssVariables porta i colori nella cornice e segue il tema scelto
  const vars=A.cssVariables({theme:'ember'});
  assert.equal(vars['--s-sig'],'#ff5e2b');
  for(const id of Object.keys(A.THEMES))for(const mode of A.MODES){
    const t=A.cssVariables({theme:id,mode});
    assert.ok(A.contrast(t['--s-sig-ink'],t['--s-tile'])>=3,id+' '+mode);
    assert.ok(A.contrast(t['--s-text'],t['--s-tile'])>=7,id+' '+mode);
  }
});
