import React, { useEffect, useMemo, useState } from 'react';
import { Search, Star, Trash2, X } from 'lucide-react';
import {
  FavoriteMeal,
  FoodCategory,
  FoodItem,
  MealType,
} from '../types/nutrition';
import {
  computeFoodGlycemicLoad,
  computeFoodNetCarbs,
  getGiClassification,
  MEAL_TYPES,
} from '../utils/nutritionMath';

export type LogMealMode = 'search' | 'favorites';

interface LogMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  foods: FoodItem[];
  favorites: FavoriteMeal[];
  selectedDate: string;
  initialMealType?: MealType;
  initialFood?: FoodItem | null;
  initialMode?: LogMealMode;
  onLogMeal: (
    food: FoodItem,
    options: {
      date: string;
      time: string;
      mealType: MealType;
      servings: number;
    }
  ) => void;
  onToggleFavorite: (
    food: FoodItem,
    options?: {
      defaultServings?: number;
      defaultMealType?: MealType;
    }
  ) => void;
  onRemoveFavorite: (id: string) => void;
}

const DEFAULT_MEAL_TIMES: Record<MealType, string> = {
  Breakfast: '08:15',
  Lunch: '12:30',
  Dinner: '19:00',
  Snack: '15:45',
};

export const LogMealModal: React.FC<LogMealModalProps> = ({
  isOpen,
  onClose,
  foods,
  favorites,
  selectedDate,
  initialMealType = 'Dinner',
  initialFood = null,
  initialMode = 'search',
  onLogMeal,
  onToggleFavorite,
  onRemoveFavorite,
}) => {
  const [mode, setMode] = useState<LogMealMode>(initialMode);
  const [query, setQuery] = useState('');
  const [favQuery, setFavQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FoodCategory | 'All'>('All');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(initialFood);
  const [mealType, setMealType] = useState<MealType>(initialMealType);
  const [time, setTime] = useState(DEFAULT_MEAL_TIMES[initialMealType]);
  const [servings, setServings] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setMode(initialFood ? 'search' : initialMode);
      setSelectedFood(initialFood);
      setMealType(initialMealType);
      setTime(DEFAULT_MEAL_TIMES[initialMealType]);
      setServings(1);
      setFavQuery('');
      if (!initialFood) {
        setQuery('');
      }
    }
  }, [isOpen, initialFood, initialMealType, initialMode]);

  const favoriteFoodIds = useMemo(() => {
    const ids = new Set<string>();
    for (const fav of favorites) {
      ids.add(fav.food.id);
    }
    return ids;
  }, [favorites]);

  const isFoodFavorited = (food: FoodItem): boolean =>
    favoriteFoodIds.has(food.id) ||
    favorites.some((f) => f.name.toLowerCase() === food.name.toLowerCase());

  const filteredFoods = useMemo(() => {
    const q = query.trim().toLowerCase();
    return foods.filter((f) => {
      if (categoryFilter !== 'All' && f.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        f.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [foods, query, categoryFilter]);

  const filteredFavorites = useMemo(() => {
    const q = favQuery.trim().toLowerCase();
    if (!q) return favorites;
    return favorites.filter(
      (fav) =>
        fav.name.toLowerCase().includes(q) ||
        fav.food.category.toLowerCase().includes(q) ||
        fav.food.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [favorites, favQuery]);

  if (!isOpen) return null;

  const handleSelectMealType = (next: MealType) => {
    setMealType(next);
    setTime(DEFAULT_MEAL_TIMES[next]);
  };

  const handleQuickAddFavorite = (fav: FavoriteMeal) => {
    onLogMeal(fav.food, {
      date: selectedDate,
      time,
      mealType,
      servings: Math.max(0.1, fav.defaultServings || 1),
    });
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFood) return;
    onLogMeal(selectedFood, {
      date: selectedDate,
      time,
      mealType,
      servings: Math.max(0.1, servings),
    });
    onClose();
  };

  const previewCalories = selectedFood
    ? Math.round(selectedFood.calories * servings)
    : 0;
  const previewNetCarbs = selectedFood
    ? Math.round(computeFoodNetCarbs(selectedFood) * servings * 10) / 10
    : 0;
  const previewProtein = selectedFood
    ? Math.round(selectedFood.protein * servings * 10) / 10
    : 0;
  const previewFiber = selectedFood
    ? Math.round(selectedFood.fiber * servings * 10) / 10
    : 0;
  const previewGl = selectedFood
    ? computeFoodGlycemicLoad(selectedFood, servings)
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-meal-title"
    >
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2
              id="log-meal-title"
              className="text-base font-semibold text-slate-900"
            >
              Log Meal Entry
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Recording for {selectedDate}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-5 space-y-4 overflow-y-auto flex-1"
        >
          {/* Meal slot & time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Meal Slot
              </label>
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-md">
                {MEAL_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleSelectMealType(type)}
                    className={`py-1.5 px-2 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                      mealType === type
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label
                htmlFor="meal-time"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Time
              </label>
              <input
                id="meal-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-9 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
                required
              />
            </div>
          </div>

          {/* Entry Mode Switcher: Search Database | Favorites */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-md">
            <button
              type="button"
              onClick={() => setMode('search')}
              className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                mode === 'search'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              Search Database
            </button>
            <button
              type="button"
              onClick={() => setMode('favorites')}
              className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                mode === 'favorites'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              Favorites ({favorites.length})
            </button>
          </div>

          {/* MODE 1: SEARCH DATABASE */}
          {mode === 'search' && (
            <>
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <label
                    htmlFor="food-search-input"
                    className="text-xs font-medium text-slate-700"
                  >
                    Search Food Database ({foods.length} items)
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) =>
                      setCategoryFilter(e.target.value as FoodCategory | 'All')
                    }
                    aria-label="Filter by food category"
                    className="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-700 bg-white focus:outline-none focus:border-teal-700"
                  >
                    <option value="All">All Categories</option>
                    <option value="Proteins">Proteins</option>
                    <option value="Grains & Carbs">Grains &amp; Carbs</option>
                    <option value="Vegetables">Vegetables</option>
                    <option value="Fruits">Fruits</option>
                    <option value="Dairy & Alternatives">Dairy &amp; Alternatives</option>
                    <option value="Fats & Nuts">Fats &amp; Nuts</option>
                    <option value="Prepared Meals">Prepared Meals</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>

                <div className="relative mb-2">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="food-search-input"
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search chicken, salmon, oats, lentils, low-gi..."
                    className="w-full h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100">
                  {filteredFoods.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      No matching foods found. Try a different search or add a custom food in the Food Database.
                    </div>
                  ) : (
                    filteredFoods.map((food) => {
                      const isSelected = selectedFood?.id === food.id;
                      const isFav = isFoodFavorited(food);
                      const giInfo = getGiClassification(food.gi);
                      const gl = computeFoodGlycemicLoad(food, 1);
                      return (
                        <div
                          key={food.id}
                          className={`flex items-center justify-between gap-2 px-3 py-2 transition-colors ${
                            isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedFood(food)}
                            className="flex-1 min-w-0 text-left flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-900 truncate">
                                {food.name}
                              </div>
                              <div className="text-xs text-slate-500 truncate">
                                {food.servingLabel} · {food.category} ·{' '}
                                <span
                                  className={
                                    giInfo.tone === 'alert'
                                      ? 'text-red-600 font-medium'
                                      : giInfo.tone === 'caution'
                                      ? 'text-amber-700 font-medium'
                                      : 'text-emerald-700 font-medium'
                                  }
                                >
                                  {giInfo.label} ({food.gi})
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0 font-mono text-xs tabular-nums">
                              <div className="font-medium text-slate-900">
                                {food.calories} kcal
                              </div>
                              <div className="text-slate-500">
                                {computeFoodNetCarbs(food)}g net · GL {gl}
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onToggleFavorite(food, {
                                defaultServings: 1,
                                defaultMealType: mealType,
                              })
                            }
                            className={`p-1.5 rounded transition-colors shrink-0 ${
                              isFav
                                ? 'text-amber-500 hover:text-amber-600'
                                : 'text-slate-300 hover:text-amber-500'
                            }`}
                            aria-label={
                              isFav
                                ? `Remove ${food.name} from favorites`
                                : `Save ${food.name} to favorites`
                            }
                            title={isFav ? 'Remove from Favorites' : 'Save to Favorites'}
                          >
                            <Star
                              className={`w-4 h-4 ${
                                isFav ? 'fill-amber-400' : ''
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Servings & live macro preview */}
              {selectedFood && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-slate-500">Selected Food</div>
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {selectedFood.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[0.5, 1, 1.5, 2].map((mult) => (
                        <button
                          key={mult}
                          type="button"
                          onClick={() => setServings(mult)}
                          className={`px-2.5 py-1 text-xs font-mono tabular-nums rounded border transition-colors ${
                            servings === mult
                              ? 'bg-teal-700 text-white border-teal-700'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {mult}x
                        </button>
                      ))}
                      <input
                        type="number"
                        step="0.25"
                        min="0.25"
                        max="10"
                        value={servings}
                        onChange={(e) =>
                          setServings(Math.max(0.1, Number(e.target.value) || 1))
                        }
                        aria-label="Custom servings multiplier"
                        className="w-16 h-7 px-2 text-xs font-mono tabular-nums border border-slate-200 rounded bg-white text-right focus:outline-none focus:border-teal-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2 pt-2 border-t border-slate-200 text-center">
                    <div>
                      <div className="text-[11px] text-slate-500">Calories</div>
                      <div className="text-sm font-semibold font-mono tabular-nums text-slate-900">
                        {previewCalories}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Net Carbs</div>
                      <div className="text-sm font-semibold font-mono tabular-nums text-slate-900">
                        {previewNetCarbs}g
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Protein</div>
                      <div className="text-sm font-semibold font-mono tabular-nums text-slate-900">
                        {previewProtein}g
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Fiber</div>
                      <div className="text-sm font-semibold font-mono tabular-nums text-slate-900">
                        {previewFiber}g
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Glycemic Load</div>
                      <div
                        className={`text-sm font-semibold font-mono tabular-nums ${
                          previewGl >= 20
                            ? 'text-red-600'
                            : previewGl >= 11
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {previewGl}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* MODE 2: FAVORITES QUICK ADD */}
          {mode === 'favorites' && (
            <div className="space-y-3">
              {favorites.length > 4 && (
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={favQuery}
                    onChange={(e) => setFavQuery(e.target.value)}
                    placeholder="Filter favorite meals..."
                    className="w-full h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
                  />
                </div>
              )}

              {favorites.length === 0 ? (
                <div className="py-10 px-4 text-center border border-slate-200 rounded-md">
                  <p className="text-sm font-medium text-slate-900">
                    No favorite meals saved yet
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Click the star icon on any food in the database or any logged meal row to save it for one-click logging.
                  </p>
                </div>
              ) : filteredFavorites.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 border border-slate-200 rounded-md">
                  No favorites match &quot;{favQuery}&quot;.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100">
                  {filteredFavorites.map((fav) => {
                    const s = Math.max(0.1, fav.defaultServings || 1);
                    const cals = Math.round(fav.food.calories * s);
                    const net =
                      Math.round(computeFoodNetCarbs(fav.food) * s * 10) / 10;
                    const prot = Math.round(fav.food.protein * s * 10) / 10;
                    const gl = computeFoodGlycemicLoad(fav.food, s);
                    const giInfo = getGiClassification(fav.food.gi);

                    return (
                      <div
                        key={fav.id}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFood(fav.food);
                            setServings(s);
                            setMode('search');
                          }}
                          className="flex-1 min-w-0 text-left"
                        >
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {fav.name}
                          </div>
                          <div className="text-xs text-slate-500 font-mono tabular-nums truncate">
                            {s}x ({fav.food.servingLabel}) · {cals} kcal · {net}g
                            net · {prot}g prot ·{' '}
                            <span
                              className={
                                giInfo.tone === 'alert'
                                  ? 'text-red-600'
                                  : giInfo.tone === 'caution'
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                              }
                            >
                              GL {gl}
                            </span>
                          </div>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleQuickAddFavorite(fav)}
                            className="px-2.5 py-1.5 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 transition-colors whitespace-nowrap"
                          >
                            + Quick Add
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveFavorite(fav.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                            aria-label={`Remove ${fav.name} from favorites`}
                            title="Remove from Favorites"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>

            {mode === 'search' && (
              <button
                type="submit"
                disabled={!selectedFood}
                className="px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Add to {mealType}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
