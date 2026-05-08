'use client';

import { useState } from 'react';
import { Package, Star, Trash2, Flame, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getCategoryLabel } from '@/lib/product-categories';
import { formatStock } from '@/lib/parseAmount';

interface Nutrition {
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

interface ProductData {
  id: number;
  name: string;
  brand?: string | null;
  image_url?: string | null;
  nutrition_100g?: Nutrition | null;
  category?: string | null;
  source_api: string;
}

export interface UserProductData {
  id: number;
  custom_name?: string | null;
  serving_g?: number | null;
  stock_grams?: number | null;
  category?: string | null;
  tags?: string[] | null;
  is_favorite: boolean;
  product: ProductData;
}

interface ProductCardProps {
  item: UserProductData;
  onDelete: (id: number) => void;
  onToggleFavorite: (id: number, current: boolean) => void;
  isDeleting?: boolean;
}

export default function ProductCard({
  item,
  onDelete,
  onToggleFavorite,
  isDeleting,
}: ProductCardProps) {
  const [expanded, setExpanded] = useState(false);

  const { product } = item;
  const displayName = item.custom_name || product.name;
  const nutrition = product.nutrition_100g ?? {};
  const category = item.category || product.category;

  return (
    <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 overflow-hidden transition-all">
      {/* Compact header row */}
      <div className="flex items-center gap-3 p-3">
        {/* Image / placeholder */}
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={displayName}
            className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6 text-slate-600" />
          </div>
        )}

        {/* Name + brand + quick macros */}
        <button
          className="flex-1 min-w-0 text-left"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <p className="font-medium text-white truncate leading-tight">{displayName}</p>
          {product.brand && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{product.brand}</p>
          )}

          {/* КБЖУ row */}
          <div className="flex items-center gap-2 mt-1.5 text-xs flex-wrap">
            {nutrition.calories != null && (
              <span className="flex items-center gap-1 text-orange-400">
                <Flame className="w-3 h-3" />
                {Math.round(nutrition.calories)} ккал
              </span>
            )}
            {nutrition.protein != null && (
              <span className="text-red-400">Б {nutrition.protein.toFixed(1)}г</span>
            )}
            {nutrition.fat != null && (
              <span className="text-amber-400">Ж {nutrition.fat.toFixed(1)}г</span>
            )}
            {nutrition.carbs != null && (
              <span className="text-blue-400">У {nutrition.carbs.toFixed(1)}г</span>
            )}
          </div>

          {/* Category + Stock badges */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {category && (
              <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                {getCategoryLabel(category)}
              </span>
            )}
            {item.stock_grams != null && item.stock_grams > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <ShoppingBag className="w-2.5 h-2.5" />
                в наличии: {formatStock(item.stock_grams)}
              </span>
            )}
          </div>
        </button>

        {/* Action buttons */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onToggleFavorite(item.id, item.is_favorite)}
                aria-label={item.is_favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                title={
                  item.is_favorite
                    ? 'Убрать из избранного'
                    : 'В избранное — учесть при генерации плана питания'
                }
                className={`p-1.5 rounded-lg transition-colors ${
                  item.is_favorite
                    ? 'text-amber-400 hover:text-amber-300'
                    : 'text-slate-600 hover:text-amber-400'
                }`}
              >
                <Star className={`w-4 h-4 ${item.is_favorite ? 'fill-current' : ''}`} />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="end"
              className="bg-slate-800 border border-slate-700 text-slate-100 text-xs max-w-[220px]"
            >
              {item.is_favorite
                ? 'В избранном — учитывается в плане питания. Клик — убрать.'
                : 'Добавьте в избранное, чтобы включить в персональный план питания.'}
            </TooltipContent>
          </Tooltip>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 transition-colors"
            aria-label={expanded ? 'Свернуть' : 'Развернуть'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-800/50 space-y-3">
          {/* Full nutrition table */}
          {Object.keys(nutrition).length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {nutrition.calories != null && (
                <NutrRow label="Калории" value={`${Math.round(nutrition.calories)} ккал`} color="text-orange-400" />
              )}
              {nutrition.protein != null && (
                <NutrRow label="Белки" value={`${nutrition.protein.toFixed(1)} г`} color="text-red-400" />
              )}
              {nutrition.fat != null && (
                <NutrRow label="Жиры" value={`${nutrition.fat.toFixed(1)} г`} color="text-amber-400" />
              )}
              {nutrition.carbs != null && (
                <NutrRow label="Углеводы" value={`${nutrition.carbs.toFixed(1)} г`} color="text-blue-400" />
              )}
              {nutrition.fiber != null && (
                <NutrRow label="Клетчатка" value={`${nutrition.fiber.toFixed(1)} г`} color="text-green-400" />
              )}
              {nutrition.sugar != null && (
                <NutrRow label="Сахар" value={`${nutrition.sugar.toFixed(1)} г`} color="text-pink-400" />
              )}
              {nutrition.sodium != null && (
                <NutrRow label="Натрий" value={`${(nutrition.sodium * 1000).toFixed(0)} мг`} color="text-slate-300" />
              )}
            </div>
          )}

          {/* Serving */}
          {item.serving_g && (
            <p className="text-xs text-slate-500">
              Порция: <span className="text-slate-300">{item.serving_g} г</span>
            </p>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/50"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Source badge */}
          {product.source_api === 'openfoodfacts' && (
            <p className="text-[10px] text-slate-600">Источник: OpenFoodFacts</p>
          )}

          {/* Delete */}
          <Button
            onClick={() => onDelete(item.id)}
            disabled={isDeleting}
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full justify-start"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isDeleting ? 'Удаление...' : 'Удалить из коллекции'}
          </Button>
        </div>
      )}
    </div>
  );
}

function NutrRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-800/40">
      <span className="text-slate-400">{label}</span>
      <span className={`font-medium ${color}`}>{value}</span>
    </div>
  );
}
