import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Plus, Search, Star, Trash2 } from 'lucide-react';
import { FavoriteMeal, FoodCategory, FoodItem } from '../types/nutrition';
import {
  computeFoodGlycemicLoad,
  computeFoodNetCarbs,
  getGiClassification,
} from '../utils/nutritionMath';

interface FoodDatabaseViewProps {
  foods: FoodItem[];
  favorites: FavoriteMeal[];
  onLogFood: (food: FoodItem) => void;
  onToggleFavorite: (food: FoodItem) => void;
  onOpenAddCustomFood: () => void;
  onDeleteCustomFood: (id: string) => void;
}

type GiFilter = 'all' | 'low' | 'medium' | 'high';
type SortKey = 'name' | 'calories' | 'protein' | 'netCarbs' | 'gl';

export const FoodDatabaseView: React.FC<FoodDatabaseViewProps> = ({
  foods,
  favorites,
  onLogFood,
  onToggleFavorite,
  onOpenAddCustomFood,
  onDeleteCustomFood,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FoodCategory | 'All'>('All');
  const [giFilter, setGiFilter] = useState<GiFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('gl');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const filteredAndSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = foods.filter((f) => {
      if (category !== 'All' && f.category !== category) return false;
      if (giFilter === 'low' && f.gi > 55) return false;
      if (giFilter === 'medium' && (f.gi <= 55 || f.gi >= 70)) return false;
      if (giFilter === 'high' && f.gi < 70) return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        f.tags.some((t) => t.toLowerCase().includes(q))
      );
    });

    return [...list].sort((a, b) => {
      let diff = 0;
      if (sortKey === 'name') diff = a.name.localeCompare(b.name);
      else if (sortKey === 'calories') diff = a.calories - b.calories;
      else if (sortKey === 'protein') diff = a.protein - b.protein;
      else if (sortKey === 'netCarbs')
        diff = computeFoodNetCarbs(a) - computeFoodNetCarbs(b);
      else if (sortKey === 'gl')
        diff = computeFoodGlycemicLoad(a, 1) - computeFoodGlycemicLoad(b, 1);
      return sortAsc ? diff : -diff;
    });
  }, [foods, query, category, giFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(key === 'name' || key === 'gl');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Searchable Food &amp; Glycemic Index Database
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              {filteredAndSorted.length} of {foods.length} foods shown · Includes Glycemic Index (GI) and per-serving Glycemic Load (GL)
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAddCustomFood}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Custom Food
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search foods, nutrients, or tags (e.g. high-fiber, salmon, oats)..."
              className="w-full h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as FoodCategory | 'All')
              }
              aria-label="Filter category"
              className="w-full h-9 px-3 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:border-teal-700"
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

          <div className="md:col-span-4 flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            {(
              [
                { id: 'all', label: 'All GI' },
                { id: 'low', label: 'Low ≤55' },
                { id: 'medium', label: 'Med 56-69' },
                { id: 'high', label: 'High ≥70' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setGiFilter(opt.id)}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  giFilter === opt.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* High-density Food Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {filteredAndSorted.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <p className="text-sm font-medium text-slate-900">
              No foods match your current filters
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Clear your search query or add a custom food item to the database.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategory('All');
                setGiFilter('all');
              }}
              className="mt-4 px-3.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-medium text-slate-600">
                  <th className="py-2.5 pl-5 pr-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('name')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      Food &amp; Category
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3">Serving</th>
                  <th className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('calories')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 ml-auto"
                    >
                      Calories
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('protein')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 ml-auto"
                    >
                      Protein
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('netCarbs')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 ml-auto"
                    >
                      Net Carbs
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-right">Fiber</th>
                  <th className="py-2.5 px-3 text-right">Fat</th>
                  <th className="py-2.5 px-3 text-right">GI Tier</th>
                  <th className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('gl')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 ml-auto"
                    >
                      GL
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 pl-3 pr-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAndSorted.map((food) => {
                  const netCarbs = computeFoodNetCarbs(food);
                  const gl = computeFoodGlycemicLoad(food, 1);
                  const giClass = getGiClassification(food.gi);

                  return (
                    <tr
                      key={food.id}
                      className="h-11 hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2 pl-5 pr-3">
                        <div className="font-medium text-slate-900">
                          {food.name}
                          {food.isCustom && (
                            <span className="ml-2 text-[11px] font-normal text-teal-700">
                              Custom
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {food.category}
                          {food.tags.length > 0 && ` · ${food.tags.slice(0, 2).join(' · ')}`}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {food.servingLabel}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-medium text-slate-900">
                        {food.calories} kcal
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                        {food.protein}g
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                        {netCarbs}g
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                        {food.fiber}g
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                        {food.fat}g
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-mono tabular-nums whitespace-nowrap font-medium ${
                          giClass.tone === 'alert'
                            ? 'text-red-600'
                            : giClass.tone === 'caution'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {giClass.label} ({food.gi})
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {gl}
                      </td>
                      <td className="py-2 pl-3 pr-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onToggleFavorite(food)}
                            className={`p-1 rounded transition-colors ${
                              favorites.some((f) => f.food.id === food.id)
                                ? 'text-amber-500 hover:text-amber-600'
                                : 'text-slate-300 hover:text-amber-500'
                            }`}
                            aria-label={
                              favorites.some((f) => f.food.id === food.id)
                                ? `Remove ${food.name} from favorites`
                                : `Save ${food.name} to favorites`
                            }
                            title={
                              favorites.some((f) => f.food.id === food.id)
                                ? 'Remove from Favorites'
                                : 'Save to Favorites'
                            }
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                favorites.some((f) => f.food.id === food.id)
                                  ? 'fill-amber-400'
                                  : ''
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => onLogFood(food)}
                            className="px-2.5 py-1 text-xs font-medium text-teal-700 border border-teal-200 rounded hover:bg-teal-50 transition-colors"
                          >
                            Log Food
                          </button>
                          {food.isCustom && (
                            <button
                              type="button"
                              onClick={() => onDeleteCustomFood(food.id)}
                              className="p-1 text-slate-400 hover:text-red-600"
                              aria-label={`Delete custom food ${food.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
