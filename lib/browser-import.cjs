'use strict';

/**
 * Beta 0.36 — import da altri browser: trova i browser e i profili sul PC, mostra cosa c'è
 * e importa solo ciò che scegli (preferiti, estensioni, motore di ricerca, pagine di avvio → link della Home).
 * Le regole stanno in import-rules.cjs. I file si leggono e basta: il browser d'origine non viene toccato.
 */
const fs=require('node:fs');
const path=require('node:path');
const {state,save}=require('./state.cjs');
const rules=require('./import-rules.cjs');

const readJson=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}};

/** Cartella dati del browser e dei suoi profili. */
function browserDir(b){
  const base=process.env[b.base];
  return base?path.join(base,...b.rel.split('/')):null;
}
function profileDir(b,dir){
  const root=browserDir(b);
  if(!b.single)return path.join(root,dir);
  // Opera: il profilo sta nella cartella del browser, oppure (versioni recenti) in Default.
  return fs.existsSync(path.join(root,'Default','Preferences'))?path.join(root,'Default'):root;
}

/** Nome dell'estensione: anche quando nel manifest c'è "__MSG_…__" (si legge _locales). */
function extensionLabel(b,profile,e){
  if(!/^__MSG_/.test(e.name))return e.name;
  try{
    const dir=path.isAbsolute(e.path)?e.path:path.join(profileDir(b,profile),'Extensions',e.path);
    const manifest=readJson(path.join(dir,'manifest.json'))||{};
    const locale=manifest.default_locale||'en';
    const messages=readJson(path.join(dir,'_locales','it','messages.json'))||readJson(path.join(dir,'_locales',locale,'messages.json'))||{};
    return rules.extensionName(e.name,messages);
  }catch{return rules.extensionName(e.name,{});}
}

/** Cosa c'è in un profilo (conteggi ed elenco delle estensioni). */
function readProfile(b,dir){
  const p=profileDir(b,dir);
  const pref=readJson(path.join(p,'Preferences'));
  const bookmarks=rules.flattenBookmarks(readJson(path.join(p,'Bookmarks')));
  const installed=new Set(require('./extensions.cjs').snapshot().extensions.list.map(e=>e.id));
  const extensions=rules.extensionsOf(pref,readJson(path.join(p,'Secure Preferences')))
    .map(e=>({id:e.id,name:extensionLabel(b,dir,e),store:e.store,enabled:e.enabled,installed:installed.has(e.id)}));
  return {bookmarks,extensions,search:rules.searchEngineOf(pref),startup:rules.startupPages(pref)};
}

/** Browser trovati sul PC, con i loro profili e cosa contengono. */
function scan(){
  const out=[];
  for(const b of rules.BROWSERS){
    const root=browserDir(b);
    if(!root||!fs.existsSync(root))continue;
    let dirs=['Default'];
    if(!b.single){try{dirs=fs.readdirSync(root);}catch{continue;}}
    const profiles=b.single?[{dir:'Default',name:'Profilo principale'}]:rules.profilesOf(readJson(path.join(root,'Local State')),dirs);
    const list=[];
    for(const prof of profiles){
      if(!fs.existsSync(path.join(profileDir(b,prof.dir),'Preferences')))continue;
      const content=readProfile(b,prof.dir);
      list.push({dir:prof.dir,name:prof.name,bookmarks:content.bookmarks.length,search:content.search,startup:content.startup.length,extensions:content.extensions});
    }
    if(list.length)out.push({key:b.key,label:b.label,profiles:list});
  }
  return out;
}

/**
 * Importa le parti scelte. extensions = ID da reinstallare dal Chrome Web Store.
 * @returns {Promise<{ok:true,summary:string[]}>}
 */
async function run({browser,profile,bookmarks=false,search=false,startup=false,extensions=[],workspace=''}){
  const b=rules.BROWSERS.find(x=>x.key===browser);
  if(!b)return {ok:false,error:'Browser sconosciuto.'};
  const content=readProfile(b,profile);
  const {data}=state;
  const summary=[];
  if(bookmarks){
    const m=rules.mergeBookmarks(data.bookmarks,content.bookmarks);
    data.bookmarks=m.bookmarks;
    for(const x of content.bookmarks)delete data.bookmarksRemoved?.[x.url];
    summary.push(`${m.added} preferiti importati`+(m.skipped?` (${m.skipped} già presenti o oltre il limite di 500)`:''));
  }
  if(search){
    if(content.search){data.settings.searchEngine=content.search;summary.push('motore di ricerca: '+require('./web-rules.cjs').SEARCH_ENGINES[content.search].label);}
    else summary.push('motore di ricerca non riconosciuto: resta quello di VARCO');
  }
  // Le pagine di avvio diventano link rapidi della Home del workspace da cui importi.
  const ws=data.workspaces.find(x=>x.name===workspace)||data.workspaces[0];
  if(startup&&content.startup.length&&ws){
    const a=require('./appearance-rules.cjs');
    const links=ws.homeLinks||[];
    const have=new Set(links.map(l=>l.url));
    const before=links.length;
    ws.homeLinks=a.normalizeLinks([...links,...content.startup.filter(u=>!have.has(u)).map(url=>({url}))]);
    summary.push(`${ws.homeLinks.length-before} pagine di avvio aggiunte ai link della Home di «${ws.name}»`);
  }else if(startup)summary.push('nessuna pagina di avvio impostata in quel browser');
  save();
  const wanted=content.extensions.filter(e=>e.store==='chrome'&&extensions.includes(e.id)&&!e.installed);
  if(wanted.length){
    const ok=[],failed=[];
    for(const e of wanted){
      const r=await require('./extensions.cjs').installFromStore(e.id);
      (r.ok?ok:failed).push(e.name);
    }
    if(ok.length)summary.push(`estensioni installate: ${ok.join(', ')}`);
    if(failed.length)summary.push(`non installate: ${failed.join(', ')}`);
  }
  require('./windows.cjs').emitAll();
  return {ok:true,summary};
}

module.exports={scan,run};
