'use strict';

/**
 * Beta 0.35: quali toast compaiono. Ogni categoria del centro notifiche si può spegnere
 * (Impostazioni → Sistema → Notifiche); lo storico nel centro notifiche resta sempre.
 * Senza Electron, testato in test/toast-rules.test.cjs.
 */
const TOAST_CATEGORIES=['download','sito','jarvis','sistema'];
const TOAST_LABELS={download:'Download',sito:'Siti (password, permessi, preferiti)',jarvis:'JARVIS',sistema:'Sistema (workspace, aggiornamenti, telefono…)'};

/** Categoria di un toast: quella dichiarata, altrimenti download per i download e sistema per il resto. */
function categoryOf(entry){
  if(TOAST_CATEGORIES.includes(entry?.category))return entry.category;
  return String(entry?.id??'').startsWith('download')?'download':'sistema';
}

/** Impostazione salvata: tutte le categorie accese se non le spegni. */
function normalizeToastSettings(raw){
  const src=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  return Object.fromEntries(TOAST_CATEGORIES.map(c=>[c,src[c]!==false]));
}

/**
 * Il toast va mostrato? Le domande (ask: es. "Salvare la password?") e i toast forzati
 * compaiono sempre; gli altri solo se la loro categoria è accesa e non c'è la modalità zen.
 */
function shouldShow(toast,settings,{zen=false}={}){
  if(toast?.force)return true;
  if(zen)return false;
  if(toast?.ask)return true;
  return normalizeToastSettings(settings)[categoryOf(toast)];
}

module.exports={TOAST_CATEGORIES,TOAST_LABELS,categoryOf,normalizeToastSettings,shouldShow};
