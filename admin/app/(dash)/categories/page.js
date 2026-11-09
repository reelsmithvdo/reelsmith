import Icon from '@/components/Icon';
import Categories from '@/components/Categories';
import { listCategories } from '@/lib/posts';
import { plain } from '@/lib/db';

export const metadata = { title: 'Categories' };
export default async function Page() {
  return <>
    <div className="page-head"><span className="ic"><Icon name="tag" size={22} /></span><div><h1>Categories</h1><p>Group posts by topic.</p></div></div>
    <Categories items={plain(await listCategories())} />
  </>;
}
