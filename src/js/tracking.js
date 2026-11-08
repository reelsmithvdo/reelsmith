'use strict';
// Mask tracking: follows the masked region forward through the clip using normalised template matching
// on downscaled greyscale frames (classic computer vision, frame-accurate decode).
(function (RS) {
  const S = RS.state;
  const T = RS.tracker = {};
  const SW = 320;    // analysis width
  const RANGE = 28;  // search radius in analysis pixels per frame
  const MAXT = 72;   // template size cap

  function gray(src, w, h, g, out) {
    if (src.draw) src.draw(g, 0, 0, w, h); else g.drawImage(src, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    for (let i = 0, j = 0; i < out.length; i++, j += 4) out[i] = 0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2];
    return out;
  }

  // Mean-removed sum of squared differences between template and frame region at (x,y).
  function score(frame, w, tpl, tw, th, tmean, x, y, step) {
    let sum = 0, mean = 0, n = 0;
    for (let j = 0; j < th; j += step) { const row = (y + j) * w + x; for (let i = 0; i < tw; i += step) { mean += frame[row + i]; n++; } }
    mean /= n;
    for (let j = 0; j < th; j += step) {
      const row = (y + j) * w + x, trow = j * tw;
      for (let i = 0; i < tw; i += step) { const d = (frame[row + i] - mean) - (tpl[trow + i] - tmean); sum += d * d; }
    }
    return sum / n;
  }

  T.trackMask = async (clipId, maskId) => {
    const c = RS.getClip(clipId);
    if (!c || c.type !== 'video') return RS.toast('Mask tracking works on video clips');
    const mask = (c.masks || []).find((m) => m.id === maskId);
    if (!mask) return;
    const m = RS.getMedia(c.mediaId);
    if (!m || !m.width) return RS.toast('Media is offline');
    if (S.playing) RS.engine.pause();
    const fps = RS.fps();
    const lt0 = RS.clamp(S.playhead - c.start, 0, c.duration - 1 / fps);
    const times = [];
    for (let lt = lt0; lt < c.duration - 1e-6; lt += 1 / fps) times.push(Math.min(m.duration - 1 / fps, c.in + lt * c.speed));
    if (times.length < 2) return RS.toast('Move the playhead earlier in the clip to track forward');
    const w = SW, h = Math.max(8, Math.round(SW * m.height / m.width));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d', { willReadFrequently: true });

    // region to track = bounding box of the mask at the start frame
    const shape = RS.engine.maskAt(mask, lt0);
    const pts = shape.kind === 'poly' ? shape.pts : [[shape.cx - shape.w / 2, shape.cy - shape.h / 2], [shape.cx + shape.w / 2, shape.cy + shape.h / 2]];
    let x0 = Math.min(...pts.map((p) => p[0])) * w, x1 = Math.max(...pts.map((p) => p[0])) * w;
    let y0 = Math.min(...pts.map((p) => p[1])) * h, y1 = Math.max(...pts.map((p) => p[1])) * h;
    let tw = Math.round(RS.clamp(x1 - x0, 8, MAXT)), th = Math.round(RS.clamp(y1 - y0, 8, MAXT));
    let tx = Math.round(RS.clamp((x0 + x1) / 2 - tw / 2, 0, w - tw)), ty = Math.round(RS.clamp((y0 + y1) / 2 - th / 2, 0, h - th));
    const baseOff = mask.track ? (() => { const s = RS.engine.maskAt(Object.assign({}, mask), lt0); const raw = RS.engine.maskAt(Object.assign({}, mask, { track: null }), lt0); return shape.kind === 'poly' ? [s.pts[0][0] - raw.pts[0][0], s.pts[0][1] - raw.pts[0][1]] : [s.cx - raw.cx, s.cy - raw.cy]; })() : [0, 0];

    // progress dialog
    const bar = RS.h('div', { class: 'progress-fill' });
    const label = RS.h('div', { class: 'muted' }, 'Starting…');
    let cancelled = false;
    const dlg = RS.modal({ title: 'Tracking mask forward', sticky: true, body: RS.h('div', null, RS.h('div', { class: 'progress' }, bar), label), buttons: [{ label: 'Stop', danger: true, onClick: () => { cancelled = true; return false; } }] });

    let provider, iter, input;
    try {
      const v = await RS.decode.videoSink(c.mediaId);
      input = v.input;
      iter = v.sink.samplesAtTimestamps(times);
    } catch { provider = RS.decode.elementFrames(c.mediaId); }
    const nextFrame = async (i) => {
      if (iter) { const r = await iter.next(); return r.done ? null : r.value; }
      return provider.at(times[i]);
    };

    const frame = new Float32Array(w * h);
    const offsets = [];
    let tpl = null, tmean = 0, px = tx, py = ty, vx = 0, vy = 0;
    const sx0 = tx, sy0 = ty;
    try {
      for (let i = 0; i < times.length; i++) {
        if (cancelled) break;
        const smp = await nextFrame(i);
        if (!smp) break;
        gray(smp, w, h, g, frame);
        if (smp.close) smp.close();
        if (i === 0) {
          tpl = new Float32Array(tw * th);
          for (let j = 0; j < th; j++) for (let k = 0; k < tw; k++) tpl[j * tw + k] = frame[(ty + j) * w + tx + k];
          tmean = tpl.reduce((a, b) => a + b, 0) / tpl.length;
          offsets.push([baseOff[0], baseOff[1]]);
          continue;
        }
        const step = Math.max(1, Math.floor(Math.max(tw, th) / 32));
        let best = Infinity, bx = px, by = py;
        const cxp = Math.round(px + vx), cyp = Math.round(py + vy);
        for (let dy = -RANGE; dy <= RANGE; dy += 2) for (let dx = -RANGE; dx <= RANGE; dx += 2) {
          const x = cxp + dx, y = cyp + dy;
          if (x < 0 || y < 0 || x + tw > w || y + th > h) continue;
          const sc = score(frame, w, tpl, tw, th, tmean, x, y, step);
          if (sc < best) { best = sc; bx = x; by = y; }
        }
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const x = bx + dx, y = by + dy;
          if (x < 0 || y < 0 || x + tw > w || y + th > h) continue;
          const sc = score(frame, w, tpl, tw, th, tmean, x, y, 1);
          if (sc < best) { best = sc; bx = x; by = y; }
        }
        vx = (bx - px) * 0.6 + vx * 0.4; vy = (by - py) * 0.6 + vy * 0.4;
        px = bx; py = by;
        // adapt the template slowly so gradual appearance changes are followed
        let mean = 0;
        for (let j = 0; j < th; j++) for (let k = 0; k < tw; k++) { const idx = j * tw + k; tpl[idx] = tpl[idx] * 0.85 + frame[(py + j) * w + px + k] * 0.15; mean += tpl[idx]; }
        tmean = mean / tpl.length;
        offsets.push([baseOff[0] + (px - sx0) / w, baseOff[1] + (py - sy0) / h]);
        if (i % 4 === 0) {
          bar.style.width = ((i + 1) / times.length * 100).toFixed(1) + '%';
          label.textContent = `Frame ${i + 1} / ${times.length}`;
          await new Promise((r) => setTimeout(r, 0));
        }
      }
    } catch (err) {
      console.error(err);
      RS.toast('Tracking failed: ' + err.message, 'error');
    } finally {
      try { if (iter) await iter.return(); } catch { /* ignore */ }
      if (input) input.dispose();
      if (provider) provider.close();
      RS.decode.closeAll();
      dlg.close();
    }
    if (offsets.length > 1) {
      RS.commit('Track mask', () => {
        const mk = (RS.getClip(clipId).masks || []).find((q) => q.id === maskId);
        if (!mk) return;
        // offsets are applied on top of the untracked shape
        mk.track = { t0: lt0, step: 1 / fps, offsets };
      });
      RS.toast(`Tracked ${offsets.length} frames${cancelled ? ' (stopped)' : ''}`, 'ok');
    }
  };
})(window.RS);
