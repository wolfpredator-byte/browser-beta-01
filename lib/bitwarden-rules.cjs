'use strict';

/**
 * Bitwarden in VARCO (Beta 0.46), senza Electron.
 *
 * Regola dell'utente: VARCO non memorizza mai la master password, i segreti di Bitwarden o i cookie
 * del Vault. Fa solo da interfaccia e da ambiente sicuro per l'estensione. Quindi:
 * - le pagine dell'estensione e del Vault web sono «pagine segrete»: niente cronologia, schede da
 *   riaprire, screenshot, lettura da JARVIS, anteprime;
 * - il Vault web non si apre dentro VARCO (lascerebbe i suoi cookie nel profilo): va nel browser di sistema.
 * Qui c'è anche il CSV per portare in Bitwarden le password salvate finora in VARCO.
 */
const EXTENSION_ID='nngceckbapebfimnlniiiahkandclblb';
const STORE_URL=`https://chromewebstore.google.com/detail/${EXTENSION_ID}`;
const WEB_VAULT='https://vault.bitwarden.com/';
const DOWNLOAD_URL='https://bitwarden.com/download/';
/** Vault web di Bitwarden (USA ed Europa). */
const VAULT_HOSTS=['vault.bitwarden.com','vault.bitwarden.eu'];

const hostOf=url=>{try{return new URL(url).hostname.toLowerCase();}catch{return '';}};
const isVaultUrl=url=>VAULT_HOSTS.includes(hostOf(url));
const isExtensionUrl=url=>{try{const u=new URL(url);return u.protocol==='chrome-extension:'&&u.hostname===EXTENSION_ID;}catch{return false;}};
/** Pagine che VARCO non deve ricordare, fotografare o far leggere. */
const isSecretUrl=url=>isVaultUrl(url)||isExtensionUrl(url);

/** Campo CSV: tra virgolette se serve, virgolette raddoppiate. */
const field=v=>{const s=String(v??'');return /[",\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;};
/**
 * CSV nel formato che Bitwarden importa («Bitwarden (csv)»):
 * folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp
 * entries: [{origin, username, password}] (password già in chiaro: il file va cancellato dopo l'importazione).
 */
function bitwardenCsv(entries,folder='VARCO'){
  const head='folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp';
  const rows=entries.filter(e=>e&&typeof e.password==='string'&&e.password).map(e=>{
    const name=hostOf(e.origin).replace(/^www\./,'')||e.origin;
    return [folder,'','login',name,'','','0',e.origin,e.username||'',e.password,''].map(field).join(',');
  });
  return [head,...rows].join('\r\n')+'\r\n';
}

module.exports={EXTENSION_ID,STORE_URL,WEB_VAULT,DOWNLOAD_URL,VAULT_HOSTS,isVaultUrl,isExtensionUrl,isSecretUrl,bitwardenCsv};
