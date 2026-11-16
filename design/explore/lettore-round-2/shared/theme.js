/* Selettore del tema nella barra degli stati (Cyan Flash = il tuo, VARCO = viola). Si ricorda tra le varianti. */
(function(){
  let theme='cyan';try{theme=localStorage.getItem('lettore-theme')||'cyan';}catch{}
  document.documentElement.dataset.theme=theme;
  addEventListener('DOMContentLoaded',()=>setTimeout(()=>{
    const bar=document.querySelector('.vf-states');if(!bar)return;
    bar.insertAdjacentHTML('beforeend','<i class="sep"></i><b>Tema</b><button data-t="cyan">Cyan Flash</button><button data-t="varco">VARCO viola</button>');
    const sync=()=>bar.querySelectorAll('[data-t]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.t===document.documentElement.dataset.theme));
    bar.addEventListener('click',e=>{const b=e.target.closest('[data-t]');if(!b)return;e.stopPropagation();document.documentElement.dataset.theme=b.dataset.t;try{localStorage.setItem('lettore-theme',b.dataset.t);}catch{}sync();});
    sync();
  },0));
})();
