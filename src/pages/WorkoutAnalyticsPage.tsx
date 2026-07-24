import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, TrendingUp, Trophy, Weight, BarChart2, Calendar } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useWorkoutStore } from '../store/workoutStore';
import { workoutService } from '../services/workoutService';
import { useAuth } from '../context/AuthContext';
import type { ExerciseHistoryPoint, ExercisePR } from '../types/workout';

interface WorkoutAnalyticsPageProps {
  onBack: () => void;
}

export const WorkoutAnalyticsPage: React.FC<WorkoutAnalyticsPageProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { exercises } = useWorkoutStore();
  
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(exercises[0]?.id || '');
  const [historyData, setHistoryData] = useState<ExerciseHistoryPoint[]>([]);
  const [prData, setPrData] = useState<ExercisePR>({ max_weight: 0, max_1rm: 0 });
  const [timeRange, setTimeRange] = useState<'30d' | '3m' | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && selectedExerciseId) {
      const loadAnalytics = async () => {
        setIsLoading(true);
        const [history, pr] = await Promise.all([
          workoutService.fetchExerciseHistory(user.id, selectedExerciseId),
          workoutService.fetchExercisePR(user.id, selectedExerciseId)
        ]);
        setHistoryData(history);
        setPrData(pr);
        setIsLoading(false);
      };
      loadAnalytics();
    }
  }, [user, selectedExerciseId]);

  // Filter history data based on selected time range
  const filteredHistory = useMemo(() => {
    if (timeRange === 'all') return historyData;
    const now = new Date();
    const daysToSubtract = timeRange === '30d' ? 30 : 90;
    const cutoffDate = new Date(now.setDate(now.getDate() - daysToSubtract));

    return historyData.filter(item => new Date(item.workout_date) >= cutoffDate);
  }, [historyData, timeRange]);

  // Calculate total volume lifetime/filtered
  const totalVolume = useMemo(() => {
    return filteredHistory.reduce((sum, item) => sum + (Number(item.total_volume) || 0), 0);
  }, [filteredHistory]);

  const selectedExercise = exercises.find(e => e.id === selectedExerciseId);

  return (
    <div className="pb-24 min-h-screen bg-slate-950 text-slate-100">
      {/* Top Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 pt-safe pb-4 sticky top-0 z-30 flex items-center gap-3">
        <button 
          onClick={onBack}
          className="p-2 bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            Analisi Performance
          </h1>
          <p className="text-xs text-slate-400">Progressione carichi e massimali 1RM</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Exercise Dropdown */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
            Seleziona Esercizio
          </label>
          <select
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-cyan-500 transition-colors"
          >
            {exercises.map(ex => (
              <option key={ex.id} value={ex.id}>
                {ex.name} ({ex.muscle_group})
              </option>
            ))}
          </select>
        </div>

        {/* Time Range Selector */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          {(['30d', '3m', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                timeRange === range
                  ? 'bg-cyan-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {range === '30d' ? '30 Giorni' : range === '3m' ? '3 Mesi' : 'Sempre'}
            </button>
          ))}
        </div>

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase">
              <Trophy className="w-3.5 h-3.5" /> 1RM Max
            </div>
            <div className="text-xl font-black text-white mt-1">
              {prData.max_1rm} <span className="text-xs text-slate-400 font-normal">kg</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 uppercase">
              <Weight className="w-3.5 h-3.5" /> Peso Max
            </div>
            <div className="text-xl font-black text-white mt-1">
              {prData.max_weight} <span className="text-xs text-slate-400 font-normal">kg</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase">
              <BarChart2 className="w-3.5 h-3.5" /> Volume Tot.
            </div>
            <div className="text-xl font-black text-white mt-1">
              {totalVolume > 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume} <span className="text-xs text-slate-400 font-normal">kg</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-500">Caricamento grafico...</div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-semibold">Nessun dato registrato</p>
            <p className="text-xs text-slate-500 mt-1">
              Completa sessioni di allenamento con {selectedExercise?.name || 'questo esercizio'} per visualizzare il grafico.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1RM Line Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Stima 1RM (Massimale Teorico)
              </h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis 
                      dataKey="workout_date" 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickFormatter={(val) => val.split('-').slice(1).join('/')}
                    />
                    <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                      formatter={(val: any) => [`${val} kg`, 'Massimale 1RM']}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="max_1rm" 
                      stroke="#06b6d4" 
                      strokeWidth={3} 
                      dot={{ fill: '#06b6d4', r: 4 }} 
                      activeDot={{ r: 6 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Volume Bar Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-400" />
                Volume Totale Sollevato (kg)
              </h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis 
                      dataKey="workout_date" 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickFormatter={(val) => val.split('-').slice(1).join('/')}
                    />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                      formatter={(val: any) => [`${val} kg`, 'Volume Totale']}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Bar 
                      dataKey="total_volume" 
                      fill="#10b981" 
                      radius={[6, 6, 0, 0]} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
