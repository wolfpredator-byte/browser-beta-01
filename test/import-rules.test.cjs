'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const r=require('../lib/import-rules.cjs');

test('import: preferiti piatti, barra per prima, senza doppioni né indirizzi strani',()=>{
  const json={roots:{
    other:{type:'folder',children:[{type:'url',name:'Altro',url:'https://altro.it'}]},
    bookmark_bar:{type:'folder',name:'Barra',children:[
      {type:'url',name:'Uno',url:'https://uno.it'},
      {type:'folder',name:'Lavoro',children:[{type:'url',name:'Due',url:'https://due.it'},{type:'url',name:'Js',url:'javascript:alert(1)'}]},
      {type:'url',name:'Uno bis',url:'https://uno.it'}]},
    custom_root:{type:'folder',children:[{type:'url',name:'Opera',url:'https://opera.com'}]}}};
  assert.deepEqual(r.flattenBookmarks(json).map(b=>[b.title,b.folder]),[['Uno','Barra'],['Due','Lavoro'],['Altro',''],['Opera','']]);
  assert.deepEqual(r.flattenBookmarks(null),[]);
});

test('import: preferiti aggiunti in fondo, quelli già presenti saltati, limite',()=>{
  const m=r.mergeBookmarks([{url:'https://a.it',title:'A',at:1}],[{url:'https://a.it',title:'A2'},{url:'https://b.it',title:'B'}],500,9);
  assert.deepEqual(m.bookmarks,[{url:'https://a.it',title:'A',at:1},{url:'https://b.it',title:'B',at:9}]);
  assert.equal(m.added,1);assert.equal(m.skipped,1);
  assert.equal(r.mergeBookmarks([],[{url:'https://x.it'},{url:'https://y.it'}],1).added,1);
});

test('import: motore di ricerca e pagine di avvio',()=>{
  const pref=(url,keyword)=>({default_search_provider_data:{mirrored_template_url_data:{url,keyword}}});
  assert.equal(r.searchEngineOf(pref('{google:baseURL}search?q={searchTerms}','google.com')),'google');
  assert.equal(r.searchEngineOf(pref('https://duckduckgo.com/?q={searchTerms}','duckduckgo.com')),'duckduckgo');
  assert.equal(r.searchEngineOf(pref('https://www.bing.com/search?q={searchTerms}','bing.com')),'bing');
  assert.equal(r.searchEngineOf(pref('https://yandex.ru/search/?text={searchTerms}','yandex')),null);
  assert.equal(r.searchEngineOf({}),null);
  assert.deepEqual(r.startupPages({session:{restore_on_startup:4,startup_urls:['https://a.it','chrome://newtab']}}),['https://a.it']);
  assert.deepEqual(r.startupPages({}),[]);
});

test('import: estensioni dell\'utente, dal Chrome Web Store oppure no',()=>{
  const id=c=>c.repeat(32);
  const pref={extensions:{settings:{
    [id('a')]:{location:1,from_webstore:true,manifest:{name:'Zeta',update_url:'https://clients2.google.com/service/update2/crx'}},
    [id('b')]:{location:1,from_webstore:false,manifest:{name:'Da Edge',update_url:'https://edge.microsoft.com/extensionwebstorebase/v1/crx'},disable_reasons:[1]},
    [id('c')]:{location:5,manifest:{name:'Componente'}},
    [id('d')]:{location:1,was_installed_by_default:true,manifest:{name:'Preinstallata'}},
    'non-valido':{location:1,manifest:{name:'X'}}}}};
  const secure={extensions:{settings:{[id('e')]:{location:1,from_webstore:true,manifest:{name:'Alfa'}}}}};
  assert.deepEqual(r.extensionsOf(pref,secure).map(e=>[e.name,e.store,e.enabled]),[['Alfa','chrome',true],['Da Edge','other',false],['Zeta','chrome',true]]);
  assert.equal(r.extensionName('__MSG_appName__',{appname:{message:'Bello'}}),'Bello');
  assert.equal(r.extensionName('Normale',{}),'Normale');
});

test('import: profili con il loro nome',()=>{
  const ls={profile:{info_cache:{Default:{name:'Mario'},'Profile 2':{name:'Lavoro'}}}};
  assert.deepEqual(r.profilesOf(ls,['Default','Profile 2','System Profile','Crashpad']),[{dir:'Default',name:'Mario'},{dir:'Profile 2',name:'Lavoro'}]);
  assert.deepEqual(r.profilesOf({},['Default']),[{dir:'Default',name:'Profilo principale'}]);
});
