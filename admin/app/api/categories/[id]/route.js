import { NextResponse } from 'next/server';
import { apiUser } from '@/lib/auth';
import { saveCategory, deleteCategory } from '@/lib/posts';
import { autoPublish } from '@/lib/autopublish';

export async function PUT(req, { params }) {
  if (!(await apiUser())) return NextResponse.json({ error: 'Sign in again' }, { status: 401 });
  const { id } = await params;
  try { const r = await saveCategory(id, await req.json()); if (r.affectsSite) await autoPublish(); return NextResponse.json({ ok: true }); }
  catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
export async function DELETE(req, { params }) {
  if (!(await apiUser())) return NextResponse.json({ error: 'Sign in again' }, { status: 401 });
  const { id } = await params;
  const r = await deleteCategory(id);
  if (r && r.affectsSite) await autoPublish();
  return NextResponse.json({ ok: true });
}
