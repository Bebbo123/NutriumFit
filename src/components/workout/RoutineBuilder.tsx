import React, { useState } from 'react';
import { X, Plus, GripVertical } from 'lucide-react';
import { useWorkoutStore } from '../../store/workoutStore';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { workoutService } from '../../services/workoutService';
import type { Exercise, Routine } from '../../types/workout';

interface RoutineBuilderProps {
  onClose: () => void;
  onSave: () => void;
  routineToEdit?: {
    routine: Routine;
    exercises: { exercise: Exercise; sets: number; reps: string }[];
  } | null;
}

export const RoutineBuilder: React.FC<RoutineBuilderProps> = ({ onClose, onSave, routineToEdit }) => {
  const { user } = useAuth();
  const { exercises } = useWorkoutStore();
  const [title, setTitle] = useState(routineToEdit?.routine.title || '');
  const [selectedExercises, setSelectedExercises] = useState<{ exercise: Exercise; sets: number; reps: string }[]>(
    routineToEdit?.exercises || []
  );
  const [showPicker, setShowPicker] = useState(false);
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
          target_reps: se.reps
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
          target_reps: se.reps
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

  const updateExercise = <K extends 'sets' | 'reps'>(index: number, field: K, value: typeof selectedExercises[0][K]) => {
    const newEx = [...selectedExercises];
    newEx[index][field] = value;
    setSelectedExercises(newEx);
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950 flex flex-col animate-in slide-in-from-right duration-200">
      <div className="p-4 pt-safe border-b border-slate-800 bg-slate-900 flex justify-between items-center">
        <button onClick={onClose} className="p-2 -ml-2 text-slate-400">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold text-white">{routineToEdit ? 'Modifica Scheda' : 'Nuova Scheda'}</h2>
        <button 
          onClick={handleSave} 
          disabled={isSaving || !title.trim() || selectedExercises.length === 0}
          className="text-cyan-400 font-bold disabled:opacity-50"
        >
          {isSaving ? 'Salvo...' : 'Salva'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <input 
          type="text" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nome Scheda (es. Petto e Bicipiti)"
          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white font-bold mb-6 focus:border-cyan-500 outline-none transition-colors"
        />

        <div className="space-y-3 mb-6">
          {selectedExercises.map((se, index) => (
            <div key={se.exercise.id + index} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-3">
                <GripVertical className="w-5 h-5 text-slate-600" />
                <div>
                  <h3 className="font-bold text-white text-sm">{se.exercise.name}</h3>
                  <span className="text-[10px] text-slate-500 uppercase">{se.exercise.muscle_group}</span>
                </div>
                <button 
                  onClick={() => setSelectedExercises(prev => prev.filter((_, i) => i !== index))}
                  className="ml-auto text-slate-500 hover:text-red-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex gap-4 px-2">
                <div className="flex-1 flex items-center justify-between bg-slate-950 rounded-lg p-2">
                  <span className="text-xs text-slate-400 font-bold uppercase">Set</span>
                  <input 
                    type="number" 
                    value={se.sets} 
                    onChange={e => updateExercise(index, 'sets', parseInt(e.target.value))}
                    className="w-12 bg-transparent text-white text-center font-bold outline-none" 
                  />
                </div>
                <div className="flex-1 flex items-center justify-between bg-slate-950 rounded-lg p-2">
                  <span className="text-xs text-slate-400 font-bold uppercase">Reps</span>
                  <input 
                    type="text" 
                    value={se.reps} 
                    onChange={e => updateExercise(index, 'reps', e.target.value)}
                    className="w-16 bg-transparent text-white text-center font-bold outline-none"
                    placeholder="8-12"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={() => setShowPicker(true)}
          className="w-full bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-xl py-3.5 font-bold flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Aggiungi Esercizio
        </button>
      </div>

      {/* Mini Exercise Picker */}
      {showPicker && (
        <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col">
          <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between">
            <h2 className="font-bold text-white">Scegli Esercizio</h2>
            <button onClick={() => setShowPicker(false)}><X className="text-slate-400 w-6 h-6" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {exercises.map(ex => (
              <button
                key={ex.id}
                onClick={() => {
                  setSelectedExercises(prev => [...prev, { exercise: ex, sets: 3, reps: '8-12' }]);
                  setShowPicker(false);
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between text-left"
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
