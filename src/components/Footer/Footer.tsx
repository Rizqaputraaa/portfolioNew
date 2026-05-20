import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer} id="footer">
      <div className={styles.inner}>
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
            <li><a href="https://behance.net" target="_blank" rel="noopener">Behance</a></li>
            <li><a href="https://youtube.com" target="_blank" rel="noopener">Youtube</a></li>
            <li><a href="https://linkedin.com" target="_blank" rel="noopener">LinkedIn</a></li>
            <li><a href="https://tiktok.com" target="_blank" rel="noopener">Tiktok</a></li>
            <li><a href="https://instagram.com" target="_blank" rel="noopener">Instagram</a></li>
          </ul>
        </div>
        <div className={styles.col}>
          <h4>PAGES</h4>
          <ul>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/photography">Photography</Link></li>
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
