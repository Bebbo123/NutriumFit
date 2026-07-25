import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Scale,
  Droplet,
  Footprints,
  Info,
  Calculator,
  User,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { useDiaryStore } from '../store/diaryStore';
import { useAuth } from '../context/AuthContext';
import { diaryService } from '../services/diaryService';

export const GoalsPage: React.FC = () => {
  const { user } = useAuth();
  const { goals, updateGoals, weightLogs, fetchWeightLogs } = useDiaryStore();

  const [activeTab, setActiveTab] = useState<'goals' | 'analytics'>('goals');
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Form states
  const [calcMode, setCalcMode] = useState<'auto' | 'manual'>('manual');
  const [macroInputMode, setMacroInputMode] = useState<'grams' | 'percentages'>(goals.macroInputMode || 'grams');
  const [calories, setCalories] = useState(goals.calories);
  
  // Grams state
  const [carbsG, setCarbsG] = useState(goals.carbs);
  const [proteinG, setProteinG] = useState(goals.protein);
  const [fatG, setFatG] = useState(goals.fat);

  // Percentages state
  const [carbPct, setCarbPct] = useState(45);
  const [fatPct, setFatPct] = useState(25);
  const [protPct, setProtPct] = useState(30);

  // Demographics
  const [age, setAge] = useState(goals.age || 30);
  const [gender, setGender] = useState<'male' | 'female'>(goals.gender === 'female' ? 'female' : 'male');
  const [height, setHeight] = useState(goals.height || 175);
  const [currentWeight, setCurrentWeight] = useState(goals.currentWeight || 75);
  const [targetWeight, setTargetWeight] = useState(goals.targetWeight || 70);
  const [activityLevel, setActivityLevel] = useState<string>(goals.activityLevel || 'moderate');
  const [weeklyGoal, setWeeklyGoal] = useState<string>(goals.weeklyGoal || 'maintain');

  const [waterGoalMl, setWaterGoalMl] = useState(goals.waterMl || 2000);
  const [stepsGoal, setStepsGoal] = useState(goals.steps || 10000);

  // Analytics states
  const [weightRange, setWeightRange] = useState<7 | 30 | 90>(30);
  const [weeklySummaries, setWeeklySummaries] = useState<Record<string, { calories: number; carbs: number; fat: number; protein: number }>>({});
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(false);

  // Hover states for charts
  const [hoveredWeightPoint, setHoveredWeightPoint] = useState<{ x: number; y: number; date: string; weight: number } | null>(null);
  const [hoveredCalorieBar, setHoveredCalorieBar] = useState<{ index: number; val: number; goal: number; x: number; y: number } | null>(null);

  // Initializing edit form states with current values
  useEffect(() => {
    if (isEditing) {
      setCalories(goals.calories);
      setMacroInputMode(goals.macroInputMode || 'grams');
      setCarbsG(goals.carbs);
      setProteinG(goals.protein);
      setFatG(goals.fat);

      setAge(goals.age || 30);
      setGender(goals.gender === 'female' ? 'female' : 'male');
      setHeight(goals.height || 175);
      setCurrentWeight(goals.currentWeight || 75);
      setTargetWeight(goals.targetWeight || 70);
      setActivityLevel(goals.activityLevel || 'moderate');
      setWeeklyGoal(goals.weeklyGoal || 'maintain');
      setWaterGoalMl(goals.waterMl || 2000);
      setStepsGoal(goals.steps || 10000);

      // Estimate percentages from current grams
      const totalKcal = goals.calories || 2200;
      const cPct = Math.round(((goals.carbs * 4) / totalKcal) * 100);
      const fPct = Math.round(((goals.fat * 9) / totalKcal) * 100);
      const pPct = 100 - cPct - fPct;
      setCarbPct(isNaN(cPct) ? 45 : cPct);
      setFatPct(isNaN(fPct) ? 25 : fPct);
      setProtPct(isNaN(pPct) ? 30 : pPct);

      if (goals.age || goals.height || goals.activityLevel) {
        setCalcMode('auto');
      } else {
        setCalcMode('manual');
      }
    }
  }, [isEditing, goals]);

  // Load Weight Logs and Averages for Analytics
  useEffect(() => {
    if (user) {
      fetchWeightLogs(user.id);
    }
  }, [user, fetchWeightLogs]);

  // Retrieve current week dates (Monday to Sunday)
  const weekDates = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));

    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, []);

  // Load summaries range when Analytics tab opens
  useEffect(() => {
    if (activeTab === 'analytics' && user) {
      const loadRangeData = async () => {
        setIsLoadingSummaries(true);
        try {
          const start = weekDates[0];
          const end = weekDates[6];
          const summaries = await diaryService.fetchDailySummariesRange(user.id, start, end);
          setWeeklySummaries(summaries);

          // Water fetching removed as it is not displayed on the dashboard
        } catch (err) {
          console.error('Error fetching dashboard range data:', err);
        } finally {
          setIsLoadingSummaries(false);
        }
      };
      loadRangeData();
    }
  }, [activeTab, user, weekDates]);

  // Auto Calculations based on Mifflin-St Jeor BMR
  const runAutoCalculator = () => {
    let bmr = 0;
    if (gender === 'male') {
      bmr = 10 * currentWeight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * currentWeight + 6.25 * height - 5 * age - 161;
    }

    let multiplier = 1.2;
    if (activityLevel === 'light') multiplier = 1.375;
    else if (activityLevel === 'moderate') multiplier = 1.55;
    else if (activityLevel === 'active') multiplier = 1.725;

    let tdee = bmr * multiplier;

    let targetCalories = tdee;
    if (weeklyGoal === 'lose_0.5') targetCalories -= 500;
    else if (weeklyGoal === 'lose_0.25') targetCalories -= 250;
    else if (weeklyGoal === 'gain_0.25') targetCalories += 250;
    else if (weeklyGoal === 'gain_0.5') targetCalories += 500;

    const safetyMin = gender === 'female' ? 1200 : 1500;
    return Math.max(safetyMin, Math.round(targetCalories));
  };

  // Derived calculations based on macroInputMode
  const computedCaloriesFromGrams = (carbsG * 4) + (proteinG * 4) + (fatG * 9);

  const calculatedCalories = macroInputMode === 'grams'
    ? computedCaloriesFromGrams
    : (calcMode === 'auto' ? runAutoCalculator() : calories);

  const totalPercentage = carbPct + fatPct + protPct;

  // Real-time bidirectional conversions
  // From Percentages -> Grams
  const calculatedCarbsGFromPct = Math.round((calculatedCalories * (carbPct / 100)) / 4);
  const calculatedProteinGFromPct = Math.round((calculatedCalories * (protPct / 100)) / 4);
  const calculatedFatGFromPct = Math.round((calculatedCalories * (fatPct / 100)) / 9);

  // From Grams -> Percentages
  const calculatedCarbPctFromG = computedCaloriesFromGrams > 0 ? Math.round(((carbsG * 4) / computedCaloriesFromGrams) * 100) : 0;
  const calculatedFatPctFromG = computedCaloriesFromGrams > 0 ? Math.round(((fatG * 9) / computedCaloriesFromGrams) * 100) : 0;
  const calculatedProtPctFromG = computedCaloriesFromGrams > 0 ? Math.round(((proteinG * 4) / computedCaloriesFromGrams) * 100) : 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Utente non autenticato. Effettua il login per salvare gli obiettivi');
      return;
    }

    if (macroInputMode === 'percentages' && totalPercentage !== 100) {
      alert('La somma delle percentuali dei macronutrienti deve essere esattamente 100%.');
      return;
    }

    const finalCarbs = macroInputMode === 'grams' ? carbsG : calculatedCarbsGFromPct;
    const finalProtein = macroInputMode === 'grams' ? proteinG : calculatedProteinGFromPct;
    const finalFat = macroInputMode === 'grams' ? fatG : calculatedFatGFromPct;
    const finalCalories = macroInputMode === 'grams' ? computedCaloriesFromGrams : calculatedCalories;

    const newGoals = {
      calories: finalCalories,
      carbs: finalCarbs,
      fat: finalFat,
      protein: finalProtein,
      macroInputMode,
      waterMl: waterGoalMl,
      steps: stepsGoal,
      currentWeight: calcMode === 'auto' ? currentWeight : undefined,
      targetWeight,
      weeklyGoal: calcMode === 'auto' ? weeklyGoal : undefined,
      activityLevel: calcMode === 'auto' ? activityLevel : undefined,
      age: calcMode === 'auto' ? age : undefined,
      gender: calcMode === 'auto' ? gender : undefined,
      height: calcMode === 'auto' ? height : undefined,
    };

    try {
      await updateGoals(user.id, newGoals);
      setIsEditing(false);
      showToast('Obiettivi salvati e sincronizzati con successo!', 'success');
    } catch (err: any) {
      console.error('Errore durante il salvataggio degli obiettivi:', err);

      const message = err?.message || 'Errore durante il salvataggio degli obiettivi';
      const code = err?.code;
      const details = err?.details;

      let errorMsg = '';
      if (message.includes('Utente non autenticato')) {
        errorMsg = 'Utente non autenticato. Effettua il login per salvare gli obiettivi';
      } else if (message.startsWith('Errore Supabase:')) {
        errorMsg = `${message}${code ? ` (Codice: ${code})` : ''}${details ? `\nDettagli: ${details}` : ''}`;
      } else {
        errorMsg = `Errore Supabase: ${message}${code ? ` (Codice: ${code})` : ''}${details ? `\nDettagli: ${details}` : ''}`;
      }

      showToast('Obiettivi salvati in locale e in attesa di sincronizzazione', 'info');
      alert(`${errorMsg}\n\nGli obiettivi sono stati salvati in locale e verranno sincronizzati appena possibile.`);
      setIsEditing(false);
    }
  };

  // Filter weight logs for graph
  const filterWeightLogs = (days: number) => {
    const limit = new Date();
    limit.setDate(limit.getDate() - days);
    const limitStr = limit.toISOString().split('T')[0];
    return weightLogs.filter((l) => l.date >= limitStr);
  };

  const currentFilteredWeights = filterWeightLogs(weightRange);
  const sortedFilteredWeights = [...currentFilteredWeights].sort((a, b) => a.date.localeCompare(b.date));

  // Italian date label helper for analytics charts
  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('it-IT', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="pb-24 pt-10 pt-[env(safe-area-inset-top,2rem)] px-4 max-w-md mx-auto relative">
      {/* Tab Selector */}
      <div className="flex bg-slate-900/90 border border-slate-800 rounded-2xl p-1 mb-5 shadow-sm">
        <button
          onClick={() => {
            setActiveTab('goals');
            setIsEditing(false);
          }}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'goals'
              ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          I Miei Obiettivi
        </button>
        <button
          onClick={() => {
            setActiveTab('analytics');
            setIsEditing(false);
          }}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Analisi Progressi
        </button>
      </div>

      {activeTab === 'goals' && !isEditing && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">Obiettivi Nutrizionali</h1>
              <p className="text-xs text-slate-400">Riepilogo e personalizzazione obiettivi</p>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="py-2 px-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>✏️ Modifica Obiettivi</span>
            </button>
          </div>

          {/* Calories Target Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-sm relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 text-slate-800/10 pointer-events-none">
              <Flame className="w-24 h-24 stroke-[1.5]" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                <Flame className="w-5 h-5 fill-cyan-400/10" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Budget Calorico Giornaliero</h3>
                <p className="text-xs text-slate-400">Fabbisogno energetico target</p>
              </div>
            </div>
            <div className="text-2xl font-black text-cyan-400 font-mono mt-1">
              {goals.calories.toLocaleString()} <span className="text-xs text-slate-400">kcal / giorno</span>
            </div>
          </div>

          {/* Macro Split Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                Distribuzione Macronutrienti
              </h3>
              <button
                onClick={() => setIsEditing(true)}
                className="text-[11px] font-bold font-mono px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all cursor-pointer flex items-center gap-1"
              >
                <span>Modalità: <strong>{goals.macroInputMode === 'percentages' ? 'Percentuali (%)' : 'Grammi (g)'}</strong></span>
              </button>
            </div>
            <div className="space-y-2.5">
              {/* Carbs */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800/80">
                <div>
                  <span className="text-xs font-bold text-blue-400 block">Carboidrati</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {Math.round(((goals.carbs * 4) / goals.calories) * 100)}% delle calorie
                  </span>
                </div>
                <span className="text-sm font-extrabold text-slate-200 font-mono">{goals.carbs}g</span>
              </div>

              {/* Fat */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800/80">
                <div>
                  <span className="text-xs font-bold text-red-400 block">Grassi</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {Math.round(((goals.fat * 9) / goals.calories) * 100)}% delle calorie
                  </span>
                </div>
                <span className="text-sm font-extrabold text-slate-200 font-mono">{goals.fat}g</span>
              </div>

              {/* Protein */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800/80">
                <div>
                  <span className="text-xs font-bold text-emerald-400 block">Proteine</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {Math.round(((goals.protein * 4) / goals.calories) * 100)}% delle calorie
                  </span>
                </div>
                <span className="text-sm font-extrabold text-slate-200 font-mono">{goals.protein}g</span>
              </div>
            </div>
          </div>

          {/* Health Targets Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-200 mb-3">Obiettivi di Salute ed Attività</h3>
            <div className="grid grid-cols-2 gap-2 text-center font-mono">
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold mb-1">Target Acqua</span>
                <span className="text-sm font-bold text-cyan-400 flex items-center justify-center gap-1">
                  <Droplet className="w-3.5 h-3.5 fill-cyan-400/20" /> {goals.waterMl} ml
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold mb-1">Target Passi</span>
                <span className="text-sm font-bold text-purple-400 flex items-center justify-center gap-1">
                  <Footprints className="w-3.5 h-3.5" /> {goals.steps.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Demographics Card */}
          {goals.age && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" /> Dati Profilo e Target Peso
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono text-slate-300">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/50 flex justify-between">
                  <span className="text-slate-500 font-sans font-semibold">Età:</span>
                  <span>{goals.age} anni</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/50 flex justify-between">
                  <span className="text-slate-500 font-sans font-semibold">Altezza:</span>
                  <span>{goals.height} cm</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/50 flex justify-between col-span-2">
                  <span className="text-slate-500 font-sans font-semibold">Attività:</span>
                  <span className="capitalize text-slate-200">
                    {goals.activityLevel === 'sedentary' && 'Sedentario'}
                    {goals.activityLevel === 'light' && 'Poco Attivo'}
                    {goals.activityLevel === 'moderate' && 'Moderatamente Attivo'}
                    {goals.activityLevel === 'active' && 'Molto Attivo'}
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/50 flex justify-between col-span-2">
                  <span className="text-slate-500 font-sans font-semibold">Peso Target:</span>
                  <span className="text-orange-400 font-bold">{goals.targetWeight || '--'} kg</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'goals' && isEditing && (
        <form onSubmit={handleSave} className="space-y-4 animate-in fade-in-50 duration-200">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Personalizza Obiettivi</h1>
            <p className="text-xs text-slate-400">Modifica valori manuali o usa il calcolatore</p>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-slate-950 border border-slate-850 rounded-2xl p-1">
            <button
              type="button"
              onClick={() => setCalcMode('manual')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                calcMode === 'manual' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Inserimento Manuale
            </button>
            <button
              type="button"
              onClick={() => setCalcMode('auto')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                calcMode === 'auto' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Calcolo Automatico
            </button>
          </div>

          {/* Manual Calories Field */}
          {calcMode === 'manual' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-sm">
              <label className="block text-xs font-bold text-slate-350 mb-1.5">
                Calorie Giornaliere Target (kcal)
              </label>
              <input
                type="number"
                required
                value={calories}
                onChange={(e) => setCalories(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-2.5 px-4 text-base font-bold text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
              />
            </div>
          ) : (
            /* Automatic Calculator Demographic Fields */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3.5 shadow-sm">
              <div className="flex items-center gap-2 mb-1 border-b border-slate-800 pb-2">
                <Calculator className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200">Parametri Mifflin-St Jeor</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Age */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Età</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    required
                    value={age}
                    onChange={(e) => setAge(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm font-semibold text-slate-200 font-mono"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Genere</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm font-semibold text-slate-200"
                  >
                    <option value="male">Uomo</option>
                    <option value="female">Donna</option>
                  </select>
                </div>

                {/* Height */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Altezza (cm)</label>
                  <input
                    type="number"
                    min="50"
                    max="250"
                    required
                    value={height}
                    onChange={(e) => setHeight(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm font-semibold text-slate-200 font-mono"
                  />
                </div>

                {/* Weight */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Peso Attuale (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="300"
                    required
                    value={currentWeight}
                    onChange={(e) => setCurrentWeight(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm font-semibold text-slate-200 font-mono"
                  />
                </div>
              </div>

              {/* Activity Level */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Livello di Attività</label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-semibold text-slate-200"
                >
                  <option value="sedentary">Sedentario (Ufficio, no sport)</option>
                  <option value="light">Poco Attivo (Sport 1-3 gg/sett)</option>
                  <option value="moderate">Moderatamente Attivo (Sport 3-5 gg/sett)</option>
                  <option value="active">Molto Attivo (Sport 6-7 gg/sett)</option>
                </select>
              </div>

              {/* Weekly Goal */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Obiettivo Settimanale</label>
                <select
                  value={weeklyGoal}
                  onChange={(e) => setWeeklyGoal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-semibold text-slate-200"
                >
                  <option value="lose_0.5">Dimagrire (-0.5 kg / settimana)</option>
                  <option value="lose_0.25">Dimagrire leggermente (-0.25 kg / settimana)</option>
                  <option value="maintain">Mantenere il peso attuale</option>
                  <option value="gain_0.25">Aumentare leggermente (+0.25 kg / settimana)</option>
                  <option value="gain_0.5">Aumentare di peso (+0.5 kg / settimana)</option>
                </select>
              </div>

              {/* Calorie recommendation feedback */}
              <div className="bg-cyan-950/40 border border-cyan-800/40 p-3 rounded-2xl text-[11px] text-cyan-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-cyan-400" />
                <div>
                  Stima Calorie Calcolata: <strong className="font-mono text-cyan-200">{calculatedCalories} kcal/giorno</strong>. Questo valore considera il tuo metabolismo basale e il livello di deficit energetico selezionato.
                </div>
              </div>
            </div>
          )}

          {/* Macro Distribution Mode Switcher & Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
              <span className="text-xs font-bold text-slate-200">Modalità Inserimento Macro</span>
              <div className="flex bg-slate-950 border border-slate-800 p-0.5 rounded-xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setMacroInputMode('grams')}
                  className={`py-1 px-3 rounded-lg transition-all cursor-pointer ${
                    macroInputMode === 'grams'
                      ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Grammi (g)
                </button>
                <button
                  type="button"
                  onClick={() => setMacroInputMode('percentages')}
                  className={`py-1 px-3 rounded-lg transition-all cursor-pointer ${
                    macroInputMode === 'percentages'
                      ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Percentuali (%)
                </button>
              </div>
            </div>

            {macroInputMode === 'grams' ? (
              /* --- MODE A: EXACT GRAMS --- */
              <div className="space-y-3.5 pt-1">
                {/* Carbs (g) */}
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                    <span className="text-blue-400 font-bold">Carboidrati (g)</span>
                    <span className="font-mono text-slate-300">~{calculatedCarbPctFromG}% del totale</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    required
                    value={carbsG}
                    onChange={(e) => setCarbsG(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm font-bold text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Protein (g) */}
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                    <span className="text-emerald-400 font-bold">Proteine (g)</span>
                    <span className="font-mono text-slate-300">~{calculatedProtPctFromG}% del totale</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    required
                    value={proteinG}
                    onChange={(e) => setProteinG(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm font-bold text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Fat (g) */}
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                    <span className="text-red-400 font-bold">Grassi (g)</span>
                    <span className="font-mono text-slate-300">~{calculatedFatPctFromG}% del totale</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    required
                    value={fatG}
                    onChange={(e) => setFatG(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm font-bold text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Grams Computed Summary Badge */}
                <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl text-[11px] text-slate-300 flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Calorie Calcolate dai Grammi:</span>
                  <span className="font-mono font-black text-cyan-400 text-sm">{computedCaloriesFromGrams} kcal</span>
                </div>
              </div>
            ) : (
              /* --- MODE B: PERCENTAGES --- */
              <div>
                <div className="flex items-center justify-between mb-3 text-xs font-mono">
                  <span className="text-slate-400">Distribuzione %</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full border ${
                      totalPercentage === 100
                        ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/50'
                        : 'text-red-400 bg-red-950/60 border-red-800/50'
                    }`}
                  >
                    Totale: {totalPercentage}%
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Carbs % */}
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-semibold text-blue-400">Carboidrati ({carbPct}%)</span>
                      <span className="font-mono font-bold text-slate-200">{calculatedCarbsGFromPct}g</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="80"
                      step="5"
                      value={carbPct}
                      onChange={(e) => setCarbPct(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Fat % */}
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-semibold text-red-400">Grassi ({fatPct}%)</span>
                      <span className="font-mono font-bold text-slate-200">{calculatedFatGFromPct}g</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      step="5"
                      value={fatPct}
                      onChange={(e) => setFatPct(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                  </div>

                  {/* Protein % */}
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-semibold text-emerald-400">Proteine ({protPct}%)</span>
                      <span className="font-mono font-bold text-slate-200">{calculatedProteinGFromPct}g</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      step="5"
                      value={protPct}
                      onChange={(e) => setProtPct(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Water & Steps Target Editors */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 mb-1 border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-200">Obiettivi Altri Fattori</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Peso Obiettivo (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(Math.max(1, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm font-semibold text-slate-250 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Target Acqua (ml)</label>
                <input
                  type="number"
                  step="250"
                  required
                  value={waterGoalMl}
                  onChange={(e) => setWaterGoalMl(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm font-semibold text-slate-250 font-mono"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Target Passi Giornalieri</label>
                <input
                  type="number"
                  step="500"
                  required
                  value={stepsGoal}
                  onChange={(e) => setStepsGoal(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm font-semibold text-slate-250 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-2xl border border-slate-750 transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={totalPercentage !== 100}
              className="flex-1 py-3 px-4 bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              Salva Obiettivi
            </button>
          </div>
        </form>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Analisi Progressi</h1>
            <p className="text-xs text-slate-400">Visualizza grafici sull'andamento del tuo diario</p>
          </div>

          {/* Chart 1: Weight Evolution over time */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-sm relative">
            <div className="flex items-center justify-between mb-3 border-b border-slate-850 pb-2.5">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-orange-400 animate-pulse" /> Andamento Peso Corporeo
              </h3>
              
              {/* Range Filters */}
              <div className="flex bg-slate-950 border border-slate-800 p-0.5 rounded-lg text-[10px] font-mono">
                {([7, 30, 90] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setWeightRange(r);
                      setHoveredWeightPoint(null);
                    }}
                    className={`py-0.5 px-2 rounded font-bold cursor-pointer transition-colors ${
                      weightRange === r ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {r}D
                  </button>
                ))}
              </div>
            </div>

            {sortedFilteredWeights.length > 0 ? (
              <div className="relative pt-2">
                {/* Custom SVG Line Chart */}
                <svg width="100%" height="180" viewBox="0 0 350 180" className="overflow-visible">
                  <defs>
                    <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F97316" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#F97316" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Calculations */}
                  {(() => {
                    const width = 350;
                    const height = 180;
                    const paddingX = 35;
                    const paddingY = 25;

                    const weights = sortedFilteredWeights.map((w) => w.weight);
                    const minW = Math.min(...weights) - 0.5;
                    const maxW = Math.max(...weights) + 0.5;
                    const wRange = maxW - minW || 1;

                    const points = sortedFilteredWeights.map((w, index) => {
                      const x = paddingX + ((width - paddingX * 2) / (sortedFilteredWeights.length - 1 || 1)) * index;
                      const y = height - paddingY - ((w.weight - minW) / wRange) * (height - paddingY * 2);
                      return { x, y, date: w.date, weight: w.weight };
                    });

                    let pathD = '';
                    let areaD = '';
                    if (points.length > 0) {
                      pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ');
                      areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;
                    }

                    return (
                      <>
                        {/* Horizontal Grid lines */}
                        {[0, 0.5, 1].map((r, i) => {
                          const y = paddingY + r * (height - paddingY * 2);
                          const gridVal = maxW - r * wRange;
                          return (
                            <g key={i}>
                              <line
                                x1={paddingX}
                                y1={y}
                                x2={width - paddingX}
                                y2={y}
                                stroke="#1E293B"
                                strokeDasharray="3,3"
                                strokeWidth="1"
                              />
                              <text
                                x={paddingX - 8}
                                y={y + 3}
                                textAnchor="end"
                                className="fill-slate-500 text-[9px] font-mono"
                              >
                                {gridVal.toFixed(1)}
                              </text>
                            </g>
                          );
                        })}

                        {/* Area Fill */}
                        {areaD && <path d={areaD} fill="url(#weightGradient)" />}

                        {/* Connection Line */}
                        {pathD && (
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#F97316"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* Data Points */}
                        {points.map((p, idx) => (
                          <circle
                            key={idx}
                            cx={p.x}
                            cy={p.y}
                            r={hoveredWeightPoint?.date === p.date ? '6' : '3.5'}
                            fill="#FFF"
                            stroke="#F97316"
                            strokeWidth="2.5"
                            className="cursor-pointer transition-all duration-100"
                            onMouseEnter={() => setHoveredWeightPoint(p)}
                            onMouseLeave={() => setHoveredWeightPoint(null)}
                          />
                        ))}

                        {/* X-axis Labels (First & Last date) */}
                        {points.length > 0 && (
                          <>
                            <text x={points[0].x} y={height - 6} textAnchor="middle" className="fill-slate-400 text-[9px] font-mono">
                              {formatShortDate(points[0].date)}
                            </text>
                            {points.length > 1 && (
                              <text x={points[points.length - 1].x} y={height - 6} textAnchor="middle" className="fill-slate-400 text-[9px] font-mono">
                                {formatShortDate(points[points.length - 1].date)}
                              </text>
                            )}
                          </>
                        )}
                      </>
                    );
                  })()}
                </svg>

                {/* Abs Tooltip Overlay */}
                {hoveredWeightPoint && (
                  <div
                    className="absolute bg-slate-950 border border-slate-800 rounded-xl p-2 text-[10px] font-bold font-mono text-slate-100 pointer-events-none shadow-2xl z-20 flex flex-col items-center"
                    style={{
                      left: Math.max(10, Math.min(320, hoveredWeightPoint.x * (350 / 350) - 40)),
                      top: Math.max(0, hoveredWeightPoint.y - 52),
                    }}
                  >
                    <span className="text-[9px] text-slate-400">{formatShortDate(hoveredWeightPoint.date)}</span>
                    <span className="text-orange-400">{hoveredWeightPoint.weight.toFixed(1)} kg</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <HelpCircle className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs text-slate-400">Nessun dato di peso inserito per questi {weightRange} giorni.</p>
                <p className="text-[10px] text-slate-500 mt-1">Registra il tuo peso oggi per avviare il tracciamento grafico!</p>
              </div>
            )}
          </div>

          {/* Chart 2: Calories vs Goal bar chart (Current Week) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-sm relative">
            <h3 className="text-xs font-bold text-slate-200 mb-3 border-b border-slate-850 pb-2.5 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-cyan-400" /> Calorie Assunte vs Obiettivo (Settimana Corrente)
            </h3>

            {isLoadingSummaries ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="relative pt-2">
                <svg width="100%" height="150" viewBox="0 0 350 150" className="overflow-visible">
                  <defs>
                    <linearGradient id="barCyanGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06B6D4" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                    <linearGradient id="barRedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" />
                      <stop offset="100%" stopColor="#F97316" />
                    </linearGradient>
                  </defs>

                  {(() => {
                    const chartHeight = 150;
                    const paddingX = 35;
                    const paddingY = 20;

                    const weekDaysLabels = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

                    const calorieValues = weekDates.map((dateStr) => {
                      const summary = weeklySummaries[dateStr];
                      return summary ? summary.calories : 0;
                    });

                    const maxVal = Math.max(...calorieValues, goals.calories, 1000);
                    const yBudget = chartHeight - paddingY - (goals.calories / maxVal) * (chartHeight - paddingY * 2);

                    return (
                      <>
                        {/* Budget Limit Dashed Line */}
                        <line
                          x1={paddingX}
                          y1={yBudget}
                          x2={350 - paddingX + 15}
                          y2={yBudget}
                          stroke="#E2E8F0"
                          strokeDasharray="4,4"
                          strokeWidth="1.2"
                          opacity="0.6"
                        />
                        <text
                          x={350 - paddingX + 18}
                          y={yBudget + 3}
                          className="fill-slate-400 text-[8px] font-bold font-mono"
                        >
                          Target
                        </text>

                        {/* Day Columns */}
                        {weekDates.map((_, i) => {
                          const val = calorieValues[i];
                          const colWidth = 26;
                          const spacing = (350 - paddingX * 2 - colWidth * 7) / 6;
                          const x = paddingX + i * (colWidth + spacing);

                          const barH = (val / maxVal) * (chartHeight - paddingY * 2);
                          const y = chartHeight - paddingY - barH;

                          const isOver = val > goals.calories;

                          return (
                            <g key={i}>
                              {/* Background slot */}
                              <rect
                                x={x}
                                y={paddingY}
                                width={colWidth}
                                height={chartHeight - paddingY * 2}
                                fill="#1E293B"
                                opacity="0.3"
                                rx="4"
                              />

                              {/* Progress bar */}
                              {val > 0 && (
                                <rect
                                  x={x}
                                  y={y}
                                  width={colWidth}
                                  height={barH}
                                  fill={isOver ? 'url(#barRedGradient)' : 'url(#barCyanGradient)'}
                                  rx="4"
                                  className="cursor-pointer hover:opacity-85 transition-opacity"
                                  onMouseEnter={() => setHoveredCalorieBar({ index: i, val, goal: goals.calories, x: x + colWidth/2, y })}
                                  onMouseLeave={() => setHoveredCalorieBar(null)}
                                />
                              )}

                              {/* Day Label */}
                              <text
                                x={x + colWidth / 2}
                                y={chartHeight - 6}
                                textAnchor="middle"
                                className="fill-slate-400 text-[9px] font-semibold"
                              >
                                {weekDaysLabels[i]}
                              </text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>

                {/* Abs Tooltip Overlay for Calorie Bar */}
                {hoveredCalorieBar && (
                  <div
                    className="absolute bg-slate-950 border border-slate-800 rounded-xl p-2 text-[10px] font-bold font-mono text-slate-100 pointer-events-none shadow-2xl z-20 flex flex-col items-center"
                    style={{
                      left: Math.max(10, Math.min(320, hoveredCalorieBar.x - 45)),
                      top: Math.max(0, hoveredCalorieBar.y - 52),
                    }}
                  >
                    <span className="text-cyan-400">{hoveredCalorieBar.val} kcal</span>
                    <span className="text-[8px] text-slate-500">Goal: {hoveredCalorieBar.goal}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chart 3: Macros Doughnut and comparison */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-200 mb-4 border-b border-slate-850 pb-2.5 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-emerald-400" /> Ripartizione Averages Macro
            </h3>

            {isLoadingSummaries ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (() => {
              // Calculate averages
              let totalCarbs = 0;
              let totalFat = 0;
              let totalProtein = 0;
              let activeDays = 0;

              weekDates.forEach((d) => {
                const s = weeklySummaries[d];
                if (s && (s.carbs > 0 || s.fat > 0 || s.protein > 0)) {
                  totalCarbs += s.carbs;
                  totalFat += s.fat;
                  totalProtein += s.protein;
                  activeDays++;
                }
              });

              let avgCarbs = 0;
              let avgFat = 0;
              let avgProtein = 0;

              if (activeDays > 0) {
                avgCarbs = Math.round(totalCarbs / activeDays);
                avgFat = Math.round(totalFat / activeDays);
                avgProtein = Math.round(totalProtein / activeDays);
              }

              const carbKcal = avgCarbs * 4;
              const proteinKcal = avgProtein * 4;
              const fatKcal = avgFat * 9;
              const totalMacroKcal = carbKcal + proteinKcal + fatKcal;

              let cPct = 0;
              let fPct = 0;
              let pPct = 0;

              if (totalMacroKcal > 0) {
                cPct = Math.round((carbKcal / totalMacroKcal) * 100);
                pPct = Math.round((proteinKcal / totalMacroKcal) * 100);
                fPct = 100 - cPct - pPct; // ensure sums to exactly 100
              }

              if (activeDays === 0) {
                return (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    Nessun dato alimentare registrato per questa settimana.
                  </div>
                );
              }

              return (
                <div className="flex items-center gap-6">
                  {/* Visual Doughnut ring */}
                  <div className="relative w-28 h-28 shrink-0">
                    <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform -rotate-90">
                      {/* background */}
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#1E293B" strokeWidth="8" />

                      {/* Carbs slice */}
                      {cPct > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#3B82F6"
                          strokeWidth="8"
                          strokeDasharray={`${(cPct * 238.76) / 100} 238.76`}
                          strokeDashoffset={0}
                          strokeLinecap="round"
                        />
                      )}

                      {/* Fat slice */}
                      {fPct > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#EF4444"
                          strokeWidth="8"
                          strokeDasharray={`${(fPct * 238.76) / 100} 238.76`}
                          strokeDashoffset={-((cPct * 238.76) / 100)}
                          strokeLinecap="round"
                        />
                      )}

                      {/* Protein slice */}
                      {pPct > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#22C55E"
                          strokeWidth="8"
                          strokeDasharray={`${(pPct * 238.76) / 100} 238.76`}
                          strokeDashoffset={-(((cPct + fPct) * 238.76) / 100)}
                          strokeLinecap="round"
                        />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[8px] uppercase font-bold text-slate-500">Media Kcal</span>
                      <span className="text-sm font-black text-slate-100 font-mono">
                        {Math.round(totalMacroKcal)}
                      </span>
                    </div>
                  </div>

                  {/* Comparison Stats List */}
                  <div className="flex-1 space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-200">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Carboidrati
                        </span>
                        <span className="font-mono text-blue-400">{avgCarbs}g ({cPct}%)</span>
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono text-right">Target: {goals.carbs}g</div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-200">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Grassi
                        </span>
                        <span className="font-mono text-red-400">{avgFat}g ({fPct}%)</span>
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono text-right">Target: {goals.fat}g</div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-200">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Proteine
                        </span>
                        <span className="font-mono text-emerald-400">{avgProtein}g ({pPct}%)</span>
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono text-right">Target: {goals.protein}g</div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Success / Notification Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl border backdrop-blur-md ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
              : toast.type === 'error'
              ? 'bg-red-950/90 border-red-500/30 text-red-300'
              : 'bg-slate-800/90 border-slate-700 text-slate-200'
          }`}>
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold font-sans tracking-wide">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsPage;
