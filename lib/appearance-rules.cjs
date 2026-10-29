'use strict';

/**
 * Personalizzazione (Beta 0.21), senza Electron: temi, sfondo, interfaccia, Home.
 * data.appearance contiene solo le scelte; i colori e le variabili CSS si calcolano qui.
 */

/** Temi pronti: colore d'accento e tinta dello sfondo. */
const THEMES={
  varco:{label:'VARCO',accent:'#7c6cff',bg:'#07070e'},
  oceano:{label:'Oceano',accent:'#3d8bff',bg:'#050a13'},
  aurora:{label:'Aurora',accent:'#2fc9b0',bg:'#04100f'},
  smeraldo:{label:'Smeraldo',accent:'#3cc46e',bg:'#050f08'},
  tramonto:{label:'Tramonto',accent:'#ff8a3d',bg:'#120905'},
  cremisi:{label:'Cremisi',accent:'#ff4d6a',bg:'#120508'},
  sakura:{label:'Sakura',accent:'#ff7ac0',bg:'#11060d'},
  grafite:{label:'Grafite',accent:'#b9bdc9',bg:'#0a0a0c'}
};
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

const isHex=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const clamp=(value,[min,max],fallback)=>Number.isFinite(value)?Math.min(max,Math.max(min,Math.round(value))):fallback;

function defaultAppearance(){
  return {theme:'varco',accent:'',glass:26,
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
  const bar=(a.glass/100).toFixed(2);
  const wall=a.wallpaper.kind==='none'?'none':wallpaperUrl?`url("${wallpaperUrl.replace(/["\\]/g,'\\$&')}")`:'url(assets/home-bg.jpg)';
  return {
    '--v-accent':accent,'--v-accent-2':light,'--v-accent-rgb':toRgb(accent).join(','),'--v-accent-2-rgb':toRgb(light).join(','),
    '--v-bg':theme.bg,'--v-bar-alpha':bar,'--v-bg-rgb':toRgb(theme.bg).join(','),
    '--v-wallpaper':wall,'--v-wall-blur':a.wallpaper.blur+'px','--v-wall-brightness':(a.wallpaper.brightness/100).toFixed(2),
    '--v-ui-scale':(a.fontScale/100).toFixed(2),'--page-radius':a.radius+'px'
  };
}

module.exports={THEMES,DENSITIES,HIDEABLE,HOME_CARDS,LIMITS,MAX_LINKS,defaultAppearance,normalizeAppearance,normalizeLinks,cssVariables,mix};
