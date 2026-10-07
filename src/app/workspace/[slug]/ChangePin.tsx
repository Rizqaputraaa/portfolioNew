'use client';

import { useEffect, useState, FormEvent } from 'react';
import { api } from './api';
import styles from './workspace.module.css';

/** "Ganti PIN" popup: current PIN, new PIN, confirm. Each person only changes their own PIN. */
export default function ChangePin({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(onClose, 1500);
    return () => window.clearTimeout(t);
  }, [done, onClose]);

  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 8);
  const mismatch = again.length > 0 && next !== again;
  const valid = current.length >= 4 && next.length >= 4 && next === again;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      await api(slug, '/pin', { method: 'POST', json: { current, next } });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className={styles.modalScrim} onClick={onClose}>
      <div className={styles.modal} role="dialog" aria-label="Ganti PIN" onClick={e => e.stopPropagation()}>
        <form className={styles.group} onSubmit={submit}>
          <div className={styles.slideHead}>
            <span className={styles.slideNum}>Ganti PIN</span>
            <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={onClose}>
              Tutup
            </button>
          </div>

          {done ? (
            <div className={styles.hint} role="status">PIN berhasil diganti. Pakai PIN baru saat masuk berikutnya.</div>
          ) : (
            <>
              <span className={`${styles.muted} ${styles.small}`}>
                Hanya PIN milikmu yang berubah. Pakai 4–8 angka yang mudah kamu ingat tapi sulit ditebak.
              </span>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="pin-cur">PIN saat ini</label>
                <input id="pin-cur" className={`${styles.input} ${styles.pinInput}`} type="password" inputMode="numeric"
                  autoComplete="current-password" maxLength={8} value={current} autoFocus
                  onChange={e => setCurrent(digits(e.target.value))} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="pin-new">PIN baru</label>
                <input id="pin-new" className={`${styles.input} ${styles.pinInput}`} type="password" inputMode="numeric"
                  autoComplete="new-password" maxLength={8} value={next}
                  onChange={e => setNext(digits(e.target.value))} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="pin-again">Ulangi PIN baru</label>
                <input id="pin-again" className={`${styles.input} ${styles.pinInput}`} type="password" inputMode="numeric"
                  autoComplete="new-password" maxLength={8} value={again}
                  aria-invalid={mismatch} onChange={e => setAgain(digits(e.target.value))} />
                {mismatch && <span className={`${styles.small}`} style={{ color: '#F2766E' }}>PIN tidak sama.</span>}
              </div>

              {error && <div className={styles.error} role="alert">{error}</div>}

              <button className={styles.btn} type="submit" disabled={!valid || busy}>
                {busy ? 'Menyimpan…' : 'Simpan PIN baru'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
