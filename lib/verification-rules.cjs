'use strict';

/**
 * Beta 0.37.2 — servizi di verifica "sei umano?" (CAPTCHA, controlli anti-bot prima di un download).
 *
 * Su questi indirizzi VARCO non deve cambiare nulla:
 *  - il blocco pubblicità non blocca le loro richieste (alcune liste di filtri le colpiscono);
 *  - page-preload.cjs non aggancia funzioni del browser nei loro riquadri (lettore multimediale,
 *    notifiche): questi servizi controllano proprio che il browser non sia stato modificato.
 * page-preload.cjs gira isolato e non può importare questo file: tiene una copia dell'elenco
 * (test/verification-rules.test.cjs controlla che siano uguali).
 */
const VERIFY_HOSTS=[
  'challenges.cloudflare.com',              // Cloudflare Turnstile e "Verifica di essere umano"
  'hcaptcha.com',                           // hCaptcha (anche newassets., api., imgs. …)
  'recaptcha.net',                          // reCAPTCHA fuori da google.com
  'arkoselabs.com','funcaptcha.com',        // Arkose Labs / FunCaptcha (Microsoft, Roblox, EA…)
  'geetest.com',                            // GeeTest
  'captcha-delivery.com','datadome.co',     // DataDome
  'perimeterx.net','px-cdn.net','px-cloud.net', // HUMAN / PerimeterX
  'awswaf.com',                             // AWS WAF CAPTCHA
  'frcapi.com','friendlycaptcha.com',       // Friendly Captcha
  'mtcaptcha.com'                           // MTCaptcha
];
/** reCAPTCHA vive su domini condivisi con altro: conta solo il percorso /recaptcha/. */
const VERIFY_PATHS=[['www.google.com','/recaptcha/'],['google.com','/recaptcha/'],['www.gstatic.com','/recaptcha/']];

function isVerificationUrl(url){
  let u;try{u=new URL(url);}catch{return false;}
  if(!/^https?:$/.test(u.protocol))return false;
  const host=u.hostname.toLowerCase();
  if(VERIFY_HOSTS.some(h=>host===h||host.endsWith('.'+h)))return true;
  return VERIFY_PATHS.some(([h,p])=>host===h&&u.pathname.startsWith(p));
}

module.exports={VERIFY_HOSTS,VERIFY_PATHS,isVerificationUrl};
