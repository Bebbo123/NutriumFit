import React, { useState, useEffect } from 'react';
import { Bell, Clock, Dumbbell, Utensils, Check, Save } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import type { NotificationSettingsData } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';

export const NotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(true);
  const [breakfastTime, setBreakfastTime] = useState('08:30');
  const [lunchTime, setLunchTime] = useState('13:00');
  const [dinnerTime, setDinnerTime] = useState('20:00');
  const [workoutReminder, setWorkoutReminder] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  useEffect(() => {
    setPermissionStatus(notificationService.getPermissionStatus());

    if (user) {
      const loadSettings = async () => {
        setIsLoading(true);
        const data = await notificationService.fetchSettings(user.id);
        if (data) {
          setEnabled(data.enabled);
          if (data.breakfast_time) setBreakfastTime(data.breakfast_time.substring(0, 5));
          if (data.lunch_time) setLunchTime(data.lunch_time.substring(0, 5));
          if (data.dinner_time) setDinnerTime(data.dinner_time.substring(0, 5));
          if (data.workout_reminder_enabled !== undefined) setWorkoutReminder(data.workout_reminder_enabled);
        }
        setIsLoading(false);
      };
      loadSettings();
    }
  }, [user]);

  const handleToggleEnable = async (newVal: boolean) => {
    setEnabled(newVal);
    if (newVal && permissionStatus !== 'granted') {
      const granted = await notificationService.requestPermission();
      setPermissionStatus(notificationService.getPermissionStatus());
      if (granted && user) {
        await notificationService.registerPushSubscription(user.id);
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      if (enabled && permissionStatus !== 'granted') {
        const granted = await notificationService.requestPermission();
        setPermissionStatus(notificationService.getPermissionStatus());
        if (granted) {
          await notificationService.registerPushSubscription(user.id);
        }
      }

      const settingsData: Partial<NotificationSettingsData> = {
        enabled,
        breakfast_time: breakfastTime,
        lunch_time: lunchTime,
        dinner_time: dinnerTime,
        workout_reminder_enabled: workoutReminder
      };

      const ok = await notificationService.saveSettings(user.id, settingsData);
      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert('Errore durante il salvataggio delle notifiche.');
      }
    } catch (e) {
      console.error('Save settings error:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5 shadow-lg">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Notifiche e Promemoria</h3>
            <p className="text-xs text-slate-400">Pianifica i tuoi promemoria giornalieri</p>
          </div>
        </div>

        {/* Master Switch */}
        <button
          onClick={() => handleToggleEnable(!enabled)}
          className={`w-12 h-6 rounded-full p-1 transition-colors relative cursor-pointer ${
            enabled ? 'bg-cyan-500' : 'bg-slate-800'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {isLoading ? (
        <div className="text-xs text-slate-500 text-center py-4">Caricamento impostazioni...</div>
      ) : (
        <div className={`space-y-4 transition-opacity ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          {/* Meal Reminders */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Utensils className="w-3.5 h-3.5 text-cyan-400" /> Promemoria Pasti
            </div>

            {/* Breakfast */}
            <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
              <span className="text-xs font-semibold text-slate-200">Colazione</span>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <input
                  type="time"
                  value={breakfastTime}
                  onChange={(e) => setBreakfastTime(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-white outline-none"
                />
              </div>
            </div>

            {/* Lunch */}
            <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
              <span className="text-xs font-semibold text-slate-200">Pranzo</span>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <input
                  type="time"
                  value={lunchTime}
                  onChange={(e) => setLunchTime(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-white outline-none"
                />
              </div>
            </div>

            {/* Dinner */}
            <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
              <span className="text-xs font-semibold text-slate-200">Cena</span>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <input
                  type="time"
                  value={dinnerTime}
                  onChange={(e) => setDinnerTime(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Workout Reminder */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-200">Promemoria Workout</span>
              </div>
              <button
                onClick={() => setWorkoutReminder(!workoutReminder)}
                className={`w-10 h-5 rounded-full p-0.5 transition-colors relative cursor-pointer ${
                  workoutReminder ? 'bg-cyan-500' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    workoutReminder ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
              saveSuccess 
                ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
            }`}
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" /> Impostazioni Salvate!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> {isSaving ? 'Salvataggio...' : 'Salva Promemoria'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
