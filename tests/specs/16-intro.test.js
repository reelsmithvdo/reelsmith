// First-visit introduction on the editor page (index.html #intro, js/intro.js), Photopea-style.
// The runner marks it as seen for every other spec.
const fresh = async (t, path = '') => {
  await t.eval(`localStorage.removeItem('reelsmith.intro'); 0`);
  await t.win.loadURL(t.url + path);
  await t.until('window.RS && RS.app ? 1 : 0', 20000, 'editor did not start');
  await t.sleep(500);
};
const open = (t) => t.eval(`!!document.getElementById('intro')`);

module.exports = {
  name: 'First-visit intro',
  modes: ['web', 'phone', 'tablet'],
  tests: {
    'new visitors see real content: one H1, guide links, screenshots with alt text': async (t) => {
      await fresh(t);
      t.ok(await open(t), 'intro not shown on first visit');
      const r = await t.page(() => ({
        h1: [...document.querySelectorAll('h1')].map((h) => h.textContent),
        links: [...document.querySelectorAll('#intro a[href^="/tools/"], #intro a[href^="/tutorials/"]')].length,
        noAlt: [...document.querySelectorAll('#intro img')].filter((i) => !i.alt && !i.closest('.intro-logo')).length,
        wide: document.getElementById('intro').scrollWidth > innerWidth + 1,
        lock: document.documentElement.classList.contains('intro-on'),
      }));
      t.eq(r.h1, ['Free Online Video Editor']);
      t.ok(r.links >= 6, 'guide links: ' + r.links);
      t.eq(r.noAlt, 0, 'images without alt text');
      t.ok(!r.wide, 'intro scrolls sideways');
      t.ok(r.lock, 'page behind the intro can scroll');
    },
    'editor shortcuts do not fire underneath while it is open': async (t) => {
      await t.page(() => document.body.focus());
      await t.key('Space');
      await t.sleep(300);
      t.ok(!(await t.eval(`RS.engine.playing ? 1 : 0`)), 'Space started playback behind the intro');
    },
    'the cookie banner stays usable on top of it': async (t) => {
      await t.eval(`localStorage.removeItem('reelsmith.consent'); localStorage.removeItem('reelsmith.intro'); 0`);
      await t.win.loadURL(t.url); await t.sleep(900);
      const hit = await t.page(() => { const b = document.querySelector('.rc-btn').getBoundingClientRect(); const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!(e && e.closest('.rc-box')); });
      t.ok(hit, 'banner is covered by the intro');
      await t.page(() => document.querySelectorAll('.rc-btn')[1].click());
    },
    '"Start editing" opens the editor and is remembered': async (t) => {
      await fresh(t);
      await t.click('.intro-hero [data-start]', { mouse: !t.isTouch });
      await t.sleep(300);
      t.ok(!(await open(t)), 'intro still open after Start editing');
      t.ok(await t.eval(`!document.documentElement.classList.contains('intro-on')`), 'page still locked');
      t.ok(await t.eval(`!!document.querySelector('.tl-scroller') && document.querySelector('.tl-scroller').getBoundingClientRect().width > 0`), 'editor not visible');
      await t.win.loadURL(t.url); await t.until('window.RS && RS.app ? 1 : 0', 20000); await t.sleep(400);
      t.ok(!(await open(t)), 'intro came back for a returning visitor');
    },
    'Escape also opens the editor': async (t) => {
      await fresh(t);
      await t.key('Escape');
      await t.sleep(200);
      t.ok(!(await open(t)), 'Escape did not close the intro');
    },
    'a slow tap on "Start editing" is a tap, not a long-press (touch)': async (t) => {
      if (!t.isTouch) return;
      await fresh(t);
      const b = await t.box('.intro-hero [data-start]');
      await t.touch('touchStart', b.x, b.y); await t.sleep(700); await t.touch('touchEnd'); await t.sleep(250);
      t.ok(!(await open(t)), 'held tap was swallowed as a long-press');
    },
    'deep links (?… or #…) go straight to the editor': async (t) => {
      await fresh(t, '?from=tool');
      t.ok(!(await open(t)), 'intro shown on a deep link');
      t.ok(await t.eval(`localStorage.getItem('reelsmith.intro') === null`), 'a deep link must not mark the intro as seen');
      await t.eval(`localStorage.setItem('reelsmith.intro', 'seen'); 0`);
    },
  },
};
