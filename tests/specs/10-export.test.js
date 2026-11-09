// Exporting real video files and checking them with a decoder.
const probeOPFS = (t, name) => t.page(async (name) => {
  const f = await (await (await navigator.storage.getDirectory()).getFileHandle(name)).getFile();
  const inp = new Mediabunny.Input({ source: new Mediabunny.BlobSource(f), formats: Mediabunny.ALL_FORMATS });
  const v = await inp.getPrimaryVideoTrack(), a = await inp.getPrimaryAudioTrack();
  return { size: f.size, dur: await inp.computeDuration(), w: v && v.displayWidth, h: v && v.displayHeight, audio: !!a };
}, name);
const project = (t, w = 640, h = 360, secs = 3) => t.page(async (w, h, secs) => {
  const [m] = await T.import(await T.video({ name: 'clip.mp4', w, h, secs })); T.place(m.id, 'V1', 0);
}, w, h, secs);
const pickToOPFS = (t) => t.eval(`window.showSaveFilePicker = async (o) => { window.__picked = o.suggestedName; return (await navigator.storage.getDirectory()).getFileHandle(o.suggestedName, { create: true }); }; 0`);
const runExport = async (t, setup) => {
  await t.eval(`RS.cmd('export'); 0`);
  await t.until(`[...document.querySelectorAll('.modal-head')].some((h) => h.textContent === 'Export Settings')`, 5000, 'export dialog');
  if (setup) await t.page(setup);
  await t.eval(`[...document.querySelectorAll('.modal-foot button')].find((b) => b.textContent === 'Export').click(); 0`);
  await t.until(`[...document.querySelectorAll('.modal-head')].some((h) => h.textContent === 'Export complete')`, 120000, 'export did not finish');
  await t.eval(`document.querySelectorAll('.modal-foot .primary').forEach((b) => b.click()); 0`);
};
const setName = (n) => `(() => { const i = [...document.querySelectorAll('.modal input[type=text]')].find((x) => !x.readOnly); i.value = '${n}'; i.dispatchEvent(new Event('input')); })()`;

module.exports = {
  name: 'Export',
  tags: { 'export to a folder (desktop app)': { modes: ['desktop'] } },
  tests: {
    'MP4 export to a file you pick (Chrome / Edge)': async (t) => {
      if (!t.isWeb) t.skip('web only');
      await t.reset(); await project(t); await pickToOPFS(t);
      await runExport(t, new Function(`${setName('t-mp4')}`));
      t.eq(await t.eval('window.__picked'), 't-mp4.mp4');
      const p = await probeOPFS(t, 't-mp4.mp4');
      t.near(p.dur, 3, 0.15, 'duration'); t.eq([p.w, p.h], [640, 360]); t.ok(p.audio, 'audio track');
    },
    'export goes to Downloads when the browser has no file picker': async (t) => {
      if (!t.isWeb) t.skip('web only');
      await t.reset(); await project(t);
      await t.eval(`window.showSaveFilePicker = undefined; 0`);
      const n = t.downloads.length;
      await runExport(t);
      await t.sleep(500);
      const d = t.downloads[n];
      t.ok(d && d.state === 'completed' && d.size > 20000, 'download: ' + JSON.stringify(d));
    },
    'export only the In/Out range': async (t) => {
      if (!t.isWeb) t.skip('web only');
      await t.reset(); await project(t, 640, 360, 4); await pickToOPFS(t);
      await t.page(() => { RS.engine.seek(1, false); RS.cmd('markIn'); RS.engine.seek(2.5, false); RS.cmd('markOut'); });
      await runExport(t, new Function(`${setName('t-range')}; const r = [...document.querySelectorAll('.modal select')].find((s) => [...s.options].some((o) => o.value === 'io')); r.value = 'io'; r.dispatchEvent(new Event('change'));`));
      const p = await probeOPFS(t, 't-range.mp4');
      t.near(p.dur, 1.5, 0.15, 'range duration');
    },
    'vertical preset exports 1080×1920': async (t) => {
      if (!t.isWeb) t.skip('web only');
      await t.reset(); await project(t, 360, 640, 2); await pickToOPFS(t);
      await runExport(t, new Function(`${setName('t-vert')}; const s = document.querySelector('.modal select'); s.value = 'shorts'; s.dispatchEvent(new Event('change'));`));
      const p = await probeOPFS(t, 't-vert.mp4');
      t.eq([p.w, p.h], [1080, 1920]);
    },
    'cancelling the save dialog keeps the export settings open': async (t) => {
      if (!t.isWeb) t.skip('web only');
      await t.reset(); await project(t);
      await t.eval(`window.showSaveFilePicker = async () => { const e = new Error('x'); e.name = 'AbortError'; throw e; }; 0`);
      await t.eval(`RS.cmd('export'); 0`); await t.sleep(400);
      await t.eval(`[...document.querySelectorAll('.modal-foot button')].find((b) => b.textContent === 'Export').click(); 0`); await t.sleep(400);
      t.ok(await t.eval(`[...document.querySelectorAll('.modal-head')].some((h) => h.textContent === 'Export Settings')`));
      await t.page(() => T.closeModals());
    },
    'export dialog fits the screen': async (t) => {
      await t.reset(); await project(t);
      await t.eval(`RS.cmd('export'); 0`); await t.sleep(400);
      const r = await t.page(() => { const b = document.querySelector('.modal').getBoundingClientRect(); return { l: b.left, r: b.right, w: innerWidth, top: b.top, bottom: b.bottom, h: innerHeight }; });
      t.ok(r.l >= 0 && r.r <= r.w + 1 && r.top >= 0 && r.bottom <= r.h + 1, 'dialog off screen: ' + JSON.stringify(r));
      await t.page(() => T.closeModals());
    },
    'export to a folder (desktop app)': async (t) => {
      const fs = require('fs'), path = require('path');
      const dir = path.join(t.tmp, 'exports'); fs.mkdirSync(dir, { recursive: true });
      await t.reset(); await project(t);
      await t.eval(`localStorage.setItem('reelsmith.exportDir', ${JSON.stringify(dir)}); 0`);
      await runExport(t, new Function(`${setName('desk')}`));
      const f = path.join(dir, 'desk.mp4');
      t.ok(fs.existsSync(f) && fs.statSync(f).size > 20000, 'no file written to ' + f);
    },
  },
};
