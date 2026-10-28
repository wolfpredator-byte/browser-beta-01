'use strict';

/**
 * Script eseguito prima delle pagine web (non della cornice), in un mondo isolato.
 * Fa UNA sola cosa e solo sulle pagine di accesso di Google: completa l'identità
 * "Firefox" (vedi FIREFOX_UA in lib/web-rules.cjs) togliendo navigator.userAgentData,
 * che Firefox non ha e che rivelerebbe Chromium. Su tutti gli altri siti non fa nulla.
 */
const {contextBridge}=require('electron');

if(location.hostname==='accounts.google.com'){
  contextBridge.executeInMainWorld({func:()=>{
    try{Object.defineProperty(Navigator.prototype,'userAgentData',{get:()=>undefined,configurable:true});}catch{}
  }});
}
