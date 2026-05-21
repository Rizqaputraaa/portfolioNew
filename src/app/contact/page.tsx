'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setSending(true);
    // Replace with your real submit logic (e.g. fetch to an API route)
    setTimeout(() => {
      setSent(true);
      setSending(false);
      setForm({ name: '', email: '', message: '' });
    }, 800);
  };

  return (
    <div className={styles.page}>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>GET IN TOUCH</h1>
        <p className={styles.heroSub}>
          Use this form for collaborations, custom mockup requests, special licensing,
          or product suggestions. Share a few details and I&apos;ll get back to you.
        </p>
      </section>

      {/* ── Form ── */}
      <div className={styles.formWrap}>
        {sent ? (
          <div className={styles.successMsg}>
            <span>✓</span>
            <p>Message sent! I&apos;ll get back to you soon.</p>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.row}>
              <input
                type="text"
                className={styles.input}
                placeholder="NAME"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
              <input
                type="email"
                className={styles.input}
                placeholder="EMAIL"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <textarea
              className={styles.textarea}
              placeholder="MESSAGE"
              rows={10}
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              required
            />
            <div className={styles.submitWrap}>
              <button type="submit" className={styles.submitBtn} disabled={sending}>
                {sending ? 'SENDING...' : 'SEND MESSAGE'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── CTA Strip ── */}
      <section className={styles.ctaStrip}>
        <div className={styles.ctaInner}>
          <div className={styles.ctaText}>
            <h3>JOIN THE CLUB</h3>
            <p>No spam ever. Only useful information.</p>
          </div>
          <div className={styles.ctaActions}>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaBtnDm}
            >
              DM
            </a>
            <a
              href="mailto:hello@rizqaputra.com"
              className={styles.ctaBtnEmail}
            >
              EMAIL
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
