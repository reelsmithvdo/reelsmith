'use strict';
// Project model, undo/redo history and all timeline editing operations.
// Everything that mutates the project goes through RS.commit() so it is undoable.
(function (RS) {
  const S = RS.state = {
    project: null,
    selection: new Set(),   // clip ids
    selectedMedia: new Set(),
    playhead: 0,
    playing: false,
    tool: 'select',          // 'select' | 'razor'
    zoom: 60,                // timeline pixels per second
    userZoomed: false,       // auto-fit the timeline until the user zooms manually
    selTransition: null,     // { clipId, side: 'in' | 'out' }
    snapping: true,
    linkedSelection: true,
    dirty: false,
    filePath: null,
    clipboard: null,
  };

  // Non-serialised per-media data: object urls, thumbnails, waveform peaks.
  RS.runtime = {};

  RS.DEFAULT_PROPS = {
    x: 0, y: 0, scale: 100, rotation: 0, opacity: 100, volume: 100,
    brightness: 100, contrast: 100, saturation: 100, hue: 0, grayscale: 0, sepia: 0, blur: 0, invert: 0,
    fadeIn: 0, fadeOut: 0,
    temperature: 0, tint: 0, vignette: 0, fill: 0,
    // video effects
    cropL: 0, cropT: 0, cropR: 0, cropB: 0, flipH: 0, flipV: 0, skewX: 0, skewY: 0, sharpen: 0, mosaic: 0,
    shadow: 0, shadowDist: 12, shadowAngle: 135, shadowSoft: 14, shadowOpacity: 60,
    // audio
    gain: 0, pan: 0,
    // time remapping speed (%)
    remap: 100,
  };
  RS.ANIMATABLE = new Set(['x', 'y', 'scale', 'rotation', 'opacity', 'volume', 'pan', 'remap']);

  RS.DEFAULT_TEXT = {
    content: 'Your Title', font: 'Helvetica Neue', size: 110, color: '#ffffff', bold: true, italic: false,
    align: 'center', lineHeight: 1.15, stroke: 0, strokeColor: '#000000', shadow: true,
    bg: false, bgColor: '#000000', bgOpacity: 60,
  };

  RS.newSequence = function (name, settings, nV = 3, nA = 3) {
    const s = Object.assign({ width: 1920, height: 1080, fps: 30, bg: '#000000', autoMatch: true }, settings || {});
    const tracks = [];
    for (let i = 1; i <= nV; i++) tracks.push({ id: 'V' + i, kind: 'video', name: 'V' + i });
    for (let i = 1; i <= nA; i++) tracks.push({ id: 'A' + i, kind: 'audio', name: 'A' + i });
    return { id: RS.uid('seq'), name: name || 'Sequence 01', settings: s, tracks, clips: [], markers: [], inOut: { in: null, out: null } };
  };

  // The project holds many sequences; settings/tracks/clips/markers/inOut always refer to the
  // active one, so every editing operation works on whatever sequence is open in the timeline.
  RS.bindSequenceAliases = (p) => {
    const active = () => p.sequences.find((x) => x.id === p.activeSeq) || p.sequences[0];
    for (const key of ['settings', 'tracks', 'clips', 'markers', 'inOut']) {
      Object.defineProperty(p, key, { configurable: true, enumerable: false, get: () => active()[key], set: (v) => { active()[key] = v; } });
    }
    Object.defineProperty(p, 'seq', { configurable: true, enumerable: false, get: active });
    return p;
  };

  RS.newProject = function (settings) {
    const seq = RS.newSequence('Sequence 01', settings);
    return RS.bindSequenceAliases({ app: 'Reelsmith', version: 2, name: 'Untitled Project', media: [], sequences: [seq], activeSeq: seq.id });
  };

  RS.getSequence = (id) => S.project.sequences.find((x) => x.id === id) || null;
  RS.activeSequence = () => S.project.seq;
  RS.seqDurationOf = (seq) => (seq ? seq.clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0) : 0);
  // Does sequence a (directly or through nests) contain sequence b?
  RS.seqContains = (a, b, depth = 0) => {
    if (!a || depth > 20) return false;
    if (a.id === b.id) return true;
    return a.clips.some((c) => (c.type === 'nest' || c.type === 'nestAudio') && RS.seqContains(RS.getSequence(c.seqId), b, depth + 1));
  };

  // ---------- lookups ----------
  RS.P = () => S.project;
  RS.fps = () => S.project.settings.fps;
  RS.getClip = (id) => S.project.clips.find((c) => c.id === id) || null;
  RS.getTrack = (id, seq) => (seq || S.project.seq).tracks.find((t) => t.id === id) || null;
  RS.getMedia = (id) => S.project.media.find((m) => m.id === id) || null;
  RS.tracksOf = (kind, seq) => (seq || S.project.seq).tracks.filter((t) => t.kind === kind); // V1..Vn / A1..An
  RS.trackIndex = (track, seq) => RS.tracksOf(track.kind, seq).indexOf(track);
  RS.clipEnd = (c) => c.start + c.duration;
  RS.isVisual = (c) => c.type === 'video' || c.type === 'image' || c.type === 'text' || c.type === 'solid' || c.type === 'shape' || c.type === 'graphic' || c.type === 'nest' || c.type === 'adjust';
  RS.isTargeted = (t) => !!t && t.target !== false && !t.locked;
  // Clips with a source In point and finite source length (media files and nested sequences).
  RS.isMediaBound = (c) => c.type === 'video' || c.type === 'audio' || c.type === 'nest' || c.type === 'nestAudio';
  RS.isElementClip = (c) => c.type === 'video' || c.type === 'audio';
  RS.isAudioClip = (c) => c.type === 'audio' || c.type === 'nestAudio';
  // Length of the clip's source in seconds (Infinity for stills, titles, shapes, mattes).
  RS.sourceDuration = (c) => {
    if (c.type === 'nest' || c.type === 'nestAudio') return RS.seqDurationOf(RS.getSequence(c.seqId)) || Infinity;
    if (c.type === 'video' || c.type === 'audio') { const m = RS.getMedia(c.mediaId); return m && isFinite(m.duration) ? m.duration : Infinity; }
    return Infinity;
  };
  RS.clipsOnTrack = (tid) => S.project.clips.filter((c) => c.trackId === tid).sort((a, b) => a.start - b.start);
  RS.seqDuration = () => S.project.clips.reduce((m, c) => Math.max(m, RS.clipEnd(c)), 0);
  RS.linked = (c) => (c.linkId ? S.project.clips.filter((x) => x.linkId === c.linkId) : [c]);
  RS.trackLocked = (tid) => { const t = RS.getTrack(tid); return !t || !!t.locked; };

  // Longest duration a clip may have given its media and speed.
  RS.maxDuration = (c) => {
    const d = RS.sourceDuration(c);
    return isFinite(d) ? Math.max(0, (d - c.in) / c.speed) : Infinity;
  };

  RS.clipName = (c) => {
    if (c.label) return c.label;
    if (c.type === 'nest' || c.type === 'nestAudio') {
      const q = RS.getSequence(c.seqId);
      const n = q ? q.name : 'Missing sequence';
      return c.multicam && c.type === 'nest' ? `[MC${(c.angle || 0) + 1}] ${n}` : n;
    }
    if (c.type === 'shape') return c.shape && c.shape.kind === 'ellipse' ? 'Ellipse' : 'Rectangle';
    if (c.type === 'adjust') return 'Adjustment Layer';
    if (c.type === 'graphic') { const it = RS.library && RS.library.item(c.graphic && c.graphic.kind); return it ? it.name : 'Graphic'; }
    if (c.type === 'caption') return (c.text || 'Caption').split('\n')[0];
    if (c.type === 'text') return (c.text && c.text.content.split('\n')[0]) || 'Title';
    if (c.type === 'solid') return 'Color Matte';
    const m = RS.getMedia(c.mediaId);
    return m ? m.name : 'Missing media';
  };

  // ---------- properties & keyframes ----------
  RS.getProp = (c, name, lt) => {
    const k = c.kf && c.kf[name];
    if (k && k.length) {
      if (lt <= k[0].t) return k[0].v;
      const last = k[k.length - 1];
      if (lt >= last.t) return last.v;
      for (let i = 0; i < k.length - 1; i++) {
        const a = k[i], b = k[i + 1];
        if (lt >= a.t && lt <= b.t) {
          const u = (lt - a.t) / ((b.t - a.t) || 1);
          const e = a.ease ? u * u * (3 - 2 * u) : u; // optional smooth (ease in/out)
          return a.v + (b.v - a.v) * e;
        }
      }
    }
    const v = c.props[name];
    return v == null ? RS.DEFAULT_PROPS[name] : v;
  };
  RS.isKeyframed = (c, name) => !!(c.kf && c.kf[name] && c.kf[name].length);

  // Sets a value at clip-local time lt. Adds/updates a keyframe when the property is animated.
  RS.setPropAt = (c, name, v, lt) => {
    if (RS.isKeyframed(c, name)) {
      const fps = RS.fps();
      const t = Math.max(0, RS.frameRound(lt, fps));
      const k = c.kf[name];
      const hit = k.find((p) => Math.abs(p.t - t) < 0.5 / fps);
      if (hit) hit.v = v;
      else { k.push({ t, v }); k.sort((a, b) => a.t - b.t); }
    } else {
      c.props[name] = v;
    }
  };

  RS.toggleKeyframing = (c, name, lt) => {
    c.kf = c.kf || {};
    const cur = RS.getProp(c, name, lt);
    if (RS.isKeyframed(c, name)) {
      delete c.kf[name];
      c.props[name] = cur;
    } else {
      c.kf[name] = [{ t: Math.max(0, RS.frameRound(lt, RS.fps())), v: cur }];
    }
  };

  RS.keyframeAt = (c, name, lt) => {
    const k = c.kf && c.kf[name];
    if (!k) return null;
    const fps = RS.fps();
    return k.find((p) => Math.abs(p.t - lt) < 0.5 / fps) || null;
  };

  // ∫0..lt of the time-remap speed (piecewise linear keyframes), in clip seconds.
  RS.remapIntegral = (c, lt) => {
    const k = c.kf && c.kf.remap;
    if (!k || !k.length) return lt * ((c.props.remap ?? 100) / 100);
    const v = (x) => RS.getProp(c, 'remap', x) / 100;
    if (lt <= 0) return lt * v(0);
    const pts = [0, ...k.map((p) => p.t).filter((t) => t > 0 && t < lt), lt];
    let sum = 0;
    for (let i = 0; i < pts.length - 1; i++) sum += (pts[i + 1] - pts[i]) * (v(pts[i]) + v(pts[i + 1])) / 2;
    return sum;
  };
  RS.isRemapped = (c) => RS.isKeyframed(c, 'remap') || (c.props.remap ?? 100) !== 100;
  // Source time shown at clip-local time lt (frame hold, reverse, speed and time remapping).
  // Reversed clips store the TOP of their source range in c.in and play downward from it.
  RS.srcTime = (c, lt) => {
    if (c.hold) return c.in;
    const d = c.speed * RS.remapIntegral(c, lt);
    return c.reverse ? c.in - d : c.in + d;
  };

  RS.fadeFactor = (c, lt) => {
    let f = 1;
    const fi = c.props.fadeIn || 0, fo = c.props.fadeOut || 0;
    if (fi > 0) f *= RS.clamp(lt / fi, 0, 1);
    if (fo > 0) f *= RS.clamp((c.duration - lt) / fo, 0, 1);
    return f;
  };

  // ---------- history ----------
  const hist = { undo: [], redo: [] };
  const HIST_LIMIT = 300;

  RS.snapshot = () => {
    const p = S.project;
    return JSON.stringify({ name: p.name, media: p.media, sequences: p.sequences });
  };

  RS.restore = (snap) => {
    const d = JSON.parse(snap);
    S.project.name = d.name;
    S.project.media = d.media;
    S.project.sequences = d.sequences;
    if (!RS.getSequence(S.project.activeSeq)) S.project.activeSeq = S.project.sequences[0].id;
    for (const id of [...S.selection]) if (!RS.getClip(id)) S.selection.delete(id);
    for (const id of [...S.selectedMedia]) if (!RS.getMedia(id)) S.selectedMedia.delete(id);
    if (S.selTransition && !RS.getClip(S.selTransition.clipId)) S.selTransition = null;
    RS.emit('media-change');
    RS.emit('settings-change');
    RS.emit('selection');
    RS.emit('change', { source: 'history' });
  };

  RS.markDirty = (v = true) => {
    if (S.dirty === v) return;
    S.dirty = v;
    RS.emit('dirty', v);
  };

  RS.pushUndo = (snap, label) => {
    hist.undo.push({ snap, label });
    if (hist.undo.length > HIST_LIMIT) hist.undo.shift();
    hist.redo.length = 0;
    RS.markDirty(true);
    RS.emit('history');
  };

  // Runs fn() as one undoable step. Emits 'change' afterwards.
  RS.commit = (label, fn, opts) => {
    const before = RS.snapshot();
    const settingsBefore = JSON.stringify(S.project.settings);
    let r;
    try {
      r = fn();
    } catch (err) {
      console.error(err);
      RS.restore(before); // never leave the project half-edited
      RS.toast('Edit failed: ' + err.message, 'error');
      return undefined;
    }
    if (RS.snapshot() !== before) RS.pushUndo(before, label);
    if (JSON.stringify(S.project.settings) !== settingsBefore) RS.emit('settings-change');
    RS.emit('change', opts || {});
    return r;
  };

  RS.undo = () => {
    const it = hist.undo.pop();
    if (!it) return RS.toast('Nothing to undo');
    hist.redo.push({ snap: RS.snapshot(), label: it.label });
    RS.restore(it.snap);
    RS.markDirty(true);
    RS.emit('history');
    RS.toast('Undo ' + (it.label || ''));
  };

  RS.redo = () => {
    const it = hist.redo.pop();
    if (!it) return RS.toast('Nothing to redo');
    hist.undo.push({ snap: RS.snapshot(), label: it.label });
    RS.restore(it.snap);
    RS.markDirty(true);
    RS.emit('history');
    RS.toast('Redo ' + (it.label || ''));
  };

  RS.clearHistory = () => { hist.undo.length = 0; hist.redo.length = 0; RS.emit('history'); };
  RS.canUndo = () => hist.undo.length > 0;
  RS.canRedo = () => hist.redo.length > 0;

  // Live edits (sliders, drags): snapshot on begin, push one undo step on end.
  let pending = null;
  RS.beginEdit = () => { if (pending == null) pending = RS.snapshot(); };
  // Abandon a live edit, restoring the state from when it began.
  RS.cancelEdit = () => {
    if (pending == null) return;
    const s = pending;
    pending = null;
    RS.restore(s);
  };
  RS.endEdit = (label) => {
    if (pending == null) return;
    const s = pending;
    pending = null;
    if (RS.snapshot() !== s) RS.pushUndo(s, label);
    RS.emit('change', { source: 'edit' });
  };

  // ---------- selection ----------
  RS.select = (ids, additive = false) => {
    if (!additive) S.selection.clear();
    for (const id of ids) S.selection.add(id);
    RS.emit('selection');
  };
  RS.selectedClips = () => [...S.selection].map(RS.getClip).filter(Boolean);
  // A clip plus its linked partners (unless linked selection is off).
  RS.withLinked = (clips, forceSingle) => {
    const out = new Map();
    for (const c of clips) {
      const group = forceSingle || !S.linkedSelection ? [c] : RS.linked(c);
      for (const g of group) out.set(g.id, g);
    }
    return [...out.values()];
  };

  // ---------- clip construction ----------
  RS.makeClip = (o) => {
    const c = Object.assign({
      id: RS.uid('c'), type: 'video', mediaId: null, trackId: 'V1', start: 0, in: 0, duration: 5, speed: 1,
      linkId: null, props: {}, kf: {},
    }, o);
    c.props = Object.assign({}, RS.DEFAULT_PROPS, o.props || {});
    // Default title / shape sizes are designed for 1080p: scale them to the sequence (720p, 4K, vertical…).
    const set = (RS.state.project && RS.state.project.settings) || { width: 1920, height: 1080 };
    const k = Math.min(set.width, set.height) / 1080;
    if (c.type === 'text') {
      c.text = Object.assign({}, RS.DEFAULT_TEXT, o.text || {});
      if (!(o.text && o.text.size)) c.text.size = Math.max(8, Math.round(RS.DEFAULT_TEXT.size * k));
    }
    if (c.type === 'solid') c.color = o.color || '#2a6fdb';
    if (c.type === 'shape') c.shape = Object.assign({ kind: 'rect', w: Math.round(600 * k), h: Math.round(340 * k), radius: 0, fill: '#f0a83a', fillOn: true, stroke: '#ffffff', strokeW: 0 }, o.shape || {});
    return c;
  };

  const clone = (o) => JSON.parse(JSON.stringify(o));

  // ---------- low-level ops (call only inside RS.commit) ----------
  const ops = RS.ops = {};

  ops.removeClip = (id) => {
    const P = S.project;
    const i = P.clips.findIndex((c) => c.id === id);
    if (i >= 0) P.clips.splice(i, 1);
    S.selection.delete(id);
  };

  ops.shiftKeyframes = (c, dt) => {
    if (!c.kf) return;
    for (const k in c.kf) for (const p of c.kf[k]) p.t = +(p.t + dt).toFixed(6);
  };

  // Move the clip's left edge right by d seconds (negative = left), keeping content in place.
  ops.trimLeftBy = (c, d) => {
    if (RS.isMediaBound(c) && !c.hold) {
      const ds = c.speed * RS.remapIntegral(c, d);
      c.in = c.reverse ? c.in - ds : Math.max(0, c.in + ds);
    }
    c.start += d;
    c.duration -= d;
    ops.shiftKeyframes(c, -d);
  };

  // Split one clip at timeline time t. Returns the new right-hand piece (or null).
  ops.splitClip = (c, t) => {
    const fps = RS.fps();
    if (t <= c.start + 0.5 / fps || t >= RS.clipEnd(c) - 0.5 / fps) return null;
    const right = clone(c);
    right.id = RS.uid('c');
    const off = t - c.start;
    right.start = t;
    if (RS.isMediaBound(c) && !c.hold) { const ds = c.speed * RS.remapIntegral(c, off); right.in = c.reverse ? c.in - ds : c.in + ds; }
    right.duration = RS.clipEnd(c) - t;
    ops.shiftKeyframes(right, -off);
    right.props.fadeIn = 0;
    right.tIn = null;
    c.duration = off;
    c.props.fadeOut = 0;
    c.tOut = null;
    S.project.clips.push(right);
    return right;
  };

  // Split a set of clips at t, giving the right-hand pieces fresh shared link ids.
  ops.splitClips = (clips, t) => {
    const newLinks = {};
    const rights = [];
    for (const c of clips) {
      const r = ops.splitClip(c, t);
      if (!r) continue;
      if (c.linkId) r.linkId = newLinks[c.linkId] = newLinks[c.linkId] || RS.uid('L');
      rights.push(r);
    }
    return rights;
  };

  // Overwrite: make [s,e) on a track empty, trimming/splitting/removing what is there.
  ops.clearRange = (trackId, s, e, exclude) => {
    const eps = RS.EPS;
    for (const c of [...S.project.clips]) {
      if (c.trackId !== trackId || (exclude && exclude.has(c.id))) continue;
      const cs = c.start, ce = RS.clipEnd(c);
      if (ce <= s + eps || cs >= e - eps) continue;
      if (cs >= s - eps && ce <= e + eps) { ops.removeClip(c.id); continue; }
      if (cs < s && ce > e) {
        const right = ops.splitClip(c, e);
        c.duration = s - cs;
        c.props.fadeOut = 0;
        c.linkId = null;
        if (right) right.linkId = null;
        continue;
      }
      if (cs < s) { c.duration = s - cs; c.props.fadeOut = 0; c.linkId = null; continue; }
      ops.trimLeftBy(c, e - cs);
      c.props.fadeIn = 0;
      c.linkId = null;
    }
  };

  // Ripple insert: push everything at/after t right by dur on all unlocked tracks.
  ops.rippleInsertGap = (t, dur) => {
    const unlocked = S.project.tracks.filter((tr) => !tr.locked).map((tr) => tr.id);
    const crossing = S.project.clips.filter((c) => unlocked.includes(c.trackId) && c.start < t - RS.EPS && RS.clipEnd(c) > t + RS.EPS);
    ops.splitClips(crossing, t);
    for (const c of S.project.clips) {
      if (unlocked.includes(c.trackId) && c.start >= t - RS.EPS) c.start += dur;
    }
  };

  // Place media on the timeline. Video with audio becomes a linked V+A pair.
  ops.placeMedia = (mediaId, trackId, start, opts = {}) => {
    const m = RS.getMedia(mediaId);
    if (!m) throw new Error('Media not found');
    const track = RS.getTrack(trackId) || RS.tracksOf(m.type === 'audio' ? 'audio' : 'video')[0];
    const fps = RS.fps();
    start = Math.max(0, RS.frameRound(start, fps));
    const srcIn = Math.max(0, opts.in || 0);
    let dur;
    if (m.type === 'image') dur = opts.duration || 5;
    else {
      const srcOut = opts.out != null ? Math.min(opts.out, m.duration) : m.duration;
      dur = srcOut - srcIn;
    }
    if (!(dur > 0.5 / fps)) throw new Error('Clip has no duration');

    let vTrack = null, aTrack = null;
    const vt = RS.tracksOf('video'), at = RS.tracksOf('audio');
    if (m.type === 'audio') {
      aTrack = track.kind === 'audio' ? track : at[0];
    } else if (track.kind === 'video') {
      vTrack = track;
      if (m.type === 'video' && m.hasAudio) aTrack = at[RS.trackIndex(track)] || at[0];
    } else {
      vTrack = vt[RS.trackIndex(track)] || vt[0];
      if (m.type === 'video' && m.hasAudio) aTrack = track;
    }
    if (vTrack && vTrack.locked) vTrack = null;
    if (aTrack && aTrack.locked) aTrack = null;
    if (!vTrack && !aTrack) throw new Error('Target track is locked');

    if (opts.insert) ops.rippleInsertGap(start, dur);

    // Like a new sequence from clip: the first video sets the frame size (9:16, 16:9, 1:1 …).
    const set = S.project.settings;
    if (set.autoMatch && vTrack && m.type === 'video' && m.width && m.height && !S.project.clips.some((c) => RS.isVisual(c) && c.mediaId)) {
      const w = Math.round(m.width / 2) * 2, h = Math.round(m.height / 2) * 2;
      if (w !== set.width || h !== set.height) {
        set.width = w; set.height = h;
        RS.matchedSequence = { w, h, name: m.name };
      }
    }

    const linkId = vTrack && aTrack ? RS.uid('L') : null;
    const made = [];
    if (vTrack) {
      ops.clearRange(vTrack.id, start, start + dur);
      const c = RS.makeClip({ type: m.type === 'image' ? 'image' : 'video', mediaId, trackId: vTrack.id, start, in: m.type === 'image' ? 0 : srcIn, duration: dur, linkId });
      S.project.clips.push(c);
      made.push(c);
    }
    if (aTrack) {
      ops.clearRange(aTrack.id, start, start + dur);
      const c = RS.makeClip({ type: 'audio', mediaId, trackId: aTrack.id, start, in: srcIn, duration: dur, linkId });
      S.project.clips.push(c);
      made.push(c);
    }
    S.selection.clear();
    made.forEach((c) => S.selection.add(c.id));
    return made;
  };

  // First video track (from preferIndex upward) that is free over [s,e); adds a track if needed.
  ops.freeVideoTrack = (s, e, preferIndex = 1) => {
    const vt = RS.tracksOf('video');
    for (let i = Math.min(preferIndex, vt.length - 1); i < vt.length; i++) {
      const t = vt[i];
      if (t.locked) continue;
      const busy = S.project.clips.some((c) => c.trackId === t.id && c.start < e - RS.EPS && RS.clipEnd(c) > s + RS.EPS);
      if (!busy) return t;
    }
    return ops.addTrack('video');
  };

  ops.addTrack = (kind) => {
    const list = RS.tracksOf(kind);
    const prefix = kind === 'video' ? 'V' : kind === 'caption' ? 'C' : 'A';
    let n = list.length + 1;
    while (RS.getTrack(prefix + n)) n++;
    const t = { id: prefix + n, kind, name: kind === 'caption' ? 'Subtitles' : prefix + n };
    const P = S.project;
    // keep video tracks before audio tracks in the array
    const lastIdx = P.tracks.map((x) => x.kind).lastIndexOf(kind);
    P.tracks.splice(lastIdx + 1, 0, t);
    return t;
  };

  ops.removeTrack = (id) => {
    const P = S.project;
    const t = RS.getTrack(id);
    if (!t) return false;
    if (RS.tracksOf(t.kind).length <= 1) return false;
    if (P.clips.some((c) => c.trackId === id)) return false;
    P.tracks.splice(P.tracks.indexOf(t), 1);
    return true;
  };

  // Ripple delete: remove clips and close the gap on their tracks.
  ops.rippleDelete = (clips) => {
    const byTrack = {};
    for (const c of clips) (byTrack[c.trackId] = byTrack[c.trackId] || []).push({ s: c.start, e: RS.clipEnd(c), id: c.id });
    for (const c of clips) ops.removeClip(c.id);
    for (const tid in byTrack) {
      // merge ranges, then process from right to left
      const ranges = byTrack[tid].sort((a, b) => a.s - b.s);
      const merged = [];
      for (const r of ranges) {
        const last = merged[merged.length - 1];
        if (last && r.s <= last.e + RS.EPS) last.e = Math.max(last.e, r.e);
        else merged.push({ s: r.s, e: r.e });
      }
      for (let i = merged.length - 1; i >= 0; i--) {
        const { s, e } = merged[i];
        const gap = e - s;
        for (const c of S.project.clips) {
          if (c.trackId === tid && c.start >= e - RS.EPS) c.start = Math.max(0, c.start - gap);
        }
      }
    }
  };

  // Speed change keeps the same source range (duration scales).
  ops.setSpeed = (c, speed) => {
    speed = RS.clamp(speed, 0.1, 16);
    const ratio = c.speed / speed;
    c.duration = c.duration * ratio;
    if (c.kf) for (const k in c.kf) for (const p of c.kf[k]) p.t *= ratio;
    c.speed = speed;
  };

  // ---------- adjacency, transitions ----------
  RS.adjacentPrev = (c, seq) => (seq || S.project.seq).clips.find((x) => x !== c && x.trackId === c.trackId && !x.disabled && Math.abs(RS.clipEnd(x) - c.start) < 1e-3) || null;
  RS.adjacentNext = (c, seq) => (seq || S.project.seq).clips.find((x) => x !== c && x.trackId === c.trackId && !x.disabled && Math.abs(x.start - RS.clipEnd(c)) < 1e-3) || null;

  RS.TRANSITIONS = [
    { id: 'dissolve', name: 'Cross Dissolve' },
    { id: 'dipBlack', name: 'Dip to Black' },
    { id: 'dipWhite', name: 'Dip to White' },
    { id: 'push', name: 'Push' },
    { id: 'slide', name: 'Slide' },
    { id: 'wipe', name: 'Wipe' },
    { id: 'iris', name: 'Iris Round' },
    { id: 'crossZoom', name: 'Cross Zoom' },
    { id: 'flash', name: 'Flash (White)' },
    { id: 'blurDissolve', name: 'Blur Dissolve' },
    { id: 'zoomIn', name: 'Zoom In' },
    { id: 'zoomOut', name: 'Zoom Out' },
    { id: 'spin', name: 'Spin' },
    { id: 'whip', name: 'Whip Pan' },
    { id: 'pushRight', name: 'Push Right' },
    { id: 'pushUp', name: 'Push Up' },
    { id: 'pushDown', name: 'Push Down' },
    { id: 'bounce', name: 'Bounce In' },
    { id: 'clock', name: 'Clock Wipe' },
    { id: 'barnDoor', name: 'Split (Barn Door)' },
    { id: 'diamond', name: 'Diamond Iris' },
    { id: 'heart', name: 'Heart Iris' },
    { id: 'filmBurn', name: 'Film Burn' },
    { id: 'glitch', name: 'Glitch' },
    { id: 'pixelate', name: 'Pixelate' },
    // Shape transitions: coloured shapes sweep over the cut, which happens while the screen is covered.
    { id: 'shapeBars', name: 'Color Bars', shape: true },
    { id: 'shapeDiagonal', name: 'Diagonal Stripes', shape: true },
    { id: 'shapeRise', name: 'Rising Bars', shape: true },
    { id: 'shapeSquares', name: 'Spinning Squares', shape: true },
    { id: 'shapeCircles', name: 'Circle Burst', shape: true },
  ];
  RS.SHAPE_COLORS = ['#29d3f2', '#ffe45c', '#ef3b4f'];
  RS.isShapeTransition = (id) => !!(RS.TRANSITIONS.find((x) => x.id === id) || {}).shape;
  RS.transitionName = (id) => (RS.TRANSITIONS.find((x) => x.id === id) || { name: id }).name;

  // Time windows where a track shows a transition. Two-sided transitions centre on the cut
  // (A plays past its out point, B starts before its in point — real handles when the media has them).
  RS.transWindows = (trackId, seq) => {
    seq = seq || S.project.seq;
    const out = [];
    const clips = seq.clips.filter((c) => c.trackId === trackId && !c.disabled);
    for (const c of clips) {
      if (c.tIn && c.tIn.duration > 0) {
        const p = RS.adjacentPrev(c, seq);
        if (p) {
          const d = Math.min(c.tIn.duration, p.duration, c.duration);
          out.push({ type: c.tIn.type, colors: c.tIn.colors, t1: c.start - d / 2, t2: c.start + d / 2, cut: c.start, A: p, B: c, owner: c.id, side: 'in' });
        } else {
          const d = Math.min(c.tIn.duration, c.duration);
          out.push({ type: c.tIn.type, colors: c.tIn.colors, t1: c.start, t2: c.start + d, cut: c.start, A: null, B: c, owner: c.id, side: 'in' });
        }
      }
      if (c.tOut && c.tOut.duration > 0) {
        const n = RS.adjacentNext(c, seq);
        if (n && n.tIn) continue; // the cut already has a transition
        if (n) {
          const d = Math.min(c.tOut.duration, n.duration, c.duration);
          out.push({ type: c.tOut.type, colors: c.tOut.colors, t1: RS.clipEnd(c) - d / 2, t2: RS.clipEnd(c) + d / 2, cut: RS.clipEnd(c), A: c, B: n, owner: c.id, side: 'out' });
        } else {
          const d = Math.min(c.tOut.duration, c.duration);
          out.push({ type: c.tOut.type, colors: c.tOut.colors, t1: RS.clipEnd(c) - d, t2: RS.clipEnd(c), cut: RS.clipEnd(c), A: c, B: null, owner: c.id, side: 'out' });
        }
      }
    }
    return out.sort((a, b) => a.t1 - b.t1);
  };

  // Put a transition on a clip edge. At a cut it is always stored on the incoming clip.
  ops.setTransition = (c, side, type, duration) => {
    if (!RS.isVisual(c)) return false;
    const fps = RS.fps();
    duration = Math.max(2 / fps, duration);
    if (side === 'out') {
      const n = RS.adjacentNext(c);
      if (n && RS.isVisual(n)) { n.tIn = { type, duration }; c.tOut = null; return true; }
      c.tOut = { type, duration };
    } else {
      c.tIn = { type, duration };
    }
    return true;
  };

  // Audio crossfade at a clip edge (constant power approximated by matching fades).
  ops.audioTransition = (c, side, d) => {
    if (c.type !== 'audio') return false;
    if (side === 'out') {
      c.props.fadeOut = Math.min(d, c.duration);
      const n = RS.adjacentNext(c);
      if (n && n.type === 'audio') n.props.fadeIn = Math.min(d, n.duration);
    } else {
      c.props.fadeIn = Math.min(d, c.duration);
      const p = RS.adjacentPrev(c);
      if (p && p.type === 'audio') p.props.fadeOut = Math.min(d, p.duration);
    }
    return true;
  };

  ops.nudge = (clips, dt) => {
    const ids = new Set(clips.map((c) => c.id));
    const minStart = Math.min(...clips.map((c) => c.start));
    dt = Math.max(dt, -minStart);
    if (!dt) return;
    for (const c of clips) c.start = RS.frameRound(c.start + dt, RS.fps());
    for (const c of clips) ops.clearRange(c.trackId, c.start, RS.clipEnd(c), ids);
  };

  // Close the empty gap at time t on a track by pulling later clips left.
  ops.rippleDeleteGap = (trackId, t) => {
    const clips = RS.clipsOnTrack(trackId);
    if (clips.some((c) => c.start <= t + RS.EPS && RS.clipEnd(c) > t + RS.EPS)) return 0;
    const prevEnd = clips.filter((c) => RS.clipEnd(c) <= t + RS.EPS).reduce((m, c) => Math.max(m, RS.clipEnd(c)), 0);
    const next = clips.find((c) => c.start > t - RS.EPS);
    if (!next) return 0;
    const gap = next.start - prevEnd;
    if (gap <= RS.EPS) return 0;
    for (const c of clips) if (c.start >= next.start - RS.EPS) c.start -= gap;
    return gap;
  };

  // ---------- nested sequences ----------
  const seqName = (base) => {
    let n = 1;
    const names = new Set(S.project.sequences.map((x) => x.name));
    while (names.has(`${base} ${String(n).padStart(2, '0')}`)) n++;
    return `${base} ${String(n).padStart(2, '0')}`;
  };
  RS.nextSequenceName = seqName;

  // Place a sequence as a nested clip (picture on a video track, sound on an audio track, linked).
  ops.placeSequence = (seqId, trackId, start, opts = {}) => {
    const inner = RS.getSequence(seqId);
    const host = S.project.seq;
    if (!inner) throw new Error('Sequence not found');
    if (RS.seqContains(inner, host)) throw new Error('A sequence cannot be nested inside itself');
    const dur = RS.seqDurationOf(inner);
    if (!(dur > 0)) throw new Error('That sequence is empty');
    start = Math.max(0, RS.frameRound(start, RS.fps()));
    const track = RS.getTrack(trackId) || RS.tracksOf('video')[0];
    const vt = RS.tracksOf('video'), at = RS.tracksOf('audio');
    const hasPicture = inner.clips.some(RS.isVisual);
    const hasSound = inner.clips.some(RS.isAudioClip);
    let vTrack = hasPicture ? (track.kind === 'video' ? track : vt[RS.trackIndex(track)] || vt[0]) : null;
    let aTrack = hasSound ? (track.kind === 'audio' ? track : at[RS.trackIndex(track)] || at[0]) : null;
    if (vTrack && vTrack.locked) vTrack = null;
    if (aTrack && aTrack.locked) aTrack = null;
    if (!vTrack && !aTrack) throw new Error('Target track is locked');
    if (opts.insert) ops.rippleInsertGap(start, dur);
    const linkId = vTrack && aTrack ? RS.uid('L') : null;
    const made = [];
    const base = { seqId, start, in: 0, duration: dur, linkId };
    if (inner.multicam) Object.assign(base, { multicam: true, angle: 0 });
    if (vTrack) {
      ops.clearRange(vTrack.id, start, start + dur);
      made.push(RS.makeClip(Object.assign({ type: 'nest', trackId: vTrack.id }, base)));
    }
    if (aTrack) {
      ops.clearRange(aTrack.id, start, start + dur);
      const a = RS.makeClip(Object.assign({ type: 'nestAudio', trackId: aTrack.id }, base));
      delete a.multicam; delete a.angle;
      made.push(a);
    }
    host.clips.push(...made);
    S.selection = new Set(made.map((c) => c.id));
    return made;
  };

  // Replace the given clips with one nested sequence clip containing them.
  ops.nest = (clips) => {
    if (!clips.length) throw new Error('Select clips to nest');
    const host = S.project.seq;
    const t0 = Math.min(...clips.map((c) => c.start));
    const t1 = Math.max(...clips.map(RS.clipEnd));
    const inner = RS.newSequence(seqName('Nested Sequence'), JSON.parse(JSON.stringify(host.settings)), 0, 0);
    inner.settings.autoMatch = false;
    inner.tracks = host.tracks.map((t) => ({ id: t.id, kind: t.kind, name: t.name }));
    const ids = new Set(clips.map((c) => c.id));
    for (const c of clips) {
      const copy = JSON.parse(JSON.stringify(c));
      copy.start -= t0;
      inner.clips.push(copy);
    }
    host.clips = host.clips.filter((c) => !ids.has(c.id));
    S.project.sequences.push(inner);
    const visTracks = clips.filter(RS.isVisual).map((c) => RS.getTrack(c.trackId)).filter(Boolean);
    const audTracks = clips.filter(RS.isAudioClip).map((c) => RS.getTrack(c.trackId)).filter(Boolean);
    const lowest = (list) => list.sort((a, b) => RS.trackIndex(a) - RS.trackIndex(b))[0];
    const vt = visTracks.length ? lowest(visTracks) : null;
    const at = audTracks.length ? lowest(audTracks) : null;
    const linkId = vt && at ? RS.uid('L') : null;
    const made = [];
    const base = { seqId: inner.id, start: t0, in: 0, duration: t1 - t0, linkId };
    if (vt) { ops.clearRange(vt.id, t0, t1); made.push(RS.makeClip(Object.assign({ type: 'nest', trackId: vt.id }, base))); }
    if (at) { ops.clearRange(at.id, t0, t1); made.push(RS.makeClip(Object.assign({ type: 'nestAudio', trackId: at.id }, base))); }
    host.clips.push(...made);
    S.selection = new Set(made.map((c) => c.id));
    return inner;
  };

  // ---------- multicam ----------
  // Offset (seconds) of b relative to a, found by cross-correlating loudness envelopes.
  RS.audioSyncOffset = (peaksA, peaksB, rate, maxLagSec = 90) => {
    const dec = 4; // 100 Hz → 25 Hz coarse pass
    const down = (p) => { const n = Math.floor(p.length / dec); const o = new Float32Array(n); for (let i = 0; i < n; i++) { let m = 0; for (let j = 0; j < dec; j++) m = Math.max(m, p[i * dec + j]); o[i] = m; } return norm(o); };
    const norm = (o) => { let mean = 0; for (const v of o) mean += v; mean /= o.length || 1; let sd = 0; for (let i = 0; i < o.length; i++) { o[i] -= mean; sd += o[i] * o[i]; } sd = Math.sqrt(sd) || 1; for (let i = 0; i < o.length; i++) o[i] /= sd; return o; };
    const corr = (a, b, lag) => { let sum = 0; const s0 = Math.max(0, -lag), s1 = Math.min(a.length, b.length - lag); for (let i = s0; i < s1; i++) sum += a[i] * b[i + lag]; return sum; };
    const A = down(peaksA), B = down(peaksB);
    const maxLag = Math.min(Math.round(maxLagSec * rate / dec), Math.max(A.length, B.length));
    let best = 0, bv = -Infinity;
    for (let lag = -maxLag; lag <= maxLag; lag++) { const v = corr(A, B, lag); if (v > bv) { bv = v; best = lag; } }
    // refine at full resolution
    const fa = norm(Float32Array.from(peaksA)), fb = norm(Float32Array.from(peaksB));
    let fine = best * dec, fv = -Infinity;
    for (let lag = best * dec - dec * 2; lag <= best * dec + dec * 2; lag++) { const v = corr(fa, fb, lag); if (v > fv) { fv = v; fine = lag; } }
    // b's content at index i+lag matches a's at i → b started `lag` samples earlier than a
    return -fine / rate;
  };

  // Build a multicam source sequence: one angle per video track, each angle's sound on its own audio track
  // (only camera 1 audible by default).
  ops.createMulticam = (mediaIds, mode) => {
    const media = mediaIds.map(RS.getMedia).filter((m) => m && (m.type === 'video' || m.type === 'image'));
    if (media.length < 2) throw new Error('Select at least two video clips in the Project panel');
    if (media.length > 9) throw new Error('Up to 9 camera angles are supported');
    const first = media.find((m) => m.type === 'video') || media[0];
    const settings = Object.assign({}, S.project.seq.settings, { width: Math.round((first.width || 1920) / 2) * 2, height: Math.round((first.height || 1080) / 2) * 2, autoMatch: false });
    const seq = RS.newSequence('Multicam ' + first.name.replace(/\.[^.]+$/, ''), settings, media.length, media.length);
    seq.multicam = true;
    // offsets
    const offs = media.map(() => 0);
    let synced = mode === 'audio';
    if (mode === 'audio') {
      const ref = RS.runtime[media[0].id];
      media.forEach((m, i) => {
        if (i === 0) return;
        const rt = RS.runtime[m.id];
        if (!ref || !ref.peaks || !rt || !rt.peaks) { synced = false; return; }
        offs[i] = RS.audioSyncOffset(ref.peaks, rt.peaks, rt.peakRate || 100);
      });
    }
    const minOff = Math.min(...offs);
    media.forEach((m, i) => {
      const start = RS.frameRound(offs[i] - minOff, settings.fps);
      const dur = m.type === 'image' ? 60 : m.duration;
      seq.clips.push(RS.makeClip({ type: m.type === 'image' ? 'image' : 'video', mediaId: m.id, trackId: 'V' + (i + 1), start, duration: dur }));
      if (m.type === 'video' && m.hasAudio) seq.clips.push(RS.makeClip({ type: 'audio', mediaId: m.id, trackId: 'A' + (i + 1), start, duration: dur }));
      if (i > 0) seq.tracks.find((t) => t.id === 'A' + (i + 1)).muted = true;
    });
    S.project.sequences.push(seq);
    return { seq, synced };
  };

  // Switch camera angle: while playing, cut at t and switch the right part; when stopped, switch the clip.
  ops.switchAngle = (c, angle, t, cut) => {
    const inner = RS.getSequence(c.seqId);
    if (!inner || !inner.multicam) return null;
    const n = RS.tracksOf('video', inner).length;
    if (angle < 0 || angle >= n) return null;
    let target = c;
    if (cut) {
      const r = ops.splitClip(c, RS.frameRound(t, RS.fps()));
      if (r) target = r;
    }
    target.angle = angle;
    return target;
  };

  // ---------- time tools ----------
  // Turn the rest of a clip (from t) into a still of the frame at t.
  ops.frameHold = (c, t) => {
    if (c.type !== 'video') throw new Error('Frame hold works on video clips');
    const mt = RS.srcTime(c, t - c.start);
    const right = t > c.start + 0.5 / RS.fps() ? ops.splitClip(c, t) : c;
    if (!right) throw new Error('Move the playhead inside the clip');
    right.hold = true;
    right.in = mt;
    right.linkId = null;
    return right;
  };
  // Insert a still of the frame at t (pushing everything later) — like "Insert Frame Hold Segment".
  ops.insertHoldSegment = (c, t, dur = 2) => {
    if (c.type !== 'video') throw new Error('Frame hold works on video clips');
    const mt = RS.srcTime(c, t - c.start);
    const props = JSON.parse(JSON.stringify(c.props));
    ops.rippleInsertGap(t, dur);
    const h = RS.makeClip({ type: 'video', mediaId: c.mediaId, trackId: c.trackId, start: t, in: mt, duration: dur, props });
    h.hold = true;
    S.project.clips.push(h);
    return h;
  };
  ops.toggleReverse = (clips) => {
    for (const c of clips) {
      if (!RS.isElementClip(c) || c.hold) continue;
      const total = c.speed * RS.remapIntegral(c, c.duration);
      if (c.reverse) { c.in = Math.max(0, c.in - total); c.reverse = false; }
      else { c.in = c.in + total; c.reverse = true; }
    }
  };

  // ---------- lift / extract / ripple trims (targeted tracks) ----------
  const targetedIds = () => S.project.tracks.filter(RS.isTargeted).map((t) => t.id);
  ops.liftRange = (a, b) => { for (const tid of targetedIds()) ops.clearRange(tid, a, b); };
  ops.extractRange = (a, b) => {
    if (b - a <= RS.EPS) return;
    const ids = targetedIds();
    for (const tid of ids) ops.clearRange(tid, a, b);
    for (const c of S.project.clips) if (ids.includes(c.trackId) && c.start >= b - RS.EPS) c.start = Math.max(0, c.start - (b - a));
  };
  // Q: remove from the previous edit to the playhead; W: from the playhead to the next edit (closing the gap).
  ops.rippleTrimToPlayhead = (dir, t) => {
    const ids = targetedIds();
    const under = S.project.clips.filter((c) => ids.includes(c.trackId) && c.start < t - RS.EPS && RS.clipEnd(c) > t + RS.EPS);
    if (!under.length) return null;
    if (dir < 0) { const a = Math.max(...under.map((c) => c.start)); ops.extractRange(a, t); return a; }
    const b = Math.min(...under.map(RS.clipEnd)); ops.extractRange(t, b); return t;
  };
  // Replace a clip's media but keep its position, length and effects.
  ops.replaceClip = (c, mediaId, srcIn = 0) => {
    const m = RS.getMedia(mediaId);
    if (!m) throw new Error('Media not found');
    const group = RS.linked(c);
    for (const x of group) {
      if (x.type === 'audio' && !(m.type === 'audio' || m.hasAudio)) continue;
      if ((x.type === 'video' || x.type === 'image') && m.type === 'audio') continue;
      if (!RS.isElementClip(x) && x.type !== 'image') continue;
      if (x.type === 'video' || x.type === 'image') x.type = m.type === 'image' ? 'image' : 'video'; // video ↔ still
      x.mediaId = mediaId;
      x.in = Math.max(0, srcIn);
      x.hold = false; x.reverse = false;
      if (m.type !== 'image') x.duration = Math.min(x.duration, Math.max(1 / RS.fps(), (m.duration - x.in) / x.speed));
    }
  };

  // ---------- captions ----------
  RS.DEFAULT_CAPTION_STYLE = { font: 'Helvetica Neue', size: 5, color: '#ffffff', bg: '#000000', bgOpacity: 70, position: 'bottom', margin: 7, bold: true };
  ops.captionTrack = () => RS.tracksOf('caption')[0] || ops.addTrack('caption');
  ops.addCaption = (start, dur, text) => {
    const tr = ops.captionTrack();
    start = RS.frameRound(Math.max(0, start), RS.fps());
    ops.clearRange(tr.id, start, start + dur);
    const c = RS.makeClip({ type: 'caption', trackId: tr.id, start, duration: dur });
    c.text = text;
    S.project.clips.push(c);
    return c;
  };

  // Copy/paste helpers
  ops.cloneForPaste = (clips, at) => {
    if (!clips.length) return [];
    const minStart = Math.min(...clips.map((c) => c.start));
    const linkMap = {};
    const made = [];
    for (const src of clips) {
      const c = clone(src);
      c.id = RS.uid('c');
      c.start = at + (src.start - minStart);
      if (c.linkId) c.linkId = linkMap[c.linkId] = linkMap[c.linkId] || RS.uid('L');
      if (!RS.getTrack(c.trackId)) continue;
      if (RS.trackLocked(c.trackId)) continue;
      made.push(c);
    }
    const ids = new Set(made.map((c) => c.id));
    for (const c of made) ops.clearRange(c.trackId, c.start, RS.clipEnd(c), ids);
    S.project.clips.push(...made);
    return made;
  };
})(window.RS);
