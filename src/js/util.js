'use strict';
// Shared helpers: ids, math, timecode, DOM, events, toasts, modals, icons.
window.RS = window.RS || {};
(function (RS) {
  let uidCounter = 0;
  RS.uid = (p) => (p || 'id') + '_' + Math.random().toString(36).slice(2, 8) + (++uidCounter).toString(36);
  RS.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  RS.EPS = 1e-4;
  RS.native = window.native || null;
  // Address of a file loaded from code (worker, worklet) with the build fingerprint, so browsers never
  // run an old cached copy after an update (see scripts/stamp-assets.js).
  RS.assetUrl = (p) => { const m = document.querySelector('meta[name="rs-build"]'); return m ? p + '?v=' + m.content : p; };
  RS.isMac = /Mac/.test(navigator.platform);

  RS.$ = (s, r = document) => r.querySelector(s);
  RS.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // Tiny hyperscript: RS.h('div', {class:'x', onclick: fn}, child, 'text')
  RS.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'html') el.innerHTML = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected' || k === 'draggable') el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  };

  // ---------- time ----------
  RS.fmtTC = (t, fps) => {
    fps = Math.max(1, Math.round(fps || 30));
    const fr = Math.max(0, Math.round((t || 0) * fps));
    const ff = fr % fps;
    const s = Math.floor(fr / fps);
    const parts = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60, ff];
    return parts.map((n) => String(n).padStart(2, '0')).join(':');
  };
  RS.fmtDur = (t) => {
    if (!isFinite(t) || t <= 0) return '0:00';
    const s = Math.round(t);
    const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0');
  };
  // Accepts "HH:MM:SS:FF", "MM:SS", "SS", "1.5", or "+12" (frames relative is not supported; plain numbers = seconds)
  RS.parseTC = (str, fps) => {
    str = String(str || '').trim();
    if (!str) return null;
    if (/^\d+(\.\d+)?$/.test(str)) return parseFloat(str);
    const p = str.split(/[:;.]/).map((x) => parseInt(x, 10));
    if (p.some((n) => isNaN(n))) return null;
    while (p.length < 4) p.unshift(0);
    const [h, m, s, f] = p.slice(-4);
    return h * 3600 + m * 60 + s + f / (fps || 30);
  };
  RS.frameRound = (t, fps) => Math.round(t * fps) / fps;

  RS.fmtBytes = (n) => {
    if (!n) return '';
    const u = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return n.toFixed(i ? 1 : 0) + ' ' + u[i];
  };

  RS.debounce = (fn, ms) => {
    let t = null;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  };

  // ---------- events ----------
  const handlers = {};
  RS.on = (evt, fn) => { (handlers[evt] = handlers[evt] || []).push(fn); };
  RS.emit = (evt, data) => {
    for (const fn of handlers[evt] || []) {
      try { fn(data); } catch (err) { console.error('[' + evt + ']', err); }
    }
  };

  // ---------- toasts ----------
  RS.toast = (msg, kind = 'info', ms = 2600) => {
    let host = RS.$('#toasts');
    if (!host) { host = RS.h('div', { id: 'toasts' }); document.body.append(host); }
    const t = RS.h('div', { class: 'toast ' + kind }, msg);
    host.append(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, ms);
  };

  // ---------- modal dialogs ----------
  // RS.modal({title, body: Element, buttons:[{label, primary, danger, onClick(close) -> false keeps open}], onClose})
  RS.modal = function (opts) {
    const back = RS.h('div', { class: 'modal-back' });
    const box = RS.h('div', { class: 'modal' + (opts.wide ? ' wide' : '') });
    const close = () => {
      back.remove();
      document.removeEventListener('keydown', onKey, true);
      if (opts.onClose) opts.onClose();
    };
    const foot = RS.h('div', { class: 'modal-foot' });
    for (const b of opts.buttons || [{ label: 'OK', primary: true }]) {
      const btn = RS.h('button', { class: 'btn' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : '') }, b.label);
      btn.addEventListener('click', async () => {
        const r = b.onClick ? await b.onClick(close) : undefined;
        if (r !== false) close();
      });
      foot.append(btn);
    }
    box.append(RS.h('div', { class: 'modal-head' }, opts.title || ''), RS.h('div', { class: 'modal-body' }, opts.body || ''), foot);
    back.append(box);
    if (!opts.sticky) back.addEventListener('pointerdown', (e) => { if (e.target === back) close(); });
    const onKey = (e) => {
      const all = document.querySelectorAll('.modal-back');
      if (all[all.length - 1] !== back) return; // only the topmost dialog handles keys
      if (e.key === 'Escape' && !opts.sticky) { e.stopPropagation(); close(); }
      if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
        const p = foot.querySelector('.primary');
        if (p) { e.preventDefault(); e.stopPropagation(); p.click(); }
      }
      e.stopPropagation();
    };
    document.addEventListener('keydown', onKey, true);
    document.body.append(back);
    const first = box.querySelector('input,select,textarea');
    if (first) setTimeout(() => first.focus(), 0);
    return { close, box };
  };

  RS.confirm = (title, message, okLabel = 'OK', danger = false) => new Promise((resolve) => {
    let result = false;
    RS.modal({
      title,
      body: RS.h('p', { class: 'muted' }, message),
      buttons: [
        { label: 'Cancel' },
        { label: okLabel, primary: true, danger, onClick: () => { result = true; } },
      ],
      onClose: () => resolve(result),
    });
  });

  // Three-way: resolves 'save' | 'discard' | 'cancel'
  RS.askSave = (message) => new Promise((resolve) => {
    let result = 'cancel';
    RS.modal({
      title: 'Unsaved changes',
      body: RS.h('p', { class: 'muted' }, message),
      buttons: [
        { label: 'Cancel' },
        { label: "Don't Save", danger: true, onClick: () => { result = 'discard'; } },
        { label: 'Save', primary: true, onClick: () => { result = 'save'; } },
      ],
      onClose: () => resolve(result),
    });
  });

  // ---------- context menu ----------
  // items: [{label, key, disabled, checked, run}] or '-' for a separator
  RS.contextMenu = (x, y, items) => {
    RS.closeContextMenu();
    const menu = RS.h('div', { class: 'ctx-menu', id: 'ctx-menu' });
    for (const it of items) {
      if (it === '-') { menu.append(RS.h('div', { class: 'ctx-sep' })); continue; }
      const row = RS.h('div', { class: 'ctx-item' + (it.disabled ? ' disabled' : '') },
        RS.h('span', { class: 'ctx-check' }, it.checked ? '✓' : ''), RS.h('span', { class: 'ctx-label' }, it.label), RS.h('span', { class: 'ctx-key' }, it.key || ''));
      if (!it.disabled) row.addEventListener('click', () => { RS.closeContextMenu(); it.run && it.run(); });
      menu.append(row);
    }
    document.body.append(menu);
    const r = menu.getBoundingClientRect();
    menu.style.left = Math.min(x, window.innerWidth - r.width - 6) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - r.height - 6) + 'px';
    setTimeout(() => {
      const off = (e) => { if (!menu.contains(e.target)) RS.closeContextMenu(); };
      menu._off = off;
      document.addEventListener('pointerdown', off, true);
      window.addEventListener('blur', RS.closeContextMenu, { once: true });
    }, 0);
  };
  RS.closeContextMenu = () => {
    const m = document.getElementById('ctx-menu');
    if (!m) return;
    if (m._off) document.removeEventListener('pointerdown', m._off, true);
    m.remove();
  };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') RS.closeContextMenu(); }, true);

  // Small prompt dialog. Resolves the entered string, or null.
  RS.prompt = (title, label, value) => new Promise((resolve) => {
    let result = null;
    const inp = RS.h('input', { type: 'text', value: value || '' });
    RS.modal({
      title,
      body: RS.h('label', { class: 'form-row' }, RS.h('span', null, label), inp),
      buttons: [{ label: 'Cancel' }, { label: 'OK', primary: true, onClick: () => { result = inp.value; } }],
      onClose: () => resolve(result),
    });
  });

  // ---------- icons (original, stroke-based 24x24) ----------
  const P = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
  RS.icons = {
    play: P('<path d="M7 5v14l12-7z" fill="currentColor"/>'),
    pause: P('<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/>'),
    stepBack: P('<path d="M18 6l-8 6 8 6z" fill="currentColor"/><path d="M7 6v12"/>'),
    stepFwd: P('<path d="M6 6l8 6-8 6z" fill="currentColor"/><path d="M17 6v12"/>'),
    toStart: P('<path d="M19 6l-7 6 7 6z" fill="currentColor"/><path d="M12 6l-7 6 7 6z" fill="currentColor"/>'),
    toEnd: P('<path d="M5 6l7 6-7 6z" fill="currentColor"/><path d="M12 6l7 6-7 6z" fill="currentColor"/>'),
    select: P('<path d="M6 3l12 9-5.5 1.2L15 19l-2.5 1.2-2.6-5.8L6 18z" fill="currentColor" stroke-width="1.2"/>'),
    razor: P('<circle cx="6" cy="6.5" r="2.8"/><circle cx="6" cy="17.5" r="2.8"/><path d="M8.3 8.2L20 17.5"/><path d="M8.3 15.8L20 6.5"/>'),
    trackFwd: P('<path d="M4 5v14"/><path d="M8 9h8M8 15h8"/><path d="M14 6l4 3-4 3M14 12l4 3-4 3" />'),
    trackBack: P('<path d="M20 5v14"/><path d="M8 9h8M8 15h8"/><path d="M10 6L6 9l4 3M10 12l-4 3 4 3"/>'),
    ripple: P('<path d="M9 4H6v16h3"/><path d="M21 12h-9"/><path d="M15 8l-4 4 4 4"/>'),
    rolling: P('<path d="M10 4H7v16h3M14 4h3v16h-3"/><path d="M2 12h3M19 12h3"/>'),
    rate: P('<path d="M4 5v14M20 5v14"/><path d="M7 12h10"/><path d="M10 9l-3 3 3 3M14 9l3 3-3 3"/>'),
    slip: P('<rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M7 12h10"/><path d="M9.5 10L7 12l2.5 2M14.5 10l2.5 2-2.5 2"/>'),
    slide: P('<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M1.5 12H5M19 12h3.5"/><path d="M3.5 10l-2 2 2 2M20.5 10l2 2-2 2"/>'),
    hand: P('<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M11 10V4.5a1.5 1.5 0 0 1 3 0V11"/><path d="M14 10.5V6a1.5 1.5 0 0 1 3 0v7"/><path d="M8 12.5l-1.6-1.6a1.6 1.6 0 0 0-2.3 2.3L8 17.5c1.3 1.6 3 2.5 5 2.5h1a5 5 0 0 0 5-5v-4a1.5 1.5 0 0 0-3 0"/>'),
    zoomTool: P('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8"/><path d="M10.5 7.5v6M7.5 10.5h6"/>'),
    rect: P('<rect x="4" y="6" width="16" height="12" rx="1.5"/>'),
    ellipse: P('<ellipse cx="12" cy="12" rx="8.5" ry="6.5"/>'),
    marker: P('<path d="M6 3h12v9l-6 6-6-6z"/>'),
    eyedrop: P('<path d="M14 4l6 6-2 2-6-6z"/><path d="M12 6l-8 8v4h4l8-8"/>'),
    mic: P('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3M9 21h6"/>'),
    adjust: P('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 14l5-5 4 4 3-3 4 4"/>'),
    seq: P('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M8 14h8"/>'),
    multicam: P('<rect x="3" y="4" width="8" height="7" rx="1"/><rect x="13" y="4" width="8" height="7" rx="1"/><rect x="3" y="13" width="8" height="7" rx="1"/><rect x="13" y="13" width="8" height="7" rx="1"/>'),
    mask: P('<rect x="3" y="4" width="18" height="16" rx="2"/><ellipse cx="12" cy="12" rx="5" ry="4" stroke-dasharray="2 2"/>'),
    pen: P('<path d="M12 19l7-7 3 3-7 7z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18z"/><circle cx="11" cy="11" r="2"/>'),
    scopes: P('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M6 16l3-5 3 3 3-6 3 4"/>'),
    track: P('<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>'),
    transition: P('<path d="M3 5h8l2 14H3z"/><path d="M21 5h-8L11 19h10z" fill="currentColor" opacity=".35"/>'),
    magnet: P('<path d="M6 4v8a6 6 0 0 0 12 0V4"/><path d="M6 8h3M15 8h3"/><path d="M9 4v8a3 3 0 0 0 6 0V4"/>'),
    link: P('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    eye: P('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    eyeOff: P('<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6"/>'),
    speaker: P('<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6"/>'),
    speakerOff: P('<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M17 9l4 6M21 9l-4 6"/>'),
    lock: P('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    unlock: P('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>'),
    plus: P('<path d="M12 5v14M5 12h14"/>'),
    import: P('<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/>'),
    text: P('<path d="M5 6V4h14v2"/><path d="M12 4v16"/><path d="M9 20h6"/>'),
    trash: P('<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>'),
    film: P('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>'),
    music: P('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
    image: P('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>'),
    square: P('<rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor"/>'),
    stopwatch: P('<circle cx="12" cy="13" r="7"/><path d="M12 13V9M10 3h4M12 3v3"/>'),
    kf: P('<path d="M12 4l8 8-8 8-8-8z"/>'),
    kfOn: P('<path d="M12 4l8 8-8 8-8-8z" fill="currentColor"/>'),
    prev: P('<path d="M15 6l-6 6 6 6"/>'),
    next: P('<path d="M9 6l6 6-6 6"/>'),
    reset: P('<path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 4v4h4"/>'),
    export: P('<path d="M12 15V3"/><path d="M7 8l5-5 5 5"/><path d="M4 14v6h16v-6"/>'),
    markIn: P('<path d="M9 4H6v16h3"/><path d="M13 8l4 4-4 4"/>'),
    markOut: P('<path d="M15 4h3v16h-3"/><path d="M11 8l-4 4 4 4"/>'),
    insert: P('<path d="M12 4v10"/><path d="M8 10l4 4 4-4"/><path d="M3 18h7M14 18h7"/>'),
    overwrite: P('<path d="M12 4v8"/><path d="M8 8l4 4 4-4"/><rect x="5" y="15" width="14" height="5" rx="1"/>'),
    zoomIn: P('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5M8.5 11h5M11 8.5v5"/>'),
    zoomOut: P('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5M8.5 11h5"/>'),
    fit: P('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    fx: P('<path d="M5 20l3-14a3 3 0 0 1 3-2h2"/><path d="M4 11h7"/><path d="M14 11l6 8M20 11l-6 8"/>'),
    settings: P('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    undo: P('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
    redo: P('<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>'),
    search: P('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
    close: P('<path d="M6 6l12 12M18 6L6 18"/>'),
    help: P('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5v.01"/>'),
    folder: P('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    warn: P('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>'),
  };
  RS.icon = (name, cls) => {
    const s = document.createElement('span');
    s.className = 'ico' + (cls ? ' ' + cls : '');
    s.innerHTML = RS.icons[name] || '';
    return s;
  };
  RS.iconBtn = (name, title, onClick, cls) => {
    const b = RS.h('button', { class: 'ibtn' + (cls ? ' ' + cls : ''), title, type: 'button' });
    b.append(RS.icon(name));
    if (onClick) b.addEventListener('click', onClick);
    return b;
  };
})(window.RS);
