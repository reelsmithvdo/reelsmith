import { NextResponse } from 'next/server';
import { apiUser } from '@/lib/auth';
import { savePost } from '@/lib/posts';
import { autoPublish } from '@/lib/autopublish';

export async function POST(req) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: 'Sign in again' }, { status: 401 });
  try {
    const r = await savePost(null, await req.json(), user);
    if (r.affectsSite) await autoPublish();
    return NextResponse.json({ ok: true, id: r.id, status: r.status, publishing: r.affectsSite });
  }
  catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
