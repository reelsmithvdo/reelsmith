'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

function Card({ title, children, onSubmit, busy, label, msg }) {
  return (
    <form className="card" style={{ maxWidth: 580 }} onSubmit={onSubmit}>
      <div className="card-h">{title}</div>
      {msg && (msg.err ? <div className="err">{msg.err}</div> : <div className="okmsg">{msg.ok}</div>)}
      {children}
      <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : label}</button>
    </form>
  );
}
export default function AccountForms({ email }) {
  const router = useRouter();
  const [em, setEm] = useState({ email, currentPassword: '', busy: false, msg: null });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '', busy: false, msg: null });
  const send = async (body) => { const r = await fetch('/admin/api/account', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return [r.ok, await r.json().catch(() => ({}))]; };
  async function saveEmail(e) {
    e.preventDefault(); setEm({ ...em, busy: true, msg: null });
    const [ok, j] = await send({ action: 'email', email: em.email, currentPassword: em.currentPassword });
    setEm({ ...em, busy: false, currentPassword: '', msg: ok ? { ok: 'Email updated. Use it the next time you sign in.' } : { err: j.error } });
    if (ok) router.refresh();
  }
  async function savePassword(e) {
    e.preventDefault(); setPw({ ...pw, busy: true, msg: null });
    const [ok, j] = await send({ action: 'password', currentPassword: pw.currentPassword, newPassword: pw.newPassword, confirmPassword: pw.confirmPassword });
    setPw(ok ? { currentPassword: '', newPassword: '', confirmPassword: '', busy: false, msg: { ok: 'Password updated. Other devices have been signed out.' } } : { ...pw, busy: false, msg: { err: j.error } });
  }
  const field = (label, value, onChange, type = 'password', auto = 'current-password') => <label className="field"><span>{label}</span><input className="input" type={type} autoComplete={auto} value={value} onChange={(e) => onChange(e.target.value)} required /></label>;
  return (
    <div className="grid" style={{ gap: 20 }}>
      <Card title="Email" onSubmit={saveEmail} busy={em.busy} label="Update email" msg={em.msg}>
        {field('Email address', em.email, (v) => setEm({ ...em, email: v }), 'email', 'username')}
        {field('Current password', em.currentPassword, (v) => setEm({ ...em, currentPassword: v }))}
      </Card>
      <Card title="Password" onSubmit={savePassword} busy={pw.busy} label="Update password" msg={pw.msg}>
        <input type="email" autoComplete="username" value={email} readOnly hidden />
        {field('Current password', pw.currentPassword, (v) => setPw({ ...pw, currentPassword: v }))}
        {field('New password', pw.newPassword, (v) => setPw({ ...pw, newPassword: v }), 'password', 'new-password')}
        {field('Confirm new password', pw.confirmPassword, (v) => setPw({ ...pw, confirmPassword: v }), 'password', 'new-password')}
        <div className="hint" style={{ marginTop: -8, marginBottom: 14 }}>At least 10 characters.</div>
      </Card>
    </div>
  );
}
