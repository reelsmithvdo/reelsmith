'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';

export default function Categories({ items }) {
  const router = useRouter();
  const [edit, setEdit] = useState(null); // {id?, name, slug, description}
  const [err, setErr] = useState('');
  async function save() {
    setErr('');
    const r = await fetch(edit.id ? `/admin/api/categories/${edit.id}` : '/admin/api/categories', { method: edit.id ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(edit) });
    const j = await r.json();
    if (!r.ok) return setErr(j.error);
    setEdit(null); router.refresh();
  }
  async function remove(c) {
    if (!confirm(`Delete the category “${c.name}”? Its ${c.posts} post(s) keep existing without a category.`)) return;
    await fetch(`/admin/api/categories/${c._id}`, { method: 'DELETE' }); router.refresh();
  }
  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 340px', alignItems: 'start' }}>
      <table className="plist">
        <thead><tr><th>Name</th><th>Slug</th><th>Posts</th><th></th></tr></thead>
        <tbody>
          {items.map((c) => <tr key={c._id}><td className="ttl"><b>{c.name}</b><div>{c.description}</div></td><td className="muted">{c.slug}</td><td>{c.posts}</td>
            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}><button className="btn small" onClick={() => setEdit({ id: c._id, name: c.name, slug: c.slug, description: c.description || '' })}>Edit</button> <button className="btn small danger" onClick={() => remove(c)}><Icon name="trash" size={14} /></button></td></tr>)}
          {!items.length && <tr><td colSpan={4} className="empty">No categories yet.</td></tr>}
        </tbody>
      </table>
      <div className="card">
        <div className="card-h">{edit && edit.id ? 'Edit category' : 'Add category'}</div>
        {err && <div className="err">{err}</div>}
        {(() => { const v = edit || { name: '', slug: '', description: '' }; const up = (k, x) => setEdit({ ...v, [k]: x }); return <>
          <label className="field"><span>Name</span><input className="input" value={v.name} onChange={(e) => up('name', e.target.value)} /></label>
          <label className="field"><span>Slug <small>optional</small></span><input className="input" value={v.slug} onChange={(e) => up('slug', e.target.value)} /></label>
          <label className="field"><span>Description</span><textarea className="textarea" value={v.description} onChange={(e) => up('description', e.target.value)} /></label>
          <button className="btn primary" disabled={!v.name.trim()} onClick={save}>{v.id ? 'Save' : 'Add category'}</button>
          {v.id && <button className="btn" style={{ marginLeft: 8 }} onClick={() => setEdit(null)}>Cancel</button>}
        </>; })()}
      </div>
    </div>
  );
}
