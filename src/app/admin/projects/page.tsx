'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '../useAdminAuth';
import { adminGetProjects, adminDeleteProject } from '@/lib/admin-db';
import { isNewItem } from '@/lib/utils';
import type { Project } from '@/types';
import styles from '../admin.module.css';

export default function AdminProjectsPage() {
  const { loading: authLoading } = useAdminAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  const fetchProjects = async () => {
    setFetching(true);
    const data = await adminGetProjects();
    setProjects(data);
    setFetching(false);
  };

  useEffect(() => {
    if (!authLoading) fetchProjects();
  }, [authLoading]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const ok = await adminDeleteProject(id);
    if (ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } else {
      setError('Failed to delete project.');
    }
  };

  if (authLoading || fetching) {
    return <div className={styles.emptyState}>Loading…</div>;
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1>Projects</h1>
        <Link href="/admin/projects/new" className={`${styles.btn} ${styles.btnPrimary}`}>
          + New Project
        </Link>
      </div>

      {error && <div className={styles.errorMsg} style={{ marginBottom: 16 }}>{error}</div>}

      {projects.length === 0 ? (
        <div className={styles.emptyState}>No projects yet.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th}>Title</th>
                <th className={styles.th}>Category</th>
                <th className={styles.th}>Badge NEW</th>
                <th className={styles.th}>Published</th>
                <th className={styles.th}>Created At</th>
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody className={styles.tbody}>
              {projects.map((project) => (
                <tr key={project.id} className={styles.tr}>
                  <td className={styles.td}>{project.title}</td>
                  <td className={styles.td}>
                    <span className={styles.badge}>{project.category}</span>
                  </td>
                  <td className={styles.td}>
                    {isNewItem(project.created_at) ? (
                      <span className={styles.badge}>Active</span>
                    ) : (
                      <span className={`${styles.badge} ${styles.badgeGray}`}>Expired</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    {project.published ? (
                      <span className={styles.badgeGreen}>Published</span>
                    ) : (
                      <span className={`${styles.badge} ${styles.badgeGray}`}>Draft</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    {new Date(project.created_at).toLocaleDateString()}
                  </td>
                  <td className={styles.td}>
                    <div className={styles.tdActions}>
                      <Link
                        href={`/admin/projects/${project.id}`}
                        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                      >
                        Edit
                      </Link>
                      <button
                        className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
                        onClick={() => handleDelete(project.id, project.title)}
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
