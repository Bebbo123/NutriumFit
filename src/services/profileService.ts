import { diaryService } from './diaryService';
import type { DailyGoals } from '../types/diary';

export const profileService = {
  fetchUserProfile: async (userId: string): Promise<DailyGoals | null> => {
    return diaryService.fetchProfile(userId);
  },
  updateUserProfileGoals: async (userId: string, goals: Partial<DailyGoals>): Promise<boolean> => {
    return diaryService.updateProfileGoals(userId, goals);
  },
};
