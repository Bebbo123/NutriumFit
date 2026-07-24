import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X, Bell } from 'lucide-react';

export const IosPwaPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1. Check if iOS
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    // 2. Check if already running in standalone mode (installed PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

    // 3. Check if user previously dismissed
    const isDismissed = localStorage.getItem('nutriumfit_ios_prompt_dismissed') === 'true';

    if (isIos && !isStandalone && !isDismissed) {
      setShowPrompt(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('nutriumfit_ios_prompt_dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 bg-slate-900/95 border border-cyan-500/30 backdrop-blur-xl rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-300 max-w-md mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              Attiva Promemoria su iPhone
            </h3>
            <p className="text-xs text-slate-200 mt-0.5 leading-snug">
              Per attivare le notifiche e i promemoria su iOS, aggiungi l'app alla <strong>Schermata Home</strong>:
            </p>
          </div>
        </div>
        <button 
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-around text-[11px] font-semibold text-slate-300">
        <div className="flex items-center gap-1.5">
          <span>1. Premi</span>
          <Share className="w-4 h-4 text-cyan-400 stroke-[2.5]" />
          <span>Condividi</span>
        </div>
        <span className="text-slate-600">→</span>
        <div className="flex items-center gap-1.5">
          <span>2. Tocca</span>
          <PlusSquare className="w-4 h-4 text-cyan-400 stroke-[2.5]" />
          <span>Aggiungi a Schermata Home</span>
        </div>
      </div>
    </div>
  );
};
