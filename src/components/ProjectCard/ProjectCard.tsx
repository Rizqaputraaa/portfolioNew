import Link from 'next/link';
import Image from 'next/image';
import type { Project, Source } from '@/types';
import styles from './ProjectCard.module.css';

type CardItem = Partial<Project> & Partial<Source> & { title: string; slug: string; thumbnail?: string | null; is_new?: boolean };

interface ProjectCardProps {
  item: CardItem;
  basePath?: string;
}

export default function ProjectCard({ item, basePath = '/portfolio' }: ProjectCardProps) {
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
      </div>
      <div className={styles.info}>
        <span className={styles.name}>{item.title}</span>
        {item.is_new && <span className={styles.badgeNew}>NEW</span>}
      </div>
    </Link>
  );
}
