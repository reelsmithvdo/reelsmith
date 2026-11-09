// Importing video, audio and images; Project panel; placing media on the timeline.
module.exports = {
  name: 'Media and Project panel',
  tests: {
    'import video, audio and image': async (t) => {
      await t.reset();
      const r = await t.page(async () => {
        const ms = await T.import(await T.video({ name: 'a.mp4', secs: 2 }), await T.wav({ secs: 2 }), await T.png());
        return ms.map((m) => [m.type, Math.round(m.duration * 10) / 10, m.width || 0]);
      });
      t.eq(r.map((x) => x[0]), ['video', 'audio', 'image']);
      t.near(r[0][1], 2, 0.15, 'video duration');
      t.near(r[1][1], 2, 0.05, 'audio duration');
      t.eq(r[2][2], 400, 'image width');
      t.eq(await t.eval(`document.querySelectorAll('.bin-item:not(.seq-item)').length`), 3, 'Project panel items');
    },
    'thumbnails and waveforms are made': async (t) => {
      await t.until(`T.clips().length === 0 && Object.values(RS.runtime).filter((r) => r.thumb).length >= 2`, 8000, 'thumbnails');
      t.ok(await t.eval(`Object.values(RS.runtime).some((r) => r.peaks && r.peaks.length > 10)`), 'no waveform peaks');
    },
    'first clip sets the sequence size (vertical video)': async (t) => {
      await t.reset();
      await t.page(async () => { const [m] = await T.import(await T.video({ name: 'v.mp4', w: 360, h: 640, secs: 1 })); T.place(m.id, 'V1', 0); });
      t.eq(await t.eval(`[RS.state.project.settings.width, RS.state.project.settings.height]`), [360, 640]);
    },
    'add to timeline at playhead (button / menu)': async (t) => {
      await t.reset();
      await t.page(async () => { const [m] = await T.import(await T.video({ name: 'p.mp4', secs: 2 })); T.place(m.id, 'V1', 0); RS.engine.seek(1, false); });
      if (t.isPhone) await t.page(() => RS.touch.openSheet('project'));
      else await t.eval(`document.querySelector('.tab[data-tab=project]').click(); 0`);
      await t.sleep(300);
      if (t.isTouch) await t.click('.bin-add');
      else await t.page(() => RS.projectBin.addAtPlayhead(RS.state.project.media[0].id));
      const c = await t.page(() => T.clips('video').map((c) => [c.trackId, Math.round(c.start * 10) / 10]));
      t.eq(c, [['V1', 0], ['V2', 1]], 'second copy goes on the first free track at the playhead');
      t.eq(await t.eval(`T.clips('audio').length`), 2, 'linked audio');
    },
    'linked audio is placed with video': async (t) => {
      const l = await t.page(() => { const v = T.clips('video')[0], a = T.clips('audio')[0]; return v && a && v.linkId && v.linkId === a.linkId; });
      t.ok(l, 'video and audio should be linked');
    },
    'media used counter': async (t) => {
      t.ok(/Used 2×/.test(await t.eval(`document.querySelector('.bin-item:not(.seq-item) .usage').textContent`)), 'usage label');
    },
    'delete media from project': async (t) => {
      await t.reset();
      await t.page(async () => { await T.import(await T.png()); RS.state.selectedMedia = new Set([RS.state.project.media[0].id]); await RS.projectBin.deleteSelected(); });
      await t.sleep(200);
      t.eq(await t.eval(`RS.state.project.media.length`), 0);
    },
    'Project panel: Shift-click selects a range, ⌘-click adds or removes one (real mouse)': async (t) => {
      if (t.isTouch) t.skip('mouse modifiers');
      await t.reset();
      await t.page(async () => { for (let i = 0; i < 5; i++) await T.import(await T.png({ name: 'item' + i + '.png' })); });
      await t.eval(`document.querySelector('.tab[data-tab="project"]').click(); 0`); await t.sleep(200);
      const sel = () => t.eval(`[...document.querySelectorAll('.bin-item[data-id]')].map((x) => x.classList.contains('selected') ? 1 : 0).join('')`);
      await t.click('.bin-item[data-id]', { index: 1 });
      t.eq(await sel(), '01000', 'single click');
      await t.click('.bin-item[data-id]', { index: 3, modifiers: ['shift'] });
      t.eq(await sel(), '01110', 'shift-click range');
      await t.click('.bin-item[data-id]', { index: 0, modifiers: ['shift'] });
      t.eq(await sel(), '11000', 'shift-click again re-ranges from the same item');
      await t.click('.bin-item[data-id]', { index: 4, modifiers: ['meta'] });
      t.eq(await sel(), '11001', 'cmd-click adds');
      await t.click('.bin-item[data-id]', { index: 0, modifiers: ['meta'] });
      t.eq(await sel(), '01001', 'cmd-click removes');
      await t.click('.bin-item[data-id]', { index: 2, modifiers: ['meta', 'shift'] });
      t.eq(await sel(), '11101', 'cmd+shift adds the range from the last clicked item (0) to 2');
      t.eq(await t.eval(`RS.state.selectedMedia.size`), 4);
      await t.click('.bin-item[data-id]', { index: 2 });
      t.eq(await sel(), '00100', 'plain click selects only one again');
    },
  },
};
