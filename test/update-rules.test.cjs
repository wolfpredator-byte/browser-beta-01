'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseVersion,isNewer,releaseInfo,trustedDownload}=require('../lib/update-rules.cjs');

test('versioni: confronto numerico, non alfabetico', ()=>{
  assert.deepEqual(parseVersion('v0.23.1'),[0,23,1]);
  assert.deepEqual(parseVersion('0.24'),[0,24,0]);
  assert.equal(parseVersion('beta'),null);
  assert.equal(isNewer('v0.23.0','0.22.0'),true);
  assert.equal(isNewer('0.100.0','0.23.0'),true); // "0.100" > "0.23" anche se alfabeticamente no
  assert.equal(isNewer('0.23.0','0.23.0'),false);
  assert.equal(isNewer('0.22.9','0.23.0'),false);
  assert.equal(isNewer('rotta','0.23.0'),false);
});

test('release di GitHub: serve l\'installer, bozze e prerelease non contano', ()=>{
  const sha='a'.repeat(64);
  const release={tag_name:'v0.24.0',name:'Beta 0.24',body:'Novità',html_url:'https://github.com/x/y/releases/tag/v0.24.0',
    assets:[{name:'latest.yml',browser_download_url:'https://github.com/x/y/latest.yml'},
      {name:'VARCO.Setup.0.24.0.exe',browser_download_url:'https://github.com/x/y/releases/download/v0.24.0/VARCO.Setup.0.24.0.exe',size:100,digest:'sha256:'+sha}]};
  const info=releaseInfo(release);
  assert.equal(info.version,'0.24.0');
  assert.equal(info.asset.name,'VARCO.Setup.0.24.0.exe');
  assert.equal(info.asset.sha256,sha);
  assert.equal(info.asset.size,100);
  assert.equal(releaseInfo({...release,draft:true}),null);
  assert.equal(releaseInfo({...release,prerelease:true}),null);
  assert.equal(releaseInfo({...release,assets:[release.assets[0]]}),null);
  assert.equal(releaseInfo({...release,tag_name:'ultima'}),null);
  assert.equal(releaseInfo({...release,assets:[{...release.assets[1],name:'VARCO Setup 0.24.0.exe',digest:'md5:x'}]}).asset.sha256,'');
});

test('download: solo GitHub in https (locale solo nelle prove)', ()=>{
  assert.equal(trustedDownload('https://github.com/x/y/releases/download/v1/a.exe'),true);
  assert.equal(trustedDownload('https://objects.githubusercontent.com/a'),true);
  assert.equal(trustedDownload('http://github.com/a'),false);
  assert.equal(trustedDownload('https://github.com.evil.it/a'),false);
  assert.equal(trustedDownload('http://127.0.0.1:8080/a.exe'),false);
  assert.equal(trustedDownload('http://127.0.0.1:8080/a.exe',{allowLocal:true}),true);
  assert.equal(trustedDownload('non un url'),false);
});
