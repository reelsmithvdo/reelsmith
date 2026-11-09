import Icon from '@/components/Icon';
import MediaLibrary from '@/components/MediaLibrary';

export const metadata = { title: 'Media' };
export default function Page() {
  return <>
    <div className="page-head"><span className="ic"><Icon name="media" size={22} /></span><div><h1>Media</h1><p>Images for posts. Always add alt text — it helps Google Images and accessibility.</p></div></div>
    <MediaLibrary />
  </>;
}
