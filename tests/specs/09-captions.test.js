// Captions: manual captions, typing, SRT, show/hide, burn-in — and (slow) automatic captions.
module.exports = {
  name: 'Captions',
  tags: { 'auto captions match the speech timing': { slow: true, timeout: 300000, modes: ['web'] } },
  tests: {
    'add a caption at the playhead and type it': async (t) => {
      await t.reset();
      await t.page(async () => { const [m] = await T.import(await T.video({ name: 'v.mp4', secs: 6, audio: false })); T.place(m.id, 'V1', 0); RS.engine.seek(1, false); RS.cmd('addCaption'); });
      await t.sleep(300);
      const ta = await t.eval(`!!document.activeElement && document.activeElement.tagName`);
      t.eq(ta, 'TEXTAREA', 'caption text box should get focus');
      if (!t.isTouch) {
        await t.key('a', ['mod']);
        await t.type('How are you');
        await t.eval(`document.activeElement.blur(); 0`);
        await t.sleep(200);
        t.eq(await t.eval(`T.clips('caption')[0].text`), 'How are you');
        t.eq(await t.eval('RS.state.playhead'), 1, 'typing moved the playhead');
      }
    },
    'SRT export and import round-trip': async (t) => {
      await t.reset();
      const r = await t.page(() => {
        RS.commit('c', () => { RS.ops.addCaption(1, 2, 'First line'); RS.ops.addCaption(3.5, 1.5, 'Second line'); });
        const srt = RS.captions.toSrt(RS.state.project.seq);
        return { srt, parsed: RS.captions.parseSrt(srt).map((c) => [c.start, c.end, c.text]) };
      });
      t.ok(/00:00:01,000 --> 00:00:03,000/.test(r.srt), r.srt);
      t.eq(r.parsed, [[1, 3, 'First line'], [3.5, 5, 'Second line']]);
    },
    'captions are burned into the picture, and can be hidden': async (t) => {
      await t.reset();
      const r = await t.page(async () => {
        const [m] = await T.import(await T.video({ name: 'v.mp4', secs: 4, audio: false })); T.place(m.id, 'V1', 0);
        const a = await T.frameAt(1.5);
        RS.commit('c', () => RS.ops.addCaption(1, 2, 'Visible caption'));
        const b = await T.frameAt(1.5);
        RS.captions.setVisible(false);
        const c = await T.frameAt(1.5);
        RS.captions.setVisible(true);
        return { shown: T.diff(a, b), hidden: T.diff(a, c) };
      });
      t.gt(r.shown, 0, 'caption not drawn');
      t.eq(r.hidden, 0, 'hidden caption still drawn');
    },
    'auto captions match the speech timing': async (t) => {
      // tests/fixtures/speech.m4a: 10 spoken phrases with known pauses (placed at 2 s).
      const SPEECH = [[0.0, 1.2], [2.92, 5.88], [8.64, 11.48], [12.9, 15.5], [18.78, 21.4], [23.14, 26.34], [30.56, 32.66], [34.66, 37.3], [39.76, 42.8], [44.54, 47.32]];
      await t.reset();
      const caps = await t.page(async () => {
        const [m] = await T.import(await T.fixture('speech.m4a'));
        T.place(m.id, 'A1', 2);
        await RS.autoCaptions.run({ t0: 0, t1: RS.seqDuration(), language: 'en', model: 'whisper-base', needsDownload: true, modelLabel: 'Base', translate: false, replace: true });
        return T.clips('caption').map((c) => [c.start, c.start + c.duration, c.text]);
      });
      t.log(caps.length + ' captions: ' + caps.map((c) => c[0].toFixed(2) + '–' + c[1].toFixed(2)).join(' '));
      t.eq(caps.length, SPEECH.length, 'one caption per phrase');
      const text = caps.map((c) => c[2]).join(' ').toLowerCase();
      for (const w of ['welcome', 'timeline', 'captions', 'mp4', 'watching']) t.ok(text.includes(w), 'missing word: ' + w);
      caps.forEach((c, i) => {
        t.near(c[0], SPEECH[i][0] + 2, 0.5, `caption ${i + 1} start`);
        t.near(c[1], SPEECH[i][1] + 2, 0.6, `caption ${i + 1} end`);
      });
      const end = await t.eval('RS.seqDuration()');
      t.ok(caps[caps.length - 1][1] <= end + 0.01, 'captions run past the end of the video');
    },
  },
};
