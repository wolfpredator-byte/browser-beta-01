'use strict';

/**
 * Gestore delle password (Beta 0.25).
 *
 * - Le password stanno in userData/passwords.json, cifrate con safeStorage: su Windows è la
 *   protezione dati dell'utente (DPAPI), quindi solo il tuo account Windows può leggerle.
 *   Nel file restano in chiaro solo sito e nome utente.
 * - L'origine (il sito) la ricava sempre VARCO dall'indirizzo vero del riquadro che scrive,
 *   mai da ciò che dice la pagina: una pagina non può chiedere le password di un altro sito.
 * - Alla pagina arriva una password solo quando scegli un account dall'elenco (page-preload.cjs).
 * - Dopo un accesso chiediamo con una notifica se salvare: la password nuova resta solo in
 *   memoria (al massimo 5 minuti) finché non premi Salva.
 * Le regole stanno in password-rules.cjs.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {app,ipcMain,safeStorage,clipboard}=require('electron');
const {state,save}=require('./state.cjs');
const rules=require('./password-rules.cjs');

const PENDING_MS=5*60*1000,CLIPBOARD_MS=30*1000;
let vault=null;
const pending=new Map();       // token → {origin, username, password, at}
const lastUsername=new Map();  // webContents.id → {origin, username, at} (accessi in due passaggi)

const file=()=>path.join(app.getPath('userData'),'passwords.json');
const available=()=>{try{return safeStorage.isEncryptionAvailable();}catch{return false;}};
const encrypt=text=>safeStorage.encryptString(text).toString('base64');
const decrypt=secret=>{try{return safeStorage.decryptString(Buffer.from(secret,'base64'));}catch{return null;}};

function load(){
  if(vault)return vault;
  try{
    const raw=JSON.parse(fs.readFileSync(file(),'utf8'));
    vault={entries:Array.isArray(raw.entries)?raw.entries.filter(e=>e&&rules.originOf(e.origin)===e.origin&&typeof e.secret==='string'):[],
      never:Array.isArray(raw.never)?raw.never.filter(o=>rules.originOf(o)===o):[]};
  }catch{vault={entries:[],never:[]};}
  return vault;
}
function store(){
  const target=file();
  fs.writeFileSync(target+'.tmp',JSON.stringify({version:1,...vault},null,1));
  fs.renameSync(target+'.tmp',target);
}

/** Origine del riquadro che scrive: solo la pagina principale, solo https (o localhost). */
function senderOrigin(event){
  const frame=event.senderFrame;
  if(!frame||frame!==event.sender.mainFrame)return '';
  return rules.originOf(frame.url);
}
const windowOf=contents=>{
  const t=state.tabs.find(x=>x.view?.webContents===contents);
  return t?require('./windows.cjs').windowForTab(t):null;
};
const candidates=origin=>load().entries.filter(e=>e.origin===origin).map(e=>({...e,password:decrypt(e.secret)}));

// ── Dopo un accesso ──────────────────────────────────────────────────────
function onSubmitted(event,data){
  if(!state.data.settings.passwordSaving||!available())return;
  const origin=senderOrigin(event);
  if(!origin||typeof data?.password!=='string')return;
  let username=rules.clean(data.username,200);
  // Accesso in due passaggi (prima l'email, poi la password in un'altra pagina).
  const before=lastUsername.get(event.sender.id);
  if(!username&&before&&before.origin===origin&&Date.now()-before.at<10*60*1000)username=before.username;
  const decision=rules.decideSave(candidates(origin),load().never,origin,username,data.password);
  if(!['new','update'].includes(decision))return;
  for(const [token,item] of pending)if(Date.now()-item.at>PENDING_MS)pending.delete(token);
  const token=crypto.randomBytes(12).toString('hex');
  pending.set(token,{origin,username,password:data.password,at:Date.now()});
  const host=rules.hostOf(origin);
  require('./toasts.cjs').show({id:'password-'+token,kind:'info',
    title:decision==='new'?`Salvare la password per ${host}?`:`Aggiornare la password di ${host}?`,
    text:username||'(senza nome utente)',
    actions:[{label:decision==='new'?'Salva':'Aggiorna',command:'passwordSave',args:{token}},
      ...(decision==='new'?[{label:'Mai per questo sito',command:'passwordNever',args:{token}}]:[])]},windowOf(event.sender)||undefined);
}

function saveToken(token){
  const item=pending.get(token);
  pending.delete(token);
  if(!item||Date.now()-item.at>PENDING_MS)return {ok:false,error:'Richiesta scaduta: rifai l’accesso.'};
  if(!available())return {ok:false,error:'La cifratura di Windows non è disponibile.'};
  const v=load(),now=Date.now();
  const old=v.entries.find(e=>e.origin===item.origin&&e.username===item.username);
  if(old){old.secret=encrypt(item.password);old.updated=now;}
  else v.entries.push({id:crypto.randomUUID(),origin:item.origin,username:item.username,secret:encrypt(item.password),created:now,updated:now,used:0});
  store();require('./windows.cjs').emitAll();
  require('./toasts.cjs').show({id:'password-'+token,kind:'success',title:'Password salvata',text:rules.hostOf(item.origin),timeout:3000});
  return {ok:true};
}
function neverToken(token){
  const item=pending.get(token);
  pending.delete(token);
  if(!item)return {ok:false};
  const v=load();
  if(!v.never.includes(item.origin)){v.never.push(item.origin);store();}
  require('./toasts.cjs').show({id:'password-'+token,kind:'info',title:'Non chiederò più per '+rules.hostOf(item.origin),
    text:'Puoi cambiare idea da Impostazioni → Password.',timeout:4000});
  require('./windows.cjs').emitAll();
  return {ok:true};
}

// ── Compilazione ─────────────────────────────────────────────────────────
function setup(){
  ipcMain.on('pw:submitted',onSubmitted);
  ipcMain.on('pw:username',(event,username)=>{
    const origin=senderOrigin(event),user=rules.clean(username,200);
    if(origin&&user)lastUsername.set(event.sender.id,{origin,username:user,at:Date.now()});
  });
  // Solo i nomi utente: la password arriva con pw:fill, dopo la tua scelta.
  ipcMain.handle('pw:accounts',event=>{
    const origin=senderOrigin(event);
    if(!origin||!available())return [];
    return rules.accountsFor(load().entries,origin).map(e=>({id:e.id,username:e.username}));
  });
  ipcMain.handle('pw:fill',(event,id)=>{
    const origin=senderOrigin(event);
    const entry=load().entries.find(e=>e.id===id);
    if(!origin||!entry||entry.origin!==origin)return null;
    const password=decrypt(entry.secret);
    if(password===null)return null;
    entry.used=Date.now();store();
    return {username:entry.username,password};
  });
}

// ── Impostazioni ─────────────────────────────────────────────────────────
function snapshot(){
  const v=load();
  return {passwords:{available:available(),enabled:state.data.settings.passwordSaving,
    entries:v.entries.map(e=>({id:e.id,origin:e.origin,host:rules.hostOf(e.origin),username:e.username,updated:e.updated,used:e.used}))
      .sort((a,b)=>a.host.localeCompare(b.host)||a.username.localeCompare(b.username)),
    never:v.never.map(origin=>({origin,host:rules.hostOf(origin)}))}};
}
function reveal(id){
  const entry=load().entries.find(e=>e.id===id);
  const password=entry&&decrypt(entry.secret);
  return password===null||!entry?{ok:false,error:'Password non leggibile.'}:{ok:true,password};
}
function copy(id){
  const r=reveal(id);
  if(!r.ok)return r;
  clipboard.writeText(r.password);
  // Dopo 30 secondi la togliamo dagli appunti (se nel frattempo non hai copiato altro).
  setTimeout(()=>{if(clipboard.readText()===r.password)clipboard.clear();},CLIPBOARD_MS);
  return {ok:true};
}
function remove(id){
  const v=load(),before=v.entries.length;
  v.entries=v.entries.filter(e=>e.id!==id);
  if(v.entries.length!==before)store();
  require('./windows.cjs').emitAll();
  return {ok:v.entries.length!==before};
}
function removeNever(origin){
  const v=load();
  v.never=v.never.filter(o=>o!==origin);store();require('./windows.cjs').emitAll();
}
/** Importa da un CSV di Chrome, Edge o Firefox. Un account già presente viene aggiornato. */
function importFile(source){
  if(!available())return {ok:false,error:'La cifratura di Windows non è disponibile.'};
  if(fs.statSync(source).size>20*1024*1024)return {ok:false,error:'File troppo grande.'};
  const parsed=rules.importCsv(fs.readFileSync(source,'utf8'));
  if(parsed.error)return {ok:false,error:parsed.error};
  const v=load(),now=Date.now();let added=0,updated=0;
  for(const item of parsed.entries){
    const old=v.entries.find(e=>e.origin===item.origin&&e.username===item.username);
    if(old){if(decrypt(old.secret)!==item.password){old.secret=encrypt(item.password);old.updated=now;updated++;}}
    else{v.entries.push({id:crypto.randomUUID(),origin:item.origin,username:item.username,secret:encrypt(item.password),created:now,updated:now,used:0});added++;}
  }
  store();require('./windows.cjs').emitAll();
  return {ok:true,added,updated,skipped:parsed.skipped};
}

module.exports={setup,saveToken,neverToken,snapshot,reveal,copy,remove,removeNever,importFile,available};
