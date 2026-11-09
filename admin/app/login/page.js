'use client';
import { useState } from 'react';

export default function Login() {
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const f = new FormData(e.currentTarget);
    const r = await fetch('/admin/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: f.get('email'), password: f.get('password') }) });
    if (r.ok) location.href = '/admin';
    else { setErr((await r.json()).error || 'Could not sign in'); setBusy(false); }
  }
  return (
    <main className="login">
      <form className="card" onSubmit={submit}>
        <div className="brand"><img src="/admin/logo.png" alt="" /><div><b>Reelsmith</b><span>Admin</span></div></div>
        {err && <div className="err">{err}</div>}
        <label className="field"><span>Email</span><input className="input" name="email" type="email" autoComplete="username" required autoFocus /></label>
        <label className="field"><span>Password</span><input className="input" name="password" type="password" autoComplete="current-password" required /></label>
        <button className="btn primary" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
