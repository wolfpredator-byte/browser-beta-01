'use strict';

/**
 * Personalizzazione (Beta 0.21), senza Electron: temi, sfondo, interfaccia, Home.
 * data.appearance contiene solo le scelte; i colori e le variabili CSS si calcolano qui.
 */

/**
 * Temi pronti. Beta 0.22: i preset hanno anche un secondo colore (gradienti, barre di avanzamento)
 * e, quando c'è assets, sfondo, logo e icona della finestra in assets/presets/<assets>/.
 * group: 'preset' (con immagini) o 'tinta' (solo colori, i temi della 0.21).
 */
const THEMES={
  varco:{label:'VARCO',accent:'#7c6cff',accent2:'#6fd3ff',bg:'#07070e',group:'preset'},
  'vice-city':{label:'Vice City',accent:'#ff3fa4',accent2:'#00e5ff',bg:'#120a24',group:'preset',assets:'vice-city'},
  'neon-pulse':{label:'Neon Pulse',accent:'#ff2d8a',accent2:'#38c6ff',bg:'#160b2e',group:'preset',assets:'neon-pulse'},
  'cyber-protocol':{label:'Cyber Protocol',accent:'#00ff41',accent2:'#9ca3af',bg:'#050806',group:'preset',assets:'cyber-protocol'},
  'cyan-flash':{label:'Cyan Flash',accent:'#00e5ff',accent2:'#6b7a89',bg:'#0d0f12',group:'preset',assets:'cyan-flash'},
  lime:{label:'Lime',accent:'#bef532',accent2:'#e8ffb0',bg:'#0a0a0a',group:'preset',assets:'lime'},
  ember:{label:'Ember',accent:'#ff5e2b',accent2:'#ffb08a',bg:'#141012',group:'preset',assets:'ember'},
  'midnight-ink':{label:'Midnight Ink',accent:'#ff7100',accent2:'#6f82e0',bg:'#04061b',group:'preset',assets:'midnight-ink'},
  marple:{label:'Marple',accent:'#ff6746',accent2:'#ffe383',bg:'#1c0d12',group:'preset',assets:'marple'},
  'midnight-blue':{label:'Midnight Blue',accent:'#4a7fa7',accent2:'#b3cfe5',bg:'#0a1931',group:'preset',assets:'midnight-blue'},
  'aurora-forest':{label:'Aurora Forest',accent:'#3fbf9f',accent2:'#a7e3d0',bg:'#0b1f1d',group:'preset',assets:'aurora-forest'},
  'violet-dusk':{label:'Violet Dusk',accent:'#f6c9a4',accent2:'#c47fa0',bg:'#241826',group:'preset',assets:'violet-dusk'},
  'oxford-rose':{label:'Oxford Rose',accent:'#ff36ab',accent2:'#7aa2ff',bg:'#011936',group:'preset',assets:'oxford-rose'},
  bordeaux:{label:'Bordeaux',accent:'#c0294f',accent2:'#f2ede8',bg:'#0b0909',group:'preset',assets:'bordeaux'},
  'red-crayola':{label:'Red Crayola',accent:'#ed254e',accent2:'#c9d6d9',bg:'#001c22',group:'preset',assets:'red-crayola'},
  'minimal-green':{label:'Minimal Green',accent:'#8eb69b',accent2:'#daf1de',bg:'#051f20',group:'preset',assets:'minimal-green'},
  oceano:{label:'Oceano',accent:'#3d8bff',bg:'#050a13',group:'tinta'},
  aurora:{label:'Aurora',accent:'#2fc9b0',bg:'#04100f',group:'tinta'},
  smeraldo:{label:'Smeraldo',accent:'#3cc46e',bg:'#050f08',group:'tinta'},
  tramonto:{label:'Tramonto',accent:'#ff8a3d',bg:'#120905',group:'tinta'},
  cremisi:{label:'Cremisi',accent:'#ff4d6a',bg:'#120508',group:'tinta'},
  sakura:{label:'Sakura',accent:'#ff7ac0',bg:'#11060d',group:'tinta'},
  grafite:{label:'Grafite',accent:'#b9bdc9',bg:'#0a0a0c',group:'tinta'}
};
/** Immagini di un tema (percorsi relativi alla cartella del programma), null per i temi senza. */
function themeAssets(themeId){
  if(themeId==='varco')return {wallpaper:'assets/home-bg.jpg',thumb:'assets/home-bg.jpg',logo:'assets/app-icon-256.png',logoSmall:'',icon:'assets/app-icon.png'};
  const t=THEMES[themeId];
  if(!t?.assets)return null;
  const dir='assets/presets/'+t.assets+'/';
  return {wallpaper:dir+'wallpaper.jpg',thumb:dir+'thumb.jpg',logo:dir+'logo.png',logoSmall:dir+'logo-64.png',icon:dir+'icon.png'};
}
const DENSITIES=['compatta','normale','ariosa'];
/** Pulsanti che si possono nascondere: id nella cornice → etichetta. */
const HIDEABLE={
  sidebar:{showBookmarks:'Preferiti',showHistory:'Cronologia',showTabs:'Schede',sideDownloads:'Download',showGames:'Giochi',
    showProject:'Progetto',showJarvis:'JARVIS',showFiles:'File',showNotes:'Note',showNotifications:'Notifiche'},
  toolbar:{bookmark:'Stella dei preferiti',paletteButton:'Palette dei comandi',showDownloads:'Download',jarvisMini:'JARVIS',
    reopenClosed:'Riapri scheda chiusa',tabCount:'Contatore delle schede',zenButton:'Modalità zen',clock:'Orologio'}
};
const HIDEABLE_IDS=new Set(Object.values(HIDEABLE).flatMap(Object.keys));
/** Riquadri della Home che si possono togliere. */
const HOME_CARDS={hero:'Logo e motto',search:'Ricerca',links:'Link rapidi',projects:'Progetti',quick:'Cartelle di Windows',
  jarvis:'JARVIS',workspace:'Pannello del workspace'};
const LIMITS={glass:[0,90],blur:[0,40],brightness:[20,100],fontScale:[85,130],radius:[0,20],glow:[0,100],grain:[0,100]};
/**
 * Beta 0.29: sfondi generati dai colori del tema (niente immagini): l'id è lo stile.
 * Caratteri: solo quelli già presenti in Windows 10/11, così non serve scaricare niente.
 */
const GRADIENTS={aurora:'Aurora',mesh:'Mesh',alba:'Alba',nebula:'Nebula'};
const FONTS={
  segoe:{label:'Segoe UI (predefinito)',stack:"'Segoe UI Variable','Segoe UI',Arial,sans-serif"},
  bahnschrift:{label:'Bahnschrift (squadrato)',stack:"Bahnschrift,'Segoe UI',Arial,sans-serif"},
  corbel:{label:'Corbel (morbido)',stack:"Corbel,'Segoe UI',Arial,sans-serif"},
  candara:{label:'Candara (umanista)',stack:"Candara,'Segoe UI',Arial,sans-serif"},
  cascadia:{label:'Cascadia (tecnico)',stack:"'Cascadia Code','Cascadia Mono',Consolas,monospace"},
  georgia:{label:'Georgia (classico)',stack:"Georgia,'Times New Roman',serif"}
};
const MODES=['scuro','chiaro','oled']; // Beta 0.35: oled = nero puro
const MAX_LINKS=12;
const MAX_PRESETS=30;
/** Campi di data.appearance che un preset dell'utente salva (non Home e pulsanti nascosti). */
const PRESET_KEYS=['theme','accent','accent2','glass','wallpaper','fontScale','radius','density','glow','grain','font','mode'];

const isHex=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const clamp=(value,[min,max],fallback)=>Number.isFinite(value)?Math.min(max,Math.max(min,Math.round(value))):fallback;

function defaultAppearance(){
  return {theme:'varco',accent:'',accent2:'',glass:26,
    wallpaper:{kind:'default',file:'',gradient:'aurora',blur:18,brightness:62},
    fontScale:100,radius:10,density:'normale',hidden:[],
    glow:50,grain:0,font:'segoe',mode:'scuro',
    home:Object.fromEntries(Object.keys(HOME_CARDS).map(k=>[k,true]))};
}

/** Controlla le scelte salvate: valori fuori misura tornano entro i limiti, il resto al predefinito. */
function normalizeAppearance(raw){
  const d=defaultAppearance();
  const a=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const w=a.wallpaper&&typeof a.wallpaper==='object'?a.wallpaper:{};
  const kind=['default','image','gradient','none'].includes(w.kind)?w.kind:'default';
  const file=typeof w.file==='string'?w.file:'';
  return {
    theme:Object.hasOwn(THEMES,a.theme)?a.theme:d.theme,
    accent:isHex(a.accent)?a.accent.toLowerCase():'',
    accent2:isHex(a.accent2)?a.accent2.toLowerCase():'',
    glass:clamp(a.glass,LIMITS.glass,d.glass),
    wallpaper:{kind:kind==='image'&&!file?'default':kind,file:kind==='image'?file:'',
      gradient:Object.hasOwn(GRADIENTS,w.gradient)?w.gradient:d.wallpaper.gradient,
      blur:clamp(w.blur,LIMITS.blur,d.wallpaper.blur),brightness:clamp(w.brightness,LIMITS.brightness,d.wallpaper.brightness)},
    fontScale:clamp(a.fontScale,LIMITS.fontScale,d.fontScale),
    radius:clamp(a.radius,LIMITS.radius,d.radius),
    density:DENSITIES.includes(a.density)?a.density:d.density,
    glow:clamp(a.glow,LIMITS.glow,d.glow),grain:clamp(a.grain,LIMITS.grain,d.grain),
    font:Object.hasOwn(FONTS,a.font)?a.font:d.font,mode:MODES.includes(a.mode)?a.mode:d.mode,
    hidden:Array.isArray(a.hidden)?[...new Set(a.hidden.filter(id=>HIDEABLE_IDS.has(id)))]:[],
    home:Object.fromEntries(Object.keys(HOME_CARDS).map(k=>[k,a.home?.[k]!==false]))
  };
}

/** Link rapidi di un workspace: solo http(s), titolo breve, al massimo MAX_LINKS. */
function normalizeLinks(raw){
  if(!Array.isArray(raw))return [];
  return raw.filter(l=>l&&typeof l.url==='string'&&/^https?:\/\//i.test(l.url)).slice(0,MAX_LINKS)
    .map(l=>({url:l.url.slice(0,2000),title:(typeof l.title==='string'&&l.title.trim()?l.title.trim():hostOf(l.url)).slice(0,40)}));
}
function hostOf(url){try{return new URL(url).hostname.replace(/^www\./,'');}catch{return url;}}

const toRgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const toHex=rgb=>'#'+rgb.map(v=>Math.round(Math.min(255,Math.max(0,v))).toString(16).padStart(2,'0')).join('');
const mix=(a,b,t)=>toHex(toRgb(a).map((v,i)=>v+(toRgb(b)[i]-v)*t));
const rgba=(hex,alpha)=>`rgba(${toRgb(hex).join(',')},${alpha})`;

/** Sfondo generato (Beta 0.29): sfumature morbide con i colori del tema, come gradiente CSS. */
function gradientWallpaper(style,accent,alt,bg){
  const deep=mix(bg,accent,.22);
  if(style==='mesh')return [`radial-gradient(at 12% 18%,${rgba(accent,.55)} 0,transparent 45%)`,`radial-gradient(at 88% 12%,${rgba(alt,.45)} 0,transparent 42%)`,
    `radial-gradient(at 78% 88%,${rgba(accent,.4)} 0,transparent 48%)`,`radial-gradient(at 18% 92%,${rgba(alt,.3)} 0,transparent 45%)`,`linear-gradient(${deep},${bg})`].join(',');
  if(style==='alba')return [`radial-gradient(ellipse 120% 70% at 50% 108%,${rgba(accent,.7)} 0,${rgba(alt,.25)} 38%,transparent 70%)`,`linear-gradient(180deg,${bg} 0%,${deep} 100%)`].join(',');
  if(style==='nebula')return [`radial-gradient(ellipse 45% 35% at 32% 42%,${rgba(accent,.5)} 0,transparent 70%)`,`radial-gradient(ellipse 40% 45% at 68% 58%,${rgba(alt,.38)} 0,transparent 70%)`,
    `radial-gradient(ellipse 80% 80% at 50% 50%,${rgba(deep,.9)} 0,${bg} 100%)`].join(',');
  // aurora: bande di luce in alto, come un'aurora boreale.
  return [`radial-gradient(ellipse 70% 45% at 22% 8%,${rgba(accent,.6)} 0,transparent 70%)`,`radial-gradient(ellipse 55% 40% at 78% 18%,${rgba(alt,.45)} 0,transparent 70%)`,
    `radial-gradient(ellipse 90% 60% at 50% 110%,${rgba(deep,.95)} 0,transparent 70%)`,`linear-gradient(180deg,${deep},${bg})`].join(',');
}

/**
 * Colori presi da un'immagine (Beta 0.29). pixels: byte BGRA (come toBitmap di Electron).
 * accent = il colore vivo più presente; accent2 = un altro colore vivo, di tinta diversa;
 * bg = la media delle zone scure, scurita ancora (le barre devono restare leggibili).
 * @returns {{accent:string,accent2:string,bg:string}}
 */
function paletteFromPixels(pixels,{bgra=true}={}){
  const bins=new Map();let darkSum=[0,0,0],darkCount=0;
  for(let i=0;i+3<pixels.length;i+=4){
    const r=pixels[bgra?i+2:i],g=pixels[i+1],b=pixels[bgra?i:i+2];
    const max=Math.max(r,g,b),min=Math.min(r,g,b),v=max/255,s=max?(max-min)/max:0;
    if(v<.3){darkSum=darkSum.map((x,k)=>x+[r,g,b][k]);darkCount++;}
    if(s<.25||v<.25)continue; // grigi e quasi neri non sono colori "vivi"
    let h=0;
    if(max!==min){const d=max-min;h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;h=(h*60+360)%360;}
    const key=Math.round(h/15)%24;
    const bin=bins.get(key)||{w:0,r:0,g:0,b:0};
    const weight=s*v;
    bin.w+=weight;bin.r+=r*weight;bin.g+=g*weight;bin.b+=b*weight;bins.set(key,bin);
  }
  const ranked=[...bins.entries()].sort((a,b)=>b[1].w-a[1].w);
  const colorOf=bin=>toHex([bin.r/bin.w,bin.g/bin.w,bin.b/bin.w]);
  // I colori presi devono essere abbastanza vivi per i pulsanti: troppo scuri si schiariscono
  // (moltiplicando i canali, così la tinta e la saturazione restano quelle dell'immagine).
  const lift=hex=>{const rgb=toRgb(hex),m=Math.max(...rgb);return m>=215||!m?hex:toHex(rgb.map(v=>v*215/m));};
  const accent=ranked[0]?lift(colorOf(ranked[0][1])):'#7c6cff';
  const hueGap=(a,b)=>Math.min(Math.abs(a-b),24-Math.abs(a-b));
  const second=ranked.find(([key])=>hueGap(key,ranked[0][0])>=3);
  const accent2=second?lift(colorOf(second[1])):mix(accent,'#ffffff',.55);
  const dark=darkCount?toHex(darkSum.map(x=>x/darkCount)):'#0a0a12';
  return {accent,accent2,bg:mix(dark,'#000000',.55)};
}

/**
 * Variabili CSS della cornice (e di popup e notifiche). wallpaperUrl: indirizzo file:// dello
 * sfondo già risolto (quello del workspace ha la precedenza), '' per lo sfondo VARCO.
 */
function cssVariables(appearance,{wallpaperUrl=''}={}){
  const a=normalizeAppearance(appearance);
  const theme=THEMES[a.theme];
  const accent=a.accent||theme.accent;
  const light=mix(accent,'#ffffff',.35);
  const alt=a.accent2||theme.accent2||mix(accent,'#ffffff',.6);
  const bar=(a.glass/100).toFixed(2);
  const lightMode=a.mode==='chiaro';
  // Tema chiaro (Beta 0.29): lo sfondo del tema si schiarisce quasi a bianco, con una punta del suo colore.
  // Modalità OLED (Beta 0.35): nero puro ovunque, niente sfondo né vetro colorato.
  const oled=a.mode==='oled';
  const bg=lightMode?mix('#f7f7fb',accent,.05):oled?'#000000':theme.bg;
  const wall=oled||a.wallpaper.kind==='none'?'none':a.wallpaper.kind==='gradient'?gradientWallpaper(a.wallpaper.gradient,accent,alt,bg):wallpaperUrl?`url("${wallpaperUrl.replace(/["\\]/g,'\\$&')}")`:`url(${(themeAssets(a.theme)||themeAssets('varco')).wallpaper})`;
  const modeVars=lightMode?{'--v-text':'#1c1b29','--v-muted':'#5d5b72','--v-bg2':mix(bg,'#000000',.04),
    '--v-glass':'rgba(255,255,255,.62)','--v-glass-strong':'rgba(255,255,255,.94)',
    '--v-line':rgba(mix(accent,'#1c1b29',.5),.18),'--v-line-strong':rgba(mix(accent,'#1c1b29',.4),.34),'--v-ink-rgb':'20,20,40','--v-field-rgb':'255,255,255'}
    :{'--v-text':'#e9e8f5','--v-muted':'#8f8daa','--v-bg2':mix(bg,'#ffffff',.03),
    '--v-glass':'rgba(24,23,44,.55)','--v-glass-strong':'rgba(18,17,34,.92)',
    '--v-line':'rgba(150,140,255,.16)','--v-line-strong':'rgba(160,150,255,.32)','--v-ink-rgb':'255,255,255','--v-field-rgb':'0,0,0'};
  if(oled)Object.assign(modeVars,{'--v-bg2':'#000000','--v-glass':'rgba(0,0,0,.92)','--v-glass-strong':'#000000',
    '--v-line':'rgba(255,255,255,.10)','--v-line-strong':'rgba(255,255,255,.22)'});
  return {...modeVars,
    '--v-glow':(a.glow/50).toFixed(2),'--v-grain':(a.grain/100*.22).toFixed(3),'--v-font':FONTS[a.font].stack,
    '--v-accent':accent,'--v-accent-2':light,'--v-accent-rgb':toRgb(accent).join(','),'--v-accent-2-rgb':toRgb(light).join(','),
    '--v-accent-alt':alt,'--v-accent-alt-rgb':toRgb(alt).join(','),
    '--v-bg':bg,'--v-bar-alpha':lightMode?Math.max(.55,a.glass/100).toFixed(2):oled?'1':bar,'--v-bg-rgb':toRgb(bg).join(','),
    '--v-wallpaper':wall,'--v-wall-blur':a.wallpaper.blur+'px','--v-wall-brightness':(Math.max(lightMode?85:0,a.wallpaper.brightness)/100).toFixed(2),
    '--v-ui-scale':(a.fontScale/100).toFixed(2),'--page-radius':a.radius+'px'
  };
}

// ── Preset dell'utente (Beta 0.22) ───────────────────────────────────────
const cleanName=name=>typeof name==='string'?name.replace(/[\u0000-\u001f]/g,'').trim().slice(0,40):'';

/** Un preset dell'utente: nome e le scelte di PRESET_KEYS, già controllate. */
function normalizePreset(raw){
  const name=cleanName(raw?.name);
  if(!name)return null;
  return {name,appearance:presetFrom(raw.appearance)};
}
/** Elenco dei preset dell'utente: nomi unici (senza distinguere maiuscole), al massimo MAX_PRESETS. */
function normalizePresets(raw){
  const seen=new Set(),out=[];
  for(const p of Array.isArray(raw)?raw:[]){
    const preset=normalizePreset(p);
    if(!preset||seen.has(preset.name.toLowerCase()))continue;
    seen.add(preset.name.toLowerCase());out.push(preset);
    if(out.length>=MAX_PRESETS)break;
  }
  return out;
}
/** Le scelte da salvare in un preset, prese da un aspetto qualsiasi. */
function presetFrom(appearance){
  const a=normalizeAppearance(appearance);
  return Object.fromEntries(PRESET_KEYS.map(k=>[k,a[k]]));
}

/**
 * Preset di un workspace: '' (come gli altri), 'theme:<id>' (tema pronto) o 'user:<nome>'.
 * Un riferimento che non esiste più vale ''.
 */
function normalizeWorkspacePreset(value,presets=[]){
  if(typeof value!=='string')return '';
  if(value.startsWith('theme:'))return Object.hasOwn(THEMES,value.slice(6))?value:'';
  if(value.startsWith('user:'))return presets.some(p=>p.name===value.slice(5))?value:'';
  return '';
}
/**
 * Aspetto in uso in un workspace: quello di tutti, con sopra il preset del workspace.
 * Un tema pronto porta i suoi colori e il suo sfondo; un preset dell'utente tutte le sue scelte.
 */
function effectiveAppearance(appearance,presetRef,presets=[]){
  const base=normalizeAppearance(appearance);
  const ref=normalizeWorkspacePreset(presetRef,presets);
  if(ref.startsWith('theme:'))return normalizeAppearance({...base,theme:ref.slice(6),accent:'',accent2:'',
    wallpaper:{...base.wallpaper,kind:'default',file:''}});
  if(ref.startsWith('user:'))return normalizeAppearance({...base,...presets.find(p=>p.name===ref.slice(5)).appearance});
  return base;
}

module.exports={GRADIENTS,FONTS,MODES,gradientWallpaper,paletteFromPixels,THEMES,MAX_PRESETS,PRESET_KEYS,themeAssets,normalizePreset,normalizePresets,presetFrom,normalizeWorkspacePreset,effectiveAppearance,DENSITIES,HIDEABLE,HOME_CARDS,LIMITS,MAX_LINKS,defaultAppearance,normalizeAppearance,normalizeLinks,cssVariables,mix};
