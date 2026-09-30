import React, { useState, useEffect } from 'react';
import {
  Activity,
  Shield,
  Clock,
  RefreshCw,
  Music,
  LogIn,
  KeyRound,
  Heart,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { ActivityLog } from '../../types';
import { safeFetchJson } from '../../utils/api';

export const AdminMemberActivityLog: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const token = localStorage.getItem('lalumiere_token');
      const res = await safeFetchJson<ActivityLog[]>('/api/admin/member-activity-logs?limit=10', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok && res.data) {
        setLogs(res.data);
      } else {
        throw new Error(res.errorMessage || 'Failed to fetch member activity logs');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Habaye ikosa mu gushaka ibikorwa biheruka');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionIcon = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('LOGIN')) return <LogIn className="w-3.5 h-3.5 text-blue-700" />;
    if (act.includes('SONG') || act.includes('LYRIC')) return <Music className="w-3.5 h-3.5 text-indigo-700" />;
    if (act.includes('PASSWORD') || act.includes('RESET')) return <KeyRound className="w-3.5 h-3.5 text-amber-600" />;
    if (act.includes('DONAT')) return <Heart className="w-3.5 h-3.5 text-rose-600" />;
    if (act.includes('ROLE') || act.includes('USER')) return <UserCheck className="w-3.5 h-3.5 text-emerald-600" />;
    return <Activity className="w-3.5 h-3.5 text-slate-600" />;
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 font-serif flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-900" />
            <span>Ibikorwa 10 Biheruka by'Abakoresha (Last 10 User Actions)</span>
          </h3>
          <p className="text-[11px] text-slate-500">
            Kwinjira (Logins), kureba indirimbo (Song access), guhindura amagambobanga n'ibindi bikorwa by'abanyamuryango
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Vugurura (Refresh)</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center space-y-2">
          <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Gufungura ibikorwa biheruka...</p>
        </div>
      ) : errorMessage ? (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          Nta bikorwa by'abakoresha biremezwa muri sisitemu
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {logs.map(log => (
            <div key={log.id} className="py-2.5 flex items-start justify-between gap-3 text-xs hover:bg-slate-50/60 px-2 rounded-xl transition-colors">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  {getActionIcon(log.action)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    <span className="font-extrabold text-blue-950">{log.user_name || 'Umukoresha'}</span>{' '}
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold ml-1">
                      {log.action}
                    </span>
                  </p>
                  {log.details && (
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug line-clamp-2">
                      {log.details}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono text-slate-400">
                  {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <p className="text-[9px] text-slate-400">
                  {new Date(log.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
