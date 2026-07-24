import { supabase } from '../utils/supabaseClient';
import type { Exercise, Routine, RoutineExercise } from '../types/workout';

export const workoutService = {
  /**
   * Fetches all global exercises + user's custom exercises.
   */
  async fetchExercises(userId: string): Promise<Exercise[]> {
    if (!navigator.onLine) {
       // fallback to indexedDB if implemented, else return empty
       return [];
    }
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .or(`is_custom.eq.false,user_id.eq.${userId}`)
      .order('name');
    
    if (error) {
      console.error('Error fetching exercises:', error);
      return [];
    }
    return data as Exercise[];
  },

  /**
   * Fetches routines for a user.
   */
  async fetchRoutines(userId: string): Promise<Routine[]> {
    if (!navigator.onLine) return [];
    
    const { data, error } = await supabase
      .from('routines')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching routines:', error);
      return [];
    }
    return data as Routine[];
  },

  /**
   * Fetches routine exercises with the nested exercise data.
   */
  async fetchRoutineExercises(routineId: string): Promise<RoutineExercise[]> {
    if (!navigator.onLine) return [];
    
    const { data, error } = await supabase
      .from('routine_exercises')
      .select(`
        *,
        exercise:exercises (*)
      `)
      .eq('routine_id', routineId)
      .order('order_index');
      
    if (error) {
      console.error('Error fetching routine exercises:', error);
      return [];
    }
    return data as RoutineExercise[];
  },

  /**
   * Saves a completed workout log and its sets to Supabase.
   */
  async saveWorkout(userId: string, workout: any, durationSeconds: number): Promise<boolean> {
    if (!navigator.onLine) {
      // Offline queue logic can be added here
      console.warn('Offline mode: saving workout locally not fully implemented yet.');
      return false;
    }

    try {
      // Calculate total volume and calories
      let totalVolume = 0;
      workout.exercises.forEach((ex: any) => {
        ex.sets.forEach((set: any) => {
           if (set.is_completed && set.weight && set.reps) {
             totalVolume += set.weight * set.reps;
           }
        });
      });

      // Basic estimation: 6 calories per minute of active workout (configurable later)
      const minutes = Math.floor(durationSeconds / 60);
      const caloriesBurned = Math.max(0, minutes * 6);

      // 1. Insert Workout Log
      const { data: logData, error: logError } = await supabase
        .from('workout_logs')
        .insert({
          user_id: userId,
          title: workout.title || 'Allenamento Rapido',
          duration_seconds: durationSeconds,
          total_volume: totalVolume,
          calories_burned: caloriesBurned,
          started_at: workout.startedAt,
          completed_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (logError) throw logError;

      const logId = logData.id;

      // 2. Insert Sets
      const setsToInsert: any[] = [];
      workout.exercises.forEach((ex: any) => {
         ex.sets.forEach((set: any) => {
           // only save completed sets or sets with data
           if (set.is_completed || (set.weight && set.reps)) {
             setsToInsert.push({
               workout_log_id: logId,
               exercise_id: ex.exercise.id,
               set_number: set.set_number,
               weight: set.weight,
               reps: set.reps,
               set_type: set.set_type,
               is_completed: set.is_completed
             });
           }
         });
      });

      if (setsToInsert.length > 0) {
        const { error: setsError } = await supabase
          .from('workout_sets')
          .insert(setsToInsert);
          
        if (setsError) throw setsError;
      }

      return true;
    } catch (err) {
      console.error('Error saving workout:', err);
      return false;
    }
  },

  /**
   * Retrieves today's workout logs to calculate total calories burned.
   */
  async fetchTodayWorkoutCalories(userId: string, dateStr: string): Promise<number> {
    if (!navigator.onLine) return 0;
    
    // dateStr is 'YYYY-MM-DD'
    const startDate = `${dateStr}T00:00:00Z`;
    const endDate = `${dateStr}T23:59:59Z`;

    const { data, error } = await supabase
      .from('workout_logs')
      .select('calories_burned')
      .eq('user_id', userId)
      .gte('completed_at', startDate)
      .lte('completed_at', endDate);
      
    if (error) {
      console.error('Error fetching today workout calories:', error);
      return 0;
    }
    
    return data.reduce((sum, log) => sum + (log.calories_burned || 0), 0);
  }
};
