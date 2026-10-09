'use client';

import { useState, FormEvent } from 'react';
import styles from './workspaces.module.css';

export interface EditableClient {
  slug: string;
  name: string;
  client_name: string | null;
  instagram: string | null;
  pack_number: number;
  target_feeds: number;
  month_label: string | null;
  price: number | null;
  avatar_url: string | null;
}

/** Centre-crops a picked image to a small square (WebP), so a 6 MB camera photo becomes ~20 KB. */
async function squarePhoto(file: File, size = 320): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser tidak mendukung pemrosesan gambar');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  return canvas.toDataURL('image/webp', 0.88);
}

export default function EditClient({ client, onClose, onSave }: {
  client: EditableClient;
  onClose: () => void;
  onSave: (slug: string, body: Record<string, unknown>) => Promise<void>;
}) {
  const [clientName, setClientName] = useState(client.client_name || client.name);
  const [instagram, setInstagram] = useState(client.instagram ? `@${client.instagram}` : '');
  const [feeds, setFeeds] = useState(String(client.target_feeds));
  const [packNumber, setPackNumber] = useState(String(client.pack_number));
  const [monthLabel, setMonthLabel] = useState(client.month_label ?? '');
  const [price, setPrice] = useState(client.price == null ? '' : String(client.price));
  // undefined = keep the current photo, null = remove it, string = the newly picked one
  const [avatar, setAvatar] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const shown = avatar === undefined ? client.avatar_url : avatar;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    try {
      setAvatar(await squarePhoto(file));
    } catch (e) {
      setError((e as Error).message || 'Foto tidak bisa dibaca');
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave(client.slug, {
        clientName, instagram, feeds: Number(feeds), packNumber: Number(packNumber), monthLabel, price,
        ...(avatar !== undefined && { avatar }),
      });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const initial = (clientName.trim() || '?').charAt(0).toUpperCase();

  return (
    <div className={styles.scrim} onClick={onClose}>
      <form className={styles.modal} onClick={e => e.stopPropagation()} onSubmit={submit} role="dialog" aria-label="Edit client">
        <div className={styles.modalHead}>
          <h2 className={styles.modalTitle}>Edit client</h2>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} style={{ height: 36 }} onClick={onClose}>Tutup</button>
        </div>

        <div className={styles.photoRow}>
          <span className={styles.photo} aria-hidden>
            {shown
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={shown} alt="" />
              : <span>{initial}</span>}
          </span>
          <div className={styles.photoActions}>
            <label className={`${styles.btn} ${styles.btnGhost}`} style={{ height: 36, display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
              {shown ? 'Ganti foto' : 'Pilih foto'}
              <input type="file" accept="image/*" hidden onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            {shown && (
              <button type="button" className={`${styles.btn} ${styles.btnGhost}`} style={{ height: 36 }} onClick={() => setAvatar(null)}>
                Hapus foto
              </button>
            )}
            <span className={styles.help}>Dipotong persegi otomatis.</span>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="e-name">Nama client / brand</label>
          <input id="e-name" className={styles.input} value={clientName} onChange={e => setClientName(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="e-ig">Username Instagram</label>
          <input id="e-ig" className={styles.input} value={instagram} onChange={e => setInstagram(e.target.value)}
            placeholder="@garagepadel" autoCapitalize="none" autoCorrect="off" />
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="e-feeds">Jumlah feed</label>
            <input id="e-feeds" className={styles.input} type="number" inputMode="numeric" min={1} max={60} value={feeds} onChange={e => setFeeds(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="e-pack">Pack ke-</label>
            <input id="e-pack" className={styles.input} type="number" inputMode="numeric" min={1} value={packNumber} onChange={e => setPackNumber(e.target.value)} />
          </div>
        </div>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="e-month">Periode</label>
            <input id="e-month" className={styles.input} value={monthLabel} onChange={e => setMonthLabel(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="e-price">Harga pack (Rp)</label>
            <input id="e-price" className={styles.input} type="number" inputMode="numeric" min={0} value={price} onChange={e => setPrice(e.target.value)} />
          </div>
        </div>

        <span className={styles.help}>Alamat workspace (/w/{client.slug}) tidak berubah, jadi link yang sudah dibagikan tetap jalan.</span>

        {error && <div className={styles.error} role="alert">{error}</div>}

        <div className={styles.btnRow}>
          <button className={styles.btn} type="submit" disabled={busy || !clientName.trim()}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </form>
    </div>
  );
}
