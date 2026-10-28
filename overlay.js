'use strict';
// Toast VARCO (Beta 0.14). Riceve {id, kind, title, text, progress, actions, timeout}
// dal processo principale; stesso id = aggiorna il toast esistente.
const stack=document.getElementById('stack');
const MAX=4;
const ICONS={download:'download',success:'check',error:'warning',undo:'tab-reopen',bookmark:'bookmark-filled',info:'info'};
const timers=new Map();

const icon=name=>{const i=document.createElement('span');i.className='i';i.style.setProperty('--i',`url(assets/icons/${name}.svg)`);return i;};
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};

/** Il processo principale ridimensiona il livello all'altezza dei toast: fuori da lì i clic vanno al sito. */
function report(){window.overlayAPI.resize(stack.childElementCount?stack.scrollHeight+4:0);}
new ResizeObserver(report).observe(stack);

function dismiss(id){
  const node=stack.querySelector(`[data-id="${CSS.escape(id)}"]`);
  clearTimeout(timers.get(id));timers.delete(id);
  if(!node||node.classList.contains('leaving'))return;
  node.classList.add('leaving');
  node.addEventListener('animationend',()=>{node.remove();report();},{once:true});
  setTimeout(()=>{node.remove();report();},300); // con le animazioni disattivate
}

function render(t){
  const node=el('div','toast '+(t.kind||'info'));
  node.dataset.id=t.id;
  const badge=el('div','badge');badge.append(icon(ICONS[t.kind]||'info'));
  const body=el('div','body');
  body.append(el('div','title',t.title||''));
  if(t.text)body.append(el('div','text',t.text));
  if(t.kind==='download'){
    const bar=el('div','bar'+(t.progress===null||t.progress===undefined?' unknown':''));
    const fill=el('i');if(typeof t.progress==='number')fill.style.width=t.progress+'%';
    bar.append(fill);body.append(bar);
  }
  if(t.actions?.length){
    const row=el('div','actions');
    for(const a of t.actions){
      const b=el('button','',a.label);
      b.onclick=async()=>{dismiss(t.id);await window.overlayAPI.action(a.command,a.args||{});};
      row.append(b);
    }
    body.append(row);
  }
  const close=el('button','close');close.title='Chiudi';close.setAttribute('aria-label','Chiudi');close.append(icon('close'));
  close.onclick=()=>dismiss(t.id);
  node.append(badge,body,close);
  return node;
}

window.overlayAPI.onToast(t=>{
  if(!t||!t.id)return;
  const old=stack.querySelector(`[data-id="${CSS.escape(t.id)}"]`);
  const node=render(t);
  if(old&&!old.classList.contains('leaving')){node.style.animation='none';old.replaceWith(node);}
  else{old?.remove();stack.append(node);}
  // Al massimo 4 toast: i più vecchi lasciano il posto.
  while(stack.childElementCount>MAX)dismiss(stack.firstElementChild.dataset.id);
  clearTimeout(timers.get(t.id));
  if(t.timeout)timers.set(t.id,setTimeout(()=>dismiss(t.id),t.timeout));
  // Passandoci sopra il mouse il toast non sparisce.
  node.onmouseenter=()=>clearTimeout(timers.get(t.id));
  node.onmouseleave=()=>{if(t.timeout)timers.set(t.id,setTimeout(()=>dismiss(t.id),2500));};
  report();
});
