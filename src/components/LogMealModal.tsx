import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Loader2,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
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

export type LogMealMode = 'search' | 'ai' | 'favorites';

interface AiParsedDraftItem {
  food: FoodItem;
  servings: number;
}

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
  onAddFavoriteMeal: (
    food: FoodItem,
    options?: {
      name?: string;
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

const AI_EXAMPLE_PROMPTS = [
  '2 scrambled eggs, 1 slice sourdough toast, and half an avocado',
  'Grilled chicken breast with 1 cup quinoa and roasted broccoli',
  'Greek yogurt with blueberries, chia seeds, and black coffee',
];

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
  onAddFavoriteMeal,
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

  // AI Quick Log state
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiDraftItems, setAiDraftItems] = useState<AiParsedDraftItem[]>([]);
  const [aiSavedCombo, setAiSavedCombo] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialFood ? 'search' : initialMode);
      setSelectedFood(initialFood);
      setMealType(initialMealType);
      setTime(DEFAULT_MEAL_TIMES[initialMealType]);
      setServings(1);
      setFavQuery('');
      setAiError(null);
      setAiSavedCombo(false);
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

  const aiTotals = useMemo(() => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fiber = 0;
    let sugar = 0;
    let fat = 0;
    let netCarbs = 0;
    let glycemicLoad = 0;

    for (const draft of aiDraftItems) {
      const s = Math.max(0.1, draft.servings);
      calories += draft.food.calories * s;
      protein += draft.food.protein * s;
      carbs += draft.food.carbs * s;
      fiber += draft.food.fiber * s;
      sugar += draft.food.sugar * s;
      fat += draft.food.fat * s;
      netCarbs += computeFoodNetCarbs(draft.food) * s;
      glycemicLoad += computeFoodGlycemicLoad(draft.food, s);
    }

    return {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fiber: Math.round(fiber * 10) / 10,
      sugar: Math.round(sugar * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      netCarbs: Math.round(netCarbs * 10) / 10,
      glycemicLoad: Math.round(glycemicLoad * 10) / 10,
    };
  }, [aiDraftItems]);

  if (!isOpen) return null;

  const handleSelectMealType = (next: MealType) => {
    setMealType(next);
    setTime(DEFAULT_MEAL_TIMES[next]);
  };

  const handleAnalyzeWithAi = async () => {
    const description = aiInput.trim();
    if (!description) {
      setAiError('Describe what you ate first.');
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setAiSavedCombo(false);

    try {
      const res = await fetch('/api/ai/quick-log-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, mealType }),
      });
      const data = (await res.json()) as {
        error?: string;
        mealSummary?: string;
        items?: FoodItem[];
      };

      if (!res.ok) {
        setAiError(data.error || 'Failed to parse meal with AI.');
        return;
      }

      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length === 0) {
        setAiError('No food items were identified. Try adding more detail.');
        return;
      }

      setAiSummary(data.mealSummary || null);
      setAiDraftItems(items.map((food) => ({ food, servings: 1 })));
    } catch {
      setAiError('Network error reaching AI meal parser. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleUpdateAiServings = (index: number, nextServings: number) => {
    setAiDraftItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? { ...item, servings: Math.max(0.1, nextServings) }
          : item
      )
    );
    setAiSavedCombo(false);
  };

  const handleRemoveAiItem = (index: number) => {
    setAiDraftItems((prev) => prev.filter((_, idx) => idx !== index));
    setAiSavedCombo(false);
  };

  const handleSaveAiComboAsFavorite = () => {
    if (aiDraftItems.length === 0) return;

    if (aiDraftItems.length === 1) {
      const single = aiDraftItems[0];
      onAddFavoriteMeal(single.food, {
        name: single.food.name,
        defaultServings: single.servings,
        defaultMealType: mealType,
      });
      setAiSavedCombo(true);
      return;
    }

    const totalGrams = aiDraftItems.reduce(
      (sum, d) => sum + d.food.servingGrams * d.servings,
      0
    );
    const weightedGiNumerator = aiDraftItems.reduce(
      (sum, d) => sum + d.food.gi * computeFoodNetCarbs(d.food) * d.servings,
      0
    );
    const weightedGi =
      aiTotals.netCarbs > 0
        ? Math.min(100, Math.round(weightedGiNumerator / aiTotals.netCarbs))
        : 0;

    const cleanTitle =
      aiInput.trim().length > 0 && aiInput.trim().length <= 56
        ? aiInput.trim()
        : aiDraftItems.map((d) => d.food.name).join(' + ').slice(0, 64);

    const combinedFood: FoodItem = {
      id: `ai-fav-${Date.now()}`,
      name: cleanTitle,
      category: 'Prepared Meals',
      servingLabel: `${aiDraftItems.length} items (${Math.round(totalGrams)}g)`,
      servingGrams: Math.max(1, Math.round(totalGrams)),
      calories: aiTotals.calories,
      protein: aiTotals.protein,
      carbs: aiTotals.carbs,
      fiber: aiTotals.fiber,
      sugar: aiTotals.sugar,
      fat: aiTotals.fat,
      gi: weightedGi,
      tags: ['favorite-meal', 'ai-logged'],
      isCustom: true,
    };

    onAddFavoriteMeal(combinedFood, {
      name: cleanTitle,
      defaultServings: 1,
      defaultMealType: mealType,
    });
    setAiSavedCombo(true);
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

    if (mode === 'ai') {
      if (aiDraftItems.length === 0) return;
      for (const draft of aiDraftItems) {
        onLogMeal(draft.food, {
          date: selectedDate,
          time,
          mealType,
          servings: Math.max(0.1, draft.servings),
        });
      }
      setAiInput('');
      setAiDraftItems([]);
      setAiSummary(null);
      onClose();
      return;
    }

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

          {/* Entry Mode Switcher: Search Database | AI Quick Log | Favorites */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-md">
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
              onClick={() => setMode('ai')}
              className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                mode === 'ai'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Quick Log
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
                      No matching foods found. Try AI Quick Log or add a custom food.
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

          {/* MODE 2: AI QUICK LOG */}
          {mode === 'ai' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label
                    htmlFor="ai-meal-description"
                    className="text-xs font-medium text-slate-700"
                  >
                    Describe your meal in plain English
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Estimates macros, fiber &amp; glycemic load
                  </span>
                </div>
                <textarea
                  id="ai-meal-description"
                  rows={3}
                  maxLength={500}
                  value={aiInput}
                  onChange={(e) => {
                    setAiInput(e.target.value);
                    if (aiError) setAiError(null);
                  }}
                  placeholder="e.g. 2 scrambled eggs with 1 slice sourdough toast, half an avocado, and black coffee"
                  className="w-full p-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-teal-700 resize-none"
                />

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 mr-1">Examples:</span>
                  {AI_EXAMPLE_PROMPTS.map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => {
                        setAiInput(sample);
                        setAiError(null);
                      }}
                      className="text-[11px] text-slate-600 border border-slate-200 rounded px-2 py-0.5 hover:bg-slate-50 hover:text-slate-900 transition-colors truncate max-w-[210px]"
                      title={sample}
                    >
                      {sample}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleAnalyzeWithAi}
                    disabled={aiLoading || !aiInput.trim()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
                  >
                    {aiLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {aiLoading ? 'Analyzing Meal...' : 'Analyze Meal with AI'}
                  </button>
                  {aiDraftItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAiDraftItems([]);
                        setAiSummary(null);
                        setAiSavedCombo(false);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Clear Results
                    </button>
                  )}
                </div>

                {aiError && (
                  <div className="mt-3 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
                    {aiError}
                  </div>
                )}
              </div>

              {aiDraftItems.length > 0 && (
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900">
                        Parsed Meal Breakdown ({aiDraftItems.length}{' '}
                        {aiDraftItems.length === 1 ? 'item' : 'items'})
                      </div>
                      {aiSummary && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {aiSummary}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveAiComboAsFavorite}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
                        aiSavedCombo
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {aiSavedCombo ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-amber-600" />
                          Saved to Favorites
                        </>
                      ) : (
                        <>
                          <Star className="w-3.5 h-3.5 text-amber-500" />
                          Save Meal to Favorites
                        </>
                      )}
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                    {aiDraftItems.map((draft, index) => {
                      const s = draft.servings;
                      const cals = Math.round(draft.food.calories * s);
                      const net =
                        Math.round(computeFoodNetCarbs(draft.food) * s * 10) / 10;
                      const prot = Math.round(draft.food.protein * s * 10) / 10;
                      const gl = computeFoodGlycemicLoad(draft.food, s);
                      const isFav = isFoodFavorited(draft.food);

                      return (
                        <div
                          key={draft.food.id}
                          className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-slate-900 truncate">
                              {draft.food.name}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                              {draft.food.servingLabel} · {cals} kcal · {net}g net ·{' '}
                              {prot}g prot · GI {draft.food.gi} · GL {gl}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <input
                              type="number"
                              step="0.25"
                              min="0.25"
                              max="10"
                              value={draft.servings}
                              onChange={(e) =>
                                handleUpdateAiServings(
                                  index,
                                  Number(e.target.value) || 1
                                )
                              }
                              aria-label={`Servings for ${draft.food.name}`}
                              className="w-14 h-7 px-1.5 text-xs font-mono tabular-nums border border-slate-200 rounded bg-white text-right focus:outline-none focus:border-teal-700"
                            />
                            <span className="text-[11px] text-slate-400">x</span>
                            <button
                              type="button"
                              onClick={() =>
                                onToggleFavorite(draft.food, {
                                  defaultServings: draft.servings,
                                  defaultMealType: mealType,
                                })
                              }
                              className={`p-1 rounded transition-colors ${
                                isFav
                                  ? 'text-amber-500'
                                  : 'text-slate-300 hover:text-amber-500'
                              }`}
                              aria-label={`Favorite ${draft.food.name}`}
                              title="Save item to Favorites"
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  isFav ? 'fill-amber-400' : ''
                                }`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveAiItem(index)}
                              className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                              aria-label={`Remove ${draft.food.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums">
                    <span className="font-sans font-medium text-slate-700">
                      Combined Totals
                    </span>
                    <span className="text-slate-900 font-semibold">
                      {aiTotals.calories} kcal · {aiTotals.netCarbs}g net ·{' '}
                      {aiTotals.protein}g prot · {aiTotals.fat}g fat · GL{' '}
                      {aiTotals.glycemicLoad}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODE 3: FAVORITES QUICK ADD */}
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
                    Click the star icon on any food in the database, logged meal row, or AI Quick Log result to save it for one-click logging.
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

            {mode === 'ai' ? (
              <button
                type="submit"
                disabled={aiDraftItems.length === 0}
                className="px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Log {aiDraftItems.length}{' '}
                {aiDraftItems.length === 1 ? 'Item' : 'Items'} to {mealType}
              </button>
            ) : mode === 'search' ? (
              <button
                type="submit"
                disabled={!selectedFood}
                className="px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Add to {mealType}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
};
