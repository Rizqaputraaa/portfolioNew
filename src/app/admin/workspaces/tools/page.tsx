'use client';

import Link from 'next/link';
import styles from '../workspaces.module.css';

export default function ToolsPage() {
  return (
    <>
      <h2 className={styles.sectionTitle} style={{ marginBottom: 18 }}>Tools</h2>

      <div className={styles.toolGrid}>
        <Link href="/admin/workspaces/tools/raket" className={styles.tool}>
          <span className={styles.tag}>Semua project padel</span>
          <h3 className={styles.modalTitle}>Aset Raket</h3>
          <p className={styles.sub} style={{ whiteSpace: 'normal' }}>
            Semua raket dari Daftar Raket di brief tiap feed, dikumpulkan dari semua project. Bisa dicari dan disalin per feed.
          </p>
          <span className={styles.infoLink}>Buka →</span>
        </Link>
      </div>
    </>
  );
}
