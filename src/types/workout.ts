export type MuscleGroup = 'Petto' | 'Dorso' | 'Spalle' | 'Bicipiti' | 'Tricipiti' | 'Gambe' | 'Core';
export type Equipment = 'Bilanciere' | 'Manubri' | 'Macchina' | 'Cavi' | 'Corpo Libero';
export type SetType = 'normal' | 'warmup' | 'drop' | 'failure';

export interface Exercise {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  equipment: Equipment;
  is_custom: boolean;
  user_id?: string | null;
  created_at?: string;
}

export interface Routine {
  id: string;
  user_id: string;
  title: string;
  created_at?: string;
}

export interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_id: string;
  order_index: number;
  target_sets?: number | null;
  target_reps?: string | null;
  exercise?: Exercise; // For UI joining
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  title: string;
  duration_seconds: number;
  total_volume: number;
  calories_burned: number;
  started_at: string;
  completed_at: string;
}

export interface WorkoutSet {
  id: string;
  workout_log_id: string;
  exercise_id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  set_type: SetType;
  is_completed: boolean;
  created_at?: string;
  
  // Active UI & Historical features
  is_temporary?: boolean; 
  prev_weight?: number | null;
  prev_reps?: number | null;
  last_week_weight?: number | null;
  last_week_reps?: number | null;
  is_pr?: boolean;
  pr_type?: 'weight' | '1rm' | 'both';
}

export interface PreviousSetPerformance {
  set_number: number;
  weight: number;
  reps: number;
  completed_at: string;
}

export interface LastWeekMax {
  weight: number;
  reps: number;
  completed_at: string;
}

export interface RoutineLastPerformed {
  routine_title: string;
  last_completed_at: string;
}

export interface ExercisePR {
  max_weight: number;
  max_1rm: number;
}

export interface ExerciseHistoryPoint {
  workout_date: string;
  max_weight: number;
  max_1rm: number;
  total_volume: number;
}

// Extends WorkoutLog with its deeply nested sets for the UI
export interface WorkoutLogWithSets extends WorkoutLog {
  sets: WorkoutSet[];
}
