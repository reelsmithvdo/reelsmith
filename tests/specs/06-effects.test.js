// Every transition and every visual effect in the Effects panel.
const twoClips = async (t) => {
  await t.reset();
  await t.page(async () => {
    const [a, b] = await T.import(await T.video({ name: 'A.mp4', secs: 3, hue: 0, audio: false }), await T.video({ name: 'B.mp4', secs: 3, hue: 200, audio: false }));
    T.place(a.id, 'V1', 0); T.place(b.id, 'V1', 3);
  });
};
module.exports = {
  name: 'Effects and transitions',
  tests: {
    'every video and shape transition renders across the cut': async (t) => {
      await twoClips(t);
      const res = await t.page(async () => {
        const out = [];
        const trs = T.allFx().filter((i) => i.transition);
        const B = T.clips('video').find((c) => c.start === 3);
        const plain = await T.frameAt(3.05);
        for (const it of trs) {
          RS.commit('t', () => { RS.getClip(B.id).tIn = { type: it.transition, duration: 1 }; });
          const mid = await T.frameAt(3.0);
          out.push({ name: it.name, changed: T.diff(mid, plain) > 0 });
        }
        return out;
      });
      t.gt(res.length, 25, 'transitions found: ' + res.length);
      t.eq(res.filter((r) => !r.changed).map((r) => r.name), [], 'transitions that show nothing mid-way');
    },
    'apply a transition by drag-and-drop style command (⌘D)': async (t) => {
      await twoClips(t);
      await t.page(() => { const a = T.clips('video')[0]; T.select(a.id); RS.cmd('applyTransition'); });
      t.ok(await t.eval(`T.clips('video').some((c) => c.tIn || c.tOut)`), 'no transition added');
    },
    'transition controls in Effect Controls are readable': async (t) => {
      await twoClips(t);
      await t.page(async () => { const a = T.clips('video')[0]; T.select(a.id); RS.cmd('applyTransition'); await T.wait(200); document.querySelector('.tl-trans').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 })); });
      await t.sleep(300);
      const fs = await t.page(() => [...document.querySelectorAll('#effect-controls *')].filter((e) => e.childElementCount === 0 && e.textContent.trim()).map((e) => parseFloat(getComputedStyle(e).fontSize)));
      t.gt(fs.length, 3, 'transition panel empty');
      t.lt(Math.max(...fs), 20, 'oversized text in the transition panel: ' + Math.max(...fs) + 'px');
    },
    'every visual effect and look can be applied': async (t) => {
      await twoClips(t);
      const res = await t.page(async () => {
        const out = [];
        const A = T.clips('video')[0];
        const groups = ['Video Effects', 'Fades', 'Color Looks', 'Blur & Motion', 'Creative Effects', 'Filters'];
        const items = T.allFx().filter((i) => groups.includes(i.group) && !i.transition);
        const plain = await T.frameAt(1.5);
        for (const it of items) {
          T.select(A.id);
          let err = null;
          try { RS.effects.applyItem(it); } catch (e) { err = e.message; }
          const f = await T.frameAt(1.5);
          out.push({ name: it.group + ' › ' + it.name, err, changed: T.diff(f, plain) > 0 });
          RS.cmd('undo');
        }
        return out;
      });
      t.gt(res.length, 20, 'effects found: ' + res.length);
      t.eq(res.filter((r) => r.err).map((r) => r.name + ': ' + r.err), [], 'effects that threw');
      const unchanged = res.filter((r) => !r.changed).map((r) => r.name);
      t.log(`${res.length} effects applied, ${unchanged.length} change nothing on a plain clip: ${unchanged.join(', ')}`);
    },
    'Lumetri color changes the picture': async (t) => {
      await twoClips(t);
      const d = await t.page(async () => { const A = T.clips('video')[0]; const a = await T.frameAt(1); RS.commit('l', () => { const c = RS.getClip(A.id); c.lumetri = Object.assign(RS.DEFAULT_LUMETRI(), { exposure: 2 }); }); const b = await T.frameAt(1); return T.diff(a, b); });
      t.gt(d, 0);
    },
    'remove a white video background (Ultra Key)': async (t) => {
      await t.reset();
      const r = await t.page(async () => {
        const [bg, ov] = await T.import(await T.video({ name: 'main.mp4', secs: 2, hue: 120, audio: false }), await T.video({ name: 'overlay.mp4', secs: 2, bg: '#ffffff', hue: 0, audio: false }));
        T.place(bg.id, 'V1', 0); T.place(ov.id, 'V2', 0);
        const before = await T.frameAt(1);
        const c = T.clips('video').find((x) => x.trackId === 'V2');
        await RS.bgRemove.video(c.id);
        const after = await T.frameAt(1);
        return { key: !!RS.getClip(c.id).key, lumBefore: before.lum, lumAfter: after.lum };
      });
      t.ok(r.key, 'key not set');
      t.lt(r.lumAfter, r.lumBefore - 30, 'white background still covers the main video');
    },
    'remove a logo background (image)': async (t) => {
      await t.reset();
      const r = await t.page(async () => {
        const [m] = await T.import(await T.png({ name: 'logo.png' }));
        const f = await RS.media && RS.bgRemove.detectColor ? 1 : 0;
        const img = await createImageBitmap(RS.runtime[m.id].file);
        const cv = new OffscreenCanvas(img.width, img.height); cv.getContext('2d').drawImage(img, 0, 0);
        const data = cv.getContext('2d').getImageData(0, 0, img.width, img.height);
        const col = RS.bgRemove.detectColor(data);
        const res = RS.bgRemove.process(data, { colors: [col], tolerance: 30, softness: 10, mode: 'edges' });
        const px = (x, y) => res.data[(y * res.width + x) * 4 + 3];
        return { corner: px(2, 2), centreRing: px(Math.round(res.width / 2 + res.height * 0.25), Math.round(res.height / 2)), hole: px(Math.round(res.width / 2), Math.round(res.height / 2)) };
      });
      t.eq(r.corner, 0, 'background corner should be transparent');
      t.gt(r.centreRing, 200, 'logo should stay opaque');
    },
  },
};
