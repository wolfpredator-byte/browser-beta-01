// Pannello Tweaks: ogni controllo scrive un token CSS su :root. "Copia token" esporta i valori scelti.
(() => {
  const ACCENTS = [['#7c6cff', 'Cosmic'], ['#6f8cff', 'Midnight Ink'], ['#4fe0a6', 'Aurora Forest'], ['#ff7a3d', 'Ember'], ['#e98aa6', 'Oxford Rose'], ['#ff4fa3', 'Vice City'], ['#6fd3ff', 'Cyan Flash']];
  const FONTS = [["'Segoe UI Variable','Segoe UI',system-ui,sans-serif", 'Segoe UI Variable'], ["Bahnschrift,'Segoe UI',sans-serif", 'Bahnschrift'],
    ["'Cascadia Mono',Consolas,monospace", 'Cascadia Mono'], ["Georgia,'Times New Roman',serif", 'Georgia (serif)'], ["'Segoe UI Light','Segoe UI',sans-serif", 'Segoe UI Light']];
  // [token, etichetta, min, max, passo, unità]
  const SPEC = [
    ['Colore', [['accent']]],
    ['Panoramica', [['--t-cols', 'Colonne', 2, 4, 1, ''], ['--t-gap', 'Spazio fra riquadri', 6, 28, 1, 'px'], ['--t-tile-pad', 'Spazio interno', 10, 30, 1, 'px'],
      ['--t-tile-min', 'Altezza minima', 80, 220, 5, 'px'], ['--t-radius', 'Raggio angoli', 0, 28, 1, 'px'], ['--t-hover-glow', 'Bagliore al passaggio', 0, 1, .05, ''],
      ['quick', 'Interruttori rapidi'], ['wide', 'Riquadri larghi (Aspetto, Privacy)']]],
    ['Vetro e sfondo', [['--t-glass-a', 'Opacità vetro', 0, 1, .01, ''], ['--t-glass-blur', 'Sfocatura vetro', 0, 40, 1, 'px'], ['--t-line-a', 'Bordi', 0, .5, .01, ''],
      ['--t-wall-blur', 'Sfocatura sfondo', 0, 40, 1, 'px'], ['--t-wall-bright', 'Luminosità sfondo', .1, 1, .01, '']]],
    ['Pannello', [['--t-sheet-w', 'Larghezza', 420, 800, 10, 'px'], ['--t-sheet-a', 'Opacità', .5, 1, .01, ''], ['--t-dim', 'Riquadri non scelti', .3, 1, .01, '']]],
    ['Tipografia', [['font'], ['--t-title-weight', 'Peso titoli', 200, 700, 100, ''], ['--t-title-track', 'Spaziatura titoli', 0, .4, .01, 'em'], ['--t-sum-size', 'Testo riassunti', 12, 20, 1, 'px']]],
    ['Movimento', [['--t-dur', 'Durata', 0, 700, 10, 'ms']]],
  ];
  const root = document.documentElement, KEY = 'varco-settings-tweaks';
  const css = getComputedStyle(root);
  const defaults = {};
  const state = {};
  const num = v => parseFloat(v);

  function set(token, value) {
    state[token] = value;
    if (token === 'quick' || token === 'wide') document.body.dataset[token] = value ? 'on' : 'off';
    else root.style.setProperty(token, value);
    if (token === '--t-accent') {
      const h = value.replace('#', ''); const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
      root.style.setProperty('--v-accent-rgb', `${r},${g},${b}`);
      root.style.setProperty('--v-accent-2', `rgb(${Math.round(r + (255 - r) * .35)},${Math.round(g + (255 - g) * .35)},${Math.round(b + (255 - b) * .35)})`);
    }
    if (token === '--t-cols') root.style.setProperty('--t-cols-open', Math.max(1, value - 1));
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }

  const el = (t, p = {}, ...k) => { const n = Object.assign(document.createElement(t), p); n.append(...k.filter(x => x != null)); return n; };
  const body = el('div', { className: 'tw-body' });

  function row(spec) {
    const [token, label, min, max, step, unit] = spec;
    if (token === 'accent') {
      defaults['--t-accent'] = css.getPropertyValue('--t-accent').trim();
      const sw = el('div', { className: 'tw-sw' });
      const pick = el('input', { type: 'color', value: defaults['--t-accent'], title: 'Colore libero' });
      const mark = v => sw.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
      ACCENTS.forEach(([v, name]) => { const b = el('button', { type: 'button', title: name, style: `background:${v}` }); b.dataset.v = v; b.onclick = () => { set('--t-accent', v); pick.value = v; mark(v); }; sw.append(b); });
      pick.oninput = () => { set('--t-accent', pick.value); mark(pick.value); };
      sw.append(pick); mark(defaults['--t-accent']);
      return el('div', { className: 'tw-row' }, el('span', { textContent: 'Accento' }), sw);
    }
    if (token === 'font') {
      defaults['--t-title-font'] = css.getPropertyValue('--t-title-font').trim();
      const s = el('select', {}, ...FONTS.map(([v, t]) => el('option', { value: v, textContent: t })));
      s.onchange = () => set('--t-title-font', s.value);
      return el('div', { className: 'tw-row' }, el('span', { textContent: 'Carattere titoli' }), s);
    }
    if (token === 'quick' || token === 'wide') {
      defaults[token] = true;
      const c = el('input', { type: 'checkbox', checked: true }); c.onchange = () => set(token, c.checked);
      return el('label', { className: 'tw-row switch' }, el('span', { textContent: label }), c);
    }
    defaults[token] = css.getPropertyValue(token).trim();
    const r = el('input', { type: 'range', min, max, step, value: num(defaults[token]) });
    const out = el('output', { textContent: num(defaults[token]) + unit });
    r.oninput = () => { out.textContent = r.value + unit; set(token, r.value + unit); };
    r.dataset.token = token;
    return el('label', { className: 'tw-row' }, el('span', { textContent: label }), r, out);
  }
  for (const [title, rows] of SPEC) body.append(el('section', { className: 'tw-sec' }, el('h5', { textContent: title }), ...rows.map(row)));

  const panel = el('div', { className: 'tw', role: 'dialog', ariaLabel: 'Tweaks' });
  const close = el('button', { type: 'button', textContent: '✕' });
  const copy = el('button', { type: 'button', className: 'main', textContent: 'Copia token' });
  const reset = el('button', { type: 'button', textContent: 'Ripristina' });
  const info = el('span');
  panel.append(el('div', { className: 'tw-head' }, el('strong', { textContent: 'Tweaks' }), close), body, el('div', { className: 'tw-foot' }, info, reset, copy));
  const toggle = el('button', { type: 'button', className: 'tw-btn', textContent: '⚙ Tweaks' });
  document.body.append(panel, toggle);
  toggle.onclick = () => panel.classList.toggle('open');
  close.onclick = () => panel.classList.remove('open');
  addEventListener('keydown', e => { if (e.key === 'Escape') panel.classList.remove('open'); });

  copy.onclick = async () => {
    const changed = Object.entries(state).filter(([k, v]) => String(v) !== String(defaults[k]));
    const tokens = changed.filter(([k]) => k.startsWith('--')).map(([k, v]) => `  ${k}:${v};`);
    const flags = changed.filter(([k]) => !k.startsWith('--')).map(([k, v]) => `/* ${k}: ${v ? 'on' : 'off'} */`);
    const text = `:root{\n${tokens.join('\n')}\n}\n${flags.join('\n')}`.trim();
    try { await navigator.clipboard.writeText(text); info.textContent = `${changed.length} valori copiati`; }
    catch { console.log(text); info.textContent = 'Copia non riuscita: vedi la console'; }
  };
  reset.onclick = () => { try { localStorage.removeItem(KEY); } catch {} location.reload(); };

  // Ripristina i valori dell'ultima sessione.
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
  for (const [k, v] of Object.entries(saved)) {
    set(k, v);
    const r = body.querySelector(`[data-token="${k}"]`); if (r) { r.value = num(v); r.nextSibling.textContent = v; }
  }
  window.TWEAKS = { state, defaults, set };
})();
