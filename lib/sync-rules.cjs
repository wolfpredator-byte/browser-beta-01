'use strict';

/**
 * Beta 0.33: regole della sincronizzazione di preferiti e password col telefono. Niente Electron (`node --test`).
 * La stessa fusione è scritta in Kotlin (mobile/…/SyncRules.kt): se cambi qui, cambia anche là.
 *
 * Ogni elemento ha una chiave (l'indirizzo per i preferiti, sito + nome utente per le password) e at,
 * l'ora dell'ultima modifica. Chi toglie un elemento lascia una "lapide" {del:true, at}: così l'altro lato
 * sa che è stato tolto e non lo rimette. Fondendo due elenchi vince, per ogni chiave, la modifica più recente
 * (a parità vince la lapide). Le lapidi si dimenticano dopo 90 giorni.
 */
const crypto=require('node:crypto');

const TOMB_MS=90*24*60*60*1000;
const MAX_BOOKMARKS=500;

const bookmarkKey=item=>item.url;
const passwordKey=item=>item.origin+'\n'+item.username;

/** Fonde due elenchi di elementi (con lapidi). */
function mergeItems(a,b,key,now=Date.now()){
  const out=new Map();
  for(const item of [...a,...b]){
    if(!item)continue;
    const k=key(item),old=out.get(k);
    const at=Number(item.at)||0;
    if(!old||at>old.at||(at===old.at&&item.del&&!old.del))out.set(k,{...item,at});
  }
  return [...out.values()].filter(x=>!x.del||now-x.at<TOMB_MS);
}

/** Un'impronta corta dell'elenco: se non cambia, non serve sincronizzare. */
function version(items,key){
  const lines=items.map(x=>`${key(x)}\t${x.at}\t${x.del?1:0}\t${x.title||''}`).sort();
  return crypto.createHash('sha256').update(lines.join('\n')).digest('hex').slice(0,16);
}

// ── Preferiti del PC: data.bookmarks [{url,title,at}] + data.bookmarksRemoved {url: at} ──

function normalizeBookmarks(data){
  const seen=new Set();
  data.bookmarks=(Array.isArray(data.bookmarks)?data.bookmarks:[])
    .filter(b=>b&&typeof b.url==='string'&&b.url&&!seen.has(b.url)&&seen.add(b.url))
    .map(b=>({url:b.url,title:String(b.title||'').slice(0,300),at:Number(b.at)||0})).slice(0,MAX_BOOKMARKS);
  const removed={},now=Date.now();
  for(const [url,at] of Object.entries(data.bookmarksRemoved&&typeof data.bookmarksRemoved==='object'?data.bookmarksRemoved:{}))
    if(Number.isFinite(at)&&now-at<TOMB_MS&&!seen.has(url))removed[url]=at;
  data.bookmarksRemoved=removed;
}

function addBookmark(data,url,title,now=Date.now()){
  if(data.bookmarks.some(x=>x.url===url))return false;
  data.bookmarks.unshift({url,title:String(title||'').slice(0,300),at:now});
  data.bookmarks=data.bookmarks.slice(0,MAX_BOOKMARKS);
  delete data.bookmarksRemoved[url];
  return true;
}

function removeBookmark(data,url,now=Date.now()){
  const before=data.bookmarks.length;
  data.bookmarks=data.bookmarks.filter(x=>x.url!==url);
  if(data.bookmarks.length===before)return false;
  data.bookmarksRemoved[url]=now;
  return true;
}

/** Preferiti e lapidi come elenco da mandare. */
const bookmarkItems=data=>[
  ...data.bookmarks.map(b=>({url:b.url,title:b.title,at:b.at})),
  ...Object.entries(data.bookmarksRemoved).map(([url,at])=>({url,at,del:true}))];

/** Fonde i preferiti arrivati dal telefono con quelli del PC; restituisce l'elenco fuso (da rimandare). */
function applyBookmarks(data,incoming,now=Date.now()){
  const clean=(Array.isArray(incoming)?incoming:[]).filter(x=>x&&typeof x.url==='string'&&/^https?:\/\//.test(x.url)&&x.url.length<=4096)
    .map(x=>({url:x.url,title:String(x.title||'').slice(0,300),at:Number(x.at)||0,...(x.del?{del:true}:{})}));
  const merged=mergeItems(bookmarkItems(data),clean,bookmarkKey,now);
  const order=new Map(data.bookmarks.map((b,i)=>[b.url,i]));
  // I preferiti già del PC restano nel loro ordine; quelli nuovi vanno in cima, i più recenti prima.
  const live=merged.filter(x=>!x.del);
  const fresh=live.filter(x=>!order.has(x.url)).sort((a,b)=>b.at-a.at);
  const kept=live.filter(x=>order.has(x.url)).sort((a,b)=>order.get(a.url)-order.get(b.url));
  data.bookmarks=[...fresh,...kept].map(x=>({url:x.url,title:x.title,at:x.at})).slice(0,MAX_BOOKMARKS);
  data.bookmarksRemoved=Object.fromEntries(merged.filter(x=>x.del).map(x=>[x.url,x.at]));
  return bookmarkItems(data);
}

/** Password arrivate dal telefono: solo siti validi, campi corti. La cifratura la fa passwords.cjs. */
function cleanPasswords(incoming,originOf){
  return (Array.isArray(incoming)?incoming:[]).filter(x=>x&&typeof x.origin==='string'&&originOf(x.origin)===x.origin&&typeof x.username==='string')
    .filter(x=>x.del||(typeof x.password==='string'&&x.password&&x.password.length<=1000))
    .map(x=>({origin:x.origin,username:x.username.slice(0,200),at:Number(x.at)||0,...(x.del?{del:true}:{password:x.password})}));
}

module.exports={TOMB_MS,MAX_BOOKMARKS,bookmarkKey,passwordKey,mergeItems,version,normalizeBookmarks,addBookmark,removeBookmark,bookmarkItems,applyBookmarks,cleanPasswords};
