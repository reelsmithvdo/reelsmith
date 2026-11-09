// Export as GIF and Export Audio (src/js/quicktools.js): real files, checked by decoding them in the browser.
const project = (t, { secs = 2, w = 640, h = 360, freq = 440 } = {}) => t.page(async (secs, w, h, freq) => {
  const [m] = await T.import(await T.video({ name: 'clip.mp4', w, h, secs, freq, bg: '#1060e0', hue: 30 }));
  T.place(m.id, 'V1', 0);
}, secs, w, h, freq);
const pickToOPFS = (t) => t.eval(`window.showSaveFilePicker = async (o) => { window.__picked = o.suggestedName; return (await navigator.storage.getDirectory()).getFileHandle(o.suggestedName, { create: true }); }; 0`);
const opfsBytes = (t, name) => t.page(async (name) => { const f = await (await (await navigator.storage.getDirectory()).getFileHandle(name)).getFile(); return f.size; }, name);
const menuItem = async (t, label) => {
  await t.click('.menubar-btn', { index: 0, mouse: !t.isTouch }); // File (opens on pointer down, like a desktop app)
  const i = await t.eval(`[...document.querySelectorAll('.menu-drop .menu-item')].findIndex((x) => x.textContent.includes(${JSON.stringify(label)}))`);
  if (i < 0) throw new Error('menu item not found: ' + label);
  await t.click('.menu-drop .menu-item', { index: i, mouse: !t.isTouch });
  await t.sleep(250);
};

module.exports = {
  name: 'GIF and audio export',
  modes: ['web', 'phone', 'tablet'],
  tests: {
    'GIF: the file decodes, has the right size, loops, and shows the video colours': async (t) => {
      await t.reset(); await project(t, { secs: 2 });
      const r = await t.page(async () => {
        const bytes = await RS.quick.exportGif({ t0: 0, t1: 2, width: 320, fps: 10, returnBytes: true });
        const head = String.fromCharCode(...bytes.slice(0, 6));
        const loop = new TextDecoder().decode(bytes.slice(0, 120)).includes('NETSCAPE2.0');
        const frames = bytes.reduce((n, b, i) => n + (b === 0x21 && bytes[i + 1] === 0xf9 && bytes[i + 2] === 0x04 ? 1 : 0), 0);
        const img = new Image(); img.src = URL.createObjectURL(new Blob([bytes], { type: 'image/gif' }));
        await img.decode();
        const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
        const corner = [...g.getImageData(4, cv.height - 6, 1, 1).data].slice(0, 3);
        return { head, loop, frames, w: img.naturalWidth, h: img.naturalHeight, last: bytes[bytes.length - 1], corner, size: bytes.length };
      });
      t.eq([r.head, r.loop, r.w, r.h, r.last], ['GIF89a', true, 320, 180, 0x3b]);
      t.ok(r.frames >= 10 && r.frames <= 20, 'frames: ' + r.frames);
      t.ok(r.corner[2] > 150 && r.corner[0] < 80, 'background should be blue, got ' + r.corner);
      t.ok(r.size < 2e6, 'GIF too big: ' + r.size);
    },
    'GIF: File ▸ Export as GIF… saves a file through the real dialog': async (t) => {
      if (t.isPhone) t.skip('menu bar is replaced on phones');
      await t.reset(); await project(t, { secs: 1 }); await pickToOPFS(t);
      await menuItem(t, 'Export as GIF');
      t.ok(await t.eval(`[...document.querySelectorAll('.modal-head')].some((h) => h.textContent === 'Export as GIF')`), 'dialog did not open');
      await t.eval(`[...document.querySelectorAll('.modal-foot button')].find((b) => b.textContent === 'Export GIF').click(); 0`);
      await t.until(`!document.querySelector('.modal-back') && window.__picked ? 1 : 0`, 60000, 'GIF export did not finish');
      t.ok(/\.gif$/.test(await t.eval('window.__picked')), 'file name');
      t.ok((await opfsBytes(t, await t.eval('window.__picked'))) > 1000, 'file is empty');
    },
    'Audio: WAV has the sequence length and the sound of the clip': async (t) => {
      await t.reset(); await project(t, { secs: 2 });
      const r = await t.page(async () => {
        const bytes = await RS.quick.exportAudio({ t0: 0, t1: 2, format: 'wav', returnBytes: true });
        const ac = new OfflineAudioContext(2, 48000, 48000);
        const buf = await ac.decodeAudioData(bytes.buffer.slice(0));
        const d = buf.getChannelData(0); let peak = 0; for (let i = 0; i < d.length; i += 7) peak = Math.max(peak, Math.abs(d[i]));
        return { tag: String.fromCharCode(...bytes.slice(8, 12)), dur: buf.duration, ch: buf.numberOfChannels, peak };
      });
      t.eq([r.tag, r.ch], ['WAVE', 2]);
      t.near(r.dur, 2, 0.05, 'duration');
      t.ok(r.peak > 0.1, 'silent audio: ' + r.peak);
    },
    'Audio: AAC .m4a decodes (where the browser can encode AAC)': async (t) => {
      if (!(await t.eval(`RS.quick.canM4A()`))) t.skip('no AAC encoder');
      await t.reset(); await project(t, { secs: 2 });
      const r = await t.page(async () => {
        const bytes = await RS.quick.exportAudio({ t0: 0, t1: 2, format: 'm4a', returnBytes: true });
        const inp = new Mediabunny.Input({ source: new Mediabunny.BufferSource(bytes), formats: Mediabunny.ALL_FORMATS });
        const a = await inp.getPrimaryAudioTrack(), v = await inp.getPrimaryVideoTrack();
        return { dur: await inp.computeDuration(), audio: !!a, video: !!v, size: bytes.length };
      });
      t.ok(r.audio && !r.video, 'should be audio only');
      t.near(r.dur, 2, 0.1, 'duration');
    },
    'Audio: a muted track is left out': async (t) => {
      await t.reset(); await project(t, { secs: 1 });
      const peak = await t.page(async () => {
        RS.state.project.seq.tracks.filter((x) => x.kind === 'audio' || x.type === 'audio').forEach((x) => { x.muted = true; });
        const bytes = await RS.quick.exportAudio({ t0: 0, t1: 1, format: 'wav', returnBytes: true });
        const v = new DataView(bytes.buffer); let p = 0; for (let o = 44; o < bytes.length; o += 2) p = Math.max(p, Math.abs(v.getInt16(o, true)));
        return p;
      });
      t.eq(peak, 0, 'muted audio was exported');
    },
    'an empty timeline explains what to do instead of exporting': async (t) => {
      await t.reset();
      await t.eval(`RS.cmd('exportGif'); 0`); await t.sleep(200);
      t.ok(!(await t.eval(`!!document.querySelector('.modal-back')`)), 'dialog opened on an empty timeline');
      t.ok(/Add clips/.test(await t.eval(`T.toast()`) || ''), 'no hint shown');
    },
  },
};
