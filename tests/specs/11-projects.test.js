// Saving and reopening projects in the browser, media reconnecting, recovery of unsaved work.
module.exports = {
  name: 'Projects',
  modes: ['web', 'phone', 'tablet'],
  tests: {
    'save in the browser and reopen after reload': async (t) => {
      await t.reset();
      await t.page(async () => {
        // A file handle like Chrome's picker gives (origin-private file system).
        const f0 = await T.video({ name: 'kept.mp4', secs: 2 });
        const h = await (await navigator.storage.getDirectory()).getFileHandle('kept.mp4', { create: true });
        const w = await h.createWritable(); await w.write(f0); await w.close();
        const f = await h.getFile();
        const [m] = await RS.media.importSources([{ name: f.name, file: f, size: f.size, handle: h }]);
        T.place(m.id, 'V1', 0);
        RS.commit('n', () => { RS.state.project.name = 'Test Project ' + Date.now(); });
        await RS.cmd('save');
      });
      await t.until(`RS.state.filePath && RS.state.filePath.startsWith('browser:') && !RS.state.dirty`, 3000, 'not saved');
      const name = await t.eval('RS.state.project.name');
      await t.reload();
      await t.page(() => RS.web.home()); await t.sleep(600);
      const cards = await t.eval(`[...document.querySelectorAll('.home-card-name')].map((e) => e.textContent)`);
      t.ok(cards.includes(name), 'not in Recent projects: ' + JSON.stringify(cards));
      const i = cards.indexOf(name);
      await t.click('.home-card', { index: i });
      await t.until(`RS.state.project.name === ${JSON.stringify(name)} && !RS.web.isHomeOpen()`, 5000, 'did not open');
      t.eq(await t.eval(`T.clips('video').length`), 1);
      t.ok(await t.eval(`!RS.runtime[RS.state.project.media[0].id].offline`), 'media did not reconnect');
      await t.until(`(async () => (await T.frameAt(1)).lum > 5)()`, 8000, 'reopened clip renders black');
    },
    'recover unsaved work from the start screen': async (t) => {
      await t.reset();
      await t.page(async () => { const [m] = await T.import(await T.png()); T.place(m.id, 'V1', 0); RS.commit('n', () => { RS.state.project.name = 'Unsaved Work'; }); });
      await t.sleep(1900); // autosave is debounced
      await t.reload();
      await t.page(() => RS.web.home()); await t.sleep(400);
      t.ok(/Recover “Unsaved Work”/.test(await t.eval(`document.querySelector('.home-actions').textContent`)), 'no recovery button');
      await t.page(() => RS.web.hideHome());
    },
    'download a project file and open it again': async (t) => {
      await t.reset();
      await t.page(() => { RS.commit('c', () => { RS.ops.addCaption(1, 2, 'Round trip'); RS.state.project.name = 'File Project'; }); });
      const n = t.downloads.length;
      await t.eval(`RS.cmd('downloadProject'); 0`);
      for (let i = 0; i < 30 && t.downloads.length === n; i++) await t.sleep(100);
      const d = t.downloads[n];
      t.ok(d && /\.rsproj$/.test(d.name), 'no .rsproj download');
      const text = require('fs').readFileSync(d.path, 'utf8');
      await t.reset();
      const ok = await t.page(async (txt) => RS.app.loadProjectText(txt, null), text);
      t.ok(ok, 'could not open the downloaded file');
      t.eq(await t.eval(`[RS.state.project.name, T.clips('caption')[0].text]`), ['File Project', 'Round trip']);
    },
    'delete a project from Recent': async (t) => {
      await t.page(() => RS.web.home()); await t.sleep(500);
      const n = await t.eval(`document.querySelectorAll('.home-card').length`);
      if (!n) t.skip('no saved projects');
      await t.page(async () => { const id = (await RS.web.listProjects())[0].id; await RS.web.deleteSaved(id); });
      await t.page(() => RS.web.home()); await t.sleep(500);
      t.eq(await t.eval(`document.querySelectorAll('.home-card').length`), n - 1);
      await t.page(() => RS.web.hideHome());
    },
  },
};
