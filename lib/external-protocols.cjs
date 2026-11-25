'use strict';

/**
 * Link che aprono un'app del PC (Beta 0.46.2): «Aprire Steam?», come in Chrome.
 *
 * Arrivano da tre strade, tutte qui:
 * - la pagina cambia indirizzo verso «nomegioco://…» (tabs.cjs, will-navigate);
 * - un link con target=_blank o window.open (tabs.cjs, setWindowOpenHandler);
 * - un rimando del server o di un riquadro: Chromium chiede il permesso «openExternal» (permissions.cjs).
 * Le regole (tipi mai aperti, «consenti sempre per questo sito») stanno in external-protocol-rules.cjs.
 */
const {app,shell}=require('electron');
const {state,save}=require('./state.cjs');
const rules=require('./external-protocol-rules.cjs');

const originOf=url=>{try{const u=new URL(url);return /^https?:$/.test(u.protocol)?u.origin:'';}catch{return '';}};
const appName=url=>{try{return app.getApplicationNameForProtocol(url)||'';}catch{return '';}};
function toast(contents,title,text){
  const t=state.tabs.find(x=>x.view?.webContents===contents);
  const w=t?require('./windows.cjs').windowForTab(t):undefined;
  require('./toasts.cjs').show({id:'external-link',kind:'info',category:'sito',title,text,timeout:7000},w);
}
const asking=new Set(); // la stessa pagina che ripete la richiesta non apre dieci domande

/** Decide se aprire `url` (chiesto dalla pagina `requestingUrl`). Restituisce true/false. */
async function decide(contents,requestingUrl,url){
  const scheme=rules.schemeOf(url);
  if(!rules.isExternal(url))return false;
  if(rules.isBlocked(url)){toast(contents,'Link bloccato',`VARCO non apre i link «${scheme}:»: possono avviare programmi in modo pericoloso.`);return false;}
  const name=appName(url);
  if(!name){toast(contents,'Nessuna app per questo link',`Sul PC non c'è un'app che apre i link «${scheme}:». Se è un gioco o un launcher, controlla che sia installato.`);return false;}
  const origin=originOf(requestingUrl||contents?.getURL?.()||'');
  if(rules.isAllowed(state.data.externalProtocols,origin,scheme))return true;
  const key=origin+'|'+scheme;
  if(asking.has(key))return false;
  asking.add(key);
  try{
    const t=state.tabs.find(x=>x.view?.webContents===contents);
    const w=(t&&require('./windows.cjs').windowForTab(t))||require('./windows.cjs').focusedWindow();
    const host=origin?new URL(origin).host:'Questa pagina';
    const answer=await require('./popup.cjs').dialog(w,{type:'question',icon:'external',message:`Aprire «${name}»?`,
      detail:`${host} vuole aprire un link con l'app «${name}» (per esempio per tornare al launcher dopo l'accesso).\n${rules.shortUrl(url)}`,
      buttons:['Apri','Annulla'],defaultId:0,cancelId:1,
      ...(origin?{checkboxLabel:`Consenti sempre a ${host} di aprire i link «${scheme}:»`}:{})});
    if(answer.response!==0)return false;
    if(answer.checkboxChecked&&origin){state.data.externalProtocols=rules.allow(state.data.externalProtocols,origin,scheme);save();}
    return true;
  }finally{asking.delete(key);}
}

/** Per will-navigate e window.open: decide e, se sì, apre l'app. */
async function open(contents,requestingUrl,url){
  if(await decide(contents,requestingUrl,url))await shell.openExternal(url).catch(()=>{});
}

module.exports={decide,open};
