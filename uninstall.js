'use strict';
// Finestra di disinstallazione: conferma, poi esito.
const $=id=>document.getElementById(id);
const running=new URLSearchParams(location.search).get('running')==='1';
$('running').hidden=!running;
$('go').disabled=running;
const close=()=>window.uninstallAPI.close();
$('x').onclick=close;$('cancel').onclick=close;$('close').onclick=close;
$('go').onclick=async()=>{
  $('go').disabled=true;$('cancel').disabled=true;
  const deleteData=$('data').checked;
  const result=await window.uninstallAPI.run({deleteData});
  $('ask').hidden=true;$('done').hidden=false;
  $('doneText').textContent=(deleteData?'Anche i tuoi dati sono stati eliminati.':'I tuoi dati restano: reinstallando VARCO ritroverai tutto.')+
    (result.dir?' La cartella del programma verrà cancellata quando chiudi questa finestra.':'');
};
