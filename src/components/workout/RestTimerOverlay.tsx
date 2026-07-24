import React, { useState, useEffect } from 'react';
import { X, Clock, Plus, Minus } from 'lucide-react';
import { useWorkoutStore } from '../../store/workoutStore';

export const RestTimerOverlay: React.FC = () => {
  const { restTimerTarget, clearRestTimer, adjustRestTimer } = useWorkoutStore();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Initialize a simple beep sound
  useEffect(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const createBeep = () => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
      };
      
      // We attach it to a global function to call it when timer ends
      (window as any).playRestBeep = createBeep;
    } catch (e) {
      console.warn('AudioContext not supported');
    }
  }, []);

  useEffect(() => {
    if (!restTimerTarget) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.ceil((restTimerTarget - Date.now()) / 1000);
      if (remaining <= 0) {
        setTimeLeft(0);
        
        // Timer finished: Vibrate and Beep
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
        if ((window as any).playRestBeep) {
          (window as any).playRestBeep();
        }
        
        // Auto clear after a few seconds or let user dismiss
        setTimeout(() => clearRestTimer(), 3000);
      } else {
        setTimeLeft(remaining);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [restTimerTarget, clearRestTimer]);

  if (!restTimerTarget || timeLeft === null) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(Math.abs(seconds) / 60);
    const s = Math.abs(seconds) % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[120] animate-in slide-in-from-bottom duration-300">
      <div className="mx-2 mb-2 p-4 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl shadow-black flex items-center justify-between">
        
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${timeLeft <= 0 ? 'bg-emerald-500 animate-pulse' : 'bg-cyan-500/20 text-cyan-400'}`}>
            <Clock className={`w-6 h-6 ${timeLeft <= 0 ? 'text-white' : ''}`} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tempo di Recupero</div>
            <div className={`text-2xl font-black tabular-nums ${timeLeft <= 0 ? 'text-emerald-400' : 'text-white'}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {timeLeft > 0 && (
            <>
              <button 
                onClick={() => adjustRestTimer(-30)}
                className="w-10 h-10 rounded-xl bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-colors"
              >
                <Minus className="w-5 h-5" />
              </button>
              <button 
                onClick={() => adjustRestTimer(30)}
                className="w-10 h-10 rounded-xl bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </>
          )}
          <button 
            onClick={clearRestTimer}
            className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-950 flex items-center justify-center text-slate-400 transition-colors ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
};
