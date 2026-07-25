import React, { useState, useEffect, useMemo } from 'react';
import { Dumbbell, Plus, Play, List, ChevronRight, TrendingUp, Edit3, Trash2, Calendar, FileText, Activity, Search } from 'lucide-react';
import { useWorkoutStore } from '../store/workoutStore';
import { workoutService } from '../services/workoutService';
import { useDiaryStore } from '../store/diaryStore';
import { useAuth } from '../context/AuthContext';
import { RoutineBuilder } from '../components/workout/RoutineBuilder';
import { CreateExerciseModal } from '../components/workout/CreateExerciseModal';
import { WorkoutAnalyticsPage } from './WorkoutAnalyticsPage';
import { WorkoutPdfExporter } from '../components/workout/WorkoutPdfExporter';
import type { Routine, WorkoutLogWithSets, RoutineLastPerformed, Exercise } from '../types/workout';

export const WorkoutPage: React.FC = () => {
  const { user } = useAuth();
  const { fetchExerciseCalories, selectedDate } = useDiaryStore();
  const { 
    startWorkout, 
    routines, 
    setRoutines,
    exercises,
    setExercises,
    updateCustomExerciseStore,
    deleteCustomExerciseStore
  } = useWorkoutStore();
  
  const [activeTab, setActiveTab] = useState<'routines' | 'exercises' | 'history'>('routines');
  const [isLoading, setIsLoading] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showCreateExerciseModal, setShowCreateExerciseModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [routineToEdit, setRoutineToEdit] = useState<{ routine: Routine; exercises: any[] } | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showPdfExporter, setShowPdfExporter] = useState(false);

  // Phase 10 States
  const [historyLogs, setHistoryLogs] = useState<WorkoutLogWithSets[]>([]);
  const [routineLastPerformed, setRoutineLastPerformed] = useState<RoutineLastPerformed[]>([]);
  const [cycleDaysFilter, setCycleDaysFilter] = useState<7 | 30>(7);

  const loadAllData = async () => {
    if (!user) return;
    setIsLoading(true);
    const [fetchedRoutines, fetchedExercises, lastPerformed, logs] = await Promise.all([
      workoutService.fetchRoutines(user.id),
      workoutService.fetchExercises(user.id),
      workoutService.fetchRoutineLastPerformed(user.id),
      workoutService.fetchWorkoutHistoryLogs(user.id, 6)
    ]);
    setRoutines(fetchedRoutines);
    setExercises(fetchedExercises);
    setRoutineLastPerformed(lastPerformed);
    setHistoryLogs(logs);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, [user]);

  const handleStartEmptyWorkout = () => {
    if (user) {
      startWorkout('Allenamento Libero', undefined, user.id);
    } else {
      startWorkout('Allenamento Libero');
    }
  };

  const handleStartRoutine = async (routine: Routine) => {
    const routineExercises = await workoutService.fetchRoutineExercises(routine.id);
    if (user) {
      startWorkout(routine.title, { routine, exercises: routineExercises }, user.id);
    } else {
      startWorkout(routine.title, { routine, exercises: routineExercises });
    }
  };

  const handleEditRoutine = async (routine: Routine) => {
    setIsLoading(true);
    const routineExercises = await workoutService.fetchRoutineExercises(routine.id);
    const formatted = routineExercises.map(re => ({
      exercise: re.exercise!,
      sets: re.target_sets || 3,
      reps: re.target_reps || '8-12'
    }));
    setRoutineToEdit({ routine, exercises: formatted });
    setShowBuilder(true);
    setIsLoading(false);
  };

  const handleDeleteRoutine = async (routine: Routine) => {
    if (!window.confirm(`Sei sicuro di voler eliminare la scheda "${routine.title}"?`)) return;
    const success = await workoutService.deleteRoutine(routine.id);
    if (success) {
      loadAllData();
    } else {
      alert('Errore durante l\'eliminazione della scheda.');
    }
  };

  const handleDeleteWorkoutLog = async (logId: string, title: string) => {
    if (!window.confirm(`Sei sicuro di voler eliminare l'allenamento "${title}" dal tuo storico?`)) return;
    const success = await workoutService.deleteWorkoutLog(logId);
    if (success) {
      if (user) {
        await fetchExerciseCalories(user.id, selectedDate);
      }
      loadAllData();
    } else {
      alert('Errore durante l\'eliminazione dell\'allenamento.');
    }
  };

  // Helper for last performed badge text
  const getLastPerformedText = (title: string) => {
    const record = routineLastPerformed.find(r => r.routine_title === title);
    if (!record || !record.last_completed_at) return 'Mai svolta';

    const completedDate = new Date(record.last_completed_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - completedDate.getTime()) / (1000 * 3600 * 24));

    if (diffDays === 0) return 'Ultima: Oggi';
    if (diffDays === 1) return 'Ultima: Ieri';
    return `Ultima: ${diffDays} giorni fa`;
  };

  // Filter completed cycle sequence for 7 / 30 days
  const filteredCycleLogs = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - cycleDaysFilter);
    return historyLogs
      .filter(l => new Date(l.completed_at) >= cutoff)
      .reverse(); // Chronological
  }, [historyLogs, cycleDaysFilter]);

  const filteredExercises = useMemo(() => {
    if (!exerciseSearch.trim()) return exercises;
    const query = exerciseSearch.toLowerCase();
    return exercises.filter(
      (ex) =>
        ex.name.toLowerCase().includes(query) ||
        ex.muscle_group.toLowerCase().includes(query) ||
        ex.equipment.toLowerCase().includes(query)
    );
  }, [exercises, exerciseSearch]);

  const handleDeleteCustomExercise = async (exercise: Exercise) => {
    if (!window.confirm(`Sei sicuro di voler eliminare l'esercizio "${exercise.name}"?`)) return;
    await workoutService.deleteCustomExercise(exercise.id);
    deleteCustomExerciseStore(exercise.id);
  };

  if (showAnalytics) {
    return <WorkoutAnalyticsPage onBack={() => setShowAnalytics(false)} />;
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 pt-safe pb-4 sticky top-0 z-30">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-cyan-400" />
            Allenamento
          </h1>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowPdfExporter(true)}
              className="text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-xl flex items-center gap-1 border border-slate-700 transition-all cursor-pointer"
              title="Esporta report PDF"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" /> PDF
            </button>
            <button 
              onClick={() => setShowAnalytics(true)}
              className="text-xs font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-cyan-500/20 transition-all cursor-pointer"
            >
              <TrendingUp className="w-4 h-4" /> Analisi
            </button>
          </div>
        </div>
        
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
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Storico
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Routines Tab */}
        {activeTab === 'routines' && (
          <>
            {/* Quick Start Card */}
            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-3xl p-5 shadow-lg shadow-cyan-900/20 text-white relative overflow-hidden">
              <div className="relative z-10 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold mb-1">Workout Libero</h2>
                  <p className="text-cyan-100 text-sm">Inizia un allenamento senza scheda</p>
                </div>
                <button 
                  onClick={handleStartEmptyWorkout}
                  className="bg-white text-blue-600 p-3 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                >
                  <Play className="w-6 h-6 fill-current" />
                </button>
              </div>
              <div className="absolute right-[-20%] bottom-[-50%] opacity-10">
                <Dumbbell className="w-48 h-48" />
              </div>
            </div>

            {/* Cycle Overview Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Ciclo Allenamenti
                  </h3>
                </div>
                <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                  <button
                    onClick={() => setCycleDaysFilter(7)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${cycleDaysFilter === 7 ? 'bg-cyan-500 text-white' : 'text-slate-400'}`}
                  >
                    7 Giorni
                  </button>
                  <button
                    onClick={() => setCycleDaysFilter(30)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${cycleDaysFilter === 30 ? 'bg-cyan-500 text-white' : 'text-slate-400'}`}
                  >
                    30 Giorni
                  </button>
                </div>
              </div>

              {filteredCycleLogs.length === 0 ? (
                <div className="text-xs text-slate-500 italic py-1">
                  Nessun allenamento completato negli ultimi {cycleDaysFilter} giorni.
                </div>
              ) : (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {filteredCycleLogs.map((log, idx) => (
                    <React.Fragment key={log.id}>
                      {idx > 0 && <span className="text-slate-600 font-bold text-xs">→</span>}
                      <div className="bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-xl shrink-0">
                        <div className="text-xs font-bold text-cyan-400">{log.title}</div>
                        <div className="text-[9px] text-slate-500 font-mono">
                          {new Date(log.completed_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* Routines List */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-200">Le tue Schede</h3>
                <button 
                  onClick={() => {
                    setRoutineToEdit(null);
                    setShowBuilder(true);
                  }}
                  className="text-sm font-bold text-cyan-400 bg-cyan-400/10 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-cyan-400/20 transition-colors cursor-pointer"
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
                  {routines.map(routine => {
                    const lastText = getLastPerformedText(routine.title);
                    return (
                      <div key={routine.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-lg">{routine.title}</h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              lastText.includes('Oggi') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              lastText.includes('Ieri') ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {lastText}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditRoutine(routine)}
                            className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-colors cursor-pointer"
                            title="Modifica Scheda"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRoutine(routine)}
                            className="p-2 text-red-400/70 hover:text-red-400 bg-red-950/30 rounded-xl transition-colors cursor-pointer"
                            title="Elimina Scheda"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleStartRoutine(routine)}
                            className="bg-cyan-500 hover:bg-cyan-400 text-white p-2.5 rounded-xl transition-colors cursor-pointer ml-1"
                            title="Inizia Scheda"
                          >
                            <Play className="w-5 h-5 fill-current" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Exercises Tab */}
        {activeTab === 'exercises' && (
           <div>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-200">Database Esercizi</h3>
                  <p className="text-xs text-slate-400">Gestisci ed esegui i tuoi esercizi custom</p>
                </div>
                <button
                  onClick={() => {
                    setEditingExercise(null);
                    setShowCreateExerciseModal(true);
                  }}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" /> Nuovo
                </button>
              </div>

              {/* Search Input Bar */}
              <div className="relative mb-4">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  placeholder="Cerca per nome, muscolo o attrezzatura..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-2 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-cyan-500"
                />
              </div>

              {isLoading ? (
                <div className="text-center py-8 text-slate-500">Caricamento...</div>
              ) : filteredExercises.length === 0 ? (
                <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                  Nessun esercizio trovato.
                </div>
              ) : (
                <div className="grid gap-2">
                  {filteredExercises.map(exercise => (
                    <div key={exercise.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 flex justify-between items-center">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100 text-sm">{exercise.name}</span>
                          {exercise.is_custom && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 font-bold border border-cyan-800/40">
                              Custom
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                          {exercise.muscle_group} • {exercise.equipment}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {exercise.is_custom ? (
                          <>
                            <button
                              onClick={() => {
                                setEditingExercise(exercise);
                                setShowCreateExerciseModal(true);
                              }}
                              className="p-1.5 text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 rounded-xl border border-cyan-800/40 transition-colors cursor-pointer"
                              title="Modifica Esercizio"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCustomExercise(exercise)}
                              className="p-1.5 text-red-400 hover:text-red-300 bg-red-950/60 rounded-xl border border-red-800/40 transition-colors cursor-pointer"
                              title="Elimina Esercizio"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
           </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-200">Storico Allenamenti Svolti</h3>
              <span className="text-xs text-slate-400 font-mono">{historyLogs.length} sessioni</span>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-slate-500">Caricamento storico...</div>
            ) : historyLogs.length === 0 ? (
              <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800">
                <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">Nessun allenamento registrato</p>
                <p className="text-sm text-slate-500 mt-1">I tuoi allenamenti completati appariranno qui!</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {historyLogs.map(log => {
                  const dateStr = new Date(log.completed_at).toLocaleDateString('it-IT', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });
                  return (
                    <div key={log.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-white text-base">{log.title}</h4>
                          <span className="text-xs text-cyan-400 font-mono">{dateStr}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteWorkoutLog(log.id, log.title)}
                          className="text-red-400/60 hover:text-red-400 p-1.5 bg-red-950/30 rounded-xl transition-colors cursor-pointer"
                          title="Elimina allenamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex gap-4 text-xs font-semibold text-slate-400 mt-3 pt-3 border-t border-slate-800">
                        <div><span className="text-slate-500 uppercase text-[10px] block">Durata</span>{Math.floor(log.duration_seconds / 60)} min</div>
                        <div><span className="text-slate-500 uppercase text-[10px] block">Volume</span>{log.total_volume} kg</div>
                        <div><span className="text-slate-500 uppercase text-[10px] block">Calorie</span>{log.calories_burned} kcal</div>
                      </div>

                      {log.notes && (
                        <div className="mt-3 p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs text-slate-300">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-0.5">
                            <FileText className="w-3 h-3 text-cyan-400" />
                            Note Allenamento:
                          </div>
                          <p className="italic text-slate-300 font-sans">{log.notes}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {showBuilder && (
        <RoutineBuilder 
          routineToEdit={routineToEdit}
          onClose={() => {
            setShowBuilder(false);
            setRoutineToEdit(null);
          }}
          onSave={async () => {
            loadAllData();
            setShowBuilder(false);
            setRoutineToEdit(null);
          }}
        />
      )}

      {showCreateExerciseModal && (
        <CreateExerciseModal
          exerciseToEdit={editingExercise}
          onClose={() => {
            setShowCreateExerciseModal(false);
            setEditingExercise(null);
          }}
          onCreated={(newEx) => {
            setExercises([newEx, ...exercises]);
            setShowCreateExerciseModal(false);
          }}
          onUpdated={(updatedEx) => {
            updateCustomExerciseStore(updatedEx.id, updatedEx);
            setShowCreateExerciseModal(false);
            setEditingExercise(null);
          }}
        />
      )}

      {showPdfExporter && (
        <WorkoutPdfExporter onClose={() => setShowPdfExporter(false)} />
      )}
    </div>
  );
};
