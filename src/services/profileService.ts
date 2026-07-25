import { supabase } from '../utils/supabaseClient';
import { diaryService } from './diaryService';
import type { DailyGoals } from '../types/diary';

async function executeResilientUpsert(
  table: string,
  initialPayload: Record<string, any>
): Promise<{ success: boolean; data?: any; error?: any }> {
  const currentPayload = { ...initialPayload };

  for (let attempt = 0; attempt < 15; attempt++) {
    // 1. Try UPSERT
    const res = await supabase.from(table).upsert(currentPayload, { onConflict: 'id' });
    if (!res.error) {
      console.log(`[executeResilientUpsert] Successfully saved to ${table} on attempt ${attempt + 1}:`, currentPayload);
      return { success: true, data: res.data };
    }

    const errText = `${res.error.message || ''} ${res.error.details || ''} ${res.error.hint || ''}`;
    const code = String(res.error.code || '');

    // Match missing column from PostgREST PGRST204 or PostgreSQL schema error
    const match =
      errText.match(/Could not find the '([^']+)' column/i) ||
      errText.match(/column "([^"]+)" of relation/i) ||
      errText.match(/column '([^']+)'/i) ||
      errText.match(/column ([^\s]+) does not exist/i);

    if ((code === 'PGRST204' || errText.includes('PGRST204') || errText.includes('schema cache') || errText.includes('column')) && match && match[1]) {
      const missingCol = match[1].replace(/['"]/g, '').trim();
      if (missingCol && missingCol in currentPayload) {
        console.warn(`[executeResilientUpsert] '${missingCol}' is not in ${table}. Auto-stripping and retrying...`);
        delete currentPayload[missingCol];
        continue;
      }
    }

    // 2. Try UPDATE as fallback
    const updateRes = await supabase.from(table).update(currentPayload).eq('id', currentPayload.id);
    if (!updateRes.error) {
      console.log(`[executeResilientUpsert] Successfully updated ${table}:`, currentPayload);
      return { success: true, data: updateRes.data };
    }

    const updateErrText = `${updateRes.error.message || ''} ${updateRes.error.details || ''}`;
    const updateCode = String(updateRes.error.code || '');
    const updateMatch =
      updateErrText.match(/Could not find the '([^']+)' column/i) ||
      updateErrText.match(/column "([^"]+)" of relation/i) ||
      updateErrText.match(/column '([^']+)'/i) ||
      updateErrText.match(/column ([^\s]+) does not exist/i);

    if ((updateCode === 'PGRST204' || updateErrText.includes('PGRST204') || updateErrText.includes('schema cache') || updateErrText.includes('column')) && updateMatch && updateMatch[1]) {
      const missingCol = updateMatch[1].replace(/['"]/g, '').trim();
      if (missingCol && missingCol in currentPayload) {
        console.warn(`[executeResilientUpsert] '${missingCol}' is not in ${table} (update). Auto-stripping and retrying...`);
        delete currentPayload[missingCol];
        continue;
      }
    }

    // Return non-column error (e.g. table missing or network issue)
    return { success: false, error: res.error || updateRes.error };
  }

  return { success: false, error: new Error(`Retries exhausted for table ${table}`) };
}

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

    const rawPayload: Record<string, any> = {
      id: activeUserId,
      updated_at: nowIso,
    };

    if (goals.calories !== undefined) {
      rawPayload.target_calories = goals.calories;
      rawPayload.daily_calorie_goal = goals.calories;
      rawPayload.calories = goals.calories;
    }
    if (goals.carbs !== undefined) {
      rawPayload.target_carbs_g = goals.carbs;
      rawPayload.carb_goal = goals.carbs;
      rawPayload.carbs = goals.carbs;
    }
    if (goals.fat !== undefined) {
      rawPayload.target_fat_g = goals.fat;
      rawPayload.fat_goal = goals.fat;
      rawPayload.fat = goals.fat;
    }
    if (goals.protein !== undefined) {
      rawPayload.target_protein_g = goals.protein;
      rawPayload.protein_goal = goals.protein;
      rawPayload.protein = goals.protein;
    }
    if (goals.waterMl !== undefined) {
      rawPayload.target_water_ml = goals.waterMl;
      rawPayload.water_goal_ml = goals.waterMl;
    }
    if (goals.steps !== undefined) {
      rawPayload.target_steps = goals.steps;
      rawPayload.steps_goal = goals.steps;
    }
    if (goals.macroInputMode !== undefined) rawPayload.macro_input_mode = goals.macroInputMode;
    if (goals.currentWeight !== undefined) rawPayload.current_weight = goals.currentWeight;
    if (goals.targetWeight !== undefined) rawPayload.target_weight = goals.targetWeight;
    if (goals.weeklyGoal !== undefined) rawPayload.weekly_goal = goals.weeklyGoal;
    if (goals.activityLevel !== undefined) rawPayload.activity_level = goals.activityLevel;
    if (goals.age !== undefined) rawPayload.age = goals.age;
    if (goals.gender !== undefined) rawPayload.gender = goals.gender;
    if (goals.height !== undefined) rawPayload.height = goals.height;

    // Clean undefined values
    Object.keys(rawPayload).forEach((k) => rawPayload[k] === undefined && delete rawPayload[k]);

    // Attempt 1: Try user_profiles table first with self-healing column stripper
    console.log('[updateUserProfileGoals] Attempting resilient save on user_profiles...');
    const userProfilesResult = await executeResilientUpsert('user_profiles', rawPayload);
    if (userProfilesResult.success) {
      console.log('[updateUserProfileGoals] Successfully saved goals to user_profiles table!');
      return true;
    }

    // Attempt 2: Try profiles table with self-healing column stripper
    console.log('[updateUserProfileGoals] Failover: Attempting resilient save on profiles...');
    const profilesResult = await executeResilientUpsert('profiles', rawPayload);
    if (profilesResult.success) {
      console.log('[updateUserProfileGoals] Successfully saved goals to profiles table!');
      return true;
    }

    const lastError = userProfilesResult.error || profilesResult.error;
    console.error('CRITICAL: All resilient saving attempts failed:', lastError);

    const errorMsg = lastError?.message || 'Errore durante la sincronizzazione degli obiettivi su Supabase';
    const errObj: any = new Error(errorMsg);
    errObj.code = lastError?.code;
    errObj.details = lastError?.details;
    errObj.hint = lastError?.hint;
    throw errObj;
  },
};


