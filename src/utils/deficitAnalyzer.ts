import {
  DailyTargets,
  DeficitTrendAnalysis,
  FoodItem,
  GlucoseReading,
  MealEntry,
  MealSuggestion,
  MealType,
  OptimizedDayPlan,
  PlannedMealSlot,
  SmartFoodSwap,
} from '../types/nutrition';
import {
  addDays,
  computeDailySummary,
  computeFoodGlycemicLoad,
  computeFoodNetCarbs,
  formatGlucose,
  formatShortDate,
  toLocalDateString,
} from './nutritionMath';

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function findReplacementFood(
  loggedEntry: MealEntry,
  foods: FoodItem[]
): FoodItem | null {
  // Look for a food in the database with meaningfully lower glycemic load and lower/comparable calories
  const loggedCaloriesPerServing = loggedEntry.calories / loggedEntry.servings;
  const loggedGlPerServing = loggedEntry.glycemicLoad / loggedEntry.servings;

  const candidates = foods.filter((f) => {
    if (f.id === loggedEntry.foodId) return false;
    const fGl = computeFoodGlycemicLoad(f, 1);
    const savesCalories = f.calories <= loggedCaloriesPerServing - 25;
    const savesGl = fGl <= loggedGlPerServing - 6;
    const decentProteinOrFiber = f.protein >= 10 || f.fiber >= 4;
    if (loggedEntry.mealType === 'Snack') {
      return (
        (f.tags.includes('snack') ||
          f.category === 'Dairy & Alternatives' ||
          f.category === 'Fruits' ||
          f.category === 'Fats & Nuts') &&
        savesGl &&
        (savesCalories || f.protein >= 12)
      );
    }
    return savesGl && (savesCalories || decentProteinOrFiber) && f.gi <= 55;
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const scoreA =
      (loggedCaloriesPerServing - a.calories) * 0.4 +
      (loggedGlPerServing - computeFoodGlycemicLoad(a, 1)) * 6 +
      a.protein * 2;
    const scoreB =
      (loggedCaloriesPerServing - b.calories) * 0.4 +
      (loggedGlPerServing - computeFoodGlycemicLoad(b, 1)) * 6 +
      b.protein * 2;
    return scoreB - scoreA;
  });

  return candidates[0];
}

function buildOptimizedDayPlan(
  targets: DailyTargets,
  foods: FoodItem[],
  snackSharePct: number
): OptimizedDayPlan {
  const byId = new Map(foods.map((f) => [f.id, f]));
  const pick = (id: string, fallbackCategory: FoodItem['category']): FoodItem => {
    return (
      byId.get(id) ||
      foods.find((f) => f.category === fallbackCategory && f.gi <= 55) ||
      foods[0]
    );
  };

  // Core template calibrated for high satiety + low glycemic load, scaled smoothly to targetCalories
  const baseScale = Math.max(0.75, Math.min(1.45, targets.targetCalories / 1720));
  const roundServing = (raw: number) => Math.max(0.5, Math.round(raw * 4) / 4);

  const slotsConfig: {
    mealType: MealType;
    time: string;
    items: { food: FoodItem; servings: number }[];
  }[] = [
    {
      mealType: 'Breakfast',
      time: '08:00',
      items: [
        { food: pick('food-veggie-omelette', 'Prepared Meals'), servings: roundServing(1 * baseScale) },
        { food: pick('food-ezekiel-toast', 'Grains & Carbs'), servings: roundServing(0.75 * baseScale) },
        { food: pick('food-blueberries', 'Fruits'), servings: 1 },
      ],
    },
    {
      mealType: 'Lunch',
      time: '12:30',
      items: [
        { food: pick('food-mediterranean-bowl', 'Prepared Meals'), servings: roundServing(1 * baseScale) },
        { food: pick('food-mixed-greens', 'Vegetables'), servings: 1 },
      ],
    },
    {
      mealType: 'Dinner',
      time: '18:45',
      items: [
        { food: pick('food-salmon-greens-plate', 'Prepared Meals'), servings: roundServing(1 * baseScale) },
        { food: pick('food-lentils-cooked', 'Grains & Carbs'), servings: roundServing(0.75 * baseScale) },
      ],
    },
    {
      mealType: 'Snack',
      time: snackSharePct > 22 ? '15:30' : '16:00',
      items: [
        { food: pick('food-chia-yogurt-parfait', 'Prepared Meals'), servings: 1 },
        { food: pick('food-almonds', 'Fats & Nuts'), servings: targets.targetCalories > 1950 ? 1 : 0.5 },
      ],
    },
  ];

  const slots: PlannedMealSlot[] = slotsConfig.map((slot) => {
    const items = slot.items.map(({ food, servings }) => {
      const calories = Math.round(food.calories * servings);
      const netCarbs = Math.round(computeFoodNetCarbs(food) * servings * 10) / 10;
      const protein = Math.round(food.protein * servings * 10) / 10;
      const fiber = Math.round(food.fiber * servings * 10) / 10;
      const glycemicLoad = computeFoodGlycemicLoad(food, servings);
      return {
        food,
        servings,
        calories,
        netCarbs,
        protein,
        fiber,
        glycemicLoad,
      };
    });

    return {
      mealType: slot.mealType,
      time: slot.time,
      items,
      slotCalories: items.reduce((s, i) => s + i.calories, 0),
      slotGl: Math.round(items.reduce((s, i) => s + i.glycemicLoad, 0) * 10) / 10,
      slotNetCarbs: Math.round(items.reduce((s, i) => s + i.netCarbs, 0) * 10) / 10,
      slotProtein: Math.round(items.reduce((s, i) => s + i.protein, 0) * 10) / 10,
    };
  });

  const totalCalories = slots.reduce((s, slot) => s + slot.slotCalories, 0);
  const totalProtein = Math.round(slots.reduce((s, slot) => s + slot.slotProtein, 0));
  const totalNetCarbs = Math.round(slots.reduce((s, slot) => s + slot.slotNetCarbs, 0));
  const totalFiber = Math.round(
    slots.reduce(
      (s, slot) => s + slot.items.reduce((a, b) => a + b.fiber, 0),
      0
    )
  );
  const totalFat = Math.round(
    slots.reduce(
      (s, slot) => s + slot.items.reduce((a, b) => a + b.food.fat * b.servings, 0),
      0
    )
  );
  const totalGlycemicLoad =
    Math.round(slots.reduce((s, slot) => s + slot.slotGl, 0) * 10) / 10;

  return {
    goalLabel: `${targets.targetDeficit} kcal/day Deficit · Low Glycemic Load`,
    totalCalories,
    projectedDeficit: Math.round(targets.maintenanceTdee - totalCalories),
    totalProtein,
    totalNetCarbs,
    totalFiber,
    totalFat,
    totalGlycemicLoad,
    slots,
  };
}

export function analyzeDeficitTrends(
  meals: MealEntry[],
  glucoseReadings: GlucoseReading[],
  targets: DailyTargets,
  foods: FoodItem[],
  anchorDate: string = toLocalDateString()
): DeficitTrendAnalysis {
  // Analyze 14-day window ending yesterday (plus today if it already has substantial logs >= 900 kcal)
  const todaySummary = computeDailySummary(anchorDate, meals, glucoseReadings, targets);
  const includeAnchorToday = todaySummary.calories >= 900;
  const endOffset = includeAnchorToday ? 0 : -1;

  const windowDates: string[] = [];
  for (let i = 13; i >= 0; i--) {
    windowDates.push(addDays(anchorDate, endOffset - i));
  }

  const dailySeries = windowDates.map((date) => {
    const summary = computeDailySummary(date, meals, glucoseReadings, targets);
    const hasData = summary.entryCount > 0;
    return {
      date,
      shortLabel: formatShortDate(date),
      calories: summary.calories,
      deficit: hasData ? summary.deficit : 0,
      glycemicLoad: summary.glycemicLoad,
      netCarbs: summary.netCarbs,
      protein: summary.protein,
      avgGlucose: summary.avgGlucose,
      peakGlucose: summary.peakGlucose,
      hasData,
    };
  });

  const prev7 = dailySeries.slice(0, 7).filter((d) => d.hasData);
  const last7 = dailySeries.slice(7, 14).filter((d) => d.hasData);
  const allLogged = dailySeries.filter((d) => d.hasData);

  const avg7DayCalories = Math.round(avg(last7.map((d) => d.calories)));
  const prev7DayCalories = Math.round(avg(prev7.map((d) => d.calories)));
  const avg7DayDeficit = Math.round(avg(last7.map((d) => d.deficit)));
  const prev7DayDeficit = Math.round(avg(prev7.map((d) => d.deficit)));
  const deficitTrendDelta =
    prev7.length > 0 && last7.length > 0 ? avg7DayDeficit - prev7DayDeficit : 0;

  const avg7DayGl = Math.round(avg(last7.map((d) => d.glycemicLoad)) * 10) / 10;
  const avg7DayNetCarbs = Math.round(avg(last7.map((d) => d.netCarbs)));
  const avg7DayProtein = Math.round(avg(last7.map((d) => d.protein)));

  const last7DatesSet = new Set(last7.map((d) => d.date));
  const last7Meals = meals.filter((m) => last7DatesSet.has(m.date));
  const avg7DayFiber =
    last7.length > 0
      ? Math.round(last7Meals.reduce((s, m) => s + m.fiber, 0) / last7.length)
      : 0;

  const projectedWeeklyLossLbs =
    Math.round(((avg7DayDeficit * 7) / 3500) * 100) / 100;

  const withinBudgetDays = last7.filter(
    (d) => Math.abs(d.calories - targets.targetCalories) <= targets.targetCalories * 0.1
  ).length;
  const targetAdherenceRate =
    last7.length > 0 ? Math.round((withinBudgetDays / last7.length) * 100) : 0;

  // Weekday vs weekend
  const weekdayCals: number[] = [];
  const weekendCals: number[] = [];
  for (const d of allLogged) {
    const [y, m, day] = d.date.split('-').map(Number);
    const dow = new Date(y, m - 1, day).getDay();
    if (dow === 0 || dow === 5 || dow === 6) {
      weekendCals.push(d.calories);
    } else {
      weekdayCals.push(d.calories);
    }
  }
  const weekdayAvgCalories = Math.round(avg(weekdayCals));
  const weekendAvgCalories = Math.round(avg(weekendCals));

  // Snack analysis
  const totalLast7Cal = last7Meals.reduce((s, m) => s + m.calories, 0);
  const snackMeals = last7Meals.filter((m) => m.mealType === 'Snack');
  const snackCal = snackMeals.reduce((s, m) => s + m.calories, 0);
  const snackSharePct =
    totalLast7Cal > 0 ? Math.round((snackCal / totalLast7Cal) * 100) : 0;
  const snackAvgGl =
    last7.length > 0
      ? Math.round(
          (snackMeals.reduce((s, m) => s + m.glycemicLoad, 0) / last7.length) * 10
        ) / 10
      : 0;

  // Smart Food Swaps from recent logged high-GL / high-calorie items
  const recentHighGlCounts = new Map<
    string,
    { entry: MealEntry; count: number }
  >();
  for (const m of last7Meals) {
    const glPerServing = m.glycemicLoad / Math.max(0.1, m.servings);
    if (m.gi >= 60 || glPerServing >= 14) {
      const key = `${m.foodId}-${m.mealType}`;
      const existing = recentHighGlCounts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        recentHighGlCounts.set(key, { entry: m, count: 1 });
      }
    }
  }

  const smartSwaps: SmartFoodSwap[] = [];
  for (const { entry, count } of recentHighGlCounts.values()) {
    const replacement = findReplacementFood(entry, foods);
    if (replacement) {
      const loggedCal = Math.round(entry.calories / entry.servings);
      const loggedGl =
        Math.round((entry.glycemicLoad / entry.servings) * 10) / 10;
      const loggedProt = Math.round((entry.protein / entry.servings) * 10) / 10;
      const repGl = computeFoodGlycemicLoad(replacement, 1);

      smartSwaps.push({
        id: `swap-${entry.foodId}-${entry.mealType}`,
        loggedFoodName: entry.foodName,
        loggedMealType: entry.mealType,
        occurrences: count,
        replacementFood: replacement,
        calorieSavingPerServing: Math.round(loggedCal - replacement.calories),
        glSavingPerServing: Math.round((loggedGl - repGl) * 10) / 10,
        proteinDeltaPerServing:
          Math.round((replacement.protein - loggedProt) * 10) / 10,
      });
    }
  }
  smartSwaps.sort((a, b) => b.occurrences - a.occurrences);

  // Build personalized diagnostic suggestions
  const suggestions: MealSuggestion[] = [];

  if (allLogged.length === 0) {
    suggestions.push({
      id: 'sug-empty',
      title: 'Log 3+ Days to Unlock Deficit Trend Calibration',
      category: 'Deficit Pace',
      priority: 'medium',
      metricSummary: '0 logged days in window',
      rationale:
        'At least three days of meal intake are needed to compute rolling caloric deficit drift, weekday vs. weekend variance, and glycemic load spikes.',
      actionStep:
        'Use Log Meal or Apply Optimized Plan to begin building your 14-day baseline.',
    });
  } else {
    // 1. Deficit pace diagnostic
    const deficitGap = targets.targetDeficit - avg7DayDeficit;
    if (avg7DayDeficit < 150) {
      suggestions.push({
        id: 'sug-deficit-stall',
        title: 'Caloric Deficit Has Compressed Below Target Floor',
        category: 'Deficit Pace',
        priority: 'high',
        metricSummary: `7-day avg deficit: ${avg7DayDeficit} kcal/day (Target: ${targets.targetDeficit} kcal/day)`,
        rationale: `Your 7-day average intake of ${avg7DayCalories} kcal leaves a daily gap of ${deficitGap} kcal above your ${targets.targetCalories} kcal target, slowing projected fat loss to ${projectedWeeklyLossLbs} lb/week.`,
        actionStep: `Trim ${Math.min(350, Math.max(150, deficitGap))} kcal/day by replacing refined snacks or liquid calories with lean protein and fibrous vegetables.`,
      });
    } else if (avg7DayDeficit > 750 || avg7DayCalories < 1250) {
      suggestions.push({
        id: 'sug-deficit-aggressive',
        title: 'Deficit Is Overly Aggressive — Protect Lean Mass',
        category: 'Deficit Pace',
        priority: 'high',
        metricSummary: `7-day avg deficit: ${avg7DayDeficit} kcal/day (${avg7DayCalories} kcal intake)`,
        rationale:
          'Sustaining a deficit above 750 kcal/day increases hunger-hormone rebound, fatigue, and late-evening glucose swings.',
        actionStep:
          'Add 180–250 kcal of slow-digesting protein and fiber (e.g., Cottage Cheese + Berries or Lentils) to stabilize your pace near 500 kcal/day.',
      });
    } else if (Math.abs(deficitGap) > 100) {
      suggestions.push({
        id: 'sug-deficit-drift',
        title:
          deficitGap > 0
            ? 'Close the Remaining Daily Deficit Gap'
            : 'Modest Surplus Deficit Buffer Detected',
        category: 'Deficit Pace',
        priority: 'medium',
        metricSummary: `7-day avg: ${avg7DayDeficit} kcal/day vs. ${targets.targetDeficit} kcal target`,
        rationale:
          deficitGap > 0
            ? `Your recent intake averages ${avg7DayCalories} kcal/day—${deficitGap} kcal above budget. Small high-GI snacks or calorie-dense dressings typically account for this gap.`
            : `You are running ${Math.abs(deficitGap)} kcal deeper than your ${targets.targetDeficit} kcal deficit target without triggering excessive hunger.`,
        actionStep:
          deficitGap > 0
            ? `Aim to shave ~${deficitGap} kcal from your highest-calorie meal slot using the Smart Swaps below.`
            : 'Maintain current portion cadence and prioritize hydration and 130g+ daily protein.',
      });
    } else {
      suggestions.push({
        id: 'sug-deficit-optimal',
        title: 'Caloric Deficit Pace Is On Target',
        category: 'Deficit Pace',
        priority: 'positive',
        metricSummary: `7-day avg deficit: ${avg7DayDeficit} kcal/day (${projectedWeeklyLossLbs} lb/wk pace)`,
        rationale: `Your intake averaged ${avg7DayCalories} kcal over the last 7 days (${targetAdherenceRate}% target adherence), putting you squarely in a sustainable fat-loss zone.`,
        actionStep:
          'Keep your morning protein anchor steady and avoid adding unlogged liquid calories.',
      });
    }

    // 2. Weekend drift diagnostic
    if (
      weekendCals.length > 0 &&
      weekdayCals.length > 0 &&
      weekendAvgCalories - weekdayAvgCalories >= 220
    ) {
      const diff = weekendAvgCalories - weekdayAvgCalories;
      suggestions.push({
        id: 'sug-weekend-drift',
        title: 'Weekend Calorie Creep Offsets Weekday Deficit',
        category: 'Timing & Habits',
        priority: 'high',
        metricSummary: `Fri–Sun avg: ${weekendAvgCalories} kcal vs. Mon–Thu avg: ${weekdayAvgCalories} kcal (+${diff} kcal)`,
        rationale: `Weekend meals average ${diff} kcal higher per day, erasing roughly ${Math.round((diff * 3) / targets.targetDeficit * 10) / 10} weekday deficit days each week.`,
        actionStep:
          'Pre-log a high-protein breakfast (30g+) on Friday–Sunday mornings and cap dinner starch portions to 1/2 cup cooked whole grains.',
      });
    }

    // 3. Glycemic load & post-meal glucose correlation
    const highGlDays = last7.filter((d) => d.glycemicLoad > targets.maxDailyGlycemicLoad);
    const highGlucoseDays = last7.filter(
      (d) => d.peakGlucose !== null && d.peakGlucose > targets.postMealGlucoseMax
    );
    if (avg7DayGl > targets.maxDailyGlycemicLoad || highGlucoseDays.length >= 2) {
      suggestions.push({
        id: 'sug-glycemic-load',
        title: 'Reduce Daily Glycemic Load to Flatten Glucose Peaks',
        category: 'Glycemic Control',
        priority: 'high',
        metricSummary: `7-day avg GL: ${avg7DayGl} (Cap: ${targets.maxDailyGlycemicLoad}) · ${highGlucoseDays.length} spike days > ${formatGlucose(targets.postMealGlucoseMax, targets.glucoseUnit)}`,
        rationale: `${highGlDays.length} of the last ${last7.length} days exceeded your ${targets.maxDailyGlycemicLoad} GL ceiling. High-GL meals drive rapid insulin surges followed by rebound cravings that jeopardize caloric deficits.`,
        actionStep:
          'Pair carbohydrates with 25g+ lean protein and 6g+ fiber, or swap refined grains for lentils, barley, or cauliflower rice.',
      });
    } else {
      suggestions.push({
        id: 'sug-glycemic-steady',
        title: 'Glycemic Load Remains Tightly Controlled',
        category: 'Glycemic Control',
        priority: 'positive',
        metricSummary: `7-day avg GL: ${avg7DayGl} (Target ≤ ${targets.maxDailyGlycemicLoad})`,
        rationale:
          'Keeping daily Glycemic Load below 80 minimizes post-prandial glucose excursions and stabilizes afternoon energy.',
        actionStep:
          'Continue front-loading fibrous greens before starchy items at lunch and dinner.',
      });
    }

    // 4. Snack contribution diagnostic
    if (snackSharePct >= 18 || snackAvgGl >= 18) {
      suggestions.push({
        id: 'sug-snack-leak',
        title: 'Afternoon & Evening Snacks Carry Disproportionate Glycemic Load',
        category: 'Timing & Habits',
        priority: 'medium',
        metricSummary: `${snackSharePct}% of weekly calories · ${snackAvgGl} avg daily GL from Snacks`,
        rationale:
          'Refined snack foods deliver fast-absorbing carbs without protein satiety, spiking blood glucose while shrinking your caloric deficit.',
        actionStep:
          'Standardize snacks to protein-anchored options under 160 kcal and GL < 6 (e.g., 0% Greek Yogurt, Edamame, or Almonds + Berries).',
      });
    }

    // 5. Protein & fiber satiety
    if (avg7DayProtein < targets.minProtein || avg7DayFiber < targets.minFiber) {
      const proteinShortfall = Math.max(0, targets.minProtein - avg7DayProtein);
      const fiberShortfall = Math.max(0, targets.minFiber - avg7DayFiber);
      suggestions.push({
        id: 'sug-satiety',
        title: 'Boost Protein & Fiber Density to Sustain Deficit Satiety',
        category: 'Satiety & Macros',
        priority: 'medium',
        metricSummary: `Avg Protein: ${avg7DayProtein}g/${targets.minProtein}g · Avg Fiber: ${avg7DayFiber}g/${targets.minFiber}g`,
        rationale: `Shortfalls of ${proteinShortfall}g protein and ${fiberShortfall}g fiber increase hunger between meals while in a caloric deficit.`,
        actionStep:
          'Add 150g of chicken breast, cod, or tofu to lunch and 2 tbsp chia seeds or 1 cup raspberries to breakfast.',
      });
    }
  }

  const optimizedPlan = buildOptimizedDayPlan(targets, foods, snackSharePct);

  return {
    loggedDaysCount: allLogged.length,
    avg7DayCalories,
    prev7DayCalories,
    avg7DayDeficit,
    prev7DayDeficit,
    deficitTrendDelta,
    avg7DayGl,
    avg7DayNetCarbs,
    avg7DayProtein,
    avg7DayFiber,
    projectedWeeklyLossLbs,
    targetAdherenceRate,
    weekdayAvgCalories,
    weekendAvgCalories,
    snackSharePct,
    snackAvgGl,
    dailySeries,
    suggestions,
    smartSwaps: smartSwaps.slice(0, 4),
    optimizedPlan,
  };
}
