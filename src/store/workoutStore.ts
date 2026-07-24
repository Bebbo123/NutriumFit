import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Exercise, Routine, RoutineExercise, WorkoutSet } from '../types/workout';
import { v4 as uuidv4 } from 'uuid'; // Standard practice for local IDs before sync

export interface ActiveWorkout {
  id: string; // Temporary local ID or DB ID
  title: string;
  startedAt: string;
  exercises: {
    exercise: Exercise;
    sets: WorkoutSet[];
  }[];
}

interface WorkoutStore {
  activeWorkout: ActiveWorkout | null;
  exercises: Exercise[];
  routines: Routine[];
  routineExercises: Record<string, RoutineExercise[]>; // routine_id -> exercises
  restTimerTarget: number | null; // Timestamp when rest is over
  restTimerDuration: number; // Configurable (e.g. 90s)
  
  // Actions
  setExercises: (exercises: Exercise[]) => void;
  setRoutines: (routines: Routine[]) => void;
  setRoutineExercises: (routineId: string, exercises: RoutineExercise[]) => void;
  
  // Active Workout Flow
  startWorkout: (title: string, routine?: { routine: Routine, exercises: RoutineExercise[] }) => void;
  cancelWorkout: () => void;
  finishWorkout: () => ActiveWorkout | null; // Returns data to be saved to DB
  addExerciseToWorkout: (exercise: Exercise) => void;
  addSet: (exerciseId: string) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  updateSet: (exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
  completeSet: (exerciseId: string, setId: string, isCompleted: boolean) => void;
  
  // Timer
  startRestTimer: (durationSeconds: number) => void;
  clearRestTimer: () => void;
  adjustRestTimer: (seconds: number) => void;
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      activeWorkout: null,
      exercises: [],
      routines: [],
      routineExercises: {},
      restTimerTarget: null,
      restTimerDuration: 90,

      setExercises: (exercises) => set({ exercises }),
      setRoutines: (routines) => set({ routines }),
      setRoutineExercises: (routineId, exercises) => 
        set((state) => ({ 
          routineExercises: { ...state.routineExercises, [routineId]: exercises } 
        })),

      startWorkout: (title, routineData) => {
        const exercises = routineData ? routineData.exercises.map(re => {
           // Create empty sets based on target_sets if available
           const numSets = re.target_sets || 1;
           const initialSets: WorkoutSet[] = Array.from({ length: numSets }).map((_, i) => ({
             id: uuidv4(),
             workout_log_id: '', // to be assigned on finish
             exercise_id: re.exercise_id,
             set_number: i + 1,
             weight: null,
             reps: null,
             set_type: 'normal',
             is_completed: false,
             is_temporary: true
           }));
           return {
             exercise: re.exercise!,
             sets: initialSets
           };
        }) : [];

        set({
          activeWorkout: {
            id: uuidv4(),
            title,
            startedAt: new Date().toISOString(),
            exercises
          }
        });
      },

      cancelWorkout: () => set({ activeWorkout: null, restTimerTarget: null }),

      finishWorkout: () => {
        const workout = get().activeWorkout;
        set({ activeWorkout: null, restTimerTarget: null });
        return workout;
      },

      addExerciseToWorkout: (exercise) => {
        set((state) => {
          if (!state.activeWorkout) return state;
          
          const newSet: WorkoutSet = {
             id: uuidv4(),
             workout_log_id: '',
             exercise_id: exercise.id,
             set_number: 1,
             weight: null,
             reps: null,
             set_type: 'normal',
             is_completed: false,
             is_temporary: true
          };

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: [
                ...state.activeWorkout.exercises,
                { exercise, sets: [newSet] }
              ]
            }
          };
        });
      },

      addSet: (exerciseId) => {
        set((state) => {
          if (!state.activeWorkout) return state;
          
          const updatedExercises = state.activeWorkout.exercises.map(ex => {
            if (ex.exercise.id === exerciseId) {
              const lastSet = ex.sets[ex.sets.length - 1];
              const newSet: WorkoutSet = {
                 id: uuidv4(),
                 workout_log_id: '',
                 exercise_id: exerciseId,
                 set_number: ex.sets.length + 1,
                 weight: lastSet ? lastSet.weight : null, // copy previous weight
                 reps: lastSet ? lastSet.reps : null,
                 set_type: 'normal',
                 is_completed: false,
                 is_temporary: true
              };
              return { ...ex, sets: [...ex.sets, newSet] };
            }
            return ex;
          });

          return { activeWorkout: { ...state.activeWorkout, exercises: updatedExercises } };
        });
      },

      removeSet: (exerciseId, setId) => {
        set((state) => {
          if (!state.activeWorkout) return state;
          
          const updatedExercises = state.activeWorkout.exercises.map(ex => {
            if (ex.exercise.id === exerciseId) {
              const remaining = ex.sets.filter(s => s.id !== setId);
              // re-number sets
              remaining.forEach((s, i) => s.set_number = i + 1);
              return { ...ex, sets: remaining };
            }
            return ex;
          });

          return { activeWorkout: { ...state.activeWorkout, exercises: updatedExercises } };
        });
      },

      updateSet: (exerciseId, setId, updates) => {
        set((state) => {
          if (!state.activeWorkout) return state;
          
          const updatedExercises = state.activeWorkout.exercises.map(ex => {
            if (ex.exercise.id === exerciseId) {
              return {
                ...ex,
                sets: ex.sets.map(s => s.id === setId ? { ...s, ...updates } : s)
              };
            }
            return ex;
          });

          return { activeWorkout: { ...state.activeWorkout, exercises: updatedExercises } };
        });
      },

      completeSet: (exerciseId, setId, isCompleted) => {
        set((state) => {
          if (!state.activeWorkout) return state;
          
          const updatedExercises = state.activeWorkout.exercises.map(ex => {
            if (ex.exercise.id === exerciseId) {
              return {
                ...ex,
                sets: ex.sets.map(s => s.id === setId ? { ...s, is_completed: isCompleted } : s)
              };
            }
            return ex;
          });

          return { activeWorkout: { ...state.activeWorkout, exercises: updatedExercises } };
        });
        
        // Trigger timer if completed
        if (isCompleted) {
          get().startRestTimer(get().restTimerDuration);
        }
      },

      startRestTimer: (durationSeconds) => {
        set({ 
          restTimerTarget: Date.now() + durationSeconds * 1000,
          restTimerDuration: durationSeconds 
        });
      },

      clearRestTimer: () => {
        set({ restTimerTarget: null });
      },

      adjustRestTimer: (seconds) => {
        set((state) => {
          if (!state.restTimerTarget) return state;
          return { restTimerTarget: state.restTimerTarget + seconds * 1000 };
        });
      }

    }),
    {
      name: 'nutriumfit-workout-storage', // name of item in the storage (must be unique)
      partialize: (state) => ({ 
        activeWorkout: state.activeWorkout,
        restTimerTarget: state.restTimerTarget,
        restTimerDuration: state.restTimerDuration
      }), // only save active workout and timer state
    }
  )
);
