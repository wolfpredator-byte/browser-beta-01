'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {score,filterItems,wordScore}=require('../palette-rules.js');
const {exportPayload,parseBackup,FORMAT}=require('../lib/backup-rules.cjs');
const {safeUrl,SEARCH_ENGINES}=require('../lib/web-rules.cjs');
const {shortcutCommand}=require('../lib/window-rules.cjs');
const {normalize}=require('../lib/storage.cjs');

const items=[
  {kind:'command',label:'Nuova scheda',keywords:'home apri'},
  {kind:'command',label:'Cerca nella pagina',keywords:'trova find'},
  {kind:'tab',label:'Destiny Item Manager',detail:'app.destinyitemmanager.com · Gaming'},
  {kind:'history',label:'Velocità di Destiny',detail:'light.gg'},
  {kind:'workspace',label:'Vai a Gaming'}
];

test('palette: senza testo restituisce l’ordine originale',()=>{
  assert.deepEqual(filterItems(items,'  ').map(i=>i.label),items.map(i=>i.label));
});

test('palette: inizio parola batte lettere sparse, tutte le parole devono comparire',()=>{
  assert.ok(wordScore('sch','nuova scheda')>wordScore('nsch','nuova scheda'));
  assert.equal(score('scheda inesistente',items[0]),0);
  assert.equal(filterItems(items,'nuova sch')[0].label,'Nuova scheda');
});

test('palette: cerca anche in parole chiave e dettagli, ignorando gli accenti',()=>{
  assert.equal(filterItems(items,'trova')[0].label,'Cerca nella pagina');
  assert.equal(filterItems(items,'destinyitem')[0].label,'Destiny Item Manager');
  assert.equal(filterItems(items,'velocita')[0].label,'Velocità di Destiny');
});

test('palette: a parità di testo le schede vengono prima della cronologia',()=>{
  assert.equal(filterItems(items,'destiny')[0].kind,'tab');
});

test('motore di ricerca: frasi con il motore scelto, indirizzi invariati, sconosciuto = Google',()=>{
  assert.equal(safeUrl('ace of spades','duckduckgo'),'https://duckduckgo.com/?q=ace%20of%20spades');
  assert.equal(safeUrl('light.gg','bing'),'https://light.gg/');
  assert.equal(safeUrl('x','boh'),'https://www.google.com/search?q=x');
  assert.ok(Object.values(SEARCH_ENGINES).every(e=>e.url.startsWith('https://')&&e.url.includes('%s')));
  assert.equal(normalize({workspaces:[{name:'A'}],settings:{searchEngine:'brave'}}).settings.searchEngine,'brave');
  assert.equal(normalize({workspaces:[{name:'A'}],settings:{searchEngine:'evil'}}).settings.searchEngine,'google');
});

test('scorciatoie: F1 e Ctrl+Shift+P aprono la palette, Ctrl+, le impostazioni, Ctrl+K resta ai siti',()=>{
  const key=(key,mods={})=>shortcutCommand({type:'keyDown',key,control:false,shift:false,alt:false,...mods});
  assert.equal(key('F1'),'openPalette');
  assert.equal(key('P',{control:true,shift:true}),'openPalette');
  assert.equal(key('p',{control:true}),'print');
  assert.equal(key(',',{control:true}),'openSettings');
  assert.equal(key('k',{control:true}),null);
});

test('backup: l’esportazione toglie segreti e fiducie nei progetti',()=>{
  const data=normalize({workspaces:[{name:'A'}],secrets:{'C:/p':{TOKEN:'xx'}},trustedProjects:{'C:/p/progetto.browser.json':'abc'},
    bookmarks:[{url:'https://light.gg'}]});
  const payload=exportPayload(data,'0.11.0',0);
  assert.equal(payload.format,FORMAT);
  assert.equal(payload.exportedAt,'1970-01-01T00:00:00.000Z');
  assert.equal(payload.data.secrets,undefined);
  assert.equal(payload.data.trustedProjects,undefined);
  assert.equal(payload.data.bookmarks[0].url,'https://light.gg');
  assert.ok(data.secrets['C:/p'],'i dati originali non vanno toccati');
});

test('backup: l’importazione tiene segreti e fiducie di questo PC, non quelli del file',()=>{
  const current=normalize({workspaces:[{name:'Attuale'}],secrets:{'C:/mio':{K:'1'}},trustedProjects:{'C:/mio/f':'h'}});
  const file=JSON.stringify({format:FORMAT,version:'0.11.0',exportedAt:'2026-10-28T10:00:00Z',
    data:{workspaces:[{name:'Gaming'},{name:'Lavoro'}],bookmarks:[{url:'https://dim.gg'}],trustedProjects:{'C:/evil/f':'x'},secrets:{'C:/evil':{}}}});
  const result=parseBackup(file,current);
  assert.equal(result.ok,true);
  assert.deepEqual(result.data.workspaces.map(w=>w.name),['Gaming','Lavoro']);
  assert.deepEqual(result.data.trustedProjects,{'C:/mio/f':'h'});
  assert.deepEqual(result.data.secrets,{'C:/mio':{K:'1'}});
  assert.match(result.summary,/2 workspace, 1 preferiti/);
});

test('backup: file non validi vengono rifiutati con un messaggio',()=>{
  assert.equal(parseBackup('{rotto',{}).ok,false);
  assert.match(parseBackup('{"workspaces":[]}',{}).error,/Non è un backup/);
  assert.match(parseBackup(JSON.stringify({format:FORMAT,data:{workspaces:[{name:''}]}}),{}).error,/workspace/);
});

test('pagina di errore: server locale spento, https locale, indirizzo inesistente',()=>{
  const {describeLoadError}=require('../lib/web-rules.cjs');
  const local=describeLoadError(-102,'ERR_CONNECTION_REFUSED','https://localhost:3000/?auth=success');
  assert.equal(local.local,true);
  assert.match(local.detail,/server di sviluppo è spento/);
  assert.equal(local.httpUrl,'http://localhost:3000/?auth=success');
  const remote=describeLoadError(-102,'ERR_CONNECTION_REFUSED','https://example.com/');
  assert.equal(remote.local,false);assert.equal(remote.httpUrl,null);
  assert.match(describeLoadError(-105,'ERR_NAME_NOT_RESOLVED','https://nonesiste.xyz/').title,/non esiste/);
  assert.equal(describeLoadError(-202,'ERR_CERT_AUTHORITY_INVALID','https://a.it/').title,'Connessione non sicura');
});
