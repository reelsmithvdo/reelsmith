// Single-owner login. The account lives in MongoDB (`users`, one document) so email and password can be
// changed in Settings. On the very first sign-in it is created from ADMIN_EMAIL + ADMIN_PASSWORD_HASH.
// Sessions are signed cookies (HMAC-SHA256) carrying the account's version: changing the password bumps
// the version, which signs out every other device.
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';

const COOKIE = 'rs_admin';
const DAYS = 14;
const sign = (v) => crypto.createHmac('sha256', process.env.SESSION_SECRET || 'dev').update(v).digest('base64url');

// Password hash format: "<salt hex>:<scrypt hex>".
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.scryptSync(String(password), salt, 64).toString('hex');
}
function verifyHash(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const got = crypto.scryptSync(String(password || ''), salt, 64), exp = Buffer.from(hash, 'hex');
  return got.length === exp.length && crypto.timingSafeEqual(got, exp);
}
const norm = (e) => String(e || '').trim().toLowerCase();

async function account() {
  const users = (await db()).collection('users');
  let u = await users.findOne({ _id: 'owner' });
  if (!u && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH) {
    u = { _id: 'owner', email: norm(process.env.ADMIN_EMAIL), passwordHash: process.env.ADMIN_PASSWORD_HASH, v: 1, createdAt: new Date() };
    await users.insertOne(u).catch(() => {});
    u = await users.findOne({ _id: 'owner' });
  }
  return u;
}

export async function checkLogin(email, password) {
  const u = await account();
  return !!u && norm(email) === u.email && verifyHash(password, u.passwordHash) ? u : null;
}
export function makeSession(u) {
  const body = Buffer.from(JSON.stringify({ email: u.email, v: u.v || 1, exp: Date.now() + DAYS * 864e5 })).toString('base64url');
  return body + '.' + sign(body);
}
function readSession(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const good = sign(body);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try { const s = JSON.parse(Buffer.from(body, 'base64url').toString()); return s.exp > Date.now() ? s : null; } catch { return null; }
}
export const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: DAYS * 86400 };
export const COOKIE_NAME = COOKIE;

// The signed-in owner (null when signed out, expired, or signed out by a password change).
export async function currentUser() {
  const s = readSession((await cookies()).get(COOKIE)?.value);
  if (!s) return null;
  const u = await account();
  return u && u.email === s.email && (u.v || 1) === s.v ? { email: u.email } : null;
}
export async function requireUser() {
  const u = await currentUser();
  if (!u) redirect('/login');
  return u;
}
export async function apiUser() { return currentUser(); }

// Settings: change the email or the password (both need the current password).
export async function changeEmail(newEmail, currentPassword) {
  const u = await account();
  if (!u || !verifyHash(currentPassword, u.passwordHash)) throw new Error('Current password is wrong');
  const email = norm(newEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address');
  await (await db()).collection('users').updateOne({ _id: 'owner' }, { $set: { email, updatedAt: new Date() } });
  return { ...u, email };
}
export async function changePassword(currentPassword, next, confirm) {
  const u = await account();
  if (!u || !verifyHash(currentPassword, u.passwordHash)) throw new Error('Current password is wrong');
  if (String(next).length < 10) throw new Error('Use at least 10 characters for the new password');
  if (next !== confirm) throw new Error('The new passwords do not match');
  if (verifyHash(next, u.passwordHash)) throw new Error('The new password is the same as the current one');
  const v = (u.v || 1) + 1;
  await (await db()).collection('users').updateOne({ _id: 'owner' }, { $set: { passwordHash: hashPassword(next), v, updatedAt: new Date() } });
  return { ...u, v };
}
