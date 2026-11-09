// Real screenshots of the editor for the website (featured images, tutorials, the first-visit intro).
// Run: npx electron scripts/shoot.js <scene> [<scene> …]   (or "all"); writes src/assets/shots/<scene>.jpg
// Scenes are built with the same test media generator the test suite uses (tests/page-helpers.js),
// so no personal files are needed.
'use strict';
const { app, BrowserWindow } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(SRC, 'assets', 'shots');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'reelsmith-shots-')));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.wasm': 'application/wasm', '.m4a': 'audio/mp4' };
const serve = () => new Promise((resolve) => {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.startsWith('/__fixtures/')) p = path.join(ROOT, 'tests', 'fixtures', p.slice(12));
    else { if (p.endsWith('/')) p += 'index.html'; p = path.join(SRC, p); }
    fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
  }).listen(0, '127.0.0.1', () => resolve('http://127.0.0.1:' + srv.address().port + '/'));
});

// Each scene: { size: [w, h], intro?: true, mobile?: true, setup: async function run in the page }.
// setup runs inside the editor with window.T (test helpers) available.
const SCENES = require('./shots/scenes.js');

async function shoot(base, name) {
  const sc = SCENES[name];
  if (!sc) throw new Error('unknown scene ' + name + ' — known: ' + Object.keys(SCENES).join(', '));
  const [w, h] = sc.size || [1500, 888];
  const win = new BrowserWindow({ width: w, height: h, useContentSize: true, show: false, webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false, offscreen: false } });
  const wc = win.webContents;
  // A load can be aborted (ERR_FAILED/ERR_ABORTED) when the previous window or device emulation interferes: retry.
  const load = async () => { for (let k = 0; ; k++) { try { return await win.loadURL(base); } catch (e) { if (k === 3) throw e; await new Promise((r) => setTimeout(r, 400)); } } };
  await load();
  await wc.executeJavaScript(`localStorage.setItem('reelsmith.consent', JSON.stringify({ v: 1, ads: false, analytics: false, at: 'shot' })); ${sc.intro ? "localStorage.removeItem('reelsmith.intro')" : "localStorage.setItem('reelsmith.intro', 'seen')"}; 0`);
  if (sc.mobile) {
    wc.debugger.attach('1.3');
    await wc.debugger.sendCommand('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
    await wc.debugger.sendCommand('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  }
  await load();
  for (let i = 0; i < 200; i++) { if (await wc.executeJavaScript('!!(window.RS && RS.app && document.querySelector(".tl-scroller"))')) break; await new Promise((r) => setTimeout(r, 100)); }
  await wc.executeJavaScript(fs.readFileSync(path.join(ROOT, 'tests', 'page-helpers.js'), 'utf8'), true);
  await new Promise((r) => setTimeout(r, 500));
  if (SCENES.__helpers) await wc.executeJavaScript(`(${SCENES.__helpers.toString()})(); 0`, true);
  if (sc.setup) await wc.executeJavaScript(`(async ${sc.setup.toString().replace(/^async\s*/, '').replace(/^setup\s*/, 'function ')})()`, true);
  await new Promise((r) => setTimeout(r, sc.wait || 900));
  const img = await wc.capturePage();
  // Previews go to a temp folder (or RS_SHOT_DIR), never into the published site.
  const dir = sc.preview ? (process.env.RS_SHOT_DIR || os.tmpdir()) : OUT;
  const file = path.join(dir, (sc.file || name) + '.jpg');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, img.resize({ width: w }).toJPEG(84));
  console.log('wrote', file, (fs.statSync(file).size / 1024).toFixed(0) + ' KB');
  win.destroy();
}

app.whenReady().then(async () => {
  const base = await serve();
  let names = process.argv.slice(2).filter((a) => !a.startsWith('-') && !a.endsWith('.js'));
  if (!names.length || names[0] === 'all') names = Object.keys(SCENES).filter((n) => !n.startsWith('__') && !SCENES[n].preview);
  try { for (const n of names) await shoot(base, n); } catch (e) { console.error(e.stack || e); app.exit(1); return; }
  app.exit(0);
});
