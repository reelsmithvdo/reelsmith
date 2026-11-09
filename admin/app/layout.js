import './globals.css';

export const metadata = { title: { default: 'Reelsmith Admin', template: '%s · Reelsmith Admin' }, robots: { index: false, follow: false }, icons: { icon: '/admin/logo.png' } };

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
