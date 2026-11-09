import { NextResponse } from 'next/server';
import { Readable } from 'stream';
import { apiUser } from '@/lib/auth';
import { db, bucket } from '@/lib/db';
import { slugify } from '@/lib/seo';

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAX = 6 * 1024 * 1024;
const shape = (f) => ({ id: String(f._id), filename: f.filename, url: '/assets/blog/' + f.filename, alt: f.metadata?.alt || '', width: f.metadata?.width || 0, height: f.metadata?.height || 0, size: f.length, uploadedAt: f.uploadDate });

export async function GET() {
  if (!(await apiUser())) return NextResponse.json({ error: 'Sign in again' }, { status: 401 });
  const files = await (await db()).collection('media.files').find().sort({ uploadDate: -1 }).limit(500).toArray();
  return NextResponse.json(files.map(shape));
}
export async function POST(req) {
  if (!(await apiUser())) return NextResponse.json({ error: 'Sign in again' }, { status: 401 });
  const form = await req.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'No file' }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: 'Use a JPG, PNG, WebP or GIF image' }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: 'Image is larger than 6 MB' }, { status: 400 });
  const base = slugify(String(form.get('name') || file.name).replace(/\.[^.]+$/, '')) || 'image';
  const filename = `${base}-${Date.now().toString(36)}.${ext}`;
  const meta = { alt: String(form.get('alt') || '').slice(0, 200), width: +form.get('width') || 0, height: +form.get('height') || 0, contentType: file.type };
  const b = await bucket();
  const up = b.openUploadStream(filename, { metadata: meta });
  const data = Buffer.from(await file.arrayBuffer());
  await new Promise((res, rej) => Readable.from(data).pipe(up).on('finish', res).on('error', rej));
  const saved = await (await db()).collection('media.files').findOne({ _id: up.id });
  return NextResponse.json(shape(saved));
}
