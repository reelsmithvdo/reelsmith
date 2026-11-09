// Contact form on /contact/: validates, then POSTs JSON to /api/contact (worker/index.js sends it with Brevo).
(() => {
  'use strict';
  const f = document.getElementById('contact-form');
  if (!f) return;
  const t0 = Date.now();
  const status = f.querySelector('.cf-status');
  const btn = f.querySelector('button[type=submit]');
  const say = (msg, kind) => { status.textContent = msg; status.className = 'cf-status' + (kind ? ' ' + kind : ''); };
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    const bad = !d.name.trim() ? ['cf-name', 'Please enter your name.']
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()) ? ['cf-email', 'Please enter a valid email address.']
        : d.message.trim().length < 10 ? ['cf-message', 'Please write a little more (at least 10 characters).'] : null;
    f.querySelectorAll('[aria-invalid]').forEach((x) => x.removeAttribute('aria-invalid'));
    if (bad) { const el = document.getElementById(bad[0]); el.setAttribute('aria-invalid', 'true'); el.focus(); say(bad[1], 'err'); return; }
    btn.disabled = true; say('Sending…');
    try {
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...d, elapsed: Date.now() - t0 }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || 'Could not send right now — please email reelsmith.vdo@gmail.com');
      f.reset();
      say('Thank you! Your message was sent — we will reply by email.', 'ok');
    } catch (err) {
      say(err.message, 'err');
    } finally { btn.disabled = false; }
  });
})();
