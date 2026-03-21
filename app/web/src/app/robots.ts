import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nutriaidiary.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/dashboard', '/onboarding', '/meal-plan', '/add-food', '/chat', '/analytics', '/profile', '/saved-recipes', '/auth/'] }],
    sitemap: `${siteUrl.replace(/\/$/, '')}/sitemap.xml`,
  };
}
