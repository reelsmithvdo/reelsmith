// Scenes for the blog posts scheduled 2026-11-22 … 2026-12-20 (scripts/shoot.js). Footage = real CC0 photos
// (footage.json) turned into clips by SH.photo(); each scene shows a different part of the editor.
'use strict';

const S = [1500, 888];
// Titles made from a template: set the text of the clips it created.
// (runs in the page) RS.state.project.clips.filter(c => c.type === 'text') …

module.exports = {
  // 2026-11-22 colour correction: Lumetri Basic Correction on a flat road-trip shot.
  color: {
    size: S, wait: 1500,
    async setup() {
      SH.ready(); SH.name('Iceland Road Trip');
      const a = await SH.add(await SH.photo({ key: 'roadtrip', name: 'road-trip-A001.mp4', secs: 8 }), 'video', 0, 0);
      await SH.add(await SH.photo({ key: 'alaska', name: 'road-trip-A002.mp4', secs: 6, zoom: [1.05, 1] }), 'video', 0, 8);
      await SH.add(await SH.photo({ key: 'iceland', name: 'road-trip-A003.mp4', secs: 7 }), 'video', 0, 14);
      RS.commit('grade', () => { const c = RS.getClip(a.id); c.lumetri = Object.assign(RS.DEFAULT_LUMETRI(), { exposure: 0, contrast: 12, highlights: -35, shadows: 10, whites: 0, blacks: -10 }); c.props.temperature = 6; c.props.tint = 2; c.props.saturation = 112; });
      T.select(a.id); SH.tab('effectControls'); SH.finish(3);
      await SH.wait(300); SH.only('Lumetri'); SH.clean();
    },
  },

  // 2026-11-24 blur a face: a copy of the clip on V2 with Mosaic, cut down by an ellipse mask (handles shown).
  blurface: {
    size: S, wait: 1500,
    async setup() {
      SH.ready(); SH.name('Street Interview');
      const f = await SH.photo({ key: 'headphones', name: 'street-interview.mp4', secs: 14, zoom: [1, 1.02], speech: 3 });
      await SH.add(f, 'video', 0, 0);
      const top = await SH.add(f, 'video', 1, 0);
      RS.effects.apply('mosaic', [RS.getClip(top.id)]);
      const id = 'mask-face';
      RS.commit('mask', () => { const c = RS.getClip(top.id); c.props.mosaic = 28; c.masks = [{ id, kind: 'ellipse', cx: 0.325, cy: 0.41, w: 0.16, h: 0.46, feather: 14, expansion: 0, opacity: 100, invert: false }]; });
      RS.state.activeMask = { clipId: top.id, maskId: id };
      T.select(top.id); SH.tab('effectControls'); SH.finish(4);
      await SH.peaks(); await SH.wait(300); SH.only('Opacity'); SH.clean();
    },
  },

  // 2026-11-26 speed ramp: Time Remap keyframes 100% → 25% → 100% around a skate trick.
  speedramp: {
    size: S, wait: 1500,
    async setup() {
      SH.ready(); SH.name('Skate Park Edit');
      const a = await SH.add(await SH.photo({ key: 'skate1', name: 'kickflip-slowmo.mp4', secs: 12, zoom: [1, 1.12], pan: [-0.03, 0] }), 'video', 0, 0);
      await SH.add(await SH.photo({ key: 'skate2', name: 'board-sunset.mp4', secs: 6 }), 'video', 0, 12);
      await SH.add(SH.music({ name: 'skate-beat.wav', secs: 18, gain: 0.5 }), 'audio', 0, 0);
      RS.commit('ramp', () => { const c = RS.getClip(a.id); c.kf = c.kf || {}; c.kf.remap = [{ t: 0, v: 100 }, { t: 3, v: 100, ease: true }, { t: 3.6, v: 25 }, { t: 6.4, v: 25, ease: true }, { t: 7, v: 100 }]; });
      T.select(a.id); SH.tab('effectControls'); SH.finish(4.5);
      await SH.peaks(); await SH.wait(300); SH.only('Time'); SH.clean();
    },
  },

  // 2026-11-28 voice-over: a recorded narration on A2 under travel shots, Audio Track Mixer open.
  voiceover: {
    size: S, wait: 1500,
    async setup() {
      SH.ready(); SH.name('Alaska Travel Story');
      await SH.add(await SH.photo({ key: 'alaska', name: 'highway-drone.mp4', secs: 10 }), 'video', 0, 0);
      await SH.add(await SH.photo({ key: 'green-road', name: 'window-view.mp4', secs: 9, zoom: [1.06, 1] }), 'video', 0, 10);
      await SH.add(await SH.photo({ key: 'lake', name: 'lake-reflection.mp4', secs: 9 }), 'video', 0, 19);
      await SH.add(SH.music({ name: 'calm-guitar.wav', secs: 28, gain: 0.25 }), 'audio', 0, 0);
      const sp = await T.fixture('speech.m4a');
      const vo = await SH.add(new File([sp], 'Voice-over 2026-11-27 18.42.10.m4a', { type: sp.type }), 'audio', 1, 1.5);
      RS.commit('trim', () => { RS.getClip(vo.id).duration = 26; });
      SH.tab('mixer'); SH.finish(6);
      await SH.peaks(); await SH.wait(300);
      document.querySelectorAll('.tl-scroller').forEach((x) => { x.scrollTop = x.scrollHeight; });
      SH.clean();
    },
  },

  // 2026-11-30 picture in picture: a face-cam in the corner of a cooking clip, with a drop shadow.
  pip: {
    size: S, wait: 1500,
    async setup() {
      SH.ready(); SH.name('Street Food Reaction');
      await SH.add(await SH.photo({ key: 'vendor', name: 'noodle-stall.mp4', secs: 20, zoom: [1, 1.08] }), 'video', 0, 0);
      const cam = await SH.add(await SH.photo({ key: 'woman-wall', name: 'webcam.mp4', secs: 20, zoom: [1, 1.01], crop: [0.3, 0.5, 0.36, 0.5], speech: 0 }), 'video', 1, 0);
      RS.effects.apply('pip', [RS.getClip(cam.id)]);
      RS.effects.apply('shadow', [RS.getClip(cam.id)]);
      T.select(cam.id); SH.tab('effectControls'); SH.finish(5);
      await SH.peaks(); await SH.wait(300); SH.only('Motion'); SH.clean();
    },
  },

  // 2026-12-02 transitions: beach clips with a Cross Dissolve mid-way and a Whip Pan, Effects panel on transitions.
  transitions: {
    size: S, wait: 1500,
    async setup() {
      SH.ready(); SH.name('Coast Weekend');
      const a = await SH.add(await SH.photo({ key: 'ocean', name: 'waves-from-above.mp4', secs: 5 }), 'video', 0, 0);
      const b = await SH.add(await SH.photo({ key: 'dusk-beach', name: 'rocks-at-dusk.mp4', secs: 5, zoom: [1.06, 1] }), 'video', 0, 5);
      const c = await SH.add(await SH.photo({ key: 'surf-sunset', name: 'surfer-sunset.mp4', secs: 5 }), 'video', 0, 10);
      await SH.add(await SH.photo({ key: 'surfer', name: 'surfer-rocks.mp4', secs: 5 }), 'video', 0, 15);
      RS.commit('tr', () => { RS.ops.setTransition(RS.getClip(a.id), 'out', 'dissolve', 1); RS.ops.setTransition(RS.getClip(b.id), 'out', 'whip', 0.5); RS.ops.setTransition(RS.getClip(c.id), 'out', 'dissolve', 1); });
      SH.tab('effects');
      const q = document.querySelector('#effects input[type="search"], #effects input');
      if (q) { q.value = 'transition'; q.dispatchEvent(new Event('input', { bubbles: true })); }
      T.select(b.id); SH.tab('effectControls'); SH.finish(5.15);
      await SH.wait(300); SH.only('Transitions'); SH.clean();
    },
  },

  // 2026-12-04 background noise: High-Pass, DeHum and Noise Gate on a field interview's audio.
  noise: {
    size: S, wait: 1500,
    async setup() {
      SH.ready(); SH.name('Field Interview');
      const v = await SH.add(await SH.photo({ key: 'pod-c', name: 'ranger-interview.mp4', secs: 40, fps: 5, zoom: [1, 1.04], speech: 0 }), 'video', 0, 0);
      await SH.peaks();
      const au = RS.state.project.clips.find((c) => c.type === 'audio' && c.linkId && c.linkId === RS.getClip(v.id).linkId) || RS.state.project.clips.find((c) => c.type === 'audio');
      for (const id of ['hp', 'dehum', 'gate', 'eq']) RS.effects.apply(id, [RS.getClip(au.id)]);
      RS.commit('tune', () => { const c = RS.getClip(au.id); c.afx.hp.freq = 100; Object.assign(c.afx.eq, { low: -3, mid: 2, midFreq: 2500, high: 1.5 }); c.afx.gate.threshold = -48; });
      T.select(au.id); SH.tab('effectControls'); SH.finish(8);
      await SH.wait(300); SH.only('Audio'); SH.clean();
    },
  },

  // 2026-12-06 multicam: three angles of one podcast recording, Multi-Camera view in the Program monitor.
  multicam: {
    size: S, wait: 2000,
    async setup() {
      SH.ready(); SH.name('Trail Talk Ep. 4');
      const files = [await SH.photo({ key: 'pod-c', name: 'cam-A-wide.mp4', secs: 30, fps: 5, speech: 0 }), await SH.photo({ key: 'pod-b', name: 'cam-B-host.mp4', secs: 30, fps: 5, speech: 0 }), await SH.photo({ key: 'pod-a', name: 'cam-C-river.mp4', secs: 30, fps: 5, speech: 0 })];
      const ms = await T.import(...files);
      RS.commit('mc', () => { const res = RS.ops.createMulticam(ms.map((m) => m.id), 'in'); RS.ops.placeSequence(res.seq.id, RS.tracksOf('video')[0].id, 0, {}); });
      RS.emit('media-change'); SH.finish(6);
      await SH.wait(500);
      const b = document.querySelector('.mc-btn'); if (b) b.click();
      await SH.peaks(); SH.clean();
    },
  },

  // 2026-12-08 logo / watermark: a PNG logo in the top-right corner of a cooking video, Opacity 85%.
  logo: {
    size: S, wait: 1500,
    async setup() {
      SH.ready(); SH.name("Maya's Kitchen — Ep. 12");
      await SH.add(await SH.photo({ key: 'chef', name: 'table-overhead.mp4', secs: 16, zoom: [1, 1.06] }), 'video', 0, 0);
      await SH.add(await SH.photo({ key: 'streetfood', name: 'wok-closeup.mp4', secs: 10 }), 'video', 0, 16);
      // An original logo, drawn here: a round badge with the channel name.
      const cv = document.createElement('canvas'); cv.width = 600; cv.height = 600; const g = cv.getContext('2d');
      g.fillStyle = '#f4efe6'; g.beginPath(); g.arc(300, 300, 290, 0, 7); g.fill();
      g.strokeStyle = '#b5532d'; g.lineWidth = 22; g.beginPath(); g.arc(300, 300, 250, 0, 7); g.stroke();
      g.fillStyle = '#b5532d'; g.textAlign = 'center'; g.font = 'bold 150px Georgia, serif'; g.fillText('M', 300, 330);
      g.font = 'bold 54px Georgia, serif'; g.fillText("MAYA'S", 300, 420); g.font = '40px Georgia, serif'; g.fillText('KITCHEN', 300, 470);
      const png = await new Promise((r) => cv.toBlob(r, 'image/png'));
      const lg = await SH.add(new File([png], 'mayas-kitchen-logo.png', { type: 'image/png' }), 'video', 1, 0);
      RS.commit('logo', () => { const c = RS.getClip(lg.id); c.duration = 26; c.props.scale = 16; c.props.x = 520; c.props.y = -260; c.props.opacity = 85; });
      T.select(lg.id); SH.tab('effectControls'); SH.finish(4);
      await SH.wait(300); SH.only('Motion', 'Opacity'); SH.clean();
    },
  },

  // 2026-12-10 photo slideshow: stills with Ken Burns zoom and dissolves, music, Project panel in grid view.
  slideshow: {
    size: S, wait: 2000,
    async setup() {
      SH.ready(); SH.name('Summer Trip Slideshow');
      const keys = ['brunch', 'friends2', 'iceland', 'green-road', 'dog-dusk', 'lake', 'matterhorn'];
      const names = ['IMG_2041.jpg', 'IMG_2077.jpg', 'IMG_2113.jpg', 'IMG_2150.jpg', 'IMG_2189.jpg', 'IMG_2234.jpg', 'IMG_2290.jpg'];
      let t = 0; const ids = [];
      for (let i = 0; i < keys.length; i++) { const c = await SH.add(await SH.still(keys[i], names[i]), 'video', 0, t); RS.commit('d', () => { RS.getClip(c.id).duration = 4; }); t += 4; ids.push(c.id); }
      RS.effects.apply('zoomin', ids.map(RS.getClip));
      RS.commit('tr', () => { for (const id of ids.slice(0, -1)) RS.ops.setTransition(RS.getClip(id), 'out', 'dissolve', 1); for (const id of ids) RS.getClip(id).props.fill = 1; });
      await SH.add(SH.music({ name: 'acoustic-summer.wav', secs: 28, gain: 0.45 }), 'audio', 0, 0);
      const g = [...document.querySelectorAll('#project .btn, .btn')].find((b) => b.textContent.trim() === 'Grid'); if (g) g.click();
      T.select(ids[2]); SH.tab('effectControls');
      SH.finish(9.4); await SH.peaks(); await SH.wait(300); SH.only('Motion'); SH.clean();
    },
  },

  // 2026-12-12 split screen: two clips side by side, each cropped to half with Crop.
  splitscreen: {
    size: S, wait: 1500,
    async setup() {
      SH.ready(); SH.name('Two Kitchens');
      const l = await SH.add(await SH.photo({ key: 'streetfood', name: 'wok-station.mp4', secs: 15 }), 'video', 0, 0);
      const r = await SH.add(await SH.photo({ key: 'bakery', name: 'bakery-tray.mp4', secs: 15, zoom: [1.04, 1] }), 'video', 1, 0);
      RS.effects.apply('crop', [RS.getClip(l.id)]); RS.effects.apply('crop', [RS.getClip(r.id)]);
      const W = RS.state.project.settings.width;
      RS.commit('split', () => { const a = RS.getClip(l.id), b = RS.getClip(r.id); a.props.cropL = 25; a.props.cropR = 25; a.props.x = -W / 4; b.props.cropL = 25; b.props.cropR = 25; b.props.x = W / 4; });
      T.select(r.id); SH.tab('effectControls'); SH.finish(5);
      await SH.wait(300); SH.only('Crop', 'Motion'); SH.clean();
    },
  },

  // 2026-12-14 freeze frame: Frame Hold mid-action with a lower-third name title over the still.
  freeze: {
    size: S, wait: 1800,
    async setup() {
      SH.ready(); SH.name('Surf Trip Intro');
      const a = await SH.add(await SH.photo({ key: 'surfer', name: 'surfer-wave.mp4', secs: 12, zoom: [1, 1.1], pan: [0.02, 0] }), 'video', 0, 0);
      RS.commit('hold', () => RS.ops.frameHold(RS.getClip(a.id), 4));
      RS.engine.seek(4.5, false);
      RS.effects.list.flatMap((g) => g.items).find((x) => x.id === 'tpl-lowerThird').create(4);
      RS.commit('txt', () => { const t = RS.state.project.clips.filter((c) => c.type === 'text'); if (t[0]) { t[0].text.content = 'Leo Marín\nSurfing since he was 9'; t[0].label = 'Leo Marín'; } });
      const held = RS.state.project.clips.find((c) => c.hold);
      if (held) T.select(held.id);
      SH.tab('effectControls'); SH.finish(5.5);
      await SH.wait(300); SH.only('Time'); SH.clean();
    },
  },

  // 2026-12-16 video intro: a Big Bold Intro title over a mountain shot, Effects panel on Title Templates.
  intro: {
    size: S, wait: 1800,
    async setup() {
      SH.ready(); SH.name('Alps Vlog — Intro');
      await SH.add(await SH.photo({ key: 'matterhorn', name: 'matterhorn-sunrise.mp4', secs: 8, zoom: [1.12, 1] }), 'video', 0, 0);
      await SH.add(await SH.photo({ key: 'lake', name: 'lake-morning.mp4', secs: 6 }), 'video', 0, 8);
      await SH.add(SH.music({ name: 'intro-sting.wav', secs: 14, gain: 0.5 }), 'audio', 0, 0);
      RS.effects.list.flatMap((g) => g.items).find((x) => x.id === 'tpl-elegantTitle').create(0.5);
      RS.commit('txt', () => { const t = RS.state.project.clips.filter((c) => c.type === 'text'); if (t[0]) { t[0].text.content = 'THE ALPS'; t[0].label = 'THE ALPS'; } if (t[1]) { t[1].text.content = 'Seven days on foot'; t[1].label = 'Seven days on foot'; } });
      SH.tab('effects');
      const q = document.querySelector('#effects input[type="search"], #effects input');
      if (q) { q.value = 'title'; q.dispatchEvent(new Event('input', { bubbles: true })); }
      SH.finish(2.6); await SH.peaks(); SH.clean();
    },
  },

  // 2026-12-18 shortcuts: a concert edit cut into many pieces, with the Keyboard Shortcuts window open.
  shortcuts: {
    size: S, wait: 1500,
    async setup() {
      SH.ready(); SH.name('Jazz Night Recap');
      const a = await SH.add(await SH.photo({ key: 'jazz', name: 'sax-solo.mp4', secs: 24, fps: 5, speech: 10 }), 'video', 0, 0);
      await SH.add(await SH.photo({ key: 'concert', name: 'crowd-wide.mp4', secs: 12, fps: 5 }), 'video', 1, 6);
      RS.commit('cuts', () => { let c = RS.getClip(a.id); for (const t of [4, 7.5, 11, 15, 19]) { const r = RS.ops.splitClip(c, t); if (r) c = r; } });
      SH.finish(9); await SH.peaks();
      RS.cmd('shortcuts'); SH.clean();
    },
  },

  // 2026-12-20 editing on a phone: three real phone-layout screenshots (timeline, Effects sheet, Export),
  // placed side by side in one 16:9 image by scripts/shots/combine.js (node, no editing of the screens).
  'phone-a': {
    preview: true, hires: true, file: 'phone-a', size: [390, 844], mobile: true, wait: 2000,
    async setup() {
      SH.ready(); SH.name('Bakery Short');
      await RS.templates.create('shorts');
      await SH.add(await SH.photo({ key: 'bakery', name: 'pastries.mp4', w: 720, h: 1280, secs: 12, zoom: [1, 1.08] }), 'video', 0, 0);
      T.closeModals(); document.querySelectorAll('.tool-guide').forEach((x) => x.remove());
      RS.engine.seek(2, false); SH.clean();
    },
  },
  'phone-b': {
    preview: true, hires: true, file: 'phone-b', size: [390, 844], mobile: true, wait: 2000,
    async setup() {
      SH.ready(); SH.name('Bakery Short');
      await RS.templates.create('shorts');
      await SH.add(await SH.photo({ key: 'bakery', name: 'pastries.mp4', w: 720, h: 1280, secs: 12, zoom: [1, 1.08] }), 'video', 0, 0);
      T.closeModals(); document.querySelectorAll('.tool-guide').forEach((x) => x.remove()); RS.engine.seek(3, false);
      const b = [...document.querySelectorAll('button, a')].filter((x) => /Effects$/.test(x.textContent.trim()) && x.getBoundingClientRect().top > 780).pop(); if (b) b.click();
      SH.clean();
    },
  },
  'phone-c': {
    preview: true, hires: true, file: 'phone-c', size: [390, 844], mobile: true, wait: 2000,
    async setup() {
      SH.ready(); SH.name('Bakery Short');
      await RS.templates.create('shorts');
      await SH.add(await SH.photo({ key: 'bakery', name: 'pastries.mp4', w: 720, h: 1280, secs: 12, zoom: [1, 1.08] }), 'video', 0, 0);
      T.closeModals(); document.querySelectorAll('.tool-guide').forEach((x) => x.remove()); RS.engine.seek(5, false);
      const v = RS.state.project.clips.find((c) => c.type === 'video'); RS.commit('g', () => { v.props.saturation = 120; v.props.temperature = 12; }); T.select(v.id);
      const b = [...document.querySelectorAll('button, a')].find((x) => /Edit$/.test(x.textContent.trim()) && x.getBoundingClientRect().top > 700); if (b) b.click();
      SH.clean();
    },
  },
};
