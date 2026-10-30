'use strict';

/**
 * Asset dei preset (Beta 0.22): dalle immagini generate in Reference/Da implementare/NN-nome/
 * (sfondo.jpg 3840×2160, logo.png e icona.png 1024×1024) prepara assets/presets/<nome>/:
 *   wallpaper.jpg 2560×1440 · thumb.jpg 480×270 (Impostazioni) · logo.png 256 · logo-64.png (barra del titolo) · icon.png 256 (finestra).
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
    fs.writeFileSync(path.join(out,'icon.png'),roundCorners(resize(load(from('icona.png')),256)).toPNG());
    console.log('ok',id);
  }
  app.quit();
});
