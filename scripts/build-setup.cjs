'use strict';

/**
 * Costruisce l'installer personalizzato di VARCO (Beta 0.16): `npm run setup`.
 *
 * 1. Impacchetta il browser (electron-builder --dir) in dist\win-unpacked.
 * 2. Prepara setup\assets (logo, sfondo, icone) dagli asset del browser.
 * 3. Costruisce l'app di installazione (cartella setup\) come eseguibile "portable",
 *    con l'app del browser dentro resources\payload.
 * Risultato: dist\VARCO Setup <versione>.exe.
 */
const fs=require('node:fs');
const path=require('node:path');
const {execSync}=require('node:child_process');

const root=path.join(__dirname,'..');
const setupDir=path.join(root,'setup');
const version=require(path.join(root,'package.json')).version;
const electronVersion=require(path.join(root,'node_modules','electron','package.json')).version;
const sh=command=>execSync(command,{cwd:root,stdio:'inherit'});

console.log(`\n▸ VARCO ${version}: impacchetto il browser…`);
sh('npx electron-builder --win dir');

console.log('\n▸ Preparo gli asset dell\'installer…');
const assets=path.join(setupDir,'assets');
fs.rmSync(assets,{recursive:true,force:true});
fs.mkdirSync(path.join(assets,'icons'),{recursive:true});
for(const file of ['app-icon-256.png','home-bg.jpg'])fs.copyFileSync(path.join(root,'assets',file),path.join(assets,file));
for(const name of ['close','shield','project','settings','jarvis','download','check'])
  fs.copyFileSync(path.join(root,'assets','icons',name+'.svg'),path.join(assets,'icons',name+'.svg'));

// package.json dell'installer con la stessa versione del browser.
fs.writeFileSync(path.join(setupDir,'package.json'),JSON.stringify({name:'varco-setup',productName:'VARCO',version,
  description:'Installazione di VARCO',main:'setup-main.cjs',private:true},null,2));

const config={
  appId:'local.personal-workspace-browser.setup',productName:'VARCO',executableName:'VARCO Setup',
  copyright:'Uso personale',electronVersion,electronDist:path.join(root,'node_modules','electron','dist'),
  directories:{output:path.join(root,'dist','setup-build'),app:setupDir},
  files:['setup-main.cjs','setup-preload.cjs','setup.html','setup.css','setup.js','licenza.txt','assets/**/*','package.json'],
  // L'app vera del browser viaggia dentro l'installer.
  extraResources:[{from:path.join(root,'dist','win-unpacked','resources','app.asar'),to:'payload/app.asar'}],
  win:{target:'portable',icon:path.join(root,'assets','app-icon.ico')},
  portable:{artifactName:'VARCO Setup ${version}.exe'},
  asar:true
};
const configFile=path.join(root,'dist','setup-builder.json');
fs.writeFileSync(configFile,JSON.stringify(config,null,2));

console.log('\n▸ Costruisco l\'installer…');
sh(`npx electron-builder --win portable --projectDir "${setupDir}" --config "${configFile}"`);

const built=path.join(root,'dist','setup-build',`VARCO Setup ${version}.exe`);
const target=path.join(root,'dist',`VARCO Setup ${version}.exe`);
fs.copyFileSync(built,target);
console.log(`\n✔ Installer pronto: ${target} (${Math.round(fs.statSync(target).size/1048576)} MB)`);
