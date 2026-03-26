import type { Metadata } from 'next';
import Landing from '@/views/Landing';

export const metadata: Metadata = {
  title: 'NutriAI Diary — ИИ-дневник питания',
  description:
    'Распознавание еды по фото, персональные планы питания, умный дневник и чат с ИИ-нутрициологом. Адаптировано для российской кухни.',
  openGraph: {
    title: 'NutriAI Diary — умный дневник питания',
    description:
      'ИИ распознаёт блюда по фото, считает КБЖУ, строит рацион и отвечает на вопросы 24/7.',
  },
};

export default function HomePage() {
  return <Landing />;
}
