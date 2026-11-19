'use strict';

/**
 * Miniature dei link (Beta 0.43.5): i riquadri «Link» della tela mostrano la pagina vera.
 * La pagina si apre nascosta, con gli account del workspace, e se ne salva una foto (640 px)
 * in <cartella delle board>/miniature/. Una alla volta; la foto vale un giorno, poi si rifà.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {BrowserWindow}=require('electron');

const DAY=24*3600e3,TIMEOUT=15000;
const fileUrl=p=>'file:///'+p.replace(/\\/g,'/').split('/').map(encodeURIComponent).join('/').replace(/^file:\/\/\/([a-z])%3A/i,'file:///$1:');
let queue=Promise.resolve();

function cached(root,url){const f=path.join(root,'miniature',crypto.createHash('sha1').update(url).digest('hex').slice(0,16)+'.png');
  try{const s=fs.statSync(f);return {file:f,fresh:Date.now()-s.mtimeMs<DAY,mtime:s.mtimeMs};}catch{return {file:f,fresh:false,mtime:0};}}

function shoot(url,partition,file){
  return new Promise(resolve=>{
    const win=new BrowserWindow({show:false,width:1280,height:800,webPreferences:{partition,contextIsolation:true,sandbox:true,nodeIntegration:false,backgroundThrottling:false}});
    win.webContents.setAudioMuted(true);
    win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    let done=false;
    const finish=async ok=>{if(done)return;done=true;
      try{if(ok){const img=(await win.webContents.capturePage()).resize({width:640});fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,img.toPNG());}}catch{ok=false;}
      try{win.destroy();}catch{}resolve(ok);};
    win.webContents.once('did-finish-load',()=>setTimeout(()=>finish(true),1800));
    win.webContents.once('did-fail-load',(_e,code)=>{if(code!==-3)finish(false);});
    setTimeout(()=>finish(true),TIMEOUT);
    win.loadURL(url).catch(()=>{});
  });
}

/** Foto della pagina: subito se c'è (anche vecchia), poi rifatta in coda se è di ieri. */
async function thumb(root,url,workspace,{force=false}={}){
  if(!/^https?:\/\//i.test(url||''))return {ok:false};
  const c=cached(root,url);
  if(c.fresh&&!force)return {ok:true,url:fileUrl(c.file)+'?v='+Math.round(c.mtime)};
  const partition=require('./web-session.cjs').partitionFor(workspace);
  const ok=await(queue=queue.then(()=>shoot(url,partition,c.file)));
  const n=cached(root,url);
  return n.mtime?{ok:true,url:fileUrl(n.file)+'?v='+Math.round(n.mtime)}:{ok:false,error:ok?'':'Pagina non raggiungibile.'};
}

module.exports={thumb};
