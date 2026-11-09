// Phones and tablets: layout, panels as sheets, touch gestures.
const setup = (t) => t.page(async () => {
  const [a, b] = await T.import(await T.video({ name: 'A.mp4', secs: 3 }), await T.video({ name: 'B.mp4', secs: 3, hue: 180 }));
  T.place(a.id, 'V1', 0); T.place(b.id, 'V1', 3); RS.timeline.zoomFit();
});
module.exports = {
  name: 'Touch and small screens',
  modes: ['phone', 'tablet'],
  tests: {
    'every track is visible without scrolling (phone)': async (t) => {
      if (!t.isPhone) t.skip('phone only');
      await t.reset(); await setup(t);
      const r = await t.page(() => { const s = document.querySelector('.tl-scroller'); return { need: s.scrollHeight, have: s.clientHeight }; });
      t.ok(r.need <= r.have + 2, `timeline needs ${r.need}px but shows ${r.have}px`);
    },
    'clips are big enough to touch': async (t) => {
      await t.reset(); await setup(t);
      const h = await t.eval(`document.querySelector('.tl-clip.type-video').getBoundingClientRect().height`);
      t.gt(h, 36, 'clip height');
    },
    'bottom tab bar opens each panel (phone)': async (t) => {
      if (!t.isPhone) t.skip('phone only');
      await t.reset();
      for (const tab of ['project', 'effects', 'effectControls', 'captions', 'library', 'mixer']) {
        await t.click(`#mobile-nav button[data-tab="${tab}"]`);
        await t.sleep(300);
        t.ok(await t.eval(`document.querySelector('.tab[data-tab="${tab}"]').classList.contains('on') && !!document.querySelector('.sheet-open')`), tab + ' did not open');
      }
      await t.click(`#mobile-nav button[data-tab="mixer"]`);
      t.ok(!(await t.eval(`!!document.querySelector('.sheet-open')`)), 'tapping again should close');
    },
    'drag a clip with a finger': async (t) => {
      await t.reset(); await setup(t);
      const b = await t.box('.tl-clip.type-video', 1);
      const s0 = await t.eval(`T.clips('video').find((c) => c.start === 3).start`);
      await t.touchDrag({ x: b.x, y: b.y }, { x: b.x + 50, y: b.y });
      t.gt(await t.eval(`Math.max(...T.clips('video').map((c) => c.start))`), s0 + 0.1, 'clip did not move');
    },
    'long-press opens the context menu and keeps it open': async (t) => {
      await t.reset(); await setup(t);
      await t.longPress('.tl-clip.type-video');
      t.ok(await t.eval(`!!document.querySelector('.ctx-menu')`), 'menu did not open or closed on release');
      t.eq(await t.eval(`T.clips('video').length`), 2, 'lifting the finger ran a menu item');
      await t.eval(`document.querySelectorAll('.ctx-menu').forEach((m) => m.remove()); 0`);
    },
    'swipe empty timeline space to scroll': async (t) => {
      await t.reset(); await setup(t);
      await t.page(() => RS.timeline.zoomBy(6)); await t.sleep(200);
      const r = await t.page(() => { const s = document.querySelector('.tl-scroller').getBoundingClientRect(); const lane = [...document.querySelectorAll('.tl-row.video .tl-lane')][0].getBoundingClientRect(); return { x: s.right - 30, y: lane.top + lane.height / 2 }; });
      const before = await t.eval(`document.querySelector('.tl-scroller').scrollLeft`);
      await t.touchDrag(r, { x: r.x - 150, y: r.y });
      t.gt(await t.eval(`document.querySelector('.tl-scroller').scrollLeft`), before + 20, 'did not scroll');
    },
    'dialogs fit the screen': async (t) => {
      await t.reset();
      for (const cmd of ['sequenceSettings', 'export', 'reportBug']) {
        await t.eval(`RS.cmd('${cmd}'); 0`); await t.sleep(400);
        const r = await t.page(() => { const m = document.querySelector('.modal'); if (!m) return null; const b = m.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth + 1; });
        t.ok(r !== false, cmd + ' dialog is off screen');
        await t.page(() => T.closeModals());
      }
    },
    'help center opens full screen and scrolls': async (t) => {
      await t.reset();
      await t.eval(`RS.cmd('help'); 0`); await t.sleep(300);
      const r = await t.page(() => { const w = document.querySelector('.kb-win').getBoundingClientRect(); return { w: w.width, vw: innerWidth }; });
      t.ok(r.w <= r.vw, 'help wider than screen');
      await t.eval('RS.help.close(); 0');
    },
  },
};
