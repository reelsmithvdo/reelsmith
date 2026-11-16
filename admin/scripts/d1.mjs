// Lets a Node script use the admin's database through the same lib/*.js code as the admin:
//   import { useD1 } from './d1.mjs'; const d1 = await useD1();   … savePost(…) …   await d1.dispose();
// Local copy (.wrangler/state, what `npm run dev` uses) by default; the LIVE database with --live
// (needs `npx wrangler login`).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ADMIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function useD1({ live = process.argv.includes('--live') } = {}) {
  process.chdir(ADMIN);
  const { getPlatformProxy } = await import('wrangler');
  let configPath = path.join(ADMIN, 'wrangler.jsonc');
  if (live) {
    // Same config with the D1 binding marked "remote", in a temporary file next to it.
    const src = fs.readFileSync(configPath, 'utf8').replace(/("binding": "DB",)/, '$1 "remote": true,');
    configPath = path.join(ADMIN, '.wrangler', 'wrangler.live.jsonc');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, src.replace(/"\$schema": "[^"]*",/, '').replace(/"main": "[^"]*"/, `"main": "${path.join(ADMIN, '.open-next/worker.js')}"`).replace(/"directory": "\.open-next\/assets"/, `"directory": "${path.join(ADMIN, '.open-next/assets')}"`));
  }
  const proxy = await getPlatformProxy({ configPath, persist: true, remoteBindings: live });
  if (!proxy.env.DB) throw new Error('No DB binding');
  globalThis.__rsD1 = proxy.env.DB;
  console.log(`Database: ${live ? 'LIVE (Cloudflare D1 "reelsmith")' : 'local copy (.wrangler/state)'}`);
  return proxy;
}
