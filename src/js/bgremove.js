'use strict';
// Remove Background for still images (logos, graphics, product shots on plain backdrops).
// Not AI: the background colour is detected from the image border (or picked by clicking the
// preview), then removed either where it touches the edges (flood fill) or everywhere. Soft edges
// get partial transparency with the background colour "unmixed" so no halo is left behind.
// The result is saved as a new transparent PNG; the original file is never changed.
(function (RS) {
  const S = RS.state;
  const BG = RS.bgRemove = {};
  const PREVIEW_MAX = 640;
  const FULL_MAX = 4096;

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Cannot read the image'));
      img.src = url;
    });
  }

  function pixelsOf(img, maxSide) {
    const w0 = img.naturalWidth || 512, h0 = img.naturalHeight || 512;
    const k = Math.min(1, maxSide / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, w, h);
    return g.getImageData(0, 0, w, h);
  }

  // Most common (quantised) opaque colour along the border.
  BG.detectColor = (im) => {
    const { width: w, height: h, data: d } = im;
    const counts = new Map();
    let opaque = 0, total = 0;
    const add = (x, y) => {
      const i = (y * w + x) * 4;
      total++;
      if (d[i + 3] < 128) return;
      opaque++;
      const key = (d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3);
      const e = counts.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      e.n++; e.r += d[i]; e.g += d[i + 1]; e.b += d[i + 2];
      counts.set(key, e);
    };
    for (let x = 0; x < w; x++) { add(x, 0); add(x, h - 1); }
    for (let y = 1; y < h - 1; y++) { add(0, y); add(w - 1, y); }
    if (opaque < total * 0.25) return null; // border already transparent
    let best = null;
    for (const e of counts.values()) if (!best || e.n > best.n) best = e;
    return best ? [Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n)] : null;
  };

  // opts: {colors:[[r,g,b]], tolerance 0–100, softness 0–100, mode 'edges'|'all', trim}
  // Returns a new ImageData (possibly cropped when trim is on).
  BG.process = (im, opts) => {
    const { width: w, height: h, data: src } = im;
    const n = w * h;
    const colors = opts.colors && opts.colors.length ? opts.colors : [[255, 255, 255]];
    const tol = (opts.tolerance / 100) * 200;          // RGB distance where pixels are fully removed
    const soft = Math.max(1, (opts.softness / 100) * 120); // band above that with partial alpha
    const lim = tol + soft;
    const dist = new Float32Array(n);
    const near = new Uint8Array(n); // index of the closest key colour
    for (let p = 0, i = 0; p < n; p++, i += 4) {
      let best = Infinity, bi = 0;
      for (let k = 0; k < colors.length; k++) {
        const c = colors[k];
        const dr = src[i] - c[0], dg = src[i + 1] - c[1], db = src[i + 2] - c[2];
        const dd = Math.sqrt(dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11) * 1.73;
        if (dd < best) { best = dd; bi = k; }
      }
      dist[p] = src[i + 3] < 8 ? 0 : best; // already-transparent pixels count as background
      near[p] = bi;
    }
    // Which pixels may be touched: all matching ones, or only those connected to the border.
    let region;
    if (opts.mode === 'all') region = null;
    else {
      region = new Uint8Array(n);
      const stack = new Int32Array(n);
      let sp = 0;
      const push = (p) => { if (!region[p] && dist[p] < lim) { region[p] = 1; stack[sp++] = p; } };
      for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
      for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
      while (sp) {
        const p = stack[--sp];
        const x = p % w;
        // Soft (partly matching) pixels belong to the edge but do not spread the fill further,
        // so a fill cannot leak through anti-aliased outlines into the logo.
        if (dist[p] > tol + soft * 0.5) continue;
        if (x > 0) push(p - 1);
        if (x < w - 1) push(p + 1);
        if (p >= w) push(p - w);
        if (p < n - w) push(p + w);
      }
    }
    // Colour-to-alpha: the least opacity that explains pixel p as foreground over its key colour.
    const c2a = (p) => {
      const i = p * 4, c = colors[near[p]];
      let am = 0;
      for (let k = 0; k < 3; k++) {
        const v = src[i + k], b = c[k];
        const q = v > b ? (v - b) / (255 - b || 1) : v < b ? (b - v) / (b || 1) : 0;
        if (q > am) am = q;
      }
      return am;
    };
    const removable = (p) => (region ? region[p] === 1 : dist[p] < lim);
    const out = new ImageData(w, h);
    const o = out.data;
    for (let p = 0, i = 0; p < n; p++, i += 4) {
      const a0 = src[i + 3] / 255;
      let a = 1;
      const d = dist[p];
      if (removable(p)) a = d <= tol ? 0 : c2a(p);
      else {
        // The anti-aliased outline right next to removed background: unmix it too.
        const x = p % w;
        const bgNext = (q) => removable(q) && dist[q] <= tol;
        if ((x > 0 && bgNext(p - 1)) || (x < w - 1 && bgNext(p + 1)) || (p >= w && bgNext(p - w)) || (p < n - w && bgNext(p + w))) {
          const am = c2a(p);
          if (am < 0.85) a = am;
        }
      }
      if (a > 0 && a < 1) {
        // Remove the background colour from semi-transparent edge pixels (no halo).
        const c = colors[near[p]];
        o[i] = RS.clamp(Math.round((src[i] - (1 - a) * c[0]) / a), 0, 255);
        o[i + 1] = RS.clamp(Math.round((src[i + 1] - (1 - a) * c[1]) / a), 0, 255);
        o[i + 2] = RS.clamp(Math.round((src[i + 2] - (1 - a) * c[2]) / a), 0, 255);
      } else { o[i] = src[i]; o[i + 1] = src[i + 1]; o[i + 2] = src[i + 2]; }
      o[i + 3] = Math.round(a * a0 * 255);
    }
    return opts.trim ? trim(out) : out;
  };

  function trim(im) {
    const { width: w, height: h, data: d } = im;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 4) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0 || (x0 === 0 && y0 === 0 && x1 === w - 1 && y1 === h - 1)) return im;
    const tw = x1 - x0 + 1, th = y1 - y0 + 1;
    const out = new ImageData(tw, th);
    for (let y = 0; y < th; y++) out.data.set(d.subarray(((y + y0) * w + x0) * 4, ((y + y0) * w + x1 + 1) * 4), y * tw * 4);
    return out;
  }

  const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  const unhex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));

  // Open the dialog. clipIds: timeline clips to switch to the new image (empty = every use).
  BG.open = async (mediaId, clipIds) => {
    const m = RS.getMedia(mediaId);
    const rt = m && RS.runtime[m.id];
    if (!m || m.type !== 'image') return RS.toast('Remove Background works on still images (PNG, JPG, WebP…)');
    if (!rt || !rt.url) return RS.toast('The image is offline. Relink it first.', 'error');
    let img;
    try { img = await loadImage(rt.url); } catch (err) { return RS.toast(err.message, 'error'); }
    const small = pixelsOf(img, PREVIEW_MAX);
    const auto = BG.detectColor(small);
    const opts = { colors: [auto || [255, 255, 255]], tolerance: 18, softness: 20, mode: 'edges', trim: false };

    const canvas = RS.h('canvas', { class: 'bgr-canvas', width: small.width, height: small.height });
    const g = canvas.getContext('2d');
    const showOrig = RS.h('input', { type: 'checkbox' });
    const swatches = RS.h('div', { class: 'bgr-swatches' });
    let raf = 0;
    const redraw = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (showOrig.checked) { g.clearRect(0, 0, canvas.width, canvas.height); g.putImageData(small, 0, 0); return; }
        const r = BG.process(small, { ...opts, trim: false });
        g.putImageData(r, 0, 0);
      });
    };
    const drawSwatches = () => {
      swatches.textContent = '';
      opts.colors.forEach((c, i) => {
        const inp = RS.h('input', { type: 'color', value: hex(c), title: 'Background colour ' + (i + 1) });
        inp.addEventListener('input', () => { opts.colors[i] = unhex(inp.value); redraw(); });
        const x = RS.h('button', { class: 'bgr-x', title: 'Remove colour' }, '×');
        x.disabled = opts.colors.length < 2;
        x.addEventListener('click', () => { opts.colors.splice(i, 1); drawSwatches(); redraw(); });
        swatches.append(RS.h('span', { class: 'bgr-sw' }, inp, x));
      });
    };
    // Click the preview to pick the background colour; Shift+click adds another one.
    canvas.addEventListener('pointerdown', (e) => {
      const r = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - r.left) / r.width * small.width), y = Math.floor((e.clientY - r.top) / r.height * small.height);
      const i = (RS.clamp(y, 0, small.height - 1) * small.width + RS.clamp(x, 0, small.width - 1)) * 4;
      const c = [small.data[i], small.data[i + 1], small.data[i + 2]];
      if (e.shiftKey && opts.colors.length < 6) opts.colors.push(c); else opts.colors = [c];
      drawSwatches(); redraw();
    });
    const slider = (label, key, tip) => {
      const val = RS.h('span', { class: 'bgr-val' }, String(opts[key]));
      const inp = RS.h('input', { type: 'range', min: 0, max: 100, value: opts[key] });
      inp.addEventListener('input', () => { opts[key] = +inp.value; val.textContent = inp.value; redraw(); });
      return RS.h('label', { class: 'bgr-row', title: tip }, RS.h('span', null, label), inp, val);
    };
    const modeSel = RS.h('select', null,
      RS.h('option', { value: 'edges' }, 'Background touching the edges'),
      RS.h('option', { value: 'all' }, 'This colour everywhere (also inside letters)'));
    modeSel.addEventListener('change', () => { opts.mode = modeSel.value; redraw(); });
    const trimBox = RS.h('input', { type: 'checkbox' });
    trimBox.addEventListener('change', () => { opts.trim = trimBox.checked; });
    showOrig.addEventListener('change', redraw);

    const body = RS.h('div', { class: 'bgr' },
      RS.h('div', { class: 'bgr-stage' }, canvas),
      RS.h('div', { class: 'bgr-side' },
        RS.h('div', { class: 'bgr-label' }, 'Background colour'),
        swatches,
        RS.h('div', { class: 'muted small' }, auto ? 'Detected from the image border. Click the preview to pick another colour; Shift+click to add one.' : 'Click the preview on the background to pick its colour; Shift+click to add more.'),
        RS.h('div', { class: 'bgr-label' }, 'Remove'),
        modeSel,
        slider('Tolerance', 'tolerance', 'How different a colour can be and still count as background'),
        slider('Edge softness', 'softness', 'Smooth, anti-aliased edges without a coloured fringe'),
        RS.h('label', { class: 'bgr-check' }, trimBox, ' Trim transparent edges'),
        RS.h('label', { class: 'bgr-check' }, showOrig, ' Show original'),
      ));
    drawSwatches();
    redraw();

    RS.modal({
      title: 'Remove Background — ' + m.name,
      wide: true,
      body,
      buttons: [
        { label: 'Cancel' },
        { label: 'Remove Background', primary: true, onClick: () => apply(m, img, { ...opts, colors: opts.colors.map((c) => c.slice()) }, clipIds) },
      ],
    });
  };

  // Video clips: key out the background live (every frame) with Ultra Key, set up automatically from
  // the colour around the frame edges. White/black/grey backgrounds use the brightness (RGB) key and
  // keep enclosed areas (white text inside a button) visible.
  BG.video = async (clipId) => {
    let c = RS.getClip(clipId);
    if (!c || c.type !== 'video') return;
    if (S.playhead < c.start || S.playhead >= RS.clipEnd(c)) RS.engine.seek(c.start + Math.min(0.3, c.duration / 2));
    let el = null;
    for (let i = 0; i < 40; i++) {
      const ent = RS.engine.pool && RS.engine.pool.get(c.id);
      if (ent && ent.el.readyState >= 2 && ent.el.videoWidth) { el = ent.el; break; }
      await new Promise((r) => setTimeout(r, 50));
    }
    let color = null;
    if (el) {
      const k = Math.min(1, 480 / el.videoWidth);
      const cv = document.createElement('canvas'); cv.width = Math.max(2, Math.round(el.videoWidth * k)); cv.height = Math.max(2, Math.round(el.videoHeight * k));
      const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(el, 0, 0, cv.width, cv.height);
      color = BG.detectColor(g.getImageData(0, 0, cv.width, cv.height));
    }
    if (!color) color = [255, 255, 255];
    const sat = Math.max(...color) - Math.min(...color);
    const rgb = sat < 60; // white, black, grey, beige … → brightness key
    RS.commit('Remove video background', () => {
      c = RS.getClip(clipId);
      c.key = { on: true, color: '#' + color.map((v) => v.toString(16).padStart(2, '0')).join(''), tolerance: rgb ? 20 : 30, softness: rgb ? 14 : 15, spill: rgb ? 0 : 50, mode: rgb ? 'rgb' : 'color', edges: rgb };
      c.fx = [...new Set([...(c.fx || []), 'ultrakey'])];
    });
    RS.select([clipId]);
    RS.emit('show-tab', 'effectControls');
    RS.toast('Background removed. Fine-tune Tolerance in Effect Controls ▸ Ultra Key; put the clip on V2 above your main video.', 'ok', 6000);
  };

  async function apply(m, img, opts, clipIds) {
    RS.emit('status', 'Removing background…');
    try {
      const full = pixelsOf(img, FULL_MAX);
      const res = BG.process(full, opts);
      const c = document.createElement('canvas');
      c.width = res.width; c.height = res.height;
      c.getContext('2d').putImageData(res, 0, 0);
      const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
      const name = m.name.replace(/\.[^.]+$/, '') + ' (no background).png';
      let src;
      if (RS.native) {
        const dir = await RS.native.appDir('cutouts');
        const p = await RS.native.writeNew(dir, name, new Uint8Array(await blob.arrayBuffer()));
        src = { name: p.split('/').pop(), path: p, size: blob.size };
      } else src = { name, file: new File([blob], name, { type: 'image/png' }), size: blob.size };
      const [nm] = await RS.media.importSources([src]);
      if (!nm) return;
      let n = 0;
      RS.commit('Remove background', () => {
        for (const q of S.project.sequences) for (const x of q.clips) {
          if (x.mediaId !== m.id || x.type !== 'image') continue;
          if (clipIds && clipIds.length && !clipIds.includes(x.id)) continue;
          x.mediaId = nm.id; n++;
        }
      });
      RS.engine.invalidate && RS.engine.invalidate();
      RS.emit('change', { source: 'bgremove' });
      RS.toast(n ? `Background removed — ${n} clip${n > 1 ? 's' : ''} updated. Original kept in the Project panel.` : `Saved “${nm.name}” to the Project panel.`, 'ok', 5000);
    } catch (err) {
      console.error(err);
      RS.toast('Remove Background failed: ' + (err.message || err), 'error');
    } finally { RS.emit('status', ''); }
  }
})(window.RS);
