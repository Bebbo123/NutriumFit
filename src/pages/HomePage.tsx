import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Sparkles, RefreshCw, Scale, Plus, Trash2 } from 'lucide-react';
import { useDiaryStore } from '../store/diaryStore';
import { useAuth } from '../context/AuthContext';
import { CircularProgress } from '../components/ui/CircularProgress';
import { MacroCard } from '../components/dashboard/MacroCard';
import { WaterTracker } from '../components/dashboard/WaterTracker';
import { StepCounterWidget } from '../components/dashboard/StepCounterWidget';

interface HomePageProps {
  onNavigateToAddFood: () => void;
}

export const HomePage: React.FC<HomePageProps> = () => {
  const { user } = useAuth();
  const {
    selectedDate,
    setSelectedDate,
    goals,
    getTotalsForDate,
    exerciseCalories,
    waterIntakeMl,
    incrementWaterIntake,
    stepsCount,
    isLoadingLogs,
    weightLogs,
    fetchWeightLogs,
    logWeight,
    deleteWeight,
    isOffline,
  } = useDiaryStore();

  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [weightInputValue, setWeightInputValue] = useState('');

  const totals = getTotalsForDate(selectedDate);
  const currentWater = waterIntakeMl[selectedDate] || 0;
  const currentSteps = stepsCount[selectedDate] || 7420;

  // Retrieve today's weight log
  const todayWeightLog = weightLogs.find((l) => l.date === selectedDate);
  const todayWeight = todayWeightLog ? todayWeightLog.weight : null;

  // Fetch weight logs on mount or when user changes
  useEffect(() => {
    if (user) {
      fetchWeightLogs(user.id);
    }
  }, [user, fetchWeightLogs]);

  // Sync modal state with today's weight
  useEffect(() => {
    if (todayWeight) {
      setWeightInputValue(todayWeight.toString());
    } else {
      setWeightInputValue('');
    }
  }, [todayWeight, isWeightModalOpen]);

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

  const handleSaveWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const weightNum = parseFloat(weightInputValue);
    if (isNaN(weightNum) || weightNum <= 0) {
      alert('Inserisci un peso valido in kg.');
      return;
    }
    await logWeight(user.id, selectedDate, weightNum);
    setIsWeightModalOpen(false);
  };

  const handleDeleteWeight = async () => {
    if (!user || !todayWeightLog) return;
    if (window.confirm('Eliminare il peso registrato per questo giorno?')) {
      await deleteWeight(user.id, selectedDate);
      setIsWeightModalOpen(false);
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto relative">
      {isOffline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-1.5 rounded-2xl mb-4 border border-amber-400/30 shadow-md">
          <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
          Modalità Offline — I dati verranno sincronizzati al rientro online.
        </div>
      )}
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">NutriumFit</h1>
            <p className="text-[11px] text-cyan-400 font-semibold tracking-wider uppercase">Tracciamento Macro Premium</p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-2xl px-2 py-1 shadow-sm">
          <button
            onClick={handlePrevDay}
            className="p-1 text-slate-400 hover:text-white cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-slate-200 font-mono">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>{formatDateLabel(selectedDate)}</span>
          </div>
          <button
            onClick={handleNextDay}
            className="p-1 text-slate-400 hover:text-white cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Calorie Ring */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-3xl p-4 mb-5 shadow-lg backdrop-blur-sm relative">
        {isLoadingLogs && (
          <div className="absolute top-3 right-3 p-1 bg-slate-900/80 rounded-full border border-slate-800/80 animate-spin">
            <RefreshCw className="w-3 h-3 text-cyan-400" />
          </div>
        )}
        <CircularProgress
          goal={goals.calories}
          food={totals.calories}
          exercise={exerciseCalories}
        />
      </div>

      {/* Macro Breakdown Section */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-bold text-slate-200 tracking-wide uppercase">
            Obiettivi Macro
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Ripartizione Giornaliera
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <MacroCard
            label="Carboidrati"
            currentGrams={totals.macros.carbs}
            goalGrams={goals.carbs}
            type="carbs"
          />
          <MacroCard
            label="Grassi"
            currentGrams={totals.macros.fat}
            goalGrams={goals.fat}
            type="fat"
          />
          <MacroCard
            label="Proteine"
            currentGrams={totals.macros.protein}
            goalGrams={goals.protein}
            type="protein"
          />
        </div>
      </div>

      {/* Quick Action Widgets */}
      <div className="space-y-4 mb-6">
        {/* Water Tracker with Supabase Sync */}
        <WaterTracker
          consumedMl={currentWater}
          goalMl={goals.waterMl}
          onIncrement={(amount) => user && incrementWaterIntake(user.id, selectedDate, amount)}
        />

        {/* Step Counter Widget */}
        <StepCounterWidget
          steps={currentSteps}
          goalSteps={goals.steps}
        />

        {/* Weight Tracker Widget */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-orange-950/80 border border-orange-800/50 text-orange-400">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Peso Corporeo</h3>
                <p className="text-xs text-slate-400">Tracciamento peso giornaliero</p>
              </div>
            </div>
            {todayWeight ? (
              <div className="text-right">
                <span className="text-base font-bold text-orange-400 font-mono">
                  {todayWeight.toFixed(1)}
                </span>
                <span className="text-xs text-slate-400 font-mono"> kg</span>
              </div>
            ) : (
              <span className="text-xs text-slate-500 font-medium">Non registrato</span>
            )}
          </div>

          {goals.targetWeight ? (
            <div className="mb-3 text-[11px] text-slate-400 font-mono flex justify-between">
              <span>Target: {goals.targetWeight} kg</span>
              {todayWeight && (
                <span>
                  {todayWeight - goals.targetWeight > 0
                    ? `+${(todayWeight - goals.targetWeight).toFixed(1)} kg al target`
                    : `${(todayWeight - goals.targetWeight).toFixed(1)} kg al target`}
                </span>
              )}
            </div>
          ) : (
            <div className="mb-3 text-[11px] text-slate-500 font-mono">
              Nessun peso target configurato
            </div>
          )}

          <button
            onClick={() => setIsWeightModalOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-orange-950 active:text-orange-400 text-xs font-semibold text-slate-200 border border-slate-700/60 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-orange-400" />
            {todayWeight ? 'Aggiorna Peso' : 'Registra Peso Oggi'}
          </button>
        </div>
      </div>

      {/* Weight Log Modal Overlay */}
      {isWeightModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-white mb-1">Registra Peso Corporeo</h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              Data: {formatDateLabel(selectedDate)}
            </p>

            <form onSubmit={handleSaveWeight} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Peso Attuale (kg)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={weightInputValue}
                    onChange={(e) => setWeightInputValue(e.target.value)}
                    placeholder="Es. 72.5"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 px-4 text-base font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                  <span className="absolute right-4 text-sm font-bold text-slate-400 font-mono">kg</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {todayWeight && (
                  <button
                    type="button"
                    onClick={handleDeleteWeight}
                    className="p-3 bg-red-950/60 text-red-400 hover:bg-red-900/50 rounded-2xl border border-red-800/40 transition-all cursor-pointer flex items-center justify-center"
                    title="Elimina registrazione"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsWeightModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-2xl border border-slate-750 transition-colors cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-slate-950 font-bold text-sm rounded-2xl shadow-lg shadow-orange-500/10 transition-all cursor-pointer"
                >
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
