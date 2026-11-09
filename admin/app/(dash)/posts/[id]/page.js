import { notFound } from 'next/navigation';
import PostEditor from '@/components/PostEditor';
import { getPost, listCategories, listPosts } from '@/lib/posts';
import { plain } from '@/lib/db';

export const metadata = { title: 'Edit post' };
export default async function EditPost({ params }) {
  const { id } = await params;
  const post = await getPost(id).catch(() => null);
  if (!post) notFound();
  const others = (await listPosts()).filter((p) => String(p._id) !== String(post._id) && p.focusKeyword).map((p) => ({ title: p.title, focusKeyphrase: p.focusKeyword }));
  return <PostEditor key={String(post._id) + String(post.updatedAt)} post={plain(post)} categories={plain(await listCategories())} others={others} />;
}
