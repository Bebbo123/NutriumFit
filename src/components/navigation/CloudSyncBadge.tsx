import React from 'react';
import { Cloud, CloudOff, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDiaryStore } from '../../store/diaryStore';

interface CloudSyncBadgeProps {
  className?: string;
  showTextOnMobile?: boolean;
}

export const CloudSyncBadge: React.FC<CloudSyncBadgeProps> = ({
  className = '',
  showTextOnMobile = false,
}) => {
  const { user, loading } = useAuth();
  const { isOffline, syncStatus, forceCloudSync } = useDiaryStore();

  const handleBadgeClick = () => {
    if (user && !isOffline && syncStatus !== 'syncing') {
      console.log('[CloudSyncBadge] User clicked badge to trigger manual cloud resync...');
      forceCloudSync(user.id);
    }
  };

  const isSyncing = syncStatus === 'syncing' || loading;
  const isError = syncStatus === 'error' || isOffline;
  const isSynced = !!user && !isOffline && !isSyncing && !isError;

  let badgeColorStyle = 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400 shadow-emerald-500/10';
  let badgeTitle = `Sincronizzato con il Cloud (${user?.email})`;

  if (!user) {
    badgeColorStyle = 'bg-amber-950/70 border-amber-500/40 text-amber-400 shadow-amber-500/10';
    badgeTitle = 'Modalità Locale (Effettua il Login per Sincronizzare)';
  } else if (isOffline) {
    badgeColorStyle = 'bg-amber-950/70 border-amber-500/40 text-amber-400 shadow-amber-500/10';
    badgeTitle = 'Modalità Offline (Dati salvati in locale - Tocca per riprovare)';
  } else if (isSyncing) {
    badgeColorStyle = 'bg-cyan-950/70 border-cyan-500/40 text-cyan-400 shadow-cyan-500/10';
    badgeTitle = 'Sincronizzazione in corso...';
  } else if (isError) {
    badgeColorStyle = 'bg-rose-950/70 border-rose-500/40 text-rose-400 shadow-rose-500/10';
    badgeTitle = 'Errore di sincronizzazione (Tocca per Riprovare)';
  }

  return (
    <button
      onClick={handleBadgeClick}
      type="button"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-300 backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95 select-none ${badgeColorStyle} ${className}`}
      title={badgeTitle}
    >
      {isSyncing ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-spin" />
          <span className={`${showTextOnMobile ? 'inline' : 'hidden sm:inline'} font-mono tracking-tight`}>
            Sincronizzazione...
          </span>
        </>
      ) : isSynced ? (
        <>
          <Cloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className={`${showTextOnMobile ? 'inline' : 'hidden sm:inline'} font-mono tracking-tight`}>
            Sincronizzato con il Cloud
          </span>
          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 hidden sm:inline" />
        </>
      ) : isError ? (
        <>
          <CloudOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className={`${showTextOnMobile ? 'inline' : 'hidden sm:inline'} font-mono tracking-tight`}>
            Modalità Locale (Riprova)
          </span>
          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 hidden sm:inline" />
        </>
      ) : (
        <>
          <CloudOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className={`${showTextOnMobile ? 'inline' : 'hidden sm:inline'} font-mono tracking-tight`}>
            Modalità Locale
          </span>
        </>
      )}
    </button>
  );
};

export default CloudSyncBadge;
