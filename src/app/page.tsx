import { getProjects, getSources } from '@/lib/db';
import { isNewItem } from '@/lib/utils';

export const dynamic = 'force-dynamic';
import HeroSection from './components/HeroSection/HeroSection';
import LogoLoop from './components/TechStrip/LogoLoop';
import FeaturedSlider from './components/FeaturedSlider/FeaturedSlider';
import GridSection from './components/GridSection/GridSection';
import CurvedLoop from './components/MarqueeSection/CurvedLoop';
import NewsletterSection from './components/NewsletterSection/NewsletterSection';
import type { Project, Source } from '@/types';

const CATEGORY_LABELS: Record<string, string> = {
  insta_pack: 'Instagram Pack', logo: 'Logo Design',
  poster: 'Poster', printing: 'Printing Design', ui_design: 'UI Design',
};

export default async function HomePage() {
  // Fetch semua project (tanpa limit) agar project dengan NEW badge
  // yang created_at-nya lama tetap bisa disort ke atas sebelum dipotong 6
  const [allProjects, sources] = await Promise.all([getProjects(), getSources(3)]);

  // Sort: NEW badge dulu, lalu by date terbaru, baru ambil 6 teratas
  const sortedProjects = [...allProjects]
    .sort((a, b) => {
      const aIsNew = isNewItem(a.project_date ?? a.created_at);
      const bIsNew = isNewItem(b.project_date ?? b.created_at);

      // Primary sort: NEW badge status
      if (aIsNew && !bIsNew) return -1;
      if (!aIsNew && bIsNew) return 1;

      // Secondary sort: by date (newer first)
      const aDate = new Date(a.project_date ?? a.created_at).getTime();
      const bDate = new Date(b.project_date ?? b.created_at).getTime();
      return bDate - aDate;
    })
    .slice(0, 6);

  const sliderSlides = sortedProjects.map(p => {
    // Pakai categories array (baru) atau fallback ke category lama
    const cats = p.categories?.length ? p.categories : (p.category ? [p.category] : []);
    const catDisplay = cats.map(c => CATEGORY_LABELS[c] ?? c.replace(/_/g, ' ').toUpperCase()).join(', ');
    return {
      id: p.id,
      slug: p.slug,
      category: catDisplay,
      title: p.title,
      thumbnail: p.images?.[0] ?? p.thumbnail, // slider pakai cover image
    };
  });

  return (
    <>
      <HeroSection />
      <LogoLoop />
      <FeaturedSlider slides={sliderSlides} />
      <GridSection
        title="MY WORK"
        allHref="/portfolio"
        items={sortedProjects as any}
        basePath="/portfolio"
      />
      <GridSection
        title="MY SOURCE"
        allHref="/source"
        items={sources as any}
        basePath="/source"
        borderTop
      />
      <CurvedLoop marqueeText="✦ CREATIVE  ✦ DESIGN  ✦ CODE  ✦ ART  " speed={1.5} curveAmount={120} />
      <NewsletterSection />
    </>
  );
}
