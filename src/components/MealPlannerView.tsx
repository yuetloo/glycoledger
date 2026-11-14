import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import {
  DailyTargets,
  DeficitTrendAnalysis,
  FoodItem,
  MealType,
} from '../types/nutrition';
import {
  computeFoodGlycemicLoad,
  computeFoodNetCarbs,
  formatReadableDate,
} from '../utils/nutritionMath';

interface MealPlannerViewProps {
  analysis: DeficitTrendAnalysis;
  targets: DailyTargets;
  selectedDate: string;
  onLogSwapFood: (food: FoodItem, mealType: MealType) => void;
  onApplyPlan: (replaceExisting: boolean) => void;
  onJumpToOverview: () => void;
}

export const MealPlannerView: React.FC<MealPlannerViewProps> = ({
  analysis,
  targets,
  selectedDate,
  onLogSwapFood,
  onApplyPlan,
  onJumpToOverview,
}) => {
  const [appliedState, setAppliedState] = useState<'none' | 'replaced' | 'appended'>('none');
  const [swappedIds, setSwappedIds] = useState<Record<string, boolean>>({});

  const { optimizedPlan, suggestions, smartSwaps } = analysis;

  const handleApply = (replace: boolean) => {
    onApplyPlan(replace);
    setAppliedState(replace ? 'replaced' : 'appended');
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Trend-Driven Meal Planning Suggestions */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Meal Planning Suggestions from Caloric Deficit Trends
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Generated from your last {analysis.loggedDaysCount} logged days · 7-day avg deficit:{' '}
              {analysis.avg7DayDeficit >= 0 ? '+' : ''}
              {analysis.avg7DayDeficit} kcal/day · Avg GL: {analysis.avg7DayGl}
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-600">
            Target Deficit: +{targets.targetDeficit} kcal/day
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {suggestions.map((s) => (
            <div
              key={s.id}
              className="p-4 border border-slate-200 rounded-md bg-slate-50/50 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-600">{s.category}</span>
                  <span
                    className={`font-medium ${
                      s.priority === 'high'
                        ? 'text-red-600'
                        : s.priority === 'medium'
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {s.priority === 'high'
                      ? 'High Impact'
                      : s.priority === 'medium'
                      ? 'Optimization'
                      : 'On Track'}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mt-1.5">
                  {s.title}
                </h3>
                <div className="text-xs font-mono tabular-nums text-teal-800 mt-1">
                  {s.metricSummary}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mt-2">
                  {s.rationale}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-200/80 text-xs text-slate-800">
                <strong className="font-semibold">Next Action:</strong> {s.actionStep}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Smart Food Swaps from Your Recent Logs */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            Targeted Food Swaps from Your Recent 7-Day Logs
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            High-glycemic or calorie-dense items detected in your history paired with lower-GL alternatives from the food database
          </p>
        </div>

        {smartSwaps.length === 0 ? (
          <div className="p-6 text-xs text-slate-500">
            No high-glycemic repeat items were detected in the past 7 days. Keep prioritizing whole proteins, fibrous vegetables, and low-GI carbohydrates.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {smartSwaps.map((swap) => {
              const repGl = computeFoodGlycemicLoad(swap.replacementFood, 1);
              const repNet = computeFoodNetCarbs(swap.replacementFood);
              const isSwapped = !!swappedIds[swap.id];

              return (
                <div
                  key={swap.id}
                  className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-500">
                      {swap.loggedMealType} · Logged {swap.occurrences}x in last 7 days
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-slate-600 line-through">
                        {swap.loggedFoodName}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                      <span className="font-semibold text-slate-900">
                        {swap.replacementFood.name}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                      Replacement: {swap.replacementFood.servingLabel} ·{' '}
                      {swap.replacementFood.calories} kcal · {repNet}g net carbs ·{' '}
                      {swap.replacementFood.protein}g protein · GL {repGl}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right text-xs font-mono tabular-nums">
                      <div className="font-semibold text-emerald-700">
                        {swap.calorieSavingPerServing > 0
                          ? `-${swap.calorieSavingPerServing} kcal`
                          : `+${Math.abs(swap.calorieSavingPerServing)} kcal`}{' '}
                        · -{swap.glSavingPerServing} GL
                      </div>
                      <div className="text-slate-500">
                        {swap.proteinDeltaPerServing >= 0 ? '+' : ''}
                        {swap.proteinDeltaPerServing}g protein
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onLogSwapFood(swap.replacementFood, swap.loggedMealType);
                        setSwappedIds((prev) => ({ ...prev, [swap.id]: true }));
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                        isSwapped
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-white border-slate-200 text-teal-700 hover:bg-teal-50 hover:border-teal-200'
                      }`}
                    >
                      {isSwapped ? 'Logged' : `Log to ${swap.loggedMealType}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 3: Calibrated 1-Day Meal Plan Template */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Calibrated 1-Day Meal Blueprint ({optimizedPlan.goalLabel})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
              Total: {optimizedPlan.totalCalories} kcal · Projected Deficit: +
              {optimizedPlan.projectedDeficit} kcal · {optimizedPlan.totalProtein}g Protein ·{' '}
              {optimizedPlan.totalNetCarbs}g Net Carbs · {optimizedPlan.totalFiber}g Fiber · GL{' '}
              {optimizedPlan.totalGlycemicLoad}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {appliedState !== 'none' ? (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <Check className="w-3.5 h-3.5" />
                  Plan {appliedState} for {formatReadableDate(selectedDate)}
                </span>
                <button
                  type="button"
                  onClick={onJumpToOverview}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800"
                >
                  Inspect Daily Ledger
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleApply(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 whitespace-nowrap"
                >
                  Append to {formatReadableDate(selectedDate)}
                </button>
                <button
                  type="button"
                  onClick={() => handleApply(true)}
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 whitespace-nowrap"
                >
                  Apply Plan to {formatReadableDate(selectedDate)}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {optimizedPlan.slots.map((slot) => (
            <div key={slot.mealType} className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-900">
                    {slot.mealType} ·{' '}
                    <span className="font-mono font-normal text-slate-500">
                      {slot.time}
                    </span>
                  </span>
                  <span className="text-xs font-mono tabular-nums font-semibold text-teal-800">
                    {slot.slotCalories} kcal
                  </span>
                </div>

                <ul className="mt-3 space-y-2.5">
                  {slot.items.map((item, idx) => (
                    <li key={idx} className="text-xs">
                      <div className="font-medium text-slate-800">
                        {item.food.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                        {item.servings}x ({item.food.servingLabel}) · {item.calories} kcal · GL{' '}
                        {item.glycemicLoad}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-600">
                <span>Prot: {slot.slotProtein}g</span>
                <span>Net: {slot.slotNetCarbs}g</span>
                <span>GL: {slot.slotGl}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
