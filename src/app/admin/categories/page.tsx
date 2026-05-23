'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import styles from '../admin.module.css';

interface Category {
  id?: string;
  label: string;
  value: string;
}

function generateValue(label: string): string {
  return label.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingValue, setDeletingValue] = useState<string | null>(null);

  const fetchCategories = () => {
    setLoading(true);
    fetch('/api/categories')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleLabelChange = (v: string) => {
    setLabel(v);
    setValue(generateValue(v));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!label.trim() || !value.trim()) {
      setError('Label wajib diisi.');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: label.trim(), value }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? 'Gagal menyimpan kategori.');
    } else {
      setSuccess(`Kategori "${label}" berhasil ditambahkan!`);
      setLabel('');
      setValue('');
      fetchCategories();
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Hapus kategori "${cat.label}"? Project yang sudah pakai kategori ini tidak akan berubah.`)) return;
    setDeletingValue(cat.value);
    await fetch('/api/categories', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: cat.value }),
    });
    setDeletingValue(null);
    fetchCategories();
  };

  return (
    <div>
      {/* Header */}
      <div className={styles.pageHeader}>
        <h1>Kategori Project</h1>
        <Link href="/admin/projects" className={`${styles.btn} ${styles.btnSecondary}`}>
          ← Kembali ke Projects
        </Link>
      </div>

      {/* Add form */}
      <div className={styles.sectionBlock} style={{ marginBottom: 32, maxWidth: 520 }}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Tambah Kategori Baru</span>
        </div>
        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          {error && <div className={styles.errorMsg} style={{ marginBottom: 12 }}>{error}</div>}
          {success && <div className={styles.successMsg} style={{ marginBottom: 12 }}>{success}</div>}

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="cat-label">Nama Kategori *</label>
            <input
              id="cat-label"
              className={styles.input}
              type="text"
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="cth: Brand Identity"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="cat-value">
              Value (auto-generate)
              <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--gray)', fontSize: 11 }}>
                — dipakai sebagai filter key, huruf kecil + underscore
              </span>
            </label>
            <input
              id="cat-value"
              className={styles.input}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="brand_identity"
            />
          </div>

          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={saving}
          >
            {saving ? 'Menyimpan…' : '+ Tambah Kategori'}
          </button>
        </form>
      </div>

      {/* List */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th className={styles.th}>Label</th>
              <th className={styles.th}>Value</th>
              <th className={styles.th} style={{ width: 80 }}>Aksi</th>
            </tr>
          </thead>
          <tbody className={styles.tbody}>
            {loading ? (
              <tr className={styles.tr}>
                <td className={styles.td} colSpan={3} style={{ color: 'var(--gray)', textAlign: 'center' }}>
                  Memuat…
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr className={styles.tr}>
                <td className={styles.td} colSpan={3} style={{ color: 'var(--gray)', textAlign: 'center' }}>
                  Belum ada kategori. Tambahkan di atas.
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.value} className={styles.tr}>
                  <td className={styles.td}>{cat.label}</td>
                  <td className={styles.td} style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--gray)' }}>
                    {cat.value}
                  </td>
                  <td className={styles.td}>
                    <button
                      className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
                      onClick={() => handleDelete(cat)}
                      disabled={deletingValue === cat.value}
                    >
                      {deletingValue === cat.value ? '…' : 'Hapus'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 16, fontSize: 12, color: 'var(--gray)', lineHeight: 1.6 }}>
        Catatan: menghapus kategori tidak akan mengubah project yang sudah menggunakan kategori tersebut.
        Kategori baru yang ditambahkan di sini akan langsung tersedia di form New Project.
      </p>
    </div>
  );
}
