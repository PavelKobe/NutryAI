import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Flame } from 'lucide-react';
import NutritionTable from '@/components/products/NutritionTable';
import MacroPieChart from '@/components/products/MacroPieChart';

// ── Types ───────────────────────────────────────────────────────────────────

interface Nutrition {
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  salt?: number;
}

interface ProductData {
  id: number;
  slug: string;
  name: string;
  brand?: string | null;
  image_url?: string | null;
  nutrition_100g?: Nutrition | null;
  category?: string | null;
}

// ── Data fetching ───────────────────────────────────────────────────────────

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://127.0.0.1:8000';

async function getProduct(slug: string): Promise<ProductData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/products/${slug}`, {
      next: { revalidate: 3600 }, // ISR: 1 hour
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Metadata ────────────────────────────────────────────────────────────────

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Продукт не найден' };

  const n = product.nutrition_100g;
  const cal = n?.calories ? `${Math.round(n.calories)} ккал` : '';
  const bzu = [
    n?.protein != null ? `Б ${n.protein.toFixed(1)}` : '',
    n?.fat != null ? `Ж ${n.fat.toFixed(1)}` : '',
    n?.carbs != null ? `У ${n.carbs.toFixed(1)}` : '',
  ]
    .filter(Boolean)
    .join(' / ');

  const description = `${product.name} — калорийность ${cal}, БЖУ: ${bzu} на 100 г. Подробная пищевая ценность.`;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nutriaidiary.com';

  return {
    title: `${product.name} — калорийность и БЖУ`,
    description,
    openGraph: {
      title: `${product.name} — калорийность и БЖУ`,
      description,
      url: `${siteUrl}/products/${slug}`,
      type: 'article',
      ...(product.image_url && { images: [{ url: product.image_url }] }),
    },
  };
}

// ── JSON-LD ─────────────────────────────────────────────────────────────────

function ProductJsonLd({ product }: { product: ProductData }) {
  const n = product.nutrition_100g;
  if (!n) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NutritionInformation',
    name: product.name,
    ...(n.calories != null && { calories: `${Math.round(n.calories)} kcal` }),
    ...(n.protein != null && { proteinContent: `${n.protein.toFixed(1)} g` }),
    ...(n.fat != null && { fatContent: `${n.fat.toFixed(1)} g` }),
    ...(n.carbs != null && { carbohydrateContent: `${n.carbs.toFixed(1)} g` }),
    ...(n.fiber != null && { fiberContent: `${n.fiber.toFixed(1)} g` }),
    ...(n.sugar != null && { sugarContent: `${n.sugar.toFixed(1)} g` }),
    ...(n.sodium != null && { sodiumContent: `${(n.sodium * 1000).toFixed(0)} mg` }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const n = product.nutrition_100g;

  return (
    <>
      <ProductJsonLd product={product} />

      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Back link */}
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Каталог продуктов
          </Link>

          {/* Header */}
          <div className="flex items-start gap-4 mb-8">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-24 h-24 rounded-2xl object-cover flex-shrink-0 border border-slate-800"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-slate-800/50 border border-slate-800 flex items-center justify-center flex-shrink-0">
                <Flame className="w-8 h-8 text-slate-600" />
              </div>
            )}

            <div>
              <h1 className="text-2xl font-bold text-white leading-tight">
                {product.name}
              </h1>
              {product.brand && (
                <p className="text-sm text-slate-400 mt-1">{product.brand}</p>
              )}
              {product.category && (
                <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  {product.category}
                </span>
              )}
              {n?.calories != null && (
                <p className="mt-2 text-lg font-semibold text-orange-400 flex items-center gap-1.5">
                  <Flame className="w-5 h-5" />
                  {Math.round(n.calories)} ккал / 100 г
                </p>
              )}
            </div>
          </div>

          {/* Nutrition table */}
          {n && <NutritionTable nutrition={n} />}

          {/* Macro pie chart */}
          {n?.protein != null && n?.fat != null && n?.carbs != null && (
            <div className="mt-6">
              <MacroPieChart
                protein={n.protein}
                fat={n.fat}
                carbs={n.carbs}
              />
            </div>
          )}

          {/* CTA */}
          <div className="mt-10 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 p-6 text-center">
            <h2 className="text-lg font-semibold text-white mb-2">
              Отслеживайте питание с NutriAI Diary
            </h2>
            <p className="text-sm text-slate-400 mb-4">
              Ведите дневник питания, считайте калории и получайте персональные рекомендации от ИИ
            </p>
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
            >
              Попробовать бесплатно
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
