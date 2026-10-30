'use strict';

/**
 * Asset dei preset (Beta 0.22): dalle immagini generate in Reference/Da implementare/NN-nome/
 * (sfondo.jpg 3840×2160, logo.png e icona.png 1024×1024) prepara assets/presets/<nome>/:
 *   wallpaper.jpg 2560×1440 · thumb.jpg 480×270 (Impostazioni) · logo.png 256 · logo-64.png (barra del titolo) · icon.png 256 (finestra)
 *   icon.ico (16–256 px: collegamenti di Windows, Beta 0.23) · tray.png 32 (area di notifica).
 * Le icone con gli angoli pieni ricevono una maschera arrotondata, come assets/app-icon.png.
 * Si avvia con Electron (usa nativeImage): npx electron scripts/build-presets.cjs
 */
const fs=require('node:fs');
const path=require('node:path');
const {app,nativeImage}=require('electron');

const root=path.join(__dirname,'..');
const source=path.join(root,'Reference','Da implementare');
const target=path.join(root,'assets','presets');

const load=file=>{const image=nativeImage.createFromPath(file);if(image.isEmpty())throw new Error('Immagine non leggibile: '+file);return image;};
const resize=(image,width,height=width)=>image.resize({width,height,quality:'best'});

/** Angoli trasparenti: copertura di un quadrato arrotondato (raggio 22%), con bordo sfumato. */
function roundCorners(image){
  const {width,height}=image.getSize();
  const pixels=Buffer.from(image.toBitmap()); // BGRA premoltiplicato
  if(pixels[3]<250)return image; // angoli già trasparenti
  const r=width*.22;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const dx=Math.max(0,r-x-.5,x+.5-(width-r)),dy=Math.max(0,r-y-.5,y+.5-(height-r));
    const cover=Math.min(1,Math.max(0,r-Math.hypot(dx,dy)+.5));
    if(cover<1){const i=(y*width+x)*4;for(let c=0;c<4;c++)pixels[i+c]=Math.round(pixels[i+c]*cover);}
  }
  return nativeImage.createFromBitmap(pixels,{width,height});
}

/**
 * Immagine come bitmap di un .ico (BITMAPINFOHEADER, 32 bit BGRA dal basso, più la maschera AND).
 * Esplora risorse legge il PNG nei .ico solo per la 256 px: le altre dimensioni vanno così.
 */
function icoBitmap(image){
  const {width:w,height:h}=image.getSize();
  const bgra=image.toBitmap(); // BGRA premoltiplicato
  const maskRow=Math.ceil(w/32)*4;
  const out=Buffer.alloc(40+w*h*4+maskRow*h);
  out.writeUInt32LE(40,0);out.writeInt32LE(w,4);out.writeInt32LE(h*2,8); // altezza doppia: colori + maschera
  out.writeUInt16LE(1,12);out.writeUInt16LE(32,14);out.writeUInt32LE(w*h*4+maskRow*h,20);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const from=(y*w+x)*4,to=40+((h-1-y)*w+x)*4,a=bgra[from+3];
    for(let c=0;c<3;c++)out[to+c]=a?Math.min(255,Math.round(bgra[from+c]*255/a)):0; // senza premoltiplicazione
    out[to+3]=a;
  }
  return out; // maschera AND tutta a zero: decide il canale alfa
}
/** File .ico: 16–48 px come bitmap, 64–256 px come PNG (Windows Vista e successivi). */
function icoFrom(image,sizes=[16,24,32,48,64,128,256]){
  const parts=sizes.map(size=>size<=48?icoBitmap(resize(image,size)):resize(image,size).toPNG());
  const header=Buffer.alloc(6+16*sizes.length);
  header.writeUInt16LE(0,0);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
  let offset=header.length;
  sizes.forEach((size,i)=>{
    const entry=6+16*i;
    header.writeUInt8(size>=256?0:size,entry);header.writeUInt8(size>=256?0:size,entry+1); // 0 = 256
    header.writeUInt16LE(1,entry+4);header.writeUInt16LE(32,entry+6);
    header.writeUInt32LE(parts[i].length,entry+8);header.writeUInt32LE(offset,entry+12);
    offset+=parts[i].length;
  });
  return Buffer.concat([header,...parts]);
}

app.whenReady().then(()=>{
  const folders=fs.readdirSync(source).filter(name=>/^\d\d-[a-z0-9-]+$/.test(name)).sort();
  for(const folder of folders){
    const id=folder.slice(3);
    const from=name=>path.join(source,folder,name);
    const out=path.join(target,id);
    fs.mkdirSync(out,{recursive:true});
    const wallpaper=load(from('sfondo.jpg'));
    fs.writeFileSync(path.join(out,'wallpaper.jpg'),resize(wallpaper,2560,1440).toJPEG(86));
    fs.writeFileSync(path.join(out,'thumb.jpg'),resize(wallpaper,480,270).toJPEG(80));
    const logo=load(from('logo.png'));
    fs.writeFileSync(path.join(out,'logo.png'),resize(logo,256).toPNG());
    fs.writeFileSync(path.join(out,'logo-64.png'),resize(logo,64).toPNG());
    const icon=roundCorners(resize(load(from('icona.png')),256));
    fs.writeFileSync(path.join(out,'icon.png'),icon.toPNG());
    fs.writeFileSync(path.join(out,'icon.ico'),icoFrom(icon));
    // Area di notifica: il logo libero si legge meglio dell'icona col quadrato a 16 px.
    fs.writeFileSync(path.join(out,'tray.png'),resize(logo,32).toPNG());
    console.log('ok',id);
  }
  app.quit();
});
