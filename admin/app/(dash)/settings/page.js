import Icon from '@/components/Icon';
import PublishButton from '@/components/PublishButton';
import AccountForms from '@/components/AccountForms';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { searchConsole, analytics, serviceAccountEmail } from '@/lib/google';

export const metadata = { title: 'Settings' };
const ok = (p) => p.then(() => ({ ok: true }), (e) => ({ ok: false, e: e.message }));
export default async function Settings() {
  const user = await requireUser();
  const d = await db();
  const [mongo, gsc, ga, site] = await Promise.all([ok(d.command({ ping: 1 })), ok(searchConsole()), ok(analytics()), d.collection('settings').findOne({ _id: 'site' })]);
  const row = (label, s, extra) => <tr><td>{label}</td><td style={{ textAlign: 'left' }}>{s.ok ? <span className="badge b-published">Connected</span> : <span className="badge b-draft">Not connected</span>} {!s.ok && <span className="small muted">{String(s.e).split('.')[0]}</span>}{extra}</td></tr>;
  const lp = site && site.lastPublish;
  return <>
    <div className="page-head"><span className="ic"><Icon name="settings" size={22} /></span><div><h1>Settings</h1><p>Manage your account email and password, publishing and connections.</p></div></div>
    <AccountForms email={user.email} />
    <div className="grid g2" style={{ marginTop: 28 }}>
      <div className="card">
        <div className="card-h"><Icon name="rocket" />Website publishing</div>
        <p className="muted" style={{ marginTop: 0 }}>Automatic: publishing, updating or deleting a post updates reelsmithapp.com within about a minute, scheduled posts go live on their own (checked every hour), and the sitemap is re-sent to Google after each change. Use the button only if the site looks out of date.</p>
        <PublishButton />
        {site && (site.sitemapPending || site.lastSitemapSubmit) && <p className={'small ' + (site.lastSitemapSubmit && !site.lastSitemapSubmit.ok && !site.sitemapPending ? 'down' : 'muted')}>Google sitemap: {site.sitemapPending ? 'will be sent to Google within the hour (after the site rebuilds)' : site.lastSitemapSubmit.ok ? 'sent ' + new Date(site.lastSitemapSubmit.at).toLocaleString() : 'not sent — ' + site.lastSitemapSubmit.error}</p>}
        {lp && <p className={'small ' + (lp.ok ? 'muted' : 'down')}>Last update: {new Date(lp.at).toLocaleString()}{lp.posts != null ? ` · ${lp.posts} live posts` : ''} · {lp.ok ? 'OK' : 'failed — ' + String(lp.log || '').slice(0, 160)}</p>}
      </div>
      <div className="card">
        <div className="card-h"><Icon name="globe" />Connections</div>
        <table className="t"><tbody>
          {row('MongoDB', mongo)}
          {row('Search Console', gsc)}
          {row('Google Analytics', ga)}
          <tr><td>Google account</td><td style={{ textAlign: 'left' }} className="small">{serviceAccountEmail() || '—'}</td></tr>
          <tr><td>Admin login</td><td style={{ textAlign: 'left' }} className="small">{user.email}</td></tr>
        </tbody></table>
      </div>
    </div>
  </>;
}
