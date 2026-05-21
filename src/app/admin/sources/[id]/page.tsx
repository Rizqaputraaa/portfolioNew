'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { adminGetSource } from '@/lib/admin-db';
import type { Source } from '@/types';
import SourceForm from '../SourceForm';
import styles from '../../admin.module.css';

export default function EditSourcePage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  const [source, setSource] = useState<Source | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    adminGetSource(id).then((data) => {
      if (data) {
        setSource(data);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className={styles.emptyState}>Loading…</div>;
  if (notFound) return <div className={styles.emptyState}>Source not found.</div>;
  if (!source) return null;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font)', fontSize: 22, color: 'var(--white)', marginBottom: 28 }}>
        Edit Source
      </h1>
      <SourceForm source={source} />
    </div>
  );
}
