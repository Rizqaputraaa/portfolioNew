'use client';

import styles from '../workspaces.module.css';

export default function ToolsPage() {
  return (
    <>
      <h2 className={styles.sectionTitle} style={{ marginBottom: 18 }}>Tools</h2>

      <div className={styles.toolGrid}>
        <article className={`${styles.tool} ${styles.toolSoon}`}>
          <span className={styles.tag}>Garage Padel · segera</span>
          <h3 className={styles.modalTitle}>Aset Raket</h3>
          <p className={styles.sub} style={{ whiteSpace: 'normal' }}>
            Tempel daftar raket dari client, urutkan dan bagi per feed, lalu potong background dan beri rimlight.
            Hasilnya tersimpan dan bisa dipakai ulang.
          </p>
        </article>
      </div>
    </>
  );
}
