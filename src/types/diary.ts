export type MealType = 'Colazione' | 'Pranzo' | 'Cena' | 'Spuntini';

export interface Macros {
  carbs: number;   // grams (Blue #3B82F6)
  fat: number;     // grams (Red #EF4444)
  protein: number; // grams (Green #22C55E)
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  servingSize: string;
  servingUnit: string;
  servingAmount: number;
  calories: number;
  macros: Macros;
  fiberGrams?: number;
  sugarGrams?: number;
  sodiumMg?: number;
  barcode?: string;
  isVerified?: boolean;
  healthScore?: number;       // 0 - 100 percentage
  nutriscoreGrade?: string;   // 'a' | 'b' | 'c' | 'd' | 'e'
  novaGroup?: number;         // 1, 2, 3, 4
}

export interface LoggedFood {
  logId: string;
  foodId: string;
  name: string;
  brand?: string;
  servings: number;
  servingSizeDisplay: string;
  calories: number;
  macros: Macros;
  mealType: MealType;
  loggedAt: string; // ISO string or time string
  grams?: number;
  portionMode?: 'grams' | 'portions';
  unitWeightGrams?: number;
  healthScore?: number;       // 0 - 100 percentage
  nutriscoreGrade?: string;
}

export interface DailyGoals {
  calories: number;
  carbs: number;   // goal in grams
  fat: number;     // goal in grams
  protein: number; // goal in grams
  waterMl: number; // goal in ml
  steps: number;   // goal step count
  macroInputMode?: 'grams' | 'percentages';
  currentWeight?: number;
  targetWeight?: number;
  weeklyGoal?: string;
  activityLevel?: string;
  age?: number;
  gender?: string;
  height?: number;
}

export interface DiaryState {
  selectedDate: string; // YYYY-MM-DD
  goals: DailyGoals;
  logs: Record<string, LoggedFood[]>; // map date string to list of logged foods
  exerciseCalories: number;
  waterIntakeMl: Record<string, number>; // map date string to consumed water
  stepsCount: Record<string, number>; // map date string to steps
}

export interface RecipeIngredient {
  id?: string;
  recipe_id?: string;
  food_name: string;
  calories: number;
  carbs: number;
  fat: number;
  protein: number;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  servings: number;
  created_at?: string;
  ingredients?: RecipeIngredient[];
}

export interface SavedMealItem {
  id?: string;
  saved_meal_id?: string;
  food_name: string;
  calories: number;
  carbs: number;
  fat: number;
  protein: number;
  servings: number;
  serving_size_display: string;
}

export interface SavedMeal {
  id: string;
  user_id: string;
  name: string;
  created_at?: string;
  items?: SavedMealItem[];
}
