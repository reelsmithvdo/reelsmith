// Reelsmith admin. Lives at /admin (same domain as the website when deployed).
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

// `next dev` gets the Cloudflare bindings from wrangler.jsonc — the D1 database "DB" as a local copy in .wrangler/state.
initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/admin',
  poweredByHeader: false,
  turbopack: { root: new URL('.', import.meta.url).pathname },
  // Blog images are stored in the database (D1) and published to /assets/blog/ on the website; inside the admin
  // they (and the site's other /assets) are shown through /admin/api/asset/… (see lib/assets.js).
  async headers() {
    // The dashboard must never appear in Google.
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }];
  },
};
export default nextConfig;
