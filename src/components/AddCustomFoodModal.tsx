import React, { useState } from 'react';
import { X } from 'lucide-react';
import { FoodCategory, FoodItem } from '../types/nutrition';
import { computeFoodGlycemicLoad, computeFoodNetCarbs } from '../utils/nutritionMath';

interface AddCustomFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFood: (food: Omit<FoodItem, 'id' | 'isCustom'>) => void;
}

const CATEGORIES: FoodCategory[] = [
  'Proteins',
  'Grains & Carbs',
  'Vegetables',
  'Fruits',
  'Dairy & Alternatives',
  'Fats & Nuts',
  'Prepared Meals',
  'Beverages',
];

export const AddCustomFoodModal: React.FC<AddCustomFoodModalProps> = ({
  isOpen,
  onClose,
  onAddFood,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FoodCategory>('Prepared Meals');
  const [servingLabel, setServingLabel] = useState('1 serving (150g)');
  const [servingGrams, setServingGrams] = useState(150);
  const [calories, setCalories] = useState(220);
  const [protein, setProtein] = useState(18);
  const [carbs, setCarbs] = useState(14);
  const [fiber, setFiber] = useState(4);
  const [sugar, setSugar] = useState(2);
  const [fat, setFat] = useState(9);
  const [gi, setGi] = useState(35);

  if (!isOpen) return null;

  const netCarbs = computeFoodNetCarbs({ carbs, fiber });
  const gl = computeFoodGlycemicLoad({ carbs, fiber, gi }, 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddFood({
      name: name.trim(),
      category,
      servingLabel: servingLabel.trim() || '1 serving',
      servingGrams: Math.max(1, servingGrams),
      calories: Math.max(0, calories),
      protein: Math.max(0, protein),
      carbs: Math.max(0, carbs),
      fiber: Math.max(0, fiber),
      sugar: Math.max(0, sugar),
      fat: Math.max(0, fat),
      gi: Math.min(100, Math.max(0, gi)),
      tags: ['custom', gi <= 55 ? 'low-gi' : gi >= 70 ? 'high-gi' : 'medium-gi'],
    });
    setName('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-food-title"
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2
              id="add-food-title"
              className="text-base font-semibold text-slate-900"
            >
              Add Custom Food to Database
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Saved locally for instant meal logging and swap matching
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-md"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Food Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Homemade Chia Flax Protein Muffin"
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as FoodCategory)}
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:border-teal-700"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Serving Label
              </label>
              <input
                type="text"
                value={servingLabel}
                onChange={(e) => setServingLabel(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Calories
              </label>
              <input
                type="number"
                min="0"
                value={calories}
                onChange={(e) => setCalories(Number(e.target.value))}
                className="w-full h-9 px-2.5 text-sm font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Protein (g)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={protein}
                onChange={(e) => setProtein(Number(e.target.value))}
                className="w-full h-9 px-2.5 text-sm font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Total Carbs (g)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={carbs}
                onChange={(e) => setCarbs(Number(e.target.value))}
                className="w-full h-9 px-2.5 text-sm font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Fiber (g)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={fiber}
                onChange={(e) => setFiber(Number(e.target.value))}
                className="w-full h-9 px-2.5 text-sm font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Sugar (g)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={sugar}
                onChange={(e) => setSugar(Number(e.target.value))}
                className="w-full h-9 px-2.5 text-sm font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Fat (g)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={fat}
                onChange={(e) => setFat(Number(e.target.value))}
                className="w-full h-9 px-2.5 text-sm font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Glycemic Index
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={gi}
                onChange={(e) => setGi(Number(e.target.value))}
                className="w-full h-9 px-2.5 text-sm font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Grams
              </label>
              <input
                type="number"
                min="1"
                value={servingGrams}
                onChange={(e) => setServingGrams(Number(e.target.value))}
                className="w-full h-9 px-2.5 text-sm font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs">
            <span className="text-slate-600">
              Computed Net Carbs:{' '}
              <strong className="font-mono tabular-nums text-slate-900">
                {netCarbs}g
              </strong>
            </span>
            <span className="text-slate-600">
              Computed Glycemic Load:{' '}
              <strong className="font-mono tabular-nums text-slate-900">
                {gl}
              </strong>
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800"
            >
              Save Food
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
