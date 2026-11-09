// Injected into the editor page by tests/runner.js. Builds test media on the fly (no binary fixtures)
// and offers small helpers. Everything here is test-only; the app never loads this file.
(() => {
  const MB = () => window.Mediabunny;
  const T = (window.T = {});
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  T.wait = wait;

  // A real H.264 MP4 (optionally with an AAC tone) drawn on a canvas. Each frame shows its number.
  T.video = async ({ name = 'clip.mp4', w = 640, h = 360, secs = 3, fps = 30, hue = 200, audio = true, freq = 440, bg = null } = {}) => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
    const out = new (MB().Output)({ format: new (MB().Mp4OutputFormat)({ fastStart: 'in-memory' }), target: new (MB().BufferTarget)() });
    const vs = new (MB().CanvasSource)(cv, { codec: 'avc', bitrate: 1.5e6 });
    out.addVideoTrack(vs, { frameRate: fps });
    let as = null, ab = null;
    if (audio) {
      const ctx = new OfflineAudioContext(2, 48000 * secs, 48000);
      const o = ctx.createOscillator(); o.frequency.value = freq; const gn = ctx.createGain(); gn.gain.value = 0.3; o.connect(gn); gn.connect(ctx.destination); o.start();
      ab = await ctx.startRendering();
      as = new (MB().AudioBufferSource)({ codec: 'aac', bitrate: 96e3 }); out.addAudioTrack(as);
    }
    await out.start();
    const n = Math.round(secs * fps);
    for (let i = 0; i < n; i++) {
      if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = `hsl(${hue},80%,50%)`; g.beginPath(); g.arc(w / 2, h / 2, Math.min(w, h) * 0.25, 0, 7); g.fill(); }
      else { g.fillStyle = `hsl(${(hue + i) % 360},70%,45%)`; g.fillRect(0, 0, w, h); }
      g.fillStyle = '#fff'; g.font = `${Math.round(h / 6)}px sans-serif`; g.fillText(String(i), w * 0.05, h * 0.2);
      await vs.add(i / fps, 1 / fps);
    }
    if (as) await as.add(ab);
    await out.finalize();
    return new File([out.target.buffer], name, { type: 'video/mp4' });
  };
  T.wav = async ({ name = 'tone.wav', secs = 2, freq = 440, gain = 0.3 } = {}) => {
    const sr = 48000, n = sr * secs, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const s = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.sin(i / sr * freq * 2 * Math.PI) * gain * 32767, true);
    return new File([buf], name, { type: 'audio/wav' });
  };
  T.png = async ({ name = 'logo.png', w = 400, h = 200, bg = '#ffffff', fg = '#e0245e' } = {}) => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.fillStyle = fg; g.beginPath(); g.arc(w / 2, h / 2, h * 0.35, 0, 7); g.fill();
    g.fillStyle = bg || '#fff'; g.beginPath(); g.arc(w / 2, h / 2, h * 0.12, 0, 7); g.fill(); // a "hole" like in the letter O
    const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
    return new File([blob], name, { type: 'image/png' });
  };
  T.fixture = async (file) => { const b = await (await fetch('/__fixtures/' + file)).blob(); return new File([b], file, { type: b.type || 'application/octet-stream' }); };
  T.import = async (...files) => RS.media.importSources(files.map((f) => ({ name: f.name, file: f, size: f.size })));
  T.place = (mediaId, trackId, start) => { let c; RS.commit('test place', () => { c = RS.ops.placeMedia(mediaId, trackId, start, {}); }); return c; };
  T.clips = (type) => RS.state.project.clips.filter((c) => !type || c.type === type);
  T.select = (...ids) => { RS.state.selection = new Set(ids); RS.emit('selection'); };
  T.fx = (id) => RS.effects.list.flatMap((g) => g.items).find((i) => i.id === id);
  T.allFx = () => RS.effects.list.flatMap((g) => g.items.map((i) => Object.assign({ group: g.group }, i)));

  // Render the program at time t and return a small picture summary.
  T.frameAt = async (t) => {
    RS.engine.invalidate();
    RS.engine.seek(t, false);
    for (let i = 0; i < 30; i++) { await wait(60); if (!RS.engine.busy || !RS.engine.busy()) break; }
    await wait(120);
    return T.stats();
  };
  T.stats = () => {
    const src = RS.engine.canvas, cv = document.createElement('canvas'); cv.width = 64; cv.height = 36;
    const g = cv.getContext('2d'); g.drawImage(src, 0, 0, 64, 36);
    const d = g.getImageData(0, 0, 64, 36).data;
    let r = 0, gg = 0, b = 0, hash = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; hash = (hash * 31 + (d[i] >> 3) * 7 + (d[i + 1] >> 3) * 3 + (d[i + 2] >> 3)) | 0; }
    const n = d.length / 4;
    return { r: Math.round(r / n), g: Math.round(gg / n), b: Math.round(b / n), lum: Math.round((r + gg + b) / 3 / n), hash };
  };
  // How different two frame summaries are (0 = identical).
  T.diff = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) + (a.hash === b.hash ? 0 : 1);
  // Fraction of pixels in the full-resolution frame that are not black (catches thin graphics).
  T.ink = () => {
    const src = RS.engine.canvas, cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height;
    const g = cv.getContext('2d'); g.drawImage(src, 0, 0); const d = g.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0, all = 0; for (let i = 0; i < d.length; i += 16) { all++; if (d[i] + d[i + 1] + d[i + 2] > 30) n++; }
    return n / all;
  };
  T.overflowX = () => document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1;
  T.visible = (sel) => { const e = document.querySelector(sel); if (!e) return false; const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  T.closeModals = () => { document.querySelectorAll('.modal-back').forEach((m) => m.remove()); };
  T.toast = () => [...document.querySelectorAll('#toasts .toast')].map((x) => x.textContent).join(' | ');
  T.ready = 1;
})();
