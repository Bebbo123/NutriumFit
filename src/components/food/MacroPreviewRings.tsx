import React from 'react';
import { PieChart, AlertTriangle } from 'lucide-react';

interface MacroPreviewRingsProps {
  itemCalories: number;
  itemCarbs: number;
  itemFat: number;
  itemProtein: number;
  goalCalories?: number;
  goalCarbs?: number;
  goalFat?: number;
  goalProtein?: number;
  currentCalories?: number;
  currentCarbs?: number;
  currentFat?: number;
  currentProtein?: number;
  className?: string;
}

interface RingItemProps {
  label: string;
  remaining: number;
  goal: number;
  itemVal: number;
  color: string;
  warningColor?: string;
  unit?: string;
}

const SingleRing: React.FC<RingItemProps> = ({
  label,
  remaining,
  goal,
  itemVal,
  color,
  warningColor = '#EF4444',
  unit = 'g',
}) => {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const isOver = remaining < 0;

  // Remaining percentage relative to daily goal (clamped 0 to 100)
  const pct = goal > 0 ? Math.max(0, Math.min(100, (remaining / goal) * 100)) : 0;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  const strokeColor = isOver ? warningColor : color;

  return (
    <div className="flex flex-col items-center justify-center p-1.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
      <div className="relative w-14 h-14 flex items-center justify-center">
        <svg className="w-14 h-14 transform -rotate-90">
          {/* Background Ring Track */}
          <circle
            cx="28"
            cy="28"
            r={radius}
            stroke="#1E293B"
            strokeWidth="4"
            fill="transparent"
          />
          {/* Animated Progress Ring */}
          <circle
            cx="28"
            cy="28"
            r={radius}
            stroke={strokeColor}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-300 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center font-mono">
          <span className={`text-xs font-black leading-none ${isOver ? 'text-rose-400 animate-pulse' : 'text-slate-100'}`}>
            {Math.round(remaining)}
          </span>
          <span className="text-[9px] text-slate-400 font-normal leading-none mt-0.5">{unit}</span>
        </div>
      </div>

      <div className="text-center mt-1">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300 block">
          {label}
        </span>
        <span className="text-[9px] text-cyan-400 font-mono font-semibold">
          +{Math.round(itemVal * 10) / 10}{unit}
        </span>
      </div>
    </div>
  );
};

export const MacroPreviewRings: React.FC<MacroPreviewRingsProps> = ({
  itemCalories,
  itemCarbs,
  itemFat,
  itemProtein,
  goalCalories = 2200,
  goalCarbs = 250,
  goalFat = 70,
  goalProtein = 150,
  currentCalories = 0,
  currentCarbs = 0,
  currentFat = 0,
  currentProtein = 0,
  className = '',
}) => {
  const remCalories = goalCalories - currentCalories - itemCalories;
  const remCarbs = goalCarbs - currentCarbs - itemCarbs;
  const remFat = goalFat - currentFat - itemFat;
  const remProtein = goalProtein - currentProtein - itemProtein;

  const hasAnyWarning = remCalories < 0 || remCarbs < 0 || remFat < 0 || remProtein < 0;

  return (
    <div className={`bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-3.5 shadow-md ${className}`}>
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-1.5">
          <PieChart className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
            Rimanenti dopo l'aggiunta
          </span>
        </div>
        {hasAnyWarning && (
          <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/50 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
            <AlertTriangle className="w-3 h-3" /> Oltre Obiettivo
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <SingleRing
          label="Kcal"
          remaining={remCalories}
          goal={goalCalories}
          itemVal={itemCalories}
          color="#06B6D4"
          warningColor="#F59E0B"
          unit="kcal"
        />
        <SingleRing
          label="Carbi"
          remaining={remCarbs}
          goal={goalCarbs}
          itemVal={itemCarbs}
          color="#3B82F6"
          warningColor="#EF4444"
          unit="g"
        />
        <SingleRing
          label="Grassi"
          remaining={remFat}
          goal={goalFat}
          itemVal={itemFat}
          color="#EF4444"
          warningColor="#F59E0B"
          unit="g"
        />
        <SingleRing
          label="Pro"
          remaining={remProtein}
          goal={goalProtein}
          itemVal={itemProtein}
          color="#10B981"
          warningColor="#3B82F6"
          unit="g"
        />
      </div>
    </div>
  );
};
