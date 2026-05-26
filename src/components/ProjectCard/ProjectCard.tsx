import Link from 'next/link';
import Image from 'next/image';
import type { Project, Source } from '@/types';
import { isNewItem } from '@/lib/utils';
import styles from './ProjectCard.module.css';

type CardItem = Partial<Project> & Partial<Source> & { title: string; slug: string; thumbnail?: string | null };

interface ProjectCardProps {
  item: CardItem;
  basePath?: string;
}

export default function ProjectCard({ item, basePath = '/portfolio' }: ProjectCardProps) {
  const isFree = !!item.drive_url;
  const isPremium = !!item.download_url;
  const priceBadge = isFree ? 'FREE' : (isPremium && item.price ? item.price : null);

  return (
    <Link href={`${basePath}/${item.slug}`} className={styles.card}>
      <div className={styles.thumb}>
        {item.thumbnail ? (
          <Image
            src={item.thumbnail}
            alt={item.title}
            fill
            className={styles.thumbImg}
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <span className={styles.placeholder}>356px × 254px</span>
        )}
        {priceBadge && (
          <span className={styles.badgePrice}>
            {priceBadge}
          </span>
        )}
      </div>
      <div className={styles.info}>
        <span className={styles.name}>{item.title}</span>
        {isNewItem(item.created_at) && <span className={styles.badgeNew}>NEW</span>}
      </div>
    </Link>
  );
}
