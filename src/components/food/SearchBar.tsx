import React from 'react';
import { Search, ScanLine, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  onScanClick: () => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onScanClick,
  placeholder = 'Cerca alimento, marca o codice a barre...',
}) => {
  return (
    <div className="relative flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-9 py-3 rounded-2xl bg-slate-900 border border-slate-800 focus:border-cyan-500/80 focus:ring-2 focus:ring-cyan-500/20 text-sm font-medium text-slate-100 placeholder-slate-500 outline-none transition-all"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Barcode Scanner Button */}
      <button
        onClick={onScanClick}
        className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/80 text-cyan-400 transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
        title="Scansiona codice a barre"
      >
        <ScanLine className="w-5 h-5" />
      </button>
    </div>
  );
};
