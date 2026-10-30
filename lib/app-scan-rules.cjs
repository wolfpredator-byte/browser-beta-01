'use strict';

/**
 * Ricerca di giochi e programmi (Beta 0.23), senza Electron: lettura dei file di Steam
 * ed Epic e scelta dell'eseguibile "principale" di una cartella. Verificabile con node --test.
 */

/** Eseguibili che non sono il programma: installer, disinstallatori, aggiornamenti, anti-cheat, crash reporter… */
const NOT_MAIN=/(^|[^a-z])(unins\w*|uninstall\w*|setup|install\w*|update\w*|updater|patch\w*|crash\w*|report\w*|bugsplat|redist|vc_?redist\w*|vcredist\w*|dxsetup|directx\w*|dotnet\w*|ue\d?prereq\w*|prereq\w*|easyanticheat\w*|eac\w*|battleye\w*|be(service|launcher)\w*|cefprocess|cef\w*|helper\w*|crs-\w*|notification\w*|elevate|7za?|config\w*|settings|benchmark\w*|server|dedicated\w*|editor|sdk|tool\w*|unitycrashhandler\w*|wmplayer)([^a-z]|$)/i;
/** Cartelle da non esplorare dentro un programma. */
const SKIP_DIRS=/^(redist|_commonredist|redistributables?|directx|dotnet|vcredist|prereq\w*|support|__installer|installer|_installer|easyanticheat|battleye|crashreport\w*|logs?|cache|temp|tmp|docs?|manual|licenses?|engine|plugins?|node_modules|\.git)$/i;
/** Voci di Steam che non sono giochi. */
const STEAM_NOT_GAMES=/^(steamworks common redistributables|steam linux runtime.*|proton.*|steamvr.*|spacewar|wallpaper engine.*sdk)$/i;

const normal=text=>String(text||'').toLowerCase().replace(/[^a-z0-9]/g,'');

/**
 * Sceglie l'eseguibile principale tra quelli di una cartella.
 * @param {string} folderName - Nome della cartella (di solito il nome del programma).
 * @param {{rel:string,size:number}[]} files - Percorsi relativi (con / o \) e dimensioni.
 * @returns {string|null} Il percorso relativo scelto.
 */
function pickMainExe(folderName,files){
  const target=normal(folderName);
  let best=null,bestScore=-Infinity;
  for(const file of files){
    const parts=file.rel.split(/[\\/]/);
    const base=parts[parts.length-1];
    if(!/\.exe$/i.test(base))continue;
    const stem=base.replace(/\.exe$/i,'');
    if(NOT_MAIN.test(stem))continue;
    const name=normal(stem);
    let score=Math.log10(Math.max(file.size,1))*4-(parts.length-1)*6;
    if(target&&name===target)score+=60;
    else if(target&&name&&(target.includes(name)||name.includes(target)))score+=30;
    if(/launcher/i.test(stem))score-=8; // meglio il gioco vero, se c'è
    // Unreal: l'exe in cima è solo un avvio, il processo del gioco è Binaries/Win64/<Gioco>-Win64-Shipping.exe.
    if(/-shipping$/i.test(stem))score+=80;
    if(score>bestScore){bestScore=score;best=file.rel;}
  }
  return best;
}

/**
 * Formato KeyValues di Steam (libraryfolders.vdf, appmanifest_*.acf) → oggetto.
 * Solo stringhe e blocchi annidati, come nei file di Steam.
 */
function parseVdf(text){
  const root={},stack=[root];
  let pendingKey=null;
  const tokens=String(text).match(/"(?:[^"\\]|\\.)*"|[{}]/g)||[];
  for(const token of tokens){
    const top=stack[stack.length-1];
    if(token==='{'){const child={};if(pendingKey!==null)top[pendingKey]=child;stack.push(child);pendingKey=null;}
    else if(token==='}'){if(stack.length>1)stack.pop();pendingKey=null;}
    else{
      const value=token.slice(1,-1).replace(/\\\\/g,'\\').replace(/\\"/g,'"');
      if(pendingKey===null)pendingKey=value;else{top[pendingKey]=value;pendingKey=null;}
    }
  }
  return root;
}

/** Cartelle delle librerie Steam da libraryfolders.vdf (vecchio e nuovo formato). */
function steamLibraries(vdfText){
  const data=parseVdf(vdfText);
  const folders=data.libraryfolders||data.LibraryFolders||{};
  const out=[];
  for(const [key,value] of Object.entries(folders)){
    if(!/^\d+$/.test(key))continue;
    const dir=typeof value==='string'?value:value?.path;
    if(dir&&!out.includes(dir))out.push(dir);
  }
  return out;
}

/** Un appmanifest_*.acf → {name, installdir} (null per strumenti e runtime). */
function steamApp(acfText){
  const state=parseVdf(acfText).AppState;
  if(!state?.name||!state.installdir||STEAM_NOT_GAMES.test(state.name))return null;
  return {name:state.name,installdir:state.installdir};
}

/** Un manifest .item di Epic Games → {name, folder, exe} (null se incompleto o non un gioco). */
function epicApp(itemText){
  let item;
  try{item=JSON.parse(itemText);}catch{return null;}
  if(!item?.DisplayName||!item.InstallLocation||!item.LaunchExecutable)return null;
  if(Array.isArray(item.AppCategories)&&item.AppCategories.length&&!item.AppCategories.includes('games'))return null;
  return {name:item.DisplayName,folder:item.InstallLocation,exe:item.LaunchExecutable};
}

/** Collegamento del menu Start da tenere: porta a un .exe e non è un disinstallatore o un sito. */
function usefulShortcut(name,target){
  if(!/\.exe$/i.test(target||''))return false;
  if(/^[a-z]:\\windows\\/i.test(target))return false; // strumenti di Windows (cmd, Pulizia disco…)
  if(/(uninstall|disinstalla|readme|leggimi|help|guida|documentation|website|sito web|release notes|license|updater|error report|crash report|recovery)/i.test(name))return false;
  return !NOT_MAIN.test(target.split(/[\\/]/).pop().replace(/\.exe$/i,''))||/launcher/i.test(name);
}

/** Elenco finale: niente doppioni (stesso eseguibile), in ordine alfabetico. */
function mergeResults(lists){
  const seen=new Set(),out=[];
  for(const item of lists.flat()){
    const key=item.path.toLowerCase();
    if(seen.has(key))continue;
    seen.add(key);out.push(item);
  }
  return out.sort((a,b)=>a.name.localeCompare(b.name,'it',{sensitivity:'base'}));
}

/** Cartelle scelte da te: percorsi assoluti, senza doppioni, al massimo 20. */
function normalizeFolders(raw){
  const out=[];
  for(const dir of Array.isArray(raw)?raw:[]){
    if(typeof dir!=='string'||!/^[a-z]:[\\/]|^\\\\/i.test(dir))continue;
    if(out.some(x=>x.toLowerCase()===dir.toLowerCase()))continue;
    out.push(dir);
    if(out.length>=20)break;
  }
  return out;
}

module.exports={SKIP_DIRS,pickMainExe,parseVdf,steamLibraries,steamApp,epicApp,usefulShortcut,mergeResults,normalizeFolders};
