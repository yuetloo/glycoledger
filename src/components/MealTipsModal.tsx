import React from 'react';
import { ArrowRight, Lightbulb, X } from 'lucide-react';
import { FoodItem } from '../types/nutrition';
import { MealImprovementReport } from '../utils/mealTips';

interface MealTipsModalProps {
  report: MealImprovementReport | null;
  onClose: () => void;
  onApplySwap: (entryId: string, replacementFood: FoodItem) => void;
}

export const MealTipsModal: React.FC<MealTipsModalProps> = ({
  report,
  onClose,
  onApplySwap,
}) => {
  if (!report) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meal-tips-title"
    >
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <h2
                id="meal-tips-title"
                className="text-base font-semibold text-slate-900 truncate"
              >
                Meal Improvement Tips · {report.title}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                {report.calories} kcal · {report.netCarbs}g net ·{' '}
                {report.protein}g protein · {report.fiber}g fiber · GL{' '}
                {report.glycemicLoad}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-md transition-colors shrink-0"
            aria-label="Close tips dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Actionable Nutrition & Glycemic Tips */}
          {report.tips.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Room for Improvement
              </h3>
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-md">
                {report.tips.map((tip) => (
                  <div key={tip.id} className="p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {tip.title}
                      </span>
                      <span
                        className={`text-[11px] font-medium whitespace-nowrap ${
                          tip.severity === 'high'
                            ? 'text-red-600'
                            : 'text-amber-700'
                        }`}
                      >
                        {tip.severity === 'high' ? 'High Impact' : 'Moderate'}
                      </span>
                    </div>
                    <div className="text-xs font-mono tabular-nums text-slate-500">
                      {tip.metric}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {tip.reason}
                    </p>
                    <p className="text-xs font-medium text-teal-800 pt-0.5">
                      Tip: {tip.action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* One-Click Database Swaps */}
          {report.swaps.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Lower-GL / Calorie-Saving Swaps
              </h3>
              <div className="space-y-2.5">
                {report.swaps.map((swap) => (
                  <div
                    key={`${swap.entryId}-${swap.replacementFood.id}`}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-slate-500 line-through truncate max-w-[180px]">
                          {swap.entryName}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-900">
                          {swap.replacementFood.name}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-600">
                        {swap.replacementFood.servingLabel} ·{' '}
                        <span className="text-emerald-700 font-medium">
                          {swap.calorieDelta <= 0
                            ? `${swap.calorieDelta} kcal`
                            : `+${swap.calorieDelta} kcal`}
                        </span>{' '}
                        ·{' '}
                        <span className="text-emerald-700 font-medium">
                          {swap.glDelta} GL
                        </span>{' '}
                        ·{' '}
                        <span>
                          {swap.proteinDelta >= 0
                            ? `+${swap.proteinDelta}g`
                            : `${swap.proteinDelta}g`}{' '}
                          protein
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onApplySwap(swap.entryId, swap.replacementFood);
                        onClose();
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
                    >
                      Apply Swap
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
