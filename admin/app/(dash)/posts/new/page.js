import PostEditor from '@/components/PostEditor';
import { listCategories, listPosts } from '@/lib/posts';
import { plain } from '@/lib/db';

export const metadata = { title: 'New post' };
export default async function NewPost() {
  const others = (await listPosts()).filter((p) => p.focusKeyword).map((p) => ({ title: p.title, focusKeyphrase: p.focusKeyword }));
  return <PostEditor post={{ status: 'draft', section: 'blog', publishAt: new Date().toISOString() }} categories={plain(await listCategories())} others={others} />;
}
