// Renders build/icon.svg into build/icon.png (1024), build/icon.icns (macOS) and small PNGs for the app UI.
// Run:  npm run icon
const { app, BrowserWindow } = require('electron');
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
app.whenReady().then(async () => {
  const w = new BrowserWindow({ show: false, transparent: true, webPreferences: { offscreen: true } });
  await w.loadURL('data:text/html,<html><body style="margin:0;background:transparent"></body></html>');
  const svg = fs.readFileSync(path.join(ROOT, 'build', 'icon.svg'), 'utf8');
  const render = (size) => w.webContents.executeJavaScript(`new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = ${size}; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, ${size}, ${size}); res(c.toDataURL('image/png').split(',')[1]); };
    img.onerror = () => rej(new Error('SVG failed to load'));
    img.src = 'data:image/svg+xml;base64,' + ${JSON.stringify(Buffer.from(svg).toString('base64'))};
  })`);
  const write = async (file, size) => fs.writeFileSync(file, Buffer.from(await render(size), 'base64'));
  await write(path.join(ROOT, 'build', 'icon.png'), 1024);
  for (const s of [32, 64, 128, 256]) await write(path.join(ROOT, 'src', 'assets', `icon-${s}.png`), s);
  // macOS .icns via the system's iconutil
  const set = path.join(ROOT, 'build', 'icon.iconset');
  fs.rmSync(set, { recursive: true, force: true }); fs.mkdirSync(set);
  for (const s of [16, 32, 128, 256, 512]) {
    await write(path.join(set, `icon_${s}x${s}.png`), s);
    await write(path.join(set, `icon_${s}x${s}@2x.png`), s * 2);
  }
  if (process.platform === 'darwin') execFileSync('iconutil', ['-c', 'icns', set, '-o', path.join(ROOT, 'build', 'icon.icns')]);
  fs.rmSync(set, { recursive: true, force: true });
  console.log('Icon written: build/icon.png, build/icon.icns, src/assets/icon-{32,64,128,256}.png');
  app.exit(0);
});
