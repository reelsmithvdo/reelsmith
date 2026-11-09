// Project templates on the start screen (src/js/templates.js).
module.exports = {
  name: 'Project templates',
  modes: ['web', 'phone', 'tablet'],
  tests: {
    'the start screen offers the templates, each fully visible': async (t) => {
      await t.reset();
      await t.eval(`RS.web.home(); 0`); await t.sleep(400);
      const r = await t.page(() => [...document.querySelectorAll('.home-tpl')].map((b) => { const x = b.getBoundingClientRect(); return { id: b.dataset.template, w: x.width, ok: x.left >= 0 && x.right <= innerWidth + 1 }; }));
      t.eq(r.map((x) => x.id), ['shorts', 'youtube', 'podcast', 'square', 'meme', 'intro']);
      t.ok(r.every((x) => x.ok && x.w > 120), 'a template card is cut off: ' + JSON.stringify(r));
    },
    'clicking "Shorts / Reels / TikTok" builds a 9:16 project with titles above an empty V1': async (t) => {
      await t.reset();
      await t.eval(`RS.web.home(); 0`); await t.sleep(400);
      await t.click('.home-tpl[data-template="shorts"]', { mouse: !t.isTouch });
      await t.until(`RS.state.project.clips.length >= 3 ? 1 : 0`, 8000, 'template did not build');
      const r = await t.page(() => {
        const P = RS.state.project, v1 = RS.tracksOf('video')[0].id;
        return { size: [P.settings.width, P.settings.height], auto: P.settings.autoMatch, onV1: P.clips.filter((c) => c.trackId === v1).length, kinds: [...new Set(P.clips.map((c) => c.type))].sort(), home: !!document.querySelector('.home'), guide: !!document.querySelector('.tool-guide'), text: (P.clips.find((c) => c.type === 'text') || {}).text?.content };
      });
      t.eq(r.size, [1080, 1920]); t.eq(r.auto, false); t.eq(r.onV1, 0, 'V1 must stay free for the video');
      t.eq(r.kinds, ['graphic', 'text']); t.eq([r.home, r.guide], [false, true]); t.eq(r.text, 'WAIT\nFOR IT');
    },
    'a landscape video dropped into a vertical template does not change the frame': async (t) => {
      await t.page(async () => { const [m] = await T.import(await T.video({ name: 'wide.mp4', w: 640, h: 360, secs: 1 })); T.place(m.id, RS.tracksOf('video')[0].id, 0); });
      t.eq(await t.eval(`[RS.state.project.settings.width, RS.state.project.settings.height]`), [1080, 1920]);
    },
    'every template builds without errors and renders something': async (t) => {
      for (const id of await t.eval(`RS.templates.LIST.map((x) => x.id)`)) {
        await t.reset();
        await t.page(async (id) => { await RS.templates.create(id); }, id);
        const ink = await t.page(async () => { await T.frameAt(3.5); return T.ink(); });
        t.ok(ink > 0.005, id + ' renders an empty frame');
      }
      t.eq(t.errors, [], 'console errors');
    },
  },
};
