import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Minus, Plus, Sliders } from 'lucide-react';

interface WheelDialPickerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  steps?: { label: string; value: number }[];
  label?: string;
  className?: string;
}

export const WheelDialPicker: React.FC<WheelDialPickerProps> = ({
  value,
  onChange,
  min = 1,
  max = 3000,
  unit = 'g',
  steps = [
    { label: '1g', value: 1 },
    { label: '5g', value: 5 },
    { label: '10g', value: 10 },
  ],
  label,
  className = '',
}) => {
  const [activeStep, setActiveStep] = useState<number>(steps[1]?.value || steps[0]?.value || 1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef<number>(0);
  const startValueRef = useRef<number>(value);

  // Synchronize initial activeStep if steps change
  useEffect(() => {
    if (steps.length > 0 && !steps.some((s) => s.value === activeStep)) {
      setActiveStep(steps[0].value);
    }
  }, [steps, activeStep]);

  const updateValue = useCallback(
    (nextVal: number) => {
      const clamped = Math.max(min, Math.min(max, nextVal));
      // Round to clean decimal or integer depending on step
      const rounded = activeStep < 1 ? Math.round(clamped * 10) / 10 : Math.round(clamped);
      onChange(rounded);
    },
    [min, max, activeStep, onChange]
  );

  const handleStepClick = (stepVal: number) => {
    setActiveStep(stepVal);
  };

  const handleDecrement = () => {
    updateValue(value - activeStep);
  };

  const handleIncrement = () => {
    updateValue(value + activeStep);
  };

  // Drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    dragStartXRef.current = e.touches[0].clientX;
    startValueRef.current = value;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaX = e.touches[0].clientX - dragStartXRef.current;
    // Map pixels dragged to step increments (15px drag = 1 step)
    const stepsShift = Math.round(deltaX / 15);
    const newVal = startValueRef.current + stepsShift * activeStep;
    updateValue(newVal);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    startValueRef.current = value;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartXRef.current;
    const stepsShift = Math.round(deltaX / 15);
    const newVal = startValueRef.current + stepsShift * activeStep;
    updateValue(newVal);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className={`bg-slate-950 p-3 rounded-2xl border border-slate-800 ${className}`}>
      {/* Header Label & Step Preset Selectors */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>{label || 'Selettore a Ghiera'}</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
          {steps.map((step) => (
            <button
              key={step.value}
              type="button"
              onClick={() => handleStepClick(step.value)}
              className={`py-0.5 px-2 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                activeStep === step.value
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {step.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Wheel Track & Display Row */}
      <div className="flex items-center justify-between gap-3">
        {/* Decrement Button */}
        <button
          type="button"
          onClick={handleDecrement}
          className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 flex items-center justify-center cursor-pointer active:scale-95 transition-all shrink-0"
        >
          <Minus className="w-4 h-4 text-cyan-400" />
        </button>

        {/* Dial Ruler Track Container */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl py-2 px-3 relative overflow-hidden select-none cursor-ew-resize flex flex-col items-center justify-center"
        >
          {/* Active Value Display */}
          <div className="text-xl font-black font-mono text-cyan-400 leading-none mb-1">
            {value} <span className="text-xs font-normal text-slate-400">{unit}</span>
          </div>

          {/* Ruler Ticks Simulation */}
          <div className="w-full flex items-center justify-between h-4 px-2 opacity-60">
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${
                  i === 7
                    ? 'w-1 h-4 bg-cyan-400 scale-125'
                    : i % 3 === 0
                    ? 'w-0.5 h-3 bg-slate-400'
                    : 'w-0.5 h-1.5 bg-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Center Indicator Pin Line */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-cyan-400 shadow-[0_0_8px_#06b6d4] pointer-events-none opacity-80" />
        </div>

        {/* Increment Button */}
        <button
          type="button"
          onClick={handleIncrement}
          className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 flex items-center justify-center cursor-pointer active:scale-95 transition-all shrink-0"
        >
          <Plus className="w-4 h-4 text-cyan-400" />
        </button>
      </div>

      <div className="text-center text-[10px] text-slate-500 font-mono mt-1.5">
        Passo della ghiera: <span className="text-cyan-400 font-bold">±{activeStep}{unit}</span> (Trascina la ghiera orizzontalmente)
      </div>
    </div>
  );
};
