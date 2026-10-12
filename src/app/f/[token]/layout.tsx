import type { Metadata, Viewport } from 'next';

// A private link for one client: keep it out of search results.
export const metadata: Metadata = {
  title: 'Daftar Promo',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0C0C0C',
};

export default function FormLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* iOS Safari pans the whole page sideways if anything overflows: lock it on this page only */}
      <style>{`html,body{overflow-x:hidden;max-width:100%}`}</style>
      {children}
    </>
  );
}
