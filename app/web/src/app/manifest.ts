import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NutriAI Diary — дневник питания',
    short_name: 'NutriAI Diary',
    description:
      'Распознавание еды по фото, персональный план питания, ИИ-чат и аналитика КБЖУ.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#15803d',
    orientation: 'portrait',
    lang: 'ru',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/maskable-icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/icons/screenshot-mobile.png',
        sizes: '390x844',
        type: 'image/png',
      },
      {
        src: '/icons/screenshot-desktop.png',
        sizes: '1280x800',
        type: 'image/png',
        form_factor: 'wide',
      },
    ],
  };
}
