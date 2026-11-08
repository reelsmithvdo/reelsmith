'use strict';
// Auto-generate captions from speech with whisper.cpp running locally (offline, nothing leaves the Mac).
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

  AC.open = async () => {
    if (!RS.native) return RS.toast('Auto-generated captions need the desktop app');
    if (RS.seqDuration() <= 0) return RS.toast('Add a clip with speech to the timeline first');
    const st = await RS.native.whisperStatus();
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
    const model = RS.h('select', null, st.models.map((m) => RS.h('option', { value: m.id, selected: m.id === (p.model || 'small') }, m.label + (m.downloaded ? '  ✓ downloaded' : '  — downloads once'))));
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
        RS.h('p', { class: 'muted small' }, 'Runs entirely on this Mac. The model downloads once (from Hugging Face) the first time you use it. You can edit every caption afterwards in the Captions panel.')),
      buttons: [
        { label: 'Cancel' },
        ...(notInstalled ? [{ label: 'Check again', onClick: () => { reopen = true; } }] : []),
        {
          label: 'Generate', primary: true, onClick: () => {
            if (notInstalled) { RS.toast('Install whisper.cpp first (see the instructions in this window)', 'warn'); return false; }
            try { localStorage.setItem(PREF, JSON.stringify({ lang: lang.value, model: model.value, translate: translate.checked })); } catch { /* ignore */ }
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
      buttons: [{ label: 'Cancel', danger: true, onClick: () => { cancelled = true; RS.native.whisperCancel(); return false; } }] });
    const show = (pct, text) => { bar.style.width = (pct * 100).toFixed(1) + '%'; if (text) label.textContent = text; };
    const onP = (p) => {
      if (p.phase === 'download') show(p.pct, `Downloading speech model (${o.modelLabel.split(' —')[0]})… ${Math.round(p.pct * 100)}%`);
      if (p.phase === 'transcribe') show(p.pct, `Transcribing speech… ${Math.round(p.pct * 100)}%`);
    };
    AC._onProgress = onP;
    try {
      if (o.needsDownload) { show(0, 'Downloading speech model…'); await RS.native.whisperDownload(o.model); }
      if (cancelled) throw new Error('cancelled');
      show(0, 'Preparing audio…');
      const samples = await RS.fastExport.renderMix(o.t0, o.t1, (f) => show(f, `Preparing audio… ${Math.round(f * 100)}%`));
      let peak = 0; for (let i = 0; i < samples.length; i += 64) peak = Math.max(peak, Math.abs(samples[i]));
      if (peak < 0.003) throw new Error('No sound in this range (check that audio tracks are not muted)');
      if (cancelled) throw new Error('cancelled');
      show(0, 'Transcribing speech…');
      const segs = await RS.native.whisperTranscribe({ wav: AC.wav(samples), model: o.model, language: o.language, translate: o.translate });
      const caps = AC.toCaptions(segs, o.t0).filter((c) => c.start < o.t1);
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
