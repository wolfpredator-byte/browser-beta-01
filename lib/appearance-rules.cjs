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
    reopenClosed:'Riapri scheda chiusa',zenButton:'Modalità zen',clock:'Orologio'}
};
const HIDEABLE_IDS=new Set(Object.values(HIDEABLE).flatMap(Object.keys));
/** Riquadri della Home che si possono togliere. */
const HOME_CARDS={hero:'Logo e motto',search:'Ricerca',links:'Link rapidi',projects:'Progetti',quick:'Cartelle di Windows',
  jarvis:'JARVIS',workspace:'Pannello del workspace'};
const LIMITS={glass:[0,90],blur:[0,40],brightness:[20,100],fontScale:[85,130],radius:[0,20]};
const MAX_LINKS=12;
const MAX_PRESETS=30;
/** Campi di data.appearance che un preset dell'utente salva (non Home e pulsanti nascosti). */
const PRESET_KEYS=['theme','accent','accent2','glass','wallpaper','fontScale','radius','density'];

const isHex=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const clamp=(value,[min,max],fallback)=>Number.isFinite(value)?Math.min(max,Math.max(min,Math.round(value))):fallback;

function defaultAppearance(){
  return {theme:'varco',accent:'',accent2:'',glass:26,
    wallpaper:{kind:'default',file:'',blur:18,brightness:62},
    fontScale:100,radius:10,density:'normale',hidden:[],
    home:Object.fromEntries(Object.keys(HOME_CARDS).map(k=>[k,true]))};
}

/** Controlla le scelte salvate: valori fuori misura tornano entro i limiti, il resto al predefinito. */
function normalizeAppearance(raw){
  const d=defaultAppearance();
  const a=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const w=a.wallpaper&&typeof a.wallpaper==='object'?a.wallpaper:{};
  const kind=['default','image','none'].includes(w.kind)?w.kind:'default';
  const file=typeof w.file==='string'?w.file:'';
  return {
    theme:Object.hasOwn(THEMES,a.theme)?a.theme:d.theme,
    accent:isHex(a.accent)?a.accent.toLowerCase():'',
    accent2:isHex(a.accent2)?a.accent2.toLowerCase():'',
    glass:clamp(a.glass,LIMITS.glass,d.glass),
    wallpaper:{kind:kind==='image'&&!file?'default':kind,file:kind==='image'?file:'',
      blur:clamp(w.blur,LIMITS.blur,d.wallpaper.blur),brightness:clamp(w.brightness,LIMITS.brightness,d.wallpaper.brightness)},
    fontScale:clamp(a.fontScale,LIMITS.fontScale,d.fontScale),
    radius:clamp(a.radius,LIMITS.radius,d.radius),
    density:DENSITIES.includes(a.density)?a.density:d.density,
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
  const wall=a.wallpaper.kind==='none'?'none':wallpaperUrl?`url("${wallpaperUrl.replace(/["\\]/g,'\\$&')}")`:`url(${(themeAssets(a.theme)||themeAssets('varco')).wallpaper})`;
  return {
    '--v-accent':accent,'--v-accent-2':light,'--v-accent-rgb':toRgb(accent).join(','),'--v-accent-2-rgb':toRgb(light).join(','),
    '--v-accent-alt':alt,'--v-accent-alt-rgb':toRgb(alt).join(','),
    '--v-bg':theme.bg,'--v-bar-alpha':bar,'--v-bg-rgb':toRgb(theme.bg).join(','),
    '--v-wallpaper':wall,'--v-wall-blur':a.wallpaper.blur+'px','--v-wall-brightness':(a.wallpaper.brightness/100).toFixed(2),
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

module.exports={THEMES,MAX_PRESETS,PRESET_KEYS,themeAssets,normalizePreset,normalizePresets,presetFrom,normalizeWorkspacePreset,effectiveAppearance,DENSITIES,HIDEABLE,HOME_CARDS,LIMITS,MAX_LINKS,defaultAppearance,normalizeAppearance,normalizeLinks,cssVariables,mix};
