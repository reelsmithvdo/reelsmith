'use strict';
// Export: plays the sequence (or an In/Out range) through the compositor and records canvas + mixed audio.
// Output is H.264/AAC MP4 when the platform encoder supports it, otherwise WebM.
// Data is streamed to disk in chunks, so long exports do not fill memory.
(function (RS) {
  const S = RS.state;
  const X = RS.exporter = {};
  const DIR_KEY = 'reelsmith.exportDir';

  const FORMATS = [
    { id: 'mp4', label: 'H.264 (.mp4)', ext: 'mp4', mimes: ['video/mp4;codecs=avc1.640033,mp4a.40.2', 'video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4'] },
    { id: 'webm9', label: 'VP9 (.webm)', ext: 'webm', mimes: ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp9'] },
    { id: 'webm8', label: 'VP8 (.webm)', ext: 'webm', mimes: ['video/webm;codecs=vp8,opus', 'video/webm'] },
  ];
  const supported = (f) => f.mimes.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m));

  // Presets: w/h null = match sequence
  const PRESETS = [
    { id: 'match', label: 'Match Source – High bitrate', w: null, h: null, q: 'high' },
    { id: 'yt1080', label: 'YouTube 1080p Full HD', w: 1920, h: 1080, q: 'high' },
    { id: 'yt4k', label: 'YouTube 2160p 4K UHD', w: 3840, h: 2160, q: 'high' },
    { id: 'shorts', label: 'YouTube Shorts / Reels / TikTok (9:16)', w: 1080, h: 1920, q: 'high' },
    { id: 'igsq', label: 'Instagram Square (1:1)', w: 1080, h: 1080, q: 'high' },
    { id: 'igport', label: 'Instagram Portrait (4:5)', w: 1080, h: 1350, q: 'high' },
    { id: 'vimeo', label: 'Vimeo 1080p', w: 1920, h: 1080, q: 'high' },
    { id: 'x720', label: 'X (Twitter) 720p', w: 1280, h: 720, q: 'medium' },
    { id: 'review', label: 'Review copy (small file)', w: null, h: 540, q: 'low' },
    { id: 'custom', label: 'Custom', w: null, h: null, q: null },
  ];

  const even = (n) => Math.max(2, Math.round(n / 2) * 2);
  function bitrate(w, h, fps, q) {
    const bpp = q === 'high' ? 0.14 : q === 'medium' ? 0.08 : 0.045;
    return Math.round(RS.clamp(w * h * fps * bpp, 1.5e6, 80e6));
  }
  const savedDir = () => { try { return localStorage.getItem(DIR_KEY); } catch { return null; } };

  X.dialog = async () => {
    if (S.playing) RS.engine.pause();
    const seqDur = RS.seqDuration();
    if (seqDur <= 0) return RS.toast('The timeline is empty — add clips before exporting', 'error');
    const { width: W, height: H, fps } = S.project.settings;
    const fmts = FORMATS.filter(supported);
    if (!fmts.length) return RS.toast('No video encoder available on this system', 'error');

    let dir = savedDir();
    if (RS.native && !dir) dir = await RS.native.exportDefaultDir();

    const preset = RS.h('select', null, PRESETS.map((p) => RS.h('option', { value: p.id }, p.label)));
    const name = RS.h('input', { type: 'text', value: (S.project.name || 'Export').replace(/[\\/:*?"<>|]/g, '_') });
    const extLbl = RS.h('span', { class: 'muted' });
    const loc = RS.h('input', { type: 'text', readonly: true, class: 'path-input', value: dir || 'Downloads folder' });
    const browse = RS.h('button', { class: 'btn small', type: 'button' }, 'Browse…');
    browse.disabled = !RS.native;
    browse.addEventListener('click', async () => {
      const d = await RS.native.pickFolder(dir);
      if (d) { dir = d; loc.value = d; try { localStorage.setItem(DIR_KEY, d); } catch { /* ignore */ } suggestFreeName(); }
    });
    const fmt = RS.h('select', null, fmts.map((f) => RS.h('option', { value: f.id }, f.label)));
    const wIn = RS.h('input', { type: 'number', min: 16, max: 7680, step: 2, value: W });
    const hIn = RS.h('input', { type: 'number', min: 16, max: 4320, step: 2, value: H });
    // Frame size: pick a standard size, or Custom… to type width × height.
    const SIZES = [
      { v: 'seq', label: `Match sequence (${W}×${H})`, w: W, h: H },
      { group: 'Landscape 16:9' },
      { v: '3840x2160', label: '3840×2160 — 4K UHD' }, { v: '2560x1440', label: '2560×1440 — QHD' },
      { v: '1920x1080', label: '1920×1080 — Full HD' }, { v: '1280x720', label: '1280×720 — HD' },
      { v: '854x480', label: '854×480 — SD' }, { v: '640x360', label: '640×360 — Small' },
      { group: 'Vertical 9:16' },
      { v: '2160x3840', label: '2160×3840 — 4K vertical' }, { v: '1080x1920', label: '1080×1920 — Full HD vertical' },
      { v: '720x1280', label: '720×1280 — HD vertical' },
      { group: 'Square & portrait' },
      { v: '1080x1080', label: '1080×1080 — Square 1:1' }, { v: '1080x1350', label: '1080×1350 — Portrait 4:5' },
      { group: 'Cinema' },
      { v: '4096x2160', label: '4096×2160 — DCI 4K' }, { v: '2048x1080', label: '2048×1080 — DCI 2K' },
      { group: '' },
      { v: 'custom', label: 'Custom…' },
    ];
    const sizeSel = RS.h('select');
    let og = null;
    for (const z of SIZES) {
      if ('group' in z) { og = z.group ? RS.h('optgroup', { label: z.group }) : null; if (og) sizeSel.append(og); continue; }
      (og || sizeSel).append(RS.h('option', { value: z.v }, z.label));
    }
    const customBox = RS.h('div', { class: 'inline custom-size' }, wIn, '×', hIn);
    const sizeOf = (v) => (v === 'seq' ? [W, H] : v.split('x').map(Number));
    // Select the dropdown entry matching the current width/height (sequence first), else Custom.
    const syncSizeSel = () => {
      const w = +wIn.value, h = +hIn.value;
      const match = w === W && h === H ? 'seq' : SIZES.find((z) => z.v && z.v !== 'seq' && z.v !== 'custom' && z.v === `${w}x${h}`);
      if (sizeSel.value !== 'custom' || match) sizeSel.value = match ? (match === 'seq' ? 'seq' : match.v) : 'custom';
      customBox.style.display = sizeSel.value === 'custom' ? '' : 'none';
    };
    sizeSel.addEventListener('change', () => {
      if (sizeSel.value !== 'custom') { const [w, h] = sizeOf(sizeSel.value); wIn.value = w; hIn.value = h; }
      customBox.style.display = sizeSel.value === 'custom' ? '' : 'none';
      if (sizeSel.value === 'custom') setTimeout(() => wIn.focus(), 0);
      preset.value = 'custom';
      upd();
    });
    const quality = RS.h('select', null, [['high', 'High'], ['medium', 'Medium'], ['low', 'Low (small file)']].map(([v, l]) => RS.h('option', { value: v }, l)));
    const io = S.project.inOut || {};
    // A usable In/Out range must be at least one frame long inside the sequence.
    const ioT0 = RS.clamp(io.in ?? 0, 0, seqDur), ioT1 = RS.clamp(io.out ?? seqDur, 0, seqDur);
    const ioSet = io.in != null || io.out != null;
    const hasIO = ioSet && ioT1 - ioT0 >= 1 / fps;
    const ioLabel = !ioSet ? ' (none set)' : hasIO ? ` (${RS.fmtTC(ioT0, fps)} – ${RS.fmtTC(ioT1, fps)})` : ' (empty — set new In/Out with I and O)';
    const sel = RS.selectedClips();
    const range = RS.h('select', null,
      RS.h('option', { value: 'all' }, 'Entire Sequence'),
      RS.h('option', { value: 'io', disabled: !hasIO }, 'Sequence In/Out' + ioLabel),
      RS.h('option', { value: 'sel', disabled: !sel.length }, 'Selected clips' + (sel.length ? '' : ' (none)')),
      RS.h('option', { value: 'custom' }, 'Custom — drag the In/Out handles below'));
    range.value = 'all'; // one click: the whole sequence is exported unless you choose otherwise
    const custom = { t0: 0, t1: seqDur };

    // ---- range bar with live preview (drag In/Out handles here, no need to go back to the timeline)
    const prevCv = RS.h('canvas', { class: 'rng-preview', width: 320, height: Math.max(2, Math.round(320 * H / W)) });
    const prevTc = RS.h('div', { class: 'rng-prev-tc' });
    const rbSel = RS.h('div', { class: 'rng-sel' });
    const rbIn = RS.h('div', { class: 'rng-handle in', title: 'Drag to set the In point' });
    const rbOut = RS.h('div', { class: 'rng-handle out', title: 'Drag to set the Out point' });
    const rbTrack = RS.h('div', { class: 'rng-track', title: 'Drag the handles to set the range; drag the highlighted part to move it' }, rbSel, rbIn, rbOut);
    const inTc = RS.h('input', { type: 'text', class: 'tc-field', spellcheck: false });
    const outTc = RS.h('input', { type: 'text', class: 'tc-field', spellcheck: false });
    const durLbl = RS.h('span', { class: 'muted small' });
    const rangeBox = RS.h('div', { class: 'range-widget' },
      RS.h('div', { class: 'rng-prev-wrap' }, prevCv, prevTc),
      RS.h('div', { class: 'rng-right' }, rbTrack,
        RS.h('div', { class: 'rng-tcs' }, RS.h('span', null, 'In'), inTc, RS.h('span', null, 'Out'), outTc, durLbl),
        RS.h('div', { class: 'muted small' }, 'Drag the orange handles (or type timecodes) to export only part of the sequence. The picture shows the frame at the handle.')));
    const origPlayhead = S.playhead;
    X._preview = prevCv;
    let previewT = null;
    const previewAt = (t) => { previewT = t; prevTc.textContent = RS.fmtTC(t, fps); RS.engine.seek(t, false); };
    const pct = (t) => (seqDur ? RS.clamp(t / seqDur, 0, 1) * 100 : 0) + '%';
    const syncBar = () => {
      const { t0, t1 } = rangeOf();
      rbSel.style.left = pct(t0); rbSel.style.width = `calc(${pct(t1)} - ${pct(t0)})`;
      rbIn.style.left = pct(t0); rbOut.style.left = pct(t1);
      if (document.activeElement !== inTc) inTc.value = RS.fmtTC(t0, fps);
      if (document.activeElement !== outTc) outTc.value = RS.fmtTC(t1, fps);
      durLbl.textContent = 'Duration ' + RS.fmtTC(t1 - t0, fps);
    };
    const toCustom = () => { if (range.value !== 'custom') { Object.assign(custom, rangeOf()); range.value = 'custom'; } };
    const minLen = 1 / fps;
    rbTrack.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const r = rbTrack.getBoundingClientRect();
      const tAt = (x) => RS.frameRound(RS.clamp((x - r.left) / r.width, 0, 1) * seqDur, fps);
      toCustom();
      const t = tAt(e.clientX);
      let which = e.target === rbIn ? 'in' : e.target === rbOut ? 'out' : e.target === rbSel ? 'move' : null;
      if (!which) { which = Math.abs(t - custom.t0) < Math.abs(t - custom.t1) ? 'in' : 'out'; }
      const start = { t, t0: custom.t0, t1: custom.t1 };
      const apply = (ev) => {
        const tt = tAt(ev.clientX);
        if (which === 'in') { custom.t0 = Math.min(tt, custom.t1 - minLen); previewAt(custom.t0); }
        else if (which === 'out') { custom.t1 = Math.max(tt, custom.t0 + minLen); previewAt(custom.t1); }
        else {
          const len = start.t1 - start.t0;
          const t0 = RS.clamp(start.t0 + (tt - start.t), 0, seqDur - len);
          custom.t0 = t0; custom.t1 = t0 + len; previewAt(custom.t0);
        }
        upd();
      };
      apply(e);
      rbTrack.setPointerCapture(e.pointerId);
      const up = () => { rbTrack.removeEventListener('pointermove', apply); rbTrack.removeEventListener('pointerup', up); };
      rbTrack.addEventListener('pointermove', apply);
      rbTrack.addEventListener('pointerup', up);
    });
    for (const [inp, key] of [[inTc, 't0'], [outTc, 't1']]) {
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
      inp.addEventListener('change', () => {
        const t = RS.parseTC(inp.value, fps);
        if (t == null) return upd();
        toCustom();
        if (key === 't0') custom.t0 = RS.clamp(RS.frameRound(t, fps), 0, custom.t1 - minLen);
        else custom.t1 = RS.clamp(RS.frameRound(t, fps), custom.t0 + minLen, seqDur);
        previewAt(custom[key]);
        upd();
      });
    }
    const engineSel = RS.h('select', null,
      RS.h('option', { value: 'fast', selected: true }, 'Fast — frame-accurate (faster than real time)'),
      RS.h('option', { value: 'realtime' }, 'Real-time (plays the sequence while recording)'));
    const hasCaps = !!RS.captions.toSrt(S.project.seq);
    const capsVisible = RS.captions.visible();
    const capSel = RS.h('select', null,
      RS.h('option', { value: 'burn' }, 'Burn into the video'),
      RS.h('option', { value: 'both' }, 'Burn in and save an .srt file'),
      RS.h('option', { value: 'sidecar' }, 'Save as an .srt file only (not in the picture)'),
      RS.h('option', { value: 'none' }, "Don't include"));
    if (hasCaps && !capsVisible) capSel.value = 'none'; // hidden captions are left out unless you choose otherwise
    const mute = RS.h('input', { type: 'checkbox', checked: true });
    const reveal = RS.h('input', { type: 'checkbox', checked: true });
    const summary = RS.h('div', { class: 'export-summary' });
    for (const i of [name, wIn, hIn]) i.addEventListener('keydown', (e) => e.stopPropagation());

    const rangeOf = () => {
      if (range.value === 'io' && hasIO) return { t0: ioT0, t1: ioT1 };
      if (range.value === 'sel' && sel.length) return { t0: Math.min(...sel.map((c) => c.start)), t1: Math.max(...sel.map(RS.clipEnd)) };
      if (range.value === 'custom') return { t0: custom.t0, t1: custom.t1 };
      return { t0: 0, t1: seqDur };
    };
    const applyPreset = () => {
      const p = PRESETS.find((x) => x.id === preset.value);
      if (p.id === 'custom') return;
      let w = p.w, h = p.h;
      if (!w && !h) { w = W; h = H; } else if (!w) { w = even(W * h / H); }
      wIn.value = w; hIn.value = h;
      sizeSel.value = 'seq';
      syncSizeSel();
      if (p.q) quality.value = p.q;
      if (p.id !== 'match') fmt.value = fmts[0].id;
      upd();
    };
    const upd = () => {
      syncBar();
      const f = FORMATS.find((x) => x.id === fmt.value);
      extLbl.textContent = '.' + f.ext;
      const w = even(+wIn.value || W), h = even(+hIn.value || H);
      const { t0, t1 } = rangeOf();
      const dur = Math.max(0, t1 - t0);
      const br = bitrate(w, h, fps, quality.value);
      const aspectSeq = W / H, aspectOut = w / h;
      const warn = Math.abs(aspectSeq - aspectOut) > 0.01
        ? RS.h('div', { class: 'warn-line' }, RS.icon('warn'), `Output aspect differs from the sequence (${W}×${H}) — it will be ${aspectOut < aspectSeq ? 'letterboxed' : 'pillarboxed'}. Change Sequence Settings to reframe instead.`)
        : null;
      summary.innerHTML = '';
      summary.append(
        RS.h('div', null, `${w}×${h} · ${fps} fps · ${f.label} · ${quality.options[quality.selectedIndex].text}`),
        RS.h('div', null, `Range ${RS.fmtTC(t0, fps)} – ${RS.fmtTC(t1, fps)}  (${RS.fmtTC(dur, fps)})`),
        RS.h('div', null, `Estimated file size ≈ ${RS.fmtBytes((br + 192000) / 8 * dur)}` + (engineSel.value === 'realtime' ? ` · Export time ≈ ${RS.fmtDur(dur)} (real time)` : ' · Fast render (usually several × real time)')));
      if (warn) summary.append(warn);
    };
    preset.addEventListener('change', applyPreset);
    [wIn, hIn].forEach((x) => x.addEventListener('input', () => { preset.value = 'custom'; sizeSel.value = 'custom'; upd(); }));
    [fmt, quality, engineSel].forEach((x) => x.addEventListener('change', upd));
    let nameEdited = false;
    name.addEventListener('input', () => { nameEdited = true; });
    const baseName = name.value;
    const suggestFreeName = async () => {
      if (!RS.native || !dir || nameEdited) return;
      const ext = FORMATS.find((x) => x.id === fmt.value).ext;
      for (let n = 1; n < 500; n++) {
        const cand = n === 1 ? baseName : `${baseName} (${n})`;
        if (!(await RS.native.fileExists(dir, cand + '.' + ext))) { if (!nameEdited) name.value = cand; return; }
      }
    };
    fmt.addEventListener('change', suggestFreeName);
    suggestFreeName();
    range.addEventListener('change', () => { upd(); previewAt(rangeOf().t0); });
    applyPreset();

    const row = (l, ...c) => RS.h('div', { class: 'form-row' }, RS.h('span', null, l), RS.h('div', { class: 'inline' }, ...c));
    setTimeout(() => previewAt(rangeOf().t0), 0);
    RS.modal({
      title: 'Export Settings',
      onClose: () => { X._preview = null; if (!job) RS.engine.seek(origPlayhead, false); },
      wide: true,
      body: RS.h('div', { class: 'form' },
        row('Preset', preset),
        row('File name', name, extLbl),
        row('Location', loc, browse),
        row('Format', fmt),
        row('Frame size', sizeSel, customBox),
        row('Quality', quality),
        row('Range', range),
        rangeBox,
        row('Render', engineSel),
        hasCaps ? row('Captions', capSel, capsVisible ? null : RS.h('span', { class: 'muted small' }, '(hidden)')) : null,
        RS.h('label', { class: 'form-row check' }, mute, RS.h('span', null, 'Mute speakers while exporting')),
        RS.native ? RS.h('label', { class: 'form-row check' }, reveal, RS.h('span', null, 'Show in Finder when done')) : null,
        summary),
      buttons: [
        { label: 'Cancel' },
        {
          label: 'Export', primary: true, onClick: async () => {
            const f = FORMATS.find((x) => x.id === fmt.value);
            const base = (name.value.trim() || 'Export').replace(/[\\/:*?"<>|]/g, '_').replace(/\.(mp4|webm|mov)$/i, '');
            const fileName = base + '.' + f.ext;
            if (RS.native) {
              if (!dir) { RS.toast('Choose an export location'); return false; }
              if (await RS.native.fileExists(dir, fileName)) {
                const ok = await RS.confirm('Replace file?', `"${fileName}" already exists in this folder. Replace it?`, 'Replace', true);
                if (!ok) return false;
              }
              try { localStorage.setItem(DIR_KEY, dir); } catch { /* ignore */ }
            }
            const { t0, t1 } = rangeOf();
            if (t1 - t0 < 1 / fps) { RS.toast('The export range is empty', 'error'); return false; }
            setTimeout(() => X.run({
              dir, fileName, format: f, mime: supported(f),
              width: even(+wIn.value || W), height: even(+hIn.value || H), quality: quality.value,
              muteMonitor: mute.checked, reveal: reveal.checked, t0, t1, engine: engineSel.value, captions: hasCaps ? capSel.value : 'none',
            }), 0);
          },
        },
      ],
    });
  };

  // Copy each rendered program frame into the open Export dialog's preview.
  RS.on('rendered', () => {
    const cv = X._preview;
    if (!cv || !cv.isConnected || RS.engine.exporting) return;
    const g = cv.getContext('2d');
    g.drawImage(RS.engine.canvas, 0, 0, cv.width, cv.height);
  });

  let job = null;

  X.run = async (opts) => {
    if (job) return;
    const E = RS.engine;
    const P = S.project;
    const fps = P.settings.fps;
    const t0 = opts.t0 || 0;
    const t1 = opts.t1 != null ? opts.t1 : RS.seqDuration();
    const dur = t1 - t0;
    const fileName = opts.fileName || ((opts.name || 'Export') + '.' + opts.format.ext);
    if (S.playing) E.pause();
    E.hideCaptions = !(opts.captions === 'burn' || opts.captions === 'both');
    E.forceCaptions = !E.hideCaptions; // an explicit "burn in" choice includes captions even if hidden in the monitor
    // Subtitle sidecar written next to the video (times are relative to the start of the range).
    const writeSidecar = async (videoPath) => {
      if (!(opts.captions === 'sidecar' || opts.captions === 'both') || !RS.native || !videoPath) return;
      const seq = S.project.seq;
      const shifted = Object.assign({}, seq, { clips: seq.clips.filter((c) => c.type === 'caption' && RS.clipEnd(c) > t0 && c.start < t1).map((c) => Object.assign({}, c, { start: Math.max(0, c.start - t0), duration: Math.min(RS.clipEnd(c), t1) - Math.max(c.start, t0) })) });
      await RS.native.writeFile(videoPath.replace(/\.[^.\/]+$/, '.srt'), RS.captions.toSrt(shifted));
    };
    let useFast = opts.engine === 'fast';
    if (useFast) {
      const reason = await RS.fastExport.unsupportedReason(Object.assign({}, opts, { t0, t1 }));
      if (reason) { useFast = false; RS.toast('Using real-time export — ' + reason, 'warn', 7000); }
    }

    // 1. destination
    let sink;
    if (RS.native) {
      let r;
      try {
        r = opts.dir ? await RS.native.exportBeginPath(opts.dir, fileName) : await RS.native.exportBegin(fileName.replace(/\.\w+$/, ''), opts.format.ext);
      } catch (err) {
        RS.toast('Cannot write file: ' + err.message, 'error', 7000);
        return;
      }
      if (!r) return;
      var nativeHandle = r.handle;
      let chain = Promise.resolve();
      let failed = null;
      sink = {
        write: (blob) => { chain = chain.then(async () => { if (failed) return; try { await RS.native.exportChunk(r.handle, new Uint8Array(await blob.arrayBuffer())); } catch (err) { failed = err; } }); },
        finish: async (keep) => { await chain; const p = await RS.native.exportEnd(r.handle, keep && !failed); if (failed) throw failed; return p; },
      };
    } else {
      const parts = [];
      const pieces = [];
      sink = {
        writeAt: (data, position) => { pieces.push({ data: data.slice(), position }); },
        write: (blob) => parts.push(blob),
        finish: async (keep) => {
          if (!keep) return null;
          if (pieces.length) {
            const size = Math.max(...pieces.map((x) => x.position + x.data.length));
            const all = new Uint8Array(size);
            for (const x of pieces) all.set(x.data, x.position);
            parts.push(new Blob([all]));
          }
          const url = URL.createObjectURL(new Blob(parts, { type: opts.mime }));
          const a = RS.h('a', { href: url, download: fileName });
          document.body.append(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 60000);
          return fileName;
        },
      };
    }

    // 2. progress UI
    const bar = RS.h('div', { class: 'progress-fill' });
    const label = RS.h('div', { class: 'muted' }, 'Preparing…');
    let cancelled = false;
    const dlg = RS.modal({
      title: 'Exporting ' + fileName,
      sticky: true,
      body: RS.h('div', null, RS.h('div', { class: 'progress' }, bar), label,
        RS.h('p', { class: 'muted small' }, 'Keep Reelsmith open while exporting. Rendering runs in real time, so the export takes as long as the range.')),
      buttons: [{ label: 'Cancel export', danger: true, onClick: () => { cancelled = true; return false; } }],
    });

    if (useFast) {
      job = { cancelled: () => cancelled };
      E.exporting = true;
      const startWall = performance.now();
      const writeAt = RS.native ? (data, pos) => RS.native.exportWriteAt(nativeHandle, data, pos) : (data, pos) => sink.writeAt(data, pos);
      try {
        await RS.fastExport.run(Object.assign({}, opts, { t0, t1, bitrate: bitrate(opts.width, opts.height, fps, opts.quality) }), writeAt, (f, t) => {
          bar.style.width = (f * 100).toFixed(1) + '%';
          const wall = (performance.now() - startWall) / 1000;
          const speed = wall > 0.2 ? (t - t0) / wall : 0;
          label.textContent = `${Math.round(f * 100)}%  ·  ${RS.fmtTC(t - t0, fps)} / ${RS.fmtTC(dur, fps)}` + (speed ? `  ·  ${speed.toFixed(1)}× real time` : '');
        }, () => cancelled);
        const path = await sink.finish(true);
        E.setExportSize(null); E.exporting = false; job = null; E.hideCaptions = false; E.forceCaptions = false;
        await writeSidecar(path);
        dlg.close();
        if (RS.native && path && opts.reveal) RS.native.reveal(path);
        showDone(path, opts, (performance.now() - startWall) / 1000, dur);
      } catch (err) {
        try { await sink.finish(false); } catch { /* ignore */ }
        E.setExportSize(null); E.exporting = false; job = null; E.hideCaptions = false; E.forceCaptions = false;
        dlg.close();
        E.invalidate();
        if (err.message === 'cancelled') RS.toast('Export cancelled');
        else { console.error(err); RS.toast('Export failed: ' + err.message, 'error', 8000); }
      }
      return;
    }

    // 3. pipeline (real time)
    job = { cancelled: () => cancelled };
    const actx = E.audioContext();
    await actx.resume().catch(() => {});
    const dest = actx.createMediaStreamDestination();
    E.master().connect(dest);
    if (opts.muteMonitor) E.setMonitorMuted(true);

    // Render straight at the output size so the encoder sees one constant frame size.
    E.setExportSize(opts.width !== P.settings.width || opts.height !== P.settings.height ? { w: opts.width, h: opts.height } : null);
    let vStream = null, rec = null, stopped = null;
    // The recorder is created only once media is buffered, so the file starts exactly at the range In.
    const startRecorder = () => {
      vStream = E.canvas.captureStream(fps);
      const stream = new MediaStream([...vStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
      rec = new MediaRecorder(stream, {
        mimeType: opts.mime,
        videoBitsPerSecond: bitrate(opts.width, opts.height, fps, opts.quality),
        audioBitsPerSecond: 192000,
      });
      rec.ondataavailable = (e) => { if (e.data && e.data.size) sink.write(e.data); };
      stopped = new Promise((res) => { rec.onstop = res; });
      rec.start(1000);
    };

    const cleanup = () => {
      try { E.master().disconnect(dest); } catch { /* ignore */ }
      if (opts.muteMonitor) E.setMonitorMuted(false);
      if (vStream) vStream.getTracks().forEach((t) => t.stop());
      E.stopAt = null;
      E.setExportSize(null);
      E.exporting = false;
      E.hideCaptions = false;
      E.forceCaptions = false;
      job = null;
    };

    try {
      E.exporting = true;
      E.seek(t0, false);
      label.textContent = 'Buffering media…';
      await E.waitReady(t0);
      if (cancelled) throw new Error('cancelled');
      E.stopAt = t1;
      startRecorder();
      E.play(1);
      await new Promise((resolve) => {
        E.onStop = () => { clearInterval(iv); resolve(); }; // fires on the exact frame the range ends
        const iv = setInterval(() => {
          const t = S.playhead;
          const pct = RS.clamp((t - t0) / dur, 0, 1);
          bar.style.width = (pct * 100).toFixed(1) + '%';
          label.textContent = `${Math.round(pct * 100)}%  ·  ${RS.fmtTC(t - t0, fps)} / ${RS.fmtTC(dur, fps)}  ·  ${RS.fmtDur(Math.max(0, t1 - t))} remaining`;
          if (cancelled || !S.playing) { clearInterval(iv); E.onStop = null; resolve(); }
        }, 200);
      });
      if (S.playing) E.pause();
      await new Promise((r) => setTimeout(r, 34)); // one frame for the last picture/audio to reach the recorder
      rec.stop();
      await stopped;
      const path = await sink.finish(!cancelled);
      cleanup();
      dlg.close();
      if (cancelled) { RS.toast('Export cancelled'); return; }
      await writeSidecar(path);
      if (RS.native && path && opts.reveal) RS.native.reveal(path);
      showDone(path, opts);
    } catch (err) {
      try { if (rec && rec.state !== 'inactive') { rec.stop(); await stopped; } } catch { /* ignore */ }
      try { await sink.finish(false); } catch { /* ignore */ }
      cleanup();
      dlg.close();
      if (err.message === 'cancelled') RS.toast('Export cancelled');
      else { console.error(err); RS.toast('Export failed: ' + err.message, 'error', 8000); }
    }
  };

  function showDone(path, opts, took, dur) {
    RS.modal({
      title: 'Export complete',
      body: RS.h('div', null,
        RS.h('p', null, 'Your video was exported successfully.'),
        RS.h('p', { class: 'muted small path' }, path || ''),
        RS.h('p', { class: 'muted small' }, `${opts.width}×${opts.height} · ${opts.format.label}` + (took ? ` · rendered ${RS.fmtDur(dur)} in ${took.toFixed(1)} s (${(dur / took).toFixed(1)}× real time)` : ''))),
      buttons: [
        ...(RS.native && path ? [{ label: 'Show in Finder', onClick: () => { RS.native.reveal(path); } }] : []),
        { label: 'Done', primary: true },
      ],
    });
  }

  X.busy = () => !!job;
})(window.RS);
