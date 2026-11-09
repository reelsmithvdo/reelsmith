import { NextResponse } from 'next/server';
import { apiUser, changeEmail, changePassword, makeSession, cookieOptions, COOKIE_NAME } from '@/lib/auth';

// Update the owner's email or password. The current device gets a fresh session; a password change
// signs out every other device.
export async function POST(req) {
  if (!(await apiUser())) return NextResponse.json({ error: 'Sign in again' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  try {
    const u = b.action === 'email' ? await changeEmail(b.email, b.currentPassword)
      : b.action === 'password' ? await changePassword(b.currentPassword, b.newPassword, b.confirmPassword)
      : null;
    if (!u) return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    const res = NextResponse.json({ ok: true, email: u.email });
    res.cookies.set(COOKIE_NAME, makeSession(u), cookieOptions);
    return res;
  } catch (e) {
    await new Promise((r) => setTimeout(r, 300));
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
