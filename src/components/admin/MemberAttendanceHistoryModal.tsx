import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../../utils/api';
import {
  X,
  Calendar,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertCircle,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

interface MemberAttendanceHistoryModalProps {
  memberId: string;
  onClose: () => void;
}

interface MemberHistoryData {
  member: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    choir_voice?: string;
    choir_role?: string;
    status: 'active' | 'inactive';
  };
  summary: {
    total_sessions: number;
    present: number;
    late: number;
    excused: number;
    absent: number;
    attendance_percentage: number;
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
    status: string;
    notes?: string;
    marked_by?: string;
    marked_at: string;
  }>;
}

export const MemberAttendanceHistoryModal: React.FC<MemberAttendanceHistoryModalProps> = ({
  memberId,
  onClose,
}) => {
  const [data, setData] = useState<MemberHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('lalumiere_token');
        const res = await safeFetchJson<MemberHistoryData>(`/api/members/${memberId}/attendance`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok && res.data) {
          setData(res.data);
        } else {
          setErrorMsg(res.error || res.errorMessage || 'Habaye ikibazo mu gushaka amateka y\'ubwitabire');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Network error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [memberId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return { label: 'Yitabiriye (Present)', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: '✓' };
      case 'late':
        return { label: 'Yakerewe (Late)', bg: 'bg-amber-100 text-amber-800 border-amber-200', icon: '⏱' };
      case 'excused':
        return { label: 'Ntiyabonetse n\'Impamvu (Excused)', bg: 'bg-blue-100 text-blue-800 border-blue-200', icon: 'ℹ' };
      case 'absent':
        return { label: 'Ntiyitabiriye (Absent)', bg: 'bg-rose-100 text-rose-800 border-rose-200', icon: '✗' };
      default:
        return { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: '•' };
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-900 text-amber-300 flex items-center justify-center shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 font-serif leading-tight">
                Amateka y'Ubwitabire bw'Umunyamuryango
              </h3>
              <p className="text-xs text-slate-500">
                {data?.member.name || 'Member Attendance History'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-900 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Gushaka amakuru y'ubwitabire...</p>
          </div>
        ) : errorMsg ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : data ? (
          <div className="space-y-4 text-xs">
            {/* Member Card */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">{data.member.name}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {data.member.choir_voice} • {data.member.choir_role}
                </p>
                {data.member.phone && (
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">{data.member.phone}</p>
                )}
              </div>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                  data.member.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-200 text-slate-700 border border-slate-300'
                }`}
              >
                {data.member.status === 'active' ? '✓ Arakora' : '✕ Ntakora'}
              </span>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
              <div className="p-2.5 bg-slate-100 rounded-xl">
                <span className="text-[10px] text-slate-500 block">Ibikorwa</span>
                <span className="text-base font-black text-slate-900">{data.summary.total_sessions}</span>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-[10px] text-emerald-700 block font-bold">Yitabiriye</span>
                <span className="text-base font-black text-emerald-800">{data.summary.present}</span>
              </div>
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="text-[10px] text-amber-700 block font-bold">Yakerewe</span>
                <span className="text-base font-black text-amber-800">{data.summary.late}</span>
              </div>
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-[10px] text-blue-700 block font-bold">Impamvu</span>
                <span className="text-base font-black text-blue-800">{data.summary.excused}</span>
              </div>
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl col-span-3 sm:col-span-1">
                <span className="text-[10px] text-rose-700 block font-bold">Ntiyaje</span>
                <span className="text-base font-black text-rose-800">{data.summary.absent}</span>
              </div>
            </div>

            {/* Attendance Percentage Meter */}
            <div className="p-3 bg-gradient-to-r from-blue-950 to-indigo-950 text-white rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-300 uppercase tracking-wider block font-bold">
                  Ikigereranyo cy'Ubwitabire (Rate)
                </span>
                <span className="text-xs text-amber-300">
                  {data.summary.attendance_percentage >= 80
                    ? 'Ubwitabire bunoze cyane'
                    : data.summary.attendance_percentage >= 60
                    ? 'Ubwitabire burakwiye'
                    : 'Ubwitabire buri hasi'}
                </span>
              </div>
              <span className="text-2xl font-black font-mono text-amber-400">
                {data.summary.attendance_percentage}%
              </span>
            </div>

            {/* History Sessions List */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-900 border-b pb-1">
                Ibyiciro byose byanditswe ({data.history.length}):
              </h5>

              {data.history.length === 0 ? (
                <p className="text-center py-6 text-slate-400 italic">
                  Nta mwitozo cyangwa igikorwa kirandikwa kuri uyu munyamuryango.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {data.history.map((h, i) => {
                    const badge = getStatusBadge(h.status);
                    return (
                      <div
                        key={i}
                        className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <h6 className="font-bold text-slate-900 truncate">{h.title}</h6>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{h.session_date}</span>
                            <span>•</span>
                            <span className="capitalize">{h.activity_type}</span>
                            {h.location && (
                              <>
                                <span>•</span>
                                <span>{h.location}</span>
                              </>
                            )}
                          </p>
                          {h.notes && (
                            <p className="text-[10px] text-slate-600 italic mt-1 bg-slate-50 p-1 rounded">
                              Icyitonderwa: {h.notes}
                            </p>
                          )}
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border shrink-0 flex items-center gap-1 ${badge.bg}`}
                        >
                          <span>{badge.icon}</span>
                          <span>{badge.label}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="pt-2 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Funga
          </button>
        </div>
      </div>
    </div>
  );
};
