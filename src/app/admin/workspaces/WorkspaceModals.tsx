'use client';

import { useState, FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import styles from './workspaces.module.css';

export interface CreatedPins { slug: string; name: string; pins: { role: string; label: string; pin: string }[] }

const monthNow = () => new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
const siteBase = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || (typeof window === 'undefined' ? '' : window.location.origin)).replace(/\/$/, '');

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

/* ── + Client ─────────────────────────────────────────────────────────── */

export function AddClient({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [clientName, setClientName] = useState('');
  const [instagram, setInstagram] = useState('');
  const [feeds, setFeeds] = useState('10');
  const [packNumber, setPackNumber] = useState('1');
  const [monthLabel, setMonthLabel] = useState(monthNow());
  const [price, setPrice] = useState('');
  const [clientLogin, setClientLogin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onCreate({ clientName, instagram, feeds: Number(feeds), packNumber: Number(packNumber), monthLabel, price, clientLogin, danta: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className={styles.scrim} onClick={onClose}>
      <form className={styles.modal} onClick={e => e.stopPropagation()} onSubmit={submit} role="dialog" aria-label="Tambah client">
        <div className={styles.modalHead}>
          <h2 className={styles.modalTitle}>Client baru</h2>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} style={{ height: 36 }} onClick={onClose}>Tutup</button>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="c-name">Nama client / brand</label>
          <input id="c-name" className={styles.input} value={clientName} onChange={e => setClientName(e.target.value)} autoFocus placeholder="Mis. Garage Padel" />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="c-ig">Username Instagram</label>
          <input id="c-ig" className={styles.input} value={instagram} onChange={e => setInstagram(e.target.value)}
            placeholder="@garagepadel" autoCapitalize="none" autoCorrect="off" />
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="c-feeds">Jumlah feed</label>
            <input id="c-feeds" className={styles.input} type="number" inputMode="numeric" min={1} max={60} value={feeds} onChange={e => setFeeds(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="c-pack">Pack ke-</label>
            <input id="c-pack" className={styles.input} type="number" inputMode="numeric" min={1} value={packNumber} onChange={e => setPackNumber(e.target.value)} />
          </div>
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="c-month">Periode</label>
            <input id="c-month" className={styles.input} value={monthLabel} onChange={e => setMonthLabel(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="c-price">Harga pack (Rp)</label>
            <input id="c-price" className={styles.input} type="number" inputMode="numeric" min={0} value={price} onChange={e => setPrice(e.target.value)} placeholder="Untuk invoice" />
          </div>
        </div>

        <label className={styles.toggle}>
          <input type="checkbox" checked disabled readOnly />
          <div><strong>Pakai Danta (perantara brief)</strong><span>Danta menyusun brief dan menyetujui hasil. Mode tanpa Danta menyusul.</span></div>
        </label>
        <label className={styles.toggle}>
          <input type="checkbox" checked={clientLogin} onChange={e => setClientLogin(e.target.checked)} />
          <div><strong>Client ikut login ke workspace</strong><span>Biarkan mati kalau hasil dikirim lewat WhatsApp oleh Danta.</span></div>
        </label>

        {error && <div className={styles.error} role="alert">{error}</div>}

        <div className={styles.btnRow}>
          <button className={styles.btn} type="submit" disabled={busy || !clientName.trim()}>{busy ? 'Membuat…' : 'Buat client'}</button>
        </div>
      </form>
    </div>
  );
}

/* ── PINs, shown once ─────────────────────────────────────────────────── */

export function PinSheet({ info, onClose }: { info: CreatedPins; onClose: () => void }) {
  const [copied, setCopied] = useState('');
  const link = `${siteBase()}/w/${info.slug}`;

  const doCopy = async (key: string, text: string) => {
    await copy(text);
    setCopied(key);
    window.setTimeout(() => setCopied(c => (c === key ? '' : c)), 1800);
  };

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-label="PIN client baru">
        <div className={styles.modalHead}>
          <h2 className={styles.modalTitle}>{info.name} dibuat</h2>
        </div>
        <div className={styles.ok}>Catat PIN ini sekarang. Di database hanya tersimpan versi terenkripsinya, jadi tidak bisa dilihat lagi.</div>

        {info.pins.map(p => (
          <div key={p.role} className={styles.pinRow}>
            <div className={styles.pinRole}>{p.label}</div>
            <div className={styles.pinValue}>{p.pin}</div>
            <button className={`${styles.btn} ${styles.btnGhost}`} style={{ height: 36 }}
              onClick={() => doCopy(p.role, `Halo, ini akses workspace ${info.name}:\nBuka: ${link}\nPIN: ${p.pin}`)}>
              {copied === p.role ? 'Tersalin ✓' : 'Salin'}
            </button>
          </div>
        ))}

        <div className={styles.help}>Link workspace: {link}</div>
        <div className={styles.btnRow}>
          <button className={styles.btn} onClick={onClose}>Selesai</button>
        </div>
      </div>
    </div>
  );
}

/* ── + ToDo ───────────────────────────────────────────────────────────── */

export function QuickTodo({ supabase, onClose, onAdded }: {
  supabase: SupabaseClient | null;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState('normal');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !supabase) return;
    setBusy(true);
    setError('');
    const { error: err } = await supabase.from('todos').insert({ text: text.trim(), priority, done: false });
    if (err) {
      setError(err.message);
      setBusy(false);
      return;
    }
    onAdded();
    onClose();
  };

  return (
    <div className={styles.scrim} onClick={onClose}>
      <form className={styles.modal} onClick={e => e.stopPropagation()} onSubmit={submit} role="dialog" aria-label="Tambah ToDo">
        <div className={styles.modalHead}>
          <h2 className={styles.modalTitle}>ToDo baru</h2>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} style={{ height: 36 }} onClick={onClose}>Tutup</button>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="t-text">Tugas</label>
          <input id="t-text" className={styles.input} value={text} onChange={e => setText(e.target.value)} autoFocus placeholder="Mis. Revisi banner BKT" />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="t-prio">Prioritas</label>
          <select id="t-prio" className={styles.select} value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>
        {error && <div className={styles.error} role="alert">{error}</div>}
        <div className={styles.btnRow}>
          <button className={styles.btn} type="submit" disabled={busy || !text.trim()}>{busy ? 'Menyimpan…' : 'Tambah'}</button>
        </div>
      </form>
    </div>
  );
}
