'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {checkName,renameWorkspace,moveWorkspace,WORKSPACE_COLORS}=require('../lib/workspace-rules.cjs');
const {isReadyLine,localUrlFromLog}=require('../lib/project-rules.cjs');

const sample=()=>({
  activeWorkspace:'Gaming',
  workspaces:[{name:'Personale'},{name:'Gaming'},{name:'Destiny Builder'}],
  sessionTabs:[{workspace:'Gaming',url:'https://light.gg'}],closedTabs:[{workspace:'Gaming'}],
  openWindows:[{workspace:'Gaming',pane:0},{workspace:'Gaming',pane:1}],games:[{id:1,workspace:'Gaming'}],
  layouts:{Gaming:{savedAt:1}},collapsedStacks:{Gaming:['Build']},notes:{Gaming:{text:'ciao'}},
  workspaceLastActive:{Gaming:'https://dim.gg','Gaming#1':'https://light.gg','Gaming 2':'https://x.it'}
});

test('rinomina: aggiorna schede, finestre, giochi, disposizioni, stack, note e ultima scheda',()=>{
  const data=sample(),tabs=[{workspace:'Gaming'},{workspace:'Personale'}];
  assert.deepEqual(renameWorkspace(data,tabs,'Gaming','  Destiny   2 '),{ok:true,name:'Destiny 2'});
  assert.equal(data.workspaces[1].name,'Destiny 2');
  assert.deepEqual(tabs.map(t=>t.workspace),['Destiny 2','Personale']);
  assert.equal(data.sessionTabs[0].workspace,'Destiny 2');
  assert.equal(data.openWindows.every(w=>w.workspace==='Destiny 2'),true);
  assert.equal(data.games[0].workspace,'Destiny 2');
  assert.deepEqual(Object.keys(data.layouts),['Destiny 2']);
  assert.deepEqual(data.collapsedStacks['Destiny 2'],['Build']);
  assert.equal(data.notes['Destiny 2'].text,'ciao');
  assert.deepEqual(data.workspaceLastActive,{'Destiny 2':'https://dim.gg','Destiny 2#1':'https://light.gg','Gaming 2':'https://x.it'});
  assert.equal(data.activeWorkspace,'Destiny 2');
});

test('rinomina: nomi vuoti o già usati (anche con maiuscole diverse) sono rifiutati',()=>{
  const data=sample();
  assert.equal(renameWorkspace(data,[],'Gaming','   ').ok,false);
  assert.match(renameWorkspace(data,[],'Gaming','personale').error,/Esiste già/);
  assert.equal(renameWorkspace(data,[],'Nessuno','X').ok,false);
  assert.equal(checkName(data.workspaces,'gaming','Gaming').ok,true); // stesso workspace: solo maiuscole
});

test('ordine dei workspace: prima di un altro o in fondo',()=>{
  const list=[{name:'A'},{name:'B'},{name:'C'}];
  assert.equal(moveWorkspace(list,'C','A'),true);
  assert.deepEqual(list.map(w=>w.name),['C','A','B']);
  moveWorkspace(list,'C');
  assert.deepEqual(list.map(w=>w.name),['A','B','C']);
  assert.equal(moveWorkspace(list,'X','A'),false);
  assert.ok(Object.values(WORKSPACE_COLORS).every(c=>/^#[0-9a-f]{6}$/.test(c)));
});

test('anteprima pronta: frasi tipiche dei dev server, indirizzo dell\'anteprima o testo scelto',()=>{
  const preview='http://localhost:3000/';
  assert.equal(isReadyLine('  ➜  Local:   http://localhost:5173/',null,null),true);
  assert.equal(isReadyLine('webpack compiled successfully in 1200 ms',null,null),true);
  assert.equal(isReadyLine('- ready started server on 0.0.0.0:3000',null,null),true);
  assert.equal(isReadyLine('Server listening on port 8080',null,null),true);
  assert.equal(isReadyLine('Open http://localhost:3000 to view it',preview,null),true);
  assert.equal(isReadyLine('installing dependencies…',preview,null),false);
  assert.equal(isReadyLine('API pronta ✓',preview,'api pronta'),true);
  assert.equal(isReadyLine('Local: http://localhost:5173',preview,'api pronta'),false); // con "pronto" conta solo quello
});

test('indirizzo del dev server letto dal log (riga "Local", https, 0.0.0.0)',()=>{
  const next='▲ Next.js 16.3.8 (Turbopack)\n- Local:        https://localhost:3000\n- Network:      https://192.168.0.11:3000\n✓ Ready in 679ms';
  assert.equal(localUrlFromLog(next),'https://localhost:3000/');
  assert.equal(localUrlFromLog('  ➜  Local:   http://localhost:5173/'),'http://localhost:5173/');
  assert.equal(localUrlFromLog('listening on http://0.0.0.0:8080'),'http://localhost:8080/');
  assert.equal(localUrlFromLog('compiled successfully'),null);
});
