'use strict';
// Creative tools: In/Out/Loop clip animations, live video effects (shake, zoom punch, glitch, RGB split,
// VHS, film grain, light leak, letterbox, glow, background blur, mirror, split screen), one-click filters,
// text styles, title templates, emoji stickers, voice effects, a synthesized sound-effects library and
// automatic music ducking. Everything is rendered by the same engine for playback and export.
(function (RS) {
  const S = RS.state;
  const CR = RS.creative = {};

  // ---------------- easing ----------------
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const backOut = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const bounceOut = (x) => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };
  // Deterministic noise so playback and export look identical.
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const noise1 = (t) => { const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f); return (hash(i) * (1 - u) + hash(i + 1) * u) * 2 - 1; };

  // ---------------- animations ----------------
  CR.ANIM_IN = [
    ['fade', 'Fade In'], ['pop', 'Pop'], ['zoomIn', 'Zoom In'], ['zoomOut', 'Zoom Out (from big)'], ['slideL', 'Slide from Left'],
    ['slideR', 'Slide from Right'], ['slideU', 'Slide Up'], ['slideD', 'Drop Down'], ['rise', 'Fade Up (elegant)'], ['blur', 'Blur In'],
    ['spin', 'Spin In'], ['bounce', 'Bounce In'], ['flip', 'Flip In'], ['stamp', 'Stamp'], ['typewriter', 'Typewriter (text)'],
    ['wordPop', 'Words Pop (text)'], ['wordRise', 'Words Rise (text)'], ['wordSlide', 'Words Slide + Blur (text)'], ['wordBlur', 'Words Focus (text)'],
    ['letterPop', 'Letters Pop (text)'], ['letterDrop', 'Letters Drop (text)'], ['letterFade', 'Letters Fade Up (text)'],
  ];
  CR.ANIM_OUT = [
    ['fade', 'Fade Out'], ['pop', 'Pop Out'], ['zoomIn', 'Shrink Out'], ['zoomOut', 'Zoom Out (grow)'], ['slideL', 'Slide to Left'],
    ['slideR', 'Slide to Right'], ['slideU', 'Slide Down'], ['slideD', 'Lift Up'], ['rise', 'Fade Down'], ['blur', 'Blur Out'],
    ['spin', 'Spin Out'], ['flip', 'Flip Out'], ['typewriter', 'Erase (text)'],
    ['wordPop', 'Words Pop Out (text)'], ['wordRise', 'Words Sink (text)'], ['wordSlide', 'Words Slide Out (text)'], ['wordBlur', 'Words Blur Out (text)'], ['letterFade', 'Letters Fade (text)'],
  ];
  CR.ANIM_LOOP = [['pulse', 'Pulse'], ['heartbeat', 'Heartbeat'], ['wobble', 'Wobble'], ['float', 'Float'], ['jiggle', 'Jiggle'], ['spinLoop', 'Rotate'], ['flicker', 'Flicker'], ['wave', 'Letter Wave (text)'], ['wordBounce', 'Word Bounce (text)']];
  const UNIT = { wordPop: 'word', wordRise: 'word', wordSlide: 'word', wordBlur: 'word', letterPop: 'letter', letterDrop: 'letter', letterFade: 'letter', wave: 'letter', wordBounce: 'word' };
  CR.isUnitAnim = (t) => !!UNIT[t];
  const unitEntry = (type, u, size) => {
    const e = easeOut(u), q = { dx: 0, dy: 0, s: 1, al: 1, blur: 0, r: 0 };
    switch (type) {
      case 'wordPop': case 'letterPop': q.s = Math.max(0, backOut(u)); q.al = Math.min(1, u * 3); break;
      case 'wordRise': q.dy = (1 - e) * size * 0.6; q.al = e; break;
      case 'wordSlide': q.dx = (1 - e) * size * 1.6; q.al = e; q.blur = (1 - e) * size * 0.18; break;
      case 'wordBlur': q.blur = (1 - e) * size * 0.25; q.al = e; q.s = 1.2 - 0.2 * e; break;
      case 'letterDrop': q.dy = -(1 - bounceOut(u)) * size * 1.1; q.al = Math.min(1, u * 4); break;
      case 'letterFade': q.dy = (1 - e) * size * 0.25; q.al = e; break;
      default: break;
    }
    return q;
  };
  // Per-word / per-letter animation for titles: {mode, at(i, n)} or null when nothing moves at l.
  CR.unitAnim = (c, l) => {
    const A = c.anim;
    if (!A || c.type !== 'text') return null;
    const size = (c.text && c.text.size) || 100;
    let ent = null;
    if (A.in && UNIT[A.in.type]) { const d = Math.min(A.in.dur || 1, c.duration * 0.8); if (l < d) ent = { type: A.in.type, d, t: l }; }
    if (!ent && A.out && UNIT[A.out.type]) { const d = Math.min(A.out.dur || 0.6, c.duration * 0.5); if (l > c.duration - d) ent = { type: A.out.type, d, t: c.duration - l, rev: true }; }
    const loop = A.loop && UNIT[A.loop.type] ? A.loop : null;
    if (!ent && !loop) return null;
    const mode = ent ? UNIT[ent.type] : UNIT[loop.type];
    return {
      mode,
      at: (i, n) => {
        let q = { dx: 0, dy: 0, s: 1, al: 1, blur: 0, r: 0 };
        if (ent) {
          const ud = ent.d * 0.45, stag = n > 1 ? (ent.d - ud) / (n - 1) : 0;
          const idx = ent.rev ? n - 1 - i : i; // leave in reverse order
          q = unitEntry(ent.type, clamp01((ent.t - idx * stag) / ud), size);
        }
        if (loop) {
          const t = l * (loop.speed || 1), k = (loop.amount ?? 50) / 50;
          if (loop.type === 'wave') q.dy += Math.sin(t * Math.PI * 2 - i * 0.55) * size * 0.09 * k;
          if (loop.type === 'wordBounce') { const v = Math.max(0, Math.sin(t * Math.PI * 2 - i * 0.9)); q.dy -= v * size * 0.12 * k; q.s *= 1 + v * 0.06 * k; }
        }
        return q;
      },
    };
  };
  const animName = (list, id) => (list.find((x) => x[0] === id) || [id, id])[1];
  CR.animName = animName;

  function applyEntry(m, type, u, W, H) {
    const e = easeOut(u);
    switch (type) {
      case 'fade': m.a *= u; break;
      case 'pop': m.s *= Math.max(0, backOut(u)); m.a *= Math.min(1, u * 3); break;
      case 'zoomIn': m.s *= 0.4 + 0.6 * e; m.a *= e; break;
      case 'zoomOut': m.s *= 1 + (1 - e) * 0.8; m.a *= e; break;
      case 'slideL': m.dx -= (1 - e) * W; break;
      case 'slideR': m.dx += (1 - e) * W; break;
      case 'slideU': m.dy += (1 - e) * H * 0.7; m.a *= Math.min(1, u * 2); break;
      case 'slideD': m.dy -= (1 - e) * H * 0.7; m.a *= Math.min(1, u * 2); break;
      case 'rise': m.dy += (1 - e) * H * 0.06; m.a *= e; break;
      case 'blur': m.blur += (1 - e) * 40; m.a *= e; break;
      case 'spin': m.r -= (1 - e) * 360; m.s *= e; break;
      case 'bounce': m.dy -= (1 - bounceOut(u)) * H * 0.6; break;
      case 'flip': m.sx *= Math.max(0.001, e); break;
      case 'stamp': m.s *= 1 + (1 - e) * 1.6; m.a *= Math.min(1, u * 2.5); break;
      default: break;
    }
  }

  // Motion offsets for a clip at local time l: {dx, dy, s, sx, r (deg), a, blur}.
  CR.motion = (c, l, W, H) => {
    const m = { dx: 0, dy: 0, s: 1, sx: 1, r: 0, a: 1, blur: 0 };
    const A = c.anim;
    if (A) {
      if (A.in && A.in.type !== 'typewriter') {
        const d = Math.min(A.in.dur || 0.5, c.duration / 2);
        if (l < d) applyEntry(m, A.in.type, clamp01(l / d), W, H);
      }
      if (A.out && A.out.type !== 'typewriter') {
        const d = Math.min(A.out.dur || 0.5, c.duration / 2);
        if (l > c.duration - d) applyEntry(m, A.out.type, clamp01((c.duration - l) / d), W, H);
      }
      if (A.loop) {
        const t = l * (A.loop.speed || 1);
        const k = (A.loop.amount ?? 50) / 50;
        switch (A.loop.type) {
          case 'pulse': m.s *= 1 + 0.06 * k * Math.sin(t * Math.PI * 2); break;
          case 'heartbeat': { const ph = t % 1; m.s *= 1 + 0.14 * k * (Math.exp(-Math.pow((ph - 0.1) / 0.05, 2)) + 0.6 * Math.exp(-Math.pow((ph - 0.3) / 0.05, 2))); break; }
          case 'wobble': m.r += 7 * k * Math.sin(t * Math.PI * 2); break;
          case 'float': m.dy += H * 0.015 * k * Math.sin(t * Math.PI); break;
          case 'jiggle': m.dx += W * 0.006 * k * noise1(t * 14); m.dy += H * 0.006 * k * noise1(t * 14 + 50); m.r += 2 * k * noise1(t * 10 + 9); break;
          case 'spinLoop': m.r += 90 * t; break;
          case 'flicker': m.a *= 0.75 + 0.25 * (noise1(t * 18) > -0.6 ? 1 : 0.2); break;
          default: break;
        }
      }
    }
    const V = c.vfx;
    if (V) {
      if (V.shake) {
        const k = (V.shake.amount ?? 50) / 50, t = l * 16;
        m.dx += W * 0.012 * k * noise1(t); m.dy += H * 0.012 * k * noise1(t + 71); m.r += 0.8 * k * noise1(t * 0.7 + 13);
        m.s *= 1 + 0.03 * k; // hide edges
      }
      if (V.punch) {
        const every = V.punch.every || 1, ph = (l % every) / every;
        m.s *= 1 + 0.12 * ((V.punch.amount ?? 50) / 50) * Math.exp(-ph * every * 7);
      }
    }
    if (m.dx === 0 && m.dy === 0 && m.s === 1 && m.sx === 1 && m.r === 0 && m.a === 1 && m.blur === 0) return null;
    return m;
  };

  // Typewriter: number of characters shown at local time l, or null.
  CR.reveal = (c, l) => {
    const A = c.anim;
    if (!A || c.type !== 'text') return null;
    const n = String((c.text && c.text.content) || '').replace(/\*/g, '').length;
    if (A.in && A.in.type === 'typewriter') {
      const d = Math.min(A.in.dur || 1.5, c.duration * 0.8);
      if (l < d) return Math.floor(n * clamp01(l / d));
    }
    if (A.out && A.out.type === 'typewriter') {
      const d = Math.min(A.out.dur || 1, c.duration * 0.5);
      if (l > c.duration - d) return Math.ceil(n * clamp01((c.duration - l) / d));
    }
    return null;
  };

  // ---------------- live video effects ----------------
  CR.VFX = {
    shake: { name: 'Camera Shake', def: { amount: 50 } },
    punch: { name: 'Zoom Punch (beat)', def: { amount: 50, every: 1 } },
    rgb: { name: 'RGB Split', def: { amount: 50 } },
    glitch: { name: 'Glitch', def: { amount: 50 } },
    vhs: { name: 'VHS Retro', def: { amount: 50 } },
    grain: { name: 'Film Grain', def: { amount: 40 } },
    glow: { name: 'Dreamy Glow', def: { amount: 50 } },
    letterbox: { name: 'Cinematic Bars', def: { amount: 100 } },
    leak: { name: 'Light Leak', def: { amount: 60 } },
    flash: { name: 'Flash at Start', def: { amount: 100 } },
    bgblur: { name: 'Background Blur Fill', def: { amount: 60 } },
    mirror: { name: 'Mirror', def: { amount: 100 } },
    split3: { name: 'Split Screen ×3', def: { amount: 100 } },
    vignettePulse: { name: 'Heartbeat Vignette', def: { amount: 60 } },
  };
  const amt = (v) => ((v && v.amount) ?? 50) / 100;

  function tinted(key, src, w, h, color) {
    const cv = RS.engine.workCanvas(key, w, h);
    const g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.filter = 'none';
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, w, h); g.drawImage(src, 0, 0, w, h);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(src, 0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
    return cv;
  }

  const SOURCE_FX = ['rgb', 'glitch', 'vhs', 'glow', 'mirror', 'split3'];
  CR.stylize = (c, s, key, l) => {
    const V = c.vfx;
    if (!SOURCE_FX.some((k) => V[k])) return s;
    const lim = Math.min(1, 1920 / s.w);
    const w = Math.max(2, Math.round(s.w * lim)), h = Math.max(2, Math.round(s.h * lim));
    const cv = RS.engine.workCanvas(key + '#cr', w, h);
    const g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.filter = 'none'; g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, w, h);
    if (V.split3) {
      const tw = w / 3, sw = s.w / 3;
      for (let i = 0; i < 3; i++) g.drawImage(s.src, s.w / 2 - sw / 2, 0, sw, s.h, i * tw, 0, tw, h);
    } else g.drawImage(s.src, 0, 0, w, h);
    if (V.mirror) { g.save(); g.translate(w, 0); g.scale(-1, 1); g.drawImage(cv, 0, 0, w / 2, h, 0, 0, w / 2, h); g.restore(); }
    const frame = Math.floor(l * 24);
    if (V.rgb || V.vhs) {
      const off = Math.max(1, Math.round(w * 0.012 * (V.rgb ? amt(V.rgb) * 2 : amt(V.vhs) * 0.6)));
      const base = RS.engine.workCanvas(key + '#base', w, h);
      const bg = base.getContext('2d'); bg.setTransform(1, 0, 0, 1, 0, 0); bg.clearRect(0, 0, w, h); bg.drawImage(cv, 0, 0);
      const red = tinted(key + '#r', base, w, h, '#ff0000');
      const cyan = tinted(key + '#c', base, w, h, '#00ffff');
      g.clearRect(0, 0, w, h);
      g.globalCompositeOperation = 'lighter';
      g.drawImage(red, -off, 0);
      g.drawImage(cyan, off, 0);
      g.globalCompositeOperation = 'source-over';
    }
    if (V.glitch && hash(frame * 3.1 + 7) < 0.25 + amt(V.glitch) * 0.4) {
      const k = amt(V.glitch);
      const n = 3 + Math.round(hash(frame) * 8 * k);
      for (let i = 0; i < n; i++) {
        const y = hash(frame * 13 + i) * h, bh = (0.02 + hash(frame * 7 + i) * 0.1) * h, dx = (hash(frame * 5 + i * 3) - 0.5) * w * 0.2 * k;
        g.drawImage(cv, 0, y, w, bh, dx, y, w, bh);
      }
    }
    if (V.vhs) {
      const k = amt(V.vhs);
      g.globalAlpha = 0.18 * k; g.fillStyle = '#000';
      for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1.5);
      const by = ((l * 0.25) % 1) * h * 1.2 - h * 0.1;
      g.globalAlpha = 0.12 * k; g.fillStyle = '#fff'; g.fillRect(0, by, w, h * 0.04);
      g.globalAlpha = 1;
      g.font = `bold ${Math.round(h * 0.05)}px Menlo, monospace`; g.fillStyle = 'rgba(255,255,255,0.85)'; g.textBaseline = 'top';
      if (Math.floor(l * 1.5) % 2 === 0) g.fillText('PLAY ▶', w * 0.05, h * 0.06);
    }
    if (V.glow) {
      g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.55 * amt(V.glow) * 2 > 1 ? 1 : 0.55 * amt(V.glow) * 2;
      g.filter = `blur(${Math.round(h * 0.025)}px) brightness(1.15)`;
      g.drawImage(cv, 0, 0);
      g.filter = 'none'; g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    return { src: cv, w: s.w, h: s.h, fit: s.fit };
  };

  // Blurred, zoomed copy behind the clip so vertical/horizontal footage fills the frame.
  CR.blurFill = (ctx, s, W, H, alpha) => {
    const k = Math.max(W / s.w, H / s.h) * 1.08;
    const w = s.w * k, h = s.h * k;
    ctx.save();
    ctx.globalAlpha = alpha;
    const px = Math.round((12 + 40 * amt(null)) * RS.engine.canvas.height / 1080);
    ctx.filter = `blur(${px}px) brightness(0.75) saturate(1.2)`;
    try { ctx.drawImage(s.src, (W - w) / 2, (H - h) / 2, w, h); } catch { /* not ready */ }
    ctx.restore();
  };

  let grainTiles = null;
  function grain() {
    if (grainTiles) return grainTiles;
    grainTiles = [];
    for (let k = 0; k < 4; k++) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 256;
      const g = cv.getContext('2d'); const im = g.createImageData(256, 256);
      for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
      g.putImageData(im, 0, 0); grainTiles.push(cv);
    }
    return grainTiles;
  }

  // Frame-level overlays drawn after the clip.
  CR.overlay = (ctx, c, l, W, H) => {
    const V = c.vfx;
    if (V.grain) {
      const tiles = grain(), tile = tiles[Math.floor(l * 24) % tiles.length];
      ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.5 * amt(V.grain);
      const scale = Math.max(1, H / 540);
      ctx.translate(-(Math.floor(l * 97) % 64), -(Math.floor(l * 53) % 64)); ctx.scale(scale, scale);
      ctx.fillStyle = ctx.createPattern(tile, 'repeat'); ctx.fillRect(0, 0, W / scale + 128, H / scale + 128);
      ctx.restore();
    }
    if (V.leak) {
      const k = amt(V.leak), t = l * 0.35;
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      const spots = [[0.15 + 0.25 * Math.sin(t), 0.2, '255,120,40', 0.75], [0.85 - 0.2 * Math.sin(t * 1.3), 0.75, '255,60,90', 0.6], [0.5 + 0.3 * Math.cos(t * 0.7), 0.1, '255,210,120', 0.5]];
      for (const [x, y, col, r] of spots) {
        const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, W * r);
        const a = (0.35 + 0.25 * noise1(l * 0.8 + x * 10)) * k;
        g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
    }
    if (V.vignettePulse) {
      const ph = (l % 1), beat = Math.exp(-Math.pow((ph - 0.1) / 0.06, 2)) + 0.6 * Math.exp(-Math.pow((ph - 0.32) / 0.06, 2));
      const r = Math.hypot(W, H) / 2;
      const g = ctx.createRadialGradient(W / 2, H / 2, r * (0.55 - 0.15 * beat), W / 2, H / 2, r);
      g.addColorStop(0, 'rgba(120,0,0,0)'); g.addColorStop(1, `rgba(120,0,0,${(0.5 + 0.4 * beat) * amt(V.vignettePulse) * 1.5})`);
      ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    if (V.flash && l < 0.45) {
      ctx.save(); ctx.globalAlpha = Math.pow(1 - l / 0.45, 2) * amt(V.flash); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    if (V.letterbox) {
      const target = W / 2.39;
      const bar = Math.max(0, (H - target) / 2) * amt(V.letterbox);
      const grow = clamp01(l / 0.6);
      const b = bar * easeOut(grow);
      ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, b); ctx.fillRect(0, H - b, W, b); ctx.restore();
    }
  };

  // ---------------- voice effects ----------------
  CR.VOICES = [
    ['chipmunk', 'Chipmunk (high)'], ['deep', 'Deep Voice'], ['robot', 'Robot'], ['telephone', 'Telephone'], ['radio', 'Old Radio'],
    ['megaphone', 'Megaphone'], ['echo', 'Echo'], ['hall', 'Big Hall (reverb)'], ['monster', 'Monster'],
  ];
  const impulses = new WeakMap();
  function impulse(ctx, seconds, decay) {
    let m = impulses.get(ctx);
    if (!m) impulses.set(ctx, (m = new Map()));
    const k = seconds + '|' + decay;
    if (m.has(k)) return m.get(k);
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let seed = ch * 999 + 1; for (let i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; d[i] = (seed / 2147483647 * 2 - 1) * Math.pow(1 - i / len, decay); } }
    m.set(k, b);
    return b;
  }
  const shaper = (ctx, k) => { const ws = ctx.createWaveShaper(); const n = 1024, cu = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; cu[i] = (1 + k) * x / (1 + k * Math.abs(x)); } ws.curve = cu; return ws; };
  const biq = (ctx, type, f, q) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; return b; };
  // Returns a linear chain of nodes; parallel paths (wet/dry) are wired internally between the first and last node.
  CR.voiceNodes = (ctx, v, workletOk) => {
    const type = v.type;
    const pitch = (r) => { const p = new AudioWorkletNode(ctx, 'rs-pitch', { outputChannelCount: [2] }); p.parameters.get('ratio').value = r; return p; };
    switch (type) {
      case 'chipmunk': return workletOk ? [pitch(1.65), biq(ctx, 'highpass', 150)] : [];
      case 'deep': return workletOk ? [pitch(0.72), biq(ctx, 'lowshelf', 200)] : [];
      case 'monster': return workletOk ? [pitch(0.55), shaper(ctx, 3), biq(ctx, 'lowpass', 2500)] : [];
      case 'robot': {
        // Ring modulation: the signal's gain is driven by a 55 Hz oscillator.
        const ring = ctx.createGain(), out = ctx.createGain();
        ring.gain.value = 0; out.gain.value = 1.6;
        const o = ctx.createOscillator(); o.frequency.value = 55; o.connect(ring.gain); o.start();
        return [ring, out];
      }
      case 'telephone': return [biq(ctx, 'highpass', 400, 0.9), biq(ctx, 'lowpass', 3200, 0.9), shaper(ctx, 2), (() => { const g = ctx.createGain(); g.gain.value = 0.8; return g; })()];
      case 'radio': return [biq(ctx, 'bandpass', 1500, 0.6), shaper(ctx, 6), (() => { const g = ctx.createGain(); g.gain.value = 0.6; return g; })()];
      case 'megaphone': return [biq(ctx, 'highpass', 700, 1), shaper(ctx, 18), biq(ctx, 'lowpass', 4000, 1), (() => { const g = ctx.createGain(); g.gain.value = 0.5; return g; })()];
      case 'echo': case 'hall': {
        const inG = ctx.createGain(), out = ctx.createGain();
        if (type === 'echo') {
          const d = ctx.createDelay(2); d.delayTime.value = 0.32;
          const fb = ctx.createGain(); fb.gain.value = 0.42;
          const wet = ctx.createGain(); wet.gain.value = 0.55;
          inG.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(out);
        } else {
          const cv = ctx.createConvolver(); cv.buffer = impulse(ctx, 2.6, 2.4);
          const wet = ctx.createGain(); wet.gain.value = 0.5;
          inG.connect(cv); cv.connect(wet); wet.connect(out);
        }
        return [inG, out]; // the chain connects inG → out (dry path)
      }
      default: return [];
    }
  };

  // ---------------- filters ----------------
  const COLOR_KEYS = ['brightness', 'contrast', 'saturation', 'hue', 'grayscale', 'sepia', 'temperature', 'tint', 'vignette', 'invert'];
  CR.FILTERS = [
    ['cinematic', 'Cinematic', { contrast: 114, saturation: 88, temperature: -10, tint: 4, vignette: 30 }],
    ['tealOrange', 'Teal & Orange', { contrast: 112, saturation: 120, temperature: 18, tint: -10, hue: -4 }],
    ['golden', 'Golden Hour', { temperature: 35, saturation: 115, brightness: 104, contrast: 104 }],
    ['moody', 'Moody', { contrast: 122, saturation: 72, brightness: 90, vignette: 45, temperature: -12 }],
    ['filmFade', 'Film Fade', { contrast: 84, brightness: 106, saturation: 82, sepia: 12 }],
    ['noir', 'Noir', { grayscale: 100, contrast: 145, brightness: 95, vignette: 55 }],
    ['pastel', 'Pastel', { saturation: 68, brightness: 110, contrast: 88, tint: 6 }],
    ['neonNight', 'Neon Night', { saturation: 165, contrast: 116, hue: -18, tint: 22, temperature: -20 }],
    ['retro70', 'Retro 70s', { sepia: 32, saturation: 125, temperature: 22, contrast: 94 }],
    ['clean', 'Clean & Crisp', { contrast: 108, saturation: 110, brightness: 102 }],
    ['frost', 'Frost', { temperature: -40, saturation: 80, brightness: 106 }],
    ['dramatic', 'Dramatic B&W', { grayscale: 100, contrast: 170, brightness: 88 }],
  ];

  // ---------------- text styles & templates ----------------
  CR.TEXT_STYLES = [
    ['meme', 'Meme', { font: 'Impact', bold: false, italic: false, color: '#ffffff', stroke: 7, strokeColor: '#000000', shadow: false, glow: null, bg: false, spacing: 0, upper: true }],
    ['boldPop', 'Bold Pop', { font: 'Futura', bold: true, italic: false, color: '#ffe600', stroke: 9, strokeColor: '#111111', shadow: true, glow: null, bg: false, spacing: 0 }],
    ['neon', 'Neon', { font: 'Avenir Next', bold: true, italic: false, color: '#ffffff', stroke: 0, shadow: false, glow: '#ff2bd6', bg: false, spacing: 2 }],
    ['neonBlue', 'Neon Blue', { font: 'Avenir Next', bold: true, italic: false, color: '#e9fbff', stroke: 0, shadow: false, glow: '#18c8ff', bg: false, spacing: 2 }],
    ['elegant', 'Elegant Serif', { font: 'Didot', bold: false, italic: false, color: '#f3e9d2', stroke: 0, shadow: true, glow: null, bg: false, spacing: 10 }],
    ['cinematic', 'Cinematic Wide', { font: 'Avenir Next', bold: false, italic: false, color: '#ffffff', stroke: 0, shadow: false, glow: null, bg: false, spacing: 36 }],
    ['subtitle', 'Subtitle Box', { font: 'Helvetica Neue', bold: true, italic: false, color: '#ffffff', stroke: 0, shadow: false, glow: null, bg: true, bgColor: '#000000', bgOpacity: 70, spacing: 0 }],
    ['comic', 'Comic', { font: 'Chalkboard SE', bold: true, italic: false, color: '#ff7a1a', stroke: 6, strokeColor: '#ffffff', shadow: true, glow: null, bg: false, spacing: 0 }],
    ['typewriter', 'Typewriter', { font: 'American Typewriter', bold: false, italic: false, color: '#f5f1e6', stroke: 0, shadow: true, glow: null, bg: false, spacing: 1 }],
    ['minimal', 'Minimal', { font: 'Helvetica Neue', bold: false, italic: false, color: '#ffffff', stroke: 0, shadow: false, glow: null, bg: false, spacing: 4 }],
    ['retroPop3d', 'Retro Pop 3D', { font: 'Futura', bold: true, italic: false, color: '#b44dff', stroke: 3, strokeColor: '#ffffff', shadow: false, halftone: { on: true, color: '#ffffff', size: 7, opacity: 65 }, extrude: { on: true, depth: 14, angle: 120, color: '#5b2bd6' }, offShadow: { on: true, dx: 9, dy: 13, color: '#39ff6a' }, upper: true }],
    ['epicGold3d', 'Epic Gold 3D', { font: 'Futura', bold: true, italic: false, color: '#ffd23f', stroke: 4, strokeColor: '#ff3fd2', shadow: false, grad: { on: true, c1: '#fff36b', c2: '#ff7a00', angle: 90 }, halftone: { on: true, color: '#ff4d00', size: 6, opacity: 45 }, extrude: { on: true, depth: 18, angle: 95, color: '#8a1f8f' }, upper: true }],
    ['gradientBold', 'Gradient Bold', { font: 'Avenir Next', bold: true, italic: false, color: '#5ee7ff', stroke: 0, shadow: true, grad: { on: true, c1: '#5ee7ff', c2: '#3a7bff', angle: 20 }, upper: true }],
    ['twoTone', 'Two-Tone (use *word*)', { font: 'Avenir Next', bold: true, italic: false, color: '#ffd400', color2: '#3b6bff', stroke: 0, shadow: true, extrude: { on: true, depth: 4, angle: 90, color: '#1a1a2e' } }],
    ['sticker', 'Sticker Outline', { font: 'Avenir Next', bold: true, italic: false, color: '#ffffff', stroke: 5, strokeColor: '#111111', stroke2: 7, stroke2Color: '#ffffff', shadow: false, offShadow: { on: true, dx: 4, dy: 6, color: '#00000088' } }],
    ['candy', 'Candy 3D', { font: 'Chalkboard SE', bold: true, italic: false, color: '#ff7eb6', stroke: 0, stroke2: 6, stroke2Color: '#ffffff', shadow: false, grad: { on: true, c1: '#ff9ad5', c2: '#ff5e7e', angle: 90 }, extrude: { on: true, depth: 10, angle: 90, color: '#c2185b' } }],
    ['goldLuxe', 'Gold Luxe', { font: 'Didot', bold: false, italic: false, color: '#e9c46a', stroke: 0, shadow: true, spacing: 8, grad: { on: true, c1: '#fff1b8', c2: '#b8862b', angle: 90 } }],
    ['comic3d', 'Comic Burst 3D', { font: 'Impact', bold: false, italic: false, color: '#ffe600', stroke: 6, strokeColor: '#111111', shadow: false, extrude: { on: true, depth: 12, angle: 135, color: '#e5243b' }, upper: true }],
  ];
  const FX_RESET = { grad: null, extrude: null, halftone: null, stroke2: 0, offShadow: null, color2: null, glow: null, spacing: 0, bg: false };
  CR.applyTextStyle = (c, style) => {
    const st = Object.assign({}, FX_RESET, JSON.parse(JSON.stringify(style)));
    const upper = st.upper; delete st.upper;
    Object.assign(c.text, st);
    if (upper) c.text.content = String(c.text.content || '').toUpperCase();
  };
  const styleOf = (id) => (CR.TEXT_STYLES.find((x) => x[0] === id) || [])[2];

  // Templates: create ready-made animated titles at time t.
  CR.TEMPLATES = [
    ['bigIntro', 'Big Bold Intro', 4, (W, H) => [{ content: 'BIG TITLE', size: 170, style: 'boldPop', anim: { in: { type: 'pop', dur: 0.5 }, out: { type: 'zoomIn', dur: 0.4 } } }]],
    ['elegantTitle', 'Elegant Title', 5, () => [{ content: 'A Beautiful Story', size: 96, style: 'elegant', anim: { in: { type: 'rise', dur: 1.4 }, out: { type: 'fade', dur: 1 } } }]],
    ['lowerThird', 'Lower Third', 5, (W, H) => [{ content: 'Your Name\nTitle or role', size: 50, style: 'subtitle', align: 'left', x: -W * 0.27, y: H * 0.32, anim: { in: { type: 'slideL', dur: 0.6 }, out: { type: 'slideL', dur: 0.5 } } }]],
    ['memeTop', 'Meme Top Text', 4, (W, H) => [{ content: 'when the edit finally exports', size: 96, style: 'meme', y: -H * 0.38, anim: { in: { type: 'stamp', dur: 0.35 } } }]],
    ['neonSign', 'Neon Sign', 5, () => [{ content: 'OPEN LATE', size: 130, style: 'neon', anim: { in: { type: 'fade', dur: 0.6 }, loop: { type: 'flicker', speed: 1 } } }]],
    ['typeOn', 'Typewriter Text', 5, () => [{ content: 'Once upon a time…', size: 84, style: 'typewriter', anim: { in: { type: 'typewriter', dur: 2 }, out: { type: 'fade', dur: 0.5 } } }]],
    ['cta', 'Call to Action', 4, (W, H) => [{ content: 'Follow for more!', size: 72, style: 'subtitle', bgColor: '#e5243b', bgOpacity: 100, y: H * 0.3, anim: { in: { type: 'pop', dur: 0.5 }, loop: { type: 'pulse', speed: 1.2 }, out: { type: 'pop', dur: 0.3 } } }]],
    ['chapter', 'Chapter Title', 4, () => [{ content: 'CHAPTER ONE', size: 80, style: 'cinematic', anim: { in: { type: 'blur', dur: 1 }, out: { type: 'blur', dur: 0.8 } } }]],
    ['countdown', 'Countdown 3-2-1', 3, () => ['3', '2', '1'].map((n, i) => ({ content: n, size: 320, style: 'boldPop', offset: i, dur: 1, anim: { in: { type: 'pop', dur: 0.3 }, out: { type: 'zoomOut', dur: 0.25 } } }))],
    ['retroPopTitle', 'Retro Pop 3D Title', 4, () => [{ content: 'POPS', size: 230, style: 'retroPop3d', anim: { in: { type: 'letterDrop', dur: 1 }, loop: { type: 'wave', speed: 0.6, amount: 35 }, out: { type: 'pop', dur: 0.3 } } }]],
    ['epicTitle', 'Epic 3D Title', 4, () => [{ content: 'EPIC', size: 240, style: 'epicGold3d', anim: { in: { type: 'letterPop', dur: 0.8 }, out: { type: 'zoomOut', dur: 0.35 } } }]],
    ['twoToneTitle', 'Two-Tone Title + Label', 4, (W, H) => [
      { content: 'trending\n*text effect*', size: 150, style: 'twoTone', anim: { in: { type: 'wordPop', dur: 0.8 }, out: { type: 'wordBlur', dur: 0.4 } } },
      { content: 'YOUR LABEL HERE', size: 44, style: 'subtitle', bgColor: '#d7263d', bgOpacity: 100, y: H * 0.2, offset: 0.4, dur: 3.6, anim: { in: { type: 'slideU', dur: 0.4 }, out: { type: 'fade', dur: 0.3 } } },
    ]],
    ['kinetic', 'Kinetic Words', 4, () => [{ content: 'MAKE IT MOVE', size: 140, style: 'gradientBold', anim: { in: { type: 'wordSlide', dur: 0.9 }, out: { type: 'wordSlide', dur: 0.5 } } }]],
    ['smoothSpaced', 'Smooth Spaced Title', 5, (W, H) => [
      { content: 'SMOOTH TITLE', size: 120, style: 'cinematic', spacing: 18, anim: { in: { type: 'letterFade', dur: 1.2 }, out: { type: 'wordBlur', dur: 0.6 } } },
      { content: 'SUBTITLE', size: 40, style: 'cinematic', spacing: 30, y: H * 0.12, offset: 0.6, dur: 4.4, anim: { in: { type: 'rise', dur: 0.8 }, out: { type: 'fade', dur: 0.5 } } },
    ]],
    ['bouncyWords', 'Bouncy Words', 4, () => [{ content: 'so much fun!', size: 130, style: 'candy', anim: { in: { type: 'wordPop', dur: 0.7 }, loop: { type: 'wordBounce', speed: 1.2 } } }]],
    ['breaking', 'Breaking News Bar', 5, (W, H) => [{ content: 'BREAKING  ·  Something amazing just happened', size: 48, style: 'subtitle', bgColor: '#c8102e', bgOpacity: 100, align: 'left', y: H * 0.38, anim: { in: { type: 'slideR', dur: 0.5 }, out: { type: 'slideL', dur: 0.4 } } }]],
  ];
  CR.STICKERS = ['😂', '🔥', '❤️', '👍', '😎', '🎉', '💯', '😱', '⭐', '✅', '👀', '🤯', '🥳', '🙌', '💥', '❓'];

  const freeVideoTrack = (t, d) => RS.ops.freeVideoTrack(t, t + d, 1);
  CR.createTemplate = (id, t) => {
    const tp = CR.TEMPLATES.find((x) => x[0] === id);
    if (!tp) return;
    const { width: W, height: H } = S.project.settings;
    const parts = tp[3](W, H);
    RS.commit('Add ' + tp[1], () => {
      const made = [];
      const total = tp[2];
      const tr = freeVideoTrack(t, total);
      for (const p of parts) {
        const start = RS.frameRound(t + (p.offset || 0), RS.fps());
        const c = RS.makeClip({ type: 'text', trackId: tr.id, start, duration: p.dur || total, props: { x: p.x || 0, y: p.y || 0 } });
        CR.applyTextStyle(c, styleOf(p.style) || {});
        c.text.content = p.content; c.text.size = Math.max(8, Math.round(p.size * H / 1080)); // sizes are designed for 1080p
        if (p.align) c.text.align = p.align;
        if (p.bgColor) c.text.bgColor = p.bgColor;
        if (p.bgOpacity != null) c.text.bgOpacity = p.bgOpacity;
        if (p.spacing != null) c.text.spacing = Math.round(p.spacing * H / 1080);
        for (const k of ['extrude', 'offShadow']) if (c.text[k]) c.text[k] = Object.assign({}, c.text[k]); // percentages of size: no scaling needed
        if (p.anim) c.anim = JSON.parse(JSON.stringify(p.anim));
        S.project.clips.push(c);
        made.push(c.id);
      }
      S.selection = new Set(made);
    });
    RS.engine.seek(t + 0.05);
  };
  CR.createSticker = (emoji, t) => {
    const { width: W, height: H } = S.project.settings;
    RS.commit('Add sticker', () => {
      const tr = freeVideoTrack(t, 3);
      const c = RS.makeClip({ type: 'text', trackId: tr.id, start: RS.frameRound(t, RS.fps()), duration: 3, props: { x: W * 0.28, y: -H * 0.22 } });
      Object.assign(c.text, { content: emoji, size: Math.round(H * 0.2), shadow: true, bold: false, font: 'Apple Color Emoji' });
      c.anim = { in: { type: 'pop', dur: 0.4 }, loop: { type: 'wobble', speed: 1 }, out: { type: 'pop', dur: 0.3 } };
      S.project.clips.push(c);
      S.selection = new Set([c.id]);
    });
    RS.engine.seek(t + 0.05);
  };

  // ---------------- sound effects (synthesized, original) ----------------
  const SR = 44100;
  function noiseBuf(ctx, sec) { const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * sec), ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
  function env(param, pts) { param.setValueAtTime(pts[0][1], pts[0][0]); for (let i = 1; i < pts.length; i++) param.linearRampToValueAtTime(pts[i][1], pts[i][0]); }
  const osc = (ctx, type, f) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; return o; };
  const gain = (ctx, v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const noiseSrc = (ctx, sec) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf(ctx, sec); return s; };

  CR.SFX = [
    ['whoosh', 'Whoosh', 0.9, (c, out) => { const n = noiseSrc(c, 0.9), f = biq(c, 'bandpass', 400, 1.2), g = gain(c, 0); n.connect(f).connect(g).connect(out); f.frequency.setValueAtTime(300, 0); f.frequency.exponentialRampToValueAtTime(3200, 0.45); f.frequency.exponentialRampToValueAtTime(500, 0.9); env(g.gain, [[0, 0], [0.4, 1.2], [0.9, 0]]); n.start(0); }],
    ['riser', 'Riser', 2, (c, out) => { const n = noiseSrc(c, 2), f = biq(c, 'bandpass', 200, 2), g = gain(c, 0); n.connect(f).connect(g).connect(out); f.frequency.setValueAtTime(200, 0); f.frequency.exponentialRampToValueAtTime(7000, 2); const o = osc(c, 'sawtooth', 120), og = gain(c, 0), lp = biq(c, 'lowpass', 1500); o.connect(lp).connect(og).connect(out); o.frequency.exponentialRampToValueAtTime(900, 2); env(g.gain, [[0, 0], [1.9, 0.9], [2, 0]]); env(og.gain, [[0, 0], [1.9, 0.12], [2, 0]]); n.start(0); o.start(0); }],
    ['pop', 'Pop', 0.2, (c, out) => { const o = osc(c, 'sine', 900), g = gain(c, 0); o.connect(g).connect(out); o.frequency.exponentialRampToValueAtTime(180, 0.07); env(g.gain, [[0, 0], [0.004, 1], [0.12, 0]]); o.start(0); }],
    ['ding', 'Ding', 1.6, (c, out) => { for (const [f, a] of [[1318.5, 0.6], [2637, 0.25], [3951, 0.12]]) { const o = osc(c, 'sine', f), g = gain(c, 0); o.connect(g).connect(out); g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(a, 0.005); g.gain.exponentialRampToValueAtTime(0.0001, 1.5); o.start(0); } }],
    ['boing', 'Boing', 0.9, (c, out) => { const o = osc(c, 'sine', 140), lfo = osc(c, 'sine', 14), lg = gain(c, 70), g = gain(c, 0); lfo.connect(lg).connect(o.frequency); o.connect(g).connect(out); o.frequency.linearRampToValueAtTime(330, 0.8); lg.gain.linearRampToValueAtTime(0, 0.85); env(g.gain, [[0, 0], [0.01, 0.9], [0.85, 0]]); o.start(0); lfo.start(0); }],
    ['shutter', 'Camera Shutter', 0.35, (c, out) => { for (const t0 of [0, 0.12]) { const n = noiseSrc(c, 0.1), f = biq(c, 'highpass', 2500), g = gain(c, 0); n.connect(f).connect(g).connect(out); env(g.gain, [[t0, 0], [t0 + 0.002, 1], [t0 + 0.05, 0]]); n.start(t0); } }],
    ['boom', 'Impact Boom', 2, (c, out) => { const o = osc(c, 'sine', 80), g = gain(c, 0); o.connect(g).connect(out); o.frequency.exponentialRampToValueAtTime(32, 1.4); g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(1, 0.01); g.gain.exponentialRampToValueAtTime(0.0001, 1.9); const n = noiseSrc(c, 0.6), f = biq(c, 'lowpass', 900), ng = gain(c, 0); n.connect(f).connect(ng).connect(out); env(ng.gain, [[0, 0], [0.005, 0.8], [0.5, 0]]); o.start(0); n.start(0); }],
    ['laser', 'Laser Zap', 0.5, (c, out) => { const o = osc(c, 'square', 1800), g = gain(c, 0); o.connect(g).connect(out); o.frequency.exponentialRampToValueAtTime(150, 0.4); env(g.gain, [[0, 0], [0.01, 0.35], [0.45, 0]]); o.start(0); }],
    ['scratch', 'Record Scratch', 0.7, (c, out) => { const n = noiseSrc(c, 0.7), f = biq(c, 'bandpass', 900, 6), g = gain(c, 0); n.connect(f).connect(g).connect(out); f.frequency.setValueAtTime(600, 0); f.frequency.exponentialRampToValueAtTime(2800, 0.18); f.frequency.exponentialRampToValueAtTime(500, 0.4); f.frequency.exponentialRampToValueAtTime(2200, 0.6); env(g.gain, [[0, 0], [0.02, 2.5], [0.38, 2], [0.42, 0.3], [0.45, 2.2], [0.7, 0]]); n.start(0); }],
    ['ticktock', 'Tick Tock', 2.1, (c, out) => { for (let i = 0; i < 4; i++) { const t0 = i * 0.5, o = osc(c, 'square', i % 2 ? 1400 : 1900), g = gain(c, 0), f = biq(c, 'bandpass', i % 2 ? 1400 : 1900, 8); o.connect(f).connect(g).connect(out); env(g.gain, [[t0, 0], [t0 + 0.002, 0.8], [t0 + 0.04, 0]]); o.start(t0); o.stop(t0 + 0.06); } }],
    ['slideUp', 'Slide Whistle Up', 0.9, (c, out) => { const o = osc(c, 'sine', 380), g = gain(c, 0); o.connect(g).connect(out); o.frequency.exponentialRampToValueAtTime(1600, 0.85); env(g.gain, [[0, 0], [0.05, 0.5], [0.8, 0.5], [0.9, 0]]); o.start(0); }],
    ['slideDown', 'Slide Whistle Down', 0.9, (c, out) => { const o = osc(c, 'sine', 1600), g = gain(c, 0); o.connect(g).connect(out); o.frequency.exponentialRampToValueAtTime(300, 0.85); env(g.gain, [[0, 0], [0.05, 0.5], [0.8, 0.5], [0.9, 0]]); o.start(0); }],
    ['bubble', 'Bubble Blips', 0.6, (c, out) => { for (let i = 0; i < 3; i++) { const t0 = i * 0.15, o = osc(c, 'sine', 300), g = gain(c, 0); o.connect(g).connect(out); o.frequency.setValueAtTime(300 + i * 80, t0); o.frequency.exponentialRampToValueAtTime(1000 + i * 200, t0 + 0.08); env(g.gain, [[t0, 0], [t0 + 0.01, 0.6], [t0 + 0.1, 0]]); o.start(t0); o.stop(t0 + 0.12); } }],
    ['chime', 'Notification Chime', 1.2, (c, out) => { [[0, 880], [0.14, 1318.5]].forEach(([t0, f]) => { const o = osc(c, 'triangle', f), g = gain(c, 0); o.connect(g).connect(out); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.5, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1); o.start(t0); }); }],
    ['buzzer', 'Wrong Buzzer', 0.8, (c, out) => { const o = osc(c, 'sawtooth', 140), o2 = osc(c, 'square', 147), f = biq(c, 'lowpass', 1200), g = gain(c, 0); o.connect(f); o2.connect(f); f.connect(g).connect(out); env(g.gain, [[0, 0], [0.01, 0.35], [0.7, 0.35], [0.78, 0]]); o.start(0); o2.start(0); }],
    ['tada', 'Ta-da!', 1.6, (c, out) => { [[0, [523.25]], [0.18, [523.25, 659.25, 783.99, 1046.5]]].forEach(([t0, fs]) => fs.forEach((f) => { const o = osc(c, 'sawtooth', f), lp = biq(c, 'lowpass', 2500), g = gain(c, 0); o.connect(lp).connect(g).connect(out); const dur = t0 ? 1.3 : 0.14; env(g.gain, [[t0, 0], [t0 + 0.02, 0.12], [t0 + dur * 0.7, 0.1], [t0 + dur, 0]]); o.start(t0); o.stop(t0 + dur + 0.02); })); }],
    ['subBell', 'Subscribe Click + Bell', 3.6, (c, out) => {
      // button click at 1.5 s (when the cursor presses), then a bright bell rung twice as the icon swings
      const n = noiseSrc(c, 0.05), hp = biq(c, 'highpass', 3000), ng = gain(c, 0); n.connect(hp).connect(ng).connect(out);
      env(ng.gain, [[1.5, 0], [1.502, 0.7], [1.53, 0]]); n.start(1.5);
      const k = osc(c, 'sine', 2200), kg = gain(c, 0); k.connect(kg).connect(out); env(kg.gain, [[1.5, 0], [1.503, 0.35], [1.54, 0]]); k.start(1.5); k.stop(1.6);
      for (const [t0, a] of [[1.68, 0.55], [1.98, 0.4]]) {
        for (const [r, pa, dec] of [[1, 1, 1.6], [2.0, 0.45, 1.0], [2.76, 0.3, 0.7], [5.4, 0.15, 0.35], [8.9, 0.06, 0.2]]) {
          const o = osc(c, 'sine', 1180 * r), g = gain(c, 0); o.connect(g).connect(out);
          g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(a * pa, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dec);
          o.start(t0); o.stop(t0 + dec + 0.05);
        }
      }
    }],
    ['applause', 'Applause', 3, (c, out) => {
      const b = c.createBuffer(1, Math.ceil(c.sampleRate * 3), c.sampleRate), d = b.getChannelData(0);
      for (let k = 0; k < 420; k++) { const t0 = Math.random() * 2.7, s = Math.floor(t0 * c.sampleRate), len = Math.floor(c.sampleRate * (0.008 + Math.random() * 0.012)), a = 0.25 + Math.random() * 0.5; for (let i = 0; i < len && s + i < d.length; i++) d[s + i] += (Math.random() * 2 - 1) * a * Math.exp(-i / (len / 3)); }
      for (let i = 0; i < d.length; i++) { const t = i / c.sampleRate; d[i] *= Math.min(1, t / 0.3) * Math.min(1, (3 - t) / 0.6); }
      const s = c.createBufferSource(); s.buffer = b; const f = biq(c, 'bandpass', 2000, 0.7); s.connect(f).connect(gain(c, 1.4)).connect(out); s.start(0);
    }],
    ['drumroll', 'Drum Roll + Crash', 2.6, (c, out) => {
      for (let t0 = 0; t0 < 1.6; t0 += 0.045) { const n = noiseSrc(c, 0.06), f = biq(c, 'bandpass', 1800, 0.8), g = gain(c, 0); n.connect(f).connect(g).connect(out); const a = 0.15 + 0.35 * (t0 / 1.6); env(g.gain, [[t0, 0], [t0 + 0.002, a], [t0 + 0.04, 0]]); n.start(t0); }
      const n = noiseSrc(c, 1), f = biq(c, 'highpass', 3000), g = gain(c, 0); n.connect(f).connect(g).connect(out); g.gain.setValueAtTime(0, 1.62); g.gain.linearRampToValueAtTime(0.9, 1.63); g.gain.exponentialRampToValueAtTime(0.001, 2.55); n.start(1.62);
      const o = osc(c, 'sine', 90), og = gain(c, 0); o.connect(og).connect(out); og.gain.setValueAtTime(0, 1.62); og.gain.linearRampToValueAtTime(0.8, 1.63); og.gain.exponentialRampToValueAtTime(0.001, 2.2); o.start(1.62);
    }],
  ];

  function wav(buf) {
    const d = buf.getChannelData(0), n = d.length;
    let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
    const norm = peak > 0 ? Math.min(4, 0.89 / peak) : 1; // normalise to about -1 dBFS
    const ab = new ArrayBuffer(44 + n * 2), v = new DataView(ab);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, buf.sampleRate, true); v.setUint32(28, buf.sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i] * norm)) * 0x7fff, true);
    return new Uint8Array(ab);
  }
  CR.renderSfx = async (id) => {
    const fx = CR.SFX.find((x) => x[0] === id);
    const oc = new OfflineAudioContext(1, Math.ceil(SR * fx[2]), SR);
    const out = oc.createGain(); out.connect(oc.destination);
    fx[3](oc, out);
    return wav(await oc.startRendering());
  };
  // Generate (once) and import a sound effect; returns the media item.
  CR.sfxMedia = async (id) => {
    const fx = CR.SFX.find((x) => x[0] === id);
    if (!fx) return null;
    const name = fx[1].replace(/[^\w\- !]/g, ' ').replace(/\s+/g, ' ').trim() + '.wav';
    let src;
    if (RS.native) {
      const dir = await RS.native.appDir('sfx');
      const p = dir + '/' + name;
      if (!(await RS.native.fileExists(dir, name))) await RS.native.writeFile(p, await CR.renderSfx(id));
      src = { name, path: p, size: 1 };
    } else src = { name, file: new File([await CR.renderSfx(id)], name, { type: 'audio/wav' }), size: 1 };
    const [m] = await RS.media.importSources([src]);
    return m || null;
  };
  CR.addSfx = async (id, t) => {
    const fx = CR.SFX.find((x) => x[0] === id);
    if (!fx) return;
    const name = fx[1].replace(/[^\w\- !]/g, ' ').replace(/\s+/g, ' ').trim() + '.wav';
    let src;
    if (RS.native) {
      const dir = await RS.native.appDir('sfx');
      const p = dir + '/' + name;
      if (!(await RS.native.fileExists(dir, name))) await RS.native.writeFile(p, await CR.renderSfx(id));
      src = { name, path: p, size: 1 };
    } else src = { name, file: new File([await CR.renderSfx(id)], name, { type: 'audio/wav' }), size: 1 };
    const [m] = await RS.media.importSources([src]);
    if (!m) return;
    const d = m.duration;
    RS.commit('Add sound effect', () => {
      let tr = RS.tracksOf('audio').find((x) => !x.locked && !S.project.clips.some((c) => c.trackId === x.id && c.start < t + d - RS.EPS && RS.clipEnd(c) > t + RS.EPS));
      if (!tr) tr = RS.ops.addTrack('audio');
      RS.ops.placeMedia(m.id, tr.id, t, {});
    });
    RS.toast(`Added “${fx[1]}” at the playhead`, 'ok');
  };

  // ---------------- auto ducking ----------------
  // Lowers the music clips wherever another audio clip (voice) is loud, with smooth ramps.
  CR.duck = (music, opts = {}) => {
    const depthDb = opts.depth ?? -14;
    const ids = new Set(music.map((c) => c.id));
    const voices = S.project.clips.filter((c) => c.type === 'audio' && !ids.has(c.id) && !c.disabled && RS.runtime[c.mediaId] && RS.runtime[c.mediaId].peaks);
    if (!voices.length) { RS.toast('No other audio with speech found to duck under. Put the voice-over/dialogue on another audio track.'); return 0; }
    const loud = (T) => voices.some((v) => {
      if (T < v.start || T >= RS.clipEnd(v)) return false;
      const rt = RS.runtime[v.mediaId];
      const mt = v.in + (T - v.start) * (v.speed || 1);
      const i = Math.floor(mt * (rt.peakRate || 100));
      let m = 0; for (let k = i - 2; k <= i + 2; k++) m = Math.max(m, rt.peaks[k] || 0);
      return m > 45;
    });
    let n = 0;
    RS.commit('Auto duck music', () => {
      for (const c0 of music) {
        const c = RS.getClip(c0.id);
        const base = c.props.volume || 100, low = base * Math.pow(10, depthDb / 20);
        const step = 0.05, segs = [];
        let on = null, lastLoud = -1;
        for (let T = c.start; T <= RS.clipEnd(c); T += step) {
          if (loud(T)) { if (on == null) on = T; lastLoud = T; }
          else if (on != null && T - lastLoud > 0.6) { segs.push([on, lastLoud + 0.2]); on = null; }
        }
        if (on != null) segs.push([on, Math.min(RS.clipEnd(c), lastLoud + 0.2)]);
        c.kf = c.kf || {};
        if (!segs.length) { delete c.kf.volume; continue; }
        const k = [{ t: 0, v: base }];
        const push = (t, v) => { t = RS.clamp(t - c.start, 0, c.duration); if (t > k[k.length - 1].t + 1e-3) k.push({ t: +t.toFixed(3), v }); else k[k.length - 1].v = v; };
        for (const [a, b] of segs) { push(a - 0.3, base); push(a, low); push(b, low); push(b + 0.4, base); }
        if (k[k.length - 1].t < c.duration) k.push({ t: +c.duration.toFixed(3), v: k[k.length - 1].v });
        c.kf.volume = k;
        n += segs.length;
      }
    });
    RS.toast(n ? `Music lowered under speech in ${n} place${n > 1 ? 's' : ''} (${depthDb} dB). Adjust in Effect Controls ▸ Volume keyframes.` : 'No speech found over the music', n ? 'ok' : '', 6000);
    return n;
  };

  // ---------------- Effects panel entries ----------------
  CR.groups = () => [
    { group: 'Animations — In', items: CR.ANIM_IN.map(([id, name]) => ({ id: 'ain-' + id, name, kind: id === 'typewriter' || UNIT[id] ? 'text' : 'visual', clipAnim: { slot: 'in', type: id, dur: id === 'typewriter' ? 1.5 : id === 'rise' || UNIT[id] ? 1 : 0.5 }, exclusive: 'animIn' })) },
    { group: 'Animations — Out', items: CR.ANIM_OUT.map(([id, name]) => ({ id: 'aout-' + id, name, kind: id === 'typewriter' || UNIT[id] ? 'text' : 'visual', clipAnim: { slot: 'out', type: id, dur: UNIT[id] ? 0.7 : 0.5 }, exclusive: 'animOut' })) },
    { group: 'Animations — Loop', items: CR.ANIM_LOOP.map(([id, name]) => ({ id: 'aloop-' + id, name, kind: UNIT[id] ? 'text' : 'visual', clipAnim: { slot: 'loop', type: id, speed: 1, amount: 50 }, exclusive: 'animLoop' })) },
    { group: 'Creative Effects', items: Object.entries(CR.VFX).map(([id, v]) => ({ id: 'vfx-' + id, name: v.name, kind: 'visual', vfx: { [id]: Object.assign({}, v.def) } })) },
    { group: 'Filters', items: CR.FILTERS.map(([id, name, props]) => ({ id: 'flt-' + id, name, kind: 'visual', props, exclusive: 'filter' })) },
    { group: 'Text Styles', items: CR.TEXT_STYLES.map(([id, name, st]) => ({ id: 'tst-' + id, name, kind: 'text', textStyle: st, oneShot: true })) },
    { group: 'Title Templates', items: CR.TEMPLATES.map(([id, name]) => ({ id: 'tpl-' + id, name, kind: 'create', create: (t) => CR.createTemplate(id, t) })) },
    { group: 'Stickers', items: CR.STICKERS.map((e, i) => ({ id: 'stk-' + i, name: e + '  Sticker', kind: 'create', create: (t) => CR.createSticker(e, t) })) },
    { group: 'Voice Effects', items: CR.VOICES.map(([id, name]) => ({ id: 'vox-' + id, name, kind: 'audio', voice: id, exclusive: 'voice' })) },
    { group: 'Sound Effects', items: CR.SFX.map(([id, name]) => ({ id: 'sfx-' + id, name, kind: 'create', sound: true, create: (t) => CR.addSfx(id, t) })) },
    { group: 'Smart Audio', items: [{ id: 'autoduck', name: 'Auto Duck Music Under Voice', kind: 'audio', action: (targets) => CR.duck(targets) }] },
  ];
  CR.COLOR_KEYS = COLOR_KEYS;
  if (RS.effects && RS.effects.list) RS.effects.list.push(...CR.groups());
})(window.RS);
