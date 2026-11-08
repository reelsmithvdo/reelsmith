'use strict';
// In-app Help Center: searchable knowledge base rendered from help-content.js.
(function (RS) {
  const H = RS.help = {};
  let back = null, navEl, articleEl, searchEl, current = null;
  const byId = (id) => RS.HELP_ARTICLES.find((a) => a.id === id);

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function inline(s) {
    return esc(s)
      .replace(/\[\[([\w-]+)\|([^\]]+)\]\]/g, (_, id, text) => `<a href="#" class="kb-link" data-kb="${id}">${text}</a>`)
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/`([^`]+)`/g, '<kbd>$1</kbd>');
  }
  // Tiny block parser: ## headings, "- " bullets, "1. " numbered lists, paragraphs.
  H.renderMarkup = (body) => {
    const out = [];
    let list = null, para = [];
    const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
    const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`); list = null; } };
    for (const raw of body.split('\n')) {
      const line = raw.trim();
      let m;
      if (!line) { flushPara(); flushList(); continue; }
      if (line.startsWith('## ')) { flushPara(); flushList(); out.push(`<h3>${inline(line.slice(3))}</h3>`); continue; }
      if ((m = line.match(/^- (.*)$/))) { flushPara(); if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; } list.items.push(m[1]); continue; }
      if ((m = line.match(/^\d+\. (.*)$/))) { flushPara(); if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; } list.items.push(m[1]); continue; }
      flushList();
      para.push(line);
    }
    flushPara(); flushList();
    return out.join('');
  };

  const plain = (s) => s.replace(/\[\[[\w-]+\|([^\]]+)\]\]/g, '$1').replace(/\*\*|`/g, '').replace(/^## /gm, '');

  function renderNav(query) {
    navEl.innerHTML = '';
    const q = (query || '').trim().toLowerCase();
    if (q) {
      const terms = q.split(/\s+/);
      const hits = RS.HELP_ARTICLES.map((a) => {
        const t = a.title.toLowerCase(), b = plain(a.body).toLowerCase();
        if (!terms.every((w) => t.includes(w) || b.includes(w))) return null;
        const score = terms.reduce((s, w) => s + (t.includes(w) ? 10 : 0) + (b.split(w).length - 1), 0);
        const i = b.indexOf(terms[0]);
        const snip = plain(a.body).slice(Math.max(0, i - 40), i + 90).replace(/\s+/g, ' ');
        return { a, score, snip };
      }).filter(Boolean).sort((x, y) => y.score - x.score);
      navEl.append(RS.h('div', { class: 'kb-cat' }, hits.length ? `${hits.length} result${hits.length > 1 ? 's' : ''}` : 'No results'));
      for (const { a, snip } of hits) {
        const it = RS.h('div', { class: 'kb-item result' + (current === a.id ? ' on' : '') }, RS.h('div', { class: 'kb-item-title' }, a.title), RS.h('div', { class: 'kb-snip' }, '…' + snip + '…'));
        it.addEventListener('click', () => show(a.id));
        navEl.append(it);
      }
      return;
    }
    for (const cat of RS.HELP_CATEGORIES) {
      navEl.append(RS.h('div', { class: 'kb-cat' }, cat));
      for (const a of RS.HELP_ARTICLES.filter((x) => x.cat === cat)) {
        const it = RS.h('div', { class: 'kb-item' + (current === a.id ? ' on' : ''), 'data-id': a.id }, a.title);
        it.addEventListener('click', () => show(a.id));
        navEl.append(it);
      }
    }
  }

  function show(id) {
    const a = byId(id) || RS.HELP_ARTICLES[0];
    current = a.id;
    articleEl.innerHTML = '';
    const body = RS.h('div', { class: 'kb-body', html: H.renderMarkup(a.body) });
    const related = RS.HELP_ARTICLES.filter((x) => x.cat === a.cat && x.id !== a.id);
    articleEl.append(RS.h('div', { class: 'kb-crumb' }, a.cat), RS.h('h2', null, a.title), body,
      related.length ? RS.h('div', { class: 'kb-related' }, RS.h('div', { class: 'kb-cat' }, 'Related'),
        related.map((r) => { const l = RS.h('a', { href: '#', class: 'kb-link', 'data-kb': r.id }, r.title); return l; })) : null);
    articleEl.scrollTop = 0;
    RS.$$('.kb-item', navEl).forEach((el) => el.classList.toggle('on', el.dataset.id === a.id));
  }

  H.open = (id) => {
    if (!back) build();
    document.body.append(back);
    renderNav(searchEl.value);
    show(id || current || 'welcome');
    setTimeout(() => searchEl.focus(), 0);
  };
  H.close = () => { if (back) back.remove(); };
  H.isOpen = () => !!(back && back.isConnected);

  function build() {
    searchEl = RS.h('input', { type: 'search', class: 'kb-search', placeholder: 'Search help (e.g. "unlink audio", "transition", "export")' });
    searchEl.addEventListener('input', () => renderNav(searchEl.value));
    searchEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const first = navEl.querySelector('.kb-item'); if (first) first.click(); }
    });
    navEl = RS.h('div', { class: 'kb-nav' });
    articleEl = RS.h('div', { class: 'kb-article' });
    const win = RS.h('div', { class: 'kb-win' },
      RS.h('div', { class: 'kb-head' }, RS.icon('help'), RS.h('b', null, 'Reelsmith Help'), searchEl, RS.iconBtn('close', 'Close (Esc)', () => H.close())),
      RS.h('div', { class: 'kb-main' }, navEl, articleEl));
    back = RS.h('div', { class: 'help-back' }, win);
    back.addEventListener('pointerdown', (e) => { if (e.target === back) H.close(); });
    back.addEventListener('click', (e) => {
      const l = e.target.closest('.kb-link');
      if (l) { e.preventDefault(); searchEl.value = ''; renderNav(''); show(l.dataset.kb); }
    });
    back.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') H.close(); });
  }
})(window.RS);
