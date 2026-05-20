import styles from './NewsletterSection.module.css';

export default function NewsletterSection() {
  return (
    <section className={styles.section} id="contact-cta">
      <div className={styles.inner}>
        <div className={styles.text}>
          <h3>JOIN THE CLUB</h3>
          <p>Let&apos;s work together or just say hello.</p>
        </div>
        <div className={styles.actions}>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnDm}
          >
            DM
          </a>
          <a
            href="mailto:hello@rizqaputra.com"
            className={styles.btnEmail}
          >
            EMAIL
          </a>
        </div>
      </div>
    </section>
  );
}
