'use client';

import { useState } from 'react';
import styles from './NewsletterSection.module.css';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSent(true);
    setEmail('');
    setTimeout(() => setSent(false), 4000);
  }

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
            className={styles.input}
            placeholder={sent ? '✓ Subscribed!' : 'Your email address'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            id="email-input"
          />
          <button type="submit" className={styles.btn}>
            {sent ? 'DONE!' : 'SUBSCRIBE'}
          </button>
        </form>
      </div>
    </section>
  );
}
