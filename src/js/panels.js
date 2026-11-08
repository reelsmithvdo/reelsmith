'use strict';
// Project bin, Effects browser and Source monitor.
(function (RS) {
  const S = RS.state;

  // =====================================================================
  // Project panel
  // =====================================================================
  const PB = RS.projectBin = {};
  let pbRoot, pbList, pbSearch, pbView = 'list';

  PB.init = (el) => {
    pbRoot = el;
    el.innerHTML = '';
    pbSearch = RS.h('input', { type: 'search', class: 'search', placeholder: 'Search media' });
    pbSearch.addEventListener('input', () => PB.render());
    pbSearch.addEventListener('keydown', (e) => e.stopPropagation());
    const viewBtn = RS.h('button', { class: 'btn small', title: 'Toggle list / grid view' }, 'Grid');
    viewBtn.addEventListener('click', () => { pbView = pbView === 'list' ? 'grid' : 'list'; viewBtn.textContent = pbView === 'list' ? 'Grid' : 'List'; PB.render(); });
    const bar = RS.h('div', { class: 'panel-toolbar' },
      RS.h('button', { class: 'btn small primary', onclick: () => RS.cmd('import') }, RS.icon('import'), 'Import'),
      RS.iconBtn('text', 'New title at playhead (⌘T)', () => RS.cmd('addTitle')),
      RS.iconBtn('square', 'New color matte at playhead', () => RS.cmd('addMatte')),
      RS.iconBtn('seq', 'New sequence', () => RS.cmd('newSequence')),
      RS.iconBtn('adjust', 'New adjustment layer at playhead', () => RS.cmd('addAdjustment')),
      RS.iconBtn('multicam', 'Create Multi-Camera Source Sequence from selected clips', () => RS.cmd('createMulticam')),
      RS.iconBtn('trash', 'Delete selected media', () => PB.deleteSelected()),
      pbSearch, viewBtn);
    pbList = RS.h('div', { class: 'bin', tabindex: '0' });
    el.append(bar, pbList);
    pbList.addEventListener('pointerdown', () => RS.setActivePanel('project'));
    pbList.addEventListener('keydown', (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && S.selectedMedia.size) { e.preventDefault(); e.stopPropagation(); PB.deleteSelected(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && PB.selectedSeq) { e.preventDefault(); e.stopPropagation(); RS.cmd('deleteSequence', PB.selectedSeq); }
    });
    // OS file drop into the bin
    pbList.addEventListener('dragover', (e) => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); pbList.classList.add('drop'); } });
    pbList.addEventListener('dragleave', () => pbList.classList.remove('drop'));
    pbList.addEventListener('drop', (e) => {
      e.preventDefault();
      pbList.classList.remove('drop');
      if (e.dataTransfer.files.length) RS.media.importSources(RS.media.sourcesFromDataTransfer(e.dataTransfer));
    });
    RS.on('media-change', () => PB.render());
    RS.on('change', (o) => { if (!o || o.source !== 'inspector-live') PB.renderUsage(); });
    PB.render();
  };

  PB.render = () => {
    const q = (pbSearch.value || '').toLowerCase();
    const items = S.project.media.filter((m) => !q || m.name.toLowerCase().includes(q));
    pbList.innerHTML = '';
    pbList.className = 'bin ' + pbView;
    if (!S.project.media.length && S.project.sequences.length <= 1 && !S.project.clips.length) {
      pbList.append(RS.h('div', { class: 'bin-empty' },
        RS.icon('folder', 'big'),
        RS.h('div', null, 'Import media to start'),
        RS.h('div', { class: 'muted' }, 'Drag video, audio or image files here, or press ⌘I'),
        RS.h('button', { class: 'btn primary', onclick: () => RS.cmd('import') }, 'Import Media…')));
      return;
    }
    const seqs = S.project.sequences.filter((x) => !q || x.name.toLowerCase().includes(q));
    for (const x of seqs) pbList.append(seqItem(x));
    for (const m of items) pbList.append(item(m));
    PB.renderUsage();
  };

  function seqItem(q) {
    const active = q.id === S.project.activeSeq;
    const thumb = RS.h('div', { class: 'thumb seq' + (q.multicam ? ' mc' : '') }, RS.icon(q.multicam ? 'multicam' : 'seq'));
    const meta = [RS.fmtTC(RS.seqDurationOf(q), q.settings.fps), `${q.settings.width}×${q.settings.height}`, q.settings.fps + ' fps'];
    const el = RS.h('div', { class: 'bin-item seq-item' + (active ? ' active-seq' : '') + (PB.selectedSeq === q.id ? ' selected' : ''), 'data-seq': q.id, draggable: true, title: 'Sequence — double-click to open, drag into a timeline to nest' },
      thumb, RS.h('div', { class: 'info' },
        RS.h('div', { class: 'name' }, q.name, active ? RS.h('span', { class: 'tag' }, 'open') : null, q.multicam ? RS.h('span', { class: 'tag mc' }, 'multicam') : null),
        RS.h('div', { class: 'meta' }, meta.join(' · '))));
    el.addEventListener('click', () => { PB.selectedSeq = q.id; S.selectedMedia.clear(); RS.$$('.bin-item', pbList).forEach((x) => x.classList.toggle('selected', x.dataset.seq === q.id)); pbList.focus({ preventScroll: true }); });
    el.addEventListener('dblclick', () => RS.openSequence(q.id));
    el.addEventListener('dragstart', (e) => { RS.dragPayload = { kind: 'sequence', seqId: q.id }; e.dataTransfer.setData('text/plain', q.name); e.dataTransfer.effectAllowed = 'copy'; });
    el.addEventListener('dragend', () => { setTimeout(() => { RS.dragPayload = null; }, 0); });
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      RS.contextMenu(e.clientX, e.clientY, [
        { label: 'Open in Timeline', run: () => RS.openSequence(q.id) },
        { label: 'Rename…', run: () => RS.cmd('renameSequence', q.id) },
        { label: 'Delete Sequence', disabled: S.project.sequences.length <= 1, run: () => RS.cmd('deleteSequence', q.id) },
      ]);
    });
    return el;
  }

  function item(m) {
    const rt = RS.runtime[m.id] || {};
    const offline = !rt.url || rt.offline;
    const thumb = RS.h('div', { class: 'thumb' + (m.type === 'audio' ? ' audio' : '') });
    if (rt.thumb) thumb.style.backgroundImage = `url("${rt.thumb}")`;
    else thumb.append(RS.icon(m.type === 'audio' ? 'music' : m.type === 'image' ? 'image' : 'film'));
    if (offline) thumb.append(RS.h('div', { class: 'offline-badge' }, 'Offline'));
    const meta = [m.type === 'image' ? 'Still' : RS.fmtTC(m.duration, RS.fps())];
    if (m.width) meta.push(`${m.width}×${m.height}`);
    if (m.type === 'video' && !m.hasAudio) meta.push('no audio');
    if (m.proxyPath) meta.push('proxy ✓');
    const el = RS.h('div', {
      class: 'bin-item' + (S.selectedMedia.has(m.id) ? ' selected' : '') + (offline ? ' offline' : ''),
      'data-id': m.id, draggable: !offline, title: m.path || m.name,
    }, thumb, RS.h('div', { class: 'info' },
      RS.h('div', { class: 'name' }, m.name),
      RS.h('div', { class: 'meta' }, meta.join(' · ')),
      RS.h('div', { class: 'usage', 'data-usage': m.id })),
      // Touch screens: a visible "add to timeline" button (dragging from the panel needs a mouse).
      offline ? null : RS.h('button', { class: 'ibtn bin-add', type: 'button', title: 'Add to timeline at playhead', onclick: (e) => { e.stopPropagation(); PB.addAtPlayhead(m.id); } }, RS.icon('plus')));
    el.addEventListener('click', (e) => {
      if (!(e.shiftKey || e.metaKey)) S.selectedMedia.clear();
      if (S.selectedMedia.has(m.id) && (e.shiftKey || e.metaKey)) S.selectedMedia.delete(m.id); else S.selectedMedia.add(m.id);
      RS.$$('.bin-item', pbList).forEach((x) => x.classList.toggle('selected', S.selectedMedia.has(x.dataset.id)));
      pbList.focus({ preventScroll: true });
    });
    el.addEventListener('dblclick', () => {
      if (offline) RS.media.relink(m);
      else RS.sourceMonitor.load(m.id);
    });
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!S.selectedMedia.has(m.id)) { S.selectedMedia = new Set([m.id]); RS.$$('.bin-item', pbList).forEach((x) => x.classList.toggle('selected', S.selectedMedia.has(x.dataset.id))); }
      RS.contextMenu(e.clientX, e.clientY, [
        { label: 'Add to Timeline at Playhead', disabled: offline, run: () => PB.addAtPlayhead(m.id) },
        { label: 'Open in Source Monitor', disabled: offline, run: () => RS.sourceMonitor.load(m.id) },
        { label: 'Create Multi-Camera Source Sequence…', disabled: S.selectedMedia.size < 2, run: () => RS.cmd('createMulticam') },
        { label: 'Create Proxies', disabled: m.type !== 'video', run: () => RS.proxies.create([...S.selectedMedia]) },
        { label: 'Remove Background…', disabled: m.type !== 'image' || offline, run: () => RS.bgRemove.open(m.id) },
        { label: 'Relink Media…', run: () => RS.media.relink(m) },
        { label: 'Reveal in Finder', disabled: !m.path || !RS.native, run: () => RS.native.reveal(m.path) },
        '-',
        { label: 'Delete', run: () => PB.deleteSelected() },
      ]);
    });
    el.addEventListener('dragstart', (e) => {
      const src = RS.sourceMonitor.marksFor(m.id);
      RS.dragPayload = { kind: 'media', mediaId: m.id, in: src.in, out: src.out };
      e.dataTransfer.setData('text/plain', m.name);
      e.dataTransfer.effectAllowed = 'copy';
    });
    el.addEventListener('dragend', () => { setTimeout(() => { RS.dragPayload = null; }, 0); });
    return el;
  }

  PB.renderUsage = () => {
    if (!pbList) return;
    const counts = {};
    for (const c of S.project.clips) if (c.mediaId && c.type !== 'audio') counts[c.mediaId] = (counts[c.mediaId] || 0) + 1;
    for (const c of S.project.clips) if (c.mediaId && c.type === 'audio' && !c.linkId) counts[c.mediaId] = (counts[c.mediaId] || 0) + 1;
    RS.$$('[data-usage]', pbList).forEach((el) => {
      const n = counts[el.dataset.usage] || 0;
      el.textContent = n ? `Used ${n}×` : '';
    });
  };

  PB.reveal = (mediaId) => {
    if (!RS.getMedia(mediaId)) return;
    RS.emit('show-tab', 'project');
    pbSearch.value = '';
    S.selectedMedia = new Set([mediaId]);
    PB.render();
    const el = pbList.querySelector(`[data-id="${mediaId}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
    RS.setActivePanel('project');
  };

  // Put a media item on the timeline at the playhead, on the first track that is free there
  // (touch screens cannot drag from the Project panel).
  PB.addAtPlayhead = (mediaId) => {
    const m = RS.getMedia(mediaId);
    if (!m) return;
    const t = S.playhead, d = m.type === 'image' ? 5 : m.duration;
    const kind = m.type === 'audio' ? 'audio' : 'video';
    const free = (tr) => !tr.locked && !S.project.clips.some((c) => c.trackId === tr.id && c.start < t + d - RS.EPS && RS.clipEnd(c) > t + RS.EPS);
    RS.commit('Add ' + m.name, () => {
      const tr = RS.tracksOf(kind).find(free) || RS.ops.addTrack(kind);
      RS.ops.placeMedia(m.id, tr.id, t, {});
    });
    if (RS.touch && RS.touch.isPhone()) RS.touch.closeSheet();
  };

  PB.deleteSelected = async () => {
    const ids = [...S.selectedMedia];
    if (!ids.length) return RS.toast('Select media in the Project panel first');
    const used = S.project.clips.filter((c) => ids.includes(c.mediaId));
    if (used.length) {
      const ok = await RS.confirm('Delete media', `${used.length} clip(s) in the timeline use this media and will be removed too.`, 'Delete', true);
      if (!ok) return;
    }
    RS.commit('Delete media', () => {
      for (const c of used) RS.ops.removeClip(c.id);
      S.project.media = S.project.media.filter((m) => !ids.includes(m.id));
      S.selectedMedia.clear();
    });
    if (ids.includes(RS.sourceMonitor.mediaId)) RS.sourceMonitor.load(null);
    RS.emit('media-change');
  };

  // =====================================================================
  // Effects panel
  // =====================================================================
  const FX = RS.effects = {};
  FX.list = [
    { group: 'Video Transitions', items: RS.TRANSITIONS.filter((t) => !t.shape).map((t) => ({ id: 'tr-' + t.id, name: t.name, transition: t.id, kind: 'visual' })) },
    { group: 'Shape Transitions', items: RS.TRANSITIONS.filter((t) => t.shape).map((t) => ({ id: 'tr-' + t.id, name: t.name, transition: t.id, kind: 'visual' })) },
    { group: 'Audio Transitions', items: [
      { id: 'atr-power', name: 'Constant Power', atransition: true, kind: 'audio' },
      { id: 'atr-gain', name: 'Constant Gain', atransition: true, kind: 'audio' },
    ] },
    { group: 'Video Effects', items: [
      { id: 'crop', name: 'Crop', kind: 'visual', section: true },
      { id: 'transform', name: 'Transform (Skew)', kind: 'visual', section: true },
      { id: 'shadow', name: 'Drop Shadow', kind: 'visual', props: { shadow: 1 } },
      { id: 'hflip', name: 'Horizontal Flip', kind: 'visual', props: { flipH: 1 } },
      { id: 'vflip', name: 'Vertical Flip', kind: 'visual', props: { flipV: 1 } },
      { id: 'sharpen', name: 'Sharpen', kind: 'visual', props: { sharpen: 60 } },
      { id: 'mosaic', name: 'Mosaic', kind: 'visual', props: { mosaic: 40 } },
      { id: 'ultrakey', name: 'Ultra Key (Green Screen)', kind: 'visual', key: true },
    ] },
    { group: 'Audio Effects', items: [
      { id: 'eq', name: 'Parametric EQ (3-band)', kind: 'audio', afx: 'eq', def: { low: 0, mid: 0, high: 0, midFreq: 1000 } },
      { id: 'comp', name: 'Compressor', kind: 'audio', afx: 'comp', def: { threshold: -24, ratio: 4, makeup: 3 } },
      { id: 'hp', name: 'High-Pass (remove rumble)', kind: 'audio', afx: 'hp', def: { freq: 80 } },
      { id: 'dehum', name: 'DeHum (50/60 Hz)', kind: 'audio', afx: 'dehum', def: { freq: 50 } },
      { id: 'gate', name: 'Noise Gate', kind: 'audio', afx: 'gate', def: { threshold: -45 } },
    ] },
    { group: 'Fades', items: [
      { id: 'fadein', name: 'Fade In (1s)', kind: 'visual', props: { fadeIn: 1 } },
      { id: 'fadeout', name: 'Fade Out (1s)', kind: 'visual', props: { fadeOut: 1 } },
      { id: 'fadeboth', name: 'Fade In & Out', kind: 'visual', props: { fadeIn: 1, fadeOut: 1 } },
      { id: 'dissolve', name: 'Quick Dissolve (0.5s)', kind: 'visual', props: { fadeIn: 0.5, fadeOut: 0.5 } },
    ] },
    { group: 'Color Looks', items: [
      { id: 'bw', name: 'Black & White', kind: 'visual', props: { grayscale: 100, contrast: 110 } },
      { id: 'sepia', name: 'Sepia', kind: 'visual', props: { sepia: 85, contrast: 105 } },
      { id: 'vintage', name: 'Vintage', kind: 'visual', props: { sepia: 35, saturation: 80, contrast: 110, brightness: 96 } },
      { id: 'vivid', name: 'Vivid', kind: 'visual', props: { saturation: 145, contrast: 112 } },
      { id: 'cool', name: 'Cool Tone', kind: 'visual', props: { hue: -12, saturation: 110 } },
      { id: 'warm', name: 'Warm Tone', kind: 'visual', props: { hue: 10, saturation: 115, brightness: 103 } },
      { id: 'bright', name: 'Brighten', kind: 'visual', props: { brightness: 120 } },
      { id: 'dark', name: 'Darken', kind: 'visual', props: { brightness: 80 } },
      { id: 'invert', name: 'Invert', kind: 'visual', props: { invert: 100 } },
    ] },
    { group: 'Blur & Motion', items: [
      { id: 'blur', name: 'Gaussian Blur', kind: 'visual', props: { blur: 8 } },
      { id: 'zoomin', name: 'Slow Zoom In (Ken Burns)', kind: 'visual', anim: { scale: [100, 115] } },
      { id: 'zoomout', name: 'Slow Zoom Out', kind: 'visual', anim: { scale: [115, 100] } },
      { id: 'pip', name: 'Picture in Picture', kind: 'visual', pip: true },
    ] },
    { group: 'Audio', items: [
      { id: 'afadein', name: 'Audio Fade In (1s)', kind: 'audio', props: { fadeIn: 1 } },
      { id: 'afadeout', name: 'Audio Fade Out (1s)', kind: 'audio', props: { fadeOut: 1 } },
      { id: 'boost', name: 'Boost +6 dB', kind: 'audio', props: { volume: 200 } },
      { id: 'duck', name: 'Lower to 30%', kind: 'audio', props: { volume: 30 } },
    ] },
  ];
  const findFx = (id) => FX.list.flatMap((g) => g.items).find((x) => x.id === id);
  FX.find = findFx;

  FX.appliesTo = (fxId, c) => {
    const fx = findFx(fxId);
    if (!fx) return false;
    if (fx.kind === 'create') return false;
    if (fx.kind === 'text') return c.type === 'text';
    return fx.kind === 'audio' ? c.type === 'audio' : RS.isVisual(c);
  };

  // Undo what one preset did to a clip (no commit; used by Remove and by exclusive presets).
  function undoFx(c, fx) {
    c.fx = (c.fx || []).filter((x) => x !== fx.id);
    if (fx.props) for (const k in fx.props) c.props[k] = RS.DEFAULT_PROPS[k];
    if (fx.anim && c.kf) for (const k in fx.anim) delete c.kf[k];
    if (fx.pip) Object.assign(c.props, { scale: 100, x: 0, y: 0 });
    if (fx.key) delete c.key;
    if (fx.afx && c.afx) { delete c.afx[fx.afx]; if (!Object.keys(c.afx).length) delete c.afx; }
    if (fx.voice && c.afx) { delete c.afx.voice; if (!Object.keys(c.afx).length) delete c.afx; }
    if (fx.clipAnim && c.anim) { delete c.anim[fx.clipAnim.slot]; if (!Object.keys(c.anim).length) delete c.anim; }
    if (fx.vfx && c.vfx) { for (const k in fx.vfx) delete c.vfx[k]; if (!Object.keys(c.vfx).length) delete c.vfx; }
    if (fx.id === 'crop') for (const k of ['cropL', 'cropT', 'cropR', 'cropB']) { c.props[k] = 0; if (c.kf) delete c.kf[k]; }
    if (fx.id === 'transform') for (const k of ['skewX', 'skewY']) c.props[k] = 0;
  }

  FX.apply = (fxId, clips) => {
    const fx = findFx(fxId);
    if (!fx) return;
    const targets = clips.filter((c) => FX.appliesTo(fxId, c));
    if (!targets.length) return RS.toast(`"${fx.name}" can only be applied to ${fx.kind === 'audio' ? 'audio' : fx.kind === 'text' ? 'text (title)' : 'video, image or title'} clips`);
    if (fx.action) return fx.action(targets);
    RS.commit('Apply ' + fx.name, () => {
      for (const t of targets) {
        const c = RS.getClip(t.id);
        if (fx.exclusive) for (const other of (c.fx || []).map(findFx).filter((o) => o && o.exclusive === fx.exclusive && o.id !== fx.id)) undoFx(c, other);
        if (!fx.oneShot) c.fx = [...new Set([...(c.fx || []), fx.id])];
        if (fx.clipAnim) { c.anim = c.anim || {}; const a = Object.assign({}, fx.clipAnim); delete a.slot; c.anim[fx.clipAnim.slot] = a; }
        if (fx.vfx) c.vfx = Object.assign(c.vfx || {}, JSON.parse(JSON.stringify(fx.vfx)));
        if (fx.textStyle) RS.creative.applyTextStyle(c, fx.textStyle);
        if (fx.voice) { c.afx = c.afx || {}; c.afx.voice = { type: fx.voice }; }
        if (fx.props) for (const k in fx.props) {
          let v = fx.props[k];
          if (k === 'fadeIn' || k === 'fadeOut') v = Math.min(v, c.duration / 2);
          if (RS.isKeyframed(c, k)) delete c.kf[k];
          c.props[k] = v;
        }
        if (fx.anim) for (const k in fx.anim) {
          c.kf = c.kf || {};
          c.kf[k] = [{ t: 0, v: fx.anim[k][0] }, { t: +c.duration.toFixed(4), v: fx.anim[k][1] }];
        }
        if (fx.key) c.key = c.key || { on: true, color: '#00b140', tolerance: 30, softness: 15, spill: 50 };
        if (fx.afx) { c.afx = c.afx || {}; c.afx[fx.afx] = Object.assign({}, fx.def, c.afx[fx.afx] || {}); }
        if (fx.pip) {
          const { width: W, height: H } = S.project.settings;
          if (c.kf) { delete c.kf.scale; delete c.kf.x; delete c.kf.y; }
          Object.assign(c.props, { scale: 35, x: W * 0.3, y: H * 0.28 });
        }
      }
    });
    // Premiere-style feedback: select the clip, show it in Effect Controls and in the Program monitor.
    const first = RS.getClip(targets[0].id);
    RS.select(RS.withLinked([first]).map((x) => x.id));
    RS.emit('show-tab', 'effectControls');
    if (S.playhead < first.start || S.playhead >= RS.clipEnd(first)) RS.engine.seek(first.start + Math.min(0.5, first.duration / 2));
    RS.toast(`Applied ${fx.name} to ${targets.length > 1 ? targets.length + ' clips' : RS.clipName(first)}`, 'ok');
  };

  // Undo one preset on a clip: restore the properties it changed.
  FX.remove = (clipId, fxId) => {
    const fx = findFx(fxId);
    RS.commit('Remove ' + (fx ? fx.name : 'effect'), () => {
      const c = RS.getClip(clipId);
      if (!c) return;
      if (fx) undoFx(c, fx); else c.fx = (c.fx || []).filter((x) => x !== fxId);
    });
  };

  // Add a transition to clip edges, select it, and play a short preview so the result is visible.
  FX.applyTransition = (clips, type, name, sides) => {
    const vis = clips.filter(RS.isVisual);
    if (!vis.length) { RS.toast(`${name} is a video transition — use it on a video, image, title or shape clip`); return false; }
    const edges = sides || ['in', 'out'];
    RS.commit('Apply ' + name, () => vis.forEach((c) => edges.forEach((sd) => RS.ops.setTransition(RS.getClip(c.id), sd, type, RS.isShapeTransition(type) ? 1.2 : 1))));
    const first = RS.getClip(vis[0].id);
    // find the window that was created for the first edge
    const side = edges[0];
    const owner = side === 'out' && RS.adjacentNext(first) && RS.adjacentNext(first).tIn ? RS.adjacentNext(first) : first;
    const win = RS.transWindows(first.trackId).find((w) => w.owner === owner.id);
    S.selection.clear();
    S.selTransition = { clipId: owner.id, side: owner === first ? side : 'in' };
    RS.emit('selection');
    RS.emit('show-tab', 'effectControls');
    const where = edges.length === 2 ? 'start and end' : side === 'in' ? 'start' : 'end';
    RS.toast(`${name} added to the ${where} of "${RS.clipName(first)}" — previewing (Space to replay)`, 'ok', 4500);
    if (win) RS.engine.previewRange(win.t1 - 0.4, win.t2 + 0.4);
    return true;
  };
  FX.applyAudioTransition = (clips, name) => {
    const au = clips.filter((c) => c.type === 'audio');
    if (!au.length) { RS.toast(`${name} is an audio transition — use it on an audio clip`); return false; }
    RS.commit('Apply ' + name, () => au.forEach((c) => { RS.ops.audioTransition(RS.getClip(c.id), 'in', 1); RS.ops.audioTransition(RS.getClip(c.id), 'out', 1); }));
    RS.toast(`${name} added (1 s fade at start and end of the audio)`, 'ok');
    return true;
  };
  // Clips to use when nothing is selected: the topmost clip under the playhead.
  FX.defaultTargets = () => {
    const sel = RS.selectedClips();
    if (sel.length) return sel;
    for (const tr of RS.tracksOf('video').slice().reverse()) {
      const c = S.project.clips.find((x) => x.trackId === tr.id && !x.disabled && S.playhead >= x.start && S.playhead < RS.clipEnd(x));
      if (c) return RS.withLinked([c]);
    }
    const a = S.project.clips.find((x) => x.type === 'audio' && S.playhead >= x.start && S.playhead < RS.clipEnd(x));
    return a ? [a] : [];
  };
  FX.applyItem = (x) => {
    if (x.create) return x.create(S.playhead);
    const targets = FX.defaultTargets();
    if (!targets.length) return RS.toast('Select a clip in the timeline (or put the playhead over one), then apply');
    if (x.transition) return FX.applyTransition(targets, x.transition, x.name);
    if (x.atransition) return FX.applyAudioTransition(targets, x.name);
    return FX.apply(x.id, targets);
  };

  // Drop an effect/transition payload onto a specific clip (used by the Effect Controls panel and Program monitor).
  FX.dropOn = (payload, c) => {
    if (!payload || !c) return false;
    if (payload.kind === 'effect') { FX.apply(payload.effect, RS.withLinked([c]).filter((x) => FX.appliesTo(payload.effect, x))); return true; }
    if (payload.kind === 'transition') return FX.applyTransition(RS.withLinked([c]), payload.type, payload.name);
    if (payload.kind === 'atransition') return FX.applyAudioTransition(RS.withLinked([c]), payload.name);
    return false;
  };

  let fxRoot;
  FX.init = (el) => {
    fxRoot = el;
    const search = RS.h('input', { type: 'search', class: 'search', placeholder: 'Search effects' });
    const list = RS.h('div', { class: 'fx-list' });
    search.addEventListener('keydown', (e) => e.stopPropagation());
    const render = () => {
      const q = search.value.toLowerCase();
      list.innerHTML = '';
      for (const g of FX.list) {
        const items = g.items.filter((x) => !q || x.name.toLowerCase().includes(q));
        if (!items.length) continue;
        list.append(RS.h('div', { class: 'fx-group' }, g.group));
        for (const x of items) {
          const isTr = !!(x.transition || x.atransition);
          const it = RS.h('div', { class: 'fx-item', draggable: true, title: isTr ? 'Drag onto the start or end of a clip (or a cut between clips). Double-click: apply to both ends of selected clips' : 'Drag onto a clip, or double-click to apply to selected clips' },
            RS.icon(isTr ? 'transition' : x.kind === 'audio' || x.sound ? 'music' : x.kind === 'text' || (x.create && !x.sound) ? 'text' : 'fx'), x.name);
          it.addEventListener('dragstart', (e) => {
            RS.dragPayload = x.transition ? { kind: 'transition', type: x.transition, name: x.name }
              : x.atransition ? { kind: 'atransition', name: x.name } : { kind: 'effect', effect: x.id };
            e.dataTransfer.setData('text/plain', x.name);
            e.dataTransfer.effectAllowed = 'copy';
          });
          it.addEventListener('dragend', () => { setTimeout(() => { RS.dragPayload = null; }, 0); });
          it.addEventListener('dblclick', () => FX.applyItem(x));
          it.addEventListener('click', () => {
            RS.$$('.fx-item.on', list).forEach((e) => e.classList.remove('on'));
            it.classList.add('on');
            showHelp(x);
          });
          list.append(it);
        }
      }
    };
    const help = RS.h('div', { class: 'fx-help' }, RS.h('span', { class: 'muted' }, 'Click an effect to see how to use it.'));
    const describe = (x) => {
      if (x.transition && RS.isShapeTransition(x.transition)) return 'Shape transition — coloured shapes sweep across the screen and the picture changes while it is covered. Drag it onto the cut between two clips (or a clip edge). Select it on the timeline to change its colours and duration in Effect Controls.';
      if (x.transition) return 'Video transition — animates the START or END of a clip (or the cut between two clips). Drag it onto a clip edge, or press Apply to add it to both ends of the selected clip. It plays only while the playhead passes that moment.';
      if (x.atransition) return 'Audio transition — fades the sound in/out at the clip edges. Drag it onto an audio clip edge or press Apply.';
      if (x.create && x.sound) return 'Sound effect — double-click (or Apply) to add it at the playhead on a free audio track, or drag it onto the timeline. Generated on your Mac and saved to Movies/Reelsmith/Sound Effects.';
      if (x.create) return 'Adds a ready-made animated title or sticker at the playhead (or drag it onto the timeline). Edit the words by double-clicking it in the Program monitor; change animations in Effect Controls ▸ Animation.';
      if (x.clipAnim) return x.clipAnim.slot === 'loop' ? 'Loop animation — repeats for the whole clip (great for stickers and titles). Adjust speed and strength in Effect Controls ▸ Animation.' : `${x.clipAnim.slot === 'in' ? 'In' : 'Out'} animation — animates the clip as it ${x.clipAnim.slot === 'in' ? 'appears' : 'leaves'}. Works on videos, images, titles and stickers. Change the type and duration in Effect Controls ▸ Animation.`;
      if (x.vfx) return 'Creative effect — adds a look or motion to the whole clip. Adjust its strength in Effect Controls ▸ Creative Effects.';
      if (x.exclusive === 'filter') return 'Filter — a one-click colour look. Applying another filter replaces it. Fine-tune in Lumetri Color.';
      if (x.textStyle) return 'Text style — restyles the selected title (font, colour, outline, glow). Select a text clip first.';
      if (x.voice) return 'Voice effect — changes how the voice sounds during playback and export. One voice effect per clip; applying another replaces it.';
      if (x.action) return 'Select the MUSIC clip(s), then Apply: the music is lowered automatically wherever the voice/dialogue on another audio track is speaking (adds volume keyframes you can adjust).';
      if (x.anim) return 'Animated effect — slowly changes scale over the whole clip. Drag onto a clip or press Apply.';
      if (x.id === 'pip') return 'Shrinks the clip to the corner so the track below shows through. Use it on a clip on V2 or higher.';
      if (x.key) return 'Removes a green (or any) background. Put the person on V2 above a background on V1, apply Ultra Key, then use the eyedropper in Effect Controls to pick the background colour and adjust Tolerance and Softness.';
      if (x.afx) return 'Audio effect — processes the sound of the clip during playback and export. Adjust it in Effect Controls ▸ Audio.';
      if (x.section) return 'Adds controls in Effect Controls to ' + (x.id === 'crop' ? 'trim the edges of the picture (Left, Top, Right, Bottom). The cropped area becomes transparent.' : 'skew (slant) the picture horizontally or vertically.');
      if (x.kind === 'audio') return 'Audio effect — changes the clip volume. Drag onto an audio clip or press Apply.';
      return 'Effect — changes the whole clip immediately. Drag onto a clip (timeline, Effect Controls or the Program picture) or press Apply. Remove it from the chip in Effect Controls.';
    };
    function showHelp(x) {
      help.innerHTML = '';
      const btn = RS.h('button', { class: 'btn small primary' }, x.create ? 'Add at playhead' : 'Apply to selected clip');
      btn.addEventListener('click', () => FX.applyItem(x));
      const more = RS.h('a', { href: '#', class: 'fx-more' }, 'Learn more');
      more.addEventListener('click', (e) => { e.preventDefault(); RS.help.open(x.transition ? 'transitions' : x.atransition ? 'audio-transitions' : 'apply-effects'); });
      help.append(RS.h('div', { class: 'fx-help-title' }, RS.icon(x.transition || x.atransition ? 'transition' : 'fx'), x.name), RS.h('div', { class: 'fx-help-text' }, describe(x)), RS.h('div', { class: 'fx-help-actions' }, btn, more));
    }
    search.addEventListener('input', render);
    el.append(RS.h('div', { class: 'panel-toolbar' }, search), list, help);
    render();
  };

  // =====================================================================
  // Source monitor
  // =====================================================================
  const SM = RS.sourceMonitor = { mediaId: null };
  const marks = {}; // mediaId -> {in, out}
  let smRoot, smStage, smEl, smTime, smDur, smBar, smFill, smRange, smHead, smPlay, smName;
  let raf = 0;

  SM.marksFor = (id) => marks[id] || {};

  SM.init = (el) => {
    smRoot = el;
    smStage = RS.h('div', { class: 'mon-stage source' });
    smName = RS.h('div', { class: 'mon-name' });
    smTime = RS.h('div', { class: 'tc' }, '00:00:00:00');
    smDur = RS.h('div', { class: 'tc dim' }, '');
    smBar = RS.h('div', { class: 'scrub-bar' });
    smRange = RS.h('div', { class: 'scrub-range' });
    smFill = RS.h('div', { class: 'scrub-fill' });
    smHead = RS.h('div', { class: 'scrub-head' });
    smBar.append(smRange, smFill, smHead);
    smPlay = RS.iconBtn('play', 'Play / pause (Space)', () => SM.toggle());
    const drag = RS.h('div', { class: 'drag-handle', draggable: true, title: 'Drag into the timeline' }, RS.icon('film'), 'Drag to timeline');
    drag.addEventListener('dragstart', (e) => {
      if (!SM.mediaId) { e.preventDefault(); return; }
      const mk = marks[SM.mediaId] || {};
      RS.dragPayload = { kind: 'media', mediaId: SM.mediaId, in: mk.in, out: mk.out };
      e.dataTransfer.setData('text/plain', 'clip');
    });
    drag.addEventListener('dragend', () => { setTimeout(() => { RS.dragPayload = null; }, 0); });
    const controls = RS.h('div', { class: 'mon-controls' },
      smTime,
      RS.h('div', { class: 'transport' },
        RS.iconBtn('markIn', 'Mark In (I)', () => SM.markIn()),
        RS.iconBtn('markOut', 'Mark Out (O)', () => SM.markOut()),
        RS.iconBtn('stepBack', 'Back one frame (←)', () => SM.step(-1)),
        smPlay,
        RS.iconBtn('stepFwd', 'Forward one frame (→)', () => SM.step(1)),
        RS.iconBtn('insert', 'Insert at playhead (,)', () => SM.edit(true)),
        RS.iconBtn('overwrite', 'Overwrite at playhead (.)', () => SM.edit(false))),
      smDur);
    el.append(smName, smStage, smBar, RS.h('div', { class: 'mon-bottom' }, controls, drag));
    smStage.addEventListener('pointerdown', () => RS.setActivePanel('source'));
    smBar.addEventListener('pointerdown', (e) => {
      RS.setActivePanel('source');
      if (!smEl || !SM.dur()) return;
      const seekTo = (ev) => {
        const r = smBar.getBoundingClientRect();
        smEl.currentTime = RS.clamp((ev.clientX - r.left) / r.width, 0, 1) * SM.dur();
        SM.update();
      };
      seekTo(e);
      const up = () => { window.removeEventListener('pointermove', seekTo); window.removeEventListener('pointerup', up); };
      window.addEventListener('pointermove', seekTo);
      window.addEventListener('pointerup', up);
    });
    SM.load(null);
  };

  SM.dur = () => {
    const m = SM.mediaId && RS.getMedia(SM.mediaId);
    return m ? m.duration : 0;
  };

  SM.load = (mediaId) => {
    if (smEl) { smEl.pause(); smEl.removeAttribute('src'); smEl.load(); smEl.remove(); smEl = null; }
    cancelAnimationFrame(raf);
    smStage.innerHTML = '';
    SM.mediaId = mediaId;
    const m = mediaId && RS.getMedia(mediaId);
    const rt = mediaId && RS.runtime[mediaId];
    if (!m || !rt || !rt.url) {
      smName.textContent = 'Source: (no clip)';
      smStage.append(RS.h('div', { class: 'mon-empty' }, 'Double-click a clip in the Project panel to preview it here, set In/Out points, then insert it into the timeline.'));
      SM.update();
      return;
    }
    smName.textContent = 'Source: ' + m.name;
    if (m.type === 'image') {
      smStage.append(RS.h('img', { src: rt.url, class: 'mon-media' }));
    } else {
      smEl = RS.h(m.type === 'audio' ? 'audio' : 'video', { class: 'mon-media', preload: 'auto', src: rt.url });
      if (m.type === 'audio') {
        smStage.append(RS.h('div', { class: 'mon-audio' }, RS.icon('music', 'big'), m.name));
        smStage.append(smEl);
      } else smStage.append(smEl);
      smEl.addEventListener('play', () => { SM.syncBtn(); tick(); });
      smEl.addEventListener('pause', () => { SM.syncBtn(); SM.update(); });
      smEl.addEventListener('seeked', () => SM.update());
      smEl.addEventListener('loadedmetadata', () => SM.update());
    }
    RS.setActivePanel('source');
    RS.emit('show-tab', 'source');
    SM.update();
  };

  function tick() {
    SM.update();
    if (smEl && !smEl.paused) raf = requestAnimationFrame(tick);
  }

  SM.syncBtn = () => {
    smPlay.innerHTML = '';
    smPlay.append(RS.icon(smEl && !smEl.paused ? 'pause' : 'play'));
  };

  SM.update = () => {
    const d = SM.dur();
    const t = smEl ? smEl.currentTime : 0;
    const fps = RS.fps();
    smTime.textContent = RS.fmtTC(t, fps);
    const mk = (SM.mediaId && marks[SM.mediaId]) || {};
    const i = mk.in ?? 0, o = mk.out ?? d;
    smDur.textContent = d ? 'In/Out ' + RS.fmtTC(Math.max(0, o - i), fps) : '';
    const pct = (x) => (d ? (x / d) * 100 : 0) + '%';
    smHead.style.left = pct(t);
    smFill.style.width = pct(t);
    smRange.style.left = pct(i);
    smRange.style.width = d ? ((o - i) / d) * 100 + '%' : '0';
    smRange.style.display = mk.in != null || mk.out != null ? 'block' : 'none';
  };

  SM.toggle = () => {
    if (!smEl) return;
    if (S.playing) RS.engine.pause();
    if (smEl.paused) {
      const mk = marks[SM.mediaId] || {};
      if (mk.out != null && smEl.currentTime >= mk.out - 0.01) smEl.currentTime = mk.in ?? 0;
      smEl.play().catch(() => {});
    } else smEl.pause();
  };
  SM.pause = () => { if (smEl && !smEl.paused) smEl.pause(); };
  SM.step = (n) => { if (!smEl) return; smEl.pause(); smEl.currentTime = RS.clamp(smEl.currentTime + n / RS.fps(), 0, SM.dur()); };
  SM.shuttle = (dir) => {
    if (!smEl) return;
    if (dir === 0) return smEl.pause();
    if (dir < 0) { SM.step(-5); return; }
    smEl.playbackRate = smEl.paused ? 1 : Math.min(8, smEl.playbackRate * 2);
    smEl.play().catch(() => {});
  };
  SM.markIn = () => {
    if (!smEl) return;
    const mk = marks[SM.mediaId] = marks[SM.mediaId] || {};
    mk.in = smEl.currentTime;
    if (mk.out != null && mk.out <= mk.in) mk.out = null;
    SM.update();
  };
  SM.markOut = () => {
    if (!smEl) return;
    const mk = marks[SM.mediaId] = marks[SM.mediaId] || {};
    mk.out = smEl.currentTime;
    if (mk.in != null && mk.in >= mk.out) mk.in = null;
    SM.update();
  };
  SM.seek = (t) => { if (smEl) { smEl.pause(); smEl.currentTime = RS.clamp(t, 0, SM.dur()); SM.update(); } };
  SM.clearMarks = () => { if (SM.mediaId) delete marks[SM.mediaId]; SM.update(); };

  // Insert (ripple) or overwrite the source In/Out range at the timeline playhead.
  SM.edit = (insert) => {
    if (!SM.mediaId) return RS.toast('Load a clip into the Source monitor first');
    const m = RS.getMedia(SM.mediaId);
    const mk = marks[SM.mediaId] || {};
    // Destination: the lowest targeted track. Three-point editing: the sequence In point (if set) is the
    // destination; when the sequence also has an Out and the source has no Out, the sequence range sets the length.
    const kind = m.type === 'audio' ? 'audio' : 'video';
    const target = RS.tracksOf(kind).find(RS.isTargeted) || RS.tracksOf(kind)[0];
    const io = S.project.inOut || {};
    const at = io.in != null ? io.in : S.playhead;
    let out = mk.out;
    if (io.in != null && io.out != null && out == null && m.type !== 'image') out = Math.min(m.duration, (mk.in || 0) + (io.out - io.in));
    RS.commit(insert ? 'Insert' : 'Overwrite', () => {
      const made = RS.ops.placeMedia(m.id, target.id, at, { in: mk.in, out, insert });
      const end = Math.max(...made.map(RS.clipEnd));
      RS.engine.seek(end);
    });
    RS.announceMatch();
  };
})(window.RS);
