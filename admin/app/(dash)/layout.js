import Sidebar from '@/components/Sidebar';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export default async function DashLayout({ children }) {
  const user = await requireUser();
  return <div className="shell"><Sidebar email={user.email} /><main className="main">{children}</main></div>;
}
