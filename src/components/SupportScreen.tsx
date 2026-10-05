import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { ChoirLogo } from './ChoirLogo';
import { MomoDonationSection } from './MomoDonationSection';
import { PaymentTransaction } from '../types';
import {
  HeartHandshake,
  Receipt,
  ShieldCheck,
  History,
  RotateCcw,
} from 'lucide-react';

export const SupportScreen: React.FC = () => {
  const { user } = useAuth();
  const { choirInfo } = useBranding();

  // Active view: 'donate' or 'history'
  const [activeTab, setActiveTab] = useState<'donate' | 'history'>('donate');

  // History state
  const [history, setHistory] = useState<PaymentTransaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Fetch donation history
  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const token = localStorage.getItem('lalumiere_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/donations/history', { headers });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('History load error:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  return (
    <div className="pb-28 space-y-5 max-w-xl mx-auto">
      {/* Top Banner & Ministry Message */}
      <div className="bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-blue-900/60 text-center relative overflow-hidden">
        <div className="relative z-10 max-w-md mx-auto space-y-2">
          <ChoirLogo size="md" variant="splash" className="mx-auto mb-1" />
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-3 py-0.5 rounded-full border border-amber-400/20">
            Rwanda Mobile Money Support
          </span>

          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-100 font-serif">
            Support {choirInfo.choir_name}
          </h1>

          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            Your generous donation empowers La Lumiere Choir to record new gospel songs, minister across Rwanda, upgrade musical instruments, and spread the Gospel of Jesus Christ.
          </p>

          <div className="pt-2 flex items-center justify-center gap-2 text-[10px] text-amber-300 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure Direct Rwanda Payment Gateway (MTN & Airtel)</span>
          </div>
        </div>
      </div>

      {/* Tabs: Donate vs History */}
      <div className="flex bg-slate-100 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('donate')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'donate'
              ? 'bg-white text-blue-950 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <HeartHandshake className="w-4 h-4 text-amber-600" />
          <span>Tanga Inkunga (Donate)</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-white text-blue-950 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4 text-blue-800" />
          <span>Inyemezabwishyu (Receipts & History)</span>
        </button>
      </div>

      {activeTab === 'donate' ? (
        <MomoDonationSection onSuccess={() => fetchHistory()} />
      ) : (
        /* DONATION RECEIPTS HISTORY TAB */
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 font-serif">
                Inyemezabwishyu n'Uruhererekane (Donation History)
              </h3>
              <p className="text-[11px] text-slate-500">
                Inyemezabwishyu zose za Mobile Money z'umurimo w'Imana
              </p>
            </div>
            <button
              onClick={fetchHistory}
              className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
              title="Refresh"
            >
              <RotateCcw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <div className="w-7 h-7 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Gufungura inyemezabwishyu...
            </div>
          ) : history.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">Nta nyemezabwishyu ziratangwa.</p>
              <button
                onClick={() => setActiveTab('donate')}
                className="text-xs font-bold text-blue-900 hover:underline cursor-pointer"
              >
                Tanga inkunga ya mbere
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {history.map(item => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/60 hover:bg-white transition-all space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          item.status === 'successful'
                            ? 'bg-emerald-500'
                            : item.status === 'failed' || item.status === 'cancelled' || item.status === 'expired'
                            ? 'bg-rose-500'
                            : 'bg-amber-500'
                        }`}
                      />
                      <span className="font-bold text-slate-900 font-mono">
                        {item.internal_reference}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md ${
                        item.status === 'successful'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'failed' || item.status === 'cancelled' || item.status === 'expired'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between font-mono">
                    <span className="font-extrabold text-blue-950 text-sm">
                      {item.amount.toLocaleString()} RWF
                    </span>
                    <span className="text-slate-500 uppercase text-[11px] font-semibold">
                      {item.provider_slug}
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>{item.donor_name}</span>
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>

                  {item.donation_purpose && (
                    <p className="text-[10px] text-slate-400 italic">
                      {item.donation_purpose}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
