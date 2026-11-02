// Panoramica comune del round 2: riquadri, "Da sistemare", ricerca e dettaglio di una categoria.
// Ogni variante decide solo come si apre il dettaglio (V4.open).
(() => {
  const { el, icon, item, group, search, highlight, empty, flash } = K;
  // Fino a 2 interruttori rapidi per riquadro, con un nome corto.
  const QUICK = {
    aspetto: [['Schede in verticale', 'Schede in verticale'], ['Prendi i colori dall’immagine di sfondo', 'Colori dallo sfondo']],
    schede: [['Video in finestrella quando cambi scheda', 'Video in finestrella'], ['Archivia da sole le schede non usate', 'Archivio automatico']],
    privacy: [['Blocca pubblicità e tracker', 'Blocca pubblicità e tracker'], ['Proponi di salvare le password dopo un accesso', 'Proponi di salvare le password']],
    telefono: [['Collegamento col telefono sulla rete di casa', 'Collegamento in casa'], ['Anche fuori casa (le schede passano da ntfy.sh, cifrate)', 'Anche fuori casa']],
    sistema: [['Avvia con Windows (solo l’icona, nessuna finestra)', 'Avvia con Windows'], ['Controlla e scarica da solo gli aggiornamenti', 'Aggiornamenti automatici']],
  };
  const items = c => c.groups.flatMap(g => g.items);
  const isErr = c => c.status?.() === 'error';

  function tile(c, i, { selected, compact } = {}) {
    const quick = (QUICK[c.id] || []).map(([full, short]) => item({ ...items(c).find(x => x.label === full), label: short, hint: null }));
    const t = el('div', { className: 'tile' + (isErr(c) ? ' err' : '') + (!compact && (i === 0 || i === 3) ? ' wide' : ''), tabIndex: 0, role: 'button' },
      el('header', {}, icon(c.icon), el('span', { textContent: c.title }), icon('chevron', 16)),
      el('p', { textContent: c.summary() }),
      quick.length && !compact ? el('div', { className: 'quick' }, quick) : null);
    t.dataset.id = c.id;
    t.setAttribute('aria-current', String(c.id === selected));
    t.onclick = e => { if (!e.target.closest('.quick')) V4.open(c.id); };
    t.onkeydown = e => { if (e.key === 'Enter') V4.open(c.id); };
    return t;
  }

  function alert() {
    const problems = SETTINGS.filter(isErr);
    if (!problems.length) return null;
    return el('div', { className: 'alert k-glass' }, el('strong', { textContent: 'Da sistemare' }),
      el('ul', {}, problems.map(c => {
        const b = el('button', { type: 'button' }, el('span', { textContent: c.title }), el('span', { textContent: c.summary() }), el('span', { textContent: 'Risolvi →' }));
        b.onclick = () => V4.open(c.id, { error: true });
        return el('li', {}, b);
      })));
  }

  const overview = opts => [alert(), el('div', { className: 'grid' }, SETTINGS.map((c, i) => tile(c, i, opts)))];

  function results(q) {
    const hits = search(q);
    if (!hits.length) return [empty(q)];
    return [el('div', { className: 'grid' }, hits.map(h => {
      const t = el('button', { type: 'button', className: 'tile', style: 'min-height:auto' },
        el('header', {}, icon(h.cat.icon), el('span', { textContent: `${h.cat.title} › ${h.group.title}` })),
        el('p', {}, highlight(h.item.label || h.item.text || h.group.title, q)));
      t.onclick = () => V4.open(h.cat.id, { label: h.item.label || h.item.text });
      return t;
    }))];
  }

  function detail(id, { onClose, closeLabel = 'Chiudi ✕' } = {}) {
    const c = SETTINGS.find(x => x.id === id);
    const close = el('button', { type: 'button', textContent: closeLabel }); close.onclick = onClose;
    return [el('div', { className: 'detail-head' }, icon(c.icon, 22), el('h2', { className: 'k-title', textContent: c.title }), onClose ? close : null),
      el('p', { className: 'detail-sum' + (isErr(c) ? ' err' : ''), textContent: c.summary() }),
      ...c.groups.map(g => group(g))];
  }

  // Dopo l'apertura: fa lampeggiare la riga cercata o quella in errore.
  function focus(root, target = {}) {
    let n = null;
    if (target.error) n = root.querySelector('.k-status.error');
    else if (target.label) n = [...root.querySelectorAll('[data-label]')].find(x => x.dataset.label === target.label);
    if (n) setTimeout(() => flash(n), 320);
  }

  window.V4 = { overview, results, detail, focus, open: () => {} };
})();
