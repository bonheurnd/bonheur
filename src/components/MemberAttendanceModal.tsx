import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../utils/api';
import { AttendanceStatus } from '../types';
import {
  Calendar,
  CheckCircle2,
  Clock,
  X,
  UserCheck,
  AlertCircle,
  HelpCircle,
  Info,
  Sparkles,
} from 'lucide-react';

interface MemberAttendanceModalProps {
  onClose: () => void;
}

interface MemberAttendanceData {
  summary: {
    total_recorded: number;
    present: number;
    late: number;
    excused: number;
    absent: number;
    percentage: number;
  };
  history: Array<{
    session_id: string;
    title: string;
    activity_type: string;
    session_date: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    event_title?: string;
    status: AttendanceStatus;
    notes?: string;
    marked_at: string;
  }>;
}

export const MemberAttendanceModal: React.FC<MemberAttendanceModalProps> = ({ onClose }) => {
  const [data, setData] = useState<MemberAttendanceData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMyAttendance = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('lalumiere_token');
        const res = await safeFetchJson<MemberAttendanceData>('/api/attendance/my-history', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok && res.data) {
          setData(res.data);
        } else {
          setError(res.error || 'Habaye ikibazo mu gushaka amateka y\'ubwitabire');
        }
      } catch (err: any) {
        setError(err.message || 'Network error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyAttendance();
  }, []);

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return {
          label: 'Yitabiriye (Present)',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: '✓',
        };
      case 'late':
        return {
          label: 'Yakerewe (Late)',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: '⏱',
        };
      case 'excused':
        return {
          label: 'Ntiyabonetse n\'Impamvu (Excused)',
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: 'ℹ',
        };
      case 'absent':
        return {
          label: 'Ntiyitabiriye (Absent)',
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          icon: '✗',
        };
      default:
        return {
          label: status,
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: '•',
        };
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-900 text-amber-300 flex items-center justify-center shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base text-slate-900 dark:text-white">
                Ubwitabire Bwanjye (My Attendance)
              </h2>
              <p className="text-xs text-slate-500">Chorale La Lumiere • ADEPR Nyanza</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Gufungura amateka y'ubwitabire...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : !data || data.history.length === 0 ? (
          <div className="py-12 text-center space-y-3 bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300">
              Nta mateka y'ubwitabire arandikwa kuri konti yawe
            </h4>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Iyo abayobozi ba korali bafashe ubwitabire mu myitozo cyangwa mu materaniro, ubona imibare yawe hano.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Percentage Summary Card */}
            <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-white p-5 rounded-3xl shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">
                    Ijanisha ry'Ubwitabire
                  </span>
                  <div className="text-3xl font-black font-mono">
                    {data.summary.percentage}%
                  </div>
                </div>
                <div className="text-right text-xs text-slate-300">
                  <p className="font-bold">{data.summary.total_recorded} Sessions</p>
                  <p className="text-[10px] text-slate-400">Recorded history</p>
                </div>
              </div>

              {/* Counts Grid */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/10 text-center">
                <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25">
                  <p className="text-sm font-black text-emerald-400">{data.summary.present}</p>
                  <p className="text-[9px] text-slate-300 uppercase">Bahari</p>
                </div>
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/25">
                  <p className="text-sm font-black text-amber-400">{data.summary.late}</p>
                  <p className="text-[9px] text-slate-300 uppercase">Bakerewe</p>
                </div>
                <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/25">
                  <p className="text-sm font-black text-blue-400">{data.summary.excused}</p>
                  <p className="text-[9px] text-slate-300 uppercase">Impamvu</p>
                </div>
                <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/25">
                  <p className="text-sm font-black text-rose-400">{data.summary.absent}</p>
                  <p className="text-[9px] text-slate-300 uppercase">Batariho</p>
                </div>
              </div>
            </div>

            {/* History Feed */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300">
                Amalisiti wagaragayeho (Recorded Sessions):
              </h4>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {data.history.map((item, idx) => {
                  const badge = getStatusBadge(item.status);
                  return (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {item.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            • {item.session_date}
                          </span>
                        </div>
                        {item.location && (
                          <p className="text-[10px] text-slate-400 truncate">
                            📍 {item.location}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-[10px] text-slate-500 italic">
                            "{item.notes}"
                          </p>
                        )}
                      </div>

                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border shrink-0 ${badge.bg}`}>
                        {badge.icon} {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 border-t">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors"
          >
            Funga
          </button>
        </div>
      </div>
    </div>
  );
};
