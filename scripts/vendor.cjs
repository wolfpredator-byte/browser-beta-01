'use strict';

/**
 * Copia in viewer/vendor/ solo i file delle librerie che servono al visualizzatore
 * (Beta 0.20). I pacchetti interi (three.js da solo pesa decine di MB) restano in
 * node_modules come devDependencies e non finiscono nell'installer.
 * Parte da solo con `npm start` e con `npm run setup`; a mano: `npm run vendor`.
 */
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const nm=path.join(root,'node_modules');
const out=path.join(root,'viewer','vendor');

const FILES={
  // three.js: motore 3D, controlli col mouse e caricatori GLB/GLTF, OBJ, FBX.
  'three/three.module.js':'three/build/three.module.js',
  'three/three.core.js':'three/build/three.core.js',
  'three/addons/controls/OrbitControls.js':'three/examples/jsm/controls/OrbitControls.js',
  'three/addons/loaders/GLTFLoader.js':'three/examples/jsm/loaders/GLTFLoader.js',
  'three/addons/loaders/OBJLoader.js':'three/examples/jsm/loaders/OBJLoader.js',
  'three/addons/loaders/FBXLoader.js':'three/examples/jsm/loaders/FBXLoader.js',
  'three/addons/libs/fflate.module.js':'three/examples/jsm/libs/fflate.module.js',
  'three/addons/curves/NURBSCurve.js':'three/examples/jsm/curves/NURBSCurve.js',
  'three/addons/curves/NURBSUtils.js':'three/examples/jsm/curves/NURBSUtils.js',
  'three/addons/utils/BufferGeometryUtils.js':'three/examples/jsm/utils/BufferGeometryUtils.js',
  'three/addons/utils/SkeletonUtils.js':'three/examples/jsm/utils/SkeletonUtils.js',
  // Codice con i colori della sintassi.
  'highlight/highlight.min.js':'@highlightjs/cdn-assets/highlight.min.js',
  'highlight/github-dark.min.css':'@highlightjs/cdn-assets/styles/github-dark.min.css',
  // Markdown impaginato (e ripulito da script e HTML pericoloso).
  'marked/marked.esm.js':'marked/lib/marked.esm.js',
  'dompurify/purify.es.mjs':'dompurify/dist/purify.es.mjs',
  // ZIP e PowerPoint (file Office = archivi ZIP di XML).
  'fflate/browser.js':'fflate/esm/browser.js',
  // Word ed Excel.
  'mammoth/mammoth.browser.min.js':'mammoth/mammoth.browser.min.js',
  'xlsx/xlsx.full.min.js':'xlsx/dist/xlsx.full.min.js'
};

let copied=0;
for(const [target,source] of Object.entries(FILES)){
  const from=path.join(nm,source),to=path.join(out,target);
  if(!fs.existsSync(from)){console.error('Manca '+source+': esegui npm install');process.exitCode=1;continue;}
  fs.mkdirSync(path.dirname(to),{recursive:true});
  fs.copyFileSync(from,to);copied++;
}
console.log(`vendor: ${copied} file in viewer/vendor`);
