// Sequences: settings, new sequence, nesting, multi-camera, adjustment layers, color matte.
module.exports = {
  name: 'Sequences',
  tests: {
    'sequence settings change the frame size': async (t) => {
      await t.reset();
      await t.page(() => RS.commit('s', () => Object.assign(RS.state.project.settings, { width: 1080, height: 1920 })));
      t.eq(await t.eval(`[RS.engine.canvas.width, RS.engine.canvas.height].join('x')`), '1080x1920');
    },
    'new sequence opens as a tab': async (t) => {
      await t.reset();
      const n = await t.eval(`RS.state.project.sequences.length`);
      await t.page(() => { const q = RS.newSequence(RS.nextSequenceName('Sequence'), RS.state.project.settings); RS.commit('q', () => RS.state.project.sequences.push(q)); RS.openSequence(q.id); });
      t.eq(await t.eval(`RS.state.project.sequences.length`), n + 1);
    },
    'nest selected clips': async (t) => {
      await t.reset();
      await t.page(async () => { const [m] = await T.import(await T.video({ secs: 2, audio: false })); T.place(m.id, 'V1', 0); T.place(m.id, 'V1', 2); T.select(...T.clips('video').map((c) => c.id)); RS.cmd('nest'); });
      await t.until(`document.querySelector('.modal')`, 2000, 'name prompt');
      await t.eval(`document.querySelector('.modal .primary').click(); 0`); await t.sleep(300);
      t.eq(await t.eval(`[RS.state.project.sequences.length, T.clips().filter((c) => c.seqId).length]`), [2, 1]);
    },
    'multi-camera source sequence': async (t) => {
      await t.reset();
      await t.page(async () => { const ms = await T.import(await T.video({ name: 'cam1.mp4', secs: 2 }), await T.video({ name: 'cam2.mp4', secs: 2, hue: 90 })); RS.state.selectedMedia = new Set(ms.map((m) => m.id)); RS.cmd('createMulticam'); });
      await t.until(`document.querySelector('.modal')`, 2000, 'multicam dialog');
      await t.page(() => { const s = document.querySelector('.modal select'); s.value = 'in'; s.dispatchEvent(new Event('change')); document.querySelector('.modal .primary').click(); });
      await t.sleep(600);
      t.ok(await t.eval(`RS.state.project.sequences.some((q) => q.multicam)`), 'no multicam sequence');
    },
    'adjustment layer and color matte': async (t) => {
      await t.reset();
      await t.page(async () => { const [m] = await T.import(await T.video({ secs: 2, audio: false })); T.place(m.id, 'V1', 0); RS.engine.seek(0.5, false); RS.cmd('addAdjustment'); RS.cmd('addMatte'); });
      t.ok(await t.eval(`T.clips().some((c) => c.type === 'adjust') && T.clips().some((c) => c.type === 'solid')`), 'missing: ' + await t.eval(`T.clips().map((c) => c.type).join(',')`));
    },
  },
};
