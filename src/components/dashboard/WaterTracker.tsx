import React from 'react';
import { Droplet, Plus, Minus } from 'lucide-react';
import { ProgressBar } from '../ui/ProgressBar';

interface WaterTrackerProps {
  consumedMl: number;
  goalMl: number;
  onIncrement: (amountMl: number) => void;
}

export const WaterTracker: React.FC<WaterTrackerProps> = ({
  consumedMl,
  goalMl,
  onIncrement,
}) => {
  const percentage = Math.min(100, Math.round((consumedMl / goalMl) * 100));

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-800/50 text-cyan-400">
            <Droplet className="w-5 h-5 fill-cyan-400/20" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Acqua</h3>
            <p className="text-xs text-slate-400">Obiettivo idratazione giornaliero</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-base font-bold text-cyan-400 font-mono">
            {(consumedMl / 1000).toFixed(2)}
          </span>
          <span className="text-xs text-slate-400 font-mono"> / {(goalMl / 1000).toFixed(1)} L</span>
        </div>
      </div>

      <div className="mb-3">
        <ProgressBar
          value={consumedMl}
          max={goalMl}
          colorClass="bg-cyan-500 shadow-cyan-500/50"
          heightClass="h-2.5"
        />
        <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
          <span>{percentage}% completato</span>
          <span>{Math.max(0, goalMl - consumedMl)} ml rimasti</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onIncrement(250)}
          className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-cyan-950 active:text-cyan-400 text-xs font-semibold text-slate-200 border border-slate-700/60 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-cyan-400" />
          250 ml
        </button>
        <button
          onClick={() => onIncrement(500)}
          className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-cyan-950 active:text-cyan-400 text-xs font-semibold text-slate-200 border border-slate-700/60 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-cyan-400" />
          500 ml
        </button>
        <button
          onClick={() => onIncrement(-250)}
          disabled={consumedMl <= 0}
          className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-xs font-medium text-slate-400 border border-slate-800 disabled:opacity-40 transition-all cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />
          250 ml
        </button>
      </div>
    </div>
  );
};
