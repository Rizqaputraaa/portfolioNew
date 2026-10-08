'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from '../useAdminAuth';
import WorkspaceRail from './WorkspaceRail';
import { AddClient, PinSheet, QuickTodo, type CreatedPins } from './WorkspaceModals';
import { useAdminCall } from './useAdminCall';
import { PORTFOLIO_TABS, WORKSPACE_CHANGED, isPortfolioPath } from './nav';
import styles from './workspaces.module.css';

/**
 * The frame around every /admin page: rail, header, and (inside the portfolio section) its tabs.
 * The workspace is the home; the portfolio's own admin pages are one section of it.
 */
export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { supabase } = useAdminAuth();
  const call = useAdminCall();
  const [modal, setModal] = useState<null | 'client' | 'todo'>(null);
  const [created, setCreated] = useState<CreatedPins | null>(null);
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
  }, []);

  const changed = () => window.dispatchEvent(new Event(WORKSPACE_CHANGED));
  const inPortfolio = isPortfolioPath(pathname);

  return (
    <div className={styles.root}>
      <WorkspaceRail />

      <main className={styles.main}>
        <header className={styles.header}>
          <Link href="/admin/workspaces" className={styles.title}>WORKSPACE</Link>
          <button className={styles.pill} onClick={() => setModal('todo')}>+ ToDo</button>
          <button className={styles.pill} onClick={() => setModal('client')}>+ Client</button>
          <span className={styles.spacer} />
          <span className={`${styles.pill} ${styles.pillStatic}`}>{today || ' '}</span>
          <a href="/" className={styles.avatarLink} aria-label="Buka website portfolio" title="Website portfolio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo.png" alt="" />
          </a>
        </header>

        {inPortfolio && (
          <nav className={styles.subnav} aria-label="Admin portfolio">
            <span className={styles.subnavLabel}>Admin portfolio</span>
            {PORTFOLIO_TABS.map(t => (
              <Link
                key={t.href}
                href={t.href}
                className={`${styles.subtab} ${pathname.startsWith(t.href) ? styles.subtabOn : ''}`}
                aria-current={pathname.startsWith(t.href) ? 'page' : undefined}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        )}

        <div className={inPortfolio ? styles.portfolioArea : undefined}>{children}</div>
      </main>

      {modal === 'client' && (
        <AddClient
          onClose={() => setModal(null)}
          onCreate={async body => {
            const res = await call<CreatedPins>('/api/admin/ws/projects', { method: 'POST', body: JSON.stringify(body) });
            setModal(null);
            setCreated(res);
            changed();
          }}
        />
      )}
      {modal === 'todo' && <QuickTodo supabase={supabase} onClose={() => setModal(null)} onAdded={changed} />}
      {created && (
        <PinSheet
          info={created}
          onClose={() => {
            setCreated(null);
            if (pathname !== '/admin/workspaces') router.push('/admin/workspaces'); // show the new card
          }}
        />
      )}
    </div>
  );
}
