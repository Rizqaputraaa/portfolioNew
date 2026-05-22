import { getProjects, getSources } from '@/lib/db';

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
  const [projects, sources] = await Promise.all([getProjects(6), getSources(3)]);

  const sliderSlides = projects.map(p => ({
    id: p.id,
    slug: p.slug,
    category: CATEGORY_LABELS[p.category] ?? p.category,
    title: p.title,
    thumbnail: p.thumbnail,
  }));

  return (
    <>
      <HeroSection />
      <LogoLoop />
      <FeaturedSlider slides={sliderSlides} />
      <GridSection
        title="MY WORK"
        allHref="/portfolio"
        items={projects as any}
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
