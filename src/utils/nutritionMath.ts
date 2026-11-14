import {
  DailySummary,
  DailyTargets,
  FoodItem,
  GlucoseReading,
  MealEntry,
  MealType,
  WaterEntry,
} from '../types/nutrition';

export const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export const DEFAULT_TARGETS: DailyTargets = {
  maintenanceTdee: 2250,
  targetDeficit: 500,
  targetCalories: 1750,
  maxNetCarbs: 115,
  minProtein: 130,
  minFiber: 28,
  maxFat: 62,
  maxDailyGlycemicLoad: 80,
  fastingGlucoseMax: 100,
  postMealGlucoseMax: 140,
  glucoseUnit: 'mmol/L',
  hydrationGoalMl: 2500,
};

export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return toLocalDateString(dt);
}

export function formatReadableDate(dateStr: string): string {
  const today = toLocalDateString();
  const yesterday = addDays(today, -1);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${m}/${d}`;
}

export function computeFoodNetCarbs(food: Pick<FoodItem, 'carbs' | 'fiber'>): number {
  return Math.max(0, Math.round((food.carbs - food.fiber) * 10) / 10);
}

export function computeFoodGlycemicLoad(
  food: Pick<FoodItem, 'carbs' | 'fiber' | 'gi'>,
  servings = 1
): number {
  const netCarbs = computeFoodNetCarbs(food) * servings;
  return Math.round(((food.gi * netCarbs) / 100) * 10) / 10;
}

export function getGiClassification(gi: number): {
  label: string;
  tone: 'nominal' | 'caution' | 'alert';
} {
  if (gi <= 55) return { label: 'Low GI', tone: 'nominal' };
  if (gi <= 69) return { label: 'Medium GI', tone: 'caution' };
  return { label: 'High GI', tone: 'alert' };
}

export function getDailyGlClassification(gl: number, maxGl: number): {
  label: string;
  tone: 'nominal' | 'caution' | 'alert';
} {
  if (gl <= maxGl) return { label: 'Low Load', tone: 'nominal' };
  if (gl <= maxGl * 1.35) return { label: 'Moderate Load', tone: 'caution' };
  return { label: 'High Load', tone: 'alert' };
}

export function formatGlucose(valueMgDl: number, unit: 'mg/dL' | 'mmol/L'): string {
  if (unit === 'mmol/L') {
    return `${(valueMgDl / 18.0182).toFixed(1)} mmol/L`;
  }
  return `${Math.round(valueMgDl)} mg/dL`;
}

export function buildMealEntryFromFood(
  food: FoodItem,
  options: {
    date: string;
    time: string;
    mealType: MealType;
    servings: number;
    id?: string;
  }
): MealEntry {
  const servings = Math.max(0.1, Math.round(options.servings * 100) / 100);
  const netCarbs = computeFoodNetCarbs(food);
  const round1 = (n: number) => Math.round(n * 10) / 10;

  return {
    id:
      options.id ||
      `meal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: options.date,
    time: options.time,
    mealType: options.mealType,
    foodId: food.id,
    foodName: food.name,
    category: food.category,
    servings,
    servingLabel: food.servingLabel,
    calories: Math.round(food.calories * servings),
    protein: round1(food.protein * servings),
    carbs: round1(food.carbs * servings),
    fiber: round1(food.fiber * servings),
    netCarbs: round1(netCarbs * servings),
    sugar: round1(food.sugar * servings),
    fat: round1(food.fat * servings),
    gi: food.gi,
    glycemicLoad: computeFoodGlycemicLoad(food, servings),
  };
}

export function computeDailySummary(
  date: string,
  meals: MealEntry[],
  glucoseReadings: GlucoseReading[],
  targets: DailyTargets,
  waterEntries: WaterEntry[] = []
): DailySummary {
  const dayMeals = meals.filter((m) => m.date === date);
  const dayGlucose = glucoseReadings.filter((g) => g.date === date);
  const dayWaterMl = waterEntries
    .filter((w) => w.date === date)
    .reduce((acc, w) => acc + w.amountMl, 0);

  const mealBreakdown: DailySummary['mealBreakdown'] = {
    Breakfast: { calories: 0, netCarbs: 0, protein: 0, glycemicLoad: 0, count: 0 },
    Lunch: { calories: 0, netCarbs: 0, protein: 0, glycemicLoad: 0, count: 0 },
    Dinner: { calories: 0, netCarbs: 0, protein: 0, glycemicLoad: 0, count: 0 },
    Snack: { calories: 0, netCarbs: 0, protein: 0, glycemicLoad: 0, count: 0 },
  };

  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fiber = 0;
  let netCarbs = 0;
  let sugar = 0;
  let fat = 0;
  let glycemicLoad = 0;
  let weightedGiSum = 0;

  for (const m of dayMeals) {
    calories += m.calories;
    protein += m.protein;
    carbs += m.carbs;
    fiber += m.fiber;
    netCarbs += m.netCarbs;
    sugar += m.sugar;
    fat += m.fat;
    glycemicLoad += m.glycemicLoad;
    weightedGiSum += m.gi * Math.max(1, m.netCarbs);

    const slot = mealBreakdown[m.mealType];
    slot.calories += m.calories;
    slot.netCarbs += m.netCarbs;
    slot.protein += m.protein;
    slot.glycemicLoad += m.glycemicLoad;
    slot.count += 1;
  }

  for (const type of MEAL_TYPES) {
    const slot = mealBreakdown[type];
    slot.calories = Math.round(slot.calories);
    slot.netCarbs = Math.round(slot.netCarbs * 10) / 10;
    slot.protein = Math.round(slot.protein * 10) / 10;
    slot.glycemicLoad = Math.round(slot.glycemicLoad * 10) / 10;
  }

  const totalNetCarbWeight = dayMeals.reduce(
    (acc, m) => acc + Math.max(1, m.netCarbs),
    0
  );
  const avgGi =
    dayMeals.length > 0 ? Math.round(weightedGiSum / totalNetCarbWeight) : 0;

  const avgGlucose =
    dayGlucose.length > 0
      ? Math.round(
          dayGlucose.reduce((acc, g) => acc + g.valueMgDl, 0) / dayGlucose.length
        )
      : null;
  const peakGlucose =
    dayGlucose.length > 0
      ? Math.max(...dayGlucose.map((g) => g.valueMgDl))
      : null;

  const round1 = (n: number) => Math.round(n * 10) / 10;

  return {
    date,
    calories: Math.round(calories),
    protein: round1(protein),
    carbs: round1(carbs),
    fiber: round1(fiber),
    netCarbs: round1(netCarbs),
    sugar: round1(sugar),
    fat: round1(fat),
    glycemicLoad: round1(glycemicLoad),
    avgGi,
    deficit: Math.round(targets.maintenanceTdee - calories),
    remainingBudget: Math.round(targets.targetCalories - calories),
    mealBreakdown,
    avgGlucose,
    peakGlucose,
    glucoseCount: dayGlucose.length,
    entryCount: dayMeals.length,
    waterMl: Math.round(dayWaterMl),
  };
}

export function exportNutritionCsv(
  meals: MealEntry[],
  glucoseReadings: GlucoseReading[],
  targets?: DailyTargets,
  waterEntries: WaterEntry[] = []
): string {
  const lines: string[] = [
    'RecordType,Date,Time,MealOrContext,FoodOrNote,Servings,CaloriesKcal,ProteinG,NetCarbsG,FiberG,FatG,GlycemicIndex,GlycemicLoad,GlucoseMmolL',
  ];

  if (targets) {
    const today = toLocalDateString();
    const fastingDisplay =
      targets.glucoseUnit === 'mmol/L'
        ? (targets.fastingGlucoseMax / 18.0182).toFixed(1)
        : targets.fastingGlucoseMax;
    const postMealDisplay =
      targets.glucoseUnit === 'mmol/L'
        ? (targets.postMealGlucoseMax / 18.0182).toFixed(1)
        : targets.postMealGlucoseMax;

    const targetEntries: [string, string | number][] = [
      ['maintenanceTdee', targets.maintenanceTdee],
      ['targetDeficit', targets.targetDeficit],
      ['targetCalories', targets.targetCalories],
      ['maxNetCarbs', targets.maxNetCarbs],
      ['minProtein', targets.minProtein],
      ['minFiber', targets.minFiber],
      ['maxFat', targets.maxFat],
      ['maxDailyGlycemicLoad', targets.maxDailyGlycemicLoad],
      ['fastingGlucoseMax', fastingDisplay],
      ['postMealGlucoseMax', postMealDisplay],
      ['glucoseUnit', targets.glucoseUnit],
      ['hydrationGoalMl', targets.hydrationGoalMl ?? 2500],
    ];
    for (const [key, val] of targetEntries) {
      lines.push(
        ['TARGET', today, '', key, `"${String(val)}"`, '', '', '', '', '', '', '', '', ''].join(',')
      );
    }
  }

  const sortedMeals = [...meals].sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
  );
  for (const m of sortedMeals) {
    lines.push(
      [
        'MEAL',
        m.date,
        m.time,
        m.mealType,
        `"${m.foodName.replace(/"/g, '""')}"`,
        m.servings,
        m.calories,
        m.protein,
        m.netCarbs,
        m.fiber,
        m.fat,
        m.gi,
        m.glycemicLoad,
        '',
      ].join(',')
    );
  }

  const sortedGlucose = [...glucoseReadings].sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
  );
  for (const g of sortedGlucose) {
    lines.push(
      [
        'GLUCOSE',
        g.date,
        g.time,
        g.context,
        `"${(g.note || '').replace(/"/g, '""')}"`,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        (g.valueMgDl / 18.0182).toFixed(1),
      ].join(',')
    );
  }

  const sortedWater = [...waterEntries].sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
  );
  for (const w of sortedWater) {
    lines.push(
      [
        'WATER',
        w.date,
        w.time,
        'Hydration',
        `"${w.amountMl} mL"`,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ].join(',')
    );
  }

  return lines.join('\n');
}

export function exportNutritionJson(data: {
  targets: DailyTargets;
  meals: MealEntry[];
  glucoseReadings: GlucoseReading[];
  waterEntries?: WaterEntry[];
  customFoods?: FoodItem[];
}): string {
  const payload = {
    app: 'GlycoLedger',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    targets: data.targets,
    meals: [...data.meals].sort((a, b) =>
      `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
    ),
    glucoseReadings: [...data.glucoseReadings]
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
      .map((g) => ({
        ...g,
        valueMmolL: Number((g.valueMgDl / 18.0182).toFixed(1)),
      })),
    waterEntries: [...(data.waterEntries ?? [])].sort((a, b) =>
      `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
    ),
    customFoods: data.customFoods ?? [],
  };
  return JSON.stringify(payload, null, 2);
}
