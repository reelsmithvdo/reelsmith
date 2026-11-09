'use strict';
// Quick exports beside the video export: an animated GIF of the sequence, and its audio alone (M4A or WAV).
// Frames and audio come from the fast-export pipeline (RS.fastExport.frames / .mixAudio), so they look and
// sound exactly like a video export. Everything runs on the device.
(function (RS) {
  const S = RS.state;
  const Q = RS.quick = {};
  const MB = () => window.Mediabunny;

  // ================================================================ GIF encoder
  // Median-cut palette (up to 256 colours) per frame, nearest-colour mapping through a 15-bit cache,
  // LZW-compressed image data, frames that repeat the previous one are merged into a longer delay.
  function paletteOf(px) {
    const step = Math.max(1, Math.floor(px.length / 4 / 24000));
    const pts = [];
    for (let i = 0; i < px.length; i += 4 * step) pts.push([px[i], px[i + 1], px[i + 2]]);
    const box = (p) => {
      const lo = [255, 255, 255], hi = [0, 0, 0];
      for (const q of p) for (let c = 0; c < 3; c++) { if (q[c] < lo[c]) lo[c] = q[c]; if (q[c] > hi[c]) hi[c] = q[c]; }
      const r = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
      const ch = r[0] >= r[1] && r[0] >= r[2] ? 0 : r[1] >= r[2] ? 1 : 2;
      return { p, ch, range: r[ch] };
    };
    const boxes = [box(pts)];
    while (boxes.length < 256) {
      let bi = -1;
      for (let k = 0; k < boxes.length; k++) if (boxes[k].p.length > 1 && boxes[k].range > 0 && (bi < 0 || boxes[k].range * Math.sqrt(boxes[k].p.length) > boxes[bi].range * Math.sqrt(boxes[bi].p.length))) bi = k;
      if (bi < 0) break;
      const b = boxes[bi];
      b.p.sort((x, y) => x[b.ch] - y[b.ch]);
      const m = b.p.length >> 1;
      boxes.splice(bi, 1, box(b.p.slice(0, m)), box(b.p.slice(m)));
    }
    const pal = boxes.map(({ p }) => { const s = [0, 0, 0]; for (const q of p) { s[0] += q[0]; s[1] += q[1]; s[2] += q[2]; } return s.map((v) => Math.round(v / p.length)); });
    while (pal.length < 256) pal.push([0, 0, 0]);
    return pal;
  }
  function indexPixels(px, pal) {
    const cache = new Int16Array(32768).fill(-1);
    const out = new Uint8Array(px.length / 4);
    for (let i = 0, j = 0; i < px.length; i += 4, j++) {
      const key = ((px[i] >> 3) << 10) | ((px[i + 1] >> 3) << 5) | (px[i + 2] >> 3);
      let k = cache[key];
      if (k < 0) {
        let best = 1e9;
        const r = px[i], g = px[i + 1], b = px[i + 2];
        for (let c = 0; c < 256; c++) { const p = pal[c], d = (p[0] - r) ** 2 * 2 + (p[1] - g) ** 2 * 4 + (p[2] - b) ** 2 * 3; if (d < best) { best = d; k = c; } }
        cache[key] = k;
      }
      out[j] = k;
    }
    return out;
  }
  function lzw(ix, out) {
    const MIN = 8, CLEAR = 256, EOI = 257;
    let size = MIN + 1, next = EOI + 1, cur = 0, bits = 0;
    const block = [];
    const byte = (b) => { block.push(b); if (block.length === 255) { out.push(255, ...block); block.length = 0; } };
    const emit = (code) => { cur |= code << bits; bits += size; while (bits >= 8) { byte(cur & 255); cur >>>= 8; bits -= 8; } };
    const dict = new Map();
    out.push(MIN);
    emit(CLEAR);
    let prefix = ix[0];
    for (let i = 1; i < ix.length; i++) {
      const k = ix[i], key = (prefix << 8) | k;
      const hit = dict.get(key);
      if (hit !== undefined) { prefix = hit; continue; }
      emit(prefix);
      if (next === 4096) { emit(CLEAR); dict.clear(); next = EOI + 1; size = MIN + 1; }
      else { if (next >= 1 << size) size++; dict.set(key, next++); }
      prefix = k;
    }
    emit(prefix);
    emit(EOI);
    if (bits > 0) byte(cur & 255);
    if (block.length) out.push(block.length, ...block);
    out.push(0);
  }
  // Streaming writer: add(rgba, delayCs) per frame, then finish() → Uint8Array.
  Q.gifWriter = (w, h, { loop = true } = {}) => {
    const parts = [];
    const head = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, w & 255, w >> 8, h & 255, h >> 8, 0, 0, 0];
    if (loop) head.push(0x21, 0xff, 0x0b, ...[...'NETSCAPE2.0'].map((c) => c.charCodeAt(0)), 0x03, 0x01, 0, 0, 0);
    parts.push(new Uint8Array(head));
    let pending = null; // { ix, pal, delay }
    const flush = () => {
      if (!pending) return;
      const d = Math.max(2, Math.min(65535, pending.delay));
      const out = [0x21, 0xf9, 0x04, 0x04, d & 255, d >> 8, 0, 0, 0x2c, 0, 0, 0, 0, w & 255, w >> 8, h & 255, h >> 8, 0x87];
      for (const c of pending.pal) out.push(c[0], c[1], c[2]);
      lzw(pending.ix, out);
      parts.push(new Uint8Array(out));
      pending = null;
    };
    const same = (a, b) => { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };
    return {
      add(rgba, delay) {
        if (pending && pending.rgba && same(pending.rgba, rgba)) { pending.delay += delay; return; }
        flush();
        const pal = paletteOf(rgba);
        pending = { ix: indexPixels(rgba, pal), pal, delay, rgba: rgba.slice() };
      },
      finish() {
        flush();
        parts.push(new Uint8Array([0x3b]));
        const len = parts.reduce((n, p) => n + p.length, 0);
        const all = new Uint8Array(len);
        let o = 0;
        for (const p of parts) { all.set(p, o); o += p.length; }
        return all;
      },
    };
  };

  // ================================================================ WAV writer
  Q.wavBytes = (chunks, sampleRate) => {
    const frames = chunks.reduce((n, c) => n + c[0].length, 0);
    const buf = new ArrayBuffer(44 + frames * 4), v = new DataView(buf);
    const s = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    s(0, 'RIFF'); v.setUint32(4, 36 + frames * 4, true); s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
    v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, frames * 4, true);
    let o = 44;
    for (const [L, R] of chunks) for (let i = 0; i < L.length; i++) {
      v.setInt16(o, Math.max(-1, Math.min(1, L[i])) * 32767, true); v.setInt16(o + 2, Math.max(-1, Math.min(1, R[i])) * 32767, true); o += 4;
    }
    return new Uint8Array(buf);
  };

  // ================================================================ dialogs
  const even = (x) => Math.max(2, Math.round(x / 2) * 2);
  const safeName = (s, ext) => (String(s || '').trim() || 'Export').replace(/[\\/:*?"<>|]/g, '_').replace(/\.\w+$/, '') + '.' + ext;
  const row = (l, ...c) => RS.h('div', { class: 'form-row' }, RS.h('span', null, l), RS.h('div', { class: 'inline' }, ...c));
  function rangeSelect() {
    const io = S.project.inOut || {};
    const end = RS.seqDuration();
    const hasIO = io.in != null && io.out != null && io.out - io.in > 1 / RS.fps();
    const sel = RS.h('select', null, RS.h('option', { value: 'all' }, 'Entire sequence'), RS.h('option', { value: 'io', disabled: !hasIO }, 'Sequence In/Out' + (hasIO ? ` (${RS.fmtTC(io.in, RS.fps())} – ${RS.fmtTC(io.out, RS.fps())})` : ' (none set)')));
    if (hasIO) sel.value = 'io';
    return { sel, get: () => (sel.value === 'io' && hasIO ? { t0: Math.max(0, io.in), t1: Math.min(end, io.out) } : { t0: 0, t1: end }) };
  }
  // Save bytes where the user chooses (Chrome/Edge) or as a download.
  async function save(bytes, fileName, mime) {
    const blob = new Blob([bytes], { type: mime });
    if (RS.web && RS.web.canSaveDirect && RS.web.canSaveDirect()) {
      try {
        const ext = '.' + fileName.split('.').pop();
        const h = await window.showSaveFilePicker({ suggestedName: fileName, id: 'reelsmith-export', types: [{ description: ext.slice(1).toUpperCase(), accept: { [mime]: [ext] } }] });
        const ws = await h.createWritable(); await ws.write(blob); await ws.close();
        return h.name;
      } catch (err) { if (err && err.name === 'AbortError') return null; }
    }
    const url = URL.createObjectURL(blob);
    const a = RS.h('a', { href: url, download: fileName });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return fileName;
  }
  // Progress dialog around a job: job(progress(fraction, text), isCancelled) → result.
  async function withProgress(title, job) {
    const E = RS.engine;
    const bar = RS.h('div', { class: 'progress-fill' });
    const label = RS.h('div', { class: 'muted' }, 'Preparing…');
    let cancelled = false;
    const dlg = RS.modal({ title, sticky: true, body: RS.h('div', null, RS.h('div', { class: 'progress' }, bar), label), buttons: [{ label: 'Cancel', danger: true, onClick: () => { cancelled = true; return false; } }] });
    if (S.playing) E.pause();
    E.exporting = true;
    Q.busy = true;
    try {
      return await job((f, text) => { bar.style.width = (f * 100).toFixed(1) + '%'; label.textContent = text || Math.round(f * 100) + '%'; }, () => cancelled);
    } catch (err) {
      if (!cancelled) { console.error(err); RS.toast('Export failed: ' + (err && err.message), 'error', 7000); }
      return null;
    } finally {
      E.exporting = false; E.hideCaptions = false; E.forceCaptions = false; Q.busy = false;
      E.invalidate();
      dlg.close();
    }
  }
  const usable = () => {
    if (!RS.seqDuration()) { RS.toast('Add clips to the timeline first'); return false; }
    return true;
  };

  // ---------------------------------------------------------------- GIF
  Q.gifDialog = () => {
    if (!usable()) return;
    const P = S.project.settings;
    const range = rangeSelect();
    const width = RS.h('select', null, [320, 480, 640, 800].map((w) => RS.h('option', { value: w, selected: w === 480 }, `${w} px wide`)));
    const fps = RS.h('select', null, [10, 15, 20, 25].map((f) => RS.h('option', { value: f, selected: f === 15 }, `${f} fps`)));
    const loop = RS.h('input', { type: 'checkbox', checked: true });
    const name = RS.h('input', { type: 'text', class: 'input', value: (S.project.name || 'Export').replace(/[\\/:*?"<>|]/g, '_') });
    const note = RS.h('p', { class: 'muted small' });
    const upd = () => {
      const { t0, t1 } = range.get();
      const w = +width.value, h = even((w * P.height) / P.width);
      const d = t1 - t0;
      note.textContent = `${w}×${h} · ${d.toFixed(1)} s · ${Math.round(d * +fps.value)} frames` + (d > 20 ? ' — long GIFs get very large; MP4 is usually better above 20 seconds.' : '');
    };
    [range.sel, width, fps].forEach((x) => x.addEventListener('change', upd));
    upd();
    RS.modal({
      title: 'Export as GIF',
      body: RS.h('div', { class: 'form' }, row('Range', range.sel), row('Size', width), row('Frame rate', fps), RS.h('label', { class: 'form-row check' }, loop, RS.h('span', null, 'Loop forever')), row('File name', name), note,
        RS.h('p', { class: 'muted small' }, 'GIFs have no sound and up to 256 colours per frame. Visible captions are included.')),
      buttons: [{ label: 'Cancel' }, { label: 'Export GIF', primary: true, onClick: () => { setTimeout(() => Q.exportGif({ ...range.get(), width: +width.value, fps: +fps.value, loop: loop.checked, fileName: safeName(name.value, 'gif') }), 0); } }],
    });
  };
  Q.exportGif = async ({ t0, t1, width, fps, loop = true, fileName = 'Export.gif', returnBytes = false }) => {
    const P = S.project.settings;
    const w = even(width), h = even((width * P.height) / P.width);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const gif = Q.gifWriter(w, h, { loop });
    const cs = (i) => Math.round((i * 100) / fps);
    const result = await withProgress('Exporting ' + fileName, async (progress, cancelled) => {
      await RS.fastExport.frames({ t0, t1, fps, width: w, height: h }, async (canvas, i) => {
        g.drawImage(canvas, 0, 0, w, h);
        gif.add(g.getImageData(0, 0, w, h).data, cs(i + 1) - cs(i));
        if (i % 4 === 3) await new Promise((r) => setTimeout(r, 0)); // keep the page responsive
      }, (f) => progress(f * 0.98, `Frame ${Math.round(f * (t1 - t0) * fps)} of ${Math.round((t1 - t0) * fps)}`), cancelled);
      progress(1, 'Saving…');
      const bytes = gif.finish();
      if (returnBytes) return bytes;
      const saved = await save(bytes, fileName, 'image/gif');
      if (saved) RS.toast(`Saved ${saved} (${(bytes.length / 1048576).toFixed(1)} MB)`, 'ok', 5000);
      return saved;
    });
    return result;
  };

  // ---------------------------------------------------------------- audio
  Q.canM4A = async () => { try { return !!(window.AudioEncoder && MB() && (await MB().canEncodeAudio('aac', { numberOfChannels: 2, sampleRate: 48000, bitrate: 192000 }))); } catch { return false; } };
  Q.audioDialog = async () => {
    if (!usable()) return;
    const range = rangeSelect();
    const m4a = await Q.canM4A();
    const fmt = RS.h('select', null, m4a ? RS.h('option', { value: 'm4a' }, 'AAC (.m4a) — small, plays everywhere') : null, RS.h('option', { value: 'wav' }, 'WAV (.wav) — uncompressed'));
    const name = RS.h('input', { type: 'text', class: 'input', value: (S.project.name || 'Export').replace(/[\\/:*?"<>|]/g, '_') });
    RS.modal({
      title: 'Export Audio',
      body: RS.h('div', { class: 'form' }, row('Range', range.sel), row('Format', fmt), row('File name', name),
        RS.h('p', { class: 'muted small' }, 'Exports the sound of the sequence — all unmuted audio tracks with their volume, effects and fades.')),
      buttons: [{ label: 'Cancel' }, { label: 'Export Audio', primary: true, onClick: () => { setTimeout(() => Q.exportAudio({ ...range.get(), format: fmt.value, fileName: safeName(name.value, fmt.value) }), 0); } }],
    });
  };
  Q.exportAudio = async ({ t0, t1, format = 'wav', fileName, returnBytes = false }) => {
    fileName = fileName || 'Export.' + format;
    return withProgress('Exporting ' + fileName, async (progress, cancelled) => {
      let bytes;
      if (format === 'm4a') {
        const target = new (MB().BufferTarget)();
        const out = new (MB().Output)({ format: new (MB().Mp4OutputFormat)({ fastStart: 'in-memory' }), target });
        const src = new (MB().AudioBufferSource)({ codec: 'aac', bitrate: 192000 });
        out.addAudioTrack(src);
        await out.start();
        await RS.fastExport.mixAudio(t0, t1, async (buf, f) => { await src.add(buf); progress(f * 0.95); }, cancelled);
        src.close();
        await out.finalize();
        bytes = new Uint8Array(target.buffer);
      } else {
        const chunks = [];
        await RS.fastExport.mixAudio(t0, t1, async (buf, f) => { const L = buf.getChannelData(0); chunks.push([L.slice(), (buf.numberOfChannels > 1 ? buf.getChannelData(1) : L).slice()]); progress(f * 0.95); }, cancelled);
        bytes = Q.wavBytes(chunks, 48000);
      }
      progress(1, 'Saving…');
      if (returnBytes) return bytes;
      const saved = await save(bytes, fileName, format === 'm4a' ? 'audio/mp4' : 'audio/wav');
      if (saved) RS.toast(`Saved ${saved} (${(bytes.length / 1048576).toFixed(1)} MB)`, 'ok', 5000);
      return saved;
    });
  };
})(window.RS);
