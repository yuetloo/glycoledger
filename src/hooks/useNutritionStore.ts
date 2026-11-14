import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_FOOD_DATABASE } from '../data/foodDatabase';
import { generateSeedHistory } from '../data/seedData';
import {
  DailyTargets,
  FavoriteMeal,
  FoodItem,
  GlucoseReading,
  MealEntry,
  MealType,
  OptimizedDayPlan,
  WaterEntry,
} from '../types/nutrition';
import { buildMealEntryFromFood, DEFAULT_TARGETS } from '../utils/nutritionMath';

const STORAGE_KEYS = {
  meals: 'glycoledger_meals_v1',
  glucose: 'glycoledger_glucose_v1',
  water: 'glycoledger_water_v1',
  favorites: 'glycoledger_favorites_v1',
  customFoods: 'glycoledger_custom_foods_v1',
  targets: 'glycoledger_targets_v1',
  seeded: 'glycoledger_seeded_v1',
  mmolMigrated: 'glycoledger_mmol_migrated_v1',
};

function buildStarterFavorites(): FavoriteMeal[] {
  const starterConfigs: { foodId: string; servings: number; mealType: MealType }[] = [
    { foodId: 'food-chia-yogurt-parfait', servings: 1, mealType: 'Breakfast' },
    { foodId: 'food-mediterranean-bowl', servings: 1, mealType: 'Lunch' },
    { foodId: 'food-salmon-greens-plate', servings: 1, mealType: 'Dinner' },
    { foodId: 'food-whey-shake', servings: 1, mealType: 'Snack' },
  ];

  const createdAt = new Date().toISOString();
  const list: FavoriteMeal[] = [];
  for (const cfg of starterConfigs) {
    const food = DEFAULT_FOOD_DATABASE.find((f) => f.id === cfg.foodId);
    if (food) {
      list.push({
        id: `fav-starter-${food.id}`,
        name: food.name,
        food,
        defaultServings: cfg.servings,
        defaultMealType: cfg.mealType,
        createdAt,
      });
    }
  }
  return list;
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function useNutritionStore() {
  const [customFoods, setCustomFoods] = useState<FoodItem[]>(() =>
    safeJsonParse<FoodItem[]>(localStorage.getItem(STORAGE_KEYS.customFoods), [])
  );

  const [targets, setTargets] = useState<DailyTargets>(() => {
    const loaded = safeJsonParse<DailyTargets>(
      localStorage.getItem(STORAGE_KEYS.targets),
      DEFAULT_TARGETS
    );
    const withHydration: DailyTargets = {
      ...DEFAULT_TARGETS,
      ...loaded,
      hydrationGoalMl: loaded.hydrationGoalMl ?? DEFAULT_TARGETS.hydrationGoalMl,
    };
    if (!localStorage.getItem(STORAGE_KEYS.mmolMigrated)) {
      localStorage.setItem(STORAGE_KEYS.mmolMigrated, 'true');
      return { ...withHydration, glucoseUnit: 'mmol/L' };
    }
    return withHydration;
  });

  const [meals, setMeals] = useState<MealEntry[]>(() => {
    const alreadySeeded = localStorage.getItem(STORAGE_KEYS.seeded);
    if (!alreadySeeded) {
      const seed = generateSeedHistory(DEFAULT_FOOD_DATABASE);
      localStorage.setItem(STORAGE_KEYS.meals, JSON.stringify(seed.meals));
      localStorage.setItem(
        STORAGE_KEYS.glucose,
        JSON.stringify(seed.glucoseReadings)
      );
      localStorage.setItem(
        STORAGE_KEYS.water,
        JSON.stringify(seed.waterEntries)
      );
      localStorage.setItem(STORAGE_KEYS.seeded, 'true');
      return seed.meals;
    }
    return safeJsonParse<MealEntry[]>(
      localStorage.getItem(STORAGE_KEYS.meals),
      []
    );
  });

  const [glucoseReadings, setGlucoseReadings] = useState<GlucoseReading[]>(() =>
    safeJsonParse<GlucoseReading[]>(
      localStorage.getItem(STORAGE_KEYS.glucose),
      []
    )
  );

  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.water);
    if (stored === null) {
      const seed = generateSeedHistory(DEFAULT_FOOD_DATABASE);
      localStorage.setItem(
        STORAGE_KEYS.water,
        JSON.stringify(seed.waterEntries)
      );
      return seed.waterEntries;
    }
    return safeJsonParse<WaterEntry[]>(stored, []);
  });

  const [favorites, setFavorites] = useState<FavoriteMeal[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.favorites);
    if (stored === null) {
      const starters = buildStarterFavorites();
      localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(starters));
      return starters;
    }
    return safeJsonParse<FavoriteMeal[]>(stored, []);
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.meals, JSON.stringify(meals));
  }, [meals]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.glucose,
      JSON.stringify(glucoseReadings)
    );
  }, [glucoseReadings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.water, JSON.stringify(waterEntries));
  }, [waterEntries]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.customFoods, JSON.stringify(customFoods));
  }, [customFoods]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.targets, JSON.stringify(targets));
  }, [targets]);

  const allFoods: FoodItem[] = [...customFoods, ...DEFAULT_FOOD_DATABASE];

  const addMealEntry = useCallback(
    (
      food: FoodItem,
      options: {
        date: string;
        time: string;
        mealType: MealEntry['mealType'];
        servings: number;
      }
    ) => {
      const entry = buildMealEntryFromFood(food, options);
      setMeals((prev) => [...prev, entry]);
      return entry;
    },
    []
  );

  const deleteMealEntry = useCallback((id: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const updateMealServings = useCallback(
    (id: string, newServings: number) => {
      setMeals((prev) =>
        prev.map((m) => {
          if (m.id !== id) return m;
          const ratio = Math.max(0.1, newServings) / Math.max(0.1, m.servings);
          const round1 = (n: number) => Math.round(n * 10) / 10;
          return {
            ...m,
            servings: Math.round(newServings * 100) / 100,
            calories: Math.round(m.calories * ratio),
            protein: round1(m.protein * ratio),
            carbs: round1(m.carbs * ratio),
            fiber: round1(m.fiber * ratio),
            netCarbs: round1(m.netCarbs * ratio),
            sugar: round1(m.sugar * ratio),
            fat: round1(m.fat * ratio),
            glycemicLoad: round1(m.glycemicLoad * ratio),
          };
        })
      );
    },
    []
  );

  const replaceMealEntry = useCallback(
    (entryId: string, replacementFood: FoodItem, servings = 1) => {
      setMeals((prev) =>
        prev.map((m) => {
          if (m.id !== entryId) return m;
          const replaced = buildMealEntryFromFood(replacementFood, {
            date: m.date,
            time: m.time,
            mealType: m.mealType,
            servings,
          });
          return {
            ...replaced,
            id: m.id,
          };
        })
      );
    },
    []
  );

  const clearDayMeals = useCallback((date: string) => {
    setMeals((prev) => prev.filter((m) => m.date !== date));
  }, []);

  const addGlucoseReading = useCallback(
    (reading: Omit<GlucoseReading, 'id'>) => {
      const newItem: GlucoseReading = {
        ...reading,
        id: `glu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      setGlucoseReadings((prev) => [...prev, newItem]);
      return newItem;
    },
    []
  );

  const deleteGlucoseReading = useCallback((id: string) => {
    setGlucoseReadings((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const addCustomFood = useCallback((food: Omit<FoodItem, 'id' | 'isCustom'>) => {
    const newFood: FoodItem = {
      ...food,
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      isCustom: true,
    };
    setCustomFoods((prev) => [newFood, ...prev]);
    return newFood;
  }, []);

  const deleteCustomFood = useCallback((id: string) => {
    setCustomFoods((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const applyOptimizedPlanToDate = useCallback(
    (plan: OptimizedDayPlan, date: string, replaceExisting: boolean) => {
      const generated: MealEntry[] = [];
      for (const slot of plan.slots) {
        for (const item of slot.items) {
          generated.push(
            buildMealEntryFromFood(item.food, {
              date,
              time: slot.time,
              mealType: slot.mealType,
              servings: item.servings,
            })
          );
        }
      }
      setMeals((prev) => {
        const base = replaceExisting
          ? prev.filter((m) => m.date !== date)
          : prev;
        return [...base, ...generated];
      });
    },
    []
  );

  const addWaterEntry = useCallback(
    (amountMl: number, date: string, time?: string) => {
      const now = new Date();
      const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      const newEntry: WaterEntry = {
        id: `water-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date,
        time: time || defaultTime,
        amountMl: Math.max(10, Math.round(amountMl)),
      };
      setWaterEntries((prev) => [...prev, newEntry]);
      return newEntry;
    },
    []
  );

  const deleteWaterEntry = useCallback((id: string) => {
    setWaterEntries((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const addFavoriteMeal = useCallback(
    (
      food: FoodItem,
      options?: {
        name?: string;
        defaultServings?: number;
        defaultMealType?: MealType;
      }
    ) => {
      const nextName = (options?.name || food.name).trim();
      setFavorites((prev) => {
        const existingIndex = prev.findIndex(
          (fav) =>
            fav.food.id === food.id ||
            fav.name.toLowerCase() === nextName.toLowerCase()
        );
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            name: nextName,
            food,
            defaultServings: options?.defaultServings ?? updated[existingIndex].defaultServings,
            defaultMealType: options?.defaultMealType ?? updated[existingIndex].defaultMealType,
          };
          return updated;
        }
        const created: FavoriteMeal = {
          id: `fav-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: nextName,
          food,
          defaultServings: Math.max(0.25, options?.defaultServings ?? 1),
          defaultMealType: options?.defaultMealType,
          createdAt: new Date().toISOString(),
        };
        return [created, ...prev];
      });
    },
    []
  );

  const toggleFavoriteFood = useCallback(
    (
      food: FoodItem,
      options?: {
        defaultServings?: number;
        defaultMealType?: MealType;
      }
    ) => {
      setFavorites((prev) => {
        const exists = prev.some(
          (fav) =>
            fav.food.id === food.id ||
            fav.name.toLowerCase() === food.name.toLowerCase()
        );
        if (exists) {
          return prev.filter(
            (fav) =>
              fav.food.id !== food.id &&
              fav.name.toLowerCase() !== food.name.toLowerCase()
          );
        }
        const created: FavoriteMeal = {
          id: `fav-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: food.name,
          food,
          defaultServings: Math.max(0.25, options?.defaultServings ?? 1),
          defaultMealType: options?.defaultMealType,
          createdAt: new Date().toISOString(),
        };
        return [created, ...prev];
      });
    },
    []
  );

  const removeFavoriteMeal = useCallback((id: string) => {
    setFavorites((prev) => prev.filter((fav) => fav.id !== id));
  }, []);

  const updateTargets = useCallback((next: DailyTargets) => {
    setTargets({
      ...next,
      targetCalories: Math.max(1000, next.maintenanceTdee - next.targetDeficit),
      hydrationGoalMl: Math.max(500, next.hydrationGoalMl || 2500),
    });
  }, []);

  const resetToDemoBaseline = useCallback(() => {
    const seed = generateSeedHistory(DEFAULT_FOOD_DATABASE);
    setMeals(seed.meals);
    setGlucoseReadings(seed.glucoseReadings);
    setWaterEntries(seed.waterEntries);
    setFavorites(buildStarterFavorites());
    setCustomFoods([]);
    setTargets(DEFAULT_TARGETS);
  }, []);

  const clearAllUserData = useCallback(() => {
    setMeals([]);
    setGlucoseReadings([]);
    setWaterEntries([]);
  }, []);

  return {
    allFoods,
    customFoods,
    meals,
    glucoseReadings,
    waterEntries,
    favorites,
    targets,
    addMealEntry,
    deleteMealEntry,
    updateMealServings,
    replaceMealEntry,
    clearDayMeals,
    addGlucoseReading,
    deleteGlucoseReading,
    addWaterEntry,
    deleteWaterEntry,
    addFavoriteMeal,
    toggleFavoriteFood,
    removeFavoriteMeal,
    addCustomFood,
    deleteCustomFood,
    applyOptimizedPlanToDate,
    updateTargets,
    resetToDemoBaseline,
    clearAllUserData,
  };
}
