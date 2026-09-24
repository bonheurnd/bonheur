import React, { useState, useEffect } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getAllOfflineSongs, downloadAllSongsForOffline } from '../services/offlineStorage';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineIndicator: React.FC<{
  onOpenOfflineSongs?: () => void;
}> = ({ onOpenOfflineSongs }) => {
  const isOnline = useOnlineStatus();
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; title: string } | null>(null);

  useEffect(() => {
    getAllOfflineSongs().then(songs => setOfflineCount(songs.length));
  }, []);

  const handleDownloadAll = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const count = await downloadAllSongsForOffline((curr, total, title) => {
        setSyncProgress({ current: curr, total, title });
      });
      setOfflineCount(count);
    } catch (err) {
      console.error('Failed to download songs for offline:', err);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  if (isOnline) {
    if (isSyncing && syncProgress) {
      return (
        <div className="fixed bottom-16 sm:bottom-4 left-4 right-4 sm:right-auto z-50 bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl border border-slate-700 max-w-sm animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-100 truncate">
                Guhunika indirimbo kuri telefoni...
              </p>
              <p className="text-[10px] text-amber-300 truncate mt-0.5">
                {syncProgress.current}/{syncProgress.total}: {syncProgress.title}
              </p>
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-amber-400 h-1.5 rounded-full transition-all duration-150"
              style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
            />
          </div>
        </div>
      );
    }
    return null;
  }

  // When device is OFFLINE
  return (
    <div className="fixed bottom-16 sm:bottom-4 left-3 right-3 sm:left-4 sm:right-auto z-50 bg-amber-500 text-slate-950 px-4 py-2.5 rounded-2xl shadow-2xl border border-amber-600 flex items-center justify-between gap-3 max-w-md animate-in slide-in-from-bottom duration-200">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0">
          <WifiOff className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-extrabold tracking-tight">
            Nta murongo wa Interineti (Offline Mode)
          </p>
          <p className="text-[11px] text-slate-900 font-medium truncate">
            {offlineCount > 0
              ? `Ufite indirimbo ${offlineCount} zabitswe kuri telefoni yawe.`
              : 'Gukoresha indirimbo zabanje gufungurwa cyangwa kubikwa.'}
          </p>
        </div>
      </div>

      {onOpenOfflineSongs && offlineCount > 0 && (
        <button
          onClick={onOpenOfflineSongs}
          className="px-2.5 py-1.5 bg-slate-950 text-amber-300 hover:bg-slate-900 rounded-xl text-[11px] font-bold shrink-0 transition-transform active:scale-95 shadow-xs"
        >
          Fungura
        </button>
      )}
    </div>
  );
};
