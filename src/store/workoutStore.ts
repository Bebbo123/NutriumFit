import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { workoutService } from '../services/workoutService';
import type { Exercise, Routine, RoutineExercise, WorkoutSet, PreviousSetPerformance, ExercisePR } from '../types/workout';
import { v4 as uuidv4 } from 'uuid'; // Standard practice for local IDs before sync

export interface ActiveWorkout {
  id: string; // Temporary local ID or DB ID
  title: string;
  startedAt: string;
  exercises: {
    exercise: Exercise;
    sets: WorkoutSet[];
    previousSets?: PreviousSetPerformance[];
    allTimePR?: ExercisePR;
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
  startWorkout: (title: string, routine?: { routine: Routine, exercises: RoutineExercise[] }, userId?: string) => void;
  cancelWorkout: () => void;
  finishWorkout: () => ActiveWorkout | null; // Returns data to be saved to DB
  addExerciseToWorkout: (exercise: Exercise, userId?: string) => void;
  addSet: (exerciseId: string) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  updateSet: (exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
  completeSet: (exerciseId: string, setId: string, isCompleted: boolean) => void;
  copyPreviousPerformance: (exerciseId: string) => void;
  loadExerciseHistoryData: (userId: string, exerciseId: string) => Promise<void>;
  
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

      startWorkout: (title, routineData, userId) => {
        const exercises = routineData ? routineData.exercises.map(re => {
           const numSets = re.target_sets || 1;
           const initialSets: WorkoutSet[] = Array.from({ length: numSets }).map((_, i) => ({
             id: uuidv4(),
             workout_log_id: '',
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

        if (userId && exercises.length > 0) {
          exercises.forEach(ex => {
            get().loadExerciseHistoryData(userId, ex.exercise.id);
          });
        }
      },

      cancelWorkout: () => set({ activeWorkout: null, restTimerTarget: null }),

      finishWorkout: () => {
        const workout = get().activeWorkout;
        set({ activeWorkout: null, restTimerTarget: null });
        return workout;
      },

      addExerciseToWorkout: (exercise, userId) => {
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

        if (userId) {
          get().loadExerciseHistoryData(userId, exercise.id);
        }
      },

      loadExerciseHistoryData: async (userId, exerciseId) => {
        const [prevSets, prData] = await Promise.all([
          workoutService.fetchPreviousPerformance(userId, exerciseId),
          workoutService.fetchExercisePR(userId, exerciseId)
        ]);

        set((state) => {
          if (!state.activeWorkout) return state;

          const updatedExercises = state.activeWorkout.exercises.map(ex => {
            if (ex.exercise.id === exerciseId) {
              const prevMap = new Map(prevSets.map(ps => [ps.set_number, ps]));
              
              const updatedSets = ex.sets.map(s => {
                const prev = prevMap.get(s.set_number);
                return {
                  ...s,
                  prev_weight: prev ? prev.weight : s.prev_weight || null,
                  prev_reps: prev ? prev.reps : s.prev_reps || null
                };
              });

              return {
                ...ex,
                previousSets: prevSets,
                allTimePR: prData,
                sets: updatedSets
              };
            }
            return ex;
          });

          return { activeWorkout: { ...state.activeWorkout, exercises: updatedExercises } };
        });
      },

      copyPreviousPerformance: (exerciseId) => {
        set((state) => {
          if (!state.activeWorkout) return state;

          const updatedExercises = state.activeWorkout.exercises.map(ex => {
            if (ex.exercise.id === exerciseId) {
              const updatedSets = ex.sets.map(s => {
                if (!s.is_completed && (s.prev_weight !== null || s.prev_reps !== null)) {
                  return {
                    ...s,
                    weight: s.prev_weight !== undefined ? s.prev_weight : s.weight,
                    reps: s.prev_reps !== undefined ? s.prev_reps : s.reps
                  };
                }
                return s;
              });
              return { ...ex, sets: updatedSets };
            }
            return ex;
          });

          return { activeWorkout: { ...state.activeWorkout, exercises: updatedExercises } };
        });
      },

      addSet: (exerciseId) => {
        set((state) => {
          if (!state.activeWorkout) return state;
          
          const updatedExercises = state.activeWorkout.exercises.map(ex => {
            if (ex.exercise.id === exerciseId) {
              const lastSet = ex.sets[ex.sets.length - 1];
              const setNum = ex.sets.length + 1;
              const prevSet = ex.previousSets?.find(p => p.set_number === setNum);

              const newSet: WorkoutSet = {
                 id: uuidv4(),
                 workout_log_id: '',
                 exercise_id: exerciseId,
                 set_number: setNum,
                 weight: lastSet ? lastSet.weight : null,
                 reps: lastSet ? lastSet.reps : null,
                 prev_weight: prevSet ? prevSet.weight : null,
                 prev_reps: prevSet ? prevSet.reps : null,
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
              let updatedPR = ex.allTimePR ? { ...ex.allTimePR } : { max_weight: 0, max_1rm: 0 };
              
              const updatedSets = ex.sets.map(s => {
                if (s.id === setId) {
                  let isPR = false;
                  let prType: 'weight' | '1rm' | 'both' | undefined = undefined;

                  if (isCompleted && s.weight && s.reps && s.weight > 0 && s.reps > 0) {
                    const est1RM = Math.round(s.weight * (1 + s.reps / 30));
                    const isWeightPR = s.weight > updatedPR.max_weight;
                    const is1RMPR = est1RM > updatedPR.max_1rm;

                    if (isWeightPR && is1RMPR) {
                      isPR = true;
                      prType = 'both';
                    } else if (isWeightPR) {
                      isPR = true;
                      prType = 'weight';
                    } else if (is1RMPR) {
                      isPR = true;
                      prType = '1rm';
                    }

                    // Update session PR benchmark if new PR achieved
                    if (isWeightPR) updatedPR.max_weight = s.weight;
                    if (is1RMPR) updatedPR.max_1rm = est1RM;
                  }

                  return { 
                    ...s, 
                    is_completed: isCompleted,
                    is_pr: isCompleted ? isPR : false,
                    pr_type: isCompleted ? prType : undefined
                  };
                }
                return s;
              });

              return {
                ...ex,
                allTimePR: updatedPR,
                sets: updatedSets
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
