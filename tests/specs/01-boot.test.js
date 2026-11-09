// The editor starts cleanly in every mode, with the right layout for the screen.
module.exports = {
  name: 'Startup and layout',
  tests: {
    'editor starts without errors': async (t) => {
      t.ok(await t.eval('!!(window.RS && RS.engine && RS.timeline && RS.inspector && RS.effects)'), 'modules missing');
      t.eq(t.errors.filter((e) => !/Autofocus|DevTools/.test(e)), [], 'console errors during startup');
    },
    'edition-specific parts': async (t) => {
      const s = await t.page(() => ({ web: !!RS.web, native: !!window.native, menubar: !!document.querySelector('.menubar'), links: !!document.querySelector('.topbar-links') }));
      if (t.isWeb) { t.ok(s.web && !s.native && s.menubar, 'web menu bar missing'); }
      else { t.ok(s.native && !s.web && !s.menubar && !s.links, 'desktop app must not show web parts'); }
    },
    'screen classes match the device': async (t) => {
      const cls = await t.eval('document.documentElement.className');
      t.eq(/\bcompact\b/.test(cls), t.isPhone, 'compact (phone) class');
      t.eq(/\btouch\b/.test(cls), t.isTouch, 'touch class');
    },
    'nothing wider than the screen': async (t) => {
      await t.reset();
      t.ok(!(await t.page(() => T.overflowX())), 'page scrolls sideways');
    },
    'all main panels exist and timeline has room': async (t) => {
      await t.reset();
      const r = await t.page(() => {
        const h = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height) : 0; };
        return { program: h('section[data-panels="program"]'), timeline: h('section[data-panels="timeline"]'), scroller: h('.tl-scroller'), vh: innerHeight };
      });
      t.gt(r.program, 150, 'program monitor height');
      t.gt(r.scroller, t.isPhone ? 200 : 180, 'visible timeline height');
    },
    'website links only on the start screen': async (t) => {
      if (!t.isWeb) t.skip('web only');
      await t.reset();
      t.eq(await t.eval(`getComputedStyle(document.getElementById('site-links')).display`), 'none', 'links leaked into the editor');
    },
  },
};
