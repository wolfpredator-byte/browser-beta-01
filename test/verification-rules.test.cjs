'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const v=require('../lib/verification-rules.cjs');

test('servizi di verifica riconosciuti (domini e sottodomini, reCAPTCHA solo nel suo percorso)',()=>{
  for(const url of ['https://challenges.cloudflare.com/cdn-cgi/challenge-platform/h/b/turnstile/f/x','https://newassets.hcaptcha.com/captcha/v1/a/static/',
    'https://www.google.com/recaptcha/api2/anchor?k=1','https://www.gstatic.com/recaptcha/releases/x/recaptcha__it.js','https://www.recaptcha.net/recaptcha/api.js',
    'https://client-api.arkoselabs.com/fc/gt2/','https://static.geetest.com/v4/gt4.js','https://geo.captcha-delivery.com/captcha/','https://x.awswaf.com/captcha.js'])
    assert.equal(v.isVerificationUrl(url),true,url);
  for(const url of ['https://www.google.com/search?q=recaptcha','https://cloudflare.com/','https://evilhcaptcha.com/','https://example.com/recaptcha/','file:///C:/x','nonsense'])
    assert.equal(v.isVerificationUrl(url),false,url);
});

test('page-preload.cjs ha la stessa lista (non può importare il file)',()=>{
  const preload=fs.readFileSync(path.join(__dirname,'..','page-preload.cjs'),'utf8');
  for(const h of v.VERIFY_HOSTS)assert.ok(preload.includes(`'${h}'`),'manca in page-preload: '+h);
  assert.ok(preload.includes('/recaptcha/'),'manca il percorso di reCAPTCHA in page-preload');
});
