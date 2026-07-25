import React, { useState } from 'react';
import { X, Plus, GripVertical, FileText } from 'lucide-react';
import { useWorkoutStore } from '../../store/workoutStore';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { workoutService } from '../../services/workoutService';
import { CreateExerciseModal } from './CreateExerciseModal';
import type { Exercise, Routine } from '../../types/workout';

interface RoutineBuilderProps {
  onClose: () => void;
  onSave: () => void;
  routineToEdit?: {
    routine: Routine;
    exercises: { exercise: Exercise; sets: number; reps: string; notes?: string }[];
  } | null;
}

export const RoutineBuilder: React.FC<RoutineBuilderProps> = ({ onClose, onSave, routineToEdit }) => {
  const { user } = useAuth();
  const { exercises, setExercises } = useWorkoutStore();
  const [title, setTitle] = useState(routineToEdit?.routine.title || '');
  const [selectedExercises, setSelectedExercises] = useState<{ exercise: Exercise; sets: number; reps: string; notes?: string }[]>(
    routineToEdit?.exercises.map((se: any) => ({
      exercise: se.exercise,
      sets: se.sets || se.target_sets || 3,
      reps: se.reps || se.target_reps || '8-12',
      notes: se.notes || '',
    })) || []
  );
  const [showPicker, setShowPicker] = useState(false);
  const [showCreateCustomModal, setShowCreateCustomModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !title.trim() || selectedExercises.length === 0) return;
    setIsSaving(true);
    
    try {
      if (routineToEdit) {
        // Update existing routine
        const formattedExercises = selectedExercises.map(se => ({
          exercise_id: se.exercise.id,
          target_sets: se.sets,
          target_reps: se.reps,
          notes: se.notes ? se.notes.trim() : null
        }));
        const success = await workoutService.updateRoutine(routineToEdit.routine.id, title, formattedExercises);
        if (!success) throw new Error('Errore durante l\'aggiornamento della scheda.');
      } else {
        // Create new routine
        const { data: routineData, error: routineError } = await supabase
          .from('routines')
          .insert({ user_id: user.id, title })
          .select()
          .single();
          
        if (routineError) throw routineError;

        const routineExercises = selectedExercises.map((se, index) => ({
          routine_id: routineData.id,
          exercise_id: se.exercise.id,
          order_index: index,
          target_sets: se.sets,
          target_reps: se.reps,
          notes: se.notes ? se.notes.trim() : null
        }));

        const { error: exercisesError } = await supabase
          .from('routine_exercises')
          .insert(routineExercises);

        if (exercisesError) throw exercisesError;
      }

      onSave(); // Refresh routines
      onClose();
    } catch (e) {
      console.error('Error saving routine:', e);
      alert('Errore durante il salvataggio della scheda.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateExercise = (index: number, field: 'sets' | 'reps' | 'notes', value: any) => {
    const newEx = [...selectedExercises];
    (newEx[index] as any)[field] = value;
    setSelectedExercises(newEx);
  };

  const handleCustomExerciseCreated = (newExercise: Exercise) => {
    setExercises([newExercise, ...exercises]);
    setSelectedExercises(prev => [...prev, { exercise: newExercise, sets: 3, reps: '8-12', notes: '' }]);
    setShowPicker(false);
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950 flex flex-col animate-in slide-in-from-right duration-200 font-sans text-slate-100">
      <div className="p-4 pt-safe border-b border-slate-800 bg-slate-900 flex justify-between items-center">
        <button onClick={onClose} className="p-2 -ml-2 text-slate-400 hover:text-white cursor-pointer">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-extrabold text-white">{routineToEdit ? 'Modifica Scheda' : 'Nuova Scheda'}</h2>
        <button 
          onClick={handleSave} 
          disabled={isSaving || !title.trim() || selectedExercises.length === 0}
          className="text-cyan-400 font-bold disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? 'Salvo...' : 'Salva'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <input 
          type="text" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nome Scheda (es. Petto e Bicipiti)"
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white font-bold mb-6 focus:border-cyan-500 outline-none transition-colors"
        />

        <div className="space-y-3.5 mb-6">
          {selectedExercises.map((se, index) => (
            <div key={se.exercise.id + index} className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-3">
                <GripVertical className="w-5 h-5 text-slate-600" />
                <div className="flex-1">
                  <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                    {se.exercise.name}
                    {se.exercise.is_custom && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 font-bold border border-cyan-800/40">
                        Custom
                      </span>
                    )}
                  </h3>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">{se.exercise.muscle_group}</span>
                </div>
                <button 
                  onClick={() => setSelectedExercises(prev => prev.filter((_, i) => i !== index))}
                  className="p-1 text-slate-500 hover:text-red-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex gap-3 px-1">
                <div className="flex-1 flex items-center justify-between bg-slate-950 rounded-xl p-2 border border-slate-800">
                  <span className="text-xs text-slate-400 font-bold uppercase">Set</span>
                  <input 
                    type="number"
                    min="1"
                    value={se.sets} 
                    onChange={e => updateExercise(index, 'sets', Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 bg-transparent text-cyan-400 font-mono text-center font-bold outline-none" 
                  />
                </div>
                <div className="flex-1 flex items-center justify-between bg-slate-950 rounded-lg p-2 border border-slate-800">
                  <span className="text-xs text-slate-400 font-bold uppercase">Reps</span>
                  <input 
                    type="text" 
                    value={se.reps} 
                    onChange={e => updateExercise(index, 'reps', e.target.value)}
                    className="w-16 bg-transparent text-cyan-400 font-mono text-center font-bold outline-none"
                    placeholder="8-12"
                  />
                </div>
              </div>

              {/* Optional instruction note under exercise card */}
              <div className="mt-3 px-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px] font-semibold">Note / Istruzioni Esercizio (opzionale)</span>
                </div>
                <input
                  type="text"
                  value={se.notes || ''}
                  onChange={(e) => updateExercise(index, 'notes', e.target.value)}
                  placeholder="Es. Usa la sbarra a V, Mantieni il gomito stretto"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={() => setShowPicker(true)}
          className="w-full bg-cyan-950/40 text-cyan-400 border border-cyan-800/40 rounded-2xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 hover:bg-cyan-900/50 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" /> Aggiungi Esercizio
        </button>
      </div>

      {/* Exercise Picker Modal */}
      {showPicker && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col pt-safe">
          <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
            <div>
              <h2 className="font-extrabold text-white text-base">Scegli Esercizio</h2>
              <p className="text-xs text-slate-400">Seleziona o registra un nuovo esercizio</p>
            </div>
            <button onClick={() => setShowPicker(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
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
                  setSelectedExercises(prev => [...prev, { exercise: ex, sets: 3, reps: '8-12', notes: '' }]);
                  setShowPicker(false);
                }}
                className="w-full bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-3.5 flex justify-between items-center text-left transition-all cursor-pointer"
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
    </div>
  );
};
