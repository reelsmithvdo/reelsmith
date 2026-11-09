import { NextResponse } from 'next/server';
import { apiUser } from '@/lib/auth';
import { listCategories, saveCategory } from '@/lib/posts';

export async function GET() {
  if (!(await apiUser())) return NextResponse.json({ error: 'Sign in again' }, { status: 401 });
  return NextResponse.json(await listCategories());
}
export async function POST(req) {
  if (!(await apiUser())) return NextResponse.json({ error: 'Sign in again' }, { status: 401 });
  try { await saveCategory(null, await req.json()); return NextResponse.json({ ok: true }); }
  catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
