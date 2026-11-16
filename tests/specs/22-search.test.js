// Site search (src/search.js + src/search-index.json from scripts/build-site.js): the header button,
// ⌘K / Ctrl+K and "/" open a dialog; typing filters tools, tutorials, blog posts, docs and pages.
const openPage = async (t, p = 'tools/') => { await t.win.loadURL(t.url + p); await t.until(`window.ReelsmithSearch ? 1 : 0`, 8000, 'search.js not loaded'); await t.sleep(200); };
const dialog = (t) => t.eval(`(() => { const b = document.querySelector('.rs-search-bg'); return !!b && !b.hidden; })()`);
const titles = (t) => t.eval(`[...document.querySelectorAll('.rs-search-list a b')].map((b) => b.textContent)`);
const results = (t) => t.until(`document.querySelectorAll('.rs-search-list a').length`, 5000, 'no results');

module.exports = {
  name: 'Site search',
  modes: ['web', 'phone'],
  tests: {
    'every website page has a search button in the header, and the index lists all kinds of pages': async (t) => {
      for (const p of ['tools/', 'blog/', 'docs/first-edit/', 'about/', 'contact/']) {
        await t.win.loadURL(t.url + p); await t.sleep(150);
        t.ok(await t.eval(`!!document.querySelector('.site-head [data-search]')`), 'no search button on /' + p);
      }
      const kinds = await t.eval(`fetch('/search-index.json').then((r) => r.json()).then((l) => [...new Set(l.map((e) => e.kind))].sort().join())`);
      t.eq(kinds, 'Blog,Docs,Page,Tool,Tutorial');
      t.eq(await t.eval(`document.documentElement.scrollWidth > innerWidth + 1`), false, 'header scrolls sideways');
    },
    'clicking the button opens it with popular links; typing finds pages, best match first': async (t) => {
      await openPage(t);
      await t.click('.site-head [data-search]', { mouse: !t.isTouch });
      await t.until(`document.querySelector('.rs-search-h') ? 1 : 0`, 5000, 'no popular links');
      t.ok(await dialog(t), 'dialog not open');
      t.eq(await t.eval(`document.activeElement === document.querySelector('.rs-search input')`), true, 'input not focused');
      await t.type('subtitles');
      await results(t);
      const first = (await titles(t))[0];
      t.ok(/subtitle/i.test(first), 'first result: ' + first);
      t.ok(await t.eval(`!!document.querySelector('.rs-search-kind')`), 'results show no kind badge');
    },
    'every word must match, and nothing found offers the contact page': async (t) => {
      await openPage(t);
      await t.eval(`ReelsmithSearch.open(); 0`);
      await t.type('trim video');
      await results(t);
      t.ok((await titles(t)).some((x) => /trim/i.test(x)), 'trim not found');
      await t.eval(`(() => { const i = document.querySelector('.rs-search input'); i.value = ''; i.dispatchEvent(new Event('input')); })()`);
      await t.type('zqxwv');
      await t.until(`document.querySelector('.rs-search-empty a[href="/contact/"]') ? 1 : 0`, 3000, 'no empty state');
    },
    'arrow keys move the selection, Enter opens it, Escape closes': async (t) => {
      await openPage(t);
      await t.eval(`ReelsmithSearch.open(); 0`);
      await t.type('export');
      await results(t);
      await t.key('Down');
      const sel = await t.eval(`document.querySelector('.rs-search-list a[aria-selected=true]').dataset.i`);
      t.eq(sel, '1');
      const href = await t.eval(`document.querySelector('.rs-search-list a[aria-selected=true]').getAttribute('href')`);
      await t.key('Return');
      await t.until(`location.pathname === ${JSON.stringify(href)} ? 1 : 0`, 8000, 'Enter did not open ' + href);
      await openPage(t);
      await t.eval(`ReelsmithSearch.open(); 0`);
      await t.key('Escape');
      t.eq(await dialog(t), false, 'Escape did not close');
    },
    'the "/" and ⌘K shortcuts open it on website pages, but not inside the editor': async (t) => {
      if (t.isPhone) return; // no hardware keyboard
      await openPage(t, 'blog/');
      await t.page(() => document.body.focus());
      await t.key('/');
      t.ok(await dialog(t), '"/" did not open search');
      await t.key('k', ['mod']);
      t.eq(await dialog(t), false, '⌘K did not toggle it closed');
      await t.key('k', ['mod']);
      t.ok(await dialog(t), '⌘K did not open search');
      // Editor (intro already dismissed by the runner): its own shortcuts keep working.
      await t.win.loadURL(t.url); await t.until('window.RS && RS.app ? 1 : 0', 20000); await t.sleep(400);
      t.ok(await t.eval(`!document.getElementById('intro')`), 'intro still showing');
      await t.page(() => document.body.focus());
      await t.key('k', ['mod']);
      await t.key('/');
      t.eq(await t.eval(`!!document.querySelector('.rs-search-bg:not([hidden])')`), false, 'search opened over the editor');
    },
    'the intro on the editor page has the search button too': async (t) => {
      await t.eval(`localStorage.removeItem('reelsmith.intro'); 0`);
      await t.win.loadURL(t.url); await t.until('window.RS && RS.app ? 1 : 0', 20000); await t.sleep(400);
      t.ok(await t.eval(`!!document.querySelector('#intro [data-search]')`), 'no search in the intro');
      await t.click('#intro [data-search]', { mouse: !t.isTouch });
      await t.until(`document.querySelector('.rs-search-bg:not([hidden]) .rs-search-h') ? 1 : 0`, 5000, 'did not open from the intro');
      await t.eval(`ReelsmithSearch.close(); localStorage.setItem('reelsmith.intro', 'seen'); 0`);
    },
  },
};
