'use strict';

/**
 * Script eseguito prima delle pagine web (non della cornice), in un mondo isolato.
 * Agisce SOLO sulle pagine di accesso di Google; su tutti gli altri siti non fa nulla.
 * - Completa l'identità "Firefox" (vedi FIREFOX_UA in lib/web-rules.cjs) togliendo
 *   navigator.userAgentData, che Firefox non ha e che rivelerebbe Chromium.
 * - Nasconde le passkey (WebAuthn): Google prova subito l'accesso con passkey, che
 *   in Electron fallisce con la finestra "Sicurezza di Windows". Senza, Google usa
 *   il flusso classico email + password (+ verifica in due passaggi sul telefono).
 */
const {contextBridge}=require('electron');

if(location.hostname==='accounts.google.com'){
  contextBridge.executeInMainWorld({func:()=>{
    try{Object.defineProperty(Navigator.prototype,'userAgentData',{get:()=>undefined,configurable:true});}catch{}
    try{delete window.PublicKeyCredential;}catch{}
    try{
      // navigator.credentials resta (serve anche alle password), ma senza passkey.
      const credentials=navigator.credentials;
      if(credentials){
        const refuse=()=>Promise.reject(new DOMException('Passkey non disponibili in questo browser','NotAllowedError'));
        credentials.get=options=>options&&options.publicKey?refuse():CredentialsContainer.prototype.get.call(credentials,options);
        credentials.create=options=>options&&options.publicKey?refuse():CredentialsContainer.prototype.create.call(credentials,options);
      }
    }catch{}
  }});
}
