'use client';

import { useState } from 'react';
import styles from './NewsletterSection.module.css';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === 'loading') return;

    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus('success');
        setEmail('');
        setTimeout(() => setStatus('idle'), 5000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  const placeholder =
    status === 'success' ? '✓ Berhasil subscribe!'
    : status === 'error'  ? '✗ Coba lagi...'
    : 'Your email address';

  return (
    <section className={styles.section} id="newsletter">
      <div className={styles.inner}>
        <div className={styles.text}>
          <h3>JOIN THE CLUB</h3>
          <p>No spam ever. Only useful information.</p>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            type="email"
            className={`${styles.input} ${status === 'error' ? styles.inputError : ''}`}
            placeholder={placeholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={status === 'loading' || status === 'success'}
          />
          <button type="submit" className={styles.btn} disabled={status === 'loading' || status === 'success'}>
            {status === 'loading' ? '...' : status === 'success' ? 'DONE!' : 'SUBSCRIBE'}
          </button>
        </form>
      </div>
    </section>
  );
}
