'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { adminGetProject } from '@/lib/admin-db';
import type { Project } from '@/types';
import ProjectForm from '../ProjectForm';
import styles from '../../admin.module.css';

export default function EditProjectPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    adminGetProject(id).then((data) => {
      if (data) {
        setProject(data);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className={styles.emptyState}>Loading…</div>;
  if (notFound) return <div className={styles.emptyState}>Project not found.</div>;
  if (!project) return null;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font)', fontSize: 22, color: 'var(--white)', marginBottom: 28 }}>
        Edit Project
      </h1>
      <ProjectForm project={project} />
    </div>
  );
}
