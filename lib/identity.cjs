'use strict';

/**
 * Beta 0.37.2 — un'identità sola in tutto il browser.
 *
 * Fino alla 0.37.1 VARCO si presentava come un browser normale (Chrome, senza "Electron/…") solo
 * per la pagina principale: i riquadri che girano in un processo a parte (per esempio la verifica di
 * Cloudflare dentro un sito) prendevano l'identità che Electron ha all'avvio, quella grezza con
 * "personal-workspace-browser/… Electron/…". Due identità diverse nella stessa pagina sono il segnale
 * più forte di "browser sospetto": le verifiche fallivano.
 *
 * Qui, PRIMA che parta qualsiasi pagina, l'identità di riserva diventa quella pulita. L'originale resta
 * disponibile per il login Google, che la vuole apposta (vedi web-rules.cjs → userAgentFor).
 */
const {app}=require('electron');
const {cleanUserAgent}=require('./web-rules.cjs');

let original=null;

/** Da chiamare all'avvio, prima di app.ready. */
function applyAtStartup(){
  if(original)return;
  original=app.userAgentFallback;
  app.userAgentFallback=cleanUserAgent(original,app.getName());
}
/** L'identità originale di Electron (con "Electron/…"), solo per il login Google. */
const originalUserAgent=()=>original||app.userAgentFallback;

module.exports={applyAtStartup,originalUserAgent};
