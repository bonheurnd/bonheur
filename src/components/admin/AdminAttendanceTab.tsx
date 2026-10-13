import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AttendanceSession,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSummary,
  AttendanceActivityType,
  EventItem,
} from '../../types';
import { safeFetchJson } from '../../utils/api';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  Plus,
  Users,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Trash2,
  Edit2,
  X,
  RefreshCw,
  BarChart3,
  ListOrdered,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Check,
  Sparkles,
} from 'lucide-react';

export const AdminAttendanceTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'sessions' | 'mark' | 'summary'>('sessions');

  // Sessions state
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  // Active session for marking or viewing
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [sessionMembers, setSessionMembers] = useState<AttendanceRecord[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState<boolean>(false);
  const [memberVoiceFilter, setMemberVoiceFilter] = useState<string>('all');
  const [memberSearch, setMemberSearch] = useState<string>('');
  const [isSavingRecords, setIsSavingRecords] = useState<boolean>(false);

  // Summary state
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);

  // New session modal
  const [showNewSessionModal, setShowNewSessionModal] = useState<boolean>(false);
  const [isSubmittingSession, setIsSubmittingSession] = useState<boolean>(false);
  const [newSessionForm, setNewSessionForm] = useState({
    title: '',
    activity_type: 'rehearsal' as AttendanceActivityType,
    session_date: new Date().toISOString().slice(0, 10),
    start_time: '15:00',
    end_time: '18:00',
    location: 'ADEPR Nyanza',
    event_id: '',
    notes: '',
  });

  // Upcoming events to link to session
  const [availableEvents, setAvailableEvents] = useState<EventItem[]>([]);

  // Notifications / feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch all attendance sessions
  const fetchSessions = useCallback(async () => {
    try {
      setIsLoadingSessions(true);
      const token = localStorage.getItem('lalumiere_token');
      const params = new URLSearchParams();
      if (activityFilter !== 'all') params.set('activityType', activityFilter);
      if (startDateFilter) params.set('startDate', startDateFilter);
      if (endDateFilter) params.set('endDate', endDateFilter);
      if (searchQuery) params.set('search', searchQuery);

      const res = await safeFetchJson<AttendanceSession[]>(`/api/attendance/sessions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok && res.data) {
        setSessions(res.data);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Habaye ikibazo mu gushaka amalisiti y\'ubwitabire');
    } finally {
      setIsLoadingSessions(false);
    }
  }, [activityFilter, startDateFilter, endDateFilter, searchQuery]);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      setIsLoadingSummary(true);
      const token = localStorage.getItem('lalumiere_token');
      const res = await safeFetchJson<AttendanceSummary>('/api/attendance/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok && res.data) {
        setSummary(res.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  // Fetch events for dropdown linking
  useEffect(() => {
    const fetchEvents = async () => {
      const token = localStorage.getItem('lalumiere_token');
      const res = await safeFetchJson<EventItem[]>('/api/events', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok && res.data) {
        setAvailableEvents(res.data);
      }
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (activeSubTab === 'summary') {
      fetchSummary();
    }
  }, [activeSubTab, fetchSummary]);

  // Load session members when opening mark attendance tab
  const handleOpenMarkSession = async (session: AttendanceSession) => {
    try {
      setActiveSession(session);
      setActiveSubTab('mark');
      setIsLoadingMembers(true);
      const token = localStorage.getItem('lalumiere_token');
      const res = await safeFetchJson<{ session: AttendanceSession; members: AttendanceRecord[] }>(
        `/api/attendance/sessions/${session.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok && res.data) {
        setSessionMembers(res.data.members || []);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Habaye ikibazo mu gufungura ubwitabire');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  // Toggle single member status in memory
  const handleSetMemberStatus = (userId: string, newStatus: AttendanceStatus) => {
    setSessionMembers(prev =>
      prev.map(m => (m.user_id === userId ? { ...m, status: newStatus } : m))
    );
  };

  // Update member note
  const handleSetMemberNote = (userId: string, note: string) => {
    setSessionMembers(prev =>
      prev.map(m => (m.user_id === userId ? { ...m, notes: note } : m))
    );
  };

  // Bulk actions
  const handleMarkAllPresent = () => {
    setSessionMembers(prev => prev.map(m => ({ ...m, status: 'present' })));
    showToast('Abaririmbyi bose bashyizwe kuri "Yitabiriye (Present)"');
  };

  const handleMarkFilteredPresent = () => {
    if (memberVoiceFilter === 'all') {
      handleMarkAllPresent();
      return;
    }
    setSessionMembers(prev =>
      prev.map(m =>
        m.choir_voice === memberVoiceFilter ? { ...m, status: 'present' } : m
      )
    );
    showToast(`Abaririmbyi b'ijwi rya ${memberVoiceFilter} bose bashyizwe kuri "Yitabiriye"`);
  };

  // Save session records to database
  const handleSaveAttendance = async () => {
    if (!activeSession) return;
    try {
      setIsSavingRecords(true);
      const token = localStorage.getItem('lalumiere_token');
      const payload = {
        records: sessionMembers.map(m => ({
          user_id: m.user_id,
          status: m.status || 'present',
          notes: m.notes || null,
        })),
      };

      const res = await safeFetchJson<{ message: string; saved_count: number }>(
        `/api/attendance/sessions/${activeSession.id}/records`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        showToast(`Ubwitabire bwabitswe neza (${res.data?.saved_count || sessionMembers.length} banyamuryango)!`);
        fetchSessions();
      } else {
        setErrorMessage(res.error || 'Habaye ikibazo mu kubika ubwitabire');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Habaye ikibazo mu kubika ubwitabire: ' + err.message);
    } finally {
      setIsSavingRecords(false);
    }
  };

  // Create new session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionForm.title || !newSessionForm.session_date) {
      alert('Andika umutwe n\'itariki by\'ubwitabire');
      return;
    }

    try {
      setIsSubmittingSession(true);
      const token = localStorage.getItem('lalumiere_token');
      const res = await safeFetchJson<{ message: string; id: string }>(
        '/api/attendance/sessions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newSessionForm),
        }
      );

      if (res.ok && res.data) {
        showToast('Urutonde rw\'ubwitabire rwashyizweho neza!');
        setShowNewSessionModal(false);
        setNewSessionForm({
          title: '',
          activity_type: 'rehearsal',
          session_date: new Date().toISOString().slice(0, 10),
          start_time: '15:00',
          end_time: '18:00',
          location: 'ADEPR Nyanza',
          event_id: '',
          notes: '',
        });
        await fetchSessions();
        // Immediately open to mark attendance
        const createdSession = sessions.find(s => s.id === res.data!.id) || {
          id: res.data.id,
          title: newSessionForm.title,
          activity_type: newSessionForm.activity_type,
          session_date: newSessionForm.session_date,
          start_time: newSessionForm.start_time,
          end_time: newSessionForm.end_time,
          location: newSessionForm.location,
        };
        handleOpenMarkSession(createdSession as AttendanceSession);
      } else {
        alert(res.error || 'Habaye ikibazo mu gushyiraho ubwitabire');
      }
    } catch (err: any) {
      alert('Ikibazo: ' + err.message);
    } finally {
      setIsSubmittingSession(false);
    }
  };

  // Delete session
  const handleDeleteSession = async (sessionId: string, title: string) => {
    if (!confirm(`Uremeza ko ushaka gusiba ubwitabire bwa "${title}"?`)) return;
    try {
      const token = localStorage.getItem('lalumiere_token');
      const res = await safeFetchJson(`/api/attendance/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Ubwitabire bwasibwe neza');
        fetchSessions();
        if (activeSession?.id === sessionId) {
          setActiveSession(null);
          setActiveSubTab('sessions');
        }
      }
    } catch (err) {
      alert('Habaye ikibazo mu gusiba');
    }
  };

  // Export CSV download
  const handleExportCsv = (sessionId?: string) => {
    const token = localStorage.getItem('lalumiere_token');
    const params = new URLSearchParams();
    if (sessionId) params.set('sessionId', sessionId);
    if (startDateFilter) params.set('startDate', startDateFilter);
    if (endDateFilter) params.set('endDate', endDateFilter);

    const exportUrl = `/api/attendance/export/csv?${params.toString()}${token ? `&token=${token}` : ''}`;
    window.open(exportUrl, '_blank');
  };

  // Filtered members in active session marking
  const filteredSessionMembers = useMemo(() => {
    return sessionMembers.filter(m => {
      const matchVoice = memberVoiceFilter === 'all' || m.choir_voice === memberVoiceFilter;
      const matchSearch =
        !memberSearch.trim() ||
        (m.name && m.name.toLowerCase().includes(memberSearch.toLowerCase())) ||
        (m.choir_voice && m.choir_voice.toLowerCase().includes(memberSearch.toLowerCase())) ||
        (m.choir_role && m.choir_role.toLowerCase().includes(memberSearch.toLowerCase()));
      return matchVoice && matchSearch;
    });
  }, [sessionMembers, memberVoiceFilter, memberSearch]);

  // Live marked counts
  const currentMarkedCounts = useMemo(() => {
    const present = sessionMembers.filter(m => m.status === 'present').length;
    const late = sessionMembers.filter(m => m.status === 'late').length;
    const excused = sessionMembers.filter(m => m.status === 'excused').length;
    const absent = sessionMembers.filter(m => m.status === 'absent').length;
    return {
      present,
      late,
      excused,
      absent,
      total: sessionMembers.length,
    };
  }, [sessionMembers]);

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Sub-Tabs Navigation */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setActiveSubTab('sessions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'sessions'
                ? 'bg-blue-900 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Urutonde rw'Ubwitabire ({sessions.length})</span>
          </button>

          {activeSession && (
            <button
              onClick={() => setActiveSubTab('mark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'mark'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Gufata Ubwitabire: {activeSession.title}</span>
            </button>
          )}

          <button
            onClick={() => setActiveSubTab('summary')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'summary'
                ? 'bg-blue-900 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Imibare & Raporo (Summary)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExportCsv()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all active:scale-95 shadow-2xs"
            title="Sohora raporo yose y'ubwitabire muri CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-900" />
            <span>CSV Export</span>
          </button>

          <button
            onClick={() => setShowNewSessionModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition-all active:scale-95 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Shyiraho Ubwitabire Bushya</span>
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-3 bg-emerald-900 text-white rounded-2xl flex items-center justify-between text-xs font-semibold shadow-md animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-300 font-bold ml-2">
            OK
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-900 text-white rounded-2xl flex items-center justify-between text-xs font-semibold shadow-md animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-300 font-bold ml-2">
            Funga
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. SESSIONS LIST VIEW */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'sessions' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 shadow-2xs grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Shakisha igikorwa, ahantu..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-900"
              />
            </div>

            <div>
              <select
                value={activityFilter}
                onChange={e => setActivityFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
              >
                <option value="all">Ibyiciro Byose (All Activities)</option>
                <option value="rehearsal">Imyitozo (Rehearsal)</option>
                <option value="sunday_service">Iteraniro ryo ku Cyumweru</option>
                <option value="concert">Igitaramo (Concert)</option>
                <option value="meeting">Inama ya Korali (Meeting)</option>
                <option value="special_event">Igikorwa Cyihariye</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDateFilter}
                onChange={e => setStartDateFilter(e.target.value)}
                className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px]"
                title="Itariki yo gutangira"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={e => setEndDateFilter(e.target.value)}
                className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px]"
                title="Itariki yo gusoza"
              />
            </div>
          </div>

          {/* Sessions Feed */}
          {isLoadingSessions ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-semibold">Gushaka amalisiti y'ubwitabire...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-16 text-center space-y-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 p-8">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-900 flex items-center justify-center mx-auto">
                <Calendar className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Nta rutonde rw'ubwitabire rurashyirwaho
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Kanda kuri "Shyiraho Ubwitabire Bushya" kugira ngo utangire kwandika abaririmbyi bitabiriye imyitozo n'amateraniro.
                </p>
              </div>
              <button
                onClick={() => setShowNewSessionModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-xl text-xs font-bold"
              >
                <Plus className="w-4 h-4" />
                <span>Kora Lisiti ya Mbere</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(sess => {
                const totalMarked = sess.total_marked || 0;
                const present = sess.present_count || 0;
                const late = sess.late_count || 0;
                const excused = sess.excused_count || 0;
                const absent = sess.absent_count || 0;
                const attendanceRate = totalMarked > 0
                  ? Math.round(((present + late) / (totalMarked - excused > 0 ? totalMarked - excused : totalMarked)) * 100)
                  : 0;

                return (
                  <div
                    key={sess.id}
                    className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide bg-blue-50 text-blue-900 border border-blue-200">
                            {sess.activity_type.replace('_', ' ')}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-500">
                            📅 {sess.session_date}
                          </span>
                          {sess.start_time && (
                            <span className="text-xs font-mono text-slate-400">
                              ⏰ {sess.start_time} - {sess.end_time || '18:00'}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                          {sess.title}
                        </h4>
                        {sess.location && (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <span>📍</span>
                            <span>{sess.location}</span>
                            {sess.event_title && (
                              <span className="text-blue-900 font-semibold">• Igikorwa: {sess.event_title}</span>
                            )}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleExportCsv(sess.id)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          title="Sohora iyi lisiti muri CSV"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteSession(sess.id, sess.title)}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                          title="Siba iyi lisiti"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenMarkSession(sess)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-2xs"
                        >
                          <UserCheck className="w-4 h-4 text-amber-300" />
                          <span>Fata Ubwitabire</span>
                        </button>
                      </div>
                    </div>

                    {/* Stats pills */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                          ✓ Bahari: {present}
                        </span>
                        <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 font-bold border border-amber-200">
                          ⏱ Bakerewe: {late}
                        </span>
                        <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 font-bold border border-blue-200">
                          ℹ Badahari n'Impamvu: {excused}
                        </span>
                        <span className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-800 font-bold border border-rose-200">
                          ✗ Batitabiriye: {absent}
                        </span>
                        <span className="text-slate-400 text-xs font-semibold">
                          Total: {totalMarked}
                        </span>
                      </div>

                      {totalMarked > 0 && (
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className="text-slate-500 text-[11px]">Ijanisha:</span>
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black ${
                            attendanceRate >= 80
                              ? 'bg-emerald-100 text-emerald-900'
                              : attendanceRate >= 60
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-rose-100 text-rose-900'
                          }`}>
                            {attendanceRate}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. MARK ATTENDANCE SHEET */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'mark' && activeSession && (
        <div className="space-y-4">
          {/* Header Card with Session Details & Actions */}
          <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-white p-5 sm:p-6 rounded-3xl shadow-md space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide bg-amber-400 text-slate-950">
                    {activeSession.activity_type.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-mono text-slate-300">
                    📅 {activeSession.session_date} • ⏰ {activeSession.start_time || '15:00'}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black font-serif text-white">
                  {activeSession.title}
                </h2>
                <p className="text-xs text-slate-300 flex items-center gap-1">
                  <span>📍 {activeSession.location || 'ADEPR Nyanza'}</span>
                  {activeSession.notes && <span>• Note: {activeSession.notes}</span>}
                </p>
              </div>

              {/* Save Attendance Button */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleSaveAttendance}
                  disabled={isSavingRecords}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSavingRecords ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 stroke-[3]" />
                  )}
                  <span>{isSavingRecords ? 'Kubika...' : 'Bika Ubwitabire (Save Attendance)'}</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics & Bulk Tools */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  ✓ Bahari: {currentMarkedCounts.present}
                </span>
                <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  ⏱ Bakerewe: {currentMarkedCounts.late}
                </span>
                <span className="px-3 py-1 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                  ℹ Badahari n'Impamvu: {currentMarkedCounts.excused}
                </span>
                <span className="px-3 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                  ✗ Batitabiriye: {currentMarkedCounts.absent}
                </span>
                <span className="text-slate-400 font-mono">
                  Bose: {currentMarkedCounts.total}
                </span>
              </div>

              {/* Quick Bulk Action */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleMarkAllPresent}
                  className="px-3 py-1 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-colors"
                  title="Shyira abaririmbyi bose kuri Present"
                >
                  Bose Bahari (All Present)
                </button>
                <button
                  onClick={handleMarkFilteredPresent}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Shyiraho ab'Iri Jwi
                </button>
              </div>
            </div>
          </div>

          {/* Members Filter Controls */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Shakisha umuririmbyi..."
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>

            {/* Voice section tabs */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {['all', 'Soprano', 'Alto', 'Tenor', 'Bass', 'Musician', 'Director'].map(v => (
                <button
                  key={v}
                  onClick={() => setMemberVoiceFilter(v)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    memberVoiceFilter === v
                      ? 'bg-blue-900 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {v === 'all' ? 'Amajwi Yose' : v}
                </button>
              ))}
            </div>
          </div>

          {/* Member Roster List */}
          {isLoadingMembers ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-semibold">Gufungura urutonde rw'abaririmbyi...</p>
            </div>
          ) : filteredSessionMembers.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-3xl border p-6">
              Nta muririmbyi uhuye n'ibyo ushakishije.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredSessionMembers.map((m, idx) => {
                const status = m.status || 'present';

                return (
                  <div
                    key={m.user_id}
                    className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:border-blue-300"
                  >
                    {/* Member Profile Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-2xl bg-blue-900 text-amber-300 font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        {m.name ? m.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {m.name}
                          </h4>
                          {m.choir_voice && (
                            <span className="px-2 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] border border-slate-200">
                              {m.choir_voice}
                            </span>
                          )}
                          {m.choir_role && m.choir_role !== 'Member' && (
                            <span className="text-[10px] text-amber-700 font-semibold truncate hidden sm:inline">
                              • {m.choir_role}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {m.phone || m.email}
                        </p>
                      </div>
                    </div>

                    {/* Attendance Status Toggle Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
                      {[
                        { id: 'present', label: 'Present', activeBg: 'bg-emerald-600 text-white font-black' },
                        { id: 'late', label: 'Late', activeBg: 'bg-amber-500 text-slate-950 font-black' },
                        { id: 'excused', label: 'Excused', activeBg: 'bg-blue-600 text-white font-black' },
                        { id: 'absent', label: 'Absent', activeBg: 'bg-rose-600 text-white font-black' },
                      ].map(st => {
                        const isSelected = status === st.id;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => handleSetMemberStatus(m.user_id, st.id as AttendanceStatus)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? `${st.activeBg} shadow-xs scale-102`
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isSelected && '✓ '}
                            {st.label}
                          </button>
                        );
                      })}

                      {/* Optional Note input */}
                      <input
                        type="text"
                        placeholder="Ibisobanuro..."
                        value={m.notes || ''}
                        onChange={e => handleSetMemberNote(m.user_id, e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] w-28 sm:w-36 focus:w-44 transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Floating Save Bar */}
          <div className="sticky bottom-4 z-20 bg-slate-900 text-white p-3.5 rounded-3xl shadow-xl flex items-center justify-between gap-3 border border-slate-700 animate-in fade-in duration-200">
            <div className="text-xs font-semibold pl-2">
              <span>Abaririmbyi {sessionMembers.length} bagenzuwe. </span>
              <span className="text-emerald-400 font-bold">Bahari: {currentMarkedCounts.present}</span>
            </div>
            <button
              onClick={handleSaveAttendance}
              disabled={isSavingRecords}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-2xl shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isSavingRecords ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4 stroke-[3]" />
              )}
              <span>Bika Ubwitabire (Save)</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. ATTENDANCE SUMMARY & LEADERBOARD VIEW */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'summary' && (
        <div className="space-y-5">
          {isLoadingSummary ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-semibold">Gukusanya imibare y'ubwitabire...</p>
            </div>
          ) : !summary ? (
            <div className="py-16 text-center text-xs text-slate-400">
              Nta mibare y'ubwitabire iraboneka.
            </div>
          ) : (
            <>
              {/* High-Level Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Amalisiti Yafashwe</span>
                  <p className="text-2xl font-black text-blue-950 dark:text-white font-mono">
                    {summary.total_sessions}
                  </p>
                  <p className="text-[10px] text-slate-500">Ibihe byose by'imyitozo</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Abaririmbyi Bose</span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    {summary.total_members}
                  </p>
                  <p className="text-[10px] text-slate-500">Bari ku rutonde</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Ijanisha Rusange</span>
                  <p className={`text-2xl font-black font-mono ${
                    summary.overall_rate >= 80 ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {summary.overall_rate}%
                  </p>
                  <p className="text-[10px] text-slate-500">Average attendance</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Ubwitabire Nyabwo</span>
                  <p className="text-2xl font-black text-emerald-600 font-mono">
                    {summary.totals.present}
                  </p>
                  <p className="text-[10px] text-slate-500">Present check-ins</p>
                </div>
              </div>

              {/* Voice Section Breakdown */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-900" />
                    <span>Ubwitabire ku Majwi (Voice Sections Breakdown)</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {summary.voice_breakdown.map(vb => (
                    <div
                      key={vb.section}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-blue-950 dark:text-amber-300">
                          {vb.section}
                        </span>
                        <span className="font-mono text-xs font-black text-slate-700">
                          {vb.rate}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-900 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, vb.rate)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Abaririmbyi: {vb.member_count}</span>
                        <span>Bahari: {vb.present_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Member Attendance Leaderboard */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <ListOrdered className="w-4 h-4 text-blue-900" />
                    <span>Urutonde rw'Abaririmbyi n'Ijanisha ry'Ubwitabire</span>
                  </h3>
                  <button
                    onClick={() => handleExportCsv()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV Export</span>
                  </button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {summary.members.map((m, idx) => (
                    <div
                      key={m.user_id}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono font-bold text-slate-400 w-5 text-center">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {m.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {m.choir_voice || 'Unassigned'} • {m.sessions_recorded} sessions
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="text-emerald-700 font-semibold">P: {m.present_count}</span>
                          <span className="text-amber-700 font-semibold">L: {m.late_count}</span>
                          <span className="text-blue-700 font-semibold">E: {m.excused_count}</span>
                          <span className="text-rose-700 font-semibold">A: {m.absent_count}</span>
                        </div>

                        <span className={`px-2.5 py-1 rounded-xl font-mono font-black text-xs ${
                          m.percentage >= 80
                            ? 'bg-emerald-100 text-emerald-900'
                            : m.percentage >= 60
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-rose-100 text-rose-900'
                        }`}>
                          {m.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* NEW SESSION MODAL */}
      {/* ------------------------------------------------------------- */}
      {showNewSessionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Shyiraho Lisiti y'Ubwitabire
                  </h3>
                  <p className="text-xs text-slate-500">Igihe cy'imyitozo cyangwa igikorwa cya korali</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewSessionModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Umutwe w'Igikorwa (Title) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Urugero: Imyitozo yo kuwa Gatandatu, Worship Rehearsal..."
                  value={newSessionForm.title}
                  onChange={e => setNewSessionForm({ ...newSessionForm, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Ubwoko bw'Igikorwa (Activity)
                  </label>
                  <select
                    value={newSessionForm.activity_type}
                    onChange={e =>
                      setNewSessionForm({
                        ...newSessionForm,
                        activity_type: e.target.value as AttendanceActivityType,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="rehearsal">Imyitozo (Rehearsal)</option>
                    <option value="sunday_service">Iteraniro ryo ku Cyumweru</option>
                    <option value="concert">Igitaramo (Concert)</option>
                    <option value="meeting">Inama ya Korali (Meeting)</option>
                    <option value="special_event">Igikorwa Cyihariye</option>
                    <option value="other">Ikindi</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Itariki (Date) *
                  </label>
                  <input
                    type="date"
                    required
                    value={newSessionForm.session_date}
                    onChange={e =>
                      setNewSessionForm({ ...newSessionForm, session_date: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Igihe Gitangirira (Start Time)
                  </label>
                  <input
                    type="time"
                    value={newSessionForm.start_time}
                    onChange={e =>
                      setNewSessionForm({ ...newSessionForm, start_time: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Igihe Gisorereza (End Time)
                  </label>
                  <input
                    type="time"
                    value={newSessionForm.end_time}
                    onChange={e =>
                      setNewSessionForm({ ...newSessionForm, end_time: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Ahantu (Location)
                </label>
                <input
                  type="text"
                  placeholder="ADEPR Nyanza, Gikondo..."
                  value={newSessionForm.location}
                  onChange={e => setNewSessionForm({ ...newSessionForm, location: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {availableEvents.length > 0 && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Huza n'Igikorwa Cyateguwe (Link to Existing Event - Optional)
                  </label>
                  <select
                    value={newSessionForm.event_id}
                    onChange={e => setNewSessionForm({ ...newSessionForm, event_id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">-- Nta gikorwa gihujwe nacyo --</option>
                    {availableEvents.map(evt => (
                      <option key={evt.id} value={evt.id}>
                        {evt.title} ({evt.event_date})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Ibisobanuro cyangwa Inyandiko y'Inyongera (Notes)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ibisobanuro by'umwihariko kuri iyi myitozo..."
                  value={newSessionForm.notes}
                  onChange={e => setNewSessionForm({ ...newSessionForm, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSessionModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold"
                >
                  Reka
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSession}
                  className="flex-1 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold disabled:opacity-50"
                >
                  {isSubmittingSession ? 'Kubika...' : 'Kora Lisiti'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
