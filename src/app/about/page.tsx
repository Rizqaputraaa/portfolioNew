import Image from 'next/image';
import BioBanner from './BioBanner';
import styles from './page.module.css';

export const metadata = {
  title: 'About — RIZQAPUTRA',
};

export default function AboutPage() {
  return (
    <div className={styles.page}>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>ABOUT</h1>
        <p className={styles.heroSub}>
          5+ years of creative chaos. From identity crisis to actual output.<br />
          Every project is a step deeper into the in-between.
        </p>
      </section>

      {/* ── Bio + Photo ── */}
      <section className={styles.bioSection}>
        <BioBanner />

        <div className={styles.photoWrap}>
          <Image
            src="/Photo_1.png"
            alt="Rizqaputra"
            fill
            className={styles.photo}
            sizes="(max-width: 768px) 100vw, 40vw"
          />
        </div>
      </section>

      {/* ── Education card ── */}
      <section className={styles.eduSection}>
        <div className={styles.eduCard}>
          <div className={styles.eduLogo}>
            <Image
              src="/Logo_2.png"
              alt="Amikom Logo"
              width={80}
              height={80}
              className={styles.eduLogoImg}
            />
          </div>

          <div className={styles.eduDegrees}>
            <div className={styles.eduDegree}>
              <h3 className={styles.eduTitle}>S1 - Informatics Engineering</h3>
              <p className={styles.eduMeta}>Amikom Yogyakarta &nbsp;||&nbsp; <strong>2024</strong></p>
              <p className={styles.eduDesc}>
                Foundation in code. The beginning of the technical obsession. Learned how to
                think like a programmer before becoming a designer.
              </p>
            </div>

            <div className={styles.eduDegree}>
              <h3 className={styles.eduTitle}>S2 - Digital Transformation Intelligence</h3>
              <p className={styles.eduMeta}>Amikom Yogyakarta &nbsp;||&nbsp; <strong>Ongoing</strong></p>
              <p className={styles.eduDesc}>
                Currently exploring the intersection of design, technology, and business
                transformation. Specializing in integrating digital technology across all
                business aspects— creating fundamental change through intelligent tech
                implementation.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── CTA Strip (DM / Email) ── */}
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
