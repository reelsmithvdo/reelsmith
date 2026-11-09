// Browser edition shell: start screen, menu bar, keyboard, feedback form.
module.exports = {
  name: 'Start screen, menus and feedback',
  modes: ['web', 'phone', 'tablet'],
  tests: {
    'start screen buttons': async (t) => {
      await t.page(() => RS.web.home());
      await t.sleep(300);
      t.ok(await t.eval('RS.web.isHomeOpen()'), 'home did not open');
      t.eq(await t.eval(`[...document.querySelectorAll('.home-btn')].map((b) => b.textContent.trim()).slice(0, 3)`), ['New Project', 'Open From Computer', 'Start Editing']);
      t.eq(await t.eval(`document.querySelectorAll('.home .site-links > a').length`), 9, 'website links on home (8 pages + Cookie settings)');
      await t.click('.home-btn', { index: 2 });
      t.ok(!(await t.eval('RS.web.isHomeOpen()')), 'Start Editing should close home');
    },
    'keys do nothing while the start screen is open': async (t) => {
      await t.page(() => RS.web.home()); await t.sleep(200);
      await t.key('Space');
      t.ok(!(await t.eval('RS.state.playing')), 'space started playback behind the start screen');
      await t.page(() => RS.web.hideHome());
    },
    'every menu opens and fits on screen': async (t) => {
      await t.reset();
      const n = await t.eval(`document.querySelectorAll('.menubar-btn').length`);
      t.eq(n, 7);
      for (let i = 0; i < n; i++) {
        await t.eval(`document.querySelectorAll('.menubar-btn')[${i}].scrollIntoView({ inline: 'nearest' }); 0`);
        await t.click('.menubar-btn', { index: i });
        const r = await t.page(() => { const d = document.querySelector('.menu-drop'); if (!d) return null; const b = d.getBoundingClientRect(); return { items: d.querySelectorAll('.menu-item').length, left: b.left, right: b.right, w: innerWidth }; });
        t.ok(r && r.items > 2, 'menu ' + i + ' did not open');
        t.ok(r.left >= 0 && r.right <= r.w + 1, `menu ${i} goes off screen (${Math.round(r.left)}–${Math.round(r.right)} of ${r.w})`);
        await t.key('Escape');
        t.ok(!(await t.eval(`!!document.querySelector('.menu-drop')`)), 'Escape should close the menu');
      }
    },
    'menu item runs its command': async (t) => {
      await t.reset();
      await t.click('.menubar-btn', { index: 6 }); // Help
      await t.eval(`[...document.querySelectorAll('.menu-item')].find((b) => b.textContent.startsWith('Keyboard Shortcuts')).click(); 0`);
      await t.sleep(300);
      t.ok(await t.eval('RS.help.isOpen()'), 'Keyboard Shortcuts did not open help');
      await t.eval('RS.help.close(); 0');
    },
    'report a bug sends the form': async (t) => {
      await t.reset();
      const before = t.apiHits.length;
      await t.eval(`RS.cmd('reportBug'); 0`);
      await t.sleep(2700); // the form ignores instant (bot-like) submissions
      await t.page(() => { const m = document.querySelector('.modal'); m.querySelector('input[type=text]').value = 'Export stops halfway'; m.querySelector('textarea').value = 'Exporting a long clip stops at 50 percent.'; m.querySelector('.primary').click(); });
      await t.sleep(600);
      t.eq(t.apiHits.length, before + 1, 'no request to /api/feedback');
      const p = JSON.parse(t.apiHits[t.apiHits.length - 1].body);
      t.eq([p.kind, p.title], ['bug', 'Export stops halfway']);
      t.ok(p.diagnostics && /Reelsmith web \d/.test(p.diagnostics.app), 'version missing from diagnostics');
    },
    'feedback form validates input': async (t) => {
      await t.reset();
      await t.eval(`RS.cmd('requestFeature'); 0`); await t.sleep(300);
      await t.eval(`document.querySelector('.modal .primary').click(); 0`); await t.sleep(200);
      t.ok(/title/.test(await t.eval(`document.querySelector('.fb-status').textContent`)), 'no validation message');
      await t.page(() => T.closeModals());
    },
    '?report=feature opens the form': async (t) => {
      await t.win.loadURL(t.url + '?report=feature');
      await t.until('window.RS && RS.app && document.querySelector(".tl-scroller") ? 1 : 0', 15000);
      await t.eval(require('fs').readFileSync(require('path').join(__dirname, '..', 'page-helpers.js'), 'utf8'));
      await t.until(`document.querySelector('.modal-head') ? 1 : 0`, 3000, 'form did not open');
      t.eq(await t.eval(`(document.querySelector('.modal-head') || {}).textContent`), 'Request a Feature');
      await t.page(() => T.closeModals());
    },
    'made-with credit links to Algo Matryx in a new tab': async (t) => {
      await t.page(() => RS.web.home()); await t.sleep(300);
      const a = await t.page(() => { const l = document.querySelector('.home .credit a'); return l && [l.href, l.target, l.rel, !!l.closest('.credit').querySelector('svg.heart')]; });
      t.eq(a, ['https://algomatryx.com/', '_blank', 'noopener', true]);
      await t.page(() => RS.web.hideHome());
    },
    'brand logo returns to the start screen': async (t) => {
      await t.reset();
      await t.click('#topbar .brand');
      t.ok(await t.eval('RS.web.isHomeOpen()'));
      await t.page(() => RS.web.hideHome());
    },
  },
};
