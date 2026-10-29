'use strict';
const test=require('node:test');
const assert=require('node:assert');
const {normalizeAppearance,normalizeLinks,cssVariables,defaultAppearance,mix}=require('../lib/appearance-rules.cjs');

test('aspetto: valori sbagliati tornano entro i limiti o al predefinito', ()=>{
  const a=normalizeAppearance({theme:'boh',accent:'rosso',glass:500,fontScale:10,radius:7.6,density:'enorme',
    hidden:['showNotes','rm -rf','showNotes'],home:{jarvis:false},wallpaper:{kind:'image',file:'',blur:-3,brightness:300}});
  assert.equal(a.theme,'varco');
  assert.equal(a.accent,'');
  assert.equal(a.glass,90);
  assert.equal(a.fontScale,85);
  assert.equal(a.radius,8);
  assert.equal(a.density,'normale');
  assert.deepEqual(a.hidden,['showNotes']);
  assert.equal(a.home.jarvis,false);
  assert.equal(a.home.search,true);
  assert.deepEqual(a.wallpaper,{kind:'default',file:'',blur:0,brightness:100}); // immagine senza file → VARCO
  assert.deepEqual(normalizeAppearance(undefined),defaultAppearance());
});

test('variabili CSS: accento del tema o personalizzato, sfondo, trasparenza', ()=>{
  const base=cssVariables(defaultAppearance());
  assert.equal(base['--v-accent'],'#7c6cff');
  assert.equal(base['--v-accent-rgb'],'124,108,255');
  assert.equal(base['--v-wallpaper'],'url(assets/home-bg.jpg)');
  const custom=cssVariables({...defaultAppearance(),theme:'oceano',accent:'#FF0000',glass:50,wallpaper:{kind:'none',file:'',blur:5,brightness:80}});
  assert.equal(custom['--v-accent'],'#ff0000');
  assert.equal(custom['--v-bg'],'#050a13');
  assert.equal(custom['--v-bar-alpha'],'0.50');
  assert.equal(custom['--v-wallpaper'],'none');
  assert.equal(custom['--v-wall-blur'],'5px');
  const image=cssVariables({...defaultAppearance(),wallpaper:{kind:'image',file:'C:\\x.jpg',blur:0,brightness:50}},{wallpaperUrl:'file:///C:/a%20b/x".jpg'});
  assert.equal(image['--v-wallpaper'],'url("file:///C:/a%20b/x\\".jpg")');
  assert.equal(mix('#000000','#ffffff',.5),'#808080');
});

test('link rapidi: solo http(s), titolo dal sito, al massimo 12', ()=>{
  const links=normalizeLinks([{url:'https://www.github.com/x'},{url:'javascript:alert(1)',title:'x'},{url:'http://a.it',title:'  Mio  '},null,
    ...Array.from({length:20},(_,i)=>({url:'https://s'+i+'.com'}))]);
  assert.deepEqual(links[0],{url:'https://www.github.com/x',title:'github.com'});
  assert.equal(links[1].title,'Mio');
  assert.equal(links.length,12);
  assert.ok(links.every(l=>l.url.startsWith('http')));
});
