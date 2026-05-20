import Link from 'next/link';
import ProjectCard from '@/components/ProjectCard/ProjectCard';
import type { Project, Source } from '@/types';
import styles from './GridSection.module.css';

type Item = Partial<Project> & Partial<Source> & { title: string; slug: string; thumbnail?: string | null; is_new?: boolean };

interface GridSectionProps {
  title: string;
  allHref: string;
  items: Item[];
  basePath?: string;
  borderTop?: boolean;
}

export default function GridSection({
  title,
  allHref,
  items,
  basePath = '/portfolio',
  borderTop = false,
}: GridSectionProps) {
  return (
    <div style={borderTop ? { borderTop: '1px solid var(--gray-light)' } : {}}>
      <div className={styles.section}>
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <Link href={allHref} className={styles.allLink}>
            ALL
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
        <div className={styles.grid}>
          {items.map((item) => (
            <ProjectCard key={item.id ?? item.slug} item={item} basePath={basePath} />
          ))}
        </div>
      </div>
    </div>
  );
}
