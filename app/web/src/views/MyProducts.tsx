'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Package, Search, Star, X } from 'lucide-react';
import { toast } from 'sonner';

import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import BarcodeScanner from '@/components/products/BarcodeScanner';
import ProductCard, { UserProductData } from '@/components/products/ProductCard';
import AddProductModal from '@/components/products/AddProductModal';
import { PRODUCT_CATEGORIES } from '@/lib/product-categories';
import { client } from '@/lib/api';
import { getAPIBaseURL } from '@/lib/config';

const PAGE_SIZE = 20;

function getToken(): string {
  try {
    return localStorage.getItem('token') ?? '';
  } catch {
    return '';
  }
}

interface UserProductsListResponse {
  items: UserProductData[];
  total: number;
  skip: number;
  limit: number;
}

/**
 * Прямой fetch к /api/v1/entities/user_products с плоскими query-параметрами.
 * SDK client.entities.* оборачивает фильтры в `?query=<JSON>`, а backend
 * (см. routers/user_products.py:24-48) ожидает плоские `?search=&category=&sort=`.
 */
async function fetchUserProducts(params: {
  search?: string;
  category?: string;
  skip?: number;
  limit?: number;
  sort?: string;
}): Promise<UserProductsListResponse> {
  const url = new URL(
    `${getAPIBaseURL().replace(/\/$/, '')}/api/v1/entities/user_products`
  );
  if (params.search) url.searchParams.set('search', params.search);
  if (params.category) url.searchParams.set('category', params.category);
  if (params.sort) url.searchParams.set('sort', params.sort);
  if (params.skip !== undefined) url.searchParams.set('skip', String(params.skip));
  if (params.limit !== undefined) url.searchParams.set('limit', String(params.limit));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch user products: ${res.status}`);
  return res.json();
}

// Конвертируем поля формы AddProductModal → UserProductCreate для бэкенда
function buildCreatePayload(values: {
  name?: string;
  brand?: string;
  barcode?: string;
  category?: string;
  serving_g?: number;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  fiber?: number;
}) {
  const nutrition: Record<string, number> = {};
  if (values.calories != null) nutrition.calories = values.calories;
  if (values.protein  != null) nutrition.protein  = values.protein;
  if (values.fat      != null) nutrition.fat       = values.fat;
  if (values.carbs    != null) nutrition.carbs     = values.carbs;
  if (values.fiber    != null) nutrition.fiber     = values.fiber;

  return {
    name:          values.name,
    brand:         values.brand || undefined,
    barcode:       values.barcode || undefined,
    category:      values.category || undefined,
    serving_g:     values.serving_g ?? 100,
    nutrition_100g: Object.keys(nutrition).length > 0 ? nutrition : undefined,
  };
}

export default function MyProducts() {
  const queryClient = useQueryClient();

  const [search, setSearch]                   = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter]   = useState('');
  const [page, setPage]                       = useState(0);
  const [scannerOpen, setScannerOpen]         = useState(false);
  const [modalOpen, setModalOpen]             = useState(false);
  const [prefillBarcode, setPrefillBarcode]   = useState('');
  const [deletingId, setDeletingId]           = useState<number | null>(null);
  const [showStarHint, setShowStarHint]       = useState(false);

  // Показываем подсказку про звёздочку только при первом визите
  useEffect(() => {
    try {
      if (!localStorage.getItem('my_products_star_hint_seen')) {
        setShowStarHint(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const dismissStarHint = useCallback(() => {
    try {
      localStorage.setItem('my_products_star_hint_seen', '1');
    } catch {
      // ignore
    }
    setShowStarHint(false);
  }, []);

  const skip = page * PAGE_SIZE;

  // Debounce поиска — не дёргаем backend на каждое нажатие клавиши
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // ── Запрос списка продуктов ─────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['user_products', { search: debouncedSearch, category: categoryFilter, skip }],
    queryFn: () =>
      fetchUserProducts({
        search: debouncedSearch || undefined,
        category: categoryFilter || undefined,
        skip,
        limit: PAGE_SIZE,
        sort: '-created_at',
      }),
    staleTime: 30_000,
  });

  const items: UserProductData[] = data?.items ?? [];
  const total: number = data?.total ?? 0;

  // ── Мутация: удаление ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      client.entities.user_products.delete({ id: String(id) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_products'] });
      toast.success('Продукт удалён из коллекции');
    },
    onError: () => toast.error('Не удалось удалить продукт'),
  });

  const handleDelete = useCallback(async (id: number) => {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  }, [deleteMutation]);

  // ── Мутация: избранное ──────────────────────────────────────────────────────
  const favoriteMutation = useMutation({
    mutationFn: ({ id, is_favorite }: { id: number; is_favorite: boolean }) =>
      client.entities.user_products.update({ id: String(id), data: { is_favorite } }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['user_products'] }),
    onError: () => toast.error('Не удалось обновить избранное'),
  });

  const handleToggleFavorite = useCallback((id: number, current: boolean) => {
    favoriteMutation.mutate({ id, is_favorite: !current });
    // первый тап на звёздочке тоже скрывает onboarding-подсказку
    if (showStarHint) dismissStarHint();
  }, [favoriteMutation, showStarHint, dismissStarHint]);

  // ── Мутация: сканирование штрихкода ────────────────────────────────────────
  const scanMutation = useMutation({
    mutationFn: (barcode: string) =>
      axios.post(
        `${getAPIBaseURL()}/api/v1/scan`,
        { barcode },
        { headers: { Authorization: `Bearer ${getToken()}` } },
      ),
    onSuccess: (res) => {
      const name: string =
        res.data?.custom_name ?? res.data?.product?.name ?? 'Продукт';
      queryClient.invalidateQueries({ queryKey: ['user_products'] });
      toast.success(`«${name}» добавлен в коллекцию`);
      setScannerOpen(false);
    },
    onError: (err: unknown, barcode: string) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setPrefillBarcode(barcode);
        setModalOpen(true);
        toast.info('Продукт не найден в базе — заполните данные вручную');
      } else {
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        toast.error(detail ?? 'Ошибка при поиске продукта');
      }
    },
  });

  // ── Ручное добавление ────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof buildCreatePayload>) =>
      client.entities.user_products.create({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_products'] });
      toast.success('Продукт добавлен в коллекцию');
    },
    onError: () => toast.error('Не удалось добавить продукт'),
  });

  const handleManualAdd = useCallback(async (values: Parameters<typeof buildCreatePayload>[0]) => {
    await createMutation.mutateAsync(buildCreatePayload(values));
  }, [createMutation]);

  // ── Сброс пагинации при смене фильтров ─────────────────────────────────────
  // Поиск: сброс page происходит через debounce-effect выше.
  const handleSearch = (val: string) => { setSearch(val); };
  const handleCategory = (val: string) => { setCategoryFilter(val === 'all' ? '' : val); setPage(0); };

  return (
    <AppLayout title="Мои продукты">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-400" />
              Мои продукты
            </h2>
            {!isLoading && (
              <p className="text-xs text-slate-500 mt-0.5">{total} продуктов</p>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Button
              onClick={() => setScannerOpen((v) => !v)}
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl"
            >
              {scannerOpen ? 'Закрыть сканер' : '📷 Сканировать'}
            </Button>
            <AddProductModal
              onAdd={handleManualAdd}
              open={modalOpen}
              onOpenChange={setModalOpen}
              prefillBarcode={prefillBarcode}
            />
          </div>
        </div>

        {/* Barcode Scanner (collapsible) */}
        {scannerOpen && (
          <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-4">
            <BarcodeScanner
              onScan={(barcode) => scanMutation.mutate(barcode)}
              isLoading={scanMutation.isPending}
            />
            {scanMutation.isPending && (
              <p className="text-xs text-slate-400 text-center mt-2 animate-pulse">
                Ищем продукт...
              </p>
            )}
          </div>
        )}

        {/* Search + Category filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Поиск по названию..."
              className="pl-10 bg-slate-900/50 border-slate-700/50 rounded-xl text-white placeholder:text-slate-500"
            />
          </div>
          <Select onValueChange={handleCategory} defaultValue="all">
            <SelectTrigger className="w-36 bg-slate-900/50 border-slate-700/50 text-slate-300 rounded-xl">
              <SelectValue placeholder="Категория" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700">
                Все
              </SelectItem>
              {PRODUCT_CATEGORIES.map((cat) => (
                <SelectItem
                  key={cat.value}
                  value={cat.value}
                  className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700"
                >
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Onboarding-подсказка о звёздочке */}
        {showStarHint && items.length > 0 && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Star className="w-5 h-5 text-amber-400 fill-current" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-100">
                Что это за звёздочка
              </p>
              <p className="text-xs text-amber-100/80 mt-0.5 leading-relaxed">
                Нажмите ⭐ напротив продукта, чтобы добавить его в избранное.
                ИИ учтёт эти продукты при генерации персонального плана питания.
              </p>
              <button
                type="button"
                onClick={dismissStarHint}
                className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-semibold transition-colors"
              >
                Понятно
              </button>
            </div>
            <button
              type="button"
              onClick={dismissStarHint}
              aria-label="Скрыть подсказку"
              className="text-amber-200/70 hover:text-amber-100 p-1 rounded-md hover:bg-amber-500/10 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Product list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl bg-slate-800/60" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 rounded-2xl bg-slate-900/50 border border-slate-800/50 text-center">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 mb-1">
              {debouncedSearch || categoryFilter ? 'Ничего не найдено' : 'Коллекция пуста'}
            </p>
            <p className="text-sm text-slate-500">
              {debouncedSearch || categoryFilter
                ? 'Попробуйте изменить поиск или фильтр'
                : 'Отсканируйте штрихкод или добавьте продукт вручную'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                onDelete={handleDelete}
                onToggleFavorite={handleToggleFavorite}
                isDeleting={deletingId === item.id}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-2">
            <Button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-400 hover:text-white rounded-xl"
            >
              ← Назад
            </Button>
            <span className="text-xs text-slate-500">
              {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} из {total}
            </span>
            <Button
              onClick={() => setPage((p) => p + 1)}
              disabled={skip + PAGE_SIZE >= total}
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-400 hover:text-white rounded-xl"
            >
              Вперёд →
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
