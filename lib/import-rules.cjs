'use strict';

/**
 * Beta 0.36 — import da altri browser (Chrome, Edge, Opera, Opera GX, Brave, Vivaldi).
 * Legge i file del profilo (Bookmarks, Preferences, Secure Preferences): niente password,
 * che dalla versione 127 i browser Chromium cifrano in modo che solo loro possano leggerle.
 * Senza Electron, testato in test/import-rules.test.cjs.
 */

/** Browser cercati: base = variabile d'ambiente, rel = cartella "User Data" (o il profilo, se single). */
const BROWSERS=[
  {key:'chrome',label:'Google Chrome',base:'LOCALAPPDATA',rel:'Google/Chrome/User Data'},
  {key:'edge',label:'Microsoft Edge',base:'LOCALAPPDATA',rel:'Microsoft/Edge/User Data'},
  {key:'brave',label:'Brave',base:'LOCALAPPDATA',rel:'BraveSoftware/Brave-Browser/User Data'},
  {key:'vivaldi',label:'Vivaldi',base:'LOCALAPPDATA',rel:'Vivaldi/User Data'},
  {key:'opera',label:'Opera',base:'APPDATA',rel:'Opera Software/Opera Stable',single:true},
  {key:'operagx',label:'Opera GX',base:'APPDATA',rel:'Opera Software/Opera GX Stable',single:true}
];

const isWeb=url=>typeof url==='string'&&/^https?:\/\//i.test(url)&&url.length<=4096;

/** File Bookmarks → elenco piatto [{url,title,folder}] (barra dei preferiti per prima), senza doppioni. */
function flattenBookmarks(json){
  const out=[],seen=new Set();
  const walk=(node,folder)=>{
    if(!node||typeof node!=='object')return;
    if(node.type==='url'){
      if(isWeb(node.url)&&!seen.has(node.url)){seen.add(node.url);out.push({url:node.url,title:String(node.name||'').slice(0,300),folder});}
      return;
    }
    for(const child of Array.isArray(node.children)?node.children:[])walk(child,node.type==='folder'&&node.name?node.name:folder);
  };
  const roots=json?.roots||{};
  for(const key of ['bookmark_bar','other','synced',...Object.keys(roots).filter(k=>!['bookmark_bar','other','synced'].includes(k))])walk(roots[key],'');
  return out;
}

/** Aggiunge i preferiti importati in fondo a quelli di VARCO, saltando quelli già presenti. */
function mergeBookmarks(existing,imported,max=500,now=Date.now()){
  const have=new Set((existing||[]).map(b=>b.url));
  const added=[];
  for(const b of imported||[]){
    if(have.has(b.url))continue;
    if((existing||[]).length+added.length>=max)break;
    have.add(b.url);added.push({url:b.url,title:b.title,at:now});
  }
  return {bookmarks:[...(existing||[]),...added],added:added.length,skipped:(imported||[]).length-added.length};
}

/** Motore di ricerca predefinito (Preferences) → chiave di VARCO (web-rules SEARCH_ENGINES) o null. */
function searchEngineOf(pref){
  const d=pref?.default_search_provider_data?.mirrored_template_url_data||pref?.default_search_provider_data?.template_url_data;
  if(!d)return null;
  const text=String(d.url||'')+' '+String(d.keyword||'')+' '+String(d.short_name||'');
  const rules=[['duckduckgo',/duckduckgo/i],['bing',/bing\.com/i],['brave',/search\.brave/i],['startpage',/startpage/i],['ecosia',/ecosia/i],['google',/google/i]];
  return rules.find(([,re])=>re.test(text))?.[0]||null;
}

/** Pagine aperte all'avvio (solo se il browser è impostato su "apri pagine specifiche"). */
function startupPages(pref){
  const s=pref?.session||{};
  return (Array.isArray(s.startup_urls)?s.startup_urls:[]).filter(isWeb).slice(0,12);
}

/** Nome leggibile: "__MSG_appName__" si risolve con i messaggi della lingua dell'estensione. */
function extensionName(name,messages){
  const m=/^__MSG_(.+)__$/.exec(String(name||''));
  if(!m)return String(name||'').slice(0,80);
  const key=Object.keys(messages||{}).find(k=>k.toLowerCase()===m[1].toLowerCase());
  return String(key?messages[key].message:m[1]).slice(0,80);
}

const CHROME_STORE_UPDATE=/clients2\.google\.com\/service\/update2\/crx/i;
/**
 * Estensioni installate dall'utente (Preferences + Secure Preferences → extensions.settings).
 * store: 'chrome' se arriva dal Chrome Web Store (si può reinstallare in VARCO), altrimenti 'other'
 * (es. Edge Add-ons, componenti del browser: non disponibili).
 */
function extensionsOf(pref,secure){
  const all={...(pref?.extensions?.settings||{}),...(secure?.extensions?.settings||{})};
  const out=[];
  for(const [id,e] of Object.entries(all)){
    if(!/^[a-p]{32}$/.test(id)||!e||typeof e!=='object')continue;
    if(e.location!==1||e.was_installed_by_default||e.was_installed_by_oem)continue; // 1 = installata dall'utente
    const manifest=e.manifest||{};
    if(manifest.theme)continue;
    const chrome=e.from_webstore===true&&!/edge\.microsoft\.com|addons\.opera\.com/i.test(String(manifest.update_url||''))||CHROME_STORE_UPDATE.test(String(manifest.update_url||''));
    out.push({id,name:manifest.name||id,path:typeof e.path==='string'?e.path:'',store:chrome?'chrome':'other',
      enabled:!(Array.isArray(e.disable_reasons)?e.disable_reasons.length:Number(e.disable_reasons||0)||e.state===0)});
  }
  return out.sort((a,b)=>String(a.name).localeCompare(String(b.name)));
}

/** Profili dal file "Local State" (nome visibile di Default, Profile 1…). */
function profilesOf(localState,dirs){
  const cache=localState?.profile?.info_cache||{};
  return dirs.filter(d=>d==='Default'||/^Profile \d+$/.test(d))
    .map(dir=>({dir,name:String(cache[dir]?.name||(dir==='Default'?'Profilo principale':dir)).slice(0,60)}));
}

module.exports={BROWSERS,flattenBookmarks,mergeBookmarks,searchEngineOf,startupPages,extensionName,extensionsOf,profilesOf};
