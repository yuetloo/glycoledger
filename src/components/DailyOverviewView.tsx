import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Droplets,
  Lightbulb,
  Minus,
  Plus,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  DailySummary,
  DailyTargets,
  DeficitTrendAnalysis,
  FavoriteMeal,
  FoodItem,
  GlucoseReading,
  MealEntry,
  MealType,
  NavTab,
  WaterEntry,
} from '../types/nutrition';
import {
  analyzeMealEntryTips,
  analyzeMealSlotTips,
  MealImprovementReport,
} from '../utils/mealTips';
import {
  addDays,
  formatGlucose,
  formatReadableDate,
  MEAL_TYPES,
  toLocalDateString,
} from '../utils/nutritionMath';
import { DailyTimelineChart } from './Charts';
import { LogMealMode } from './LogMealModal';
import { MealTipsModal } from './MealTipsModal';

interface DailyOverviewViewProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  summary: DailySummary;
  dayMeals: MealEntry[];
  dayGlucose: GlucoseReading[];
  dayWater: WaterEntry[];
  foods: FoodItem[];
  favorites: FavoriteMeal[];
  targets: DailyTargets;
  analysis: DeficitTrendAnalysis;
  onOpenLogMeal: (mealType: MealType, mode?: LogMealMode) => void;
  onOpenLogGlucose: () => void;
  onUpdateServings: (id: string, servings: number) => void;
  onReplaceMeal: (entryId: string, replacementFood: FoodItem) => void;
  onDeleteMeal: (id: string) => void;
  onDeleteGlucose: (id: string) => void;
  onQuickAddFavorite: (fav: FavoriteMeal) => void;
  onToggleFavoriteFromMeal: (entry: MealEntry) => void;
  onAddWater: (amountMl: number) => void;
  onDeleteWater: (id: string) => void;
  onUpdateHydrationGoal: (goalMl: number) => void;
  onClearDayMeals: (date: string) => void;
  onNavigate: (tab: NavTab) => void;
}

export const DailyOverviewView: React.FC<DailyOverviewViewProps> = ({
  selectedDate,
  onSelectDate,
  summary,
  dayMeals,
  dayGlucose,
  dayWater,
  foods,
  favorites,
  targets,
  analysis,
  onOpenLogMeal,
  onOpenLogGlucose,
  onUpdateServings,
  onReplaceMeal,
  onDeleteMeal,
  onDeleteGlucose,
  onQuickAddFavorite,
  onToggleFavoriteFromMeal,
  onAddWater,
  onDeleteWater,
  onUpdateHydrationGoal,
  onClearDayMeals,
  onNavigate,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);
  const [customWaterMl, setCustomWaterMl] = useState('250');
  const [editingHydrationGoal, setEditingHydrationGoal] = useState(false);
  const [goalInputMl, setGoalInputMl] = useState(
    String(targets.hydrationGoalMl || 2500)
  );
  const [activeTipsReport, setActiveTipsReport] =
    useState<MealImprovementReport | null>(null);

  useEffect(() => {
    setGoalInputMl(String(targets.hydrationGoalMl || 2500));
  }, [targets.hydrationGoalMl]);

  const today = toLocalDateString();
  const topSuggestion = analysis.suggestions[0];

  const sortedGlucose = [...dayGlucose].sort((a, b) =>
    a.time.localeCompare(b.time)
  );

  const rawCaloriePct = Math.round(
    (summary.calories / Math.max(1, targets.targetCalories)) * 100
  );
  const calorieRingColor =
    summary.calories > targets.maintenanceTdee
      ? '#dc2626'
      : summary.calories > targets.targetCalories
      ? '#d97706'
      : '#0f766e';

  const rawNetCarbPct = Math.round(
    (summary.netCarbs / Math.max(1, targets.maxNetCarbs)) * 100
  );
  const netCarbRingColor =
    summary.netCarbs > targets.maxNetCarbs ? '#d97706' : '#0f766e';
  const netCarbDiff =
    Math.round(Math.abs(targets.maxNetCarbs - summary.netCarbs) * 10) / 10;

  const rawFiberPct = Math.round(
    (summary.fiber / Math.max(1, targets.minFiber)) * 100
  );
  const fiberRingColor =
    summary.fiber >= targets.minFiber ? '#059669' : '#0f766e';
  const fiberRemaining =
    Math.round(Math.max(0, targets.minFiber - summary.fiber) * 10) / 10;

  const rawProteinPct = Math.round(
    (summary.protein / Math.max(1, targets.minProtein)) * 100
  );
  const proteinRingColor =
    summary.protein >= targets.minProtein ? '#059669' : '#0f766e';
  const proteinRemaining =
    Math.round(Math.max(0, targets.minProtein - summary.protein) * 10) / 10;

  const ringRadius = 21;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const getDashOffset = (pct: number) =>
    ringCircumference * (1 - Math.min(100, Math.max(0, pct)) / 100);

  const targetRings = [
    {
      id: 'calories',
      label: 'Calorie Target',
      ariaLabel: `Daily calorie target progress: ${rawCaloriePct}%`,
      pct: rawCaloriePct,
      color: calorieRingColor,
      valueText: `${summary.calories} / ${targets.targetCalories} kcal`,
      statusText:
        summary.remainingBudget >= 0
          ? `${summary.remainingBudget} kcal remaining`
          : `${Math.abs(summary.remainingBudget)} kcal over budget`,
      statusTone:
        summary.remainingBudget >= 0 ? 'text-emerald-700' : 'text-red-600',
    },
    {
      id: 'net-carbs',
      label: 'Net Carb Cap',
      ariaLabel: `Daily net carb target progress: ${rawNetCarbPct}%`,
      pct: rawNetCarbPct,
      color: netCarbRingColor,
      valueText: `${summary.netCarbs} / ${targets.maxNetCarbs}g`,
      statusText:
        summary.netCarbs <= targets.maxNetCarbs
          ? `${netCarbDiff}g remaining`
          : `${netCarbDiff}g over cap`,
      statusTone:
        summary.netCarbs <= targets.maxNetCarbs
          ? 'text-emerald-700'
          : 'text-amber-700',
    },
    {
      id: 'fiber',
      label: 'Fiber Target',
      ariaLabel: `Daily fiber target progress: ${rawFiberPct}%`,
      pct: rawFiberPct,
      color: fiberRingColor,
      valueText: `${summary.fiber} / ${targets.minFiber}g`,
      statusText:
        summary.fiber >= targets.minFiber
          ? 'Goal reached'
          : `${fiberRemaining}g to goal`,
      statusTone:
        summary.fiber >= targets.minFiber
          ? 'text-emerald-700'
          : 'text-slate-500',
    },
    {
      id: 'protein',
      label: 'Protein Target',
      ariaLabel: `Daily protein target progress: ${rawProteinPct}%`,
      pct: rawProteinPct,
      color: proteinRingColor,
      valueText: `${summary.protein} / ${targets.minProtein}g`,
      statusText:
        summary.protein >= targets.minProtein
          ? 'Goal reached'
          : `${proteinRemaining}g to goal`,
      statusTone:
        summary.protein >= targets.minProtein
          ? 'text-emerald-700'
          : 'text-slate-500',
    },
  ];

  const hydrationGoalMl = Math.max(500, targets.hydrationGoalMl || 2500);
  const rawHydrationPct = Math.round((summary.waterMl / hydrationGoalMl) * 100);
  const hydrationPct = Math.min(100, Math.max(0, rawHydrationPct));
  const waterRemainingMl = Math.max(0, hydrationGoalMl - summary.waterMl);
  const sortedWater = [...dayWater].sort((a, b) =>
    b.time.localeCompare(a.time)
  );

  const handleLogCustomWater = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Math.round(Number(customWaterMl));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onAddWater(parsed);
  };

  const handleSaveHydrationGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Math.round(Number(goalInputMl));
    if (!Number.isFinite(parsed) || parsed < 500) return;
    onUpdateHydrationGoal(parsed);
    setEditingHydrationGoal(false);
  };

  return (
    <div className="space-y-6">
      {/* Daily Overview Header with Date Navigation & Circular Target Indicators */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center border border-slate-200 bg-white rounded-md">
              <button
                type="button"
                onClick={() => onSelectDate(addDays(selectedDate, -1))}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-l-md transition-colors"
                aria-label="Previous day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && onSelectDate(e.target.value)}
                aria-label="Select log date"
                className="px-3 py-1.5 text-xs font-mono tabular-nums text-slate-900 bg-transparent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => onSelectDate(addDays(selectedDate, 1))}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-r-md transition-colors"
                aria-label="Next day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <span className="text-base font-semibold text-slate-900">
              {formatReadableDate(selectedDate)}
            </span>
            {selectedDate !== today && (
              <button
                type="button"
                onClick={() => onSelectDate(today)}
                className="text-xs font-medium text-teal-700 hover:text-teal-800 underline underline-offset-2"
              >
                Jump to Today
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-mono tabular-nums">
            <span>Maintenance TDEE: {targets.maintenanceTdee} kcal</span>
            <span aria-hidden="true">·</span>
            <span>Target Intake: {targets.targetCalories} kcal</span>
            <span aria-hidden="true">·</span>
            <span>Goal Deficit: {targets.targetDeficit} kcal/d</span>
          </div>
        </div>

        {/* Circular Progress Indicators: Calorie, Net Carbs, Fiber & Protein Targets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
          {targetRings.map((ring) => (
            <div key={ring.id} className="flex items-center gap-3.5 min-w-0">
              <div className="relative w-13 h-13 shrink-0">
                <svg
                  viewBox="0 0 52 52"
                  className="w-13 h-13"
                  role="img"
                  aria-label={ring.ariaLabel}
                >
                  <circle
                    cx="26"
                    cy="26"
                    r={ringRadius}
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="4.5"
                  />
                  <circle
                    cx="26"
                    cy="26"
                    r={ringRadius}
                    fill="none"
                    stroke={ring.color}
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={getDashOffset(ring.pct)}
                    transform="rotate(-90 26 26)"
                    className="transition-all duration-300"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-mono tabular-nums font-semibold text-slate-900">
                  {ring.pct}%
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-500">
                  {ring.label}
                </div>
                <div className="text-sm font-semibold font-mono tabular-nums text-slate-900">
                  {ring.valueText}
                </div>
                <div className={`text-[11px] font-medium ${ring.statusTone}`}>
                  {ring.statusText}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Split: Meal Ledger (left) + Glucose & Insights (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Daily Meal Ledger */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Daily Meal Intake Ledger
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                {summary.entryCount} entries logged · {summary.calories} kcal ·{' '}
                {summary.netCarbs}g net carbs · {summary.glycemicLoad} GL
              </p>
            </div>
            <div className="flex items-center gap-2">
              {dayMeals.length > 0 && !confirmClear && (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                >
                  Clear Day
                </button>
              )}
              {confirmClear && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onClearDayMeals(selectedDate);
                      setConfirmClear(false);
                    }}
                    className="px-2.5 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  >
                    Confirm Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => onOpenLogMeal('Dinner', 'ai')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50/70 border border-teal-200 rounded-md hover:bg-teal-100/70 transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Quick Log
              </button>
              <button
                type="button"
                onClick={() => onOpenLogMeal('Dinner', 'search')}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 transition-colors whitespace-nowrap"
              >
                + Log Food
              </button>
            </div>
          </div>

          {/* Quick Add Favorites Strip */}
          {favorites.length > 0 && (
            <div className="px-5 py-2.5 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 mr-0.5">
                <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                Favorites:
              </span>
              {favorites.slice(0, 4).map((fav) => {
                const favCalories = Math.round(
                  fav.food.calories * Math.max(0.1, fav.defaultServings || 1)
                );
                return (
                  <button
                    key={fav.id}
                    type="button"
                    onClick={() => onQuickAddFavorite(fav)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:border-teal-600 hover:text-teal-800 transition-colors max-w-[230px]"
                    title={`Quick add ${fav.name} (${favCalories} kcal)`}
                  >
                    <span className="truncate">+ {fav.name}</span>
                    <span className="font-mono tabular-nums text-slate-400 shrink-0">
                      {favCalories} kcal
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => onOpenLogMeal('Dinner', 'favorites')}
                className="text-[11px] font-medium text-teal-700 hover:text-teal-800 ml-auto whitespace-nowrap"
              >
                Manage Favorites ({favorites.length}) →
              </button>
            </div>
          )}

          {dayMeals.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <h3 className="text-sm font-semibold text-slate-900">
                No meals recorded for {formatReadableDate(selectedDate)}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Record your Breakfast, Lunch, Dinner, or Snacks with AI Quick Log, Favorites, or the searchable food database.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onOpenLogMeal('Breakfast', 'ai')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Try AI Quick Log
                </button>
                <button
                  type="button"
                  onClick={() => onOpenLogMeal('Breakfast', 'search')}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                >
                  Browse Food Database
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('planner')}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                >
                  Apply Optimized Day Plan
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {MEAL_TYPES.map((mealType) => {
                const slotMeals = dayMeals
                  .filter((m) => m.mealType === mealType)
                  .sort((a, b) => a.time.localeCompare(b.time));
                const slotStats = summary.mealBreakdown[mealType];
                const slotTips = analyzeMealSlotTips(
                  mealType,
                  slotMeals,
                  targets,
                  foods
                );

                return (
                  <div key={mealType}>
                    <div className="px-5 py-2.5 bg-slate-50/80 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-semibold text-slate-800">
                          {mealType}
                        </span>
                        <span className="text-xs text-slate-500 font-mono tabular-nums truncate">
                          {slotStats.calories} kcal · {slotStats.netCarbs}g net ·{' '}
                          {slotStats.protein}g protein · GL {slotStats.glycemicLoad}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {slotTips.hasRoomForImprovement && (
                          <button
                            type="button"
                            onClick={() => setActiveTipsReport(slotTips)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-800 whitespace-nowrap"
                            title={`Room for improvement in ${mealType} — click for tips`}
                          >
                            <Lightbulb className="w-3.5 h-3.5" />
                            <span>Tips</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenLogMeal(mealType)}
                          className="text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap"
                        >
                          + Add {mealType}
                        </button>
                      </div>
                    </div>

                    {slotMeals.length === 0 ? (
                      <div className="px-5 py-3 text-xs text-slate-400">
                        No items logged for {mealType.toLowerCase()}.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-500">
                              <th className="py-2 pl-5 pr-3">Food &amp; Time</th>
                              <th className="py-2 px-3 text-right">Servings</th>
                              <th className="py-2 px-3 text-right">Calories</th>
                              <th className="py-2 px-3 text-right">Net Carbs</th>
                              <th className="py-2 px-3 text-right">Protein</th>
                              <th className="py-2 px-3 text-right">GL</th>
                              <th className="py-2 pl-2 pr-5 text-right w-20">
                                <span className="sr-only">Actions</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {slotMeals.map((entry) => {
                              const isFav = favorites.some(
                                (f) =>
                                  f.food.id === entry.foodId ||
                                  f.name.toLowerCase() ===
                                    entry.foodName.toLowerCase()
                              );
                              const entryTips = analyzeMealEntryTips(
                                entry,
                                foods
                              );
                              return (
                              <tr
                                key={entry.id}
                                className="h-11 hover:bg-slate-50/70 transition-colors"
                              >
                                <td className="py-2 pl-5 pr-3">
                                  <div className="font-medium text-slate-900">
                                    {entry.foodName}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                                    {entry.time} · {entry.servingLabel} · GI {entry.gi}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <div className="inline-flex items-center gap-1 border border-slate-200 rounded bg-white">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onUpdateServings(
                                          entry.id,
                                          Math.max(0.25, entry.servings - 0.25)
                                        )
                                      }
                                      className="p-1 text-slate-500 hover:text-slate-900"
                                      aria-label={`Decrease servings for ${entry.foodName}`}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="px-1.5 font-mono tabular-nums text-slate-800">
                                      {entry.servings}x
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onUpdateServings(
                                          entry.id,
                                          entry.servings + 0.25
                                        )
                                      }
                                      className="p-1 text-slate-500 hover:text-slate-900"
                                      aria-label={`Increase servings for ${entry.foodName}`}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-right font-mono tabular-nums font-medium text-slate-900">
                                  {entry.calories}
                                </td>
                                <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                                  {entry.netCarbs}g
                                </td>
                                <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                                  {entry.protein}g
                                </td>
                                <td
                                  className={`py-2 px-3 text-right font-mono tabular-nums font-medium ${
                                    entry.glycemicLoad >= 20
                                      ? 'text-red-600'
                                      : entry.glycemicLoad >= 11
                                      ? 'text-amber-700'
                                      : 'text-emerald-700'
                                  }`}
                                >
                                  {entry.glycemicLoad}
                                </td>
                                <td className="py-2 pl-2 pr-5 text-right whitespace-nowrap">
                                  <div className="inline-flex items-center gap-1">
                                    {entryTips.hasRoomForImprovement && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setActiveTipsReport(entryTips)
                                        }
                                        className="p-1 text-amber-600 hover:text-amber-700 transition-colors"
                                        aria-label={`View improvement tips for ${entry.foodName}`}
                                        title="Room for improvement — click for tips"
                                      >
                                        <Lightbulb className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => onToggleFavoriteFromMeal(entry)}
                                      className={`p-1 transition-colors ${
                                        isFav
                                          ? 'text-amber-500 hover:text-amber-600'
                                          : 'text-slate-300 hover:text-amber-500'
                                      }`}
                                      aria-label={
                                        isFav
                                          ? `Remove ${entry.foodName} from favorites`
                                          : `Save ${entry.foodName} to favorites`
                                      }
                                      title={
                                        isFav
                                          ? 'Remove from Favorites'
                                          : 'Save to Favorites'
                                      }
                                    >
                                      <Star
                                        className={`w-3.5 h-3.5 ${
                                          isFav ? 'fill-amber-400' : ''
                                        }`}
                                      />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteMeal(entry.id)}
                                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                      aria-label={`Remove ${entry.foodName}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
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
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Glucose Timeline, Macro Balance & Priority Insight */}
        <div className="lg:col-span-4 space-y-6">
          {/* Glucose & Meal GL Timeline */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Glucose &amp; Glycemic Timeline
                </h3>
                <p className="text-xs text-slate-500">
                  Readings (mmol/L) vs. meal glycemic load
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenLogGlucose}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 whitespace-nowrap"
              >
                + Reading
              </button>
            </div>

            <DailyTimelineChart
              meals={dayMeals}
              glucoseReadings={dayGlucose}
              targets={targets}
            />

            <div className="mt-4 pt-3 border-t border-slate-100">
              {sortedGlucose.length === 0 ? (
                <div className="text-xs text-slate-500 py-2">
                  No glucose readings logged on this date.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {sortedGlucose.map((g) => {
                    const isOver =
                      g.context === 'Fasting'
                        ? g.valueMgDl > targets.fastingGlucoseMax
                        : g.valueMgDl > targets.postMealGlucoseMax;
                    return (
                      <div
                        key={g.id}
                        className="py-2 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800">
                            {g.context} ·{' '}
                            <span className="font-mono tabular-nums text-slate-500">
                              {g.time}
                            </span>
                          </div>
                          {g.note && (
                            <div className="text-[11px] text-slate-500 truncate">
                              {g.note}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`font-mono tabular-nums font-semibold ${
                              isOver ? 'text-red-600' : 'text-emerald-700'
                            }`}
                          >
                            {formatGlucose(g.valueMgDl, 'mmol/L')}
                          </span>
                          <button
                            type="button"
                            onClick={() => onDeleteGlucose(g.id)}
                            className="p-1 text-slate-400 hover:text-red-600"
                            aria-label="Delete glucose reading"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Daily Water Intake Tracker */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-teal-700 shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Daily Water Intake
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hydration progress against daily mL goal
                  </p>
                </div>
              </div>
              {!editingHydrationGoal && (
                <button
                  type="button"
                  onClick={() => {
                    setGoalInputMl(String(hydrationGoalMl));
                    setEditingHydrationGoal(true);
                  }}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 whitespace-nowrap"
                >
                  Edit Goal
                </button>
              )}
            </div>

            {editingHydrationGoal && (
              <form
                onSubmit={handleSaveHydrationGoal}
                className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-md flex flex-wrap items-center gap-2"
              >
                <label className="text-xs font-medium text-slate-700">
                  Daily Goal (mL):
                </label>
                <input
                  type="number"
                  min={500}
                  max={10000}
                  step={50}
                  value={goalInputMl}
                  onChange={(e) => setGoalInputMl(e.target.value)}
                  aria-label="Daily hydration goal in milliliters"
                  className="w-24 h-8 px-2 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded focus:outline-none focus:border-teal-700"
                />
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-xs font-medium text-white bg-teal-700 rounded hover:bg-teal-800"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingHydrationGoal(false)}
                    className="px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200 bg-white rounded hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="mt-4">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-xl font-semibold font-mono tabular-nums text-slate-900">
                  {summary.waterMl}
                  <span className="text-xs font-normal text-slate-500 ml-1">
                    / {hydrationGoalMl} mL
                  </span>
                </div>
                <span
                  className={`text-xs font-medium font-mono tabular-nums ${
                    summary.waterMl >= hydrationGoalMl
                      ? 'text-emerald-700'
                      : 'text-slate-600'
                  }`}
                >
                  {rawHydrationPct}%
                </span>
              </div>

              <div
                className="mt-2 h-2 w-full bg-slate-100 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={summary.waterMl}
                aria-valuemin={0}
                aria-valuemax={hydrationGoalMl}
                aria-label="Daily water intake progress"
              >
                <div
                  className={`h-full transition-all duration-300 ${
                    summary.waterMl >= hydrationGoalMl
                      ? 'bg-emerald-600'
                      : 'bg-teal-700'
                  }`}
                  style={{ width: `${hydrationPct}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] font-mono tabular-nums">
                <span
                  className={
                    summary.waterMl >= hydrationGoalMl
                      ? 'text-emerald-700 font-medium font-sans'
                      : 'text-slate-500'
                  }
                >
                  {summary.waterMl >= hydrationGoalMl
                    ? 'Daily hydration goal reached'
                    : `${waterRemainingMl} mL remaining`}
                </span>
                <span className="text-slate-400">
                  {dayWater.length} {dayWater.length === 1 ? 'log' : 'logs'}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                {[250, 500, 750].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => onAddWater(amount)}
                    className="py-1.5 px-2 text-xs font-mono tabular-nums font-medium text-teal-800 bg-teal-50/70 border border-teal-200 rounded-md hover:bg-teal-100/70 transition-colors"
                  >
                    +{amount} mL
                  </button>
                ))}
              </div>

              <form onSubmit={handleLogCustomWater} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min={10}
                    max={5000}
                    step={25}
                    value={customWaterMl}
                    onChange={(e) => setCustomWaterMl(e.target.value)}
                    aria-label="Custom water amount in milliliters"
                    className="w-full h-8 pl-2.5 pr-9 text-xs font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400">
                    mL
                  </span>
                </div>
                <button
                  type="submit"
                  className="h-8 px-3 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 transition-colors whitespace-nowrap"
                >
                  + Log Water
                </button>
              </form>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100">
              {sortedWater.length === 0 ? (
                <div className="text-xs text-slate-500 py-1">
                  No water intake logged on this date.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  {sortedWater.map((entry) => (
                    <div
                      key={entry.id}
                      className="py-1.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-mono tabular-nums text-slate-500">
                        {entry.time}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono tabular-nums font-semibold text-slate-800">
                          +{entry.amountMl} mL
                        </span>
                        <button
                          type="button"
                          onClick={() => onDeleteWater(entry.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          aria-label={`Delete ${entry.amountMl} mL water log`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Macronutrient Breakdown Donut Chart (Recharts) */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Macronutrient Intake Breakdown
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Carbohydrates, protein, and fat from logged meals
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                Net Carbs: {summary.netCarbs}g
              </span>
            </div>

            {(() => {
              const cGrams = Math.round(summary.carbs * 10) / 10;
              const pGrams = Math.round(summary.protein * 10) / 10;
              const fGrams = Math.round(summary.fat * 10) / 10;
              const totalGrams = Math.max(0, cGrams + pGrams + fGrams);

              const cCal = Math.round(summary.carbs * 4);
              const pCal = Math.round(summary.protein * 4);
              const fCal = Math.round(summary.fat * 9);
              const totalMacroCal = Math.max(1, cCal + pCal + fCal);

              const macroSlices = [
                {
                  name: 'Carbohydrates',
                  grams: cGrams,
                  kcal: cCal,
                  pct: Math.round((cCal / totalMacroCal) * 100),
                  color: '#d97706',
                },
                {
                  name: 'Protein',
                  grams: pGrams,
                  kcal: pCal,
                  pct: Math.round((pCal / totalMacroCal) * 100),
                  color: '#0f766e',
                },
                {
                  name: 'Fat',
                  grams: fGrams,
                  kcal: fCal,
                  pct: Math.max(
                    0,
                    100 -
                      Math.round((cCal / totalMacroCal) * 100) -
                      Math.round((pCal / totalMacroCal) * 100)
                  ),
                  color: '#475569',
                },
              ];

              const hasIntake = totalGrams > 0;
              const chartData = hasIntake
                ? macroSlices
                : [{ name: 'No intake', grams: 1, kcal: 0, pct: 0, color: '#f1f5f9' }];

              return (
                <div className="mt-3 space-y-4">
                  <div className="relative h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="grams"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={54}
                          outerRadius={78}
                          paddingAngle={hasIntake ? 2 : 0}
                          stroke="none"
                          isAnimationActive={false}
                        >
                          {chartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        {hasIntake && (
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload || payload.length === 0) {
                                return null;
                              }
                              const item = payload[0].payload as (typeof macroSlices)[number];
                              return (
                                <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded text-[11px] font-mono tabular-nums shadow-sm">
                                  <div className="font-sans font-medium text-slate-200">
                                    {item.name}
                                  </div>
                                  <div>
                                    {item.grams}g · {item.kcal} kcal ({item.pct}%)
                                  </div>
                                </div>
                              );
                            }}
                          />
                        )}
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[11px] text-slate-500">
                        Total Intake
                      </span>
                      <span className="text-base font-semibold font-mono tabular-nums text-slate-900">
                        {hasIntake ? `${summary.calories} kcal` : '0 kcal'}
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 border-t border-slate-100 text-xs">
                    {macroSlices.map((item) => (
                      <div
                        key={item.name}
                        className="py-2 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: item.color }}
                            aria-hidden="true"
                          />
                          <span className="text-slate-700 font-medium">
                            {item.name}
                          </span>
                        </div>
                        <div className="font-mono tabular-nums text-slate-900">
                          <span className="font-semibold">{item.grams}g</span>
                          <span className="text-slate-500 ml-2">
                            {hasIntake ? `${item.pct}%` : '0%'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Priority Deficit & Planning Insight */}
          {topSuggestion && (
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Trend Analyzer Priority</span>
                <span
                  className={`font-medium ${
                    topSuggestion.priority === 'high'
                      ? 'text-red-600'
                      : topSuggestion.priority === 'medium'
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {topSuggestion.category}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mt-1.5">
                {topSuggestion.title}
              </h3>
              <p className="text-xs font-mono tabular-nums text-slate-600 mt-1">
                {topSuggestion.metricSummary}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed mt-2">
                {topSuggestion.actionStep}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('trends')}
                  className="text-xs font-medium text-slate-700 hover:text-slate-900"
                >
                  View 14-Day Trends
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('planner')}
                  className="text-xs font-medium text-teal-700 hover:text-teal-800"
                >
                  Open Meal Planner →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <MealTipsModal
        report={activeTipsReport}
        onClose={() => setActiveTipsReport(null)}
        onApplySwap={onReplaceMeal}
      />
    </div>
  );
};
