import React, { useState, useEffect } from 'react';
import { X, Check, Plus, Dumbbell, Timer, Minus, Trophy, Copy, FileText, Info, Save } from 'lucide-react';
import { useWorkoutStore } from '../../store/workoutStore';
import { workoutService } from '../../services/workoutService';
import { useAuth } from '../../context/AuthContext';
import { CreateExerciseModal } from './CreateExerciseModal';
import type { Exercise } from '../../types/workout';

export const LiveWorkoutModal: React.FC = () => {
  const { user } = useAuth();
  const { 
    activeWorkout, 
    exercises,
    setExercises,
    cancelWorkout, 
    finishWorkout,
    addExerciseToWorkout,
    addSet,
    removeSet,
    updateSet,
    completeSet,
    updateExerciseNotes,
    updateWorkoutNotes,
    copyPreviousPerformance,
    copyLastWeekPerformance
  } = useWorkoutStore();

  const [elapsed, setElapsed] = useState(0);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showCreateCustomModal, setShowCreateCustomModal] = useState(false);
  const [showFinishSummaryModal, setShowFinishSummaryModal] = useState(false);
  const [generalNotesInput, setGeneralNotesInput] = useState('');
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

  const handleOpenFinishSummary = () => {
    setGeneralNotesInput(activeWorkout.notes || '');
    setShowFinishSummaryModal(true);
  };

  const handleConfirmFinish = async () => {
    if (!user) return;
    setIsFinishing(true);
    updateWorkoutNotes(generalNotesInput.trim());
    
    const workout = finishWorkout();
    if (workout) {
      workout.notes = generalNotesInput.trim();
      await workoutService.saveWorkout(user.id, workout, elapsed);
    }
    setIsFinishing(false);
    setShowFinishSummaryModal(false);
  };

  const handleCustomExerciseCreated = (newExercise: Exercise) => {
    setExercises([newExercise, ...exercises]);
    addExerciseToWorkout(newExercise, user?.id);
    setShowExercisePicker(false);
  };

  // Calculate volume summary
  const totalVolume = activeWorkout.exercises.reduce((sum, ex) => {
    return sum + ex.sets.reduce((sSum, set) => {
      if (set.is_completed && set.weight && set.reps) {
        return sSum + (set.weight * set.reps);
      }
      return sSum;
    }, 0);
  }, 0);

  const completedSetsCount = activeWorkout.exercises.reduce((sum, ex) => {
    return sum + ex.sets.filter(s => s.is_completed).length;
  }, 0);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300 font-sans text-slate-100">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-safe bg-slate-900 border-b border-slate-800 shrink-0">
        <button 
          onClick={cancelWorkout}
          className="text-slate-400 hover:text-white p-2 -ml-2 cursor-pointer"
          title="Annulla Allenamento"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-white font-extrabold text-base">{activeWorkout.title}</span>
          <span className="text-cyan-400 text-xs font-mono font-bold flex items-center gap-1">
            <Timer className="w-3.5 h-3.5" />
            {formatTime(elapsed)}
          </span>
        </div>
        <button 
          onClick={handleOpenFinishSummary}
          disabled={isFinishing}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 px-4 py-1.5 rounded-xl font-extrabold text-xs cursor-pointer shadow-md disabled:opacity-50 transition-all"
        >
          Fine
        </button>
      </div>

      {/* Body: Workout Exercises */}
      <div className="flex-1 overflow-y-auto p-3 pb-32">
        {activeWorkout.exercises.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16">
            <Dumbbell className="w-12 h-12 mb-3 opacity-20" />
            <p className="font-semibold text-sm">Nessun esercizio aggiunto.</p>
            <p className="text-xs text-slate-600 mt-1">Inizia ad aggiungere esercizi al tuo workout!</p>
          </div>
        ) : (
          <div className="space-y-4 mt-1">
            {activeWorkout.exercises.map((ex, exIndex) => (
              <div key={ex.exercise.id + exIndex} className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-sm">
                
                {/* Exercise Header */}
                <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/60 flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-white text-base flex items-center gap-1.5">
                      {ex.exercise.name}
                      {ex.exercise.is_custom && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 font-bold border border-cyan-800/40">
                          Custom
                        </span>
                      )}
                    </h3>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5 uppercase">
                      {ex.exercise.muscle_group} • {ex.exercise.equipment}
                    </div>

                    {ex.allTimePR && (ex.allTimePR.max_weight > 0 || ex.allTimePR.max_1rm > 0) && (
                      <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1 mt-1 font-mono">
                        <Trophy className="w-3 h-3 text-amber-400 shrink-0" /> Record: {ex.allTimePR.max_weight}kg | 1RM: {ex.allTimePR.max_1rm}kg
                      </span>
                    )}
                    {ex.lastWeekMax && (
                      <span className="text-[10px] text-cyan-300 font-mono block mt-0.5">
                        Max sett. prec.: <strong className="text-white">{ex.lastWeekMax.weight} kg</strong> ({ex.lastWeekMax.reps} reps)
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 items-end shrink-0">
                    {ex.previousSets && ex.previousSets.length > 0 && (
                      <button 
                        onClick={() => copyPreviousPerformance(ex.exercise.id)}
                        className="text-[11px] font-bold text-cyan-400 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/40 px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                        title="Copia dati dalla volta precedente"
                      >
                        <Copy className="w-3 h-3" /> Copia Prec.
                      </button>
                    )}
                    {ex.lastWeekMax && (
                      <button 
                        onClick={() => copyLastWeekPerformance(ex.exercise.id)}
                        className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/40 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                        title="Copia il peso massimo della settimana scorsa"
                      >
                        Copia Max Sett.
                      </button>
                    )}
                  </div>
                </div>

                {/* Pre-configured Routine Instruction Note */}
                {ex.routineNotes && (
                  <div className="mx-3 mt-3 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 text-xs flex items-start gap-2">
                    <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-[10px] text-cyan-400 uppercase tracking-wider">Istruzione Scheda:</span>
                      <span>{ex.routineNotes}</span>
                    </div>
                  </div>
                )}
                
                {/* Sets Table */}
                <div className="p-2 space-y-1 bg-slate-950/50">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase px-2 mb-1.5 mt-1">
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
                        className={`grid grid-cols-12 gap-2 items-center px-2 py-1.5 rounded-xl transition-colors ${
                          set.is_completed ? 'bg-emerald-950/30 border border-emerald-800/30' : ''
                        }`}
                      >
                        <div className="col-span-2 text-center flex flex-col items-center">
                          <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
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
                            inputMode="decimal"
                            value={set.weight || ''}
                            onChange={(e) => updateSet(ex.exercise.id, set.id, { weight: parseFloat(e.target.value) })}
                            className={`w-full bg-slate-950 text-center rounded-xl py-1.5 text-sm font-bold font-mono border outline-none focus:border-cyan-500 transition-colors ${
                              set.is_completed ? 'text-emerald-400 border-emerald-800/40' : 'text-white border-slate-800'
                            }`}
                            placeholder={set.prev_weight ? `${set.prev_weight}` : "-"}
                          />
                        </div>
                        <div className="col-span-3">
                          <input 
                            type="number"
                            inputMode="numeric"
                            value={set.reps || ''}
                            onChange={(e) => updateSet(ex.exercise.id, set.id, { reps: parseInt(e.target.value) })}
                            className={`w-full bg-slate-950 text-center rounded-xl py-1.5 text-sm font-bold font-mono border outline-none focus:border-cyan-500 transition-colors ${
                              set.is_completed ? 'text-emerald-400 border-emerald-800/40' : 'text-white border-slate-800'
                            }`}
                            placeholder={set.prev_reps ? `${set.prev_reps}` : "-"}
                          />
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <button 
                            onClick={() => updateSet(ex.exercise.id, set.id, { set_type: set.set_type === 'normal' ? 'warmup' : 'normal' })}
                            className={`text-[10px] font-bold uppercase rounded-lg px-2 py-1 cursor-pointer transition-all ${
                              set.set_type === 'warmup' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-slate-400 bg-slate-800'
                            }`}
                          >
                            {set.set_type === 'warmup' ? 'W' : 'N'}
                          </button>
                        </div>
                        <div className="col-span-2 flex justify-center items-center gap-1">
                          <button
                            onClick={() => completeSet(ex.exercise.id, set.id, !set.is_completed)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                              set.is_completed 
                                ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20 text-slate-950 scale-105' 
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            <Check className="w-5 h-5 stroke-[3]" />
                          </button>
                          {!set.is_completed && (
                            <button 
                              onClick={() => removeSet(ex.exercise.id, set.id)}
                              className="text-slate-600 hover:text-red-400 p-1 cursor-pointer"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* PR Badge Banner */}
                      {set.is_completed && set.is_pr && (
                        <div className="px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-center gap-1.5 text-amber-400 text-xs font-bold animate-bounce">
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
                  className="w-full py-2.5 text-xs font-bold text-cyan-400 bg-slate-900 hover:bg-slate-800/80 border-t border-slate-800 transition-colors cursor-pointer"
                >
                  + AGGIUNGI SERIE
                </button>

                {/* Per-Exercise Session Note Input */}
                <div className="p-3 border-t border-slate-800/60 bg-slate-900/40">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Note Esercizio (Sessione)</span>
                  </div>
                  <input
                    type="text"
                    value={ex.notes || ''}
                    onChange={(e) => updateExerciseNotes(ex.exercise.id, e.target.value)}
                    placeholder="Es. Spalla leggermente affaticata, peso ottimale..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-cyan-500 font-sans"
                  />
                </div>

              </div>
            ))}
          </div>
        )}

        <button 
          onClick={() => setShowExercisePicker(true)}
          className="mt-6 w-full bg-cyan-950/40 text-cyan-400 border border-cyan-800/40 rounded-2xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 hover:bg-cyan-900/50 transition-colors shadow-lg cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Aggiungi Esercizio
        </button>
      </div>

      {/* Exercise Picker Fullscreen Modal */}
      {showExercisePicker && (
        <div className="fixed inset-0 z-[110] bg-slate-950 flex flex-col pt-safe">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
            <div>
              <h2 className="text-lg font-bold text-white">Scegli Esercizio</h2>
              <p className="text-xs text-slate-400">Seleziona o crea un nuovo esercizio</p>
            </div>
            <button onClick={() => setShowExercisePicker(false)} className="p-2 text-slate-400 hover:text-white cursor-pointer">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <button
              onClick={() => setShowCreateCustomModal(true)}
              className="w-full mb-3 bg-gradient-to-r from-cyan-950 to-blue-950 text-cyan-400 border border-cyan-800/60 rounded-2xl p-3.5 font-extrabold text-xs uppercase flex items-center justify-center gap-2 hover:from-cyan-900 hover:to-blue-900 transition-all cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" /> Registra Nuovo Esercizio Personalizzato
            </button>

            {exercises.map(ex => (
              <button
                key={ex.id}
                onClick={() => {
                  addExerciseToWorkout(ex, user?.id);
                  setShowExercisePicker(false);
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex justify-between items-center hover:border-cyan-500/50 transition-colors text-left cursor-pointer"
              >
                <div>
                  <div className="font-bold text-white text-sm flex items-center gap-2">
                    {ex.name}
                    {ex.is_custom && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 font-bold border border-cyan-800/40">
                        Custom
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 uppercase font-mono font-semibold">
                    {ex.muscle_group} • {ex.equipment}
                  </div>
                </div>
                <Plus className="w-5 h-5 text-cyan-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create Custom Exercise Modal */}
      {showCreateCustomModal && (
        <CreateExerciseModal
          onClose={() => setShowCreateCustomModal(false)}
          onCreated={handleCustomExerciseCreated}
        />
      )}

      {/* Post-Workout / Termina Allenamento Summary Modal */}
      {showFinishSummaryModal && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl animate-in fade-in slide-in-from-bottom-6">
            
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">Termina Allenamento</h3>
                <p className="text-xs text-slate-400">Riepilogo e note finali della sessione</p>
              </div>
              <button
                onClick={() => setShowFinishSummaryModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Session Stats */}
            <div className="grid grid-cols-3 gap-2 text-center font-mono mb-4">
              <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-sans block">Tempo</span>
                <span className="font-bold text-cyan-400 text-sm">{formatTime(elapsed)}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-sans block">Volume</span>
                <span className="font-bold text-emerald-400 text-sm">{totalVolume}kg</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-sans block">Serie Complet.</span>
                <span className="font-bold text-blue-400 text-sm">{completedSetsCount}</span>
              </div>
            </div>

            {/* General Workout Notes Textarea */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-cyan-400" />
                Note Generali Allenamento
              </label>
              <textarea
                rows={3}
                value={generalNotesInput}
                onChange={(e) => setGeneralNotesInput(e.target.value)}
                placeholder="Come è andato l'allenamento? Sensazioni fisiche, recuperi, obiettivi per la prossima volta..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-sans resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowFinishSummaryModal(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Continua Allenamento
              </button>
              <button
                type="button"
                onClick={handleConfirmFinish}
                disabled={isFinishing}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isFinishing ? 'Salvataggio...' : 'Conferma e Salva'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
