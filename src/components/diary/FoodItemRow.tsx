import React from 'react';
import { Trash2 } from 'lucide-react';
import type { LoggedFood } from '../../types/diary';

interface FoodItemRowProps {
  food: LoggedFood;
  onRemove: (logId: string) => void;
  onEdit?: (food: LoggedFood) => void;
}

export const FoodItemRow: React.FC<FoodItemRowProps> = ({ food, onRemove, onEdit }) => {
  return (
    <div
      onClick={() => onEdit && onEdit(food)}
      className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-800/60 group transition-all border border-transparent hover:border-slate-800 cursor-pointer"
    >
      <div className="flex-1 min-w-0 pr-3">
        <div className="flex items-center gap-1.5">
          <h4 className="text-sm font-semibold text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
            {food.name}
          </h4>
          {food.brand && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
              {food.brand}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 font-mono">
          <span>{food.servingSizeDisplay}</span>
          <span className="text-slate-600">•</span>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-blue-400 font-medium">{food.macros.carbs}g C</span>
            <span className="text-red-400 font-medium">{food.macros.fat}g F</span>
            <span className="text-emerald-400 font-medium">{food.macros.protein}g P</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-slate-200 font-mono">
          {food.calories} <span className="text-[10px] font-normal text-slate-400">kcal</span>
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(food.logId);
          }}
          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 opacity-70 group-hover:opacity-100 transition-all cursor-pointer"
          title="Rimuovi alimento"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
