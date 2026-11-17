'use strict';

/**
 * Beta 0.43.1 — tipi di progetto (senza Electron, per i test).
 *
 * Ogni workspace con una cartella ha un tipo: cambia azioni rapide, pannelli consigliati e file importanti.
 * Il tipo lo propone VARCO guardando la cartella (Unity → game dev, .blend → 3D, .als → musica…) e lo scegli tu:
 * la scelta sta in .varco/project.json dentro la cartella del progetto, così viaggia con lui (e con git).
 *
 * Azioni (kind):
 *   engine        apre il motore del gioco (Unity con la versione giusta, Unreal, Godot)
 *   open-recent   apre il file più recente con queste estensioni (es. l'ultimo .blend)
 *   open-folder   apre la prima cartella con uno di questi nomi (es. Renders, Export)
 *   open-url      apre un sito in una scheda
 *   app           avvia un programma installato (per nome, dal menu Start)
 *   repo          apre il repository remoto (da .git/config)
 *   logs          log ed errori (Editor.log di Unity, Saved/Logs di Unreal, o la cartella logs)
 *   command       un comando del progetto (es. «build»), se c'è in progetto.browser.json
 *   preview       anteprima del dev server (progetti web)
 */
const IMG=['png','jpg','jpeg','tga','tif','tiff','exr','hdr','psd','webp'];
const TYPES={
  web:{label:'Web e app',icon:'code',hint:'Sito, app o programma: dev server, anteprima, build, repository.',
    actions:[{id:'preview',label:'Apri anteprima',kind:'preview'},{id:'editor',label:'Apri l’editor',kind:'app',apps:['Visual Studio Code','Cursor','WebStorm']},
      {id:'build',label:'Build',kind:'command',command:/\bbuild\b/i},{id:'repo',label:'Apri repo',kind:'repo'}],
    panels:[['GitHub','https://github.com/'],['MDN','https://developer.mozilla.org/it/'],['Stack Overflow','https://stackoverflow.com/'],['Vercel','https://vercel.com/dashboard']],
    files:[['Pagine e componenti',['tsx','jsx','vue','svelte','astro','html']],['Codice',['ts','js','mjs','py','php','rb','go']],['Stili',['css','scss','sass','less']],['Configurazione',['json','yml','yaml','toml','env']]]},
  gamedev:{label:'Game dev',icon:'game',hint:'Unity, Unreal o Godot: motore, build, log ed errori.',
    actions:[{id:'engine',label:'Avvia il motore',kind:'engine'},{id:'repo',label:'Apri repo',kind:'repo'},
      {id:'build',label:'Build',kind:'open-folder',folders:['Builds','Build','Packaged','export']},{id:'logs',label:'Log ed errori',kind:'logs'}],
    panels:[['Unity Docs','https://docs.unity3d.com/Manual/'],['GitHub','https://github.com/'],['Discord','https://discord.com/app'],['YouTube','https://www.youtube.com/']],
    files:[['Scene',['unity','umap','tscn','scn']],['Script',['cs','cpp','h','hpp','gd','shader','hlsl']],['Asset',['prefab','mat','fbx','blend','uasset','asset','anim','controller']]]},
  '3d':{label:'3D',icon:'cube',hint:'Blender e simili: file .blend, texture, render, reference.',
    actions:[{id:'blender',label:'Apri Blender',kind:'open-recent',ext:['blend'],apps:['Blender']},{id:'assets',label:'Cartella asset',kind:'open-folder',folders:['assets','asset','textures','tex']},
      {id:'render',label:'Render',kind:'open-folder',folders:['render','renders','output','out']},{id:'reference',label:'Reference',kind:'open-folder',folders:['reference','references','ref','refs'],url:'https://www.pinterest.com/'}],
    panels:[['ArtStation','https://www.artstation.com/'],['Pinterest','https://www.pinterest.com/'],['YouTube','https://www.youtube.com/'],['Poly Haven','https://polyhaven.com/']],
    files:[['File .blend',['blend','ma','mb','max','c4d','fbx','obj','glb','gltf']],['Texture',IMG],['Render',['png','jpg','exr','mp4'],['render','renders','output']]]},
  video:{label:'Video',icon:'film',hint:'Montaggio: progetto, footage, export, musica.',
    actions:[{id:'project',label:'Apri progetto',kind:'open-recent',ext:['prproj','drp','kdenlive','veg','aep','mlt','fcpxml','wlmp','camproj']},{id:'footage',label:'Footage',kind:'open-folder',folders:['footage','raw','clips','girato','media']},
      {id:'export',label:'Export',kind:'open-folder',folders:['export','exports','render','output']},{id:'music',label:'Musica',kind:'open-folder',folders:['music','musica','audio','sfx']}],
    panels:[['YouTube Studio','https://studio.youtube.com/'],['Pexels Video','https://www.pexels.com/videos/'],['Google Drive','https://drive.google.com/']],
    files:[['Timeline',['prproj','drp','kdenlive','veg','aep','mlt','fcpxml']],['Export',['mp4','mov','mkv','webm'],['export','exports','render','output']],['Audio',['wav','mp3','aac','flac','m4a']]]},
  music:{label:'Musica',icon:'music',hint:'DAW, sample, testi, mix ed export.',
    actions:[{id:'daw',label:'Apri la DAW',kind:'open-recent',ext:['flp','als','rpp','ptx','cpr','logicx','song','bwproject','aup3']},{id:'samples',label:'Sample',kind:'open-folder',folders:['samples','sample','loops','kits']},
      {id:'lyrics',label:'Testi',kind:'open-recent',ext:['txt','md','docx'],match:/lyric|testi|testo/i},{id:'mix',label:'Mix',kind:'open-folder',folders:['mix','mixes','master','mastering','export','bounce','bounces']}],
    panels:[['Spotify','https://open.spotify.com/'],['SoundCloud','https://soundcloud.com/'],['YouTube','https://www.youtube.com/'],['Suno','https://suno.com/']],
    files:[['MIDI',['mid','midi']],['Stems',['wav','aif','aiff'],['stems','stem','tracks']],['Export',['mp3','wav','flac','m4a'],['export','mix','master','mastering','bounce','bounces']]]},
  study:{label:'Studio',icon:'book',hint:'PDF, appunti, bibliografia, tesi.',
    actions:[{id:'pdf',label:'Apri PDF',kind:'open-recent',ext:['pdf']},{id:'notes',label:'Appunti',kind:'open-folder',folders:['appunti','note','notes','lezioni']},
      {id:'bib',label:'Bibliografia',kind:'open-recent',ext:['bib','ris','enl'],apps:['Zotero']},{id:'thesis',label:'Tesi',kind:'open-recent',ext:['docx','tex','odt'],match:/tesi|thesis|elaborato/i}],
    panels:[['Google Scholar','https://scholar.google.com/'],['Google Drive','https://drive.google.com/'],['Notion','https://www.notion.so/']],
    files:[['PDF',['pdf']],['Note',['md','txt','docx','odt','one']],['Tesi',['tex','docx','bib']]]},
  gaming:{label:'Gaming',icon:'trophy',hint:'Un gioco: wiki, build, Discord, stream.',
    actions:[{id:'wiki',label:'Apri wiki',kind:'open-url',url:'https://www.fandom.com/'},{id:'build',label:'Build',kind:'open-url',url:''},
      {id:'discord',label:'Discord',kind:'app',apps:['Discord'],url:'https://discord.com/app'},{id:'stream',label:'Stream',kind:'app',apps:['OBS Studio','Streamlabs']}],
    panels:[['Twitch','https://www.twitch.tv/'],['YouTube','https://www.youtube.com/'],['Discord','https://discord.com/app']],
    files:[['Guide',['pdf','md','txt','html'],null,/guid|build|loadout|raid/i],['Note',['md','txt']]]},
};
const TYPE_IDS=Object.keys(TYPES);
const SKIP_DIRS=/^(node_modules|\.git|\.varco|Library|Temp|Logs|obj|bin|\.vs|\.idea|__pycache__|venv|\.venv|dist|\.next|\.nuxt|Intermediate|DerivedDataCache|Saved|\.godot|\.import|Binaries)$/i;

const extOf=rel=>{const m=/\.([a-z0-9]+)$/i.exec(rel);return m?m[1].toLowerCase():'';};
const top=rel=>rel.split(/[\\/]/)[0];

/**
 * Tipo proposto per una cartella.
 * @param {{rel:string,dir?:boolean}[]} entries - percorsi relativi (con "/"), già senza le cartelle pesanti
 * @param {{game?:boolean}} hints - il workspace è collegato a un gioco del pannello Giochi
 * @returns {{type:string|null, engine:string|null, reason:string}}
 */
function detect(entries,hints={}){
  const has=re=>entries.some(e=>re.test(e.rel));
  const count=exts=>entries.filter(e=>!e.dir&&exts.includes(extOf(e.rel))).length;
  if(has(/^Assets(\/|$)/)&&has(/^ProjectSettings(\/|$)/))return {type:'gamedev',engine:'unity',root:'',reason:'Cartelle Assets e ProjectSettings: progetto Unity.'};
  // Progetto Unity in una sottocartella (es. MioGioco/MioGioco-Unity/Assets).
  const nested=entries.find(e=>e.dir&&/^[^/]+\/ProjectSettings$/.test(e.rel)&&entries.some(x=>x.dir&&x.rel===e.rel.split('/')[0]+'/Assets'));
  if(nested){const root=nested.rel.split('/')[0];return {type:'gamedev',engine:'unity',root,reason:`Progetto Unity nella cartella «${root}».`};}
  if(has(/\.uproject$/i))return {type:'gamedev',engine:'unreal',reason:'File .uproject: progetto Unreal.'};
  if(has(/(^|\/)project\.godot$/i))return {type:'gamedev',engine:'godot',reason:'File project.godot: progetto Godot.'};
  // Codice: in cima alla cartella o una cartella più in giù (progetti dentro una sottocartella).
  const CODE=/^(package\.json|manage\.py|requirements\.txt|pyproject\.toml|composer\.json|Gemfile|Cargo\.toml|go\.mod|CMakeLists\.txt|build\.gradle(\.kts)?|settings\.gradle(\.kts)?|pom\.xml|[^/]+\.sln|[^/]+\.csproj)$/i;
  const codeHere=entries.some(e=>!e.dir&&CODE.test(e.rel)),codeBelow=entries.some(e=>!e.dir&&e.rel.split('/').length===2&&CODE.test(e.rel.split('/')[1]));
  const score={
    web:(codeHere?60:codeBelow?45:0)+(has(/^(vite|next|nuxt|astro|svelte|webpack)\.config\./i)?40:0)+(has(/^index\.html$/i)?30:0),
    '3d':count(['blend','ma','mb','max','c4d'])*30+Math.min(30,count(['fbx','obj','glb','gltf'])*5)+Math.min(40,count(['hdr'])*20),
    video:count(TYPES.video.actions[0].ext)*45+Math.min(40,count(['mp4','mov','mkv'])*3),
    music:count(TYPES.music.actions[0].ext)*45+Math.min(40,count(['wav','mid','midi','aif'])*2),
    study:Math.min(60,count(['pdf'])*6)+(count(['bib'])?40:0)+(count(['tex'])?30:0)+Math.min(30,count(['docx','odt'])*4),
    gaming:hints.game?70:0,
  };
  const [type,best]=Object.entries(score).sort((a,b)=>b[1]-a[1])[0];
  if(best<30)return {type:null,engine:null,reason:'Non riconosciuto: scegli tu il tipo.'};
  const why={web:codeHere?'File di un progetto di codice (package.json, Gradle, .sln…).':'Un progetto di codice in una sottocartella.','3d':'File 3D (.blend, .fbx, HDRI…).',video:'Progetti di montaggio e video.',music:'Progetti di una DAW e audio.',study:'PDF, bibliografia o documenti.',gaming:'Il workspace è collegato a un gioco.'}[type];
  return {type,engine:null,reason:why};
}

/** File importanti del tipo, a gruppi, i più recenti prima. */
function importantFiles(type,files,limit=6){
  const t=TYPES[type];if(!t)return [];
  return t.files.map(([label,exts,folders,match])=>{
    const list=files.filter(f=>!f.dir&&exts.includes(extOf(f.rel))&&(!folders||f.rel.split('/').slice(0,-1).some(d=>folders.includes(d.toLowerCase())))&&(!match||match.test(f.rel)))
      .sort((a,b)=>b.mtime-a.mtime);
    return {label,count:list.length,files:list.slice(0,limit).map(f=>({rel:f.rel,mtime:f.mtime}))};
  }).filter(g=>g.count);
}
/** File toccati di recente (qualsiasi tipo), esclusi file di sistema e temporanei. */
function recentFiles(files,limit=8){
  return files.filter(f=>!f.dir&&!/(^|\/)(\.|~\$)|\.(tmp|lock|log|meta|bak)$/i.test(f.rel)).sort((a,b)=>b.mtime-a.mtime).slice(0,limit).map(f=>({rel:f.rel,mtime:f.mtime}));
}
/** Il file più recente per un'azione open-recent. */
function newestFor(action,files){
  return files.filter(f=>!f.dir&&action.ext.includes(extOf(f.rel))&&(!action.match||action.match.test(f.rel))).sort((a,b)=>b.mtime-a.mtime)[0]||null;
}
/** La cartella per un'azione open-folder (nome qualsiasi tra quelli dati, al massimo 2 livelli). */
function folderFor(action,entries){
  const want=action.folders.map(x=>x.toLowerCase());
  return entries.filter(e=>e.dir&&want.includes(e.rel.split('/').pop().toLowerCase())&&e.rel.split('/').length<=2)
    .sort((a,b)=>a.rel.split('/').length-b.rel.split('/').length||want.indexOf(a.rel.split('/').pop().toLowerCase())-want.indexOf(b.rel.split('/').pop().toLowerCase()))[0]||null;
}
/** Versione dell'editor Unity da ProjectSettings/ProjectVersion.txt. */
const unityVersion=text=>(/m_EditorVersion:\s*([\w.]+)/.exec(String(text||''))||[])[1]||null;
/** Indirizzo web del repository da .git/config (git@github.com:a/b.git → https://github.com/a/b). */
function repoUrl(gitConfig){
  const m=/\[remote "origin"\][^[]*?url\s*=\s*(\S+)/.exec(String(gitConfig||''));
  if(!m)return null;
  let u=m[1].trim().replace(/\.git$/,'');
  const ssh=/^git@([^:]+):(.+)$/.exec(u);
  if(ssh)u=`https://${ssh[1]}/${ssh[2]}`;
  u=u.replace(/^ssh:\/\/git@/,'https://').replace(/^https?:\/\/[^@/]+@/,'https://');
  return /^https:\/\//.test(u)?u:null;
}
/** Tipo valido salvato in .varco/project.json. */
const normalizeKind=raw=>TYPE_IDS.includes(raw?.tipo)?raw.tipo:null;

module.exports={TYPES,TYPE_IDS,SKIP_DIRS,detect,importantFiles,recentFiles,newestFor,folderFor,unityVersion,repoUrl,normalizeKind,extOf,top};
