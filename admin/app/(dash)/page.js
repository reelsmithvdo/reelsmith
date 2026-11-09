import Link from 'next/link';
import Icon from '@/components/Icon';
import { Stat, Delta, BarList, DailyChart } from '@/components/Dash';
import { counts, listPosts, effectiveStatus } from '@/lib/posts';
import { searchConsole, analytics, serviceAccountEmail } from '@/lib/google';

export const metadata = { title: 'Dashboard' };
const n = (v) => Math.round(v).toLocaleString('en-US');
const pct = (v) => (v * 100).toFixed(1) + '%';
const COUNTRY = new Intl.DisplayNames(['en'], { type: 'region' });
// Search Console gives ISO-3 country codes (e.g. "bgd"); show readable names.
const ISO3 = { usa: 'US', gbr: 'GB', ind: 'IN', bgd: 'BD', can: 'CA', aus: 'AU', deu: 'DE', fra: 'FR', phl: 'PH', nld: 'NL', pak: 'PK', bra: 'BR', idn: 'ID', nga: 'NG', egy: 'EG', are: 'AE', sau: 'SA', esp: 'ES', ita: 'IT', mex: 'MX', tur: 'TR', vnm: 'VN', jpn: 'JP', kor: 'KR', chn: 'CN', rus: 'RU', zaf: 'ZA', mys: 'MY', npl: 'NP', lka: 'LK', cze: 'CZ', pol: 'PL', swe: 'SE', irl: 'IE', sgp: 'SG' };
const country = (c) => { const two = ISO3[String(c).toLowerCase()]; try { return two ? COUNTRY.of(two) : String(c).toUpperCase(); } catch { return String(c).toUpperCase(); } };
const dur = (s) => `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US');
const greeting = () => { const h = +new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Dhaka' }); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const safe = (p) => p.then((v) => ({ v }), (e) => ({ e: e.message }));

export default async function Dashboard() {
  const [c, recent, gs, ga] = await Promise.all([counts(), listPosts(), safe(searchConsole()), safe(analytics())]);
  const s = gs.v, a = ga.v;
  return (
    <>
      <div className="page-head">
        <span className="ic"><Icon name="dashboard" size={22} /></span>
        <div><h1>Dashboard</h1><p>{greeting()}! Here's how the site and blog are doing.</p></div>
        <div className="actions"><Link href="/posts/new" className="btn primary"><Icon name="plus" />New post</Link></div>
      </div>

      <div className="top-split">
        <div className="stats4">
          <Stat label="Total posts" value={c.total} icon="file" color="blue" />
          <Stat label="Published" value={c.published} icon="check" color="green" />
          <Stat label="Scheduled" value={c.scheduled} icon="calendar" color="violet" />
          <Stat label="Drafts" value={c.draft} icon="pencil" color="amber" />
        </div>
        <div className="card">
          <div className="card-h"><Icon name="clock" />Recently updated<Link className="r" href="/posts">All posts</Link></div>
          <ul className="recent">
            {recent.slice(0, 5).map((p) => { const st = effectiveStatus(p); return <li key={p._id}><Link href={`/posts/${p._id}`}>{p.title}</Link><span className={'badge b-' + st}>{st[0].toUpperCase() + st.slice(1)}</span><span className="date">{fmtDate(p.updatedAt)}</span></li>; })}
            {!recent.length && <li className="empty">No posts yet — <Link href="/posts/new">write the first one</Link></li>}
          </ul>
        </div>
      </div>

      <div className="section-h"><Icon name="search" size={20} />Google Search</div>
      {gs.e ? <div className="connect">Search Console isn't connected: {gs.e}</div> : <>
        <div className="section-sub"><span>Search Console, last 28 days ({fmtDate(s.range.start + 'T12:00:00Z')} – {fmtDate(s.range.end + 'T12:00:00Z')}). Data lags 2–3 days.</span><a href="https://search.google.com/search-console?resource_id=sc-domain%3Areelsmithapp.com" target="_blank" rel="noopener">Open Search Console</a></div>
        <div className="grid g4">
          <Stat label="Clicks" value={n(s.totals.clicks)} icon="click" color="blue" delta={<Delta now={s.totals.clicks} prev={s.previous.clicks} />} sub="vs previous 28 days" />
          <Stat label="Impressions" value={n(s.totals.impressions)} icon="eye" color="violet" delta={<Delta now={s.totals.impressions} prev={s.previous.impressions} />} sub="vs previous 28 days" />
          <Stat label="Click-through rate" value={pct(s.totals.ctr)} icon="percent" color="green" delta={<Delta now={s.totals.ctr} prev={s.previous.ctr} />} sub="vs previous 28 days" />
          <Stat label="Avg. position" value={s.totals.position ? s.totals.position.toFixed(1) : '—'} icon="trend" color="amber" delta={s.previous.position ? <Delta now={s.totals.position} prev={s.previous.position} pct={false} invert digits={1} /> : null} sub={s.previous.position ? 'vs previous 28 days' : 'lower is better'} />
        </div>
        <div style={{ marginTop: 16 }}><DailyChart series={s.series} /></div>
        <div className="grid g2" style={{ marginTop: 16 }}>
          <div className="card"><div className="card-h"><Icon name="search" />Top search queries</div><Table rows={s.queries} head="Query" /></div>
          <div className="card"><div className="card-h"><Icon name="file" />Top pages in Google</div><Table rows={s.pages} head="Page" /></div>
        </div>
        <div className="grid g3" style={{ marginTop: 16 }}>
          <div className="card"><div className="card-h"><Icon name="globe" />Countries <span className="muted small">Impressions</span></div><BarList rows={s.countries.map((r) => ({ key: country(r.key), value: r.impressions }))} /></div>
          <div className="card"><div className="card-h"><Icon name="devices" />Devices <span className="muted small">Impressions</span></div><BarList rows={s.devices.map((r) => ({ key: r.key[0] + r.key.slice(1).toLowerCase(), value: r.impressions }))} /></div>
          <div className="card"><div className="card-h"><Icon name="map" />Sitemaps</div>{s.sitemaps.map((m) => <div key={m.path} style={{ marginBottom: 10 }}><div>{m.path}</div><div className="small muted">{m.submitted} URLs · <span className={m.errors ? 'down' : 'up'}>{m.errors ? m.errors + ' errors' : '✓ No errors'}</span></div><div className="small muted">Read by Google {m.lastDownloaded ? fmtDate(m.lastDownloaded) : 'not yet'}</div></div>)}</div>
        </div>
      </>}

      <div className="section-h"><Icon name="activity" size={20} />Visitors</div>
      <div className="section-sub"><span>Google Analytics, last 30 days. Counts visitors who allowed analytics in the cookie banner.</span><a href="https://analytics.google.com/analytics/web/" target="_blank" rel="noopener">Open Analytics</a></div>
      {ga.e ? <div className="connect"><b>Connect Google Analytics</b> — {ga.e.split('.')[0]}.
        <ol><li>Enable the <a href="https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com?project=reel-smith" target="_blank" rel="noopener">Google Analytics Data API</a> (click <b>Enable</b>).</li>
          <li>Google Analytics ▸ Admin ▸ Property access management ▸ <b>+</b> ▸ Add users: <code>{serviceAccountEmail()}</code> as <b>Viewer</b>.</li></ol></div> : <>
        <div className="grid g6">
          <Stat label="Visitors" value={n(a.visitors)} icon="users" color="blue" />
          <Stat label="New visitors" value={n(a.newVisitors)} icon="userplus" color="green" />
          <Stat label="Sessions" value={n(a.sessions)} icon="pulse" color="violet" />
          <Stat label="Page views" value={n(a.pageViews)} icon="eye" color="blue" />
          <Stat label="Avg. session" value={dur(a.avgSession)} icon="clock" color="amber" />
          <Stat label="Engagement rate" value={pct(a.engagement)} icon="percent" color="green" />
        </div>
        <div className="grid g3" style={{ marginTop: 16 }}>
          <div className="card"><div className="card-h"><Icon name="globe" />Top countries <span className="muted small">Visitors</span></div><BarList rows={a.countries} /></div>
          <div className="card"><div className="card-h"><Icon name="file" />Top pages <span className="muted small">Page views</span></div><BarList rows={a.pages} /></div>
          <div className="card"><div className="card-h"><Icon name="devices" />Devices <span className="muted small">Visitors</span></div><BarList rows={a.devices.map((r) => ({ ...r, key: r.key[0].toUpperCase() + r.key.slice(1) }))} /></div>
        </div>
      </>}
    </>
  );
}

function Table({ rows, head }) {
  if (!rows.length) return <div className="empty">No data yet — Google needs a few days of searches.</div>;
  return (
    <table className="t"><thead><tr><th>{head}</th><th>Clicks</th><th>Impr.</th><th>CTR</th><th>Pos.</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.key}><td title={r.key}>{r.key}</td><td>{r.clicks}</td><td>{r.impressions}</td><td>{(r.ctr * 100).toFixed(1)}%</td><td>{r.position.toFixed(1)}</td></tr>)}</tbody></table>
  );
}
