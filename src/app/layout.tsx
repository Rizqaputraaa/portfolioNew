import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import SmoothScroll from '@/components/SmoothScroll/SmoothScroll';

export const metadata: Metadata = {
  title: 'RIZQAPUTRA — Designer. Coder. Artist.',
  description:
    'Portfolio of Rizqa Putra Ananda — Design + Code + Art. Built by someone who refuses to pick just one lane.',
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
        <SmoothScroll />
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
