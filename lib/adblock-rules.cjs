'use strict';

/**
 * Filtri cosmetici nel frame giusto (Beta 0.36).
 *
 * La libreria @ghostery esegue gli "scriptlet" con event.sender.executeJavaScript,
 * cioè sempre nel frame PRINCIPALE della scheda, anche quando a chiederli è un
 * iframe. Su YouTube (molti iframe) gli stessi scriptlet finivano iniettati più
 * volte nella pagina: "Identifier 'JSONPath' has already been declared",
 * ricorsione infinita e niente player (schermo nero al click sul video).
 *
 * Qui costruiamo un finto "sender" da passare alla libreria che esegue script e
 * stili nel frame che li ha chiesti (event.senderFrame), una volta sola per
 * documento.
 */

/**
 * Ogni scriptlet arriva come script "nudo": quelli json-edit dichiarano tutti
 * `class JSONPath` al livello globale, quindi dal secondo in poi la pagina dà
 * "Identifier 'JSONPath' has already been declared" e l'intercettazione resta
 * a metà (ricorsione infinita, player di YouTube che non parte). Racchiuso in un
 * blocco { } ognuno ha le sue class/let/const; `var scriptletGlobals` resta
 * comunque condiviso.
 */
const isolate=code=>`{
${code}
}`;

const STYLE_JS=css=>`(()=>{const s=document.createElement('style');s.textContent=${JSON.stringify(css)};(document.head||document.documentElement).appendChild(s);})();`;

/**
 * event: l'evento IPC (sender = webContents, senderFrame = WebFrameMain).
 * seen: Set condiviso dove ricordare i documenti già serviti.
 * Restituisce un evento con lo stesso frameId/processId ma un sender "di frame",
 * oppure null se il frame non c'è più o ha già ricevuto i suoi script.
 */
function frameEvent(event,url,msg,seen){
  const frame=event.senderFrame;
  if(!frame||frame.isDestroyed?.())return null;
  const main=frame===event.sender.mainFrame||!frame.parent;
  // Solo la prima richiesta (msg undefined) porta gli scriptlet: una volta per documento.
  if(msg===undefined){
    const key=`${frame.processId}:${frame.routingId}:${url}`;
    if(seen.has(key))return null;
    seen.add(key);
    if(seen.size>2000)seen.delete(seen.values().next().value);
  }
  const run=code=>{try{const p=frame.executeJavaScript(code,true);p?.catch?.(()=>{});}catch{}};
  const sender={
    getURL:()=>frame.url||url,
    executeJavaScript:code=>run(isolate(code)),
    insertCSS:(css,options)=>main?event.sender.insertCSS(css,options):run(STYLE_JS(css)),
  };
  return {frameId:event.frameId,processId:event.processId,sender,senderFrame:frame};
}

module.exports={frameEvent,isolate,STYLE_JS};
