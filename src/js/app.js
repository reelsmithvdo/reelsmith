'use strict';
// App shell: panel layout, commands, keyboard shortcuts, project save/open, autosave.
(function (RS) {
  const S = RS.state;
  const AUTOSAVE_KEY = 'reelsmith.autosave.v1';
  let activePanel = 'timeline';

  RS.setActivePanel = (p) => {
    activePanel = p;
    RS.$$('.panel').forEach((el) => el.classList.toggle('active', el.dataset.panels && el.dataset.panels.split(' ').includes(p)));
  };

  // ---------------------------------------------------------------
  // Commands (menu, buttons and keyboard all route through here)
  // ---------------------------------------------------------------
  const inTextField = () => {
    const a = document.activeElement;
    return a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && !['range', 'checkbox', 'color', 'button'].includes(a.type)) || a.isContentEditable);
  };
  // Copy/paste/undo inside a text field: use the native edit actions (execCommand('paste') is blocked).
  const textEdit = (action) => {
    if (RS.native && RS.native.editNative) RS.native.editNative(action);
    else document.execCommand(action);
  };

  const C = {};
  RS.cmd = (name, arg) => {
    if (RS.exporter.busy() && name !== 'app-close-request') return;
    if (document.querySelector('.modal-back') && !['app-close-request'].includes(name)) {
      // A dialog is open: only let text editing commands through.
      if (['undo', 'redo', 'cut', 'copy', 'paste', 'selectAll'].includes(name) && inTextField()) textEdit(name);
      return;
    }
    const fn = C[name];
    if (!fn) return console.warn('Unknown command', name);
    try {
      const r = fn(arg);
      if (r && r.catch) r.catch((err) => { console.error(err); RS.toast(String(err.message || err), 'error'); });
    } catch (err) {
      console.error(err);
      RS.toast(String(err.message || err), 'error');
    }
  };

  // --- edit ---
  C.undo = () => (inTextField() ? textEdit('undo') : RS.undo());
  C.redo = () => (inTextField() ? textEdit('redo') : RS.redo());
  C.copy = () => {
    if (inTextField()) return textEdit('copy');
    const sel = RS.selectedClips();
    if (!sel.length) return;
    S.clipboard = JSON.parse(JSON.stringify(sel));
    RS.toast(`Copied ${sel.length} clip${sel.length > 1 ? 's' : ''}`);
  };
  C.cut = () => {
    if (inTextField()) return textEdit('cut');
    const sel = RS.selectedClips();
    if (!sel.length) return;
    S.clipboard = JSON.parse(JSON.stringify(sel));
    RS.commit('Cut', () => sel.forEach((c) => RS.ops.removeClip(c.id)));
  };
  C.paste = () => {
    if (inTextField()) return textEdit('paste');
    if (!S.clipboard || !S.clipboard.length) return RS.toast('Clipboard is empty');
    RS.commit('Paste', () => {
      const made = RS.ops.cloneForPaste(S.clipboard.filter((c) => !c.mediaId || RS.getMedia(c.mediaId)), S.playhead);
      S.selection = new Set(made.map((c) => c.id));
      if (made.length) RS.engine.seek(Math.max(...made.map(RS.clipEnd)));
    });
    RS.emit('selection');
  };
  C.duplicate = () => {
    const sel = RS.selectedClips();
    if (!sel.length) return;
    const end = Math.max(...sel.map(RS.clipEnd));
    RS.commit('Duplicate', () => {
      const made = RS.ops.cloneForPaste(JSON.parse(JSON.stringify(sel)), end);
      S.selection = new Set(made.map((c) => c.id));
    });
    RS.emit('selection');
  };
  C.selectAll = () => {
    if (inTextField()) return textEdit('selectAll');
    RS.select(S.project.clips.map((c) => c.id));
  };
  C.deselect = () => RS.select([]);
  C.delete = () => {
    if (S.selTransition) {
      const { clipId, side } = S.selTransition;
      RS.commit('Clear transition', () => { const c = RS.getClip(clipId); if (c) { if (side === 'in') c.tIn = null; else c.tOut = null; } });
      S.selTransition = null;
      RS.emit('selection');
      return;
    }
    if (activePanel === 'project' && S.selectedMedia.size) return RS.projectBin.deleteSelected();
    const sel = RS.selectedClips().filter((c) => !RS.trackLocked(c.trackId));
    if (!sel.length) return;
    RS.commit('Delete', () => sel.forEach((c) => RS.ops.removeClip(c.id)));
  };
  C.rippleDelete = () => {
    const sel = RS.selectedClips().filter((c) => !RS.trackLocked(c.trackId));
    if (sel.length) return RS.commit('Ripple delete', () => RS.ops.rippleDelete(sel));
    // No selection: close the gap under the playhead on V1/A1-style (any track with a gap at playhead)
    RS.toast('Select clips to ripple delete');
  };
  C.split = () => {
    const t = S.playhead;
    let targets = RS.selectedClips();
    if (!targets.length) targets = S.project.clips;
    targets = targets.filter((c) => !RS.trackLocked(c.trackId) && c.start < t && RS.clipEnd(c) > t);
    if (!targets.length) return RS.toast('No clip under the playhead');
    RS.commit('Add edit', () => RS.ops.splitClips(targets, t));
  };
  C.splitAll = () => {
    const t = S.playhead;
    const targets = S.project.clips.filter((c) => !RS.trackLocked(c.trackId) && c.start < t && RS.clipEnd(c) > t);
    if (!targets.length) return RS.toast('No clip under the playhead');
    RS.commit('Add edit to all tracks', () => RS.ops.splitClips(targets, t));
  };
  C.toggleLink = () => {
    const sel = RS.selectedClips();
    if (!sel.length) return;
    const anyLinked = sel.some((c) => c.linkId);
    RS.commit(anyLinked ? 'Unlink' : 'Link', () => {
      if (anyLinked) sel.forEach((c) => { RS.getClip(c.id).linkId = null; });
      else if (sel.length > 1) { const id = RS.uid('L'); sel.forEach((c) => { RS.getClip(c.id).linkId = id; }); }
    });
    RS.toast(anyLinked ? 'Unlinked' : sel.length > 1 ? 'Linked' : 'Select 2+ clips to link');
  };
  C.addFades = () => {
    const sel = RS.selectedClips();
    if (!sel.length) return RS.toast('Select clips first');
    RS.commit('Add fades', () => sel.forEach((c) => {
      const x = RS.getClip(c.id);
      const f = Math.min(1, x.duration / 3);
      x.props.fadeIn = f; x.props.fadeOut = f;
    }));
  };
  C.resetEffects = () => {
    const sel = RS.selectedClips();
    if (!sel.length) return;
    RS.commit('Reset effects', () => sel.forEach((c) => {
      const x = RS.getClip(c.id);
      x.props = Object.assign({}, RS.DEFAULT_PROPS);
      x.kf = {};
      x.lumetri = null;
      x.fx = [];
    }));
  };

  C.toggleEnable = () => {
    const sel = RS.selectedClips();
    if (!sel.length) return;
    const anyDisabled = sel.some((c) => c.disabled);
    RS.commit(anyDisabled ? 'Enable' : 'Disable', () => sel.forEach((c) => { RS.getClip(c.id).disabled = !anyDisabled; }));
  };
  C.scaleFit = () => RS.commit('Set to frame size', () => RS.selectedClips().filter(RS.isVisual).forEach((c) => {
    const x = RS.getClip(c.id); x.props.fill = 0; x.props.scale = 100; if (x.kf) delete x.kf.scale;
  }));
  C.scaleFill = () => RS.commit('Scale to fill', () => RS.selectedClips().filter(RS.isVisual).forEach((c) => {
    const x = RS.getClip(c.id); x.props.fill = 1; x.props.scale = 100; if (x.kf) delete x.kf.scale;
  }));
  C.renameClip = async () => {
    const sel = RS.selectedClips();
    if (!sel.length) return;
    const name = await RS.prompt('Rename Clip', 'Name', RS.clipName(sel[0]));
    if (name == null) return;
    RS.commit('Rename clip', () => sel.forEach((c) => { RS.getClip(c.id).label = name.trim() || undefined; }));
  };
  C.nudge = (frames) => {
    const sel = RS.selectedClips().filter((c) => !RS.trackLocked(c.trackId));
    if (!sel.length) return;
    RS.commit('Nudge', () => RS.ops.nudge(sel.map((c) => RS.getClip(c.id)), frames / RS.fps()));
  };

  // Nearest clip edge to the playhead among clips matching fn → {clip, side}
  function nearestEdge(fn) {
    let best = null, bd = Infinity;
    for (const c of S.project.clips) {
      if (!fn(c) || RS.trackLocked(c.trackId)) continue;
      for (const [side, t] of [['in', c.start], ['out', RS.clipEnd(c)]]) {
        const d = Math.abs(t - S.playhead);
        if (d < bd - 1e-6) { bd = d; best = { clip: c, side }; }
      }
    }
    return best;
  }
  C.applyTransition = () => {
    const vis = RS.selectedClips().filter(RS.isVisual);
    if (vis.length) {
      RS.commit('Apply Cross Dissolve', () => vis.forEach((c) => { RS.ops.setTransition(RS.getClip(c.id), 'in', 'dissolve', 1); RS.ops.setTransition(RS.getClip(c.id), 'out', 'dissolve', 1); }));
      return;
    }
    const e = nearestEdge(RS.isVisual);
    if (!e) return RS.toast('No video clip to add a transition to');
    RS.commit('Apply Cross Dissolve', () => RS.ops.setTransition(RS.getClip(e.clip.id), e.side, 'dissolve', 1));
  };
  C.applyAudioTransition = () => {
    const au = RS.selectedClips().filter((c) => c.type === 'audio');
    if (au.length) {
      RS.commit('Apply audio crossfade', () => au.forEach((c) => { RS.ops.audioTransition(RS.getClip(c.id), 'in', 1); RS.ops.audioTransition(RS.getClip(c.id), 'out', 1); }));
      return;
    }
    const e = nearestEdge((c) => c.type === 'audio');
    if (!e) return RS.toast('No audio clip to add a crossfade to');
    RS.commit('Apply audio crossfade', () => RS.ops.audioTransition(RS.getClip(e.clip.id), e.side, 1));
  };
  C.transitionDuration = async () => {
    if (!S.selTransition) return;
    const { clipId, side } = S.selTransition;
    const c = RS.getClip(clipId);
    const tr = c && (side === 'in' ? c.tIn : c.tOut);
    if (!tr) return;
    const v = await RS.prompt('Transition Duration', 'Seconds', tr.duration.toFixed(2));
    if (v == null || !(+v > 0)) return;
    RS.commit('Transition duration', () => { const x = RS.getClip(clipId); (side === 'in' ? x.tIn : x.tOut).duration = RS.clamp(+v, 2 / RS.fps(), 30); });
  };

  C.speedDuration = () => {
    const sel = RS.selectedClips();
    if (!sel.length) return RS.toast('Select a clip first');
    const fps = RS.fps();
    const base = sel.find(RS.isVisual) || sel[0];
    const speed = RS.h('input', { type: 'number', min: 10, max: 1600, step: 1, value: Math.round(base.speed * 100) });
    const dur = RS.h('input', { type: 'text', value: RS.fmtTC(base.duration, fps) });
    const ripple = RS.h('input', { type: 'checkbox' });
    const srcLen = base.duration * base.speed;
    const bound = RS.isMediaBound(base);
    speed.addEventListener('input', () => { if (bound && +speed.value > 0) dur.value = RS.fmtTC(srcLen / (+speed.value / 100), fps); });
    dur.addEventListener('change', () => { const d = RS.parseTC(dur.value, fps); if (bound && d > 0) speed.value = Math.round(srcLen / d * 100); });
    [speed, dur].forEach((x) => x.addEventListener('keydown', (e) => e.stopPropagation()));
    if (!bound) speed.disabled = true;
    const row = (l, c) => RS.h('label', { class: 'form-row' }, RS.h('span', null, l), c);
    RS.modal({
      title: 'Clip Speed / Duration',
      body: RS.h('div', { class: 'form' }, row('Speed (%)', speed), row('Duration', dur),
        RS.h('label', { class: 'form-row check' }, ripple, RS.h('span', null, 'Ripple Edit, Shifting Trailing Clips')),
        RS.h('p', { class: 'muted small' }, 'Audio pitch is preserved. Applies to the selected clips and their linked audio/video.')),
      buttons: [{ label: 'Cancel' }, {
        label: 'OK', primary: true, onClick: () => {
          const pct = RS.clamp(+speed.value || 100, 10, 1600);
          const d = RS.parseTC(dur.value, fps);
          RS.commit('Speed/Duration', () => {
            const group = RS.withLinked(sel.map((c) => RS.getClip(c.id)));
            const ids = new Set(group.map((x) => x.id));
            const oldEnds = new Map(group.map((x) => [x.id, RS.clipEnd(x)]));
            for (const x of group) {
              if (RS.isMediaBound(x)) RS.ops.setSpeed(x, pct / 100);
              else if (d > 0) x.duration = RS.frameRound(d, fps);
            }
            for (const x of group) {
              const delta = RS.clipEnd(x) - oldEnds.get(x.id);
              if (ripple.checked && Math.abs(delta) > RS.EPS) {
                for (const y of S.project.clips) if (!ids.has(y.id) && y.trackId === x.trackId && y.start >= oldEnds.get(x.id) - RS.EPS) y.start = Math.max(0, y.start + delta);
              } else RS.ops.clearRange(x.trackId, x.start, RS.clipEnd(x), ids);
            }
          });
        },
      }],
    });
  };

  // --- Tier 1 editing commands ---
  const videoUnderPlayhead = () => {
    const sel = RS.selectedClips().find((c) => c.type === 'video');
    if (sel) return sel;
    for (const tr of RS.tracksOf('video').slice().reverse()) {
      if (!RS.isTargeted(tr) && RS.tracksOf('video').some(RS.isTargeted)) continue;
      const c = S.project.clips.find((x) => x.trackId === tr.id && x.type === 'video' && S.playhead >= x.start && S.playhead < RS.clipEnd(x));
      if (c) return c;
    }
    return null;
  };
  const ioRange = () => {
    const io = S.project.inOut || {};
    const a = io.in ?? 0, b = io.out ?? RS.seqDuration();
    return io.in == null && io.out == null ? null : (b - a > 1e-3 ? [a, b] : null);
  };
  C.lift = () => { const r = ioRange(); if (!r) return RS.toast('Set In and Out points first (I / O)'); RS.commit('Lift', () => RS.ops.liftRange(r[0], r[1])); };
  C.extract = () => { const r = ioRange(); if (!r) return RS.toast('Set In and Out points first (I / O)'); RS.commit('Extract', () => RS.ops.extractRange(r[0], r[1])); RS.engine.seek(r[0]); };
  C.rippleTrimPrev = () => { let t; RS.commit('Ripple trim previous edit', () => { t = RS.ops.rippleTrimToPlayhead(-1, S.playhead); }); if (t == null) RS.toast('Put the playhead inside a clip on a targeted track'); else RS.engine.seek(t); };
  C.rippleTrimNext = () => { let t; RS.commit('Ripple trim next edit', () => { t = RS.ops.rippleTrimToPlayhead(1, S.playhead); }); if (t == null) RS.toast('Put the playhead inside a clip on a targeted track'); };
  C.matchFrame = () => {
    const c = videoUnderPlayhead();
    if (!c || !c.mediaId) return RS.toast('No video clip under the playhead');
    const mt = RS.srcTime(c, S.playhead - c.start);
    RS.sourceMonitor.load(c.mediaId);
    setTimeout(() => RS.sourceMonitor.seek(mt), 120);
  };
  C.clipGain = async () => {
    const sel = RS.selectedClips().filter((c) => c.type === 'audio' || c.type === 'nestAudio');
    if (!sel.length) return RS.toast('Select audio clips first');
    const v = await RS.prompt('Audio Gain', 'Set gain to (dB)', String(sel[0].props.gain || 0));
    if (v == null || !isFinite(+v)) return;
    RS.commit('Audio gain', () => sel.forEach((c) => { RS.getClip(c.id).props.gain = RS.clamp(+v, -40, 30); }));
  };
  C.normalizeLoudness = () => RS.loudness.dialog();
  C.frameHold = () => {
    const c = videoUnderPlayhead();
    if (!c) return RS.toast('Put the playhead over a video clip');
    if (c.hold) return RS.commit('Remove frame hold', () => { RS.getClip(c.id).hold = false; });
    RS.commit('Add frame hold', () => RS.ops.frameHold(RS.getClip(c.id), S.playhead));
  };
  C.insertHold = () => {
    const c = videoUnderPlayhead();
    if (!c) return RS.toast('Put the playhead over a video clip');
    RS.commit('Insert frame hold segment', () => RS.ops.insertHoldSegment(RS.getClip(c.id), RS.frameRound(S.playhead, RS.fps()), 2));
  };
  C.reverseClip = () => {
    const sel = RS.withLinked(RS.selectedClips()).filter(RS.isElementClip);
    if (!sel.length) return RS.toast('Select a video or audio clip');
    RS.commit('Reverse', () => RS.ops.toggleReverse(sel.map((c) => RS.getClip(c.id))));
    RS.toast(RS.getClip(sel[0].id).reverse ? 'Clip reversed (reversed sound plays in the export)' : 'Reverse removed');
  };
  C.replaceWithSource = () => {
    const c = RS.selectedClips()[0];
    const id = RS.sourceMonitor.mediaId;
    if (!c || !id) return RS.toast('Load a clip in the Source monitor and select a timeline clip to replace');
    const mk = RS.sourceMonitor.marksFor(id);
    RS.commit('Replace clip', () => RS.ops.replaceClip(RS.getClip(c.id), id, mk.in || 0));
  };
  C.addAdjustment = () => RS.commit('Add adjustment layer', () => {
    const t = RS.frameRound(S.playhead, RS.fps()), d = 5;
    const tr = RS.ops.freeVideoTrack(t, t + d, 1);
    const c = RS.makeClip({ type: 'adjust', trackId: tr.id, start: t, duration: d });
    S.project.clips.push(c);
    S.selection = new Set([c.id]);
  });
  C.addCaption = () => RS.captions.add();
  C.autoCaptions = () => RS.autoCaptions.open();
  C.toggleCaptions = () => RS.captions.setVisible(!RS.captions.visible());
  C.importSrt = () => RS.captions.importSrt();
  C.exportSrt = () => RS.captions.exportSrt();
  C.createProxies = () => RS.proxies.create([...S.selectedMedia]);
  C.toggleProxies = () => RS.proxies.toggle();

  // --- sequences, nesting, multicam ---
  const seqPlayheads = {};
  RS.openSequence = (id) => {
    if (!RS.getSequence(id)) return;
    if (S.playing) RS.engine.pause();
    if (id === S.project.activeSeq) return;
    seqPlayheads[S.project.activeSeq] = S.playhead;
    S.project.activeSeq = id;
    S.openSeqs = S.openSeqs || [];
    if (!S.openSeqs.includes(id)) S.openSeqs.push(id);
    S.selection.clear();
    S.selTransition = null;
    S.playhead = seqPlayheads[id] || 0;
    RS.emit('settings-change');
    RS.emit('selection');
    RS.emit('change', { source: 'switch' });
    RS.emit('time', S.playhead);
    RS.emit('media-change');
    updateTitle();
    setTimeout(() => RS.timeline.zoomFit(), 0);
  };
  RS.closeSequenceTab = (id) => {
    S.openSeqs = (S.openSeqs || []).filter((x) => x !== id);
    if (!S.openSeqs.length) S.openSeqs = [S.project.sequences[0].id];
    if (S.project.activeSeq === id) RS.openSequence(S.openSeqs[S.openSeqs.length - 1]);
    else RS.timeline.render();
  };
  C.newSequence = async () => {
    const name = await RS.prompt('New Sequence', 'Name', RS.nextSequenceName('Sequence'));
    if (name == null) return;
    let id;
    RS.commit('New sequence', () => {
      const q = RS.newSequence(name.trim() || RS.nextSequenceName('Sequence'), Object.assign({}, S.project.settings, { autoMatch: true }));
      S.project.sequences.push(q);
      id = q.id;
    });
    RS.emit('media-change');
    RS.openSequence(id);
  };
  C.nest = async () => {
    const sel = RS.selectedClips().filter((c) => !RS.trackLocked(c.trackId));
    if (!sel.length) return RS.toast('Select clips in the timeline to nest');
    const name = await RS.prompt('Nested Sequence Name', 'Name', RS.nextSequenceName('Nested Sequence'));
    if (name == null) return;
    RS.commit('Nest', () => { const q = RS.ops.nest(RS.withLinked(sel)); if (name.trim()) q.name = name.trim(); });
    RS.emit('media-change');
    RS.emit('selection');
  };
  C.renameSequence = async (id) => {
    const q = RS.getSequence(id || S.project.activeSeq);
    if (!q) return;
    const name = await RS.prompt('Rename Sequence', 'Name', q.name);
    if (name == null || !name.trim()) return;
    RS.commit('Rename sequence', () => { RS.getSequence(q.id).name = name.trim(); });
    RS.emit('media-change');
  };
  C.deleteSequence = async (id) => {
    const q = RS.getSequence(id);
    if (!q) return;
    if (S.project.sequences.length <= 1) return RS.toast('A project needs at least one sequence');
    const users = S.project.sequences.filter((x) => x.id !== id && x.clips.some((c) => c.seqId === id));
    const ok = await RS.confirm('Delete sequence', `Delete "${q.name}"?` + (users.length ? ` It is nested in ${users.length} other sequence(s); those clips will be removed.` : ''), 'Delete', true);
    if (!ok) return;
    if (S.project.activeSeq === id) RS.openSequence(S.project.sequences.find((x) => x.id !== id).id);
    RS.commit('Delete sequence', () => {
      for (const x of S.project.sequences) x.clips = x.clips.filter((c) => c.seqId !== id);
      S.project.sequences = S.project.sequences.filter((x) => x.id !== id);
    });
    S.openSeqs = (S.openSeqs || []).filter((x) => x !== id);
    RS.emit('media-change');
  };
  C.createMulticam = () => {
    const ids = [...S.selectedMedia].filter((id) => { const m = RS.getMedia(id); return m && (m.type === 'video' || m.type === 'image'); });
    if (ids.length < 2) return RS.toast('Select 2–9 video clips in the Project panel (⌘-click), then choose Create Multi-Camera Source Sequence');
    const mode = RS.h('select', null, RS.h('option', { value: 'audio' }, 'Audio (waveform match)'), RS.h('option', { value: 'in' }, 'In points (all start together)'));
    const place = RS.h('input', { type: 'checkbox', checked: true });
    const row = (l, c) => RS.h('label', { class: 'form-row' }, RS.h('span', null, l), c);
    RS.modal({
      title: 'Create Multi-Camera Source Sequence',
      body: RS.h('div', { class: 'form' },
        RS.h('p', { class: 'muted small' }, `${ids.length} camera angles. Camera 1 is the first selected clip; its audio is used (other angles' audio tracks start muted).`),
        row('Synchronize by', mode),
        RS.h('label', { class: 'form-row check' }, place, RS.h('span', null, 'Add to the current sequence at the playhead'))),
      buttons: [{ label: 'Cancel' }, {
        label: 'Create', primary: true, onClick: () => {
          let res;
          RS.commit('Create multicam', () => {
            res = RS.ops.createMulticam(ids, mode.value);
            if (place.checked) RS.ops.placeSequence(res.seq.id, RS.tracksOf('video')[0].id, S.playhead, {});
          });
          if (!res) return;
          RS.emit('media-change');
          RS.emit('selection');
          if (mode.value === 'audio' && !res.synced) RS.toast('Some clips had no waveform data — those angles were aligned by In point', 'warn', 6000);
          else RS.toast('Multicam sequence created. Press 1–9 to switch cameras (cuts are added while playing).', 'ok', 6000);
        },
      }],
    });
  };
  C.angle = (n) => {
    const t = S.playhead;
    const c = RS.engine.multicamClipAt(t);
    if (!c) return RS.toast('No multicam clip under the playhead');
    const inner = RS.getSequence(c.seqId);
    if (n < 1 || n > RS.tracksOf('video', inner).length) return;
    if ((c.angle || 0) === n - 1) return;
    RS.commit('Camera ' + n, () => RS.ops.switchAngle(RS.getClip(c.id), n - 1, t, S.playing && t > c.start + 1 / RS.fps()));
    RS.engine.invalidate();
  };
  C.toggleMulticamView = () => RS.program.toggleMulticam();

  // --- markers & sequence in/out ---
  const MARKER_COLORS = [['#5ad17a', 'Green'], ['#ff5a5f', 'Red'], ['#a77bff', 'Purple'], ['#f0a83a', 'Orange'], ['#ffd23f', 'Yellow'], ['#4fc3f7', 'Blue'], ['#40e0d0', 'Cyan'], ['#ffffff', 'White']];
  C.addMarker = (t) => {
    if (activePanel === 'source') return RS.toast('Markers are added to the sequence');
    t = RS.frameRound(typeof t === 'number' ? t : S.playhead, RS.fps());
    const hit = (S.project.markers || []).find((m) => Math.abs(m.t - t) < 0.5 / RS.fps());
    if (hit) return C.editMarker(hit.id);
    RS.commit('Add marker', () => { S.project.markers = S.project.markers || []; S.project.markers.push({ id: RS.uid('mk'), t, name: '', color: MARKER_COLORS[0][0] }); });
  };
  C.editMarker = (id) => {
    const mk = (S.project.markers || []).find((m) => m.id === id);
    if (!mk) return;
    const name = RS.h('input', { type: 'text', value: mk.name || '' });
    const color = RS.h('select', null, MARKER_COLORS.map(([v, l]) => RS.h('option', { value: v, selected: v === mk.color }, l)));
    name.addEventListener('keydown', (e) => e.stopPropagation());
    const row = (l, c) => RS.h('label', { class: 'form-row' }, RS.h('span', null, l), c);
    RS.modal({
      title: 'Marker @ ' + RS.fmtTC(mk.t, RS.fps()),
      body: RS.h('div', { class: 'form' }, row('Name', name), row('Color', color)),
      buttons: [
        { label: 'Delete', danger: true, onClick: () => RS.commit('Delete marker', () => { S.project.markers = S.project.markers.filter((m) => m.id !== id); }) },
        { label: 'Cancel' },
        { label: 'OK', primary: true, onClick: () => RS.commit('Edit marker', () => { const m = S.project.markers.find((x) => x.id === id); m.name = name.value; m.color = color.value; }) },
      ],
    });
  };
  C.nextMarker = () => { const m = (S.project.markers || []).map((x) => x.t).sort((a, b) => a - b).find((t) => t > S.playhead + 1e-3); if (m != null) RS.engine.seek(m); };
  C.prevMarker = () => { const m = (S.project.markers || []).map((x) => x.t).sort((a, b) => a - b).filter((t) => t < S.playhead - 1e-3).pop(); if (m != null) RS.engine.seek(m); };
  C.clearMarkers = () => RS.commit('Clear markers', () => { S.project.markers = []; });
  C.clearInOut = () => {
    if (activePanel === 'source') return RS.sourceMonitor.clearMarks();
    RS.commit('Clear In/Out', () => { S.project.inOut = { in: null, out: null }; });
  };
  const setSeqMark = (which) => {
    const fps = RS.fps();
    const t = RS.frameRound(S.playhead, fps);
    const end = RS.seqDuration();
    // Never create an empty range: an Out at the very start or an In at the very end means nothing.
    if (which === 'out' && t < 1 / fps) return RS.toast('Move the playhead later before marking Out (O)');
    if (which === 'in' && end > 0 && t > end - 1 / fps) return RS.toast('Move the playhead earlier before marking In (I)');
    RS.commit(which === 'in' ? 'Mark In' : 'Mark Out', () => {
      const io = S.project.inOut = S.project.inOut || { in: null, out: null };
      io[which] = t;
      if (io.in != null && io.out != null && io.out <= io.in) io[which === 'in' ? 'out' : 'in'] = null;
    });
    const io = S.project.inOut;
    RS.toast(`${which === 'in' ? 'In' : 'Out'} point set at ${RS.fmtTC(t, fps)}` + (io.in != null && io.out != null ? ` — range ${RS.fmtTC(io.out - io.in, fps)}` : ''), 'ok', 2200);
  };

  // --- sequence / generators ---
  C.addTitle = () => RS.commit('Add title', () => {
    const t = S.playhead, d = 5;
    const tr = RS.ops.freeVideoTrack(t, t + d, 1);
    const c = RS.makeClip({ type: 'text', trackId: tr.id, start: RS.frameRound(t, RS.fps()), duration: d, props: { fadeIn: 0.3, fadeOut: 0.3 } });
    S.project.clips.push(c);
    S.selection = new Set([c.id]);
  });
  C.addMatte = () => RS.commit('Add color matte', () => {
    const t = S.playhead, d = 5;
    const tr = RS.ops.freeVideoTrack(t, t + d, 0);
    const c = RS.makeClip({ type: 'solid', trackId: tr.id, start: RS.frameRound(t, RS.fps()), duration: d });
    S.project.clips.push(c);
    S.selection = new Set([c.id]);
  });
  C.addVideoTrack = () => RS.commit('Add video track', () => RS.ops.addTrack('video'));
  C.addAudioTrack = () => RS.commit('Add audio track', () => RS.ops.addTrack('audio'));
  C.sequenceSettings = () => settingsDialog(false);

  // --- transport ---
  C.playPause = () => (activePanel === 'source' ? RS.sourceMonitor.toggle() : (RS.sourceMonitor.pause(), RS.engine.toggle()));
  C.goStart = () => RS.engine.seek(0);
  C.goEnd = () => RS.engine.seek(RS.seqDuration());
  C.prevFrame = (n = 1) => (activePanel === 'source' ? RS.sourceMonitor.step(-n) : RS.engine.step(-n));
  C.nextFrame = (n = 1) => (activePanel === 'source' ? RS.sourceMonitor.step(n) : RS.engine.step(n));
  const editPoints = () => {
    const pts = new Set([0]);
    for (const c of S.project.clips) { pts.add(+c.start.toFixed(5)); pts.add(+RS.clipEnd(c).toFixed(5)); }
    return [...pts].sort((a, b) => a - b);
  };
  C.prevEdit = () => { const t = S.playhead - 1e-3; const p = editPoints().filter((x) => x < t).pop(); RS.engine.seek(p ?? 0); };
  C.nextEdit = () => { const t = S.playhead + 1e-3; const p = editPoints().find((x) => x > t); if (p != null) RS.engine.seek(p); };
  // J/K/L shuttle
  C.shuttle = (dir) => {
    if (activePanel === 'source') return RS.sourceMonitor.shuttle(dir);
    const E = RS.engine;
    if (dir === 0) return E.pause();
    if (dir > 0) {
      const r = S.playing && E.rate > 0 ? Math.min(8, E.rate * 2) : 1;
      E.play(r);
    } else {
      // Reverse play is approximated by fast frame stepping.
      RS.engine.pause();
      reverseShuttle();
    }
  };
  let revTimer = null;
  function reverseShuttle() {
    clearInterval(revTimer);
    revTimer = setInterval(() => {
      if (S.playing || S.playhead <= 0) { clearInterval(revTimer); revTimer = null; return; }
      RS.engine.seek(S.playhead - 2 / RS.fps());
    }, 1000 / 15);
  }
  const stopReverse = () => { if (revTimer) { clearInterval(revTimer); revTimer = null; } };

  // --- view ---
  C.zoomIn = () => RS.timeline.zoomBy(1.5);
  C.zoomOut = () => RS.timeline.zoomBy(1 / 1.5);
  C.zoomFit = () => RS.timeline.zoomFit();
  C.toolSelect = () => RS.timeline.setTool('select');
  C.toolRazor = () => RS.timeline.setTool('razor');
  C.toggleSnap = () => RS.timeline.toggleSnap();
  C.markIn = () => (activePanel === 'source' ? RS.sourceMonitor.markIn() : setSeqMark('in'));
  C.markOut = () => (activePanel === 'source' ? RS.sourceMonitor.markOut() : setSeqMark('out'));
  C.goIn = () => { const io = S.project.inOut || {}; if (io.in != null) RS.engine.seek(io.in); };
  C.goOut = () => { const io = S.project.inOut || {}; if (io.out != null) RS.engine.seek(io.out); };
  C.tool = (id) => RS.timeline.setTool(id);
  C.insertEdit = () => RS.sourceMonitor.edit(true);
  C.overwriteEdit = () => RS.sourceMonitor.edit(false);
  C.shortcuts = () => RS.help.open('shortcuts');
  C.help = (id) => RS.help.open(typeof id === 'string' ? id : undefined);
  C.helpFirstEdit = () => RS.help.open('first-edit');
  C.helpFaq = () => RS.help.open('faq');
  C.about = () => RS.modal({
    title: 'About Reelsmith',
    body: RS.h('div', { class: 'about' }, RS.h('img', { src: 'assets/icon-128.png', width: 96, height: 96, alt: '' }), RS.h('p', null, 'Reelsmith 1.0 — a non-linear video editor.'), RS.h('p', { class: 'muted small' }, 'Original software. Multi-track editing, keyframes, titles, color, audio mixing and H.264 export.')),
  });

  // --- files ---
  C.import = () => RS.media.importDialog();
  C.export = () => RS.exporter.dialog();
  C.new = async () => {
    if (!(await confirmDiscard())) return;
    settingsDialog(true);
  };
  C.open = async () => {
    if (RS.web) return RS.web.home(); // recent projects + "Open Project File"
    if (!(await confirmDiscard())) return;
    if (!RS.native) {
      const inp = RS.h('input', { type: 'file', accept: '.rsproj,.json' });
      inp.onchange = async () => { if (inp.files[0]) await loadProjectText(await inp.files[0].text(), null); };
      inp.click();
      return;
    }
    const r = await RS.native.openProject();
    if (r) await loadProjectText(r.text, r.path);
  };
  // Browser edition only (RS.web is undefined in the desktop app).
  C.home = () => RS.web && RS.web.home();
  C.openProjectFile = async () => { if (RS.web && (await confirmDiscard())) RS.web.openProjectFile(); };
  C.downloadProject = () => RS.web && RS.web.downloadProject();
  C.reportBug = () => RS.web && RS.web.feedback('bug');
  C.requestFeature = () => RS.web && RS.web.feedback('feature');
  C.fullscreen = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); };
  C.removeCaptionEngine = () => RS.autoCaptions.removeEngine && RS.autoCaptions.removeEngine();
  C.save = () => saveProject(false);
  C.saveAs = () => saveProject(true);

  C['app-close-request'] = async () => {
    if (RS.exporter.busy()) {
      const ok = await RS.confirm('Export in progress', 'Quit and abandon the export?', 'Quit', true);
      if (!ok) return;
    } else if (!(await confirmDiscard())) return;
    try { localStorage.removeItem(AUTOSAVE_KEY); } catch { /* ignore */ }
    if (RS.native) RS.native.closeOk();
  };

  // ---------------------------------------------------------------
  // Save / load
  // ---------------------------------------------------------------
  const serialize = () => JSON.stringify(Object.assign({ app: 'Reelsmith', version: 2, savedAt: new Date().toISOString(), activeSeq: S.project.activeSeq }, JSON.parse(RS.snapshot())), null, 1);

  async function saveProject(saveAs) {
    if (RS.web) {
      // Browser: projects live in this browser's storage (File › Download Project File makes a copy on disk).
      let id;
      try { id = await RS.web.saveProject(serialize(), saveAs); } catch (err) { RS.toast('Could not save in this browser: ' + err.message, 'error', 7000); return false; }
      S.filePath = 'browser:' + id;
      RS.markDirty(false);
      updateTitle();
      RS.toast(saveAs ? 'Saved a copy in this browser' : 'Saved in this browser', 'ok');
      return true;
    }
    if (!RS.native) {
      const blob = new Blob([serialize()], { type: 'application/json' });
      const a = RS.h('a', { href: URL.createObjectURL(blob), download: (S.project.name || 'project') + '.rsproj' });
      a.click();
      RS.markDirty(false);
      return true;
    }
    if (S.project.media.some((m) => !m.path)) RS.toast('Some media has no file path and will need relinking when reopened', 'warn', 5000);
    const p = await RS.native.saveProject(serialize(), saveAs ? null : S.filePath, S.project.name);
    if (!p) return false;
    S.filePath = p;
    const base = p.split('/').pop().replace(/\.rsproj$/i, '');
    if (saveAs || S.project.name === 'Untitled Project') S.project.name = base;
    RS.markDirty(false);
    updateTitle();
    RS.toast('Saved ' + p.split('/').pop(), 'ok');
    return true;
  }

  async function confirmDiscard() {
    if (!S.dirty) return true;
    const r = await RS.askSave(`Save changes to "${S.project.name}" before continuing?`);
    if (r === 'cancel') return false;
    if (r === 'save') return await saveProject(false);
    return true;
  }

  // Accepts current multi-sequence projects and older single-sequence files.
  function sanitizeSequence(src, fallbackName) {
    const seq = RS.newSequence(src.name || fallbackName, src.settings, 0, 0);
    if (src.id) seq.id = src.id;
    if (src.multicam) seq.multicam = true;
    seq.tracks = (Array.isArray(src.tracks) ? src.tracks : []).filter((t) => t && t.id && (t.kind === 'video' || t.kind === 'audio' || t.kind === 'caption'));
    if (src.captionStyle) seq.captionStyle = src.captionStyle;
    if (src.masterDb) seq.masterDb = src.masterDb;
    if (!seq.tracks.some((t) => t.kind === 'video')) seq.tracks.unshift({ id: 'V1', kind: 'video', name: 'V1' });
    if (!seq.tracks.some((t) => t.kind === 'audio')) seq.tracks.push({ id: 'A1', kind: 'audio', name: 'A1' });
    const order = { caption: 0, video: 1, audio: 2 };
    seq.tracks.sort((a, b) => order[a.kind] - order[b.kind]);
    const trackIds = new Set(seq.tracks.map((t) => t.id));
    seq.markers = Array.isArray(src.markers) ? src.markers.filter((m) => m && isFinite(m.t)) : [];
    seq.inOut = src.inOut && typeof src.inOut === 'object' ? { in: src.inOut.in ?? null, out: src.inOut.out ?? null } : { in: null, out: null };
    seq.clips = (Array.isArray(src.clips) ? src.clips : []).filter((c) => c && c.id && trackIds.has(c.trackId) && c.duration > 0).map((c) => {
      const props = Object.assign({}, RS.DEFAULT_PROPS, c.props || {});
      const out = Object.assign({}, c, { props, kf: c.kf || {}, speed: c.speed || 1, in: c.in || 0 });
      if (out.type === 'text') out.text = Object.assign({}, RS.DEFAULT_TEXT, c.text || {});
      if (out.type === 'shape') out.shape = RS.makeClip({ type: 'shape', shape: c.shape }).shape;
      return out;
    });
    return seq;
  }

  function validateProject(d) {
    if (!d || typeof d !== 'object' || !Array.isArray(d.media)) throw new Error('This is not a Reelsmith project file');
    const fresh = RS.newProject();
    fresh.name = d.name || 'Untitled Project';
    fresh.media = d.media.filter((m) => m && m.id && m.type);
    if (Array.isArray(d.sequences) && d.sequences.length) {
      fresh.sequences = d.sequences.map((q, i) => sanitizeSequence(q, 'Sequence ' + String(i + 1).padStart(2, '0')));
      fresh.activeSeq = fresh.sequences.some((q) => q.id === d.activeSeq) ? d.activeSeq : fresh.sequences[0].id;
    } else if (Array.isArray(d.clips) && Array.isArray(d.tracks) && d.settings) {
      fresh.sequences = [sanitizeSequence(d, 'Sequence 01')]; // version 1 file
      fresh.activeSeq = fresh.sequences[0].id;
    } else throw new Error('This is not a Reelsmith project file');
    // drop nests that point at missing sequences
    const ids = new Set(fresh.sequences.map((q) => q.id));
    for (const q of fresh.sequences) q.clips = q.clips.filter((c) => !(c.type === 'nest' || c.type === 'nestAudio') || ids.has(c.seqId));
    return fresh;
  }

  async function loadProjectText(text, path) {
    let proj;
    try { proj = validateProject(JSON.parse(text)); } catch (err) { RS.toast('Cannot open project: ' + err.message, 'error', 6000); return false; }
    setProject(proj, path);
    await RS.media.hydrate();
    const offline = S.project.media.filter((m) => RS.runtime[m.id] && RS.runtime[m.id].offline);
    if (offline.length) RS.toast(`${offline.length} media file(s) are offline — double-click them in the Project panel to relink`, 'warn', 7000);
    return true;
  }

  function setProject(proj, path) {
    if (S.playing) RS.engine.pause();
    RS.engine.releaseAll();
    S.project = proj;
    S.openSeqs = [proj.activeSeq];
    S.filePath = path || null;
    S.selection.clear();
    S.selectedMedia.clear();
    S.playhead = 0;
    RS.clearHistory();
    RS.markDirty(false);
    RS.sourceMonitor.load(null);
    RS.emit('media-change');
    RS.emit('settings-change');
    RS.emit('selection');
    RS.emit('change', { source: 'load' });
    RS.emit('time', 0);
    updateTitle();
    setTimeout(() => RS.timeline.zoomFit(), 50);
  }

  function updateTitle() {
    const t = `${S.project.name}${S.dirty ? ' •' : ''} — Reelsmith`;
    // Website: keep the descriptive page title (search results, bookmarks) until real work starts.
    document.title = RS.web && !S.dirty && S.project.name === 'Untitled Project' && !S.project.media.length ? 'Reelsmith — Free Online Video Editor' : t;
    const n = RS.$('#proj-name');
    if (n && document.activeElement !== n) n.value = S.project.name;
    if (RS.native) { RS.native.setTitle(t); RS.native.setEdited(S.dirty); }
  }

  // Autosave to local storage so a crash never loses work.
  const autosave = RS.debounce(() => {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ filePath: S.filePath, project: serialize(), dirty: !!S.dirty }));
    } catch { /* storage full or unavailable */ }
  }, 1500);

  async function maybeRestore() {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(AUTOSAVE_KEY) || 'null'); } catch { saved = null; }
    if (!saved || !saved.project) return false;
    let d;
    try { d = JSON.parse(saved.project); } catch { return false; }
    if (!d.clips || (!d.clips.length && !d.media.length)) return false;
    const ok = await RS.confirm('Recover project', `Reelsmith found unsaved work from your last session ("${d.name}"). Restore it?`, 'Restore');
    if (!ok) { try { localStorage.removeItem(AUTOSAVE_KEY); } catch { /* ignore */ } return false; }
    const loaded = await loadProjectText(saved.project, saved.filePath || null);
    if (loaded) RS.markDirty(true);
    return loaded;
  }

  // ---------------------------------------------------------------
  // Dialogs
  // ---------------------------------------------------------------
  const PRESETS = [
    { label: 'HD 1080p (1920×1080)', w: 1920, h: 1080 },
    { label: '4K UHD (3840×2160)', w: 3840, h: 2160 },
    { label: 'HD 720p (1280×720)', w: 1280, h: 720 },
    { label: 'Vertical 9:16 (1080×1920)', w: 1080, h: 1920 },
    { label: 'Square 1:1 (1080×1080)', w: 1080, h: 1080 },
    { label: 'Portrait 4:5 (1080×1350)', w: 1080, h: 1350 },
    { label: 'Custom', w: 0, h: 0 },
  ];

  function settingsDialog(isNew) {
    const cur = S.project.settings;
    const name = RS.h('input', { type: 'text', value: isNew ? 'Untitled Project' : S.project.name });
    const preset = RS.h('select', null, PRESETS.map((p, i) => RS.h('option', { value: i }, p.label)));
    const w = RS.h('input', { type: 'number', min: 16, max: 7680, step: 2, value: cur.width });
    const h = RS.h('input', { type: 'number', min: 16, max: 4320, step: 2, value: cur.height });
    const fps = RS.h('select', null, [23.976, 24, 25, 29.97, 30, 50, 59.94, 60].map((f) => RS.h('option', { value: f, selected: Math.abs(f - cur.fps) < 0.01 }, f + ' fps')));
    const bg = RS.h('input', { type: 'color', value: cur.bg || '#000000' });
    const auto = RS.h('input', { type: 'checkbox', checked: isNew ? true : !!cur.autoMatch && !S.project.clips.length });
    const idx = PRESETS.findIndex((p) => p.w === cur.width && p.h === cur.height);
    preset.value = idx >= 0 ? idx : PRESETS.length - 1;
    preset.addEventListener('change', () => { const p = PRESETS[+preset.value]; if (p.w) { w.value = p.w; h.value = p.h; } });
    const row = (l, c) => RS.h('label', { class: 'form-row' }, RS.h('span', null, l), c);
    RS.modal({
      title: isNew ? 'New Project' : 'Sequence Settings',
      body: RS.h('div', { class: 'form' }, row('Name', name), row('Frame size', preset),
        RS.h('div', { class: 'form-row' }, RS.h('span', null, 'Width × Height'), RS.h('div', { class: 'inline' }, w, '×', h)),
        row('Frame rate', fps), row('Background', bg),
        RS.h('label', { class: 'form-row check' }, auto, RS.h('span', null, 'Match frame size to the first video clip (9:16, 16:9, 1:1 … chosen automatically)')),
        !isNew && S.project.clips.length ? RS.h('p', { class: 'muted small' }, 'Changing the frame size keeps clip positions relative to the frame centre.') : null),
      buttons: [{ label: 'Cancel' }, {
        label: isNew ? 'Create' : 'Apply', primary: true, onClick: () => {
          const settings = {
            width: Math.round(RS.clamp(+w.value || 1920, 16, 7680) / 2) * 2,
            height: Math.round(RS.clamp(+h.value || 1080, 16, 4320) / 2) * 2,
            fps: +fps.value, bg: bg.value, autoMatch: auto.checked,
          };
          if (isNew) {
            const p = RS.newProject(settings);
            p.name = name.value.trim() || 'Untitled Project';
            setProject(p, null);
          } else {
            RS.commit('Sequence settings', () => {
              Object.assign(S.project.settings, settings);
              S.project.name = name.value.trim() || S.project.name;
            });
            RS.emit('settings-change');
            updateTitle();
          }
        },
      }],
    });
  }

  const SHORTCUTS = [
    ['Playback', [['Space', 'Play / pause'], ['J / K / L', 'Shuttle reverse / stop / forward (press L repeatedly for faster)'], ['← / →', 'Step one frame (Shift = 5 frames)'], ['↑ / ↓', 'Previous / next edit point'], ['Home / End', 'Go to start / end']]],
    ['Tools', [['V', 'Selection'], ['A / ⇧A', 'Track Select Forward / Backward'], ['B', 'Ripple Edit'], ['N', 'Rolling Edit'], ['R', 'Rate Stretch'], ['C', 'Razor (⇧-click: all tracks)'], ['Y / U', 'Slip / Slide'], ['H / Z', 'Hand / Zoom (Alt-click zoom out)'], ['T', 'Type — click in the Program monitor'], ['P', 'Pen — click points on a clip to draw a mask (Enter closes)'], ['S', 'Toggle snapping'], ['Alt + click', 'Select one side of a linked clip'], ['Alt + drag', 'Duplicate clips']]],
    ['Editing', [['⌘K', 'Split (add edit) at playhead'], ['⇧⌘K', 'Split all tracks at playhead'], ['Delete', 'Delete selected clips / transition'], ['⇧Delete', 'Ripple delete (close the gap)'], ['⌘C / ⌘X / ⌘V', 'Copy / cut / paste at playhead'], ['⌘L', 'Link / unlink'], ['⌘Z / ⇧⌘Z', 'Undo / redo'], ['⌘T', 'New title']]],
    ['Markers & In/Out', [['M', 'Add marker (again to edit)'], ['⇧M', 'Next marker'], ['I / O', 'Sequence In / Out (Source monitor when it is active)'], ['⇧I / ⇧O', 'Go to In / Out'], ['⌥X', 'Clear In and Out']]],
    ['Sequences & Multicam', [['Right-click → Nest…', 'Nest selected clips into a new sequence'], ['Double-click nest', 'Open the nested sequence (tabs above the timeline)'], ['1 – 9', 'Switch multicam angle (cuts while playing)'], ['Program ▸ Multi-Camera', 'Show all angles; click one to cut']]],
    ['Editing (Tier 1)', [[';', 'Lift (remove In–Out, leave gap)'], ["'", 'Extract (remove In–Out, close gap)'], ['Q / W', 'Ripple trim previous / next edit to playhead'], ['F', 'Match frame'], ['G', 'Audio gain'], ['Alt + drop', 'Replace clip']]],
    ['Clips', [['⌘D / ⇧⌘D', 'Apply video / audio transition'], ['⌘R', 'Speed / Duration'], ['⇧E', 'Enable / disable'], ['⌥← / ⌥→', 'Nudge one frame (⇧ = 5)'], ['Right-click', 'Clip, gap, transition and track menus']]],
    ['Source monitor', [['I / O', 'Mark in / out'], [', (comma)', 'Insert at playhead'], ['. (period)', 'Overwrite at playhead'], ['⌘ while dropping', 'Insert (ripple) instead of overwrite']]],
    ['Timeline view', [['= / -', 'Zoom in / out'], ['\\', 'Fit sequence (turns Auto-fit back on)'], ['⌘ + scroll', 'Zoom around pointer']]],
    ['Project', [['⌘N / ⌘O / ⌘S', 'New / open / save'], ['⌘I', 'Import media'], ['⌘M', 'Export video']]],
  ];
  function shortcutsDialog() {
    RS.modal({
      title: 'Keyboard Shortcuts', wide: true,
      body: RS.h('div', { class: 'shortcuts' }, SHORTCUTS.map(([g, list]) => RS.h('div', { class: 'sc-group' },
        RS.h('h4', null, g), list.map(([k, d]) => RS.h('div', { class: 'sc-row' }, RS.h('kbd', null, k), RS.h('span', null, d)))))),
    });
  }

  // ---------------------------------------------------------------
  // Keyboard
  // ---------------------------------------------------------------
  function onKey(e) {
    if (document.querySelector('.modal-back') || RS.help.isOpen()) return;
    const mod = e.metaKey || e.ctrlKey;
    if (inTextField()) return;
    if (e.target && e.target.tagName === 'SELECT') return;
    const k = e.key;
    // In the desktop app these come from the native menu accelerators instead.
    if (RS.web && RS.web.isHomeOpen() && !mod) return;
    if (mod && !RS.native) {
      const map = { z: e.shiftKey ? 'redo' : 'undo', y: 'redo', c: 'copy', x: 'cut', v: 'paste', d: e.shiftKey ? 'applyAudioTransition' : 'applyTransition', a: e.shiftKey ? 'deselect' : 'selectAll', k: e.shiftKey ? 'splitAll' : 'split', s: e.shiftKey ? 'saveAs' : 'save', o: 'open', i: 'import', m: 'export', t: 'addTitle', l: 'toggleLink', r: 'speedDuration' };
      const c = map[k.toLowerCase()];
      if (c) { e.preventDefault(); RS.cmd(c); }
      return;
    }
    if (mod) return;
    let handled = true;
    if (k !== 'j' && k !== 'J') stopReverse();
    if ((k === 'Enter' || k === 'Escape') && RS.program.penActive() && RS.program.penKey(k)) { e.preventDefault(); return; }
    if (e.altKey && (k === 'ArrowLeft' || k === 'ArrowRight')) { e.preventDefault(); RS.cmd('nudge', (k === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 5 : 1)); return; }
    if (e.altKey && (e.code === 'KeyX')) { e.preventDefault(); RS.cmd('clearInOut'); return; }
    if (e.shiftKey && !e.altKey) {
      const sk = { KeyE: 'toggleEnable', KeyM: 'nextMarker', KeyI: 'goIn', KeyO: 'goOut', Digit0: 'toggleMulticamView' }[e.code];
      if (sk) { e.preventDefault(); RS.cmd(sk); return; }
      if (e.code === 'KeyA') { e.preventDefault(); RS.cmd('tool', 'trackBack'); return; }
    }
    if (!e.shiftKey && !e.altKey && /^[1-9]$/.test(k)) { e.preventDefault(); RS.cmd('angle', +k); return; }
    const t1 = { ';': 'lift', "'": 'extract', q: 'rippleTrimPrev', w: 'rippleTrimNext', f: 'matchFrame', g: 'clipGain' }[k];
    if (t1 && !e.shiftKey && !e.altKey) { e.preventDefault(); RS.cmd(t1); return; }
    const tools = { v: 'select', a: 'trackFwd', b: 'ripple', n: 'rolling', r: 'rate', c: 'razor', y: 'slip', u: 'slide', h: 'hand', z: 'zoom', t: 'type', p: 'pen' };
    if (!e.shiftKey && !e.altKey && tools[k]) { e.preventDefault(); RS.cmd('tool', tools[k]); return; }
    switch (k) {
      case ' ': RS.cmd('playPause'); break;
      case 'ArrowLeft': RS.cmd('prevFrame', e.shiftKey ? 5 : 1); break;
      case 'ArrowRight': RS.cmd('nextFrame', e.shiftKey ? 5 : 1); break;
      case 'm': RS.cmd('addMarker'); break;
      case 'ArrowUp': RS.cmd('prevEdit'); break;
      case 'ArrowDown': RS.cmd('nextEdit'); break;
      case 'Home': RS.cmd('goStart'); break;
      case 'End': RS.cmd('goEnd'); break;
      case 'Delete': case 'Backspace': RS.cmd(e.shiftKey || e.altKey ? 'rippleDelete' : 'delete'); break;
      case 's': case 'S': RS.cmd('toggleSnap'); break;
      case 'j': case 'J': RS.cmd('shuttle', -1); break;
      case 'k': case 'K': RS.cmd('shuttle', 0); break;
      case 'l': case 'L': RS.cmd('shuttle', 1); break;
      case 'i': case 'I': RS.cmd('markIn'); break;
      case 'o': case 'O': RS.cmd('markOut'); break;
      case ',': RS.cmd('insertEdit'); break;
      case '.': RS.cmd('overwriteEdit'); break;
      case '=': case '+': RS.cmd('zoomIn'); break;
      case '-': case '_': RS.cmd('zoomOut'); break;
      case '\\': RS.cmd('zoomFit'); break;
      case 'Escape': if (S.selTransition) { S.selTransition = null; RS.emit('selection'); } RS.cmd('deselect'); break;
      case '?': RS.cmd('shortcuts'); break;
      case 'F1': RS.cmd('help'); break;
      default: handled = false;
    }
    if (handled) e.preventDefault();
  }

  // ---------------------------------------------------------------
  // Layout: tabs + resizable splitters
  // ---------------------------------------------------------------
  function setupTabs() {
    RS.$$('.panel[data-tabs]').forEach((panel) => {
      const tabs = RS.$$('.tab', panel);
      const show = (name) => {
        tabs.forEach((t) => t.classList.toggle('on', t.dataset.tab === name));
        RS.$$('.tab-body', panel).forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
      };
      tabs.forEach((t) => t.addEventListener('click', () => show(t.dataset.tab)));
      RS.on('show-tab', (name) => { if (tabs.some((t) => t.dataset.tab === name)) show(name); });
      RS.on('selection', () => { if (tabs.some((t) => t.dataset.tab === 'effectControls') && S.selection.size) show('effectControls'); });
    });
  }

  function setupSplitters() {
    const ws = RS.$('#workspace');
    let col = 0.42, row = 0.52;
    try {
      const saved = JSON.parse(localStorage.getItem('reelsmith.layout') || 'null');
      if (saved) { col = saved.col; row = saved.row; }
    } catch { /* ignore */ }
    const apply = () => {
      ws.style.gridTemplateColumns = `${(col * 100).toFixed(2)}% 5px 1fr`;
      ws.style.gridTemplateRows = `${(row * 100).toFixed(2)}% 5px 1fr`;
    };
    apply();
    const drag = (el, axis) => el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.classList.add('drag');
      const r = ws.getBoundingClientRect();
      const mv = (ev) => {
        if (axis === 'x') col = RS.clamp((ev.clientX - r.left) / r.width, 0.2, 0.7);
        else row = RS.clamp((ev.clientY - r.top) / r.height, 0.25, 0.75);
        apply();
      };
      const up = () => {
        el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.classList.remove('drag');
        try { localStorage.setItem('reelsmith.layout', JSON.stringify({ col, row })); } catch { /* ignore */ }
      };
      el.addEventListener('pointermove', mv);
      el.addEventListener('pointerup', up);
    });
    drag(RS.$('#split-v1'), 'x');
    drag(RS.$('#split-v2'), 'x');
    drag(RS.$('#split-h'), 'y');
  }

  function setupTopbar() {
    const nameInp = RS.$('#proj-name');
    nameInp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') nameInp.blur(); });
    nameInp.addEventListener('change', () => {
      const v = nameInp.value.trim();
      if (v && v !== S.project.name) RS.commit('Rename project', () => { S.project.name = v; });
      updateTitle();
    });
    const bar = RS.$('#topbar-actions');
    const undoB = RS.iconBtn('undo', 'Undo (⌘Z)', () => RS.cmd('undo'));
    const redoB = RS.iconBtn('redo', 'Redo (⇧⌘Z)', () => RS.cmd('redo'));
    bar.append(undoB, redoB,
      RS.iconBtn('settings', 'Sequence settings', () => RS.cmd('sequenceSettings')),
      RS.iconBtn('help', 'Help Center (F1)', () => RS.cmd('help')),
      RS.h('button', { class: 'btn', onclick: () => RS.cmd('save') }, 'Save'),
      RS.h('button', { class: 'btn primary', onclick: () => RS.cmd('export') }, RS.icon('export'), 'Export'));
    RS.on('history', () => { undoB.disabled = !RS.canUndo(); redoB.disabled = !RS.canRedo(); });
    undoB.disabled = redoB.disabled = true;
  }

  function setupStatus() {
    const st = RS.$('#status-msg'), info = RS.$('#status-info');
    RS.on('status', (m) => { st.textContent = m || ''; });
    const upd = () => {
      const s = S.project.settings;
      info.textContent = `${s.width}×${s.height} · ${s.fps} fps · ${S.project.clips.length} clips · ${S.dirty ? 'Unsaved changes' : 'All changes saved'}`;
    };
    RS.on('change', upd);
    RS.on('dirty', () => { upd(); updateTitle(); });
    RS.on('settings-change', upd);
    upd();
  }

  // ---------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------
  async function boot() {
    S.project = RS.newProject();
    setupTabs();
    setupSplitters();
    setupTopbar();
    RS.program.init(RS.$('#program'));
    RS.sourceMonitor.init(RS.$('#source'));
    RS.inspector.init(RS.$('#effect-controls'));
    RS.projectBin.init(RS.$('#project'));
    RS.effects.init(RS.$('#effects'));
    RS.scopes.init(RS.$('#scopes'));
    RS.mixer.init(RS.$('#mixer'));
    RS.captions.init(RS.$('#captions'));
    RS.library.init(RS.$('#library'));
    RS.timeline.init(RS.$('#timeline'));
    setupStatus();
    RS.on('change', (o) => { if (!o || o.source !== 'thumb') autosave(); });
    RS.on('dirty', autosave);
    document.addEventListener('keydown', onKey);
    // Prevent the window from navigating when files are dropped outside drop zones.
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());
    window.addEventListener('beforeunload', (e) => { if (!RS.native && S.dirty) { e.preventDefault(); e.returnValue = ''; } });
    if (RS.native) RS.native.onMenu((cmd) => RS.cmd(cmd));
    RS.setActivePanel('timeline');
    updateTitle();
    RS.emit('history');
    if (RS.web) RS.web.boot(); // start screen offers recovery of unsaved work
    else if (!window.__RS_TEST__) await maybeRestore();
  }

  RS.announceMatch = () => {
    const m = RS.matchedSequence;
    if (!m) return;
    RS.matchedSequence = null;
    RS.toast(`Sequence set to ${m.w}×${m.h} to match "${m.name}"`, 'ok', 4500);
    updateTitle();
  };
  RS.on('settings-change', () => { if (RS.matchedSequence) setTimeout(RS.announceMatch, 0); });

  RS.app = { loadProjectText, setProject, serialize, validateProject, AUTOSAVE_KEY };
  window.addEventListener('DOMContentLoaded', () => { boot().catch((err) => { console.error(err); RS.toast('Startup error: ' + err.message, 'error', 10000); }); });
})(window.RS);
