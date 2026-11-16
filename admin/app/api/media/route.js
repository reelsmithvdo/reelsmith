import { NextResponse } from 'next/server';
import { apiUser } from '@/lib/auth';
import { listMedia, saveMedia } from '@/lib/media';
import { slugify } from '@/lib/seo';

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
// The admin compresses images before upload (components/MediaPicker.js); this is the safety net for the
// database (D1, 5 GB). GIFs are uploaded as they are, so a large animated GIF is refused here.
const MAX = 2 * 1024 * 1024;

export async function GET() {
  if (!(await apiUser())) return NextResponse.json({ error: 'Sign in again' }, { status: 401 });
  return NextResponse.json(await listMedia());
}
export async function POST(req) {
  if (!(await apiUser())) return NextResponse.json({ error: 'Sign in again' }, { status: 401 });
  const form = await req.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'No file' }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: 'Use a JPG, PNG, WebP or GIF image' }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: file.type === 'image/gif' ? 'GIF is larger than 2 MB — use a shorter or smaller GIF, or a still image' : 'Image is still larger than 2 MB after compression' }, { status: 400 });
  const base = slugify(String(form.get('name') || file.name).replace(/\.[^.]+$/, '')) || 'image';
  const filename = `${base}-${Date.now().toString(36)}.${ext}`;
  const saved = await saveMedia({ filename, contentType: file.type, data: new Uint8Array(await file.arrayBuffer()), alt: String(form.get('alt') || ''), width: +form.get('width') || 0, height: +form.get('height') || 0 });
  return NextResponse.json(saved);
}
