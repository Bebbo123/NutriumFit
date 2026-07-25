import React from 'react';
import { Trash2, Tag, Star } from 'lucide-react';
import type { LoggedFood } from '../../types/diary';
import { HealthScoreBadge } from '../common/HealthScoreBadge';

interface FoodItemRowProps {
  food: LoggedFood;
  onRemove: (logId: string) => void;
  onEdit?: (food: LoggedFood) => void;
  onToggleFavorite?: (food: LoggedFood) => void;
  isFavorite?: boolean;
}

export const FoodItemRow: React.FC<FoodItemRowProps> = ({
  food,
  onRemove,
  onEdit,
  onToggleFavorite,
  isFavorite = false,
}) => {
  return (
    <div
      onClick={() => onEdit && onEdit(food)}
      className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-800/60 group transition-all border border-transparent hover:border-slate-800 cursor-pointer"
    >
      <div className="flex-1 min-w-0 pr-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h4 className="text-sm font-semibold text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
            {food.name}
          </h4>
          {food.brand && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-cyan-400 font-semibold border border-slate-700/60 flex items-center gap-0.5">
              <Tag className="w-2.5 h-2.5 opacity-70" />
              {food.brand}
            </span>
          )}
          {food.healthScore !== undefined && (
            <HealthScoreBadge score={food.healthScore} showBar={false} size="sm" />
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
          <span>{food.servingSizeDisplay}</span>
          <span className="text-slate-600">•</span>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-blue-400 font-medium">{food.macros.carbs}g C</span>
            <span className="text-red-400 font-medium">{food.macros.fat}g F</span>
            <span className="text-emerald-400 font-medium">{food.macros.protein}g P</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-slate-200 font-mono mr-1">
          {food.calories} <span className="text-[10px] font-normal text-slate-400">kcal</span>
        </span>

        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(food);
            }}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              isFavorite
                ? 'text-amber-400 hover:bg-amber-950/40'
                : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800 opacity-70 group-hover:opacity-100'
            }`}
            title={isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400' : ''}`} />
          </button>
        )}

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

