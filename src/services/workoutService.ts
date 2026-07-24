import { supabase } from '../utils/supabaseClient';
import type { Exercise, Routine, RoutineExercise, PreviousSetPerformance, ExercisePR, ExerciseHistoryPoint, LastWeekMax, RoutineLastPerformed, WorkoutLogWithSets } from '../types/workout';

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
  },

  /**
   * Fetches previous performance sets for a specific exercise.
   */
  async fetchPreviousPerformance(userId: string, exerciseId: string): Promise<PreviousSetPerformance[]> {
    if (!navigator.onLine) return [];
    
    const { data, error } = await supabase.rpc('get_last_exercise_performance', {
      p_user_id: userId,
      p_exercise_id: exerciseId
    });

    if (error) {
      console.error('Error fetching previous performance:', error);
      return [];
    }
    return (data || []) as PreviousSetPerformance[];
  },

  /**
   * Fetches all-time PRs (Max Weight, Max 1RM) for a specific exercise.
   */
  async fetchExercisePR(userId: string, exerciseId: string): Promise<ExercisePR> {
    if (!navigator.onLine) return { max_weight: 0, max_1rm: 0 };
    
    const { data, error } = await supabase.rpc('get_exercise_all_time_pr', {
      p_user_id: userId,
      p_exercise_id: exerciseId
    });

    if (error || !data || data.length === 0) {
      if (error) console.error('Error fetching exercise PR:', error);
      return { max_weight: 0, max_1rm: 0 };
    }
    
    return {
      max_weight: Number(data[0].max_weight || 0),
      max_1rm: Number(data[0].max_1rm || 0)
    };
  },

  /**
   * Fetches historical progression over time for analytics charts.
   */
  async fetchExerciseHistory(userId: string, exerciseId: string): Promise<ExerciseHistoryPoint[]> {
    if (!navigator.onLine) return [];

    const { data, error } = await supabase.rpc('get_exercise_history', {
      p_user_id: userId,
      p_exercise_id: exerciseId
    });

    if (error) {
      console.error('Error fetching exercise history:', error);
      return [];
    }
    return (data || []) as ExerciseHistoryPoint[];
  },

  /**
   * Updates an existing routine's title and routine_exercises.
   */
  async updateRoutine(
    routineId: string, 
    title: string, 
    exercises: { exercise_id: string; target_sets: number; target_reps: string }[]
  ): Promise<boolean> {
    if (!navigator.onLine) return false;
    try {
      // 1. Update Title
      const { error: titleError } = await supabase
        .from('routines')
        .update({ title })
        .eq('id', routineId);
      if (titleError) throw titleError;

      // 2. Delete old routine exercises
      const { error: deleteError } = await supabase
        .from('routine_exercises')
        .delete()
        .eq('routine_id', routineId);
      if (deleteError) throw deleteError;

      // 3. Insert new routine exercises
      const newRoutineExercises = exercises.map((ex, index) => ({
        routine_id: routineId,
        exercise_id: ex.exercise_id,
        order_index: index,
        target_sets: ex.target_sets,
        target_reps: ex.target_reps
      }));

      const { error: insertError } = await supabase
        .from('routine_exercises')
        .insert(newRoutineExercises);
      if (insertError) throw insertError;

      return true;
    } catch (err) {
      console.error('Error updating routine:', err);
      return false;
    }
  },

  /**
   * Deletes a routine and its associated exercises.
   */
  async deleteRoutine(routineId: string): Promise<boolean> {
    if (!navigator.onLine) return false;
    const { error } = await supabase
      .from('routines')
      .delete()
      .eq('id', routineId);

    if (error) {
      console.error('Error deleting routine:', error);
      return false;
    }
    return true;
  },

  /**
   * Deletes a completed workout log and its associated sets.
   */
  async deleteWorkoutLog(logId: string): Promise<boolean> {
    if (!navigator.onLine) return false;
    const { error } = await supabase
      .from('workout_logs')
      .delete()
      .eq('id', logId);

    if (error) {
      console.error('Error deleting workout log:', error);
      return false;
    }
    return true;
  },

  /**
   * Fetches highest weight lifted in the previous calendar week (7 to 14 days ago).
   */
  async fetchLastWeekExerciseMax(userId: string, exerciseId: string): Promise<LastWeekMax | null> {
    if (!navigator.onLine) return null;
    const { data, error } = await supabase.rpc('get_last_week_exercise_max', {
      p_user_id: userId,
      p_exercise_id: exerciseId
    });

    if (error || !data || data.length === 0) return null;
    return data[0] as LastWeekMax;
  },

  /**
   * Fetches last performed timestamp for user routines.
   */
  async fetchRoutineLastPerformed(userId: string): Promise<RoutineLastPerformed[]> {
    if (!navigator.onLine) return [];
    const { data, error } = await supabase.rpc('get_routine_last_performed_dates', {
      p_user_id: userId
    });

    if (error || !data) return [];
    return data as RoutineLastPerformed[];
  },

  /**
   * Fetches completed workout logs with sets for past X months for history view & PDF export.
   */
  async fetchWorkoutHistoryLogs(userId: string, months: number = 6): Promise<WorkoutLogWithSets[]> {
    if (!navigator.onLine) return [];

    const { data: logsData, error: logsError } = await supabase
      .from('workout_logs')
      .select(`
        *,
        sets:workout_sets (
          *,
          exercise:exercises (name)
        )
      `)
      .eq('user_id', userId)
      .gte('completed_at', new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('completed_at', { ascending: false });

    if (logsError || !logsData) {
      console.error('Error fetching workout history logs:', logsError);
      return [];
    }

    return logsData as WorkoutLogWithSets[];
  }
};
