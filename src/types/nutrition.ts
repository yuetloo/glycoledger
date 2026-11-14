export type FoodCategory =
  | 'Proteins'
  | 'Grains & Carbs'
  | 'Vegetables'
  | 'Fruits'
  | 'Dairy & Alternatives'
  | 'Fats & Nuts'
  | 'Prepared Meals'
  | 'Beverages';

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export type GlucoseContext = 'Fasting' | 'Pre-Meal' | 'Post-Meal (2h)' | 'Bedtime';

export type NavTab =
  | 'overview'
  | 'database'
  | 'trends'
  | 'planner'
  | 'targets';

export interface FoodItem {
  id: string;
  name: string;
  category: FoodCategory;
  servingLabel: string;
  servingGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fiber: number;
  sugar: number;
  fat: number;
  gi: number; // Glycemic Index (0-100)
  tags: string[];
  isCustom?: boolean;
}

export interface MealEntry {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  mealType: MealType;
  foodId: string;
  foodName: string;
  category: FoodCategory;
  servings: number;
  servingLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fiber: number;
  netCarbs: number;
  sugar: number;
  fat: number;
  gi: number;
  glycemicLoad: number;
}

export interface FavoriteMeal {
  id: string;
  name: string;
  food: FoodItem;
  defaultServings: number;
  defaultMealType?: MealType;
  createdAt: string;
}

export interface GlucoseReading {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  valueMgDl: number;
  context: GlucoseContext;
  note?: string;
}

export interface WaterEntry {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  amountMl: number;
}

export interface DailyTargets {
  maintenanceTdee: number;
  targetDeficit: number;
  targetCalories: number; // maintenanceTdee - targetDeficit
  maxNetCarbs: number;
  minProtein: number;
  minFiber: number;
  maxFat: number;
  maxDailyGlycemicLoad: number;
  fastingGlucoseMax: number;
  postMealGlucoseMax: number;
  glucoseUnit: 'mg/dL' | 'mmol/L';
  hydrationGoalMl: number;
}

export interface DailySummary {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fiber: number;
  netCarbs: number;
  sugar: number;
  fat: number;
  glycemicLoad: number;
  avgGi: number;
  deficit: number; // maintenanceTdee - calories
  remainingBudget: number; // targetCalories - calories
  mealBreakdown: Record<MealType, {
    calories: number;
    netCarbs: number;
    protein: number;
    glycemicLoad: number;
    count: number;
  }>;
  avgGlucose: number | null;
  peakGlucose: number | null;
  glucoseCount: number;
  entryCount: number;
  waterMl: number;
}

export type SuggestionPriority = 'high' | 'medium' | 'positive';

export interface MealSuggestion {
  id: string;
  title: string;
  category: 'Deficit Pace' | 'Glycemic Control' | 'Satiety & Macros' | 'Timing & Habits';
  priority: SuggestionPriority;
  metricSummary: string;
  rationale: string;
  actionStep: string;
}

export interface SmartFoodSwap {
  id: string;
  loggedFoodName: string;
  loggedMealType: MealType;
  occurrences: number;
  replacementFood: FoodItem;
  calorieSavingPerServing: number;
  glSavingPerServing: number;
  proteinDeltaPerServing: number;
}

export interface PlannedMealSlot {
  mealType: MealType;
  time: string;
  items: {
    food: FoodItem;
    servings: number;
    calories: number;
    netCarbs: number;
    protein: number;
    fiber: number;
    glycemicLoad: number;
  }[];
  slotCalories: number;
  slotGl: number;
  slotNetCarbs: number;
  slotProtein: number;
}

export interface OptimizedDayPlan {
  goalLabel: string;
  totalCalories: number;
  projectedDeficit: number;
  totalProtein: number;
  totalNetCarbs: number;
  totalFiber: number;
  totalFat: number;
  totalGlycemicLoad: number;
  slots: PlannedMealSlot[];
}

export interface DeficitTrendAnalysis {
  loggedDaysCount: number;
  avg7DayCalories: number;
  prev7DayCalories: number;
  avg7DayDeficit: number;
  prev7DayDeficit: number;
  deficitTrendDelta: number; // positive means deficit improved/widened
  avg7DayGl: number;
  avg7DayNetCarbs: number;
  avg7DayProtein: number;
  avg7DayFiber: number;
  projectedWeeklyLossLbs: number;
  targetAdherenceRate: number; // % of logged days within +/- 10% of targetCalories
  weekdayAvgCalories: number;
  weekendAvgCalories: number;
  snackSharePct: number;
  snackAvgGl: number;
  dailySeries: {
    date: string;
    shortLabel: string;
    calories: number;
    deficit: number;
    glycemicLoad: number;
    netCarbs: number;
    protein: number;
    avgGlucose: number | null;
    peakGlucose: number | null;
    hasData: boolean;
  }[];
  suggestions: MealSuggestion[];
  smartSwaps: SmartFoodSwap[];
  optimizedPlan: OptimizedDayPlan;
}
