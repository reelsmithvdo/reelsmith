'use strict';
// Browser edition: menu bar, start screen, projects in browser storage, reconnecting media through
// file-system handles, saving exports straight to disk, and bug / feature reports.
// Does nothing inside the desktop app (which has a native menu and real file paths).
(function (RS) {
  if (window.native) return;
  const W = RS.web = {};
  const S = RS.state;
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const MOD = isMac ? '⌘' : 'Ctrl+';
  document.documentElement.classList.add('is-web');

  // ---------------------------------------------------------------
  // Recent errors (attached to bug reports when the user agrees)
  // ---------------------------------------------------------------
  const recentErrors = [];
  const noteError = (msg) => { recentErrors.push(new Date().toISOString().slice(11, 19) + ' ' + String(msg).slice(0, 300)); if (recentErrors.length > 12) recentErrors.shift(); };
  window.addEventListener('error', (e) => noteError((e.message || 'Error') + (e.filename ? ` (${e.filename.split('/').pop()}:${e.lineno})` : '')));
  window.addEventListener('unhandledrejection', (e) => noteError('Unhandled: ' + ((e.reason && e.reason.message) || e.reason)));
  const origErr = console.error.bind(console);
  console.error = (...a) => { noteError(a.map((x) => (x && x.message) || String(x)).join(' ')); origErr(...a); };

  // ---------------------------------------------------------------
  // IndexedDB: projects and media file handles
  // ---------------------------------------------------------------
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((resolve, reject) => {
    const r = indexedDB.open('reelsmith', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('handles')) d.createObjectStore('handles');
      if (!d.objectStoreNames.contains('projects')) d.createObjectStore('projects', { keyPath: 'id' });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
  const idb = async (store, mode, fn) => {
    const d = await db();
    return new Promise((resolve, reject) => {
      const t = d.transaction(store, mode);
      const req = fn(t.objectStore(store));
      t.oncomplete = () => resolve(req ? req.result : undefined);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  };

  // ---------------------------------------------------------------
  // Media files: keep a handle so the file reconnects on the next visit (Chrome / Edge)
  // ---------------------------------------------------------------
  const EXT = {
    'video/*': ['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi'],
    'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.oga', '.flac', '.opus'],
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'],
  };
  W.canPick = () => typeof window.showOpenFilePicker === 'function';
  // Returns [] when the user cancels.
  W.pickMedia = async (multiple) => {
    let hs;
    try {
      hs = await window.showOpenFilePicker({ multiple, id: 'reelsmith-media', types: [{ description: 'Video, audio and images', accept: EXT }] });
    } catch (err) {
      if (err && err.name === 'AbortError') return [];
      throw err;
    }
    return Promise.all(hs.map(async (h) => { const f = await h.getFile(); return { name: f.name, file: f, size: f.size, handle: h }; }));
  };
  // Must be called synchronously inside the drop event (the DataTransfer empties afterwards).
  W.handlesFromDataTransfer = (dt) => {
    const out = [];
    for (const it of dt.items || []) {
      if (it.kind !== 'file') continue;
      out.push(it.getAsFileSystemHandle ? it.getAsFileSystemHandle().catch(() => null) : null);
    }
    return out;
  };
  W.rememberHandle = (mediaId, handle) => {
    Promise.resolve(handle).then((h) => {
      if (h && h.kind === 'file') return idb('handles', 'readwrite', (st) => st.put(h, mediaId));
    }).catch(() => { /* storage unavailable: the file just needs relinking next time */ });
  };
  const getHandle = (mediaId) => idb('handles', 'readonly', (st) => st.get(mediaId)).catch(() => null);
  const attach = async (m, h) => {
    const f = await h.getFile();
    RS.runtime[m.id] = { url: URL.createObjectURL(f), file: f, thumb: null, peaks: null, offline: false };
  };

  // Called while a project opens: reconnect what we can silently, offer one click for the rest.
  W.reconnectMedia = async (list) => {
    const waiting = [];
    let lost = 0;
    for (const m of list) {
      const rt = RS.runtime[m.id];
      if (!rt || !rt.offline) continue;
      const h = await getHandle(m.id);
      if (!h) { lost++; continue; }
      try {
        const p = h.queryPermission ? await h.queryPermission({ mode: 'read' }) : 'granted';
        if (p === 'granted') await attach(m, h);
        else waiting.push({ m, h });
      } catch { lost++; }
    }
    showReconnect(waiting, lost);
  };

  let banner = null;
  function showReconnect(waiting, lost) {
    if (banner) { banner.remove(); banner = null; }
    if (!waiting.length && !lost) return;
    const close = () => { if (banner) banner.remove(); banner = null; };
    const msg = waiting.length
      ? `${waiting.length} media file${waiting.length > 1 ? 's' : ''} from this project need${waiting.length > 1 ? '' : 's'} your permission to open again.`
      : `${lost} media file${lost > 1 ? 's are' : ' is'} offline. Right-click ${lost > 1 ? 'them' : 'it'} in the Project panel and choose Relink.`;
    const btn = waiting.length ? RS.h('button', {
      class: 'btn primary small', onclick: async () => {
        let ok = 0;
        for (const { m, h } of waiting) {
          try { if ((await h.requestPermission({ mode: 'read' })) === 'granted') { await attach(m, h); ok++; } } catch { /* file moved or deleted */ }
        }
        close();
        RS.engine.invalidate();
        RS.emit('media-change');
        RS.emit('change', { source: 'load' });
        for (const { m } of waiting) if (!RS.runtime[m.id].offline) RS.media.refreshDerived(m);
        const miss = waiting.length - ok + lost;
        RS.toast(ok ? `Reconnected ${ok} file${ok > 1 ? 's' : ''}` + (miss ? ` — ${miss} still offline (right-click › Relink)` : '') : 'Files stay offline — right-click › Relink to find them', ok && !miss ? 'ok' : 'warn', 5000);
      },
    }, 'Reconnect files') : null;
    banner = RS.h('div', { class: 'web-banner' }, RS.icon('warn'), RS.h('span', null, msg), btn,
      waiting.length && lost ? RS.h('span', { class: 'muted small' }, `(${lost} more must be relinked)`) : null,
      RS.iconBtn('close', 'Dismiss', close));
    document.body.append(banner);
  }

  // ---------------------------------------------------------------
  // Projects saved in this browser
  // ---------------------------------------------------------------
  const thumbOf = () => {
    try {
      const src = RS.engine.canvas;
      if (!src || !src.width) return null;
      const c = document.createElement('canvas');
      const sc = Math.min(320 / src.width, 180 / src.height);
      c.width = Math.round(src.width * sc); c.height = Math.round(src.height * sc);
      c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.7);
    } catch { return null; }
  };
  W.idOf = (filePath) => (filePath && filePath.startsWith('browser:') ? filePath.slice(8) : null);
  // Returns the project id.
  W.saveProject = async (json, saveAs) => {
    let id = saveAs ? null : W.idOf(S.filePath);
    if (!id) id = RS.uid('p');
    const s = S.project.settings;
    await idb('projects', 'readwrite', (st) => st.put({
      id, name: S.project.name, savedAt: Date.now(), json, thumb: thumbOf(),
      info: `${s.width}×${s.height} · ${RS.fmtDur ? RS.fmtDur(RS.seqDuration()) : ''}`,
    }));
    return id;
  };
  W.listProjects = async () => {
    try { return ((await idb('projects', 'readonly', (st) => st.getAll())) || []).sort((a, b) => b.savedAt - a.savedAt); } catch { return []; }
  };
  W.openSaved = async (id) => {
    const p = await idb('projects', 'readonly', (st) => st.get(id));
    if (!p) return RS.toast('That project is no longer in this browser', 'error');
    const ok = await RS.app.loadProjectText(p.json, 'browser:' + id);
    if (ok) W.hideHome();
  };
  W.deleteSaved = (id) => idb('projects', 'readwrite', (st) => st.delete(id));

  W.downloadProject = () => {
    const blob = new Blob([RS.app.serialize()], { type: 'application/json' });
    const a = RS.h('a', { href: URL.createObjectURL(blob), download: (S.project.name || 'project').replace(/[\\/:*?"<>|]/g, '_') + '.rsproj' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    RS.toast('Project file downloaded. Media files are not inside it; keep them alongside.', 'ok', 5000);
  };
  W.openProjectFile = () => {
    const inp = RS.h('input', { type: 'file', accept: '.rsproj,.json' });
    inp.onchange = async () => {
      if (!inp.files[0]) return;
      if (await RS.app.loadProjectText(await inp.files[0].text(), null)) W.hideHome();
    };
    inp.click();
  };

  // ---------------------------------------------------------------
  // Export straight to a file the user picks (Chrome / Edge). Elsewhere it downloads.
  // ---------------------------------------------------------------
  W.canSaveDirect = () => typeof window.showSaveFilePicker === 'function';
  // Must be called from the click that starts the export. Returns a handle, null (unsupported) or false (cancelled).
  W.pickExportFile = async (fileName, mime) => {
    if (!W.canSaveDirect()) return null;
    const ext = '.' + fileName.split('.').pop();
    try {
      return await window.showSaveFilePicker({ suggestedName: fileName, id: 'reelsmith-export', startIn: 'videos', types: [{ description: 'Video', accept: { [mime.split(';')[0]]: [ext] } }] });
    } catch (err) {
      if (err && err.name === 'AbortError') return false;
      console.warn('Save picker unavailable, falling back to download', err);
      return null;
    }
  };
  W.fileSink = async (handle) => {
    const ws = await handle.createWritable();
    let pos = 0;
    let chain = Promise.resolve();
    let failed = null;
    const q = (fn) => { chain = chain.then(() => (failed ? null : fn())).catch((e) => { failed = e; }); return chain; };
    return {
      writeAt: (data, position) => q(() => ws.write({ type: 'write', position, data: data.slice ? data.slice() : data })),
      write: (blob) => { const at = pos; pos += blob.size; q(() => ws.write({ type: 'write', position: at, data: blob })); },
      finish: async (keep) => {
        await chain;
        if (keep && !failed) { await ws.close(); return handle.name; }
        try { await ws.abort(); } catch { /* ignore */ }
        try { if (handle.remove) await handle.remove(); } catch { /* ignore */ }
        if (failed) throw failed;
        return null;
      },
    };
  };
  W.downloadText = (name, text, type = 'text/plain') => {
    const a = RS.h('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  };

  // ---------------------------------------------------------------
  // Menu bar
  // ---------------------------------------------------------------
  const sep = '-';
  const MENUS = [
    ['File', [
      ['Home', 'home'],
      sep,
      ['New Project…', 'new'],
      ['Open Project…', 'open', MOD + 'O'],
      ['Open Project File (.rsproj)…', 'openProjectFile'],
      sep,
      ['Save', 'save', MOD + 'S'],
      ['Save As Copy', 'saveAs', '⇧' + MOD + 'S'],
      ['Download Project File', 'downloadProject'],
      sep,
      ['Import Media…', 'import', MOD + 'I'],
      ['Export Video…', 'export', MOD + 'M'],
    ]],
    ['Edit', [
      ['Undo', 'undo', MOD + 'Z'], ['Redo', 'redo', '⇧' + MOD + 'Z'], sep,
      ['Cut', 'cut', MOD + 'X'], ['Copy', 'copy', MOD + 'C'], ['Paste', 'paste', MOD + 'V'], ['Duplicate', 'duplicate'], sep,
      ['Select All', 'selectAll', MOD + 'A'], ['Deselect All', 'deselect', '⇧' + MOD + 'A'],
    ]],
    ['Clip', [
      ['Split at Playhead', 'split', MOD + 'K'], ['Split All Tracks at Playhead', 'splitAll', '⇧' + MOD + 'K'], ['Link / Unlink', 'toggleLink', MOD + 'L'],
      ['Enable / Disable', 'toggleEnable', '⇧E'], ['Audio Gain…', 'clipGain', 'G'], ['Normalize Loudness…', 'normalizeLoudness'], sep,
      ['Add Frame Hold', 'frameHold'], ['Insert Frame Hold Segment', 'insertHold'], ['Reverse Clip', 'reverseClip'],
      ['Replace With Source Monitor Clip', 'replaceWithSource'], ['Speed/Duration…', 'speedDuration', MOD + 'R'], sep,
      ['Apply Video Transition', 'applyTransition', MOD + 'D'], ['Apply Audio Transition', 'applyAudioTransition', '⇧' + MOD + 'D'], sep,
      ['Add Fade In / Out', 'addFades'], ['Reset Effects', 'resetEffects'],
    ]],
    ['Sequence', [
      ['New Sequence…', 'newSequence'], ['Sequence Settings…', 'sequenceSettings'], sep,
      ['Nest…', 'nest'], ['Create Multi-Camera Source Sequence…', 'createMulticam'], ['Multi-Camera View', 'toggleMulticamView', '⇧0'], sep,
      ['Add Title', 'addTitle', 'T'], ['Add Adjustment Layer', 'addAdjustment'], ['Add Color Matte', 'addMatte'], sep,
      ['Lift', 'lift', ';'], ['Extract', 'extract', "'"], ['Ripple Trim Previous Edit to Playhead', 'rippleTrimPrev', 'Q'],
      ['Ripple Trim Next Edit to Playhead', 'rippleTrimNext', 'W'], ['Match Frame', 'matchFrame', 'F'], sep,
      ['Add Marker', 'addMarker', 'M'], ['Go to Next Marker', 'nextMarker', '⇧M'], ['Go to Previous Marker', 'prevMarker'], ['Clear All Markers', 'clearMarkers'],
      ['Mark In', 'markIn', 'I'], ['Mark Out', 'markOut', 'O'], ['Clear In and Out', 'clearInOut', '⌥X'], sep,
      ['Add Video Track', 'addVideoTrack'], ['Add Audio Track', 'addAudioTrack'],
    ]],
    ['Captions', [
      ['Auto-generate Captions…', 'autoCaptions'], ['Add Caption at Playhead', 'addCaption'], ['Show / Hide Captions', 'toggleCaptions'], sep,
      ['Import Captions (.srt)…', 'importSrt'], ['Export Captions (.srt)…', 'exportSrt'], sep,
      ['Remove Caption Engine…', 'removeCaptionEngine'],
    ]],
    ['View', [
      ['Zoom In Timeline', 'zoomIn', '='], ['Zoom Out Timeline', 'zoomOut', '-'], ['Fit Sequence', 'zoomFit', '\\'], sep,
      ['Full Screen', 'fullscreen'],
    ]],
    ['Help', [
      ['Reelsmith Help', 'help', 'F1'], ['Keyboard Shortcuts', 'shortcuts', MOD + '/'], ['Your First Edit', 'helpFirstEdit'], ['Troubleshooting & FAQ', 'helpFaq'], sep,
      ['Report a Bug…', 'reportBug'], ['Request a Feature…', 'requestFeature'], sep,
      ['About Reelsmith', 'about'],
    ]],
  ];

  let openMenu = null;
  function closeMenus() {
    if (!openMenu) return;
    openMenu.btn.classList.remove('on');
    openMenu.drop.remove();
    openMenu = null;
  }
  function showMenu(btn, items) {
    closeMenus();
    const drop = RS.h('div', { class: 'menu-drop', role: 'menu' });
    for (const it of items) {
      if (it === sep) { drop.append(RS.h('div', { class: 'menu-sep' })); continue; }
      const [label, cmd, key] = it;
      drop.append(RS.h('button', {
        class: 'menu-item', role: 'menuitem', type: 'button',
        onclick: () => { closeMenus(); RS.cmd(cmd); },
      }, RS.h('span', null, label), key ? RS.h('span', { class: 'menu-key' }, key) : null));
    }
    const r = btn.getBoundingClientRect();
    drop.style.top = r.bottom + 2 + 'px';
    document.body.append(drop);
    // Keep the menu on screen (narrow phones).
    drop.style.left = Math.max(4, Math.min(r.left, innerWidth - drop.offsetWidth - 4)) + 'px';
    btn.classList.add('on');
    openMenu = { btn, drop };
  }
  function buildMenubar() {
    const bar = RS.h('nav', { class: 'menubar', role: 'menubar' });
    for (const [title, items] of MENUS) {
      const btn = RS.h('button', { class: 'menubar-btn', type: 'button' }, title);
      btn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (openMenu && openMenu.btn === btn) closeMenus(); else showMenu(btn, items); });
      btn.addEventListener('pointerenter', () => { if (openMenu && openMenu.btn !== btn) showMenu(btn, items); });
      bar.append(btn);
    }
    document.addEventListener('pointerdown', (e) => { if (openMenu && !openMenu.drop.contains(e.target) && !e.target.closest('.menubar')) closeMenus(); }, true);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openMenu) { e.stopPropagation(); closeMenus(); } }, true);
    window.addEventListener('blur', closeMenus);
    window.addEventListener('resize', closeMenus);
    return bar;
  }

  // ---------------------------------------------------------------
  // Bug reports and feature requests
  // ---------------------------------------------------------------
  W.diagnostics = () => {
    const s = S.project.settings;
    return {
      app: 'Reelsmith web ' + (W.VERSION || ''),
      url: location.origin + location.pathname,
      browser: navigator.userAgent,
      platform: navigator.platform || '',
      language: navigator.language,
      screen: `${screen.width}×${screen.height} @${devicePixelRatio}x, window ${innerWidth}×${innerHeight}`,
      features: ['VideoEncoder', 'VideoDecoder', 'AudioEncoder', 'showSaveFilePicker', 'showOpenFilePicker'].filter((k) => k in window).join(', ') + (navigator.gpu ? ', WebGPU' : ''),
      memoryGB: navigator.deviceMemory || null,
      cores: navigator.hardwareConcurrency || null,
      sequence: `${s.width}×${s.height} ${s.fps}fps, ${S.project.clips.length} clips, ${S.project.media.length} media, ${RS.seqDuration().toFixed(1)}s`,
      recentErrors: recentErrors.slice(),
    };
  };

  W.feedback = (kind) => {
    const bug = kind === 'bug';
    const opened = Date.now();
    const title = RS.h('input', { type: 'text', maxlength: 140, placeholder: bug ? 'e.g. Export stops at 50% with a 4K clip' : 'e.g. Add a beat-sync tool for music videos' });
    const body = RS.h('textarea', {
      rows: 7, maxlength: 6000, class: 'fb-text',
      placeholder: bug
        ? 'What happened, and what did you expect?\n\nSteps to reproduce:\n1. …\n2. …\n3. …'
        : 'What would you like Reelsmith to do, and how would it help your videos?',
    });
    const email = RS.h('input', { type: 'email', maxlength: 200, placeholder: 'you@example.com (optional)' });
    const diag = RS.h('input', { type: 'checkbox', checked: true });
    const trap = RS.h('input', { type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off', class: 'fb-trap', 'aria-hidden': 'true' });
    const status = RS.h('p', { class: 'muted small fb-status' });
    const row = (l, c) => RS.h('label', { class: 'form-row' }, RS.h('span', null, l), c);
    const payload = () => ({
      kind, title: title.value.trim(), body: body.value.trim(), email: email.value.trim(),
      diagnostics: diag.checked ? W.diagnostics() : null, website: trap.value, elapsed: Date.now() - opened,
    });
    const asText = (p) => `[${bug ? 'Bug' : 'Feature request'}] ${p.title}\n\n${p.body}` + (p.diagnostics ? '\n\n--- Technical details ---\n' + JSON.stringify(p.diagnostics, null, 2) : '');
    RS.modal({
      title: bug ? 'Report a Bug' : 'Request a Feature',
      wide: true,
      body: RS.h('div', { class: 'form fb-form' },
        RS.h('p', { class: 'muted small' }, bug
          ? 'Found something broken? Tell us what happened. Clear steps help us fix it quickly.'
          : 'Missing something? Tell us what you would like Reelsmith to do next.'),
        row('Title', title),
        row(bug ? 'What happened' : 'Your idea', body),
        row('Email', email),
        bug ? RS.h('label', { class: 'form-row check' }, diag, RS.h('span', null, 'Include technical details (browser, screen size, recent errors). No video or personal files are sent.')) : null,
        trap, status),
      buttons: [
        { label: 'Cancel' },
        {
          label: 'Send', primary: true, onClick: async () => {
            const p = payload();
            if (!bug) p.diagnostics = { app: 'Reelsmith web ' + (W.VERSION || ''), browser: navigator.userAgent };
            if (p.title.length < 4) { status.textContent = 'Please add a short title.'; title.focus(); return false; }
            if (p.body.length < 10) { status.textContent = 'Please describe it in a few more words.'; body.focus(); return false; }
            if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) { status.textContent = 'That email address does not look right (or leave it empty).'; email.focus(); return false; }
            status.textContent = 'Sending…';
            try {
              const r = await fetch('/api/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(p) });
              const j = await r.json().catch(() => ({}));
              if (!r.ok || !j.ok) throw new Error(j.error || 'HTTP ' + r.status);
              RS.toast(bug ? 'Thanks! Your bug report was sent.' : 'Thanks! Your idea was sent.', 'ok', 4500);
              return true;
            } catch (err) {
              status.textContent = '';
              status.append('Could not send right now (' + err.message + '). ',
                RS.h('button', { class: 'btn small', type: 'button', onclick: async () => {
                  try { await navigator.clipboard.writeText(asText(p)); RS.toast('Report copied — please try again later', 'ok'); } catch { RS.toast('Copy failed', 'error'); }
                } }, 'Copy report'));
              return false;
            }
          },
        },
      ],
    });
  };

  // ---------------------------------------------------------------
  // Start screen
  // ---------------------------------------------------------------
  let home = null;
  const autosaved = () => {
    try {
      const s = JSON.parse(localStorage.getItem(RS.app.AUTOSAVE_KEY) || 'null');
      if (!s || s.dirty === false) return null; // everything was saved
      const d = s && s.project && JSON.parse(s.project);
      return d && ((d.media && d.media.length) || (d.sequences && d.sequences.some((q) => q.clips && q.clips.length))) ? { name: d.name, saved: s } : null;
    } catch { return null; }
  };
  const ago = (t) => {
    const s = (Date.now() - t) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return Math.round(s / 60) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    if (s < 86400 * 30) return Math.round(s / 86400) + ' days ago';
    return new Date(t).toLocaleDateString();
  };

  // The website links live in index.html (so search engines see them); show them on the start screen.
  const siteLinks = () => {
    const n = document.getElementById('site-links');
    if (!n) return null;
    const c = n.cloneNode(true);
    c.removeAttribute('id'); c.hidden = false;
    return c;
  };
  W.isHomeOpen = () => !!home;
  W.hideHome = () => { if (home) { home.remove(); home = null; RS.engine.invalidate(); } };
  W.home = async () => {
    W.hideHome();
    const go = (fn) => () => { W.hideHome(); fn(); };
    const recentBox = RS.h('div', { class: 'home-recent' });
    const side = (icon, label, fn, cls) => RS.h('button', { class: 'home-side-btn' + (cls ? ' ' + cls : ''), type: 'button', onclick: fn }, RS.icon(icon), RS.h('span', null, label));
    const big = (icon, label, fn) => RS.h('button', { class: 'home-btn', type: 'button', onclick: fn }, RS.icon(icon), RS.h('span', null, label));
    const drop = RS.h('div', { class: 'home-drop' }, RS.icon('import'), RS.h('span', null, 'Drop videos, audio or images here'));
    const auto = autosaved();
    home = RS.h('div', { class: 'home', role: 'dialog', 'aria-label': 'Start' },
      RS.h('aside', { class: 'home-side' },
        side('folder', 'Home', () => {}, 'on'),
        side('import', 'Open From Computer', go(() => RS.cmd('import'))),
        side('file', 'Open Project File', () => W.openProjectFile()),
        RS.h('div', { class: 'home-side-sep' }),
        side('help', 'Help Center', () => RS.cmd('help')),
        side('film', 'Tutorials', () => { location.href = '/tutorials/'; }),
        side('keyboard', 'Keyboard Shortcuts', () => RS.cmd('shortcuts')),
        RS.h('div', { class: 'home-side-sep' }),
        side('bug', 'Report a Bug', () => W.feedback('bug')),
        side('idea', 'Request a Feature', () => W.feedback('feature'))),
      RS.h('main', { class: 'home-main' },
        RS.h('div', { class: 'home-hero' },
          RS.h('img', { src: 'assets/icon-256.png', alt: '', width: 96, height: 96 }),
          RS.h('div', null, RS.h('h1', null, 'Reelsmith'), RS.h('p', null, 'Free video editor in your browser. Your files stay on your computer.'))),
        RS.h('div', { class: 'home-actions' },
          big('plus', 'New Project', go(() => RS.cmd('new'))),
          big('import', 'Open From Computer', go(() => RS.cmd('import'))),
          big('film', 'Start Editing', go(() => {})),
          auto ? big('undo', `Recover “${auto.name}”`, go(async () => { const ok = await RS.app.loadProjectText(auto.saved.project, auto.saved.filePath || null); if (ok) RS.markDirty(true); })) : null),
        drop,
        recentBox,
        RS.h('div', { class: 'home-formats' }, ['MP4', 'MOV', 'WEBM', 'MKV', 'MP3', 'WAV', 'M4A', 'PNG', 'JPG', 'GIF'].map((f) => RS.h('span', null, f))),
        siteLinks()));
    // Dropped files import and the editor opens.
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    home.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('over');
      if (!e.dataTransfer || !e.dataTransfer.files.length) return;
      const srcs = RS.media.sourcesFromDataTransfer(e.dataTransfer);
      W.hideHome();
      RS.media.importSources(srcs);
    });
    home.addEventListener('dragover', (e) => e.preventDefault());
    document.body.append(home);

    const list = await W.listProjects();
    if (!home || !list.length) return;
    recentBox.append(RS.h('h2', null, 'Recent projects'),
      RS.h('div', { class: 'home-cards' }, list.slice(0, 12).map((p) => {
        const del = RS.iconBtn('trash', 'Remove from this browser', async (e) => {
          e.stopPropagation();
          if (!(await RS.confirm('Remove project?', `Remove “${p.name}” from this browser? Your media files are not deleted.`, 'Remove', true))) return;
          await W.deleteSaved(p.id);
          card.remove();
        }, 'home-card-del');
        const card = RS.h('div', { class: 'home-card', role: 'button', tabindex: '0', title: 'Open ' + p.name, onclick: () => W.openSaved(p.id), onkeydown: (e) => { if (e.key === 'Enter') W.openSaved(p.id); } },
          p.thumb ? RS.h('img', { src: p.thumb, alt: '' }) : RS.h('div', { class: 'home-card-blank' }, RS.icon('film')),
          RS.h('div', { class: 'home-card-name' }, p.name),
          RS.h('div', { class: 'muted small' }, ago(p.savedAt) + (p.info ? ' · ' + p.info : '')),
          del);
        return card;
      })));
  };

  // ---------------------------------------------------------------
  // Boot (called by app.js after the editor is built)
  // ---------------------------------------------------------------
  W.boot = () => {
    const brand = RS.$('#topbar .brand');
    brand.title = 'Home';
    brand.addEventListener('click', () => RS.cmd('home'));
    brand.after(buildMenubar());
    const links = RS.h('div', { class: 'topbar-links' },
      RS.h('button', { type: 'button', onclick: () => W.feedback('bug') }, 'Report a Bug'),
      RS.h('button', { type: 'button', onclick: () => W.feedback('feature') }, 'Request a Feature'));
    RS.$('#topbar-actions').before(links);
    if (!window.__RS_TEST__) W.home();
    // Links from the website: /?report=bug or /?report=feature open the form.
    const rep = new URLSearchParams(location.search).get('report');
    if (rep === 'bug' || rep === 'feature') {
      history.replaceState(null, '', location.pathname);
      setTimeout(() => W.feedback(rep), 300);
    }
  };

  const extraIcons = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    import: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 19h16"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    bug: '<rect x="7" y="7" width="10" height="13" rx="5"/><path d="M12 7V4M9 4l1 3M15 4l-1 3M3 11h4M17 11h4M3 17h4M17 17h4M12 11v9"/>',
    idea: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  };
  for (const k in extraIcons) if (!RS.icons[k]) RS.icons[k] = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${extraIcons[k]}</svg>`;
})(window.RS);
