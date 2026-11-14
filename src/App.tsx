import { useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  Database,
  Menu,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  X,
} from 'lucide-react';
import { AddCustomFoodModal } from './components/AddCustomFoodModal';
import { DailyOverviewView } from './components/DailyOverviewView';
import { DeficitTrendsView } from './components/DeficitTrendsView';
import { FoodDatabaseView } from './components/FoodDatabaseView';
import { LogGlucoseModal } from './components/LogGlucoseModal';
import { LogMealModal, LogMealMode } from './components/LogMealModal';
import { MealPlannerView } from './components/MealPlannerView';
import { TargetsSettingsView } from './components/TargetsSettingsView';
import { useNutritionStore } from './hooks/useNutritionStore';
import {
  FavoriteMeal,
  FoodItem,
  MealEntry,
  MealType,
  NavTab,
} from './types/nutrition';
import { analyzeDeficitTrends } from './utils/deficitAnalyzer';
import { computeDailySummary, toLocalDateString } from './utils/nutritionMath';

const NAV_ITEMS: { id: NavTab; label: string; icon: typeof CalendarDays }[] = [
  { id: 'overview', label: 'Daily Overview', icon: CalendarDays },
  { id: 'database', label: 'Food Database', icon: Database },
  { id: 'trends', label: 'Deficit & Trends', icon: TrendingDown },
  { id: 'planner', label: 'Meal Planner', icon: Sparkles },
  { id: 'targets', label: 'Targets & Data', icon: SlidersHorizontal },
];

export default function App() {
  const {
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
    toggleFavoriteFood,
    removeFavoriteMeal,
    addCustomFood,
    deleteCustomFood,
    applyOptimizedPlanToDate,
    updateTargets,
    resetToDemoBaseline,
    clearAllUserData,
  } = useNutritionStore();

  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    toLocalDateString()
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Modal states
  const [logMealOpen, setLogMealOpen] = useState(false);
  const [logMealInitialType, setLogMealInitialType] =
    useState<MealType>('Dinner');
  const [logMealInitialFood, setLogMealInitialFood] = useState<FoodItem | null>(
    null
  );
  const [logMealInitialMode, setLogMealInitialMode] =
    useState<LogMealMode>('search');
  const [logGlucoseOpen, setLogGlucoseOpen] = useState(false);
  const [addFoodOpen, setAddFoodOpen] = useState(false);

  const dayMeals = useMemo(
    () => meals.filter((m) => m.date === selectedDate),
    [meals, selectedDate]
  );

  const dayGlucose = useMemo(
    () => glucoseReadings.filter((g) => g.date === selectedDate),
    [glucoseReadings, selectedDate]
  );

  const dayWater = useMemo(
    () => waterEntries.filter((w) => w.date === selectedDate),
    [waterEntries, selectedDate]
  );

  const dailySummary = useMemo(
    () =>
      computeDailySummary(
        selectedDate,
        meals,
        glucoseReadings,
        targets,
        waterEntries
      ),
    [selectedDate, meals, glucoseReadings, targets, waterEntries]
  );

  const todaySummary = useMemo(
    () =>
      computeDailySummary(
        toLocalDateString(),
        meals,
        glucoseReadings,
        targets,
        waterEntries
      ),
    [meals, glucoseReadings, targets, waterEntries]
  );

  const trendAnalysis = useMemo(
    () => analyzeDeficitTrends(meals, glucoseReadings, targets, allFoods),
    [meals, glucoseReadings, targets, allFoods]
  );

  const openLogMeal = (
    mealType: MealType = 'Dinner',
    food: FoodItem | null = null,
    mode: LogMealMode = 'search'
  ) => {
    setLogMealInitialType(mealType);
    setLogMealInitialFood(food);
    setLogMealInitialMode(mode);
    setLogMealOpen(true);
  };

  const handleQuickAddFavorite = (fav: FavoriteMeal) => {
    const slot = fav.defaultMealType || 'Snack';
    const defaultTimes: Record<MealType, string> = {
      Breakfast: '08:15',
      Lunch: '12:30',
      Dinner: '19:00',
      Snack: '15:45',
    };
    addMealEntry(fav.food, {
      date: selectedDate,
      time: defaultTimes[slot],
      mealType: slot,
      servings: Math.max(0.1, fav.defaultServings || 1),
    });
  };

  const handleToggleFavoriteFromMeal = (entry: MealEntry) => {
    const matched = allFoods.find((f) => f.id === entry.foodId);
    if (matched) {
      toggleFavoriteFood(matched, {
        defaultServings: entry.servings,
        defaultMealType: entry.mealType,
      });
      return;
    }
    const s = Math.max(0.1, entry.servings || 1);
    const round1 = (n: number) => Math.round((n / s) * 10) / 10;
    const derivedFood: FoodItem = {
      id: entry.foodId,
      name: entry.foodName,
      category: entry.category,
      servingLabel: entry.servingLabel,
      servingGrams: 100,
      calories: Math.round(entry.calories / s),
      protein: round1(entry.protein),
      carbs: round1(entry.carbs),
      fiber: round1(entry.fiber),
      sugar: round1(entry.sugar),
      fat: round1(entry.fat),
      gi: entry.gi,
      tags: ['favorite-meal'],
      isCustom: true,
    };
    toggleFavoriteFood(derivedFood, {
      defaultServings: entry.servings,
      defaultMealType: entry.mealType,
    });
  };

  const activeNavLabel =
    NAV_ITEMS.find((n) => n.id === activeTab)?.label || 'Daily Overview';

  const handleNavClick = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-slate-200 z-30">
        <div className="h-16 px-5 flex items-center border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            GlycoLedger
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-50 text-teal-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-teal-700' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Quiet Sidebar Baseline Telemetry */}
        <div className="p-4 border-t border-slate-200 space-y-3 text-xs">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Today&apos;s Budget</span>
              <span className="font-mono tabular-nums font-medium text-slate-800">
                {todaySummary.calories} / {targets.targetCalories}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-700 transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      (todaySummary.calories /
                        Math.max(1, targets.targetCalories)) *
                        100
                    )
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-600">
            <span>7d Avg Deficit</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {trendAnalysis.avg7DayDeficit >= 0 ? '+' : ''}
              {trendAnalysis.avg7DayDeficit} kcal/d
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>7d Avg GL</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {trendAnalysis.avg7DayGl} / {targets.maxDailyGlycemicLoad}
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative w-64 max-w-full bg-white border-r border-slate-200 flex flex-col z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
              <span className="text-lg font-bold tracking-tight text-slate-900">
                GlycoLedger
              </span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700"
                aria-label="Close navigation menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-teal-50 text-teal-900'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-teal-700' : 'text-slate-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on Left, Primary Actions on Right */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-md"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="text-slate-500 hidden sm:inline">GlycoLedger</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="font-semibold text-slate-900 truncate">
                {activeNavLabel}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setLogGlucoseOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Activity className="w-3.5 h-3.5 text-slate-500" />
              Log Glucose
            </button>
            <button
              type="button"
              onClick={() => openLogMeal('Dinner', null)}
              className="px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
            >
              + Log Meal
            </button>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'overview' && (
            <DailyOverviewView
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              summary={dailySummary}
              dayMeals={dayMeals}
              dayGlucose={dayGlucose}
              dayWater={dayWater}
              foods={allFoods}
              favorites={favorites}
              targets={targets}
              analysis={trendAnalysis}
              onOpenLogMeal={(mealType, mode) =>
                openLogMeal(mealType, null, mode || 'search')
              }
              onOpenLogGlucose={() => setLogGlucoseOpen(true)}
              onUpdateServings={updateMealServings}
              onReplaceMeal={replaceMealEntry}
              onDeleteMeal={deleteMealEntry}
              onDeleteGlucose={deleteGlucoseReading}
              onQuickAddFavorite={handleQuickAddFavorite}
              onToggleFavoriteFromMeal={handleToggleFavoriteFromMeal}
              onAddWater={(amountMl) => addWaterEntry(amountMl, selectedDate)}
              onDeleteWater={deleteWaterEntry}
              onUpdateHydrationGoal={(goalMl) =>
                updateTargets({ ...targets, hydrationGoalMl: Math.max(500, goalMl) })
              }
              onClearDayMeals={clearDayMeals}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'database' && (
            <FoodDatabaseView
              foods={allFoods}
              favorites={favorites}
              onLogFood={(food) => openLogMeal('Lunch', food, 'search')}
              onToggleFavorite={(food) => toggleFavoriteFood(food)}
              onOpenAddCustomFood={() => setAddFoodOpen(true)}
              onDeleteCustomFood={deleteCustomFood}
            />
          )}

          {activeTab === 'trends' && (
            <DeficitTrendsView
              analysis={trendAnalysis}
              targets={targets}
              onSelectDateAndJump={(date) => {
                setSelectedDate(date);
                setActiveTab('overview');
              }}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'planner' && (
            <MealPlannerView
              analysis={trendAnalysis}
              targets={targets}
              selectedDate={selectedDate}
              onLogSwapFood={(food, mealType) => {
                addMealEntry(food, {
                  date: selectedDate,
                  time:
                    mealType === 'Breakfast'
                      ? '08:15'
                      : mealType === 'Lunch'
                      ? '12:30'
                      : mealType === 'Dinner'
                      ? '19:00'
                      : '15:45',
                  mealType,
                  servings: 1,
                });
              }}
              onApplyPlan={(replaceExisting) =>
                applyOptimizedPlanToDate(
                  trendAnalysis.optimizedPlan,
                  selectedDate,
                  replaceExisting
                )
              }
              onJumpToOverview={() => setActiveTab('overview')}
            />
          )}

          {activeTab === 'targets' && (
            <TargetsSettingsView
              targets={targets}
              meals={meals}
              glucoseReadings={glucoseReadings}
              waterEntries={waterEntries}
              customFoods={customFoods}
              onSaveTargets={updateTargets}
              onResetDemo={resetToDemoBaseline}
              onClearAll={clearAllUserData}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <LogMealModal
        isOpen={logMealOpen}
        onClose={() => setLogMealOpen(false)}
        foods={allFoods}
        favorites={favorites}
        selectedDate={selectedDate}
        initialMealType={logMealInitialType}
        initialFood={logMealInitialFood}
        initialMode={logMealInitialMode}
        onLogMeal={addMealEntry}
        onToggleFavorite={toggleFavoriteFood}
        onRemoveFavorite={removeFavoriteMeal}
      />

      <LogGlucoseModal
        isOpen={logGlucoseOpen}
        onClose={() => setLogGlucoseOpen(false)}
        selectedDate={selectedDate}
        unit={targets.glucoseUnit}
        onSave={addGlucoseReading}
      />

      <AddCustomFoodModal
        isOpen={addFoodOpen}
        onClose={() => setAddFoodOpen(false)}
        onAddFood={addCustomFood}
      />
    </div>
  );
}
