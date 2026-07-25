import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, PieChart, RefreshCw } from 'lucide-react';
import { useDiaryStore } from '../store/diaryStore';
import { useAuth } from '../context/AuthContext';
import { MealSection } from '../components/diary/MealSection';
import { EditFoodLogModal } from '../components/diary/EditFoodLogModal';
import type { LoggedFood, MealType } from '../types/diary';

interface DiaryPageProps {
  onNavigateToAddFood: (mealType?: MealType) => void;
}

export const DiaryPage: React.FC<DiaryPageProps> = ({ onNavigateToAddFood }) => {
  const { user } = useAuth();
  const {
    selectedDate,
    setSelectedDate,
    logs,
    removeFoodLog,
    updateFoodLog,
    getTotalsForDate,
    goals,
    isLoadingLogs,
    createSavedMeal,
    isOffline,
  } = useDiaryStore();

  const [isSaveMealModalOpen, setIsSaveMealModalOpen] = useState(false);
  const [mealNameToSave, setMealNameToSave] = useState('');
  const [targetMealTypeToSave, setTargetMealTypeToSave] = useState<MealType | null>(null);
  const [editingFoodLog, setEditingFoodLog] = useState<LoggedFood | null>(null);

  const dayLogs = logs[selectedDate] || [];
  const totals = getTotalsForDate(selectedDate);
  const remaining = goals.calories - totals.calories;

  const breakfastFoods = dayLogs.filter((f) => f.mealType === 'Colazione');
  const lunchFoods = dayLogs.filter((f) => f.mealType === 'Pranzo');
  const dinnerFoods = dayLogs.filter((f) => f.mealType === 'Cena');
  const snacksFoods = dayLogs.filter((f) => f.mealType === 'Spuntini');

  // Date Navigation Helpers (Italian Localized)
  const formatDateLabel = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (dateStr === today) return 'Oggi';
    
    const d = new Date(dateStr);
    return d.toLocaleDateString('it-IT', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleTriggerSaveMeal = (mealType: MealType) => {
    setTargetMealTypeToSave(mealType);
    setMealNameToSave(`Pasto ${mealType} - ${formatDateLabel(selectedDate)}`);
    setIsSaveMealModalOpen(true);
  };

  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !targetMealTypeToSave) return;

    const targetFoods = dayLogs.filter((f) => f.mealType === targetMealTypeToSave);
    if (targetFoods.length === 0) return;

    const items = targetFoods.map((f) => ({
      food_name: f.name,
      calories: f.calories,
      carbs: f.macros.carbs,
      fat: f.macros.fat,
      protein: f.macros.protein,
      servings: f.servings,
      serving_size_display: f.servingSizeDisplay || '1 porzione',
    }));

    const result = await createSavedMeal(user.id, mealNameToSave, items);
    if (result) {
      alert(`Pasto "${mealNameToSave}" salvato con successo! Lo troverai nella scheda "Pasti" quando aggiungi un alimento.`);
    } else {
      alert("Si è verificato un errore durante il salvataggio del pasto.");
    }

    setIsSaveMealModalOpen(false);
    setMealNameToSave('');
    setTargetMealTypeToSave(null);
  };

  return (
    <div className="pb-24 pt-safe px-4 max-w-md mx-auto relative font-sans">
      {isOffline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-1.5 rounded-2xl mb-4 border border-amber-400/30 shadow-md">
          <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
          Modalità Offline — I dati verranno sincronizzati al rientro online.
        </div>
      )}
      {/* Header & Date Selector */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Diario Alimentare</h1>
          <p className="text-xs text-slate-400">Registro nutrizionale giornaliero</p>
        </div>

        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-2xl px-2 py-1 shadow-sm">
          <button onClick={handlePrevDay} className="p-1 text-slate-400 hover:text-white cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-slate-200 font-mono">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>{formatDateLabel(selectedDate)}</span>
          </div>
          <button onClick={handleNextDay} className="p-1 text-slate-400 hover:text-white cursor-pointer">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Card Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 mb-5 shadow-sm relative">
        {isLoadingLogs && (
          <div className="absolute top-3 right-3 animate-spin">
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          </div>
        )}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Riepilogo Giornaliero
            </span>
          </div>
          <span className="text-xs font-mono text-cyan-400 font-semibold">
            {remaining >= 0 ? `${remaining} kcal rimaste` : `${Math.abs(remaining)} kcal in eccesso`}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center pt-2 border-t border-slate-800/80 font-mono">
          <div>
            <span className="text-[10px] text-slate-400 uppercase block font-sans font-semibold">Totale</span>
            <span className="text-sm font-bold text-slate-100">{totals.calories}</span>
          </div>
          <div>
            <span className="text-[10px] text-blue-400 uppercase block font-sans font-semibold">Carboidrati</span>
            <span className="text-sm font-bold text-blue-400">{Math.round(totals.macros.carbs)}g</span>
          </div>
          <div>
            <span className="text-[10px] text-red-400 uppercase block font-sans font-semibold">Grassi</span>
            <span className="text-sm font-bold text-red-400">{Math.round(totals.macros.fat)}g</span>
          </div>
          <div>
            <span className="text-[10px] text-emerald-400 uppercase block font-sans font-semibold">Proteine</span>
            <span className="text-sm font-bold text-emerald-400">{Math.round(totals.macros.protein)}g</span>
          </div>
        </div>
      </div>

      {/* Meal Categories */}
      <div className="space-y-4 relative">
        <MealSection
          title="Colazione"
          mealType="Colazione"
          foods={breakfastFoods}
          onRemoveFood={(logId) => removeFoodLog(selectedDate, logId)}
          onEditFood={(food) => setEditingFoodLog(food)}
          onAddFoodClick={(meal) => onNavigateToAddFood(meal)}
          onSaveMealAsGroup={handleTriggerSaveMeal}
        />

        <MealSection
          title="Pranzo"
          mealType="Pranzo"
          foods={lunchFoods}
          onRemoveFood={(logId) => removeFoodLog(selectedDate, logId)}
          onEditFood={(food) => setEditingFoodLog(food)}
          onAddFoodClick={(meal) => onNavigateToAddFood(meal)}
          onSaveMealAsGroup={handleTriggerSaveMeal}
        />

        <MealSection
          title="Cena"
          mealType="Cena"
          foods={dinnerFoods}
          onRemoveFood={(logId) => removeFoodLog(selectedDate, logId)}
          onEditFood={(food) => setEditingFoodLog(food)}
          onAddFoodClick={(meal) => onNavigateToAddFood(meal)}
          onSaveMealAsGroup={handleTriggerSaveMeal}
        />

        <MealSection
          title="Spuntini"
          mealType="Spuntini"
          foods={snacksFoods}
          onRemoveFood={(logId) => removeFoodLog(selectedDate, logId)}
          onEditFood={(food) => setEditingFoodLog(food)}
          onAddFoodClick={(meal) => onNavigateToAddFood(meal)}
          onSaveMealAsGroup={handleTriggerSaveMeal}
        />
      </div>

      {/* Edit Food Log Modal */}
      {editingFoodLog && (
        <EditFoodLogModal
          foodLog={editingFoodLog}
          onClose={() => setEditingFoodLog(null)}
          onSave={async (logId, mealType, foodName, calories, carbs, fat, protein, servings, servingSizeDisplay, brand, healthScore) => {
            await updateFoodLog(selectedDate, logId, mealType, foodName, calories, carbs, fat, protein, servings, servingSizeDisplay, brand, healthScore);
          }}
          onDelete={async (logId) => {
            await removeFoodLog(selectedDate, logId);
          }}
        />
      )}

      {/* Save Meal Dialog Modal */}
      {isSaveMealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-white mb-1">Salva come Pasto</h3>
            <p className="text-xs text-slate-400 mb-4">
              Salva gli alimenti della sezione come gruppo singolo per riutilizzarli in futuro.
            </p>

            <form onSubmit={handleSaveMeal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Nome del Pasto
                </label>
                <input
                  type="text"
                  required
                  value={mealNameToSave}
                  onChange={(e) => setMealNameToSave(e.target.value)}
                  placeholder="Es. Colazione Classica"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 px-4 text-sm font-semibold text-slate-100 placeholder-slate-650 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSaveMealModalOpen(false);
                    setMealNameToSave('');
                    setTargetMealTypeToSave(null);
                  }}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-2xl border border-slate-750 transition-colors cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-slate-950 font-bold text-sm rounded-2xl shadow-lg shadow-cyan-500/10 transition-all cursor-pointer"
                >
                  Salva Pasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiaryPage;
