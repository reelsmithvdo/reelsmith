'use strict';
// Lumetri-style scopes for the Program output: Luma waveform, RGB parade, vectorscope (YUV) and histogram.
(function (RS) {
  const SC = RS.scopes = {};
  let root, cv, modeSel, last = 0, pending = false;
  const small = document.createElement('canvas');
  const sg = small.getContext('2d', { willReadFrequently: true });

  SC.init = (el) => {
    root = el;
    modeSel = RS.h('select', { class: 'small' },
      [['wave', 'Waveform (Luma)'], ['parade', 'RGB Parade'], ['vector', 'Vectorscope YUV'], ['hist', 'Histogram']].map(([v, l]) => RS.h('option', { value: v }, l)));
    modeSel.addEventListener('change', () => SC.update(true));
    cv = RS.h('canvas', { class: 'scope-canvas' });
    el.append(RS.h('div', { class: 'panel-toolbar' }, RS.icon('scopes'), modeSel, RS.h('div', { class: 'grow' }), RS.h('span', { class: 'muted small' }, 'Program output')), RS.h('div', { class: 'scope-wrap' }, cv));
    RS.on('rendered', () => SC.update(false));
    new ResizeObserver(() => SC.update(true)).observe(el);
  };

  SC.update = (force) => {
    if (!root || root.offsetParent === null) return; // tab hidden
    const now = performance.now();
    if (!force && now - last < 90) { if (!pending) { pending = true; setTimeout(() => { pending = false; SC.update(true); }, 100); } return; }
    last = now;
    draw();
  };

  function draw() {
    const src = RS.engine.canvas;
    if (!src || !src.width) return;
    const wrap = cv.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const W = Math.max(50, wrap.clientWidth - 12), H = Math.max(50, wrap.clientHeight - 12);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    if (cv.width !== Math.round(W * dpr)) cv.width = Math.round(W * dpr);
    if (cv.height !== Math.round(H * dpr)) cv.height = Math.round(H * dpr);
    const sw = 256, sh = Math.max(16, Math.round(256 * src.height / src.width));
    small.width = sw; small.height = sh;
    sg.drawImage(src, 0, 0, sw, sh);
    const px = sg.getImageData(0, 0, sw, sh).data;
    const g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#0b0c0e';
    g.fillRect(0, 0, cv.width, cv.height);
    const mode = modeSel.value;
    if (mode === 'wave' || mode === 'parade') waveform(g, px, sw, sh, cv.width, cv.height, mode === 'parade', dpr);
    else if (mode === 'vector') vectorscope(g, px, cv.width, cv.height, dpr);
    else histogram(g, px, cv.width, cv.height, dpr);
  }

  function waveform(g, px, sw, sh, W, H, parade, dpr) {
    const cols = parade ? 3 : 1;
    const bins = 128;
    const acc = new Float32Array(cols * sw * bins);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4, r = px[i], gg = px[i + 1], b = px[i + 2];
      if (parade) {
        acc[(0 * sw + x) * bins + (r * (bins - 1) / 255 | 0)]++;
        acc[(1 * sw + x) * bins + (gg * (bins - 1) / 255 | 0)]++;
        acc[(2 * sw + x) * bins + (b * (bins - 1) / 255 | 0)]++;
      } else {
        const l = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
        acc[x * bins + (l * (bins - 1) / 255 | 0)]++;
      }
    }
    const padL = 34 * dpr, padT = 8 * dpr, padB = 8 * dpr;
    const iw = Math.round(W - padL - 6 * dpr), ih = Math.round(H - padT - padB);
    const img = g.createImageData(iw, ih);
    const colors = parade ? [[255, 80, 80], [80, 230, 120], [90, 150, 255]] : [[140, 255, 170]];
    const scale = 6 / sh;
    for (let c = 0; c < cols; c++) {
      const x0 = Math.round(c * iw / cols), x1 = Math.round((c + 1) * iw / cols) - (parade ? 3 : 0);
      for (let X = x0; X < x1; X++) {
        const sx = Math.min(sw - 1, Math.floor((X - x0) / (x1 - x0) * sw));
        for (let bI = 0; bI < bins; bI++) {
          const v = acc[(c * sw + sx) * bins + bI];
          if (!v) continue;
          const a = Math.min(1, Math.sqrt(v * scale));
          const yTop = Math.round((1 - (bI + 1) / bins) * ih), yBot = Math.round((1 - bI / bins) * ih);
          for (let Y = yTop; Y < yBot; Y++) {
            const o = (Y * iw + X) * 4;
            img.data[o] = Math.min(255, img.data[o] + colors[c][0] * a);
            img.data[o + 1] = Math.min(255, img.data[o + 1] + colors[c][1] * a);
            img.data[o + 2] = Math.min(255, img.data[o + 2] + colors[c][2] * a);
            img.data[o + 3] = 255;
          }
        }
      }
    }
    g.putImageData(img, padL, padT);
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.fillStyle = '#6f7784';
    g.font = `${9 * dpr}px ui-monospace, Menlo, monospace`;
    for (const ire of [0, 25, 50, 75, 100]) {
      const y = padT + (1 - ire / 100) * ih;
      g.beginPath(); g.moveTo(padL, y); g.lineTo(padL + iw, y); g.stroke();
      g.fillText(String(ire), 6 * dpr, y + 3 * dpr);
    }
  }

  function vectorscope(g, px, W, H, dpr) {
    const S = Math.min(W, H) - 16 * dpr;
    const cx = W / 2, cy = H / 2, R = S / 2;
    const N = 256;
    const acc = new Float32Array(N * N), col = new Float32Array(N * N * 3);
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], gg = px[i + 1], b = px[i + 2];
      const cb = -0.1687 * r - 0.3313 * gg + 0.5 * b, cr = 0.5 * r - 0.4187 * gg - 0.0813 * b;
      const x = RS.clamp(Math.round(128 + cb), 0, 255), y = RS.clamp(Math.round(128 - cr), 0, 255);
      const k = y * N + x;
      acc[k]++; col[k * 3] += r; col[k * 3 + 1] += gg; col[k * 3 + 2] += b;
    }
    const img = g.createImageData(N, N);
    for (let k = 0; k < N * N; k++) {
      if (!acc[k]) continue;
      const a = Math.min(1, Math.sqrt(acc[k] / 6));
      img.data[k * 4] = Math.min(255, 60 + col[k * 3] / acc[k] * 0.8) * a;
      img.data[k * 4 + 1] = Math.min(255, 60 + col[k * 3 + 1] / acc[k] * 0.8) * a;
      img.data[k * 4 + 2] = Math.min(255, 60 + col[k * 3 + 2] / acc[k] * 0.8) * a;
      img.data[k * 4 + 3] = 255;
    }
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = N;
    tmp.getContext('2d').putImageData(img, 0, 0);
    g.save();
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
    g.imageSmoothingEnabled = true;
    g.drawImage(tmp, cx - R, cy - R, S, S);
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 1;
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.moveTo(cx, cy - R); g.lineTo(cx, cy + R); g.stroke();
    // 75% colour targets
    g.font = `${9 * dpr}px -apple-system, sans-serif`;
    for (const [name, r, gg, b] of [['R', 191, 0, 0], ['Mg', 191, 0, 191], ['B', 0, 0, 191], ['Cy', 0, 191, 191], ['G', 0, 191, 0], ['Yl', 191, 191, 0]]) {
      const cb = -0.1687 * r - 0.3313 * gg + 0.5 * b, cr = 0.5 * r - 0.4187 * gg - 0.0813 * b;
      const x = cx + cb / 128 * R, y = cy - cr / 128 * R;
      g.strokeStyle = 'rgba(255,255,255,0.45)';
      g.strokeRect(x - 5 * dpr, y - 5 * dpr, 10 * dpr, 10 * dpr);
      g.fillStyle = '#9aa1ac';
      g.fillText(name, x + 7 * dpr, y + 3 * dpr);
    }
    // skin-tone line
    const sk = [224, 172, 138];
    const scb = -0.1687 * sk[0] - 0.3313 * sk[1] + 0.5 * sk[2], scr = 0.5 * sk[0] - 0.4187 * sk[1] - 0.0813 * sk[2];
    const len = Math.hypot(scb, scr);
    g.strokeStyle = 'rgba(240,168,58,0.5)';
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + scb / len * R, cy - scr / len * R); g.stroke();
  }

  function histogram(g, px, W, H, dpr) {
    const h = [new Float32Array(256), new Float32Array(256), new Float32Array(256)];
    for (let i = 0; i < px.length; i += 4) { h[0][px[i]]++; h[1][px[i + 1]]++; h[2][px[i + 2]]++; }
    let mx = 1;
    for (const a of h) for (let i = 1; i < 255; i++) mx = Math.max(mx, a[i]);
    const pad = 8 * dpr, iw = W - pad * 2, ih = H - pad * 2;
    g.globalCompositeOperation = 'lighter';
    [['rgba(255,80,80,0.75)', h[0]], ['rgba(80,230,120,0.75)', h[1]], ['rgba(90,150,255,0.75)', h[2]]].forEach(([color, a]) => {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(pad, pad + ih);
      for (let i = 0; i < 256; i++) g.lineTo(pad + i / 255 * iw, pad + ih - Math.min(1, Math.sqrt(a[i] / mx)) * ih);
      g.lineTo(pad + iw, pad + ih);
      g.closePath();
      g.fill();
    });
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    for (let q = 0; q <= 4; q++) { const x = pad + q / 4 * iw; g.beginPath(); g.moveTo(x, pad); g.lineTo(x, pad + ih); g.stroke(); }
  }
})(window.RS);
