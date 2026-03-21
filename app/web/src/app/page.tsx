import type { Metadata } from 'next';
import Landing from '@/views/Landing';

export const metadata: Metadata = {
  title: 'Главная',
  description:
    'Nutriaidiary — дневник питания с ИИ: фото еды, план на неделю, чат с нутрициологом и аналитика КБЖУ.',
  openGraph: {
    title: 'Nutriaidiary — умный дневник питания',
    description:
      'Распознавание блюд по фото, персональный рацион и ИИ-помощник 24/7.',
  },
};

export default function HomePage() {
  return <Landing />;
}
