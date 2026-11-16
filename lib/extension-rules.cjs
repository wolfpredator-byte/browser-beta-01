'use strict';

/**
 * Beta 0.37.2 — regole delle estensioni (senza Electron, con test).
 *
 * 1) Permessi sui siti. La libreria electron-chrome-extensions confrontava i permessi come testo:
 *    "https://example.com/*" non è letteralmente "<all_urls>", quindi chrome.permissions.contains diceva
 *    "no" anche a chi aveva tutti i siti, e molte estensioni non agivano. Qui i "match pattern" di Chrome
 *    (schema://host/percorso, con * e <all_urls>) si confrontano davvero.
 * 2) Estensioni Manifest V2: i siti stanno in "permissions", non in "host_permissions".
 * 3) Accesso ai siti. Electron non sa concedere l'accesso al singolo clic (activeTab) né i siti chiesti durante
 *    l'uso (optional_host_permissions): l'estensione veniva respinta dalla pagina. Con "Su tutti i siti" (scelta
 *    dell'utente, come in Chrome) VARCO aggiunge <all_urls> al manifest della sua copia installata.
 * 4) File .crx (pacchetti di estensioni fuori dal Chrome Web Store): CRX2 e CRX3 contengono uno ZIP.
 */
const SCHEMES=['http','https','ws','wss','ftp','file','urn'];
const ALL=['<all_urls>','*://*/*'];

/** "https://*.example.com/*" → {scheme,host,path}; null se non è un pattern. */
function parsePattern(pattern){
  if(pattern==='<all_urls>')return {all:true};
  const m=/^(\*|[a-z][a-z0-9+.-]*):\/\/([^/]*)(\/.*)$/i.exec(String(pattern||''));
  if(!m)return null;
  return {scheme:m[1].toLowerCase(),host:m[2].toLowerCase(),path:m[3]};
}
const isPattern=p=>typeof p==='string'&&!!parsePattern(p);
const glob=p=>new RegExp('^'+p.split('*').map(s=>s.replace(/[.+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$');

function schemeCovers(g,r){
  if(g==='*')return r==='*'||r==='http'||r==='https';
  return g===r;
}
function hostCovers(g,r){
  if(g==='*')return true;
  if(g.startsWith('*.')){
    const base=g.slice(2);
    const rb=r.startsWith('*.')?r.slice(2):r;
    return rb===base||rb.endsWith('.'+base);
  }
  return g===r;
}
/** Il permesso concesso `granted` comprende la richiesta `requested` (un pattern o un indirizzo)? */
function patternCovers(granted,requested){
  const g=parsePattern(granted);if(!g)return false;
  let r=parsePattern(requested);
  if(!r){try{const u=new URL(requested);r={scheme:u.protocol.slice(0,-1),host:u.hostname,path:u.pathname+u.search};}catch{return false;}}
  if(g.all)return r.all||SCHEMES.includes(r.scheme)||r.scheme==='*';
  if(r.all)return false;
  return schemeCovers(g.scheme,r.scheme)&&hostCovers(g.host,r.host)&&glob(g.path).test(r.path.replace(/\*/g,'*'));
}
const covers=(granted,requested)=>granted.some(g=>patternCovers(g,requested));

/** Siti concessi dal manifest (MV3: host_permissions; MV2: le voci di permissions che sono pattern). */
function hostOriginsOf(manifest){
  const list=[...(manifest?.host_permissions||[]),...(manifest?.manifest_version===2?(manifest.permissions||[]).filter(isPattern):[])];
  return [...new Set(list.filter(isPattern))];
}
/** Permessi API (storage, tabs…): tutto ciò che non è un pattern. */
const apiPermissionsOf=manifest=>(manifest?.permissions||[]).filter(p=>typeof p==='string'&&!isPattern(p));

/** L'estensione agisce sui siti solo con il clic o con permessi chiesti al momento (cose che Electron non concede)? */
function needsSiteAccess(manifest){
  if(!manifest)return false;
  if(hostOriginsOf(manifest).some(p=>ALL.includes(p)))return false; // ha già tutti i siti
  const optional=[...(manifest.optional_host_permissions||[]),...(manifest.manifest_version===2?(manifest.optional_permissions||[]).filter(isPattern):[])];
  return apiPermissionsOf(manifest).includes('activeTab')||optional.length>0;
}
const MARK='varco_site_access';
/** Copia del manifest con l'accesso a tutti i siti (segnata, per poterla riconoscere e annullare). */
function widenManifest(manifest){
  const m=JSON.parse(JSON.stringify(manifest));
  if(m.manifest_version===2)m.permissions=[...new Set([...(m.permissions||[]),'<all_urls>'])];
  else m.host_permissions=[...new Set([...(m.host_permissions||[]),'<all_urls>'])];
  m[MARK]='all';
  return m;
}
const isWidened=manifest=>manifest?.[MARK]==='all';

/** Contenuto ZIP di un file .crx (CRX2 o CRX3); uno ZIP passa così com'è. */
function crxToZip(buffer){
  const b=Buffer.from(buffer);
  if(b.length>4&&b[0]===0x50&&b[1]===0x4b)return b; // "PK": è già uno ZIP
  if(b.length<16||b.toString('latin1',0,4)!=='Cr24')throw new Error('Non è un file .crx valido.');
  const version=b.readUInt32LE(4);
  let start;
  if(version===2)start=16+b.readUInt32LE(8)+b.readUInt32LE(12);
  else if(version===3)start=12+b.readUInt32LE(8);
  else throw new Error('Versione di .crx non supportata ('+version+').');
  if(start>=b.length||b[start]!==0x50||b[start+1]!==0x4b)throw new Error('Il file .crx è danneggiato.');
  return b.subarray(start);
}

module.exports={parsePattern,isPattern,patternCovers,covers,hostOriginsOf,apiPermissionsOf,needsSiteAccess,widenManifest,isWidened,crxToZip,MARK};
