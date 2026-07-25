import Dexie, { type Table } from 'dexie';

export interface CachedLog {
  logId: string;
  userId: string;
  date: string;
  foodItemJson: string; // Serialized FoodItem object
  mealType: string;
  servings: number;
}

export interface CachedWeightLog {
  key: string; // userId_date
  userId: string;
  date: string;
  weight: number;
}

export interface CachedWaterLog {
  key: string; // userId_date
  userId: string;
  date: string;
  waterMl: number;
}

export interface CachedCustomFood {
  id: string;
  userId: string;
  name: string;
  brand?: string;
  calories: number;
  carbs: number;
  fat: number;
  protein: number;
}

export interface CachedUserPortion {
  key: string; // userId_foodId
  userId: string;
  foodId: string;
  portionWeightG: number;
}

export interface OfflineAction {
  id?: number;
  action: 'addFood' | 'removeFood' | 'updateWater' | 'logWeight' | 'deleteWeight' | 'updateGoals';
  payload: any; // action arguments
  timestamp: number;
}

class NutriumFitDatabase extends Dexie {
  logs!: Table<CachedLog>;
  weightLogs!: Table<CachedWeightLog>;
  waterLogs!: Table<CachedWaterLog>;
  customFoods!: Table<CachedCustomFood>;
  userPortions!: Table<CachedUserPortion>;
  offlineQueue!: Table<OfflineAction>;

  constructor() {
    super('NutriumFitDatabase');
    this.version(2).stores({
      logs: 'logId, userId, date',
      weightLogs: 'key, userId, date',
      waterLogs: 'key, userId, date',
      customFoods: 'id, userId, name',
      userPortions: 'key, userId, foodId',
      offlineQueue: '++id, action, timestamp',
    });
  }
}

export const db = new NutriumFitDatabase();
