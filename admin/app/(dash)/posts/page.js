import Link from 'next/link';
import Icon from '@/components/Icon';
import { listPosts, counts, effectiveStatus, SECTIONS, listCategories } from '@/lib/posts';

export const metadata = { title: 'Posts' };
const TABS = [['', 'All'], ['published', 'Published'], ['scheduled', 'Scheduled'], ['draft', 'Drafts']];

export default async function Posts({ searchParams }) {
  const sp = await searchParams;
  const status = TABS.some((t) => t[0] === sp.status) ? sp.status : '';
  const q = String(sp.q || '').slice(0, 100);
  const section = SECTIONS[sp.section] ? sp.section : '';
  const [posts, c, cats] = await Promise.all([listPosts({ q, status, section }), counts(), listCategories()]);
  const catName = (s) => (cats.find((x) => x.slug === s) || {}).name || '—';
  const qs = (o) => '?' + new URLSearchParams(Object.entries(Object.assign({ status, q, section }, o)).filter(([, v]) => v)).toString();
  return (
    <>
      <div className="page-head">
        <span className="ic"><Icon name="posts" size={22} /></span>
        <div><h1>Posts</h1><p>Blog posts and tutorials. Publish site to update reelsmithapp.com.</p></div>
        <div className="actions"><Link href="/posts/new" className="btn primary"><Icon name="plus" />New post</Link></div>
      </div>
      <form className="toolbar">
        <div className="tabs">{TABS.map(([k, l]) => <Link key={k} href={qs({ status: k })} className={status === k ? 'on' : ''}>{l} <span className="muted">{k ? c[k] : c.total}</span></Link>)}</div>
        <select className="select" name="section" defaultValue={section} style={{ width: 160 }}><option value="">Blog + Tutorials</option>{Object.entries(SECTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        {status && <input type="hidden" name="status" value={status} />}
        <input className="input" name="q" defaultValue={q} placeholder="Search titles…" style={{ width: 240 }} />
        <button className="btn">Filter</button>
      </form>
      <table className="plist">
        <thead><tr><th>Title</th><th>Status</th><th>Category</th><th>SEO</th><th>Updated</th></tr></thead>
        <tbody>
          {posts.map((p) => { const st = effectiveStatus(p); const sc = p.seoScore ?? 0; return (
            <tr key={p._id}>
              <td className="ttl"><Link href={`/posts/${p._id}`}>{p.title}</Link><div>/{p.section === 'tutorial' ? 'tutorials' : 'blog'}/{p.slug}/</div></td>
              <td><span className={'badge b-' + st}>{st[0].toUpperCase() + st.slice(1)}</span>{st === 'scheduled' && <div className="date">{new Date(p.publishAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</div>}</td>
              <td>{catName(p.category)}</td>
              <td><span className={'score s-' + (sc >= 80 ? 'good' : sc >= 50 ? 'ok' : 'bad')} title="SEO score">{sc}</span></td>
              <td className="date">{new Date(p.updatedAt).toLocaleDateString('en-US')}</td>
            </tr>); })}
          {!posts.length && <tr><td colSpan={5} className="empty">No posts match.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
