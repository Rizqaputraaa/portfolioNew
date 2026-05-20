import { getProjects, getSources } from '@/lib/db';
import HeroSection from './components/HeroSection/HeroSection';
import LogoLoop from './components/TechStrip/LogoLoop';
import FeaturedSlider from './components/FeaturedSlider/FeaturedSlider';
import GridSection from './components/GridSection/GridSection';
import CurvedLoop from './components/MarqueeSection/CurvedLoop';
import NewsletterSection from './components/NewsletterSection/NewsletterSection';
import type { Project, Source } from '@/types';

// Placeholder items for when DB is not yet connected
const placeholderProjects: Partial<Project>[] = [
  { id: '1', slug: 'project-01', title: 'Instagram Pack BKT', is_new: true },
  { id: '2', slug: 'project-02', title: 'Logo Collection' },
  { id: '3', slug: 'project-03', title: 'Event Poster' },
  { id: '4', slug: 'project-04', title: 'Business Card' },
  { id: '5', slug: 'project-05', title: 'UI Design App' },
  { id: '6', slug: 'project-06', title: 'Brand Identity', is_new: true },
];

const placeholderSources: Partial<Source>[] = [
  { id: '1', slug: 'source-01', title: 'Clean Mockup Pack' },
  { id: '2', slug: 'source-02', title: 'Overlay Textures Vol.1' },
  { id: '3', slug: 'source-03', title: 'Grunge Overlays' },
];

export default async function HomePage() {
  let projects: Partial<Project>[] = placeholderProjects;
  let sources: Partial<Source>[] = placeholderSources;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl.startsWith('https://') && !supabaseUrl.includes('your-')) {
    const [dbProjects, dbSources] = await Promise.all([getProjects(6), getSources(3)]);
    if (dbProjects.length > 0) projects = dbProjects;
    if (dbSources.length > 0) sources = dbSources;
  }

  return (
    <>
      <HeroSection />
      <LogoLoop />
      <FeaturedSlider />
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
