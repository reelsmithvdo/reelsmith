'use strict';
// Library: essential animated graphics for creators (subscribe, like, comment, bell, follow, share,
// click cursor, arrow, progress bar). Drawn with code every frame (no image/video files), so they stay
// sharp at any size, add almost nothing to the app size, and every colour and label is editable.
(function (RS) {
  const S = RS.state;
  const L = RS.library = {};

  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
  const backOut = (x) => { x = clamp01(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const pill = (g, x, y, w, h) => { const r = h / 2; g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const font = (px, w = 800) => `${w} ${px}px "Avenir Next", "Helvetica Neue", Arial, sans-serif`;

  // ---------- icons (original, simple shapes) ----------
  function thumb(g, x, y, s, color) {
    g.save(); g.translate(x, y); g.scale(s / 100, s / 100); g.fillStyle = color;
    g.beginPath(); g.roundRect(4, 44, 20, 50, 5); g.fill();                    // cuff
    g.beginPath();                                                             // hand + thumb
    g.moveTo(30, 46); g.lineTo(48, 10); g.quadraticCurveTo(52, 2, 60, 6); g.quadraticCurveTo(68, 12, 64, 26);
    g.lineTo(60, 40); g.lineTo(88, 40); g.quadraticCurveTo(98, 42, 96, 54); g.lineTo(88, 86); g.quadraticCurveTo(85, 94, 76, 94);
    g.lineTo(30, 94); g.closePath(); g.fill();
    g.restore();
  }
  function bubble(g, x, y, s, color) {
    g.save(); g.translate(x, y); g.scale(s / 100, s / 100); g.fillStyle = color;
    g.beginPath(); g.roundRect(4, 8, 92, 66, 18); g.fill();
    g.beginPath(); g.moveTo(22, 70); g.lineTo(16, 94); g.lineTo(44, 72); g.closePath(); g.fill();
    g.restore();
  }
  function bell(g, x, y, s, color, swing) {
    g.save(); g.translate(x + s / 2, y + s * 0.08); g.rotate(swing || 0); g.scale(s / 100, s / 100); g.translate(-50, -8); g.fillStyle = color;
    g.beginPath(); g.arc(50, 10, 7, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(50, 14); g.bezierCurveTo(22, 14, 24, 42, 22, 60); g.lineTo(12, 76); g.lineTo(88, 76); g.lineTo(78, 60); g.bezierCurveTo(76, 42, 78, 14, 50, 14); g.fill();
    g.beginPath(); g.arc(50, 82, 10, 0, Math.PI); g.fill();
    g.restore();
  }
  function shareIcon(g, x, y, s, color) {
    g.save(); g.translate(x, y); g.scale(s / 100, s / 100); g.fillStyle = color;
    g.beginPath(); g.moveTo(58, 10); g.lineTo(94, 46); g.lineTo(58, 82); g.lineTo(58, 62); g.quadraticCurveTo(22, 60, 6, 88); g.quadraticCurveTo(10, 40, 58, 30); g.closePath(); g.fill();
    g.restore();
  }
  function cursor(g, x, y, s, pressed) {
    g.save(); g.translate(x, y); const k = (s / 100) * (pressed ? 0.88 : 1); g.scale(k, k);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 74); g.lineTo(18, 58); g.lineTo(31, 88); g.lineTo(44, 82); g.lineTo(31, 53); g.lineTo(54, 53); g.closePath();
    g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#111'; g.lineJoin = 'round'; g.stroke();
    g.restore();
  }
  function ripple(g, x, y, t, r) { if (t < 0 || t > 1) return; g.save(); g.globalAlpha = 1 - t; g.strokeStyle = '#ffffff'; g.lineWidth = 6 * (1 - t) + 1; g.beginPath(); g.arc(x, y, r * (0.3 + t), 0, Math.PI * 2); g.stroke(); g.restore(); }
  function shadowOn(g) { g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 18; g.shadowOffsetY = 6; }
  function shadowOff(g) { g.shadowColor = 'transparent'; }

  // A labelled button that gets "clicked" at time tc: pops in, cursor arrives and taps, state changes.
  function button(g, cx, cy, w, h, l, o) {
    const appear = backOut((l - (o.delay || 0)) / 0.45);
    if (appear <= 0) return;
    const clicked = o.tc != null && l >= o.tc;
    const press = o.tc != null ? 1 - 0.08 * Math.max(0, 1 - Math.abs(l - o.tc) / 0.12) : 1;
    g.save(); g.translate(cx, cy); g.scale(appear * press, appear * press);
    shadowOn(g);
    pill(g, -w / 2, -h / 2, w, h); g.fillStyle = clicked ? (o.doneColor || '#3a3f48') : o.color; g.fill();
    shadowOff(g);
    const iconS = h * 0.56;
    const label = clicked ? (o.doneText || o.text) : o.text;
    g.font = font(Math.round(h * 0.38)); g.textBaseline = 'middle'; g.fillStyle = o.textColor || '#fff';
    const tw = g.measureText(label).width;
    const total = (o.icon ? iconS + h * 0.18 : 0) + tw;
    let x = -total / 2;
    if (o.icon) { o.icon(g, x, -iconS / 2, iconS, o.iconColor || '#fff', clicked); x += iconS + h * 0.18; }
    g.fillText(label, x, 2);
    g.restore();
  }

  // ---------- items ----------
  // size: design canvas (1080p); place: default position as fractions of the frame; dur: seconds.
  L.ITEMS = [
    { id: 'subscribe', name: 'Subscribe Button', dur: 4, sound: 'subBell', size: [700, 260], place: [0, 0.32], g: { text: 'SUBSCRIBE', done: 'SUBSCRIBED', color: '#e5243b' },
      draw(g, l, w, h, p) {
        const tc = 1.5;
        button(g, w * 0.42, h / 2, 430, 110, l, { text: p.text, doneText: p.done, color: p.color, tc });
        // bell next to it after subscribing
        const b = backOut((l - tc - 0.15) / 0.4);
        if (b > 0) { g.save(); g.translate(w * 0.86, h / 2); g.scale(b, b); shadowOn(g); g.beginPath(); g.arc(0, 0, 55, 0, Math.PI * 2); g.fillStyle = '#3a3f48'; g.fill(); shadowOff(g); bell(g, -32, -30, 64, '#fff', Math.sin((l - tc) * 14) * 0.35 * Math.max(0, 1 - (l - tc - 0.3) / 1.2)); g.restore(); }
        cursorPath(g, l, [w + 40, h + 120], [w * 0.5, h * 0.62], tc);
        ripple(g, w * 0.5, h * 0.5, (l - tc) / 0.5, 90);
      } },
    { id: 'like', name: 'Like Button', dur: 3, size: [460, 260], place: [-0.3, 0.32], g: { text: 'LIKE', color: '#2f3a4a', accent: '#1e88ff' },
      draw(g, l, w, h, p) {
        const tc = 1.2;
        button(g, w / 2, h / 2, 330, 110, l, { text: p.text, color: p.color, doneColor: p.accent, tc, icon: (gg, x, y, s, c) => thumb(gg, x, y, s, c) });
        if (l > tc) { const t = clamp01((l - tc) / 0.9); g.save(); g.globalAlpha = 1 - t; g.font = font(44); g.fillStyle = p.accent; g.textAlign = 'center'; g.fillText('+1', w * 0.78, h * 0.32 - t * 70); g.restore(); }
        cursorPath(g, l, [w + 40, h + 100], [w * 0.52, h * 0.6], tc);
        ripple(g, w * 0.5, h * 0.5, (l - tc) / 0.5, 80);
      } },
    { id: 'comment', name: 'Comment Button', dur: 3, size: [560, 260], place: [0, 0.32], g: { text: 'COMMENT', color: '#2f3a4a', accent: '#ffb020' },
      draw(g, l, w, h, p) {
        button(g, w / 2, h / 2, 420, 110, l, { text: p.text, color: p.color, icon: (gg, x, y, s, c) => {
          bubble(gg, x, y, s, p.accent);
          for (let i = 0; i < 3; i++) { const k = Math.max(0, Math.sin(l * 8 - i * 0.9)); gg.beginPath(); gg.arc(x + s * (0.3 + i * 0.2), y + s * 0.42 - k * s * 0.06, s * 0.065, 0, Math.PI * 2); gg.fillStyle = '#2f3a4a'; gg.fill(); }
        } });
      } },
    { id: 'bell', name: 'Notification Bell', dur: 3, size: [260, 260], place: [0.38, -0.3], g: { color: '#ffffff', accent: '#e5243b' },
      draw(g, l, w, h, p) {
        const a = backOut(l / 0.4);
        if (a <= 0) return;
        g.save(); g.translate(w / 2, h / 2); g.scale(a, a); g.translate(-w / 2, -h / 2);
        const sw = Math.sin(l * 12) * 0.4 * Math.max(0, Math.sin(Math.PI * clamp01((l % 1.6) / 1.1)));
        shadowOn(g); bell(g, w * 0.2, h * 0.16, w * 0.6, p.color, sw); shadowOff(g);
        // ring lines
        const k = Math.abs(sw) / 0.4;
        g.strokeStyle = p.color; g.lineWidth = 7; g.lineCap = 'round'; g.globalAlpha = k;
        for (const sgn of [-1, 1]) { g.beginPath(); g.arc(w / 2, h * 0.42, w * 0.4, sgn < 0 ? Math.PI * 1.08 : -Math.PI * 0.32, sgn < 0 ? Math.PI * 1.32 : -Math.PI * 0.08); g.stroke(); }
        g.globalAlpha = 1;
        g.beginPath(); g.arc(w * 0.7, h * 0.24, w * 0.08, 0, Math.PI * 2); g.fillStyle = p.accent; g.fill();
        g.restore();
      } },
    { id: 'combo', name: 'Like · Comment · Subscribe', dur: 5, size: [1500, 260], place: [0, 0.33], g: { color: '#e5243b', accent: '#1e88ff', text: 'SUBSCRIBE', done: 'SUBSCRIBED' },
      draw(g, l, w, h, p) {
        const cy = h / 2, t1 = 1.3, t2 = 2.2, t3 = 3.1;
        button(g, w * 0.17, cy, 300, 100, l, { text: 'LIKE', color: '#2f3a4a', doneColor: p.accent, tc: t1, delay: 0, icon: (gg, x, y, s, c) => thumb(gg, x, y, s, c) });
        button(g, w * 0.45, cy, 380, 100, l, { text: 'COMMENT', color: '#2f3a4a', doneColor: '#ffb020', tc: t2, delay: 0.15, icon: (gg, x, y, s, c) => bubble(gg, x, y, s, c) });
        button(g, w * 0.77, cy, 420, 100, l, { text: p.text, doneText: p.done, color: p.color, tc: t3, delay: 0.3 });
        const pts = [[w * 0.6, h + 150], [w * 0.19, cy + 15], [w * 0.47, cy + 15], [w * 0.79, cy + 15]];
        const times = [0.5, t1, t2, t3];
        let x = pts[3][0], y = pts[3][1];
        for (let i = 0; i < 3; i++) if (l < times[i + 1]) { const u = easeOut((l - times[i]) / (times[i + 1] - times[i] - 0.1)); x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u; y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u; break; }
        if (l > 0.5) cursor(g, x, y, 80, times.slice(1).some((tc) => Math.abs(l - tc) < 0.1));
        for (const tc of times.slice(1)) ripple(g, pts[times.indexOf(tc)][0] - 20, cy, (l - tc) / 0.5, 80);
      } },
    { id: 'follow', name: 'Follow Button', dur: 3, size: [560, 240], place: [0, 0.32], g: { text: '+ FOLLOW', done: '✓ FOLLOWING', color: '#7b5cff' },
      draw(g, l, w, h, p) {
        const tc = 1.3;
        button(g, w / 2, h / 2, 420, 100, l, { text: p.text, doneText: p.done, color: p.color, tc });
        cursorPath(g, l, [w + 40, h + 100], [w * 0.56, h * 0.6], tc);
        ripple(g, w / 2, h / 2, (l - tc) / 0.5, 80);
      } },
    { id: 'share', name: 'Share Button', dur: 3, size: [480, 240], place: [0.3, 0.32], g: { text: 'SHARE', color: '#12b886' },
      draw(g, l, w, h, p) {
        button(g, w / 2, h / 2, 330, 100, l, { text: p.text, color: p.color, icon: (gg, x, y, s, c) => { gg.save(); gg.translate(Math.sin(l * 6) * s * 0.06, 0); shareIcon(gg, x, y, s, c); gg.restore(); } });
      } },
    { id: 'click', name: 'Click Cursor', dur: 2.5, size: [260, 260], place: [0, 0],
      draw(g, l, w, h) {
        const ph = l % 1.25, pressed = ph > 0.55 && ph < 0.7;
        ripple(g, w * 0.36, h * 0.3, (ph - 0.6) / 0.6, 80);
        cursor(g, w * 0.36, h * 0.3, 110, pressed);
      } },
    { id: 'arrow', name: 'Bouncing Arrow', dur: 3, size: [240, 300], place: [0, 0.2], g: { color: '#ffd400', text: '' },
      draw(g, l, w, h, p) {
        const dy = Math.abs(Math.sin(l * Math.PI * 1.6)) * 40, a = clamp01(l / 0.3);
        g.save(); g.globalAlpha = a; g.translate(w / 2, h * 0.2 + dy); shadowOn(g);
        g.fillStyle = p.color; g.beginPath(); g.moveTo(-34, 0); g.lineTo(34, 0); g.lineTo(34, 110); g.lineTo(80, 110); g.lineTo(0, 200); g.lineTo(-80, 110); g.lineTo(-34, 110); g.closePath(); g.fill();
        g.restore();
      } },
    { id: 'progress', name: 'Progress Bar', dur: 10, size: null, place: null, g: { color: '#e5243b' },
      draw(g, l, w, h, p, c) {
        g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, 0, w, h);
        g.fillStyle = p.color; g.fillRect(0, 0, w * clamp01(l / Math.max(0.01, c.duration)), h);
      } },
  ];
  L.item = (id) => L.ITEMS.find((x) => x.id === id);

  // cursor moves in from `from`, reaches `to` slightly before tc, presses at tc
  function cursorPath(g, l, from, to, tc) {
    const t0 = tc - 0.9;
    if (l < t0) return;
    // stay inside the graphic so the pointer is never cut off at its edge; fade in and out
    const fx = Math.min(from[0], g.canvas.width - 60), fy = Math.min(from[1], g.canvas.height - 90);
    const u = easeOut((l - t0) / 0.75);
    const x = fx + (to[0] - fx) * u, y = fy + (to[1] - fy) * u;
    const a = Math.min(clamp01((l - t0) / 0.2), 1 - clamp01((l - tc - 0.5) / 0.35));
    if (a <= 0) return;
    g.save(); g.globalAlpha = a; cursor(g, x, y, 80, Math.abs(l - tc) < 0.1); g.restore();
  }

  // ---------- rendering (called by the engine) ----------
  const frames = new Map();
  L.sizeOf = (c) => {
    const it = L.item(c.graphic.kind);
    if (it && it.size) return it.size;
    const { width: W, height: H } = S.project.settings;
    return [W, Math.max(6, Math.round(H * 0.012))];
  };
  L.frame = (c, l) => {
    const it = L.item(c.graphic.kind);
    const [w, h] = L.sizeOf(c);
    let cv = frames.get(c.id);
    if (!cv) { cv = document.createElement('canvas'); frames.set(c.id, cv); if (frames.size > 60) frames.delete(frames.keys().next().value); }
    if (cv.width !== w) cv.width = w;
    if (cv.height !== h) cv.height = h;
    const g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); g.globalAlpha = 1;
    if (it) { try { it.draw(g, l, w, h, Object.assign({}, it.g || {}, c.graphic), c); } catch (err) { console.warn('library item', err); } }
    return cv;
  };

  // ---------- adding ----------
  // trackId: the video track it was dropped on (used when free there), else the first free track from V2.
  // Items with a sound (Subscribe: click + bell) also get a linked audio clip in sync with the animation.
  // Unlink (⌘L) or Option-click the audio to delete only the sound.
  L.add = async (id, t, trackId) => {
    const it = L.item(id);
    if (!it) return;
    const { width: W, height: H } = S.project.settings;
    t = RS.frameRound(Math.max(0, t), RS.fps());
    let snd = null;
    if (it.sound && RS.creative) { try { snd = await RS.creative.sfxMedia(it.sound); } catch (err) { console.warn('library sound', err); } }
    RS.commit('Add ' + it.name, () => {
      const want = trackId && RS.getTrack(trackId);
      const free = want && want.kind === 'video' && !want.locked && !S.project.clips.some((x) => x.trackId === want.id && x.start < t + it.dur - RS.EPS && RS.clipEnd(x) > t + RS.EPS);
      const tr = free ? want : RS.ops.freeVideoTrack(t, t + it.dur, 1);
      const k = Math.min(W / 1920, H / 1080) * 100; // designed for 1080p; also fits vertical video
      const props = it.size ? { scale: Math.round(k * (H > W ? 1.6 : 1)), x: Math.round((it.place[0]) * W), y: Math.round(it.place[1] * H) } : { y: Math.round(H / 2 - H * 0.006) };
      const c = RS.makeClip({ type: 'graphic', trackId: tr.id, start: t, duration: it.dur, props });
      c.graphic = Object.assign({ kind: id }, JSON.parse(JSON.stringify(it.g || {})));
      S.project.clips.push(c);
      S.selection = new Set([c.id]);
      if (snd) {
        const d = Math.min(snd.duration, it.dur);
        let at = RS.tracksOf('audio').find((x) => !x.locked && !S.project.clips.some((y) => y.trackId === x.id && y.start < t + d - RS.EPS && RS.clipEnd(y) > t + RS.EPS));
        if (!at) at = RS.ops.addTrack('audio');
        c.linkId = RS.uid('L');
        const a = RS.makeClip({ type: 'audio', mediaId: snd.id, trackId: at.id, start: t, in: 0, duration: d, linkId: c.linkId });
        S.project.clips.push(a);
        S.selection.add(a.id);
      }
    });
    if (S.playhead < t || S.playhead > t + it.dur) RS.engine.seek(t + 0.05);
    RS.emit('show-tab', 'effectControls');
  };

  // ---------- Library panel ----------
  L.init = (el) => {
    const grid = RS.h('div', { class: 'lib-grid' });
    const thumbs = [];
    for (const it of L.ITEMS) {
      const cv = RS.h('canvas', { class: 'lib-thumb', width: 192, height: 108 });
      const card = RS.h('div', { class: 'lib-card', draggable: true, title: 'Double-click to add at the playhead, or drag onto the timeline' }, cv, RS.h('div', { class: 'lib-name' }, it.name));
      const fake = { id: 'lib-thumb-' + it.id, duration: it.dur, graphic: Object.assign({ kind: it.id }, it.g || {}) };
      const paint = (l) => {
        const src = it.size ? L.frame(fake, l) : null;
        const g = cv.getContext('2d');
        g.clearRect(0, 0, cv.width, cv.height);
        g.fillStyle = '#20242b'; g.fillRect(0, 0, cv.width, cv.height);
        if (src) { const k = Math.min(cv.width * 0.9 / src.width, cv.height * 0.85 / src.height); g.drawImage(src, (cv.width - src.width * k) / 2, (cv.height - src.height * k) / 2, src.width * k, src.height * k); }
        else { g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(8, cv.height - 14, cv.width - 16, 6); g.fillStyle = '#e5243b'; g.fillRect(8, cv.height - 14, (cv.width - 16) * ((l / 3) % 1), 6); }
      };
      paint(Math.min(it.dur - 0.2, 2.6));
      let raf = 0, t0 = 0;
      const loop = (now) => { paint(((now - t0) / 1000) % it.dur); raf = requestAnimationFrame(loop); };
      card.addEventListener('mouseenter', () => { t0 = performance.now(); raf = requestAnimationFrame(loop); });
      card.addEventListener('mouseleave', () => { cancelAnimationFrame(raf); paint(Math.min(it.dur - 0.2, 2.6)); });
      card.addEventListener('dblclick', () => L.add(it.id, S.playhead));
      card.addEventListener('dragstart', (e) => { RS.dragPayload = { kind: 'library', id: it.id }; e.dataTransfer.setData('text/plain', it.name); e.dataTransfer.effectAllowed = 'copy'; });
      card.addEventListener('dragend', () => { setTimeout(() => { RS.dragPayload = null; }, 0); });
      thumbs.push(card);
      grid.append(card);
    }
    el.append(RS.h('div', { class: 'lib-note muted small' }, 'Animated graphics — hover to preview, double-click to add at the playhead (or drag onto the timeline). Edit text and colours in Effect Controls.'), grid);
  };
})(window.RS);
