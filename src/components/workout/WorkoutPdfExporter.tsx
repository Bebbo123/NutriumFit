import React, { useState } from 'react';
import { X, FileText, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { workoutService } from '../../services/workoutService';
import { useAuth } from '../../context/AuthContext';

interface WorkoutPdfExporterProps {
  onClose: () => void;
}

export const WorkoutPdfExporter: React.FC<WorkoutPdfExporterProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [selectedMonths, setSelectedMonths] = useState<number>(3);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePdf = async () => {
    if (!user) return;
    setIsGenerating(true);

    try {
      // Fetch historical logs from Supabase
      const logs = await workoutService.fetchWorkoutHistoryLogs(user.id, selectedMonths);

      if (logs.length === 0) {
        alert('Nessun allenamento trovato nell\'intervallo selezionato.');
        setIsGenerating(false);
        return;
      }

      // Initialize jsPDF
      const doc = new jsPDF();
      const userEmail = user.email || 'utente@nutriumfit.app';
      const todayStr = new Date().toLocaleDateString('it-IT');

      // Title Header
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 40, 'F');

      doc.setTextColor(6, 182, 212); // cyan-400
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('NutriumFit', 14, 18);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text('Report Storico Allenamenti', 14, 28);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Utente: ${userEmail}`, 140, 18);
      doc.text(`Data Generazione: ${todayStr}`, 140, 24);
      doc.text(`Intervallo: ultimi ${selectedMonths} mes${selectedMonths === 1 ? 'e' : 'i'}`, 140, 30);

      // Executive Summary Stats
      let totalVolume = 0;
      let totalCalories = 0;
      let totalDuration = 0;

      logs.forEach(l => {
        totalVolume += Number(l.total_volume) || 0;
        totalCalories += l.calories_burned || 0;
        totalDuration += l.duration_seconds || 0;
      });

      const totalHours = Math.floor(totalDuration / 3600);
      const totalMins = Math.floor((totalDuration % 3600) / 60);

      let yPos = 50;
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(14, yPos, 182, 22, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Allenamenti Totali: ${logs.length}`, 20, yPos + 13);
      doc.text(`Volume Sollevato: ${totalVolume.toLocaleString('it-IT')} kg`, 70, yPos + 13);
      doc.text(`Durata: ${totalHours}h ${totalMins}m`, 145, yPos + 13);

      yPos += 32;

      // Workout Logs Detail Table
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Dettaglio Sessioni', 14, yPos);

      yPos += 8;

      logs.forEach((log, index) => {
        // Check page break
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }

        const dateFormatted = new Date(log.completed_at).toLocaleDateString('it-IT', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });

        // Workout Card Header
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(14, yPos, 182, 8, 'F');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`${index + 1}. ${log.title} (${dateFormatted})`, 16, yPos + 6);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Durata: ${Math.floor(log.duration_seconds / 60)} min | Volume: ${log.total_volume} kg | Calorie: ${log.calories_burned} kcal`, 105, yPos + 6);

        yPos += 12;

        // Group sets by exercise
        const setsByExercise: Record<string, any[]> = {};
        if (log.sets && log.sets.length > 0) {
          log.sets.forEach((s: any) => {
            const exName = s.exercise?.name || 'Esercizio';
            if (!setsByExercise[exName]) setsByExercise[exName] = [];
            setsByExercise[exName].push(s);
          });
        }

        const exNames = Object.keys(setsByExercise);
        if (exNames.length === 0) {
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text('Nessuna serie registrata.', 20, yPos);
          yPos += 6;
        } else {
          exNames.forEach(exName => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            const setsList = setsByExercise[exName]
              .filter(s => s.is_completed)
              .map(s => `${s.weight || 0}kg × ${s.reps || 0}`)
              .join(' | ');

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(51, 65, 85);
            doc.text(`• ${exName}:`, 20, yPos);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(setsList || 'Nessuna serie completata', 75, yPos);

            yPos += 6;
          });
        }

        yPos += 6; // Space between workouts
      });

      // Save PDF
      doc.save(`nutriumfit_report_allenamenti_${selectedMonths}mesi.pdf`);
      onClose();
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Errore durante la generazione del report PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Esporta Report PDF</h2>
            <p className="text-xs text-slate-400">Genera un report scaricabile degli allenamenti</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
              Seleziona Intervallo Temporale
            </label>
            <select
              value={selectedMonths}
              onChange={(e) => setSelectedMonths(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:border-cyan-500 transition-colors"
            >
              <option value={1}>Ultimo 1 Mese</option>
              <option value={2}>Ultimi 2 Mesi</option>
              <option value={3}>Ultimi 3 Mesi</option>
              <option value={4}>Ultimi 4 Mesi</option>
              <option value={5}>Ultimi 5 Mesi</option>
              <option value={6}>Ultimi 6 Mesi</option>
            </select>
          </div>

          <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800 text-xs text-slate-300 space-y-1.5">
            <div className="font-bold text-cyan-400">Contenuto del Report:</div>
            <div>• Riepilogo Esecutivo (Allenamenti Totali, Volume, Ore)</div>
            <div>• Storico dettagliato diviso per scheda e data</div>
            <div>• Dettaglio serie, peso e ripetizioni per ciascun esercizio</div>
          </div>
        </div>

        <button
          onClick={handleGeneratePdf}
          disabled={isGenerating}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold py-3.5 rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
        >
          <Download className="w-5 h-5" />
          {isGenerating ? 'Generazione in corso...' : 'Scarica Report PDF'}
        </button>
      </div>
    </div>
  );
};
