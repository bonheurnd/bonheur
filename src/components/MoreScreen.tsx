import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { ChoirLogo } from './ChoirLogo';
import { PWAInstallButton } from './PWAInstallButton';
import { ContactSection } from './ContactSection';
import {
  getAllOfflineSongs,
  downloadAllSongsForOffline,
  clearOfflineStorage,
} from '../services/offlineStorage';
import {
  User,
  Info,
  Shield,
  Smartphone,
  HeartHandshake,
  ChevronRight,
  Download,
  Trash2,
  CheckCircle2,
  RefreshCw,
  HardDrive,
} from 'lucide-react';

interface MoreScreenProps {
  onNavigateToTab: (tab: string) => void;
  onOpenStoreModal: () => void;
  onOpenAuth: () => void;
}

export const MoreScreen: React.FC<MoreScreenProps> = ({
  onNavigateToTab,
  onOpenStoreModal,
  onOpenAuth,
}) => {
  const { user, isAdmin } = useAuth();
  const { choirInfo } = useBranding();

  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number; title: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const refreshOfflineCount = async () => {
    try {
      const list = await getAllOfflineSongs();
      setOfflineCount(list.length);
    } catch (e) {
      console.warn('Error reading offline songs:', e);
    }
  };

  useEffect(() => {
    refreshOfflineCount();
  }, []);

  const handleDownloadAll = async () => {
    if (isDownloadingAll) return;
    setIsDownloadingAll(true);
    setDownloadProgress({ current: 0, total: 92, title: 'Gutangira...' });

    try {
      const count = await downloadAllSongsForOffline((curr, total, title) => {
        setDownloadProgress({ current: curr, total, title });
      });
      await refreshOfflineCount();
      setToastMessage(`Indirimbo ${count} zose zateguwe neza offline!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Failed to download all songs:', err);
      alert('Habaye ikibazo mu kubika indirimbo.');
    } finally {
      setIsDownloadingAll(false);
      setDownloadProgress(null);
    }
  };

  const handleClearOffline = async () => {
    if (!confirm('Urabyemeza ko ushaka gusiba indirimbo zose zabitswe offline kuri iki gikoresho?')) {
      return;
    }
    try {
      await clearOfflineStorage();
      await refreshOfflineCount();
      setToastMessage('Ububiko bwa offline bwasibwe neza.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Failed to clear offline storage:', err);
    }
  };

  return (
    <div className="pb-28 space-y-5 max-w-xl mx-auto">
      {/* Header Info */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
        <ChoirLogo size="md" />
        <div className="min-w-0">
          <h2 className="font-extrabold text-base text-slate-900 font-serif truncate">
            {choirInfo.choir_name}
          </h2>
          <p className="text-xs text-slate-500 truncate">
            {choirInfo.affiliation}
          </p>
          <span className="text-[10px] font-mono font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md inline-block mt-1">
            v1.0.0 Production Release
          </span>
        </div>
      </div>

      {/* Offline Storage & PWA Management Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 font-serif">
                Kubika Offline (Offline Hymnbook)
              </h3>
              <p className="text-[11px] text-slate-500">
                Koresha indirimbo zose nta murongo wa interineti
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full border border-amber-200">
            {offlineCount} / 92
          </span>
        </div>

        {/* Toast / Feedback */}
        {toastMessage && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Progress Bar when downloading all */}
        {isDownloadingAll && downloadProgress && (
          <div className="bg-slate-900 text-white p-3 rounded-2xl space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-300 font-bold flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Guhunika indirimbo...
              </span>
              <span className="font-mono text-slate-300">
                {downloadProgress.current} / {downloadProgress.total}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {downloadProgress.title}
            </p>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-400 h-1.5 rounded-full transition-all duration-150"
                style={{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
          <button
            onClick={handleDownloadAll}
            disabled={isDownloadingAll}
            className="w-full sm:flex-1 py-2.5 px-3 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-xs"
          >
            {isDownloadingAll ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>
              {offlineCount >= 92 ? 'Vugurura Indirimbo Zose (92)' : 'Bika Indirimbo Zose Offline'}
            </span>
          </button>

          {offlineCount > 0 && (
            <button
              onClick={handleClearOffline}
              disabled={isDownloadingAll}
              className="w-full sm:w-auto py-2.5 px-3 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              title="Siba indirimbo zabitswe offline"
            >
              <Trash2 className="w-4 h-4" />
              <span>Siba Ububiko</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Options Menu */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden text-xs">
        {/* User Account */}
        <button
          onClick={() => {
            if (user) onNavigateToTab('profile');
            else onOpenAuth();
          }}
          className="w-full p-4 hover:bg-slate-50 flex items-center justify-between transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-950 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block">
                {user ? user.name : 'Konti yawe (User Account)'}
              </span>
              <span className="text-[11px] text-slate-500">
                {user ? user.email : 'Injira cyangwa iyandikishe muri Korali'}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Admin Dashboard if Admin */}
        {isAdmin && (
          <button
            onClick={() => onNavigateToTab('admin')}
            className="w-full p-4 bg-amber-50/50 hover:bg-amber-100/50 flex items-center justify-between transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-amber-950 block">
                  Ubuyobozi bwa Korali (Admin Dashboard)
                </span>
                <span className="text-[11px] text-amber-800">
                  Gucunga indirimbo, ibirango na logo, imisanzu ya MoMo
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-700" />
          </button>
        )}

        {/* About La Lumiere Choir */}
        <button
          onClick={() => onNavigateToTab('about')}
          className="w-full p-4 hover:bg-slate-50 flex items-center justify-between transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block">
                Amateka n'Intego (About La Lumiere)
              </span>
              <span className="text-[11px] text-slate-500">
                ADEPR Nyanza, Kicukiro • Amateka, Intego n'Icyerekezo
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Support Choir */}
        <button
          onClick={() => onNavigateToTab('support')}
          className="w-full p-4 hover:bg-slate-50 flex items-center justify-between transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block">
                Tanga Inkunga (Support Choir)
              </span>
              <span className="text-[11px] text-slate-500">
                MTN Mobile Money na Airtel Money mu Rwanda
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* App Store & Play Store Docs */}
        <button
          onClick={onOpenStoreModal}
          className="w-full p-4 hover:bg-slate-50 flex items-center justify-between transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-900 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block">
                Store Submission & Compliance
              </span>
              <span className="text-[11px] text-slate-500">
                Google Play & Apple App Store readiness & Privacy Policy
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Contact Choir Leadership Section */}
      <ContactSection />

      {/* Admin Portal Gateway Link */}
      <div className="pt-1 pb-4 text-center">
        <button
          onClick={() => onNavigateToTab('admin')}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-blue-950 transition-colors py-1.5 px-3 rounded-xl hover:bg-slate-100 cursor-pointer"
        >
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <span>Ubuyobozi bwa Korali (Admin Portal)</span>
        </button>
      </div>
    </div>
  );
};
