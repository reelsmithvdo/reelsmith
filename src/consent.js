// Cookie / privacy consent for reelsmithapp.com (website and editor). Not used by the desktop app.
//
// Today Reelsmith sets no tracking or advertising cookies, so nothing waits on this choice yet.
// When ads or analytics are added, load them ONLY through ReelsmithConsent.onChange(), e.g.
//   ReelsmithConsent.onChange((c) => { if (c.ads) loadAdScript(); });
// Google Consent Mode v2 defaults are set to "denied" below and updated from the visitor's choice.
// Note: to show Google ads to visitors in the EEA, UK and Switzerland, Google requires a
// Google-certified consent platform (for example the free "Privacy & messaging" CMP in AdSense).
// Switch to that when ads go live; this banner then becomes unnecessary.
(function () {
  'use strict';
  if (window.native || window.ReelsmithConsent) return; // desktop app, or already loaded
  const KEY = 'reelsmith.consent';
  const VERSION = 1;
  const listeners = [];
  const read = () => { try { const c = JSON.parse(localStorage.getItem(KEY) || 'null'); return c && c.v === VERSION ? c : null; } catch { return null; } };
  const save = (c) => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* storage blocked: ask again next visit */ } };

  // Google Consent Mode v2: everything denied until the visitor agrees.
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 });
  const pushGoogle = (c) => gtag('consent', 'update', {
    ad_storage: c.ads ? 'granted' : 'denied', ad_user_data: c.ads ? 'granted' : 'denied', ad_personalization: c.ads ? 'granted' : 'denied',
    analytics_storage: c.analytics ? 'granted' : 'denied',
  });

  let current = read();
  if (current) pushGoogle(current);

  function decide(ads, analytics) {
    current = { v: VERSION, ads: !!ads, analytics: !!analytics, at: new Date().toISOString() };
    save(current);
    pushGoogle(current);
    close();
    listeners.forEach((fn) => { try { fn(current); } catch (err) { console.warn(err); } });
  }

  let box = null;
  function close() { if (box) { box.remove(); box = null; } }
  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const k in attrs || {}) { if (k === 'class') e.className = attrs[k]; else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]); else e.setAttribute(k, attrs[k]); }
    for (const k of kids) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k));
    return e;
  }
  function toggle(label, desc, on, locked) {
    const input = el('input', { type: 'checkbox' });
    input.checked = !!on; input.disabled = !!locked;
    return { input, row: el('label', { class: 'rc-opt' }, input, el('span', null, el('b', null, label), el('small', null, desc))) };
  }
  function open(withDetails) {
    close();
    const c = current || { ads: false, analytics: false };
    const ess = toggle('Essential', 'Saves your projects, settings and the caption engine in this browser. Always on.', true, true);
    const ana = toggle('Analytics', 'Anonymous statistics that help us improve Reelsmith (not used yet).', c.analytics);
    const ads = toggle('Advertising', 'Lets ads be shown and measured. Keeps Reelsmith free (not used yet).', c.ads);
    const details = el('div', { class: 'rc-details' }, ess.row, ana.row, ads.row);
    if (!withDetails) details.hidden = true;
    const customize = el('button', { class: 'rc-btn ghost', type: 'button', onclick: () => {
      if (details.hidden) { details.hidden = false; customize.textContent = 'Save choices'; }
      else decide(ads.input.checked, ana.input.checked);
    } }, withDetails ? 'Save choices' : 'Customize');
    box = el('div', { class: 'rc-box', role: 'dialog', 'aria-label': 'Privacy choices', 'aria-live': 'polite' },
      el('p', { class: 'rc-text' },
        el('b', null, 'Your privacy. '),
        'Your videos never leave your computer. Reelsmith only stores what it needs to work in your browser. With your OK, we may also use cookies for statistics and ads in the future. ',
        el('a', { href: '/privacy/' }, 'Privacy policy')),
      details,
      el('div', { class: 'rc-actions' },
        customize,
        el('button', { class: 'rc-btn ghost', type: 'button', onclick: () => decide(false, false) }, 'Essential only'),
        el('button', { class: 'rc-btn primary', type: 'button', onclick: () => decide(true, true) }, 'Accept all')));
    document.body.append(box);
  }

  const css = `
.rc-box{position:fixed;z-index:5000;left:16px;bottom:16px;max-width:460px;width:calc(100vw - 32px);box-sizing:border-box;padding:16px;background:#1b1e24;color:#e4e7ec;border:1px solid #3a404a;border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.55);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.rc-text{margin:0 0 12px}.rc-text a{color:#ffc56b}
.rc-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
.rc-btn{font:inherit;font-size:13.5px;padding:8px 14px;border-radius:7px;border:1px solid #3a404a;background:transparent;color:#e4e7ec;cursor:pointer}
.rc-btn:hover{border-color:#f0a83a}.rc-btn.primary{background:#f0a83a;border-color:#f0a83a;color:#1a1306;font-weight:600}.rc-btn.primary:hover{background:#ffbf5e}
.rc-details{display:flex;flex-direction:column;gap:10px;margin:0 0 14px;padding:12px;background:#15171b;border-radius:8px}
.rc-opt{display:flex;gap:10px;align-items:flex-start;cursor:pointer}.rc-opt input{margin-top:3px;accent-color:#f0a83a}
.rc-opt span{display:flex;flex-direction:column}.rc-opt small{color:#a9b0bb;font-size:12.5px}
@media (max-width:760px){.rc-box{left:8px;right:8px;width:auto;bottom:calc(64px + env(safe-area-inset-bottom))}.rc-btn{flex:1}}
@media print{.rc-box{display:none}}`;

  window.ReelsmithConsent = {
    get: () => current,                              // null until the visitor has chosen
    open: () => open(true),                          // "Cookie settings" links call this
    onChange: (fn) => { listeners.push(fn); if (current) fn(current); },
  };

  const start = () => {
    document.head.append(el('style', null, css));
    // Any element with data-consent-settings opens the settings (footer link, Help menu).
    document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('[data-consent-settings]'); if (a) { e.preventDefault(); open(true); } });
    if (!current && !navigator.webdriver) open(false);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
