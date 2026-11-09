// Electron side of the test suite: opens the editor in one mode and runs the spec files.
// Started by tests/run.js — do not run directly.
'use strict';
const { app, BrowserWindow, session } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const MODE = process.env.RS_TEST_MODE || 'web';
const SPECS = (process.env.RS_TEST_SPECS || '').split(',').filter(Boolean);
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'reelsmith-test-'));
const VIEWPORTS = { web: [1440, 900, false], phone: [390, 844, true], tablet: [820, 1180, true], desktop: [1440, 900, false] };
const out = (tag, o) => process.stdout.write(tag + ' ' + (typeof o === 'string' ? o : JSON.stringify(o)) + '\n');

app.setPath('userData', path.join(TMP, 'user-data'));
if (MODE === 'desktop') {
  // The desktop app saves exports and recordings under ~/Movies; keep tests away from the real folder.
  app.setPath('videos', path.join(TMP, 'Movies'));
  app.setPath('home', TMP);
}

// ---------------------------------------------------------------- http server for the web modes
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.wasm': 'application/wasm', '.m4a': 'audio/mp4' };
const apiHits = [];
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.startsWith('/api/')) {
        let b = ''; req.on('data', (d) => (b += d));
        req.on('end', () => { apiHits.push({ url: req.url, method: req.method, body: b }); res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"ok":true}'); });
        return;
      }
      if (p.startsWith('/__fixtures/')) p = path.join(__dirname, 'fixtures', p.slice(12));
      else { if (p.endsWith('/')) p += 'index.html'; p = path.join(SRC, p); }
      fs.readFile(p, (e, d) => {
        if (e) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d);
      });
    }).listen(0, '127.0.0.1', () => resolve('http://127.0.0.1:' + srv.address().port + '/'));
  });
}

// ---------------------------------------------------------------- context given to every test
function makeContext(win, url) {
  const wc = win.webContents;
  const errors = [];
  const downloads = [];
  wc.on('console-message', (e, lvl, message) => {
    const level = e.level !== undefined ? e.level : lvl;
    const text = e.message !== undefined ? e.message : message;
    if (level === 'error' || level === 3) errors.push(String(text).slice(0, 400));
  });
  wc.on('render-process-gone', (e, d) => errors.push('renderer crashed: ' + JSON.stringify(d)));
  wc.session.on('will-download', (e, item) => {
    const dest = path.join(TMP, 'downloads', Date.now() + '-' + item.getFilename());
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    item.setSavePath(dest);
    item.once('done', (ev, state) => downloads.push({ name: item.getFilename(), path: dest, state, size: fs.existsSync(dest) ? fs.statSync(dest).size : 0 }));
  });
  wc.on('will-prevent-unload', (e) => e.preventDefault()); // never block reloads on "unsaved changes"
  let dbg = null;
  const cdp = async (method, params) => { if (!dbg) { dbg = wc.debugger; dbg.attach('1.3'); } return dbg.sendCommand(method, params || {}); };

  const fail = (msg) => { const e = new Error(msg); e.isAssert = true; throw e; };
  const fmt = (v) => { try { return JSON.stringify(v); } catch { return String(v); } };
  const t = {
    mode: MODE, url, win, tmp: TMP, errors, downloads, apiHits,
    isPhone: MODE === 'phone', isTouch: MODE === 'phone' || MODE === 'tablet', isWeb: MODE !== 'desktop', isDesktop: MODE === 'desktop',
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    log: (...a) => out('@@LOG', a.map((x) => (typeof x === 'string' ? x : fmt(x))).join(' ')),
    // ----- run code in the page
    eval: (js) => wc.executeJavaScript(js, true),
    // t.page(async (a, b) => {...}, a, b) runs the function inside the editor and returns its (JSON) result.
    page: (fn, ...a) => wc.executeJavaScript(`(${fn.toString()})(...${JSON.stringify(a)})`, true),
    // ----- assertions
    ok: (cond, msg) => { if (!cond) fail(msg || 'expected a true value'); },
    eq: (a, b, msg) => { if (fmt(a) !== fmt(b)) fail(`${msg ? msg + ': ' : ''}expected ${fmt(b)}, got ${fmt(a)}`); },
    near: (a, b, tol, msg) => { if (!(Math.abs(a - b) <= tol)) fail(`${msg ? msg + ': ' : ''}expected ${b} ± ${tol}, got ${a}`); },
    gt: (a, b, msg) => { if (!(a > b)) fail(`${msg ? msg + ': ' : ''}expected > ${b}, got ${a}`); },
    lt: (a, b, msg) => { if (!(a < b)) fail(`${msg ? msg + ': ' : ''}expected < ${b}, got ${a}`); },
    skip: (why) => { const e = new Error(why); e.isSkip = true; throw e; },
    // Wait until fn() (run in the page) returns a truthy value.
    until: async (js, ms = 10000, msg) => {
      const end = Date.now() + ms;
      for (;;) { const v = await wc.executeJavaScript(js, true).catch(() => null); if (v) return v; if (Date.now() > end) fail((msg || 'timed out waiting for') + ': ' + js.slice(0, 120)); await new Promise((r) => setTimeout(r, 100)); }
    },
    // ----- real input (mouse, keyboard, touch)
    box: (sel, i = 0) => wc.executeJavaScript(`(() => { const e = document.querySelectorAll(${JSON.stringify(sel)})[${i}]; if (!e) return null; e.scrollIntoView({ block: 'nearest', inline: 'nearest' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, left: r.left, top: r.top, right: r.right, bottom: r.bottom }; })()`),
    click: async (sel, opts = {}) => {
      const b = typeof sel === 'string' ? await t.box(sel, opts.index || 0) : sel;
      if (!b) fail('element not found: ' + sel);
      if (t.isTouch && !opts.mouse) return t.tap(b.x, b.y);
      const x = Math.round(b.x + (opts.dx || 0)), y = Math.round(b.y + (opts.dy || 0));
      const mods = opts.modifiers || [];
      wc.sendInputEvent({ type: 'mouseMove', x, y });
      for (let n = 1; n <= (opts.count || 1); n++) {
        wc.sendInputEvent({ type: 'mouseDown', x, y, button: opts.button || 'left', clickCount: n, modifiers: mods });
        wc.sendInputEvent({ type: 'mouseUp', x, y, button: opts.button || 'left', clickCount: n, modifiers: mods });
      }
      await t.sleep(120);
    },
    dblclick: (sel, opts = {}) => (t.isTouch && !opts.mouse ? t.doubleTap(sel, opts.index || 0) : t.click(sel, Object.assign({ count: 2 }, opts))),
    rightClick: (sel) => t.click(sel, { button: 'right', mouse: true }),
    drag: async (from, to, steps = 10) => {
      const a = typeof from === 'string' ? await t.box(from) : from, b = typeof to === 'string' ? await t.box(to) : to;
      if (t.isTouch) return t.touchDrag(a, b, steps);
      wc.sendInputEvent({ type: 'mouseDown', x: Math.round(a.x), y: Math.round(a.y), button: 'left', clickCount: 1 });
      for (let i = 1; i <= steps; i++) { wc.sendInputEvent({ type: 'mouseMove', x: Math.round(a.x + (b.x - a.x) * i / steps), y: Math.round(a.y + (b.y - a.y) * i / steps), button: 'left' }); await t.sleep(16); }
      wc.sendInputEvent({ type: 'mouseUp', x: Math.round(b.x), y: Math.round(b.y), button: 'left', clickCount: 1 });
      await t.sleep(150);
    },
    key: async (key, modifiers = []) => {
      const mods = modifiers.map((m) => (m === 'mod' ? (process.platform === 'darwin' ? 'meta' : 'control') : m));
      wc.sendInputEvent({ type: 'keyDown', keyCode: key, modifiers: mods });
      if (key.length === 1) wc.sendInputEvent({ type: 'char', keyCode: key, modifiers: mods });
      wc.sendInputEvent({ type: 'keyUp', keyCode: key, modifiers: mods });
      await t.sleep(80);
    },
    type: async (text) => { for (const ch of text) { wc.sendInputEvent({ type: 'char', keyCode: ch }); } await t.sleep(80); },
    touch: (type, x, y) => cdp('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] }),
    // Taps go through Chromium's gesture pipeline (like a real finger), so they produce clicks reliably.
    tap: async (x, y) => { await t.touch('touchStart', x, y); await t.sleep(30); await t.touch('touchEnd'); await t.sleep(220); },
    doubleTap: async (sel, index = 0) => { const b = typeof sel === 'string' ? await t.box(sel, index) : sel; if (!b) fail('element not found: ' + sel); await t.touch('touchStart', b.x, b.y); await t.touch('touchEnd'); await t.sleep(80); await t.touch('touchStart', b.x, b.y); await t.touch('touchEnd'); await t.sleep(300); },
    touchDrag: async (a, b, steps = 10) => { await t.touch('touchStart', a.x, a.y); for (let i = 1; i <= steps; i++) { await t.touch('touchMove', a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps); await t.sleep(16); } await t.touch('touchEnd'); await t.sleep(250); },
    longPress: async (sel) => { const b = typeof sel === 'string' ? await t.box(sel) : sel; await t.touch('touchStart', b.x, b.y); await t.sleep(800); await t.touch('touchEnd'); await t.sleep(250); },
    // ----- app helpers
    reload: async () => { await wc.reload(); await t.until('window.RS && RS.app && document.querySelector(".tl-scroller") ? 1 : 0', 15000, 'editor did not start'); await injectHelpers(wc); await t.sleep(300); },
    // A clean, empty project with the start screen closed.
    reset: async () => { await t.eval(`(() => { document.querySelectorAll('.modal-back,.ctx-menu,.menu-drop').forEach((m) => m.remove()); if (RS.help.isOpen()) RS.help.close(); if (RS.web) RS.web.hideHome(); if (RS.touch) RS.touch.closeSheet(); RS.state.dirty = false; RS.app.setProject(RS.newProject(), null); RS.engine.seek(0, false); return 1; })()`); await t.sleep(150); },
    shot: async (name) => { const img = await wc.capturePage(); const f = path.join(TMP, 'shots', MODE + '-' + name + '.png'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, img.toPNG()); return f; },
    cdp,
  };
  return t;
}

async function injectHelpers(wc) {
  await wc.executeJavaScript(fs.readFileSync(path.join(__dirname, 'page-helpers.js'), 'utf8'), true);
}

// ---------------------------------------------------------------- main
process.on('unhandledRejection', (err) => { out('@@RESULT', { mode: MODE, spec: '(runner)', test: 'start', ok: false, msg: 'runner error: ' + ((err && err.stack) || err) }); app.exit(1); });
async function openWeb(url) {
  const [w, h, mobile] = VIEWPORTS[MODE];
  const win = new BrowserWindow({ width: w, height: h, useContentSize: true, show: !!process.env.RS_TEST_SHOW, webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false } });
  const t = makeContext(win, url);
  // Load first: attaching the debugger to the initial blank page fails when Chromium swaps processes
  // on the first navigation ("target closed"). Then emulate the device and load again.
  await win.loadURL(url);
  // Pre-answer the cookie banner so it does not cover controls (tests/specs/15-consent tests the banner itself).
  await win.webContents.executeJavaScript(`try { localStorage.setItem('reelsmith.consent', JSON.stringify({ v: 1, ads: false, analytics: false, at: 'test' })); localStorage.setItem('reelsmith.intro', 'seen'); } catch {} 0`);
  if (!mobile) await win.loadURL(url);
  if (mobile) {
    await t.cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
    await t.cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await t.cdp('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    await win.loadURL(url);
  }
  await t.until('window.RS && RS.app && document.querySelector(".tl-scroller") ? 1 : 0', 20000, 'editor did not start');
  await injectHelpers(win.webContents);
  await t.sleep(400);
  return { win, t };
}

app.whenReady().then(async () => {
  let win, url;
  const [w, h] = VIEWPORTS[MODE];
  if (MODE === 'desktop') {
    require(path.join(ROOT, 'main.js'));
    for (let i = 0; i < 100 && !BrowserWindow.getAllWindows().length; i++) await new Promise((r) => setTimeout(r, 100));
    win = BrowserWindow.getAllWindows()[0];
    win.webContents.setBackgroundThrottling(false);
    if (!process.env.RS_TEST_SHOW) win.hide();
    win.setContentSize(w, h);
    url = win.webContents.getURL();
  } else url = await serve();
  let t = null;
  if (MODE === 'desktop') {
    t = makeContext(win, url);
    await t.until('window.RS && RS.app && document.querySelector(".tl-scroller") ? 1 : 0', 20000, 'editor did not start');
    await injectHelpers(win.webContents);
    await t.sleep(500);
  }

  for (const file of SPECS) {
    const spec = require(path.join(__dirname, 'specs', file));
    const name = spec.name || file;
    if (spec.modes && !spec.modes.includes(MODE)) continue;
    // Web modes: every spec file gets a fresh window (like running each test class in its own process),
    // so state left by one file — storage, emulator touch state — can never affect the next.
    if (MODE !== 'desktop') {
      if (win) { const old = win; setTimeout(() => old.destroy(), 0); }
      try { ({ win, t } = await openWeb(url)); } catch (err) { out('@@RESULT', { mode: MODE, spec: name, test: '(open window)', ok: false, msg: err.stack || String(err) }); continue; }
    }
    if (spec.before) { try { await spec.before(t); } catch (err) { out('@@RESULT', { mode: MODE, spec: name, test: '(setup)', ok: false, msg: err.stack || String(err) }); continue; } }
    for (const [title, fn] of Object.entries(spec.tests)) {
      const tags = spec.tags && spec.tags[title] || {};
      if (tags.modes && !tags.modes.includes(MODE)) continue;
      if (tags.slow && !process.env.RS_TEST_SLOW) { out('@@RESULT', { mode: MODE, spec: name, test: title, ok: true, skipped: true, msg: 'slow — run with --slow' }); continue; }
      const errBefore = t.errors.length;
      const start = Date.now();
      let ok = true, msg = '', skipped = false;
      try {
        await Promise.race([fn(t), new Promise((_, rej) => setTimeout(() => rej(new Error('test timed out after ' + ((tags.timeout || 60000) / 1000) + ' s')), tags.timeout || 60000))]);
        const newErr = t.errors.slice(errBefore).filter((e) => !(spec.allowErrors || []).some((re) => re.test(e)));
        if (newErr.length) { ok = false; msg = 'console errors:\n' + newErr.join('\n'); }
      } catch (err) {
        if (err.isSkip) { skipped = true; msg = err.message; } else { ok = false; msg = err.isAssert ? err.message : (err.stack || String(err)); }
        try { await t.shot(name.replace(/\W+/g, '_') + '-' + title.replace(/\W+/g, '_')); } catch { /* ignore */ }
      }
      out('@@RESULT', { mode: MODE, spec: name, test: title, ok, skipped, msg, ms: Date.now() - start });
    }
    if (spec.after) { try { await spec.after(t); } catch { /* ignore */ } }
  }
  // Close windows first; Chromium may still be flushing files into the temp folder.
  for (const w of BrowserWindow.getAllWindows()) { try { w.destroy(); } catch { /* ignore */ } }
  await new Promise((r) => setTimeout(r, 300));
  try { fs.rmSync(TMP, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* leftover temp files are harmless */ }
  app.exit(0);
});
