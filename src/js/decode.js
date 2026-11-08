'use strict';
// Frame-accurate decoding (WebCodecs via the bundled mediabunny library). Used by the fast exporter
// and the mask tracker. Files are read in byte ranges through the main process.
(function (RS) {
  const D = RS.decode = {};
  const MB = () => window.Mediabunny;

  D.available = () => !!(MB() && window.VideoDecoder && window.VideoEncoder);

  D.openInput = async (mediaId) => {
    const m = RS.getMedia(mediaId);
    const rt = RS.runtime[mediaId] || {};
    if (!m) throw new Error('Media not found');
    let source;
    if (m.path && RS.native) {
      const size = await RS.native.fileSize(m.path);
      source = new (MB().CustomSource)({ getSize: () => size, read: (a, b) => RS.native.readRange(m.path, a, b), prefetchProfile: 'fileSystem', maxCacheSize: 64 * 1024 * 1024 });
    } else if (rt.file) {
      source = new (MB().BlobSource)(rt.file);
    } else throw new Error('No readable source for ' + m.name);
    return new (MB().Input)({ source, formats: MB().ALL_FORMATS });
  };

  D.videoSink = async (mediaId) => {
    const input = await D.openInput(mediaId);
    const track = await input.getPrimaryVideoTrack();
    if (!track || !(await track.canDecode())) { input.dispose(); throw new Error('Video codec cannot be decoded'); }
    return { input, track, sink: new (MB().VideoSampleSink)(track) };
  };

  D.audioSink = async (mediaId) => {
    const input = await D.openInput(mediaId);
    const track = await input.getPrimaryAudioTrack();
    if (!track || !(await track.canDecode())) { input.dispose(); throw new Error('Audio codec cannot be decoded'); }
    return { input, track, sink: new (MB().AudioBufferSink)(track) };
  };

  // Fallback frame provider using a <video> element and exact seeks (slower, works for any playable file).
  D.elementFrames = (mediaId) => {
    const rt = RS.runtime[mediaId];
    const v = document.createElement('video');
    v.muted = true; v.preload = 'auto'; v.src = rt.url;
    let ready = new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error('Cannot load video')); });
    return {
      async at(t) {
        await ready;
        if (Math.abs(v.currentTime - t) > 1e-4) {
          await new Promise((res) => { const done = () => { v.removeEventListener('seeked', done); res(); }; v.addEventListener('seeked', done); v.currentTime = t; });
        }
        return v;
      },
      close() { v.removeAttribute('src'); v.load(); },
      el: v,
    };
  };

  D.closeAll = () => { if (RS.native && RS.native.closeReads) RS.native.closeReads(); };
})(window.RS);
