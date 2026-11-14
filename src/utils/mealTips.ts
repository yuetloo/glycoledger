import {
  DailyTargets,
  FoodItem,
  MealEntry,
  MealType,
} from '../types/nutrition';
import { computeFoodGlycemicLoad } from './nutritionMath';

export interface MealTip {
  id: string;
  title: string;
  severity: 'high' | 'medium';
  metric: string;
  reason: string;
  action: string;
}

export interface MealSwapSuggestion {
  entryId: string;
  entryName: string;
  replacementFood: FoodItem;
  calorieDelta: number;
  glDelta: number;
  proteinDelta: number;
}

export interface MealImprovementReport {
  scope: 'entry' | 'slot';
  title: string;
  mealType: MealType;
  hasRoomForImprovement: boolean;
  calories: number;
  netCarbs: number;
  protein: number;
  fiber: number;
  sugar: number;
  fat: number;
  glycemicLoad: number;
  avgGi: number;
  tips: MealTip[];
  swaps: MealSwapSuggestion[];
  itemsSummary: string;
}

function findEntrySwap(
  entry: MealEntry,
  foods: FoodItem[]
): MealSwapSuggestion | null {
  const s = Math.max(0.1, entry.servings || 1);
  const loggedCalories = entry.calories / s;
  const loggedGl = entry.glycemicLoad / s;
  const loggedProtein = entry.protein / s;

  if (entry.gi < 56 && loggedGl < 12 && loggedCalories < 380) {
    return null;
  }

  const candidates = foods.filter((f) => {
    if (f.id === entry.foodId) return false;
    const fGl = computeFoodGlycemicLoad(f, 1);
    const improvesGl = fGl <= loggedGl - 5;
    const improvesCals = f.calories <= loggedCalories - 25;
    const goodProteinOrFiber = f.protein >= 10 || f.fiber >= 4;

    if (entry.mealType === 'Snack') {
      return (
        (f.tags.includes('snack') ||
          f.category === 'Dairy & Alternatives' ||
          f.category === 'Fruits' ||
          f.category === 'Fats & Nuts') &&
        improvesGl &&
        (improvesCals || f.protein >= 12)
      );
    }

    return f.gi <= 55 && improvesGl && (improvesCals || goodProteinOrFiber);
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const scoreA =
      (loggedCalories - a.calories) * 0.4 +
      (loggedGl - computeFoodGlycemicLoad(a, 1)) * 6 +
      a.protein * 2;
    const scoreB =
      (loggedCalories - b.calories) * 0.4 +
      (loggedGl - computeFoodGlycemicLoad(b, 1)) * 6 +
      b.protein * 2;
    return scoreB - scoreA;
  });

  const best = candidates[0];
  const bestGl = computeFoodGlycemicLoad(best, 1);

  return {
    entryId: entry.id,
    entryName: entry.foodName,
    replacementFood: best,
    calorieDelta: Math.round(best.calories - loggedCalories),
    glDelta: Math.round((bestGl - loggedGl) * 10) / 10,
    proteinDelta: Math.round((best.protein - loggedProtein) * 10) / 10,
  };
}

export function analyzeMealEntryTips(
  entry: MealEntry,
  foods: FoodItem[]
): MealImprovementReport {
  const tips: MealTip[] = [];

  if (entry.glycemicLoad >= 15 || (entry.gi >= 65 && entry.netCarbs >= 12)) {
    tips.push({
      id: `tip-entry-gl-${entry.id}`,
      title: 'High Glycemic Impact for a Single Item',
      severity: entry.glycemicLoad >= 20 ? 'high' : 'medium',
      metric: `GL ${entry.glycemicLoad} · GI ${entry.gi} · ${entry.netCarbs}g net carbs`,
      reason:
        'Rapidly digested starches or sugars raise post-meal blood glucose quickly and can trigger rebound hunger later.',
      action:
        'Eat fibrous greens or lean protein first, halve the starch portion, or swap to a lower-GI whole grain or legume.',
    });
  }

  if (entry.sugar >= 12 && entry.fiber < 3) {
    tips.push({
      id: `tip-entry-sugar-${entry.id}`,
      title: 'Unbuffered Simple Sugars',
      severity: 'high',
      metric: `${entry.sugar}g sugar · ${entry.fiber}g fiber`,
      reason:
        'Low fiber alongside high sugar allows glucose to enter the bloodstream rapidly with minimal satiety.',
      action:
        'Replace with berries + Greek yogurt, dark chocolate (85%), or unsweetened beverage alternatives.',
    });
  } else if (entry.netCarbs >= 22 && entry.fiber < 3) {
    tips.push({
      id: `tip-entry-fiber-${entry.id}`,
      title: 'Low Fiber-to-Carb Buffer',
      severity: 'medium',
      metric: `${entry.netCarbs}g net carbs · ${entry.fiber}g fiber`,
      reason:
        'Carbohydrate-rich foods with under 3g of fiber digest quickly and flatten satiety.',
      action:
        'Pair with 1–2 tbsp chia seeds, steamed broccoli, or leafy greens to add 5g+ soluble and insoluble fiber.',
    });
  }

  if (entry.calories >= 420 && entry.protein < 18) {
    tips.push({
      id: `tip-entry-cal-prot-${entry.id}`,
      title: 'High Calorie Density Relative to Protein',
      severity: 'medium',
      metric: `${entry.calories} kcal · ${entry.protein}g protein`,
      reason:
        'Calorie-dense meals low in protein make it harder to maintain a sustainable daily caloric deficit.',
      action:
        'Reduce portion by 25–33% (e.g., 0.75x) and anchor the plate with 20g+ lean protein such as chicken, fish, eggs, or tofu.',
    });
  }

  const swap = findEntrySwap(entry, foods);

  return {
    scope: 'entry',
    title: entry.foodName,
    mealType: entry.mealType,
    hasRoomForImprovement: tips.length > 0 || swap !== null,
    calories: entry.calories,
    netCarbs: entry.netCarbs,
    protein: entry.protein,
    fiber: entry.fiber,
    sugar: entry.sugar,
    fat: entry.fat,
    glycemicLoad: entry.glycemicLoad,
    avgGi: entry.gi,
    tips,
    swaps: swap ? [swap] : [],
    itemsSummary: `${entry.servings}x ${entry.foodName} (${entry.servingLabel}): ${entry.calories} kcal, ${entry.protein}g protein, ${entry.netCarbs}g net carbs, ${entry.fiber}g fiber, ${entry.sugar}g sugar, ${entry.fat}g fat, GI ${entry.gi}, GL ${entry.glycemicLoad}`,
  };
}

export function analyzeMealSlotTips(
  mealType: MealType,
  slotMeals: MealEntry[],
  targets: DailyTargets,
  foods: FoodItem[]
): MealImprovementReport {
  if (slotMeals.length === 0) {
    return {
      scope: 'slot',
      title: mealType,
      mealType,
      hasRoomForImprovement: false,
      calories: 0,
      netCarbs: 0,
      protein: 0,
      fiber: 0,
      sugar: 0,
      fat: 0,
      glycemicLoad: 0,
      avgGi: 0,
      tips: [],
      swaps: [],
      itemsSummary: '',
    };
  }

  const round1 = (n: number) => Math.round(n * 10) / 10;
  const calories = Math.round(slotMeals.reduce((s, m) => s + m.calories, 0));
  const protein = round1(slotMeals.reduce((s, m) => s + m.protein, 0));
  const fiber = round1(slotMeals.reduce((s, m) => s + m.fiber, 0));
  const netCarbs = round1(slotMeals.reduce((s, m) => s + m.netCarbs, 0));
  const sugar = round1(slotMeals.reduce((s, m) => s + m.sugar, 0));
  const fat = round1(slotMeals.reduce((s, m) => s + m.fat, 0));
  const glycemicLoad = round1(slotMeals.reduce((s, m) => s + m.glycemicLoad, 0));

  const giNumerator = slotMeals.reduce(
    (s, m) => s + m.gi * Math.max(0, m.netCarbs),
    0
  );
  const avgGi = netCarbs > 0 ? Math.round(giNumerator / netCarbs) : 0;

  const tips: MealTip[] = [];
  const glThreshold = mealType === 'Snack' ? 12 : 22;

  if (glycemicLoad >= glThreshold) {
    tips.push({
      id: `tip-slot-gl-${mealType}`,
      title: `${mealType} Glycemic Load Exceeds Ideal Window`,
      severity: glycemicLoad >= glThreshold + 8 ? 'high' : 'medium',
      metric: `Slot GL ${glycemicLoad} (Ideal < ${glThreshold}) · ${netCarbs}g net carbs`,
      reason: `A combined glycemic load of ${glycemicLoad} in one ${mealType.toLowerCase()} increases post-prandial glucose excursion risk.`,
      action:
        'Trim refined carbs in this meal, swap in a lower-GI alternative below, or take a 10–15 minute walk after eating.',
    });
  }

  if (mealType !== 'Snack' && calories >= 220 && protein < 20) {
    tips.push({
      id: `tip-slot-protein-${mealType}`,
      title: 'Low Protein Satiety Anchor',
      severity: 'medium',
      metric: `${protein}g protein out of ${calories} kcal`,
      reason:
        'Main meals under 20g protein tend to produce weaker GLP-1/PYY satiety signaling and increase mid-afternoon or late-night cravings.',
      action:
        'Add 15–25g lean protein (e.g., 2 eggs, 150g Greek yogurt, chicken breast, cod, or seared tofu) to stabilize hunger.',
    });
  }

  if (netCarbs >= 25 && fiber < 5) {
    tips.push({
      id: `tip-slot-fiber-${mealType}`,
      title: 'Add a Fiber Cushion to Blunt Glucose Rise',
      severity: 'medium',
      metric: `${fiber}g fiber vs. ${netCarbs}g net carbs`,
      reason:
        'Pairing carbohydrates with at least 5–8g of dietary fiber slows gastric emptying and moderates insulin demand.',
      action:
        'Start the meal with mixed greens or steamed non-starchy vegetables, or stir in chia seeds or berries.',
    });
  }

  if (sugar >= 16 && fiber < 4) {
    tips.push({
      id: `tip-slot-sugar-${mealType}`,
      title: 'Elevated Free Sugar Load',
      severity: 'high',
      metric: `${sugar}g sugar · ${fiber}g fiber`,
      reason:
        'Concentrated sugars with low fiber cause sharper glucose spikes and rapid energy crashes.',
      action:
        'Swap sweetened beverages or snacks for whole fruit, nuts, or protein-rich options.',
    });
  }

  const slotCalCap =
    mealType === 'Snack'
      ? Math.round(targets.targetCalories * 0.2)
      : Math.round(targets.targetCalories * 0.45);
  if (calories > slotCalCap) {
    tips.push({
      id: `tip-slot-cal-${mealType}`,
      title: `${mealType} Uses a Large Share of Daily Calorie Budget`,
      severity: 'medium',
      metric: `${calories} kcal (${Math.round(
        (calories / Math.max(1, targets.targetCalories)) * 100
      )}% of ${targets.targetCalories} kcal budget)`,
      reason:
        'Concentrating calories heavily in one slot leaves less room for balanced protein and micronutrients later in the day.',
      action:
        'Scale back calorie-dense sauces, oils, or starches by ~25% and bulk up meal volume with low-calorie vegetables.',
    });
  }

  const swaps: MealSwapSuggestion[] = [];
  for (const entry of slotMeals) {
    const swap = findEntrySwap(entry, foods);
    if (swap) swaps.push(swap);
  }

  const itemsSummary = slotMeals
    .map(
      (m) =>
        `${m.servings}x ${m.foodName} (${m.calories} kcal, ${m.protein}g protein, ${m.netCarbs}g net carbs, ${m.fiber}g fiber, ${m.fat}g fat, GI ${m.gi}, GL ${m.glycemicLoad})`
    )
    .join('; ');

  return {
    scope: 'slot',
    title: `${mealType} Slot`,
    mealType,
    hasRoomForImprovement: tips.length > 0 || swaps.length > 0,
    calories,
    netCarbs,
    protein,
    fiber,
    sugar,
    fat,
    glycemicLoad,
    avgGi,
    tips,
    swaps,
    itemsSummary,
  };
}
