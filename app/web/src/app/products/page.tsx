import { Metadata } from 'next';
import Link from 'next/link';
import { Flame, Search } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────

interface Nutrition {
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
}

interface ProductItem {
  id: number;
  slug: string | null;
  name: string;
  brand?: string | null;
  image_url?: string | null;
  nutrition_100g?: Nutrition | null;
  category?: string | null;
}

interface ProductListResponse {
  items: ProductItem[];
  total: number;
  limit: number;
  offset: number;
}

interface CategoryCount {
  category: string;
  count: number;
}

// ── Data fetching ───────────────────────────────────────────────────────────

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://127.0.0.1:8000';

const ITEMS_PER_PAGE = 24;

async function getProducts(
  category?: string,
  page: number = 1,
): Promise<ProductListResponse> {
  const offset = (page - 1) * ITEMS_PER_PAGE;
  const params = new URLSearchParams({
    limit: ITEMS_PER_PAGE.toString(),
    offset: offset.toString(),
  });
  if (category) params.set('category', category);

  try {
    const res = await fetch(`${API_BASE}/api/v1/products?${params}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { items: [], total: 0, limit: ITEMS_PER_PAGE, offset: 0 };
    return res.json();
  } catch {
    return { items: [], total: 0, limit: ITEMS_PER_PAGE, offset: 0 };
  }
}

async function getCategories(): Promise<CategoryCount[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/products/categories`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// ── Metadata ────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Каталог продуктов — калорийность и БЖУ',
  description:
    'Таблица калорийности продуктов питания. Белки, жиры, углеводы на 100 г. Крупы, мясо, рыба, овощи, фрукты и другие категории.',
  openGraph: {
    title: 'Каталог продуктов — калорийность и БЖУ',
    description:
      'Таблица калорийности продуктов питания. КБЖУ на 100 г для более чем 500 продуктов.',
  },
};

// ── Page ────────────────────────────────────────────────────────────────────

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ProductsCatalogPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const category = typeof sp.category === 'string' ? sp.category : undefined;
  const page = typeof sp.page === 'string' ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;

  const [products, categories] = await Promise.all([
    getProducts(category, page),
    getCategories(),
  ]);

  const totalPages = Math.ceil(products.total / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Каталог продуктов
          </h1>
          <p className="text-slate-400">
            Калорийность и пищевая ценность продуктов на 100 г
          </p>
        </div>

        {/* Category chips */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Link
              href="/products"
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                !category
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:text-white hover:border-slate-600'
              }`}
            >
              Все ({products.total})
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.category}
                href={`/products?category=${encodeURIComponent(cat.category)}`}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  category === cat.category
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:text-white hover:border-slate-600'
                }`}
              >
                {cat.category} ({cat.count})
              </Link>
            ))}
          </div>
        )}

        {/* Product grid */}
        {products.items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.items.map((item) => (
              <ProductCatalogCard key={item.id} product={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Продукты не найдены</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-10">
            {page > 1 && (
              <Link
                href={`/products?${new URLSearchParams({
                  ...(category ? { category } : {}),
                  page: (page - 1).toString(),
                })}`}
                className="px-4 py-2 text-sm rounded-xl bg-slate-800/50 text-slate-300 border border-slate-700/50 hover:text-white transition-colors"
              >
                Назад
              </Link>
            )}

            <span className="text-sm text-slate-500 px-3">
              {page} / {totalPages}
            </span>

            {page < totalPages && (
              <Link
                href={`/products?${new URLSearchParams({
                  ...(category ? { category } : {}),
                  page: (page + 1).toString(),
                })}`}
                className="px-4 py-2 text-sm rounded-xl bg-slate-800/50 text-slate-300 border border-slate-700/50 hover:text-white transition-colors"
              >
                Далее
              </Link>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 p-6 text-center">
          <h2 className="text-lg font-semibold text-white mb-2">
            Отслеживайте своё питание
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Ведите дневник питания и считайте калории с помощью ИИ-ассистента
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
          >
            Начать бесплатно
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Product card for catalog ────────────────────────────────────────────────

function ProductCatalogCard({ product }: { product: ProductItem }) {
  const n = product.nutrition_100g;
  const href = product.slug ? `/products/${product.slug}` : '#';

  return (
    <Link
      href={href}
      className="group rounded-2xl bg-slate-900/50 border border-slate-800/50 p-4 hover:border-slate-700/50 hover:bg-slate-900/80 transition-all"
    >
      <div className="flex items-start gap-3">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-slate-800/50 flex items-center justify-center flex-shrink-0">
            <Flame className="w-6 h-6 text-slate-600" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="font-medium text-white truncate group-hover:text-emerald-400 transition-colors">
            {product.name}
          </p>
          {product.brand && (
            <p className="text-xs text-slate-500 truncate mt-0.5">{product.brand}</p>
          )}

          {n && (
            <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
              {n.calories != null && (
                <span className="flex items-center gap-1 text-orange-400">
                  <Flame className="w-3 h-3" />
                  {Math.round(n.calories)} ккал
                </span>
              )}
              {n.protein != null && (
                <span className="text-red-400">Б {n.protein.toFixed(1)}</span>
              )}
              {n.fat != null && (
                <span className="text-amber-400">Ж {n.fat.toFixed(1)}</span>
              )}
              {n.carbs != null && (
                <span className="text-blue-400">У {n.carbs.toFixed(1)}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
