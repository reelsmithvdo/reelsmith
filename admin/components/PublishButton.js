'use client';
import { useState } from 'react';
import Icon from './Icon';

export default function PublishButton() {
  const [state, setState] = useState(null);
  async function go() {
    setState({ busy: true });
    const r = await fetch('/admin/api/publish', { method: 'POST' });
    const j = await r.json().catch(() => ({ error: 'Failed' }));
    setState(r.ok && j.ok ? { ok: `Website rebuilt with ${j.posts} live posts${j.images ? ` and ${j.images} new image${j.images > 1 ? 's' : ''}` : ''}.`, log: j.log } : { err: j.error || 'Build failed', log: j.log });
  }
  return <>
    <button className="btn primary" onClick={go} disabled={state && state.busy}><Icon name="rocket" />{state && state.busy ? 'Rebuilding…' : 'Rebuild site now'}</button>
    {state && state.ok && <div className="okmsg" style={{ marginTop: 12 }}>{state.ok}</div>}
    {state && state.err && <div className="err" style={{ marginTop: 12 }}>{state.err}</div>}
    {state && state.log && <pre className="small muted" style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{state.log}</pre>}
  </>;
}
