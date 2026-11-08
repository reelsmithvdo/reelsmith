'use strict';
// Program monitor: composited output, transport controls, on-screen transform handles.
(function (RS) {
  const S = RS.state;
  const PM = RS.program = {};
  let stage, wrap, canvas, overlay, tcEl, durEl, playBtn, safeBtn, zoomSel, mcBtn, mcCanvas;
  let mcTiles = [];
  let showSafe = false;

  PM.init = (el) => {
    el.innerHTML = '';
    stage = RS.h('div', { class: 'mon-stage program' });
    wrap = RS.h('div', { class: 'canvas-wrap' });
    canvas = RS.h('canvas', { class: 'program-canvas' });
    overlay = RS.h('canvas', { class: 'program-overlay' });
    wrap.append(canvas, overlay);
    mcCanvas = RS.h('canvas', { class: 'mc-grid', title: 'Click a camera to switch (or press 1–9)' });
    stage.append(mcCanvas, wrap);
    mcCanvas.addEventListener('pointerdown', (e) => {
      const r = mcCanvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const hit = mcTiles.find((t) => x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h);
      if (hit) RS.cmd('angle', hit.i + 1);
    });
    tcEl = RS.h('input', { class: 'tc tc-input', value: '00:00:00:00', title: 'Click to type a timecode', spellcheck: false });
    durEl = RS.h('div', { class: 'tc dim' });
    playBtn = RS.iconBtn('play', 'Play / pause (Space)', () => RS.engine.toggle(), 'play-main');
    safeBtn = RS.h('button', { class: 'btn small', title: 'Toggle safe margins' }, 'Safe');
    safeBtn.addEventListener('click', () => { showSafe = !showSafe; safeBtn.classList.toggle('on', showSafe); drawOverlay(); });
    mcBtn = RS.h('button', { class: 'btn small mc-btn', title: 'Multi-Camera view: see every angle, click to cut' }, 'Multi-Camera');
    // Playback resolution: render smaller while playing for smooth playback (paused frames and export stay full quality).
    const resSel = RS.h('select', { class: 'small', title: 'Playback resolution' }, [['1', 'Full'], ['0.5', '1/2'], ['0.25', '1/4']].map(([v, l]) => RS.h('option', { value: v }, l)));
    resSel.addEventListener('change', () => { RS.engine.playRes = +resSel.value; RS.engine.invalidate(); });
    const pxBtn = RS.h('button', { class: 'btn small px-btn', title: 'Play proxy files instead of the originals (export always uses originals)' }, 'Proxies');
    pxBtn.addEventListener('click', () => RS.proxies.toggle());
    RS.on('proxies', (on) => pxBtn.classList.toggle('on', on));
    PM.resSel = resSel; PM.pxBtn = pxBtn;
    const ccBtn = RS.h('button', { class: 'btn small on', title: 'Show / hide captions' }, 'CC');
    ccBtn.addEventListener('click', () => RS.captions.setVisible(!RS.captions.visible()));
    RS.on('captions-visibility', (v) => { ccBtn.classList.toggle('on', v); ccBtn.style.display = RS.tracksOf('caption').length ? '' : 'none'; });
    ccBtn.style.display = 'none';
    PM.ccBtn = ccBtn;
    mcBtn.addEventListener('click', () => PM.toggleMulticam());
    zoomSel = RS.h('select', { class: 'small', title: 'Monitor zoom' },
      ['Fit', '25%', '50%', '75%', '100%'].map((z) => RS.h('option', { value: z }, z)));
    zoomSel.addEventListener('change', layout);
    const controls = RS.h('div', { class: 'mon-controls' },
      tcEl,
      RS.h('div', { class: 'transport' },
        RS.iconBtn('toStart', 'Go to start (Home)', () => RS.engine.seek(0)),
        RS.iconBtn('prev', 'Previous edit point (↑)', () => RS.cmd('prevEdit')),
        RS.iconBtn('stepBack', 'Back one frame (←)', () => RS.engine.step(-1)),
        playBtn,
        RS.iconBtn('stepFwd', 'Forward one frame (→)', () => RS.engine.step(1)),
        RS.iconBtn('next', 'Next edit point (↓)', () => RS.cmd('nextEdit')),
        RS.iconBtn('toEnd', 'Go to end (End)', () => RS.engine.seek(RS.seqDuration()))),
      RS.h('div', { class: 'mon-right' }, PM.ccBtn, pxBtn, resSel, mcBtn, safeBtn, zoomSel, durEl));
    el.append(RS.h('div', { class: 'mon-name' }, 'Program'), stage, RS.h('div', { class: 'mon-bottom' }, controls));

    tcEl.addEventListener('focus', () => tcEl.select());
    tcEl.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const t = RS.parseTC(tcEl.value, RS.fps());
        if (t != null) RS.engine.seek(t);
        tcEl.blur();
      } else if (e.key === 'Escape') tcEl.blur();
    });
    tcEl.addEventListener('blur', () => updateTC());

    RS.engine.init(canvas);
    new ResizeObserver(layout).observe(stage);
    RS.on('time', updateTC);
    RS.on('change', updateTC);
    RS.on('play-state', (p) => { playBtn.innerHTML = ''; playBtn.append(RS.icon(p ? 'pause' : 'play')); });
    RS.on('rendered', () => { drawOverlay(); if (RS.engine.mcView) drawGrid(); });
    RS.on('selection', () => { const a = S.activeMask; if (a && !S.selection.has(a.clipId)) S.activeMask = null; });
    RS.on('selection', drawOverlay);
    RS.on('settings-change', layout);
    overlay.addEventListener('pointerdown', onDown);
    // Drop effects onto the picture: applies to the clip under the pointer.
    const fxPayload = () => { const p = RS.dragPayload; return p && (p.kind === 'effect' || p.kind === 'transition') ? p : null; };
    overlay.addEventListener('dragover', (e) => { if (!fxPayload()) return; const [px, py] = toCanvas(e); if (RS.engine.hitTest(px, py)) { e.preventDefault(); wrap.classList.add('drop'); } });
    overlay.addEventListener('dragleave', () => wrap.classList.remove('drop'));
    overlay.addEventListener('drop', (e) => {
      wrap.classList.remove('drop');
      const p = fxPayload();
      if (!p) return;
      e.preventDefault();
      const [px, py] = toCanvas(e);
      const c = RS.engine.hitTest(px, py);
      RS.dragPayload = null;
      if (c) RS.effects.dropOn(p, c);
    });
    overlay.addEventListener('pointermove', onHover);
    overlay.addEventListener('dblclick', (e) => {
      const [px, py] = toCanvas(e);
      const hit = RS.engine.hitTest(px, py);
      if (hit && hit.type === 'text') PM.editText(hit.id);
    });
    RS.on('tool', () => { overlay.style.cursor = ''; });
    layout();
    updateTC();
  };

  function updateTC() {
    if (document.activeElement !== tcEl) tcEl.value = RS.fmtTC(S.playhead, RS.fps());
    durEl.textContent = RS.fmtTC(RS.seqDuration(), RS.fps());
  }

  let scale = 1; // screen px per canvas px
  function layout() {
    const { width: W, height: H } = S.project.settings;
    const mc = RS.engine.mcView;
    stage.classList.toggle('mc', mc);
    if (mc) {
      const dpr = window.devicePixelRatio || 1;
      const gw = Math.floor(stage.clientWidth / 2) - 12, gh = stage.clientHeight - 16;
      mcCanvas.style.width = gw + 'px'; mcCanvas.style.height = gh + 'px';
      mcCanvas.width = Math.round(gw * dpr); mcCanvas.height = Math.round(gh * dpr);
    }
    const sw = (mc ? Math.floor(stage.clientWidth / 2) : stage.clientWidth) - 16, sh = stage.clientHeight - 16;
    if (sw <= 0 || sh <= 0) return;
    const fit = Math.min(sw / W, sh / H);
    const z = zoomSel.value === 'Fit' ? fit : parseInt(zoomSel.value, 10) / 100;
    scale = z;
    const dw = Math.round(W * z), dh = Math.round(H * z);
    wrap.style.width = dw + 'px';
    wrap.style.height = dh + 'px';
    stage.classList.toggle('scrollable', z > fit + 1e-6);
    const dpr = window.devicePixelRatio || 1;
    overlay.width = Math.round(dw * dpr);
    overlay.height = Math.round(dh * dpr);
    drawOverlay();
  }

  function selectedVisual() {
    const sel = RS.selectedClips().filter(RS.isVisual);
    if (sel.length !== 1) return null;
    const c = sel[0];
    if (S.playhead < c.start || S.playhead >= RS.clipEnd(c)) return null;
    return c;
  }

  function corners(b) {
    const cos = Math.cos(b.rot), sin = Math.sin(b.rot);
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
      const x = sx * b.w / 2, y = sy * b.h / 2;
      return [b.cx + x * cos - y * sin, b.cy + x * sin + y * cos];
    });
  }

  function drawOverlay() {
    if (!overlay) return;
    const g = overlay.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, overlay.width, overlay.height);
    g.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    const { width: W, height: H } = S.project.settings;
    if (showSafe) {
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 1 / scale;
      g.strokeRect(W * 0.05, H * 0.05, W * 0.9, H * 0.9);
      g.strokeRect(W * 0.1, H * 0.1, W * 0.8, H * 0.8);
    }
    if (shapePreview) {
      const { x1, y1, x2, y2, kind } = shapePreview;
      g.strokeStyle = '#f0a83a';
      g.lineWidth = 1.5 / scale;
      g.setLineDash([6 / scale, 4 / scale]);
      g.beginPath();
      if (kind === 'ellipse') g.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2);
      else g.rect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      g.stroke();
      g.setLineDash([]);
    }
    if (S.playing) return;
    const c = selectedVisual();
    const b = c && RS.engine.bounds.get(c.id);
    if (!b) return;
    // masks of the selected clip
    const lt = RS.clamp(S.playhead - c.start, 0, c.duration);
    for (const mask of c.masks || []) {
      const active = S.activeMask && S.activeMask.clipId === c.id && S.activeMask.maskId === mask.id;
      const m = RS.engine.maskAt(mask, lt);
      g.strokeStyle = active ? '#ffd23f' : 'rgba(255,210,63,0.45)';
      g.lineWidth = (active ? 1.6 : 1) / scale;
      g.beginPath();
      maskOutline(m).forEach(([u, v], i) => { const [x, y] = toSeq(b, u, v); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
      g.closePath();
      g.stroke();
      if (active) {
        const hs = 6 / scale;
        for (const hd of maskHandles(m)) { const [x, y] = toSeq(b, hd.u, hd.v); g.fillStyle = '#ffd23f'; g.fillRect(x - hs / 2, y - hs / 2, hs, hs); }
      }
    }
    if (pen && pen.clipId === c.id) {
      g.strokeStyle = '#ffd23f'; g.fillStyle = '#ffd23f'; g.lineWidth = 1.5 / scale;
      g.beginPath();
      pen.pts.forEach(([u, v], i) => { const [x, y] = toSeq(b, u, v); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
      g.stroke();
      for (const [u, v] of pen.pts) { const [x, y] = toSeq(b, u, v); g.beginPath(); g.arc(x, y, 4 / scale, 0, Math.PI * 2); g.fill(); }
    }
    const pts = corners(b);
    g.strokeStyle = '#4fc3f7';
    g.lineWidth = 1.5 / scale;
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.stroke();
    const hs = 7 / scale;
    g.fillStyle = '#fff';
    for (const [x, y] of pts) { g.fillRect(x - hs / 2, y - hs / 2, hs, hs); g.strokeRect(x - hs / 2, y - hs / 2, hs, hs); }
    g.beginPath();
    g.arc(b.cx, b.cy, 4 / scale, 0, Math.PI * 2);
    g.stroke();
  }

  function toCanvas(e) {
    const r = overlay.getBoundingClientRect();
    return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale];
  }

  function handleAt(px, py, c) {
    const b = c && RS.engine.bounds.get(c.id);
    if (!b) return -1;
    const tol = 10 / scale;
    return corners(b).findIndex(([x, y]) => Math.abs(x - px) < tol && Math.abs(y - py) < tol);
  }

  function onHover(e) {
    if (S.tool === 'type') { overlay.style.cursor = 'text'; return; }
    if (S.tool === 'pen') { overlay.style.cursor = 'crosshair'; return; }
    if (S.tool === 'rect' || S.tool === 'ellipse') { overlay.style.cursor = 'crosshair'; return; }
    if (S.playing) { overlay.style.cursor = ''; return; }
    const [px, py] = toCanvas(e);
    const c = selectedVisual();
    if (handleAt(px, py, c) >= 0) overlay.style.cursor = 'nwse-resize';
    else if (RS.engine.hitTest(px, py)) overlay.style.cursor = 'move';
    else overlay.style.cursor = 'default';
  }

  function onDown(e) {
    if (e.button !== 0) return;
    RS.setActivePanel('program');
    if (S.playing) RS.engine.pause();
    if (picking) { e.preventDefault(); finishPick(e); return; }
    // A click while a title is being typed finishes that title first.
    if (PM.finishText) { e.preventDefault(); PM.finishText(); return; }
    const [px, py] = toCanvas(e);
    if (S.tool === 'type') { e.preventDefault(); createTextAt(px, py); return; } // keep focus for the text box
    if (S.tool === 'rect' || S.tool === 'ellipse') { startShape(e, px, py, S.tool); return; }
    if (S.tool === 'pen') { penClick(px, py); return; }
    if (S.activeMask && maskDown(e, px, py)) return;
    let c = selectedVisual();
    const handle = handleAt(px, py, c);
    if (handle < 0) {
      const hit = RS.engine.hitTest(px, py);
      if (!hit) { RS.select([]); return; }
      if (!c || hit.id !== c.id) { RS.select(RS.withLinked([hit]).map((x) => x.id)); c = hit; }
    }
    if (RS.trackLocked(c.trackId)) return;
    const id = c.id;
    const lt = RS.clamp(S.playhead - c.start, 0, c.duration);
    const sx = RS.getProp(c, 'x', lt), sy = RS.getProp(c, 'y', lt), ss = RS.getProp(c, 'scale', lt);
    const b0 = RS.engine.bounds.get(id);
    const d0 = b0 ? Math.hypot(px - b0.cx, py - b0.cy) : 1;
    const { width: W, height: H } = S.project.settings;
    overlay.setPointerCapture(e.pointerId);
    let moved = false;
    const mv = (ev) => {
      const [qx, qy] = toCanvas(ev);
      if (!moved && Math.hypot(qx - px, qy - py) * scale < 2) return;
      if (!moved) RS.beginEdit();
      moved = true;
      const cc = RS.getClip(id);
      if (!cc) return;
      if (handle >= 0) {
        const d = Math.hypot(qx - b0.cx, qy - b0.cy);
        RS.setPropAt(cc, 'scale', Math.max(1, +(ss * d / (d0 || 1)).toFixed(2)), lt);
      } else {
        let nx = sx + (qx - px), ny = sy + (qy - py);
        if (!ev.shiftKey) {
          // snap to centre and frame edges
          const b = RS.engine.bounds.get(id) || b0;
          const snap = 12 / scale;
          if (Math.abs(nx) < snap) nx = 0;
          if (Math.abs(ny) < snap) ny = 0;
          if (b) {
            const halfW = b.w / 2, halfH = b.h / 2;
            if (Math.abs(W / 2 + nx - halfW) < snap) nx = halfW - W / 2;
            if (Math.abs(W / 2 + nx + halfW - W) < snap) nx = W / 2 - halfW;
            if (Math.abs(H / 2 + ny - halfH) < snap) ny = halfH - H / 2;
            if (Math.abs(H / 2 + ny + halfH - H) < snap) ny = H / 2 - halfH;
          }
        }
        RS.setPropAt(cc, 'x', Math.round(nx), lt);
        RS.setPropAt(cc, 'y', Math.round(ny), lt);
      }
      RS.engine.invalidate();
      RS.inspector.refresh();
    };
    const up = () => {
      overlay.removeEventListener('pointermove', mv);
      overlay.removeEventListener('pointerup', up);
      if (moved) RS.endEdit(handle >= 0 ? 'Scale' : 'Position');
    };
    overlay.addEventListener('pointermove', mv);
    overlay.addEventListener('pointerup', up);
  }

  // ---------- eyedropper (Ultra Key colour) ----------
  let picking = null;
  PM.pickColor = (clipId, cb) => {
    picking = { clipId, cb };
    overlay.style.cursor = 'crosshair';
    RS.toast('Click the background colour in the Program monitor', 'info', 3000);
  };
  function finishPick(e) {
    const { clipId, cb } = picking;
    picking = null;
    overlay.style.cursor = '';
    const c = RS.getClip(clipId);
    // sample the picture with the key switched off so the original colour is read
    const wasOn = c && c.key ? c.key.on : null;
    if (c && c.key) c.key.on = false;
    RS.engine.render(S.playhead);
    const r = overlay.getBoundingClientRect();
    const cv = RS.engine.canvas;
    const x = Math.round((e.clientX - r.left) / r.width * cv.width), y = Math.round((e.clientY - r.top) / r.height * cv.height);
    const d = cv.getContext('2d').getImageData(RS.clamp(x, 0, cv.width - 1), RS.clamp(y, 0, cv.height - 1), 1, 1).data;
    if (c && c.key) c.key.on = wasOn;
    RS.engine.invalidate();
    cb('#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join(''));
  }

  // ---------- masks: geometry helpers, editing, pen tool ----------
  function toLocal(b, px, py) {
    const dx = px - b.cx, dy = py - b.cy;
    const cs = Math.cos(-b.rot), sn = Math.sin(-b.rot);
    return [(dx * cs - dy * sn) / b.w + 0.5, (dx * sn + dy * cs) / b.h + 0.5];
  }
  function toSeq(b, u, v) {
    const x = (u - 0.5) * b.w, y = (v - 0.5) * b.h;
    const cs = Math.cos(b.rot), sn = Math.sin(b.rot);
    return [b.cx + x * cs - y * sn, b.cy + x * sn + y * cs];
  }
  function maskOutline(m) {
    if (m.kind === 'poly') return m.pts;
    if (m.kind === 'ellipse') { const o = []; for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; o.push([m.cx + Math.cos(a) * m.w / 2, m.cy + Math.sin(a) * m.h / 2]); } return o; }
    return [[m.cx - m.w / 2, m.cy - m.h / 2], [m.cx + m.w / 2, m.cy - m.h / 2], [m.cx + m.w / 2, m.cy + m.h / 2], [m.cx - m.w / 2, m.cy + m.h / 2]];
  }
  function maskHandles(m) {
    if (m.kind === 'poly') return m.pts.map(([u, v], i) => ({ id: 'p' + i, u, v }));
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy], i) => ({ id: 'c' + i, u: m.cx + sx * m.w / 2, v: m.cy + sy * m.h / 2, sx, sy }));
  }

  function maskDown(e, px, py) {
    const { clipId, maskId } = S.activeMask;
    const c = RS.getClip(clipId);
    const b = c && RS.engine.bounds.get(c.id);
    const mask0 = c && (c.masks || []).find((m) => m.id === maskId);
    if (!b || !mask0 || RS.trackLocked(c.trackId)) return false;
    const lt = RS.clamp(S.playhead - c.start, 0, c.duration);
    const m = RS.engine.maskAt(mask0, lt);
    const tol = 9 / scale;
    const hd = maskHandles(m).find((h) => { const [x, y] = toSeq(b, h.u, h.v); return Math.hypot(x - px, y - py) < tol; });
    const [u0, v0] = toLocal(b, px, py);
    const pts = maskOutline(m);
    const inside = pts.length && u0 >= Math.min(...pts.map((p) => p[0])) && u0 <= Math.max(...pts.map((p) => p[0])) && v0 >= Math.min(...pts.map((p) => p[1])) && v0 <= Math.max(...pts.map((p) => p[1]));
    if (!hd && !inside) return false;
    const orig = JSON.parse(JSON.stringify(mask0));
    overlay.setPointerCapture(e.pointerId);
    let moved = false;
    const mv = (ev) => {
      const [qx, qy] = toCanvas(ev);
      const [u, v] = toLocal(b, qx, qy);
      if (!moved) RS.beginEdit();
      moved = true;
      const mk = (RS.getClip(clipId).masks || []).find((x) => x.id === maskId);
      if (!mk) return;
      const du = u - u0, dv = v - v0;
      if (hd && hd.id[0] === 'p') {
        const i = +hd.id.slice(1);
        mk.pts[i] = [orig.pts[i][0] + du, orig.pts[i][1] + dv];
      } else if (hd) {
        // corner drag: the opposite corner stays put
        const oppU = m.cx - hd.sx * m.w / 2, oppV = m.cy - hd.sy * m.h / 2;
        const offU = m.cx - orig.cx, offV = m.cy - orig.cy;
        const cu = hd.u + du, cv = hd.v + dv;
        mk.w = Math.max(0.01, Math.abs(cu - oppU));
        mk.h = Math.max(0.01, Math.abs(cv - oppV));
        mk.cx = (cu + oppU) / 2 - offU;
        mk.cy = (cv + oppV) / 2 - offV;
      } else if (mk.kind === 'poly') {
        mk.pts = orig.pts.map(([a, c2]) => [a + du, c2 + dv]);
      } else { mk.cx = orig.cx + du; mk.cy = orig.cy + dv; }
      RS.engine.invalidate();
      drawOverlay();
    };
    const up = () => {
      overlay.removeEventListener('pointermove', mv);
      overlay.removeEventListener('pointerup', up);
      if (moved) RS.endEdit('Edit mask');
    };
    overlay.addEventListener('pointermove', mv);
    overlay.addEventListener('pointerup', up);
    return true;
  }

  let pen = null; // { clipId, pts: [[u,v]] }
  function penClick(px, py) {
    let c = selectedVisual();
    if (!c) {
      const hit = RS.engine.hitTest(px, py);
      if (hit) { RS.select([hit.id]); c = hit; }
    }
    if (!c) return RS.toast('Pen tool: select a clip under the playhead, then click points to draw a mask');
    const b = RS.engine.bounds.get(c.id);
    if (!b) return;
    const [u, v] = toLocal(b, px, py);
    if (!pen || pen.clipId !== c.id) pen = { clipId: c.id, pts: [] };
    if (pen.pts.length >= 3) {
      const [fx, fy] = toSeq(b, pen.pts[0][0], pen.pts[0][1]);
      if (Math.hypot(fx - px, fy - py) * scale < 10) { PM.penKey('Enter'); return; }
    }
    pen.pts.push([u, v]);
    drawOverlay();
  }
  PM.penActive = () => !!pen;
  PM.penKey = (k) => {
    if (!pen) return false;
    if (k === 'Escape') { pen = null; drawOverlay(); return true; }
    if (k === 'Enter') {
      if (pen.pts.length < 3) { RS.toast('A mask needs at least 3 points'); return true; }
      const { clipId, pts } = pen;
      pen = null;
      const id = RS.uid('mask');
      RS.commit('Add pen mask', () => { const c = RS.getClip(clipId); c.masks = c.masks || []; c.masks.push({ id, kind: 'poly', pts, feather: 8, expansion: 0, opacity: 100, invert: false }); });
      S.activeMask = { clipId, maskId: id };
      RS.timeline.setTool('select');
      return true;
    }
    return false;
  };

  // ---------- multi-camera view ----------
  PM.toggleMulticam = () => {
    RS.engine.mcView = !RS.engine.mcView;
    mcBtn.classList.toggle('on', RS.engine.mcView);
    layout();
    RS.engine.invalidate();
    if (RS.engine.mcView && !RS.engine.multicamClipAt(S.playhead)) RS.toast('Move the playhead over a multicam clip to see its angles');
  };
  const tileCanvases = [];
  function drawGrid() {
    const g = mcCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = mcCanvas.width / dpr, H = mcCanvas.height / dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0b0c0e';
    g.fillRect(0, 0, W, H);
    mcTiles = [];
    const c = RS.engine.multicamClipAt(S.playhead);
    if (!c) {
      g.fillStyle = '#6f7784'; g.font = '12px -apple-system, sans-serif'; g.textAlign = 'center';
      g.fillText('No multi-camera clip at the playhead', W / 2, H / 2);
      g.textAlign = 'start';
      return;
    }
    const inner = RS.getSequence(c.seqId);
    const n = RS.tracksOf('video', inner).length;
    const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
    const ar = inner.settings.width / inner.settings.height;
    const tw = Math.floor(Math.min((W - (cols + 1) * 6) / cols, ((H - (rows + 1) * 6) / rows) * ar));
    const th = Math.floor(tw / ar);
    const ox = (W - (cols * tw + (cols - 1) * 6)) / 2, oy = (H - (rows * th + (rows - 1) * 6)) / 2;
    for (let i = 0; i < n; i++) {
      const x = ox + (i % cols) * (tw + 6), y = oy + Math.floor(i / cols) * (th + 6);
      let tc = tileCanvases[i];
      if (!tc) tc = tileCanvases[i] = document.createElement('canvas');
      if (tc.width !== Math.round(tw * dpr)) tc.width = Math.round(tw * dpr);
      if (tc.height !== Math.round(th * dpr)) tc.height = Math.round(th * dpr);
      RS.engine.renderAngle(tc.getContext('2d'), tc.width, tc.height, c, i, S.playhead);
      g.drawImage(tc, x, y, tw, th);
      const on = (c.angle || 0) === i;
      g.lineWidth = on ? 3 : 1;
      g.strokeStyle = on ? (S.playing ? '#ff5a5f' : '#ffd23f') : 'rgba(255,255,255,0.25)';
      g.strokeRect(x + 0.5, y + 0.5, tw - 1, th - 1);
      g.fillStyle = 'rgba(0,0,0,0.6)';
      g.fillRect(x + 4, y + 4, 52, 16);
      g.fillStyle = on ? '#ffd23f' : '#e4e7ec';
      g.font = '600 10px -apple-system, sans-serif';
      g.fillText('Camera ' + (i + 1), x + 8, y + 15);
      mcTiles.push({ i, x, y, w: tw, h: th });
    }
  }

  // ---------- Type tool & inline text editing ----------
  function createTextAt(px, py) {
    const hit = RS.engine.hitTest(px, py);
    if (hit && hit.type === 'text') { RS.select([hit.id]); PM.editText(hit.id); return; }
    const { width: W, height: H } = S.project.settings;
    const fps = RS.fps();
    const t = RS.frameRound(S.playhead, fps), d = 5;
    RS.beginEdit();
    const tr = RS.ops.freeVideoTrack(t, t + d, 1);
    const c = RS.makeClip({
      type: 'text', trackId: tr.id, start: t, duration: d,
      text: { content: '', size: Math.max(24, Math.round(H * 0.075)), shadow: true },
      props: { x: Math.round(px - W / 2), y: Math.round(py - H / 2) },
    });
    S.project.clips.push(c);
    S.selection = new Set([c.id]);
    RS.emit('selection');
    RS.emit('change', { source: 'inspector-live' });
    PM.editText(c.id, true);
  }

  PM.editText = (id, isNew) => {
    const c = RS.getClip(id);
    if (!c || c.type !== 'text') return;
    if (S.playing) RS.engine.pause();
    if (PM.finishText) PM.finishText();
    if (!isNew) RS.beginEdit();
    const { width: W, height: H } = S.project.settings;
    const lt = RS.clamp(S.playhead - c.start, 0, c.duration);
    const cx = W / 2 + RS.getProp(c, 'x', lt), cy = H / 2 + RS.getProp(c, 'y', lt);
    const sc = RS.getProp(c, 'scale', lt) / 100;
    const tx = c.text;
    const ta = RS.h('textarea', { class: 'inline-text', spellcheck: false, placeholder: 'Type here' });
    ta.value = tx.content;
    Object.assign(ta.style, {
      left: (cx * scale) + 'px', top: (cy * scale) + 'px',
      font: RS.engine.fontCSS(tx, Math.max(8, tx.size * sc * scale)),
      lineHeight: String(tx.lineHeight || 1.15),
      color: tx.color, textAlign: tx.align,
    });
    RS.engine.editingId = id;
    RS.engine.invalidate();
    ta.addEventListener('input', () => {
      const x = RS.getClip(id);
      if (!x) return;
      x.text.content = ta.value;
      RS.emit('change', { source: 'inspector-live' });
      RS.inspector.refresh();
    });
    ta.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); ta.blur(); }
    });
    ta.addEventListener('pointerdown', (e) => e.stopPropagation());
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      PM.finishText = null;
      ta.remove();
      RS.engine.editingId = null;
      const x = RS.getClip(id);
      if (x && !x.text.content.trim()) {
        if (isNew) RS.cancelEdit();
        else { RS.ops.removeClip(id); RS.endEdit('Delete title'); }
      } else RS.endEdit(isNew ? 'Add title' : 'Edit text');
      RS.engine.invalidate();
      if (isNew) RS.timeline.setTool('select');
    };
    PM.finishText = finish;
    ta.addEventListener('blur', () => { if (ta.isConnected) finish(); });
    wrap.append(ta);
    // Focus reliably: retry over a few frames in case the click's default action moved focus.
    let tries = 0;
    const grab = () => { if (done) return; if (document.activeElement !== ta) { ta.focus(); ta.select(); } if (++tries < 6) requestAnimationFrame(grab); };
    setTimeout(grab, 0);
  };

  // ---------- Rectangle / Ellipse tools ----------
  let shapePreview = null;
  function startShape(e, px, py, kind) {
    overlay.setPointerCapture(e.pointerId);
    shapePreview = { x1: px, y1: py, x2: px, y2: py, kind };
    const mv = (ev) => {
      let [qx, qy] = toCanvas(ev);
      if (ev.shiftKey) { const s = Math.max(Math.abs(qx - px), Math.abs(qy - py)); qx = px + Math.sign(qx - px || 1) * s; qy = py + Math.sign(qy - py || 1) * s; }
      shapePreview.x2 = qx; shapePreview.y2 = qy;
      drawOverlay();
    };
    const up = () => {
      overlay.removeEventListener('pointermove', mv);
      overlay.removeEventListener('pointerup', up);
      const { x1, y1, x2, y2 } = shapePreview;
      shapePreview = null;
      const { width: W, height: H } = S.project.settings;
      let w = Math.abs(x2 - x1), h = Math.abs(y2 - y1), cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
      if (w * scale < 6 || h * scale < 6) { w = Math.round(W * 0.3); h = kind === 'ellipse' ? w : Math.round(H * 0.25); cx = x1; cy = y1; }
      const fps = RS.fps();
      const t = RS.frameRound(S.playhead, fps), d = 5;
      RS.commit(kind === 'ellipse' ? 'Add ellipse' : 'Add rectangle', () => {
        const tr = RS.ops.freeVideoTrack(t, t + d, 1);
        const c = RS.makeClip({ type: 'shape', trackId: tr.id, start: t, duration: d, shape: { kind, w: Math.round(w), h: Math.round(h) }, props: { x: Math.round(cx - W / 2), y: Math.round(cy - H / 2) } });
        S.project.clips.push(c);
        S.selection = new Set([c.id]);
      });
      RS.emit('selection');
      RS.timeline.setTool('select');
      drawOverlay();
    };
    overlay.addEventListener('pointermove', mv);
    overlay.addEventListener('pointerup', up);
  }

  PM.canvas = () => canvas;
})(window.RS);
