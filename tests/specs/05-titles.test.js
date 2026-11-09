// Titles, text styles, templates and stickers.
const base = async (t, w = 1280, h = 720) => {
  await t.reset();
  await t.page(async (w, h) => { const [m] = await T.import(await T.video({ name: 'bg.mp4', w, h, secs: 4, audio: false })); T.place(m.id, 'V1', 0); RS.engine.seek(1, false); }, w, h);
};
// Width of white text pixels in the program frame (how big the title is on screen).
// Measured 1 s into the title (titles fade in over their first 0.3 s).
const textWidth = (t) => t.page(async () => {
  await T.frameAt(T.clips('text')[0].start + 1);
  const cv = RS.engine.canvas, g = document.createElement('canvas'); g.width = cv.width; g.height = cv.height;
  const x = g.getContext('2d'); x.drawImage(cv, 0, 0); const d = x.getImageData(0, 0, g.width, g.height).data;
  let a = 1e9, b = -1;
  for (let y = 0; y < g.height; y += 2) for (let i = 0; i < g.width; i += 2) { const k = (y * g.width + i) * 4; if (d[k] > 235 && d[k + 1] > 235 && d[k + 2] > 235) { if (i < a) a = i; if (i > b) b = i; } }
  return b < 0 ? 0 : (b - a) / g.width;
});

module.exports = {
  name: 'Titles and text effects',
  tests: {
    'new title fits the frame at any sequence size': async (t) => {
      for (const [w, h] of [[640, 360], [1920, 1080], [1080, 1920]]) {
        await base(t, w, h);
        await t.eval(`RS.cmd('addTitle'); 0`); await t.sleep(200);
        const f = await textWidth(t);
        t.ok(f > 0.15 && f < 0.85, `title is ${Math.round(f * 100)}% of the frame width at ${w}×${h}`);
      }
    },
    'Type tool: click the monitor and type': async (t) => {
      if (t.isTouch) t.skip('needs a keyboard');
      await base(t);
      await t.key('t');
      t.eq(await t.eval('RS.state.tool'), 'type');
      const b = await t.box('.program-overlay');
      await t.click({ x: b.x, y: b.y });
      await t.sleep(200);
      await t.type('Hello');
      await t.key('Escape');
      await t.sleep(200);
      const txt = await t.eval(`(T.clips('text')[0] || {}).text && T.clips('text')[0].text.content`);
      t.eq(txt, 'Hello');
      t.eq(await t.eval('RS.state.playhead'), 1, 'typing must not move the playhead');
    },
    'every text style applies and renders': async (t) => {
      await base(t);
      await t.eval(`RS.cmd('addTitle'); 0`);
      const res = await t.page(async () => {
        const styles = T.allFx().filter((i) => i.group === 'Text Styles');
        const tc = T.clips('text')[0]; const out = [];
        for (const s of styles) { T.select(tc.id); RS.effects.applyItem(s); const f = await T.frameAt(tc.start + 1); out.push([s.name, f.hash]); }
        return out;
      });
      t.gt(res.length, 10, 'text styles');
      t.ok(new Set(res.map((r) => r[1])).size > res.length * 0.7, 'styles look identical: ' + JSON.stringify(res));
    },
    'every title template creates a visible title': async (t) => {
      await base(t);
      const res = await t.page(async () => {
        const out = [];
        for (const it of T.allFx().filter((i) => i.group === 'Title Templates')) {
          const n = T.clips().length; await it.create(1); const f = await T.frameAt(1.6);
          out.push([it.name, T.clips().length > n, f.hash]);
          RS.cmd('undo');
        }
        return out;
      });
      t.gt(res.length, 5);
      const bad = res.filter((r) => !r[1]);
      t.eq(bad.map((r) => r[0]), [], 'templates that added nothing');
    },
    'stickers add an emoji clip': async (t) => {
      await base(t);
      await t.page(async () => { const st = T.allFx().find((i) => i.group === 'Stickers'); await st.create(1); });
      t.eq(await t.eval(`T.clips().filter((c) => c.type === 'text' || c.type === 'sticker' || c.type === 'graphic').length`), 1);
    },
    'animations: in, out and loop on a title': async (t) => {
      await base(t);
      await t.eval(`RS.cmd('addTitle'); 0`);
      const r = await t.page(async () => {
        const tc = T.clips('text')[0];
        for (const id of ['ain-pop', 'aout-fade', 'aloop-pulse']) { const it = T.fx(id) || T.allFx().find((x) => x.id.startsWith(id.split('-')[0]) ); T.select(tc.id); RS.effects.applyItem(it); }
        const a = await T.frameAt(tc.start + 0.05), b = await T.frameAt(tc.start + 1.5);
        return { anim: RS.getClip(tc.id).anim, diff: T.diff(a, b) };
      });
      t.ok(r.anim && r.anim.in && r.anim.out && r.anim.loop, 'animation slots: ' + JSON.stringify(r.anim));
      t.gt(r.diff, 0, 'In animation should change the first frames');
    },
  },
};
