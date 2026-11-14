import React, { useEffect, useState } from 'react';
import { Download, FileJson, RotateCcw } from 'lucide-react';
import {
  DailyTargets,
  FoodItem,
  GlucoseReading,
  MealEntry,
  WaterEntry,
} from '../types/nutrition';
import { exportNutritionCsv, exportNutritionJson } from '../utils/nutritionMath';

interface TargetsSettingsViewProps {
  targets: DailyTargets;
  meals: MealEntry[];
  glucoseReadings: GlucoseReading[];
  waterEntries?: WaterEntry[];
  customFoods?: FoodItem[];
  onSaveTargets: (next: DailyTargets) => void;
  onResetDemo: () => void;
  onClearAll: () => void;
}

export const TargetsSettingsView: React.FC<TargetsSettingsViewProps> = ({
  targets,
  meals,
  glucoseReadings,
  waterEntries = [],
  customFoods = [],
  onSaveTargets,
  onResetDemo,
  onClearAll,
}) => {
  const [draft, setDraft] = useState<DailyTargets>(targets);
  const [savedNotice, setSavedNotice] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'none' | 'reset' | 'clear'>('none');

  useEffect(() => {
    setDraft(targets);
  }, [targets]);

  const computedTargetCalories = Math.max(
    1000,
    draft.maintenanceTdee - draft.targetDeficit
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveTargets({
      ...draft,
      targetCalories: computedTargetCalories,
      hydrationGoalMl: Math.max(500, Math.round(draft.hydrationGoalMl || 2500)),
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const triggerDownload = (content: string, mimeType: string, filename: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    const csv = exportNutritionCsv(meals, glucoseReadings, targets, waterEntries);
    const dateStamp = new Date().toISOString().slice(0, 10);
    triggerDownload(csv, 'text/csv;charset=utf-8;', `glycoledger-backup-${dateStamp}.csv`);
    setExportNotice('CSV backup downloaded');
    setTimeout(() => setExportNotice(null), 2500);
  };

  const handleDownloadJson = () => {
    const json = exportNutritionJson({
      targets,
      meals,
      glucoseReadings,
      waterEntries,
      customFoods,
    });
    const dateStamp = new Date().toISOString().slice(0, 10);
    triggerDownload(json, 'application/json;charset=utf-8;', `glycoledger-backup-${dateStamp}.json`);
    setExportNotice('JSON backup downloaded');
    setTimeout(() => setExportNotice(null), 2500);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Targets Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-lg p-6 space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Caloric Deficit, Macro &amp; Glucose Targets
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              All daily summaries, deficit trend calculations, and meal plans adapt to these thresholds
            </p>
          </div>
          {savedNotice && (
            <span className="text-xs font-medium text-emerald-700">
              Targets updated
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Maintenance TDEE (kcal/day)
            </label>
            <input
              type="number"
              min="1200"
              max="5000"
              step="25"
              value={draft.maintenanceTdee}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  maintenanceTdee: Number(e.target.value) || 2000,
                })
              }
              className="w-full h-9 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Target Daily Deficit (kcal/day)
            </label>
            <input
              type="number"
              min="0"
              max="1200"
              step="25"
              value={draft.targetDeficit}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  targetDeficit: Number(e.target.value) || 0,
                })
              }
              className="w-full h-9 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Daily Calorie Budget (Computed)
            </label>
            <div className="h-9 px-3 flex items-center text-sm font-mono tabular-nums font-semibold text-teal-800 bg-slate-50 border border-slate-200 rounded-md">
              {computedTargetCalories} kcal / day
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Net Carbs Cap (g)
            </label>
            <input
              type="number"
              min="20"
              max="400"
              value={draft.maxNetCarbs}
              onChange={(e) =>
                setDraft({ ...draft, maxNetCarbs: Number(e.target.value) || 100 })
              }
              className="w-full h-9 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Protein Minimum (g)
            </label>
            <input
              type="number"
              min="40"
              max="300"
              value={draft.minProtein}
              onChange={(e) =>
                setDraft({ ...draft, minProtein: Number(e.target.value) || 100 })
              }
              className="w-full h-9 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Fiber Goal (g)
            </label>
            <input
              type="number"
              min="10"
              max="80"
              value={draft.minFiber}
              onChange={(e) =>
                setDraft({ ...draft, minFiber: Number(e.target.value) || 25 })
              }
              className="w-full h-9 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Daily GL Ceiling
            </label>
            <input
              type="number"
              min="20"
              max="200"
              value={draft.maxDailyGlycemicLoad}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  maxDailyGlycemicLoad: Number(e.target.value) || 80,
                })
              }
              className="w-full h-9 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Fasting Glucose Ceiling ({draft.glucoseUnit})
            </label>
            <input
              type="number"
              step={draft.glucoseUnit === 'mmol/L' ? '0.1' : '1'}
              min={draft.glucoseUnit === 'mmol/L' ? '3.5' : '70'}
              max={draft.glucoseUnit === 'mmol/L' ? '10.0' : '180'}
              value={
                draft.glucoseUnit === 'mmol/L'
                  ? Number((draft.fastingGlucoseMax / 18.0182).toFixed(1))
                  : draft.fastingGlucoseMax
              }
              onChange={(e) => {
                const raw = Number(e.target.value);
                if (Number.isNaN(raw)) return;
                setDraft({
                  ...draft,
                  fastingGlucoseMax:
                    draft.glucoseUnit === 'mmol/L'
                      ? Math.round(raw * 18.0182)
                      : Math.round(raw),
                });
              }}
              className="w-full h-9 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              2h Post-Meal Ceiling ({draft.glucoseUnit})
            </label>
            <input
              type="number"
              step={draft.glucoseUnit === 'mmol/L' ? '0.1' : '1'}
              min={draft.glucoseUnit === 'mmol/L' ? '5.0' : '100'}
              max={draft.glucoseUnit === 'mmol/L' ? '14.0' : '250'}
              value={
                draft.glucoseUnit === 'mmol/L'
                  ? Number((draft.postMealGlucoseMax / 18.0182).toFixed(1))
                  : draft.postMealGlucoseMax
              }
              onChange={(e) => {
                const raw = Number(e.target.value);
                if (Number.isNaN(raw)) return;
                setDraft({
                  ...draft,
                  postMealGlucoseMax:
                    draft.glucoseUnit === 'mmol/L'
                      ? Math.round(raw * 18.0182)
                      : Math.round(raw),
                });
              }}
              className="w-full h-9 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Daily Hydration Goal (mL)
            </label>
            <input
              type="number"
              min="500"
              max="10000"
              step="50"
              value={draft.hydrationGoalMl || ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  hydrationGoalMl: Number(e.target.value) || 0,
                })
              }
              className="w-full h-9 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Display Glucose Unit
            </label>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md h-9">
              {(['mg/dL', 'mmol/L'] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setDraft({ ...draft, glucoseUnit: unit })}
                  className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
                    draft.glucoseUnit === unit
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-200">
          <button
            type="submit"
            className="px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 transition-colors"
          >
            Save Personal Targets
          </button>
        </div>
      </form>

      {/* Data Export & Baseline Controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Personal Data Backup &amp; Storage
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Storing {meals.length} meal logs, {glucoseReadings.length} glucose readings, {waterEntries.length} water logs, {customFoods.length} custom foods, and target settings locally
            </p>
          </div>
          {exportNotice && (
            <span className="text-xs font-medium text-emerald-700">
              {exportNotice}
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 transition-colors whitespace-nowrap"
          >
            <FileJson className="w-3.5 h-3.5" />
            Export Backup (JSON)
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Export Backup (CSV)
          </button>

          {confirmAction === 'none' && (
            <>
              <button
                type="button"
                onClick={() => setConfirmAction('reset')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restore 14-Day Sample Baseline
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction('clear')}
                className="px-3.5 py-2 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50"
              >
                Clear All Logs
              </button>
            </>
          )}

          {confirmAction === 'reset' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Restore 14-day baseline?</span>
              <button
                type="button"
                onClick={() => {
                  onResetDemo();
                  setDraft(targets);
                  setConfirmAction('none');
                }}
                className="px-3 py-1.5 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800"
              >
                Confirm Restore
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction('none')}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md"
              >
                Cancel
              </button>
            </div>
          )}

          {confirmAction === 'clear' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600">Erase all logged meals &amp; glucose?</span>
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  setConfirmAction('none');
                }}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Confirm Erase
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction('none')}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
