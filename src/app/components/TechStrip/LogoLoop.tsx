import Image from 'next/image';
import styles from '../animations.module.css';

// 20 partner logos — all from public/partner/
const partners = [
  1,2,3,4,5,6,8,9,10,11,12,13,14,15,16,17,18,19,20,21
];

// Duplicate for seamless infinite loop
const allPartners = [...partners, ...partners];

export default function LogoLoop() {
  return (
    <section className={styles.logoSection} id="working-with">
      <p className={styles.logoLabel}>already working with</p>
      <div className={styles.logoTrack}>
        <div className={styles.logoInner} aria-hidden="false">
          {allPartners.map((num, i) => (
            <div key={`a-${i}`} className={styles.logoItem}>
              <Image
                src={`/partner/partner${num}.png`}
                alt={`Partner ${num}`}
                width={80}
                height={36}
                style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.55 }}
              />
            </div>
          ))}
        </div>
        <div className={styles.logoInner2} aria-hidden="true">
          {allPartners.map((num, i) => (
            <div key={`b-${i}`} className={styles.logoItem}>
              <Image
                src={`/partner/partner${num}.png`}
                alt=""
                width={80}
                height={36}
                style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.55 }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
