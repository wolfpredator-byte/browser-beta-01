'use strict';

/**
 * Stile per sito (Beta 0.28, come Boosts di Arc): un CSS tuo per un sito, applicato ogni volta
 * che lo apri. Si scrive nel pannello "Stile del sito" con anteprima dal vivo.
 * data.siteStyles = {host: css}  (host senza "www.").
 */
const {state,save}=require('./state.cjs');

const MAX_SITES=100,MAX_CSS=50000;
const inserted=new WeakMap(); // webContents → chiave del CSS inserito (per sostituirlo)

const hostOf=url=>{try{const u=new URL(url);return /^https?:$/.test(u.protocol)?u.hostname.replace(/^www\./,'').toLowerCase():'';}catch{return '';}};

/** Stili salvati validi: host semplici, testo non troppo lungo. */
function normalizeSiteStyles(raw){
  const out={};
  for(const [host,css] of Object.entries(raw&&typeof raw==='object'?raw:{})){
    if(!/^[a-z0-9.-]{1,253}$/.test(host)||typeof css!=='string'||!css.trim())continue;
    out[host]=css.slice(0,MAX_CSS);
    if(Object.keys(out).length>=MAX_SITES)break;
  }
  return out;
}

/**
 * Mette nella pagina il CSS indicato (o quello salvato per il suo sito), togliendo quello di prima.
 * Le chiamate sulla stessa pagina vanno in fila: due in parallelo lascerebbero un CSS impossibile da togliere.
 */
const queues=new WeakMap();
function apply(contents,css){
  if(!contents||contents.isDestroyed())return Promise.resolve();
  const next=(queues.get(contents)||Promise.resolve()).then(async()=>{
    if(contents.isDestroyed())return;
    const text=css??state.data.siteStyles?.[hostOf(contents.getURL())]??'';
    const old=inserted.get(contents);
    inserted.delete(contents);
    try{
      if(old)await contents.removeInsertedCSS(old);
      // Origine normale ('author'): il CSS inserito con origine 'user' in Electron non si riesce più a togliere.
      if(text.trim())inserted.set(contents,await contents.insertCSS(text));
    }catch{}
  });
  queues.set(contents,next);
  return next;
}
/** Collega una scheda: a ogni pagina caricata, lo stile del suo sito. */
function attach(contents){contents.on('dom-ready',()=>apply(contents));}

/** Applica a tutte le schede aperte di un sito (dopo un salvataggio o un'eliminazione). */
function refreshHost(host){
  for(const t of state.tabs)if(t.view&&!t.view.webContents.isDestroyed()&&hostOf(t.url)===host)apply(t.view.webContents);
}
function saveStyle(host,css){
  if(!host)return {ok:false,error:'Apri una pagina web.'};
  if(css.length>MAX_CSS)return {ok:false,error:'Stile troppo lungo.'};
  const styles={...state.data.siteStyles};
  if(css.trim())styles[host]=css;else delete styles[host];
  if(Object.keys(styles).length>MAX_SITES)return {ok:false,error:`Al massimo ${MAX_SITES} siti con uno stile.`};
  state.data.siteStyles=styles;save();refreshHost(host);
  return {ok:true};
}

module.exports={hostOf,normalizeSiteStyles,apply,attach,refreshHost,saveStyle};
