/* Colori dello stile «Strumento» a partire dal tema di VARCO.
   Ingresso: quello che VARCO già sa del tema attivo (accento, secondo colore, sfondo, modalità).
   Uscita: le variabili --s-* di strumento.css. In VARCO questa funzione andrà in lib/appearance-rules.cjs
   accanto a cssVariables(), così la pagina del progetto cambia insieme al resto del browser. */
(function(){
  // Copia dei temi di lib/appearance-rules.cjs (solo per l'anteprima)
  const THEMES={
    varco:{label:'VARCO',accent:'#7c6cff',accent2:'#6fd3ff',bg:'#07070e'},
    'vice-city':{label:'Vice City',accent:'#ff3fa4',accent2:'#00e5ff',bg:'#120a24'},
    'neon-pulse':{label:'Neon Pulse',accent:'#ff2d8a',accent2:'#38c6ff',bg:'#160b2e'},
    'cyber-protocol':{label:'Cyber Protocol',accent:'#00ff41',accent2:'#9ca3af',bg:'#050806'},
    'cyan-flash':{label:'Cyan Flash',accent:'#00e5ff',accent2:'#6b7a89',bg:'#0d0f12'},
    lime:{label:'Lime',accent:'#bef532',accent2:'#e8ffb0',bg:'#0a0a0a'},
    ember:{label:'Ember',accent:'#ff5e2b',accent2:'#ffb08a',bg:'#141012'},
    'midnight-ink':{label:'Midnight Ink',accent:'#ff7100',accent2:'#6f82e0',bg:'#04061b'},
    marple:{label:'Marple',accent:'#ff6746',accent2:'#ffe383',bg:'#1c0d12'},
    'midnight-blue':{label:'Midnight Blue',accent:'#4a7fa7',accent2:'#b3cfe5',bg:'#0a1931'},
    'aurora-forest':{label:'Aurora Forest',accent:'#3fbf9f',accent2:'#a7e3d0',bg:'#0b1f1d'},
    'violet-dusk':{label:'Violet Dusk',accent:'#f6c9a4',accent2:'#c47fa0',bg:'#241826'},
    'oxford-rose':{label:'Oxford Rose',accent:'#ff36ab',accent2:'#7aa2ff',bg:'#011936'},
    bordeaux:{label:'Bordeaux',accent:'#c0294f',accent2:'#f2ede8',bg:'#0b0909'},
    'red-crayola':{label:'Red Crayola',accent:'#ed254e',accent2:'#c9d6d9',bg:'#001c22'},
    'minimal-green':{label:'Minimal Green',accent:'#8eb69b',accent2:'#daf1de',bg:'#051f20'},
    oceano:{label:'Oceano',accent:'#3d8bff',bg:'#050a13'},aurora:{label:'Aurora',accent:'#2fc9b0',bg:'#04100f'},
    smeraldo:{label:'Smeraldo',accent:'#3cc46e',bg:'#050f08'},tramonto:{label:'Tramonto',accent:'#ff8a3d',bg:'#120905'},
    cremisi:{label:'Cremisi',accent:'#ff4d6a',bg:'#120508'},sakura:{label:'Sakura',accent:'#ff7ac0',bg:'#11060d'},
    grafite:{label:'Grafite',accent:'#b9bdc9',bg:'#0a0a0c'}
  };
  const toRgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
  const toHex=c=>'#'+c.map(v=>Math.round(Math.min(255,Math.max(0,v))).toString(16).padStart(2,'0')).join('');
  const mix=(a,b,t)=>toHex(toRgb(a).map((v,i)=>v+(toRgb(b)[i]-v)*t));
  const lum=h=>{const [r,g,b]=toRgb(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*r+.7152*g+.0722*b;};
  const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  /* Testo sopra un colore pieno: nero o bianco, quello che si legge meglio */
  const onColor=c=>contrast(c,'#ffffff')>=3?'#ffffff':'#111111';   // bianco come nel resto di VARCO, nero sui colori chiari (Lime, Cyan…)
  /* Un colore usato come scritta deve leggersi sul fondo: lo scurisco o lo schiarisco finché basta */
  function readable(c,bg,min){let out=c;const toward=lum(bg)>.4?'#000000':'#ffffff';for(let t=0;t<=1&&contrast(out,bg)<min;t+=.05)out=mix(c,toward,t);return out;}
  /* Due colori troppo simili (es. Lime: accento e secondo quasi uguali): il secondo si sposta */
  const near=(a,b)=>toRgb(a).reduce((s,v,i)=>s+Math.abs(v-toRgb(b)[i]),0)<90;

  function strumentoTokens({accent,accent2,bg,mode='scuro'}){
    const alt0=accent2||mix(accent,'#ffffff',.6);
    const st={ok:'#c8f135',warn:'#ffcc33',err:'#ff5b2e'};
    let t;
    if(mode==='chiaro'){
      const ground=mix('#e7e6e2',accent,.04),tile=mix('#f5f4f0',accent,.015);
      t={ground,tile,row:mix(tile,'#000000',.045),rowHover:mix(tile,'#000000',.085),well:mix(ground,'#000000',.025),chrome:mix(tile,'#000000',.01),
        edge:mix(tile,'#000000',.13),edge2:mix(tile,'#000000',.2),text:'#1b1b1d',muted:'#55555c',dim:'#8a8a90',
        press:mix(ground,'#000000',.24),dots:mix(ground,'#000000',.13),cable:mix(ground,'#000000',.5),note:mix(tile,st.warn,.14)};
      st.ok='#a6d81e';st.warn='#f5b800';st.err='#f24a1d';
    }else{
      const oled=mode==='oled',ground=oled?'#000000':mix('#111113',bg,.32),tile=oled?'#0b0b0c':mix('#1a1a1d',bg,.24);
      t={ground,tile,row:mix(tile,'#ffffff',.04),rowHover:mix(tile,'#ffffff',.08),well:mix(ground,'#000000',.2),chrome:oled?'#070708':mix(tile,ground,.3),
        edge:mix(tile,'#ffffff',oled?.08:.09),edge2:mix(tile,'#ffffff',oled?.14:.15),text:'#ececf0',muted:'#a2a2ab',dim:'#6d6d76',
        press:mix(ground,'#000000',.6),dots:mix(ground,'#ffffff',.075),cable:mix(ground,'#000000',.7),note:mix(tile,st.warn,.05)};
    }
    let alt=alt0;if(near(alt,accent))alt=mix(accent,mode==='chiaro'?'#000000':'#ffffff',.45);
    const sigInk=readable(accent,t.tile,mode==='chiaro'?3.2:3);
    return {
      '--s-ground':t.ground,'--s-tile':t.tile,'--s-row':t.row,'--s-row-hover':t.rowHover,'--s-well':t.well,'--s-chrome':t.chrome,
      '--s-edge':t.edge,'--s-edge-2':t.edge2,'--s-text':t.text,'--s-muted':t.muted,'--s-dim':t.dim,
      '--s-sig':accent,'--s-on-sig':onColor(accent),'--s-sig-ink':sigInk,'--s-alt':alt,'--s-on-alt':onColor(alt),
      '--s-press':t.press,'--s-dots':t.dots,'--s-cable-edge':t.cable,'--s-note':t.note,
      '--s-ok':st.ok,'--s-warn':st.warn,'--s-err':st.err,'--s-on-state':'#111111'
    };
  }
  function themeOf(id,{accent='',accent2=''}={}){const th=THEMES[id]||THEMES.varco;return {accent:accent||th.accent,accent2:accent2||th.accent2||'',bg:th.bg};}
  window.Strumento={THEMES,strumentoTokens,themeOf,mix,onColor};
})();
