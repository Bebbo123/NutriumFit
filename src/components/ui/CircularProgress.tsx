import React from 'react';
import { Flame, Dumbbell, UtensilsCrossed } from 'lucide-react';

interface CircularProgressProps {
  goal: number;
  food: number;
  exercise: number;
  size?: number;
  strokeWidth?: number;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  goal,
  food,
  exercise,
  size = 240,
  strokeWidth = 14,
}) => {
  const remaining = Math.max(0, goal - food + exercise);
  const totalCalorieBudget = goal + exercise;
  const progressRatio = Math.min(1, food / Math.max(1, totalCalorieBudget));

  const center = size / 2;
  const radius = center - strokeWidth - 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressRatio * circumference;

  const isOverGoal = food > totalCalorieBudget;

  return (
    <div className="flex flex-col items-center justify-center relative my-2">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* SVG Circular Ring */}
        <svg width={size} height={size} className="transform -rotate-90 drop-shadow-md">
          <defs>
            {/* Cyan/Teal Gradient for Calorie Progress */}
            <linearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
            <linearGradient id="overGoalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
          </defs>

          {/* Track background */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#1E293B"
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Animated Progress Ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke={isOverGoal ? 'url(#overGoalGradient)' : 'url(#calorieGradient)'}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Text Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <span className="text-4xl font-extrabold tracking-tight text-white drop-shadow-sm font-mono">
            {remaining.toLocaleString()}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-0.5">
            Calorie Rimanenti
          </span>
          {isOverGoal && (
            <span className="text-xs font-bold text-red-400 mt-1 bg-red-950/60 px-2 py-0.5 rounded-full border border-red-800/50">
              +{food - totalCalorieBudget} Oltre Obiettivo
            </span>
          )}
        </div>
      </div>

      {/* Equation Breakdown below ring: Goal - Food + Exercise = Remaining */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs mt-3 bg-slate-900/80 backdrop-blur-md p-3 rounded-2xl border border-slate-800/80 shadow-inner">
        {/* Goal */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-1 text-slate-400 text-xs font-medium mb-0.5">
            <Flame className="w-3.5 h-3.5 text-cyan-400" />
            Obiettivo
          </div>
          <span className="text-sm font-bold text-slate-200 font-mono">{goal}</span>
        </div>

        {/* Food */}
        <div className="flex flex-col items-center text-center border-x border-slate-800">
          <div className="flex items-center gap-1 text-slate-400 text-xs font-medium mb-0.5">
            <UtensilsCrossed className="w-3.5 h-3.5 text-orange-400" />
            Alimenti
          </div>
          <span className="text-sm font-bold text-slate-200 font-mono">{food}</span>
        </div>

        {/* Exercise */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-1 text-slate-400 text-xs font-medium mb-0.5">
            <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
            Esercizio
          </div>
          <span className="text-sm font-bold text-emerald-400 font-mono">+{exercise}</span>
        </div>
      </div>
    </div>
  );
};
