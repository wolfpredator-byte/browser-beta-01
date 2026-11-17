'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const T=require('../lib/project-type-rules.cjs');

const f=(rel,mtime=1,dir=false)=>({rel,mtime,dir});

test('riconosce il tipo dalla cartella',()=>{
  assert.deepEqual(T.detect([f('Assets',0,true),f('Assets/Scenes/Main.unity'),f('ProjectSettings',0,true)]).engine,'unity');
  assert.equal(T.detect([f('MyGame.uproject')]).engine,'unreal');
  assert.equal(T.detect([f('project.godot')]).engine,'godot');
  assert.equal(T.detect([f('package.json'),f('vite.config.ts'),f('src/main.tsx')]).type,'web');
  assert.equal(T.detect([f('scena.blend'),f('textures/legno.png')]).type,'3d');
  assert.equal(T.detect([f('vlog.prproj'),f('footage/a.mp4')]).type,'video');
  assert.equal(T.detect([f('beat.flp'),f('samples/kick.wav')]).type,'music');
  assert.equal(T.detect([f('tesi.tex'),f('biblio.bib'),f('papers/a.pdf')]).type,'study');
  assert.equal(T.detect([],{game:true}).type,'gaming');
  assert.equal(T.detect([f('leggimi.txt')]).type,null);           // non riconosciuto: scegli tu
});

test('ogni tipo ha azioni, pannelli e file importanti',()=>{
  assert.deepEqual(T.TYPE_IDS,['web','gamedev','3d','video','music','study','gaming']);
  for(const id of T.TYPE_IDS){const t=T.TYPES[id];assert.ok(t.actions.length>=3&&t.panels.length>=2&&t.files.length>=2,id);}
  assert.deepEqual(T.TYPES.gamedev.actions.map(a=>a.label),['Avvia il motore','Apri repo','Build','Log ed errori']);
  assert.deepEqual(T.TYPES.music.panels.map(p=>p[0]),['Spotify','SoundCloud','YouTube','Suno']);
});

test('file importanti a gruppi e azioni sul file più recente',()=>{
  const files=[f('Assets/Scenes/Main.unity',5),f('Assets/Scenes/Menu.unity',9),f('Assets/Scripts/Player.cs',7),f('Assets/Prefabs/Enemy.prefab',3)];
  const g=T.importantFiles('gamedev',files);
  assert.deepEqual(g.map(x=>x.label),['Scene','Script','Asset']);
  assert.equal(g[0].files[0].rel,'Assets/Scenes/Menu.unity');      // più recente prima
  const music=[f('progetto.als',1),f('progetto v2.als',8),f('testi/strofa lyrics.txt',4)];
  assert.equal(T.newestFor(T.TYPES.music.actions[0],music).rel,'progetto v2.als');
  assert.equal(T.newestFor(T.TYPES.music.actions[2],music).rel,'testi/strofa lyrics.txt');
  const stems=T.importantFiles('music',[f('stems/voce.wav',2),f('altro/voce.wav',3)]);
  assert.deepEqual(stems.find(x=>x.label==='Stems').files.map(x=>x.rel),['stems/voce.wav']); // solo nella cartella stems
});

test('cartelle per nome e file recenti senza temporanei',()=>{
  const entries=[f('Renders',0,true),f('old/render',0,true),f('Export',0,true)];
  assert.equal(T.folderFor(T.TYPES['3d'].actions[2],entries).rel,'Renders');
  assert.equal(T.folderFor({folders:['footage']},entries),null);
  assert.deepEqual(T.recentFiles([f('a.cs',3),f('a.cs.meta',9),f('~$tesi.docx',8),f('b.cs',5)]).map(x=>x.rel),['b.cs','a.cs']);
});

test('Unity: versione dell’editor; repository da .git/config',()=>{
  assert.equal(T.unityVersion('m_EditorVersion: 2022.3.21f1\nm_EditorVersionWithRevision: x'),'2022.3.21f1');
  assert.equal(T.repoUrl('[remote "origin"]\n\turl = git@github.com:wolf/destiny-builder.git\n'),'https://github.com/wolf/destiny-builder');
  assert.equal(T.repoUrl('[remote "origin"]\n\turl = https://user:token@github.com/wolf/x.git\n'),'https://github.com/wolf/x'); // niente credenziali nell'indirizzo
  assert.equal(T.repoUrl(''),null);
  assert.equal(T.normalizeKind({tipo:'music'}),'music');
  assert.equal(T.normalizeKind({tipo:'boh'}),null);
});
