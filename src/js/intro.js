// First-visit introduction (see #intro in index.html), the way photopea.com does it: new visitors and
// search engines see real content; one click opens the editor and is remembered, so returning visitors,
// deep links (?… or #…) and the desktop app (file://) go straight to the editor.
(() => {
  'use strict';
  const KEY = 'reelsmith.intro';
  const el = document.getElementById('intro');
  if (!el) return;
  let seen = false;
  try { seen = localStorage.getItem(KEY) === 'seen'; } catch {}
  if (seen || location.search || location.hash || location.protocol === 'file:') { el.remove(); return; }

  const root = document.documentElement;
  root.classList.add('intro-on');
  // While it is open, keep editor shortcuts (Space = play, Delete, …) from firing underneath.
  const keys = (e) => { e.stopImmediatePropagation(); if (e.key === 'Escape') close(); };
  window.addEventListener('keydown', keys, true);
  function close() {
    try { localStorage.setItem(KEY, 'seen'); } catch {}
    window.removeEventListener('keydown', keys, true);
    el.remove();
    root.classList.remove('intro-on');
    window.dispatchEvent(new Event('resize'));
  }
  el.addEventListener('click', (e) => { if (e.target.closest('[data-start]')) { e.preventDefault(); close(); } });
  window.RSIntro = { close, isOpen: () => el.isConnected };
  const first = el.querySelector('.intro-hero [data-start]');
  if (first) requestAnimationFrame(() => first.focus({ preventScroll: true }));
})();
