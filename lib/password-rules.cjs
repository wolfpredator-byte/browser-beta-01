'use strict';

/**
 * Gestore delle password (Beta 0.25), senza Electron: origini, quando salvare o aggiornare,
 * lettura dei file CSV esportati da Chrome, Edge e Firefox. La cifratura sta in passwords.cjs.
 */

/**
 * Origine a cui legare una password: https (o http solo per localhost e reti locali).
 * La pagina non la sceglie mai: VARCO la ricava dall'indirizzo vero del riquadro.
 * @returns {string} es. "https://accounts.google.com", '' se non va bene
 */
function originOf(url){
  try{
    const u=new URL(url);
    if(u.protocol==='https:')return u.origin;
    if(u.protocol==='http:'&&(u.hostname==='localhost'||u.hostname==='127.0.0.1'||u.hostname.endsWith('.localhost')))return u.origin;
    return '';
  }catch{return '';}
}
/** Nome da mostrare: l'host senza "www.". */
const hostOf=origin=>{try{return new URL(origin).host.replace(/^www\./,'');}catch{return origin;}};

const clean=(text,max)=>typeof text==='string'?text.replace(/[\u0000-\u001f]/g,'').slice(0,max):'';

/**
 * Cosa fare dopo un accesso: 'new' (nuovo account), 'update' (password cambiata),
 * 'same' (già salvata così), 'never' (sito escluso), 'skip' (dati non validi).
 */
function decideSave(entries,never,origin,username,password){
  if(!origin||typeof password!=='string'||!password||password.length>1000)return 'skip';
  if(never.includes(origin))return 'never';
  const user=clean(username,200);
  const old=entries.find(e=>e.origin===origin&&e.username===user);
  if(!old)return 'new';
  return old.password===password?'same':'update';
}

/** Account salvati per un'origine, i più usati di recente prima. */
function accountsFor(entries,origin){
  return entries.filter(e=>e.origin===origin).sort((a,b)=>(b.used||b.updated||0)-(a.used||a.updated||0));
}

/** Righe di un CSV (virgolette doppie, a capo dentro i campi, BOM iniziale). */
function parseCsv(text){
  const rows=[];let row=[],field='',quoted=false;
  const s=String(text||'').replace(/^﻿/,'');
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(quoted){
      if(c==='"'&&s[i+1]==='"'){field+='"';i++;}
      else if(c==='"')quoted=false;
      else field+=c;
    }else if(c==='"')quoted=true;
    else if(c===','){row.push(field);field='';}
    else if(c==='\n'||c==='\r'){
      if(c==='\r'&&s[i+1]==='\n')i++;
      row.push(field);field='';
      if(row.some(x=>x!==''))rows.push(row);
      row=[];
    }else field+=c;
  }
  row.push(field);
  if(row.some(x=>x!==''))rows.push(row);
  return rows;
}

/**
 * Password da un CSV di Chrome/Edge (name,url,username,password,note) o Firefox
 * ("url","username","password",…). Le colonne si riconoscono dal nome.
 * @returns {{entries:{origin:string,username:string,password:string}[],skipped:number}}
 */
function importCsv(text){
  const rows=parseCsv(text);
  if(!rows.length)return {entries:[],skipped:0};
  const head=rows[0].map(h=>h.trim().toLowerCase());
  const col=names=>head.findIndex(h=>names.includes(h));
  const url=col(['url','origin','website','login_uri']),user=col(['username','login','user','login_username']),pass=col(['password','login_password']);
  if(url===-1||pass===-1)return {entries:[],skipped:rows.length-1,error:'Colonne "url" e "password" non trovate.'};
  const entries=[];let skipped=0;
  for(const row of rows.slice(1)){
    const origin=originOf((row[url]||'').trim());
    const password=row[pass]||'';
    if(!origin||!password||password.length>1000){skipped++;continue;}
    entries.push({origin,username:clean(user===-1?'':row[user],200),password});
  }
  return {entries,skipped};
}

module.exports={originOf,hostOf,decideSave,accountsFor,parseCsv,importCsv,clean};
