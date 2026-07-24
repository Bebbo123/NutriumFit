import React from 'react';
import { Home, BookOpen, Plus, Target, User } from 'lucide-react';

export type NavTab = 'home' | 'diary' | 'add' | 'goals' | 'profile';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onQuickAddClick: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onQuickAddClick,
}) => {
  const tabs = [
    { id: 'home' as NavTab, label: 'Home', icon: Home },
    { id: 'diary' as NavTab, label: 'Diario', icon: BookOpen },
    { id: 'add' as NavTab, label: 'Aggiungi', icon: Plus, isAction: true },
    { id: 'goals' as NavTab, label: 'Obiettivi', icon: Target },
    { id: 'profile' as NavTab, label: 'Profilo', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.isAction) {
            return (
              <button
                key={tab.id}
                onClick={onQuickAddClick}
                className="relative -top-4 flex flex-col items-center justify-center cursor-pointer group"
                aria-label="Aggiungi Alimento"
              >
                <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 group-hover:scale-105 active:scale-95 transition-all border-4 border-slate-950">
                  <Plus className="w-7 h-7 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-semibold text-cyan-400 mt-0.5">
                  Aggiungi
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 cursor-pointer transition-all ${
                isActive ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400" />
                )}
              </div>
              <span className={`text-[11px] mt-1 font-medium ${isActive ? 'font-bold' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
