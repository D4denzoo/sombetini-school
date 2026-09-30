import type { Metadata, Viewport } from 'next';
import { Fraunces, Outfit } from 'next/font/google';
import { Providers } from '@/components/providers';
import { RegisterSw } from '@/components/register-sw';
import './globals.css';

const display = Fraunces({ subsets: ['latin'], variable: '--font-display', weight: ['500', '600', '700'] });
const sans = Outfit({ subsets: ['latin'], variable: '--font-sans', weight: ['400', '500', '600', '700'] });

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Sombetini Primary School', template: '%s · Sombetini Primary School' },
  description: 'The digital home of Sombetini Primary School in Arusha. Results, school fees, announcements, and parent and teacher portals.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Sombetini Primary School',
    description: 'Quality primary education in Arusha, Tanzania.',
    type: 'website',
    url: siteUrl,
    locale: 'en_TZ',
  },
};

export const viewport: Viewport = { themeColor: '#14532D', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable}`}>
      <body>
        <Providers>
          <a className="skip-link" href="#main">Skip to content</a>
          {children}
          <RegisterSw />
        </Providers>
      </body>
    </html>
  );
}
