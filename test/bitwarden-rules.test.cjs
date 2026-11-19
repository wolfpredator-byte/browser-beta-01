'use strict';
const test=require('node:test');
const assert=require('node:assert');
const R=require('../lib/bitwarden-rules.cjs');

test('pagine segrete: estensione Bitwarden e Vault web (Beta 0.46)',()=>{
  assert.strictEqual(R.isSecretUrl(`chrome-extension://${R.EXTENSION_ID}/popup/index.html#/login`),true);
  assert.strictEqual(R.isSecretUrl('chrome-extension://abcdefghijklmnopabcdefghijklmnop/popup.html'),false);
  assert.strictEqual(R.isSecretUrl('https://vault.bitwarden.com/#/vault'),true);
  assert.strictEqual(R.isSecretUrl('https://VAULT.bitwarden.eu/'),true);
  assert.strictEqual(R.isSecretUrl('https://bitwarden.com/download/'),false);
  assert.strictEqual(R.isSecretUrl('https://vault.bitwarden.com.evil.io/'),false);
  assert.strictEqual(R.isSecretUrl('non un indirizzo'),false);
});

test('CSV per Bitwarden: intestazione, virgolette, righe vuote saltate (Beta 0.46)',()=>{
  const csv=R.bitwardenCsv([
    {origin:'https://www.github.com',username:'mario',password:'a,b"c'},
    {origin:'https://x.it',username:'',password:''},
    {origin:'https://mail.example.com',username:'m@e.com',password:'semplice'},
  ]);
  const lines=csv.trim().split('\r\n');
  assert.strictEqual(lines[0],'folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp');
  assert.strictEqual(lines.length,3);
  assert.strictEqual(lines[1],'VARCO,,login,github.com,,,0,https://www.github.com,mario,"a,b""c",');
  assert.strictEqual(lines[2],'VARCO,,login,mail.example.com,,,0,https://mail.example.com,m@e.com,semplice,');
});
