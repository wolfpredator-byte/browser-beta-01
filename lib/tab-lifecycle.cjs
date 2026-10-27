'use strict';

/**
 * Decide quando chiudere la finestra del browser.
 *
 * @param {Array<{workspace:string}>} tabs - Tutte le schede, anche di altri workspace.
 * @param {string} workspace - Workspace attualmente selezionato.
 * @returns {boolean} true se NON rimane alcuna scheda visibile in quel workspace.
 *
 * Perché: una scheda di Destiny Builder non deve impedire la chiusura della
 * finestra quando hai appena chiuso l'ultima scheda di Personale.
 * Non eliminiamo le schede degli altri workspace: verranno ripristinate.
 */
function shouldCloseWindow(tabs, workspace) {
  return !tabs.some(tab => tab.workspace === workspace);
}

/**
 * Rimpiazza la Home con la nuova scheda web appena creata.
 *
 * @param {Array<{id:number,workspace:string,isHome:boolean}>} tabs - Schede vive.
 * @param {number} homeId - Identificatore della vecchia scheda Home.
 * @param {number|null} webId - Identificatore creato da newTab().
 * @param {string} workspace - Workspace nel quale avviene la ricerca.
 * @returns {boolean} true se la Home è stata davvero sostituita.
 *
 * La funzione modifica l'array in memoria, ma non cambia file sul disco:
 * persistTabs() viene chiamata dal processo principale dopo la sostituzione.
 * Se la nuova scheda non è stata creata, lascia la Home invariata.
 */
function discardHomeAfterNavigation(tabs, homeId, webId, workspace) {
  // Non possiamo eliminare Home finché non esiste una nuova scheda web.
  const newWeb = tabs.find(tab =>
    tab.id === webId && tab.workspace === workspace && !tab.isHome
  );
  if (!newWeb) return false;

  // Verifica di rimuovere esattamente Home e non una scheda con ID differente.
  const homeIndex = tabs.findIndex(tab =>
    tab.id === homeId && tab.workspace === workspace && tab.isHome
  );
  if (homeIndex === -1) return false;

  // Rimuove una sola scheda. Le schede degli altri workspace restano intatte.
  tabs.splice(homeIndex, 1);
  return true;
}

module.exports = { shouldCloseWindow, discardHomeAfterNavigation };
