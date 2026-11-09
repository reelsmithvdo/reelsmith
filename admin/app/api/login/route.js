import { NextResponse } from 'next/server';
import { checkLogin, makeSession, cookieOptions, COOKIE_NAME } from '@/lib/auth';

const tries = new Map(); // simple brute-force brake per IP
export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for') || 'local';
  const t = tries.get(ip) || { n: 0, until: 0 };
  if (t.until > Date.now()) return NextResponse.json({ error: 'Too many attempts — wait a minute' }, { status: 429 });
  const { email, password } = await req.json().catch(() => ({}));
  const user = await checkLogin(email, password);
  if (!user) {
    t.n++; if (t.n >= 5) { t.until = Date.now() + 60000; t.n = 0; } tries.set(ip, t);
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: 'Wrong email or password' }, { status: 401 });
  }
  tries.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, makeSession(user), cookieOptions);
  return res;
}
