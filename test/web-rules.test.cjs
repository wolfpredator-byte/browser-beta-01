'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {safeUrl,isWebUrl,looksLikeAddress,popupAction,isPermissionAllowed,cleanUserAgent}=require('../lib/web-rules.cjs');

test('frasi diventano ricerche, domini diventano indirizzi https',()=>{
  assert.equal(safeUrl('ace of spades'),'https://www.google.com/search?q=ace%20of%20spades');
  assert.equal(safeUrl('light.gg'),'https://light.gg/');
  assert.equal(safeUrl('  '),null);
  assert.equal(safeUrl('x'.repeat(3000)),null);
});

test('localhost senza protocollo usa http: i dev server locali non hanno https',()=>{
  assert.equal(safeUrl('localhost:5173'),'http://localhost:5173/');
  assert.equal(safeUrl('https://localhost:8443'),'https://localhost:8443/');
});

test('solo http e https sono indirizzi web',()=>{
  assert.equal(isWebUrl('https://bungie.net'),true);
  assert.equal(isWebUrl('javascript:alert(1)'),false);
  assert.equal(isWebUrl('file:///C:/Windows'),false);
});

test('popup di login: window.open diventa una finestra vera',()=>{
  assert.equal(popupAction('https://www.bungie.net/en/OAuth/Authorize','new-window'),'window');
  // Molti login aprono prima un popup vuoto e poi lo indirizzano.
  assert.equal(popupAction('about:blank','new-window'),'window');
});

test('target=_blank e Ctrl+clic diventano schede; il resto è negato',()=>{
  assert.equal(popupAction('https://light.gg','foreground-tab'),'tab');
  assert.equal(popupAction('https://light.gg','background-tab'),'tab');
  assert.equal(popupAction('about:blank','foreground-tab'),'deny');
  assert.equal(popupAction('file:///C:/x','new-window'),'deny');
});

test('permessi: schermo intero e copia sì, webcam e posizione no',()=>{
  assert.equal(isPermissionAllowed('fullscreen'),true);
  assert.equal(isPermissionAllowed('clipboard-sanitized-write'),true);
  assert.equal(isPermissionAllowed('media'),false);
  assert.equal(isPermissionAllowed('geolocation'),false);
  assert.equal(isPermissionAllowed('clipboard-read'),false);
});

test('lo user agent non dichiara Electron né il nome dell’app',()=>{
  const ua='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) personal-workspace-browser/0.5.0 Chrome/142.0.0.0 Electron/39.8.10 Safari/537.36';
  const clean=cleanUserAgent(ua,'personal-workspace-browser');
  assert.equal(clean,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36');
});

test('risorse: domini e URL sono indirizzi, le frasi no',()=>{
  assert.equal(looksLikeAddress('light.gg'),true);
  assert.equal(looksLikeAddress(' https://github.com/x '),true);
  assert.equal(looksLikeAddress('localhost:3000/api'),true);
  assert.equal(looksLikeAddress('build titano'),false);
  assert.equal(looksLikeAddress(''),false);
  assert.equal(looksLikeAddress(undefined),false);
});
