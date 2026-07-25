import React from 'react';
import { ShieldCheck, Activity } from 'lucide-react';

interface HealthScoreBadgeProps {
  score?: number;
  showBar?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const HealthScoreBadge: React.FC<HealthScoreBadgeProps> = ({
  score = 75,
  showBar = true,
  size = 'sm',
  className = '',
}) => {
  const safeScore = Math.max(10, Math.min(100, Math.round(score)));

  let colorClasses = {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    bar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
    label: 'Eccellente',
  };

  if (safeScore < 50) {
    colorClasses = {
      text: 'text-rose-400',
      bg: 'bg-rose-500/15',
      border: 'border-rose-500/30',
      bar: 'bg-gradient-to-r from-rose-500 to-red-400',
      label: 'Moderazione',
    };
  } else if (safeScore < 80) {
    colorClasses = {
      text: 'text-amber-400',
      bg: 'bg-amber-500/15',
      border: 'border-amber-500/30',
      bar: 'bg-gradient-to-r from-amber-500 to-yellow-400',
      label: 'Buono',
    };
  }

  if (size === 'sm') {
    return (
      <div className={`inline-flex flex-col gap-0.5 ${className}`}>
        <div
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-extrabold font-mono ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border}`}
          title={`Valutazione Salutare: ${safeScore}% (${colorClasses.label})`}
        >
          <Activity className="w-2.5 h-2.5 shrink-0" />
          <span>{safeScore}% Salutare</span>
        </div>
        {showBar && (
          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${colorClasses.bar}`}
              style={{ width: `${safeScore}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 p-2 bg-slate-950/60 rounded-xl border border-slate-800/80 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className={`w-4 h-4 ${colorClasses.text}`} />
          <span className="text-xs font-bold text-slate-300">Indice Salutare</span>
        </div>
        <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-full border ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border}`}>
          {safeScore}% ({colorClasses.label})
        </span>
      </div>
      {showBar && (
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colorClasses.bar}`}
            style={{ width: `${safeScore}%` }}
          />
        </div>
      )}
    </div>
  );
};
