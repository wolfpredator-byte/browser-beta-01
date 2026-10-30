'use strict';

/**
 * Ricerca di giochi e programmi installati (Beta 0.23): così non serve sapere in quale
 * cartella sta un .exe. Fonti:
 *   - giochi: librerie di Steam, giochi di Epic Games, le cartelle che scegli tu;
 *   - programmi: collegamenti del menu Start, le cartelle che scegli tu.
 * Nelle tue cartelle ogni sottocartella è un programma: ne scegliamo l'eseguibile principale
 * (regole in app-scan-rules.cjs). Il risultato resta in memoria per 2 minuti.
 */
const fs=require('node:fs');
const path=require('node:path');
const {execFile}=require('node:child_process');
const {shell}=require('electron');
const {state}=require('./state.cjs');
const rules=require('./app-scan-rules.cjs');

const CACHE_MS=2*60*1000;
const MAX_FILES=6000;   // file guardati per cartella di programma
const MAX_DEPTH=3;
const cache=new Map();  // kind → {at, items}

const readText=file=>fs.promises.readFile(file,'utf8').catch(()=>'');
const isFile=file=>fs.promises.stat(file).then(s=>s.isFile()).catch(()=>false);
const dirsIn=dir=>fs.promises.readdir(dir,{withFileTypes:true}).then(list=>list.filter(d=>d.isDirectory()).map(d=>d.name)).catch(()=>[]);

/** .exe dentro una cartella (fino a MAX_DEPTH livelli), con la loro dimensione. */
async function exesIn(root){
  const files=[];let seen=0;
  async function walk(dir,depth){
    let entries;
    try{entries=await fs.promises.readdir(dir,{withFileTypes:true});}catch{return;}
    for(const entry of entries){
      if(++seen>MAX_FILES)return;
      const full=path.join(dir,entry.name);
      if(entry.isDirectory()){if(depth<MAX_DEPTH&&!rules.SKIP_DIRS.test(entry.name))await walk(full,depth+1);}
      else if(/\.exe$/i.test(entry.name)){
        const size=await fs.promises.stat(full).then(s=>s.size).catch(()=>0);
        files.push({rel:path.relative(root,full),size});
      }
    }
  }
  await walk(root,0);
  return files;
}
/** L'eseguibile principale di una cartella di programma, o null. */
async function mainExe(folder,name){
  const rel=rules.pickMainExe(name||path.basename(folder),await exesIn(folder));
  return rel?path.join(folder,rel):null;
}

// ── Steam ────────────────────────────────────────────────────────────────
function steamPath(){
  return new Promise(resolve=>execFile('reg',['query','HKCU\\Software\\Valve\\Steam','/v','SteamPath'],{windowsHide:true},(error,out)=>{
    const match=!error&&/SteamPath\s+REG_SZ\s+(.+)/.exec(String(out));
    resolve(match?match[1].trim().replace(/\//g,'\\'):'');
  }));
}
async function steamGames(){
  const root=await steamPath();
  if(!root)return [];
  const libraries=rules.steamLibraries(await readText(path.join(root,'steamapps','libraryfolders.vdf')));
  if(!libraries.some(l=>l.toLowerCase()===root.toLowerCase()))libraries.unshift(root);
  const out=[];
  for(const library of libraries){
    const apps=path.join(library,'steamapps');
    const manifests=await fs.promises.readdir(apps).catch(()=>[]);
    for(const file of manifests.filter(f=>/^appmanifest_\d+\.acf$/i.test(f))){
      const app=rules.steamApp(await readText(path.join(apps,file)));
      if(!app)continue;
      const exe=await mainExe(path.join(apps,'common',app.installdir),app.name);
      if(exe)out.push({name:app.name,path:exe,source:'Steam'});
    }
  }
  return out;
}

// ── Epic Games ───────────────────────────────────────────────────────────
async function epicGames(){
  const dir=path.join(process.env.ProgramData||'C:\\ProgramData','Epic','EpicGamesLauncher','Data','Manifests');
  const files=await fs.promises.readdir(dir).catch(()=>[]);
  const out=[];
  for(const file of files.filter(f=>/\.item$/i.test(f))){
    const app=rules.epicApp(await readText(path.join(dir,file)));
    if(!app)continue;
    const exe=path.join(app.folder,app.exe);
    if(await isFile(exe))out.push({name:app.name,path:exe,source:'Epic Games'});
  }
  return out;
}

// ── Menu Start ───────────────────────────────────────────────────────────
async function startMenuApps(){
  const roots=[path.join(process.env.APPDATA||'','Microsoft','Windows','Start Menu','Programs'),
    path.join(process.env.ProgramData||'C:\\ProgramData','Microsoft','Windows','Start Menu','Programs')];
  const out=[];
  async function walk(dir,depth){
    let entries;
    try{entries=await fs.promises.readdir(dir,{withFileTypes:true});}catch{return;}
    for(const entry of entries){
      const full=path.join(dir,entry.name);
      if(entry.isDirectory()){if(depth<3)await walk(full,depth+1);continue;}
      if(!/\.lnk$/i.test(entry.name))continue;
      let target='';
      try{target=shell.readShortcutLink(full).target;}catch{continue;}
      const name=entry.name.replace(/\.lnk$/i,'');
      if(rules.usefulShortcut(name,target)&&await isFile(target))out.push({name,path:target,source:'Menu Start'});
    }
  }
  for(const root of roots)await walk(root,0);
  return out;
}

// ── Cartelle scelte da te ────────────────────────────────────────────────
async function folderApps(){
  const out=[];
  for(const folder of state.data.settings.scanFolders||[]){
    const label=path.basename(folder)||folder;
    // .exe direttamente nella cartella (per esempio C:\Giochi\tetris.exe)…
    for(const entry of await fs.promises.readdir(folder,{withFileTypes:true}).catch(()=>[])){
      if(entry.isFile()&&rules.pickMainExe('',[{rel:entry.name,size:1}])) // niente installer e simili
        out.push({name:entry.name.replace(/\.exe$/i,''),path:path.join(folder,entry.name),source:label});
    }
    // …e un programma per ogni sottocartella.
    for(const name of await dirsIn(folder)){
      if(rules.SKIP_DIRS.test(name))continue;
      const exe=await mainExe(path.join(folder,name),name);
      if(exe)out.push({name,path:exe,source:label});
    }
  }
  return out;
}

/**
 * @param {'games'|'apps'} kind
 * @returns {Promise<{name:string,path:string,source:string}[]>}
 */
async function scan(kind,{refresh=false}={}){
  const cached=cache.get(kind);
  if(!refresh&&cached&&Date.now()-cached.at<CACHE_MS)return cached.items;
  const sources=kind==='games'?[steamGames(),epicGames(),folderApps()]:[startMenuApps(),folderApps()];
  const items=rules.mergeResults(await Promise.all(sources.map(p=>p.catch(()=>[]))));
  cache.set(kind,{at:Date.now(),items});
  return items;
}
const forget=()=>cache.clear();

module.exports={scan,forget};
