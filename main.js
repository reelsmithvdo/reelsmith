'use strict';
// Reelsmith — Electron main process.
// Owns native windows, menus, dialogs and all file-system access.
// The renderer talks to it only through the narrow API exposed in preload.js.

const { app, BrowserWindow, Menu, ipcMain, dialog, shell, session, systemPreferences } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const { spawn } = require('child_process');

const APP_ICON = path.join(__dirname, 'build', 'icon.png');
const MEDIA_EXT = ['mp4', 'mov', 'm4v', 'webm', 'mkv', 'ogv', 'mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'flac', 'opus',
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif'];

let win = null;
let allowClose = false;
const exportStreams = new Map(); // handle -> { fd, path }
let nextHandle = 1;

function send(cmd) {
  if (win && !win.isDestroyed()) win.webContents.send('menu', cmd);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1100,
    minHeight: 680,
    backgroundColor: '#15171b',
    title: 'Reelsmith',
    icon: APP_ICON, // window/taskbar icon on Windows and Linux
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      backgroundThrottling: false, // keep playback/export timing steady
    },
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Ask the renderer whether it is safe to close (unsaved changes).
  win.on('close', (e) => {
    if (allowClose) return;
    e.preventDefault();
    send('app-close-request');
  });
  win.on('closed', () => { win = null; });

  // Never navigate away from the app or open external windows inside it.
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const item = (label, cmd, accelerator) => ({ label, accelerator, click: () => send(cmd) });
  // Shown in the menu but handled by the page, so typing in text fields is never intercepted.
  // Single-key shortcuts (M, I, O, Q, W, F, G, ;, ', ⇧E …) are handled by the page, which ignores them while
  // you type. They must NOT be real menu accelerators: on macOS Electron registers them even with
  // registerAccelerator:false, so they would fire while typing and run twice. Show the key in the label instead.
  const pretty = (a) => a.replace(/Shift\+/g, '⇧').replace(/Alt\+/g, '⌥');
  const hint = (label, cmd, accelerator) => ({ label: `${label}    ${pretty(accelerator)}`, click: () => send(cmd) });
  const template = [
    ...(isMac ? [{
      label: 'Reelsmith',
      submenu: [
        item('About Reelsmith', 'about'),
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'File',
      submenu: [
        item('New Project', 'new', 'CmdOrCtrl+N'),
        item('Open Project…', 'open', 'CmdOrCtrl+O'),
        { type: 'separator' },
        item('Save', 'save', 'CmdOrCtrl+S'),
        item('Save As…', 'saveAs', 'Shift+CmdOrCtrl+S'),
        { type: 'separator' },
        item('Import Media…', 'import', 'CmdOrCtrl+I'),
        item('Export Video…', 'export', 'CmdOrCtrl+M'),
        ...(isMac ? [] : [{ type: 'separator' }, { role: 'quit' }]),
      ],
    },
    {
      label: 'Edit',
      submenu: [
        item('Undo', 'undo', 'CmdOrCtrl+Z'),
        item('Redo', 'redo', 'Shift+CmdOrCtrl+Z'),
        { type: 'separator' },
        item('Cut', 'cut', 'CmdOrCtrl+X'),
        item('Copy', 'copy', 'CmdOrCtrl+C'),
        item('Paste', 'paste', 'CmdOrCtrl+V'),
        item('Duplicate', 'duplicate'),
        { type: 'separator' },
        item('Select All', 'selectAll', 'CmdOrCtrl+A'),
        item('Deselect All', 'deselect', 'Shift+CmdOrCtrl+A'),
      ],
    },
    {
      label: 'Clip',
      submenu: [
        item('Split at Playhead', 'split', 'CmdOrCtrl+K'),
        item('Split All Tracks at Playhead', 'splitAll', 'Shift+CmdOrCtrl+K'),
        item('Link / Unlink', 'toggleLink', 'CmdOrCtrl+L'),
        hint('Enable / Disable', 'toggleEnable', 'Shift+E'),
        hint('Audio Gain…', 'clipGain', 'G'),
        item('Normalize Loudness…', 'normalizeLoudness'),
        { type: 'separator' },
        item('Add Frame Hold', 'frameHold'),
        item('Insert Frame Hold Segment', 'insertHold'),
        item('Reverse Clip', 'reverseClip'),
        item('Replace With Source Monitor Clip', 'replaceWithSource'),
        item('Speed/Duration…', 'speedDuration', 'CmdOrCtrl+R'),
        { type: 'separator' },
        item('Apply Video Transition', 'applyTransition', 'CmdOrCtrl+D'),
        item('Apply Audio Transition', 'applyAudioTransition', 'Shift+CmdOrCtrl+D'),
        { type: 'separator' },
        item('Add Fade In / Out', 'addFades'),
        item('Reset Effects', 'resetEffects'),
      ],
    },
    {
      label: 'Sequence',
      submenu: [
        item('New Sequence…', 'newSequence'),
        item('Sequence Settings…', 'sequenceSettings'),
        { type: 'separator' },
        item('Nest…', 'nest'),
        item('Create Multi-Camera Source Sequence…', 'createMulticam'),
        hint('Multi-Camera View', 'toggleMulticamView', 'Shift+0'),
        { type: 'separator' },
        item('Add Title', 'addTitle', 'CmdOrCtrl+T'),
        item('Add Adjustment Layer', 'addAdjustment'),
        { type: 'separator' },
        hint('Lift', 'lift', ';'),
        hint('Extract', 'extract', "'"),
        hint('Ripple Trim Previous Edit to Playhead', 'rippleTrimPrev', 'Q'),
        hint('Ripple Trim Next Edit to Playhead', 'rippleTrimNext', 'W'),
        hint('Match Frame', 'matchFrame', 'F'),
        { type: 'separator' },
        item('Auto-generate Captions…', 'autoCaptions'),
        item('Add Caption at Playhead', 'addCaption'),
        item('Show / Hide Captions', 'toggleCaptions'),
        item('Import Captions (.srt)…', 'importSrt'),
        item('Export Captions (.srt)…', 'exportSrt'),
        { type: 'separator' },
        item('Create Proxies for Selected Media', 'createProxies'),
        item('Toggle Proxies', 'toggleProxies'),
        item('Add Color Matte', 'addMatte'),
        { type: 'separator' },
        hint('Add Marker', 'addMarker', 'M'),
        hint('Go to Next Marker', 'nextMarker', 'Shift+M'),
        item('Go to Previous Marker', 'prevMarker'),
        item('Clear All Markers', 'clearMarkers'),
        hint('Mark In', 'markIn', 'I'),
        hint('Mark Out', 'markOut', 'O'),
        hint('Clear In and Out', 'clearInOut', 'Alt+X'),
        { type: 'separator' },
        item('Add Video Track', 'addVideoTrack'),
        item('Add Audio Track', 'addAudioTrack'),
      ],
    },
    {
      label: 'View',
      submenu: [
        item('Zoom In Timeline', 'zoomIn'),
        item('Zoom Out Timeline', 'zoomOut'),
        item('Fit Sequence', 'zoomFit'),
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        item('Reelsmith Help', 'help', 'F1'),
        item('Keyboard Shortcuts', 'shortcuts', 'CmdOrCtrl+/'),
        { type: 'separator' },
        item('Your First Edit', 'helpFirstEdit'),
        item('Troubleshooting & FAQ', 'helpFaq'),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------- IPC: project files ----------
ipcMain.handle('project:open', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Open Project',
    properties: ['openFile'],
    filters: [{ name: 'Reelsmith Project', extensions: ['rsproj', 'json'] }],
  });
  if (r.canceled || !r.filePaths.length) return null;
  const p = r.filePaths[0];
  return { path: p, text: await fs.promises.readFile(p, 'utf8') };
});

ipcMain.handle('project:save', async (_e, text, filePath, name) => {
  let p = filePath;
  if (!p) {
    const r = await dialog.showSaveDialog(win, {
      title: 'Save Project',
      defaultPath: (name || 'Untitled') + '.rsproj',
      filters: [{ name: 'Reelsmith Project', extensions: ['rsproj'] }],
    });
    if (r.canceled || !r.filePath) return null;
    p = r.filePath;
  }
  // Write atomically so a crash mid-save can never corrupt an existing project.
  const tmp = p + '.tmp-' + process.pid;
  await fs.promises.writeFile(tmp, text, 'utf8');
  await fs.promises.rename(tmp, p);
  return p;
});

// ---------- IPC: media ----------
ipcMain.handle('media:import', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Import Media',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Media', extensions: MEDIA_EXT },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (r.canceled) return [];
  return Promise.all(r.filePaths.map(statFile));
});

async function statFile(p) {
  try {
    const st = await fs.promises.stat(p);
    return { path: p, name: path.basename(p), size: st.size, ok: st.isFile() };
  } catch {
    return { path: p, name: path.basename(p), size: 0, ok: false };
  }
}

ipcMain.handle('file:stat', (_e, paths) => Promise.all((paths || []).map(statFile)));

ipcMain.handle('file:read', async (_e, p) => {
  const buf = await fs.promises.readFile(p);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
});

// Random-access reads for the frame-accurate decoder (file handles are cached).
const readHandles = new Map();
async function handleFor(p) {
  let h = readHandles.get(p);
  if (!h) { h = await fs.promises.open(p, 'r'); readHandles.set(p, h); if (readHandles.size > 32) { const [k, v] = readHandles.entries().next().value; readHandles.delete(k); v.close().catch(() => {}); } }
  return h;
}
ipcMain.handle('file:size', async (_e, p) => (await fs.promises.stat(p)).size);
ipcMain.handle('file:readRange', async (_e, p, start, end) => {
  const h = await handleFor(p);
  const len = Math.max(0, end - start);
  const buf = Buffer.allocUnsafe(len);
  const { bytesRead } = await h.read(buf, 0, len, start);
  return new Uint8Array(buf.buffer, buf.byteOffset, bytesRead);
});
ipcMain.handle('file:closeReads', async () => { for (const h of readHandles.values()) await h.close().catch(() => {}); readHandles.clear(); });

// Folders Reelsmith writes to (voice-over recordings, proxies).
ipcMain.handle('app:dir', async (_e, kind) => {
  const sub = { recordings: 'Recordings', proxies: 'Proxies', cutouts: 'Cutouts', sfx: 'Sound Effects' }[kind] || 'Files';
  const dir = path.join(app.getPath('videos'), 'Reelsmith', sub);
  await fs.promises.mkdir(dir, { recursive: true });
  return dir;
});
// Write a new file without overwriting anything ("name 2.ext" when taken). Returns the path.
ipcMain.handle('file:writeNew', async (_e, dir, name, data) => {
  const ext = path.extname(name), base = path.basename(name, ext);
  let p = path.join(dir, name);
  for (let n = 2; await fs.promises.stat(p).then(() => true, () => false); n++) p = path.join(dir, `${base} ${n}${ext}`);
  await fs.promises.writeFile(p, Buffer.from(data));
  return p;
});
// Native text editing (copy/paste in text fields). document.execCommand('paste') is blocked in
// Chromium, so menu shortcuts in a focused text field use the browser's own edit actions.
ipcMain.on('edit:native', (e, action) => {
  const wc = e.sender;
  if (['undo', 'redo', 'cut', 'copy', 'paste', 'selectAll', 'delete'].includes(action)) wc[action]();
});
ipcMain.handle('file:write', async (_e, p, data) => { await fs.promises.writeFile(p, typeof data === 'string' ? data : Buffer.from(data)); return p; });
ipcMain.handle('dialog:openFile', async (_e, title, exts) => {
  const r = await dialog.showOpenDialog(win, { title, properties: ['openFile'], filters: [{ name: title, extensions: exts }] });
  return r.canceled || !r.filePaths.length ? null : r.filePaths[0];
});
ipcMain.handle('dialog:saveFile', async (_e, title, defaultName, exts) => {
  const r = await dialog.showSaveDialog(win, { title, defaultPath: path.join(app.getPath('videos'), defaultName), filters: [{ name: title, extensions: exts }] });
  return r.canceled || !r.filePath ? null : r.filePath;
});
ipcMain.handle('media:askMic', async () => {
  if (process.platform !== 'darwin') return true;
  try { return await systemPreferences.askForMediaAccess('microphone'); } catch { return true; }
});

// ---------- Local speech-to-text (whisper.cpp) ----------
const WHISPER_MODELS = {
  base: { file: 'ggml-base.bin', size: 148e6, label: 'Base — fast (~150 MB)' },
  small: { file: 'ggml-small.bin', size: 488e6, label: 'Small — balanced (~490 MB)' },
  medium: { file: 'ggml-medium.bin', size: 1.53e9, label: 'Medium — most accurate (~1.5 GB)' },
  turbo: { file: 'ggml-large-v3-turbo.bin', size: 1.62e9, label: 'Large v3 Turbo — best quality (~1.6 GB)' },
};
const modelDir = () => path.join(app.getPath('userData'), 'whisper-models');
function findWhisper() {
  const cands = [process.env.REELSMITH_WHISPER, path.join(__dirname, 'vendor', 'whisper', 'whisper-cli'),
    '/opt/homebrew/bin/whisper-cli', '/usr/local/bin/whisper-cli', '/opt/homebrew/bin/whisper-cpp', '/usr/local/bin/whisper-cpp'].filter(Boolean);
  return cands.find((p) => { try { fs.accessSync(p, fs.constants.X_OK); return true; } catch { return false; } }) || null;
}
ipcMain.handle('whisper:status', async () => {
  const dir = modelDir();
  const models = Object.entries(WHISPER_MODELS).map(([id, m]) => ({ id, label: m.label, size: m.size, downloaded: fs.existsSync(path.join(dir, m.file)) }));
  return { binary: findWhisper(), models };
});
let whisperJob = null; // { kind, cancel() }
const sendProgress = (phase, pct, detail) => { if (win && !win.isDestroyed()) win.webContents.send('whisper-progress', { phase, pct, detail }); };
function download(url, dest, onPct, redirects = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Reelsmith' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 6) {
        res.resume();
        return resolve(download(new URL(res.headers.location, url).toString(), dest, onPct, redirects + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('Download failed (HTTP ' + res.statusCode + ')')); }
      const total = +res.headers['content-length'] || 0;
      let got = 0;
      const out = fs.createWriteStream(dest);
      res.on('data', (d) => { got += d.length; if (total) onPct(got / total); });
      res.pipe(out);
      out.on('finish', () => out.close(() => resolve()));
      out.on('error', reject);
      res.on('error', reject);
    });
    req.on('error', reject);
    whisperJob = { kind: 'download', cancel: () => req.destroy(new Error('cancelled')) };
  });
}
ipcMain.handle('whisper:download', async (_e, id) => {
  const m = WHISPER_MODELS[id];
  if (!m) throw new Error('Unknown model');
  await fs.promises.mkdir(modelDir(), { recursive: true });
  const dest = path.join(modelDir(), m.file);
  if (fs.existsSync(dest)) return dest;
  const part = dest + '.part';
  try {
    await download('https://huggingface.co/ggerganov/whisper.cpp/resolve/main/' + m.file, part, (p) => sendProgress('download', p));
    await fs.promises.rename(part, dest); // only complete files get the real name
  } catch (err) {
    await fs.promises.unlink(part).catch(() => {});
    throw err;
  } finally { whisperJob = null; }
  return dest;
});
ipcMain.handle('whisper:transcribe', async (_e, { wav, model, language, translate }) => {
  const bin = findWhisper();
  if (!bin) throw new Error('whisper.cpp is not installed');
  const m = WHISPER_MODELS[model];
  const modelPath = path.join(modelDir(), m.file);
  if (!fs.existsSync(modelPath)) throw new Error('Model not downloaded');
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'reelsmith-stt-'));
  const wavPath = path.join(tmp, 'audio.wav'), outBase = path.join(tmp, 'out');
  await fs.promises.writeFile(wavPath, Buffer.from(wav));
  const args = ['-m', modelPath, '-f', wavPath, '-l', language || 'auto', '-oj', '-of', outBase, '-ml', '42', '-sow', '-pp', '-t', String(Math.max(2, os.cpus().length - 2))];
  if (translate) args.push('-tr');
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let errText = '';
      const onData = (d) => {
        const s = d.toString();
        errText = (errText + s).slice(-4000);
        const mm = s.match(/progress\s*=\s*(\d+)%/g);
        if (mm) sendProgress('transcribe', +mm[mm.length - 1].match(/(\d+)/)[1] / 100);
      };
      child.stdout.on('data', onData);
      child.stderr.on('data', onData);
      whisperJob = { kind: 'transcribe', cancel: () => child.kill('SIGTERM') };
      child.on('error', reject);
      child.on('close', (code, signal) => {
        if (signal) return reject(new Error('cancelled'));
        if (code !== 0) return reject(new Error('whisper.cpp failed: ' + errText.split(/\r?\n/).filter(Boolean).slice(-2).join(' ')));
        resolve();
      });
    });
    const json = JSON.parse(await fs.promises.readFile(outBase + '.json', 'utf8'));
    return (json.transcription || []).map((s) => ({ from: s.offsets.from / 1000, to: s.offsets.to / 1000, text: s.text }));
  } finally {
    whisperJob = null;
    fs.promises.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
});
ipcMain.handle('whisper:cancel', () => { if (whisperJob) whisperJob.cancel(); return true; });

ipcMain.handle('shell:reveal', (_e, p) => { if (p) shell.showItemInFolder(p); });

// ---------- IPC: export (streamed to disk chunk by chunk) ----------
ipcMain.handle('export:begin', async (_e, defaultName, ext) => {
  const r = await dialog.showSaveDialog(win, {
    title: 'Export Video',
    defaultPath: path.join(app.getPath('videos'), (defaultName || 'Export') + '.' + ext),
    filters: [{ name: ext.toUpperCase() + ' Video', extensions: [ext] }],
  });
  if (r.canceled || !r.filePath) return null;
  const fd = await fs.promises.open(r.filePath, 'w');
  const handle = nextHandle++;
  exportStreams.set(handle, { fd, path: r.filePath });
  return { handle, path: r.filePath };
});

// Destination chosen inside the Export dialog (folder + file name).
ipcMain.handle('export:defaultDir', () => app.getPath('videos'));
ipcMain.handle('dialog:pickFolder', async (_e, startDir) => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Choose Export Location',
    defaultPath: startDir || app.getPath('videos'),
    properties: ['openDirectory', 'createDirectory'],
  });
  if (r.canceled || !r.filePaths.length) return null;
  return r.filePaths[0];
});
ipcMain.handle('export:beginPath', async (_e, dir, fileName) => {
  const safe = String(fileName || 'Export').replace(/[\\/:*?"<>|]/g, '_');
  const st = await fs.promises.stat(dir).catch(() => null);
  if (!st || !st.isDirectory()) throw new Error('Export folder does not exist: ' + dir);
  const full = path.join(dir, safe);
  const fd = await fs.promises.open(full, 'w');
  const handle = nextHandle++;
  exportStreams.set(handle, { fd, path: full });
  return { handle, path: full };
});
ipcMain.handle('file:exists', async (_e, dir, fileName) => {
  const st = await fs.promises.stat(path.join(dir, String(fileName))).catch(() => null);
  return !!st;
});

ipcMain.handle('export:chunk', async (_e, handle, data) => {
  const s = exportStreams.get(handle);
  if (!s) throw new Error('Export stream is closed');
  await s.fd.write(Buffer.from(data));
  return true;
});

ipcMain.handle('export:writeAt', async (_e, handle, data, position) => {
  const st = exportStreams.get(handle);
  if (!st) throw new Error('Export stream is closed');
  const b = Buffer.from(data);
  await st.fd.write(b, 0, b.length, position);
  return true;
});

ipcMain.handle('export:end', async (_e, handle, keep) => {
  const s = exportStreams.get(handle);
  if (!s) return null;
  exportStreams.delete(handle);
  await s.fd.close();
  if (!keep) {
    await fs.promises.unlink(s.path).catch(() => {});
    return null;
  }
  return s.path;
});

// ---------- IPC: window ----------
ipcMain.on('close-ok', () => {
  allowClose = true;
  if (win) win.close();
});
ipcMain.on('set-title', (_e, t) => { if (win) win.setTitle(String(t || 'Reelsmith')); });
ipcMain.on('set-edited', (_e, edited) => { if (win && process.platform === 'darwin') win.setDocumentEdited(!!edited); });

app.setName('Reelsmith');
app.whenReady().then(() => {
  // Dock icon while running from source (a packaged app uses build/icon.icns).
  if (process.platform === 'darwin' && app.dock && fs.existsSync(APP_ICON)) app.dock.setIcon(APP_ICON);
  // Allow microphone access for voice-over recording (the page is local, no remote content is loaded).
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === 'media'));
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'media');
  buildMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) { allowClose = false; createWindow(); }
  });
});

app.on('window-all-closed', () => {
  for (const s of exportStreams.values()) s.fd.close().catch(() => {});
  if (process.platform !== 'darwin') app.quit();
});
