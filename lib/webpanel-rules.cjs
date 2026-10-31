'use strict';

/**
 * Pannelli web (Beta 0.27), senza Electron: elenco salvato, larghezze, suggerimenti,
 * messaggi non letti dal titolo della pagina ("(3) WhatsApp" → 3).
 */
const SIZES={stretto:340,medio:420,largo:560};
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
      favicon:typeof p.favicon==='string'&&p.favicon.startsWith('data:image/')&&p.favicon.length<140000?p.favicon:''});
    if(out.length>=MAX_PANELS)break;
  }
  return out;
}

/** Messaggi non letti: molti siti li mettono nel titolo, "(3) WhatsApp" o "Discord | 3". */
function unreadFrom(title){
  const t=String(title||'');
  const m=/^\((\d{1,4})\+?\)/.exec(t)||/\((\d{1,4})\+?\)\s*$/.exec(t);
  return m?Number(m[1]):0;
}

module.exports={SIZES,MAX_PANELS,SUGGESTIONS,hostOf,cleanUrl,normalizePanels,unreadFrom};
