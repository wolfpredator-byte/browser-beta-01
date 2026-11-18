'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const R=require('../lib/board-rules.cjs');

test('elenco delle board: almeno una, quella aperta esiste, etichette e link controllati',()=>{
  const i=R.normalizeIndex({current:'zz',boards:{b1:{name:'Run 1'},bad:{},b2:{name:'',archived:true}},
    tags:[{n:'Boss',c:9},{n:'boss'},{n:''},{n:'Missione',c:2}],quick:[{n:'Wiki',u:'fandom.com/wiki',w:'pannello',i:'xyz'},{n:'Male',u:'javascript:alert(1)'},{n:'',u:'https://a.it'}]},'game');
  assert.deepEqual(Object.keys(i.boards),['b1','b2']);
  assert.equal(i.current,'b1');
  assert.equal(i.boards.b2.name,'Board');
  assert.deepEqual(i.tags,[{n:'Boss',c:0},{n:'Missione',c:2}]);            // doppioni (anche maiuscole) e vuote via
  assert.deepEqual(i.quick,[{i:'link',n:'Wiki',u:'https://fandom.com/wiki',w:'pannello',dock:false,sug:false}]);
  assert.deepEqual(Object.keys(i.presets),['amici','compet','stream','solo']);  // preset di partenza per ogni gioco
  assert.equal(i.lastPreset,'amici');
  const p=R.normalizeIndex({},'project');
  assert.deepEqual(Object.keys(p.boards),['b1']);
  assert.equal(p.boards.b1.name,'Principale');
  assert.equal(p.presets,undefined);                                          // i preset sono solo dei giochi
  assert.ok(p.tags.some(t=>t.n==='Bug'));
});

test('partita in corso e partita da salvare',()=>{
  const i=R.normalizeIndex({boards:{b1:{name:'A'}},session:{start:100,preset:'nessuno',board:'b9'},pending:{start:1,end:61000,board:'b1',caps:[{path:'C:\\x\\a.png',name:'a.png',mtime:5},{}]}},'game');
  assert.deepEqual(i.session,{start:100,preset:'amici',board:'b1',manual:false});
  assert.equal(i.pending.caps.length,1);
  assert.equal(R.normalizeIndex({session:{start:'x'}},'game').session,null);
});

test('nuova board: pulita, stessa disposizione o copia',()=>{
  const src=R.normalizeBoard({n:7,tiles:{hero:{x:5,y:5},'note-7':{x:1,y:1,text:'segreto'}},links:[{a:'hero',b:'note-7'}],tasks:[{t:'Boss',tag:'Boss',done:true}],notes:'appunti',
    build:[{k:'Classe',v:'Mago'}],sessions:[{start:1,dur:60000,p:'solo',caps:['a.png'],note:'ok',done:[]}]},'game');
  const layout=R.newBoard('game','layout',src);
  assert.deepEqual(Object.keys(layout.tiles),['hero','note-7']);
  assert.equal(layout.tiles['note-7'].text,'');                                // contenuti vuoti
  assert.equal(layout.links.length,1);
  assert.deepEqual(layout.tasks,[]);assert.equal(layout.notes,'');assert.deepEqual(layout.sessions,[]);
  assert.deepEqual(layout.build,[{k:'Classe',v:''}]);                          // le voci restano, i valori no
  const copy=R.newBoard('game','copy',src);
  assert.equal(copy.notes,'appunti');assert.equal(copy.tasks.length,1);assert.deepEqual(copy.sessions,[]);  // lo storico riparte
  const empty=R.newBoard('game','empty',src);
  assert.ok(empty.tiles.hero&&empty.tiles['timer-1'].timer.mode==='down'&&empty.tiles['timer-2'].timer.mode==='until');
  assert.equal(R.nextBoardId({boards:{b1:{},b2:{},b4:{}}}),'b5');
});

test('storico: sessioni controllate e riepilogo leggibile',()=>{
  const s=R.normalizeSession({start:Date.UTC(2026,10,18,20,5),dur:95*60000,p:'compet',caps:['ok.png','../../x.exe','clip 1.mp4'],note:'Bella',done:['Boss']});
  assert.deepEqual(s.caps,['ok.png','clip 1.mp4']);
  assert.equal(R.normalizeSession({start:1}),null);
  const md=R.sessionMarkdown({game:'Elden Ring',board:'Run 1',preset:'Competitivo',session:s});
  assert.match(md,/Elden Ring · Competitivo/);assert.match(md,/Durata: 1 h 35 min/);assert.match(md,/  - Boss/);assert.match(md,/Bella/);
});

test('catture nuove, link suggeriti e nome della cartella del gioco',()=>{
  const files=[{name:'a.png',mtime:5000},{name:'b.mp4',mtime:90000},{name:'c.txt',mtime:90000},{name:'vecchia.png',mtime:-100000}];
  assert.deepEqual(R.newCaptures(files,10000).map(f=>[f.name,f.clip]),[['b.mp4',true],['a.png',false]]);
  const q=R.suggestedGameLinks('Elden Ring',['https://mapgenie.io/elden-ring']);
  assert.equal(q[0].u,'https://mapgenie.io/elden-ring');assert.equal(q[0].sug,false);
  assert.ok(q.some(l=>l.n==='Wiki'&&l.sug&&l.u.includes('Elden%20Ring')));
  assert.equal(R.safeFolderName('Halo: Reach / MCC.'),'Halo Reach MCC');
  assert.equal(R.safeFolderName(''),'Gioco');
});
