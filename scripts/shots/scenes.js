// Scenes for scripts/shoot.js. `helpers` is evaluated in the editor page first (window.SH), then each
// scene's setup(). Everything runs in the page, so only browser APIs and RS/T are available there.
'use strict';

function helpers() {
  const MB = window.Mediabunny;
  // Painted "footage": a few original looks, slowly moving so thumbnails differ.
  const paint = {
    sunset(g, w, h, f) {
      const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#3b1d5e'); sky.addColorStop(0.55, '#e0605a'); sky.addColorStop(1, '#f6b65f');
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(w * 0.55, h * 0.62 - f * 0.4, h * 0.11, 0, 7); g.fill();
      for (const [y, c] of [[0.66, '#7a3155'], [0.76, '#4d1f45'], [0.86, '#2a1233']]) { g.fillStyle = c; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += w / 8) g.lineTo(x, h * y + Math.sin(x / w * 6 + y * 9 + f / 40) * h * 0.04); g.lineTo(w, h); g.fill(); }
    },
    ocean(g, w, h, f) {
      const sky = g.createLinearGradient(0, 0, 0, h * 0.55); sky.addColorStop(0, '#5fb7ff'); sky.addColorStop(1, '#bfe6ff');
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1e7fc2'; g.fillRect(0, h * 0.52, w, h * 0.3);
      g.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 9; i++) g.fillRect(((i * 173 + f * 3) % w), h * (0.56 + (i % 3) * 0.07), w * 0.08, 3);
      g.fillStyle = '#f1d9a6'; g.beginPath(); g.moveTo(0, h); g.quadraticCurveTo(w * 0.5, h * 0.72, w, h * 0.86); g.lineTo(w, h); g.fill();
    },
    city(g, w, h, f) {
      g.fillStyle = '#0d1030'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) { const bw = w / 18, bh = h * (0.3 + ((i * 37) % 40) / 100), x = (i * bw * 0.72) % (w + bw) - bw / 2; g.fillStyle = i % 2 ? '#1b2050' : '#151a42'; g.fillRect(x, h - bh, bw, bh); g.fillStyle = '#ffd36b'; for (let y = h - bh + 8; y < h - 8; y += 14) for (let k = 4; k < bw - 6; k += 10) if ((i * 7 + y + k + (f >> 3)) % 5 === 0) g.fillRect(x + k, y, 4, 6); }
    },
    portrait(g, w, h, f) {
      const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#ff7a59'); bg.addColorStop(1, '#8b3dd6'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc((i * 211 + f) % w, (i * 137) % h, w * (0.06 + (i % 3) * 0.03), 0, 7); g.fill(); }
      g.fillStyle = '#ffe3c4'; g.beginPath(); g.arc(w / 2, h * 0.42, w * 0.16, 0, 7); g.fill();
      g.fillStyle = '#2b1838'; g.beginPath(); g.arc(w / 2, h * 0.86, w * 0.3, Math.PI, 0); g.fill();
    },
    studio(g, w, h, f) {
      const bg = g.createRadialGradient(w * 0.5, h * 0.4, 10, w * 0.5, h * 0.5, w * 0.7); bg.addColorStop(0, '#3a4a5e'); bg.addColorStop(1, '#141a22'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e8c39e'; g.beginPath(); g.arc(w / 2, h * 0.4, h * 0.15, 0, 7); g.fill();
      g.fillStyle = '#2f6f8f'; g.beginPath(); g.arc(w / 2, h * 1.02, h * 0.42, Math.PI, 0); g.fill();
      g.fillStyle = '#20262e'; g.fillRect(w * 0.47, h * 0.62 + Math.sin(f / 9) * 2, w * 0.06, h * 0.2);
    },
  };
  window.SH = {
    async clip({ name, kind = 'sunset', w = 1280, h = 720, secs = 4, fps = 30, audio = false, freq = 220 }) {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
      const out = new MB.Output({ format: new MB.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new MB.BufferTarget() });
      const vs = new MB.CanvasSource(cv, { codec: 'avc', bitrate: 3e6 }); out.addVideoTrack(vs, { frameRate: fps });
      let as = null, ab = null;
      if (audio) {
        const ctx = new OfflineAudioContext(2, 48000 * secs, 48000);
        const o = ctx.createOscillator(); o.frequency.value = freq; const gn = ctx.createGain(); gn.gain.value = 0.25; o.connect(gn); gn.connect(ctx.destination); o.start();
        ab = await ctx.startRendering(); as = new MB.AudioBufferSource({ codec: 'aac', bitrate: 96e3 }); out.addAudioTrack(as);
      }
      await out.start();
      for (let i = 0; i < secs * fps; i++) { paint[kind](g, w, h, i); await vs.add(i / fps, 1 / fps); }
      if (as) await as.add(ab);
      await out.finalize();
      return new File([out.target.buffer], name || kind + '.mp4', { type: 'video/mp4' });
    },
    // A music-like bed (chord with a slow pulse) as WAV.
    music({ name = 'music.wav', secs = 12, gain = 0.5 } = {}) {
      const sr = 48000, n = sr * secs, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
      const s = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
      s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, n * 2, true);
      for (let i = 0; i < n; i++) { const t = i / sr, env = 0.55 + 0.45 * Math.sin(t * Math.PI * 2); const x = (Math.sin(t * 220 * 6.283) + Math.sin(t * 277 * 6.283) + Math.sin(t * 330 * 6.283)) / 3; v.setInt16(44 + i * 2, x * env * gain * 32767, true); }
      return new File([buf], name, { type: 'audio/wav' });
    },
    // Import a file and place it; returns the placed clip on that track (as stored in the project).
    async add(file, kind = 'video', index = 0, start = 0) {
      const [m] = await T.import(file);
      const tr = RS.tracksOf(kind)[index];
      T.place(m.id, tr.id, start);
      return RS.state.project.clips.find((c) => c.trackId === tr.id && c.mediaId === m.id);
    },
    ready() { RS.web.hideHome(); document.querySelectorAll('#toasts .toast').forEach((x) => x.remove()); },
    tab(name) { const b = document.querySelector(`.tab[data-tab="${name}"]`); if (b) b.click(); },
    // Show the whole sequence and park the playhead.
    finish(at = 1.2) { SH.ready(); RS.engine.seek(at, false); const f = document.querySelector('[title*="Zoom to fit"], .tl-fit'); if (f) f.click(); RS.emit('timeline-change'); },
    title(text, opts = {}) { if (RS.cmd) RS.cmd('newTitle'); return text; },
  };
}

module.exports = {
  __helpers: helpers,

  // ---- first-visit intro previews (not written to the site; "preview" scenes are skipped by "all")
  'intro-desktop': { preview: true, intro: true, size: [1440, 900], file: '_preview-intro-desktop' },
  'intro-phone': { preview: true, intro: true, mobile: true, size: [390, 844], file: '_preview-intro-phone' },

  'fx-grid': {
    preview: true, size: [1500, 888], file: '_preview-fx-grid', wait: 300,
    async setup() {
      SH.ready();
      const c = await SH.add(await SH.clip({ name: 'sunset.mp4', kind: 'portrait', secs: 3 }), 'video');
      const ids = ['kaleido', 'zoomblur', 'duotone', 'oldfilm', 'strobe', 'spotlight', 'snow', 'sparkle', 'rain'];
      const out = document.createElement('canvas'); out.width = 1500; out.height = 888;
      const g = out.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, 1500, 888);
      const tw = 480, th = 270;
      for (let i = 0; i < ids.length; i++) {
        RS.commit('fx', () => { const x = RS.getClip(c.id); x.vfx = { [ids[i]]: { amount: RS.creative.VFX[ids[i]].def.amount } }; });
        await T.frameAt(1.03);
        const x = 15 + (i % 3) * (tw + 15), y = 15 + Math.floor(i / 3) * (th + 22);
        g.drawImage(RS.engine.canvas, x, y, tw, th);
        g.fillStyle = '#fff'; g.font = '15px sans-serif'; g.fillText(RS.creative.VFX[ids[i]].name, x + 6, y + th + 17);
      }
      out.style.cssText = 'position:fixed;inset:0;z-index:99999;width:1500px;height:888px';
      document.body.append(out);
    },
  },

  'home-preview': { preview: true, size: [1440, 900], file: '_preview-home', async setup() { await RS.web.home(); } },
  'tpl-shorts-preview': { preview: true, size: [1440, 900], file: '_preview-tpl-shorts', wait: 1500, async setup() { SH.ready(); await RS.templates.create('shorts'); RS.engine.seek(1.2, false); } },
  // Template card image for the website / featured image.
  templates: { size: [1500, 888], wait: 1200, async setup() { SH.ready(); await RS.templates.create('shorts'); await SH.add(await SH.clip({ name: 'portrait.mp4', kind: 'portrait', w: 720, h: 1280, secs: 15 }), 'video'); RS.engine.seek(1.2, false); SH.finish(1.2); } },

  // ---- featured images
  audio: {
    size: [1500, 888],
    async setup() {
      SH.ready(); RS.state.project.name = 'Podcast Clip'; RS.emit('project-change');
      await SH.add(await SH.clip({ name: 'studio.mp4', kind: 'studio', secs: 48, w: 640, h: 360, fps: 15 }), 'video');
      const a = await SH.add(await T.fixture('speech.m4a'), 'audio', 0, 0);
      await SH.add(SH.music({ secs: 47, gain: 0.35 }), 'audio', 1);
      RS.commit('shot', () => { const c = RS.getClip(a.id); (c.props || c).volume = 180; });
      RS.effects.apply('comp', [RS.getClip(a.id)]);
      T.select(a.id);
      SH.tab('effectControls');
      SH.finish(6);
      // open the Audio section so Volume and the Compressor are in view
      const ec = document.getElementById('effect-controls'); if (ec) ec.scrollTop = 0;
    },
  },
  effects: {
    size: [1500, 888],
    async setup() {
      SH.ready(); RS.state.project.name = 'Weekend Vlog'; RS.emit('project-change');
      const a = await SH.add(await SH.clip({ name: 'city.mp4', kind: 'city', secs: 3 }), 'video', 0, 0);
      const b = await SH.add(await SH.clip({ name: 'ocean.mp4', kind: 'ocean', secs: 3 }), 'video', 0, 3);
      const c = await SH.add(await SH.clip({ name: 'sunset.mp4', kind: 'sunset', secs: 3 }), 'video', 0, 6);
      RS.effects.apply('vfx-punch', [RS.getClip(b.id)]);
      T.select(b.id);
      SH.tab('effects');
      const q = document.querySelector('#effects input[type="search"], #effects input');
      if (q) { q.value = 'zoom'; q.dispatchEvent(new Event('input', { bubbles: true })); }
      SH.finish(4);
    },
  },
  // Blog 2026-11-15: a long episode with markers on the best moments, a vertical "Short 1" sequence tab,
  // and the Source monitor with an In/Out range around one moment.
  repurpose: {
    size: [1500, 888], wait: 1500,
    async setup() {
      SH.ready(); RS.state.project.name = 'Podcast Episode 12'; RS.emit('project-change');
      const v = await SH.add(await SH.clip({ name: 'episode-12.mp4', kind: 'studio', secs: 90, w: 640, h: 360, fps: 15, audio: true, freq: 180 }), 'video');
      RS.commit('markers', () => { RS.state.project.markers = [[14, 'Best tip', '#e5484d'], [41, 'Funny moment', '#f0a83a'], [67, 'Big reveal', '#46c27b']].map(([t, name, color], i) => ({ id: 'mk' + i, t, name, color })); });
      const main = RS.state.project.activeSeq;
      RS.commit('short', () => { const q = RS.newSequence('Short 1 — Best tip', { width: 1080, height: 1920, fps: 30, autoMatch: false }); RS.state.project.sequences.push(q); });
      RS.emit('media-change');
      RS.openSequence(RS.state.project.sequences[1].id); RS.openSequence(main);
      const m = RS.state.project.media[0];
      RS.sourceMonitor.load(m.id); SH.tab('source');
      await new Promise((r) => setTimeout(r, 800));
      RS.sourceMonitor.seek(12); RS.sourceMonitor.markIn(); RS.sourceMonitor.seek(31); RS.sourceMonitor.markOut(); RS.sourceMonitor.seek(14);
      SH.finish(14);
    },
  },
  privacy: {
    size: [1500, 888],
    async setup() { RS.state.project.name = 'Untitled'; await RS.web.home(); },
  },
};
