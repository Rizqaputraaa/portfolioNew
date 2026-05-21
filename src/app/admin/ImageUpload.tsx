'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { uploadFile } from '@/lib/upload';
import styles from './admin.module.css';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  label?: string;
}

export default function ImageUpload({ value, onChange, folder, label }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const url = await uploadFile(folder, file);
    if (url) {
      onChange(url);
    } else {
      setError('Upload failed. Please try again.');
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={styles.formGroup}>
      {label && <label className={styles.label}>{label}</label>}

      {value && (
        <div style={{ marginBottom: 8 }}>
          <Image
            src={value}
            alt="preview"
            width={120}
            height={80}
            style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #2a2a2a' }}
            unoptimized
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
          id={`img-upload-${folder}-${label ?? 'default'}`}
        />
        <label
          htmlFor={`img-upload-${folder}-${label ?? 'default'}`}
          className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
          style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.5 : 1 }}
        >
          {uploading ? 'Uploading…' : value ? 'Replace' : 'Upload Image'}
        </label>
        {value && (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
            onClick={() => onChange('')}
          >
            Remove
          </button>
        )}
      </div>

      {error && <div className={styles.errorMsg} style={{ marginTop: 4 }}>{error}</div>}
    </div>
  );
}
