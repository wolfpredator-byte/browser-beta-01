'use strict';

/**
 * Pannelli web (Beta 0.27), senza Electron: elenco salvato, larghezze, suggerimenti,
 * messaggi non letti dal titolo della pagina ("(3) WhatsApp" → 3).
 */
const SIZES={stretto:340,medio:420,largo:560,moltoLargo:720};
const SIZE_LABELS={stretto:'Stretto',medio:'Medio',largo:'Largo',moltoLargo:'Molto largo'};
/** Beta 0.35: larghezza scelta trascinando il bordo (vince sulla taglia), entro questi limiti. */
const MIN_WIDTH=280,MAX_WIDTH=1400;
/** Beta 0.35: sotto questa larghezza il sito "vede" uno schermo largo così e viene rimpicciolito per starci intero. */
const DESKTOP_WIDTH=900;
const MAX_PANELS=12;
/** Siti comodi in un pannello: chat, musica, assistenti, posta. */
const SUGGESTIONS=[
  ['WhatsApp','https://web.whatsapp.com/'],['Discord','https://discord.com/app'],['Telegram','https://web.telegram.org/'],
  ['Spotify','https://open.spotify.com/'],['YouTube Music','https://music.youtube.com/'],['ChatGPT','https://chatgpt.com/'],
  ['Claude','https://claude.ai/'],['Gmail','https://mail.google.com/'],['Google Calendar','https://calendar.google.com/'],
  ['Notion','https://www.notion.so/']
];

const hostOf=url=>{try{return new URL(url).hostname.replace(/^www\./,'');}catch{return '';}};
const cleanUrl=url=>{
  try{
    let text=String(url||'').trim();
    if(text&&!/^[a-z]+:\/\//i.test(text))text='https://'+text;
    const u=new URL(text);
    return u.protocol==='https:'||(u.protocol==='http:'&&/^(localhost|127\.0\.0\.1)$/.test(u.hostname))?u.href:'';
  }catch{return '';}
};

/** Elenco salvato: indirizzi https, nomi brevi, id unici, al massimo MAX_PANELS. */
function normalizePanels(raw){
  const out=[],ids=new Set();
  for(const p of Array.isArray(raw)?raw:[]){
    const url=cleanUrl(p?.url);
    const id=typeof p?.id==='string'&&/^[a-z0-9-]{1,40}$/.test(p.id)?p.id:'';
    if(!url||!id||ids.has(id))continue;
    ids.add(id);
    out.push({id,url,title:(typeof p.title==='string'&&p.title.trim()?p.title.trim():hostOf(url)).slice(0,40),
      size:Object.hasOwn(SIZES,p.size)?p.size:'medio',mobile:p.mobile===true,
      ...(Number.isFinite(p.width)?{width:clampWidth(p.width)}:{}),fit:p.fit!==false,
      favicon:typeof p.favicon==='string'&&p.favicon.startsWith('data:image/')&&p.favicon.length<140000?p.favicon:''});
    if(out.length>=MAX_PANELS)break;
  }
  return out;
}

const clampWidth=w=>Math.round(Math.min(MAX_WIDTH,Math.max(MIN_WIDTH,Number(w)||0)));
/** Larghezza del pannello: quella trascinata, altrimenti la taglia. */
const panelWidth=p=>Number.isFinite(p?.width)?clampWidth(p.width):SIZES[p?.size]||SIZES.medio;

/**
 * Beta 0.35 — "Adatta il sito": un pannello stretto taglia i siti pensati per il computer
 * (WhatsApp, Discord…). Allora la pagina vede uno schermo largo DESKTOP_WIDTH e viene
 * rimpicciolita (scale) fino alla larghezza vera. null = nessun adattamento.
 */
function fitFor(width,height,{mobile=false,fit=true}={}){
  if(mobile||!fit||!(width>0)||width>=DESKTOP_WIDTH)return null;
  const scale=width/DESKTOP_WIDTH;
  return {scale,width:DESKTOP_WIDTH,height:Math.max(1,Math.round(height/scale))};
}

/** Messaggi non letti: molti siti li mettono nel titolo, "(3) WhatsApp" o "Discord | 3". */
function unreadFrom(title){
  const t=String(title||'');
  const m=/^\((\d{1,4})\+?\)/.exec(t)||/\((\d{1,4})\+?\)\s*$/.exec(t);
  return m?Number(m[1]):0;
}

module.exports={SIZES,SIZE_LABELS,MIN_WIDTH,MAX_WIDTH,DESKTOP_WIDTH,clampWidth,panelWidth,fitFor,MAX_PANELS,SUGGESTIONS,hostOf,cleanUrl,normalizePanels,unreadFrom};
