import { supabase } from '../utils/supabaseClient';
import { diaryService } from './diaryService';
import type { DailyGoals } from '../types/diary';

const isPGRST204 = (error: any): boolean => {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '').toLowerCase();
  const details = String(error.details || '').toLowerCase();
  return (
    code === 'PGRST204' ||
    message.includes('pgrst204') ||
    message.includes('schema cache') ||
    message.includes('macro_input_mode') ||
    message.includes('could not find the') ||
    details.includes('schema cache')
  );
};



export const profileService = {
  fetchUserProfile: async (userId: string): Promise<DailyGoals | null> => {
    return diaryService.fetchProfile(userId);
  },

  updateUserProfileGoals: async (userId: string, goals: Partial<DailyGoals>): Promise<boolean> => {
    if (!navigator.onLine) {
      console.warn('FALLBACK APPLIED BECAUSE: navigator is offline during updateUserProfileGoals');
      const err: any = new Error('Dispositivo offline');
      err.code = 'OFFLINE';
      throw err;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      const err: any = new Error("Utente non autenticato. Effettua il login per salvare gli obiettivi");
      err.code = 'UNAUTHENTICATED';
      throw err;
    }

    const activeUserId = authData.user.id || userId;
    const nowIso = new Date().toISOString();

    // 1. Table-Specific Payload for public.profiles (daily_calorie_goal, carb_goal, etc.)
    const buildProfilesPayload = (includeOptional = true): Record<string, any> => {
      const payload: Record<string, any> = {
        id: activeUserId,
        updated_at: nowIso,
      };
      if (goals.calories !== undefined) payload.daily_calorie_goal = goals.calories;
      if (goals.carbs !== undefined) payload.carb_goal = goals.carbs;
      if (goals.fat !== undefined) payload.fat_goal = goals.fat;
      if (goals.protein !== undefined) payload.protein_goal = goals.protein;
      if (goals.waterMl !== undefined) payload.water_goal_ml = goals.waterMl;
      if (goals.steps !== undefined) payload.steps_goal = goals.steps;

      if (includeOptional) {
        if (goals.currentWeight !== undefined) payload.current_weight = goals.currentWeight;
        if (goals.targetWeight !== undefined) payload.target_weight = goals.targetWeight;
        if (goals.weeklyGoal !== undefined) payload.weekly_goal = goals.weeklyGoal;
        if (goals.activityLevel !== undefined) payload.activity_level = goals.activityLevel;
        if (goals.age !== undefined) payload.age = goals.age;
        if (goals.gender !== undefined) payload.gender = goals.gender;
        if (goals.height !== undefined) payload.height = goals.height;
        if (goals.macroInputMode !== undefined) payload.macro_input_mode = goals.macroInputMode;
      }
      return payload;
    };

    // 2. Table-Specific Payload for public.user_profiles (target_calories, target_carbs_g, etc.)
    const buildUserProfilesPayload = (includeOptional = true): Record<string, any> => {
      const payload: Record<string, any> = {
        id: activeUserId,
        updated_at: nowIso,
      };
      if (goals.calories !== undefined) payload.target_calories = goals.calories;
      if (goals.carbs !== undefined) payload.target_carbs_g = goals.carbs;
      if (goals.fat !== undefined) payload.target_fat_g = goals.fat;
      if (goals.protein !== undefined) payload.target_protein_g = goals.protein;
      if (goals.waterMl !== undefined) payload.target_water_ml = goals.waterMl;
      if (goals.steps !== undefined) payload.target_steps = goals.steps;

      if (includeOptional) {
        if (goals.currentWeight !== undefined) payload.current_weight = goals.currentWeight;
        if (goals.targetWeight !== undefined) payload.target_weight = goals.targetWeight;
        if (goals.weeklyGoal !== undefined) payload.weekly_goal = goals.weeklyGoal;
        if (goals.activityLevel !== undefined) payload.activity_level = goals.activityLevel;
        if (goals.age !== undefined) payload.age = goals.age;
        if (goals.gender !== undefined) payload.gender = goals.gender;
        if (goals.height !== undefined) payload.height = goals.height;
        if (goals.macroInputMode !== undefined) payload.macro_input_mode = goals.macroInputMode;
      }
      return payload;
    };

    let lastError: any = null;

    // --- STRATEGY 1: Save to profiles table first ---
    let profPayload = buildProfilesPayload(true);
    console.log('[updateUserProfileGoals] Attempt 1: Upserting to profiles table:', profPayload);
    let res = await supabase.from('profiles').upsert(profPayload, { onConflict: 'id' });
    if (!res.error) {
      console.log('[updateUserProfileGoals] Successfully saved to profiles (upsert full)');
      return true;
    }
    lastError = res.error;
    console.warn('[updateUserProfileGoals] profiles full upsert failed:', res.error);

    if (isPGRST204(res.error)) {
      profPayload = buildProfilesPayload(false);
      console.log('[updateUserProfileGoals] Attempt 1B: Retrying profiles upsert with cleaned core payload:', profPayload);
      res = await supabase.from('profiles').upsert(profPayload, { onConflict: 'id' });
      if (!res.error) {
        console.log('[updateUserProfileGoals] Successfully saved to profiles (upsert cleaned)');
        return true;
      }
      lastError = res.error;
    }

    console.log('[updateUserProfileGoals] Attempt 1C: Trying update on profiles table...');
    res = await supabase.from('profiles').update(profPayload).eq('id', activeUserId);
    if (!res.error) {
      console.log('[updateUserProfileGoals] Successfully saved to profiles (update)');
      return true;
    }
    lastError = res.error || lastError;

    // --- STRATEGY 2: Failover to user_profiles table ---
    let uProfPayload = buildUserProfilesPayload(true);
    console.log('[updateUserProfileGoals] Attempt 2: Failover upsert to user_profiles table:', uProfPayload);
    res = await supabase.from('user_profiles').upsert(uProfPayload, { onConflict: 'id' });
    if (!res.error) {
      console.log('[updateUserProfileGoals] Successfully saved to user_profiles (upsert full)');
      return true;
    }
    lastError = res.error;
    console.warn('[updateUserProfileGoals] user_profiles full upsert failed:', res.error);

    if (isPGRST204(res.error)) {
      uProfPayload = buildUserProfilesPayload(false);
      console.log('[updateUserProfileGoals] Attempt 2B: Retrying user_profiles upsert with cleaned core payload:', uProfPayload);
      res = await supabase.from('user_profiles').upsert(uProfPayload, { onConflict: 'id' });
      if (!res.error) {
        console.log('[updateUserProfileGoals] Successfully saved to user_profiles (upsert cleaned)');
        return true;
      }
      lastError = res.error;
    }

    console.log('[updateUserProfileGoals] Attempt 2C: Trying update on user_profiles table...');
    res = await supabase.from('user_profiles').update(uProfPayload).eq('id', activeUserId);
    if (!res.error) {
      console.log('[updateUserProfileGoals] Successfully saved to user_profiles (update)');
      return true;
    }
    lastError = res.error || lastError;

    // --- STRATEGY 3: Minimal Core Nutrition Payload (only calories, carbs, fat, protein) ---
    const minProfiles = {
      id: activeUserId,
      daily_calorie_goal: goals.calories,
      carb_goal: goals.carbs,
      fat_goal: goals.fat,
      protein_goal: goals.protein,
      updated_at: nowIso,
    };
    Object.keys(minProfiles).forEach((k) => (minProfiles as any)[k] === undefined && delete (minProfiles as any)[k]);

    res = await supabase.from('profiles').upsert(minProfiles, { onConflict: 'id' });
    if (!res.error) {
      console.log('[updateUserProfileGoals] Successfully saved minimal goals to profiles!');
      return true;
    }

    const minUserProfiles = {
      id: activeUserId,
      target_calories: goals.calories,
      target_carbs_g: goals.carbs,
      target_fat_g: goals.fat,
      target_protein_g: goals.protein,
      updated_at: nowIso,
    };
    Object.keys(minUserProfiles).forEach((k) => (minUserProfiles as any)[k] === undefined && delete (minUserProfiles as any)[k]);

    res = await supabase.from('user_profiles').upsert(minUserProfiles, { onConflict: 'id' });
    if (!res.error) {
      console.log('[updateUserProfileGoals] Successfully saved minimal goals to user_profiles!');
      return true;
    }

    lastError = res.error || lastError;
    console.error('CRITICAL: All saving strategies failed for user profile goals:', lastError);

    const errorMsg = lastError?.message || 'Errore durante il salvataggio degli obiettivi su Supabase';
    const errObj: any = new Error(errorMsg);
    errObj.code = lastError?.code;
    errObj.details = lastError?.details;
    errObj.hint = lastError?.hint;
    throw errObj;
  },
};


