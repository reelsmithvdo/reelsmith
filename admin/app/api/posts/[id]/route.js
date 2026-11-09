import { NextResponse } from 'next/server';
import { apiUser } from '@/lib/auth';
import { savePost, deletePost } from '@/lib/posts';
import { autoPublish } from '@/lib/autopublish';

export async function PUT(req, { params }) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: 'Sign in again' }, { status: 401 });
  const { id } = await params;
  try {
    const r = await savePost(id, await req.json(), user);
    if (r.affectsSite) await autoPublish();
    return NextResponse.json({ ok: true, id, status: r.status, publishing: r.affectsSite });
  }
  catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
export async function DELETE(req, { params }) {
  if (!(await apiUser())) return NextResponse.json({ error: 'Sign in again' }, { status: 401 });
  const { id } = await params;
  const r = await deletePost(id);
  if (r.affectsSite) await autoPublish();
  return NextResponse.json({ ok: true, publishing: r.affectsSite });
}
