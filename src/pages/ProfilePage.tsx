import React, { useState, useEffect } from 'react';
import { User, Crown, Smartphone, Download, LogOut, ChevronRight, Bell, AlertTriangle, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDiaryStore } from '../store/diaryStore';
import { jsPDF } from 'jspdf';

export const ProfilePage: React.FC = () => {
  const { user, signOut } = useAuth();
  const { logs, getTotalsForDate, weightLogs, waterIntakeMl, deferredPrompt, setDeferredPrompt } = useDiaryStore();

  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const [reminders, setReminders] = useState({
    breakfastEnabled: false,
    breakfastTime: '08:30',
    lunchEnabled: false,
    lunchTime: '13:00',
    dinnerEnabled: false,
    dinnerTime: '20:00',
    snacksEnabled: false,
    snacksTime: '16:30',
  });

  // Export states
  const [exportRange, setExportRange] = useState('7'); // '7', '30', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Load PWA reminders settings & notification permissions
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
    const saved = localStorage.getItem('nutriumfit-reminder-settings');
    if (saved) {
      try {
        setReminders(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Questo browser non supporta le notifiche push.');
      return;
    }
    const res = await Notification.requestPermission();
    setNotificationPermission(res);
    if (res === 'granted') {
      alert('Notifiche abilitate con successo!');
    }
  };

  const handleToggleReminder = (key: keyof typeof reminders) => {
    const updated = { ...reminders, [key]: !reminders[key] };
    setReminders(updated);
    localStorage.setItem('nutriumfit-reminder-settings', JSON.stringify(updated));
  };

  const handleTimeChange = (key: keyof typeof reminders, value: string) => {
    const updated = { ...reminders, [key]: value };
    setReminders(updated);
    localStorage.setItem('nutriumfit-reminder-settings', JSON.stringify(updated));
  };

  const handleSendTestNotification = () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification('NutriumFit Reminders', {
        body: 'Notifica configurata con successo! Ricordati di registrare i pasti oggi.',
      });
    } else {
      alert('Consenti prima le notifiche tramite il pulsante apposito.');
    }
  };

  const handleSignOut = async () => {
    if (window.confirm('Sei sicuro di voler uscire?')) {
      await signOut();
    }
  };

  // PWA Install prompt trigger
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // CSV Report Generator
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      let start = new Date();
      let end = new Date();

      if (exportRange === '7') {
        start.setDate(end.getDate() - 6);
      } else if (exportRange === '30') {
        start.setDate(end.getDate() - 29);
      } else {
        start = new Date(startDate);
        end = new Date(endDate);
      }

      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      let csvContent = 'Data,Pasto,Alimento,Calorie (kcal),Carboidrati (g),Grassi (g),Proteine (g)\n';

      const tempDate = new Date(start);
      while (tempDate <= end) {
        const dateStr = tempDate.toISOString().split('T')[0];
        const dayLogs = logs[dateStr] || [];

        if (dayLogs.length === 0) {
          csvContent += `${dateStr},-,Nessun alimento registrato,0,0,0,0\n`;
        } else {
          dayLogs.forEach((log) => {
            const escapedName = log.name.replace(/"/g, '""');
            csvContent += `${dateStr},${log.mealType},"${escapedName}",${log.calories},${log.macros.carbs},${log.macros.fat},${log.macros.protein}\n`;
          });
        }
        tempDate.setDate(tempDate.getDate() + 1);
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `NutriumFit_Report_${startStr}_a_${endStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("Errore durante l'esportazione del CSV.");
    } finally {
      setIsExporting(false);
    }
  };

  // jsPDF Report Generator (Styled Layout)
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      let start = new Date();
      let end = new Date();

      if (exportRange === '7') {
        start.setDate(end.getDate() - 6);
      } else if (exportRange === '30') {
        start.setDate(end.getDate() - 29);
      } else {
        start = new Date(startDate);
        end = new Date(endDate);
      }

      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      let totalCalories = 0;
      let totalCarbs = 0;
      let totalFat = 0;
      let totalProtein = 0;
      let daysCount = 0;
      let weightsList: number[] = [];

      const rows: any[] = [];
      const tempDate = new Date(start);
      while (tempDate <= end) {
        const dateStr = tempDate.toISOString().split('T')[0];
        const dayTotals = getTotalsForDate(dateStr);
        const dayWater = waterIntakeMl[dateStr] || 0;
        const dayWeightLog = weightLogs.find((w) => w.date === dateStr);
        const dayWeight = dayWeightLog ? dayWeightLog.weight : null;

        totalCalories += dayTotals.calories;
        totalCarbs += dayTotals.macros.carbs;
        totalFat += dayTotals.macros.fat;
        totalProtein += dayTotals.macros.protein;
        daysCount++;

        if (dayWeight) {
          weightsList.push(dayWeight);
        }

        rows.push({
          date: dateStr,
          calories: dayTotals.calories,
          carbs: Math.round(dayTotals.macros.carbs),
          fat: Math.round(dayTotals.macros.fat),
          protein: Math.round(dayTotals.macros.protein),
          water: dayWater,
          weight: dayWeight ? `${dayWeight} kg` : '-',
        });

        tempDate.setDate(tempDate.getDate() + 1);
      }

      const avgCalories = Math.round(totalCalories / daysCount);
      const avgCarbs = Math.round(totalCarbs / daysCount);
      const avgFat = Math.round(totalFat / daysCount);
      const avgProtein = Math.round(totalProtein / daysCount);
      const avgWeight = weightsList.length > 0
        ? (weightsList.reduce((s, w) => s + w, 0) / weightsList.length).toFixed(1)
        : null;

      // Initialize jsPDF document
      const doc = new jsPDF();

      // Top Banner
      doc.setFillColor(15, 23, 42); // slate-900 background
      doc.rect(0, 0, 210, 35, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('NutriumFit', 15, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(14, 165, 233); // Cyan
      doc.text('REPORT NUTRIZIONALE PREMIUM', 15, 26);

      // Period / Date header
      doc.setTextColor(255, 255, 255);
      doc.text(`Periodo: ${startStr} a ${endStr}`, 140, 18);
      doc.text(`Generato il: ${new Date().toLocaleDateString('it-IT')}`, 140, 24);

      // Riassunto Averages Section
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Averages Giornaliere del Periodo', 15, 50);

      doc.setDrawColor(226, 232, 240); // slate-200 line
      doc.line(15, 53, 195, 53);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Calorie Medie:', 15, 62);
      doc.setFont('helvetica', 'normal');
      doc.text(`${avgCalories} kcal / giorno`, 50, 62);

      doc.setFont('helvetica', 'bold');
      doc.text('Macronutrienti Medi:', 15, 70);
      doc.setFont('helvetica', 'normal');
      doc.text(`Carboidrati: ${avgCarbs}g  |  Grassi: ${avgFat}g  |  Proteine: ${avgProtein}g`, 50, 70);

      doc.setFont('helvetica', 'bold');
      doc.text('Peso Corporeo Medio:', 15, 78);
      doc.setFont('helvetica', 'normal');
      doc.text(avgWeight ? `${avgWeight} kg` : 'Nessun dato peso registrato nel periodo', 50, 78);

      // Dettaglio Giornaliero Table Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Dettaglio Giornaliero del Diario', 15, 95);
      doc.line(15, 98, 195, 98);

      // Column Headers
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // text slate-600
      doc.text('Data', 15, 105);
      doc.text('Calorie', 45, 105);
      doc.text('Carboidrati', 75, 105);
      doc.text('Grassi', 105, 105);
      doc.text('Proteine', 135, 105);
      doc.text('Acqua', 165, 105);
      doc.text('Peso', 188, 105);
      
      doc.line(15, 108, 195, 108);

      let yOffset = 114;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);

      rows.forEach((row) => {
        // Page break checker
        if (yOffset > 275) {
          doc.addPage();
          yOffset = 20;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(71, 85, 105);
          doc.text('Data', 15, yOffset);
          doc.text('Calorie', 45, yOffset);
          doc.text('Carboidrati', 75, yOffset);
          doc.text('Grassi', 105, yOffset);
          doc.text('Proteine', 135, yOffset);
          doc.text('Acqua', 165, yOffset);
          doc.text('Peso', 188, yOffset);
          doc.line(15, yOffset + 3, 195, yOffset + 3);
          yOffset += 9;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(15, 23, 42);
        }

        doc.text(row.date, 15, yOffset);
        doc.text(`${row.calories} kcal`, 45, yOffset);
        doc.text(`${row.carbs}g`, 75, yOffset);
        doc.text(`${row.fat}g`, 105, yOffset);
        doc.text(`${row.protein}g`, 135, yOffset);
        doc.text(`${row.water} ml`, 165, yOffset);
        doc.text(row.weight, 188, yOffset);

        yOffset += 7;
      });

      // Simple footer
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('Report generato da NutriumFit PWA - Il tuo compagno di salute.', 15, 287);

      doc.save(`NutriumFit_Report_${startStr}_a_${endStr}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Errore durante l\'esportazione del PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const userDisplayName = user?.email ? user.email.split('@')[0] : 'Utente NutriumFit';
  const userDisplayEmail = user?.email || 'utente@nutriumfit.app';

  return (
    <div className="pb-24 pt-safe px-4 max-w-md mx-auto font-sans">
      {/* Profile Header */}
      <div className="bg-gradient-to-tr from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 mb-5 text-center shadow-lg relative overflow-hidden">
        <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
          <Crown className="w-3 h-3 fill-slate-950" /> Premium
        </div>

        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 p-1 mx-auto mb-3 shadow-xl shadow-cyan-500/20">
          <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-cyan-400">
            <User className="w-9 h-9" />
          </div>
        </div>

        <h2 className="text-lg font-black text-white capitalize">{userDisplayName}</h2>
        <p className="text-xs text-slate-400 font-mono">{userDisplayEmail}</p>
      </div>

      {/* PWA Home Install Prompt */}
      {deferredPrompt && (
        <div className="mb-5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl p-4 shadow-lg text-slate-950 flex flex-col gap-2.5 animate-in slide-in-from-top duration-300">
          <div className="flex items-start gap-2.5">
            <Smartphone className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider">Aggiungi a Schermata Home</h4>
              <p className="text-xs font-semibold opacity-90 leading-relaxed">
                Installa NutriumFit sul tuo dispositivo per accedervi rapidamente e utilizzarlo a schermo intero offline.
              </p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="w-full py-2.5 bg-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-slate-900 transition-all cursor-pointer"
          >
            Installa Ora
          </button>
        </div>
      )}

      {/* Export Options Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 mb-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Download className="w-4 h-4 text-cyan-400" /> Esporta Dati Diario
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Seleziona Intervallo
            </label>
            <select
              value={exportRange}
              onChange={(e) => setExportRange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 px-4 text-xs font-semibold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="7">Ultimi 7 Giorni</option>
              <option value="30">Ultimi 30 Giorni</option>
              <option value="custom">Intervallo Personalizzato</option>
            </select>
          </div>

          {exportRange === 'custom' && (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Data Inizio
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-2 px-3 text-xs font-semibold text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Data Fine
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-2 px-3 text-xs font-semibold text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleExportCSV}
              disabled={isExporting || (exportRange === 'custom' && (!startDate || !endDate))}
              className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-2xl border border-slate-750 transition-colors cursor-pointer disabled:opacity-40"
            >
              {isExporting ? 'Generazione...' : 'Esporta CSV'}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isExporting || (exportRange === 'custom' && (!startDate || !endDate))}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-slate-950 font-bold text-xs rounded-2xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-40"
            >
              {isExporting ? 'Generazione...' : 'Esporta PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Settings Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 mb-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Bell className="w-4 h-4 text-cyan-400" /> Promemoria Notifiche PWA
        </h3>

        {notificationPermission !== 'granted' ? (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-amber-955/20 border border-amber-800/40 text-amber-300 text-xs flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                Le notifiche sono attualmente <strong>disattivate</strong>.
                Consenti i permessi per abilitare i promemoria diari.
              </div>
            </div>
            <button
              onClick={handleRequestPermission}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 text-xs font-bold transition-all cursor-pointer"
            >
              Consenti Notifiche
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <div>Le notifiche locali sono abilitate sul dispositivo.</div>
            </div>

            <div className="space-y-2.5">
              {/* Breakfast */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={reminders.breakfastEnabled}
                    onChange={() => handleToggleReminder('breakfastEnabled')}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-200">Colazione</span>
                </div>
                <input
                  type="time"
                  disabled={!reminders.breakfastEnabled}
                  value={reminders.breakfastTime}
                  onChange={(e) => handleTimeChange('breakfastTime', e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-xs font-bold text-cyan-400 font-mono disabled:opacity-40"
                />
              </div>

              {/* Lunch */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={reminders.lunchEnabled}
                    onChange={() => handleToggleReminder('lunchEnabled')}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-200">Pranzo</span>
                </div>
                <input
                  type="time"
                  disabled={!reminders.lunchEnabled}
                  value={reminders.lunchTime}
                  onChange={(e) => handleTimeChange('lunchTime', e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-xs font-bold text-cyan-400 font-mono disabled:opacity-40"
                />
              </div>

              {/* Dinner */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={reminders.dinnerEnabled}
                    onChange={() => handleToggleReminder('dinnerEnabled')}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-200">Cena</span>
                </div>
                <input
                  type="time"
                  disabled={!reminders.dinnerEnabled}
                  value={reminders.dinnerTime}
                  onChange={(e) => handleTimeChange('dinnerTime', e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-xs font-bold text-cyan-400 font-mono disabled:opacity-40"
                />
              </div>

              {/* Snacks */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={reminders.snacksEnabled}
                    onChange={() => handleToggleReminder('snacksEnabled')}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-200">Spuntini</span>
                </div>
                <input
                  type="time"
                  disabled={!reminders.snacksEnabled}
                  value={reminders.snacksTime}
                  onChange={(e) => handleTimeChange('snacksTime', e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-xs font-bold text-cyan-400 font-mono disabled:opacity-40"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendTestNotification}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-350 text-xs font-bold rounded-xl border border-slate-750 cursor-pointer"
            >
              Invia Notifica di Test
            </button>
          </div>
        )}
      </div>

      {/* Settings Options List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-2 space-y-1 mb-5">
        <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/60 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 text-cyan-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Cache Offline PWA</h4>
              <p className="text-[11px] text-slate-400">Service Worker Attivo</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/50">
            Installato
          </span>
        </div>

        <div
          onClick={handleSignOut}
          className="flex items-center justify-between p-3 rounded-2xl hover:bg-red-950/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 text-red-400 group-hover:bg-red-900/40">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200 group-hover:text-red-300">Esci (Disconnetti)</h4>
              <p className="text-[11px] text-slate-400">Scollegati dal tuo account</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
