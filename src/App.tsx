import { useState, useEffect } from 'react';
import { BottomNav } from './components/navigation/BottomNav';
import type { NavTab } from './components/navigation/BottomNav';
import { HomePage } from './pages/HomePage';
import { DiaryPage } from './pages/DiaryPage';
import { AddFoodPage } from './pages/AddFoodPage';
import { GoalsPage } from './pages/GoalsPage';
import { ProfilePage } from './pages/ProfilePage';
import { WorkoutPage } from './pages/WorkoutPage';
import { LiveWorkoutModal } from './components/workout/LiveWorkoutModal';
import { RestTimerOverlay } from './components/workout/RestTimerOverlay';
import type { MealType } from './types/diary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { useDiaryStore } from './store/diaryStore';
import { Sparkles } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const { user, loading } = useAuth();
  const {
    selectedDate,
    fetchGoals,
    fetchLogsForDate,
    setIsOffline,
    syncOfflineQueue,
    setDeferredPrompt
  } = useDiaryStore();
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [targetMealType, setTargetMealType] = useState<MealType>('Colazione');

  // Trigger data sync on user auth or date changes
  useEffect(() => {
    if (user) {
      fetchGoals(user.id);
      fetchLogsForDate(user.id, selectedDate);
    }
  }, [user, selectedDate, fetchGoals, fetchLogsForDate]);

  // Online/offline status monitoring & sync trigger
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (user) {
        syncOfflineQueue().then(() => {
          // Re-fetch database resources after sync
          fetchGoals(user.id);
          fetchLogsForDate(user.id, selectedDate);
        });
      }
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOffline(!navigator.onLine);
    if (navigator.onLine && user) {
      syncOfflineQueue().then(() => {
        fetchGoals(user.id);
        fetchLogsForDate(user.id, selectedDate);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, selectedDate, setIsOffline, syncOfflineQueue, fetchGoals, fetchLogsForDate]);

  // Capture PWA deferred prompt
  useEffect(() => {
    const handleInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, [setDeferredPrompt]);

  // PWA push reminders loop checker
  useEffect(() => {
    if (!user || !('Notification' in window) || Notification.permission !== 'granted') return;

    // Track triggered events by date to prevent duplicate firing in the same minute
    const triggeredReminders: Record<string, string> = {};

    const checkReminders = () => {
      const saved = localStorage.getItem('nutriumfit-reminder-settings');
      if (!saved) return;

      try {
        const settings = JSON.parse(saved);
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        const currentHours = now.getHours().toString().padStart(2, '0');
        const currentMinutes = now.getMinutes().toString().padStart(2, '0');
        const currentTimeStr = `${currentHours}:${currentMinutes}`;

        const reminderRules = [
          {
            key: 'breakfast',
            enabled: settings.breakfastEnabled,
            time: settings.breakfastTime,
            title: 'Registra la Colazione! 🍳',
            body: 'Inserisci subito la tua colazione su NutriumFit per calcolare i tuoi macro giornalieri.',
          },
          {
            key: 'lunch',
            enabled: settings.lunchEnabled,
            time: settings.lunchTime,
            title: 'Registra il Pranzo! 🥗',
            body: 'Non dimenticare di aggiungere il tuo pranzo su NutriumFit!',
          },
          {
            key: 'dinner',
            enabled: settings.dinnerEnabled,
            time: settings.dinnerTime,
            title: 'Registra la Cena! 🍲',
            body: 'È ora di inserire la tua cena su NutriumFit e verificare i tuoi obiettivi.',
          },
          {
            key: 'snacks',
            enabled: settings.snacksEnabled,
            time: settings.snacksTime,
            title: 'Registra i tuoi Spuntini! 🍎',
            body: 'Ricordati di loggare gli spuntini nel tuo diario alimentare.',
          },
        ];

        reminderRules.forEach((rule) => {
          if (rule.enabled && rule.time === currentTimeStr) {
            if (triggeredReminders[rule.key] !== todayStr) {
              triggeredReminders[rule.key] = todayStr;
              new Notification(rule.title, {
                body: rule.body,
              });
            }
          }
        });
      } catch (e) {
        console.error('Error checking PWA reminders:', e);
      }
    };

    checkReminders();
    const intervalId = setInterval(checkReminders, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, [user]);

  const handleOpenAddFood = (mealType?: MealType) => {
    if (mealType) {
      setTargetMealType(mealType);
    }
    setActiveTab('add');
  };

  // Loading spinner during session checks
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-4 border border-cyan-400/20 animate-pulse">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs text-slate-400 font-medium tracking-wider uppercase">Caricamento...</p>
      </div>
    );
  }

  // Not logged in -> Auth Form
  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-white">
      {/* View Container */}
      <main className="min-h-screen">
        {activeTab === 'home' && (
          <HomePage onNavigateToAddFood={() => handleOpenAddFood('Colazione')} />
        )}

        {activeTab === 'diary' && (
          <DiaryPage onNavigateToAddFood={(meal) => handleOpenAddFood(meal)} />
        )}

        {activeTab === 'add' && (
          <AddFoodPage
            initialMealType={targetMealType}
            onBack={() => setActiveTab('diary')}
            onFoodAdded={() => setActiveTab('diary')}
          />
        )}

        {activeTab === 'goals' && <GoalsPage />}

        {activeTab === 'workout' && <WorkoutPage />}

        {activeTab === 'profile' && <ProfilePage />}
      </main>

      {/* Persistent Bottom Navigation */}
      {activeTab !== 'add' && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onQuickAddClick={() => handleOpenAddFood('Colazione')}
        />
      )}

      {/* Global Workout Overlays */}
      <LiveWorkoutModal />
      <RestTimerOverlay />
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
