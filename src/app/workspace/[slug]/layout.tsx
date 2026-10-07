import type { Metadata, Viewport } from 'next';

// Private client workspace — keep it out of search results.
export const metadata: Metadata = {
  title: 'Workspace',
  robots: { index: false, follow: false },
};

// viewport-fit=cover lets the dark background reach the notch / home-indicator areas on phones.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* iOS Safari lets the whole page pan sideways if anything overflows: lock it on workspace pages only */}
      <style>{`html,body{overflow-x:hidden;max-width:100%}`}</style>
      {children}
    </>
  );
}
