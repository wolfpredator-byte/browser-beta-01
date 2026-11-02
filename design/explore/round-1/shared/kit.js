// Mattoncini comuni: controlli, ricerca, icone e barra degli stati demo.
(() => {
  const el = (tag, props = {}, ...kids) => {
    const n = Object.assign(document.createElement(tag), props);
    for (const k of kids.flat()) if (k != null) n.append(k);
    return n;
  };
  const val = v => typeof v === 'function' ? v() : v;

  const ICONS = {
    palette: 'M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-.9-.7-1.3-.7-2.1 0-.9.7-1.5 1.6-1.5H17a4 4 0 0 0 4-4c0-4.4-4-7.8-9-7.8ZM7.5 12.5h.01M9.5 8h.01M14.5 8h.01',
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4-4',
    tabs: 'M3 8h18v11H3zM3 8l2-3h6l2 3',
    shield: 'M12 3l7 3v6c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6l7-3Z',
    phone: 'M8 3h8v18H8zM11 18h2',
    puzzle: 'M4 7h5V5a2 2 0 1 1 4 0v2h5v5h-2a2 2 0 1 0 0 4h2v4H4Z',
    cpu: 'M7 7h10v10H7zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4',
    gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM19 12l2-1-1-3-2 .3-1.5-1.5L17 5l-3-1-1 2h-2L10 4 7 5l.5 1.8L6 8.3 4 8l-1 3 2 1v0l-2 1 1 3 2-.3 1.5 1.5L7 19l3 1 1-2h2l1 2 3-1-.5-1.8 1.5-1.5 2 .3 1-3-2-1Z',
    chevron: 'M9 6l6 6-6 6',
    back: 'M15 6l-6 6 6 6',
  };
  const icon = (name, size = 18) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size);
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.6');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = `<path d="${ICONS[name] || ''}"/>`;
    return s;
  };

  let toastTimer;
  const toast = text => {
    document.querySelector('.k-toast')?.remove();
    const t = el('div', { className: 'k-toast', role: 'status', textContent: text });
    document.body.append(t); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 2400);
  };

  const label = (text, hint) => el('span', { className: 'k-label' }, el('span', { textContent: text }), hint ? el('span', { className: 'k-hint', textContent: hint }) : null);
  const btn = (text, cls = '', fn = () => toast(text.replace(/…$/, '') + ': (prototipo)')) => {
    const b = el('button', { type: 'button', className: 'k-btn ' + cls, textContent: text }); b.onclick = fn; return b;
  };
  const danger = (text, confirm) => {
    const b = btn(text, 'danger');
    b.onclick = () => {
      if (b.classList.contains('armed')) { b.classList.remove('armed'); b.textContent = text; toast('Fatto (prototipo).'); return; }
      b.classList.add('armed'); b.textContent = confirm;
      setTimeout(() => { b.classList.remove('armed'); b.textContent = text; }, 4000);
    };
    return b;
  };

  function passwordList(entries) {
    const box = el('div');
    const list = el('div', { className: 'k-list' });
    const search = el('input', { className: 'k-input', type: 'search', placeholder: `Cerca fra ${entries.length} password…` });
    let all = false;
    const draw = () => {
      const q = search.value.trim().toLowerCase();
      const hits = entries.filter(e => !q || e.host.includes(q) || e.user.toLowerCase().includes(q));
      const shown = all || q ? hits : hits.slice(0, 6);
      list.replaceChildren(...shown.map(e => el('div', { className: 'k-li' },
        el('div', { className: 'k-li-main' }, el('span', { textContent: e.host }), el('span', { textContent: e.user || '(senza nome utente)' })),
        el('code', { textContent: '••••••••' }), btn('Mostra'), btn('Copia'), danger('Elimina', 'Conferma'))));
      if (!hits.length) list.append(el('div', { className: 'k-empty' }, el('strong', { textContent: 'Nessuna password trovata' }), `Niente per «${search.value}».`));
      if (!all && !q && hits.length > 6) {
        const more = el('button', { type: 'button', className: 'k-more', textContent: `Mostra tutte (${hits.length})` });
        more.onclick = () => { all = true; draw(); }; list.append(more);
      }
    };
    search.oninput = draw; draw();
    box.append(entries.length > 6 ? search : '', list);
    return box;
  }

  // Una voce di data.js → elemento (data-label serve per trovarla e farla lampeggiare).
  function item(it) {
    const n = control(it);
    n.dataset.label = it.label || it.text || '';
    return n;
  }
  const flash = node => {
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    node.animate([{ background: 'rgba(124,108,255,.28)' }, { background: 'transparent' }], { duration: 1400, easing: 'ease-out' });
  };
  function control(it) {
    const v = val(it.value);
    switch (it.type) {
      case 'toggle': {
        const s = el('button', { type: 'button', className: 'k-switch', role: 'switch' });
        s.setAttribute('aria-checked', String(!!v)); s.setAttribute('aria-label', it.label);
        s.onclick = () => s.setAttribute('aria-checked', String(s.getAttribute('aria-checked') !== 'true'));
        const row = el('label', { className: 'k-row' }, label(it.label, it.hint), s);
        return row;
      }
      case 'select': {
        const s = el('select', { className: 'k-select' }, it.options.map(([k, t]) => el('option', { value: k, textContent: t, selected: k === v })));
        return el('label', { className: 'k-row' }, label(it.label, it.hint), s);
      }
      case 'range': {
        const out = el('output', { textContent: v });
        const r = el('input', { type: 'range', min: 0, max: 100, value: v }); r.oninput = () => out.textContent = r.value;
        return el('label', { className: 'k-row' }, label(it.label, it.hint), el('span', { className: 'k-range' }, r, out));
      }
      case 'color': return el('label', { className: 'k-row' }, label(it.label, it.hint), el('input', { type: 'color', className: 'k-color', value: v }));
      case 'presets': {
        const COLORS = { cosmic: '#7c6cff,#07070e', 'vice-city': '#ff4fa3,#1a0b2e', ember: '#ff7a3d,#1a0d07', 'midnight-ink': '#6f8cff,#05070f', 'aurora-forest': '#4fe0a6,#06120e', 'oxford-rose': '#e98aa6,#14090e' };
        const grid = el('div', { className: 'k-presets' }, it.options.map(([k, t]) => {
          const [a, b] = COLORS[k].split(',');
          const p = el('button', { type: 'button', className: 'k-preset', textContent: t, style: `background:linear-gradient(160deg,${b} 55%,${a})` });
          p.setAttribute('aria-pressed', String(k === v));
          p.onclick = () => grid.querySelectorAll('.k-preset').forEach(x => x.setAttribute('aria-pressed', String(x === p)));
          return p;
        }));
        return grid;
      }
      case 'chips': return el('div', { className: 'k-chips' }, v.map(c => el('span', { className: 'k-chip' }, c, el('button', { type: 'button', textContent: '×', title: 'Togli' }))));
      case 'action': return el('div', { className: 'k-actions' }, btn(it.label, it.primary ? 'primary' : ''));
      case 'danger': return el('div', { className: 'k-row' }, label('', it.hint), danger(it.label, it.confirm));
      case 'status': return el('div', { className: 'k-status' + (v.error ? ' error' : ''), textContent: v.text });
      case 'hint': return el('p', { className: 'k-hint-p', textContent: it.text });
      case 'passwords': return passwordList(v);
      case 'devices': return el('div', { className: 'k-list' }, v.map(d => el('div', { className: 'k-li' },
        el('div', { className: 'k-li-main' }, el('span', { textContent: d.name }), el('span', { textContent: d.meta })), danger(it.remove || 'Scollega', 'Conferma'))));
    }
    return el('span');
  }

  const group = (g, { heading = true } = {}) => el('section', { className: 'k-group' }, heading ? el('h4', { className: 'k-h', textContent: g.title }) : null, g.items.map(item));

  // Ricerca: restituisce le voci che contengono il testo, con categoria e gruppo.
  function search(q) {
    q = q.trim().toLowerCase(); if (!q) return [];
    const out = [];
    for (const c of SETTINGS) for (const g of c.groups) for (const it of g.items) {
      const text = [it.label, it.hint, it.text, g.title, c.title, ...(it.options || []).map(o => o[1])].filter(Boolean).join(' ').toLowerCase();
      if (text.includes(q)) out.push({ cat: c, group: g, item: it });
    }
    return out;
  }
  const highlight = (text, q) => {
    const i = text.toLowerCase().indexOf(q.trim().toLowerCase());
    if (!q.trim() || i < 0) return document.createTextNode(text);
    return el('span', {}, text.slice(0, i), el('mark', { textContent: text.slice(i, i + q.trim().length) }), text.slice(i + q.trim().length));
  };
  const empty = q => el('div', { className: 'k-empty' }, el('strong', { textContent: `Nessuna impostazione per «${q}»` }),
    'Prova con parole come password, sfondo, schede, telefono.');

  function demoBar() {
    const bar = el('nav', { className: 'k-demo', title: 'Stato demo (solo per il confronto)' },
      [['normal', 'Normale'], ['error', 'Errori'], ['many', 'Molti dati']].map(([k, t]) =>
        el('a', { href: '?stato=' + k + location.hash, textContent: t, className: k === DEMO ? 'on' : '' })));
    document.body.append(bar);
  }

  window.K = { el, icon, item, group, search, highlight, empty, toast, btn, demoBar, flash, val };
  addEventListener('DOMContentLoaded', demoBar);
})();
