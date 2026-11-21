// Scenes for the blog posts scheduled 2026-12-22 … 2026-12-30 (scripts/shoot.js). Same rules as scenes-blog.js:
// real CC0 photos as footage (SH.photo), and each scene shows a different part of the editor.
'use strict';

const S = [1500, 888];

module.exports = {
  // 2026-12-22 remove audio: clip unlinked, the middle of its sound deleted, music on A2, right-click menu open.
  muteaudio: {
    size: S, wait: 1600,
    async setup() {
      SH.ready(); SH.name('Sunday Stew — Cooking Clip');
      const v = await SH.add(await SH.photo({ key: 'stovetop', name: 'GX010482.MP4', secs: 18, zoom: [1, 1.08], speech: 2 }), 'video', 0, 0);
      await SH.add(SH.music({ name: 'warm-acoustic.wav', secs: 18, gain: 0.35 }), 'audio', 1, 0);
      await SH.peaks();
      T.select(v.id); RS.cmd('toggleLink');
      const au = () => RS.state.project.clips.filter((c) => c.type === 'audio' && c.trackId === RS.tracksOf('audio')[0].id).sort((a, b) => a.start - b.start);
      RS.commit('cut', () => { let c = au()[0]; const r = RS.ops.splitClip(c, 6); if (r) RS.ops.splitClip(r, 11); });
      const mid = au()[1];
      if (mid) RS.commit('del', () => { RS.state.project.clips = RS.state.project.clips.filter((c) => c.id !== mid.id); });
      RS.emit('timeline-change');
      SH.finish(8);
      await SH.wait(500);
      T.select(au()[0].id);
      const m = [...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'Clip'); if (m) m.click();
      SH.clean();
    },
  },

  // 2026-12-24 add text: a Two-Tone title over a brunch clip, Effect Controls on the Text section.
  addtext: {
    size: S, wait: 1800,
    async setup() {
      SH.ready(); SH.name('Café Review — Lisbon');
      await SH.add(await SH.photo({ key: 'brunch', name: 'brunch-table.mp4', secs: 10, zoom: [1.1, 1] }), 'video', 0, 0);
      await SH.add(await SH.photo({ key: 'bakery', name: 'pastry-counter.mp4', secs: 8 }), 'video', 0, 10);
      RS.effects.list.flatMap((g) => g.items).find((x) => x.id === 'tpl-twoToneTitle').create(0.5);
      RS.commit('txt', () => { const t = RS.state.project.clips.filter((c) => c.type === 'text'); if (t[0]) { t[0].text.content = 'best brunch\n*in Lisbon*'; t[0].label = 'best brunch in Lisbon'; } if (t[1]) { t[1].text.content = 'NO. 1 ON OUR LIST'; t[1].label = 'NO. 1 ON OUR LIST'; } });
      const t0 = RS.state.project.clips.find((c) => c.type === 'text');
      T.select(t0.id); SH.tab('effectControls'); SH.finish(2.2);
      await SH.wait(300); SH.only('Text'); SH.clean();
    },
  },

  // 2026-12-26 merge clips for Reels: a 9:16 sequence with four clips in a row, dissolves, music; Project panel.
  mergereels: {
    size: S, wait: 2000,
    async setup() {
      SH.ready(); SH.name('Joshua Tree Reel');
      const V = { w: 720, h: 1280 };
      const parts = [['friends2', 'IMG_4410.MOV', [1, 1.1]], ['skate2', 'IMG_4415.MOV', [1.08, 1]], ['dog-dusk', 'IMG_4421.MOV', [1, 1.06]], ['surf-sunset', 'IMG_4432.MOV', [1, 1.08]]];
      let t = 0; const ids = [];
      for (const [key, name, zoom] of parts) { const c = await SH.add(await SH.photo(Object.assign({ key, name, secs: 4, zoom }, V)), 'video', 0, t); ids.push(c.id); t += 4; }
      await SH.add(SH.music({ name: 'golden-hour-beat.wav', secs: 16, gain: 0.45 }), 'audio', 0, 0);
      RS.commit('Sequence settings', () => Object.assign(RS.state.project.settings, { width: 1080, height: 1920 }));
      RS.emit('settings-change');
      RS.commit('tr', () => { for (const id of ids.slice(0, -1)) RS.ops.setTransition(RS.getClip(id), 'out', 'dissolve', 0.5); for (const id of ids) RS.getClip(id).props.fill = 1; });
      T.select(ids[1]); SH.tab('effectControls');
      SH.finish(6.3); await SH.peaks(); await SH.wait(300); SH.only('Motion', 'Transitions'); SH.clean();
    },
  },

  // 2026-12-28 blurred background: a vertical phone clip in a 16:9 sequence, sides filled by Background Blur Fill.
  blurbg: {
    size: S, wait: 1800,
    async setup() {
      SH.ready(); SH.name('Concert Night — YouTube');
      const v = await SH.add(await SH.photo({ key: 'jazz', name: 'VID_20261114_213502.mp4', w: 720, h: 1280, secs: 14, zoom: [1, 1.06], crop: [0.22, 0, 0.36, 1] }), 'video', 0, 0);
      await SH.add(await SH.photo({ key: 'concert', name: 'VID_20261114_220118.mp4', w: 720, h: 1280, secs: 8, crop: [0.3, 0, 0.42, 1] }), 'video', 0, 14);
      RS.commit('Sequence settings', () => Object.assign(RS.state.project.settings, { width: 1920, height: 1080 }));
      RS.emit('settings-change');
      RS.effects.apply('vfx-bgblur', [RS.getClip(v.id)]);
      T.select(v.id); SH.tab('effectControls'); SH.finish(5);
      await SH.wait(300); SH.only('Creative'); SH.clean();
    },
  },

  // 2026-12-30 reverse: a dog jump, then a reversed copy (rewind), a whoosh between; Effect Controls ▸ Time.
  reverse: {
    size: S, wait: 1800,
    async setup() {
      SH.ready(); SH.name('Rewind — Agility Jump');
      const a = await SH.add(await SH.photo({ key: 'dog-ring', name: 'agility-jump.mp4', secs: 5, zoom: [1, 1.15], pan: [0.03, 0] }), 'video', 0, 0);
      T.place(a.mediaId, RS.tracksOf('video')[0].id, 5);
      const b = RS.state.project.clips.find((c) => c.mediaId === a.mediaId && c.type === 'video' && c.start > 4);
      await SH.add(await SH.photo({ key: 'dog-dusk', name: 'resting.mp4', secs: 6 }), 'video', 0, 10);
      T.select(b.id); RS.cmd('reverseClip');
      RS.effects.list.flatMap((g) => g.items).find((x) => x.id === 'sfx-whoosh').create(4.6);
      await SH.add(SH.music({ name: 'upbeat-loop.wav', secs: 16, gain: 0.3 }), 'audio', 1, 0);
      await SH.peaks(); await SH.wait(400); T.select(b.id); SH.tab('effectControls'); SH.finish(7.2); await SH.wait(300); SH.only('Time'); SH.clean();
    },
  },
};
