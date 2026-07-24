import React from 'react';
import { ProgressBar } from '../ui/ProgressBar';

interface MacroCardProps {
  label: string;
  currentGrams: number;
  goalGrams: number;
  type: 'carbs' | 'fat' | 'protein';
}

const TYPE_CONFIG = {
  carbs: {
    colorClass: 'bg-blue-500 shadow-blue-500/50',
    badgeBg: 'bg-blue-950/80 text-blue-400 border-blue-800/60',
    barColor: 'bg-blue-500',
    textColor: 'text-blue-400',
  },
  fat: {
    colorClass: 'bg-red-500 shadow-red-500/50',
    badgeBg: 'bg-red-950/80 text-red-400 border-red-800/60',
    barColor: 'bg-red-500',
    textColor: 'text-red-400',
  },
  protein: {
    colorClass: 'bg-emerald-500 shadow-emerald-500/50',
    badgeBg: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60',
    barColor: 'bg-emerald-500',
    textColor: 'text-emerald-400',
  },
};

export const MacroCard: React.FC<MacroCardProps> = ({
  label,
  currentGrams,
  goalGrams,
  type,
}) => {
  const config = TYPE_CONFIG[type];
  const remainingGrams = Math.max(0, Math.round(goalGrams - currentGrams));

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3 shadow-sm hover:border-slate-700/80 transition-all flex flex-col justify-between">
      {/* Macro Header */}
      <div>
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`w-2 h-2 rounded-full ${config.barColor} shrink-0`} />
          <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider truncate">
            {label}
          </span>
        </div>
        <div className="text-[10px] font-medium text-slate-400 font-mono mb-2">
          {remainingGrams}g rimanenti
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <ProgressBar
          value={currentGrams}
          max={goalGrams}
          colorClass={config.barColor}
          heightClass="h-1.5"
        />
      </div>

      {/* Bottom Amounts */}
      <div className="flex items-center justify-between text-[11px] leading-none">
        <span className="font-bold text-slate-100 font-mono">
          {Math.round(currentGrams)}
          <span className="text-slate-400 font-normal text-[10px]">/{goalGrams}g</span>
        </span>
        <span className="text-[10px] font-semibold text-slate-400 font-mono">
          {Math.round((currentGrams / Math.max(1, goalGrams)) * 100)}%
        </span>
      </div>
    </div>
  );
};
