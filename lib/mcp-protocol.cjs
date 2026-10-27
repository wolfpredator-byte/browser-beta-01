'use strict';

/**
 * Protocollo MCP (Model Context Protocol) per JARVIS, senza Electron.
 *
 * MCP è JSON-RPC 2.0: il client (JARVIS) chiede `initialize`, poi
 * `tools/list` per sapere cosa può fare e `tools/call` per farlo.
 * Qui c'è solo la logica dei messaggi; il trasporto HTTP è in jarvis.cjs.
 * Implementiamo il sottoinsieme che serve: strumenti, niente risorse né prompt.
 */

/** Versioni del protocollo supportate, dalla più recente. */
const PROTOCOL_VERSIONS=['2025-06-18','2025-03-26','2024-11-05'];

const ERRORS={parse:-32700,invalidRequest:-32600,methodNotFound:-32601,invalidParams:-32602,internal:-32603};

const rpcError=(id,code,message)=>({jsonrpc:'2.0',id:id??null,error:{code,message}});
const rpcResult=(id,result)=>({jsonrpc:'2.0',id,result});

/**
 * Valida gli argomenti di uno strumento con un sottoinsieme di JSON Schema:
 * type object, properties con type string/integer/number/boolean, enum,
 * minimum/maximum, maxLength, required. Le proprietà non dichiarate sono rifiutate.
 * @returns {string|null} messaggio di errore, o null se va bene.
 */
function validateArguments(schema,args){
  if(args===undefined||args===null)args={};
  if(typeof args!=='object'||Array.isArray(args))return 'arguments deve essere un oggetto';
  const properties=schema.properties||{};
  for(const key of Object.keys(args))if(!properties[key])return `argomento sconosciuto: ${key}`;
  for(const key of schema.required||[])if(args[key]===undefined)return `argomento obbligatorio: ${key}`;
  for(const [key,rule] of Object.entries(properties)){
    const value=args[key];
    if(value===undefined)continue;
    const ok=rule.type==='integer'?Number.isInteger(value):rule.type==='number'?Number.isFinite(value):typeof value===rule.type;
    if(!ok)return `${key}: atteso ${rule.type}`;
    if(rule.enum&&!rule.enum.includes(value))return `${key}: valori ammessi ${rule.enum.join(', ')}`;
    if(rule.minimum!==undefined&&value<rule.minimum)return `${key}: minimo ${rule.minimum}`;
    if(rule.maximum!==undefined&&value>rule.maximum)return `${key}: massimo ${rule.maximum}`;
    if(rule.maxLength!==undefined&&value.length>rule.maxLength)return `${key}: al massimo ${rule.maxLength} caratteri`;
  }
  return null;
}

/**
 * Risultato di uno strumento nel formato MCP: testo (per qualunque client) e
 * structuredContent (dati già pronti, per i client 2025-06-18).
 */
function toolResult(value,isError=false){
  const text=typeof value==='string'?value:JSON.stringify(value,null,2);
  const result={content:[{type:'text',text}],isError};
  if(!isError&&value&&typeof value==='object'&&!Array.isArray(value))result.structuredContent=value;
  return result;
}

/**
 * @param {object} options
 * @param {{name:string,version:string}} options.serverInfo
 * @param {string} [options.instructions] - Spiegazione per il modello che usa gli strumenti.
 * @param {() => Array<{name,title?,description,inputSchema,run:(args,meta)=>any}>} options.tools
 * @param {(event:{tool:string,ok:boolean,error?:string}) => void} [options.onActivity]
 */
function createMcpHandler({serverInfo,instructions,tools,onActivity=()=>{}}){
  /**
   * Gestisce UN messaggio JSON-RPC.
   * @param {object} message
   * @param {object} meta - Informazioni sulla richiesta (es. sessione), passate agli strumenti.
   * @returns {Promise<object|null>} la risposta, oppure null per le notifiche (senza id).
   */
  async function handle(message,meta={}){
    if(!message||typeof message!=='object'||message.jsonrpc!=='2.0')
      return rpcError(message?.id,ERRORS.invalidRequest,'Richiesta JSON-RPC non valida');
    const {id,method,params}=message;
    const isNotification=id===undefined;
    // Le risposte del client (es. a una nostra richiesta) e le notifiche non hanno risposta.
    if(method===undefined)return null;
    if(isNotification)return null; // notifications/initialized, notifications/cancelled…
    switch(method){
      case 'initialize':{
        const requested=params?.protocolVersion;
        // Se il client parla una versione che conosciamo la usiamo, altrimenti proponiamo la nostra.
        const protocolVersion=PROTOCOL_VERSIONS.includes(requested)?requested:PROTOCOL_VERSIONS[0];
        return rpcResult(id,{protocolVersion,capabilities:{tools:{listChanged:false}},serverInfo,
          ...(instructions?{instructions}:{})});
      }
      case 'ping':return rpcResult(id,{});
      case 'tools/list':
        return rpcResult(id,{tools:tools().map(({name,title,description,inputSchema})=>({name,...(title?{title}:{}),description,inputSchema}))});
      case 'tools/call':{
        const name=params?.name;
        const tool=tools().find(t=>t.name===name);
        if(!tool)return rpcError(id,ERRORS.invalidParams,`Strumento sconosciuto: ${name}`);
        const invalid=validateArguments(tool.inputSchema,params.arguments);
        if(invalid){onActivity({tool:name,ok:false,error:invalid});return rpcResult(id,toolResult(invalid,true));}
        try{
          const value=await tool.run(params.arguments||{},meta);
          onActivity({tool:name,ok:true});
          return rpcResult(id,toolResult(value??{ok:true}));
        }catch(error){
          // Un errore dello strumento è un risultato con isError: il modello lo legge e può correggersi.
          const text=String(error?.message||error);
          onActivity({tool:name,ok:false,error:text});
          return rpcResult(id,toolResult(text,true));
        }
      }
      default:return rpcError(id,ERRORS.methodNotFound,`Metodo non supportato: ${method}`);
    }
  }
  return {handle};
}

/**
 * Controlli di sicurezza su una richiesta HTTP prima di leggere il corpo.
 * - Host: solo 127.0.0.1/localhost con la nostra porta (difesa dal "DNS rebinding":
 *   un sito che fa puntare il suo dominio al tuo PC).
 * - Origin: le pagine web inviano sempre Origin; JARVIS (Python) no. Accettiamo
 *   solo assenza di Origin oppure un'origine locale.
 * - Authorization: "Bearer <token>" letto dal file di configurazione.
 * @returns {{status:number,error:string}|null}
 */
function checkHttpRequest({method,host,origin,authorization},{port,token}){
  const allowedHosts=[`127.0.0.1:${port}`,`localhost:${port}`];
  if(!allowedHosts.includes(String(host||'').toLowerCase()))return {status:403,error:'Host non consentito'};
  if(origin&&!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(origin))return {status:403,error:'Origine non consentita'};
  if(authorization!==`Bearer ${token}`)return {status:401,error:'Token mancante o non valido'};
  if(method!=='POST')return {status:405,error:'Usa POST (nessuno stream SSE disponibile)'};
  return null;
}

module.exports={createMcpHandler,validateArguments,toolResult,checkHttpRequest,PROTOCOL_VERSIONS,ERRORS};
