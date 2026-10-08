'use client';

import { usePathname } from 'next/navigation';
import { useAdminAuth } from './useAdminAuth';
import WorkspaceShell from './workspaces/WorkspaceShell';
import styles from './layout.module.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAdminAuth();
  const pathname = usePathname();

  // Login page — render without sidebar (user is not yet authenticated)
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        Checking authentication…
      </div>
    );
  }

  if (!user) return null;

  // The workspace is the home of the admin area; the portfolio's own admin pages are a section inside it.
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
