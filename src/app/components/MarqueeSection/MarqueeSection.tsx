import styles from './MarqueeSection.module.css';

const items = Array(10).fill(null);

export default function MarqueeSection() {
  return (
    <div className={styles.section} id="marquee">
      <div className={styles.row}>
        <div className={styles.track}>
          {items.map((_, i) => (
            <span key={i} className={styles.item}>
              <span className={styles.star}>✦</span> CREATIVE
            </span>
          ))}
        </div>
      </div>
      <div className={styles.row}>
        <div className={`${styles.track} ${styles.trackReverse}`}>
          {items.map((_, i) => (
            <span key={i} className={styles.item}>
              <span className={styles.star}>✦</span> CREATIVE
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
