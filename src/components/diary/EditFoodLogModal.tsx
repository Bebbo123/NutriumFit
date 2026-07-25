import React, { useState, useMemo } from 'react';
import { X, Trash2, Save, Tag, Star } from 'lucide-react';
import type { LoggedFood, MealType, FoodItem } from '../../types/diary';
import { HealthScoreBadge } from '../common/HealthScoreBadge';
import { MacroPreviewRings } from '../food/MacroPreviewRings';
import { WheelDialPicker } from '../ui/WheelDialPicker';
import { useDiaryStore } from '../../store/diaryStore';
import { useAuth } from '../../context/AuthContext';

interface EditFoodLogModalProps {
  foodLog: LoggedFood;
  onClose: () => void;
  onSave: (
    logId: string,
    mealType: MealType,
    foodName: string,
    calories: number,
    carbs: number,
    fat: number,
    protein: number,
    servings?: number,
    servingSizeDisplay?: string,
    brand?: string,
    healthScore?: number
  ) => Promise<void>;
  onDelete: (logId: string) => Promise<void>;
}

const MEAL_TYPES: MealType[] = ['Colazione', 'Pranzo', 'Cena', 'Spuntini'];

export const EditFoodLogModal: React.FC<EditFoodLogModalProps> = ({
  foodLog,
  onClose,
  onSave,
  onDelete,
}) => {
  const { user } = useAuth();
  const { selectedDate, goals, getTotalsForDate, toggleFavoriteFood, favoriteFoodIds } = useDiaryStore();

  const isFavorite = favoriteFoodIds.has(
    foodLog.logId.startsWith('off_') || foodLog.logId.startsWith('custom_')
      ? foodLog.logId
      : foodLog.name.toLowerCase().replace(/\s+/g, '_')
  ) || favoriteFoodIds.has(foodLog.logId);

  const handleToggleFavorite = async () => {
    if (!user) return;
    const foodItem: FoodItem = {
      id: foodLog.logId.startsWith('off_') || foodLog.logId.startsWith('custom_') ? foodLog.logId : foodLog.name.toLowerCase().replace(/\s+/g, '_'),
      name: foodLog.name,
      brand: foodLog.brand,
      servingSize: foodLog.servingSizeDisplay || '1 porzione',
      servingUnit: 'g',
      servingAmount: 100,
      calories: foodLog.servings && foodLog.servings > 0 ? Math.round(foodLog.calories / foodLog.servings) : foodLog.calories,
      macros: {
        carbs: foodLog.servings && foodLog.servings > 0 ? Math.round((foodLog.macros.carbs / foodLog.servings) * 10) / 10 : foodLog.macros.carbs,
        fat: foodLog.servings && foodLog.servings > 0 ? Math.round((foodLog.macros.fat / foodLog.servings) * 10) / 10 : foodLog.macros.fat,
        protein: foodLog.servings && foodLog.servings > 0 ? Math.round((foodLog.macros.protein / foodLog.servings) * 10) / 10 : foodLog.macros.protein,
      },
      healthScore: foodLog.healthScore,
    };
    await toggleFavoriteFood(user.id, foodItem);
  };
  const [selectedMeal, setSelectedMeal] = useState<MealType>(foodLog.mealType);
  const [foodName, setFoodName] = useState(foodLog.name);
  const [brand, setBrand] = useState(foodLog.brand || '');
  
  // Default mode estimation
  const [portionMode, setPortionMode] = useState<'grams' | 'portions'>('grams');

  // Extract or estimate initial unit weight & grams
  const initialGrams = useMemo(() => {
    if (foodLog.grams && foodLog.grams > 0) return foodLog.grams;
    const matchG = foodLog.servingSizeDisplay?.match(/(\d+)\s*g/i);
    if (matchG) return parseInt(matchG[1], 10);
    return 100;
  }, [foodLog]);

  const [gramsInput, setGramsInput] = useState<number>(initialGrams);
  const [portionInput, setPortionInput] = useState<number>(foodLog.servings || 1);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Unit weight for 1 portion
  const unitWeightGrams = useMemo(() => {
    if (foodLog.unitWeightGrams && foodLog.unitWeightGrams > 0) return foodLog.unitWeightGrams;
    if (foodLog.servings && foodLog.servings > 0 && initialGrams) {
      return Math.round(initialGrams / foodLog.servings);
    }
    return 100;
  }, [foodLog, initialGrams]);

  // Base macros per 100g calculated from current logged values & initial weight
  const macroPer100g = useMemo(() => {
    const totalG = initialGrams > 0 ? initialGrams : 100;
    return {
      calories: (foodLog.calories / totalG) * 100,
      carbs: (foodLog.macros.carbs / totalG) * 100,
      fat: (foodLog.macros.fat / totalG) * 100,
      protein: (foodLog.macros.protein / totalG) * 100,
    };
  }, [foodLog, initialGrams]);

  // Active calculated weight in grams
  const totalWeightInGrams = useMemo(() => {
    if (portionMode === 'grams') {
      return Math.max(1, gramsInput || 1);
    }
    return Math.max(1, Math.round((portionInput || 1) * unitWeightGrams));
  }, [portionMode, gramsInput, portionInput, unitWeightGrams]);

  // Recalculated macros strictly using: (Macro_Per_100g * Total_Weight_In_Grams) / 100
  const calculated = useMemo(() => {
    const calories = Math.round((macroPer100g.calories * totalWeightInGrams) / 100);
    const carbs = Math.round(((macroPer100g.carbs * totalWeightInGrams) / 100) * 10) / 10;
    const fat = Math.round(((macroPer100g.fat * totalWeightInGrams) / 100) * 10) / 10;
    const protein = Math.round(((macroPer100g.protein * totalWeightInGrams) / 100) * 10) / 10;
    return { calories, carbs, fat, protein };
  }, [macroPer100g, totalWeightInGrams]);

  const handleSave = async () => {
    if (!foodName.trim()) return;
    setIsSaving(true);
    try {
      const servingsCount = portionMode === 'portions' ? portionInput : Math.round((totalWeightInGrams / unitWeightGrams) * 10) / 10;
      const displayLabel = portionMode === 'grams'
        ? `${totalWeightInGrams}g`
        : `${portionInput} ${portionInput === 1 ? 'porzione' : 'porzioni'} (${totalWeightInGrams}g)`;

      await onSave(
        foodLog.logId,
        selectedMeal,
        foodName.trim(),
        calculated.calories,
        calculated.carbs,
        calculated.fat,
        calculated.protein,
        servingsCount,
        displayLabel,
        brand.trim() || undefined,
        foodLog.healthScore
      );
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Rimuovere "${foodLog.name}" dal diario?`)) {
      setIsDeleting(true);
      try {
        await onDelete(foodLog.logId);
        onClose();
      } catch (err) {
        console.error(err);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const dayTotals = useMemo(() => getTotalsForDate(selectedDate), [selectedDate, getTotalsForDate]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4 pb-24 sm:pb-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl animate-in fade-in slide-in-from-bottom-6 max-h-[85vh] flex flex-col mb-4 sm:mb-0">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3 shrink-0">
          <div>
            <h3 className="text-base font-extrabold text-white">Modifica Alimento</h3>
            <p className="text-xs text-slate-400">Aggiorna quantità, marca o pasto registrato</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleFavorite}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                isFavorite
                  ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60'
              }`}
              title={isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-3 mb-4">
          {/* Health Score Badge (if present) */}
          <HealthScoreBadge score={foodLog.healthScore || 80} size="md" />

          {/* Live Macro Remaining Preview Rings */}
          <MacroPreviewRings
            itemCalories={calculated.calories}
            itemCarbs={calculated.carbs}
            itemFat={calculated.fat}
            itemProtein={calculated.protein}
            goalCalories={goals.calories}
            goalCarbs={goals.carbs}
            goalFat={goals.fat}
            goalProtein={goals.protein}
            currentCalories={dayTotals.calories}
            currentCarbs={dayTotals.macros.carbs}
            currentFat={dayTotals.macros.fat}
            currentProtein={dayTotals.macros.protein}
          />

          {/* Food Name & Brand Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Nome Alimento
              </label>
              <input
                type="text"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-100 font-semibold focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-cyan-400" /> Marca (opzionale)
              </label>
              <input
                type="text"
                placeholder="Es. Piacersi, Parmalat"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-100 font-semibold focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Meal Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Pasto Registrato
            </label>
            <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              {MEAL_TYPES.map((meal) => (
                <button
                  key={meal}
                  type="button"
                  onClick={() => setSelectedMeal(meal)}
                  className={`py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    selectedMeal === meal
                      ? 'bg-cyan-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {meal}
                </button>
              ))}
            </div>
          </div>

          {/* Dual Mode Selector (Grammi vs Porzioni) */}
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setPortionMode('grams');
                setGramsInput(totalWeightInGrams);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                portionMode === 'grams'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Grammi (g)
            </button>
            <button
              type="button"
              onClick={() => {
                setPortionMode('portions');
                setPortionInput(Math.round((totalWeightInGrams / unitWeightGrams) * 10) / 10 || 1);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                portionMode === 'portions'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Porzioni
            </button>
          </div>

          {/* Live Macro Recalculation Display Badge */}
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 font-mono text-center">
            <span className="text-2xl font-black text-cyan-400">
              {calculated.calories} <span className="text-xs font-normal text-slate-400">kcal</span>
            </span>
            <div className="flex justify-center gap-4 text-xs mt-1.5 text-slate-300">
              <span className="text-blue-400 font-semibold">{calculated.carbs}g C</span>
              <span className="text-red-400 font-semibold">{calculated.fat}g F</span>
              <span className="text-emerald-400 font-semibold">{calculated.protein}g P</span>
            </div>
          </div>

          {/* Interactive Wheel/Dial Picker Control */}
          {portionMode === 'grams' ? (
            <div className="space-y-2">
              <WheelDialPicker
                value={gramsInput}
                onChange={(val) => setGramsInput(val)}
                min={1}
                max={3000}
                unit="g"
                label="Selettore Grammi (Ghiera)"
                steps={[
                  { label: '1g', value: 1 },
                  { label: '5g', value: 5 },
                  { label: '10g', value: 10 },
                ]}
              />
              <div className="flex gap-1.5 justify-center">
                {[50, 100, 150, 200, 250].map((presetG) => (
                  <button
                    key={presetG}
                    type="button"
                    onClick={() => setGramsInput(presetG)}
                    className={`py-1 px-2.5 rounded-xl text-[11px] font-bold font-mono transition-all cursor-pointer ${
                      gramsInput === presetG
                        ? 'bg-cyan-500 text-slate-950 shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {presetG}g
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <WheelDialPicker
                value={portionInput}
                onChange={(val) => setPortionInput(val)}
                min={0.1}
                max={50}
                unit="porz"
                label="Selettore Porzioni (Ghiera)"
                steps={[
                  { label: '0.1', value: 0.1 },
                  { label: '0.5', value: 0.5 },
                  { label: '1 porz', value: 1 },
                ]}
              />
              <div className="flex gap-1.5 justify-center">
                {[0.5, 1, 1.5, 2, 3].map((presetP) => (
                  <button
                    key={presetP}
                    type="button"
                    onClick={() => setPortionInput(presetP)}
                    className={`py-1 px-2 rounded-xl text-[11px] font-bold font-mono transition-all cursor-pointer ${
                      portionInput === presetP
                        ? 'bg-cyan-500 text-slate-950 shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {presetP} {presetP === 1 ? 'porz' : 'porzioni'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 shrink-0 pt-2 border-t border-slate-800/60">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isDeleting}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Salvataggio...' : 'Salva Modifiche'}
          </button>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="flex-1 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-400 font-semibold text-xs cursor-pointer flex items-center justify-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Elimina
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
            >
              Annulla
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
