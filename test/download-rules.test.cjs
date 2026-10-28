'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path');
const {safeFilename,uniquePath,nextStep}=require('../lib/download-rules.cjs');

test('nomi di file sicuri per Windows',()=>{
  assert.equal(safeFilename('Grimoire_Khvostov_7G-0X.jpg'),'Grimoire_Khvostov_7G-0X.jpg');
  const bs=String.fromCharCode(92); // barra rovesciata, il separatore di Windows
  assert.equal(safeFilename(['..','..','Windows','system.ini'].join(bs)),'system.ini');
  assert.equal(safeFilename('a:b*c?.txt'),'a_b_c_.txt');
  assert.equal(safeFilename(''),'download');
  assert.equal(safeFilename('..'),'download');
});

test('nome libero: file.jpg, file (1).jpg, file (2).jpg',()=>{
  const folder='C:\Downloads';
  const taken=new Set([path.join(folder,'file.jpg'),path.join(folder,'file (1).jpg')]);
  assert.equal(uniquePath(folder,'file.jpg',p=>taken.has(p)),path.join(folder,'file (2).jpg'));
  assert.equal(uniquePath(folder,'nuovo.zip',p=>taken.has(p)),path.join(folder,'nuovo.zip'));
});

test('risposta e fine del download, in qualunque ordine',()=>{
  // Rispondi "Salva" mentre scarica ancora: si aspetta la fine, poi si sposta.
  assert.equal(nextStep({decision:'save',finished:null}),'wait');
  assert.equal(nextStep({decision:'save',finished:'completed'}),'move');
  // Il download finisce prima della tua risposta: si aspetta la risposta.
  assert.equal(nextStep({decision:null,finished:'completed'}),'wait');
  // "Annulla": si interrompe se in corso, si cancella il file se già finito.
  assert.equal(nextStep({decision:'cancel',finished:null}),'cancel');
  assert.equal(nextStep({decision:'cancel',finished:'completed'}),'discard');
  // Download interrotto dal sito: niente da spostare.
  assert.equal(nextStep({decision:'save',finished:'interrupted'}),'none');
  assert.equal(nextStep({decision:null,finished:'cancelled'}),'none');
});
