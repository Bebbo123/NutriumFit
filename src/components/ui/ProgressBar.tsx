import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  colorClass: string;
  heightClass?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  colorClass,
  heightClass = 'h-2.5',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / Math.max(1, max)) * 100));

  return (
    <div className={`w-full bg-slate-800/90 rounded-full overflow-hidden ${heightClass} shadow-inner`}>
      <div
        className={`h-full transition-all duration-500 ease-out rounded-full ${colorClass}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
