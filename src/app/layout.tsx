import type { Metadata } from 'next';
import './globals.css';
import SiteShell from '@/components/SiteShell';

export const metadata: Metadata = {
  title: 'RIZQAPUTRA — Designer. Coder. Artist.',
  description:
    'Portfolio of Rizqa Putra Ananda — Design + Code + Art. Built by someone who refuses to pick just one lane.',
  icons: {
    icon: '/Logo.png',
    shortcut: '/Logo.png',
    apple: '/Logo.png',
  },
  openGraph: {
    title: 'RIZQAPUTRA — Portfolio',
    description: 'Design + Code + Art. All in one person.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
