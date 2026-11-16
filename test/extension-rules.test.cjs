'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const r=require('../lib/extension-rules.cjs');

test('match pattern: <all_urls>, schema *, sottodomini, percorsi',()=>{
  assert.equal(r.patternCovers('<all_urls>','https://example.com/*'),true);
  assert.equal(r.patternCovers('<all_urls>','https://example.com/pagina?x=1'),true);
  assert.equal(r.patternCovers('*://*/*','http://a.it/'),true);
  assert.equal(r.patternCovers('*://*/*','file:///C:/x'),false);
  assert.equal(r.patternCovers('https://*.google.com/*','https://mail.google.com/*'),true);
  assert.equal(r.patternCovers('https://*.google.com/*','https://google.com/*'),true);
  assert.equal(r.patternCovers('https://*.google.com/*','https://evilgoogle.com/*'),false);
  assert.equal(r.patternCovers('https://example.com/docs/*','https://example.com/docs/a'),true);
  assert.equal(r.patternCovers('https://example.com/docs/*','https://example.com/altro'),false);
  assert.equal(r.patternCovers('http://example.com/*','https://example.com/*'),false);
  assert.equal(r.patternCovers('https://example.com/*','<all_urls>'),false);
  assert.equal(r.covers(['https://a.it/*','<all_urls>'],'https://b.it/*'),true);
  assert.equal(r.patternCovers('non un pattern','https://a.it/'),false);
});

test('siti del manifest: MV3 da host_permissions, MV2 da permissions',()=>{
  assert.deepEqual(r.hostOriginsOf({manifest_version:3,permissions:['tabs'],host_permissions:['https://a.it/*']}),['https://a.it/*']);
  assert.deepEqual(r.hostOriginsOf({manifest_version:2,permissions:['tabs','<all_urls>','https://*/*']}),['<all_urls>','https://*/*']);
  assert.deepEqual(r.apiPermissionsOf({permissions:['tabs','<all_urls>','storage']}),['tabs','storage']);
});

test('accesso ai siti: serve a chi usa activeTab o permessi facoltativi, non a chi ha già tutto',()=>{
  assert.equal(r.needsSiteAccess({manifest_version:3,permissions:['activeTab','scripting']}),true);
  assert.equal(r.needsSiteAccess({manifest_version:3,permissions:['storage'],optional_host_permissions:['https://*/*']}),true);
  assert.equal(r.needsSiteAccess({manifest_version:2,permissions:['storage'],optional_permissions:['<all_urls>']}),true);
  assert.equal(r.needsSiteAccess({manifest_version:3,permissions:['activeTab'],host_permissions:['<all_urls>']}),false);
  assert.equal(r.needsSiteAccess({manifest_version:3,permissions:['storage']}),false);
  const w=r.widenManifest({manifest_version:3,permissions:['activeTab'],host_permissions:['https://a.it/*']});
  assert.deepEqual(w.host_permissions,['https://a.it/*','<all_urls>']);assert.equal(r.isWidened(w),true);assert.equal(r.needsSiteAccess(w),false);
  const w2=r.widenManifest({manifest_version:2,permissions:['activeTab']});
  assert.deepEqual(w2.permissions,['activeTab','<all_urls>']);
});

test('.crx: CRX3, CRX2 e ZIP; file sbagliati rifiutati',()=>{
  const zip=Buffer.from('PK\x03\x04resto-dello-zip','latin1');
  const crx3=Buffer.concat([Buffer.from('Cr24','latin1'),Buffer.from([3,0,0,0]),Buffer.from([5,0,0,0]),Buffer.from('HEADR','latin1'),zip]);
  assert.deepEqual(r.crxToZip(crx3),zip);
  const crx2=Buffer.concat([Buffer.from('Cr24','latin1'),Buffer.from([2,0,0,0]),Buffer.from([2,0,0,0]),Buffer.from([3,0,0,0]),Buffer.from('KKSSS','latin1'),zip]);
  assert.deepEqual(r.crxToZip(crx2),zip);
  assert.deepEqual(r.crxToZip(zip),zip);
  assert.throws(()=>r.crxToZip(Buffer.from('ciao mondo, non sono un crx')),/non è un file \.crx/i);
  assert.throws(()=>r.crxToZip(Buffer.concat([Buffer.from('Cr24','latin1'),Buffer.from([9,0,0,0]),Buffer.alloc(12)])),/non supportata/);
});
