'use strict';
// Lumetri-style colour widgets for Effect Controls: RGB curves and three-way colour wheels.
// Each widget takes { getL, ensureL, live, finish, commit, bindings } from the inspector.
(function (RS) {
  const U = RS.colorUI = {};
  const CH = [['m', 'Master', '#e4e7ec'], ['r', 'Red', '#ff5a5f'], ['g', 'Green', '#3fd27a'], ['b', 'Blue', '#4fa3ff']];

  function hidpi(cv, w, h) {
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return g;
  }

  // ---------- RGB curves ----------
  U.curves = (o) => {
    const SZ = 220, PAD = 8, IN = SZ - PAD * 2;
    let ch = 'm';
    const cv = RS.h('canvas', { class: 'curves-canvas', title: 'Click to add a point, drag to shape, double-click a point to remove it' });
    const g = hidpi(cv, SZ, SZ);
    const chips = RS.h('div', { class: 'chips' });
    const chipEls = CH.map(([id, label, color]) => {
      const b = RS.h('button', { class: 'chip', style: { color } }, label);
      b.addEventListener('click', () => { ch = id; draw(); });
      chips.append(b);
      return [id, b];
    });
    const reset = RS.h('button', { class: 'btn small' }, 'Reset channel');
    reset.addEventListener('click', () => o.commit('Reset curve', () => { o.ensureL().curves[ch] = [[0, 0], [1, 1]]; }));
    const X = (x) => PAD + x * IN, Y = (y) => PAD + (1 - y) * IN;
    const unit = (e) => { const r = cv.getBoundingClientRect(); return [RS.clamp((e.clientX - r.left - PAD) / IN, 0, 1), RS.clamp(1 - (e.clientY - r.top - PAD) / IN, 0, 1)]; };

    function draw() {
      const L = o.getL();
      chipEls.forEach(([id, b]) => b.classList.toggle('on', id === ch));
      g.clearRect(0, 0, SZ, SZ);
      g.fillStyle = '#121418';
      g.fillRect(0, 0, SZ, SZ);
      g.strokeStyle = '#2a2f37'; g.lineWidth = 1;
      for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(X(i / 4), Y(0)); g.lineTo(X(i / 4), Y(1)); g.moveTo(X(0), Y(i / 4)); g.lineTo(X(1), Y(i / 4)); g.stroke(); }
      g.strokeStyle = '#3a404a'; g.setLineDash([3, 3]);
      g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(1), Y(1)); g.stroke(); g.setLineDash([]);
      for (const [id, , color] of CH) {
        const f = RS.curveFn(L.curves[id]);
        const cur = id === ch;
        if (!cur && L.curves[id].length === 2 && L.curves[id][0][1] === 0 && L.curves[id][1][1] === 1) continue;
        g.strokeStyle = color; g.globalAlpha = cur ? 1 : 0.35; g.lineWidth = cur ? 2 : 1;
        g.beginPath();
        for (let i = 0; i <= 100; i++) { const x = i / 100; const y = RS.clamp(f(x), 0, 1); if (i) g.lineTo(X(x), Y(y)); else g.moveTo(X(x), Y(y)); }
        g.stroke();
        g.globalAlpha = 1;
      }
      g.fillStyle = CH.find((c) => c[0] === ch)[2];
      for (const [x, y] of L.curves[ch]) { g.beginPath(); g.arc(X(x), Y(y), 4, 0, Math.PI * 2); g.fill(); }
    }

    cv.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const [x, y] = unit(e);
      const pts = o.getL().curves[ch];
      let idx = pts.findIndex(([px, py]) => Math.hypot(X(px) - X(x), Y(py) - Y(y)) < 9);
      if (idx < 0) {
        if (x < 0.02 || x > 0.98) return;
        o.live(() => {
          const p = o.ensureL().curves[ch];
          idx = p.findIndex((q) => q[0] > x);
          p.splice(idx, 0, [x, y]);
        });
      }
      cv.setPointerCapture(e.pointerId);
      const mv = (ev) => {
        const [nx, ny] = unit(ev);
        o.live(() => {
          const p = o.ensureL().curves[ch];
          const last = p.length - 1;
          const lo = idx === 0 ? 0 : p[idx - 1][0] + 0.01, hi = idx === last ? 1 : p[idx + 1][0] - 0.01;
          p[idx] = [idx === 0 ? 0 : idx === last ? 1 : RS.clamp(nx, lo, hi), ny];
        });
        draw();
      };
      const up = () => { cv.removeEventListener('pointermove', mv); cv.removeEventListener('pointerup', up); o.finish('Curves'); };
      cv.addEventListener('pointermove', mv);
      cv.addEventListener('pointerup', up);
      draw();
    });
    cv.addEventListener('dblclick', (e) => {
      const [x, y] = unit(e);
      const pts = o.getL().curves[ch];
      const idx = pts.findIndex(([px, py]) => Math.hypot(X(px) - X(x), Y(py) - Y(y)) < 9);
      if (idx > 0 && idx < pts.length - 1) o.commit('Remove curve point', () => { o.ensureL().curves[ch].splice(idx, 1); });
    });
    o.bindings.push({ read: draw });
    draw();
    return RS.h('div', { class: 'curves' }, chips, cv, RS.h('div', { class: 'curves-foot' }, reset));
  };

  // ---------- three-way colour wheels ----------
  const wheelCache = new Map();
  function wheelImage(size) {
    const key = size + '@' + (window.devicePixelRatio || 1);
    if (wheelCache.has(key)) return wheelCache.get(key);
    const dpr = window.devicePixelRatio || 1;
    const n = Math.round(size * dpr);
    const c = document.createElement('canvas');
    c.width = c.height = n;
    const g = c.getContext('2d');
    const img = g.createImageData(n, n);
    const r = n / 2;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = (x - r) / r, dy = (y - r) / r;
      const d = Math.hypot(dx, dy);
      const i = (y * n + x) * 4;
      if (d > 1) continue;
      const v = RS.wheelVector({ x: dx, y: dy });
      img.data[i] = RS.clamp(110 + v[0] * 120, 0, 255);
      img.data[i + 1] = RS.clamp(110 + v[1] * 120, 0, 255);
      img.data[i + 2] = RS.clamp(110 + v[2] * 120, 0, 255);
      img.data[i + 3] = d > 0.97 ? 255 * (1 - d) / 0.03 : 255;
    }
    g.putImageData(img, 0, 0);
    wheelCache.set(key, c);
    return c;
  }

  U.wheels = (o) => {
    const SZ = 104;
    const box = RS.h('div', { class: 'wheels' });
    for (const [id, label] of [['sh', 'Shadows'], ['mid', 'Midtones'], ['hi', 'Highlights']]) {
      const cv = RS.h('canvas', { class: 'wheel', title: 'Drag to tint · double-click to reset' });
      const g = hidpi(cv, SZ, SZ);
      const lum = RS.h('input', { type: 'range', min: -100, max: 100, step: 1, title: 'Brightness of ' + label.toLowerCase() });
      const draw = () => {
        const w = o.getL().wheels[id];
        g.clearRect(0, 0, SZ, SZ);
        g.drawImage(wheelImage(SZ), 0, 0, SZ, SZ);
        g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(SZ / 2 - 5, SZ / 2); g.lineTo(SZ / 2 + 5, SZ / 2); g.moveTo(SZ / 2, SZ / 2 - 5); g.lineTo(SZ / 2, SZ / 2 + 5); g.stroke();
        const px = SZ / 2 + w.x * SZ / 2, py = SZ / 2 + w.y * SZ / 2;
        g.beginPath(); g.arc(px, py, 6, 0, Math.PI * 2);
        g.fillStyle = '#fff'; g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1.5; g.stroke();
        if (document.activeElement !== lum) lum.value = Math.round(w.l * 100);
      };
      const at = (e) => {
        const r = cv.getBoundingClientRect();
        let x = (e.clientX - r.left - SZ / 2) / (SZ / 2), y = (e.clientY - r.top - SZ / 2) / (SZ / 2);
        const d = Math.hypot(x, y);
        if (d > 1) { x /= d; y /= d; }
        return [x, y];
      };
      cv.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        cv.setPointerCapture(e.pointerId);
        const apply = (ev) => { const [x, y] = at(ev); o.live(() => { const w = o.ensureL().wheels[id]; w.x = +x.toFixed(4); w.y = +y.toFixed(4); }); draw(); };
        apply(e);
        const up = () => { cv.removeEventListener('pointermove', apply); cv.removeEventListener('pointerup', up); o.finish(label + ' wheel'); };
        cv.addEventListener('pointermove', apply);
        cv.addEventListener('pointerup', up);
      });
      cv.addEventListener('dblclick', () => o.commit('Reset ' + label, () => { const w = o.ensureL().wheels[id]; w.x = 0; w.y = 0; w.l = 0; }));
      lum.addEventListener('input', () => o.live(() => { o.ensureL().wheels[id].l = +lum.value / 100; }));
      lum.addEventListener('change', () => o.finish(label + ' brightness'));
      o.bindings.push({ read: draw });
      draw();
      box.append(RS.h('div', { class: 'wheel-cell' }, RS.h('div', { class: 'wheel-label' }, label), cv, lum));
    }
    return box;
  };
})(window.RS);
