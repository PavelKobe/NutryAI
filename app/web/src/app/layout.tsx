import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin', 'cyrillic'], display: 'swap' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nutriaidiary.com';

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
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
