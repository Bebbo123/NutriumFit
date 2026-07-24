import React, { useState, useEffect } from 'react';
import { X, Check, Plus, Dumbbell, Timer, Minus, Trophy, Copy } from 'lucide-react';
import { useWorkoutStore } from '../../store/workoutStore';
import { workoutService } from '../../services/workoutService';
import { useAuth } from '../../context/AuthContext';


export const LiveWorkoutModal: React.FC = () => {
  const { user } = useAuth();
  const { 
    activeWorkout, 
    exercises,
    cancelWorkout, 
    finishWorkout,
    addExerciseToWorkout,
    addSet,
    removeSet,
    updateSet,
    completeSet,
    copyPreviousPerformance
  } = useWorkoutStore();

  const [elapsed, setElapsed] = useState(0);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Timer logic
  useEffect(() => {
    if (!activeWorkout) return;
    const startTime = new Date(activeWorkout.startedAt).getTime();
    
    const updateTimer = () => {
      const now = Date.now();
      setElapsed(Math.floor((now - startTime) / 1000));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeWorkout]);

  if (!activeWorkout) return null;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleFinish = async () => {
    if (!user) return;
    setIsFinishing(true);
    const workout = finishWorkout();
    if (workout) {
      await workoutService.saveWorkout(user.id, workout, elapsed);
    }
    setIsFinishing(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 shrink-0">
        <button 
          onClick={cancelWorkout}
          className="text-slate-400 hover:text-white p-2 -ml-2"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-white font-bold">{activeWorkout.title}</span>
          <span className="text-cyan-400 text-sm font-mono flex items-center gap-1">
            <Timer className="w-3.5 h-3.5" />
            {formatTime(elapsed)}
          </span>
        </div>
        <button 
          onClick={handleFinish}
          disabled={isFinishing}
          className="bg-cyan-500 hover:bg-cyan-400 text-white px-4 py-1.5 rounded-lg font-bold text-sm disabled:opacity-50 transition-colors"
        >
          {isFinishing ? 'Salvo...' : 'Fine'}
        </button>
      </div>

      {/* Body: Workout Exercises */}
      <div className="flex-1 overflow-y-auto p-2 pb-32">
        {activeWorkout.exercises.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <Dumbbell className="w-12 h-12 mb-3 opacity-20" />
            <p>Nessun esercizio aggiunto.</p>
            <p className="text-sm mt-1">Inizia ad aggiungere esercizi al tuo workout!</p>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {activeWorkout.exercises.map((ex, exIndex) => (
              <div key={ex.exercise.id + exIndex} className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
                <div className="p-3 border-b border-slate-800/50 bg-slate-900/50 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-cyan-50 text-sm text-shadow-sm">{ex.exercise.name}</h3>
                    {ex.allTimePR && (ex.allTimePR.max_weight > 0 || ex.allTimePR.max_1rm > 0) && (
                      <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                        <Trophy className="w-3 h-3 text-amber-400" /> Record: {ex.allTimePR.max_weight}kg | 1RM: {ex.allTimePR.max_1rm}kg
                      </span>
                    )}
                  </div>
                  {ex.previousSets && ex.previousSets.length > 0 && (
                    <button 
                      onClick={() => copyPreviousPerformance(ex.exercise.id)}
                      className="text-xs font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors"
                      title="Copia dati dalla volta precedente"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copia Prec.
                    </button>
                  )}
                </div>
                
                <div className="p-2 space-y-1 bg-slate-950/50">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase px-2 mb-2">
                    <div className="col-span-2 text-center">Set</div>
                    <div className="col-span-3 text-center">kg</div>
                    <div className="col-span-3 text-center">Reps</div>
                    <div className="col-span-2 text-center">Tipo</div>
                    <div className="col-span-2 text-center">✓</div>
                  </div>

                  {/* Sets Rows */}
                  {ex.sets.map((set) => (
                    <div key={set.id} className="space-y-1">
                      <div 
                        className={`grid grid-cols-12 gap-2 items-center px-2 py-1.5 rounded-lg transition-colors ${
                          set.is_completed ? 'bg-emerald-950/30' : ''
                        }`}
                      >
                        <div className="col-span-2 text-center flex flex-col items-center">
                          <span className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                            {set.set_number}
                          </span>
                          {(set.prev_weight !== null && set.prev_weight !== undefined) || (set.prev_reps !== null && set.prev_reps !== undefined) ? (
                            <span className="text-[9px] text-slate-400 font-mono leading-none mt-1">
                              {set.prev_weight ?? '-'}k×{set.prev_reps ?? '-'}
                            </span>
                          ) : null}
                        </div>
                        <div className="col-span-3">
                          <input 
                            type="number"
                            value={set.weight || ''}
                            onChange={(e) => updateSet(ex.exercise.id, set.id, { weight: parseFloat(e.target.value) })}
                            className={`w-full bg-slate-800 text-center rounded-lg py-1.5 text-sm font-bold border outline-none focus:border-cyan-500 transition-colors ${
                              set.is_completed ? 'text-emerald-400 border-transparent' : 'text-white border-slate-700'
                            }`}
                            placeholder={set.prev_weight ? `${set.prev_weight}` : "-"}
                          />
                        </div>
                        <div className="col-span-3">
                          <input 
                            type="number"
                            value={set.reps || ''}
                            onChange={(e) => updateSet(ex.exercise.id, set.id, { reps: parseInt(e.target.value) })}
                            className={`w-full bg-slate-800 text-center rounded-lg py-1.5 text-sm font-bold border outline-none focus:border-cyan-500 transition-colors ${
                              set.is_completed ? 'text-emerald-400 border-transparent' : 'text-white border-slate-700'
                            }`}
                            placeholder={set.prev_reps ? `${set.prev_reps}` : "-"}
                          />
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <button 
                            onClick={() => updateSet(ex.exercise.id, set.id, { set_type: set.set_type === 'normal' ? 'warmup' : 'normal' })}
                            className={`text-[10px] font-bold uppercase rounded px-1.5 py-0.5 ${
                              set.set_type === 'warmup' ? 'bg-orange-500/20 text-orange-400' : 'text-slate-500'
                            }`}
                          >
                            {set.set_type === 'warmup' ? 'W' : 'N'}
                          </button>
                        </div>
                        <div className="col-span-2 flex justify-center items-center gap-1">
                          <button
                            onClick={() => completeSet(ex.exercise.id, set.id, !set.is_completed)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              set.is_completed 
                                ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20 text-white scale-105' 
                                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                            }`}
                          >
                            <Check className="w-5 h-5 stroke-[3]" />
                          </button>
                          {!set.is_completed && (
                            <button 
                              onClick={() => removeSet(ex.exercise.id, set.id)}
                              className="text-red-400/50 hover:text-red-400 p-1"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* PR Badge Banner */}
                      {set.is_completed && set.is_pr && (
                        <div className="px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-lg flex items-center justify-center gap-1.5 text-amber-400 text-xs font-bold animate-bounce">
                          <Trophy className="w-4 h-4 text-amber-400" />
                          {set.pr_type === 'both' ? 'RECORD PERSONALE! (Peso & 1RM)' : set.pr_type === 'weight' ? 'RECORD PERSONALE! (Max Peso)' : 'RECORD PERSONALE! (Max 1RM)'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Add Set Button */}
                <button 
                  onClick={() => addSet(ex.exercise.id)}
                  className="w-full py-2.5 text-xs font-bold text-cyan-400 bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                  + AGGIUNGI SERIE
                </button>
              </div>
            ))}
          </div>
        )}

        <button 
          onClick={() => setShowExercisePicker(true)}
          className="mt-6 w-full bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 hover:bg-cyan-600/30 transition-colors shadow-lg shadow-cyan-900/10"
        >
          <Plus className="w-5 h-5" />
          Aggiungi Esercizio
        </button>
      </div>

      {/* Exercise Picker Fullscreen Modal */}
      {showExercisePicker && (
        <div className="fixed inset-0 z-[110] bg-slate-950 flex flex-col">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
            <h2 className="text-lg font-bold text-white">Scegli Esercizio</h2>
            <button onClick={() => setShowExercisePicker(false)} className="p-2 text-slate-400">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {exercises.map(ex => (
              <button
                key={ex.id}
                onClick={() => {
                  addExerciseToWorkout(ex, user?.id);
                  setShowExercisePicker(false);
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center hover:border-cyan-500/50 transition-colors text-left"
              >
                <div>
                  <div className="font-bold text-white">{ex.name}</div>
                  <div className="text-xs text-slate-400 mt-1 uppercase font-semibold">{ex.muscle_group}</div>
                </div>
                <Plus className="w-5 h-5 text-cyan-400" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
