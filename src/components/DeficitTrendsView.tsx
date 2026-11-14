import React, { useState } from 'react';
import {
  DailyTargets,
  DeficitTrendAnalysis,
  NavTab,
} from '../types/nutrition';
import { formatGlucose } from '../utils/nutritionMath';
import { DeficitTrendChart } from './Charts';

interface DeficitTrendsViewProps {
  analysis: DeficitTrendAnalysis;
  targets: DailyTargets;
  onSelectDateAndJump: (date: string) => void;
  onNavigate: (tab: NavTab) => void;
}

export const DeficitTrendsView: React.FC<DeficitTrendsViewProps> = ({
  analysis,
  targets,
  onSelectDateAndJump,
  onNavigate,
}) => {
  const [chartMode, setChartMode] = useState<'deficit' | 'intake' | 'glycemic'>(
    'deficit'
  );

  const trendSign = analysis.deficitTrendDelta >= 0 ? '+' : '';
  const weeklyKg =
    Math.round(analysis.projectedWeeklyLossLbs * 0.453592 * 100) / 100;

  return (
    <div className="space-y-6">
      {/* 4-Column Trend KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>7-Day Avg Caloric Deficit</span>
            <span
              className={`font-medium ${
                analysis.avg7DayDeficit >= targets.targetDeficit * 0.85
                  ? 'text-emerald-700'
                  : analysis.avg7DayDeficit >= 150
                  ? 'text-amber-700'
                  : 'text-red-600'
              }`}
            >
              {analysis.avg7DayDeficit >= targets.targetDeficit * 0.85
                ? 'On Pace'
                : analysis.avg7DayDeficit >= 0
                ? 'Below Target'
                : 'Surplus'}
            </span>
          </div>
          <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {analysis.avg7DayDeficit >= 0 ? '+' : ''}
            {analysis.avg7DayDeficit} kcal/d
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            Target: +{targets.targetDeficit} kcal/d · Prior 7d:{' '}
            {analysis.prev7DayDeficit >= 0 ? '+' : ''}
            {analysis.prev7DayDeficit} kcal/d
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Week-over-Week Deficit Trend</span>
            <span
              className={`font-medium ${
                analysis.deficitTrendDelta >= 0
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}
            >
              {analysis.deficitTrendDelta >= 0 ? 'Improving' : 'Softening'}
            </span>
          </div>
          <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {trendSign}
            {analysis.deficitTrendDelta} kcal/d
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            Projected pace: {analysis.projectedWeeklyLossLbs} lb/wk ({weeklyKg} kg/wk)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>7-Day Avg Glycemic Load</span>
            <span
              className={`font-medium ${
                analysis.avg7DayGl <= targets.maxDailyGlycemicLoad
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}
            >
              {analysis.avg7DayGl <= targets.maxDailyGlycemicLoad
                ? 'Controlled'
                : 'Elevated'}
            </span>
          </div>
          <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {analysis.avg7DayGl}
            <span className="text-xs font-normal text-slate-500 ml-1">
              / {targets.maxDailyGlycemicLoad} cap
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            Avg Net Carbs: {analysis.avg7DayNetCarbs}g · Protein: {analysis.avg7DayProtein}g
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Weekday vs. Weekend Drift</span>
            <span
              className={`font-medium ${
                analysis.weekendAvgCalories - analysis.weekdayAvgCalories >= 200
                  ? 'text-red-600'
                  : 'text-emerald-700'
              }`}
            >
              {analysis.weekendAvgCalories - analysis.weekdayAvgCalories >= 200
                ? 'Weekend Creep'
                : 'Consistent'}
            </span>
          </div>
          <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {analysis.weekendAvgCalories - analysis.weekdayAvgCalories >= 0 ? '+' : ''}
            {analysis.weekendAvgCalories - analysis.weekdayAvgCalories} kcal
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            Wkday: {analysis.weekdayAvgCalories} · Wkend: {analysis.weekendAvgCalories} kcal
          </div>
        </div>
      </div>

      {/* Main 14-Day Interactive Chart */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              14-Day Caloric Deficit &amp; Glycemic Trajectory
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hover any day to inspect intake, net caloric deficit, and glycemic load
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            {(
              [
                { id: 'deficit', label: 'Daily Deficit' },
                { id: 'intake', label: 'Intake vs. TDEE' },
                { id: 'glycemic', label: 'Glycemic Load' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setChartMode(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  chartMode === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <DeficitTrendChart
          series={analysis.dailySeries}
          targets={targets}
          mode={chartMode}
        />

        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-4 font-mono tabular-nums">
            <span>Target Adherence (±10%): {analysis.targetAdherenceRate}%</span>
            <span>·</span>
            <span>Snack Share: {analysis.snackSharePct}% of kcal</span>
            <span>·</span>
            <span>Avg Fiber: {analysis.avg7DayFiber}g/d</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('planner')}
            className="font-medium text-teal-700 hover:text-teal-800"
          >
            Generate Meal Plan Enhancements →
          </button>
        </div>
      </div>

      {/* 14-Day Detailed Log Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              14-Day Daily Ledger Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any date row to inspect or edit that day&apos;s meals
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-medium text-slate-600">
                <th className="py-2.5 pl-5 pr-3">Date</th>
                <th className="py-2.5 px-3 text-right">Intake</th>
                <th className="py-2.5 px-3 text-right">Deficit / Surplus</th>
                <th className="py-2.5 px-3 text-right">Protein</th>
                <th className="py-2.5 px-3 text-right">Net Carbs</th>
                <th className="py-2.5 px-3 text-right">Daily GL</th>
                <th className="py-2.5 px-3 text-right">Avg Glucose</th>
                <th className="py-2.5 pl-3 pr-5 text-right">Peak Glucose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {[...analysis.dailySeries].reverse().map((row) => (
                <tr
                  key={row.date}
                  onClick={() => onSelectDateAndJump(row.date)}
                  className="h-10 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="py-2 pl-5 pr-3 font-mono tabular-nums font-medium text-slate-900">
                    {row.date}
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                    {row.hasData ? `${row.calories} kcal` : '—'}
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-mono tabular-nums font-medium ${
                      !row.hasData
                        ? 'text-slate-400'
                        : row.deficit >= targets.targetDeficit * 0.85
                        ? 'text-emerald-700'
                        : row.deficit >= 0
                        ? 'text-amber-700'
                        : 'text-red-600'
                    }`}
                  >
                    {row.hasData
                      ? `${row.deficit >= 0 ? '+' : ''}${row.deficit} kcal`
                      : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                    {row.hasData ? `${row.protein}g` : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                    {row.hasData ? `${row.netCarbs}g` : '—'}
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-mono tabular-nums font-medium ${
                      !row.hasData
                        ? 'text-slate-400'
                        : row.glycemicLoad <= targets.maxDailyGlycemicLoad
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {row.hasData ? row.glycemicLoad : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                    {row.avgGlucose !== null
                      ? formatGlucose(row.avgGlucose, targets.glucoseUnit)
                      : '—'}
                  </td>
                  <td
                    className={`py-2 pl-3 pr-5 text-right font-mono tabular-nums font-medium ${
                      row.peakGlucose === null
                        ? 'text-slate-400'
                        : row.peakGlucose > targets.postMealGlucoseMax
                        ? 'text-red-600'
                        : 'text-slate-800'
                    }`}
                  >
                    {row.peakGlucose !== null
                      ? formatGlucose(row.peakGlucose, targets.glucoseUnit)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
