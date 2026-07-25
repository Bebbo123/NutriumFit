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

const isPGRST116 = (error: any): boolean => {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '').toLowerCase();
  return code === 'PGRST116' || message.includes('pgrst116');
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

    // Build payload compatible with both naming schemes (user_profiles & profiles)
    const fullPayload: Record<string, any> = {
      id: activeUserId,
      updated_at: new Date().toISOString(),
    };

    if (goals.calories !== undefined) {
      fullPayload.daily_calorie_goal = goals.calories;
      fullPayload.target_calories = goals.calories;
      fullPayload.calories = goals.calories;
    }
    if (goals.carbs !== undefined) {
      fullPayload.carb_goal = goals.carbs;
      fullPayload.target_carbs_g = goals.carbs;
      fullPayload.carbs = goals.carbs;
    }
    if (goals.fat !== undefined) {
      fullPayload.fat_goal = goals.fat;
      fullPayload.target_fat_g = goals.fat;
      fullPayload.fat = goals.fat;
    }
    if (goals.protein !== undefined) {
      fullPayload.protein_goal = goals.protein;
      fullPayload.target_protein_g = goals.protein;
      fullPayload.protein = goals.protein;
    }
    if (goals.waterMl !== undefined) {
      fullPayload.water_goal_ml = goals.waterMl;
      fullPayload.target_water_ml = goals.waterMl;
    }
    if (goals.steps !== undefined) {
      fullPayload.steps_goal = goals.steps;
      fullPayload.target_steps = goals.steps;
    }
    if (goals.macroInputMode !== undefined) {
      fullPayload.macro_input_mode = goals.macroInputMode;
    }
    if (goals.currentWeight !== undefined) fullPayload.current_weight = goals.currentWeight;
    if (goals.targetWeight !== undefined) fullPayload.target_weight = goals.targetWeight;
    if (goals.weeklyGoal !== undefined) fullPayload.weekly_goal = goals.weeklyGoal;
    if (goals.activityLevel !== undefined) fullPayload.activity_level = goals.activityLevel;
    if (goals.age !== undefined) fullPayload.age = goals.age;
    if (goals.gender !== undefined) fullPayload.gender = goals.gender;
    if (goals.height !== undefined) fullPayload.height = goals.height;

    // Remove undefined values
    Object.keys(fullPayload).forEach((key) => {
      if (fullPayload[key] === undefined) delete fullPayload[key];
    });

    console.log('[updateUserProfileGoals] Attempt 1: Upserting full payload to profiles table...', fullPayload);

    let lastError: any = null;

    // 1. Dual Table Persistence Attempt: Try profiles table first
    const profilesRes = await supabase
      .from('profiles')
      .upsert(fullPayload, { onConflict: 'id' });

    if (!profilesRes.error) {
      console.log('[updateUserProfileGoals] UPSERT into profiles succeeded!');
      return true;
    }

    lastError = profilesRes.error;
    console.warn('[updateUserProfileGoals] UPSERT into profiles failed:', lastError);

    // 2. Dual Table Persistence Attempt: Failover to user_profiles if profiles fails with PGRST204, PGRST116, or schema mismatch
    if (isPGRST204(lastError) || isPGRST116(lastError) || lastError) {
      console.log('[updateUserProfileGoals] Attempt 2: Failover UPSERT to user_profiles table with full payload...');
      const userProfilesRes = await supabase
        .from('user_profiles')
        .upsert(fullPayload, { onConflict: 'id' });

      if (!userProfilesRes.error) {
        console.log('[updateUserProfileGoals] UPSERT into user_profiles succeeded!');
        return true;
      }

      lastError = userProfilesRes.error;
      console.warn('[updateUserProfileGoals] UPSERT into user_profiles failed:', lastError);
    }

    // 3. Dynamic Payload Cleaning: If an upsert returns error PGRST204 (missing column like macro_input_mode),
    // automatically strip optional layout fields and retry saving core goals
    const coreCleanPayload: Record<string, any> = { ...fullPayload };
    delete coreCleanPayload.macro_input_mode; // Strip layout field causing PGRST204 schema cache mismatch

    console.log('[updateUserProfileGoals] Attempt 3: Dynamic Payload Cleaning - Retrying core goals on profiles table:', coreCleanPayload);
    const profilesCleanRes = await supabase
      .from('profiles')
      .upsert(coreCleanPayload, { onConflict: 'id' });

    if (!profilesCleanRes.error) {
      console.log('[updateUserProfileGoals] Stripped core UPSERT into profiles succeeded!');
      return true;
    }

    lastError = profilesCleanRes.error;
    console.warn('[updateUserProfileGoals] Stripped core UPSERT into profiles failed:', lastError);

    // 4. Retry cleaned core goals on user_profiles table
    console.log('[updateUserProfileGoals] Attempt 4: Dynamic Payload Cleaning - Retrying core goals on user_profiles table...');
    const userProfilesCleanRes = await supabase
      .from('user_profiles')
      .upsert(coreCleanPayload, { onConflict: 'id' });

    if (!userProfilesCleanRes.error) {
      console.log('[updateUserProfileGoals] Stripped core UPSERT into user_profiles succeeded!');
      return true;
    }

    lastError = userProfilesCleanRes.error;
    console.warn('[updateUserProfileGoals] Stripped core UPSERT into user_profiles failed:', lastError);

    // 5. Final fallback attempt using minimal target columns only
    const minimalPayload: Record<string, any> = {
      id: activeUserId,
      updated_at: new Date().toISOString(),
    };
    if (goals.calories !== undefined) {
      minimalPayload.target_calories = goals.calories;
      minimalPayload.daily_calorie_goal = goals.calories;
    }
    if (goals.carbs !== undefined) {
      minimalPayload.target_carbs_g = goals.carbs;
      minimalPayload.carb_goal = goals.carbs;
    }
    if (goals.protein !== undefined) {
      minimalPayload.target_protein_g = goals.protein;
      minimalPayload.protein_goal = goals.protein;
    }
    if (goals.fat !== undefined) {
      minimalPayload.target_fat_g = goals.fat;
      minimalPayload.fat_goal = goals.fat;
    }
    if (goals.waterMl !== undefined) {
      minimalPayload.target_water_ml = goals.waterMl;
      minimalPayload.water_goal_ml = goals.waterMl;
    }
    if (goals.steps !== undefined) {
      minimalPayload.target_steps = goals.steps;
      minimalPayload.steps_goal = goals.steps;
    }

    console.log('[updateUserProfileGoals] Attempt 5: Minimal target columns UPSERT on profiles...');
    const minimalProfilesRes = await supabase
      .from('profiles')
      .upsert(minimalPayload, { onConflict: 'id' });

    if (!minimalProfilesRes.error) {
      console.log('[updateUserProfileGoals] Minimal UPSERT into profiles succeeded!');
      return true;
    }

    console.log('[updateUserProfileGoals] Attempt 6: Minimal target columns UPSERT on user_profiles...');
    const minimalUserProfilesRes = await supabase
      .from('user_profiles')
      .upsert(minimalPayload, { onConflict: 'id' });

    if (!minimalUserProfilesRes.error) {
      console.log('[updateUserProfileGoals] Minimal UPSERT into user_profiles succeeded!');
      return true;
    }

    lastError = minimalUserProfilesRes.error || lastError;
    console.error('CRITICAL: Error saving user profile goals to Supabase PostgreSQL:', lastError);

    const errorMsg = lastError?.message || 'Errore durante il salvataggio degli obiettivi';
    const errObj: any = new Error(errorMsg);
    errObj.code = lastError?.code;
    errObj.details = lastError?.details;
    errObj.hint = lastError?.hint;
    throw errObj;
  },
};


