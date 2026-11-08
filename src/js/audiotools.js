'use strict';
// Audio tools: loudness normalisation (ITU-R BS.1770 / EBU R128 integrated loudness),
// voice-over recording, and the Audio Track Mixer panel.
(function (RS) {
  const S = RS.state;

  // ---------------- loudness ----------------
  const L = RS.loudness = {};
  // Integrated loudness (LUFS) of a clip's source range at unity gain.
  L.measure = async (c) => {
    const m = RS.getMedia(c.mediaId);
    if (!m) throw new Error('Media is offline');
    const sr = 48000;
    const lo = c.reverse ? Math.max(0, c.in - c.duration * c.speed) : c.in;
    const len = Math.min(600, c.duration * c.speed);
    const oc = new OfflineAudioContext(2, Math.max(1, Math.round(len * sr)), sr);
    // K-weighting: high-shelf (+4 dB above ~1.7 kHz) then high-pass (~38 Hz)
    const shelf = oc.createBiquadFilter(); shelf.type = 'highshelf'; shelf.frequency.value = 1681; shelf.gain.value = 4;
    const hp = oc.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 38; hp.Q.value = 0.5;
    shelf.connect(hp).connect(oc.destination);
    let placed = false;
    try {
      const a = await RS.decode.audioSink(c.mediaId);
      for await (const wb of a.sink.buffers(lo, lo + len)) {
        const n = oc.createBufferSource(); n.buffer = wb.buffer; n.connect(shelf);
        let when = wb.timestamp - lo, off = 0;
        if (when < 0) { off = -when; when = 0; }
        if (off < wb.buffer.duration) { n.start(when, off); placed = true; }
      }
      a.input.dispose();
    } catch {
      const bytes = await RS.native.readFile(m.path);
      const buf = await RS.engine.audioContext().decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
      const n = oc.createBufferSource(); n.buffer = buf; n.connect(shelf); n.start(0, lo); placed = true;
    }
    if (!placed) throw new Error('No audio in this range');
    const out = await oc.startRendering();
    const chans = [out.getChannelData(0), out.getChannelData(1)];
    const block = Math.round(0.4 * sr), hop = Math.round(0.1 * sr);
    const zs = [];
    for (let i = 0; i + block <= out.length; i += hop) {
      let z = 0;
      for (const ch of chans) { let sum = 0; for (let j = i; j < i + block; j++) sum += ch[j] * ch[j]; z += sum / block; }
      zs.push(z);
    }
    const lk = (z) => -0.691 + 10 * Math.log10(z);
    const abs = zs.filter((z) => lk(z) > -70);
    if (!abs.length) return -Infinity;
    const rel = lk(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
    const gated = abs.filter((z) => lk(z) > rel);
    return lk(gated.reduce((a, b) => a + b, 0) / gated.length);
  };

  L.dialog = () => {
    const clips = RS.selectedClips().filter((c) => c.type === 'audio');
    if (!clips.length) return RS.toast('Select audio clips to normalise (Alt-click the audio of a linked clip, or select both)');
    const target = RS.h('select', null, [[-14, '−14 LUFS — YouTube, Spotify, most online video'], [-16, '−16 LUFS — Apple Podcasts, Apple Music'], [-23, '−23 LUFS — EBU R128 broadcast'], [-24, '−24 LUFS — US broadcast (ATSC A/85)']].map(([v, l]) => RS.h('option', { value: v }, l)));
    const info = RS.h('div', { class: 'muted small' }, `${clips.length} audio clip(s). Each clip's Audio Gain is set so it measures at the target loudness.`);
    RS.modal({
      title: 'Normalize Loudness',
      body: RS.h('div', { class: 'form' }, RS.h('label', { class: 'form-row' }, RS.h('span', null, 'Target'), target), info),
      buttons: [{ label: 'Cancel' }, {
        label: 'Normalize', primary: true, onClick: () => { setTimeout(() => L.normalize(clips.map((c) => c.id), +target.value), 0); },
      }],
    });
  };

  L.normalize = async (ids, target) => {
    RS.emit('status', 'Measuring loudness…');
    const results = [];
    try {
      for (const id of ids) {
        const c = RS.getClip(id);
        if (!c) continue;
        const lufs = await L.measure(c);
        results.push({ id, lufs });
      }
    } catch (err) { RS.toast('Loudness measurement failed: ' + err.message, 'error'); RS.emit('status', ''); return; }
    RS.emit('status', '');
    const usable = results.filter((r) => isFinite(r.lufs));
    if (!usable.length) return RS.toast('The selected audio is silent');
    RS.commit('Normalize loudness', () => {
      for (const r of usable) RS.getClip(r.id).props.gain = +RS.clamp(target - r.lufs, -40, 30).toFixed(2);
    });
    RS.toast(usable.map((r) => `${RS.clipName(RS.getClip(r.id))}: ${r.lufs.toFixed(1)} → ${target} LUFS`).join(' · '), 'ok', 6000);
    return usable;
  };

  // ---------------- voice-over ----------------
  const V = RS.voiceover = { rec: null };
  V.isRecording = (trackId) => !!(V.rec && (!trackId || V.rec.trackId === trackId));
  V.toggle = async (trackId) => {
    if (V.rec) return V.stop();
    const tr = RS.getTrack(trackId);
    if (!tr || tr.kind !== 'audio' || tr.locked) return RS.toast('Choose an unlocked audio track to record into');
    try {
      if (RS.native && RS.native.askMic) await RS.native.askMic();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 192000 });
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const start = S.playhead;
      V.rec = { trackId, start, rec, stream, chunks, mime };
      RS.engine.setMonitorMuted(true); // avoid recording the program through the speakers
      rec.start(500);
      RS.engine.play(1);
      RS.emit('voiceover', true);
      RS.toast('Recording voice-over… press Space or click the mic again to stop (program sound is muted while recording)', 'warn', 5000);
    } catch (err) {
      V.rec = null;
      RS.toast('Microphone not available: ' + err.message, 'error', 6000);
    }
  };
  V.stop = async () => {
    const r = V.rec;
    if (!r) return;
    V.rec = null;
    await new Promise((res) => { r.rec.onstop = res; r.rec.stop(); });
    r.stream.getTracks().forEach((t) => t.stop());
    RS.engine.setMonitorMuted(false);
    if (S.playing) RS.engine.pause();
    RS.emit('voiceover', false);
    const blob = new Blob(r.chunks, { type: r.mime });
    if (!blob.size) return RS.toast('Nothing was recorded');
    const ext = r.mime.includes('mp4') ? 'm4a' : 'webm';
    const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ').replace(/:/g, '.');
    const name = `Voice-over ${stamp}.${ext}`;
    let src;
    if (RS.native) {
      const dir = await RS.native.appDir('recordings');
      const p = await RS.native.writeNew(dir, name, new Uint8Array(await blob.arrayBuffer()));
      src = { name: p.split('/').pop(), path: p, size: blob.size };
    } else src = { name, file: new File([blob], name, { type: r.mime }), size: blob.size };
    const [m] = await RS.media.importSources([src]);
    if (!m) return;
    RS.commit('Record voice-over', () => RS.ops.placeMedia(m.id, r.trackId, r.start, {}));
    RS.toast('Voice-over added to ' + RS.getTrack(r.trackId).name, 'ok');
  };
  RS.on('play-state', (p) => { if (!p && V.rec) V.stop(); });

  // ---------------- Audio Track Mixer ----------------
  const MX = RS.mixer = {};
  let root, stripsEl;
  const toDb = (v) => (v <= 0 ? -Infinity : 20 * Math.log10(v / 100));
  const fromDb = (db) => (db <= -60 ? 0 : Math.pow(10, db / 20) * 100);
  MX.init = (el) => {
    root = el;
    stripsEl = RS.h('div', { class: 'mixer-strips' });
    el.append(RS.h('div', { class: 'panel-toolbar' }, RS.h('span', { class: 'muted small' }, 'Track volume, pan, mute, solo and voice-over recording for the open sequence')), stripsEl);
    RS.on('change', (o) => { if (!o || o.source !== 'mixer') MX.render(); });
    RS.on('settings-change', MX.render);
    RS.on('voiceover', MX.render);
    MX.render();
    meterLoop();
  };
  function strip(tr, master) {
    const seq = S.project.seq;
    const vol = master ? (seq.masterDb ?? 0) : toDb(tr.volume ?? 100);
    const fader = RS.h('input', { type: 'range', class: 'fader', min: -60, max: 12, step: 0.5, value: isFinite(vol) ? vol : -60, title: 'Volume (dB) · double-click for 0 dB' });
    const dbLbl = RS.h('div', { class: 'db' }, (isFinite(vol) ? (vol > 0 ? '+' : '') + vol.toFixed(1) : '−∞') + ' dB');
    const setDb = (db) => {
      RS.beginEdit();
      if (master) seq.masterDb = db; else RS.getTrack(tr.id).volume = fromDb(db);
      dbLbl.textContent = (db <= -60 ? '−∞' : (db > 0 ? '+' : '') + db.toFixed(1)) + ' dB';
      RS.engine.applyMasterGain();
      RS.emit('change', { source: 'mixer' });
    };
    fader.addEventListener('input', () => setDb(+fader.value));
    fader.addEventListener('change', () => RS.endEdit(master ? 'Master volume' : 'Track volume'));
    fader.addEventListener('dblclick', () => { fader.value = 0; setDb(0); RS.endEdit('Reset volume'); });
    const meter = RS.h('canvas', { class: 'strip-meter', 'data-bus': master ? 'master' : tr.id });
    const box = RS.h('div', { class: 'strip' + (master ? ' master' : '') });
    if (!master) {
      const pan = RS.h('input', { type: 'range', class: 'pan', min: -100, max: 100, step: 1, value: tr.pan || 0, title: 'Pan · double-click to centre' });
      const panLbl = RS.h('div', { class: 'pan-lbl' }, panText(tr.pan || 0));
      pan.addEventListener('input', () => { RS.beginEdit(); RS.getTrack(tr.id).pan = +pan.value; panLbl.textContent = panText(+pan.value); RS.emit('change', { source: 'mixer' }); });
      pan.addEventListener('change', () => RS.endEdit('Track pan'));
      pan.addEventListener('dblclick', () => { pan.value = 0; RS.commit('Centre pan', () => { RS.getTrack(tr.id).pan = 0; }); });
      const btn = (label, key, title, cls) => { const b = RS.h('button', { class: 'ibtn ' + cls + (tr[key] ? ' on' : ''), title }, label); b.addEventListener('click', () => RS.commit(title, () => { const t = RS.getTrack(tr.id); t[key] = !t[key]; })); return b; };
      const rec = RS.h('button', { class: 'ibtn rec' + (RS.voiceover.isRecording(tr.id) ? ' on' : ''), title: 'Record voice-over on this track' }, RS.icon('mic'));
      rec.addEventListener('click', () => RS.voiceover.toggle(tr.id));
      box.append(RS.h('div', { class: 'strip-name' }, tr.name), pan, panLbl, RS.h('div', { class: 'strip-btns' }, btn('M', 'muted', 'Mute track', 'mute'), btn('S', 'solo', 'Solo track', 'solo'), rec));
    } else box.append(RS.h('div', { class: 'strip-name' }, 'Master'), RS.h('div', { class: 'pan-spacer' }));
    box.append(RS.h('div', { class: 'fader-row' }, fader, meter), dbLbl);
    return box;
  }
  const panText = (v) => (v === 0 ? 'C' : v < 0 ? 'L' + -v : 'R' + v);
  MX.render = () => {
    if (!stripsEl) return;
    stripsEl.innerHTML = '';
    for (const tr of RS.tracksOf('audio')) stripsEl.append(strip(tr, false));
    stripsEl.append(strip(null, true));
  };
  function meterLoop() {
    requestAnimationFrame(meterLoop);
    if (!root || root.offsetParent === null) return;
    for (const cv of root.querySelectorAll('.strip-meter')) {
      const dpr = window.devicePixelRatio || 1;
      const w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) continue;
      if (cv.width !== Math.round(w * dpr)) cv.width = Math.round(w * dpr);
      if (cv.height !== Math.round(h * dpr)) cv.height = Math.round(h * dpr);
      const g = cv.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = '#0d0f12'; g.fillRect(0, 0, w, h);
      const db = cv.dataset.bus === 'master' ? Math.max(...RS.engine.levels()) : RS.engine.busLevel(cv.dataset.bus);
      if (db > -54) {
        const f = RS.clamp((db + 54) / 54, 0, 1);
        const grad = g.createLinearGradient(0, h, 0, 0);
        grad.addColorStop(0, '#2fbf71'); grad.addColorStop(0.72, '#d8d23a'); grad.addColorStop(0.9, '#ff5a3c');
        g.fillStyle = grad;
        g.fillRect(0, h - f * h, w, f * h);
      }
    }
  }
})(window.RS);
