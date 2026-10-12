'use client';

import Link from 'next/link';
import styles from '../workspaces.module.css';

export default function ToolsPage() {
  return (
    <>
      <h2 className={styles.sectionTitle} style={{ marginBottom: 18 }}>Tools</h2>

      <div className={styles.toolGrid}>
        <Link href="/admin/workspaces/tools/raket?slug=padel" className={styles.tool}>
          <span className={styles.tag}>Garage Padel</span>
          <h3 className={styles.modalTitle}>Aset Raket</h3>
          <p className={styles.sub} style={{ whiteSpace: 'normal' }}>
            Link form untuk client mengisi daftar raket dan harga. Daftar yang masuk diurutkan dan dibagi per feed.
          </p>
          <span className={styles.infoLink}>Buka →</span>
        </Link>
      </div>
    </>
  );
}
