'use strict';
const test=require('node:test');
const assert=require('node:assert');
const R=require('../lib/external-protocol-rules.cjs');

test('link verso le app: quali sono esterni e quali bloccati (Beta 0.46.2)',()=>{
  assert.strictEqual(R.schemeOf('steam://openurl/https://x'),'steam');
  assert.strictEqual(R.schemeOf('NomeGioco://login?token=1'),'nomegioco');
  assert.strictEqual(R.isExternal('nomegioco://login?token=1'),true);
  assert.strictEqual(R.isExternal('discord://-/channels'),true);
  assert.strictEqual(R.isExternal('mailto:a@b.it'),true);
  assert.strictEqual(R.isExternal('https://store.steampowered.com'),false);
  assert.strictEqual(R.isExternal('chrome-extension://abc/popup.html'),false);
  assert.strictEqual(R.isExternal('about:blank'),false);
  assert.strictEqual(R.isExternal(''),false);
  assert.strictEqual(R.isBlocked('ms-msdt:/id PCWDiagnostic'),true);
  assert.strictEqual(R.isBlocked('search-ms:query=x'),true);
  assert.strictEqual(R.isBlocked('steam://run/440'),false);
});

test('consenti sempre per un sito: salvato, pulito, mai per i tipi bloccati (Beta 0.46.2)',()=>{
  let a=R.allow({},'https://www.giocoesempio.com','nomegioco');
  assert.strictEqual(R.isAllowed(a,'https://www.giocoesempio.com','nomegioco'),true);
  assert.strictEqual(R.isAllowed(a,'https://altro.com','nomegioco'),false);
  assert.strictEqual(R.isAllowed(a,'https://www.giocoesempio.com','steam'),false);
  a=R.allow(a,'https://www.giocoesempio.com','ms-msdt');
  assert.deepStrictEqual(a,{'https://www.giocoesempio.com':['nomegioco']});
  assert.deepStrictEqual(R.normalizeAllowed({'non un sito':['steam'],'https://x.it':['steam','https','steam',5]}),{'https://x.it':['steam']});
  assert.strictEqual(R.shortUrl('nomegioco://'+'a'.repeat(200)).length,88);
});
