import {
  FoodItem,
  GlucoseContext,
  GlucoseReading,
  MealEntry,
  MealType,
  WaterEntry,
} from '../types/nutrition';
import { addDays, buildMealEntryFromFood, toLocalDateString } from '../utils/nutritionMath';

interface SeedSlot {
  mealType: MealType;
  time: string;
  foodId: string;
  servings: number;
}

interface SeedGlucose {
  time: string;
  valueMgDl: number;
  context: GlucoseContext;
  note?: string;
}

interface DayTemplate {
  meals: SeedSlot[];
  glucose: SeedGlucose[];
}

export function generateSeedHistory(foods: FoodItem[]): {
  meals: MealEntry[];
  glucoseReadings: GlucoseReading[];
  waterEntries: WaterEntry[];
} {
  const byId = new Map(foods.map((f) => [f.id, f]));
  const today = toLocalDateString();

  const templates: DayTemplate[] = [
    // Day -13: Higher carb breakfast + white rice dinner (smaller deficit, higher glucose)
    {
      meals: [
        { mealType: 'Breakfast', time: '08:15', foodId: 'food-bagel-plain', servings: 1 },
        { mealType: 'Breakfast', time: '08:20', foodId: 'food-oat-latte-sweet', servings: 1 },
        { mealType: 'Lunch', time: '12:45', foodId: 'food-chicken-breast', servings: 1 },
        { mealType: 'Lunch', time: '12:45', foodId: 'food-brown-rice', servings: 1 },
        { mealType: 'Lunch', time: '12:45', foodId: 'food-broccoli', servings: 1 },
        { mealType: 'Snack', time: '15:50', foodId: 'food-granola-bar-sweet', servings: 1 },
        { mealType: 'Dinner', time: '19:10', foodId: 'food-salmon-atlantic', servings: 1 },
        { mealType: 'Dinner', time: '19:10', foodId: 'food-white-rice', servings: 1.25 },
        { mealType: 'Dinner', time: '19:10', foodId: 'food-asparagus', servings: 1 },
      ],
      glucose: [
        { time: '07:45', valueMgDl: 102, context: 'Fasting' },
        { time: '10:20', valueMgDl: 154, context: 'Post-Meal (2h)', note: 'Bagel + sweet oat latte' },
        { time: '21:15', valueMgDl: 148, context: 'Post-Meal (2h)', note: 'White rice dinner' },
      ],
    },
    // Day -12
    {
      meals: [
        { mealType: 'Breakfast', time: '08:00', foodId: 'food-veggie-omelette', servings: 1 },
        { mealType: 'Breakfast', time: '08:00', foodId: 'food-sourdough-bread', servings: 1 },
        { mealType: 'Lunch', time: '13:00', foodId: 'food-mediterranean-bowl', servings: 1 },
        { mealType: 'Snack', time: '16:15', foodId: 'food-pretzels', servings: 1 },
        { mealType: 'Snack', time: '16:20', foodId: 'food-apple-honeycrisp', servings: 1 },
        { mealType: 'Dinner', time: '19:30', foodId: 'food-ramen-bowl', servings: 1 },
      ],
      glucose: [
        { time: '07:30', valueMgDl: 98, context: 'Fasting' },
        { time: '21:30', valueMgDl: 158, context: 'Post-Meal (2h)', note: 'Restaurant ramen' },
      ],
    },
    // Day -11
    {
      meals: [
        { mealType: 'Breakfast', time: '08:10', foodId: 'food-steel-cut-oats', servings: 1 },
        { mealType: 'Breakfast', time: '08:10', foodId: 'food-blueberries', servings: 1 },
        { mealType: 'Breakfast', time: '08:10', foodId: 'food-eggs-boiled', servings: 1 },
        { mealType: 'Lunch', time: '12:30', foodId: 'food-turkey-lettuce-wrap', servings: 1 },
        { mealType: 'Lunch', time: '12:30', foodId: 'food-lentil-soup', servings: 1 },
        { mealType: 'Snack', time: '15:40', foodId: 'food-greek-yogurt', servings: 1 },
        { mealType: 'Snack', time: '15:40', foodId: 'food-almonds', servings: 1 },
        { mealType: 'Dinner', time: '19:00', foodId: 'food-cod-fillet', servings: 1 },
        { mealType: 'Dinner', time: '19:00', foodId: 'food-sweet-potato', servings: 1 },
        { mealType: 'Dinner', time: '19:00', foodId: 'food-brussels-sprouts', servings: 1 },
      ],
      glucose: [
        { time: '07:40', valueMgDl: 94, context: 'Fasting' },
        { time: '10:15', valueMgDl: 124, context: 'Post-Meal (2h)' },
        { time: '21:00', valueMgDl: 128, context: 'Post-Meal (2h)' },
      ],
    },
    // Day -10
    {
      meals: [
        { mealType: 'Breakfast', time: '08:30', foodId: 'food-chia-yogurt-parfait', servings: 1 },
        { mealType: 'Breakfast', time: '08:30', foodId: 'food-black-coffee', servings: 1 },
        { mealType: 'Lunch', time: '12:50', foodId: 'food-tuna-olive', servings: 1 },
        { mealType: 'Lunch', time: '12:50', foodId: 'food-mixed-greens', servings: 1.5 },
        { mealType: 'Lunch', time: '12:50', foodId: 'food-olive-oil', servings: 1 },
        { mealType: 'Lunch', time: '12:50', foodId: 'food-chickpeas', servings: 1 },
        { mealType: 'Snack', time: '16:30', foodId: 'food-granola-bar-sweet', servings: 1 },
        { mealType: 'Snack', time: '20:45', foodId: 'food-chocolate-chip-cookie', servings: 1 },
        { mealType: 'Dinner', time: '19:00', foodId: 'food-stirfry-tofu', servings: 1 },
        { mealType: 'Dinner', time: '19:00', foodId: 'food-brown-rice', servings: 1 },
      ],
      glucose: [
        { time: '07:55', valueMgDl: 97, context: 'Fasting' },
        { time: '18:45', valueMgDl: 112, context: 'Pre-Meal' },
        { time: '22:15', valueMgDl: 146, context: 'Bedtime', note: 'Evening cookie' },
      ],
    },
    // Day -9
    {
      meals: [
        { mealType: 'Breakfast', time: '08:05', foodId: 'food-veggie-omelette', servings: 1 },
        { mealType: 'Breakfast', time: '08:05', foodId: 'food-ezekiel-toast', servings: 1 },
        { mealType: 'Lunch', time: '12:40', foodId: 'food-mediterranean-bowl', servings: 1 },
        { mealType: 'Snack', time: '16:00', foodId: 'food-cottage-cheese', servings: 1 },
        { mealType: 'Snack', time: '16:00', foodId: 'food-strawberries', servings: 1 },
        { mealType: 'Dinner', time: '18:55', foodId: 'food-salmon-greens-plate', servings: 1 },
        { mealType: 'Dinner', time: '18:55', foodId: 'food-quinoa', servings: 1 },
      ],
      glucose: [
        { time: '07:35', valueMgDl: 93, context: 'Fasting' },
        { time: '20:55', valueMgDl: 121, context: 'Post-Meal (2h)' },
      ],
    },
    // Day -8 (Weekend higher intake)
    {
      meals: [
        { mealType: 'Breakfast', time: '09:15', foodId: 'food-bagel-plain', servings: 1 },
        { mealType: 'Breakfast', time: '09:15', foodId: 'food-eggs-boiled', servings: 1 },
        { mealType: 'Breakfast', time: '09:20', foodId: 'food-oat-latte-sweet', servings: 1 },
        { mealType: 'Lunch', time: '13:30', foodId: 'food-chicken-breast', servings: 1 },
        { mealType: 'Lunch', time: '13:30', foodId: 'food-quinoa', servings: 1 },
        { mealType: 'Lunch', time: '13:30', foodId: 'food-avocado', servings: 1 },
        { mealType: 'Snack', time: '16:40', foodId: 'food-pretzels', servings: 1 },
        { mealType: 'Dinner', time: '19:45', foodId: 'food-salmon-atlantic', servings: 1.25 },
        { mealType: 'Dinner', time: '19:45', foodId: 'food-white-rice', servings: 1 },
        { mealType: 'Dinner', time: '19:45', foodId: 'food-broccoli', servings: 1 },
      ],
      glucose: [
        { time: '08:40', valueMgDl: 101, context: 'Fasting' },
        { time: '11:20', valueMgDl: 151, context: 'Post-Meal (2h)' },
        { time: '21:50', valueMgDl: 142, context: 'Post-Meal (2h)' },
      ],
    },
    // Day -7
    {
      meals: [
        { mealType: 'Breakfast', time: '09:00', foodId: 'food-chia-yogurt-parfait', servings: 1 },
        { mealType: 'Breakfast', time: '09:00', foodId: 'food-walnuts', servings: 1 },
        { mealType: 'Lunch', time: '13:15', foodId: 'food-lentil-soup', servings: 1.5 },
        { mealType: 'Lunch', time: '13:15', foodId: 'food-feta-cheese', servings: 1 },
        { mealType: 'Snack', time: '16:15', foodId: 'food-hummus', servings: 1 },
        { mealType: 'Snack', time: '16:15', foodId: 'food-bell-peppers', servings: 1 },
        { mealType: 'Dinner', time: '19:15', foodId: 'food-chicken-breast', servings: 1.25 },
        { mealType: 'Dinner', time: '19:15', foodId: 'food-sweet-potato', servings: 1 },
        { mealType: 'Dinner', time: '19:15', foodId: 'food-spinach-sauteed', servings: 1 },
      ],
      glucose: [
        { time: '08:30', valueMgDl: 95, context: 'Fasting' },
        { time: '21:15', valueMgDl: 126, context: 'Post-Meal (2h)' },
      ],
    },
    // Day -6 (Week 2 begins — tighter control)
    {
      meals: [
        { mealType: 'Breakfast', time: '07:55', foodId: 'food-veggie-omelette', servings: 1 },
        { mealType: 'Breakfast', time: '07:55', foodId: 'food-ezekiel-toast', servings: 1 },
        { mealType: 'Breakfast', time: '07:55', foodId: 'food-black-coffee', servings: 1 },
        { mealType: 'Lunch', time: '12:25', foodId: 'food-mediterranean-bowl', servings: 1 },
        { mealType: 'Snack', time: '15:45', foodId: 'food-edamame', servings: 1 },
        { mealType: 'Dinner', time: '18:50', foodId: 'food-salmon-greens-plate', servings: 1 },
        { mealType: 'Dinner', time: '18:50', foodId: 'food-lentils-cooked', servings: 0.75 },
      ],
      glucose: [
        { time: '07:30', valueMgDl: 91, context: 'Fasting' },
        { time: '14:25', valueMgDl: 118, context: 'Post-Meal (2h)' },
        { time: '20:50', valueMgDl: 116, context: 'Post-Meal (2h)' },
      ],
    },
    // Day -5
    {
      meals: [
        { mealType: 'Breakfast', time: '08:05', foodId: 'food-chia-yogurt-parfait', servings: 1 },
        { mealType: 'Breakfast', time: '08:05', foodId: 'food-eggs-boiled', servings: 1 },
        { mealType: 'Lunch', time: '12:45', foodId: 'food-turkey-lettuce-wrap', servings: 1 },
        { mealType: 'Lunch', time: '12:45', foodId: 'food-barley-pearl', servings: 1 },
        { mealType: 'Snack', time: '16:10', foodId: 'food-granola-bar-sweet', servings: 1 },
        { mealType: 'Snack', time: '16:15', foodId: 'food-whey-shake', servings: 1 },
        { mealType: 'Dinner', time: '19:15', foodId: 'food-cod-fillet', servings: 1.25 },
        { mealType: 'Dinner', time: '19:15', foodId: 'food-cauliflower-rice', servings: 1 },
        { mealType: 'Dinner', time: '19:15', foodId: 'food-avocado', servings: 1 },
      ],
      glucose: [
        { time: '07:35', valueMgDl: 90, context: 'Fasting' },
        { time: '18:10', valueMgDl: 131, context: 'Post-Meal (2h)', note: 'Granola bar snack' },
        { time: '21:15', valueMgDl: 114, context: 'Post-Meal (2h)' },
      ],
    },
    // Day -4
    {
      meals: [
        { mealType: 'Breakfast', time: '08:15', foodId: 'food-steel-cut-oats', servings: 1 },
        { mealType: 'Breakfast', time: '08:15', foodId: 'food-chia-seeds', servings: 0.5 },
        { mealType: 'Breakfast', time: '08:15', foodId: 'food-greek-yogurt', servings: 1 },
        { mealType: 'Lunch', time: '12:30', foodId: 'food-chicken-breast', servings: 1 },
        { mealType: 'Lunch', time: '12:30', foodId: 'food-mixed-greens', servings: 1.5 },
        { mealType: 'Lunch', time: '12:30', foodId: 'food-chickpeas', servings: 1 },
        { mealType: 'Lunch', time: '12:30', foodId: 'food-olive-oil', servings: 1 },
        { mealType: 'Snack', time: '16:00', foodId: 'food-apple-honeycrisp', servings: 1 },
        { mealType: 'Snack', time: '16:00', foodId: 'food-peanut-butter', servings: 1 },
        { mealType: 'Dinner', time: '19:00', foodId: 'food-stirfry-tofu', servings: 1 },
        { mealType: 'Dinner', time: '19:00', foodId: 'food-edamame', servings: 0.75 },
      ],
      glucose: [
        { time: '07:45', valueMgDl: 89, context: 'Fasting' },
        { time: '10:20', valueMgDl: 122, context: 'Post-Meal (2h)' },
        { time: '21:00', valueMgDl: 115, context: 'Post-Meal (2h)' },
      ],
    },
    // Day -3
    {
      meals: [
        { mealType: 'Breakfast', time: '08:00', foodId: 'food-veggie-omelette', servings: 1 },
        { mealType: 'Breakfast', time: '08:00', foodId: 'food-sourdough-bread', servings: 1 },
        { mealType: 'Breakfast', time: '08:00', foodId: 'food-grapefruit', servings: 1 },
        { mealType: 'Lunch', time: '12:35', foodId: 'food-mediterranean-bowl', servings: 1 },
        { mealType: 'Snack', time: '15:50', foodId: 'food-cottage-cheese', servings: 1 },
        { mealType: 'Snack', time: '15:50', foodId: 'food-raspberries', servings: 1 },
        { mealType: 'Dinner', time: '19:05', foodId: 'food-salmon-greens-plate', servings: 1 },
        { mealType: 'Dinner', time: '19:05', foodId: 'food-brussels-sprouts', servings: 1 },
      ],
      glucose: [
        { time: '07:25', valueMgDl: 88, context: 'Fasting' },
        { time: '14:35', valueMgDl: 119, context: 'Post-Meal (2h)' },
        { time: '21:05', valueMgDl: 112, context: 'Post-Meal (2h)' },
      ],
    },
    // Day -2 (Weekend spike day)
    {
      meals: [
        { mealType: 'Breakfast', time: '09:10', foodId: 'food-oat-latte-sweet', servings: 1 },
        { mealType: 'Breakfast', time: '09:10', foodId: 'food-veggie-omelette', servings: 1 },
        { mealType: 'Lunch', time: '13:15', foodId: 'food-ramen-bowl', servings: 1 },
        { mealType: 'Snack', time: '16:30', foodId: 'food-chocolate-chip-cookie', servings: 1 },
        { mealType: 'Dinner', time: '19:45', foodId: 'food-chicken-breast', servings: 1 },
        { mealType: 'Dinner', time: '19:45', foodId: 'food-quinoa', servings: 1 },
        { mealType: 'Dinner', time: '19:45', foodId: 'food-broccoli', servings: 1 },
      ],
      glucose: [
        { time: '08:30', valueMgDl: 94, context: 'Fasting' },
        { time: '15:15', valueMgDl: 156, context: 'Post-Meal (2h)', note: 'Ramen lunch' },
        { time: '18:30', valueMgDl: 145, context: 'Pre-Meal', note: 'Afternoon cookie' },
      ],
    },
    // Day -1 (Yesterday)
    {
      meals: [
        { mealType: 'Breakfast', time: '08:05', foodId: 'food-chia-yogurt-parfait', servings: 1 },
        { mealType: 'Breakfast', time: '08:05', foodId: 'food-eggs-boiled', servings: 1 },
        { mealType: 'Lunch', time: '12:30', foodId: 'food-mediterranean-bowl', servings: 1 },
        { mealType: 'Lunch', time: '12:30', foodId: 'food-green-tea', servings: 1 },
        { mealType: 'Snack', time: '15:45', foodId: 'food-almonds', servings: 1 },
        { mealType: 'Snack', time: '15:45', foodId: 'food-strawberries', servings: 1 },
        { mealType: 'Dinner', time: '18:55', foodId: 'food-salmon-greens-plate', servings: 1 },
        { mealType: 'Dinner', time: '18:55', foodId: 'food-lentils-cooked', servings: 0.75 },
      ],
      glucose: [
        { time: '07:35', valueMgDl: 90, context: 'Fasting' },
        { time: '14:30', valueMgDl: 117, context: 'Post-Meal (2h)' },
        { time: '20:55', valueMgDl: 115, context: 'Post-Meal (2h)' },
      ],
    },
    // Day 0 (Today — Breakfast & Lunch logged, ready for Dinner/Snack)
    {
      meals: [
        { mealType: 'Breakfast', time: '08:00', foodId: 'food-veggie-omelette', servings: 1 },
        { mealType: 'Breakfast', time: '08:00', foodId: 'food-ezekiel-toast', servings: 1 },
        { mealType: 'Breakfast', time: '08:05', foodId: 'food-blueberries', servings: 1 },
        { mealType: 'Breakfast', time: '08:05', foodId: 'food-black-coffee', servings: 1 },
        { mealType: 'Lunch', time: '12:30', foodId: 'food-mediterranean-bowl', servings: 1 },
        { mealType: 'Lunch', time: '12:35', foodId: 'food-mixed-greens', servings: 1 },
      ],
      glucose: [
        { time: '07:30', valueMgDl: 89, context: 'Fasting' },
        { time: '10:05', valueMgDl: 118, context: 'Post-Meal (2h)', note: 'Omelette & sprouted toast' },
        { time: '14:35', valueMgDl: 121, context: 'Post-Meal (2h)', note: 'Mediterranean chicken bowl' },
      ],
    },
  ];

  const meals: MealEntry[] = [];
  const glucoseReadings: GlucoseReading[] = [];
  const waterEntries: WaterEntry[] = [];

  templates.forEach((tpl, idx) => {
    const offset = idx - (templates.length - 1); // -13 .. 0
    const dateStr = addDays(today, offset);

    tpl.meals.forEach((slot, mIdx) => {
      const food = byId.get(slot.foodId);
      if (!food) return;
      meals.push(
        buildMealEntryFromFood(food, {
          date: dateStr,
          time: slot.time,
          mealType: slot.mealType,
          servings: slot.servings,
          id: `seed-meal-${dateStr}-${mIdx}`,
        })
      );
    });

    tpl.glucose.forEach((g, gIdx) => {
      glucoseReadings.push({
        id: `seed-glu-${dateStr}-${gIdx}`,
        date: dateStr,
        time: g.time,
        valueMgDl: g.valueMgDl,
        context: g.context,
        note: g.note,
      });
    });

    const dayWaterSlots =
      offset === 0
        ? [
            { time: '07:45', amountMl: 500 },
            { time: '10:30', amountMl: 500 },
            { time: '13:15', amountMl: 500 },
          ]
        : [
            { time: '08:00', amountMl: 500 },
            { time: '12:00', amountMl: 600 },
            { time: '15:30', amountMl: 600 },
            { time: '19:30', amountMl: idx % 2 === 0 ? 750 : 500 },
          ];

    dayWaterSlots.forEach((w, wIdx) => {
      waterEntries.push({
        id: `seed-water-${dateStr}-${wIdx}`,
        date: dateStr,
        time: w.time,
        amountMl: w.amountMl,
      });
    });
  });

  return { meals, glucoseReadings, waterEntries };
}
