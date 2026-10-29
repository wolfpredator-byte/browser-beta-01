'use strict';

/**
 * Regole del visualizzatore di file (Beta 0.20), senza Electron.
 *
 * Indirizzi (tutti sotto la stessa origine varco-view://app, così la pagina del
 * visualizzatore può leggere i file con fetch senza problemi di CORS):
 *   varco-view://app/viewer.html?p=<percorso>   la pagina che mostra il file
 *   varco-view://app/fs/C%3A/Users/…/file.ext    i byte del file (percorso a cartelle,
 *       così i riferimenti relativi di Markdown, GLTF e FBX si risolvono da soli)
 *   varco-view://app/info?p=<percorso>           nome, dimensione, data, tipo
 */
const path=require('node:path');

const SCHEME='varco-view';
const ORIGIN=SCHEME+'://app';

/** Tipo di visualizzazione per estensione. */
const KINDS={
  markdown:['md','markdown','mdx'],
  csv:['csv','tsv'],
  json:['json','jsonc','geojson','webmanifest'],
  image:['png','jpg','jpeg','gif','webp','bmp','ico','avif','apng','svg'],
  video:['mp4','webm','mov','m4v','mkv','ogv'],
  audio:['mp3','wav','ogg','oga','flac','m4a','aac','opus'],
  pdf:['pdf'],
  docx:['docx'],
  sheet:['xlsx','xlsm','xls','ods'],
  pptx:['pptx'],
  model:['glb','gltf','obj','fbx'],
  zip:['zip','jar','apk','nupkg','vsix','unitypackage_zip'],
  font:['ttf','otf','woff','woff2'],
  code:['js','mjs','cjs','jsx','ts','tsx','py','pyw','cs','csproj','sln','java','kt','kts','c','h','cpp','cc','hpp','rs','go','rb','php',
    'lua','swift','dart','scala','sql','sh','bash','ps1','psm1','bat','cmd','html','htm','xml','xaml','css','scss','sass','less',
    'vue','svelte','yaml','yml','toml','ini','cfg','conf','env','gradle','shader','hlsl','glsl','compute','uss','uxml','asmdef',
    'gd','r','m','pl','vb','fs','dockerfile','makefile','cmake','graphql','gql','proto','prisma'],
  text:['txt','log','text','rtf_txt','gitignore','gitattributes','editorconfig','license','readme','lock','srt','vtt','nfo','diff','patch']
};
const EXT_KIND=new Map(Object.entries(KINDS).flatMap(([kind,exts])=>exts.map(ext=>[ext,kind])));

/** Estensione (minuscola, senza punto); per "Dockerfile", ".gitignore" ecc. il nome stesso. */
function extOf(file){
  const base=path.basename(String(file||'')).toLowerCase();
  const ext=path.extname(base).slice(1);
  return ext||base.replace(/^\./,'');
}
const kindOf=file=>EXT_KIND.get(extOf(file))||'binary';

const MIME={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',bmp:'image/bmp',ico:'image/x-icon',
  avif:'image/avif',apng:'image/apng',svg:'image/svg+xml',mp4:'video/mp4',m4v:'video/mp4',webm:'video/webm',mov:'video/quicktime',
  mkv:'video/x-matroska',ogv:'video/ogg',mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',oga:'audio/ogg',flac:'audio/flac',
  m4a:'audio/mp4',aac:'audio/aac',opus:'audio/opus',pdf:'application/pdf',json:'application/json',
  ttf:'font/ttf',otf:'font/otf',woff:'font/woff',woff2:'font/woff2',glb:'model/gltf-binary',gltf:'model/gltf+json',
  html:'text/plain',htm:'text/plain',svgz:'image/svg+xml'};
/**
 * Content-Type con cui servire un file. Le pagine HTML locali si servono come testo:
 * il visualizzatore le mostra come codice, non le esegue.
 */
const contentTypeOf=file=>MIME[extOf(file)]||(['code','text','markdown','csv'].includes(kindOf(file))?'text/plain; charset=utf-8':'application/octet-stream');

/** Testo scritto nella barra: è un percorso del PC? (C:\…, \\server\…, file:///…) */
function isLocalPath(raw){
  const s=String(raw||'').trim().replace(/^"|"$/g,'');
  return /^[a-zA-Z]:[\\/]/.test(s)||/^\\\\[^\\]+\\[^\\]+/.test(s)||/^file:\/\//i.test(s);
}
function normalizeLocalPath(raw){
  let s=String(raw||'').trim().replace(/^"|"$/g,'');
  if(/^file:\/\//i.test(s)){
    try{s=decodeURIComponent(new URL(s).pathname).replace(/^\/([a-zA-Z]:)/,'$1');}catch{return null;}
  }
  return path.win32.normalize(s.replace(/\//g,'\\'));
}

/** Indirizzi: pagina del visualizzatore e byte del file. */
const viewerUrl=file=>`${ORIGIN}/viewer.html?p=${encodeURIComponent(file)}`;
function fileUrl(file){
  const parts=path.win32.normalize(file).split('\\').filter(Boolean).map(encodeURIComponent);
  return `${ORIGIN}/fs/${parts.join('/')}`;
}
/** Percorso Windows da un indirizzo /fs/… (null se non è uno di quelli). */
function pathFromFileUrl(url){
  try{
    const u=new URL(url);
    if(u.protocol!==SCHEME+':'||u.host!=='app'||!u.pathname.startsWith('/fs/'))return null;
    const parts=u.pathname.slice(4).split('/').filter(Boolean).map(decodeURIComponent);
    if(!parts.length||parts.some(p=>p==='..'||p.includes('\\')))return null;
    return path.win32.normalize(parts.join('\\')+(parts.length===1?'\\':''));
  }catch{return null;}
}
function pathFromViewerUrl(url){
  try{const u=new URL(url);return u.protocol===SCHEME+':'&&u.host==='app'&&u.pathname==='/viewer.html'?u.searchParams.get('p'):null;}
  catch{return null;}
}
const isViewerUrl=url=>!!pathFromViewerUrl(url);

/**
 * Intestazione Range ("bytes=100-199", "bytes=100-", "bytes=-500"): serve per scorrere video e audio.
 * @returns {{start:number,end:number}|null|'invalid'} null = file intero.
 */
function parseRange(header,size){
  if(!header)return null;
  const m=/^bytes=(\d*)-(\d*)$/.exec(String(header).trim());
  if(!m||(m[1]===''&&m[2]===''))return 'invalid';
  let start,end;
  if(m[1]===''){const n=Number(m[2]);start=Math.max(0,size-n);end=size-1;}
  else{start=Number(m[1]);end=m[2]===''?size-1:Math.min(Number(m[2]),size-1);}
  if(start>end||start>=size)return 'invalid';
  return {start,end};
}

/** true se `file` sta dentro la cartella `root` (stessa unità, senza uscire con ..). */
function isInside(file,root){
  const rel=path.win32.relative(path.win32.normalize(root),path.win32.normalize(file));
  return rel===''||(!!rel&&!rel.startsWith('..')&&!path.win32.isAbsolute(rel));
}

module.exports={SCHEME,ORIGIN,KINDS,extOf,kindOf,contentTypeOf,isLocalPath,normalizeLocalPath,
  viewerUrl,fileUrl,pathFromFileUrl,pathFromViewerUrl,isViewerUrl,parseRange,isInside};
