import { supabase } from '../utils/supabaseClient';
import { diaryService } from './diaryService';
import type { DailyGoals } from '../types/diary';

export const profileService = {
  fetchUserProfile: async (userId: string): Promise<DailyGoals | null> => {
    return diaryService.fetchProfile(userId);
  },
  updateUserProfileGoals: async (userId: string, goals: Partial<DailyGoals>): Promise<boolean> => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      const err: any = new Error("Utente non autenticato. Effettua il login per salvare gli obiettivi");
      err.code = 'UNAUTHENTICATED';
      throw err;
    }
    return diaryService.updateProfileGoals(authData.user.id || userId, goals);
  },
};

