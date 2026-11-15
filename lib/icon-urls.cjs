'use strict';

/**
 * Beta 0.37 — icone leggere negli aggiornamenti della cornice.
 *
 * Le icone (favicon, siti della Home, pannelli web, workspace) sono immagini "data:image/…".
 * Prima viaggiavano intere a ogni aggiornamento della cornice: ~270 KB ogni volta.
 * Ora ogni icona diventa un indirizzo corto, varco-icon://i/<numero>, sempre lo stesso per la
 * stessa immagine: la cornice la scarica una volta (dal processo principale, senza rete) e poi
 * la ritrova nella sua cache.
 *
 * Lo schema è servito solo nella sessione delle cornici (session.defaultSession), dove non gira
 * nessun sito: le pagine web stanno nelle loro partizioni e non possono chiedere queste icone.
 */
const SCHEME='varco-icon';
const MIN_LENGTH=200;     // le immagini più piccole costano meno dell'indirizzo + richiesta
const MAX_ICONS=1500;     // oltre, si dimenticano le più vecchie

const ids=new Map();      // testo data: → numero
const images=new Map();   // numero → {type, body}
let nextId=1;

function parseDataUrl(text){
  const m=/^data:(image\/[\w.+-]+)(;base64)?,(.*)$/s.exec(text);
  if(!m)return null;
  try{
    const body=m[2]?Buffer.from(m[3],'base64'):Buffer.from(decodeURIComponent(m[3]));
    return {type:m[1],body};
  }catch{return null;}
}

/** L'indirizzo corto di un'immagine data:, o il testo così com'è se non è un'immagine. */
function toUrl(text){
  if(typeof text!=='string'||text.length<MIN_LENGTH||!text.startsWith('data:image/'))return text;
  let id=ids.get(text);
  if(id===undefined){
    const image=parseDataUrl(text);
    if(!image)return text;
    id=nextId++;
    ids.set(text,id);images.set(id,image);
    if(ids.size>MAX_ICONS){
      const [oldText,oldId]=ids.entries().next().value;
      ids.delete(oldText);images.delete(oldId);
    }
  }else{
    // Usata di recente: in fondo alla coda, l'ultima a essere dimenticata.
    ids.delete(text);ids.set(text,id);
  }
  return `${SCHEME}://i/${id}`;
}

/**
 * Copia di un oggetto (lo snapshot della cornice) con le immagini data: sostituite dagli indirizzi.
 * È una copia: lo snapshot contiene riferimenti ai dati veri (preferiti, workspace…) che non vanno toccati.
 */
function rewrite(value){
  if(typeof value==='string')return toUrl(value);
  if(Array.isArray(value))return value.map(rewrite);
  if(value&&typeof value==='object'){
    const proto=Object.getPrototypeOf(value);
    if(proto!==Object.prototype&&proto!==null)return value; // Date, Buffer…: così come sono
    const out={};
    for(const key in value)out[key]=rewrite(value[key]);
    return out;
  }
  return value;
}

function lookup(url){
  const m=/^varco-icon:\/\/i\/(\d+)$/.exec(url);
  return m?images.get(Number(m[1]))||null:null;
}

/** Dopo app.ready: risponde alle richieste delle cornici. */
function setup(){
  const {session}=require('electron');
  session.defaultSession.protocol.handle(SCHEME,request=>{
    const image=lookup(request.url);
    if(!image)return new Response('',{status:404});
    return new Response(image.body,{headers:{'content-type':image.type,'cache-control':'max-age=31536000, immutable'}});
  });
}

module.exports={SCHEME,MIN_LENGTH,toUrl,rewrite,lookup,setup};
