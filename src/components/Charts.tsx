import React, { useState } from 'react';
import { DailyTargets, GlucoseReading, MealEntry } from '../types/nutrition';
import { formatGlucose } from '../utils/nutritionMath';

interface DailyTimelineChartProps {
  meals: MealEntry[];
  glucoseReadings: GlucoseReading[];
  targets: DailyTargets;
}

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 720;
  return h * 60 + m;
}

export const DailyTimelineChart: React.FC<DailyTimelineChartProps> = ({
  meals,
  glucoseReadings,
  targets,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = 460;
  const height = 190;
  const padL = 38;
  const padR = 14;
  const padT = 16;
  const padB = 28;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const minTime = 6 * 60; // 06:00
  const maxTime = 22 * 60; // 22:00
  const xForTime = (t: string) => {
    const mins = Math.max(minTime, Math.min(maxTime, timeToMinutes(t)));
    return padL + ((mins - minTime) / (maxTime - minTime)) * plotW;
  };

  // Group meals by mealType + time cluster for GL bars
  const mealClusters = meals.reduce<
    { time: string; label: string; gl: number; kcal: number }[]
  >((acc, m) => {
    const existing = acc.find(
      (c) => c.label === m.mealType && Math.abs(timeToMinutes(c.time) - timeToMinutes(m.time)) <= 30
    );
    if (existing) {
      existing.gl = Math.round((existing.gl + m.glycemicLoad) * 10) / 10;
      existing.kcal += m.calories;
    } else {
      acc.push({
        time: m.time,
        label: m.mealType,
        gl: m.glycemicLoad,
        kcal: m.calories,
      });
    }
    return acc;
  }, []);

  const MG_DL_PER_MMOL = 18.0182;
  const toMmol = (mgDl: number) => mgDl / MG_DL_PER_MMOL;

  const minMmol = 3.0;
  const maxReadingMmol =
    glucoseReadings.length > 0
      ? Math.max(...glucoseReadings.map((g) => toMmol(g.valueMgDl) + 0.8))
      : 11.5;
  const maxMmol = Math.max(11.5, Math.ceil(maxReadingMmol * 2) / 2);
  const yForMmol = (mmol: number) =>
    padT + plotH - ((mmol - minMmol) / (maxMmol - minMmol)) * plotH;

  const targetLowMmol = 3.6;
  const targetHighMmol = 10.0;
  const targetLowY = yForMmol(targetLowMmol);
  const targetHighY = yForMmol(targetHighMmol);

  const rawTicks = [minMmol, 5.5, 8.0, targetHighMmol, maxMmol];
  const yTicks = rawTicks.filter(
    (val, idx, arr) =>
      idx === 0 || Math.abs(val - arr[idx - 1]) >= 1.2
  );

  const maxClusterGl = Math.max(40, ...mealClusters.map((c) => c.gl));
  const sortedGlucose = [...glucoseReadings].sort((a, b) =>
    a.time.localeCompare(b.time)
  );

  const linePoints = sortedGlucose
    .map(
      (g) =>
        `${xForTime(g.time).toFixed(1)},${yForMmol(toMmol(g.valueMgDl)).toFixed(1)}`
    )
    .join(' ');

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        role="img"
        aria-label="Daily glucose in mmol/L and meal glycemic load timeline"
      >
        {/* Target glucose band (3.6 to 10.0 mmol/L) */}
        <rect
          x={padL}
          y={targetHighY}
          width={plotW}
          height={Math.max(4, targetLowY - targetHighY)}
          fill="#ecfdf5"
        />
        <line
          x1={padL}
          y1={targetHighY}
          x2={padL + plotW}
          y2={targetHighY}
          stroke="#10b981"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.65"
        />
        <line
          x1={padL}
          y1={targetLowY}
          x2={padL + plotW}
          y2={targetLowY}
          stroke="#94a3b8"
          strokeWidth="1"
          strokeDasharray="2 3"
          opacity="0.5"
        />

        {/* Y axis labels (mmol/L) */}
        {yTicks.map((val, i) => (
          <text
            key={i}
            x={padL - 6}
            y={yForMmol(val) + 3}
            textAnchor="end"
            className="fill-slate-400 text-[9px] font-mono tabular-nums"
          >
            {val.toFixed(1)}
          </text>
        ))}

        {/* X axis ticks */}
        {['08:00', '12:00', '16:00', '20:00'].map((t) => (
          <g key={t}>
            <line
              x1={xForTime(t)}
              y1={padT + plotH}
              x2={xForTime(t)}
              y2={padT + plotH + 4}
              stroke="#cbd5e1"
            />
            <text
              x={xForTime(t)}
              y={height - 6}
              textAnchor="middle"
              className="fill-slate-400 text-[9px] font-mono tabular-nums"
            >
              {t}
            </text>
          </g>
        ))}

        {/* Baseline */}
        <line
          x1={padL}
          y1={padT + plotH}
          x2={padL + plotW}
          y2={padT + plotH}
          stroke="#e2e8f0"
        />

        {/* Meal GL bars */}
        {mealClusters.map((c, idx) => {
          const barH = Math.max(4, (c.gl / maxClusterGl) * (plotH * 0.45));
          const x = xForTime(c.time) - 8;
          return (
            <rect
              key={idx}
              x={x}
              y={padT + plotH - barH}
              width={16}
              height={barH}
              rx={2}
              fill="#cbd5e1"
              opacity={0.7}
            >
              <title>
                {c.label} ({c.time}): {c.kcal} kcal · GL {c.gl}
              </title>
            </rect>
          );
        })}

        {/* Glucose polyline */}
        {sortedGlucose.length > 1 && (
          <polyline
            fill="none"
            stroke="#0f766e"
            strokeWidth="2"
            points={linePoints}
          />
        )}

        {/* Glucose points */}
        {sortedGlucose.map((g, idx) => {
          const cx = xForTime(g.time);
          const readingMmol = toMmol(g.valueMgDl);
          const cy = yForMmol(readingMmol);
          const isOutOfBand =
            readingMmol < targetLowMmol || readingMmol > targetHighMmol;
          const isHovered = hoverIdx === idx;
          return (
            <g
              key={g.id}
              onMouseEnter={() => setHoverIdx(idx)}
              onMouseLeave={() => setHoverIdx(null)}
              className="cursor-pointer"
            >
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? 5.5 : 4}
                fill={isOutOfBand ? '#dc2626' : '#0f766e'}
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              {isHovered && (
                <g transform={`translate(${Math.min(width - 128, Math.max(padL, cx - 62))}, ${Math.max(4, cy - 34)})`}>
                  <rect
                    width="124"
                    height="26"
                    rx="4"
                    fill="#0f172a"
                  />
                  <text
                    x="62"
                    y="16"
                    textAnchor="middle"
                    className="fill-white text-[9.5px] font-mono tabular-nums"
                  >
                    {g.time} · {formatGlucose(g.valueMgDl, 'mmol/L')}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
        <span>
          Target band: {targetLowMmol.toFixed(1)}–{targetHighMmol.toFixed(1)} mmol/L
        </span>
        <span>Gray bars: Meal GL</span>
      </div>
    </div>
  );
};

interface DeficitTrendChartProps {
  series: {
    date: string;
    shortLabel: string;
    calories: number;
    deficit: number;
    glycemicLoad: number;
    avgGlucose: number | null;
    hasData: boolean;
  }[];
  targets: DailyTargets;
  mode: 'intake' | 'deficit' | 'glycemic';
}

export const DeficitTrendChart: React.FC<DeficitTrendChartProps> = ({
  series,
  targets,
  mode,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const width = 760;
  const height = 260;
  const padL = 52;
  const padR = 20;
  const padT = 22;
  const padB = 34;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const colW = plotW / Math.max(1, series.length);
  const barW = Math.min(28, colW * 0.62);

  if (mode === 'intake') {
    const maxVal = Math.max(
      targets.maintenanceTdee + 350,
      ...series.map((d) => d.calories)
    );
    const yFor = (v: number) => padT + plotH - (v / maxVal) * plotH;
    const targetY = yFor(targets.targetCalories);
    const tdeeY = yFor(targets.maintenanceTdee);

    return (
      <div className="w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          role="img"
          aria-label="14-day caloric intake versus maintenance and target chart"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const val = Math.round(maxVal * ratio);
            const y = yFor(val);
            return (
              <g key={idx}>
                <line
                  x1={padL}
                  y1={y}
                  x2={padL + plotW}
                  y2={y}
                  stroke="#f1f5f9"
                />
                <text
                  x={padL - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono tabular-nums"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Maintenance TDEE line */}
          <line
            x1={padL}
            y1={tdeeY}
            x2={padL + plotW}
            y2={tdeeY}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            strokeWidth="1.2"
          />
          <text
            x={padL + plotW - 2}
            y={tdeeY - 5}
            textAnchor="end"
            className="fill-slate-500 text-[10px] font-medium"
          >
            TDEE ({targets.maintenanceTdee} kcal)
          </text>

          {/* Target Intake line */}
          <line
            x1={padL}
            y1={targetY}
            x2={padL + plotW}
            y2={targetY}
            stroke="#0f766e"
            strokeDasharray="3 3"
            strokeWidth="1.5"
          />
          <text
            x={padL + 4}
            y={targetY - 5}
            textAnchor="start"
            className="fill-teal-700 text-[10px] font-medium"
          >
            Target ({targets.targetCalories} kcal)
          </text>

          {/* Bars */}
          {series.map((d, i) => {
            const cx = padL + i * colW + colW / 2;
            const barH = d.hasData ? Math.max(3, (d.calories / maxVal) * plotH) : 0;
            const overMaintenance = d.calories > targets.maintenanceTdee;
            const overTarget = d.calories > targets.targetCalories;
            const fill = !d.hasData
              ? '#e2e8f0'
              : overMaintenance
              ? '#dc2626'
              : overTarget
              ? '#d97706'
              : '#0f766e';

            return (
              <g
                key={d.date}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                <rect
                  x={cx - colW / 2}
                  y={padT}
                  width={colW}
                  height={plotH}
                  fill="transparent"
                />
                {d.hasData ? (
                  <rect
                    x={cx - barW / 2}
                    y={padT + plotH - barH}
                    width={barW}
                    height={barH}
                    rx={3}
                    fill={fill}
                    opacity={hoveredIndex === i ? 1 : 0.85}
                  />
                ) : (
                  <rect
                    x={cx - barW / 2}
                    y={padT + plotH - 4}
                    width={barW}
                    height={4}
                    rx={1}
                    fill="#e2e8f0"
                  />
                )}
                <text
                  x={cx}
                  y={height - 10}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-mono tabular-nums"
                >
                  {d.shortLabel}
                </text>
              </g>
            );
          })}

          {hoveredIndex !== null && series[hoveredIndex] && (
            (() => {
              const d = series[hoveredIndex];
              const cx = padL + hoveredIndex * colW + colW / 2;
              const boxW = 166;
              const bx = Math.min(width - boxW - 8, Math.max(padL, cx - boxW / 2));
              return (
                <g transform={`translate(${bx}, 4)`}>
                  <rect width={boxW} height="38" rx="5" fill="#0f172a" />
                  <text
                    x={boxW / 2}
                    y="16"
                    textAnchor="middle"
                    className="fill-white text-[10px] font-mono tabular-nums"
                  >
                    {d.date} · {d.hasData ? `${d.calories} kcal` : 'No logs'}
                  </text>
                  <text
                    x={boxW / 2}
                    y="30"
                    textAnchor="middle"
                    className="fill-slate-300 text-[9.5px] font-mono tabular-nums"
                  >
                    {d.hasData
                      ? `Deficit: ${d.deficit >= 0 ? '+' : ''}${d.deficit} kcal · GL ${d.glycemicLoad}`
                      : 'No meals recorded'}
                  </text>
                </g>
              );
            })()
          )}
        </svg>
      </div>
    );
  }

  if (mode === 'deficit') {
    const absMax = Math.max(
      750,
      targets.targetDeficit + 250,
      ...series.map((d) => Math.abs(d.deficit))
    );
    const yFor = (val: number) =>
      padT + plotH / 2 - (val / absMax) * (plotH / 2);
    const zeroY = yFor(0);
    const goalY = yFor(targets.targetDeficit);

    return (
      <div className="w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          role="img"
          aria-label="14-day daily caloric deficit trend chart"
        >
          {[absMax, targets.targetDeficit, 0, -Math.round(absMax / 2)].map(
            (val, idx) => (
              <g key={idx}>
                <line
                  x1={padL}
                  y1={yFor(val)}
                  x2={padL + plotW}
                  y2={yFor(val)}
                  stroke={val === 0 ? '#94a3b8' : '#f1f5f9'}
                  strokeWidth={val === 0 ? 1.2 : 1}
                />
                <text
                  x={padL - 8}
                  y={yFor(val) + 3}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono tabular-nums"
                >
                  {val > 0 ? `+${val}` : val}
                </text>
              </g>
            )
          )}

          {/* Target deficit line */}
          <line
            x1={padL}
            y1={goalY}
            x2={padL + plotW}
            y2={goalY}
            stroke="#0f766e"
            strokeDasharray="3 3"
            strokeWidth="1.4"
          />
          <text
            x={padL + 4}
            y={goalY - 5}
            className="fill-teal-700 text-[10px] font-medium"
          >
            Target Deficit (+{targets.targetDeficit} kcal)
          </text>

          {series.map((d, i) => {
            const cx = padL + i * colW + colW / 2;
            const yVal = yFor(d.deficit);
            const barY = d.deficit >= 0 ? yVal : zeroY;
            const barH = d.hasData ? Math.max(3, Math.abs(yVal - zeroY)) : 0;
            const fill = !d.hasData
              ? '#e2e8f0'
              : d.deficit >= targets.targetDeficit * 0.85
              ? '#16a34a'
              : d.deficit >= 0
              ? '#d97706'
              : '#dc2626';

            return (
              <g
                key={d.date}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                <rect
                  x={cx - colW / 2}
                  y={padT}
                  width={colW}
                  height={plotH}
                  fill="transparent"
                />
                {d.hasData && (
                  <rect
                    x={cx - barW / 2}
                    y={barY}
                    width={barW}
                    height={barH}
                    rx={2.5}
                    fill={fill}
                    opacity={hoveredIndex === i ? 1 : 0.85}
                  />
                )}
                <text
                  x={cx}
                  y={height - 10}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-mono tabular-nums"
                >
                  {d.shortLabel}
                </text>
              </g>
            );
          })}

          {hoveredIndex !== null && series[hoveredIndex] && (
            (() => {
              const d = series[hoveredIndex];
              const cx = padL + hoveredIndex * colW + colW / 2;
              const boxW = 166;
              const bx = Math.min(width - boxW - 8, Math.max(padL, cx - boxW / 2));
              return (
                <g transform={`translate(${bx}, 4)`}>
                  <rect width={boxW} height="38" rx="5" fill="#0f172a" />
                  <text
                    x={boxW / 2}
                    y="16"
                    textAnchor="middle"
                    className="fill-white text-[10px] font-mono tabular-nums"
                  >
                    {d.date} · {d.hasData ? (d.deficit >= 0 ? `${d.deficit} kcal deficit` : `${Math.abs(d.deficit)} kcal surplus`) : 'No logs'}
                  </text>
                  <text
                    x={boxW / 2}
                    y="30"
                    textAnchor="middle"
                    className="fill-slate-300 text-[9.5px] font-mono tabular-nums"
                  >
                    {d.hasData ? `Intake: ${d.calories} kcal` : 'No meals recorded'}
                  </text>
                </g>
              );
            })()
          )}
        </svg>
      </div>
    );
  }

  // mode === 'glycemic'
  const maxGl = Math.max(130, ...series.map((d) => d.glycemicLoad + 15));
  const yGl = (v: number) => padT + plotH - (v / maxGl) * plotH;
  const capY = yGl(targets.maxDailyGlycemicLoad);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        role="img"
        aria-label="14-day daily glycemic load trend chart"
      >
        {[0, 40, targets.maxDailyGlycemicLoad, 120].map((v, i) => (
          <g key={i}>
            <line
              x1={padL}
              y1={yGl(v)}
              x2={padL + plotW}
              y2={yGl(v)}
              stroke="#f1f5f9"
            />
            <text
              x={padL - 8}
              y={yGl(v) + 3}
              textAnchor="end"
              className="fill-slate-400 text-[10px] font-mono tabular-nums"
            >
              {v}
            </text>
          </g>
        ))}

        <line
          x1={padL}
          y1={capY}
          x2={padL + plotW}
          y2={capY}
          stroke="#d97706"
          strokeDasharray="3 3"
          strokeWidth="1.4"
        />
        <text
          x={padL + 4}
          y={capY - 5}
          className="fill-amber-700 text-[10px] font-medium"
        >
          GL Ceiling ({targets.maxDailyGlycemicLoad})
        </text>

        {series.map((d, i) => {
          const cx = padL + i * colW + colW / 2;
          const barH = d.hasData
            ? Math.max(3, (d.glycemicLoad / maxGl) * plotH)
            : 0;
          const fill = !d.hasData
            ? '#e2e8f0'
            : d.glycemicLoad <= targets.maxDailyGlycemicLoad
            ? '#0f766e'
            : d.glycemicLoad <= targets.maxDailyGlycemicLoad * 1.25
            ? '#d97706'
            : '#dc2626';
          return (
            <g
              key={d.date}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer"
            >
              <rect
                x={cx - colW / 2}
                y={padT}
                width={colW}
                height={plotH}
                fill="transparent"
              />
              {d.hasData && (
                <rect
                  x={cx - barW / 2}
                  y={padT + plotH - barH}
                  width={barW}
                  height={barH}
                  rx={3}
                  fill={fill}
                  opacity={hoveredIndex === i ? 1 : 0.85}
                />
              )}
              <text
                x={cx}
                y={height - 10}
                textAnchor="middle"
                className="fill-slate-500 text-[10px] font-mono tabular-nums"
              >
                {d.shortLabel}
              </text>
            </g>
          );
        })}

        {hoveredIndex !== null && series[hoveredIndex] && (
          (() => {
            const d = series[hoveredIndex];
            const cx = padL + hoveredIndex * colW + colW / 2;
            const boxW = 172;
            const bx = Math.min(width - boxW - 8, Math.max(padL, cx - boxW / 2));
            return (
              <g transform={`translate(${bx}, 4)`}>
                <rect width={boxW} height="38" rx="5" fill="#0f172a" />
                <text
                  x={boxW / 2}
                  y="16"
                  textAnchor="middle"
                  className="fill-white text-[10px] font-mono tabular-nums"
                >
                  {d.date} · GL {d.glycemicLoad}
                </text>
                <text
                  x={boxW / 2}
                  y="30"
                  textAnchor="middle"
                  className="fill-slate-300 text-[9.5px] font-mono tabular-nums"
                >
                  {d.avgGlucose !== null
                    ? `Avg Glucose: ${formatGlucose(d.avgGlucose, targets.glucoseUnit)}`
                    : 'No glucose readings'}
                </text>
              </g>
            );
          })()
        )}
      </svg>
    </div>
  );
};
