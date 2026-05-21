'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '../useAdminAuth';
import { adminGetSources, adminDeleteSource } from '@/lib/admin-db';
import type { Source } from '@/types';
import styles from '../admin.module.css';

export default function AdminSourcesPage() {
  const { loading: authLoading } = useAdminAuth();
  const [sources, setSources] = useState<Source[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  const fetchSources = async () => {
    setFetching(true);
    const data = await adminGetSources();
    setSources(data);
    setFetching(false);
  };

  useEffect(() => {
    if (!authLoading) fetchSources();
  }, [authLoading]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const ok = await adminDeleteSource(id);
    if (ok) {
      setSources((prev) => prev.filter((s) => s.id !== id));
    } else {
      setError('Failed to delete source.');
    }
  };

  if (authLoading || fetching) {
    return <div className={styles.emptyState}>Loading…</div>;
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1>Sources</h1>
        <Link href="/admin/sources/new" className={`${styles.btn} ${styles.btnPrimary}`}>
          + New Source
        </Link>
      </div>

      {error && <div className={styles.errorMsg} style={{ marginBottom: 16 }}>{error}</div>}

      {sources.length === 0 ? (
        <div className={styles.emptyState}>No sources yet.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th}>Title</th>
                <th className={styles.th}>Category</th>
                <th className={styles.th}>Published</th>
                <th className={styles.th}>Created At</th>
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody className={styles.tbody}>
              {sources.map((source) => (
                <tr key={source.id} className={styles.tr}>
                  <td className={styles.td}>{source.title}</td>
                  <td className={styles.td}>
                    <span className={styles.badge}>{source.category}</span>
                  </td>
                  <td className={styles.td}>
                    {source.published ? (
                      <span className={styles.badgeGreen}>Published</span>
                    ) : (
                      <span className={`${styles.badge} ${styles.badgeGray}`}>Draft</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    {new Date(source.created_at).toLocaleDateString()}
                  </td>
                  <td className={styles.td}>
                    <div className={styles.tdActions}>
                      <Link
                        href={`/admin/sources/${source.id}`}
                        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                      >
                        Edit
                      </Link>
                      <button
                        className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
                        onClick={() => handleDelete(source.id, source.title)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
