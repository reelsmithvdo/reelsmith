// Library graphics: double-click / double-tap adds them, and they are visible right away.
module.exports = {
  name: 'Library',
  tests: {
    'double-click (or double-tap) a card adds it': async (t) => {
      await t.reset();
      await t.page(async () => { const [m] = await T.import(await T.video({ name: 'bg.mp4', secs: 6, audio: false })); T.place(m.id, 'V1', 0); RS.engine.seek(1, false); });
      if (t.isPhone) await t.page(() => RS.touch.openSheet('library'));
      else await t.eval(`document.querySelector('.tab[data-tab=library]').click(); 0`);
      await t.sleep(300);
      await t.dblclick('.lib-card', { index: 1 }); // Like Button
      await t.sleep(400);
      t.eq(await t.eval(`T.clips('graphic').map((c) => c.graphic.kind)`), ['like']);
    },
    'the added graphic is visible in the monitor immediately': async (t) => {
      const r = await t.page(async () => { await T.wait(300); const g = T.clips('graphic')[0]; const ph = RS.state.playhead; return { inside: ph > g.start && ph < g.start + g.duration, ph, start: g.start }; });
      t.ok(r.inside, 'playhead should be inside the new graphic: ' + JSON.stringify(r));
      const d = await t.page(async () => { const g = T.clips('graphic')[0]; const on = await T.frameAt(RS.state.playhead); RS.commit('h', () => { RS.getClip(g.id).disabled = true; }); const off = await T.frameAt(RS.state.playhead); RS.cmd('undo'); return T.diff(on, off); });
      t.gt(d, 0, 'graphic not visible at the playhead');
    },
    'every library item renders': async (t) => {
      await t.reset();
      const res = await t.page(async () => {
        const out = [];
        for (const it of RS.library.ITEMS) { await RS.library.add(it.id, 0); const g = T.clips('graphic').pop(); await T.frameAt(Math.min(1.6, g.duration / 2)); out.push([it.name, T.ink() > 0.0005]); RS.cmd('undo'); }
        return out;
      });
      t.eq(res.length, 10);
      t.eq(res.filter((r) => !r[1]).map((r) => r[0]), [], 'items that draw nothing');
    },
    'subscribe button comes with a linked sound': async (t) => {
      await t.reset();
      const r = await t.page(async () => { await RS.library.add('subscribe', 0); const g = T.clips('graphic')[0], a = T.clips('audio')[0]; return { linked: !!(a && g.linkId && a.linkId === g.linkId), aStart: a && a.start }; });
      t.ok(r.linked, 'sound should be linked');
      t.eq(r.aStart, 0);
    },
    'graphic text can be changed': async (t) => {
      await t.page(() => { const g = T.clips('graphic')[0]; RS.commit('x', () => { RS.getClip(g.id).graphic.text = 'JOIN'; }); });
      t.eq(await t.eval(`T.clips('graphic')[0].graphic.text`), 'JOIN');
    },
  },
};
