'use strict';
// Media import: probing duration/size, thumbnails, audio detection and waveform peaks.
(function (RS) {
  const S = RS.state;
  const EXT = {
    video: ['mp4', 'mov', 'm4v', 'webm', 'mkv', 'ogv'],
    audio: ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'flac', 'opus'],
    image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif'],
  };
  const PEAK_RATE = 100;                    // waveform samples per second
  const MAX_DECODE_BYTES = 400 * 1024 * 1024;
  const MAX_DECODE_SECONDS = 30 * 60;

  const M = RS.media = {};

  M.kindOf = (name) => {
    const ext = (name.split('.').pop() || '').toLowerCase();
    for (const k in EXT) if (EXT[k].includes(ext)) return k;
    return null;
  };

  M.pathToUrl = (p) => 'file://' + p.split('/').map(encodeURIComponent).join('/');

  // Probe with a media element. Resolves {duration, width, height} or rejects.
  function probe(url, kind) {
    return new Promise((resolve, reject) => {
      let el;
      const timer = setTimeout(() => done(new Error('Timed out reading file')), 20000);
      const done = (err, val) => {
        clearTimeout(timer);
        if (el && kind !== 'image') { el.removeAttribute('src'); el.load(); }
        err ? reject(err) : resolve(val);
      };
      if (kind === 'image') {
        el = new Image();
        el.onload = () => done(null, { duration: 0, width: el.naturalWidth || 1920, height: el.naturalHeight || 1080 });
        el.onerror = () => done(new Error('Unsupported image'));
        el.src = url;
        return;
      }
      el = document.createElement(kind === 'audio' ? 'audio' : 'video');
      el.preload = 'metadata';
      el.muted = true;
      el.onloadedmetadata = () => {
        let d = el.duration;
        if (!isFinite(d)) {
          // Some WebM files report Infinity until the end is seeked.
          el.ontimeupdate = () => {
            el.ontimeupdate = null;
            d = el.duration;
            done(null, { duration: isFinite(d) ? d : 0, width: el.videoWidth || 0, height: el.videoHeight || 0 });
          };
          el.currentTime = 1e9;
          return;
        }
        if (kind === 'video' && !el.videoWidth) {
          // A container with only audio (e.g. .m4v/.webm audio only)
          return done(null, { duration: d, width: 0, height: 0, audioOnly: true });
        }
        done(null, { duration: d, width: el.videoWidth || 0, height: el.videoHeight || 0 });
      };
      el.onerror = () => done(new Error('Unsupported or corrupt file (codec not supported)'));
      el.src = url;
    });
  }

  function makeThumb(url, kind, duration) {
    return new Promise((resolve) => {
      const W = 192;
      const finish = (src, sw, sh) => {
        try {
          const h = Math.max(1, Math.round(W * sh / sw));
          const c = document.createElement('canvas');
          c.width = W; c.height = h;
          c.getContext('2d').drawImage(src, 0, 0, W, h);
          resolve(c.toDataURL('image/jpeg', 0.72));
        } catch { resolve(null); }
      };
      if (kind === 'image') {
        const img = new Image();
        img.onload = () => finish(img, img.naturalWidth || 16, img.naturalHeight || 9);
        img.onerror = () => resolve(null);
        img.src = url;
        return;
      }
      const v = document.createElement('video');
      v.muted = true;
      v.preload = 'auto';
      const timer = setTimeout(() => { cleanup(); resolve(null); }, 15000);
      const cleanup = () => { clearTimeout(timer); v.removeAttribute('src'); v.load(); };
      v.onloadeddata = () => { v.currentTime = Math.min(duration * 0.1, 2); };
      v.onseeked = () => { finish(v, v.videoWidth, v.videoHeight); cleanup(); };
      v.onerror = () => { cleanup(); resolve(null); };
      v.src = url;
    });
  }

  async function readBytes(src) {
    if (src.file) return await src.file.arrayBuffer();
    if (src.path && RS.native) {
      const u8 = await RS.native.readFile(src.path);
      return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
    }
    return null;
  }

  // Decodes audio to build waveform peaks. Returns {hasAudio, peaks} or null when skipped.
  async function analyzeAudio(src, duration) {
    if ((src.size && src.size > MAX_DECODE_BYTES) || duration > MAX_DECODE_SECONDS) return null;
    let buf;
    try { buf = await readBytes(src); } catch { return null; }
    if (!buf) return null;
    let audio;
    try {
      const ctx = RS.engine.audioContext();
      audio = await ctx.decodeAudioData(buf);
    } catch {
      return { hasAudio: false, peaks: null };
    }
    const n = Math.ceil(audio.duration * PEAK_RATE);
    const peaks = new Uint8Array(n);
    const spp = audio.sampleRate / PEAK_RATE;
    for (let ch = 0; ch < Math.min(2, audio.numberOfChannels); ch++) {
      const data = audio.getChannelData(ch);
      for (let i = 0; i < n; i++) {
        const a = Math.floor(i * spp), b = Math.min(data.length, Math.floor((i + 1) * spp));
        let mx = 0;
        for (let j = a; j < b; j += 2) { const v = data[j] < 0 ? -data[j] : data[j]; if (v > mx) mx = v; }
        const q = Math.min(255, Math.round(Math.sqrt(mx) * 255)); // sqrt = more readable at low levels
        if (q > peaks[i]) peaks[i] = q;
      }
    }
    let loud = 0;
    for (let i = 0; i < n; i++) if (peaks[i] > loud) loud = peaks[i];
    return { hasAudio: true, peaks, peakRate: PEAK_RATE, silent: loud < 3 };
  }

  // sources: [{name, path?, file?, size?}]
  M.importSources = async (sources) => {
    const added = [];
    const failed = [];
    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      const kind = M.kindOf(src.name);
      if (!kind) { failed.push(src.name + ' (unknown type)'); continue; }
      if (src.path && S.project.media.some((m) => m.path === src.path)) {
        const existing = S.project.media.find((m) => m.path === src.path);
        added.push(existing);
        continue;
      }
      RS.emit('status', `Importing ${src.name} (${i + 1}/${sources.length})…`);
      const url = src.path ? M.pathToUrl(src.path) : URL.createObjectURL(src.file);
      let info;
      try { info = await probe(url, kind); } catch (err) { failed.push(src.name + ' — ' + err.message); continue; }
      let type = kind;
      if (info.audioOnly) type = 'audio';
      if (type !== 'image' && !(info.duration > 0)) { failed.push(src.name + ' (no duration)'); continue; }
      const m = {
        id: RS.uid('m'), name: src.name, type, path: src.path || null, size: src.size || (src.file && src.file.size) || 0,
        duration: type === 'image' ? 0 : info.duration, width: info.width, height: info.height,
        hasAudio: type === 'audio' ? true : type === 'video',
      };
      const rt = RS.runtime[m.id] = { url, thumb: null, peaks: null, offline: false };
      if (type !== 'image') {
        const a = await analyzeAudio(src, m.duration);
        if (a) {
          if (type === 'video') m.hasAudio = a.hasAudio;
          rt.peaks = a.peaks;
          rt.peakRate = a.peakRate;
        }
      }
      RS.commit('Import ' + m.name, () => { S.project.media.push(m); });
      added.push(m);
      RS.emit('media-change');
      if (type !== 'audio') {
        makeThumb(url, type, m.duration).then((t) => { rt.thumb = t; RS.emit('media-change'); RS.emit('change', { source: 'thumb' }); });
      }
    }
    RS.emit('status', '');
    if (failed.length) RS.toast('Could not import: ' + failed.join(', '), 'error', 6000);
    else if (added.length) RS.toast(`Imported ${added.length} item${added.length > 1 ? 's' : ''}`, 'ok');
    return added;
  };

  M.importDialog = async () => {
    if (RS.native) {
      const files = await RS.native.importDialog();
      if (!files || !files.length) return [];
      return M.importSources(files.filter((f) => f.ok));
    }
    return new Promise((resolve) => {
      const inp = RS.h('input', { type: 'file', multiple: true, accept: 'video/*,audio/*,image/*' });
      inp.onchange = () => resolve(M.importSources([...inp.files].map((f) => ({ name: f.name, file: f, size: f.size }))));
      inp.click();
    });
  };

  M.sourcesFromDataTransfer = (dt) => {
    const out = [];
    for (const f of dt.files || []) {
      const p = RS.native ? RS.native.pathForFile(f) : null;
      out.push(p ? { name: f.name, path: p, size: f.size, file: f } : { name: f.name, file: f, size: f.size });
    }
    return out;
  };

  // Rebuild runtime data (urls, thumbs, peaks) after a project is opened.
  M.hydrate = async () => {
    const list = S.project.media;
    let statuses = [];
    if (RS.native) statuses = await RS.native.stat(list.map((m) => m.path || ''));
    list.forEach((m, i) => {
      // Outside the desktop app there is no file-system access, so media must be relinked.
      const ok = !!(RS.native && m.path && statuses[i] && statuses[i].ok);
      RS.runtime[m.id] = { url: ok ? M.pathToUrl(m.path) : null, thumb: null, peaks: null, offline: !ok };
      if (ok && m.proxyPath) RS.runtime[m.id].proxyUrl = M.pathToUrl(m.proxyPath);
    });
    RS.emit('media-change');
    for (const m of list) {
      const rt = RS.runtime[m.id];
      if (rt.offline) continue;
      await M.refreshDerived(m);
    }
  };

  M.refreshDerived = async (m) => {
    const rt = RS.runtime[m.id];
    if (!rt || !rt.url) return;
    if (m.type !== 'audio') rt.thumb = await makeThumb(rt.url, m.type, m.duration);
    if (m.type !== 'image') {
      const a = await analyzeAudio({ path: m.path, file: rt.file, size: m.size }, m.duration);
      if (a) { rt.peaks = a.peaks; rt.peakRate = a.peakRate; }
    }
    RS.emit('media-change');
    RS.emit('change', { source: 'thumb' });
  };

  M.relink = async (m) => {
    let src;
    if (RS.native) {
      const files = await RS.native.importDialog();
      if (!files || !files[0] || !files[0].ok) return;
      src = files[0];
    } else {
      src = await new Promise((resolve) => {
        const inp = RS.h('input', { type: 'file' });
        inp.onchange = () => resolve(inp.files[0] ? { name: inp.files[0].name, file: inp.files[0], size: inp.files[0].size } : null);
        inp.click();
      });
      if (!src) return;
    }
    const url = src.path ? M.pathToUrl(src.path) : URL.createObjectURL(src.file);
    try {
      const info = await probe(url, m.type === 'audio' ? 'audio' : m.type);
      if (m.type !== 'image' && info.duration + 0.05 < m.duration) {
        const ok = await RS.confirm('Shorter file', 'The new file is shorter than the original. Clips may run past the end of the media. Relink anyway?', 'Relink');
        if (!ok) return;
      }
    } catch (err) {
      return RS.toast('Cannot relink: ' + err.message, 'error');
    }
    RS.commit('Relink ' + m.name, () => {
      const mm = RS.getMedia(m.id);
      mm.path = src.path || null;
      mm.name = src.name;
      mm.size = src.size || 0;
    });
    RS.runtime[m.id] = { url, thumb: null, peaks: null, offline: false, file: src.file };
    RS.engine.invalidate();
    await M.refreshDerived(RS.getMedia(m.id));
  };
})(window.RS);
