'use strict';
// Timeline panel: tools, ruler (markers, in/out), track headers, clips, transitions, audio meters,
// and every editing gesture (select, move, trim, ripple, roll, rate stretch, razor, slip, slide…).
(function (RS) {
  const S = RS.state;
  // Track header width: narrower on phones (html.compact, see app.js) so more of the timeline shows.
  const PHONE = window.matchMedia('(max-width: 760px)');
  let HEAD_W = PHONE.matches ? 100 : 156;
  const RULER_H = 30;
  const TRACK_H = { video: 62, audio: 54, caption: 34 };
  const setTrackH = (phone) => Object.assign(TRACK_H, phone ? { video: 46, audio: 40, caption: 28 } : { video: 62, audio: 54, caption: 34 });
  setTrackH(PHONE.matches);
  const SNAP_PX = 9;
  const MIN_ZOOM = 0.2, MAX_ZOOM = 1500;

  RS.TOOLS = [
    { id: 'select', icon: 'select', name: 'Selection Tool', key: 'V' },
    { id: 'trackFwd', icon: 'trackFwd', name: 'Track Select Forward Tool', key: 'A' },
    { id: 'trackBack', icon: 'trackBack', name: 'Track Select Backward Tool', key: '⇧A' },
    'sep',
    { id: 'ripple', icon: 'ripple', name: 'Ripple Edit Tool', key: 'B' },
    { id: 'rolling', icon: 'rolling', name: 'Rolling Edit Tool', key: 'N' },
    { id: 'rate', icon: 'rate', name: 'Rate Stretch Tool', key: 'R' },
    { id: 'razor', icon: 'razor', name: 'Razor Tool', key: 'C' },
    'sep',
    { id: 'slip', icon: 'slip', name: 'Slip Tool', key: 'Y' },
    { id: 'slide', icon: 'slide', name: 'Slide Tool', key: 'U' },
    'sep',
    { id: 'hand', icon: 'hand', name: 'Hand Tool', key: 'H' },
    { id: 'zoom', icon: 'zoomTool', name: 'Zoom Tool', key: 'Z' },
    'sep',
    { id: 'type', icon: 'text', name: 'Type Tool — click in the Program monitor', key: 'T' },
    { id: 'rect', icon: 'rect', name: 'Rectangle Tool — drag in the Program monitor', key: '' },
    { id: 'ellipse', icon: 'ellipse', name: 'Ellipse Tool — drag in the Program monitor', key: '' },
    { id: 'pen', icon: 'pen', name: 'Pen Tool — click points on a clip to draw a mask', key: 'P' },
  ];
  const EDGE_TOOLS = new Set(['select', 'ripple', 'rolling', 'rate']);

  const TL = RS.timeline = {};
  let root, scroller, inner, rulerCanvas, corner, playheadEl, dropGhost, tipEl, zoomSlider, toolStrip, meterCanvas, fitBtn, seqTabs;
  let zbTrack, zbThumb;
  const lanes = new Map();
  const waveCache = new Map();

  TL.init = (el) => {
    root = el;
    root.innerHTML = '';
    root.classList.add('tl-root');
    // tools
    toolStrip = RS.h('div', { class: 'tool-strip' });
    for (const t of RS.TOOLS) {
      if (t === 'sep') { toolStrip.append(RS.h('div', { class: 'tool-sep' })); continue; }
      const b = RS.iconBtn(t.icon, t.name + (t.key ? ` (${t.key})` : ''), () => TL.setTool(t.id), 'tool-' + t.id);
      b.dataset.tool = t.id;
      toolStrip.append(b);
    }
    const main = RS.h('div', { class: 'tl-main' });
    const toolbar = RS.h('div', { class: 'tl-toolbar' });
    const snapBtn = RS.iconBtn('magnet', 'Snap in Timeline (S)', () => TL.toggleSnap(), 'snap-btn');
    const linkBtn = RS.iconBtn('link', 'Linked Selection', () => { S.linkedSelection = !S.linkedSelection; TL.syncToolbar(); }, 'link-btn');
    const markBtn = RS.iconBtn('marker', 'Add Marker (M)', () => RS.cmd('addMarker'));
    fitBtn = RS.h('button', { class: 'btn small fit-btn', title: 'Keep all clips in view automatically (\\ to fit now)' }, 'Auto-fit');
    fitBtn.addEventListener('click', () => { if (S.userZoomed) TL.zoomFit(); else { S.userZoomed = true; TL.syncToolbar(); } });
    zoomSlider = RS.h('input', { type: 'range', min: 0, max: 1000, step: 1, class: 'zoom-slider', title: 'Timeline zoom' });
    zoomSlider.addEventListener('input', () => TL.setZoom(sliderToZoom(+zoomSlider.value), null, true));
    toolbar.append(
      RS.h('div', { class: 'seg' }, snapBtn, linkBtn, markBtn),
      RS.h('div', { class: 'seg' },
        RS.h('button', { class: 'btn small', title: 'Add video track', onclick: () => RS.cmd('addVideoTrack') }, '+ Video'),
        RS.h('button', { class: 'btn small', title: 'Add audio track', onclick: () => RS.cmd('addAudioTrack') }, '+ Audio')),
      RS.h('div', { class: 'tl-tool-name', id: 'tl-tool-name' }),
      RS.h('div', { class: 'grow' }),
      RS.h('div', { class: 'tl-dur', id: 'tl-dur' }),
      fitBtn,
      RS.iconBtn('zoomOut', 'Zoom out (-)', () => TL.zoomBy(1 / 1.5)),
      zoomSlider,
      RS.iconBtn('zoomIn', 'Zoom in (=)', () => TL.zoomBy(1.5)),
      RS.iconBtn('fit', 'Zoom to sequence (\\)', () => TL.zoomFit()),
    );
    scroller = RS.h('div', { class: 'tl-scroller', tabindex: '0' });
    inner = RS.h('div', { class: 'tl-inner' });
    const rulerRow = RS.h('div', { class: 'tl-ruler-row', style: { height: RULER_H + 'px' } });
    corner = RS.h('div', { class: 'tl-corner', style: { width: HEAD_W + 'px' } });
    rulerCanvas = RS.h('canvas', { class: 'tl-ruler' });
    rulerRow.append(corner, rulerCanvas);
    playheadEl = RS.h('div', { class: 'tl-playhead' });
    dropGhost = RS.h('div', { class: 'tl-drop-ghost' });
    tipEl = RS.h('div', { class: 'tl-tip' });
    inner.append(rulerRow);
    scroller.append(inner);
    seqTabs = RS.h('div', { class: 'seq-tabs' });
    // Zoom scroll bar: drag the middle to scroll, drag the round end handles to zoom.
    zbThumb = RS.h('div', { class: 'zb-thumb', title: 'Drag to scroll · drag the round ends to zoom · double-click to fit' },
      RS.h('div', { class: 'zb-handle l' }), RS.h('div', { class: 'zb-handle r' }));
    zbTrack = RS.h('div', { class: 'zb-track' }, zbThumb);
    const zoomBar = RS.h('div', { class: 'tl-zoombar', style: { paddingLeft: HEAD_W + 'px' } }, zbTrack);
    PHONE.addEventListener('change', () => {
      HEAD_W = PHONE.matches ? 100 : 156;
      setTrackH(PHONE.matches);
      corner.style.width = HEAD_W + 'px';
      zoomBar.style.paddingLeft = HEAD_W + 'px';
      TL.render();
    });
    zbTrack.addEventListener('pointerdown', onZoomBarDown);
    zbTrack.addEventListener('dblclick', () => TL.zoomFit());
    main.append(seqTabs, toolbar, scroller, zoomBar);
    meterCanvas = RS.h('canvas', { class: 'meters', title: 'Audio meters (dBFS)' });
    root.append(toolStrip, main, RS.h('div', { class: 'meter-col' }, meterCanvas), tipEl);

    scroller.addEventListener('scroll', () => { drawRuler(); updateZoomBar(); });
    scroller.addEventListener('pointerdown', onPointerDown);
    scroller.addEventListener('contextmenu', onContextMenu);
    scroller.addEventListener('wheel', onWheel, { passive: false });
    scroller.addEventListener('dragover', onDragOver);
    scroller.addEventListener('dragleave', (e) => { if (!scroller.contains(e.relatedTarget)) hideGhost(); });
    scroller.addEventListener('drop', onDrop);
    scroller.addEventListener('dblclick', onDblClick);
    rulerCanvas.addEventListener('pointerdown', onRulerDown);
    rulerCanvas.addEventListener('dblclick', onRulerDbl);
    rulerCanvas.addEventListener('pointermove', (e) => {
      const io = S.project.inOut || {};
      const r = rulerCanvas.getBoundingClientRect();
      const near = ['in', 'out'].some((k) => io[k] != null && Math.abs(r.left + (io[k] - scroller.scrollLeft / S.zoom) * S.zoom - e.clientX) <= 6);
      rulerCanvas.style.cursor = near ? 'ew-resize' : 'pointer';
    });
    new ResizeObserver(() => { TL.render(); autoFit(); }).observe(scroller);

    let lastDur = 0;
    RS.on('change', (o) => {
      TL.render();
      const d = RS.seqDuration();
      if (!o || o.source !== 'inspector-live') { if (Math.abs(d - lastDur) > 1e-6) autoFit(); lastDur = d; }
    });
    RS.on('selection', () => TL.updateSelection());
    RS.on('time', () => TL.updatePlayhead(true));
    RS.on('settings-change', () => TL.render());
    TL.syncToolbar();
    TL.render();
    meterLoop();
  };

  // ---------- coordinates ----------
  TL.timeAtClientX = (clientX) => {
    const r = inner.getBoundingClientRect();
    return Math.max(0, (clientX - r.left - HEAD_W) / S.zoom);
  };
  TL.xOf = (t) => t * S.zoom;
  TL.trackAtClientY = (clientY) => {
    for (const [tid, lane] of lanes) {
      const r = lane.getBoundingClientRect();
      if (clientY >= r.top && clientY < r.bottom) return RS.getTrack(tid);
    }
    return null;
  };
  const zoomToSlider = (z) => Math.round(1000 * Math.log(z / MIN_ZOOM) / Math.log(MAX_ZOOM / MIN_ZOOM));
  const sliderToZoom = (v) => MIN_ZOOM * Math.pow(MAX_ZOOM / MIN_ZOOM, v / 1000);
  const viewW = () => Math.max(50, scroller.clientWidth - HEAD_W);

  // ---------- render ----------
  TL.render = () => {
    if (!inner) return;
    const P = S.project;
    const fps = P.settings.fps;
    const vw = viewW();
    const seq = RS.seqDuration();
    const contentW = Math.max(seq * S.zoom + (S.userZoomed ? 30 * S.zoom : 120), vw);
    inner.style.width = (HEAD_W + contentW) + 'px';

    RS.$$('.tl-row', inner).forEach((r) => r.remove());
    lanes.clear();
    const vts = RS.tracksOf('video').slice().reverse();
    const ats = RS.tracksOf('audio');
    const cts = RS.tracksOf('caption');
    for (const tr of [...cts, ...vts, 'sep', ...ats]) {
      if (tr === 'sep') { inner.append(RS.h('div', { class: 'tl-row tl-sep' }, RS.h('div', { class: 'tl-head', style: { width: HEAD_W + 'px' } }), RS.h('div', { class: 'tl-lane' }))); continue; }
      const row = RS.h('div', { class: 'tl-row ' + tr.kind + (tr.locked ? ' locked' : ''), style: { height: TRACK_H[tr.kind] + 'px' } });
      row.append(buildHeader(tr));
      const lane = RS.h('div', { class: 'tl-lane', 'data-track': tr.id, style: { width: contentW + 'px' } });
      lanes.set(tr.id, lane);
      for (const c of P.clips) if (c.trackId === tr.id) lane.append(buildClip(c, tr));
      if (tr.kind === 'video') for (const w of RS.transWindows(tr.id)) lane.append(buildTransition(w));
      row.append(lane);
      inner.append(row);
    }
    inner.append(playheadEl, dropGhost);
    renderTabs();
    const durEl = RS.$('#tl-dur');
    if (durEl) durEl.textContent = RS.fmtTC(seq, fps);
    TL.updatePlayhead(false);
    drawRuler();
    TL.syncToolbar();
    updateZoomBar();
  };

  // ---------- zoom scroll bar ----------
  const contentWidth = () => Math.max(1, inner.offsetWidth - HEAD_W);
  function updateZoomBar() {
    if (!zbTrack) return;
    const tw = zbTrack.clientWidth;
    if (!tw) return;
    const cw = contentWidth(), vw = viewW();
    const w = RS.clamp(vw / cw, 0, 1) * tw;
    const l = RS.clamp(scroller.scrollLeft / cw, 0, 1) * tw;
    zbThumb.style.left = Math.min(l, tw - Math.max(28, w)) + 'px';
    zbThumb.style.width = Math.max(28, w) + 'px';
  }

  function onZoomBarDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    const tw = zbTrack.clientWidth;
    const handle = e.target.closest('.zb-handle');
    const onThumb = e.target.closest('.zb-thumb');
    const vw = viewW();
    const startX = e.clientX;
    if (!onThumb) {
      // click on the empty track: centre the view there
      const r = zbTrack.getBoundingClientRect();
      scroller.scrollLeft = (e.clientX - r.left) / tw * contentWidth() - vw / 2;
      return;
    }
    zbTrack.setPointerCapture(e.pointerId);
    zbThumb.classList.add('drag');
    const sl0 = scroller.scrollLeft;
    const cw0 = contentWidth();
    const dRef = cw0 / S.zoom;                       // content duration at the start of the drag
    const tL0 = sl0 / S.zoom, tR0 = (sl0 + vw) / S.zoom;
    const minDur = 10 / RS.fps();
    const side = handle ? (handle.classList.contains('l') ? 'l' : 'r') : null;
    const move = (ev) => {
      const dx = ev.clientX - startX;
      if (!side) { scroller.scrollLeft = sl0 + dx / tw * cw0; return; }
      const dt = dx / tw * dRef;
      if (side === 'r') {
        const tR = RS.clamp(tR0 + dt, tL0 + minDur, Math.max(dRef, tR0 + dt));
        TL.setZoom(vw / (tR - tL0), { t: tL0, screenX: 0 }, true);
      } else {
        const tL = RS.clamp(tL0 + dt, 0, tR0 - minDur);
        TL.setZoom(vw / (tR0 - tL), { t: tL, screenX: 0 }, true);
      }
      showTip(ev, 'Zoom ' + RS.fmtTC(viewW() / S.zoom, RS.fps()) + ' visible');
    };
    const up = () => {
      zbTrack.removeEventListener('pointermove', move);
      zbTrack.removeEventListener('pointerup', up);
      zbThumb.classList.remove('drag');
      hideTip();
    };
    zbTrack.addEventListener('pointermove', move);
    zbTrack.addEventListener('pointerup', up);
  }

  function renderTabs() {
    if (!seqTabs) return;
    seqTabs.innerHTML = '';
    const open = (S.openSeqs || []).filter((id) => RS.getSequence(id));
    if (!open.includes(S.project.activeSeq)) open.push(S.project.activeSeq);
    S.openSeqs = open;
    for (const id of open) {
      const q = RS.getSequence(id);
      const tab = RS.h('div', { class: 'seq-tab' + (id === S.project.activeSeq ? ' on' : '') + (q.multicam ? ' mc' : ''), title: q.name },
        RS.icon(q.multicam ? 'multicam' : 'seq'), RS.h('span', null, q.name));
      tab.addEventListener('click', () => RS.openSequence(id));
      if (open.length > 1) {
        const x = RS.h('button', { class: 'seq-tab-x', title: 'Close sequence' }, '×');
        x.addEventListener('click', (e) => { e.stopPropagation(); RS.closeSequenceTab(id); });
        tab.append(x);
      }
      seqTabs.append(tab);
    }
  }

  function buildHeader(tr) {
    const head = RS.h('div', { class: 'tl-head', style: { width: HEAD_W + 'px' } });
    const btns = RS.h('div', { class: 'tl-head-btns' });
    const toggle = (key, label) => RS.commit(label, () => { const t = RS.getTrack(tr.id); t[key] = !t[key]; });
    if (tr.kind === 'video' || tr.kind === 'caption') {
      btns.append(RS.iconBtn(tr.hidden ? 'eyeOff' : 'eye', tr.hidden ? 'Show track output' : 'Hide track output', () => toggle('hidden', 'Toggle track output'), tr.hidden ? 'off' : ''));
    } else {
      const mute = RS.h('button', { class: 'ibtn mute' + (tr.muted ? ' on' : ''), title: 'Mute track' }, 'M');
      mute.addEventListener('click', () => toggle('muted', 'Toggle mute'));
      const solo = RS.h('button', { class: 'ibtn solo' + (tr.solo ? ' on' : ''), title: 'Solo track' }, 'S');
      solo.addEventListener('click', () => toggle('solo', 'Toggle solo'));
      const rec = RS.iconBtn('mic', RS.voiceover.isRecording(tr.id) ? 'Stop recording' : 'Record voice-over on this track (from the playhead)', () => RS.voiceover.toggle(tr.id), 'rec' + (RS.voiceover.isRecording(tr.id) ? ' on' : ''));
      btns.append(mute, solo, rec);
    }
    btns.append(RS.iconBtn(tr.locked ? 'lock' : 'unlock', tr.locked ? 'Unlock track' : 'Lock track', () => toggle('locked', 'Toggle lock'), tr.locked ? 'on' : ''));
    const empty = !S.project.clips.some((c) => c.trackId === tr.id);
    if (empty && RS.tracksOf(tr.kind).length > 1) {
      btns.append(RS.iconBtn('close', 'Delete empty track', () => RS.commit('Delete track', () => RS.ops.removeTrack(tr.id)), 'del-track'));
    }
    // Click the track name to target / untarget it (used by Lift, Extract, Q/W, Match Frame, Insert/Overwrite, Paste).
    const badge = RS.h('div', { class: 'tl-track-name ' + tr.kind + (tr.target !== false ? ' targeted' : ''), title: (tr.target !== false ? 'Targeted' : 'Not targeted') + ' — click to toggle' }, tr.kind === 'caption' ? 'CC' : tr.name);
    badge.addEventListener('click', () => RS.commit('Toggle track targeting', () => { const t = RS.getTrack(tr.id); t.target = t.target === false; }));
    head.append(badge, btns);
    head.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      RS.contextMenu(e.clientX, e.clientY, [
        { label: 'Add Video Track', run: () => RS.cmd('addVideoTrack') },
        { label: 'Add Audio Track', run: () => RS.cmd('addAudioTrack') },
        '-',
        { label: 'Delete Track', disabled: !empty || RS.tracksOf(tr.kind).length <= 1, run: () => RS.commit('Delete track', () => RS.ops.removeTrack(tr.id)) },
      ]);
    });
    return head;
  }

  function buildClip(c, tr) {
    const x = TL.xOf(c.start), w = Math.max(2, c.duration * S.zoom);
    const m = c.mediaId ? RS.getMedia(c.mediaId) : null;
    const rt = c.mediaId ? RS.runtime[c.mediaId] : null;
    const offline = c.mediaId && (!m || !rt || rt.offline);
    const el = RS.h('div', {
      class: 'tl-clip type-' + c.type + (S.selection.has(c.id) ? ' selected' : '') + (offline ? ' offline' : '') + (c.linkId ? ' linked' : '') + (c.disabled ? ' disabled' : ''),
      'data-id': c.id,
      style: { left: x + 'px', width: w + 'px' },
    });
    if ((c.type === 'video' || c.type === 'image') && rt && rt.thumb) {
      el.append(RS.h('div', { class: 'tl-thumbs', style: { backgroundImage: `url("${rt.thumb}")` } }));
    }
    if (c.type === 'solid') el.style.setProperty('--matte', c.color);
    if (c.type === 'shape') el.style.setProperty('--matte', c.shape.fill);
    if (c.type === 'audio') {
      const cv = waveformFor(c, w, TRACK_H.audio - 4, rt);
      if (cv) el.append(cv);
    }
    const tags = [];
    if (c.hold) tags.push('Hold');
    if (c.reverse) tags.push('◀◀');
    if (RS.isRemapped(c)) tags.push('TR');
    if (c.props.gain) tags.push((c.props.gain > 0 ? '+' : '') + c.props.gain.toFixed(1) + 'dB');
    if (c.type === 'caption') el.classList.add('cap');
    if (c.speed !== 1) tags.push(Math.round(c.speed * 100) + '%');
    if (hasEffects(c)) tags.push('fx');
    const label = RS.h('div', { class: 'tl-clip-label' },
      offline ? RS.icon('warn', 'warn') : null,
      c.linkId ? null : (c.type === 'video' || c.type === 'audio') && m && m.type === 'video' && m.hasAudio ? RS.h('span', { class: 'unlinked', title: 'Unlinked from its audio/video' }, '⧉') : null,
      c.type === 'adjust' ? RS.icon('adjust', 'adj') : null,
      RS.h('span', { class: 'name' }, RS.clipName(c)),
      tags.length ? RS.h('span', { class: 'tags' }, tags.join(' ')) : null);
    el.append(label);
    if (c.props.fadeIn > 0) el.append(RS.h('div', { class: 'tl-fade in', style: { width: Math.min(w, c.props.fadeIn * S.zoom) + 'px' } }));
    if (c.props.fadeOut > 0) el.append(RS.h('div', { class: 'tl-fade out', style: { width: Math.min(w, c.props.fadeOut * S.zoom) + 'px' } }));
    const kts = new Set();
    for (const k in c.kf || {}) for (const p of c.kf[k]) if (p.t >= 0 && p.t <= c.duration) kts.add(p.t);
    for (const t of kts) el.append(RS.h('div', { class: 'tl-kf', style: { left: (t * S.zoom) + 'px' } }));
    if (!tr.locked) el.append(RS.h('div', { class: 'tl-trim l' }), RS.h('div', { class: 'tl-trim r' }));
    return el;
  }

  function buildTransition(w) {
    const sel = S.selTransition && S.selTransition.clipId === w.owner && S.selTransition.side === w.side;
    const el = RS.h('div', {
      class: 'tl-trans' + (sel ? ' selected' : '') + (!w.A || !w.B ? ' single' : ''),
      'data-owner': w.owner, 'data-side': w.side,
      title: `${RS.transitionName(w.type)} · ${(w.t2 - w.t1).toFixed(2)}s — right-click for options`,
      style: { left: (w.t1 * S.zoom) + 'px', width: Math.max(6, (w.t2 - w.t1) * S.zoom) + 'px' },
    }, RS.h('span', null, RS.transitionName(w.type)));
    return el;
  }

  function hasEffects(c) {
    const p = c.props, d = RS.DEFAULT_PROPS;
    return ['brightness', 'contrast', 'saturation', 'hue', 'grayscale', 'sepia', 'blur', 'invert', 'temperature', 'tint', 'vignette'].some((k) => p[k] !== d[k]);
  }

  function waveformFor(c, w, h, rt) {
    if (!rt || !rt.peaks) return null;
    const drawW = Math.min(Math.ceil(w), 8000);
    const key = [c.mediaId, c.in.toFixed(4), c.duration.toFixed(4), c.speed, S.zoom.toFixed(3), h, drawW].join('|');
    let cv = waveCache.get(key);
    if (!cv) {
      cv = document.createElement('canvas');
      cv.className = 'tl-wave';
      cv.width = drawW; cv.height = h;
      const g = cv.getContext('2d');
      g.fillStyle = 'rgba(160, 235, 205, 0.5)';
      const peaks = rt.peaks, rate = rt.peakRate;
      const secPerPx = (c.duration / drawW) * c.speed;
      const mid = h / 2;
      for (let x = 0; x < drawW; x++) {
        const a = Math.floor((c.in + x * secPerPx) * rate);
        const b = Math.max(a + 1, Math.floor((c.in + (x + 1) * secPerPx) * rate));
        let mx = 0;
        for (let i = a; i < b && i < peaks.length; i++) if (peaks[i] > mx) mx = peaks[i];
        const ph = (mx / 255) * (h * 0.46);
        if (ph > 0.3) g.fillRect(x, mid - ph, 1, ph * 2);
      }
      waveCache.set(key, cv);
      if (waveCache.size > 300) waveCache.delete(waveCache.keys().next().value);
    }
    if (cv.parentNode) cv.remove();
    cv.style.width = w + 'px';
    return cv;
  }

  TL.updateSelection = () => {
    RS.$$('.tl-clip', inner).forEach((el) => el.classList.toggle('selected', S.selection.has(el.dataset.id)));
    RS.$$('.tl-trans', inner).forEach((el) => el.classList.toggle('selected', !!S.selTransition && S.selTransition.clipId === el.dataset.owner && S.selTransition.side === el.dataset.side));
  };

  TL.updatePlayhead = (follow) => {
    if (!playheadEl) return;
    const x = HEAD_W + TL.xOf(S.playhead);
    playheadEl.style.transform = `translateX(${x}px)`;
    playheadEl.style.height = inner.scrollHeight + 'px';
    corner.textContent = RS.fmtTC(S.playhead, RS.fps());
    if (follow && S.playing) {
      const vx = x - scroller.scrollLeft;
      if (vx > scroller.clientWidth - 40 || vx < HEAD_W) scroller.scrollLeft = x - HEAD_W - 40;
    }
    drawRuler();
  };

  // ---------- ruler (time, markers, in/out) ----------
  function drawRuler() {
    if (!rulerCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = viewW();
    const h = RULER_H;
    if (rulerCanvas.width !== Math.round(w * dpr) || rulerCanvas.height !== Math.round(h * dpr)) {
      rulerCanvas.width = Math.round(w * dpr);
      rulerCanvas.height = Math.round(h * dpr);
      rulerCanvas.style.width = w + 'px';
      rulerCanvas.style.height = h + 'px';
    }
    const g = rulerCanvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(document.documentElement);
    g.fillStyle = css.getPropertyValue('--ruler-bg') || '#1d2026';
    g.fillRect(0, 0, w, h);
    const fps = RS.fps();
    const z = S.zoom;
    const t0 = scroller.scrollLeft / z;
    const X = (t) => (t - t0) * z;
    // in/out range
    const io = S.project.inOut || {};
    if (io.in != null || io.out != null) {
      const a = X(io.in ?? 0), b = X(io.out ?? RS.seqDuration());
      g.fillStyle = 'rgba(240,168,58,0.18)';
      g.fillRect(a, 0, b - a, h);
      g.fillStyle = 'rgba(240,168,58,0.9)';
      if (io.in != null) g.fillRect(a, 0, 2, h);
      if (io.out != null) g.fillRect(b - 2, 0, 2, h);
    }
    const steps = [1 / fps, 2 / fps, 5 / fps, 10 / fps, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
    const major = steps.find((s) => s * z >= 90) || 3600;
    const minor = steps.slice().reverse().find((s) => s < major && s * z >= 9 && Math.abs(major / s - Math.round(major / s)) < 1e-6) || major;
    g.strokeStyle = css.getPropertyValue('--ruler-tick') || '#555';
    g.fillStyle = css.getPropertyValue('--ruler-text') || '#aaa';
    g.font = '10px ui-monospace, Menlo, monospace';
    g.textBaseline = 'top';
    g.beginPath();
    const first = Math.floor(t0 / minor) * minor;
    for (let t = first; t <= t0 + w / z + minor; t += minor) {
      const x = Math.round(X(t)) + 0.5;
      const isMajor = Math.abs(t / major - Math.round(t / major)) < 1e-6;
      g.moveTo(x, h);
      g.lineTo(x, isMajor ? h - 12 : h - 5);
      if (isMajor && t >= -1e-9) g.fillText(shortTC(Math.max(0, t), fps, major), x + 3, 4);
    }
    g.stroke();
    const endX = X(RS.seqDuration());
    if (endX > 0 && endX < w) { g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(endX, 0, w - endX, h); }
    // markers
    for (const mk of S.project.markers || []) {
      const x = X(mk.t);
      if (x < -10 || x > w + 10) continue;
      g.fillStyle = mk.color || '#5ad17a';
      g.beginPath();
      g.moveTo(x - 5, 2); g.lineTo(x + 5, 2); g.lineTo(x + 5, 9); g.lineTo(x, 14); g.lineTo(x - 5, 9);
      g.closePath(); g.fill();
    }
    const px = X(S.playhead);
    if (px >= -8 && px <= w + 8) {
      g.fillStyle = css.getPropertyValue('--playhead') || '#ff5a5f';
      g.beginPath();
      g.moveTo(px - 6, h - 12); g.lineTo(px + 6, h - 12); g.lineTo(px + 6, h - 6); g.lineTo(px, h); g.lineTo(px - 6, h - 6);
      g.closePath();
      g.fill();
    }
  }

  function shortTC(t, fps, step) {
    const full = RS.fmtTC(t, fps);
    if (step < 1) return full.slice(3);
    return full.slice(0, 8).replace(/^00:/, '');
  }

  function markerAt(clientX) {
    const t = TL.timeAtClientX(clientX);
    const tol = 6 / S.zoom;
    return (S.project.markers || []).find((m) => Math.abs(m.t - t) <= tol) || null;
  }

  function onRulerDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    RS.setActivePanel('timeline');
    if (S.playing) RS.engine.pause();
    // Drag an In or Out edge of the highlighted range directly in the ruler.
    const io = S.project.inOut || {};
    const r = rulerCanvas.getBoundingClientRect();
    const xOfT = (t) => r.left + (t - scroller.scrollLeft / S.zoom) * S.zoom;
    const edge = ['in', 'out'].find((k) => io[k] != null && Math.abs(xOfT(io[k]) - e.clientX) <= 6);
    if (edge) {
      const fps = RS.fps();
      RS.beginEdit();
      const mv = (ev) => {
        const q = S.project.inOut;
        let t = snapTime(TL.timeAtClientX(ev.clientX), null, false);
        if (edge === 'in') t = Math.min(t, (q.out ?? RS.seqDuration()) - 1 / fps);
        else t = RS.clamp(t, (q.in ?? 0) + 1 / fps, Math.max(RS.seqDuration(), (q.in ?? 0) + 1 / fps));
        q[edge] = Math.max(0, RS.frameRound(t, fps));
        RS.engine.seek(q[edge]);
        drawRuler();
        showTip(ev, (edge === 'in' ? 'In ' : 'Out ') + RS.fmtTC(q[edge], fps));
      };
      const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); hideTip(); RS.endEdit('Move ' + (edge === 'in' ? 'In' : 'Out') + ' point'); };
      window.addEventListener('pointermove', mv);
      window.addEventListener('pointerup', up);
      return;
    }
    const mk = markerAt(e.clientX);
    if (mk) { RS.engine.seek(mk.t); return; }
    const move = (ev) => RS.engine.seek(snapTime(TL.timeAtClientX(ev.clientX), null, true));
    move(e);
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
  function onRulerDbl(e) {
    const mk = markerAt(e.clientX);
    if (mk) RS.cmd('editMarker', mk.id);
  }

  // ---------- snapping ----------
  function snapPoints(excludeIds) {
    const pts = [0, S.playhead];
    for (const c of S.project.clips) {
      if (excludeIds && excludeIds.has(c.id)) continue;
      pts.push(c.start, RS.clipEnd(c));
    }
    for (const m of S.project.markers || []) pts.push(m.t);
    const io = S.project.inOut || {};
    if (io.in != null) pts.push(io.in);
    if (io.out != null) pts.push(io.out);
    return pts;
  }
  function snapTime(t, excludeIds, skipPlayhead) {
    const fps = RS.fps();
    if (S.snapping) {
      const thr = SNAP_PX / S.zoom;
      let best = null, bd = thr;
      for (const p of snapPoints(excludeIds)) {
        if (skipPlayhead && p === S.playhead) continue;
        const d = Math.abs(p - t);
        if (d < bd) { bd = d; best = p; }
      }
      if (best != null) return best;
    }
    return RS.frameRound(t, fps);
  }
  function snapDelta(edges, excludeIds) {
    if (!S.snapping) return 0;
    const thr = SNAP_PX / S.zoom;
    let best = 0, bd = thr;
    const pts = snapPoints(excludeIds);
    for (const e of edges) for (const p of pts) {
      const d = p - e;
      if (Math.abs(d) < bd) { bd = Math.abs(d); best = d; }
    }
    return best;
  }

  // ---------- pointer interaction ----------
  function onPointerDown(e) {
    if (e.button !== 0) return;
    if (e.ctrlKey && RS.isMac) return; // Control+click is the Mac right-click: leave it to the context menu
    scroller.focus({ preventScroll: true });
    RS.setActivePanel('timeline');
    const tool = S.tool;
    if (tool === 'hand') return startHand(e);
    if (tool === 'zoom') {
      const r = scroller.getBoundingClientRect();
      TL.setZoom(S.zoom * (e.altKey ? 0.5 : 2), { t: TL.timeAtClientX(e.clientX), screenX: e.clientX - r.left - HEAD_W }, true);
      return;
    }
    const lane = e.target.closest('.tl-lane');
    if (!lane || !lane.dataset.track) return;
    const transEl = e.target.closest('.tl-trans');
    if (transEl && tool !== 'razor') {
      S.selection.clear();
      S.selTransition = { clipId: transEl.dataset.owner, side: transEl.dataset.side };
      RS.emit('selection');
      return;
    }
    if (S.selTransition) { S.selTransition = null; RS.emit('selection'); }
    const clipEl = e.target.closest('.tl-clip');
    const c = clipEl ? RS.getClip(clipEl.dataset.id) : null;
    if (tool === 'trackFwd' || tool === 'trackBack') return startTrackSelect(e, tool === 'trackFwd', lane.dataset.track, c);
    if (!c) {
      if (!e.shiftKey && !e.metaKey) RS.select([]);
      startMarquee(e);
      return;
    }
    const locked = RS.trackLocked(c.trackId);
    const single = e.altKey;
    if (tool === 'razor') {
      if (locked) return;
      const t = snapTime(TL.timeAtClientX(e.clientX));
      // Shift + razor cuts every unlocked track
      const targets = e.shiftKey
        ? S.project.clips.filter((x) => !RS.trackLocked(x.trackId) && x.start < t && RS.clipEnd(x) > t)
        : RS.withLinked([c], single);
      RS.commit('Razor', () => RS.ops.splitClips(targets, t));
      return;
    }
    const group = RS.withLinked([c], single).map((x) => x.id);
    const wasSelected = S.selection.has(c.id);
    if (e.shiftKey || e.metaKey) {
      if (wasSelected) { group.forEach((id) => S.selection.delete(id)); RS.emit('selection'); return; }
      RS.select(group, true);
    } else if (!wasSelected) {
      RS.select(group);
    }
    if (locked) return;
    const edge = e.target.classList.contains('tl-trim') ? (e.target.classList.contains('l') ? 'l' : 'r') : null;
    if (edge && EDGE_TOOLS.has(tool)) {
      if (tool === 'rolling') return startRoll(e, c, edge, single);
      return startTrim(e, c, edge, single, tool === 'ripple' ? 'ripple' : tool === 'rate' ? 'rate' : 'normal');
    }
    if (tool === 'slip') return startSlip(e, c, single);
    if (tool === 'slide') return startSlide(e, c, single);
    if (tool === 'select' || tool === 'type' || tool === 'rect' || tool === 'ellipse') {
      startMove(e, c, wasSelected && !e.shiftKey && !e.metaKey ? group : null);
    }
  }

  function dragLoop(e, onMove, onUp) {
    e.preventDefault();
    const id = e.pointerId;
    try { scroller.setPointerCapture(id); } catch { /* ignore */ }
    let lastEv = e;
    const autoscroll = () => {
      const r = scroller.getBoundingClientRect();
      const x = lastEv.clientX;
      let dx = 0;
      if (x > r.right - 30) dx = 18; else if (x < r.left + HEAD_W + 20 && scroller.scrollLeft > 0) dx = -18;
      if (dx) { scroller.scrollLeft += dx; onMove(lastEv); }
    };
    const move = (ev) => { lastEv = ev; onMove(ev); };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      clearInterval(timer);
      try { scroller.releasePointerCapture(id); } catch { /* ignore */ }
      hideTip();
      onUp(ev);
    };
    const timer = setInterval(autoscroll, 40);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  const finishGesture = (before, label, source) => {
    if (RS.snapshot() !== before) RS.pushUndo(before, label);
    RS.emit('change', { source });
  };
  const restoreKf = (x, json) => { x.kf = JSON.parse(json); };

  function startMove(e, c, collapseTo) {
    const fps = RS.fps();
    let moving = RS.selectedClips().filter((x) => !RS.trackLocked(x.trackId));
    if (!moving.length) return;
    if (!c || !moving.some((x) => x.id === c.id)) c = moving.slice().sort((a, b) => a.start - b.start)[0];
    const ids = new Set(moving.map((x) => x.id));
    const before = RS.snapshot();
    const orig = new Map(moving.map((x) => [x.id, { start: x.start, trackId: x.trackId }]));
    const minStart = Math.min(...moving.map((x) => x.start));
    const t0 = TL.timeAtClientX(e.clientX);
    const kind = RS.getTrack(c.trackId).kind;
    const kindTracks = RS.tracksOf(kind);
    const baseIdx = kindTracks.indexOf(RS.getTrack(c.trackId));
    const duplicate = e.altKey; // Alt-drag leaves a copy behind
    let moved = false;
    dragLoop(e, (ev) => {
      if (!moved && Math.abs(ev.clientX - e.clientX) < 4 && Math.abs(ev.clientY - e.clientY) < 4) return;
      if (!moved && duplicate) {
        const copies = JSON.parse(JSON.stringify(moving));
        const links = {};
        for (const k of copies) { k.id = RS.uid('c'); if (k.linkId) k.linkId = links[k.linkId] = links[k.linkId] || RS.uid('L'); }
        S.project.clips.push(...copies);
      }
      moved = true;
      let dt = TL.timeAtClientX(ev.clientX) - t0;
      dt = Math.max(dt, -minStart);
      const o = orig.get(c.id);
      dt += snapDelta([o.start + dt, o.start + dt + c.duration], ids);
      dt = RS.frameRound(o.start + dt, fps) - o.start;
      dt = Math.max(dt, -minStart);
      let dTrack = 0;
      const over = TL.trackAtClientY(ev.clientY);
      if (over && over.kind === kind) dTrack = kindTracks.indexOf(over) - baseIdx;
      for (const x of moving) {
        const tr = RS.getTrack(orig.get(x.id).trackId);
        if (tr.kind !== kind) continue;
        const ni = kindTracks.indexOf(tr) + dTrack;
        if (ni < 0 || ni >= kindTracks.length || kindTracks[ni].locked) { dTrack = 0; break; }
      }
      for (const x of moving) {
        const ox = orig.get(x.id);
        x.start = Math.max(0, ox.start + dt);
        const tr = RS.getTrack(ox.trackId);
        x.trackId = tr.kind === kind ? kindTracks[kindTracks.indexOf(tr) + dTrack].id : ox.trackId;
      }
      TL.render();
      showTip(ev, (duplicate ? 'Copy ' : '') + (dt >= 0 ? '+' : '−') + RS.fmtTC(Math.abs(dt), fps) + (dTrack ? `  → ${RS.getTrack(c.trackId).name}` : ''));
    }, () => {
      if (!moved) { if (collapseTo) RS.select(collapseTo); return; }
      for (const x of moving) RS.ops.clearRange(x.trackId, x.start, RS.clipEnd(x), ids);
      finishGesture(before, duplicate ? 'Duplicate clips' : 'Move clips', 'move');
    });
  }

  // mode: 'normal' | 'ripple' | 'rate'
  function startTrim(e, c, side, single, mode) {
    const fps = RS.fps();
    const minDur = 1 / fps;
    const group = RS.withLinked([c], single).filter((x) => !RS.trackLocked(x.trackId));
    const ids = new Set(group.map((x) => x.id));
    const before = RS.snapshot();
    const orig = new Map(group.map((x) => [x.id, { start: x.start, in: x.in, duration: x.duration, speed: x.speed, kf: JSON.stringify(x.kf || {}) }]));
    // ripple: clips after each trimmed clip on the same track follow the edit
    const followers = new Map();
    if (mode === 'ripple') {
      for (const g of group) {
        const oe = RS.clipEnd(g);
        for (const y of S.project.clips) if (!ids.has(y.id) && y.trackId === g.trackId && y.start >= oe - RS.EPS) followers.set(y.id, { y, start: y.start });
      }
    }
    const t0 = TL.timeAtClientX(e.clientX);
    const o = orig.get(c.id);
    let moved = false;
    dragLoop(e, (ev) => {
      moved = true;
      let d = TL.timeAtClientX(ev.clientX) - t0;
      const baseEdge = side === 'r' ? o.start + o.duration : o.start;
      if (mode !== 'ripple' || side === 'r') d += snapDelta([baseEdge + d], ids);
      d = RS.frameRound(baseEdge + d, fps) - baseEdge;
      let lo = -Infinity, hi = Infinity;
      for (const x of group) {
        const ox = orig.get(x.id);
        const sdx = RS.sourceDuration(x);
        const m = isFinite(sdx) ? { duration: sdx } : null;
        if (mode === 'rate' && m) {
          const src = ox.duration * ox.speed; // source seconds stay constant
          const minD = src / 16, maxD = src / 0.1;
          if (side === 'r') { lo = Math.max(lo, minD - ox.duration); hi = Math.min(hi, maxD - ox.duration); }
          else { lo = Math.max(lo, ox.duration - maxD, -ox.start); hi = Math.min(hi, ox.duration - minD); }
          continue;
        }
        if (side === 'r') {
          lo = Math.max(lo, minDur - ox.duration);
          if (m) hi = Math.min(hi, (m.duration - ox.in) / x.speed - ox.duration);
        } else {
          if (mode !== 'ripple') lo = Math.max(lo, -ox.start);
          if (m) lo = Math.max(lo, -ox.in / x.speed);
          hi = Math.min(hi, ox.duration - minDur);
        }
      }
      d = RS.clamp(d, lo, hi);
      for (const x of group) {
        const ox = orig.get(x.id);
        restoreKf(x, ox.kf);
        if (mode === 'rate') {
          const nd = side === 'r' ? ox.duration + d : ox.duration - d;
          if (side === 'l') x.start = ox.start + d;
          x.duration = nd;
          if (RS.isMediaBound(x)) {
            x.speed = ox.speed * ox.duration / nd;
            const ratio = nd / ox.duration;
            for (const k in x.kf) for (const p of x.kf[k]) p.t *= ratio;
          }
        } else if (side === 'r') {
          x.duration = ox.duration + d;
        } else if (mode === 'ripple') {
          // ripple in-point: clip start stays, content and everything after shift
          x.in = RS.isMediaBound(x) ? Math.max(0, ox.in + d * x.speed) : ox.in;
          x.duration = ox.duration - d;
          RS.ops.shiftKeyframes(x, -d);
        } else {
          x.start = ox.start + d;
          x.in = RS.isMediaBound(x) ? Math.max(0, ox.in + d * x.speed) : ox.in;
          x.duration = ox.duration - d;
          RS.ops.shiftKeyframes(x, -d);
        }
      }
      if (mode === 'ripple') {
        const shift = side === 'r' ? d : -d;
        for (const { y, start } of followers.values()) y.start = Math.max(0, start + shift);
      }
      TL.render();
      const what = mode === 'rate' ? `Speed ${Math.round(c.speed * 100)}%` : (side === 'l' ? 'In ' : 'Out ') + (d >= 0 ? '+' : '−') + RS.fmtTC(Math.abs(d), fps);
      showTip(ev, `${mode === 'ripple' ? 'Ripple ' : ''}${what}   Duration ${RS.fmtTC(c.duration, fps)}`);
    }, () => {
      if (!moved) return;
      if (mode !== 'ripple') for (const x of group) RS.ops.clearRange(x.trackId, x.start, RS.clipEnd(x), ids);
      finishGesture(before, mode === 'ripple' ? 'Ripple trim' : mode === 'rate' ? 'Rate stretch' : 'Trim', 'trim');
    });
  }

  // Rolling edit: move a cut point between two adjacent clips; total duration is unchanged.
  function startRoll(e, c, side, single) {
    const fps = RS.fps();
    const minDur = 1 / fps;
    const group = RS.withLinked([c], single).filter((x) => !RS.trackLocked(x.trackId));
    const pairs = [];
    for (const g of group) {
      const a = side === 'r' ? g : RS.adjacentPrev(g);
      const b = side === 'r' ? RS.adjacentNext(g) : g;
      if (a && b) pairs.push({ a, b, oa: { duration: a.duration }, ob: { start: b.start, in: b.in, duration: b.duration, kf: JSON.stringify(b.kf || {}) } });
    }
    if (!pairs.length) return startTrim(e, c, side, single, 'normal');
    const exclude = new Set(pairs.flatMap((p) => [p.a.id, p.b.id]));
    const before = RS.snapshot();
    const t0 = TL.timeAtClientX(e.clientX);
    const cut0 = pairs[0].ob.start;
    let moved = false;
    dragLoop(e, (ev) => {
      moved = true;
      let d = TL.timeAtClientX(ev.clientX) - t0;
      d += snapDelta([cut0 + d], exclude);
      d = RS.frameRound(cut0 + d, fps) - cut0;
      let lo = -Infinity, hi = Infinity;
      for (const { a, b, oa, ob } of pairs) {
        lo = Math.max(lo, minDur - oa.duration);
        hi = Math.min(hi, ob.duration - minDur);
        { const sd = RS.sourceDuration(a); if (isFinite(sd)) hi = Math.min(hi, (sd - a.in) / a.speed - oa.duration); }
        if (RS.isMediaBound(b)) lo = Math.max(lo, -ob.in / b.speed);
      }
      d = RS.clamp(d, lo, hi);
      for (const { a, b, oa, ob } of pairs) {
        a.duration = oa.duration + d;
        restoreKf(b, ob.kf);
        b.start = ob.start + d;
        b.in = RS.isMediaBound(b) ? ob.in + d * b.speed : ob.in;
        b.duration = ob.duration - d;
        RS.ops.shiftKeyframes(b, -d);
      }
      TL.render();
      showTip(ev, `Roll ${(d >= 0 ? '+' : '−') + RS.fmtTC(Math.abs(d), fps)}`);
    }, () => { if (moved) finishGesture(before, 'Rolling edit', 'trim'); });
  }

  // Slip: change which part of the source plays, keeping the clip's position and length.
  function startSlip(e, c, single) {
    const fps = RS.fps();
    const group = RS.withLinked([c], single).filter((x) => RS.isMediaBound(x) && !RS.trackLocked(x.trackId));
    if (!group.length) return RS.toast('Slip works on video and audio clips');
    const before = RS.snapshot();
    const orig = new Map(group.map((x) => [x.id, x.in]));
    const t0 = TL.timeAtClientX(e.clientX);
    let moved = false;
    dragLoop(e, (ev) => {
      moved = true;
      let d = RS.frameRound(TL.timeAtClientX(ev.clientX) - t0, fps);
      let lo = -Infinity, hi = Infinity;
      for (const x of group) {
        const sdx = RS.sourceDuration(x);
        const m = isFinite(sdx) ? { duration: sdx } : null;
        const oin = orig.get(x.id);
        hi = Math.min(hi, oin / x.speed);
        if (m) lo = Math.max(lo, (oin + x.duration * x.speed - m.duration) / x.speed);
      }
      d = RS.clamp(d, lo, hi);
      for (const x of group) x.in = Math.max(0, orig.get(x.id) - d * x.speed);
      TL.render();
      RS.engine.invalidate();
      showTip(ev, `Slip  In ${RS.fmtTC(c.in, fps)}   Out ${RS.fmtTC(c.in + c.duration * c.speed, fps)}`);
    }, () => { if (moved) finishGesture(before, 'Slip', 'trim'); });
  }

  // Slide: move a clip between its neighbours, trimming them to keep the gap closed.
  function startSlide(e, c, single) {
    const fps = RS.fps();
    const minDur = 1 / fps;
    const group = RS.withLinked([c], single).filter((x) => !RS.trackLocked(x.trackId));
    const ids = new Set(group.map((x) => x.id));
    const items = group.map((g) => {
      const p = RS.adjacentPrev(g), n = RS.adjacentNext(g);
      return {
        g, og: { start: g.start },
        p: p && !ids.has(p.id) ? p : null, op: p ? { duration: p.duration } : null,
        n: n && !ids.has(n.id) ? n : null, on: n ? { start: n.start, in: n.in, duration: n.duration, kf: JSON.stringify(n.kf || {}) } : null,
      };
    });
    const exclude = new Set([...ids, ...items.flatMap((i) => [i.p && i.p.id, i.n && i.n.id]).filter(Boolean)]);
    const before = RS.snapshot();
    const t0 = TL.timeAtClientX(e.clientX);
    const o0 = c.start;
    let moved = false;
    dragLoop(e, (ev) => {
      moved = true;
      let d = TL.timeAtClientX(ev.clientX) - t0;
      d += snapDelta([o0 + d, o0 + d + c.duration], exclude);
      d = RS.frameRound(o0 + d, fps) - o0;
      let lo = -Infinity, hi = Infinity;
      for (const it of items) {
        lo = Math.max(lo, -it.og.start);
        if (it.p) {
          lo = Math.max(lo, minDur - it.op.duration);
          { const sd = RS.sourceDuration(it.p); if (isFinite(sd)) hi = Math.min(hi, (sd - it.p.in) / it.p.speed - it.op.duration); }
        }
        if (it.n) {
          hi = Math.min(hi, it.on.duration - minDur);
          if (RS.isMediaBound(it.n)) lo = Math.max(lo, -it.on.in / it.n.speed);
        }
      }
      d = RS.clamp(d, lo, hi);
      for (const it of items) {
        it.g.start = it.og.start + d;
        if (it.p) it.p.duration = it.op.duration + d;
        if (it.n) {
          restoreKf(it.n, it.on.kf);
          it.n.start = it.on.start + d;
          it.n.in = RS.isMediaBound(it.n) ? it.on.in + d * it.n.speed : it.on.in;
          it.n.duration = it.on.duration - d;
          RS.ops.shiftKeyframes(it.n, -d);
        }
      }
      TL.render();
      showTip(ev, `Slide ${(d >= 0 ? '+' : '−') + RS.fmtTC(Math.abs(d), fps)}`);
    }, () => {
      if (!moved) return;
      for (const it of items) RS.ops.clearRange(it.g.trackId, it.g.start, RS.clipEnd(it.g), exclude);
      finishGesture(before, 'Slide', 'trim');
    });
  }

  function startTrackSelect(e, forward, trackId, clicked) {
    const t = clicked ? (forward ? clicked.start : RS.clipEnd(clicked)) : TL.timeAtClientX(e.clientX);
    const onlyTrack = e.shiftKey;
    const sel = S.project.clips.filter((c) => !RS.trackLocked(c.trackId) && (!onlyTrack || c.trackId === trackId) &&
      (forward ? RS.clipEnd(c) > t + RS.EPS && c.start >= t - RS.EPS || (clicked && c.id === clicked.id) : c.start < t - RS.EPS));
    if (!sel.length) { RS.select([]); return; }
    RS.select(sel.map((c) => c.id));
    startMove(e, clicked && sel.includes(clicked) ? clicked : null, null);
  }

  function startHand(e) {
    const sx = e.clientX, sy = e.clientY, sl = scroller.scrollLeft, st = scroller.scrollTop;
    root.classList.add('grabbing');
    dragLoop(e, (ev) => {
      scroller.scrollLeft = sl - (ev.clientX - sx);
      scroller.scrollTop = st - (ev.clientY - sy);
    }, () => root.classList.remove('grabbing'));
  }

  function startMarquee(e) {
    const box = RS.h('div', { class: 'tl-marquee' });
    const ir = () => inner.getBoundingClientRect();
    const sx = e.clientX - ir().left, sy = e.clientY - ir().top;
    const base = new Set(S.selection);
    let shown = false;
    dragLoop(e, (ev) => {
      const r = ir();
      const cx = ev.clientX - r.left, cy = ev.clientY - r.top;
      if (!shown && Math.abs(cx - sx) + Math.abs(cy - sy) < 5) return;
      if (!shown) { inner.append(box); shown = true; }
      const x1 = Math.min(sx, cx), x2 = Math.max(sx, cx), y1 = Math.min(sy, cy), y2 = Math.max(sy, cy);
      Object.assign(box.style, { left: x1 + 'px', top: y1 + 'px', width: (x2 - x1) + 'px', height: (y2 - y1) + 'px' });
      const sel = new Set(base);
      for (const el of RS.$$('.tl-clip', inner)) {
        const b = el.getBoundingClientRect();
        const bx1 = b.left - r.left, bx2 = b.right - r.left, by1 = b.top - r.top, by2 = b.bottom - r.top;
        if (bx2 > x1 && bx1 < x2 && by2 > y1 && by1 < y2) sel.add(el.dataset.id);
      }
      S.selection = sel;
      RS.emit('selection');
    }, () => { box.remove(); });
  }

  // Pointer capture during the first click retargets dblclick to the scroller, so find the clip by position.
  const clipElAt = (x, y) => document.elementsFromPoint(x, y).map((el) => el.closest && el.closest('.tl-clip')).find(Boolean) || null;

  function onDblClick(e) {
    const clipEl = e.target.closest('.tl-clip') || clipElAt(e.clientX, e.clientY);
    if (!clipEl) return;
    const c = RS.getClip(clipEl.dataset.id);
    if (!c) return;
    if (c.type === 'nest' || c.type === 'nestAudio') { RS.openSequence(c.seqId); return; }
    if (c.type === 'caption') { RS.emit('show-tab', 'captions'); setTimeout(() => { const ta = document.querySelector(`[data-cap="${c.id}"] textarea`); if (ta) { ta.focus(); ta.select(); } }, 50); return; }
    if (c.mediaId && RS.sourceMonitor) RS.sourceMonitor.load(c.mediaId);
    else if (c.type === 'text') { RS.engine.seek(Math.min(Math.max(S.playhead, c.start), RS.clipEnd(c) - 1 / RS.fps())); RS.program.editText(c.id); }
  }

  // ---------- context menus ----------
  // Resolve what is under the pointer even if an earlier gesture retargeted the event to the scroller.
  const underPointer = (e, sel) => e.target.closest(sel) || document.elementsFromPoint(e.clientX, e.clientY).map((el) => el.closest && el.closest(sel)).find(Boolean) || null;

  function onContextMenu(e) {
    e.preventDefault();
    const lane = underPointer(e, '.tl-lane');
    const transEl = underPointer(e, '.tl-trans');
    if (transEl) {
      const c = RS.getClip(transEl.dataset.owner);
      const side = transEl.dataset.side;
      S.selection.clear();
      S.selTransition = { clipId: c.id, side };
      RS.emit('selection');
      const set = (type) => RS.commit('Change transition', () => { const x = RS.getClip(c.id); const tr = side === 'in' ? x.tIn : x.tOut; tr.type = type; });
      RS.contextMenu(e.clientX, e.clientY, [
        ...RS.TRANSITIONS.map((t) => ({ label: t.name, checked: (side === 'in' ? c.tIn : c.tOut).type === t.id, run: () => set(t.id) })),
        '-',
        { label: 'Set Duration…', run: () => RS.cmd('transitionDuration') },
        { label: 'Clear Transition', run: () => RS.cmd('delete') },
      ]);
      return;
    }
    const clipEl = underPointer(e, '.tl-clip');
    if (clipEl) {
      const c = RS.getClip(clipEl.dataset.id);
      if (!S.selection.has(c.id)) RS.select(RS.withLinked([c], e.altKey).map((x) => x.id));
      const sel = RS.selectedClips();
      const anyLinked = sel.some((x) => x.linkId);
      const anyDisabled = sel.some((x) => x.disabled);
      const vis = sel.filter(RS.isVisual);
      RS.contextMenu(e.clientX, e.clientY, [
        { label: 'Cut', key: '⌘X', run: () => RS.cmd('cut') },
        { label: 'Copy', key: '⌘C', run: () => RS.cmd('copy') },
        { label: 'Paste', key: '⌘V', disabled: !S.clipboard, run: () => RS.cmd('paste') },
        { label: 'Duplicate', run: () => RS.cmd('duplicate') },
        { label: 'Clear', key: '⌫', run: () => RS.cmd('delete') },
        { label: 'Ripple Delete', key: '⇧⌫', run: () => RS.cmd('rippleDelete') },
        '-',
        { label: anyDisabled ? 'Enable' : 'Disable', key: '⇧E', run: () => RS.cmd('toggleEnable') },
        { label: anyLinked ? 'Unlink' : 'Link', key: '⌘L', disabled: !anyLinked && sel.length < 2, run: () => RS.cmd('toggleLink') },
        '-',
        { label: 'Speed/Duration…', key: '⌘R', run: () => RS.cmd('speedDuration') },
        { label: c.hold ? 'Remove Frame Hold' : 'Add Frame Hold', disabled: c.type !== 'video', run: () => RS.cmd('frameHold') },
        { label: 'Insert Frame Hold Segment', disabled: c.type !== 'video', run: () => RS.cmd('insertHold') },
        { label: c.reverse ? 'Un-reverse Clip' : 'Reverse Clip', disabled: !RS.isElementClip(c), run: () => RS.cmd('reverseClip') },
        { label: 'Audio Gain…', key: 'G', disabled: !sel.some((x) => x.type === 'audio' || x.type === 'nestAudio'), run: () => RS.cmd('clipGain') },
        { label: 'Normalize Loudness…', disabled: !sel.some((x) => x.type === 'audio'), run: () => RS.cmd('normalizeLoudness') },
        { label: 'Replace With Source Monitor Clip', disabled: !RS.sourceMonitor.mediaId, run: () => RS.cmd('replaceWithSource') },
        { label: 'Apply Default Transitions', key: '⌘D', disabled: !vis.length, run: () => RS.cmd('applyTransition') },
        { label: 'Add Fade In/Out', run: () => RS.cmd('addFades') },
        { label: 'Remove Background' + (c.type === 'image' ? '…' : ''), disabled: !(c.type === 'image' || c.type === 'video') || sel.filter((x) => x.type !== 'audio').length !== 1, run: () => (c.type === 'video' ? RS.bgRemove.video(c.id) : RS.bgRemove.open(c.mediaId, [c.id])) },
        { label: 'Set to Frame Size (Fit)', disabled: !vis.length, run: () => RS.cmd('scaleFit') },
        { label: 'Scale to Fill Frame', disabled: !vis.length, run: () => RS.cmd('scaleFill') },
        { label: 'Reset Effects', run: () => RS.cmd('resetEffects') },
        '-',
        { label: 'Nest…', run: () => RS.cmd('nest') },
        { label: 'Open Nested Sequence', disabled: !(c.type === 'nest' || c.type === 'nestAudio'), run: () => RS.openSequence(c.seqId) },
        ...(c.type === 'nest' && c.multicam ? [{ label: 'Multi-Camera: Camera ' + ((c.angle || 0) + 1), disabled: true }, ...RS.tracksOf('video', RS.getSequence(c.seqId)).map((_, i) => ({ label: '   Switch to Camera ' + (i + 1), checked: (c.angle || 0) === i, run: () => RS.commit('Switch camera', () => { RS.getClip(c.id).angle = i; }) }))] : []),
        '-',
        { label: 'Rename…', disabled: sel.length !== 1 && !(sel.length === 2 && anyLinked), run: () => RS.cmd('renameClip') },
        { label: 'Reveal in Project', disabled: !c.mediaId, run: () => RS.projectBin.reveal(c.mediaId) },
      ]);
      return;
    }
    if (lane && lane.dataset.track) {
      const t = TL.timeAtClientX(e.clientX);
      const trackId = lane.dataset.track;
      const hasGap = !RS.clipsOnTrack(trackId).some((x) => x.start <= t && RS.clipEnd(x) > t) && RS.clipsOnTrack(trackId).some((x) => x.start > t);
      RS.contextMenu(e.clientX, e.clientY, [
        { label: 'Ripple Delete Gap', disabled: !hasGap, run: () => RS.commit('Ripple delete gap', () => RS.ops.rippleDeleteGap(trackId, t)) },
        { label: 'Paste at Playhead', disabled: !S.clipboard, run: () => RS.cmd('paste') },
        '-',
        { label: 'Add Marker Here', run: () => RS.cmd('addMarker', t) },
        { label: 'Add Title Here', run: () => { RS.engine.seek(t); RS.cmd('addTitle'); } },
      ]);
    }
  }

  function onWheel(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) {
      e.preventDefault();
      const tAt = TL.timeAtClientX(e.clientX);
      const r = scroller.getBoundingClientRect();
      TL.setZoom(S.zoom * Math.exp(-e.deltaY * 0.004), { t: tAt, screenX: e.clientX - r.left - HEAD_W }, true);
    }
  }

  // ---------- drag & drop (project bin, source monitor, effects, transitions, OS files) ----------
  function edgeAt(clipEl, clientX) {
    const c = RS.getClip(clipEl.dataset.id);
    const t = TL.timeAtClientX(clientX);
    return { c, side: t - c.start < c.duration / 2 ? 'in' : 'out' };
  }

  // Magnetic drop: a clip dropped over, or a little to the right of, the clip on its left
  // butts against that clip's out point instead of overwriting it or leaving a sliver gap.
  // Dropped further right, it stays where it was dropped. Off when snapping (S) is off.
  const MAGNET_PX = 60;
  function dropTracks(trackId, mediaType) {
    const tr = RS.getTrack(trackId);
    if (!tr) return [];
    const ids = [tr.id];
    if (mediaType === 'video' || mediaType === 'sequence') {
      const other = RS.tracksOf(tr.kind === 'video' ? 'audio' : 'video')[RS.trackIndex(tr)];
      if (other) ids.push(other.id);
    }
    return ids;
  }
  function magnetStart(trackIds, t) {
    if (!S.snapping || !trackIds.length) return null;
    let left = 0;
    for (const c of S.project.clips) {
      if (!trackIds.includes(c.trackId) || c.start > t + RS.EPS) continue;
      left = Math.max(left, RS.clipEnd(c));
    }
    if (left > t) return left;                                 // dropped over a clip: go to its end
    if ((t - left) * S.zoom <= MAGNET_PX) return left;         // close to the left edge: touch it
    return null;
  }
  function dropStart(t, dur, trackId, mediaType, insert) {
    const m = insert ? null : magnetStart(dropTracks(trackId, mediaType), t);
    if (m != null) return m;
    return Math.max(0, t + snapDelta([t, t + dur]));
  }

  const libItem = (id) => { const it = RS.library.item(id); return it && { name: it.name, dur: it.dur, create: (t, trackId) => RS.library.add(id, t, trackId) }; };
  function onDragOver(e) {
    const types = [...(e.dataTransfer.types || [])];
    const payload = RS.dragPayload;
    hideGhost(true);
    if (payload && payload.kind === 'sequence') {
      const lane = e.target.closest('.tl-lane');
      const q = RS.getSequence(payload.seqId);
      if (!lane || !lane.dataset.track || !q) return;
      e.preventDefault();
      const dur = RS.seqDurationOf(q);
      const t = dropStart(TL.timeAtClientX(e.clientX), dur, lane.dataset.track, 'sequence', e.metaKey || e.ctrlKey);
      ghost(lane, t, dur, (q.multicam ? 'Multicam: ' : 'Nest: ') + q.name);
      return;
    }
    if (types.includes('Files') || (payload && payload.kind === 'media')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      const lane = e.target.closest('.tl-lane');
      if (!lane || !lane.dataset.track || !payload || payload.kind !== 'media') return;
      const m = RS.getMedia(payload.mediaId);
      if (!m) return;
      const dur = m.type === 'image' ? 5 : (payload.out ?? m.duration) - (payload.in || 0);
      const t = dropStart(TL.timeAtClientX(e.clientX), dur, lane.dataset.track, m.hasAudio ? m.type : 'single', e.metaKey || e.ctrlKey);
      ghost(lane, t, dur, (e.metaKey || e.ctrlKey ? 'Insert  ' : '') + m.name);
      return;
    }
    const cfx = payload && (payload.kind === 'library' ? libItem(payload.id) : payload.kind === 'effect' && RS.effects.find(payload.effect));
    if (cfx && cfx.create) {
      const lane = e.target.closest('.tl-lane');
      if (!lane || !lane.dataset.track) return;
      e.preventDefault();
      ghost(lane, Math.max(0, TL.timeAtClientX(e.clientX)), cfx.dur || (cfx.sound ? 1 : 4), cfx.name);
      return;
    }
    if (payload && (payload.kind === 'effect' || payload.kind === 'transition' || payload.kind === 'atransition')) {
      const clipEl = e.target.closest('.tl-clip');
      if (!clipEl) return;
      const { c, side } = edgeAt(clipEl, e.clientX);
      const ok = payload.kind === 'effect' ? RS.effects.appliesTo(payload.effect, c) : payload.kind === 'transition' ? RS.isVisual(c) : c.type === 'audio';
      if (!ok) return;
      e.preventDefault();
      if (payload.kind === 'effect') { clipEl.classList.add('drop-target'); return; }
      const lane = clipEl.closest('.tl-lane');
      const d = 1;
      const t = side === 'in' ? c.start : RS.clipEnd(c);
      const adj = side === 'in' ? RS.adjacentPrev(c) : RS.adjacentNext(c);
      const t1 = adj ? t - d / 2 : side === 'in' ? t : t - d;
      ghost(lane, t1, Math.min(d, c.duration), payload.name);
    }
  }

  function ghost(lane, t, dur, text) {
    const laneRect = lane.getBoundingClientRect(), ir = inner.getBoundingClientRect();
    Object.assign(dropGhost.style, { display: 'block', left: (HEAD_W + t * S.zoom) + 'px', top: (laneRect.top - ir.top) + 'px', width: Math.max(6, dur * S.zoom) + 'px', height: laneRect.height + 'px' });
    dropGhost.textContent = text;
  }

  function hideGhost(keepTargets) {
    dropGhost.style.display = 'none';
    if (!keepTargets) RS.$$('.tl-clip.drop-target', inner).forEach((x) => x.classList.remove('drop-target'));
    else RS.$$('.tl-clip.drop-target', inner).forEach((x) => x.classList.remove('drop-target'));
  }

  async function onDrop(e) {
    e.preventDefault();
    hideGhost();
    const payload = RS.dragPayload;
    RS.dragPayload = null;
    const lane = e.target.closest('.tl-lane');
    let t = TL.timeAtClientX(e.clientX);
    const clipEl = e.target.closest('.tl-clip');
    const cfx = payload && (payload.kind === 'library' ? libItem(payload.id) : payload.kind === 'effect' && RS.effects.find(payload.effect));
    if (cfx && cfx.create) { cfx.create(RS.frameRound(Math.max(0, t), RS.fps()), lane && lane.dataset.track); return; }
    if (payload && payload.kind === 'effect') {
      const c = clipEl && RS.getClip(clipEl.dataset.id);
      if (c) RS.effects.apply(payload.effect, RS.withLinked([c]).filter((x) => RS.effects.appliesTo(payload.effect, x)));
      return;
    }
    if (payload && (payload.kind === 'transition' || payload.kind === 'atransition')) {
      if (!clipEl) return;
      const { c, side } = edgeAt(clipEl, e.clientX);
      if (payload.kind === 'transition') {
        if (!RS.isVisual(c)) return RS.toast('Video transitions go on video, image, title or shape clips');
        RS.effects.applyTransition([c], payload.type, payload.name, [side]);
      } else {
        if (c.type !== 'audio') return RS.toast('Audio transitions go on audio clips');
        RS.commit('Apply ' + payload.name, () => RS.ops.audioTransition(RS.getClip(c.id), side, 1));
      }
      return;
    }
    const trackId = lane && lane.dataset.track ? lane.dataset.track : null;
    const insert = e.metaKey || e.ctrlKey;
    if (payload && payload.kind === 'sequence') {
      const q = RS.getSequence(payload.seqId);
      if (!q || !trackId) return;
      const dur = RS.seqDurationOf(q);
      t = dropStart(t, dur, trackId, 'sequence', insert);
      RS.commit(q.multicam ? 'Add multicam clip' : 'Add nested sequence', () => RS.ops.placeSequence(q.id, trackId, t, { insert }));
      return;
    }
    if (payload && payload.kind === 'media' && e.altKey && clipEl) {
      const c = RS.getClip(clipEl.dataset.id);
      RS.commit('Replace clip', () => RS.ops.replaceClip(c, payload.mediaId, payload.in || 0));
      RS.toast('Replaced ' + RS.clipName(RS.getClip(c.id)), 'ok');
      return;
    }
    if (payload && payload.kind === 'media') {
      const m = RS.getMedia(payload.mediaId);
      if (!m) return;
      const dur = m.type === 'image' ? 5 : (payload.out ?? m.duration) - (payload.in || 0);
      t = dropStart(t, dur, trackId, m.hasAudio ? m.type : 'single', insert);
      RS.commit('Add clip', () => RS.ops.placeMedia(m.id, trackId, t, { in: payload.in, out: payload.out, insert }));
      RS.announceMatch();
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      const added = await RS.media.importSources(RS.media.sourcesFromDataTransfer(e.dataTransfer));
      if (!added.length) return;
      RS.commit('Add clips', () => {
        const m0 = trackId ? magnetStart(dropTracks(trackId, 'video'), t) : null;
        let at = RS.frameRound(m0 != null ? m0 : t, RS.fps());
        for (const m of added) {
          const made = RS.ops.placeMedia(m.id, trackId, at, {});
          at = Math.max(...made.map(RS.clipEnd));
        }
      });
      RS.announceMatch();
    }
  }

  // ---------- tips ----------
  function showTip(ev, text) {
    const r = root.getBoundingClientRect();
    tipEl.textContent = text;
    tipEl.style.display = 'block';
    tipEl.style.left = (ev.clientX - r.left + 14) + 'px';
    tipEl.style.top = (ev.clientY - r.top + 16) + 'px';
  }
  function hideTip() { tipEl.style.display = 'none'; }

  // ---------- audio meters ----------
  const peakHold = [-60, -60], holdT = [0, 0];
  function meterLoop() {
    requestAnimationFrame(meterLoop);
    if (!meterCanvas || !RS.engine.audioContext) return;
    const dpr = window.devicePixelRatio || 1;
    const w = meterCanvas.clientWidth, h = meterCanvas.clientHeight;
    if (!w || !h) return;
    if (meterCanvas.width !== Math.round(w * dpr)) meterCanvas.width = Math.round(w * dpr);
    if (meterCanvas.height !== Math.round(h * dpr)) meterCanvas.height = Math.round(h * dpr);
    const g = meterCanvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const lv = S.playing ? RS.engine.levels() : [-Infinity, -Infinity];
    const MIN = -54;
    const yOf = (db) => h - 6 - (RS.clamp((db - MIN) / -MIN, 0, 1)) * (h - 12);
    const now = performance.now();
    const bw = 7;
    g.fillStyle = '#0d0f12';
    for (let i = 0; i < 2; i++) g.fillRect(4 + i * (bw + 3), 6, bw, h - 12);
    for (let i = 0; i < 2; i++) {
      const db = lv[i];
      const x = 4 + i * (bw + 3);
      if (db > MIN) {
        const y = yOf(db);
        const grad = g.createLinearGradient(0, h - 6, 0, 6);
        grad.addColorStop(0, '#2fbf71'); grad.addColorStop(0.72, '#d8d23a'); grad.addColorStop(0.9, '#ff5a3c');
        g.fillStyle = grad;
        g.fillRect(x, y, bw, h - 6 - y);
      }
      if (db > peakHold[i] || now - holdT[i] > 1200) { peakHold[i] = Math.max(MIN, db); holdT[i] = now; }
      if (peakHold[i] > MIN) { g.fillStyle = peakHold[i] > -1 ? '#ff5a3c' : '#e6e6e6'; g.fillRect(x, yOf(peakHold[i]), bw, 2); }
    }
    g.fillStyle = '#6f7784';
    g.font = '8px ui-monospace, Menlo, monospace';
    for (const db of [0, -6, -12, -24, -36, -48]) g.fillText(String(db), 25, yOf(db) + 3);
  }

  // ---------- tools & zoom ----------
  TL.setTool = (tool) => {
    S.tool = tool;
    TL.syncToolbar();
    RS.emit('tool', tool);
  };
  TL.toggleSnap = () => { S.snapping = !S.snapping; TL.syncToolbar(); RS.toast('Snapping ' + (S.snapping ? 'on' : 'off')); };
  TL.syncToolbar = () => {
    if (!root) return;
    RS.$$('[data-tool]', toolStrip).forEach((b) => b.classList.toggle('on', b.dataset.tool === S.tool));
    RS.$('.snap-btn', root).classList.toggle('on', S.snapping);
    RS.$('.link-btn', root).classList.toggle('on', S.linkedSelection);
    fitBtn.classList.toggle('on', !S.userZoomed);
    root.className = root.className.replace(/\btool-\S+/g, '').trim() + ' tool-' + S.tool;
    const t = RS.TOOLS.find((x) => x !== 'sep' && x.id === S.tool);
    const nm = RS.$('#tl-tool-name');
    if (nm && t) nm.textContent = t.name.split(' — ')[0];
    zoomSlider.value = zoomToSlider(S.zoom);
  };

  TL.setZoom = (z, anchor, byUser) => {
    z = RS.clamp(z, MIN_ZOOM, MAX_ZOOM);
    if (byUser) S.userZoomed = true;
    if (!anchor) {
      const px = TL.xOf(S.playhead) - scroller.scrollLeft;
      const vis = px >= 0 && px <= viewW();
      anchor = vis ? { t: S.playhead, screenX: px } : { t: scroller.scrollLeft / S.zoom, screenX: 0 };
    }
    S.zoom = z;
    TL.render();
    scroller.scrollLeft = Math.max(0, anchor.t * z - anchor.screenX);
    drawRuler();
  };
  TL.zoomBy = (f) => TL.setZoom(S.zoom * f, null, true);
  // Fit the whole sequence in view (and resume auto-fit).
  TL.zoomFit = () => {
    S.userZoomed = false;
    const d = RS.seqDuration() || 30;
    TL.setZoom((viewW() - fitPad()) / d, { t: 0, screenX: 0 }, false);
    scroller.scrollLeft = 0;
  };
  // Room left after the last clip so the next one can be dropped there.
  const fitPad = () => Math.max(48, Math.round(viewW() * 0.15));
  function autoFit() {
    if (S.userZoomed || !scroller) return;
    const d = RS.seqDuration();
    if (d <= 0) return;
    const want = RS.clamp((viewW() - fitPad()) / d, MIN_ZOOM, MAX_ZOOM);
    if (Math.abs(want - S.zoom) / S.zoom > 0.02 || scroller.scrollLeft > 0) TL.zoomFit();
  }
  TL.focus = () => scroller && scroller.focus({ preventScroll: true });
})(window.RS);
