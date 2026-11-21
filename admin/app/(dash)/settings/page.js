import Icon from '@/components/Icon';
import PublishButton from '@/components/PublishButton';
import AccountForms from '@/components/AccountForms';
import { requireUser } from '@/lib/auth';
import { first, getSettings } from '@/lib/db';
import { searchConsole, analytics, serviceAccountEmail } from '@/lib/google';
import { facebookStatus, shareQueue, missedShares } from '@/lib/facebook';

export const metadata = { title: 'Settings' };
const ok = (p) => p.then(() => ({ ok: true }), (e) => ({ ok: false, e: e.message }));
export default async function Settings() {
  const user = await requireUser();
  const [database, gsc, ga, site, fbPage, fb] = await Promise.all([ok(first('SELECT 1 AS ok')), ok(searchConsole()), ok(analytics()), getSettings(), facebookStatus().then((r) => ({ ok: true, name: r.name }), (e) => ({ ok: false, e: e.message })), getSettings('facebook')]);
  const fbQueue = fbPage.ok ? (await shareQueue(Date.now(), (fb && fb.shared) || {})).length : 0;
  const fbMissed = fbPage.ok ? await missedShares(Date.now(), fb || {}) : [];
  const row = (label, s, extra) => <tr><td>{label}</td><td style={{ textAlign: 'left' }}>{s.ok ? <span className="badge b-published">Connected</span> : <span className="badge b-draft">Not connected</span>} {!s.ok && <span className="small muted">{String(s.e).split('.')[0]}</span>}{extra}</td></tr>;
  const lp = site && site.lastPublish;
  return <>
    <div className="page-head"><span className="ic"><Icon name="settings" size={22} /></span><div><h1>Settings</h1><p>Manage your account email and password, publishing and connections.</p></div></div>
    <AccountForms email={user.email} />
    <div className="grid g2" style={{ marginTop: 28 }}>
      <div className="card">
        <div className="card-h"><Icon name="rocket" />Website publishing</div>
        <p className="muted" style={{ marginTop: 0 }}>Automatic: publishing, updating or deleting a post updates reelsmithapp.com within about a minute, scheduled posts go live on their own (checked twice an hour), new posts are shared on the Facebook Page, and the sitemap is re-sent to Google after each change. Use the button only if the site looks out of date.</p>
        <PublishButton />
        {site && (site.sitemapPending || site.lastSitemapSubmit) && <p className={'small ' + (site.lastSitemapSubmit && !site.lastSitemapSubmit.ok && !site.sitemapPending ? 'down' : 'muted')}>Google sitemap: {site.sitemapPending ? 'will be sent to Google within the hour (after the site rebuilds)' : site.lastSitemapSubmit.ok ? 'sent ' + new Date(site.lastSitemapSubmit.at).toLocaleString() : 'not sent — ' + site.lastSitemapSubmit.error}</p>}
        {lp && <p className={'small ' + (lp.ok ? 'muted' : 'down')}>Last update: {new Date(lp.at).toLocaleString()}{lp.posts != null ? ` · ${lp.posts} live posts` : ''} · {lp.ok ? 'OK' : 'failed — ' + String(lp.log || '').slice(0, 160)}</p>}
      </div>
      <div className="card">
        <div className="card-h"><Icon name="globe" />Connections</div>
        <table className="t"><tbody>
          {row('Database (Cloudflare D1)', database)}
          {row('Search Console', gsc)}
          {row('Google Analytics', ga)}
          {row('Facebook Page', fbPage, <span className="small muted">{fbPage.ok ? ` ${fbPage.name} · posts are shared automatically, up to 2 a day · ${fbQueue} waiting` : ''}{fbMissed.length ? <span className="down">{` · ${fbMissed.length} missed: ${fbMissed.map((m) => m.title).join(', ')}`}</span> : ''}{fb && fb.last ? ` · last share ${new Date(fb.last.at).toLocaleString()}: ${fb.last.ok ? fb.last.key : 'failed — ' + fb.last.error}` : ''}</span>)}
          <tr><td>Google account</td><td style={{ textAlign: 'left' }} className="small">{serviceAccountEmail() || '—'}</td></tr>
          <tr><td>Admin login</td><td style={{ textAlign: 'left' }} className="small">{user.email}</td></tr>
        </tbody></table>
      </div>
    </div>
  </>;
}
