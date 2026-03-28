'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { client } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChefHat,
  Search,
  Trash2,
  Flame,
  Clock,
  ArrowLeft,
  UtensilsCrossed,
  Users,
  ListChecks,
  BookOpen,
  Plus,
  Minus,
} from 'lucide-react';
import { toast } from 'sonner';

interface Recipe {
  id: number;
  title: string;
  description?: string;
  cuisine?: string;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  cooking_time?: number;
  servings?: number;
  ingredients?: string;
  instructions?: string;
  image_url?: string;
  created_at?: string;
}

export default function SavedRecipes() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadRecipes = useCallback(async () => {
    try {
      const res = await client.entities.recipes.query({
        sort: '-created_at',
        limit: 100,
      });
      setRecipes(res?.data?.items || []);
    } catch (err) {
      console.error('Load recipes error:', err);
      toast.error('Не удалось загрузить рецепты');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await client.entities.recipes.delete({ id: String(id) });
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      toast.success('Рецепт удалён');
      if (expandedId === id) setExpandedId(null);
    } catch {
      toast.error('Не удалось удалить рецепт');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = recipes.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.title?.toLowerCase().includes(q) ||
      r.cuisine?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <AppLayout title="Рецепты">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Сохранённые рецепты">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/meal-plan')}
            className="p-2 rounded-xl hover:bg-slate-800 transition-colors text-slate-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-emerald-400" /> Мои рецепты
          </h2>
          <span className="ml-auto text-sm text-slate-500">
            {filtered.length} {filtered.length === 1 ? 'рецепт' : 'рецептов'}
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или кухне..."
            className="pl-10 bg-slate-900/50 border-slate-700/50 rounded-xl text-white placeholder:text-slate-500"
          />
        </div>

        {/* Recipe List */}
        {filtered.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800/50 text-center">
            <UtensilsCrossed className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 mb-2">
              {search ? 'Ничего не найдено' : 'У вас ещё нет сохранённых рецептов'}
            </p>
            {!search && (
              <p className="text-sm text-slate-500">
                Перейдите в план питания и сохраните понравившиеся блюда
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((recipe) => {
              const isExpanded = expandedId === recipe.id;
              return (
                <div
                  key={recipe.id}
                  className="rounded-2xl bg-slate-900/50 border border-slate-800/50 overflow-hidden transition-all"
                >
                  {/* Card Header */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : recipe.id)}
                    className="w-full text-left p-4"
                  >
                    <div className="flex gap-3">
                      {/* Image */}
                      {recipe.image_url ? (
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <ChefHat className="w-6 h-6 text-slate-600" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{recipe.title}</p>
                        {recipe.cuisine && (
                          <p className="text-xs text-slate-500 mt-0.5">{recipe.cuisine}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs">
                          {recipe.calories != null && (
                            <span className="flex items-center gap-1 text-orange-400">
                              <Flame className="w-3 h-3" /> {recipe.calories} ккал
                            </span>
                          )}
                          {recipe.cooking_time != null && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <Clock className="w-3 h-3" /> {recipe.cooking_time} мин
                            </span>
                          )}
                        </div>
                        {/* КБЖУ bar */}
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          {recipe.protein != null && (
                            <span className="text-red-400">Б{recipe.protein}г</span>
                          )}
                          {recipe.fat != null && (
                            <span className="text-amber-400">Ж{recipe.fat}г</span>
                          )}
                          {recipe.carbs != null && (
                            <span className="text-blue-400">У{recipe.carbs}г</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-slate-800/50 pt-3">
                      {/* Large Image */}
                      {recipe.image_url && (
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="w-full h-48 object-cover rounded-xl"
                        />
                      )}

                      {/* Description */}
                      {recipe.description && (
                        <p className="text-sm text-slate-300">{recipe.description}</p>
                      )}

                      {/* Quick Info Row */}
                      <div className="flex flex-wrap gap-3">
                        {recipe.servings && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 text-xs">
                            <Users className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-slate-300">{recipe.servings} порций</span>
                          </div>
                        )}
                        {recipe.cooking_time && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 text-xs">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-slate-300">{recipe.cooking_time} мин</span>
                          </div>
                        )}
                        {recipe.calories && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 text-xs">
                            <Flame className="w-3.5 h-3.5 text-orange-400" />
                            <span className="text-slate-300">{recipe.calories} ккал</span>
                          </div>
                        )}
                      </div>

                      {/* КБЖУ */}
                      {(recipe.protein || recipe.fat || recipe.carbs) && (
                        <div className="flex gap-4 text-xs">
                          {recipe.protein != null && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              <span className="text-slate-400">Белки:</span>
                              <span className="text-red-400 font-medium">{recipe.protein}г</span>
                            </div>
                          )}
                          {recipe.fat != null && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-amber-500" />
                              <span className="text-slate-400">Жиры:</span>
                              <span className="text-amber-400 font-medium">{recipe.fat}г</span>
                            </div>
                          )}
                          {recipe.carbs != null && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <span className="text-slate-400">Углеводы:</span>
                              <span className="text-blue-400 font-medium">{recipe.carbs}г</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Ingredients - Parse and display as list */}
                      {recipe.ingredients && (
                        <div className="bg-slate-800/30 rounded-xl p-3">
                          <h4 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                            <ListChecks className="w-4 h-4" />
                            Ингредиенты
                          </h4>
                          <ul className="space-y-1.5">
                            {recipe.ingredients.split('\n').filter(Boolean).map((ingredient, idx) => (
                              <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                                <span>{ingredient.trim()}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Instructions - Parse and display as steps */}
                      {recipe.instructions && (
                        <div className="bg-slate-800/30 rounded-xl p-3">
                          <h4 className="text-sm font-semibold text-indigo-400 mb-2 flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Как приготовить
                          </h4>
                          <ol className="space-y-3">
                            {recipe.instructions.split('\n').filter(Boolean).map((step, idx) => (
                              <li key={idx} className="text-sm text-slate-300 flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-medium">
                                  {idx + 1}
                                </span>
                                <span className="pt-0.5">{step.trim()}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Delete Button */}
                      <Button
                        onClick={() => handleDelete(recipe.id)}
                        disabled={deletingId === recipe.id}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full justify-start"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {deletingId === recipe.id ? 'Удаление...' : 'Удалить рецепт'}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}