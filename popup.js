'use strict';
// Menu e dialoghi VARCO (Beta 0.15). Riceve la descrizione da lib/popup.cjs e
// risponde solo con numeri: le azioni restano nel processo principale.
const root=document.getElementById('root');
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const icon=name=>{const i=el('span','i');i.style.setProperty('--i',`url(assets/icons/${name}.svg)`);return i;};

let menus=[];   // [{node, items, active}] dal menu principale ai sottomenu aperti
let mode=null;

function close(){root.replaceChildren();menus=[];mode=null;}
window.popupAPI.onClose(close);
window.popupAPI.onOpen(message=>{
  close();mode=message.kind;
  if(message.kind==='menu')openMenu(message.items,message.x,message.y,0);
  else openDialog(message);
});

// ── Menu ─────────────────────────────────────────────────────────────────
/** Mette il menu dentro la finestra: se non ci sta a destra o in basso, si gira. */
function place(node,x,y,parentRect){
  root.append(node);
  const r=node.getBoundingClientRect(),W=innerWidth,H=innerHeight;
  let left=x,top=y;
  if(parentRect){left=parentRect.right-4;if(left+r.width>W)left=parentRect.left-r.width+4;top=parentRect.top-5;}
  if(left+r.width>W-4)left=W-r.width-4;
  if(top+r.height>H-4)top=Math.max(4,H-r.height-4);
  node.style.left=Math.max(4,left)+'px';node.style.top=Math.max(4,top)+'px';
}

function openMenu(items,x,y,level,parentRect){
  menus.splice(level).forEach(m=>m.node.remove());
  const node=el('div','menu');node.setAttribute('role','menu');
  const entry={node,items,active:-1};
  items.forEach((item,index)=>{
    if(item.separator){node.append(el('div','sep'));return;}
    const row=el('div','item'+(item.enabled?'':' disabled')+(item.danger?' danger':''));
    row.setAttribute('role','menuitem');
    const ic=el('span','icon');
    if(item.checked===true)ic.append(icon('check'));else if(item.icon)ic.append(icon(item.icon));
    row.append(ic,el('span','label',item.label));
    if(item.keys)row.append(el('span','keys',item.keys));
    if(item.submenu)row.append(el('span','more','›'));
    row.onmouseenter=()=>activate(level,index);
    row.onclick=()=>choose(level,index);
    item.row=row;
    node.append(row);
  });
  menus[level]=entry;
  place(node,x,y,parentRect);
}

function activate(level,index){
  const m=menus[level];if(!m)return;
  m.items.forEach((it,i)=>it.row?.classList.toggle('active',i===index));
  m.active=index;
  const item=m.items[index];
  if(item?.submenu&&item.enabled){
    openMenu(item.submenu,0,0,level+1,item.row.getBoundingClientRect());
  }else menus.splice(level+1).forEach(x=>x.node.remove());
}

function choose(level,index){
  const item=menus[level]?.items[index];
  if(!item||!item.enabled||item.separator)return;
  if(item.submenu){activate(level,index);activate(level+1,firstUsable(menus[level+1].items,0,1));return;}
  window.popupAPI.choose(item.id);
  close();
}

function firstUsable(items,from,step){
  for(let n=0,i=from;n<items.length;n++,i=(i+step+items.length)%items.length)
    if(!items[i].separator&&items[i].enabled)return i;
  return -1;
}

// Clic fuori dai menu: chiude (nessuna voce scelta).
root.addEventListener('mousedown',e=>{
  if(mode==='menu'&&!e.target.closest('.menu')){window.popupAPI.dismiss();close();}
});
root.addEventListener('contextmenu',e=>e.preventDefault());

document.addEventListener('keydown',e=>{
  if(mode==='menu'){
    const level=menus.length-1,m=menus[level];if(!m)return;
    if(e.key==='Escape'){if(level>0){menus.pop().node.remove();}else{window.popupAPI.dismiss();close();}}
    else if(e.key==='ArrowDown')activate(level,firstUsable(m.items,(m.active+1)%m.items.length,1));
    else if(e.key==='ArrowUp')activate(level,firstUsable(m.items,(m.active-1+m.items.length)%m.items.length,-1));
    else if(e.key==='ArrowRight'&&m.items[m.active]?.submenu)choose(level,m.active);
    else if(e.key==='ArrowLeft'&&level>0)menus.pop().node.remove();
    else if(e.key==='Enter'&&m.active>=0)choose(level,m.active);
    else return;
    e.preventDefault();
  }else if(mode==='dialog'&&e.key==='Escape'){e.preventDefault();answer(current.cancelId);}
});

// ── Dialoghi ─────────────────────────────────────────────────────────────
let current=null,checkbox=null;
function answer(response){window.popupAPI.choose({response,checkboxChecked:!!checkbox?.checked});close();}

function openDialog(d){
  current=d;checkbox=null;
  const backdrop=el('div','backdrop');
  const box=el('div','dialog'+(d.tone==='warning'?' warning':''));box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
  const x=el('button','close');x.title='Chiudi';x.setAttribute('aria-label','Chiudi');x.append(icon('close'));x.onclick=()=>answer(d.cancelId);
  const badge=el('div','badge');badge.append(icon(d.icon));
  box.append(x,badge,el('h2','',d.message||d.title));
  if(d.detail)box.append(el('p','',d.detail));
  if(d.checkboxLabel){
    const label=el('label');checkbox=el('input');checkbox.type='checkbox';checkbox.checked=d.checkboxChecked;
    label.append(checkbox,el('span','',d.checkboxLabel));box.append(label);
  }
  const row=el('div','buttons');
  let focus=null;
  d.buttons.forEach((text,i)=>{
    const b=el('button',i===d.dangerId?'danger':i===d.primaryId?'primary':'',text);
    b.onclick=()=>answer(i);
    if(i===d.defaultId)focus=b;
    row.append(b);
  });
  box.append(row);backdrop.append(box);root.append(backdrop);
  (focus||row.firstChild)?.focus();
}
