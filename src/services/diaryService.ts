import { supabase } from '../utils/supabaseClient';
import type { DailyGoals, LoggedFood, MealType, FoodItem, Recipe, RecipeIngredient, SavedMeal, SavedMealItem } from '../types/diary';
import { db } from '../utils/db';

export interface SupabaseProfile {
  id: string;
  email: string;
  daily_calorie_goal: number;
  carb_goal: number;
  fat_goal: number;
  protein_goal: number;
  current_weight?: number;
  target_weight?: number;
  weekly_goal?: string;
  activity_level?: string;
  age?: number;
  gender?: string;
  height?: number;
  water_goal_ml?: number;
  steps_goal?: number;
}

export interface SupabaseDailyLog {
  id: string;
  user_id: string;
  date: string;
}

export interface SupabaseFoodEntry {
  id: string;
  daily_log_id: string;
  meal_type: string;
  food_name: string;
  calories: number;
  carbs: number;
  fat: number;
  protein: number;
  created_at: string;
}

export const diaryService = {
  /**
   * Fetches user profile goals from public.profiles
   */
  async fetchProfile(userId: string): Promise<DailyGoals | null> {
    try {
      if (!navigator.onLine) throw new Error('Offline');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const profile = data as SupabaseProfile;
      return {
        calories: profile.daily_calorie_goal || 2200,
        carbs: profile.carb_goal || 250,
        fat: profile.fat_goal || 70,
        protein: profile.protein_goal || 150,
        waterMl: profile.water_goal_ml || 2000,
        steps: profile.steps_goal || 10000,
        macroInputMode: (profile as any).macro_input_mode || 'grams',
        currentWeight: profile.current_weight,
        targetWeight: profile.target_weight,
        weeklyGoal: profile.weekly_goal,
        activityLevel: profile.activity_level,
        age: profile.age,
        gender: profile.gender,
        height: profile.height,
      };
    } catch (err) {
      console.warn('fetchProfile falling back to default/persisted:', err);
      return null;
    }
  },

  /**
   * Updates user profile goals in public.profiles
   */
  async updateProfileGoals(userId: string, goals: Partial<DailyGoals>): Promise<boolean> {
    try {
      if (!navigator.onLine) throw new Error('Offline');
      const updates: any = {};
      if (goals.calories !== undefined) updates.daily_calorie_goal = goals.calories;
      if (goals.carbs !== undefined) updates.carb_goal = goals.carbs;
      if (goals.fat !== undefined) updates.fat_goal = goals.fat;
      if (goals.protein !== undefined) updates.protein_goal = goals.protein;
      if (goals.waterMl !== undefined) updates.water_goal_ml = goals.waterMl;
      if (goals.steps !== undefined) updates.steps_goal = goals.steps;
      if (goals.macroInputMode !== undefined) updates.macro_input_mode = goals.macroInputMode;
      if (goals.currentWeight !== undefined) updates.current_weight = goals.currentWeight;
      if (goals.targetWeight !== undefined) updates.target_weight = goals.targetWeight;
      if (goals.weeklyGoal !== undefined) updates.weekly_goal = goals.weeklyGoal;
      if (goals.activityLevel !== undefined) updates.activity_level = goals.activityLevel;
      if (goals.age !== undefined) updates.age = goals.age;
      if (goals.gender !== undefined) updates.gender = goals.gender;
      if (goals.height !== undefined) updates.height = goals.height;

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('updateProfileGoals falling back to offline:', err);
      return true;
    }
  },

  /**
   * Fetches a daily log for a given date, or creates it if it doesn't exist
   */
  async fetchOrCreateDailyLog(userId: string, date: string): Promise<SupabaseDailyLog | null> {
    try {
      if (!navigator.onLine) throw new Error('Offline');
      // 1. Try to fetch
      const { data: fetchData, error: fetchError } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (fetchData) {
        return fetchData as SupabaseDailyLog;
      }

      // 2. Create if not exists
      const { data: insertData, error: insertError } = await supabase
        .from('daily_logs')
        .insert({ user_id: userId, date })
        .select()
        .single();

      if (insertError) {
        // In case of parallel inserts, check if it was created in the meantime
        const { data: retryData } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('date', date)
          .maybeSingle();
        if (retryData) return retryData as SupabaseDailyLog;

        throw insertError;
      }

      return insertData as SupabaseDailyLog;
    } catch (err) {
      console.warn('fetchOrCreateDailyLog falling back to offline:', err);
      return {
        id: `offline_${userId}_${date}`,
        user_id: userId,
        date,
      } as any;
    }
  },

  /**
   * Fetches all food entries for a specific daily log
   */
  async fetchFoodEntries(dailyLogId: string): Promise<LoggedFood[]> {
    try {
      if (!navigator.onLine || dailyLogId.startsWith('offline_')) throw new Error('Offline');
      const { data, error } = await supabase
        .from('food_entries')
        .select('*')
        .eq('daily_log_id', dailyLogId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data as SupabaseFoodEntry[]).map((entry: any) => {
        const dateObj = new Date(entry.created_at);
        const timeStr = isNaN(dateObj.getTime())
          ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return {
          logId: entry.id,
          foodId: entry.id,
          name: entry.food_name,
          servings: entry.servings || 1,
          servingSizeDisplay: entry.serving_size_display || (entry.grams ? `${entry.grams}g` : '1 porzione'),
          grams: entry.grams || null,
          unitWeightGrams: entry.unit_weight_grams || null,
          calories: entry.calories,
          macros: {
            carbs: Number(entry.carbs),
            fat: Number(entry.fat),
            protein: Number(entry.protein),
          },
          mealType: entry.meal_type as MealType,
          loggedAt: timeStr,
        };
      });
    } catch (err) {
      console.warn('fetchFoodEntries falling back to IndexedDB logs:', err);
      let date = new Date().toISOString().split('T')[0];
      let userId = 'default_user';
      if (dailyLogId.startsWith('offline_')) {
        const parts = dailyLogId.split('_');
        if (parts.length >= 3) {
          userId = parts[1];
          date = parts.slice(2).join('_');
        }
      }
      
      const cached = await db.logs.where({ userId, date }).toArray();
      return cached.map((c) => {
        const food = JSON.parse(c.foodItemJson);
        return {
          logId: c.logId,
          foodId: c.logId,
          name: food.name,
          servings: c.servings,
          servingSizeDisplay: food.servingSize || '1 porzione',
          calories: food.calories * c.servings,
          macros: {
            carbs: food.macros.carbs * c.servings,
            fat: food.macros.fat * c.servings,
            protein: food.macros.protein * c.servings,
          },
          mealType: c.mealType as MealType,
          loggedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      });
    }
  },

  /**
   * Inserts a new food entry into public.food_entries
   */
  async addFoodEntry(
    dailyLogId: string,
    mealType: MealType,
    foodName: string,
    calories: number,
    carbs: number,
    fat: number,
    protein: number
  ): Promise<LoggedFood | null> {
    try {
      if (!navigator.onLine || dailyLogId.startsWith('offline_')) throw new Error('Offline');
      const { data, error } = await supabase
        .from('food_entries')
        .insert({
          daily_log_id: dailyLogId,
          meal_type: mealType,
          food_name: foodName,
          calories: Math.round(calories),
          carbs: Math.round(carbs * 10) / 10,
          fat: Math.round(fat * 10) / 10,
          protein: Math.round(protein * 10) / 10,
        })
        .select()
        .single();

      if (error) throw error;

      const entry = data as SupabaseFoodEntry;
      const dateObj = new Date(entry.created_at);
      const timeStr = isNaN(dateObj.getTime())
        ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return {
        logId: entry.id,
        foodId: entry.id,
        name: entry.food_name,
        servings: 1,
        servingSizeDisplay: '1 porzione',
        calories: entry.calories,
        macros: {
          carbs: Number(entry.carbs),
          fat: Number(entry.fat),
          protein: Number(entry.protein),
        },
        mealType: entry.meal_type as MealType,
        loggedAt: timeStr,
      };
    } catch (err) {
      console.warn('addFoodEntry falling back to IndexedDB logs:', err);
      const logId = 'offline_food_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      
      let date = new Date().toISOString().split('T')[0];
      let userId = 'default_user';
      if (dailyLogId.startsWith('offline_')) {
        const parts = dailyLogId.split('_');
        if (parts.length >= 3) {
          userId = parts[1];
          date = parts.slice(2).join('_');
        }
      }
      
      const dummyFood = {
        name: foodName,
        calories,
        macros: { carbs, fat, protein },
        servingSize: '1 porzione',
      };

      await db.logs.add({
        logId,
        userId,
        date,
        foodItemJson: JSON.stringify(dummyFood),
        mealType,
        servings: 1,
      });

      return {
        logId,
        foodId: logId,
        name: foodName,
        servings: 1,
        servingSizeDisplay: '1 porzione',
        calories,
        macros: { carbs, fat, protein },
        mealType,
        loggedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    }
  },

  /**
   * Deletes a food entry from public.food_entries
   */
  async deleteFoodEntry(entryId: string): Promise<boolean> {
    try {
      if (!navigator.onLine || entryId.startsWith('offline_')) throw new Error('Offline');
      const { error } = await supabase
        .from('food_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('deleteFoodEntry falling back to IndexedDB:', err);
      await db.logs.delete(entryId);
      return true;
    }
  },

  /**
   * Updates an existing food entry in public.food_entries
   */
  async updateFoodEntry(
    entryId: string,
    mealType: MealType,
    foodName: string,
    calories: number,
    carbs: number,
    fat: number,
    protein: number,
    servings?: number,
    servingSizeDisplay?: string,
    grams?: number
  ): Promise<boolean> {
    try {
      if (navigator.onLine && !entryId.startsWith('offline_')) {
        const payload: any = {
          meal_type: mealType,
          food_name: foodName,
          calories: Math.round(calories),
          carbs: Math.round(carbs * 10) / 10,
          fat: Math.round(fat * 10) / 10,
          protein: Math.round(protein * 10) / 10,
        };
        if (servings !== undefined) payload.servings = servings;
        if (servingSizeDisplay !== undefined) payload.serving_size_display = servingSizeDisplay;
        if (grams !== undefined) payload.grams = grams;

        let { error } = await supabase
          .from('food_entries')
          .update(payload)
          .eq('id', entryId);

        if (error) {
          const basicPayload = {
            meal_type: mealType,
            food_name: foodName,
            calories: Math.round(calories),
            carbs: Math.round(carbs * 10) / 10,
            fat: Math.round(fat * 10) / 10,
            protein: Math.round(protein * 10) / 10,
          };
          const { error: retryError } = await supabase
            .from('food_entries')
            .update(basicPayload)
            .eq('id', entryId);

          if (retryError) console.warn('Supabase update retry error:', retryError);
        }
      }

      // ALWAYS update local IndexedDB cache as well!
      try {
        const cached = await db.logs.get(entryId);
        if (cached) {
          const food = JSON.parse(cached.foodItemJson);
          food.name = foodName;
          food.calories = Math.round(calories / (servings || 1));
          food.macros = {
            carbs: Math.round((carbs / (servings || 1)) * 10) / 10,
            fat: Math.round((fat / (servings || 1)) * 10) / 10,
            protein: Math.round((protein / (servings || 1)) * 10) / 10,
          };
          food.servingSize = servingSizeDisplay || food.servingSize;
          await db.logs.put({
            ...cached,
            mealType,
            servings: servings || cached.servings || 1,
            foodItemJson: JSON.stringify(food),
          });
        }
      } catch (e) {
        console.warn('IndexedDB update failed', e);
      }

      return true;
    } catch (err) {
      console.warn('updateFoodEntry falling back to local state:', err);
      return true;
    }
  },

  /**
   * Fetches custom foods created by the user matching a search query
   */
  async searchCustomFoods(userId: string, query: string): Promise<FoodItem[]> {
    let req = supabase
      .from('custom_foods')
      .select('*')
      .eq('user_id', userId);
      
    if (query.trim()) {
      req = req.ilike('food_name', `%${query}%`);
    }
    
    const { data, error } = await req;

    if (error) {
      console.error('Error searching custom foods:', error);
      return [];
    }

    return (data || []).map((item) => ({
      id: `custom_${item.id}`,
      name: item.food_name,
      brand: item.brand || undefined,
      servingSize: '100g',
      servingUnit: 'g',
      servingAmount: 100,
      calories: item.calories,
      macros: {
        carbs: Number(item.carbs),
        fat: Number(item.fat),
        protein: Number(item.protein),
      },
      isVerified: false,
    }));
  },

  /**
   * Creates a new custom food in the database
   */
  async createCustomFood(
    userId: string,
    foodName: string,
    brand: string,
    calories: number,
    carbs: number,
    fat: number,
    protein: number
  ): Promise<FoodItem | null> {
    const { data, error } = await supabase
      .from('custom_foods')
      .insert({
        user_id: userId,
        food_name: foodName,
        brand: brand || null,
        calories: Math.round(calories),
        carbs: Math.round(carbs * 10) / 10,
        fat: Math.round(fat * 10) / 10,
        protein: Math.round(protein * 10) / 10,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating custom food:', error);
      throw error;
    }

    return {
      id: `custom_${data.id}`,
      name: data.food_name,
      brand: data.brand || undefined,
      servingSize: '100g',
      servingUnit: 'g',
      servingAmount: 100,
      calories: data.calories,
      macros: {
        carbs: Number(data.carbs),
        fat: Number(data.fat),
        protein: Number(data.protein),
      },
      isVerified: false,
    };
  },

  /**
   * Fetches weight logs for a user
   */
  async fetchWeightLogs(userId: string): Promise<{ date: string; weight: number }[]> {
    try {
      if (!navigator.onLine) throw new Error('Offline');
      const { data, error } = await supabase
        .from('weight_logs')
        .select('date, weight')
        .eq('user_id', userId)
        .order('date', { ascending: true });

      if (error) throw error;

      const logs = (data || []).map((item) => ({
        date: item.date,
        weight: Number(item.weight),
      }));

      // Cache locally
      await db.weightLogs.where('userId').equals(userId).delete();
      for (const row of logs) {
        await db.weightLogs.put({ key: `${userId}_${row.date}`, userId, date: row.date, weight: row.weight });
      }

      return logs;
    } catch (err) {
      console.warn('fetchWeightLogs falling back to IndexedDB:', err);
      const cached = await db.weightLogs.where('userId').equals(userId).sortBy('date');
      return cached.map(c => ({ date: c.date, weight: c.weight }));
    }
  },

  /**
   * Logs a weight value for a specific date (upserts)
   */
  async upsertWeightLog(userId: string, date: string, weight: number): Promise<boolean> {
    try {
      if (!navigator.onLine) throw new Error('Offline');
      const { error } = await supabase
        .from('weight_logs')
        .upsert(
          { user_id: userId, date, weight },
          { onConflict: 'user_id,date' }
        );

      if (error) throw error;
      
      // Update cache
      await db.weightLogs.put({ key: `${userId}_${date}`, userId, date, weight });
      return true;
    } catch (err) {
      console.warn('upsertWeightLog falling back to IndexedDB:', err);
      await db.weightLogs.put({ key: `${userId}_${date}`, userId, date, weight });
      return true;
    }
  },

  /**
   * Deletes a weight log for a specific date
   */
  async deleteWeightLog(userId: string, date: string): Promise<boolean> {
    try {
      if (!navigator.onLine) throw new Error('Offline');
      const { error } = await supabase
        .from('weight_logs')
        .delete()
        .eq('user_id', userId)
        .eq('date', date);

      if (error) throw error;
      
      // Update cache
      await db.weightLogs.delete(`${userId}_${date}`);
      return true;
    } catch (err) {
      console.warn('deleteWeightLog falling back to IndexedDB:', err);
      await db.weightLogs.delete(`${userId}_${date}`);
      return true;
    }
  },

  /**
   * Fetches water logs for a user for a specific date
   */
  async fetchWaterIntake(userId: string, date: string): Promise<number> {
    try {
      if (!navigator.onLine) throw new Error('Offline');
      const { data, error } = await supabase
        .from('water_logs')
        .select('amount_ml')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();

      if (error) throw error;

      const amount = data ? Number(data.amount_ml) : 0;
      await db.waterLogs.put({ key: `${userId}_${date}`, userId, date, waterMl: amount });
      return amount;
    } catch (err) {
      console.warn('fetchWaterIntake falling back to IndexedDB:', err);
      const cached = await db.waterLogs.get(`${userId}_${date}`);
      return cached ? cached.waterMl : 0;
    }
  },

  /**
   * Upserts daily water intake
   */
  async upsertWaterIntake(userId: string, date: string, amountMl: number): Promise<boolean> {
    try {
      if (!navigator.onLine) throw new Error('Offline');
      const { error } = await supabase
        .from('water_logs')
        .upsert(
          { user_id: userId, date, amount_ml: amountMl },
          { onConflict: 'user_id,date' }
        );

      if (error) throw error;

      await db.waterLogs.put({ key: `${userId}_${date}`, userId, date, waterMl: amountMl });
      return true;
    } catch (err) {
      console.warn('upsertWaterIntake falling back to IndexedDB:', err);
      await db.waterLogs.put({ key: `${userId}_${date}`, userId, date, waterMl: amountMl });
      return true;
    }
  },

  /**
   * Fetches water logs for a range of dates
   */
  async fetchWaterLogsForRange(userId: string, startDate: string, endDate: string): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from('water_logs')
      .select('date, amount_ml')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.error('Error fetching water logs range:', error);
      return {};
    }

    const logsMap: Record<string, number> = {};
    (data || []).forEach((row) => {
      logsMap[row.date] = row.amount_ml;
    });
    return logsMap;
  },

  /**
   * Fetches daily summaries of calorie and macro intake for a range of dates
   */
  async fetchDailySummariesRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Record<string, { calories: number; carbs: number; fat: number; protein: number }>> {
    const { data, error } = await supabase
      .from('daily_logs')
      .select(`
        date,
        food_entries (
          calories,
          carbs,
          fat,
          protein
        )
      `)
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.error('Error fetching summaries range:', error);
      return {};
    }

    const summaries: Record<string, { calories: number; carbs: number; fat: number; protein: number }> = {};
    (data || []).forEach((log: any) => {
      const dateStr = log.date;
      let calories = 0;
      let carbs = 0;
      let fat = 0;
      let protein = 0;
      log.food_entries?.forEach((entry: any) => {
        calories += entry.calories || 0;
        carbs += entry.carbs || 0;
        fat += entry.fat || 0;
        protein += entry.protein || 0;
      });
      summaries[dateStr] = { calories, carbs, fat, protein };
    });

    return summaries;
  },

  /**
   * Fetches user recipes including ingredients from Supabase
   */
  async fetchRecipes(userId: string): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from('recipes')
      .select('*, recipe_ingredients(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recipes:', error);
      return [];
    }

    return (data || []).map((recipe: any) => ({
      id: recipe.id,
      user_id: recipe.user_id,
      name: recipe.name,
      servings: recipe.servings,
      created_at: recipe.created_at,
      ingredients: (recipe.recipe_ingredients || []).map((ing: any) => ({
        id: ing.id,
        recipe_id: ing.recipe_id,
        food_name: ing.food_name,
        calories: Number(ing.calories),
        carbs: Number(ing.carbs),
        fat: Number(ing.fat),
        protein: Number(ing.protein),
        quantity: Number(ing.quantity),
        unit: ing.unit,
      })),
    }));
  },

  /**
   * Creates a recipe with its ingredients inside a single workflow
   */
  async createRecipe(
    userId: string,
    name: string,
    servings: number,
    ingredients: Omit<RecipeIngredient, 'id' | 'recipe_id'>[]
  ): Promise<Recipe | null> {
    // 1. Insert recipe row
    const { data: recipeData, error: recipeError } = await supabase
      .from('recipes')
      .insert({ user_id: userId, name, servings })
      .select()
      .single();

    if (recipeError || !recipeData) {
      console.error('Error creating recipe:', recipeError);
      return null;
    }

    const recipeId = recipeData.id;

    // 2. Insert ingredients
    const ingredientsToInsert = ingredients.map((ing) => ({
      recipe_id: recipeId,
      food_name: ing.food_name,
      calories: ing.calories,
      carbs: ing.carbs,
      fat: ing.fat,
      protein: ing.protein,
      quantity: ing.quantity,
      unit: ing.unit || 'g',
    }));

    const { data: ingData, error: ingError } = await supabase
      .from('recipe_ingredients')
      .insert(ingredientsToInsert)
      .select();

    if (ingError) {
      console.error('Error creating recipe ingredients:', ingError);
      // Clean up recipe if ingredients insert failed (naive transaction rollback)
      await supabase.from('recipes').delete().eq('id', recipeId);
      return null;
    }

    return {
      id: recipeId,
      user_id: userId,
      name,
      servings,
      ingredients: (ingData || []).map((ing: any) => ({
        id: ing.id,
        recipe_id: ing.recipe_id,
        food_name: ing.food_name,
        calories: Number(ing.calories),
        carbs: Number(ing.carbs),
        fat: Number(ing.fat),
        protein: Number(ing.protein),
        quantity: Number(ing.quantity),
        unit: ing.unit,
      })),
    };
  },

  /**
   * Deletes a recipe
   */
  async deleteRecipe(recipeId: string): Promise<boolean> {
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', recipeId);

    if (error) {
      console.error('Error deleting recipe:', error);
      return false;
    }
    return true;
  },

  /**
   * Fetches saved meals and their items
   */
  async fetchSavedMeals(userId: string): Promise<SavedMeal[]> {
    const { data, error } = await supabase
      .from('saved_meals')
      .select('*, saved_meal_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved meals:', error);
      return [];
    }

    return (data || []).map((meal: any) => ({
      id: meal.id,
      user_id: meal.user_id,
      name: meal.name,
      created_at: meal.created_at,
      items: (meal.saved_meal_items || []).map((item: any) => ({
        id: item.id,
        saved_meal_id: item.saved_meal_id,
        food_name: item.food_name,
        calories: Number(item.calories),
        carbs: Number(item.carbs),
        fat: Number(item.fat),
        protein: Number(item.protein),
        servings: Number(item.servings),
        serving_size_display: item.serving_size_display,
      })),
    }));
  },

  /**
   * Creates a saved meal template with its logged items
   */
  async createSavedMeal(
    userId: string,
    name: string,
    items: Omit<SavedMealItem, 'id' | 'saved_meal_id'>[]
  ): Promise<SavedMeal | null> {
    // 1. Insert saved meal row
    const { data: mealData, error: mealError } = await supabase
      .from('saved_meals')
      .insert({ user_id: userId, name })
      .select()
      .single();

    if (mealError || !mealData) {
      console.error('Error creating saved meal:', mealError);
      return null;
    }

    const savedMealId = mealData.id;

    // 2. Insert items
    const itemsToInsert = items.map((item) => ({
      saved_meal_id: savedMealId,
      food_name: item.food_name,
      calories: item.calories,
      carbs: item.carbs,
      fat: item.fat,
      protein: item.protein,
      servings: item.servings,
      serving_size_display: item.serving_size_display || '1 porzione',
    }));

    const { data: itemsData, error: itemsError } = await supabase
      .from('saved_meal_items')
      .insert(itemsToInsert)
      .select();

    if (itemsError) {
      console.error('Error creating saved meal items:', itemsError);
      // Clean up saved meal if items insert failed
      await supabase.from('saved_meals').delete().eq('id', savedMealId);
      return null;
    }

    return {
      id: savedMealId,
      user_id: userId,
      name,
      items: (itemsData || []).map((item: any) => ({
        id: item.id,
        saved_meal_id: item.saved_meal_id,
        food_name: item.food_name,
        calories: Number(item.calories),
        carbs: Number(item.carbs),
        fat: Number(item.fat),
        protein: Number(item.protein),
        servings: Number(item.servings),
        serving_size_display: item.serving_size_display,
      })),
    };
  },

  /**
   * Deletes a saved meal template
   */
  async deleteSavedMeal(mealId: string): Promise<boolean> {
    const { error } = await supabase
      .from('saved_meals')
      .delete()
      .eq('id', mealId);

    if (error) {
      console.error('Error deleting saved meal:', error);
      return false;
    }
    return true;
  },
};

