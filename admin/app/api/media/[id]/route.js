import { NextResponse } from 'next/server';
import { apiUser } from '@/lib/auth';
import { db, bucket, oid } from '@/lib/db';

export async function PATCH(req, { params }) {
  if (!(await apiUser())) return NextResponse.json({ error: 'Sign in again' }, { status: 401 });
  const { id } = await params;
  const { alt } = await req.json();
  await (await db()).collection('media.files').updateOne({ _id: oid(id) }, { $set: { 'metadata.alt': String(alt || '').slice(0, 200) } });
  return NextResponse.json({ ok: true });
}
export async function DELETE(req, { params }) {
  if (!(await apiUser())) return NextResponse.json({ error: 'Sign in again' }, { status: 401 });
  const { id } = await params;
  const d = await db();
  const f = await d.collection('media.files').findOne({ _id: oid(id) });
  if (!f) return NextResponse.json({ ok: true });
  const used = await d.collection('posts').countDocuments({ $or: [{ contentHtml: { $regex: f.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') } }, { 'featuredImage.src': '/assets/blog/' + f.filename }] });
  if (used) return NextResponse.json({ error: `Used in ${used} post${used > 1 ? 's' : ''} — remove it there first` }, { status: 409 });
  await (await bucket()).delete(f._id);
  return NextResponse.json({ ok: true });
}
