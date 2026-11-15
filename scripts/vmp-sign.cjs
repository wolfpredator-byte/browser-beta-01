'use strict';

/**
 * Beta 0.37 — firma VMP (Widevine) del motore di VARCO, durante `npm run setup`.
 *
 * Netflix, Prime Video, Disney+ (e a volte Spotify) riproducono solo se l'eseguibile ha una firma VMP
 * valida. castLabs la fa gratis con il servizio EVS: serve un account, creato una volta sola con
 *   python -m pip install --upgrade castlabs-evs
 *   python -m castlabs_evs.account signup
 * e poi `python -m castlabs_evs.account reauth` quando l'accesso scade.
 *
 * electron-builder chiama questo file dopo aver preparato la cartella dell'installer (hook afterSign:
 * su Windows la firma VMP va fatta DOPO ogni altra modifica dell'eseguibile, icona compresa).
 * Firma "VARCO Setup.exe" → "VARCO Setup.exe.sig"; l'installer lo copia come VARCO.exe.sig.
 * Se EVS non è configurato, l'installer si costruisce lo stesso, senza firma: Widevine funziona,
 * ma i servizi che chiedono la firma possono rifiutare la riproduzione.
 */
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');

function python(){
  for(const cmd of ['python','py'])try{execFileSync(cmd,['--version'],{stdio:'ignore'});return cmd;}catch{}
  return null;
}

module.exports=async function vmpSign(context){
  const dir=context.appOutDir;
  const py=python();
  if(!py){console.warn('  ⚠ Firma VMP saltata: Python non trovato.');return;}
  try{execFileSync(py,['-c','import castlabs_evs'],{stdio:'ignore'});}
  catch{console.warn('  ⚠ Firma VMP saltata: manca castlabs-evs (python -m pip install --upgrade castlabs-evs).');return;}
  try{
    execFileSync(py,['-m','castlabs_evs.vmp','sign-pkg',dir],{stdio:'inherit'});
  }catch{
    console.warn('  ⚠ Firma VMP non riuscita: crea o rinnova l\'account EVS (python -m castlabs_evs.account signup, oppure reauth).');
    return;
  }
  const sigs=fs.readdirSync(dir).filter(f=>f.endsWith('.exe.sig'));
  console.log('  ✔ Firma VMP:',sigs.join(', ')||'(nessun file .sig?)');
  try{execFileSync(py,['-m','castlabs_evs.vmp','verify-pkg',dir],{stdio:'inherit'});}catch{console.warn('  ⚠ Verifica della firma VMP non riuscita.');}
};
