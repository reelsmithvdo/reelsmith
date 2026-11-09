'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon';

const items = [
  ['/', 'Dashboard', 'dashboard'], ['/posts', 'Posts', 'posts'], ['/categories', 'Categories', 'tag', 'sub'], ['/media', 'Media', 'media'], ['/settings', 'Settings', 'settings'],
];
export default function Sidebar({ email }) {
  const path = usePathname();
  const on = (h) => (h === '/' ? path === '/' : path.startsWith(h));
  return (
    <aside className="side">
      <div className="brand"><img src="/admin/logo.png" alt="" /><div><b>Reelsmith</b><span>Admin</span></div></div>
      <div className="nav-label">Manage</div>
      <nav className="nav">
        {items.map(([h, l, i, cls]) => <Link key={h} href={h} className={(on(h) ? 'on ' : '') + (cls || '')}><Icon name={i} />{l}</Link>)}
        <div className="gap" />
        <a href="https://reelsmithapp.com/" target="_blank" rel="noopener"><Icon name="external" />View site</a>
      </nav>
      <div className="side-foot">
        <div className="me"><span className="avatar">{(email || '?')[0].toUpperCase()}</span><span>{email}</span></div>
        <button className="linkbtn" onClick={async () => { await fetch('/admin/api/logout', { method: 'POST' }); location.href = '/admin/login'; }}><Icon name="logout" />Log out</button>
      </div>
    </aside>
  );
}
