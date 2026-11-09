// Audio: volume, gain, normalize, effects, voice effects, sound effects, ducking — checked in the real mix.
const rms = (a) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * a[i]; return Math.sqrt(s / a.length); };
const setup = (t) => t.page(async () => {
  const [m] = await T.import(await T.wav({ name: 'voice.wav', secs: 3, freq: 300, gain: 0.1 }));
  T.place(m.id, 'A1', 0);
  return m.id;
});
const level = (t, a = 0.5, b = 2.5) => t.page(async (a, b) => { const s = await RS.fastExport.renderMix(a, b); let q = 0; for (let i = 0; i < s.length; i++) q += s[i] * s[i]; return Math.sqrt(q / s.length); }, a, b);

module.exports = {
  name: 'Audio',
  tests: {
    'volume 200% makes it louder in the mix': async (t) => {
      await t.reset(); await setup(t);
      const a = await level(t);
      await t.page(() => { const c = T.clips('audio')[0]; RS.commit('v', () => { RS.getClip(c.id).props.volume = 200; }); });
      const b = await level(t);
      t.near(b / a, 2, 0.25, 'volume ratio');
    },
    'audio gain (G) dialog changes level': async (t) => {
      await t.reset(); await setup(t);
      const a = await level(t);
      await t.page(() => { T.select(T.clips('audio')[0].id); RS.cmd('clipGain'); });
      await t.sleep(300);
      t.ok(await t.eval(`!!document.querySelector('.modal')`), 'gain dialog did not open');
      await t.page(() => { const inp = document.querySelector('.modal input'); inp.value = '6'; inp.dispatchEvent(new Event('input')); inp.dispatchEvent(new Event('change')); document.querySelector('.modal .primary').click(); });
      await t.sleep(300);
      t.gt(await level(t), a * 1.5, '+6 dB should roughly double the level');
    },
    'normalize loudness brings a quiet clip up': async (t) => {
      await t.reset(); await setup(t);
      const a = await level(t);
      await t.page(async () => { await RS.loudness.normalize(T.clips('audio').map((c) => c.id), -14); });
      t.gt(await level(t), a * 1.5);
    },
    'every audio effect and voice effect renders': async (t) => {
      await t.reset(); await setup(t);
      const res = await t.page(async () => {
        const out = [];
        const items = T.allFx().filter((i) => i.kind === 'audio' && !i.atransition && !i.action && !i.create);
        const c = T.clips('audio')[0];
        for (const it of items) {
          T.select(c.id);
          let err = null; try { RS.effects.applyItem(it); } catch (e) { err = e.message; }
          const s = await RS.fastExport.renderMix(0.5, 1.5); let q = 0; for (let i = 0; i < s.length; i++) q += s[i] * s[i];
          out.push({ name: it.group + ' › ' + it.name, err, rms: Math.sqrt(q / s.length) });
          RS.cmd('undo');
        }
        return out;
      });
      t.gt(res.length, 8, 'audio effects found: ' + res.length);
      t.eq(res.filter((r) => r.err || !isFinite(r.rms)).map((r) => r.name + ' ' + r.err), [], 'effects that failed');
    },
    'sound effects are added on a free audio track': async (t) => {
      await t.reset();
      const r = await t.page(async () => { const it = T.allFx().find((i) => i.id === 'sfx-whoosh') || T.allFx().find((i) => i.group === 'Sound Effects'); await it.create(1); return T.clips('audio').map((c) => c.trackId); });
      t.eq(r.length, 1);
    },
    'auto duck lowers music under speech': async (t) => {
      await t.reset();
      const r = await t.page(async () => {
        const [v, m] = await T.import(await T.wav({ name: 'speech.wav', secs: 4, freq: 250, gain: 0.3 }), await T.wav({ name: 'music.wav', secs: 4, freq: 660, gain: 0.3 }));
        T.place(v.id, 'A1', 1); T.place(m.id, 'A2', 0);
        const music = T.clips('audio').find((c) => c.mediaId === m.id);
        T.select(music.id);
        RS.effects.applyItem(T.allFx().find((i) => /Duck/.test(i.name)));
        return Object.keys(RS.getClip(music.id).kf || {});
      });
      t.ok(r.includes('volume'), 'no volume keyframes after ducking: ' + JSON.stringify(r));
    },
    'mixer shows a strip per audio track': async (t) => {
      await t.reset();
      if (t.isPhone) await t.page(() => RS.touch.openSheet('mixer'));
      else await t.eval(`document.querySelector('.tab[data-tab=mixer]').click(); 0`);
      await t.sleep(300);
      t.gt(await t.eval(`document.querySelectorAll('#mixer .mx-strip, #mixer .strip').length`), 1);
    },
  },
};
