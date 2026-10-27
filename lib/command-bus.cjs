'use strict';

/**
 * Bus dei comandi: ogni azione del browser ha un nome, uno schema dei
 * parametri e una funzione. Interfaccia, scorciatoie e (in futuro) rilevatore
 * di giochi e JARVIS chiamano tutti `dispatch`, così le regole sono scritte una volta.
 * Non importa Electron: si può verificare con `node --test`.
 */

/**
 * Tipi ammessi nello schema. Un '?' finale rende il campo facoltativo.
 * Un array di stringhe significa "solo uno di questi valori".
 */
const CHECKS={
  int:value=>Number.isInteger(value),
  string:value=>typeof value==='string',
  bool:value=>typeof value==='boolean'
};

/**
 * Valida e copia soltanto i campi dichiarati: i campi in più vengono scartati,
 * così un chiamante non può far arrivare dati inattesi alla funzione.
 * @returns {{ok:true,args:object}|{ok:false,error:string}}
 */
function validateArgs(schema,input){
  if(input===undefined||input===null)input={};
  if(typeof input!=='object'||Array.isArray(input))return {ok:false,error:'parametri non validi'};
  const args={};
  for(const [key,rule] of Object.entries(schema)){
    const value=input[key];
    if(Array.isArray(rule)){
      if(!rule.includes(value))return {ok:false,error:`${key}: valore non ammesso`};
      args[key]=value;continue;
    }
    const optional=rule.endsWith('?'),type=optional?rule.slice(0,-1):rule;
    if(value===undefined){
      if(optional)continue;
      return {ok:false,error:`${key}: obbligatorio`};
    }
    if(!CHECKS[type]?.(value))return {ok:false,error:`${key}: atteso ${type}`};
    args[key]=value;
  }
  return {ok:true,args};
}

function createCommandBus(){
  const registry=new Map();
  return {
    /**
     * @param {string} name - Nome del comando, es. 'newTab'.
     * @param {{args?:object,description?:string,run:Function}} definition
     */
    register(name,{args={},description='',run}){
      if(registry.has(name))throw Error('Comando già registrato: '+name);
      if(typeof run!=='function')throw Error('Comando senza run: '+name);
      registry.set(name,{args,description,run});
    },
    /**
     * Esegue un comando. Non lancia mai eccezioni verso il chiamante:
     * restituisce sempre {ok, result} oppure {ok:false, error}.
     * @param {object} context - Chi chiama e da quale finestra (es. {window, source:'ui'}).
     */
    async dispatch(name,input,context={}){
      const command=typeof name==='string'?registry.get(name):null;
      if(!command)return {ok:false,error:'comando sconosciuto: '+name};
      const checked=validateArgs(command.args,input);
      if(!checked.ok)return checked;
      try{return {ok:true,result:await command.run(context,checked.args)};}
      catch(error){
        console.error(`Comando ${name} fallito`,error);
        return {ok:false,error:String(error?.message||error)};
      }
    },
    /** Elenco descrittivo: servirà a esporre i comandi a JARVIS. */
    list(){return [...registry].map(([name,{args,description}])=>({name,args,description}));},
    has(name){return registry.has(name);}
  };
}

module.exports={createCommandBus,validateArgs};
