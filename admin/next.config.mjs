// Reelsmith admin. Lives at /admin (same domain as the website when deployed).
/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/admin',
  serverExternalPackages: ['mongodb'],
  poweredByHeader: false,
  turbopack: { root: new URL('.', import.meta.url).pathname },
  // Blog images are stored in MongoDB and published to /assets/blog/ on the website; inside the admin
  // they (and the site's other /assets) are shown through /admin/api/asset/… (see lib/assets.js).
  async headers() {
    // The dashboard must never appear in Google.
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }];
  },
};
export default nextConfig;
