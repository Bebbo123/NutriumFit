import React from 'react';

export type FoodTab = 'recent' | 'frequent' | 'favorites' | 'my_foods' | 'meals' | 'recipes';

interface TabBarProps {
  activeTab: FoodTab;
  onTabChange: (tab: FoodTab) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: FoodTab; label: string }[] = [
    { id: 'recent', label: 'Recenti' },
    { id: 'frequent', label: 'Frequenti' },
    { id: 'favorites', label: 'Preferiti' },
    { id: 'my_foods', label: 'I miei alimenti' },
    { id: 'meals', label: 'Pasti' },
    { id: 'recipes', label: 'Ricette' },
  ];

  return (
    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2 border-b border-slate-800/80 scroll-smooth">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              isActive
                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
