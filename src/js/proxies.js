'use strict';
// Proxies: small H.264 copies of video files for smooth editing. Export always uses the originals.
(function (RS) {
  const S = RS.state;
  const PX = RS.proxies = {};
  const MB = () => window.Mediabunny;
  PX.WIDTH = 960;

  PX.create = async (mediaIds) => {
    const list = mediaIds.map(RS.getMedia).filter((m) => m && m.type === 'video' && RS.runtime[m.id] && !RS.runtime[m.id].offline);
    if (!list.length) return RS.toast('Select video files in the Project panel to create proxies');
    if (!RS.native) return RS.toast('Proxies need the desktop app');
    const dir = await RS.native.appDir('proxies');
    const bar = RS.h('div', { class: 'progress-fill' });
    const label = RS.h('div', { class: 'muted' }, 'Starting…');
    let cancelled = false, current = null;
    const dlg = RS.modal({ title: 'Creating proxies', sticky: true, body: RS.h('div', null, RS.h('div', { class: 'progress' }, bar), label), buttons: [{ label: 'Cancel', danger: true, onClick: () => { cancelled = true; if (current) current.cancel(); return false; } }] });
    let made = 0;
    for (let i = 0; i < list.length && !cancelled; i++) {
      const m = list[i];
      label.textContent = `${m.name} (${i + 1}/${list.length})`;
      const w = Math.min(PX.WIDTH, m.width) & ~1, h = Math.max(2, Math.round(w * m.height / m.width / 2) * 2);
      const fileName = m.name.replace(/\.[^.]+$/, '') + `.proxy-${m.id.slice(-6)}.mp4`;
      let handle = null;
      try {
        const input = await RS.decode.openInput(m.id);
        const r = await RS.native.exportBeginPath(dir, fileName);
        handle = r.handle;
        let writes = Promise.resolve();
        const target = new (MB().StreamTarget)(new WritableStream({ write: (chunk) => (writes = writes.then(() => RS.native.exportWriteAt(r.handle, chunk.data, chunk.position))) }));
        const output = new (MB().Output)({ format: new (MB().Mp4OutputFormat)({ fastStart: false }), target });
        current = await MB().Conversion.init({ input, output, video: { width: w, height: h, fit: 'fill', codec: 'avc', bitrate: 2.5e6, keyFrameInterval: 1 }, audio: { discard: true } });
        if (!current.isValid) throw new Error('This file cannot be converted');
        current.onProgress = (p) => { bar.style.width = ((i + p) / list.length * 100).toFixed(1) + '%'; };
        await current.execute();
        await writes;
        const p = await RS.native.exportEnd(r.handle, true);
        handle = null;
        input.dispose();
        RS.commit('Create proxy', () => { RS.getMedia(m.id).proxyPath = p; });
        RS.runtime[m.id].proxyUrl = RS.media.pathToUrl(p);
        made++;
      } catch (err) {
        if (handle) await RS.native.exportEnd(handle, false).catch(() => {});
        if (!cancelled) RS.toast(`Proxy failed for ${m.name}: ${err.message}`, 'error', 6000);
      }
    }
    current = null;
    RS.decode.closeAll();
    dlg.close();
    RS.emit('media-change');
    if (made) {
      RS.toast(`Created ${made} prox${made > 1 ? 'ies' : 'y'} — turn on “Proxies” in the Program monitor to edit with them`, 'ok', 6000);
      if (!RS.engine.useProxies) PX.toggle(true);
    }
  };

  PX.toggle = (on) => {
    RS.engine.useProxies = on == null ? !RS.engine.useProxies : on;
    RS.engine.invalidate();
    RS.emit('proxies', RS.engine.useProxies);
    RS.toast(RS.engine.useProxies ? 'Playing proxies (export still uses full-quality originals)' : 'Playing original media');
  };
})(window.RS);
