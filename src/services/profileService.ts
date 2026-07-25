import { supabase, getValidatedUserId, withTimeout } from '../utils/supabaseClient';
import { diaryService } from './diaryService';
import type { DailyGoals } from '../types/diary';

export const profileService = {
  /**
   * Fetches user profile goals strictly from public.user_profiles
   */
  fetchUserProfile: async (userId: string): Promise<DailyGoals | null> => {
    return diaryService.fetchProfile(userId);
  },

  /**
   * Updates user profile goals strictly targeting public.user_profiles
   */
  updateUserProfileGoals: async (userId: string, goals: Partial<DailyGoals>): Promise<boolean> => {
    if (!navigator.onLine) {
      console.warn('[profileService] Device is offline during updateUserProfileGoals');
      const err: any = new Error('Dispositivo offline');
      err.code = 'OFFLINE';
      throw err;
    }

    const activeUserId = (await getValidatedUserId()) || userId;
    const nowIso = new Date().toISOString();

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
    if (goals.macroInputMode !== undefined) payload.macro_input_mode = goals.macroInputMode;

    if (goals.currentWeight !== undefined) payload.current_weight = goals.currentWeight;
    if (goals.targetWeight !== undefined) payload.target_weight = goals.targetWeight;
    if (goals.weeklyGoal !== undefined) payload.weekly_goal = goals.weeklyGoal;
    if (goals.activityLevel !== undefined) payload.activity_level = goals.activityLevel;
    if (goals.age !== undefined) payload.age = goals.age;
    if (goals.gender !== undefined) payload.gender = goals.gender;
    if (goals.height !== undefined) payload.height = goals.height;

    // Clean undefined values
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    console.log('[profileService] Saving goals to user_profiles:', payload);

    let { data, error }: any = await withTimeout(
      Promise.resolve(
        supabase
          .from('user_profiles')
          .upsert(payload, { onConflict: 'id' })
          .select()
      ),
      5000,
      'updateUserProfileGoals request timed out'
    );

    if (error) {
      const errText = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`;
      // Auto-strip macro_input_mode if missing from schema cache (PGRST204)
      if (
        (error.code === 'PGRST204' || errText.includes('PGRST204') || errText.includes('schema cache')) &&
        'macro_input_mode' in payload
      ) {
        console.warn('[profileService] macro_input_mode column missing in user_profiles schema cache. Retrying without it...');
        const cleanPayload = { ...payload };
        delete cleanPayload.macro_input_mode;

        const retryRes = await supabase
          .from('user_profiles')
          .upsert(cleanPayload, { onConflict: 'id' })
          .select();

        data = retryRes.data;
        error = retryRes.error;
      }
    }

    if (error) {
      console.error('[profileService] Error saving goals to user_profiles:', error);
      const errObj: any = new Error(error.message || 'Errore durante il salvataggio degli obiettivi');
      errObj.code = error.code;
      throw errObj;
    }

    console.log('[SUPABASE SYNC OK] user_profiles:', data || payload);
    return true;
  },
};
