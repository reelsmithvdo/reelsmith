import { NextResponse } from 'next/server';
import { apiUser } from '@/lib/auth';
import { getMedia, setMediaAlt, deleteMedia, mediaUsage } from '@/lib/media';

export async function PATCH(req, { params }) {
  if (!(await apiUser())) return NextResponse.json({ error: 'Sign in again' }, { status: 401 });
  const { id } = await params;
  const { alt } = await req.json();
  await setMediaAlt(id, alt);
  return NextResponse.json({ ok: true });
}
export async function DELETE(req, { params }) {
  if (!(await apiUser())) return NextResponse.json({ error: 'Sign in again' }, { status: 401 });
  const { id } = await params;
  const f = await getMedia(id);
  if (!f) return NextResponse.json({ ok: true });
  const used = await mediaUsage(f.filename);
  if (used) return NextResponse.json({ error: `Used in ${used} post${used > 1 ? 's' : ''} — remove it there first` }, { status: 409 });
  await deleteMedia(id);
  return NextResponse.json({ ok: true });
}
