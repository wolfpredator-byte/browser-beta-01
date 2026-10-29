'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createStore,normalize}=require('../lib/storage.cjs');

/** Ogni test lavora in una cartella temporanea nuova. */
function tempStore(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'browser-test-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'browser-data.json');
  return {dir,file,store:createStore(file)};
}
const quiet=fn=>{const original=console.error;console.error=()=>{};try{return fn();}finally{console.error=original;}};

test('primo avvio: crea i workspace predefiniti',t=>{
  const {file,store}=tempStore(t);
  const data=store.load();
  assert.deepEqual(data.workspaces.map(w=>w.name),['Personale','Destiny Builder','Gaming']);
  assert.equal(fs.existsSync(file),true);
});

test('salvataggio: il file precedente diventa .bak, nessun .tmp rimasto',t=>{
  const {file,store}=tempStore(t);
  const data=store.load();
  data.bookmarks.push({url:'https://light.gg'});store.save(data);
  assert.equal(fs.existsSync(file+'.bak'),true);
  assert.equal(fs.existsSync(file+'.tmp'),false);
  assert.equal(store.load().bookmarks[0].url,'https://light.gg');
});

test('file principale rovinato: si recupera dal .bak',t=>{
  const {file,store}=tempStore(t);
  const data=store.load();
  data.workspaces[0].name='Mio';store.save(data);
  data.workspaces[0].name='Mio 2';store.save(data); // .bak ora contiene 'Mio'
  fs.writeFileSync(file,'{"workspa'); // spegnimento a metà scrittura
  assert.equal(store.load().workspaces[0].name,'Mio');
});

test('file e backup rovinati: il file illeggibile viene messo da parte, non cancellato',t=>{
  const {dir,file,store}=tempStore(t);
  fs.writeFileSync(file,'xx');fs.writeFileSync(file+'.bak','yy');
  const data=quiet(()=>store.load());
  assert.equal(data.workspaces[0].name,'Personale');
  const corrupt=fs.readdirSync(dir).find(name=>name.startsWith('browser-data.corrupt-'));
  assert.ok(corrupt,'manca la copia del file rovinato');
  assert.equal(fs.readFileSync(path.join(dir,corrupt),'utf8'),'xx');
});

test('migrazione da 0.4: aggiunge i campi nuovi senza perdere i dati',()=>{
  const old={activeWorkspace:'Gaming',workspaces:[{name:'Gaming',tabs:[]}],bookmarks:[{url:'https://dim.gg'}],
    history:[],sidebarMode:'gigante',closedTabs:new Array(30).fill({url:'https://a.it'})};
  const data=normalize(old);
  assert.equal(data.sidebarMode,'compact');
  assert.deepEqual(data.openWindows,[]);
  assert.equal(data.closedTabs.length,20);
  assert.equal(data.bookmarks[0].url,'https://dim.gg');
  assert.deepEqual(data.workspaces[0],{name:'Gaming',resources:[],projectPath:'',workPrograms:[],workAutoStart:false,wallpaper:'',homeLinks:[]});
  assert.equal(data.appearance.theme,'varco');
});

test('migrazione da 0.5: background e rilevamento attivi, giochi rovinati scartati',()=>{
  const data=normalize({workspaces:[{name:'Gaming'}],games:[
    {id:1,name:'Destiny 2',exe:'destiny2.exe',workspace:'Gaming',sites:[],enabled:true},
    {id:'x',name:'Rotto'},null]});
  assert.deepEqual(data.settings,{runInBackground:true,gameWatcher:true,backgroundNoticeShown:false,
    jarvis:{enabled:false,readPages:true},adblock:{enabled:true,allowlist:[]},sleepAfterMinutes:30,searchEngine:'google',tabAnimations:true});
  assert.deepEqual(data.sitePermissions,{});
  assert.deepEqual(data.games.map(g=>g.id),[1]);
  assert.equal(normalize({workspaces:[{name:'A'}],settings:{runInBackground:false}}).settings.runInBackground,false);
});

test('workspace attivo inesistente: si usa il primo disponibile',()=>{
  const data=normalize({activeWorkspace:'Cancellato',workspaces:[{name:'Personale'}]});
  assert.equal(data.activeWorkspace,'Personale');
});
