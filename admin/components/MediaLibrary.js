'use client';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { MediaGrid, uploadImage } from './MediaPicker';
import { adminSrc } from '@/lib/assets';

export default function MediaLibrary() {
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(null);
  const [msg, setMsg] = useState(null);
  const input = useRef(null);
  useEffect(() => { fetch('/admin/api/media').then((r) => r.json()).then((j) => Array.isArray(j) && setItems(j)); }, []);
  async function upload(files) {
    for (const f of files) {
      setMsg({ ok: 'Uploading ' + f.name + '…' });
      try { const m = await uploadImage(f); setItems((x) => [m, ...x]); setSel(m); setMsg({ ok: 'Uploaded ' + f.name }); } catch (e) { setMsg({ err: e.message }); }
    }
  }
  async function saveAlt() {
    await fetch('/admin/api/media/' + sel.id, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ alt: sel.alt }) });
    setItems((x) => x.map((m) => (m.id === sel.id ? sel : m))); setMsg({ ok: 'Alt text saved' });
  }
  async function remove() {
    if (!confirm('Delete this image?')) return;
    const r = await fetch('/admin/api/media/' + sel.id, { method: 'DELETE' });
    const j = await r.json();
    if (!r.ok) return setMsg({ err: j.error });
    setItems((x) => x.filter((m) => m.id !== sel.id)); setSel(null);
  }
  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 320px', alignItems: 'start' }}>
      <div>
        <div className="drop" onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('over'); }} onDragLeave={(e) => e.currentTarget.classList.remove('over')} onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('over'); upload([...e.dataTransfer.files]); }}>
          <Icon name="upload" /> Drop images here or <button className="btn small" onClick={() => input.current.click()}>Upload</button>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => upload([...e.target.files])} />
          <div className="hint">Images are resized to 1600 px and converted to WebP for fast pages.</div>
        </div>
        {msg && (msg.err ? <div className="err">{msg.err}</div> : <div className="okmsg">{msg.ok}</div>)}
        <MediaGrid items={items} selected={sel && sel.id} onSelect={setSel} />
      </div>
      <div className="card">
        {!sel ? <div className="empty">Select an image to see its details.</div> : <>
          <img src={adminSrc(sel.url)} alt={sel.alt} style={{ width: '100%', borderRadius: 8, marginBottom: 12 }} />
          <div className="small muted" style={{ marginBottom: 12 }}>{sel.filename}<br />{sel.width ? `${sel.width}×${sel.height} · ` : ''}{Math.round(sel.size / 1024)} KB</div>
          <label className="field"><span>Alt text</span><textarea className="textarea" value={sel.alt} onChange={(e) => setSel({ ...sel, alt: e.target.value })} /></label>
          <label className="field"><span>URL</span><input className="input" readOnly value={'https://reelsmithapp.com' + sel.url} onFocus={(e) => e.target.select()} /></label>
          <button className="btn primary" onClick={saveAlt}>Save</button> <button className="btn danger" onClick={remove}><Icon name="trash" size={14} />Delete</button>
        </>}
      </div>
    </div>
  );
}
