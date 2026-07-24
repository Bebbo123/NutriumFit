import React, { useState, useEffect } from 'react';
import { Dumbbell, Plus, Play, List, Clock, ChevronRight } from 'lucide-react';
import { useWorkoutStore } from '../store/workoutStore';
import { workoutService } from '../services/workoutService';
import { useAuth } from '../context/AuthContext';
import { RoutineBuilder } from '../components/workout/RoutineBuilder';
import type { Routine } from '../types/workout';

export const WorkoutPage: React.FC = () => {
  const { user } = useAuth();
  const { 
    startWorkout, 
    routines, 
    setRoutines,
    exercises,
    setExercises
  } = useWorkoutStore();
  
  const [activeTab, setActiveTab] = useState<'routines' | 'exercises'>('routines');
  const [isLoading, setIsLoading] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

  useEffect(() => {
    if (user) {
      const loadData = async () => {
        setIsLoading(true);
        const [fetchedRoutines, fetchedExercises] = await Promise.all([
          workoutService.fetchRoutines(user.id),
          workoutService.fetchExercises(user.id)
        ]);
        setRoutines(fetchedRoutines);
        setExercises(fetchedExercises);
        setIsLoading(false);
      };
      loadData();
    }
  }, [user, setRoutines, setExercises]);

  const handleStartEmptyWorkout = () => {
    startWorkout('Allenamento Libero');
  };

  const handleStartRoutine = async (routine: Routine) => {
    // Fetch the routine exercises before starting
    const routineExercises = await workoutService.fetchRoutineExercises(routine.id);
    startWorkout(routine.title, { routine, exercises: routineExercises });
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 pt-12 pb-4 sticky top-0 z-30">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Dumbbell className="w-6 h-6 text-cyan-400" />
          Allenamento
        </h1>
        
        {/* Sub-tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl mt-4">
          <button
            onClick={() => setActiveTab('routines')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'routines'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Le tue Schede
          </button>
          <button
            onClick={() => setActiveTab('exercises')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'exercises'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Esercizi
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Quick Start Card */}
        {activeTab === 'routines' && (
          <>
            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-3xl p-5 shadow-lg shadow-cyan-900/20 text-white relative overflow-hidden">
              <div className="relative z-10 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold mb-1">Workout Libero</h2>
                  <p className="text-cyan-100 text-sm">Inizia un allenamento senza scheda</p>
                </div>
                <button 
                  onClick={handleStartEmptyWorkout}
                  className="bg-white text-blue-600 p-3 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
                >
                  <Play className="w-6 h-6 fill-current" />
                </button>
              </div>
              <div className="absolute right-[-20%] bottom-[-50%] opacity-10">
                <Dumbbell className="w-48 h-48" />
              </div>
            </div>

            {/* Routines List */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-200">Le tue Schede</h3>
                <button 
                  onClick={() => setShowBuilder(true)}
                  className="text-sm font-bold text-cyan-400 bg-cyan-400/10 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-cyan-400/20 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Crea
                </button>
              </div>
              
              {isLoading ? (
                <div className="text-center py-8 text-slate-500">Caricamento...</div>
              ) : routines.length === 0 ? (
                <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800">
                  <List className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 font-medium">Nessuna scheda trovata</p>
                  <p className="text-sm text-slate-500 mt-1">Crea la tua prima scheda di allenamento!</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {routines.map(routine => (
                    <div key={routine.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-white text-lg">{routine.title}</h4>
                        <div className="flex gap-3 mt-2 text-xs font-medium text-slate-400">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 0 min</span>
                          {/* We could fetch/display num exercises here */}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleStartRoutine(routine)}
                        className="bg-cyan-500 hover:bg-cyan-400 text-white p-2.5 rounded-xl transition-colors"
                      >
                        <Play className="w-5 h-5 fill-current" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Exercises Tab */}
        {activeTab === 'exercises' && (
           <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-200">Database Esercizi</h3>
                <button className="text-sm font-bold text-cyan-400 bg-cyan-400/10 px-3 py-1.5 rounded-lg flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Nuovo
                </button>
              </div>

              {isLoading ? (
                <div className="text-center py-8 text-slate-500">Caricamento...</div>
              ) : (
                <div className="grid gap-2">
                  {exercises.map(exercise => (
                    <div key={exercise.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-200 text-sm">{exercise.name}</span>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                          {exercise.muscle_group} • {exercise.equipment}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </div>
                  ))}
                </div>
              )}
           </div>
        )}
      </div>

      {showBuilder && (
        <RoutineBuilder 
          onClose={() => setShowBuilder(false)}
          onSave={async () => {
            if (user) {
              const fetchedRoutines = await workoutService.fetchRoutines(user.id);
              setRoutines(fetchedRoutines);
            }
          }}
        />
      )}
    </div>
  );
};
