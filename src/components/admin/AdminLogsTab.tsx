import React, { useState, useEffect, useMemo } from 'react';
import { ActivityLog, AuditLogStats } from '../../types';
import { safeFetchJson } from '../../utils/api';
import {
  Shield,
  Search,
  Clock,
  RefreshCw,
  Filter,
  User,
  Activity,
  Download,
  Calendar,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle,
  Eye,
  X,
  FileCode,
  Music,
  Users,
  KeyRound,
  LogIn,
  Layers,
  ChevronRight,
  Database,
  Lock,
} from 'lucide-react';

export const AdminLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [limit, setLimit] = useState(100);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  // Selected Log for detail modal
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  // Fetch stats from backend
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('lalumiere_token');
      const res = await safeFetchJson<AuditLogStats>('/api/admin/activity-logs/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch audit stats:', err);
    }
  };

  // Fetch logs with active filters
  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('lalumiere_token');
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (resourceFilter !== 'all') params.set('resource', resourceFilter);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await safeFetchJson<any>(`/api/admin/activity-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok && res.data) {
        if (Array.isArray(res.data)) {
          setLogs(res.data);
        } else if (res.data.logs && Array.isArray(res.data.logs)) {
          setLogs(res.data.logs);
        }
      }
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchLogs();
  }, [categoryFilter, resourceFilter, limit]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setResourceFilter('all');
    setDateFrom('');
    setDateTo('');
    setLimit(100);
  };

  // Download Audit Log as CSV
  const handleExportCsv = () => {
    const token = localStorage.getItem('lalumiere_token') || '';
    const params = new URLSearchParams();
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    if (resourceFilter !== 'all') params.set('resource', resourceFilter);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());

    const url = `/api/admin/export/activity_logs?${params.toString()}`;
    const link = document.createElement('a');
    link.href = url;
    const dateSuffix = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `la-lumiere-audit-logs-${dateSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Human-readable relative time helper
  const getRelativeTime = (timestamp: string) => {
    try {
      const now = Date.now();
      const past = new Date(timestamp).getTime();
      const diffSecs = Math.floor((now - past) / 1000);

      if (diffSecs < 60) return 'Ako kanya';
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `Iminota ${diffMins} ishize`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Amasaha ${diffHours} ashize`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) return `Iminsi ${diffDays} ishize`;
      return new Date(timestamp).toLocaleDateString();
    } catch {
      return timestamp;
    }
  };

  // Human-friendly Action Badge configuration
  const getActionConfig = (action: string) => {
    const act = action.toUpperCase();

    if (act.includes('DELETE') || act.includes('REMOVE') || act.includes('BLOCK')) {
      return {
        label: act.includes('BULK') ? 'Gusiba Bose (Bulk Removal)' : 'Gusiba (Deletion)',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: AlertTriangle,
        iconBg: 'bg-rose-100 text-rose-700',
        severity: 'danger',
      };
    }

    if (act.includes('EDIT') || act.includes('UPDATE') || act.includes('ROLE') || act.includes('STATUS')) {
      return {
        label: act.includes('SONG') ? 'Kuvugurura Indirimbo (Song Edit)' : 'Kuvugurura (Update)',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: Activity,
        iconBg: 'bg-amber-100 text-amber-700',
        severity: 'warning',
      };
    }

    if (act.includes('CREATE') || act.includes('ADD') || act.includes('RESTORE') || act.includes('UPLOAD')) {
      return {
        label: 'Kurema / Kongeramo (Created)',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        icon: CheckCircle,
        iconBg: 'bg-emerald-100 text-emerald-700',
        severity: 'success',
      };
    }

    if (act.includes('EXPORT') || act.includes('CSV')) {
      return {
        label: 'Gusohora CSV (CSV Export)',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        icon: Download,
        iconBg: 'bg-indigo-100 text-indigo-700',
        severity: 'info',
      };
    }

    if (act.includes('LOGIN') || act.includes('AUTH') || act.includes('PASSWORD')) {
      return {
        label: 'Kwinjira / Umutekano (Auth)',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
        icon: LogIn,
        iconBg: 'bg-blue-100 text-blue-700',
        severity: 'info',
      };
    }

    return {
      label: action,
      badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
      icon: Activity,
      iconBg: 'bg-slate-100 text-slate-700',
      severity: 'neutral',
    };
  };

  // Try parsing details as JSON for inspection
  const parseJsonDetails = (detailsStr?: string) => {
    if (!detailsStr) return null;
    try {
      if (detailsStr.startsWith('{') || detailsStr.startsWith('[')) {
        return JSON.parse(detailsStr);
      }
    } catch {
      return null;
    }
    return null;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 1. IMMUTABLE SECURITY AUDIT LEDGER BANNER (Read-Only Guarantee) */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Soma Gusa (Immutable Read-Only Ledger)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Tamper-evident
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-black font-serif text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400 shrink-0" />
            <span>Admin Audit Log (Igitabo cy'Ubugenzuzi bw'Ubuyobozi)</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Iki gitabo kibika ibikorwa byose byakozwe n'abayobozi (nk'ihindurwa ry'indirimbo, igukurwaho ry'abanyamuryango hamwe, n'isohorwa rya CSV) mu buryo budashobora guhindurwa cyangwa gusibwa ku bw'umutekano n'ubucungamutungo.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Sohora Audit Log muri dosiye ya CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Audit CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              fetchStats();
              fetchLogs();
            }}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20 cursor-pointer"
            title="Vugurura (Refresh Logs)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Vugurura</span>
          </button>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold">Ibikorwa Byose</span>
            <Activity className="w-3.5 h-3.5 text-blue-900" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {stats?.totalCount ?? logs.length}
          </div>
          <span className="text-[10px] text-slate-400">Total Audit Events</span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold">Guhindura Indirimbo</span>
            <Music className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-700 font-mono">
            {stats?.songEditsCount ?? 0}
          </div>
          <span className="text-[10px] text-slate-400">Manual Song Edits</span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold">Gukuraho / Status</span>
            <Users className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-700 font-mono">
            {stats?.userActionsCount ?? 0}
          </div>
          <span className="text-[10px] text-slate-400">User Removals & Roles</span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold">Gusohora CSV</span>
            <Download className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-700 font-mono">
            {stats?.exportActionsCount ?? 0}
          </div>
          <span className="text-[10px] text-slate-400">Data Exports</span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold">Amasaha 24 Ashize</span>
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 font-mono">
            {stats?.last24hCount ?? 0}
          </div>
          <span className="text-[10px] text-slate-400">Recent 24h Actions</span>
        </div>
      </div>

      {/* 3. ADVANCED SEARCH & FILTER CONTROLS */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
        <form onSubmit={handleApplyFilters} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            {/* Search Input */}
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Shakisha mu bikorwa, izina ry'umuyobozi, amakuru, ID..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900"
              >
                <option value="all">Ibyiciro Byose (All Categories)</option>
                <option value="songs">Guhindura Indirimbo (Manual Song Edits)</option>
                <option value="users">Gukuraho / Gucunga Abakoresha (Users & Removals)</option>
                <option value="export">Gusohora Amakuru muri CSV (Data Exports)</option>
                <option value="auth">Kwinjira / Umutekano (Logins & Auth)</option>
                <option value="content">Amatangazo & Ibyanditswe (Content)</option>
              </select>
            </div>

            {/* Resource Filter */}
            <div>
              <select
                value={resourceFilter}
                onChange={e => setResourceFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900"
              >
                <option value="all">Inzego Zose (All Resources)</option>
                <option value="songs">Indirimbo (Songs)</option>
                <option value="users">Abanyamuryango (Users)</option>
                <option value="export">Exports (CSV)</option>
                <option value="auth">Kwinjira (Auth)</option>
                <option value="announcements">Amatangazo</option>
                <option value="events">Ibikorwa (Events)</option>
                <option value="donations">Inkunga</option>
              </select>
            </div>
          </div>

          {/* Date Range & Limit */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                Itariki yo Gutangira (From):
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                Itariki yo Gusoza (To):
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                Umubare w'Amakuru (Limit):
              </label>
              <select
                value={limit}
                onChange={e => setLimit(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value={50}>50 biheruka</option>
                <option value={100}>100 biheruka</option>
                <option value={250}>250 biheruka</option>
                <option value={500}>500 biheruka</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 py-1.5 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Shungura (Filter)
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                title="Gusiba ibyo washakishije"
              >
                Kureka
              </button>
            </div>
          </div>
        </form>

        {lastRefreshed && (
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
            <span>Byavuguruwe saa: {lastRefreshed}</span>
            <span>Byabonetse: {logs.length} records</span>
          </div>
        )}
      </div>

      {/* 4. AUDIT LOG STREAM / TABLE */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-900" />
            <span>Gushakisha ubugenzuzi bw'umutekano...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Shield className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">Nta bikorwa by'ubugenzuzi bihuye n'ibyo mushakishije</p>
            <p className="text-[11px] text-slate-400">Gerageza guhindura amatariki cyangwa icyiciro mwashakishijemo.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map(log => {
              const config = getActionConfig(log.action);
              const Icon = config.icon;
              const jsonDetails = parseJsonDetails(log.details);

              return (
                <div
                  key={log.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/70 p-2 rounded-2xl transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${config.badgeClass}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-xs">
                          {log.user_name || 'System Admin'}
                        </span>

                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-[10px] font-bold">
                          {log.user_role || 'admin'}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${config.badgeClass}`}
                        >
                          {config.label}
                        </span>

                        {log.resource && (
                          <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                            resource: {log.resource}
                          </span>
                        )}
                      </div>

                      {/* Details summary */}
                      <p className="text-slate-700 text-xs leading-relaxed font-normal">
                        {jsonDetails?.summary || jsonDetails?.description || log.details || 'Nta bisobanuro birambuye'}
                      </p>

                      {/* Quick highlight tags if available */}
                      {jsonDetails && (
                        <div className="flex items-center gap-2 flex-wrap text-[10px]">
                          {jsonDetails.songTitle && (
                            <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md font-semibold">
                              Indirimbo: {jsonDetails.songTitle}
                            </span>
                          )}
                          {jsonDetails.count !== undefined && (
                            <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md font-semibold">
                              Umubare: {jsonDetails.count}
                            </span>
                          )}
                          {jsonDetails.changedFields && jsonDetails.changedFields.length > 0 && (
                            <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                              Byahinduwe: {jsonDetails.changedFields.join(', ')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Timestamp */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLog(log);
                        setShowRawJson(false);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                      title="Reba amakuru arambuye"
                    >
                      <Eye className="w-3 h-3 text-blue-900" />
                      <span>Ibisobanuro</span>
                    </button>

                    <div className="text-right text-[10px] text-slate-400 font-mono">
                      <div className="font-semibold text-slate-600">{getRelativeTime(log.created_at)}</div>
                      <div>{new Date(log.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. AUDIT DETAIL INSPECTION MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-950" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Ubugenzuzi burambuye (Audit Event Inspection)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Event Header Card */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Event ID:</span>
                <span className="font-mono font-bold text-slate-800">{selectedLog.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Umuyobozi (Actor):</span>
                <span className="font-bold text-slate-900">
                  {selectedLog.user_name || 'System Admin'} ({selectedLog.user_role || 'admin'})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Igikorwa (Action):</span>
                <span className="font-mono font-bold text-blue-950">{selectedLog.action}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Urwego (Resource):</span>
                <span className="font-bold text-slate-700">
                  {selectedLog.resource} {selectedLog.resource_id ? `(${selectedLog.resource_id})` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Itariki n'Isaha:</span>
                <span className="font-mono text-slate-700">
                  {new Date(selectedLog.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Parsed JSON Details Inspection */}
            {(() => {
              const detailsObj = parseJsonDetails(selectedLog.details);

              if (detailsObj) {
                return (
                  <div className="space-y-3">
                    <h4 className="font-bold text-xs text-slate-800">
                      Amakuru y'Igikorwa Cyakozwe:
                    </h4>

                    {/* Manual Song Edit Diff View */}
                    {detailsObj.actionType === 'MANUAL_SONG_EDIT' && (
                      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 space-y-2 text-xs">
                        <div className="font-bold text-amber-900">
                          Indirimbo: {detailsObj.songTitle} (#{detailsObj.songNumber || ''})
                        </div>
                        {detailsObj.changedFields && (
                          <div>
                            <span className="text-amber-800 font-semibold">Ibyahinduwe: </span>
                            <span className="font-mono text-amber-950 font-bold">
                              {detailsObj.changedFields.join(', ')}
                            </span>
                          </div>
                        )}
                        {detailsObj.previousValues && Object.keys(detailsObj.previousValues).length > 0 && (
                          <div className="pt-2 border-t border-amber-200/80 space-y-1 text-[11px]">
                            <div className="font-bold text-slate-700">Impinduka z'Ibanze (Before vs After):</div>
                            {Object.keys(detailsObj.previousValues).map(key => (
                              <div key={key} className="flex items-center justify-between bg-white/80 p-1.5 rounded-lg border border-amber-200/50 font-mono">
                                <span className="font-bold text-slate-700">{key}:</span>
                                <span className="text-rose-700 line-through mr-1">
                                  {String(detailsObj.previousValues[key] ?? 'N/A')}
                                </span>
                                <ChevronRight className="w-3 h-3 text-slate-400" />
                                <span className="text-emerald-700 font-bold ml-1">
                                  {String(detailsObj.newValues?.[key] ?? 'N/A')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bulk User Removal View */}
                    {detailsObj.actionType === 'BULK_USER_REMOVAL' && (
                      <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3 space-y-2 text-xs">
                        <div className="font-bold text-rose-900">
                          Gusiba Bose Hamwe: Abakoresha {detailsObj.count}
                        </div>
                        <div>
                          <span className="text-rose-800 font-semibold">Uburyo: </span>
                          <span className="font-mono font-bold text-rose-950">{detailsObj.mode}</span>
                        </div>
                        {detailsObj.reason && (
                          <div>
                            <span className="text-rose-800 font-semibold">Impamvu: </span>
                            <span className="text-slate-800">{detailsObj.reason}</span>
                          </div>
                        )}
                        {detailsObj.affectedUsers && detailsObj.affectedUsers.length > 0 && (
                          <div className="pt-2 border-t border-rose-200/80 space-y-1">
                            <span className="text-[11px] font-bold text-rose-900 block">
                              Abakoresha Bakozweho:
                            </span>
                            <div className="max-h-36 overflow-y-auto space-y-1">
                              {detailsObj.affectedUsers.map((u: any, idx: number) => (
                                <div key={idx} className="bg-white p-1.5 rounded-lg border border-rose-100 flex items-center justify-between text-[11px]">
                                  <span className="font-bold text-slate-800">{u.name || 'User'}</span>
                                  <span className="text-slate-500 font-mono">{u.email || u.id}</span>
                                  <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[10px]">
                                    {u.role}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CSV Export View */}
                    {detailsObj.actionType === 'CSV_EXPORT' && (
                      <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-3 space-y-2 text-xs">
                        <div className="font-bold text-indigo-900">
                          Gusohora CSV: Icyiciro cya "{detailsObj.category}"
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-indigo-800 font-semibold">Umubare w'Inyandiko:</span>
                          <span className="font-mono font-bold text-indigo-950">{detailsObj.count} records</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-indigo-800 font-semibold">Dosiye (Filename):</span>
                          <span className="font-mono text-slate-800 text-[11px]">{detailsObj.filename}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-slate-800">Ibisobanuro:</h4>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {selectedLog.details || 'Nta bisobanuro birambuye byatanzwe.'}
                  </div>
                </div>
              );
            })()}

            {/* Toggle Raw JSON View */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-xs font-bold text-blue-950 hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5 text-blue-900" />
                <span>{showRawJson ? 'Hisha Raw JSON' : 'Reba Raw JSON (Security Forensic)'}</span>
              </button>

              {showRawJson && (
                <pre className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-2xl text-[10px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              )}
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Funga (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
