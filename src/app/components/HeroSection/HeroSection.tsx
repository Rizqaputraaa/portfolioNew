import Link from 'next/link';
import dynamic from 'next/dynamic';
import styles from './HeroSection.module.css';

const Lanyard3D = dynamic(() => import('../Lanyard3D/Lanyard3D'), { ssr: false });

export default function HeroSection() {
  return (
    <section className={styles.hero} id="home">
      {/* 3D Physics Lanyard on the right */}
      <div className={styles.lanyardWrap}>
        <Lanyard3D />
      </div>

      <div className={styles.content}>
        <div className={styles.textGroup}>
          <span className={styles.welcome}>WELCOME TO MY</span>
          <h1 className={styles.title}>PORTFOLIO</h1>
          <p className={styles.sub}>
            Built by someone who refuses to pick just one lane.<br />
            Design + Code + Art. All in one person.
          </p>
          <Link href="/portfolio" className={styles.cta} id="hero-cta">
            VIEW MY CRISIS
          </Link>
        </div>
      </div>
    </section>
  );
}
