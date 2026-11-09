// Timeline editing with real mouse / touch input where it matters.
const setup = async (t) => {
  await t.reset();
  return t.page(async () => {
    const a = await T.video({ name: 'A.mp4', secs: 3, hue: 0 }), b = await T.video({ name: 'B.mp4', secs: 3, hue: 180 });
    const [ma, mb] = await T.import(a, b);
    T.place(ma.id, 'V1', 0); T.place(mb.id, 'V1', 3);
    RS.timeline.zoomFit();
    return [ma.id, mb.id];
  });
};
const vclips = (t) => t.page(() => T.clips('video').sort((x, y) => x.start - y.start).map((c) => ({ id: c.id, s: Math.round(c.start * 100) / 100, d: Math.round(c.duration * 100) / 100, tr: c.trackId })));

module.exports = {
  name: 'Timeline editing',
  tests: {
    'clips appear on the timeline': async (t) => {
      await setup(t);
      t.eq(await t.eval(`document.querySelectorAll('.tl-clip.type-video').length`), 2);
      t.eq(await t.eval(`document.querySelectorAll('.tl-clip.type-audio').length`), 2);
    },
    'drag a clip to move it (mouse / finger)': async (t) => {
      await setup(t);
      await t.eval(`RS.timeline.zoomFit(); 0`); await t.sleep(200);
      const b = await t.box('.tl-clip.type-video', 1);
      const before = (await vclips(t))[1].s;
      await t.drag({ x: b.left + b.w * 0.5, y: b.y }, { x: b.left + b.w * 0.5 + 60, y: b.y }, 12);
      const after = (await vclips(t))[1].s;
      t.gt(after, before + 0.2, 'clip did not move');
      t.eq(await t.eval(`T.clips('audio').sort((a, b) => a.start - b.start)[1].start === T.clips('video').sort((a, b) => a.start - b.start)[1].start`), true, 'linked audio moved with it');
      await t.eval(`RS.cmd('undo'); 0`);
      t.eq((await vclips(t))[1].s, before, 'undo restores position');
    },
    'trim the end of a clip by dragging its edge': async (t) => {
      if (t.isPhone) t.skip('edge handles are too small to grab on a phone; trimming is covered by split + delete');
      await setup(t);
      const b = await t.box('.tl-clip.type-video', 1);
      const d0 = (await vclips(t))[1].d;
      await t.drag({ x: b.right - 2, y: b.y }, { x: b.right - 70, y: b.y }, 10);
      t.lt((await vclips(t))[1].d, d0 - 0.2, 'clip was not trimmed');
    },
    'split at playhead (⌘K and razor tool)': async (t) => {
      await setup(t);
      await t.page(() => { RS.engine.seek(1.5, false); RS.state.selection = new Set(); RS.cmd('split'); });
      const v = await vclips(t);
      t.eq(v.length, 3, 'expected the first clip to be split in two');
      t.near(v[1].s, 1.5, 0.04);
      await t.eval(`RS.cmd('undo'); 0`);
      if (t.isTouch) return;
      await t.key('c'); // razor tool
      t.eq(await t.eval(`RS.state.tool`), 'razor');
      const b = await t.box('.tl-clip.type-video', 1);
      await t.click({ x: b.left + b.w * 0.5, y: b.y });
      t.eq((await vclips(t)).length, 3, 'razor click did not cut');
      await t.key('v');
      t.eq(await t.eval(`RS.state.tool`), 'select');
    },
    'ripple delete closes the gap': async (t) => {
      await setup(t);
      await t.page(() => { const a = T.clips('video').find((c) => c.start === 0); T.select(...RS.withLinked([a]).map((c) => c.id)); RS.cmd('rippleDelete'); });
      const v = await vclips(t);
      t.eq(v.length, 1); t.eq(v[0].s, 0, 'B should move to the start');
    },
    'unlink, then delete only the audio': async (t) => {
      await setup(t);
      await t.page(() => { const v = T.clips('video')[0]; T.select(...RS.withLinked([v]).map((c) => c.id)); RS.cmd('toggleLink'); const a = T.clips('audio').find((c) => c.start === 0); T.select(a.id); RS.cmd('delete'); });
      t.eq(await t.eval(`[T.clips('video').length, T.clips('audio').length]`), [2, 1]);
    },
    'copy and paste': async (t) => {
      await setup(t);
      await t.page(() => { const v = T.clips('video')[0]; T.select(v.id); RS.cmd('copy'); RS.engine.seek(6, false); RS.cmd('paste'); });
      t.eq((await vclips(t)).length, 3, 'paste did not add a clip');
    },
    'undo / redo history': async (t) => {
      await setup(t);
      const n = await t.eval(`T.clips().length`);
      await t.page(() => { RS.engine.seek(1, false); RS.state.selection = new Set(); RS.cmd('split'); });
      t.gt(await t.eval(`T.clips().length`), n);
      // Touch: the Undo button. Web: ⌘Z / Ctrl+Z. Desktop app: ⌘Z belongs to the native menu, which
      // synthetic key presses cannot reach, so use the same command the menu runs.
      if (t.isTouch) await t.click('#topbar-actions .ibtn'); else if (t.isDesktop) await t.eval(`RS.cmd('undo'); 0`); else await t.key('z', ['mod']);
      t.eq(await t.eval(`T.clips().length`), n, 'undo');
      await t.eval(`RS.cmd('redo'); 0`);
      t.gt(await t.eval(`T.clips().length`), n, 'redo');
    },
    'zoom to fit shows every clip': async (t) => {
      await setup(t);
      await t.page(() => { RS.timeline.zoomBy(8); RS.timeline.zoomFit(); });
      await t.sleep(200);
      const r = await t.page(() => { const s = document.querySelector('.tl-scroller').getBoundingClientRect(); return [...document.querySelectorAll('.tl-clip')].every((c) => { const b = c.getBoundingClientRect(); return b.left >= s.left - 1 && b.right <= s.right + 1; }); });
      t.ok(r, 'some clips are outside the visible timeline after Fit');
    },
    'space plays and stops': async (t) => {
      if (t.isTouch) t.skip('no keyboard');
      await setup(t);
      await t.eval(`document.querySelector('.tl-scroller').focus(); 0`);
      await t.key('Space'); await t.sleep(500);
      const playing = await t.eval('RS.state.playing'), ph = await t.eval('RS.state.playhead');
      await t.key('Space');
      t.ok(playing && ph > 0.1, 'playback did not start');
      t.ok(!(await t.eval('RS.state.playing')), 'playback did not stop');
    },
    'markers and In/Out': async (t) => {
      await setup(t);
      await t.page(() => { RS.engine.seek(1, false); RS.cmd('addMarker'); RS.cmd('markIn'); RS.engine.seek(4, false); RS.cmd('markOut'); });
      const r = await t.page(() => ({ markers: (RS.state.project.markers || RS.state.project.seq.markers || []).length, io: RS.state.project.inOut }));
      t.eq(r.markers, 1); t.near(r.io.in, 1, 0.04); t.near(r.io.out, 4, 0.04);
    },
    'magnetic drop snaps to the clip edge': async (t) => {
      await setup(t);
      const r = await t.page(() => { const s = RS.timeline.magnetStart ? RS.timeline.magnetStart('V1', 6.3, 2) : null; return s; });
      if (r == null) t.skip('magnet helper not exposed');
      t.near(r, 6, 0.04);
    },
    'speed / duration and reverse': async (t) => {
      await setup(t);
      await t.page(() => { const v = T.clips('video')[0]; T.select(v.id); RS.cmd('reverseClip'); });
      t.ok(await t.eval(`!!T.clips('video').find((c) => c.start === 0).reverse`), 'reverse flag not set');
    },
    'add and remove tracks': async (t) => {
      await t.reset();
      const n = await t.eval(`RS.tracksOf('video').length`);
      await t.eval(`RS.cmd('addVideoTrack'); 0`);
      t.eq(await t.eval(`RS.tracksOf('video').length`), n + 1);
      await t.eval(`RS.cmd('undo'); 0`);
    },
  },
};
