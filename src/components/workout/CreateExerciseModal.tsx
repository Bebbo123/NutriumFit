import React, { useState } from 'react';
import { X, Plus, Dumbbell } from 'lucide-react';
import { workoutService } from '../../services/workoutService';
import { useAuth } from '../../context/AuthContext';
import type { Exercise, MuscleGroup, Equipment } from '../../types/workout';

interface CreateExerciseModalProps {
  onClose: () => void;
  onCreated: (exercise: Exercise) => void;
}

const MUSCLE_GROUPS: MuscleGroup[] = ['Petto', 'Dorso', 'Spalle', 'Bicipiti', 'Tricipiti', 'Gambe', 'Core'];
const EQUIPMENT_TYPES: Equipment[] = ['Bilanciere', 'Manubri', 'Macchina', 'Cavi', 'Corpo Libero'];

export const CreateExerciseModal: React.FC<CreateExerciseModalProps> = ({ onClose, onCreated }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('Petto');
  const [equipment, setEquipment] = useState<Equipment>('Manubri');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Inserisci il nome dell\'esercizio.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const created = await workoutService.createCustomExercise(
        user?.id || 'offline_user',
        name.trim(),
        muscleGroup,
        equipment
      );

      if (created) {
        onCreated(created);
        onClose();
      } else {
        setError('Errore durante la creazione dell\'esercizio.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Errore imprevisto.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Nuovo Esercizio</h3>
              <p className="text-xs text-slate-400">Crea un esercizio personalizzato</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-950/50 border border-red-800/50 text-red-400 text-xs p-3 rounded-2xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Nome Esercizio *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Spinte su Panca Inclinata"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-2.5 px-3.5 text-sm text-slate-100 font-semibold focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Gruppo Muscolare *
            </label>
            <select
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-2.5 px-3.5 text-sm text-slate-100 font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {MUSCLE_GROUPS.map((mg) => (
                <option key={mg} value={mg}>
                  {mg}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Attrezzatura *
            </label>
            <select
              value={equipment}
              onChange={(e) => setEquipment(e.target.value as Equipment)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-2.5 px-3.5 text-sm text-slate-100 font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {EQUIPMENT_TYPES.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {isSaving ? 'Creazione...' : 'Crea Esercizio'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
