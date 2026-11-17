'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const D=require('../lib/dev-server-rules.cjs');

const local=t=>D.pickUrl(D.urlsFromLog(t)).url;

test('indirizzi dai log dei tool più usati',()=>{
  assert.equal(local('  ➜  Local:   http://localhost:5173/\n  ➜  Network: http://192.168.1.20:5173/'),'http://localhost:5173/'); // Vite
  assert.equal(D.pickUrl(D.urlsFromLog('  ➜  Network: http://192.168.1.20:5173/')).network,'http://192.168.1.20:5173/');
  assert.equal(local('   ▲ Next.js 15.0.0\n   - Local:        http://localhost:3000\n   - Network:      http://10.0.0.5:3000'),'http://localhost:3000/'); // Next
  assert.equal(local('ready - started server on 0.0.0.0:3000, url: http://localhost:3000'),'http://localhost:3000/');
  assert.equal(local('** Angular Live Development Server is listening on localhost:4200, open your browser on http://localhost:4200/ **'),'http://localhost:4200/');
  assert.equal(local('Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...'),'http://localhost:8000/'); // Python
  assert.equal(local('Starting development server at http://127.0.0.1:8000/'),'http://127.0.0.1:8000/'); // Django
  assert.equal(local(' * Running on http://127.0.0.1:5000'),'http://127.0.0.1:5000/'); // Flask
  assert.equal(local('Server listening on port 3001'),'http://localhost:3001/');      // Express senza indirizzo
  assert.equal(local('Web Server is available at http://localhost:1313/ (bind address 127.0.0.1)'),'http://localhost:1313/'); // Hugo
  assert.equal(local('[Thu Nov 17 10:00:00 2026] PHP 8.3 Development Server (http://localhost:8000) started'),'http://localhost:8000/');
  assert.equal(local('  - Local:        https://localhost:3000'),'https://localhost:3000/'); // https locale
  assert.equal(local('\u001b[32m  Local:\u001b[39m http://localhost:\u001b[1m4321\u001b[22m/'),'http://localhost:4321/'); // Astro con i colori: tolti, l'indirizzo torna intero
  assert.equal(local('compiled successfully'),null);
  assert.equal(local('see https://nextjs.org/docs for more'),null);             // link a siti esterni: ignorati
});

test('porte in ascolto → indirizzo (le porte di servizio vengono dopo)',()=>{
  assert.equal(D.urlFromPorts([9229,5173]),'http://localhost:5173/');
  assert.equal(D.urlFromPorts([24678,3000]),'http://localhost:3000/');
  assert.equal(D.urlFromPorts([3000],{https:true}),'https://localhost:3000/');
  assert.equal(D.urlFromPorts([4000,3000],{preferPort:4000}),'http://localhost:4000/');
  assert.equal(D.urlFromPorts([]),null);
});

test('errori riconosciuti',()=>{
  assert.deepEqual(D.errorFromLine('Error: listen EADDRINUSE: address already in use :::3000'),{code:'port',port:3000,text:'La porta 3000 è già usata da un altro programma.'});
  assert.equal(D.errorFromLine("'vite' is not recognized as an internal or external command,").code,'missing');
  assert.match(D.errorFromLine("'vite' non è riconosciuto come comando interno o esterno,").text,/vite/);
  assert.equal(D.errorFromLine("Error: Cannot find module 'express'").code,'deps');
  assert.equal(D.errorFromLine('npm ERR! missing script: dev').code,'script');
  assert.equal(D.errorFromLine('Failed to compile.').soft,true);
  assert.equal(D.errorFromLine('ready in 300 ms'),null);
  assert.equal(D.portChanged('Port 5173 is in use, trying another one...'),true);
});

test('stato per il pannello',()=>{
  assert.equal(D.phaseLabel(null),'Fermo');
  assert.equal(D.phaseLabel({phase:'waiting',url:'http://localhost:5173/'}),'In attesa di localhost:5173…');
  assert.equal(D.phaseLabel({phase:'ready',url:'http://localhost:5173/'}),'Pronto · localhost:5173');
  assert.equal(D.phaseLabel({phase:'error',error:{text:'La porta 3000 è già usata da un altro programma.'}}),'La porta 3000 è già usata da un altro programma.');
  assert.equal(D.nextFreePort(5173,[5174,5175]),5176);
});
