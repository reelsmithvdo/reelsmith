'use client';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { adminSrc } from '@/lib/assets';

// Shrink big photos before upload (faster pages = better SEO). GIFs are kept as they are.
export async function prepareImage(file, max = 1600) {
  if (file.type === 'image/gif') return { blob: file, width: 0, height: 0, type: file.type };
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  cv.getContext('2d').drawImage(bmp, 0, 0, w, h);
  const type = file.type === 'image/png' && k === 1 ? 'image/png' : 'image/webp';
  const blob = await new Promise((r) => cv.toBlob(r, type, 0.86));
  return { blob, width: w, height: h, type };
}
export async function uploadImage(file, alt = '') {
  const p = await prepareImage(file);
  const fd = new FormData();
  fd.append('file', new File([p.blob], file.name, { type: p.type }));
  fd.append('name', file.name); fd.append('alt', alt); fd.append('width', p.width); fd.append('height', p.height);
  const r = await fetch('/admin/api/media', { method: 'POST', body: fd });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Upload failed');
  return j;
}

export function MediaGrid({ items, selected, onSelect }) {
  if (!items.length) return <div className="empty">No images yet — upload one.</div>;
  return <div className="media-grid">{items.map((m) => <div key={m.id} className={'m-item' + (selected === m.id ? ' sel' : '')} onClick={() => onSelect(m)} title={m.filename}><img src={adminSrc(m.url)} alt={m.alt} loading="lazy" /><div>{m.alt || m.filename}</div></div>)}</div>;
}

export default function MediaPicker({ onPick, onClose, title = 'Choose an image' }) {
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(null);
  const [alt, setAlt] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const input = useRef(null);
  const load = () => fetch('/admin/api/media').then((r) => r.json()).then((j) => Array.isArray(j) && setItems(j));
  useEffect(() => { load(); }, []);
  async function upload(files) {
    setErr('');
    for (const f of files) {
      setBusy('Uploading ' + f.name + '…');
      try { const m = await uploadImage(f); setItems((x) => [m, ...x]); setSel(m); setAlt(m.alt); } catch (e) { setErr(e.message); }
    }
    setBusy('');
  }
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={title}>
        <div className="modal-h">{title}<button className="btn small" onClick={onClose}><Icon name="close" size={14} /></button></div>
        <div className="modal-b">
          <div className="drop" onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('over'); }} onDragLeave={(e) => e.currentTarget.classList.remove('over')}
            onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('over'); upload([...e.dataTransfer.files]); }}>
            <Icon name="upload" /> Drop images here or <button className="btn small" onClick={() => input.current.click()}>Upload</button>
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => upload([...e.target.files])} />
            <div className="hint">Large photos are resized to 1600 px and saved as WebP automatically.</div>
          </div>
          {busy && <div className="okmsg">{busy}</div>}{err && <div className="err">{err}</div>}
          <MediaGrid items={items} selected={sel && sel.id} onSelect={(m) => { setSel(m); setAlt(m.alt); }} />
        </div>
        <div className="modal-f">
          {sel && <input className="input" style={{ maxWidth: 420 }} placeholder="Alt text — describe the image (important for SEO)" value={alt} onChange={(e) => setAlt(e.target.value)} />}
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!sel} onClick={async () => {
            if (alt !== sel.alt) await fetch('/admin/api/media/' + sel.id, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ alt }) });
            onPick({ ...sel, alt });
          }}>Use image</button>
        </div>
      </div>
    </div>
  );
}
