'use strict';
// Faster-than-real-time, frame-accurate export.
// Video: every output frame is rendered with the exact decoded source frames (WebCodecs decode → compositor →
// WebCodecs encode). Audio: mixed offline in 10-second segments (OfflineAudioContext) with sample-accurate gains.
(function (RS) {
  const S = RS.state;
  const F = RS.fastExport = {};
  const MB = () => window.Mediabunny;
  const SEG = 10;

  // Returns '' when the fast engine can be used, otherwise the reason it cannot.
  F.unsupportedReason = async (opts) => {
    if (!RS.decode.available() || !window.AudioEncoder) return 'This system has no WebCodecs encoder';
    const ext = opts.format.ext;
    const vcodec = ext === 'mp4' ? 'avc' : 'vp9', acodec = ext === 'mp4' ? 'aac' : 'opus';
    try {
      if (!(await MB().canEncodeVideo(vcodec, { width: opts.width, height: opts.height, bitrate: 8e6 }))) return `No ${vcodec.toUpperCase()} encoder at ${opts.width}×${opts.height}`;
      if (!(await MB().canEncodeAudio(acodec, { numberOfChannels: 2, sampleRate: 48000, bitrate: 192000 }))) return `No ${acodec.toUpperCase()} audio encoder`;
    } catch (err) { return err.message; }
    // Speed-changed audio needs pitch-preserving playback, which only the real-time engine does.
    const fps = RS.fps();
    for (let t = opts.t0; t < opts.t1; t += 0.25) {
      if (E().visit(t, { video: false, forward: true }).some((it) => it.inClip && Math.abs(it.rate - 1) > 1e-6)) return 'Audio with changed speed (pitch-preserved playback needs real-time export)';
    }
    void fps;
    return '';
  };
  const E = () => RS.engine;

  // Plan which source frame every media clip needs for every output frame.
  function planVideo(t0, n, fps) {
    const plan = new Map();
    for (let i = 0; i < n; i++) {
      const t = t0 + i / fps;
      for (const it of E().visit(t, { audio: false })) {
        if (it.c.type !== 'video') continue;
        let p = plan.get(it.key);
        if (!p) plan.set(it.key, (p = { key: it.key, c: it.c, frames: [], times: [] }));
        const last = p.times.length ? p.times[p.times.length - 1] : -Infinity;
        p.frames.push(i);
        p.times.push(Math.max(last, it.mt)); // decoder iterators need non-decreasing timestamps
      }
    }
    return [...plan.values()];
  }

  async function openProviders(plan) {
    for (const p of plan) {
      p.cursor = 0;
      const m = RS.getMedia(p.c.mediaId);
      p.w = (m && m.width) || 1920; p.h = (m && m.height) || 1080;
      try {
        const v = await RS.decode.videoSink(p.c.mediaId);
        p.input = v.input;
        p.iter = v.sink.samplesAtTimestamps(p.times);
        p.mode = 'decoder';
      } catch (err) {
        console.warn('decoder unavailable, using seek fallback for', m && m.name, err.message);
        p.el = RS.decode.elementFrames(p.c.mediaId);
        p.mode = 'element';
      }
    }
  }

  // ---------- audio ----------
  const audioSources = new Map(); // mediaId -> { sink } | { buffer }
  async function audioSourceFor(mediaId) {
    if (audioSources.has(mediaId)) return audioSources.get(mediaId);
    let src;
    try { const a = await RS.decode.audioSink(mediaId); src = { sink: a.sink, input: a.input }; }
    catch {
      const m = RS.getMedia(mediaId);
      const bytes = m.path && RS.native ? await RS.native.readFile(m.path) : new Uint8Array(await RS.runtime[mediaId].file.arrayBuffer());
      const buffer = await E().audioContext().decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
      src = { buffer };
    }
    audioSources.set(mediaId, src);
    return src;
  }

  async function renderAudio(a, b) {
    const sr = 48000;
    const len = Math.max(1, Math.round((b - a) * sr));
    const oc = new OfflineAudioContext(2, len, sr);
    let gateOk = false;
    try { await oc.audioWorklet.addModule(RS.assetUrl('js/worklets/gate.js')); gateOk = true; } catch { /* gate unavailable */ }
    const step = 0.01;
    const mix = oc.createGain();
    mix.gain.value = Math.pow(10, (S.project.seq.masterDb || 0) / 20);
    mix.connect(oc.destination);
    // Sample the mix every 10 ms → contiguous runs per clip with gain envelopes.
    const runs = new Map();
    for (let T = a; T < b + step; T += step) {
      const Tc = Math.min(T, b);
      for (const it of E().visit(Tc, { video: false, forward: true })) {
        if (it.c.type !== 'audio' || !it.inClip) continue;
        let list = runs.get(it.key);
        if (!list) runs.set(it.key, (list = []));
        const r = list[list.length - 1];
        const dir = it.c.reverse ? -1 : 1;
        if (r && r.dir === dir && Math.abs(Tc - r.lastT - step) < step * 0.5 && Math.abs(it.mt - (r.mt0 + dir * (Tc - r.T0))) < 0.02) { r.lastT = Tc; r.g.push([Tc, it.gain]); r.p.push([Tc, it.pan]); }
        else list.push({ c: it.c, dir, T0: Tc, mt0: it.mt, lastT: Tc, g: [[Tc, it.gain]], p: [[Tc, it.pan]] });
      }
    }
    for (const list of runs.values()) for (const r of list) {
      const src = await audioSourceFor(r.c.mediaId);
      const gain = oc.createGain();
      // gain → audio effects → pan → mix (same chain as playback)
      const fx = E().buildAfx(oc, r.c.afx, gateOk);
      const panner = oc.createStereoPanner();
      if (fx.length) { gain.connect(fx[0]); fx[fx.length - 1].connect(panner); } else gain.connect(panner);
      panner.connect(mix);
      gain.gain.setValueAtTime(r.g[0][1], Math.max(0, r.T0 - a));
      for (const [T, g] of r.g) gain.gain.linearRampToValueAtTime(g, Math.max(0, T - a));
      panner.pan.setValueAtTime(r.p[0][1], Math.max(0, r.T0 - a));
      for (const [T, v] of r.p) panner.pan.linearRampToValueAtTime(v, Math.max(0, T - a));
      const runEnd = r.lastT + step - a;
      if (r.dir < 0) {
        // Reversed clip: gather its source range, reverse the samples, play them forward.
        const len = r.lastT + step - r.T0;
        const lo = Math.max(0, r.mt0 - len - 0.05), hi = r.mt0 + 0.02;
        const buf = await gatherAudio(src, lo, hi, sr);
        if (buf) {
          for (let ch = 0; ch < buf.numberOfChannels; ch++) buf.getChannelData(ch).reverse();
          const node = oc.createBufferSource();
          node.buffer = buf; node.connect(gain);
          let when = r.T0 - a, offset = (hi - r.mt0);
          if (when < 0) { offset -= when; when = 0; }
          if (offset < buf.duration) { node.start(when, offset); node.stop(Math.max(when, Math.min(runEnd, b - a))); }
        }
        continue;
      }
      const mtEnd = r.mt0 + (r.lastT + step - r.T0);
      const place = (buffer, ts) => {
        const node = oc.createBufferSource();
        node.buffer = buffer;
        node.connect(gain);
        let when = r.T0 - a + (ts - r.mt0), offset = 0;
        if (when < 0) { offset = -when; when = 0; }
        if (offset >= buffer.duration) return;
        node.start(when, offset);
        node.stop(Math.max(when, Math.min(runEnd, b - a)));
      };
      if (src.buffer) place(src.buffer, 0);
      else for await (const wb of src.sink.buffers(Math.max(0, r.mt0 - 0.05), mtEnd + 0.05)) place(wb.buffer, wb.timestamp);
    }
    return oc.startRendering();
  }

  // The sequence's audio mix for [a, b) as 16 kHz mono samples (what speech recognition expects).
  F.renderMix = async (a, b, onPct) => {
    const out = new Float32Array(Math.max(1, Math.ceil((b - a) * 16000)));
    let pos = 0;
    try {
      for (let s = a; s < b - 1e-6; s += 30) {
        const e = Math.min(b, s + 30);
        const buf = await renderAudio(s, e);
        const oc = new OfflineAudioContext(1, Math.max(1, Math.round((e - s) * 16000)), 16000);
        const n = oc.createBufferSource(); n.buffer = buf; n.connect(oc.destination); n.start();
        const mono = (await oc.startRendering()).getChannelData(0);
        out.set(mono.subarray(0, Math.min(mono.length, out.length - pos)), pos);
        pos += mono.length;
        if (onPct) onPct((e - a) / (b - a));
      }
    } finally {
      for (const x of audioSources.values()) if (x.input) x.input.dispose();
      audioSources.clear();
      RS.decode.closeAll();
    }
    return out;
  };

  // Decode [lo, hi] of a source into one AudioBuffer at the given rate.
  async function gatherAudio(src, lo, hi, sr) {
    const oc = new OfflineAudioContext(2, Math.max(1, Math.round((hi - lo) * sr)), sr);
    if (src.buffer) { const n = oc.createBufferSource(); n.buffer = src.buffer; n.connect(oc.destination); n.start(0, lo); }
    else for await (const wb of src.sink.buffers(lo, hi)) {
      const n = oc.createBufferSource(); n.buffer = wb.buffer; n.connect(oc.destination);
      let when = wb.timestamp - lo, off = 0;
      if (when < 0) { off = -when; when = 0; }
      if (off < wb.buffer.duration) n.start(when, off);
    }
    return oc.startRendering();
  }

  // ---------- main ----------
  // writeAt(data, position) persists bytes; onProgress(fraction, t); isCancelled().
  F.run = async (opts, writeAt, onProgress, isCancelled) => {
    const fps = RS.fps();
    const t0 = opts.t0, t1 = opts.t1;
    const n = Math.max(1, Math.round((t1 - t0) * fps));
    const ext = opts.format.ext;
    const P = S.project;
    const plan = planVideo(t0, n, fps);
    await openProviders(plan);
    const byFrame = new Map(); // frame index -> plans active
    for (const p of plan) for (const f of p.frames) { if (!byFrame.has(f)) byFrame.set(f, []); byFrame.get(f).push(p); }

    let writes = Promise.resolve();
    const target = new (MB().StreamTarget)(new WritableStream({ write: (chunk) => (writes = writes.then(() => writeAt(chunk.data, chunk.position))) }));
    const format = ext === 'mp4' ? new (MB().Mp4OutputFormat)({ fastStart: false }) : new (MB().WebMOutputFormat)();
    const output = new (MB().Output)({ format, target });
    E().setExportSize(opts.width !== P.settings.width || opts.height !== P.settings.height ? { w: opts.width, h: opts.height } : null);
    const vsrc = new (MB().CanvasSource)(E().canvas, { codec: ext === 'mp4' ? 'avc' : 'vp9', bitrate: opts.bitrate, keyFrameInterval: 2 });
    const asrc = new (MB().AudioBufferSource)({ codec: ext === 'mp4' ? 'aac' : 'opus', bitrate: 192000 });
    output.addVideoTrack(vsrc, { frameRate: fps });
    output.addAudioTrack(asrc);
    await output.start();
    E().frameOverride = new Map();
    let nextAudio = t0;
    let open = [];
    try {
      for (let i = 0; i < n; i++) {
        if (isCancelled()) throw new Error('cancelled');
        const t = t0 + i / fps;
        while (nextAudio < t1 && nextAudio <= t + 1e-9) {
          const end = Math.min(t1, nextAudio + SEG);
          await asrc.add(await renderAudio(nextAudio, end));
          nextAudio = end;
        }
        await setFrame(byFrame, i, open);
        E().render(t);
        await vsrc.add(i / fps, 1 / fps);
        for (const smp of open) smp.close();
        open = [];
        if (i % 3 === 0) onProgress((i + 1) / n, t);
      }
      vsrc.close();
      asrc.close();
      await output.finalize();
      await writes;
      onProgress(1, t1);
    } catch (err) {
      for (const smp of open) smp.close();
      try { await output.cancel(); } catch { /* ignore */ }
      throw err;
    } finally {
      await closePlan(plan);
    }
  };

  // Put the source frames for output frame i into E().frameOverride (samples to close are pushed to `open`).
  async function setFrame(byFrame, i, open) {
    E().frameOverride.clear();
    for (const p of byFrame.get(i) || []) {
      const mt = p.times[p.cursor++];
      if (p.mode === 'decoder') {
        const r = await p.iter.next();
        const sample = r.done ? null : r.value;
        if (sample) { open.push(sample); E().frameOverride.set(p.key, { src: sample, w: p.w, h: p.h, fit: true, sample: true }); }
      } else {
        const el = await p.el.at(mt);
        E().frameOverride.set(p.key, { src: el, w: el.videoWidth || p.w, h: el.videoHeight || p.h, fit: true });
      }
    }
  }
  async function closePlan(plan) {
    E().frameOverride = null;
    for (const p of plan) { try { if (p.iter) await p.iter.return(); } catch { /* ignore */ } if (p.input) p.input.dispose(); if (p.el) p.el.close(); }
    for (const a of audioSources.values()) if (a.input) a.input.dispose();
    audioSources.clear();
    RS.decode.closeAll();
  }

  // Render [t0, t1) at any frame rate and size, frame by frame, for exports that are not MP4/WebM (GIF).
  // onFrame(canvas, index, time) is awaited before the next frame is drawn.
  F.frames = async ({ t0, t1, fps, width, height }, onFrame, onProgress = () => {}, isCancelled = () => false) => {
    const n = Math.max(1, Math.round((t1 - t0) * fps));
    const P = S.project;
    const plan = planVideo(t0, n, fps);
    await openProviders(plan);
    const byFrame = new Map();
    for (const p of plan) for (const f of p.frames) { if (!byFrame.has(f)) byFrame.set(f, []); byFrame.get(f).push(p); }
    E().setExportSize(width !== P.settings.width || height !== P.settings.height ? { w: width, h: height } : null);
    E().frameOverride = new Map();
    let open = [];
    try {
      for (let i = 0; i < n; i++) {
        if (isCancelled()) throw new Error('cancelled');
        const t = t0 + i / fps;
        await setFrame(byFrame, i, open);
        E().render(t);
        await onFrame(E().canvas, i, t);
        for (const smp of open) smp.close();
        open = [];
        onProgress((i + 1) / n, t);
      }
    } finally {
      for (const smp of open) smp.close();
      E().setExportSize(null);
      await closePlan(plan);
    }
    return n;
  };

  // The sequence's audio mix for [a, b) as 48 kHz stereo, delivered in 10-second AudioBuffers.
  F.mixAudio = async (a, b, onSegment, isCancelled = () => false) => {
    try {
      for (let s = a; s < b - 1e-6; s += SEG) {
        if (isCancelled()) throw new Error('cancelled');
        const e = Math.min(b, s + SEG);
        await onSegment(await renderAudio(s, e), (e - a) / (b - a));
      }
    } finally {
      for (const x of audioSources.values()) if (x.input) x.input.dispose();
      audioSources.clear();
      RS.decode.closeAll();
    }
  };
})(window.RS);
