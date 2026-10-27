'use strict';

/**
 * Genera assets/tray-icon.png (16px) e tray-icon@2x.png (32px): il simbolo ◈
 * del browser, bianco con bordo scuro, leggibile su barra chiara e scura.
 * Electron sceglie da solo la versione @2x sugli schermi ad alta risoluzione.
 * Uso: node scripts/make-icons.cjs  (serve solo se cambi il disegno).
 */
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');

/** Colore del punto (x,y) in un quadrato di lato 1: [r,g,b,a] oppure null. */
function shape(x,y){
  const d=Math.abs(x-.5)+Math.abs(y-.5); // distanza "a rombo" dal centro
  if(d<=.17)return [255,255,255,255];              // rombo pieno al centro
  if(d>=.36&&d<=.47)return [255,255,255,255];      // contorno esterno
  if((d>.32&&d<.36)||(d>.47&&d<.51)||(d>.17&&d<.21))return [24,24,24,235]; // bordo scuro
  return null;
}

/** Antialiasing: media di 4×4 campioni per pixel. */
function render(size){
  const pixels=Buffer.alloc(size*size*4);
  const n=4;
  for(let py=0;py<size;py++)for(let px=0;px<size;px++){
    let r=0,g=0,b=0,a=0;
    for(let sy=0;sy<n;sy++)for(let sx=0;sx<n;sx++){
      const c=shape((px+(sx+.5)/n)/size,(py+(sy+.5)/n)/size);
      if(c){r+=c[0]*c[3];g+=c[1]*c[3];b+=c[2]*c[3];a+=c[3];}
    }
    const i=(py*size+px)*4;
    if(a){pixels[i]=r/a;pixels[i+1]=g/a;pixels[i+2]=b/a;}
    pixels[i+3]=a/(n*n);
  }
  return pixels;
}

function crc32(buf){
  let c,crc=0xffffffff;
  for(const byte of buf){c=(crc^byte)&0xff;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crc=(crc>>>8)^c;}
  return (crc^0xffffffff)>>>0;
}
function chunk(type,data){
  const len=Buffer.alloc(4);len.writeUInt32BE(data.length);
  const body=Buffer.concat([Buffer.from(type),data]);
  const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len,body,crc]);
}
function png(size){
  const rgba=render(size);
  const raw=Buffer.alloc(size*(size*4+1));
  for(let y=0;y<size;y++){raw[y*(size*4+1)]=0;rgba.copy(raw,y*(size*4+1)+1,y*size*4,(y+1)*size*4);}
  const header=Buffer.alloc(13);
  header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);
  header[8]=8;header[9]=6; // 8 bit, RGBA
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),
    chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}

const dir=path.join(__dirname,'..','assets');
fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'tray-icon.png'),png(16));
fs.writeFileSync(path.join(dir,'tray-icon@2x.png'),png(32));
fs.writeFileSync(path.join(dir,'app-icon.png'),png(256));
console.log('Icone create in',dir);
