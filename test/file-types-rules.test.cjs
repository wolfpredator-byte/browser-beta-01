'use strict';
const test=require('node:test');
const assert=require('node:assert');
const {extensions,registerText,unregisterText}=require('../lib/file-types-rules.cjs');

const lines=text=>text.split('\r\n');

test('estensioni: quelle del visualizzatore, mai programmi o script', ()=>{
  const ext=extensions();
  for(const e of ['.pdf','.xml','.glb','.mp4','.cs','.md','.zip'])assert.ok(ext.includes(e),e);
  for(const e of ['.exe','.bat','.cmd','.ps1','.sh','.makefile'])assert.ok(!ext.includes(e),e);
  assert.strictEqual(new Set(ext).size,ext.length);
});

test('registro: comando con il percorso tra virgolette e barre raddoppiate', ()=>{
  const l=lines(registerText('C:\\Users\\Anna "A"\\VARCO.exe',{browserRegistered:true}));
  const command=l.indexOf('[HKEY_CURRENT_USER\\Software\\Classes\\VARCO.File\\shell\\open\\command]');
  assert.strictEqual(l[command+1],'@="\\"C:\\\\Users\\\\Anna \\"A\\"\\\\VARCO.exe\\" \\"%1\\""');
  const pdf=l.indexOf('[HKEY_CURRENT_USER\\Software\\Classes\\.pdf\\OpenWithProgids]');
  assert.strictEqual(l[pdf+1],'"VARCO.File"=hex(0):');
  const caps=l.indexOf('[HKEY_CURRENT_USER\\Software\\Clients\\StartMenuInternet\\VARCO\\Capabilities\\FileAssociations]');
  assert.ok(caps>0);
  assert.ok(l.slice(caps).includes('".md"="VARCO.File"'));
  assert.ok(!l.some(x=>x.includes('RegisteredApplications')),'già registrato dall\'installer');
});

test('registro: senza browser registrato crea le proprie Capabilities', ()=>{
  const l=lines(registerText('C:\\V\\VARCO.exe',{browserRegistered:false,root:'HKEY_CURRENT_USER\\Software\\T'}));
  assert.ok(l.includes('[HKEY_CURRENT_USER\\Software\\T\\VARCO\\Capabilities\\FileAssociations]'));
  const reg=l.indexOf('[HKEY_CURRENT_USER\\Software\\T\\RegisteredApplications]');
  assert.strictEqual(l[reg+1],'"VARCO"="Software\\\\VARCO\\\\Capabilities"');
});

test('disinstallazione: toglie solo il valore di VARCO dai tipi', ()=>{
  const l=lines(unregisterText());
  assert.ok(l.includes('[-HKEY_CURRENT_USER\\Software\\Classes\\VARCO.File]'));
  const pdf=l.indexOf('[HKEY_CURRENT_USER\\Software\\Classes\\.pdf\\OpenWithProgids]');
  assert.strictEqual(l[pdf+1],'"VARCO.File"=-');
  assert.ok(!l.some(x=>x.startsWith('[-HKEY_CURRENT_USER\\Software\\Classes\\.pdf')),'il tipo .pdf resta');
});
