// Website tool pages (/tools/…) and the task guide they open in the editor (/?tool=<id>, W.TOOLS in web.js).
const load = async (t, path) => {
  await t.win.loadURL(t.url + path);
  await t.until('window.RS && RS.app ? 1 : 0', 20000, 'editor did not start');
  await t.sleep(500);
  t.errors.length = 0;
};

module.exports = {
  name: 'Tool pages and task guides',
  modes: ['web', 'phone', 'tablet'],
  tests: {
    'every tool page links to a guide that exists, and the index lists them all': async (t) => {
      const r = await t.page(async () => {
        const idx = await (await fetch('/tools/')).text();
        const links = [...idx.matchAll(/href="(\/tools\/[\w-]+\/)"/g)].map((m) => m[1]);
        const out = [];
        for (const l of [...new Set(links)]) {
          const h = await (await fetch(l)).text();
          const tool = (h.match(/href="\/\?tool=([\w-]+)"/) || [])[1];
          out.push({ l, tool, ok: !!(tool && RS.web.TOOLS[tool]), h1: (h.match(/<h1>/g) || []).length });
        }
        return out;
      });
      t.ok(r.length >= 12, 'tool pages: ' + r.length);
      for (const x of r) { t.ok(x.ok, 'no working guide on ' + x.l + ' (' + x.tool + ')'); t.eq(x.h1, 1, 'H1 count on ' + x.l); }
    },
    '/?tool=subtitles opens the editor with its guide — no intro, no start screen, clean address': async (t) => {
      await t.eval(`localStorage.removeItem('reelsmith.intro'); 0`);
      await load(t, '?tool=subtitles');
      const r = await t.page(() => ({ intro: !!document.getElementById('intro'), home: !!document.querySelector('.home'), guide: (document.querySelector('.tool-guide strong') || {}).textContent, search: location.search, steps: document.querySelectorAll('.tool-guide li').length }));
      t.eq([r.intro, r.home, r.guide, r.search, r.steps], [false, false, 'Add subtitles', '', 3]);
      const g = await t.page(() => { const b = document.querySelector('.tool-guide').getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: innerWidth, h: innerHeight }; });
      t.ok(g.l >= 0 && g.r <= g.w && g.t >= 0 && g.b <= g.h, 'guide off screen ' + JSON.stringify(g));
      await t.eval(`localStorage.setItem('reelsmith.intro', 'seen'); 0`);
    },
    'guide buttons run real commands (Sequence Settings opens its dialog)': async (t) => {
      await load(t, '?tool=resize');
      await t.click('.tool-guide .tg-actions .btn', { index: 0, mouse: !t.isTouch });
      await t.sleep(300);
      t.ok(await t.eval(`!!document.querySelector('.modal-back')`), 'Sequence Settings did not open');
      await t.page(() => document.querySelectorAll('.modal-back').forEach((m) => m.remove()));
    },
    'the close button removes the guide': async (t) => {
      await load(t, '?tool=trim');
      await t.click('.tool-guide .tg-x', { mouse: !t.isTouch });
      t.ok(!(await t.eval(`!!document.querySelector('.tool-guide')`)), 'guide still shown');
    },
    'every guide opens without errors': async (t) => {
      await load(t, '');
      const ids = await t.eval(`Object.keys(RS.web.TOOLS)`);
      for (const id of ids) {
        await t.page((x) => RS.web.toolGuide(x), id);
        t.ok(await t.eval(`document.querySelectorAll('.tool-guide').length === 1`), 'guide not shown once for ' + id);
      }
      t.eq(t.errors.filter((e) => !/favicon/.test(e)), [], 'console errors');
    },
  },
};
