'use strict';
// Playback + compositing engine.
// One master clock drives the playhead; media elements are kept in sync with it, and every frame
// the visible clips (transitions, nested/multicam sequences, masks, Lumetri color) are composited
// onto the program canvas. Nested sequences are rendered recursively.
(function (RS) {
  const S = RS.state;
  const E = RS.engine = {
    pool: new Map(),       // key ('clipId' or 'nestId/clipId') -> { el, url, gain, node, target }
    images: new Map(),     // mediaId -> HTMLImageElement
    textCache: new Map(),
    shapeCache: new Map(),
    solidCache: new Map(),
    nestCanvases: new Map(),
    bounds: new Map(),     // top-level clipId -> on-canvas geometry (sequence coordinates)
    rate: 1,
    needs: true,
    exporting: false,
    stopAt: null,
    editingId: null,
    exportSize: null,
    frameOverride: null,   // Map key -> { src, w, h, sample } supplied by the frame-accurate exporter
    mcView: false,         // multi-camera monitor: keep every angle decoding
    playRes: 1,            // playback resolution while playing (1, 0.5, 0.25)
    useProxies: false,     // play proxy files instead of originals (never used for export)
    hideCaptions: false,
    buses: new Map(),      // top-level audio track id -> { input, analyser }
  };
  const TOP = { prefix: '', depth: 0, onlyTrack: null };
  const ZERO = { pre: 0, post: 0 };
  let actx = null, master = null, hidden = null, svgDefs = null;
  let splitter = null, anL = null, anR = null;
  let t0 = 0, c0 = 0;

  E.audioContext = () => {
    if (!actx) {
      actx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' });
      master = actx.createGain();
      master.connect(actx.destination);
      splitter = actx.createChannelSplitter(2);
      anL = actx.createAnalyser(); anR = actx.createAnalyser();
      anL.fftSize = anR.fftSize = 1024;
      master.connect(splitter);
      splitter.connect(anL, 0);
      splitter.connect(anR, 1);
      E.gateReady = false;
      if (actx.audioWorklet) actx.audioWorklet.addModule('js/worklets/gate.js').then(() => { E.gateReady = true; for (const ent of E.pool.values()) ent.afxKey = null; }).catch((err) => console.warn('noise gate unavailable', err));
    }
    return actx;
  };

  // Per-track metering bus (sound still goes to the master).
  E.bus = (trackId) => {
    let b = E.buses.get(trackId);
    if (!b) {
      E.audioContext();
      const input = actx.createGain();
      const analyser = actx.createAnalyser();
      analyser.fftSize = 512;
      input.connect(analyser);
      input.connect(master);
      b = { input, analyser, buf: new Float32Array(512) };
      E.buses.set(trackId, b);
    }
    return b;
  };
  E.busLevel = (trackId) => {
    const b = E.buses.get(trackId);
    if (!b || !S.playing) return -Infinity;
    b.analyser.getFloatTimeDomainData(b.buf);
    let m = 0;
    for (let i = 0; i < b.buf.length; i++) { const v = Math.abs(b.buf[i]); if (v > m) m = v; }
    return m > 0 ? 20 * Math.log10(m) : -Infinity;
  };

  // Audio effect chain (shared by playback and the offline exporter). Returns [first, last] nodes.
  E.buildAfx = (ctx, afx, gateOk) => {
    const nodes = [];
    if (afx) {
      if (afx.hp) { const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = afx.hp.freq || 80; f.Q.value = 0.707; nodes.push(f); }
      if (afx.dehum) {
        for (let h = 1; h <= 4; h++) { const f = ctx.createBiquadFilter(); f.type = 'notch'; f.frequency.value = (afx.dehum.freq || 50) * h; f.Q.value = 30; nodes.push(f); }
      }
      if (afx.gate && gateOk) { const g = new AudioWorkletNode(ctx, 'rs-gate', { outputChannelCount: [2] }); g.parameters.get('threshold').value = afx.gate.threshold ?? -50; nodes.push(g); }
      if (afx.eq) {
        const lo = ctx.createBiquadFilter(); lo.type = 'lowshelf'; lo.frequency.value = 200; lo.gain.value = afx.eq.low || 0;
        const mid = ctx.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = afx.eq.midFreq || 1000; mid.Q.value = 1; mid.gain.value = afx.eq.mid || 0;
        const hi = ctx.createBiquadFilter(); hi.type = 'highshelf'; hi.frequency.value = 4000; hi.gain.value = afx.eq.high || 0;
        nodes.push(lo, mid, hi);
      }
      if (afx.comp) {
        const c = ctx.createDynamicsCompressor();
        c.threshold.value = afx.comp.threshold ?? -24; c.ratio.value = afx.comp.ratio ?? 4; c.knee.value = 6; c.attack.value = 0.005; c.release.value = 0.15;
        const mk = ctx.createGain(); mk.gain.value = Math.pow(10, (afx.comp.makeup || 0) / 20);
        nodes.push(c, mk);
      }
    }
    if (afx && afx.voice && RS.creative) nodes.push(...RS.creative.voiceNodes(ctx, afx.voice, gateOk));
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
    return nodes;
  };
  E.master = () => { E.audioContext(); return master; };

  const meterBuf = new Float32Array(1024);
  E.levels = () => {
    if (!anL) return [-Infinity, -Infinity];
    const peak = (an) => {
      an.getFloatTimeDomainData(meterBuf);
      let m = 0;
      for (let i = 0; i < meterBuf.length; i++) { const v = Math.abs(meterBuf[i]); if (v > m) m = v; }
      return m > 0 ? 20 * Math.log10(m) : -Infinity;
    };
    return [peak(anL), peak(anR)];
  };

  E.init = (canvas) => {
    E.canvas = canvas;
    E.ctx = canvas.getContext('2d', { alpha: false });
    hidden = RS.h('div', { style: { position: 'fixed', left: '-10px', top: '-10px', width: '1px', height: '1px', overflow: 'hidden', opacity: '0', pointerEvents: 'none' } });
    document.body.append(hidden);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svgDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.append(svgDefs);
    document.body.append(svg);
    E.audioContext();
    E.resize();
    requestAnimationFrame(loop);
    RS.on('change', () => { E.gc(); E.invalidate(); });
    RS.on('settings-change', () => { E.resize(); E.invalidate(); });
  };

  E.resize = () => {
    const { width, height } = S.project.settings;
    const k = !E.exportSize && !E.exporting && S.playing ? E.playRes : 1;
    const w = E.exportSize ? E.exportSize.w : Math.max(2, Math.round(width * k)), h = E.exportSize ? E.exportSize.h : Math.max(2, Math.round(height * k));
    if (E.canvas.width !== w) E.canvas.width = w;
    if (E.canvas.height !== h) E.canvas.height = h;
  };
  E.setExportSize = (size) => { E.exportSize = size; E.resize(); E.needs = true; };

  E.invalidate = () => { E.needs = true; };
  E.endTime = () => (E.stopAt != null ? E.stopAt : RS.seqDuration());

  // ---------- transport ----------
  E.play = (rate = 1) => {
    E.audioContext().resume().catch(() => {});
    const end = E.endTime();
    if (end <= 0) return;
    if (rate > 0 && S.playhead >= end - 0.5 / RS.fps()) S.playhead = 0;
    if (rate < 0 && S.playhead <= 0) return;
    E.rate = rate;
    t0 = S.playhead;
    c0 = performance.now();
    for (const ent of E.pool.values()) ent.force = true;
    if (!S.playing) { S.playing = true; RS.emit('play-state', true); }
  };

  // Play a range once (used to preview a transition right after it is applied).
  E.previewRange = (a, b) => {
    if (E.exporting) return;
    if (S.playing) E.pause();
    E.seek(Math.max(0, a));
    E.previewing = true;
    E.stopAt = Math.min(b, RS.seqDuration());
    E.onStop = () => { E.stopAt = null; E.previewing = false; };
    E.play(1);
  };
  E.pause = () => {
    if (E.previewing && !E.exporting) { E.previewing = false; E.stopAt = null; E.onStop = null; }
    if (!S.playing) return;
    S.playing = false;
    E.rate = 1;
    for (const ent of E.pool.values()) { if (!ent.el.paused) ent.el.pause(); if (ent.gain) ent.gain.gain.value = 0; }
    S.playhead = RS.frameRound(S.playhead, RS.fps());
    E.needs = true;
    RS.emit('play-state', false);
    RS.emit('time', S.playhead);
  };

  E.toggle = () => (S.playing ? E.pause() : E.play(1));

  E.seek = (t, keepPlaying = true) => {
    const fps = RS.fps();
    t = RS.clamp(t, 0, Math.max(RS.seqDuration(), 0));
    if (!S.playing) t = RS.frameRound(t, fps);
    S.playhead = t;
    if (S.playing) {
      if (!keepPlaying) E.pause();
      else { t0 = t; c0 = performance.now(); for (const ent of E.pool.values()) ent.force = true; }
    }
    E.needs = true;
    RS.emit('time', t);
  };

  E.step = (frames) => {
    if (S.playing) E.pause();
    E.seek(S.playhead + frames / RS.fps());
  };

  function loop() {
    requestAnimationFrame(loop);
    try {
      if (S.playing) {
        let t = t0 + ((performance.now() - c0) / 1000) * E.rate;
        const end = E.endTime();
        let finished = false;
        if (t >= end) { t = end; finished = true; }
        if (t <= 0 && E.rate < 0) { t = 0; finished = true; }
        S.playhead = t;
        E.sync(t, true);
        E.render(t);
        RS.emit('time', t);
        if (finished) { E.pause(); RS.emit('ended'); if (E.onStop) { const f = E.onStop; E.onStop = null; f(); } }
      } else if (E.needs) {
        E.needs = false;
        E.sync(S.playhead, false);
        E.render(S.playhead);
      }
    } catch (err) {
      console.error('engine loop', err);
    }
  }

  // ---------- media element pool ----------
  const urlFor = (c, rt) => (c.type === 'video' && E.useProxies && !E.exporting && rt.proxyUrl ? rt.proxyUrl : rt.url);
  function getEntry(c, key) {
    const rt = RS.runtime[c.mediaId];
    if (!rt || !rt.url || rt.offline) return null;
    const url = urlFor(c, rt);
    let ent = E.pool.get(key);
    if (ent && ent.url !== url) { release(key); ent = null; }
    if (!ent) {
      const el = document.createElement(c.type === 'video' ? 'video' : 'audio');
      el.preload = 'auto';
      el.playsInline = true;
      el.muted = c.type === 'video'; // picture only; sound comes from the audio clip
      el.disableRemotePlayback = true;
      ent = { el, url, target: -1, force: true };
      if (c.type === 'audio') {
        ent.node = E.audioContext().createMediaElementSource(el);
        ent.gain = actx.createGain();
        ent.gain.gain.value = 0;
        ent.pan = actx.createStereoPanner();
        ent.node.connect(ent.gain);
        ent.afxKey = null;
      }
      el.addEventListener('seeked', () => { E.needs = true; });
      el.addEventListener('loadeddata', () => { E.needs = true; });
      el.addEventListener('error', () => { ent.failed = true; });
      el.src = url;
      el.currentTime = c.in;
      ent.target = c.in;
      hidden.append(el);
      E.pool.set(key, ent);
    }
    return ent;
  }

  function release(key) {
    const ent = E.pool.get(key);
    if (!ent) return;
    E.pool.delete(key);
    try {
      ent.el.pause();
      if (ent.node) { ent.node.disconnect(); ent.gain.disconnect(); ent.pan.disconnect(); (ent.afx || []).forEach((n) => n.disconnect()); }
      ent.el.removeAttribute('src');
      ent.el.load();
      ent.el.remove();
    } catch (err) { console.warn(err); }
  }

  const clipExists = (id) => S.project.sequences.some((q) => q.clips.some((c) => c.id === id));
  E.gc = () => {
    for (const key of [...E.pool.keys()]) if (!clipExists(key.split('/')[0])) release(key);
    for (const cache of [E.textCache, E.shapeCache]) for (const id of [...cache.keys()]) if (!clipExists(id)) cache.delete(id);
  };

  E.releaseAll = () => {
    for (const key of [...E.pool.keys()]) release(key);
    E.images.clear();
    E.textCache.clear();
    E.shapeCache.clear();
    E.nestCanvases.clear();
  };

  // Transition windows per video track and how far clips play beyond their edges.
  function computeWindows(seq) {
    const byTrack = new Map();
    const ext = new Map();
    for (const tr of RS.tracksOf('video', seq)) {
      const wins = RS.transWindows(tr.id, seq);
      byTrack.set(tr.id, wins);
      for (const w of wins) {
        if (w.A && w.B) {
          const ea = ext.get(w.A.id) || { pre: 0, post: 0 }; ea.post = Math.max(ea.post, w.t2 - w.cut); ext.set(w.A.id, ea);
          const eb = ext.get(w.B.id) || { pre: 0, post: 0 }; eb.pre = Math.max(eb.pre, w.cut - w.t1); ext.set(w.B.id, eb);
        }
      }
    }
    return { byTrack, ext };
  }
  E.computeWindows = computeWindows;

  // Walk a sequence (recursing into nests) and list every media clip that needs a frame/sound near time t.
  // strict: only clips actually drawn/heard at t (used by the exporter).
  function visit(seq, t, prefix, opts, out, depth) {
    const { ext } = computeWindows(seq);
    const fps = S.project.settings.fps;
    const soloed = seq.tracks.filter((x) => x.kind === 'audio' && x.solo).map((x) => x.id);
    const vts = RS.tracksOf('video', seq);
    for (const c of seq.clips) {
      if (c.disabled) continue;
      const isPic = c.type === 'video' || c.type === 'nest';
      const isSnd = c.type === 'audio' || c.type === 'nestAudio';
      if ((isPic && !opts.video) || (isSnd && !opts.audio) || (!isPic && !isSnd)) continue;
      const tr = seq.tracks.find((x) => x.id === c.trackId);
      if (!tr) continue;
      if (isPic && tr.hidden) continue;
      if (isPic && opts.angle != null && vts.indexOf(tr) !== opts.angle) continue;
      const e = ext.get(c.id) || ZERO;
      const effStart = c.start - e.pre, effEnd = c.start + c.duration + e.post;
      if (opts.strict) { if (t < effStart || t >= effEnd) continue; }
      else {
        const ahead = opts.forward ? 3 * Math.max(1, Math.abs(opts.rate)) : 0.5;
        if (t < effStart - ahead || t > effEnd + 0.5) continue;
      }
      const active = t >= effStart && t < effEnd;
      const inClip = t >= c.start && t < c.start + c.duration;
      const lt = active ? t - c.start : (t < effStart ? -e.pre : 0);
      let gain = 0, pan = 0;
      const lc = RS.clamp(t - c.start, 0, c.duration);
      if (isSnd && inClip && !tr.muted && (!soloed.length || soloed.includes(tr.id))) {
        gain = (RS.getProp(c, 'volume', lc) / 100) * Math.pow(10, (c.props.gain || 0) / 20) * RS.fadeFactor(c, lc) * ((tr.volume ?? 100) / 100) * opts.gain;
      }
      if (isSnd) pan = RS.clamp((RS.getProp(c, 'pan', lc) + (tr.pan || 0)) / 100 + (opts.pan || 0), -1, 1);
      const bus = depth === 0 ? tr.id : opts.bus;
      if (c.type === 'nest' || c.type === 'nestAudio') {
        const inner = RS.getSequence(c.seqId);
        if (!inner || depth > 6) continue;
        const all = !!c.multicam && opts.allAngles && depth === 0;
        visit(inner, Math.max(0, RS.srcTime(c, lt)), prefix + c.id + '/', {
          video: isPic, audio: isSnd, gain: isSnd ? gain : 0, pan: isSnd ? pan : 0, bus, rate: opts.rate * c.speed,
          angle: c.multicam && !all ? (c.angle || 0) : null, allAngles: false,
          forward: opts.forward && active, strict: opts.strict,
        }, out, depth + 1);
        continue;
      }
      const m = RS.getMedia(c.mediaId);
      const mediaEnd = m && isFinite(m.duration) ? m.duration : Infinity;
      const raw = RS.srcTime(c, lt);
      const mt = RS.clamp(raw, 0, Math.max(0, mediaEnd - 1 / fps));
      const remapV = RS.isRemapped(c) ? RS.getProp(c, 'remap', lc) / 100 : 1;
      // Holds and reversed clips are shown by seeking each frame (media elements cannot play backwards).
      const stepped = !!(c.hold || c.reverse) || remapV <= 0.0625;
      if (c.reverse && c.type === 'audio' && !E.exporting) gain = 0; // reversed sound is rendered on export only
      out.push({ key: prefix + c.id, c, tr, active, inClip, lt, mt, holding: stepped || raw < 0 || raw > mediaEnd - 1 / fps, gain, pan, bus, rate: opts.rate * c.speed * remapV, pre: e.pre, forward: opts.forward });
    }
  }
  E.visit = (t, o) => {
    const out = [];
    visit(S.project.seq, t, '', Object.assign({ video: true, audio: true, gain: 1, rate: 1, angle: null, allAngles: false, forward: false, strict: true }, o || {}), out, 0);
    return out;
  };

  // Bring every relevant media element to the right time / play state.
  E.sync = (t, playing) => {
    const fps = RS.fps();
    const forward = playing && E.rate > 0;
    const now = actx ? actx.currentTime : 0;
    const out = [];
    visit(S.project.seq, t, '', { video: true, audio: true, gain: 1, rate: E.rate, angle: null, allAngles: E.mcView, forward, strict: false }, out, 0);
    const live = new Set();
    for (const it of out) {
      live.add(it.key);
      const c = it.c;
      const ent = getEntry(c, it.key);
      if (!ent || ent.failed) continue;
      const el = ent.el;
      const m = RS.getMedia(c.mediaId);
      const mediaEnd = m && isFinite(m.duration) ? m.duration : Infinity;
      if (it.active && it.forward && !it.holding) {
        const pr = RS.clamp(it.rate, 0.0625, 16);
        if (el.playbackRate !== pr) el.playbackRate = pr;
        if (el.paused || ent.force) {
          if (Math.abs(el.currentTime - it.mt) > 0.04) el.currentTime = it.mt;
          ent.force = false;
          if (el.paused) el.play().catch(() => {});
        } else if (Math.abs(el.currentTime - it.mt) > 0.25 * Math.max(1, pr)) {
          el.currentTime = it.mt; // drift correction
        }
      } else {
        if (!el.paused) el.pause();
        const target = it.active ? it.mt : RS.clamp(c.in - it.pre * c.speed, 0, Math.max(0, mediaEnd - 1 / fps));
        if (Math.abs(el.currentTime - target) > 0.5 / fps && Math.abs(ent.target - target) > 1e-4) {
          ent.target = target;
          el.currentTime = target;
        } else if (!el.seeking) {
          ent.target = target;
        }
      }
      if (ent.gain) {
        // (re)build the effect chain when the clip's audio effects change
        const akey = JSON.stringify(c.afx || null) + '|' + it.bus + '|' + !!E.gateReady;
        if (ent.afxKey !== akey) {
          ent.gain.disconnect(); ent.pan.disconnect(); (ent.afx || []).forEach((n) => n.disconnect());
          ent.afx = E.buildAfx(actx, c.afx, E.gateReady);
          if (ent.afx.length) { ent.gain.connect(ent.afx[0]); ent.afx[ent.afx.length - 1].connect(ent.pan); } else ent.gain.connect(ent.pan);
          ent.pan.connect(E.bus(it.bus).input);
          ent.afxKey = akey;
        }
        ent.gain.gain.setTargetAtTime(it.forward && it.active ? Math.max(0, it.gain) : 0, now, 0.012);
        ent.pan.pan.setTargetAtTime(it.pan, now, 0.02);
      }
    }
    for (const key of [...E.pool.keys()]) if (!live.has(key)) release(key);
  };

  // ---------- Lumetri color (tone, wheels, curves) via an SVG filter per clip ----------
  RS.DEFAULT_LUMETRI = () => ({
    exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
    wheels: { sh: { x: 0, y: 0, l: 0 }, mid: { x: 0, y: 0, l: 0 }, hi: { x: 0, y: 0, l: 0 } },
    curves: { m: [[0, 0], [1, 1]], r: [[0, 0], [1, 1]], g: [[0, 0], [1, 1]], b: [[0, 0], [1, 1]] },
  });
  const isIdentityCurve = (p) => p.length === 2 && p[0][0] === 0 && p[0][1] === 0 && p[1][0] === 1 && p[1][1] === 1;
  RS.lumetriActive = (l) => !!l && (l.exposure || l.contrast || l.highlights || l.shadows || l.whites || l.blacks ||
    ['sh', 'mid', 'hi'].some((k) => l.wheels[k].x || l.wheels[k].y || l.wheels[k].l) ||
    ['m', 'r', 'g', 'b'].some((k) => !isIdentityCurve(l.curves[k])));

  // Monotone cubic (Fritsch–Carlson) curve through control points.
  RS.curveFn = (pts) => {
    const p = pts.slice().sort((a, b) => a[0] - b[0]);
    const n = p.length;
    if (n < 2) return (x) => x;
    const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
    const d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i];
      const s = a * a + b * b;
      if (s > 9) { const tau = 3 / Math.sqrt(s); m[i] = tau * a * d[i]; m[i + 1] = tau * b * d[i]; }
    }
    return (x) => {
      if (x <= xs[0]) return ys[0];
      if (x >= xs[n - 1]) return ys[n - 1];
      let i = 0;
      while (i < n - 2 && x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h;
      const t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  };
  // Wheel position → zero-sum RGB offset (hue around the wheel, distance = strength).
  RS.wheelVector = (w) => {
    const amt = Math.min(1, Math.hypot(w.x, w.y));
    const th = Math.atan2(-w.y, w.x);
    return [Math.cos(th) * amt, Math.cos(th - 2.0944) * amt, Math.cos(th + 2.0944) * amt];
  };
  const ss = (a, b, x) => { const t = RS.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  RS.lumetriTables = (l, N = 64) => {
    const cm = RS.curveFn(l.curves.m), cc = [RS.curveFn(l.curves.r), RS.curveFn(l.curves.g), RS.curveFn(l.curves.b)];
    const wv = { sh: RS.wheelVector(l.wheels.sh), mid: RS.wheelVector(l.wheels.mid), hi: RS.wheelVector(l.wheels.hi) };
    const out = [[], [], []];
    for (let i = 0; i < N; i++) {
      const x = i / (N - 1);
      let v = x * Math.pow(2, l.exposure);
      v = 0.5 + (v - 0.5) * (1 + l.contrast / 100);
      v += 0.25 * (l.highlights / 100) * ss(0.5, 1, x);
      v += 0.25 * (l.shadows / 100) * (1 - ss(0, 0.5, x));
      v += 0.3 * (l.whites / 100) * ss(0.7, 1, x);
      v += 0.15 * (l.blacks / 100) * (1 - ss(0, 0.3, x));
      v = RS.clamp(v, 0, 1);
      const wS = (1 - v) * (1 - v), wM = 4 * v * (1 - v), wH = v * v;
      for (let k = 0; k < 3; k++) {
        let y = v + wS * (wv.sh[k] * 0.35 + l.wheels.sh.l * 0.3) + wM * (wv.mid[k] * 0.3 + l.wheels.mid.l * 0.3) + wH * (wv.hi[k] * 0.35 + l.wheels.hi.l * 0.3);
        y = cc[k](RS.clamp(cm(RS.clamp(y, 0, 1)), 0, 1));
        out[k].push(RS.clamp(y, 0, 1));
      }
    }
    return out;
  };

  const svgFilters = new Map(); // clipId -> { el, key }
  const SVGNS = 'http://www.w3.org/2000/svg';
  function svgFilterFor(c) {
    const p = c.props;
    const temp = p.temperature || 0, tint = p.tint || 0;
    const lum = RS.lumetriActive(c.lumetri) ? c.lumetri : null;
    const sharp = p.sharpen || 0;
    if (!temp && !tint && !lum && !sharp) return '';
    const key = JSON.stringify([temp, tint, lum, sharp]);
    const id = 'rsf-' + c.id;
    let f = svgFilters.get(c.id);
    if (!f) {
      const el = document.createElementNS(SVGNS, 'filter');
      el.setAttribute('id', id);
      el.setAttribute('color-interpolation-filters', 'sRGB');
      svgDefs.append(el);
      f = { el, key: '' };
      svgFilters.set(c.id, f);
    }
    if (f.key !== key) {
      f.key = key;
      f.el.innerHTML = '';
      if (temp || tint) {
        const r = 1 + 0.22 * temp / 100 + 0.08 * tint / 100;
        const g = 1 + 0.03 * temp / 100 - 0.18 * tint / 100;
        const b = 1 - 0.22 * temp / 100 + 0.08 * tint / 100;
        const cm = document.createElementNS(SVGNS, 'feColorMatrix');
        cm.setAttribute('type', 'matrix');
        cm.setAttribute('values', `${r} 0 0 0 0  0 ${g} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0`);
        f.el.append(cm);
      }
      if (lum) {
        const tables = RS.lumetriTables(lum);
        const ct = document.createElementNS(SVGNS, 'feComponentTransfer');
        ['R', 'G', 'B'].forEach((ch, k) => {
          const fn = document.createElementNS(SVGNS, 'feFunc' + ch);
          fn.setAttribute('type', 'table');
          fn.setAttribute('tableValues', tables[k].map((v) => v.toFixed(4)).join(' '));
          ct.append(fn);
        });
        f.el.append(ct);
      }
      if (sharp) {
        const a = sharp / 100;
        const cv = document.createElementNS(SVGNS, 'feConvolveMatrix');
        cv.setAttribute('order', '3');
        cv.setAttribute('preserveAlpha', 'true');
        cv.setAttribute('kernelMatrix', `0 ${-a} 0 ${-a} ${1 + 4 * a} ${-a} 0 ${-a} 0`);
        f.el.append(cv);
      }
    }
    return `url(#${id})`;
  }

  E.filterString = (c) => {
    const p = c.props;
    const f = [];
    const sv = svgFilterFor(c);
    if (sv) f.push(sv);
    if (p.brightness !== 100) f.push(`brightness(${p.brightness}%)`);
    if (p.contrast !== 100) f.push(`contrast(${p.contrast}%)`);
    if (p.saturation !== 100) f.push(`saturate(${p.saturation}%)`);
    if (p.hue) f.push(`hue-rotate(${p.hue}deg)`);
    if (p.grayscale) f.push(`grayscale(${p.grayscale}%)`);
    if (p.sepia) f.push(`sepia(${p.sepia}%)`);
    if (p.invert) f.push(`invert(${p.invert}%)`);
    if (p.blur) f.push(`blur(${p.blur * E.canvas.height / 1080}px)`);
    return f.length ? f.join(' ') : 'none';
  };

  function getImage(mediaId) {
    const rt = RS.runtime[mediaId];
    if (!rt || !rt.url || rt.offline) return null;
    let img = E.images.get(mediaId);
    if (!img || img._url !== rt.url) {
      img = new Image();
      img._url = rt.url;
      img.onload = () => { E.needs = true; };
      img.src = rt.url;
      E.images.set(mediaId, img);
    }
    return img.complete && img.naturalWidth ? img : null;
  }
  E.getImage = getImage;

  // ---------- generated graphics ----------
  E.fontCSS = (tx, size) => `${tx.italic ? 'italic ' : ''}${tx.bold ? '700' : '400'} ${size}px "${tx.font}", "Helvetica Neue", Arial, sans-serif`;
  // Text rendering. Layers, back to front: background box, offset shadow, 3D extrusion, outer
  // outline, outline (+ drop shadow / glow), then the face (solid, highlight colour, gradient) with
  // an optional halftone dot pattern. Words wrapped in *asterisks* use the highlight colour.
  // reveal: characters shown (typewriter); units: per-word/letter animation state from RS.creative.
  const TEXT_FX_KEYS = ['grad', 'extrude', 'halftone', 'stroke2', 'offShadow', 'color2'];
  E.textCanvas = (c, reveal, l) => {
    const tx = c.text;
    const U = RS.creative && l != null ? RS.creative.unitAnim(c, l) : null; // {mode:'word'|'letter', at(i, n, unit) -> state}
    const raw = String(tx.content || ' ');
    // runs per line: [{t, hl}]
    const lines = raw.split('\n').map((ln) => {
      const runs = []; let hl = false, cur = '';
      for (const ch of ln) { if (ch === '*') { if (cur) runs.push({ t: cur, hl }); cur = ''; hl = !hl; } else cur += ch; }
      if (cur || !runs.length) runs.push({ t: cur, hl });
      return runs;
    });
    const S0 = tx.size;
    const ex = tx.extrude && tx.extrude.on ? tx.extrude : null;
    const os = tx.offShadow && tx.offShadow.on ? tx.offShadow : null;
    const st2 = tx.stroke2 > 0 ? tx.stroke2 : 0;
    const exDepth = ex ? Math.max(1, Math.round((ex.depth ?? 12) / 100 * S0)) : 0;
    const exA = ex ? (ex.angle ?? 90) * Math.PI / 180 : 0;
    const osX = os ? (os.dx ?? 8) / 100 * S0 : 0, osY = os ? (os.dy ?? 10) / 100 * S0 : 0;

    // unit states (rounded) are part of the cache key while animating
    let states = null;
    const g0 = (E._tm || (E._tm = document.createElement('canvas').getContext('2d')));
    const font = E.fontCSS(tx, S0);
    g0.font = font; g0.letterSpacing = tx.spacing ? tx.spacing + 'px' : '0px';
    const plain = lines.map((runs) => runs.map((r) => r.t).join(''));
    const widths = plain.map((t) => g0.measureText(t || ' ').width);
    if (U) {
      const units = [];
      lines.forEach((runs, li) => { const t = plain[li]; if (U.mode === 'letter') { for (let i = 0; i < t.length; i++) if (t[i] !== ' ') units.push([li, i, i + 1]); } else { const re = /\S+/g; let m; while ((m = re.exec(t))) units.push([li, m.index, m.index + m[0].length]); } });
      states = units.map((u, i) => Object.assign({ li: u[0], a: u[1], b: u[2] }, U.at(i, units.length)));
    }
    const key = JSON.stringify(tx) + '|' + (reveal == null ? '' : reveal) + '|' + (states ? JSON.stringify(states.map((q) => [q.dx, q.dy, q.s, q.al, q.blur, q.r].map((v) => Math.round((v || 0) * 100)))) : '');
    const hit = E.textCache.get(c.id);
    if (hit && hit.key === key) return hit.canvas;
    const cv = hit ? hit.canvas : document.createElement('canvas');
    const g = cv.getContext('2d');
    const lh = S0 * (tx.lineHeight || 1.15);
    const extra = Math.max(Math.abs(Math.cos(exA) * exDepth), 0) + Math.max(Math.abs(osX), Math.abs(osY)) + st2 + (Math.abs(Math.sin(exA) * exDepth));
    const pad = Math.round(S0 * (tx.bg ? 0.35 : 0.15)) + (tx.stroke || 0) + (tx.shadow ? 12 : 0) + (tx.glow ? Math.round(S0 * 0.35) : 0) + Math.ceil(extra) + (U ? Math.round(S0 * 0.6) : 0);
    cv.width = Math.max(2, Math.ceil(Math.max(...widths, 1) + pad * 2));
    cv.height = Math.max(2, Math.ceil(lh * lines.length + pad * 2));
    g.font = font; g.letterSpacing = tx.spacing ? tx.spacing + 'px' : '0px';
    g.textBaseline = 'middle';
    if (tx.bg) {
      g.globalAlpha = (tx.bgOpacity ?? 60) / 100;
      g.fillStyle = tx.bgColor;
      const inset = U ? Math.round(S0 * 0.6) : 0;
      roundRect(g, inset, inset, cv.width - inset * 2, cv.height - inset * 2, Math.min(24, S0 * 0.2));
      g.fill();
      g.globalAlpha = 1;
    }
    // Pieces to draw: whole runs, or animated units (each keeps its run colour).
    let left = reveal == null ? Infinity : reveal;
    const pieces = [];
    lines.forEach((runs, li) => {
      const t = plain[li], lw = widths[li];
      let x0 = pad;
      if (tx.align === 'center') x0 = (cv.width - lw) / 2; else if (tx.align === 'right') x0 = cv.width - pad - lw;
      const y = pad + lh * li + lh / 2;
      const vis = Math.max(0, Math.min(t.length, left)); left -= t.length + 1;
      const hlAt = []; runs.forEach((r) => { for (const _ of r.t) hlAt.push(r.hl); });
      const xAt = (i) => x0 + (i ? g.measureText(t.slice(0, i)).width : 0);
      const spans = states ? states.filter((q) => q.li === li).map((q) => ({ a: q.a, b: q.b, q })) : [{ a: 0, b: t.length, q: null }];
      for (const sp of spans) {
        // split each span further by highlight runs
        let i = sp.a;
        while (i < Math.min(sp.b, vis)) {
          let j = i + 1; while (j < Math.min(sp.b, vis) && hlAt[j] === hlAt[i]) j++;
          pieces.push({ text: t.slice(i, j), x: xAt(i), y, hl: !!hlAt[i], q: sp.q, cx: (xAt(sp.a) + xAt(sp.b)) / 2 });
          i = j;
        }
      }
    });
    const pass = (fn) => { for (const p of pieces) { const q = p.q; if (q && q.al <= 0.001) continue; g.save(); if (q) { g.translate(p.cx + (q.dx || 0), p.y + (q.dy || 0)); if (q.r) g.rotate(q.r * Math.PI / 180); if (q.s != null && q.s !== 1) g.scale(q.s, q.s); g.translate(-p.cx, -p.y); g.globalAlpha = q.al ?? 1; if (q.blur > 0.3) g.filter = `blur(${q.blur.toFixed(1)}px)`; } fn(p); g.restore(); } };
    const outlineW = (tx.stroke || 0) * 2 + st2 * 2;
    const solid = (p, color, dx, dy) => {
      g.fillStyle = color; g.strokeStyle = color; g.lineJoin = 'round';
      if (outlineW > 0) { g.lineWidth = outlineW; g.strokeText(p.text, p.x + dx, p.y + dy); }
      g.fillText(p.text, p.x + dx, p.y + dy);
    };
    if (os) pass((p) => solid(p, os.color || '#39ff6a', osX, osY));
    if (ex) {
      const side = ex.color || '#5b2bd6';
      pass((p) => {
        for (let k = exDepth; k >= 1; k--) {
          const shade = 0.55 + 0.45 * (1 - k / exDepth); // darker towards the back
          solid(p, mix(side, '#000000', 1 - shade), Math.cos(exA) * k, Math.sin(exA) * k);
        }
      });
    }
    if (st2) pass((p) => { g.lineJoin = 'round'; g.lineWidth = outlineW; g.strokeStyle = tx.stroke2Color || '#ffffff'; g.strokeText(p.text, p.x, p.y); });
    pass((p) => {
      if (tx.shadow && !ex) { g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = S0 * 0.12; g.shadowOffsetY = S0 * 0.04; }
      if (tx.glow) { g.shadowColor = tx.glow; g.shadowBlur = S0 * 0.35; g.shadowOffsetY = 0; }
      if (tx.stroke > 0) { g.lineJoin = 'round'; g.lineWidth = tx.stroke * 2; g.strokeStyle = tx.strokeColor; g.strokeText(p.text, p.x, p.y); g.shadowColor = 'transparent'; }
      if (tx.glow || (tx.shadow && !ex && !(tx.stroke > 0))) { g.fillStyle = tx.color; g.fillText(p.text, p.x, p.y); }
    });
    // Face: drawn on its own layer so the halftone pattern only covers the letters.
    const face = E._face || (E._face = document.createElement('canvas'));
    face.width = cv.width; face.height = cv.height;
    const f = face.getContext('2d');
    f.font = font; f.letterSpacing = g.letterSpacing; f.textBaseline = 'middle';
    let grad = null;
    if (tx.grad && tx.grad.on) {
      const ang = (tx.grad.angle ?? 90) * Math.PI / 180, cx = cv.width / 2, cy = cv.height / 2;
      const r = Math.abs(Math.cos(ang)) * (cv.width / 2 - pad) + Math.abs(Math.sin(ang)) * (cv.height / 2 - pad);
      grad = f.createLinearGradient(cx - Math.cos(ang) * r, cy - Math.sin(ang) * r, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
      grad.addColorStop(0, tx.grad.c1 || '#5ee7ff'); grad.addColorStop(1, tx.grad.c2 || '#3a7bff');
    }
    const gSave = g;
    for (const p of pieces) {
      const q = p.q; if (q && q.al <= 0.001) continue;
      f.save();
      if (q) { f.translate(p.cx + (q.dx || 0), p.y + (q.dy || 0)); if (q.r) f.rotate(q.r * Math.PI / 180); if (q.s != null && q.s !== 1) f.scale(q.s, q.s); f.translate(-p.cx, -p.y); f.globalAlpha = q.al ?? 1; if (q.blur > 0.3) f.filter = `blur(${q.blur.toFixed(1)}px)`; }
      f.fillStyle = p.hl ? (tx.color2 || '#3b6bff') : (grad || tx.color);
      f.fillText(p.text, p.x, p.y);
      f.restore();
    }
    if (tx.halftone && tx.halftone.on) {
      const step = Math.max(3, Math.round(S0 * (tx.halftone.size ?? 7) / 100));
      const tile = document.createElement('canvas'); tile.width = tile.height = step;
      const tg = tile.getContext('2d'); tg.fillStyle = tx.halftone.color || '#ffffff';
      tg.beginPath(); tg.arc(step / 2, step / 2, step * 0.3, 0, Math.PI * 2); tg.fill();
      f.globalCompositeOperation = 'source-atop'; f.globalAlpha = (tx.halftone.opacity ?? 70) / 100;
      f.fillStyle = f.createPattern(tile, 'repeat'); f.fillRect(0, 0, face.width, face.height);
      f.globalCompositeOperation = 'source-over'; f.globalAlpha = 1;
    }
    gSave.drawImage(face, 0, 0);
    E.textCache.set(c.id, { key, canvas: cv });
    return cv;
  };
  function mix(a, b, t) {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const x = p(a.length === 7 ? a : '#000000'), y = p(b);
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  E.TEXT_FX_KEYS = TEXT_FX_KEYS;

  E.shapeCanvas = (c) => {
    const sh = c.shape;
    const key = JSON.stringify(sh);
    const hit = E.shapeCache.get(c.id);
    if (hit && hit.key === key) return hit.canvas;
    const cv = hit ? hit.canvas : document.createElement('canvas');
    const sw = Math.max(0, sh.strokeW || 0);
    const w = Math.max(2, Math.round(sh.w)), h = Math.max(2, Math.round(sh.h));
    cv.width = w + sw * 2 + 2; cv.height = h + sw * 2 + 2;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    const x = sw + 1, y = sw + 1;
    g.beginPath();
    if (sh.kind === 'ellipse') g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else roundRect(g, x, y, w, h, Math.min(sh.radius || 0, w / 2, h / 2));
    if (sh.fillOn !== false) { g.fillStyle = sh.fill; g.fill(); }
    if (sw > 0) { g.lineWidth = sw; g.strokeStyle = sh.stroke; g.stroke(); }
    E.shapeCache.set(c.id, { key, canvas: cv });
    return cv;
  };

  function roundRect(g, x, y, w, h, r) {
    r = Math.max(0, r);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function solidCanvas(color) {
    let cv = E.solidCache.get(color);
    if (!cv) {
      cv = document.createElement('canvas');
      cv.width = cv.height = 8;
      const g = cv.getContext('2d');
      g.fillStyle = color;
      g.fillRect(0, 0, 8, 8);
      E.solidCache.set(color, cv);
    }
    return cv;
  }

  function nestCanvas(key, w, h) {
    let cv = E.nestCanvases.get(key);
    if (!cv) { cv = document.createElement('canvas'); E.nestCanvases.set(key, cv); }
    if (cv.width !== w) cv.width = w;
    if (cv.height !== h) cv.height = h;
    return cv;
  }

  const layers = new Map();
  function layer(w, h, i) {
    const k = i + ':' + w + 'x' + h;
    let cv = layers.get(k);
    if (!cv) { cv = document.createElement('canvas'); cv.width = w; cv.height = h; layers.set(k, cv); if (layers.size > 12) layers.delete(layers.keys().next().value); }
    return cv;
  }

  // ---------- masks ----------
  // Mask geometry is normalised to the clip's source frame (0..1), so masks follow position/scale/rotation.
  E.maskAt = (mask, lt) => {
    let du = 0, dv = 0;
    const tk = mask.track;
    if (tk && tk.offsets && tk.offsets.length) {
      const f = (lt - tk.t0) / tk.step;
      const i = RS.clamp(Math.floor(f), 0, tk.offsets.length - 1);
      const j = Math.min(tk.offsets.length - 1, i + 1);
      const u = RS.clamp(f - i, 0, 1);
      du = tk.offsets[i][0] + (tk.offsets[j][0] - tk.offsets[i][0]) * u;
      dv = tk.offsets[i][1] + (tk.offsets[j][1] - tk.offsets[i][1]) * u;
      if (f < 0) { du = tk.offsets[0][0]; dv = tk.offsets[0][1]; }
    }
    if (mask.kind === 'poly') return { kind: 'poly', pts: mask.pts.map(([u, v]) => [u + du, v + dv]) };
    return { kind: mask.kind, cx: mask.cx + du, cy: mask.cy + dv, w: mask.w, h: mask.h };
  };

  function maskPath(g, m, w, h) {
    g.beginPath();
    if (m.kind === 'poly') {
      m.pts.forEach(([u, v], i) => { const x = (u - 0.5) * w, y = (v - 0.5) * h; if (i) g.lineTo(x, y); else g.moveTo(x, y); });
      g.closePath();
    } else if (m.kind === 'ellipse') {
      g.ellipse((m.cx - 0.5) * w, (m.cy - 0.5) * h, Math.max(0.5, m.w * w / 2), Math.max(0.5, m.h * h / 2), 0, 0, Math.PI * 2);
    } else {
      g.rect((m.cx - 0.5 - m.w / 2) * w, (m.cy - 0.5 - m.h / 2) * h, m.w * w, m.h * h);
    }
  }

  function applyClipTransform(g, ex, W, H, cx, cy, rot) {
    if (ex.dx || ex.dy) g.translate(ex.dx || 0, ex.dy || 0);
    if (ex.zoom && ex.zoom !== 1) { g.translate(W / 2, H / 2); g.scale(ex.zoom, ex.zoom); g.translate(-W / 2, -H / 2); }
    if (ex.spin) { g.translate(W / 2, H / 2); g.rotate(ex.spin); g.translate(-W / 2, -H / 2); }
    g.translate(cx, cy);
    if (rot) g.rotate(rot);
    if (ex.skewX || ex.skewY) g.transform(1, Math.tan(ex.skewY * Math.PI / 180), Math.tan(ex.skewX * Math.PI / 180), 1, 0, 0);
  }

  // layerCv holds the drawn clip; cut it with the masks and composite onto ctx.
  function applyMasks(layerCv, ctx, c, lt, geo) {
    const cw = layerCv.width, ch = layerCv.height;
    const base = ctx.getTransform();
    const devScale = Math.hypot(base.a, base.b);
    const M = layer(cw, ch, 1), T = layer(cw, ch, 2);
    const mg = M.getContext('2d'), tg = T.getContext('2d');
    mg.setTransform(1, 0, 0, 1, 0, 0); mg.globalCompositeOperation = 'source-over'; mg.globalAlpha = 1; mg.filter = 'none';
    mg.clearRect(0, 0, cw, ch);
    for (const mask of c.masks) {
      const m = E.maskAt(mask, lt);
      tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'source-over'; tg.globalAlpha = 1; tg.filter = 'none';
      tg.clearRect(0, 0, cw, ch);
      tg.setTransform(base);
      applyClipTransform(tg, geo.ex, geo.W, geo.H, geo.cx, geo.cy, geo.rot);
      const feather = Math.max(0, mask.feather || 0) * devScale;
      if (feather > 0.3) tg.filter = `blur(${feather / 2}px)`;
      tg.fillStyle = '#fff';
      tg.strokeStyle = '#fff';
      tg.lineJoin = 'round';
      maskPath(tg, m, geo.w, geo.h);
      tg.fill();
      const exp = mask.expansion || 0;
      if (exp > 0) { tg.lineWidth = exp * 2; tg.stroke(); }
      else if (exp < 0) { tg.globalCompositeOperation = 'destination-out'; tg.lineWidth = -exp * 2; tg.stroke(); tg.globalCompositeOperation = 'source-over'; }
      tg.setTransform(1, 0, 0, 1, 0, 0);
      tg.filter = 'none';
      if (mask.invert) { tg.globalCompositeOperation = 'xor'; tg.fillStyle = '#fff'; tg.fillRect(0, 0, cw, ch); tg.globalCompositeOperation = 'source-over'; }
      mg.globalAlpha = RS.clamp((mask.opacity ?? 100) / 100, 0, 1);
      mg.drawImage(T, 0, 0);
      mg.globalAlpha = 1;
    }
    const lg = layerCv.getContext('2d');
    lg.setTransform(1, 0, 0, 1, 0, 0);
    lg.globalCompositeOperation = 'destination-in';
    lg.drawImage(M, 0, 0);
    lg.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.drawImage(layerCv, 0, 0);
    ctx.restore();
  }

  // ---------- compositing ----------
  function sourceFor(c, lt, scope) {
    const key = scope.prefix + c.id;
    if (c.type === 'video') {
      if (E.frameOverride) { const ov = E.frameOverride.get(key); return ov && ov.src ? ov : null; } // exporter supplies exact frames
      const ent = E.pool.get(key);
      if (!ent || ent.el.readyState < 2) return null;
      return { src: ent.el, w: ent.el.videoWidth, h: ent.el.videoHeight, fit: true };
    }
    if (c.type === 'image') { const img = getImage(c.mediaId); return img ? { src: img, w: img.naturalWidth, h: img.naturalHeight, fit: true } : null; }
    if (c.type === 'text') { const cv = E.textCanvas(c, RS.creative ? RS.creative.reveal(c, lt) : null, RS.clamp(lt, 0, c.duration)); return { src: cv, w: cv.width, h: cv.height, fit: false }; }
    if (c.type === 'shape') { const cv = E.shapeCanvas(c); return { src: cv, w: cv.width, h: cv.height, fit: false }; }
    if (c.type === 'graphic') { const cv = RS.library.frame(c, RS.clamp(lt, 0, c.duration)); return { src: cv, w: cv.width, h: cv.height, fit: false }; }
    if (c.type === 'solid') { const { width: W, height: H } = scope.dims; return { src: solidCanvas(c.color), w: W, h: H, fit: false }; }
    if (c.type === 'nest') {
      const inner = RS.getSequence(c.seqId);
      if (!inner || scope.depth > 6) return null;
      const iw = inner.settings.width, ih = inner.settings.height;
      const cv = nestCanvas(key, iw, ih);
      const g = cv.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.filter = 'none'; g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, iw, ih);
      const innerT = RS.clamp(RS.srcTime(c, lt), 0, Math.max(0, RS.seqDurationOf(inner) - 1e-4));
      renderScope(g, inner, innerT, iw, ih, { prefix: key + '/', depth: scope.depth + 1, onlyTrack: c.multicam ? (c.angle || 0) : null, dims: { width: iw, height: ih } });
      return { src: cv, w: iw, h: ih, fit: true };
    }
    return null;
  }

  // ---------- per-clip pixel effects: flip, mosaic, Ultra Key, crop ----------
  const work = new Map();
  E.workCanvas = (key, w, h) => workCanvas(key, w, h);
  E.layer = (w, h, i) => layer(w, h, i);
  function workCanvas(key, w, h) {
    let cv = work.get(key);
    if (!cv) { cv = document.createElement('canvas'); work.set(key, cv); if (work.size > 40) work.delete(work.keys().next().value); }
    if (cv.width !== w) cv.width = w;
    if (cv.height !== h) cv.height = h;
    return cv;
  }
  const needsPre = (c) => { const p = c.props; return !!(p.cropL || p.cropR || p.cropT || p.cropB || p.flipH || p.flipV || p.mosaic > 0 || (c.key && c.key.on !== false)); };
  function preprocess(c, s, key, l) {
    const lim = Math.min(1, 3840 / s.w);
    const w = Math.max(2, Math.round(s.w * lim)), h = Math.max(2, Math.round(s.h * lim));
    const cv = workCanvas(key, w, h);
    const g = cv.getContext('2d');
    const p = c.props;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.filter = 'none'; g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, w, h);
    if (p.flipH || p.flipV) { g.translate(p.flipH ? w : 0, p.flipV ? h : 0); g.scale(p.flipH ? -1 : 1, p.flipV ? -1 : 1); }
    paint(g, s, 0, 0, w, h);
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (c.key && c.key.on !== false) {
      const keyed = chromaKey(cv, c.key);
      if (keyed) {
        // "Keep inside": only background connected to the frame edges is removed, so white text
        // or highlights inside the subject stay. The original is restored where the fill did not reach.
        const keep = c.key.edges ? insideMask(keyed, key) : null;
        if (keep) {
          const orig = workCanvas(key + '#orig', w, h), og = orig.getContext('2d');
          og.setTransform(1, 0, 0, 1, 0, 0); og.globalCompositeOperation = 'source-over'; og.clearRect(0, 0, w, h);
          og.drawImage(cv, 0, 0);
          og.globalCompositeOperation = 'destination-in'; og.imageSmoothingEnabled = true; og.drawImage(keep, 0, 0, w, h);
          og.globalCompositeOperation = 'source-over';
          g.clearRect(0, 0, w, h); g.drawImage(keyed, 0, 0); g.drawImage(orig, 0, 0);
        } else { g.clearRect(0, 0, w, h); g.drawImage(keyed, 0, 0); }
      }
    }
    if (p.mosaic > 0) {
      const bw = Math.max(1, Math.round(p.mosaic)), bh = Math.max(1, Math.round(p.mosaic * h / w));
      const t = workCanvas(key + '#m', bw, bh);
      const tg = t.getContext('2d');
      tg.clearRect(0, 0, bw, bh);
      tg.drawImage(cv, 0, 0, bw, bh);
      g.clearRect(0, 0, w, h);
      g.imageSmoothingEnabled = false;
      g.drawImage(t, 0, 0, w, h);
      g.imageSmoothingEnabled = true;
    }
    const cl = RS.getProp(c, 'cropL', l), cr = RS.getProp(c, 'cropR', l), ct = RS.getProp(c, 'cropT', l), cb = RS.getProp(c, 'cropB', l);
    if (cl > 0) g.clearRect(0, 0, w * cl / 100, h);
    if (cr > 0) g.clearRect(w * (1 - cr / 100), 0, w * cr / 100, h);
    if (ct > 0) g.clearRect(0, 0, w, h * ct / 100);
    if (cb > 0) g.clearRect(0, h * (1 - cb / 100), w, h * cb / 100);
    return { src: cv, w: s.w, h: s.h, fit: s.fit };
  }

  // Ultra Key: chroma distance in YCbCr with tolerance/softness and spill suppression, on the GPU.
  let gl = null, glCv = null, glProg = null, glTex = null;
  function initGL() {
    glCv = document.createElement('canvas');
    gl = glCv.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true, alpha: true });
    if (!gl) return false;
    const vs = 'attribute vec2 p; varying vec2 v; void main(){ v = (p + 1.0) * 0.5; gl_Position = vec4(p, 0.0, 1.0); }';
    const fs = `precision mediump float; varying vec2 v; uniform sampler2D t; uniform vec3 key; uniform float tol, soft, spill, mode;
      vec2 cc(vec3 c){ return vec2(-0.1687*c.r - 0.3313*c.g + 0.5*c.b, 0.5*c.r - 0.4187*c.g - 0.0813*c.b); }
      void main(){
        vec4 c = texture2D(t, v);
        if (mode > 0.5) {
          // Brightness/RGB mode: for white, black or grey backgrounds (chroma alone cannot tell them apart).
          float a2 = smoothstep(tol, tol + soft, distance(c.rgb, key));
          vec3 un = a2 > 0.001 ? (c.rgb - (1.0 - a2) * key) / a2 : c.rgb; // remove the background colour from soft edges
          gl_FragColor = vec4(clamp(mix(c.rgb, un, step(a2, 0.999)), 0.0, 1.0), c.a * a2);
          return;
        }
        vec2 kc = cc(key), pc = cc(c.rgb);
        float a = smoothstep(tol, tol + soft, distance(pc, kc));
        float y = dot(c.rgb, vec3(0.299, 0.587, 0.114));
        vec2 dir = normalize(kc + vec2(1e-5));
        float s = max(0.0, dot(pc, dir)) * spill;
        vec2 n = pc - dir * s;
        vec3 rgb = vec3(y + 1.402*n.y, y - 0.344136*n.x - 0.714136*n.y, y + 1.772*n.x);
        gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), c.a * a);
      }`;
    const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    glProg = gl.createProgram();
    gl.attachShader(glProg, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(glProg, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(glProg);
    gl.useProgram(glProg);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(glProg, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    glTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, glTex);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    return true;
  }
  // Mask (small canvas, opaque where the key removed pixels NOT connected to the edges).
  function insideMask(keyed, key) {
    const sw = Math.min(480, keyed.width), sh = Math.max(2, Math.round(keyed.height * sw / keyed.width));
    const sm = workCanvas(key + '#ks', sw, sh), sg = sm.getContext('2d', { willReadFrequently: true });
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = 'source-over'; sg.clearRect(0, 0, sw, sh);
    sg.drawImage(keyed, 0, 0, sw, sh);
    const im = sg.getImageData(0, 0, sw, sh), d = im.data, n = sw * sh;
    const bgReach = new Uint8Array(n), stack = new Int32Array(n);
    let sp = 0;
    const push = (p) => { if (!bgReach[p] && d[p * 4 + 3] < 200) { bgReach[p] = 1; stack[sp++] = p; } };
    for (let x = 0; x < sw; x++) { push(x); push((sh - 1) * sw + x); }
    for (let y = 0; y < sh; y++) { push(y * sw); push(y * sw + sw - 1); }
    while (sp) { const p = stack[--sp], x = p % sw; if (x > 0) push(p - 1); if (x < sw - 1) push(p + 1); if (p >= sw) push(p - sw); if (p < n - sw) push(p + sw); }
    let any = false;
    for (let p = 0; p < n; p++) {
      const inside = !bgReach[p] && d[p * 4 + 3] < 250; // removed by the key, but enclosed by the subject
      d[p * 4] = d[p * 4 + 1] = d[p * 4 + 2] = 255; d[p * 4 + 3] = inside ? 255 : 0;
      if (inside) any = true;
    }
    if (!any) return null;
    sg.putImageData(im, 0, 0);
    return sm;
  }
  function chromaKey(cv, k) {
    try {
      if (!gl && !initGL()) return null;
      glCv.width = cv.width; glCv.height = cv.height;
      gl.viewport(0, 0, cv.width, cv.height);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
      const hex = (k.color || '#00b140').replace('#', '');
      const rgb = [0, 2, 4].map((i) => parseInt(hex.substr(i, 2), 16) / 255);
      gl.uniform3f(gl.getUniformLocation(glProg, 'key'), rgb[0], rgb[1], rgb[2]);
      const rgbMode = k.mode === 'rgb';
      gl.uniform1f(gl.getUniformLocation(glProg, 'mode'), rgbMode ? 1 : 0);
      gl.uniform1f(gl.getUniformLocation(glProg, 'tol'), (k.tolerance ?? 30) / 100 * (rgbMode ? 0.5 : 0.35));
      gl.uniform1f(gl.getUniformLocation(glProg, 'soft'), (k.softness ?? 15) / 100 * (rgbMode ? 0.4 : 0.25) + 0.002);
      gl.uniform1f(gl.getUniformLocation(glProg, 'spill'), (k.spill ?? 50) / 100);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return glCv;
    } catch (err) { console.warn('Ultra Key', err); return null; }
  }

  function paint(g, s, x, y, w, h) {
    if (s.sample) s.src.draw(g, x, y, w, h);
    else g.drawImage(s.src, x, y, w, h);
  }

  // o: { alpha, dx, dy, zoom } extra transform used by transitions.
  function drawClip(ctx, c, lt, W, H, o, scope) {
    if (c.disabled || c.id === E.editingId) return;
    scope = scope || Object.assign({ dims: { width: W, height: H } }, TOP);
    if (!scope.dims) scope.dims = { width: W, height: H };
    const l = RS.clamp(lt, 0, c.duration);
    let s;
    if (c.type === 'adjust') {
      // Adjustment layer: its effects apply to everything already drawn below it.
      const T = ctx.getTransform();
      const rw = Math.max(1, Math.round(W * T.a)), rh = Math.max(1, Math.round(H * T.d));
      const snap = layer(rw, rh, 5);
      const sg = snap.getContext('2d');
      sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, rw, rh);
      sg.drawImage(ctx.canvas, Math.round(T.e), Math.round(T.f), rw, rh, 0, 0, rw, rh);
      s = { src: snap, w: W, h: H, fit: false };
    } else s = sourceFor(c, lt, scope);
    if (!s || !s.w || !s.h) return;
    if (needsPre(c)) s = preprocess(c, s, scope.prefix + c.id, l);
    const CR = RS.creative;
    if (CR && c.vfx) s = CR.stylize(c, s, scope.prefix + c.id, l);
    const ex = Object.assign({ skewX: RS.getProp(c, 'skewX', l), skewY: RS.getProp(c, 'skewY', l) }, o || {});
    const mo = CR && (c.anim || c.vfx) ? CR.motion(c, l, W, H) : null; // In/Out/Loop animations, shake, zoom punch
    let alpha = RS.clamp((RS.getProp(c, 'opacity', l) / 100) * RS.fadeFactor(c, l) * (ex.alpha ?? 1), 0, 1);
    const base = s.fit ? (c.props.fill ? Math.max(W / s.w, H / s.h) : Math.min(W / s.w, H / s.h)) : 1;
    const sc = base * RS.getProp(c, 'scale', l) / 100;
    let w = s.w * sc, h = s.h * sc;
    let cx = W / 2 + RS.getProp(c, 'x', l), cy = H / 2 + RS.getProp(c, 'y', l);
    let rot = RS.getProp(c, 'rotation', l) * Math.PI / 180;
    if (scope.depth === 0 && !o) E.bounds.set(c.id, { cx, cy, w, h, rot });
    if (mo) {
      cx += mo.dx; cy += mo.dy; w *= mo.s; h *= mo.s * (mo.sy || 1); w *= mo.sx || 1; rot += mo.r * Math.PI / 180; alpha *= mo.a;
      if (mo.blur) ex.blur = (ex.blur || 0) + mo.blur;
    }
    if (CR && c.vfx && c.vfx.bgblur && s.fit) CR.blurFill(ctx, s, W, H, alpha);
    if (alpha <= 0.001 || w < 0.5 || h < 0.5) return;
    const masked = c.masks && c.masks.length;
    let g = ctx, lay = null;
    if (masked) {
      lay = layer(ctx.canvas.width, ctx.canvas.height, 0);
      g = lay.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none';
      g.clearRect(0, 0, lay.width, lay.height);
      g.setTransform(ctx.getTransform());
    }
    g.save();
    applyClipTransform(g, ex, W, H, cx, cy, rot);
    g.globalAlpha = alpha;
    g.filter = E.filterString(c);
    if (ex.blur > 0.3) g.filter = (g.filter === 'none' ? '' : g.filter + ' ') + `blur(${(ex.blur * E.canvas.height / 1080).toFixed(1)}px)`;
    if (c.props.shadow) {
      const T = g.getTransform();
      const dev = Math.hypot(T.a, T.b);
      const ang = (c.props.shadowAngle ?? 135) * Math.PI / 180, dist = (c.props.shadowDist ?? 12) * dev;
      const hex = (c.shadowColor || '#000000').replace('#', '');
      const [r, gg, b] = [0, 2, 4].map((i) => parseInt(hex.substr(i, 2), 16));
      g.shadowColor = `rgba(${r},${gg},${b},${RS.clamp((c.props.shadowOpacity ?? 60) / 100, 0, 1)})`;
      g.shadowBlur = (c.props.shadowSoft ?? 14) * dev;
      g.shadowOffsetX = Math.cos(ang) * dist;
      g.shadowOffsetY = Math.sin(ang) * dist;
    }
    paint(g, s, -w / 2, -h / 2, w, h);
    g.shadowColor = 'transparent';
    const vig = c.props.vignette || 0;
    if (vig > 0) {
      g.filter = 'none';
      const r = Math.hypot(w, h) / 2;
      const grad = g.createRadialGradient(0, 0, r * 0.35, 0, 0, r);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${RS.clamp(vig / 100, 0, 1)})`);
      g.fillStyle = grad;
      g.fillRect(-w / 2, -h / 2, w, h);
    }
    g.restore();
    if (masked) applyMasks(lay, ctx, c, l, { ex, W, H, cx, cy, rot, w, h });
    if (CR && c.vfx) CR.overlay(ctx, c, l, W, H, scope);
  }

  // Shape transitions. The screen is fully covered at p = 0.5, where the picture cuts from A to B.
  const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  function drawShapeSweep(ctx, type, p, W, H, colors) {
    const [c1, c2, c3] = [0, 1, 2].map((i) => colors[i] || RS.SHAPE_COLORS[i]);
    ctx.save();
    ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
    if (type === 'shapeBars' || type === 'shapeDiagonal' || type === 'shapeRise') {
      // A symmetric band of stripes [c3 c2 | c1 core | c2 c3] travels across the frame.
      const ang = type === 'shapeBars' ? 0 : type === 'shapeRise' ? -Math.PI / 2 : -Math.PI / 4;
      const L = Math.abs(W * Math.cos(ang)) + Math.abs(H * Math.sin(ang)); // frame extent along travel
      const T = Math.hypot(W, H) + 4;                                       // stripe length
      const strips = [[c3, 0.14], [c2, 0.3], [c1, 1.02], [c2, 0.3], [c3, 0.14]];
      const band = strips.reduce((s, x) => s + x[1], 0) * L;
      ctx.translate(W / 2, H / 2);
      ctx.rotate(ang);
      let x = L / 2 - easeIO(p) * (L + band); // band's left edge; the frame spans [-L/2, L/2]
      for (const [col, f] of strips) {
        const w = f * L;
        ctx.fillStyle = col;
        ctx.fillRect(x - 0.5, -T / 2, w + 1, T);
        x += w;
      }
    } else {
      // Nested shapes grow from the centre (first half), then open from the inside (second half).
      const R = Math.hypot(W, H) * 0.75;
      const cols = [c3, c2, c1]; // drawn bottom to top: the main colour covers the screen at the cut
      const square = type === 'shapeSquares';
      const spin = square ? (p - 0.5) * Math.PI * 1.1 : 0;
      const shape = (g, r, a) => {
        if (square) { g.save(); g.rotate(a); g.rect(-r, -r, r * 2, r * 2); g.restore(); }
        else { g.moveTo(r, 0); g.arc(0, 0, r, 0, Math.PI * 2); }
      };
      ctx.translate(W / 2, H / 2);
      if (p < 0.5) {
        const q = p / 0.5;
        cols.forEach((col, i) => {
          const k = easeIO(RS.clamp((q - i * 0.16) / 0.68, 0, 1));
          if (k <= 0) return;
          ctx.beginPath(); shape(ctx, k * R * (square ? 1 : 1.42), spin + i * 0.35);
          ctx.fillStyle = col; ctx.fill();
        });
      } else {
        const q = (p - 0.5) / 0.5;
        cols.forEach((col, i) => {
          const k = easeIO(RS.clamp((q - (2 - i) * 0.16) / 0.68, 0, 1));
          if (k >= 1) return;
          ctx.beginPath();
          ctx.rect(-W, -H, W * 2, H * 2);
          if (k > 0) shape(ctx, k * R * (square ? 1 : 1.42), spin + i * 0.35);
          ctx.fillStyle = col; ctx.fill('evenodd');
        });
      }
    }
    ctx.restore();
  }

  function drawTransition(ctx, win, t, W, H, scope) {
    const p = RS.clamp((t - win.t1) / Math.max(1e-6, win.t2 - win.t1), 0, 1);
    const A = win.A, B = win.B;
    const la = A ? t - A.start : 0, lb = B ? t - B.start : 0;
    const dA = (o) => A && drawClip(ctx, A, la, W, H, o || {}, scope);
    const dB = (o) => B && drawClip(ctx, B, lb, W, H, o || {}, scope);
    const clipped = (shapeFn, fn) => { ctx.save(); ctx.beginPath(); shapeFn(); ctx.clip(); fn(); ctx.restore(); };
    switch (win.type) {
      case 'dipBlack': case 'dipWhite': {
        if (p < 0.5) dA(); else dB();
        ctx.save(); ctx.globalAlpha = p < 0.5 ? p * 2 : (1 - p) * 2; ctx.fillStyle = win.type === 'dipBlack' ? '#000' : '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore();
        break;
      }
      case 'push': dA({ dx: -p * W }); dB({ dx: (1 - p) * W }); break;
      case 'slide': dA(); dB({ dx: (1 - p) * W }); break;
      case 'wipe': dA(); clipped(() => ctx.rect(0, 0, p * W, H), () => dB()); break;
      case 'iris': dA(); clipped(() => ctx.arc(W / 2, H / 2, p * Math.hypot(W, H) / 2, 0, Math.PI * 2), () => dB()); break;
      case 'shapeBars': case 'shapeDiagonal': case 'shapeRise': case 'shapeSquares': case 'shapeCircles':
        if (p < 0.5) dA(); else dB();
        drawShapeSweep(ctx, win.type, p, W, H, win.colors || RS.SHAPE_COLORS);
        break;
      case 'flash': {
        if (p < 0.5) dA(); else dB();
        ctx.save(); ctx.globalAlpha = Math.pow(1 - Math.abs(2 * p - 1), 1.6); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore();
        break;
      }
      case 'blurDissolve': dA({ blur: easeIO(p) * 40 }); dB({ alpha: easeIO(p), blur: (1 - easeIO(p)) * 40 }); break;
      case 'zoomIn': {
        const q = easeIO(p), m = RS.clamp((p - 0.38) / 0.24, 0, 1);
        dA({ zoom: 1 + q * 3, blur: Math.sin(p * Math.PI) * 24, alpha: 1 - m });
        dB({ zoom: 0.35 + 0.65 * q + (1 - q) * 0.0, blur: Math.sin(p * Math.PI) * 24, alpha: m });
        break;
      }
      case 'zoomOut': {
        const q = easeIO(p);
        dB({ zoom: 1.35 - 0.35 * q });
        dA({ zoom: 1 - q * 0.85, alpha: 1 - RS.clamp((p - 0.5) / 0.5, 0, 1), blur: q * 10 });
        break;
      }
      case 'spin': {
        const q = easeIO(p), z = 1.45 + Math.sin(p * Math.PI) * 0.6, b = Math.sin(p * Math.PI) * 18;
        if (p < 0.5) dA({ spin: q * Math.PI, zoom: z, blur: b }); else dB({ spin: (q - 1) * Math.PI, zoom: z, blur: b });
        break;
      }
      case 'whip': { const q = easeIO(p), b = Math.sin(p * Math.PI) * 45; dA({ dx: -q * W, blur: b }); dB({ dx: (1 - q) * W, blur: b }); break; }
      case 'pushRight': { const q = easeIO(p); dA({ dx: q * W }); dB({ dx: (q - 1) * W }); break; }
      case 'pushUp': { const q = easeIO(p); dA({ dy: -q * H }); dB({ dy: (1 - q) * H }); break; }
      case 'pushDown': { const q = easeIO(p); dA({ dy: q * H }); dB({ dy: (q - 1) * H }); break; }
      case 'bounce': {
        // B drops in from the top and bounces to rest
        const b = (x) => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };
        dA(); dB({ dy: -(1 - b(p)) * H });
        break;
      }
      case 'clock': dA(); clipped(() => { const r = Math.hypot(W, H); ctx.moveTo(W / 2, H / 2); ctx.arc(W / 2, H / 2, r, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.closePath(); }, () => dB()); break;
      case 'barnDoor': dA(); clipped(() => ctx.rect(W / 2 - easeIO(p) * W / 2, 0, easeIO(p) * W, H), () => dB()); break;
      case 'diamond': dA(); clipped(() => { const r = easeIO(p) * (W + H) / 2; ctx.moveTo(W / 2, H / 2 - r); ctx.lineTo(W / 2 + r, H / 2); ctx.lineTo(W / 2, H / 2 + r); ctx.lineTo(W / 2 - r, H / 2); ctx.closePath(); }, () => dB()); break;
      case 'heart': dA(); clipped(() => {
        const k = easeIO(p) * Math.max(W, H) * 1.9, x = W / 2, y = H / 2 - k * 0.12;
        ctx.moveTo(x, y + k * 0.35);
        ctx.bezierCurveTo(x - k * 0.62, y - k * 0.05, x - k * 0.3, y - k * 0.52, x, y - k * 0.22);
        ctx.bezierCurveTo(x + k * 0.3, y - k * 0.52, x + k * 0.62, y - k * 0.05, x, y + k * 0.35);
      }, () => dB()); break;
      case 'filmBurn': {
        const m = RS.clamp((p - 0.35) / 0.3, 0, 1);
        dA(); dB({ alpha: m });
        const k = Math.sin(p * Math.PI);
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        const x0 = W * (1.2 - p * 1.4);
        for (const [dx, col, r] of [[0, '255,140,40', 0.9], [W * 0.25, '255,60,30', 0.6], [-W * 0.2, '255,220,120', 0.5]]) {
          const g = ctx.createRadialGradient(x0 + dx, H * 0.45, 0, x0 + dx, H * 0.45, W * r);
          g.addColorStop(0, `rgba(${col},${0.95 * k})`); g.addColorStop(1, `rgba(${col},0)`);
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        }
        ctx.restore();
        break;
      }
      case 'glitch': case 'pixelate': {
        // Render the current picture into a layer, then break it up.
        const T0 = ctx.getTransform();
        const cw = ctx.canvas.width, ch = ctx.canvas.height;
        const L = E.layer(cw, ch, 7), lg = L.getContext('2d');
        lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalAlpha = 1; lg.filter = 'none'; lg.globalCompositeOperation = 'source-over';
        lg.clearRect(0, 0, cw, ch); lg.setTransform(T0);
        if (p < 0.5) { if (A) drawClip(lg, A, la, W, H, {}, scope); } else if (B) drawClip(lg, B, lb, W, H, {}, scope);
        const k = 1 - Math.abs(2 * p - 1);
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (win.type === 'pixelate') {
          const f = Math.max(1, Math.round(1 + k * k * 70));
          const sw = Math.max(1, Math.round(cw / f)), sh = Math.max(1, Math.round(ch / f));
          const Sm = E.layer(sw, sh, 8), sg = Sm.getContext('2d');
          sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, sw, sh); sg.imageSmoothingEnabled = true; sg.drawImage(L, 0, 0, sw, sh);
          ctx.imageSmoothingEnabled = false; ctx.drawImage(Sm, 0, 0, cw, ch); ctx.imageSmoothingEnabled = true;
        } else {
          ctx.drawImage(L, 0, 0);
          let seed = Math.floor(p * 24) * 7919 + 13;
          const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
          const n = Math.round(4 + k * 14);
          for (let i = 0; i < n; i++) {
            const y = rnd() * ch, bh = (0.01 + rnd() * 0.08) * ch, dx = (rnd() - 0.5) * cw * 0.25 * k;
            ctx.drawImage(L, 0, y, cw, bh, dx, y, cw, bh);
          }
          ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.55 * k;
          ctx.fillStyle = 'rgba(255,0,60,1)'; ctx.drawImage(L, cw * 0.012 * k, 0);
          ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.25 * k; ctx.fillStyle = '#00f0ff'; ctx.fillRect(0, 0, cw, ch);
        }
        ctx.restore();
        break;
      }
      case 'crossZoom': dA({ zoom: 1 + p * 1.5, alpha: 1 - p }); dB({ zoom: 2.5 - 1.5 * p, alpha: p }); break;
      default:
        if (A) dA({ alpha: B ? 1 : 1 - p });
        dB({ alpha: p });
    }
    if (scope.depth === 0) for (const c of [A, B]) if (c) {
      const l = RS.clamp(t - c.start, 0, c.duration);
      const s = sourceSize(c, W, H);
      const base = s.fit ? (c.props.fill ? Math.max(W / s.w, H / s.h) : Math.min(W / s.w, H / s.h)) : 1;
      const sc = base * RS.getProp(c, 'scale', l) / 100;
      E.bounds.set(c.id, { cx: W / 2 + RS.getProp(c, 'x', l), cy: H / 2 + RS.getProp(c, 'y', l), w: s.w * sc, h: s.h * sc, rot: RS.getProp(c, 'rotation', l) * Math.PI / 180 });
    }
  }

  function sourceSize(c, W, H) {
    if (c.type === 'video') { const ent = E.pool.get(c.id); const m = RS.getMedia(c.mediaId); return { w: (ent && ent.el.videoWidth) || (m && m.width) || W, h: (ent && ent.el.videoHeight) || (m && m.height) || H, fit: true }; }
    if (c.type === 'image') { const m = RS.getMedia(c.mediaId); return { w: (m && m.width) || W, h: (m && m.height) || H, fit: true }; }
    if (c.type === 'text') { const cv = E.textCanvas(c); return { w: cv.width, h: cv.height, fit: false }; }
    if (c.type === 'shape') { const cv = E.shapeCanvas(c); return { w: cv.width, h: cv.height, fit: false }; }
    if (c.type === 'graphic') { const [w, h] = RS.library.sizeOf(c); return { w, h, fit: false }; }
    if (c.type === 'nest') { const q = RS.getSequence(c.seqId); return { w: q ? q.settings.width : W, h: q ? q.settings.height : H, fit: true }; }
    return { w: W, h: H, fit: false };
  }

  function renderScope(ctx, seq, t, W, H, scope) {
    const { byTrack } = computeWindows(seq);
    RS.tracksOf('video', seq).forEach((tr, idx) => {
      if (tr.hidden) return;
      if (scope.onlyTrack != null && idx !== scope.onlyTrack) return;
      const wins = byTrack.get(tr.id) || [];
      const win = wins.find((w) => t >= w.t1 && t < w.t2);
      const skip = new Set();
      if (win) {
        drawTransition(ctx, win, t, W, H, scope);
        if (win.A) skip.add(win.A.id);
        if (win.B) skip.add(win.B.id);
      }
      for (const c of seq.clips) {
        if (c.trackId !== tr.id || skip.has(c.id) || t < c.start || t >= RS.clipEnd(c)) continue;
        drawClip(ctx, c, t - c.start, W, H, null, scope);
      }
    });
  }

  // ---------- captions (burned in on top of the picture) ----------
  function wrapLines(g, text, maxW) {
    const out = [];
    for (const para of String(text || '').split('\n')) {
      const words = para.split(/\s+/).filter(Boolean);
      let line = '';
      for (const wd of words) {
        const test = line ? line + ' ' + wd : wd;
        if (line && g.measureText(test).width > maxW) { out.push(line); line = wd; } else line = test;
      }
      out.push(line);
    }
    return out;
  }
  E.drawCaptions = (ctx, seq, t, W, H) => {
    if (E.hideCaptions) return;
    const st = Object.assign({}, RS.DEFAULT_CAPTION_STYLE, seq.captionStyle || {});
    for (const tr of RS.tracksOf('caption', seq)) {
      if (tr.hidden && !E.forceCaptions) continue;
      const c = seq.clips.find((x) => x.trackId === tr.id && !x.disabled && t >= x.start && t < RS.clipEnd(x));
      if (!c || !c.text) continue;
      const size = Math.max(8, H * st.size / 100);
      ctx.save();
      ctx.font = `${st.bold ? '700' : '400'} ${size}px "${st.font}", "Helvetica Neue", Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lines = wrapLines(ctx, c.text, W * 0.84);
      const lh = size * 1.3, padX = size * 0.4;
      const total = lh * lines.length;
      const y0 = st.position === 'top' ? H * st.margin / 100 : H - H * st.margin / 100 - total;
      lines.forEach((ln, i) => {
        const y = y0 + lh * i + lh / 2;
        const w = ctx.measureText(ln).width;
        if (st.bgOpacity > 0) { ctx.globalAlpha = st.bgOpacity / 100; ctx.fillStyle = st.bg; ctx.fillRect(W / 2 - w / 2 - padX, y - lh / 2, w + padX * 2, lh); }
        ctx.globalAlpha = 1;
        ctx.fillStyle = st.color;
        ctx.fillText(ln, W / 2, y);
      });
      ctx.restore();
    }
  };

  E.render = (t) => {
    const P = S.project;
    const { width: W, height: H } = P.settings;
    E.resize();
    const ctx = E.ctx;
    const cw = E.canvas.width, ch = E.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);
    const k = Math.min(cw / W, ch / H);
    ctx.setTransform(k, 0, 0, k, (cw - W * k) / 2, (ch - H * k) / 2);
    ctx.fillStyle = P.settings.bg || '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    E.bounds.clear();
    renderScope(ctx, P.seq, t, W, H, Object.assign({ dims: { width: W, height: H } }, TOP));
    E.drawCaptions(ctx, P.seq, t, W, H);
    ctx.restore();
    RS.emit('rendered', t);
  };

  // ---------- multicam ----------
  E.multicamClipAt = (t) => {
    const P = S.project;
    const sel = RS.selectedClips().find((c) => c.type === 'nest' && c.multicam && t >= c.start && t < RS.clipEnd(c));
    if (sel) return sel;
    for (const tr of RS.tracksOf('video').slice().reverse()) {
      const c = P.clips.find((x) => x.trackId === tr.id && x.type === 'nest' && x.multicam && !x.disabled && t >= x.start && t < RS.clipEnd(x));
      if (c) return c;
    }
    return null;
  };
  // Draw camera angle `angle` of multicam clip c at time t into context g (tile of tw×th).
  E.renderAngle = (g, tw, th, c, angle, t) => {
    const inner = RS.getSequence(c.seqId);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.filter = 'none';
    g.fillStyle = '#000';
    g.fillRect(0, 0, tw, th);
    if (!inner) return;
    const iw = inner.settings.width, ih = inner.settings.height;
    const k = Math.min(tw / iw, th / ih);
    g.setTransform(k, 0, 0, k, (tw - iw * k) / 2, (th - ih * k) / 2);
    const innerT = RS.clamp(RS.srcTime(c, t - c.start), 0, Math.max(0, RS.seqDurationOf(inner) - 1e-4));
    renderScope(g, inner, innerT, iw, ih, { prefix: c.id + '/', depth: 1, onlyTrack: angle, dims: { width: iw, height: ih } });
    g.setTransform(1, 0, 0, 1, 0, 0);
  };

  // Topmost visible clip at sequence point (px,py) at the current playhead.
  E.hitTest = (px, py) => {
    const P = S.project;
    const t = S.playhead;
    for (const tr of RS.tracksOf('video').slice().reverse()) {
      if (tr.hidden) continue;
      const cands = P.clips.filter((c) => c.trackId === tr.id && !c.disabled && t >= c.start && t < RS.clipEnd(c)).reverse();
      for (const c of cands) {
        const b = E.bounds.get(c.id);
        if (!b) continue;
        const dx = px - b.cx, dy = py - b.cy;
        const cos = Math.cos(-b.rot), sin = Math.sin(-b.rot);
        const lx = dx * cos - dy * sin, ly = dx * sin + dy * cos;
        if (Math.abs(lx) <= b.w / 2 && Math.abs(ly) <= b.h / 2) return c;
      }
    }
    return null;
  };

  // Wait until every video drawn at time t has a decoded frame (used before real-time export).
  E.waitReady = (t, timeoutMs = 4000) => new Promise((resolve) => {
    const start = performance.now();
    const check = () => {
      E.sync(t, false);
      let ready = true;
      for (const it of E.visit(t, { audio: false })) {
        const ent = E.pool.get(it.key);
        if (ent && !ent.failed && (ent.el.readyState < 2 || ent.el.seeking)) ready = false;
      }
      if (ready || performance.now() - start > timeoutMs) { E.render(t); resolve(); }
      else setTimeout(check, 30);
    };
    check();
  });

  E.applyMasterGain = () => { E.audioContext(); master.gain.value = Math.pow(10, (S.project.seq.masterDb || 0) / 20); };
  RS.on('settings-change', () => E.applyMasterGain && E.applyMasterGain());
  RS.on('change', () => E.applyMasterGain && E.applyMasterGain());
  E.setMonitorMuted = (muted) => {
    E.audioContext();
    try {
      if (muted) master.disconnect(actx.destination);
      else master.connect(actx.destination);
    } catch { /* already in that state */ }
  };
})(window.RS);
