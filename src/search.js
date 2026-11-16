// Site search for reelsmithapp.com: a "Search ⌘K" button in the header opens a search dialog over every
// tool, tutorial, blog post, doc and page. The list (search-index.json, made by scripts/build-site.js) is
// downloaded the first time search opens. Matching is plain word matching, which is plenty for a site
// this size and needs no search service. Opens with the button, ⌘K / Ctrl+K, or "/".
// On the editor page it only works while the welcome intro is showing (the editor has its own shortcuts).
(function () {
  'use strict';
  if (window.ReelsmithSearch) return;
  const MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const KINDS = { Tool: 4, Tutorial: 3, Page: 2, Docs: 1, Blog: 1 };
  const ICON = {
    Tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    Tutorial: '<path d="M4 5h11a3 3 0 0 1 3 3v11H7a3 3 0 0 1-3-3z"/><path d="M8 9h6M8 13h4"/>',
    Blog: '<path d="M5 4h10l4 4v12H5z"/><path d="M9 12h6M9 16h6M9 8h3"/>',
    Docs: '<path d="M4 6a2 2 0 0 1 2-2h5v16H6a2 2 0 0 0-2 2zM20 6a2 2 0 0 0-2-2h-5v16h5a2 2 0 0 1 2 2z"/>',
    Page: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
  };
  const POPULAR = ['/tools/', '/tools/add-subtitles-to-video/', '/tools/trim-video/', '/tutorials/', '/docs/first-edit/', '/blog/', '/contact/'];

  const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9+#.]+/g, ' ').trim();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let entries = null, loading = null;
  function load() {
    if (entries) return Promise.resolve(entries);
    loading = loading || fetch('/search-index.json', { cache: 'no-cache' }).then((r) => r.json()).then((list) => {
      entries = list.map((e) => Object.assign(e, { _t: ' ' + norm(e.title), _d: ' ' + norm(e.desc), _k: ' ' + norm(e.k) }));
      return entries;
    }).catch(() => { loading = null; return []; });
    return loading;
  }

  // Every word must match somewhere; title matches and word starts count most.
  function search(q, limit = 12) {
    const query = norm(q);
    if (!query || !entries) return [];
    const words = query.split(' ');
    const out = [];
    for (const e of entries) {
      let score = 0;
      for (const w of words) {
        const s = ' ' + w;
        if (e._t.includes(s)) score += 10;
        else if (e._t.includes(w)) score += 6;
        else if (e._d.includes(s)) score += 4;
        else if (e._k.includes(s)) score += 3;
        else if (e._d.includes(w) || e._k.includes(w)) score += 1;
        else { score = -1; break; }
      }
      if (score < 0) continue;
      const t = e._t.trim();
      if (t === query) score += 20; else if (t.startsWith(query)) score += 8; else if (t.includes(query)) score += 4;
      out.push({ e, score: score + (KINDS[e.kind] || 0) });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.e);
  }

  // Google Analytics "search" event (shown in the admin dashboard). Only sent if Analytics was allowed
  // (consent.js loads Google's script then; otherwise the queued event is never sent anywhere).
  function track(term) {
    window.dataLayer = window.dataLayer || [];
    (function () { window.dataLayer.push(arguments); })('event', 'search', { search_term: term.slice(0, 100) });
  }

  const CSS = `
.rs-search-bg{position:fixed;inset:0;z-index:1000;background:rgba(6,8,11,.62);backdrop-filter:blur(3px);display:flex;justify-content:center;align-items:flex-start;padding:8vh 16px 16px}
.rs-search{width:100%;max-width:640px;max-height:80vh;display:flex;flex-direction:column;background:#171a1f;color:#e6e9ee;border:1px solid #2c313a;border-radius:14px;box-shadow:0 24px 80px -20px rgba(0,0,0,.7);overflow:hidden;font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.rs-search-top{display:flex;align-items:center;gap:10px;padding:0 14px;border-bottom:1px solid #2c313a}
.rs-search-top svg{flex:none;color:#7a828f}
.rs-search input{flex:1;min-width:0;height:56px;background:none;border:0;outline:0;color:#e6e9ee;font:inherit;font-size:17px}
.rs-search input::placeholder{color:#7a828f}
.rs-search input::-webkit-search-cancel-button{display:none}
.rs-search-x{flex:none;width:32px;height:32px;border:0;border-radius:8px;background:none;color:#aab1bc;font-size:20px;cursor:pointer}
.rs-search-x:hover{background:#232830;color:#fff}
.rs-search-list{overflow-y:auto;overscroll-behavior:contain;padding:8px;margin:0;list-style:none}
.rs-search-h{padding:8px 10px 4px;font-size:12px;font-weight:650;text-transform:uppercase;letter-spacing:.7px;color:#7a828f}
.rs-search-list a{display:flex;align-items:flex-start;gap:12px;padding:9px 10px;border-radius:10px;color:#e6e9ee;text-decoration:none}
.rs-search-list a[aria-selected=true]{background:#2a2112}
.rs-search-ic{flex:none;display:grid;place-items:center;width:34px;height:34px;border-radius:8px;background:#1f232a;color:#f0a83a}
.rs-search-ic svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.rs-search-tx{flex:1;min-width:0}
.rs-search-tx b{display:block;font-weight:620;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rs-search-tx span{display:block;color:#aab1bc;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rs-search-kind{flex:none;margin-top:3px;border:1px solid #2c313a;border-radius:6px;padding:1px 6px;font-size:11px;color:#aab1bc}
.rs-search-empty{padding:34px 16px;text-align:center;color:#aab1bc}
.rs-search-empty a{color:#ffc56b}
.rs-search-foot{display:flex;gap:16px;padding:9px 16px;border-top:1px solid #2c313a;font-size:12px;color:#7a828f}
.rs-search-foot kbd,.search-btn kbd{font:inherit;border:1px solid #2c313a;border-radius:4px;padding:0 5px}
@media (max-width:640px){.rs-search-bg{padding:0}.rs-search{max-width:none;max-height:100%;height:100%;border-radius:0;border:0}.rs-search-foot{display:none}}`;

  let bg = null, input, list, sel = 0, shown = [], lastFocus = null;
  function build() {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.append(st);
    bg = document.createElement('div');
    bg.className = 'rs-search-bg';
    bg.hidden = true;
    bg.innerHTML = `<div class="rs-search" role="dialog" aria-modal="true" aria-label="Search Reelsmith">
  <div class="rs-search-top"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    <input type="search" placeholder="Search tools, tutorials, help…" aria-label="Search" role="combobox" aria-expanded="true" aria-controls="rs-search-list" aria-autocomplete="list" autocomplete="off" spellcheck="false" enterkeyhint="go">
    <button type="button" class="rs-search-x" aria-label="Close search">×</button></div>
  <ul class="rs-search-list" id="rs-search-list" role="listbox" aria-label="Results"></ul>
  <div class="rs-search-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> to move</span><span><kbd>↵</kbd> to open</span><span><kbd>esc</kbd> to close</span></div>
</div>`;
    document.body.append(bg);
    input = bg.querySelector('input');
    list = bg.querySelector('.rs-search-list');
    bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
    bg.querySelector('.rs-search-x').addEventListener('click', close);
    input.addEventListener('input', render);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (shown.length) { sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length; mark(true); }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (shown[sel]) go(shown[sel], e.metaKey || e.ctrlKey);
      }
    });
    list.addEventListener('mousemove', (e) => { const a = e.target.closest('a[data-i]'); if (a && +a.dataset.i !== sel) { sel = +a.dataset.i; mark(false); } });
    list.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-i]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) { if (a && input.value.trim()) track(input.value.trim()); return; }
      e.preventDefault();
      go(shown[+a.dataset.i]);
    });
    bg.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab') { e.preventDefault(); input.focus(); }
    });
  }
  function item(e, i, withKind) {
    return `<li role="none"><a role="option" id="rs-s-${i}" data-i="${i}" href="${esc(e.href)}" aria-selected="false">
<span class="rs-search-ic"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[e.kind] || ICON.Page}</svg></span>
<span class="rs-search-tx"><b>${esc(e.title)}</b><span>${esc(e.desc)}</span></span>${withKind ? `<span class="rs-search-kind">${esc(e.kind)}</span>` : ''}</a></li>`;
  }
  function render() {
    const q = input.value.trim();
    sel = 0;
    if (!q) {
      shown = POPULAR.map((h) => (entries || []).find((e) => e.href === h)).filter(Boolean);
      list.innerHTML = shown.length ? `<li class="rs-search-h" role="presentation">Popular</li>` + shown.map((e, i) => item(e, i, false)).join('') : '';
    } else {
      shown = search(q);
      list.innerHTML = shown.length ? shown.map((e, i) => item(e, i, true)).join('')
        : `<li class="rs-search-empty" role="presentation"><p>No results for “${esc(q)}”.</p><p>Can’t find it? <a href="/contact/">Ask us</a> or <a href="/?report=feature">request a feature</a>.</p></li>`;
    }
    mark(false);
  }
  function mark(scroll) {
    list.querySelectorAll('a[data-i]').forEach((a) => a.setAttribute('aria-selected', String(+a.dataset.i === sel)));
    const cur = list.querySelector(`#rs-s-${sel}`);
    if (cur) { input.setAttribute('aria-activedescendant', cur.id); if (scroll) cur.scrollIntoView({ block: 'nearest' }); } else input.removeAttribute('aria-activedescendant');
  }
  function go(e, newTab) {
    const q = input.value.trim();
    if (q) track(q);
    if (newTab) { window.open(e.href, '_blank', 'noopener'); return; }
    close();
    location.href = e.href;
  }
  function open() {
    if (!bg) build();
    if (!bg.hidden) { input.focus(); return; }
    lastFocus = document.activeElement;
    bg.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    input.value = '';
    render();
    input.focus();
    load().then(() => { if (!bg.hidden) render(); });
  }
  function close() {
    if (!bg || bg.hidden) return;
    bg.hidden = true;
    document.documentElement.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  const isOpen = () => !!bg && !bg.hidden;

  // A visible search button means search belongs on this screen (on the editor page: only during the intro).
  const available = () => [...document.querySelectorAll('[data-search]')].some((b) => b.offsetParent !== null || b.getClientRects().length);
  const typing = (t) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  document.addEventListener('keydown', (e) => {
    const combo = (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k';
    if (!(combo || (e.key === '/' && !typing(e.target) && !e.metaKey && !e.ctrlKey))) return;
    if (!isOpen() && !available()) return;
    e.preventDefault();
    if (combo && isOpen()) close(); else open();
  });
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-search]'); if (b) { e.preventDefault(); open(); } });
  document.addEventListener('pointerover', (e) => { if (e.target.closest && e.target.closest('[data-search]')) load(); }, { passive: true });
  if (!MAC) document.querySelectorAll('.search-btn kbd').forEach((k) => { k.textContent = 'Ctrl K'; });

  window.ReelsmithSearch = { open, close, search: (q) => load().then(() => search(q)) };
})();
