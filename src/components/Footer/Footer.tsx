import Link from 'next/link';
import styles from './Footer.module.css';

// ─── SOCIAL LINKS — edit these to update footer + navbar social icons ───────
// Change the href values below to your real profile URLs
export const SOCIAL_LINKS = {
  behance:   'https://behance.net',
  youtube:   'https://youtube.com',       // ← also update Navbar.tsx SOCIAL_LINKS
  linkedin:  'https://linkedin.com',
  tiktok:    'https://tiktok.com',
  instagram: 'https://instagram.com',     // ← also update Navbar.tsx SOCIAL_LINKS
};

export default function Footer() {
  return (
    <footer className={styles.footer} id="footer">
      <div className={styles.inner}>

        {/* Portfolio categories — clicking these navigates to /portfolio?cat=xxx */}
        <div className={styles.col}>
          <h4>PORTFOLIO</h4>
          <ul>
            <li><Link href="/portfolio?cat=insta_pack">Insta Pack</Link></li>
            <li><Link href="/portfolio?cat=logo">Logo</Link></li>
            <li><Link href="/portfolio?cat=poster">Poster</Link></li>
            <li><Link href="/portfolio?cat=printing">Printing Design</Link></li>
            <li><Link href="/portfolio?cat=ui_design">UI Design</Link></li>
          </ul>
        </div>

        <div className={styles.col}>
          <h4>SOCIAL</h4>
          <ul>
            <li><a href={SOCIAL_LINKS.behance}   target="_blank" rel="noopener">Behance</a></li>
            <li><a href={SOCIAL_LINKS.youtube}   target="_blank" rel="noopener">Youtube</a></li>
            <li><a href={SOCIAL_LINKS.linkedin}  target="_blank" rel="noopener">LinkedIn</a></li>
            <li><a href={SOCIAL_LINKS.tiktok}    target="_blank" rel="noopener">Tiktok</a></li>
            <li><a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener">Instagram</a></li>
          </ul>
        </div>

        <div className={styles.col}>
          <h4>PAGES</h4>
          <ul>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>

        <div className={styles.brand}>
          <div className={styles.brandName}>RIZQAPUTRA</div>
          <div className={styles.brandCopy}>Copyright 2025 All Rights Reserved.</div>
        </div>

      </div>
    </footer>
  );
}
