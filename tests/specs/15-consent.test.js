// Cookie / privacy banner (website and editor). The runner pre-answers it for the other specs.
const fresh = async (t, path = '') => {
  await t.eval(`localStorage.removeItem('reelsmith.consent'); 0`);
  await t.win.loadURL(t.url + path);
  await t.sleep(900);
};
module.exports = {
  name: 'Cookie consent',
  modes: ['web', 'phone', 'tablet'],
  tests: {
    'banner appears on the first visit and Google consent defaults to denied': async (t) => {
      await fresh(t);
      t.ok(await t.eval(`!!document.querySelector('.rc-box')`), 'no banner on first visit');
      const d = await t.eval(`JSON.stringify(window.dataLayer.find((x) => x[0] === 'consent' && x[1] === 'default')[2])`);
      t.ok(/"ad_storage":"denied"/.test(d) && /"analytics_storage":"denied"/.test(d), d);
      const r = await t.page(() => { const b = document.querySelector('.rc-box').getBoundingClientRect(); return { l: b.left, r: b.right, w: innerWidth, bottom: b.bottom, h: innerHeight }; });
      t.ok(r.l >= 0 && r.r <= r.w && r.bottom <= r.h, 'banner off screen: ' + JSON.stringify(r));
    },
    '"Essential only" saves the choice and hides the banner for good': async (t) => {
      await t.click('.rc-btn', { index: 1, mouse: !t.isTouch });
      t.ok(!(await t.eval(`!!document.querySelector('.rc-box')`)), 'banner still shown');
      t.eq(await t.eval(`(({ ads, analytics }) => [ads, analytics])(JSON.parse(localStorage.getItem('reelsmith.consent')))`), [false, false]);
      await t.win.loadURL(t.url); await t.sleep(900);
      t.ok(!(await t.eval(`!!document.querySelector('.rc-box')`)), 'banner came back after reload');
    },
    'Customize lets you choose, Accept all grants both': async (t) => {
      await fresh(t);
      await t.page(() => { document.querySelectorAll('.rc-btn')[0].click(); });
      t.ok(await t.eval(`!document.querySelector('.rc-details').hidden`), 'details not shown');
      await t.page(() => { const i = document.querySelectorAll('.rc-opt input'); i[1].checked = true; document.querySelectorAll('.rc-btn')[0].click(); });
      t.eq(await t.eval(`(({ ads, analytics }) => [ads, analytics])(ReelsmithConsent.get())`), [false, true], 'analytics only');
      t.ok(/"analytics_storage":"granted"/.test(await t.eval(`JSON.stringify(window.dataLayer.filter((x) => x[0] === 'consent' && x[1] === 'update').pop()[2])`)), 'consent update not sent');
      await fresh(t);
      await t.page(() => document.querySelectorAll('.rc-btn')[2].click());
      t.eq(await t.eval(`[ReelsmithConsent.get().ads, ReelsmithConsent.get().analytics]`), [true, true]);
    },
    'Cookie settings reopens the choices (editor Help menu and site footer)': async (t) => {
      await t.win.loadURL(t.url); await t.sleep(900);
      await t.eval(`RS.cmd('cookieSettings'); 0`);
      t.ok(await t.eval(`!!document.querySelector('.rc-box') && !document.querySelector('.rc-details').hidden`), 'Help › Cookie Settings did not open');
      await t.win.loadURL(t.url + 'features/'); await t.sleep(700);
      t.ok(!(await t.eval(`!!document.querySelector('.rc-box')`)), 'site page asks again although a choice was made');
      await t.page(() => document.querySelector('[data-consent-settings]').click());
      t.ok(await t.eval(`!!document.querySelector('.rc-box')`), 'footer link did not open the settings');
    },
    'website pages show the banner to new visitors': async (t) => {
      await fresh(t, 'tutorials/');
      t.ok(await t.eval(`!!document.querySelector('.rc-box')`));
      await t.page(() => document.querySelectorAll('.rc-btn')[1].click());
      await t.win.loadURL(t.url); await t.until('window.RS && RS.app ? 1 : 0', 15000);
    },
  },
};
