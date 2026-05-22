'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { adminCreateSource, adminUpdateSource } from '@/lib/admin-db';
import type { Source, SourceCategory } from '@/types';
import ImageUpload from '../ImageUpload';
import styles from '../admin.module.css';

const CATEGORIES: SourceCategory[] = ['mockup', 'overlay_texture', 'script', 'psd_effect'];

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

interface SourceFormProps {
  source?: Source;
}

type FormData = {
  title: string;
  slug: string;
  category: SourceCategory;
  description: string;
  how_to_use: string;
  images: string[];
  section_image: string;
  file_size: string;
  file_type: string;
  dimensions: string;
  file_count: string;
  drive_url: string;
  download_url: string;
  price: string;
  tutorial_url: string;
  published: boolean;
};

export default function SourceForm({ source }: SourceFormProps) {
  const router = useRouter();
  const isEdit = !!source;

  const [form, setForm] = useState<FormData>({
    title: source?.title ?? '',
    slug: source?.slug ?? '',
    category: source?.category ?? 'mockup',
    description: source?.description ?? '',
    how_to_use: source?.how_to_use ?? '',
    images: source?.images ?? [],
    section_image: source?.section_image ?? '',
    file_size: source?.file_size ?? '',
    file_type: source?.file_type ?? '',
    dimensions: source?.dimensions ?? '',
    file_count: source?.file_count != null ? String(source.file_count) : '',
    drive_url: source?.drive_url ?? '',
    download_url: source?.download_url ?? '',
    price: source?.price ?? '',
    tutorial_url: source?.tutorial_url ?? '',
    published: source?.published ?? false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  const handleTitleChange = (title: string) => {
    setForm((prev) => ({
      ...prev,
      title,
      slug: isEdit ? prev.slug : generateSlug(title),
    }));
  };

  const addImage = (url: string) => {
    if (!url) return;
    setForm((prev) => ({ ...prev, images: [...prev.images, url] }));
    setNewImageUrl('');
  };

  const removeImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    // Validate required fields
    if (!form.title.trim()) {
      setError('Title is required');
      setSubmitting(false);
      return;
    }
    if (!form.slug.trim()) {
      setError('Slug is required');
      setSubmitting(false);
      return;
    }
    if (!form.category) {
      setError('Category is required');
      setSubmitting(false);
      return;
    }

    const fileCountNum = form.file_count !== '' ? parseInt(form.file_count, 10) : null;

    const payload: Omit<Source, 'id' | 'created_at'> = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      category: form.category,
      description: form.description?.trim() || null,
      how_to_use: form.how_to_use?.trim() || null,
      images: form.images,
      thumbnail: form.images[0] ?? null,
      section_image: form.section_image || null,
      file_size: form.file_size?.trim() || null,
      file_type: form.file_type?.trim() || null,
      dimensions: form.dimensions?.trim() || null,
      file_count: fileCountNum && !isNaN(fileCountNum) ? fileCountNum : null,
      drive_url: form.drive_url?.trim() || null,
      download_url: form.download_url?.trim() || null,
      price: form.price?.trim() || null,
      tutorial_url: form.tutorial_url?.trim() || null,
      published: form.published,
    };

    console.log('Form submitted with payload:', JSON.stringify(payload, null, 2));
    console.log('Published field:', payload.published);

    let result: Source | null = null;
    if (isEdit && source) {
      result = await adminUpdateSource(source.id, payload);
    } else {
      result = await adminCreateSource(payload);
    }

    if (result) {
      setSuccess(isEdit ? 'Source updated!' : 'Source created!');
      setTimeout(() => router.push('/admin/sources'), 1200);
    } else {
      setError('Something went wrong. Please try again. Check browser console for details.');
    }

    setSubmitting(false);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <div className={styles.errorMsg}>{error}</div>}
      {success && <div className={styles.successMsg}>{success}</div>}

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="sf-title">Title *</label>
          <input
            id="sf-title"
            className={styles.input}
            type="text"
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            placeholder="Source title"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="sf-slug">Slug *</label>
          <input
            id="sf-slug"
            className={styles.input}
            type="text"
            value={form.slug}
            onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
            required
            placeholder="source-slug"
          />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="sf-category">Category *</label>
        <select
          id="sf-category"
          className={styles.select}
          value={form.category}
          onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as SourceCategory }))}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="sf-description">Description</label>
        <textarea
          id="sf-description"
          className={styles.textarea}
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Short description…"
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="sf-how">How to Use</label>
        <textarea
          id="sf-how"
          className={styles.textarea}
          value={form.how_to_use}
          onChange={(e) => setForm((prev) => ({ ...prev, how_to_use: e.target.value }))}
          placeholder="Instructions for using this source…"
        />
      </div>

      {/* Images */}
      <div className={styles.formGroup}>
        <label className={styles.label}>Images</label>
        <div className={styles.imageList}>
          {form.images.map((url, i) => (
            <div key={i} className={styles.imageItem}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className={styles.imageThumb} />
              <span className={styles.imageUrl}>{url}</span>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
                onClick={() => removeImage(i)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <ImageUpload
            value={newImageUrl}
            onChange={(url) => { addImage(url); }}
            folder="sources"
            label="Add Image"
          />
        </div>
      </div>

      <ImageUpload
        value={form.section_image}
        onChange={(url) => setForm((prev) => ({ ...prev, section_image: url }))}
        folder="sources/sections"
        label="Section Image"
      />

      {/* File metadata */}
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="sf-file-size">File Size</label>
          <input
            id="sf-file-size"
            className={styles.input}
            type="text"
            value={form.file_size}
            onChange={(e) => setForm((prev) => ({ ...prev, file_size: e.target.value }))}
            placeholder="e.g. 24 MB"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="sf-file-type">File Type</label>
          <input
            id="sf-file-type"
            className={styles.input}
            type="text"
            value={form.file_type}
            onChange={(e) => setForm((prev) => ({ ...prev, file_type: e.target.value }))}
            placeholder="e.g. PSD, PNG"
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="sf-dimensions">Dimensions</label>
          <input
            id="sf-dimensions"
            className={styles.input}
            type="text"
            value={form.dimensions}
            onChange={(e) => setForm((prev) => ({ ...prev, dimensions: e.target.value }))}
            placeholder="e.g. 3000x2000px"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="sf-file-count">File Count</label>
          <input
            id="sf-file-count"
            className={styles.input}
            type="number"
            min={0}
            value={form.file_count}
            onChange={(e) => setForm((prev) => ({ ...prev, file_count: e.target.value }))}
            placeholder="Number of files"
          />
        </div>
      </div>

      {/* URLs */}
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="sf-drive">Google Drive URL (Free)</label>
        <input
          id="sf-drive"
          className={styles.input}
          type="url"
          value={form.drive_url}
          onChange={(e) => setForm((prev) => ({ ...prev, drive_url: e.target.value }))}
          placeholder="https://drive.google.com/…"
        />
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="sf-download">Download URL (Premium)</label>
          <input
            id="sf-download"
            className={styles.input}
            type="url"
            value={form.download_url}
            onChange={(e) => setForm((prev) => ({ ...prev, download_url: e.target.value }))}
            placeholder="https://mylynk.com/…"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="sf-price">Harga (Premium)</label>
          <input
            id="sf-price"
            className={styles.input}
            type="text"
            value={form.price}
            onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
            placeholder="e.g. $10, Rp 150.000"
          />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="sf-tutorial">Tutorial URL</label>
        <input
          id="sf-tutorial"
          className={styles.input}
          type="url"
          value={form.tutorial_url}
          onChange={(e) => setForm((prev) => ({ ...prev, tutorial_url: e.target.value }))}
          placeholder="https://youtube.com/…"
        />
      </div>

      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={form.published}
          onChange={(e) => setForm((prev) => ({ ...prev, published: e.target.checked }))}
        />
        Published
      </label>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          type="submit"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={submitting}
        >
          {submitting ? 'Saving…' : isEdit ? 'Update Source' : 'Create Source'}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={() => router.push('/admin/sources')}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
