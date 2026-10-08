'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from '../useAdminAuth';
import { isPortfolioPath, isToolsPath } from './nav';
import styles from './workspaces.module.css';

const icon = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
};

// 1 = the portfolio's own admin pages, 2 = tools. 3–5 are reserved (invoices, posting calendar, archive).
const ITEMS = [
  {
    href: '/admin/projects',
    label: 'Admin portfolio',
    svg: <svg {...icon}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
  },
  {
    href: '/admin/workspaces/tools',
    label: 'Tools',
    svg: <svg {...icon}><path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.5 2.5-2.7-.7-.7-2.7 2.5-2.5z" /></svg>,
  },
];

export default function WorkspaceRail() {
  const pathname = usePathname();
  const router = useRouter();
  const { supabase } = useAdminAuth();

  const logout = async () => {
    await supabase?.auth.signOut();
    router.push('/admin/login');
  };

  return (
    <aside className={styles.rail}>
      <nav className={styles.railNav} aria-label="Navigasi workspace">
        {ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.railBtn} ${(item.href === '/admin/projects' ? isPortfolioPath(pathname) : isToolsPath(pathname)) ? styles.railActive : ''}`}
            aria-label={item.label}
          >
            {item.svg}
            <span className={styles.railLabel}>{item.label}</span>
          </Link>
        ))}
      </nav>

      <button className={`${styles.railBtn} ${styles.logout}`} onClick={logout} aria-label="Keluar">
        <svg {...icon}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
        <span className={styles.railLabel}>Keluar</span>
      </button>
    </aside>
  );
}
