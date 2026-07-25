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

async function executeResilientUpsert(
  table: string,
  initialPayload: Record<string, any>
): Promise<{ success: boolean; data?: any; error?: any }> {
  const currentPayload = { ...initialPayload };

  for (let attempt = 0; attempt < 15; attempt++) {
    const res = await supabase.from(table).upsert(currentPayload, { onConflict: 'id' });
    if (!res.error) {
      console.log(`[executeResilientUpsert] Successfully saved to ${table} on attempt ${attempt + 1}:`, currentPayload);
      return { success: true, data: res.data };
    }

    const errText = `${res.error.message || ''} ${res.error.details || ''} ${res.error.hint || ''}`;
    const code = String(res.error.code || '');

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

    // 1. CLEAN UNIFIED PRIMARY PAYLOAD (Standard normalized target_* column names ONLY - NO alias keys)
    const primaryPayload: Record<string, any> = {
      id: activeUserId,
      updated_at: nowIso,
    };

    if (goals.calories !== undefined) primaryPayload.target_calories = goals.calories;
    if (goals.carbs !== undefined) primaryPayload.target_carbs_g = goals.carbs;
    if (goals.fat !== undefined) primaryPayload.target_fat_g = goals.fat;
    if (goals.protein !== undefined) primaryPayload.target_protein_g = goals.protein;
    if (goals.waterMl !== undefined) primaryPayload.target_water_ml = goals.waterMl;
    if (goals.steps !== undefined) primaryPayload.target_steps = goals.steps;
    if (goals.macroInputMode !== undefined) primaryPayload.macro_input_mode = goals.macroInputMode;

    if (goals.currentWeight !== undefined) primaryPayload.current_weight = goals.currentWeight;
    if (goals.targetWeight !== undefined) primaryPayload.target_weight = goals.targetWeight;
    if (goals.weeklyGoal !== undefined) primaryPayload.weekly_goal = goals.weeklyGoal;
    if (goals.activityLevel !== undefined) primaryPayload.activity_level = goals.activityLevel;
    if (goals.age !== undefined) primaryPayload.age = goals.age;
    if (goals.gender !== undefined) primaryPayload.gender = goals.gender;
    if (goals.height !== undefined) primaryPayload.height = goals.height;

    // Clean undefined values
    Object.keys(primaryPayload).forEach((k) => primaryPayload[k] === undefined && delete primaryPayload[k]);

    console.log('[updateUserProfileGoals] Step 1: Trying primary normalized payload on user_profiles:', primaryPayload);

    // --- STEP 1: Primary UPSERT attempt on user_profiles with target_* keys ---
    let res = await supabase.from('user_profiles').upsert(primaryPayload, { onConflict: 'id' });
    if (!res.error) {
      console.log('[updateUserProfileGoals] Primary UPSERT on user_profiles succeeded!');
      return true;
    }

    let lastError = res.error;
    console.warn('[updateUserProfileGoals] Step 1 failed:', lastError);

    // Retry primary payload on user_profiles without macro_input_mode if PGRST204
    if (isPGRST204(lastError) && 'macro_input_mode' in primaryPayload) {
      const cleanPrimary = { ...primaryPayload };
      delete cleanPrimary.macro_input_mode;
      console.log('[updateUserProfileGoals] Step 1B: Retrying primary payload without macro_input_mode on user_profiles:', cleanPrimary);
      res = await supabase.from('user_profiles').upsert(cleanPrimary, { onConflict: 'id' });
      if (!res.error) {
        console.log('[updateUserProfileGoals] Clean primary UPSERT on user_profiles succeeded!');
        return true;
      }
      lastError = res.error;
    }

    // Try UPDATE on user_profiles with primary payload
    res = await supabase.from('user_profiles').update(primaryPayload).eq('id', activeUserId);
    if (!res.error) {
      console.log('[updateUserProfileGoals] Primary UPDATE on user_profiles succeeded!');
      return true;
    }

    // --- STEP 2: Secondary Fallback Retry Strategy using alternative alias keys (*_goal) on profiles ---
    const fallbackAliasPayload: Record<string, any> = {
      id: activeUserId,
      updated_at: nowIso,
    };

    if (goals.calories !== undefined) fallbackAliasPayload.daily_calorie_goal = goals.calories;
    if (goals.carbs !== undefined) fallbackAliasPayload.carb_goal = goals.carbs;
    if (goals.fat !== undefined) fallbackAliasPayload.fat_goal = goals.fat;
    if (goals.protein !== undefined) fallbackAliasPayload.protein_goal = goals.protein;
    if (goals.waterMl !== undefined) fallbackAliasPayload.water_goal_ml = goals.waterMl;
    if (goals.steps !== undefined) fallbackAliasPayload.steps_goal = goals.steps;
    if (goals.macroInputMode !== undefined) fallbackAliasPayload.macro_input_mode = goals.macroInputMode;

    if (goals.currentWeight !== undefined) fallbackAliasPayload.current_weight = goals.currentWeight;
    if (goals.targetWeight !== undefined) fallbackAliasPayload.target_weight = goals.targetWeight;
    if (goals.weeklyGoal !== undefined) fallbackAliasPayload.weekly_goal = goals.weeklyGoal;
    if (goals.activityLevel !== undefined) fallbackAliasPayload.activity_level = goals.activityLevel;
    if (goals.age !== undefined) fallbackAliasPayload.age = goals.age;
    if (goals.gender !== undefined) fallbackAliasPayload.gender = goals.gender;
    if (goals.height !== undefined) fallbackAliasPayload.height = goals.height;

    Object.keys(fallbackAliasPayload).forEach((k) => fallbackAliasPayload[k] === undefined && delete fallbackAliasPayload[k]);

    console.log('[updateUserProfileGoals] Step 2: Fallback retry with alias keys on profiles:', fallbackAliasPayload);

    res = await supabase.from('profiles').upsert(fallbackAliasPayload, { onConflict: 'id' });
    if (!res.error) {
      console.log('[updateUserProfileGoals] Fallback alias UPSERT on profiles succeeded!');
      return true;
    }
    lastError = res.error;

    if (isPGRST204(lastError) && 'macro_input_mode' in fallbackAliasPayload) {
      const cleanAlias = { ...fallbackAliasPayload };
      delete cleanAlias.macro_input_mode;
      console.log('[updateUserProfileGoals] Step 2B: Retrying alias payload without macro_input_mode on profiles:', cleanAlias);
      res = await supabase.from('profiles').upsert(cleanAlias, { onConflict: 'id' });
      if (!res.error) {
        console.log('[updateUserProfileGoals] Clean alias UPSERT on profiles succeeded!');
        return true;
      }
      lastError = res.error;
    }

    res = await supabase.from('profiles').update(fallbackAliasPayload).eq('id', activeUserId);
    if (!res.error) {
      console.log('[updateUserProfileGoals] Fallback alias UPDATE on profiles succeeded!');
      return true;
    }

    // --- STEP 3: Self-Healing dynamic column stripper fallback ---
    console.log('[updateUserProfileGoals] Step 3: Self-healing resilient attempt on user_profiles...');
    const userProfResilient = await executeResilientUpsert('user_profiles', primaryPayload);
    if (userProfResilient.success) {
      console.log('[updateUserProfileGoals] Self-healing UPSERT on user_profiles succeeded!');
      return true;
    }

    console.log('[updateUserProfileGoals] Step 3B: Self-healing resilient attempt on profiles...');
    const profResilient = await executeResilientUpsert('profiles', fallbackAliasPayload);
    if (profResilient.success) {
      console.log('[updateUserProfileGoals] Self-healing UPSERT on profiles succeeded!');
      return true;
    }

    lastError = userProfResilient.error || profResilient.error || lastError;
    console.error('CRITICAL: All saving strategies failed for user profile goals:', lastError);

    const errorMsg = lastError?.message || 'Errore durante la sincronizzazione degli obiettivi su Supabase';
    const errObj: any = new Error(errorMsg);
    errObj.code = lastError?.code;
    errObj.details = lastError?.details;
    errObj.hint = lastError?.hint;
    throw errObj;
  },
};


