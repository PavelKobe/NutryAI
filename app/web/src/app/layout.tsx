import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';

const inter = Inter({ subsets: ['latin', 'cyrillic'], display: 'swap' });
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nutriaidiary.com';

export const viewport: Viewport = {
  themeColor: '#15803d',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Nutriaidiary — умный дневник питания и ИИ-нутрициолог',
    template: '%s | Nutriaidiary',
  },
  description:
    'Распознавание еды по фото, персональный план питания, ИИ-чат и аналитика КБЖУ. Дневник питания Nutriaidiary.',
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: siteUrl,
    siteName: 'Nutriaidiary',
    title: 'Nutriaidiary — умный дневник питания',
    description:
      'ИИ помогает вести дневник питания, строить рацион и отвечать на вопросы о здоровом питании.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nutriaidiary',
    description: 'Умный дневник питания и ИИ-нутрициолог',
  },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NutriAI Diary',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/remixicon/4.5.0/remixicon.min.css"
        />
      </head>
      <body className={`${inter.className} ${spaceGrotesk.variable}`}>
        <ServiceWorkerRegistrar />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
