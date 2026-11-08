'use strict';
// Effect Controls panel: Motion, Opacity, Time, Color, Audio, Text — with keyframes.
(function (RS) {
  const S = RS.state;
  const I = RS.inspector = {};
  let root, body;
  let currentId = null;
  const bindings = []; // { read: fn } refreshed when time or values change

  const NUM = {
    x: { label: 'Position X', min: -4000, max: 4000, step: 1, unit: 'px' },
    y: { label: 'Position Y', min: -4000, max: 4000, step: 1, unit: 'px' },
    scale: { label: 'Scale', min: 0, max: 800, step: 0.5, unit: '%' },
    rotation: { label: 'Rotation', min: -720, max: 720, step: 0.5, unit: '°' },
    opacity: { label: 'Opacity', min: 0, max: 100, step: 1, unit: '%' },
    volume: { label: 'Volume', min: 0, max: 300, step: 1, unit: '%' },
    fadeIn: { label: 'Fade In', min: 0, max: 30, step: 0.05, unit: 's' },
    fadeOut: { label: 'Fade Out', min: 0, max: 30, step: 0.05, unit: 's' },
    brightness: { label: 'Brightness', min: 0, max: 300, step: 1, unit: '%' },
    contrast: { label: 'Contrast', min: 0, max: 300, step: 1, unit: '%' },
    saturation: { label: 'Saturation', min: 0, max: 300, step: 1, unit: '%' },
    hue: { label: 'Hue', min: -180, max: 180, step: 1, unit: '°' },
    grayscale: { label: 'Black & White', min: 0, max: 100, step: 1, unit: '%' },
    sepia: { label: 'Sepia', min: 0, max: 100, step: 1, unit: '%' },
    invert: { label: 'Invert', min: 0, max: 100, step: 1, unit: '%' },
    blur: { label: 'Blur', min: 0, max: 60, step: 0.5, unit: 'px' },
    temperature: { label: 'Temperature', min: -100, max: 100, step: 1, unit: '' },
    tint: { label: 'Tint', min: -100, max: 100, step: 1, unit: '' },
    vignette: { label: 'Vignette', min: 0, max: 100, step: 1, unit: '%' },
    cropL: { label: 'Left', min: 0, max: 100, step: 0.5, unit: '%' },
    cropT: { label: 'Top', min: 0, max: 100, step: 0.5, unit: '%' },
    cropR: { label: 'Right', min: 0, max: 100, step: 0.5, unit: '%' },
    cropB: { label: 'Bottom', min: 0, max: 100, step: 0.5, unit: '%' },
    skewX: { label: 'Skew X', min: -80, max: 80, step: 0.5, unit: '°' },
    skewY: { label: 'Skew Y', min: -80, max: 80, step: 0.5, unit: '°' },
    sharpen: { label: 'Amount', min: 0, max: 300, step: 1, unit: '%' },
    mosaic: { label: 'Blocks across', min: 2, max: 300, step: 1, unit: '' },
    shadowOpacity: { label: 'Opacity', min: 0, max: 100, step: 1, unit: '%' },
    shadowDist: { label: 'Distance', min: 0, max: 300, step: 1, unit: 'px' },
    shadowAngle: { label: 'Direction', min: 0, max: 360, step: 1, unit: '°' },
    shadowSoft: { label: 'Softness', min: 0, max: 200, step: 1, unit: 'px' },
    gain: { label: 'Audio Gain', min: -40, max: 30, step: 0.1, unit: 'dB' },
    pan: { label: 'Pan', min: -100, max: 100, step: 1, unit: '' },
    remap: { label: 'Time Remap Speed', min: 0, max: 1000, step: 1, unit: '%' },
  };

  I.init = (el) => {
    root = el;
    root.innerHTML = '';
    body = RS.h('div', { class: 'ec-body' });
    root.append(body);
    // Drop effects / transitions straight onto Effect Controls (applies to the shown clip).
    const accepts = () => { const p = RS.dragPayload; return p && (p.kind === 'effect' || p.kind === 'transition' || p.kind === 'atransition'); };
    root.addEventListener('dragover', (e) => { if (!accepts() || !currentId) return; e.preventDefault(); root.classList.add('drop'); });
    root.addEventListener('dragleave', (e) => { if (!root.contains(e.relatedTarget)) root.classList.remove('drop'); });
    root.addEventListener('drop', (e) => {
      root.classList.remove('drop');
      if (!accepts() || !currentId) return;
      e.preventDefault();
      const p = RS.dragPayload; RS.dragPayload = null;
      RS.effects.dropOn(p, RS.getClip(currentId));
    });
    RS.on('selection', () => I.render());
    RS.on('change', (o) => {
      if (o && (o.source === 'inspector-live')) return;
      const sel = single();
      if (!sel || sel.id !== currentId) I.render();
      else I.refresh();
    });
    RS.on('time', () => I.refresh());
    I.render();
  };

  const single = () => {
    const sel = RS.selectedClips();
    if (!sel.length) return null;
    // A linked V+A pair counts as one selection: show the video part with audio controls attached.
    const vis = sel.filter(RS.isVisual);
    if (sel.length === 1) return sel[0];
    if (vis.length === 1 && sel.every((c) => c === vis[0] || (c.linkId && c.linkId === vis[0].linkId))) return vis[0];
    return null;
  };
  const lt = (c) => RS.clamp(S.playhead - c.start, 0, c.duration);
  const clip = () => (currentId ? RS.getClip(currentId) : null);
  const audioPartner = (c) => (RS.isAudioClip(c) ? c : (c.linkId ? RS.linked(c).find(RS.isAudioClip) : null));

  I.render = () => {
    bindings.length = 0;
    body.innerHTML = '';
    if (S.selTransition) { currentId = null; renderTransition(); return; }
    const c = single();
    currentId = c ? c.id : null;
    if (!c) {
      const n = S.selection.size;
      body.append(RS.h('div', { class: 'empty-note' }, n > 1 ? `${n} clips selected. Select a single clip to edit its effects.` : 'Select a clip in the timeline to edit its motion, opacity, color, speed and audio.'));
      return;
    }
    const tr = RS.getTrack(c.trackId);
    body.append(RS.h('div', { class: 'ec-title' },
      RS.icon(c.type === 'audio' ? 'music' : c.type === 'text' ? 'text' : c.type === 'image' ? 'image' : c.type === 'solid' ? 'square' : 'film'),
      RS.h('span', { class: 'name' }, RS.clipName(c)),
      RS.h('span', { class: 'muted' }, tr ? tr.name : '')));

    body.append(appliedFx(c));
    if (c.type === 'image' && c.mediaId) body.append(RS.h('div', { class: 'ec-tools' }, RS.h('button', { class: 'btn small', onclick: () => RS.bgRemove.open(c.mediaId, [c.id]) }, 'Remove Background…')));
    if (c.type === 'video' && !c.key) body.append(RS.h('div', { class: 'ec-tools' }, RS.h('button', { class: 'btn small', onclick: () => RS.bgRemove.video(c.id) }, 'Remove Background')));
    if (c.type === 'text') body.append(textSection(c), textFxSection(c));
    if (RS.isVisual(c) && RS.creative) body.append(animSection(c));
    if (RS.isVisual(c) && c.vfx && RS.creative) body.append(vfxSection(c));
    if (c.type === 'solid') body.append(section('Color Matte', [colorRow('Color', () => clip().color, (v) => { clip().color = v; })]));
    if (c.type === 'shape') body.append(shapeSection());
    if (c.type === 'graphic') body.append(graphicSection(c));
    if (RS.isVisual(c)) {
      const motion = ['x', 'y', 'scale', 'rotation'].map((k) => numRow(c.id, k));
      if (c.type === 'video' || c.type === 'image') motion.push(toggle('Scale to fill frame', () => !!clip().props.fill, (v) => { clip().props.fill = v ? 1 : 0; }));
      body.append(section('Motion', motion));
      body.append(section('Opacity', [...['opacity', 'fadeIn', 'fadeOut'].map((k) => numRow(c.id, k)), masksBlock(c)]));
      body.append(lumetriSection(c));
      const styl = ['brightness', 'contrast', 'hue', 'grayscale', 'sepia', 'invert', 'blur'];
      body.append(section('Stylize & Blur', styl.map((k) => numRow(c.id, k)), styl.every((k) => c.props[k] === RS.DEFAULT_PROPS[k])));
      for (const sec of videoEffectSections(c)) body.append(sec);
      body.append(transitionsSummary(c));
    }
    if (c.type === 'nest' && c.multicam) {
      const inner = RS.getSequence(c.seqId);
      const sel = RS.h('select', null, RS.tracksOf('video', inner).map((_, i) => RS.h('option', { value: i }, 'Camera ' + (i + 1))));
      sel.addEventListener('change', () => RS.commit('Switch camera', () => { RS.getClip(currentId).angle = +sel.value; }));
      bindings.push({ read: () => { const x = RS.getClip(currentId); if (x) sel.value = x.angle || 0; } });
      body.append(section('Multi-Camera', [RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, 'Active angle'), sel)]));
    }
    if (RS.isMediaBound(c)) body.append(speedSection(c));
    const a = audioPartner(c);
    if (a) body.append(section('Audio' + (a.id !== c.id ? ' (linked)' : ''), [...['volume', 'gain', 'pan', 'fadeIn', 'fadeOut'].map((k) => numRow(a.id, k)),
      RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, ''), RS.h('button', { class: 'btn small', onclick: () => { RS.select([a.id]); RS.loudness.dialog(); } }, 'Normalize Loudness…')),
      ...audioEffectRows(a)]));
    body.append(RS.h('div', { class: 'ec-foot' },
      RS.h('button', { class: 'btn small', onclick: () => RS.cmd('resetEffects') }, 'Reset all effects')));
    structKey = keyOf(c);
    I.refresh();
  };

  function section(title, rows, collapsed) {
    const sec = RS.h('div', { class: 'ec-section' + (collapsed ? ' collapsed' : '') });
    const head = RS.h('div', { class: 'ec-sec-head' }, RS.h('span', { class: 'caret' }), title);
    head.addEventListener('click', () => sec.classList.toggle('collapsed'));
    sec.append(head, RS.h('div', { class: 'ec-sec-body' }, rows));
    return sec;
  }

  // Live edit helper: first input in a gesture snapshots, 'change'/pointerup commits one undo step.
  function live(mutate) {
    RS.beginEdit();
    mutate();
    RS.engine.invalidate();
    RS.emit('change', { source: 'inspector-live' }); // timeline + monitor redraw; inspector keeps focus
    I.refresh();
  }
  const finish = (label) => RS.endEdit(label);

  function numRow(clipId, key) {
    const def = NUM[key];
    const get = () => RS.getClip(clipId);
    const animatable = RS.ANIMATABLE.has(key);
    const row = RS.h('div', { class: 'ec-row' });
    const sw = RS.h('button', { class: 'ibtn sw', title: 'Toggle animation (keyframes)' });
    sw.append(RS.icon('stopwatch'));
    if (!animatable) sw.style.visibility = 'hidden';
    const label = RS.h('label', { class: 'scrub', title: 'Drag to change' }, def.label);
    const num = RS.h('input', { type: 'number', class: 'num', step: def.step });
    const range = RS.h('input', { type: 'range', min: def.min, max: def.max, step: def.step });
    const unit = RS.h('span', { class: 'unit' }, def.unit);
    const kfPrev = RS.iconBtn('prev', 'Previous keyframe');
    const kfAdd = RS.iconBtn('kf', 'Add / remove keyframe');
    const kfNext = RS.iconBtn('next', 'Next keyframe');
    const kfBox = RS.h('div', { class: 'kf-nav' }, kfPrev, kfAdd, kfNext);
    const reset = RS.iconBtn('reset', 'Reset');
    const isTimeLike = key === 'fadeIn' || key === 'fadeOut';

    const setVal = (v) => {
      const c = get();
      if (!c) return;
      v = RS.clamp(+v, def.min, isTimeLike ? Math.min(def.max, c.duration) : Math.max(def.max, 1e6));
      if (!isFinite(v)) return;
      RS.setPropAt(c, key, v, lt(c));
    };

    range.addEventListener('input', () => live(() => setVal(range.value)));
    range.addEventListener('change', () => finish(def.label));
    num.addEventListener('change', () => { live(() => setVal(num.value)); finish(def.label); });
    num.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const c = get();
        const cur = RS.getProp(c, key, lt(c));
        const d = (e.key === 'ArrowUp' ? 1 : -1) * def.step * (e.shiftKey ? 10 : 1);
        live(() => setVal(+(cur + d).toFixed(4)));
        finish(def.label);
      }
      e.stopPropagation();
    });

    // Scrubbable label (drag horizontally to change the value)
    label.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const c = get();
      if (!c) return;
      const startV = RS.getProp(c, key, lt(c));
      const sx = e.clientX;
      label.setPointerCapture(e.pointerId);
      const mv = (ev) => {
        const mult = ev.shiftKey ? 10 : ev.altKey ? 0.1 : 1;
        live(() => setVal(+(startV + (ev.clientX - sx) * def.step * mult).toFixed(4)));
      };
      const up = () => { label.removeEventListener('pointermove', mv); label.removeEventListener('pointerup', up); finish(def.label); };
      label.addEventListener('pointermove', mv);
      label.addEventListener('pointerup', up);
    });

    sw.addEventListener('click', () => RS.commit(RS.isKeyframed(get(), key) ? 'Stop animating' : 'Animate ' + def.label, () => {
      const c = get();
      RS.toggleKeyframing(c, key, lt(c));
    }));
    kfAdd.addEventListener('click', () => RS.commit('Keyframe', () => {
      const c = get();
      const t = lt(c);
      if (!RS.isKeyframed(c, key)) { RS.toggleKeyframing(c, key, t); return; }
      const hit = RS.keyframeAt(c, key, t);
      if (hit) {
        c.kf[key].splice(c.kf[key].indexOf(hit), 1);
        if (!c.kf[key].length) { delete c.kf[key]; c.props[key] = hit.v; }
      } else RS.setPropAt(c, key, RS.getProp(c, key, t), t);
    }));
    const jump = (dir) => {
      const c = get();
      const k = (c.kf && c.kf[key]) || [];
      const t = lt(c);
      const fps = RS.fps();
      const list = dir > 0 ? k.filter((p) => p.t > t + 0.5 / fps) : k.filter((p) => p.t < t - 0.5 / fps).reverse();
      if (list[0]) RS.engine.seek(c.start + list[0].t);
    };
    kfPrev.addEventListener('click', () => jump(-1));
    kfNext.addEventListener('click', () => jump(1));
    reset.addEventListener('click', () => RS.commit('Reset ' + def.label, () => {
      const c = get();
      if (c.kf) delete c.kf[key];
      c.props[key] = RS.DEFAULT_PROPS[key];
    }));

    row.append(sw, label, range, num, unit, animatable ? kfBox : RS.h('div', { class: 'kf-nav' }), reset);
    bindings.push({
      read: () => {
        const c = get();
        if (!c) return;
        const t = lt(c);
        const v = RS.getProp(c, key, t);
        const animated = RS.isKeyframed(c, key);
        if (document.activeElement !== num) num.value = +(+v).toFixed(2);
        range.value = v;
        sw.classList.toggle('on', animated);
        kfBox.classList.toggle('show', animated);
        const onKf = animated && !!RS.keyframeAt(c, key, t);
        kfAdd.innerHTML = '';
        kfAdd.append(RS.icon(onKf ? 'kfOn' : 'kf'));
        kfAdd.classList.toggle('on', onKf);
        row.classList.toggle('changed', animated || v !== RS.DEFAULT_PROPS[key]);
      },
    });
    return row;
  }

  function speedSection(c) {
    const row = RS.h('div', { class: 'ec-row flex' });
    const num = RS.h('input', { type: 'number', class: 'num', min: 10, max: 1600, step: 5 });
    const presets = RS.h('div', { class: 'chips' }, [25, 50, 100, 200, 400].map((p) =>
      RS.h('button', { class: 'chip', onclick: () => apply(p) }, p + '%')));
    const apply = (pct) => {
      pct = RS.clamp(+pct || 100, 10, 1600);
      RS.commit('Speed ' + pct + '%', () => {
        const base = RS.getClip(currentId);
        const group = RS.withLinked([base]).filter(RS.isMediaBound);
        const ids = new Set(group.map((x) => x.id));
        for (const x of group) RS.ops.setSpeed(x, pct / 100);
        for (const x of group) RS.ops.clearRange(x.trackId, x.start, RS.clipEnd(x), ids);
      });
    };
    num.addEventListener('change', () => apply(num.value));
    num.addEventListener('keydown', (e) => e.stopPropagation());
    row.append(RS.h('div', { class: 'sw-space' }), RS.h('label', null, 'Speed'), num, RS.h('span', { class: 'unit' }, '%'), presets);
    bindings.push({ read: () => { const x = RS.getClip(currentId); if (x && document.activeElement !== num) num.value = Math.round(x.speed * 100); } });
    const dur = RS.h('div', { class: 'ec-row info' });
    bindings.push({ read: () => { const x = RS.getClip(currentId); if (x) dur.textContent = `Duration ${RS.fmtTC(x.duration, RS.fps())}   ·   Source in ${RS.fmtTC(x.in, RS.fps())}`; } });
    const extra = [];
    if (c.type === 'video' || c.type === 'nest') extra.push(numRow(c.id, 'remap'));
    if (RS.isElementClip(c)) extra.push(RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, ''),
      RS.h('div', { class: 'chips' },
        RS.h('button', { class: 'chip' + (c.reverse ? ' on' : ''), onclick: () => RS.cmd('reverseClip') }, '◀◀ Reverse'),
        c.type === 'video' ? RS.h('button', { class: 'chip' + (c.hold ? ' on' : ''), onclick: () => RS.cmd('frameHold') }, 'Frame Hold') : null,
        c.type === 'video' ? RS.h('button', { class: 'chip', onclick: () => RS.cmd('insertHold') }, 'Insert 2 s Hold') : null)));
    return section('Time', [row, ...extra, dur]);
  }

  // ---------- generic slider row bound to any object field ----------
  function objRow(label, get, set, min, max, step, unit, def = 0) {
    const row = RS.h('div', { class: 'ec-row' });
    const lab = RS.h('label', { class: 'scrub', title: 'Drag to change' }, label);
    const range = RS.h('input', { type: 'range', min, max, step });
    const num = RS.h('input', { type: 'number', class: 'num', step });
    const reset = RS.iconBtn('reset', 'Reset');
    const setV = (v) => { v = RS.clamp(+v, min, max); if (isFinite(v)) set(v); };
    range.addEventListener('input', () => live(() => setV(range.value)));
    range.addEventListener('change', () => finish(label));
    num.addEventListener('change', () => { live(() => setV(num.value)); finish(label); });
    num.addEventListener('keydown', (e) => e.stopPropagation());
    lab.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const v0 = get(), sx = e.clientX;
      lab.setPointerCapture(e.pointerId);
      const mv = (ev) => live(() => setV(+(v0 + (ev.clientX - sx) * step * (ev.shiftKey ? 10 : ev.altKey ? 0.1 : 1)).toFixed(4)));
      const up = () => { lab.removeEventListener('pointermove', mv); lab.removeEventListener('pointerup', up); finish(label); };
      lab.addEventListener('pointermove', mv);
      lab.addEventListener('pointerup', up);
    });
    reset.addEventListener('click', () => RS.commit('Reset ' + label, () => set(def)));
    row.append(RS.h('div', { class: 'sw-space' }), lab, range, num, RS.h('span', { class: 'unit' }, unit || ''), RS.h('div', { class: 'kf-nav' }), reset);
    bindings.push({ read: () => { const v = get(); if (document.activeElement !== num) num.value = +(+v).toFixed(2); range.value = v; row.classList.toggle('changed', v !== def); } });
    return row;
  }

  // ---------- Lumetri Color ----------
  function lumetriSection(c) {
    const getL = () => { const x = RS.getClip(currentId); return (x && x.lumetri) || RS.DEFAULT_LUMETRI(); };
    const ensureL = () => { const x = RS.getClip(currentId); if (!x.lumetri) x.lumetri = RS.DEFAULT_LUMETRI(); return x.lumetri; };
    const lrow = (label, key, min, max, step, unit) => objRow(label, () => getL()[key], (v) => { ensureL()[key] = v; }, min, max, step, unit);
    const hooks = { getL, ensureL, live, finish, commit: (label, fn) => RS.commit(label, fn), bindings };
    const sub = (title, rows) => RS.h('div', { class: 'ec-sub' }, RS.h('div', { class: 'ec-sub-head' }, title), rows);
    const sec = section('Lumetri Color', [
      sub('Basic Correction', [
        numRow(c.id, 'temperature'), numRow(c.id, 'tint'),
        lrow('Exposure', 'exposure', -4, 4, 0.05, 'stops'), lrow('Contrast', 'contrast', -100, 100, 1, ''),
        lrow('Highlights', 'highlights', -100, 100, 1, ''), lrow('Shadows', 'shadows', -100, 100, 1, ''),
        lrow('Whites', 'whites', -100, 100, 1, ''), lrow('Blacks', 'blacks', -100, 100, 1, ''),
        numRow(c.id, 'saturation'),
      ]),
      sub('Curves', [RS.colorUI.curves(hooks)]),
      sub('Color Wheels', [RS.colorUI.wheels(hooks)]),
      sub('Vignette', [numRow(c.id, 'vignette')]),
      RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, ''),
        RS.h('button', { class: 'btn small', onclick: () => RS.commit('Reset Lumetri', () => { const x = RS.getClip(currentId); x.lumetri = null; x.props.temperature = 0; x.props.tint = 0; x.props.saturation = 100; x.props.vignette = 0; }) }, 'Reset Lumetri')),
    ], !RS.lumetriActive(c.lumetri));
    return sec;
  }

  // ---------- Masks ----------
  function masksBlock(c) {
    const box = RS.h('div', { class: 'mask-block' });
    const add = (kind) => {
      const id = RS.uid('mask');
      RS.commit('Add ' + kind + ' mask', () => {
        const x = RS.getClip(currentId);
        x.masks = x.masks || [];
        x.masks.push({ id, kind, cx: 0.5, cy: 0.5, w: 0.4, h: 0.4, feather: 10, expansion: 0, opacity: 100, invert: false });
      });
      S.activeMask = { clipId: currentId, maskId: id };
      RS.engine.invalidate();
      I.render();
    };
    box.append(RS.h('div', { class: 'mask-tools' },
      RS.h('span', { class: 'muted small' }, 'Masks'),
      RS.h('button', { class: 'btn small', title: 'Ellipse mask', onclick: () => add('ellipse') }, RS.icon('ellipse'), 'Ellipse'),
      RS.h('button', { class: 'btn small', title: 'Rectangle mask', onclick: () => add('rect') }, RS.icon('rect'), 'Rectangle'),
      RS.h('button', { class: 'btn small', title: 'Pen mask (P): click points in the Program monitor', onclick: () => RS.timeline.setTool('pen') }, RS.icon('pen'), 'Pen')));
    (c.masks || []).forEach((mask, i) => {
      const getM = () => { const x = RS.getClip(currentId); return x && (x.masks || []).find((q) => q.id === mask.id); };
      const kindName = { ellipse: 'Ellipse', rect: 'Rectangle', poly: 'Pen' }[mask.kind];
      const isActive = () => S.activeMask && S.activeMask.maskId === mask.id;
      const editBtn = RS.h('button', { class: 'btn small', title: 'Show handles in the Program monitor' }, 'Edit');
      editBtn.addEventListener('click', () => { S.activeMask = isActive() ? null : { clipId: currentId, maskId: mask.id }; RS.engine.invalidate(); I.refresh(); });
      const inv = RS.h('input', { type: 'checkbox', title: 'Inverted' });
      inv.addEventListener('change', () => RS.commit('Invert mask', () => { getM().invert = inv.checked; }));
      const trackBtn = RS.h('button', { class: 'btn small', title: 'Track the mask forward from the playhead' }, RS.icon('track'), 'Track ▶');
      trackBtn.disabled = c.type !== 'video';
      trackBtn.addEventListener('click', () => RS.tracker.trackMask(currentId, mask.id));
      const clearTrack = RS.h('button', { class: 'btn small', title: 'Remove tracking data' }, 'Clear track');
      clearTrack.addEventListener('click', () => RS.commit('Clear mask track', () => { delete getM().track; }));
      const del = RS.iconBtn('trash', 'Delete mask', () => { RS.commit('Delete mask', () => { const x = RS.getClip(currentId); x.masks = x.masks.filter((q) => q.id !== mask.id); }); if (isActive()) S.activeMask = null; I.render(); });
      const card = RS.h('div', { class: 'mask-card' },
        RS.h('div', { class: 'mask-head' }, RS.h('b', null, `Mask (${i + 1})`), RS.h('span', { class: 'muted small' }, kindName), RS.h('div', { class: 'grow' }),
          RS.h('label', { class: 'inv' }, inv, 'Inverted'), editBtn, del),
        objRow('Feather', () => getM().feather, (v) => { getM().feather = v; }, 0, 300, 1, 'px', 10),
        objRow('Opacity', () => getM().opacity, (v) => { getM().opacity = v; }, 0, 100, 1, '%', 100),
        objRow('Expansion', () => getM().expansion, (v) => { getM().expansion = v; }, -300, 300, 1, 'px', 0),
        RS.h('div', { class: 'mask-track' }, trackBtn, clearTrack, RS.h('span', { class: 'muted small track-info' })));
      bindings.push({ read: () => {
        const m = getM(); if (!m) return;
        inv.checked = !!m.invert;
        editBtn.classList.toggle('on', !!isActive());
        card.classList.toggle('active', !!isActive());
        const info = card.querySelector('.track-info');
        info.textContent = m.track ? `Tracked ${m.track.offsets.length} frames` : '';
        clearTrack.disabled = !m.track;
      } });
      box.append(card);
    });
    return box;
  }

  const has = (c, id) => (c.fx || []).includes(id);
  function videoEffectSections(c) {
    const out = [];
    const P = () => RS.getClip(currentId);
    if (has(c, 'crop') || ['cropL', 'cropT', 'cropR', 'cropB'].some((k) => c.props[k])) out.push(section('Crop', ['cropL', 'cropT', 'cropR', 'cropB'].map((k) => numRow(c.id, k))));
    if (has(c, 'transform') || c.props.skewX || c.props.skewY) out.push(section('Transform', ['skewX', 'skewY'].map((k) => numRow(c.id, k))));
    if (c.props.flipH || c.props.flipV || has(c, 'hflip') || has(c, 'vflip')) out.push(section('Flip', [
      toggle('Horizontal flip', () => !!P().props.flipH, (v) => { P().props.flipH = v ? 1 : 0; }),
      toggle('Vertical flip', () => !!P().props.flipV, (v) => { P().props.flipV = v ? 1 : 0; })]));
    if (c.props.shadow) out.push(section('Drop Shadow', [colorRow('Color', () => P().shadowColor || '#000000', (v) => { P().shadowColor = v; }), ...['shadowOpacity', 'shadowDist', 'shadowAngle', 'shadowSoft'].map((k) => numRow(c.id, k))]));
    if (c.props.sharpen) out.push(section('Sharpen', [numRow(c.id, 'sharpen')]));
    if (c.props.mosaic) out.push(section('Mosaic', [numRow(c.id, 'mosaic')]));
    if (c.key) {
      const K = () => P().key;
      const pick = RS.h('button', { class: 'btn small', title: 'Click, then click the background colour in the Program monitor' }, RS.icon('eyedrop'), 'Pick from Program');
      pick.addEventListener('click', () => RS.program.pickColor(currentId, (hex) => RS.commit('Key colour', () => { K().color = hex; })));
      out.push(section('Ultra Key', [
        toggle('Enabled', () => K().on !== false, (v) => { K().on = v; }),
        RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, 'Key color'), (() => { const inp = RS.h('input', { type: 'color' }); inp.addEventListener('input', () => live(() => { K().color = inp.value; })); inp.addEventListener('change', () => finish('Key colour')); bindings.push({ read: () => { if (document.activeElement !== inp) inp.value = K().color; } }); return inp; })(), pick),
        (() => {
          const sel = RS.h('select', null, RS.h('option', { value: 'color' }, 'Colour (green/blue screen)'), RS.h('option', { value: 'rgb' }, 'Brightness (white/black/grey)'));
          sel.addEventListener('change', () => RS.commit('Key mode', () => { K().mode = sel.value; if (sel.value === 'rgb') K().spill = 0; }));
          bindings.push({ read: () => { sel.value = K().mode || 'color'; } });
          return RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, 'Mode'), sel);
        })(),
        toggle('Keep inside (edges only)', () => !!K().edges, (v) => { K().edges = v; }),
        objRow('Tolerance', () => K().tolerance, (v) => { K().tolerance = v; }, 0, 100, 1, '', 30),
        objRow('Softness', () => K().softness, (v) => { K().softness = v; }, 0, 100, 1, '', 15),
        objRow('Spill suppression', () => K().spill, (v) => { K().spill = v; }, 0, 100, 1, '', 50),
      ]));
    }
    return out;
  }
  function audioEffectRows(a) {
    const rows = [];
    const A = (k) => () => RS.getClip(a.id).afx[k];
    const fx = a.afx || {};
    const head = (t) => RS.h('div', { class: 'ec-sub-head' }, t);
    if (fx.eq) rows.push(head('Parametric EQ'),
      objRow('Low (200 Hz)', () => A('eq')().low, (v) => { A('eq')().low = v; }, -18, 18, 0.5, 'dB', 0),
      objRow('Mid', () => A('eq')().mid, (v) => { A('eq')().mid = v; }, -18, 18, 0.5, 'dB', 0),
      objRow('Mid frequency', () => A('eq')().midFreq, (v) => { A('eq')().midFreq = v; }, 100, 8000, 10, 'Hz', 1000),
      objRow('High (4 kHz)', () => A('eq')().high, (v) => { A('eq')().high = v; }, -18, 18, 0.5, 'dB', 0));
    if (fx.comp) rows.push(head('Compressor'),
      objRow('Threshold', () => A('comp')().threshold, (v) => { A('comp')().threshold = v; }, -60, 0, 0.5, 'dB', -24),
      objRow('Ratio', () => A('comp')().ratio, (v) => { A('comp')().ratio = v; }, 1, 20, 0.5, ':1', 4),
      objRow('Make-up gain', () => A('comp')().makeup, (v) => { A('comp')().makeup = v; }, 0, 24, 0.5, 'dB', 3));
    if (fx.hp) rows.push(head('High-Pass'), objRow('Cut-off', () => A('hp')().freq, (v) => { A('hp')().freq = v; }, 20, 400, 1, 'Hz', 80));
    if (fx.dehum) {
      const sel = RS.h('select', null, RS.h('option', { value: 50 }, '50 Hz (Europe, Asia)'), RS.h('option', { value: 60 }, '60 Hz (Americas)'));
      sel.addEventListener('change', () => RS.commit('DeHum frequency', () => { A('dehum')().freq = +sel.value; }));
      bindings.push({ read: () => { sel.value = A('dehum')().freq; } });
      rows.push(head('DeHum'), RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, 'Mains frequency'), sel));
    }
    if (fx.gate) rows.push(head('Noise Gate'), objRow('Threshold', () => A('gate')().threshold, (v) => { A('gate')().threshold = v; }, -90, -10, 0.5, 'dB', -45));
    return rows;
  }

  // Effects applied from the Effects panel, listed like Premiere's effect stack.
  function appliedFx(c) {
    const ids = [...new Set([...(c.fx || []), ...RS.withLinked([c]).flatMap((x) => (x.id !== c.id ? x.fx || [] : []))])];
    const box = RS.h('div', { class: 'fx-stack' + (ids.length ? '' : ' empty') });
    if (!ids.length) { box.append(RS.h('span', { class: 'muted small' }, 'Drag effects here from the Effects panel')); return box; }
    for (const id of ids) {
      const fx = RS.effects.find(id);
      const owner = RS.withLinked([c]).find((x) => (x.fx || []).includes(id));
      box.append(RS.h('div', { class: 'fx-chip' }, RS.icon('fx'), fx ? fx.name : id,
        RS.iconBtn('close', 'Remove effect', () => RS.effects.remove(owner.id, id))));
    }
    return box;
  }

  // In / Out / Loop animations (CapCut-style), editable per clip.
  function animSection(c) {
    const CR = RS.creative;
    const rows = [];
    const slot = (key, label, list) => {
      const sel = RS.h('select', null, RS.h('option', { value: '' }, 'None'), list.map(([id, name]) => RS.h('option', { value: id }, name)));
      sel.addEventListener('change', () => {
        RS.commit(label + ' animation', () => {
          const x = RS.getClip(currentId);
          x.anim = x.anim || {};
          if (!sel.value) delete x.anim[key];
          else x.anim[key] = Object.assign(key === 'loop' ? { speed: 1, amount: 50 } : { dur: sel.value === 'typewriter' ? 1.5 : 0.5 }, x.anim[key] || {}, { type: sel.value });
          if (!Object.keys(x.anim).length) delete x.anim;
        });
        setTimeout(() => I.render(), 0);
        RS.engine.seek(key === 'out' ? Math.max(c.start, RS.clipEnd(RS.getClip(currentId)) - 1.2) : RS.getClip(currentId).start);
      });
      bindings.push({ read: () => { const a = (RS.getClip(currentId).anim || {})[key]; sel.value = a ? a.type : ''; } });
      rows.push(RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, label), sel));
      const cur = (c.anim || {})[key];
      if (cur && key !== 'loop') rows.push(objRow(label + ' duration', () => ((RS.getClip(currentId).anim || {})[key] || {}).dur || 0.5, (v) => { RS.getClip(currentId).anim[key].dur = v; }, 0.1, 5, 0.05, 's', 0.5));
      if (cur && key === 'loop') rows.push(
        objRow('Loop speed', () => (RS.getClip(currentId).anim.loop || {}).speed || 1, (v) => { RS.getClip(currentId).anim.loop.speed = v; }, 0.1, 5, 0.05, '×', 1),
        objRow('Loop strength', () => (RS.getClip(currentId).anim.loop || {}).amount ?? 50, (v) => { RS.getClip(currentId).anim.loop.amount = v; }, 0, 200, 1, '%', 50));
    };
    slot('in', 'In', CR.ANIM_IN);
    slot('out', 'Out', CR.ANIM_OUT);
    slot('loop', 'Loop', CR.ANIM_LOOP);
    return section('Animation', rows, !c.anim);
  }

  function vfxSection(c) {
    const CR = RS.creative;
    const rows = [];
    for (const k of Object.keys(c.vfx)) {
      const meta = CR.VFX[k];
      if (!meta) continue;
      rows.push(objRow(meta.name, () => ((RS.getClip(currentId).vfx || {})[k] || {}).amount ?? 50, (v) => { RS.getClip(currentId).vfx[k].amount = v; }, 0, 100, 1, '%', meta.def.amount));
      if (k === 'punch') rows.push(objRow('Punch every', () => RS.getClip(currentId).vfx.punch.every || 1, (v) => { RS.getClip(currentId).vfx.punch.every = v; }, 0.2, 4, 0.05, 's', 1));
    }
    return section('Creative Effects', rows);
  }

  function toggle(label, get, set) {
    const cb = RS.h('input', { type: 'checkbox' });
    cb.addEventListener('change', () => RS.commit(label, () => set(cb.checked)));
    bindings.push({ read: () => { cb.checked = !!get(); } });
    return RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, label), cb);
  }

  function transitionsSummary(c) {
    const rows = [];
    const add = (side) => {
      const tr = side === 'in' ? c.tIn : c.tOut;
      const btn = RS.h('button', { class: 'btn small' }, tr ? RS.transitionName(tr.type) + ' · ' + tr.duration.toFixed(2) + 's' : 'Add Cross Dissolve');
      btn.addEventListener('click', () => {
        if (tr) { S.selection.clear(); S.selTransition = { clipId: c.id, side }; RS.emit('selection'); I.render(); }
        else RS.commit('Add transition', () => RS.ops.setTransition(RS.getClip(c.id), side, 'dissolve', 1));
      });
      rows.push(RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, side === 'in' ? 'At start' : 'At end'), btn));
    };
    add('in'); add('out');
    return section('Transitions', rows, true);
  }

  function renderTransition() {
    const { clipId, side } = S.selTransition;
    const c = RS.getClip(clipId);
    const tr = c && (side === 'in' ? c.tIn : c.tOut);
    if (!tr) { S.selTransition = null; I.render(); return; }
    body.append(RS.h('div', { class: 'ec-title' }, RS.icon('transition'), RS.h('span', { class: 'name' }, RS.transitionName(tr.type)), RS.h('span', { class: 'muted' }, side === 'in' ? 'at start of ' + RS.clipName(c) : 'at end of ' + RS.clipName(c))));
    const get = () => { const x = RS.getClip(clipId); return x && (side === 'in' ? x.tIn : x.tOut); };
    const type = RS.h('select', null, RS.TRANSITIONS.map((t) => RS.h('option', { value: t.id, selected: t.id === tr.type }, t.name)));
    type.addEventListener('change', () => RS.commit('Transition type', () => { get().type = type.value; }));
    const dur = RS.h('input', { type: 'number', class: 'num', min: 0.1, max: 10, step: 0.1, value: tr.duration });
    dur.addEventListener('keydown', (e) => e.stopPropagation());
    dur.addEventListener('change', () => RS.commit('Transition duration', () => { get().duration = RS.clamp(+dur.value || 1, 2 / RS.fps(), 30); }));
    const frames = RS.h('span', { class: 'muted small' });
    bindings.push({ read: () => { const t = get(); if (t) { if (document.activeElement !== dur) dur.value = +t.duration.toFixed(3); frames.textContent = Math.round(t.duration * RS.fps()) + ' frames'; } } });
    const colorRows = !RS.isShapeTransition(tr.type) ? [] : ['Main color', 'Second color', 'Edge color'].map((label, i) =>
      colorRow(label, () => ((get() || {}).colors || RS.SHAPE_COLORS)[i], (v) => { const t = get(); t.colors = (t.colors || RS.SHAPE_COLORS).slice(); t.colors[i] = v; }));
    if (colorRows.length) colorRows.push(RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, ''),
      RS.h('button', { class: 'btn small', onclick: () => RS.commit('Reset colors', () => { delete get().colors; }) }, 'Reset colors')));
    type.addEventListener('change', () => setTimeout(() => I.render(), 0));
    body.append(section('Transition', [
      RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, 'Type'), type),
      RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, 'Duration (s)'), dur, frames),
      ...colorRows,
      RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, ''),
        RS.h('button', { class: 'btn small danger', onclick: () => RS.cmd('delete') }, 'Remove transition')),
    ]));
    body.append(RS.h('div', { class: 'empty-note small' }, 'Transitions centred on a cut use extra frames beyond each clip\'s In/Out points when the source has them, and hold a frame otherwise.'));
    I.refresh();
  }

  // Library graphic: label text and colours.
  function graphicSection(c) {
    const G = () => RS.getClip(currentId).graphic;
    const rows = [];
    const txt = (label, key) => {
      const inp = RS.h('input', { type: 'text', class: 'ec-input' });
      inp.addEventListener('keydown', (e) => e.stopPropagation());
      inp.addEventListener('input', () => live(() => { G()[key] = inp.value; }));
      inp.addEventListener('change', () => finish(label));
      bindings.push({ read: () => { if (document.activeElement !== inp) inp.value = G()[key] || ''; } });
      return RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, label), inp);
    };
    const g = c.graphic || {};
    if ('text' in g) rows.push(txt('Text', 'text'));
    if ('done' in g) rows.push(txt('After click', 'done'));
    if ('color' in g) rows.push(colorRow('Colour', () => G().color, (v) => { G().color = v; }));
    if ('accent' in g) rows.push(colorRow('Accent colour', () => G().accent, (v) => { G().accent = v; }));
    rows.push(RS.h('div', { class: 'ec-row info' }, 'Move and resize it in the Program monitor or with Motion below. Drag the clip edges to change how long it stays.'));
    return section('Graphic', rows);
  }

  function shapeSection() {
    const Sh = () => RS.getClip(currentId).shape;
    const rows = [];
    const kind = RS.h('select', null, [['rect', 'Rectangle'], ['ellipse', 'Ellipse']].map(([v, l]) => RS.h('option', { value: v }, l)));
    kind.addEventListener('change', () => RS.commit('Shape type', () => { Sh().kind = kind.value; }));
    bindings.push({ read: () => { kind.value = Sh().kind; } });
    rows.push(RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, 'Shape'), kind));
    const num = (label, key, min, max) => {
      const inp = RS.h('input', { type: 'number', class: 'num', min, max, step: 1 });
      inp.addEventListener('keydown', (e) => e.stopPropagation());
      inp.addEventListener('change', () => RS.commit(label, () => { Sh()[key] = RS.clamp(+inp.value || 0, min, max); }));
      bindings.push({ read: () => { if (document.activeElement !== inp) inp.value = Sh()[key]; } });
      return RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, label), inp);
    };
    rows.push(num('Width', 'w', 2, 8000), num('Height', 'h', 2, 8000), num('Corner radius', 'radius', 0, 4000));
    rows.push(toggle('Fill', () => Sh().fillOn !== false, (v) => { Sh().fillOn = v; }));
    rows.push(colorRow('Fill color', () => Sh().fill, (v) => { Sh().fill = v; }));
    rows.push(num('Stroke width', 'strokeW', 0, 200));
    rows.push(colorRow('Stroke color', () => Sh().stroke, (v) => { Sh().stroke = v; }));
    return section('Shape', rows);
  }

  function colorRow(label, get, set) {
    const inp = RS.h('input', { type: 'color' });
    inp.addEventListener('input', () => live(() => set(inp.value)));
    inp.addEventListener('change', () => finish(label));
    bindings.push({ read: () => { if (document.activeElement !== inp) inp.value = get(); } });
    return RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, label), inp);
  }

  const FONTS = ['Helvetica Neue', 'Arial', 'Avenir Next', 'Futura', 'Gill Sans', 'Georgia', 'Times New Roman', 'Baskerville', 'Didot', 'Courier New', 'Menlo', 'Impact', 'Trebuchet MS', 'Verdana', 'Marker Felt', 'Chalkboard SE', 'American Typewriter', 'Rockwell'];

  function textSection(c) {
    const T = () => RS.getClip(currentId).text;
    const rows = [];
    const ta = RS.h('textarea', { class: 'ec-text', rows: 3, spellcheck: false });
    ta.addEventListener('input', () => live(() => { T().content = ta.value; }));
    ta.addEventListener('change', () => finish('Edit text'));
    ta.addEventListener('keydown', (e) => e.stopPropagation());
    bindings.push({ read: () => { if (document.activeElement !== ta) ta.value = T().content; } });
    rows.push(RS.h('div', { class: 'ec-row stack' }, ta));

    const font = RS.h('select', null, FONTS.map((f) => RS.h('option', { value: f }, f)));
    font.addEventListener('change', () => { live(() => { T().font = font.value; }); finish('Font'); });
    bindings.push({ read: () => { font.value = T().font; } });
    rows.push(RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, 'Font'), font));

    const size = RS.h('input', { type: 'number', class: 'num', min: 6, max: 1000, step: 1 });
    size.addEventListener('change', () => { live(() => { T().size = RS.clamp(+size.value || 100, 6, 1000); }); finish('Text size'); });
    size.addEventListener('keydown', (e) => e.stopPropagation());
    const bold = RS.h('button', { class: 'chip b', title: 'Bold' }, 'B');
    const ital = RS.h('button', { class: 'chip i', title: 'Italic' }, 'I');
    bold.addEventListener('click', () => RS.commit('Bold', () => { T().bold = !T().bold; }));
    ital.addEventListener('click', () => RS.commit('Italic', () => { T().italic = !T().italic; }));
    const aligns = ['left', 'center', 'right'].map((a) => {
      const b = RS.h('button', { class: 'chip', title: 'Align ' + a }, a[0].toUpperCase() + a.slice(1));
      b.addEventListener('click', () => RS.commit('Align', () => { T().align = a; }));
      return b;
    });
    bindings.push({
      read: () => {
        const t = T();
        if (document.activeElement !== size) size.value = t.size;
        bold.classList.toggle('on', t.bold);
        ital.classList.toggle('on', t.italic);
        aligns.forEach((b, i) => b.classList.toggle('on', t.align === ['left', 'center', 'right'][i]));
      },
    });
    rows.push(RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, 'Size'), size, RS.h('div', { class: 'chips' }, bold, ital)));
    rows.push(RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, 'Align'), RS.h('div', { class: 'chips' }, aligns)));
    rows.push(colorRow('Fill', () => T().color, (v) => { T().color = v; }));

    const strokeW = RS.h('input', { type: 'range', min: 0, max: 30, step: 1 });
    strokeW.addEventListener('input', () => live(() => { T().stroke = +strokeW.value; }));
    strokeW.addEventListener('change', () => finish('Stroke'));
    bindings.push({ read: () => { strokeW.value = T().stroke; } });
    rows.push(RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, 'Stroke'), strokeW));
    rows.push(colorRow('Stroke color', () => T().strokeColor, (v) => { T().strokeColor = v; }));

    const toggleRow = (label, key) => {
      const cb = RS.h('input', { type: 'checkbox' });
      cb.addEventListener('change', () => RS.commit(label, () => { T()[key] = cb.checked; }));
      bindings.push({ read: () => { cb.checked = !!T()[key]; } });
      return RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, label), cb);
    };
    rows.push(toggleRow('Shadow', 'shadow'));
    rows.push(toggleRow('Background', 'bg'));
    rows.push(colorRow('Background color', () => T().bgColor, (v) => { T().bgColor = v; }));
    const bgo = RS.h('input', { type: 'range', min: 0, max: 100, step: 1 });
    bgo.addEventListener('input', () => live(() => { T().bgOpacity = +bgo.value; }));
    bgo.addEventListener('change', () => finish('Background opacity'));
    bindings.push({ read: () => { bgo.value = T().bgOpacity; } });
    rows.push(RS.h('div', { class: 'ec-row flex' }, RS.h('div', { class: 'sw-space' }), RS.h('label', null, 'Bg opacity'), bgo));
    return section('Text', rows);
  }

  // Gradient, highlight colour, 3D extrusion, halftone, outer outline, offset shadow and glow.
  function textFxSection(c) {
    const T = () => RS.getClip(currentId).text;
    const DEF = {
      grad: { on: true, c1: '#5ee7ff', c2: '#3a7bff', angle: 90 },
      extrude: { on: true, depth: 12, angle: 110, color: '#5b2bd6' },
      halftone: { on: true, color: '#ffffff', size: 7, opacity: 60 },
      offShadow: { on: true, dx: 8, dy: 10, color: '#39ff6a' },
    };
    const O = (k) => { const t = T(); if (!t[k]) t[k] = Object.assign({}, DEF[k], { on: false }); return t[k]; };
    const head = (t) => RS.h('div', { class: 'ec-sub-head' }, t);
    const rows = [
      head('Gradient fill'),
      toggle('Gradient', () => !!(T().grad && T().grad.on), (v) => { O('grad').on = v; }),
      colorRow('Gradient start', () => (T().grad || DEF.grad).c1, (v) => { O('grad').c1 = v; O('grad').on = true; }),
      colorRow('Gradient end', () => (T().grad || DEF.grad).c2, (v) => { O('grad').c2 = v; O('grad').on = true; }),
      objRow('Gradient angle', () => (T().grad || DEF.grad).angle, (v) => { O('grad').angle = v; }, 0, 360, 1, '°', 90),
      head('Highlight words — type *word* in the text'),
      colorRow('Highlight colour', () => T().color2 || '#3b6bff', (v) => { T().color2 = v; }),
      head('3D extrude'),
      toggle('3D extrude', () => !!(T().extrude && T().extrude.on), (v) => { O('extrude').on = v; }),
      objRow('Depth', () => (T().extrude || DEF.extrude).depth, (v) => { O('extrude').depth = v; }, 1, 40, 1, '%', 12),
      objRow('Direction', () => (T().extrude || DEF.extrude).angle, (v) => { O('extrude').angle = v; }, 0, 360, 1, '°', 110),
      colorRow('Side colour', () => (T().extrude || DEF.extrude).color, (v) => { O('extrude').color = v; }),
      head('Halftone dots'),
      toggle('Halftone', () => !!(T().halftone && T().halftone.on), (v) => { O('halftone').on = v; }),
      colorRow('Dot colour', () => (T().halftone || DEF.halftone).color, (v) => { O('halftone').color = v; }),
      objRow('Dot size', () => (T().halftone || DEF.halftone).size, (v) => { O('halftone').size = v; }, 2, 30, 0.5, '%', 7),
      objRow('Dot opacity', () => (T().halftone || DEF.halftone).opacity, (v) => { O('halftone').opacity = v; }, 0, 100, 1, '%', 60),
      head('Outer outline & offset shadow'),
      objRow('Outer outline', () => T().stroke2 || 0, (v) => { T().stroke2 = v; }, 0, 40, 1, 'px', 0),
      colorRow('Outer outline colour', () => T().stroke2Color || '#ffffff', (v) => { T().stroke2Color = v; }),
      toggle('Offset shadow', () => !!(T().offShadow && T().offShadow.on), (v) => { O('offShadow').on = v; }),
      objRow('Shadow X', () => (T().offShadow || DEF.offShadow).dx, (v) => { O('offShadow').dx = v; }, -40, 40, 0.5, '%', 8),
      objRow('Shadow Y', () => (T().offShadow || DEF.offShadow).dy, (v) => { O('offShadow').dy = v; }, -40, 40, 0.5, '%', 10),
      colorRow('Shadow colour', () => ((T().offShadow || DEF.offShadow).color || '#39ff6a').slice(0, 7), (v) => { O('offShadow').color = v; }),
      head('Glow & spacing'),
      toggle('Glow', () => !!T().glow, (v) => { T().glow = v ? (T()._glow || '#ff2bd6') : null; }),
      colorRow('Glow colour', () => T().glow || T()._glow || '#ff2bd6', (v) => { T()._glow = v; T().glow = v; }),
      objRow('Letter spacing', () => T().spacing || 0, (v) => { T().spacing = v; }, -10, 80, 1, 'px', 0),
    ];
    const t = c.text;
    const used = (t.grad && t.grad.on) || (t.extrude && t.extrude.on) || (t.halftone && t.halftone.on) || t.stroke2 || (t.offShadow && t.offShadow.on) || t.glow;
    return section('Text Effects', rows, !used);
  }

  let structKey = '';
  const keyOf = (c) => c ? c.type + '|' + (c.masks || []).map((m) => m.id).join(',') + '|' + !!c.lumetri + '|' + (c.fx || []).join(',') : '';
  I.refresh = () => {
    if (S.selTransition) { for (const b of bindings) { try { b.read(); } catch (err) { console.warn(err); } } return; }
    if (!currentId) return;
    const cur = RS.getClip(currentId);
    if (!cur) { I.render(); return; }
    if (keyOf(cur).split('|').filter((_, i) => i !== 2).join('|') !== structKey.split('|').filter((_, i) => i !== 2).join('|')) { I.render(); return; }
    for (const b of bindings) { try { b.read(); } catch (err) { console.warn(err); } }
  };
})(window.RS);
