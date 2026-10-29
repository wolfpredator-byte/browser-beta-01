'use strict';

/**
 * Regole dei tipi di file in Windows (Beta 0.21), senza Electron.
 *
 * VARCO compare in "Apri con" e nella pagina "App predefinite → VARCO" per i file che il
 * visualizzatore sa mostrare. Non diventa MAI il programma predefinito da solo (Windows
 * non lo permette più e sarebbe scorretto): si offre come scelta, la decisione è tua.
 *
 * Il testo è un file .reg importato con `reg import`, un solo processo invece di centinaia:
 *   HKCU\Software\Classes\VARCO.File                  tipo "File (VARCO)" con icona e comando
 *   HKCU\Software\Classes\Applications\VARCO.exe      nome e tipi supportati (elenco "Apri con")
 *   HKCU\Software\Classes\.ext\OpenWithProgids        VARCO nel sottomenu "Apri con" del tipo
 *   <Capabilities>\FileAssociations                   l'elenco in "App predefinite → VARCO"
 */
const {KINDS}=require('./viewer-rules.cjs');

const PROGID='VARCO.File';
// Mai associati: programmi e script eseguibili, e nomi che non sono estensioni.
const NEVER=new Set(['bat','cmd','ps1','psm1','sh','bash','exe','dockerfile','makefile','readme','license']);
const CLIENT_KEY='Software\\Clients\\StartMenuInternet\\VARCO';
const OWN_KEY='Software\\VARCO';

/** Estensioni con il punto, in minuscolo, senza doppioni. */
function extensions(){
  return [...new Set(Object.values(KINDS).flat())].filter(e=>/^[a-z0-9]+$/.test(e)&&!NEVER.has(e)).map(e=>'.'+e);
}

/** Stringa per un file .reg: barre rovesciate e virgolette con la barra davanti. */
const quote=value=>'"'+String(value).replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"';

/**
 * @param {string} exe percorso di VARCO.exe
 * @param {{browserRegistered:boolean, root?:string}} options
 *   browserRegistered: VARCO è già tra i browser (l'installer ha scritto CLIENT_KEY): i tipi
 *   di file vanno nelle stesse Capabilities; altrimenti ne creiamo di proprie.
 *   root: 'HKEY_CURRENT_USER\\Software' o, per le prove, un'altra chiave.
 */
function registerText(exe,{browserRegistered,root='HKEY_CURRENT_USER\\Software'}){
  const k=sub=>root+'\\'+sub;
  const command=quote(`"${exe}" "%1"`),icon=quote(`"${exe}",0`);
  const caps=(browserRegistered?CLIENT_KEY:OWN_KEY).replace(/^Software\\/,'')+'\\Capabilities';
  const out=['Windows Registry Editor Version 5.00',''];
  const block=(key,lines)=>out.push(`[${k(key)}]`,...lines,'');
  block(`Classes\\${PROGID}`,['@="File (VARCO)"','"FriendlyTypeName"="File (VARCO)"']);
  block(`Classes\\${PROGID}\\DefaultIcon`,['@='+icon]);
  block(`Classes\\${PROGID}\\shell\\open\\command`,['@='+command]);
  block('Classes\\Applications\\VARCO.exe',['"FriendlyAppName"="VARCO"']);
  block('Classes\\Applications\\VARCO.exe\\DefaultIcon',['@='+icon]);
  block('Classes\\Applications\\VARCO.exe\\shell\\open\\command',['@='+command]);
  block('Classes\\Applications\\VARCO.exe\\SupportedTypes',extensions().map(e=>`"${e}"=""`));
  for(const e of extensions())block(`Classes\\${e}\\OpenWithProgids`,[`"${PROGID}"=hex(0):`]);
  if(!browserRegistered){
    block(caps,['"ApplicationName"="VARCO"','"ApplicationDescription"="VARCO — visualizzatore di file e browser"','"ApplicationIcon"='+icon]);
    block('RegisteredApplications',[`"VARCO"=${quote(OWN_KEY+'\\Capabilities')}`]);
  }
  block(caps+'\\FileAssociations',extensions().map(e=>`"${e}"="${PROGID}"`));
  return out.join('\r\n');
}

/** Il contrario, per la disinstallazione: toglie solo ciò che VARCO ha scritto. */
function unregisterText({root='HKEY_CURRENT_USER\\Software'}={}){
  const k=sub=>root+'\\'+sub;
  const out=['Windows Registry Editor Version 5.00',''];
  out.push(`[-${k('Classes\\'+PROGID)}]`,'',`[-${k('Classes\\Applications\\VARCO.exe')}]`,'',`[-${k(OWN_KEY)}]`,'');
  for(const e of extensions())out.push(`[${k('Classes\\'+e+'\\OpenWithProgids')}]`,`"${PROGID}"=-`,'');
  return out.join('\r\n');
}

module.exports={PROGID,CLIENT_KEY,extensions,registerText,unregisterText};
