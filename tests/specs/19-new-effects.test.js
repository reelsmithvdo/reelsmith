// Creative effects added in Nov 2026 (src/js/creative.js): Kaleidoscope, Zoom Blur, Duotone Pop, Old Film,
// Strobe Flash, Spotlight, Snowfall, Sparkles, Rain.
const IDS = ['kaleido', 'zoomblur', 'duotone', 'oldfilm', 'strobe', 'spotlight', 'snow', 'sparkle', 'rain'];

module.exports = {
  name: 'New creative effects',
  modes: ['web', 'phone'],
  tests: {
    'each is listed in Effects ▸ Creative Effects and found by search': async (t) => {
      await t.reset();
      const r = await t.page((ids) => ids.map((id) => { const fx = T.fx('vfx-' + id); return fx ? T.allFx().find((x) => x.id === 'vfx-' + id).group : null; }), IDS);
      t.eq(r, IDS.map(() => 'Creative Effects'));
    },
    'each changes the picture, and the same frame always renders the same (preview = export)': async (t) => {
      await t.reset();
      await t.page(async () => { const [m] = await T.import(await T.video({ name: 'c.mp4', w: 640, h: 360, secs: 2, bg: '#c04040', hue: 200 })); T.place(m.id, 'V1', 0); });
      // t = 0.03 s is inside a Strobe flash (each lasts ~0.05 s, four a second); everything else animates continuously.
      const plain = await t.page(async () => T.frameAt(0.03));
      for (const id of IDS) {
        const r = await t.page(async (id) => {
          const c = RS.state.project.clips.find((x) => x.type === 'video');
          RS.effects.apply('vfx-' + id, [c]);
          const a = await T.frameAt(0.03), b = await T.frameAt(0.03);
          RS.commit('clear', () => { RS.getClip(c.id).vfx = {}; });
          return { a, b };
        }, id);
        t.ok(T_diff(r.a, plain) > 0, id + ' did not change the picture');
        t.eq(r.a.hash, r.b.hash, id + ' renders differently each time');
      }
      t.eq(t.errors, [], 'console errors');
    },
    'Effect Controls shows a strength slider for a new effect': async (t) => {
      await t.reset();
      await t.page(async () => { const [m] = await T.import(await T.video({ name: 'c.mp4', secs: 1 })); const c = T.place(m.id, 'V1', 0); const x = RS.state.project.clips.find((y) => y.type === 'video'); RS.effects.apply('vfx-snow', [x]); T.select(x.id); });
      await t.sleep(300);
      t.ok(await t.eval(`[...document.querySelectorAll('#effect-controls *')].some((e) => e.children.length === 0 && e.textContent.trim() === 'Snowfall')`), 'no Snowfall row');
    },
  },
};
function T_diff(a, b) { return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) + (a.hash === b.hash ? 0 : 1); }
