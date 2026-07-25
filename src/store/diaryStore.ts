import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DailyGoals, LoggedFood, MealType, FoodItem, Macros, Recipe, RecipeIngredient, SavedMeal, SavedMealItem } from '../types/diary';
import { diaryService } from '../services/diaryService';
import { workoutService } from '../services/workoutService';
import { db } from '../utils/db';

const getTodayString = () => new Date().toISOString().split('T')[0];

interface DiaryStore {
  selectedDate: string;
  goals: DailyGoals;
  logs: Record<string, LoggedFood[]>;
  waterIntakeMl: Record<string, number>;
  stepsCount: Record<string, number>;
  exerciseCalories: number;
  weightLogs: { date: string; weight: number }[];
  recipes: Recipe[];
  savedMeals: SavedMeal[];
  userCustomPortions: Record<string, number>;
  isLoadingLogs: boolean;
  isLoadingGoals: boolean;
  isLoadingWeightLogs: boolean;
  isLoadingRecipes: boolean;
  isLoadingSavedMeals: boolean;
  isOffline: boolean;
  deferredPrompt: any;

  // Actions
  setSelectedDate: (date: string) => void;
  setIsOffline: (status: boolean) => void;
  setDeferredPrompt: (prompt: any) => void;
  syncOfflineQueue: () => Promise<void>;
  fetchGoals: (userId: string) => Promise<void>;
  fetchLogsForDate: (userId: string, date: string) => Promise<void>;
  fetchExerciseCalories: (userId: string, date: string) => Promise<void>;
  fetchUserCustomPortions: (userId: string) => Promise<void>;
  setUserCustomPortion: (userId: string, foodId: string, portionWeightG: number) => Promise<void>;
  addFoodLog: (userId: string, date: string, food: FoodItem, mealType: MealType, servings?: number) => Promise<void>;
  updateFoodLog: (date: string, logId: string, mealType: MealType, foodName: string, calories: number, carbs: number, fat: number, protein: number, servings?: number, servingSizeDisplay?: string, brand?: string, healthScore?: number) => Promise<void>;
  removeFoodLog: (date: string, logId: string) => Promise<void>;
  updateWaterIntake: (userId: string, date: string, amountMl: number) => Promise<void>;
  incrementWaterIntake: (userId: string, date: string, amountMl: number) => Promise<void>;
  updateGoals: (userId: string, newGoals: Partial<DailyGoals>) => Promise<void>;
  fetchWeightLogs: (userId: string) => Promise<void>;
  logWeight: (userId: string, date: string, weight: number) => Promise<void>;
  deleteWeight: (userId: string, date: string) => Promise<void>;
  fetchRecipes: (userId: string) => Promise<void>;
  createRecipe: (userId: string, name: string, servings: number, ingredients: Omit<RecipeIngredient, 'id' | 'recipe_id'>[]) => Promise<Recipe | null>;
  deleteRecipe: (recipeId: string) => Promise<void>;
  fetchSavedMeals: (userId: string) => Promise<void>;
  createSavedMeal: (userId: string, name: string, items: Omit<SavedMealItem, 'id' | 'saved_meal_id'>[]) => Promise<SavedMeal | null>;
  deleteSavedMeal: (mealId: string) => Promise<void>;
  resetToDefaults: () => void;

  // Computed helper getters
  getTotalsForDate: (date: string) => { calories: number; macros: Macros };
  getMealTotals: (date: string, mealType: MealType) => { calories: number; macros: Macros };
}

const DEFAULT_GOALS: DailyGoals = {
  calories: 2200,
  carbs: 250,   // grams
  fat: 70,      // grams
  protein: 150, // grams
  waterMl: 2000,
  steps: 10000,
};

export const useDiaryStore = create<DiaryStore>()(
  persist(
    (set, get) => ({
      selectedDate: getTodayString(),
      goals: DEFAULT_GOALS,
      logs: {},
      waterIntakeMl: {
        [getTodayString()]: 1750,
      },
      stepsCount: {
        [getTodayString()]: 7420,
      },
      exerciseCalories: 320,
      weightLogs: [],
      recipes: [],
      savedMeals: [],
      userCustomPortions: {},
      isLoadingLogs: false,
      isLoadingGoals: false,
      isLoadingWeightLogs: false,
      isLoadingRecipes: false,
      isLoadingSavedMeals: false,
      isOffline: !navigator.onLine,
      deferredPrompt: null,

      setSelectedDate: (date) => set({ selectedDate: date }),
      setIsOffline: (status) => set({ isOffline: status }),
      setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt }),

      fetchExerciseCalories: async (userId, date) => {
        try {
          const calories = await workoutService.fetchTodayWorkoutCalories(userId, date);
          set({ exerciseCalories: calories });
        } catch (e) {
          console.error('Error fetching exercise calories:', e);
        }
      },

      syncOfflineQueue: async () => {
        const queue = await db.offlineQueue.orderBy('timestamp').toArray();
        if (queue.length === 0) return;

        console.log(`[Offline Sync] Flushing ${queue.length} actions to Supabase...`);
        const offlineIdMap: Record<string, string> = {};

        for (const item of queue) {
          try {
            if (item.action === 'addFood') {
              const { userId, date, food, mealType, servings, offlineId } = item.payload;
              const dailyLog = await diaryService.fetchOrCreateDailyLog(userId, date);
              if (dailyLog && !dailyLog.id.startsWith('offline_')) {
                const calories = Math.round(food.calories * servings);
                const carbs = Math.round(food.macros.carbs * servings * 10) / 10;
                const fat = Math.round(food.macros.fat * servings * 10) / 10;
                const protein = Math.round(food.macros.protein * servings * 10) / 10;

                const newEntry = await diaryService.addFoodEntry(
                  dailyLog.id,
                  mealType,
                  food.name,
                  calories,
                  carbs,
                  fat,
                  protein
                );

                if (newEntry && offlineId) {
                  offlineIdMap[offlineId] = newEntry.logId;
                  await db.logs.delete(offlineId);
                  const mockFoodItem = {
                    name: newEntry.name,
                    calories: newEntry.calories,
                    macros: newEntry.macros,
                    servingSize: newEntry.servingSizeDisplay || '1 porzione',
                  };
                  await db.logs.put({
                    logId: newEntry.logId,
                    userId,
                    date,
                    foodItemJson: JSON.stringify(mockFoodItem),
                    mealType: newEntry.mealType,
                    servings: newEntry.servings || 1,
                  });
                }
              }
            } else if (item.action === 'removeFood') {
              const { logId } = item.payload;
              const targetId = offlineIdMap[logId] || logId;
              if (!targetId.startsWith('offline_')) {
                await diaryService.deleteFoodEntry(targetId);
              }
              await db.logs.delete(targetId);
            } else if (item.action === 'updateWater') {
              const { userId, date, amountMl } = item.payload;
              await diaryService.upsertWaterIntake(userId, date, amountMl);
            } else if (item.action === 'logWeight') {
              const { userId, date, weight } = item.payload;
              await diaryService.upsertWeightLog(userId, date, weight);
            } else if (item.action === 'deleteWeight') {
              const { userId, date } = item.payload;
              await diaryService.deleteWeightLog(userId, date);
            } else if (item.action === 'updateGoals') {
              const { userId, newGoals } = item.payload;
              await diaryService.updateProfileGoals(userId, newGoals);
            }

            if (item.id !== undefined) {
              await db.offlineQueue.delete(item.id);
            }
          } catch (err) {
            console.error('[Offline Sync] Sync failed for action:', item, err);
          }
        }
      },

      fetchGoals: async (userId) => {
        set({ isLoadingGoals: true });
        try {
          const dbGoals = await diaryService.fetchProfile(userId);
          if (dbGoals) {
            set((state) => ({
              goals: {
                ...state.goals,
                ...dbGoals,
              },
            }));
          }
        } catch (err) {
          console.error('Error in fetchGoals store action:', err);
        } finally {
          set({ isLoadingGoals: false });
        }
      },

      fetchLogsForDate: async (userId, date) => {
        set({ isLoadingLogs: true });
        try {
          const dailyLog = await diaryService.fetchOrCreateDailyLog(userId, date);
          let entries: LoggedFood[] = [];
          if (dailyLog) {
            entries = await diaryService.fetchFoodEntries(dailyLog.id);
          }
          const dbWater = await diaryService.fetchWaterIntake(userId, date);

          if (navigator.onLine && dailyLog && !dailyLog.id.startsWith('offline_')) {
            await db.logs.where({ userId, date }).delete();
            for (const entry of entries) {
              const sCount = entry.servings || 1;
              const mockFoodItem = {
                name: entry.name,
                calories: Math.round(entry.calories / sCount),
                macros: {
                  carbs: Math.round((entry.macros.carbs / sCount) * 10) / 10,
                  fat: Math.round((entry.macros.fat / sCount) * 10) / 10,
                  protein: Math.round((entry.macros.protein / sCount) * 10) / 10,
                },
                servingSize: entry.servingSizeDisplay || '1 porzione',
              };
              await db.logs.put({
                logId: entry.logId,
                userId,
                date,
                foodItemJson: JSON.stringify(mockFoodItem),
                mealType: entry.mealType,
                servings: sCount,
              });
            }
          }

          set((state) => ({
            logs: {
              ...state.logs,
              [date]: entries,
            },
            waterIntakeMl: {
              ...state.waterIntakeMl,
              [date]: dbWater,
            },
          }));

          // Fetch daily active calories burned from workouts
          await get().fetchExerciseCalories(userId, date);

        } catch (err) {
          console.error('Error in fetchLogsForDate store action:', err);
        } finally {
          set({ isLoadingLogs: false });
        }
      },

      addFoodLog: async (userId, date, food, mealType, servings = 1) => {
        set({ isLoadingLogs: true });
        try {
          const isOnline = navigator.onLine;
          const dailyLog = await diaryService.fetchOrCreateDailyLog(userId, date);
          if (dailyLog) {
            const calories = Math.round(food.calories * servings);
            const carbs = Math.round(food.macros.carbs * servings * 10) / 10;
            const fat = Math.round(food.macros.fat * servings * 10) / 10;
            const protein = Math.round(food.macros.protein * servings * 10) / 10;

            const newEntry = await diaryService.addFoodEntry(
              dailyLog.id,
              mealType,
              food.name,
              calories,
              carbs,
              fat,
              protein,
              food.brand,
              food.healthScore
            );

            if (newEntry) {
              newEntry.brand = food.brand || newEntry.brand;
              newEntry.healthScore = food.healthScore || newEntry.healthScore;
              newEntry.servings = servings;
              newEntry.calories = calories;
              newEntry.macros = { carbs, fat, protein };

              if (!isOnline || dailyLog.id.startsWith('offline_')) {
                await db.offlineQueue.add({
                  action: 'addFood',
                  payload: { userId, date, food, mealType, servings, offlineId: newEntry.logId },
                  timestamp: Date.now(),
                });
              }

              set((state) => {
                const currentDayLogs = state.logs[date] || [];
                return {
                  logs: {
                    ...state.logs,
                    [date]: [...currentDayLogs, newEntry],
                  },
                };
              });
            }
          }
        } catch (err) {
          console.error('Error in addFoodLog store action:', err);
        } finally {
          set({ isLoadingLogs: false });
        }
      },

      removeFoodLog: async (date, logId) => {
        set({ isLoadingLogs: true });
        try {
          const isOnline = navigator.onLine;
          const success = await diaryService.deleteFoodEntry(logId);
          if (success) {
            if (!isOnline || logId.startsWith('offline_')) {
              await db.offlineQueue.add({
                action: 'removeFood',
                payload: { logId, date },
                timestamp: Date.now(),
              });
            }

            set((state) => {
              const currentDayLogs = state.logs[date] || [];
              return {
                logs: {
                  ...state.logs,
                  [date]: currentDayLogs.filter((log) => log.logId !== logId),
                },
              };
            });
          }
        } catch (err) {
          console.error('Error in removeFoodLog store action:', err);
        } finally {
          set({ isLoadingLogs: false });
        }
      },

      updateFoodLog: async (date, logId, mealType, foodName, calories, carbs, fat, protein, servings = 1, servingSizeDisplay, brand, healthScore) => {
        set({ isLoadingLogs: true });
        try {
          const success = await diaryService.updateFoodEntry(logId, mealType, foodName, calories, carbs, fat, protein, servings, servingSizeDisplay, undefined, brand, healthScore);
          if (success) {
            set((state) => {
              const currentLogs = state.logs[date] || [];
              const updatedLogs = currentLogs.map((log) => {
                if (log.logId === logId) {
                  return {
                    ...log,
                    mealType,
                    name: foodName,
                    brand: brand !== undefined ? brand : log.brand,
                    healthScore: healthScore !== undefined ? healthScore : log.healthScore,
                    calories: Math.round(calories),
                    macros: {
                      carbs: Math.round(carbs * 10) / 10,
                      fat: Math.round(fat * 10) / 10,
                      protein: Math.round(protein * 10) / 10,
                    },
                    servings,
                    servingSizeDisplay: servingSizeDisplay || log.servingSizeDisplay,
                  };
                }
                return log;
              });
              return {
                logs: {
                  ...state.logs,
                  [date]: updatedLogs,
                },
              };
            });
          }
        } catch (err) {
          console.error('Error in updateFoodLog store action:', err);
        } finally {
          set({ isLoadingLogs: false });
        }
      },

      updateWaterIntake: async (userId, date, amountMl) => {
        try {
          const isOnline = navigator.onLine;
          const success = await diaryService.upsertWaterIntake(userId, date, amountMl);
          if (success) {
            if (!isOnline) {
              await db.offlineQueue.add({
                action: 'updateWater',
                payload: { userId, date, amountMl },
                timestamp: Date.now(),
              });
            }
            set((state) => ({
              waterIntakeMl: {
                ...state.waterIntakeMl,
                [date]: amountMl,
              },
            }));
          }
        } catch (err) {
          console.error('Error updating water intake:', err);
        }
      },

      incrementWaterIntake: async (userId, date, amountMl) => {
        const current = get().waterIntakeMl[date] || 0;
        await get().updateWaterIntake(userId, date, current + amountMl);
      },

      updateGoals: async (userId, newGoals) => {
        set({ isLoadingGoals: true });
        try {
          const isOnline = navigator.onLine;
          const success = await diaryService.updateProfileGoals(userId, newGoals);
          if (success) {
            if (!isOnline) {
              await db.offlineQueue.add({
                action: 'updateGoals',
                payload: { userId, newGoals },
                timestamp: Date.now(),
              });
            }
            set((state) => ({
              goals: {
                ...state.goals,
                ...newGoals,
              },
            }));
          }
        } catch (err) {
          console.error('Error in updateGoals store action:', err);
        } finally {
          set({ isLoadingGoals: false });
        }
      },

      fetchWeightLogs: async (userId) => {
        set({ isLoadingWeightLogs: true });
        try {
          const logs = await diaryService.fetchWeightLogs(userId);
          set({ weightLogs: logs });
        } catch (err) {
          console.error('Error fetching weight logs:', err);
        } finally {
          set({ isLoadingWeightLogs: false });
        }
      },

      logWeight: async (userId, date, weight) => {
        try {
          const isOnline = navigator.onLine;
          const success = await diaryService.upsertWeightLog(userId, date, weight);
          if (success) {
            if (!isOnline) {
              await db.offlineQueue.add({
                action: 'logWeight',
                payload: { userId, date, weight },
                timestamp: Date.now(),
              });
            }
            await get().fetchWeightLogs(userId);
          }
        } catch (err) {
          console.error('Error logging weight:', err);
        }
      },

      deleteWeight: async (userId, date) => {
        try {
          const isOnline = navigator.onLine;
          const success = await diaryService.deleteWeightLog(userId, date);
          if (success) {
            if (!isOnline) {
              await db.offlineQueue.add({
                action: 'deleteWeight',
                payload: { userId, date },
                timestamp: Date.now(),
              });
            }
            await get().fetchWeightLogs(userId);
          }
        } catch (err) {
          console.error('Error deleting weight:', err);
        }
      },

      fetchRecipes: async (userId) => {
        set({ isLoadingRecipes: true });
        try {
          const list = await diaryService.fetchRecipes(userId);
          set({ recipes: list });
        } catch (err) {
          console.error('Error fetching recipes:', err);
        } finally {
          set({ isLoadingRecipes: false });
        }
      },

      createRecipe: async (userId, name, servings, ingredients) => {
        set({ isLoadingRecipes: true });
        try {
          const newRecipe = await diaryService.createRecipe(userId, name, servings, ingredients);
          if (newRecipe) {
            set((state) => ({ recipes: [newRecipe, ...state.recipes] }));
            return newRecipe;
          }
        } catch (err) {
          console.error('Error creating recipe:', err);
        } finally {
          set({ isLoadingRecipes: false });
        }
        return null;
      },

      deleteRecipe: async (recipeId) => {
        set({ isLoadingRecipes: true });
        try {
          const success = await diaryService.deleteRecipe(recipeId);
          if (success) {
            set((state) => ({ recipes: state.recipes.filter((r) => r.id !== recipeId) }));
          }
        } catch (err) {
          console.error('Error deleting recipe:', err);
        } finally {
          set({ isLoadingRecipes: false });
        }
      },

      fetchSavedMeals: async (userId) => {
        set({ isLoadingSavedMeals: true });
        try {
          const list = await diaryService.fetchSavedMeals(userId);
          set({ savedMeals: list });
        } catch (err) {
          console.error('Error fetching saved meals:', err);
        } finally {
          set({ isLoadingSavedMeals: false });
        }
      },

      createSavedMeal: async (userId, name, items) => {
        set({ isLoadingSavedMeals: true });
        try {
          const newMeal = await diaryService.createSavedMeal(userId, name, items);
          if (newMeal) {
            set((state) => ({ savedMeals: [newMeal, ...state.savedMeals] }));
            return newMeal;
          }
        } catch (err) {
          console.error('Error creating saved meal:', err);
        } finally {
          set({ isLoadingSavedMeals: false });
        }
        return null;
      },

      fetchUserCustomPortions: async (userId) => {
        try {
          const map = await diaryService.fetchUserCustomPortions(userId);
          set({ userCustomPortions: map });
        } catch (err) {
          console.error('Error fetching user custom portions:', err);
        }
      },

      setUserCustomPortion: async (userId, foodId, portionWeightG) => {
        try {
          set((state) => ({
            userCustomPortions: {
              ...state.userCustomPortions,
              [foodId]: portionWeightG,
            },
          }));
          await diaryService.upsertUserCustomPortion(userId, foodId, portionWeightG);
        } catch (err) {
          console.error('Error saving user custom portion:', err);
        }
      },

      deleteSavedMeal: async (mealId) => {
        set({ isLoadingSavedMeals: true });
        try {
          const success = await diaryService.deleteSavedMeal(mealId);
          if (success) {
            set((state) => ({ savedMeals: state.savedMeals.filter((m) => m.id !== mealId) }));
          }
        } catch (err) {
          console.error('Error deleting saved meal:', err);
        } finally {
          set({ isLoadingSavedMeals: false });
        }
      },

      resetToDefaults: () => {
        const today = getTodayString();
        set({
          selectedDate: today,
          goals: DEFAULT_GOALS,
          logs: {},
          waterIntakeMl: { [today]: 1750 },
          stepsCount: { [today]: 7420 },
          weightLogs: [],
          recipes: [],
          savedMeals: [],
        });
      },

      getTotalsForDate: (date) => {
        const dayLogs = get().logs[date] || [];
        return dayLogs.reduce(
          (acc, log) => {
            acc.calories += log.calories;
            acc.macros.carbs += log.macros.carbs;
            acc.macros.fat += log.macros.fat;
            acc.macros.protein += log.macros.protein;
            return acc;
          },
          {
            calories: 0,
            macros: { carbs: 0, fat: 0, protein: 0 },
          }
        );
      },

      getMealTotals: (date, mealType) => {
        const dayLogs = get().logs[date] || [];
        const mealLogs = dayLogs.filter((log) => log.mealType === mealType);
        return mealLogs.reduce(
          (acc, log) => {
            acc.calories += log.calories;
            acc.macros.carbs += log.macros.carbs;
            acc.macros.fat += log.macros.fat;
            acc.macros.protein += log.macros.protein;
            return acc;
          },
          {
            calories: 0,
            macros: { carbs: 0, fat: 0, protein: 0 },
          }
        );
      },
    }),
    {
      name: 'nutriumfit-diary-storage',
      // Persist local properties
      partialize: (state) => ({
        waterIntakeMl: state.waterIntakeMl,
        stepsCount: state.stepsCount,
        goals: state.goals,
      }),
    }
  )
);
