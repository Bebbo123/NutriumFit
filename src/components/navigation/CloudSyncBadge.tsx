import React from 'react';
import { Cloud, CloudOff, CheckCircle2, AlertTriangle } from 'lucide-react';
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
  const { isOffline } = useDiaryStore();

  const isCloudActive = !!user && !isOffline && !loading;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-300 backdrop-blur-md ${
        isCloudActive
          ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/10'
          : 'bg-amber-950/60 border-amber-500/30 text-amber-400 shadow-sm shadow-amber-500/10'
      } ${className}`}
      title={
        isCloudActive
          ? `Sincronizzato con il Cloud (${user?.email})`
          : 'Modalità Locale (Effettua il Login per Sincronizzare)'
      }
    >
      {isCloudActive ? (
        <>
          <Cloud className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
          <span className={`${showTextOnMobile ? 'inline' : 'hidden sm:inline'} font-mono tracking-tight`}>
            Sincronizzato con il Cloud
          </span>
          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 hidden sm:inline" />
        </>
      ) : (
        <>
          <CloudOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className={`${showTextOnMobile ? 'inline' : 'hidden sm:inline'} font-mono tracking-tight`}>
            Modalità Locale (Effettua il Login per Sincronizzare)
          </span>
          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 hidden sm:inline" />
        </>
      )}
    </div>
  );
};

export default CloudSyncBadge;
