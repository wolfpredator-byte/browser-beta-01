'use strict';
const test=require('node:test');
const assert=require('node:assert');
const {THEMES,MAX_PRESETS,PRESET_KEYS,themeAssets,normalizePresets,normalizeWorkspacePreset,effectiveAppearance,
  normalizeAppearance,normalizeLinks,cssVariables,defaultAppearance,mix}=require('../lib/appearance-rules.cjs');

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
  assert.deepEqual(a.wallpaper,{kind:'default',file:'',gradient:'aurora',blur:0,brightness:100}); // immagine senza file → VARCO
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

test('preset pronti: ogni preset con immagini ha i suoi file e un secondo colore', ()=>{
  const fs=require('node:fs');
  const path=require('node:path');
  for(const [id,t] of Object.entries(THEMES)){
    if(t.group!=='preset')continue;
    assert.ok(/^#[0-9a-f]{6}$/.test(t.accent2),id);
    const images=themeAssets(id);
    for(const file of [images.wallpaper,images.thumb,images.logo,images.icon,images.logoSmall].filter(Boolean))
      assert.ok(fs.existsSync(path.join(__dirname,'..',file)),file);
  }
  assert.equal(themeAssets('oceano'),null);
  const vice=cssVariables({theme:'vice-city'});
  assert.equal(vice['--v-accent-alt'],'#00e5ff');
  assert.equal(vice['--v-wallpaper'],'url(assets/presets/vice-city/wallpaper.jpg)');
  assert.equal(cssVariables({theme:'oceano'})['--v-wallpaper'],'url(assets/home-bg.jpg)'); // tinta: sfondo VARCO
  assert.equal(cssVariables({theme:'lime',accent2:'#123456'})['--v-accent-alt'],'#123456');
});

test('preset dell\'utente: nomi puliti e unici, solo le scelte di aspetto', ()=>{
  const list=normalizePresets([{name:'  Lavoro ',appearance:{theme:'ember',glass:500,hidden:['showNotes']}},{name:'lavoro',appearance:{}},
    {name:'',appearance:{}},null,{name:'Sera\u0007',appearance:{theme:'nessuno'}}]);
  assert.deepEqual(list.map(p=>p.name),['Lavoro','Sera']);
  assert.equal(list[0].appearance.glass,90);
  assert.equal(list[0].appearance.theme,'ember');
  assert.equal(list[1].appearance.theme,'varco');
  assert.deepEqual(Object.keys(list[0].appearance),PRESET_KEYS);
  assert.equal(normalizePresets(Array.from({length:50},(_,i)=>({name:'p'+i}))).length,MAX_PRESETS);
});

test('preset del workspace: tema pronto, preset tuo o come gli altri', ()=>{
  const presets=normalizePresets([{name:'Mio',appearance:{theme:'oceano',accent:'#ff0000',radius:3}}]);
  const global={...defaultAppearance(),accent:'#00ff00',wallpaper:{kind:'image',file:'C:\\x.jpg',blur:4,brightness:50}};
  assert.equal(normalizeWorkspacePreset('theme:lime',presets),'theme:lime');
  assert.equal(normalizeWorkspacePreset('theme:boh',presets),'');
  assert.equal(normalizeWorkspacePreset('user:Mio',presets),'user:Mio');
  assert.equal(normalizeWorkspacePreset('user:Altro',presets),'');
  assert.equal(normalizeWorkspacePreset(42,presets),'');
  const lime=effectiveAppearance(global,'theme:lime',presets);
  assert.equal(lime.theme,'lime');
  assert.equal(lime.accent,'');
  assert.deepEqual(lime.wallpaper,{kind:'default',file:'',gradient:'aurora',blur:4,brightness:50}); // sfondo del preset
  const mine=effectiveAppearance(global,'user:Mio',presets);
  assert.equal(mine.accent,'#ff0000');
  assert.equal(mine.radius,3);
  assert.equal(effectiveAppearance(global,'',presets).accent,'#00ff00');
  assert.equal(effectiveAppearance(global,'user:Sparito',presets).accent,'#00ff00');
});

test('link rapidi: solo http(s), titolo dal sito, al massimo 12', ()=>{
  const links=normalizeLinks([{url:'https://www.github.com/x'},{url:'javascript:alert(1)',title:'x'},{url:'http://a.it',title:'  Mio  '},null,
    ...Array.from({length:20},(_,i)=>({url:'https://s'+i+'.com'}))]);
  assert.deepEqual(links[0],{url:'https://www.github.com/x',title:'github.com'});
  assert.equal(links[1].title,'Mio');
  assert.equal(links.length,12);
  assert.ok(links.every(l=>l.url.startsWith('http')));
});

test('Beta 0.29: sfondi generati, carattere, bagliore, grana, tema chiaro', ()=>{
  const r=require('../lib/appearance-rules.cjs');
  const n=r.normalizeAppearance({font:'nessuno',mode:'boh',glow:400,grain:-3,wallpaper:{kind:'gradient',gradient:'zz'}});
  assert.deepEqual([n.font,n.mode,n.glow,n.grain,n.wallpaper.kind,n.wallpaper.gradient],['segoe','scuro',100,0,'gradient','aurora']);
  const dark=r.cssVariables({});
  assert.equal(dark['--v-ink-rgb'],'255,255,255');
  assert.equal(dark['--v-glow'],'1.00');
  const light=r.cssVariables({mode:'chiaro',font:'georgia',grain:50,wallpaper:{kind:'gradient',gradient:'mesh'}});
  assert.equal(light['--v-ink-rgb'],'20,20,40');
  assert.ok(parseInt(light['--v-bg'].slice(1,3),16)>230);          // sfondo chiaro
  assert.match(light['--v-font'],/^Georgia/);
  assert.match(light['--v-wallpaper'],/^radial-gradient/);
  assert.equal(light['--v-grain'],'0.110');
  for(const id of Object.keys(r.GRADIENTS))assert.match(r.gradientWallpaper(id,'#ff0066','#00ccff','#101018'),/gradient\(/);
  assert.ok(r.PRESET_KEYS.includes('mode')&&r.PRESET_KEYS.includes('font'));
});

test('Beta 0.29: colori presi da un\'immagine', ()=>{
  const {paletteFromPixels}=require('../lib/appearance-rules.cjs');
  const px=Buffer.alloc(4*100);
  for(let i=0;i<100;i++){const c=i<60?[255,40,160]:i<85?[0,220,255]:[10,8,20];px[i*4+2]=c[0];px[i*4+1]=c[1];px[i*4]=c[2];px[i*4+3]=255;}
  const p=paletteFromPixels(px);
  assert.equal(p.accent,'#ff28a0');      // il colore vivo più presente
  assert.equal(p.accent2,'#00dcff');     // un'altra tinta
  assert.ok(parseInt(p.bg.slice(1,3),16)<20);
  assert.equal(paletteFromPixels(Buffer.alloc(16)).accent,'#7c6cff'); // niente colori vivi: quello di VARCO
});

test('Beta 0.35/0.36: modalità OLED, nero puro ma lo sfondo resta', ()=>{
  const r=require('../lib/appearance-rules.cjs');
  assert.equal(r.normalizeAppearance({mode:'oled'}).mode,'oled');
  const v=r.cssVariables({mode:'oled',wallpaper:{kind:'gradient',gradient:'mesh'}});
  assert.equal(v['--v-bg'],'#000000');
  assert.equal(v['--v-bg2'],'#000000');
  assert.notEqual(v['--v-wallpaper'],'none'); // Beta 0.36: lo sfondo scelto resta
  assert.equal(r.cssVariables({mode:'oled',wallpaper:{kind:'none'}})['--v-wallpaper'],'none');
  assert.equal(v['--v-bar-alpha'],'1');
  assert.equal(v['--v-text'],r.cssVariables({mode:'scuro'})['--v-text']); // testo come il tema scuro
});
