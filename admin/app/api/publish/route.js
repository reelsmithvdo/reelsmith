import { NextResponse } from 'next/server';
import { apiUser } from '@/lib/auth';
import { publishSite } from '@/lib/publish';

// Signed-in admin, or the website Worker's hourly scheduler. This Worker is reachable only through the
// website Worker, which strips x-rs-scheduler from visitors' requests and sets it only for its cron.
const cronOk = (req) => req.headers.get('x-rs-scheduler') === '1';
export async function POST(req) {
  if (!(await apiUser()) && !cronOk(req)) return NextResponse.json({ error: 'Sign in again' }, { status: 401 });
  try { return NextResponse.json(await publishSite()); }
  catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
