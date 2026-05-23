'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from './useAdminAuth';
import styles from './layout.module.css';

const NAV_LINKS = [
  { href: '/admin/projects',   label: 'Projects',   icon: '◈' },
  { href: '/admin/sources',    label: 'Sources',    icon: '◇' },
  { href: '/admin/categories', label: 'Kategori',   icon: '◉' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, supabase } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Login page — render without sidebar (user is not yet authenticated)
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        Checking authentication…
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          RIZQAPUTRA
          <div className={styles.logoSub}>ADMIN PANEL</div>
        </div>

        <nav className={styles.nav}>
          {NAV_LINKS.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
              >
                <span className={styles.navIcon}>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          {user.email && (
            <div className={styles.userEmail}>{user.email}</div>
          )}
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
