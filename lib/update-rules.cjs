'use strict';

/**
 * Aggiornamenti automatici (Beta 0.23), senza Electron: versioni e lettura della release
 * di GitHub (https://api.github.com/repos/<owner>/<repo>/releases/latest).
 */

/** "v0.23.1" → [0,23,1]; null se non è una versione. */
function parseVersion(text){
  const match=/^v?(\d+)\.(\d+)(?:\.(\d+))?$/.exec(String(text||'').trim());
  return match?[Number(match[1]),Number(match[2]),Number(match[3]||0)]:null;
}
/** true se `candidate` è più nuova di `current`. */
function isNewer(candidate,current){
  const a=parseVersion(candidate),b=parseVersion(current);
  if(!a||!b)return false;
  for(let i=0;i<3;i++)if(a[i]!==b[i])return a[i]>b[i];
  return false;
}

/**
 * Release di GitHub → aggiornamento usabile, o null.
 * L'installer è l'asset "VARCO Setup X.exe" (GitHub mette i punti al posto degli spazi).
 * Bozze e versioni di prova (prerelease) non contano.
 */
function releaseInfo(release){
  if(!release||release.draft||release.prerelease)return null;
  const version=parseVersion(release.tag_name);
  if(!version)return null;
  const text=version.join('.');
  const asset=(release.assets||[]).find(a=>/^VARCO[ .\-_]Setup[ .\-_]v?\d+\.\d+(\.\d+)?\.exe$/i.test(a?.name||'')&&a.browser_download_url);
  if(!asset)return null;
  const digest=typeof asset.digest==='string'&&/^sha256:[0-9a-f]{64}$/i.test(asset.digest)?asset.digest.slice(7).toLowerCase():'';
  return {version:text,notes:String(release.body||'').slice(0,4000),name:String(release.name||'VARCO '+text),
    page:typeof release.html_url==='string'?release.html_url:'',
    asset:{name:asset.name,url:asset.browser_download_url,size:Number(asset.size)||0,sha256:digest}};
}

/** Solo indirizzi https di GitHub per scaricare (o locali, per le prove). */
function trustedDownload(url,{allowLocal=false}={}){
  try{
    const u=new URL(url);
    if(allowLocal&&u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname))return true;
    return u.protocol==='https:'&&(u.hostname==='github.com'||u.hostname.endsWith('.githubusercontent.com'));
  }catch{return false;}
}

module.exports={parseVersion,isNewer,releaseInfo,trustedDownload};
