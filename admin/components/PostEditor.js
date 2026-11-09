'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Icon from './Icon';
import MediaPicker from './MediaPicker';
import { slugify } from '@/lib/seo';
import { seoReport } from '@/lib/score';
import { adminSrc, toEditorHtml, fromEditorHtml } from '@/lib/assets';

const SITE = 'reelsmithapp.com';
// <input type="datetime-local"> wants local time without seconds.
const toLocal = (d) => { const x = new Date(d || Date.now()); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };

export default function PostEditor({ post, categories, others = [] }) {
  const router = useRouter();
  const isNew = !post._id;
  const [f, setF] = useState(() => ({
    title: post.title || '', slug: post.slug || '', excerpt: post.excerpt || '', section: post.section || 'blog',
    category: post.category || '', status: post.status || 'draft', publishAt: toLocal(post.publishAt),
    keywords: (post.keywords || []).join(', '), focusKeyword: post.focusKeyword || '', synonyms: post.synonyms || '', metaTitle: post.metaTitle || '', metaDescription: post.metaDescription || '',
    featuredImage: post.featuredImage || null, contentHtml: post.contentHtml || '', order: post.order ?? 99,
  }));
  const [slugEdited, setSlugEdited] = useState(!isNew);
  const [mode, setMode] = useState('view');
  const [picker, setPicker] = useState(null); // 'featured' | 'content'
  const [linkBox, setLinkBox] = useState(null);
  const [msg, setMsg] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setDirty(true); };

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true } }), Image],
    content: toEditorHtml(post.contentHtml),
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => { setF((x) => ({ ...x, contentHtml: fromEditorHtml(e.getHTML()) })); setDirty(true); },
  });
  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const seo = useMemo(() => seoReport(f, others), [f, others]);
  const [seoTab, setSeoTab] = useState('seo');
  const scheduled = f.status === 'published' && new Date(f.publishAt) > new Date();
  const saveLabel = f.status === 'draft' ? 'Save draft' : scheduled ? 'Schedule' : (isNew || post.status !== 'published') ? 'Publish' : 'Update';
  const urlPath = `/${f.section === 'tutorial' ? 'tutorials' : 'blog'}/${f.slug || 'your-post'}/`;

  async function save() {
    setBusy(true); setMsg(null);
    const body = { ...f, publishAt: new Date(f.publishAt).toISOString(), keywords: f.keywords };
    const r = await fetch(isNew ? '/admin/api/posts' : `/admin/api/posts/${post._id}`, { method: isNew ? 'POST' : 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg({ err: j.error || 'Could not save' }); return; }
    setDirty(false);
    setMsg({ ok: j.status === 'draft' ? (j.publishing ? 'Saved as draft — removed from the website.' : 'Draft saved.')
      : j.status === 'scheduled' ? `Scheduled — it goes live automatically on ${new Date(f.publishAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}.`
      : 'Published — the website updates automatically (live in about a minute).' });
    if (isNew) router.replace(`/posts/${j.id}`); else router.refresh();
  }
  async function remove() {
    if (!confirm(`Delete “${f.title}”? This cannot be undone.`)) return;
    await fetch(`/admin/api/posts/${post._id}`, { method: 'DELETE' });
    setDirty(false);
    router.push('/posts');
  }

  const tb = (icon, title, run, active) => <button type="button" title={title} aria-label={title} className={active ? 'on' : ''} onMouseDown={(e) => e.preventDefault()} onClick={run}><Icon name={icon} size={17} /></button>;
  const e = editor;
  const len = (s, lo, hi) => <span className={'count ' + (s.length > hi ? 'over' : s.length >= lo ? 'good' : '')}>{s.length}/{hi}</span>;
  const metaTitle = f.metaTitle || f.title;
  const metaDesc = f.metaDescription || f.excerpt;

  return (
    <>
      <div className="page-head">
        <span className="ic"><Icon name="file" size={22} /></span>
        <div><h1>{isNew ? 'New post' : 'Edit post'}</h1><p>{isNew ? 'Write and publish a blog post.' : <>On the site: <a href={'https://' + SITE + urlPath} target="_blank" rel="noopener">{urlPath}</a></>}</p></div>
      </div>
      <div className="edit-grid">
        <div>
          {msg && (msg.err ? <div className="err">{msg.err}</div> : <div className="okmsg">{msg.ok}</div>)}
          <label className="field"><span>Title</span><input className="input" value={f.title} onChange={(ev) => { const v = ev.target.value; setF((x) => ({ ...x, title: v, slug: slugEdited ? x.slug : slugify(v) })); setDirty(true); }} /></label>
          <label className="field"><span>Slug <small>{SITE}{urlPath}</small></span><input className="input" value={f.slug} onChange={(ev) => { setSlugEdited(true); set('slug', slugify(ev.target.value)); }} /></label>
          <label className="field"><span>Excerpt <small>Shown under the title and on the blog list</small></span><textarea className="textarea" rows={3} value={f.excerpt} onChange={(ev) => set('excerpt', ev.target.value)} /></label>

          <div className="field"><span>Featured image</span>
            <div className="feat">{f.featuredImage && f.featuredImage.src ? <img src={adminSrc(f.featuredImage.src)} alt={f.featuredImage.alt} /> : 'No image set'}</div>
            <button type="button" className="btn small" onClick={() => setPicker('featured')}>{f.featuredImage ? 'Change featured image' : 'Set featured image'}</button>
            {f.featuredImage && <button type="button" className="btn small" style={{ marginLeft: 8 }} onClick={() => set('featuredImage', null)}>Remove</button>}
          </div>

          <div className="row2">
            <label className="field"><span>Category</span><select className="select" value={f.category} onChange={(ev) => set('category', ev.target.value)}><option value="">Select a category</option>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
            <label className="field"><span>Status</span><select className="select" value={f.status} onChange={(ev) => set('status', ev.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label>
          </div>
          <div className="row2">
            <label className="field"><span>Publish date</span><input className="input" type="datetime-local" value={f.publishAt} onChange={(ev) => set('publishAt', ev.target.value)} />
              <div className="hint">Set Status to Published for this date to take effect — pick a future time to schedule it.</div></label>
            <label className="field"><span>Section</span><select className="select" value={f.section} onChange={(ev) => set('section', ev.target.value)}><option value="blog">Blog (/blog/)</option><option value="tutorial">Tutorial (/tutorials/)</option></select></label>
          </div>
          <label className="field"><span>Keywords (comma separated)</span><input className="input" placeholder="video editor, subtitles, free" value={f.keywords} onChange={(ev) => set('keywords', ev.target.value)} /></label>

          <div className="field"><span>Content <small>{seo.words} words</small></span>
            <div className="ed">
              <div className="ed-bar">
                {e && mode === 'view' && <>
                  {tb('bold', 'Bold', () => e.chain().focus().toggleBold().run(), e.isActive('bold'))}
                  {tb('italic', 'Italic', () => e.chain().focus().toggleItalic().run(), e.isActive('italic'))}
                  {tb('underline', 'Underline', () => e.chain().focus().toggleUnderline().run(), e.isActive('underline'))}
                  <button type="button" title="Heading 2" className={e.isActive('heading', { level: 2 }) ? 'on' : ''} onMouseDown={(ev) => ev.preventDefault()} onClick={() => e.chain().focus().toggleHeading({ level: 2 }).run()}><b style={{ fontSize: 12 }}>H2</b></button>
                  <button type="button" title="Heading 3" className={e.isActive('heading', { level: 3 }) ? 'on' : ''} onMouseDown={(ev) => ev.preventDefault()} onClick={() => e.chain().focus().toggleHeading({ level: 3 }).run()}><b style={{ fontSize: 12 }}>H3</b></button>
                  <span className="sep" />
                  {tb('ul', 'Bulleted list', () => e.chain().focus().toggleBulletList().run(), e.isActive('bulletList'))}
                  {tb('ol', 'Numbered list', () => e.chain().focus().toggleOrderedList().run(), e.isActive('orderedList'))}
                  {tb('quote', 'Quote', () => e.chain().focus().toggleBlockquote().run(), e.isActive('blockquote'))}
                  {tb('link', 'Link', () => setLinkBox({ href: e.getAttributes('link').href || '' }), e.isActive('link'))}
                  {tb('image', 'Image', () => setPicker('content'))}
                  <span className="sep" />
                  {tb('undo', 'Undo', () => e.chain().focus().undo().run())}
                  {tb('redo', 'Redo', () => e.chain().focus().redo().run())}
                </>}
                <div className="mode">{['view', 'html'].map((m) => <button type="button" key={m} className={mode === m ? 'on' : ''} onClick={() => { if (m === 'view' && mode === 'html' && e) e.commands.setContent(toEditorHtml(f.contentHtml), { emitUpdate: false }); setMode(m); }}>{m === 'view' ? 'View' : 'HTML'}</button>)}</div>
              </div>
              {linkBox && <div style={{ display: 'flex', gap: 8, padding: 10, borderBottom: '1px solid var(--line)' }}>
                <input className="input" autoFocus placeholder="https://… or /tutorials/…" value={linkBox.href} onChange={(ev) => setLinkBox({ href: ev.target.value })} onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); ev.currentTarget.nextSibling.click(); } }} />
                <button type="button" className="btn primary small" onClick={() => { const h = linkBox.href.trim(); if (h) e.chain().focus().extendMarkRange('link').setLink({ href: h }).run(); else e.chain().focus().unsetLink().run(); setLinkBox(null); }}>Apply</button>
                <button type="button" className="btn small" onClick={() => { e.chain().focus().unsetLink().run(); setLinkBox(null); }}>Remove link</button>
              </div>}
              <div className="ed-body" style={{ display: mode === 'view' ? 'block' : 'none' }}><EditorContent editor={editor} /></div>
              {mode === 'html' && <textarea className="ed-html" value={f.contentHtml} onChange={(ev) => set('contentHtml', ev.target.value)} spellCheck={false} />}
            </div>
          </div>

          <div className="save-bar">
            <button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : saveLabel}</button>
            {!isNew && <button className="btn danger" onClick={remove}><Icon name="trash" size={15} />Delete</button>}
            {dirty && <span className="muted small">Unsaved changes</span>}
          </div>
        </div>

        <aside className="edit-side">
          <div className="card">
            <div className="seo-score">
              <div className="ring" style={{ '--p': seo.score, '--c': seo.grade === 'good' ? 'var(--green)' : seo.grade === 'ok' ? 'var(--amber)' : 'var(--red)' }}><b>{seo.score}</b></div>
              <div><h2>SEO score</h2><div className="small muted">{seo.grade === 'good' ? 'Great — ready to rank.' : seo.grade === 'ok' ? 'Good start. Fix the red and orange items.' : 'Needs work before publishing.'}</div></div>
            </div>
            <label className="field" style={{ marginTop: 16 }}><span>Focus keyphrase</span><input className="input" placeholder="e.g. add subtitles to video" value={f.focusKeyword} onChange={(ev) => set('focusKeyword', ev.target.value)} /></label>
            <label className="field"><span>Synonyms <small>optional, comma separated</small></span><input className="input" placeholder="auto captions, subtitle generator" value={f.synonyms} onChange={(ev) => set('synonyms', ev.target.value)} /></label>
            <div className="tabs" style={{ display: 'inline-flex', marginBottom: 4 }}>{[['seo', 'SEO', seo.seo], ['read', 'Readability', seo.read]].map(([k, l, list]) => <a key={k} href="#" className={seoTab === k ? 'on' : ''} onClick={(ev) => { ev.preventDefault(); setSeoTab(k); }}>{l} <span className="muted">{list.filter((c) => c.status !== 'good').length || '✓'}</span></a>)}</div>
            <ul className="checks">{(seoTab === 'seo' ? seo.seo : seo.read).map((c) => <li key={c.id}><span className={'dot d-' + c.status} /><span><b style={{ fontWeight: 600 }}>{c.label}:</b> {c.text}</span></li>)}</ul>
          </div>
          <div className="card">
            <div className="card-h">Google preview</div>
            <div className="serp">
              <div className="u">Reelsmith <span>› {SITE}{urlPath.replace(/\/$/, '').replace(/\//g, ' › ').replace(/^ › /, ' › ')}</span></div>
              <div className="t">{(metaTitle || 'Post title').slice(0, 60)}{metaTitle.length > 60 ? '…' : ''}{metaTitle && ' | Reelsmith'}</div>
              <div className="d">{(metaDesc || 'Write a meta description so people know what they will learn.').slice(0, 160)}{metaDesc.length > 160 ? '…' : ''}</div>
            </div>
            <label className="field" style={{ marginTop: 16 }}><span>SEO title {len(f.metaTitle || f.title, 30, 60)}</span><input className="input" placeholder={f.title || 'Defaults to the post title'} value={f.metaTitle} onChange={(ev) => set('metaTitle', ev.target.value)} /></label>
            <label className="field" style={{ marginBottom: 0 }}><span>Meta description {len(f.metaDescription || f.excerpt, 120, 160)}</span><textarea className="textarea" rows={4} placeholder={f.excerpt || 'Defaults to the excerpt'} value={f.metaDescription} onChange={(ev) => set('metaDescription', ev.target.value)} /></label>
          </div>
        </aside>
      </div>
      {picker && <MediaPicker title={picker === 'featured' ? 'Featured image' : 'Insert image'} onClose={() => setPicker(null)} onPick={(m) => {
        if (picker === 'featured') set('featuredImage', { src: m.url, alt: m.alt });
        else e.chain().focus().setImage({ src: adminSrc(m.url), alt: m.alt }).run();
        setPicker(null);
      }} />}
    </>
  );
}
