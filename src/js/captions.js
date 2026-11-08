'use strict';
// Captions: a caption track per sequence, a Captions panel for typing and timing them, and SRT import/export.
(function (RS) {
  const S = RS.state;
  const CP = RS.captions = {};
  let root, listEl, showCb;
  // Show / hide every caption track of the open sequence.
  CP.visible = () => { const t = RS.tracksOf('caption'); return !t.length || t.some((x) => !x.hidden); };
  CP.setVisible = (on) => {
    if (!RS.tracksOf('caption').length) { RS.toast('Add captions first'); if (showCb) showCb.checked = true; return; }
    RS.commit(on ? 'Show captions' : 'Hide captions', () => RS.tracksOf('caption').forEach((t) => { t.hidden = !on; }));
    RS.toast(on ? 'Captions shown' : 'Captions hidden — they stay in the project and can be shown again any time');
  };

  // ---------- SRT ----------
  const srtTime = (t) => {
    const ms = Math.max(0, Math.round(t * 1000));
    const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, r = ms % 1000;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(r).padStart(3, '0')}`;
  };
  const parseSrtTime = (str) => {
    const m = str.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/);
    return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4].padEnd(3, '0').slice(0, 3) / 1000 : null;
  };
  CP.toSrt = (seq) => {
    const tr = RS.tracksOf('caption', seq)[0];
    if (!tr) return '';
    const caps = seq.clips.filter((c) => c.trackId === tr.id && c.text && !c.disabled).sort((a, b) => a.start - b.start);
    return caps.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(RS.clipEnd(c))}\n${c.text.trim()}\n`).join('\n');
  };
  CP.parseSrt = (text) => {
    const out = [];
    for (const block of text.replace(/\r/g, '').replace(/^﻿/, '').split(/\n\s*\n/)) {
      const lines = block.split('\n').filter((l) => l.trim() !== '');
      const ti = lines.findIndex((l) => l.includes('-->'));
      if (ti < 0) continue;
      const [a, b] = lines[ti].split('-->');
      const t0 = parseSrtTime(a), t1 = parseSrtTime(b);
      if (t0 == null || t1 == null || t1 <= t0) continue;
      out.push({ start: t0, end: t1, text: lines.slice(ti + 1).join('\n').replace(/<[^>]+>/g, '') });
    }
    return out;
  };

  CP.importSrt = async () => {
    let text;
    if (RS.native) {
      const p = await RS.native.openFileDialog('Subtitles', ['srt']);
      if (!p) return;
      text = new TextDecoder().decode(await RS.native.readFile(p));
    } else {
      text = await new Promise((res) => { const i = RS.h('input', { type: 'file', accept: '.srt' }); i.onchange = () => (i.files[0] ? i.files[0].text().then(res) : res(null)); i.click(); });
      if (!text) return;
    }
    const caps = CP.parseSrt(text);
    if (!caps.length) return RS.toast('No captions found in that file', 'error');
    RS.commit('Import captions', () => { for (const c of caps) RS.ops.addCaption(c.start, c.end - c.start, c.text); });
    RS.toast(`Imported ${caps.length} captions`, 'ok');
    RS.emit('show-tab', 'captions');
  };
  CP.exportSrt = async () => {
    const srt = CP.toSrt(S.project.seq);
    if (!srt) return RS.toast('This sequence has no captions');
    const name = (S.project.name || 'Captions').replace(/[\\/:*?"<>|]/g, '_') + '.srt';
    if (RS.native) {
      const p = await RS.native.saveFileDialog('Subtitles', name, ['srt']);
      if (!p) return;
      await RS.native.writeFile(p, srt);
      RS.toast('Saved ' + p.split('/').pop(), 'ok');
    } else {
      const a = RS.h('a', { href: URL.createObjectURL(new Blob([srt], { type: 'text/plain' })), download: name });
      a.click();
    }
  };
  CP.add = () => {
    let id;
    RS.commit('Add caption', () => { id = RS.ops.addCaption(S.playhead, 3, 'New caption').id; });
    RS.emit('show-tab', 'captions');
    setTimeout(() => { const ta = listEl && listEl.querySelector(`[data-cap="${id}"] textarea`); if (ta) { ta.focus(); ta.select(); } }, 50);
  };

  // ---------- panel ----------
  CP.init = (el) => {
    root = el;
    listEl = RS.h('div', { class: 'cap-list' });
    const style = RS.h('button', { class: 'btn small', onclick: () => CP.styleDialog() }, 'Style…');
    showCb = RS.h('input', { type: 'checkbox', title: 'Show or hide captions in the picture (hidden captions are not exported unless you choose to)' });
    showCb.addEventListener('change', () => CP.setVisible(showCb.checked));
    el.append(RS.h('div', { class: 'panel-toolbar wrap' },
      RS.h('button', { class: 'btn small primary', onclick: () => RS.autoCaptions.open(), title: 'Transcribe speech into captions (runs locally)' }, RS.icon('mic'), 'Auto-generate'),
      RS.h('button', { class: 'btn small', onclick: () => CP.add() }, RS.icon('plus'), 'Add at playhead'),
      RS.h('button', { class: 'btn small', onclick: () => CP.importSrt() }, 'Import .srt'),
      RS.h('button', { class: 'btn small', onclick: () => CP.exportSrt() }, 'Export .srt'),
      RS.h('div', { class: 'grow' }), RS.h('label', { class: 'cap-show' }, showCb, 'Show captions'), style), listEl);
    RS.on('change', (o) => { if (!o || o.source !== 'caption-live') CP.render(); });
    RS.on('time', highlight);
    CP.render();
  };
  function highlight() {
    if (!listEl) return;
    const t = S.playhead;
    RS.$$('.cap-row', listEl).forEach((r) => { const c = RS.getClip(r.dataset.cap); r.classList.toggle('now', !!c && t >= c.start && t < RS.clipEnd(c)); });
  }
  CP.render = () => {
    if (!listEl) return;
    if (showCb) { showCb.checked = CP.visible(); showCb.disabled = !RS.tracksOf('caption').length; }
    RS.emit('captions-visibility', CP.visible());
    if (listEl.contains(document.activeElement)) return; // don't disturb typing
    listEl.innerHTML = '';
    const tr = RS.tracksOf('caption')[0];
    const caps = tr ? S.project.clips.filter((c) => c.trackId === tr.id).sort((a, b) => a.start - b.start) : [];
    if (!caps.length) {
      listEl.append(RS.h('div', { class: 'bin-empty' }, RS.icon('text', 'big'), RS.h('div', null, 'No captions yet'),
        RS.h('div', { class: 'muted' }, 'Add a caption at the playhead and type the words, or import an .srt subtitle file.')));
      return;
    }
    const fps = RS.fps();
    for (const c of caps) {
      const tIn = RS.h('input', { type: 'text', class: 'tc-field', value: RS.fmtTC(c.start, fps), title: 'Start' });
      const tOut = RS.h('input', { type: 'text', class: 'tc-field', value: RS.fmtTC(RS.clipEnd(c), fps), title: 'End' });
      const ta = RS.h('textarea', { rows: 2, spellcheck: true });
      ta.value = c.text || '';
      for (const i of [tIn, tOut, ta]) i.addEventListener('keydown', (e) => e.stopPropagation());
      ta.addEventListener('input', () => { RS.beginEdit(); RS.getClip(c.id).text = ta.value; RS.engine.invalidate(); RS.emit('change', { source: 'caption-live' }); });
      ta.addEventListener('change', () => RS.endEdit('Edit caption'));
      const setTime = (which, inp) => {
        const t = RS.parseTC(inp.value, fps);
        if (t == null) return CP.render();
        RS.commit('Caption timing', () => {
          const x = RS.getClip(c.id);
          if (which === 'in') { const end = RS.clipEnd(x); x.start = Math.min(RS.frameRound(t, fps), end - 1 / fps); x.duration = end - x.start; }
          else x.duration = Math.max(1 / fps, RS.frameRound(t, fps) - x.start);
          RS.ops.clearRange(x.trackId, x.start, RS.clipEnd(x), new Set([x.id]));
        });
      };
      tIn.addEventListener('change', () => setTime('in', tIn));
      tOut.addEventListener('change', () => setTime('out', tOut));
      const go = RS.iconBtn('play', 'Go to caption', () => RS.engine.seek(c.start));
      const del = RS.iconBtn('trash', 'Delete caption', () => RS.commit('Delete caption', () => RS.ops.removeClip(c.id)));
      listEl.append(RS.h('div', { class: 'cap-row', 'data-cap': c.id }, RS.h('div', { class: 'cap-times' }, go, tIn, tOut, del), ta));
    }
    highlight();
  };

  CP.styleDialog = () => {
    const seq = S.project.seq;
    const st = Object.assign({}, RS.DEFAULT_CAPTION_STYLE, seq.captionStyle || {});
    const size = RS.h('input', { type: 'number', min: 2, max: 15, step: 0.5, value: st.size });
    const color = RS.h('input', { type: 'color', value: st.color });
    const bg = RS.h('input', { type: 'color', value: st.bg });
    const bgo = RS.h('input', { type: 'range', min: 0, max: 100, value: st.bgOpacity });
    const pos = RS.h('select', null, RS.h('option', { value: 'bottom', selected: st.position === 'bottom' }, 'Bottom'), RS.h('option', { value: 'top', selected: st.position === 'top' }, 'Top'));
    const margin = RS.h('input', { type: 'number', min: 0, max: 40, step: 0.5, value: st.margin });
    const row = (l, c) => RS.h('label', { class: 'form-row' }, RS.h('span', null, l), c);
    RS.modal({
      title: 'Caption Style',
      body: RS.h('div', { class: 'form' }, row('Text size (% of height)', size), row('Text color', color), row('Background', bg), row('Background opacity', bgo), row('Position', pos), row('Margin (%)', margin)),
      buttons: [{ label: 'Cancel' }, { label: 'Apply', primary: true, onClick: () => RS.commit('Caption style', () => { seq.captionStyle = { ...st, size: +size.value, color: color.value, bg: bg.value, bgOpacity: +bgo.value, position: pos.value, margin: +margin.value }; }) }],
    });
  };
})(window.RS);
