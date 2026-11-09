'use strict';
// Auto-generate captions from speech with Whisper running locally — whisper.cpp in the desktop app,
// transformers.js in a Web Worker in the browser. Audio never leaves the user's computer.
(function (RS) {
  const S = RS.state;
  const AC = RS.autoCaptions = {};
  const LANGS = [['auto', 'Detect automatically'], ['en', 'English'], ['bn', 'Bengali'], ['hi', 'Hindi'], ['ur', 'Urdu'], ['ar', 'Arabic'],
    ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'], ['it', 'Italian'], ['pt', 'Portuguese'], ['ru', 'Russian'], ['tr', 'Turkish'],
    ['zh', 'Chinese'], ['ja', 'Japanese'], ['ko', 'Korean'], ['id', 'Indonesian'], ['ms', 'Malay'], ['vi', 'Vietnamese'], ['th', 'Thai'], ['nl', 'Dutch'], ['pl', 'Polish']];
  const PREF = 'reelsmith.stt';
  const prefs = () => { try { return JSON.parse(localStorage.getItem(PREF) || '{}'); } catch { return {}; } };

  // 16-bit PCM WAV, mono 16 kHz.
  AC.wav = (samples) => {
    const buf = new ArrayBuffer(44 + samples.length * 2);
    const v = new DataView(buf);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 16000, true);
    v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
    return new Uint8Array(buf);
  };

  // Whisper segments → readable captions (drop non-speech tags, merge short pieces, sensible durations).
  AC.toCaptions = (segs, t0) => {
    const out = [];
    for (const s of segs) {
      const text = String(s.text || '').replace(/\s+/g, ' ').trim();
      if (!text || /^[[(].*[\])]$/.test(text) || /^[♪.\s-]+$/.test(text)) continue;
      const prev = out[out.length - 1];
      const from = t0 + s.from, to = t0 + Math.max(s.to, s.from + 0.2);
      if (prev && from - prev.end < 0.25 && (prev.text + ' ' + text).length <= 84 && to - prev.start <= 7 && !/[.?!]$/.test(prev.text)) {
        prev.text += ' ' + text; prev.end = to;
      } else out.push({ start: from, end: to, text });
    }
    for (let i = 0; i < out.length; i++) {
      const next = out[i + 1];
      if (out[i].end - out[i].start < 0.8) out[i].end = Math.min(out[i].start + 0.8, next ? next.start : Infinity);
      if (next && out[i].end > next.start) out[i].end = next.start;
    }
    return out.filter((c) => c.end - c.start > 0.05);
  };

  // ---------- browser engine ----------
  const WEB_MODELS = [
    { id: 'whisper-tiny', label: 'Tiny — fastest (~45 MB)', size: 45e6 },
    { id: 'whisper-base', label: 'Base — balanced (~80–95 MB)', size: 90e6 },
    { id: 'whisper-small', label: 'Small — most accurate (~250–330 MB)', size: 300e6 },
  ];
  const CACHE = 'transformers-cache';
  const cachedModels = async () => {
    const have = new Set();
    try {
      if (!(await caches.has(CACHE))) return have;
      const keys = await (await caches.open(CACHE)).keys();
      for (const k of keys) { const m = k.url.match(/onnx-community\/(whisper-[a-z]+)\/.*decoder_model_merged/); if (m) have.add(m[1]); }
    } catch { /* cache unavailable */ }
    return have;
  };
  let worker = null;
  const webEngine = {
    async status() {
      const have = await cachedModels();
      return { binary: true, models: WEB_MODELS.map((m) => Object.assign({ downloaded: have.has(m.id) }, m)) };
    },
    download: async () => {}, // downloads happen inside transcribe (progress is reported as 'download')
    async transcribe({ samples, model, language, translate }) {
      let device = 'wasm';
      try { if (!AC.forceCpu && navigator.gpu && (await navigator.gpu.requestAdapter())) device = 'webgpu'; } catch { /* no WebGPU */ }
      if (!worker) worker = new Worker(RS.assetUrl('js/whisper-worker.js'), { type: 'module' });
      const w = worker;
      return new Promise((resolve, reject) => {
        w.onmessage = (e) => {
          const m = e.data;
          if (m.type === 'progress') AC._onProgress && AC._onProgress(m);
          else if (m.type === 'done') resolve(m.segments);
          else if (m.type === 'error') reject(new Error(m.message));
        };
        w.onerror = (e) => { e.preventDefault(); reject(new Error(e.message || 'The caption engine could not start (check your internet connection)')); };
        webEngine._reject = reject;
        const audio = samples.slice();
        w.postMessage({ type: 'run', id: Date.now(), model, audio, language, translate, device }, [audio.buffer]);
      });
    },
    cancel() {
      if (worker) { worker.terminate(); worker = null; }
      if (webEngine._reject) webEngine._reject(new Error('cancelled'));
    },
  };
  const nativeEngine = {
    status: () => RS.native.whisperStatus(),
    download: (id) => RS.native.whisperDownload(id),
    transcribe: ({ samples, model, language, translate }) => RS.native.whisperTranscribe({ wav: AC.wav(samples), model, language, translate }),
    cancel: () => RS.native.whisperCancel(),
  };
  const engine = () => (RS.native ? nativeEngine : webEngine);

  // Browser: free the space used by the caption engine.
  AC.removeEngine = async () => {
    if (RS.native) return RS.toast('The desktop app keeps speech models in ~/Library/Application Support/Reelsmith/whisper');
    let size = 0;
    try { if (!(await caches.has(CACHE))) return RS.toast('The caption engine is not downloaded'); } catch { return RS.toast('Browser storage is unavailable', 'error'); }
    try { for (const k of await (await caches.open(CACHE)).keys()) { const r = await caches.match(k); if (r) size += +(r.headers.get('content-length') || 0); } } catch { /* ignore */ }
    const ok = await RS.confirm('Remove caption engine?', `Delete the downloaded speech models${size ? ` (${(size / 1e6).toFixed(0)} MB)` : ''} from this browser? They download again the next time you generate captions.`, 'Remove', true);
    if (!ok) return;
    if (worker) { worker.terminate(); worker = null; }
    await caches.delete(CACHE);
    RS.toast('Caption engine removed', 'ok');
  };

  // Whisper's end times often run on into the following silence. Fit each caption to the speech that is
  // really inside it, using the audio itself (16 kHz mono samples starting at sequence time t0).
  AC.fitToSpeech = (caps, samples, t0) => {
    const SR = 16000, blk = SR / 50; // 20 ms blocks
    const n = Math.floor(samples.length / blk);
    const env = new Float32Array(n);
    let top = 0;
    for (let i = 0; i < n; i++) { let m = 0; for (let j = i * blk, e = j + blk; j < e; j++) { const v = samples[j] < 0 ? -samples[j] : samples[j]; if (v > m) m = v; } env[i] = m; if (m > top) top = m; }
    const thr = Math.max(0.006, top * 0.06);
    const out = caps.map((c) => Object.assign({}, c));
    for (const c of out) {
      const a = Math.max(0, Math.floor((c.start - t0) * 50)), b = Math.min(n, Math.ceil((c.end - t0) * 50));
      let first = -1, last = -1;
      for (let i = a; i < b; i++) if (env[i] > thr) { if (first < 0) first = i; last = i; }
      if (first < 0) continue; // no clear speech found: keep Whisper's timing
      const s0 = t0 + first / 50 - 0.12, e0 = t0 + (last + 1) / 50 + 0.3;
      if (s0 > c.start) c.start = s0;
      if (e0 < c.end) c.end = e0;
      if (c.end - c.start < 0.6) c.end = c.start + 0.6;
    }
    for (let i = 0; i + 1 < out.length; i++) if (out[i].end > out[i + 1].start) out[i].end = out[i + 1].start;
    return out.filter((c) => c.end - c.start > 0.05);
  };

  AC.open = async () => {
    if (RS.seqDuration() <= 0) return RS.toast('Add a clip with speech to the timeline first');
    const web = !RS.native;
    const st = await engine().status();
    const p = prefs();
    const fps = RS.fps();
    const io = S.project.inOut || {};
    const hasIO = io.in != null && io.out != null && io.out - io.in > 0.5;
    const sel = RS.selectedClips();
    const range = RS.h('select', null,
      RS.h('option', { value: 'all' }, 'Entire sequence'),
      RS.h('option', { value: 'io', disabled: !hasIO }, 'Sequence In/Out' + (hasIO ? ` (${RS.fmtTC(io.in, fps)} – ${RS.fmtTC(io.out, fps)})` : ' (none set)')),
      RS.h('option', { value: 'sel', disabled: !sel.length }, 'Selected clips' + (sel.length ? '' : ' (none)')));
    const lang = RS.h('select', null, LANGS.map(([v, l]) => RS.h('option', { value: v, selected: v === (p.lang || 'auto') }, l)));
    const defModel = web ? (st.models.find((m) => m.id === p.webModel) ? p.webModel : 'whisper-base') : (p.model || 'small');
    const model = RS.h('select', null, st.models.map((m) => RS.h('option', { value: m.id, selected: m.id === defModel }, m.label + (m.downloaded ? '  ✓ downloaded' : '  — downloads once'))));
    const translate = RS.h('input', { type: 'checkbox', checked: !!p.translate });
    const replace = RS.h('input', { type: 'checkbox', checked: true });
    const row = (l, c) => RS.h('label', { class: 'form-row' }, RS.h('span', null, l), c);
    const notInstalled = !st.binary;
    const install = notInstalled ? RS.h('div', { class: 'stt-install' },
      RS.h('b', null, 'Speech recognition engine not installed yet'),
      RS.h('p', { class: 'muted small' }, 'Reelsmith uses whisper.cpp (free, open source) to transcribe on your Mac — nothing is uploaded. Install it once, in Terminal, from the Reelsmith folder:'),
      RS.h('code', { class: 'stt-cmd' }, './scripts/build-whisper.sh'),
      RS.h('p', { class: 'muted small' }, 'or install it with Homebrew:  brew install whisper-cpp   — then click Check again.')) : null;
    let reopen = false;
    RS.modal({
      title: 'Auto-generate Captions',
      wide: true,
      body: RS.h('div', { class: 'form' }, install,
        row('Transcribe', range), row('Spoken language', lang), row('Accuracy', model),
        RS.h('label', { class: 'form-row check' }, translate, RS.h('span', null, 'Translate the captions into English')),
        RS.h('label', { class: 'form-row check' }, replace, RS.h('span', null, 'Replace existing captions in this range')),
        RS.h('p', { class: 'muted small' }, web
          ? 'Runs entirely in your browser — your audio is never uploaded. The caption engine downloads once (from Hugging Face) the first time you use it, then stays in this browser. Remove it any time from Captions › Remove Caption Engine. You can edit every caption afterwards in the Captions panel.'
          : 'Runs entirely on this Mac. The model downloads once (from Hugging Face) the first time you use it. You can edit every caption afterwards in the Captions panel.')),
      buttons: [
        { label: 'Cancel' },
        ...(notInstalled ? [{ label: 'Check again', onClick: () => { reopen = true; } }] : []),
        {
          label: 'Generate', primary: true, onClick: () => {
            if (notInstalled) { RS.toast('Install whisper.cpp first (see the instructions in this window)', 'warn'); return false; }
            try { localStorage.setItem(PREF, JSON.stringify(Object.assign(p, { lang: lang.value, translate: translate.checked }, web ? { webModel: model.value } : { model: model.value }))); } catch { /* ignore */ }
            let t0 = 0, t1 = RS.seqDuration();
            if (range.value === 'io') { t0 = io.in; t1 = io.out; }
            if (range.value === 'sel') { t0 = Math.min(...sel.map((c) => c.start)); t1 = Math.max(...sel.map(RS.clipEnd)); }
            const m = st.models.find((x) => x.id === model.value);
            setTimeout(() => AC.run({ t0, t1, language: lang.value, model: model.value, needsDownload: !m.downloaded, modelLabel: m.label, translate: translate.checked, replace: replace.checked }), 0);
          },
        },
      ],
      onClose: () => { if (reopen) setTimeout(AC.open, 0); },
    });
  };

  AC.run = async (o) => {
    if (S.playing) RS.engine.pause();
    const bar = RS.h('div', { class: 'progress-fill' });
    const label = RS.h('div', { class: 'muted' }, 'Preparing…');
    let cancelled = false;
    const dlg = RS.modal({ title: 'Generating captions', sticky: true, body: RS.h('div', null, RS.h('div', { class: 'progress' }, bar), label),
      buttons: [{ label: 'Cancel', danger: true, onClick: () => { cancelled = true; engine().cancel(); return false; } }] });
    const show = (pct, text) => { bar.style.width = (pct * 100).toFixed(1) + '%'; if (text) label.textContent = text; };
    const onP = (p) => {
      if (p.phase === 'download') show(p.pct, `Downloading speech model (${o.modelLabel.split(' —')[0]})… ${Math.round(p.pct * 100)}%` + (p.total ? ` of ${(p.total / 1e6).toFixed(0)} MB` : ''));
      if (p.phase === 'load') show(1, 'Starting the caption engine…');
      if (p.phase === 'transcribe') show(p.pct, `Transcribing speech… ${Math.round(p.pct * 100)}%`);
    };
    AC._onProgress = onP;
    try {
      if (o.needsDownload) { show(0, 'Downloading speech model…'); await engine().download(o.model); }
      if (cancelled) throw new Error('cancelled');
      show(0, 'Preparing audio…');
      const samples = await RS.fastExport.renderMix(o.t0, o.t1, (f) => show(f, `Preparing audio… ${Math.round(f * 100)}%`));
      let peak = 0; for (let i = 0; i < samples.length; i += 64) peak = Math.max(peak, Math.abs(samples[i]));
      if (peak < 0.003) throw new Error('No sound in this range (check that audio tracks are not muted)');
      if (cancelled) throw new Error('cancelled');
      show(0, 'Transcribing speech…');
      if (!RS.native) show(0, o.needsDownload ? 'Downloading the caption engine…' : 'Starting the caption engine…');
      const segs = await engine().transcribe({ samples, model: o.model, language: o.language, translate: o.translate });
      if (cancelled) throw new Error('cancelled');
      const caps = AC.fitToSpeech(AC.toCaptions(segs, o.t0), samples, o.t0).filter((c) => c.start < o.t1);
      dlg.close();
      if (!caps.length) return RS.toast('No speech was recognised in this range', 'warn', 5000);
      RS.commit('Auto-generate captions', () => {
        const tr = RS.ops.captionTrack();
        if (o.replace) for (const c of [...S.project.clips]) if (c.trackId === tr.id && c.start < o.t1 && RS.clipEnd(c) > o.t0) RS.ops.removeClip(c.id);
        for (const c of caps) RS.ops.addCaption(c.start, Math.min(c.end, o.t1) - c.start, c.text);
        tr.hidden = false;
      });
      RS.emit('show-tab', 'captions');
      RS.toast(`Added ${caps.length} captions — review and edit them in the Captions panel`, 'ok', 6000);
    } catch (err) {
      dlg.close();
      if (cancelled || err.message === 'cancelled' || /cancelled/.test(err.message)) RS.toast('Caption generation cancelled');
      else { console.error(err); RS.toast('Could not generate captions: ' + err.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''), 'error', 8000); }
    } finally { AC._onProgress = null; }
  };
  if (RS.native && RS.native.onWhisperProgress) RS.native.onWhisperProgress((p) => AC._onProgress && AC._onProgress(p));
})(window.RS);
