import React from 'react';
import { Footprints, RefreshCw } from 'lucide-react';
import { ProgressBar } from '../ui/ProgressBar';

interface StepCounterWidgetProps {
  steps: number;
  goalSteps: number;
}

export const StepCounterWidget: React.FC<StepCounterWidgetProps> = ({
  steps,
  goalSteps,
}) => {
  const percentage = Math.min(100, Math.round((steps / goalSteps) * 100));

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-800/50 text-purple-400">
            <Footprints className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Passi Giornalieri</h3>
            <p className="text-xs text-slate-400">Contapassi</p>
          </div>
        </div>
        <button
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Sincronizza passi"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xl font-extrabold text-slate-100 font-mono">
          {steps.toLocaleString()}
        </span>
        <span className="text-xs text-slate-400 font-mono">
          / {goalSteps.toLocaleString()} passi
        </span>
      </div>

      <ProgressBar
        value={steps}
        max={goalSteps}
        colorClass="bg-purple-500 shadow-purple-500/50"
        heightClass="h-2"
      />
      <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
        <span>{percentage}% dell'obiettivo giornaliero</span>
        <span>~{(steps * 0.04).toFixed(0)} kcal bruciate</span>
      </div>
    </div>
  );
};
