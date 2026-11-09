// In-app Help Center and the website pages.
module.exports = {
  name: 'Help and website',
  tests: {
    'help center opens, searches and shows an article': async (t) => {
      await t.reset();
      await t.eval(`RS.cmd('help'); 0`); await t.sleep(300);
      t.ok(await t.eval('RS.help.isOpen()'));
      await t.page(() => { const s = document.querySelector('.kb-search'); s.value = 'captions'; s.dispatchEvent(new Event('input')); });
      await t.sleep(200);
      t.gt(await t.eval(`document.querySelectorAll('.kb-item.result').length`), 0, 'no search results');
      await t.eval(`document.querySelector('.kb-item.result').click(); 0`); await t.sleep(200);
      t.gt(await t.eval(`document.querySelector('.kb-body').textContent.length`), 200, 'article empty');
      await t.eval('RS.help.close(); 0');
    },
    'help shows the right edition': async (t) => {
      const ids = await t.eval(`RS.HELP_ARTICLES.map((a) => a.id)`);
      if (t.isWeb) { t.ok(ids.includes('browser-edition') && !ids.includes('install'), 'web help'); }
      else { t.ok(ids.includes('install') && !ids.includes('browser-edition'), 'desktop help'); }
      t.ok(!(await t.eval(`RS.HELP_ARTICLES.some((a) => /\\{\\{web:/.test(a.body))`)), 'unresolved {{web:|desktop:}} markers');
    },
    'website pages load': async (t) => {
      if (t.mode !== 'web') t.skip('checked once, in web mode');
      const pages = ['features/', 'docs/', 'docs/captions/', 'tutorials/', 'tutorials/remove-video-background/', 'blog/', 'about/', 'privacy/', 'terms/', 'sitemap.xml', 'robots.txt'];
      const r = await t.page(async (pages) => Promise.all(pages.map(async (p) => { const res = await fetch('/' + p); const txt = await res.text(); return [p, res.status, (txt.match(/<title>([^<]*)/) || [])[1] || txt.length]; })), pages);
      t.eq(r.filter((x) => x[1] !== 200).map((x) => x[0]), [], 'pages not found');
    },
  },
};
