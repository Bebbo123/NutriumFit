import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Sun, SunMedium, Moon, Cookie, Save } from 'lucide-react';
import type { LoggedFood, MealType } from '../../types/diary';
import { FoodItemRow } from './FoodItemRow';

interface MealSectionProps {
  title: string;
  mealType: MealType;
  foods: LoggedFood[];
  onRemoveFood: (logId: string) => void;
  onAddFoodClick: (mealType: MealType) => void;
  onSaveMealAsGroup?: (mealType: MealType) => void;
}

const MEAL_ICONS = {
  Colazione: Sun,
  Pranzo: SunMedium,
  Cena: Moon,
  Spuntini: Cookie,
};

const MEAL_COLORS = {
  Colazione: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
  Pranzo: 'text-orange-400 bg-orange-950/40 border-orange-800/40',
  Cena: 'text-indigo-400 bg-indigo-950/40 border-indigo-800/40',
  Spuntini: 'text-purple-400 bg-purple-950/40 border-purple-800/40',
};

export const MealSection: React.FC<MealSectionProps> = ({
  title,
  mealType,
  foods,
  onRemoveFood,
  onAddFoodClick,
  onSaveMealAsGroup,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const IconComponent = MEAL_ICONS[mealType];
  const colorClass = MEAL_COLORS[mealType];

  const totalCalories = foods.reduce((acc, food) => acc + food.calories, 0);
  const totalMacros = foods.reduce(
    (acc, food) => {
      acc.carbs += food.macros.carbs;
      acc.fat += food.macros.fat;
      acc.protein += food.macros.protein;
      return acc;
    },
    { carbs: 0, fat: 0, protein: 0 }
  );

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl overflow-hidden shadow-sm transition-all mb-4">
      {/* Header Bar */}
      <div className="p-3.5 flex items-center justify-between bg-slate-900/50">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2.5 text-left flex-1 cursor-pointer select-none"
        >
          <div className={`p-2 rounded-xl border ${colorClass}`}>
            <IconComponent className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              {title}
              <span className="text-xs font-normal text-slate-400">
                ({foods.length} {foods.length === 1 ? 'alimento' : 'alimenti'})
              </span>
            </h3>
            {foods.length > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                <span className="text-blue-400">{Math.round(totalMacros.carbs)}g C</span>
                <span>•</span>
                <span className="text-red-400">{Math.round(totalMacros.fat)}g F</span>
                <span>•</span>
                <span className="text-emerald-400">{Math.round(totalMacros.protein)}g P</span>
              </div>
            )}
          </div>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-base font-bold text-slate-100 font-mono">
            {totalCalories} <span className="text-xs font-normal text-slate-400">kcal</span>
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expandable Food List */}
      {isExpanded && (
        <div className="p-2 border-t border-slate-800/60 divide-y divide-slate-800/40">
          {foods.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs">
              Nessun alimento registrato per {title.toLowerCase()} oggi.
            </div>
          ) : (
            foods.map((food) => (
              <FoodItemRow key={food.logId} food={food} onRemove={onRemoveFood} />
            ))
          )}

          {/* Add Food Button & Save Meal option */}
          <div className="pt-2 flex gap-2">
            <button
              onClick={() => onAddFoodClick(mealType)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-400 border border-cyan-800/40 text-xs font-bold tracking-wide uppercase transition-all cursor-pointer shadow-sm active:scale-[0.99]"
            >
              <Plus className="w-4 h-4" />
              Aggiungi a {title}
            </button>
            {foods.length > 0 && onSaveMealAsGroup && (
              <button
                type="button"
                onClick={() => onSaveMealAsGroup(mealType)}
                className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0"
                title="Salva questi alimenti come pasto combinato"
              >
                <Save className="w-4 h-4 text-cyan-400" />
                Salva pasto
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
