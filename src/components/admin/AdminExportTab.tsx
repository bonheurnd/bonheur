import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Download,
  Users,
  HeartHandshake,
  Calendar,
  BookOpen,
  UserCheck,
  ShieldCheck,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Filter,
  FileCheck,
  Info,
  Clock,
  Search,
} from 'lucide-react';

export type ExportCategoryKey =
  | 'members'
  | 'donations'
  | 'events'
  | 'songs'
  | 'attendance'
  | 'activity_logs'
  | 'pledges';

interface CategoryOption {
  key: ExportCategoryKey;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultFilenamePrefix: string;
  primaryColor: string;
}

const CATEGORIES: CategoryOption[] = [
  {
    key: 'members',
    title: 'Abanyamuryango (Members)',
    subtitle: 'Users & Choir Members',
    description: 'Amazina, telefone, imeyili, inshingano, ijwi muri korali, imiterere, n\'itariki yo kwiyandikisha.',
    icon: Users,
    defaultFilenamePrefix: 'la-lumiere-members',
    primaryColor: 'from-blue-600 to-indigo-700',
  },
  {
    key: 'donations',
    title: 'Inkunga n\'Impano (Donations)',
    subtitle: 'Financial & Payment Transactions',
    description: 'Inyemezabwishyu za MTN MoMo / Airtel Money, amazina y\'abatanze inkunga, amafaranga, n\'itariki.',
    icon: HeartHandshake,
    defaultFilenamePrefix: 'la-lumiere-donations',
    primaryColor: 'from-emerald-600 to-teal-700',
  },
  {
    key: 'events',
    title: 'Ibikorwa n\'Ibitaramo (Events)',
    subtitle: 'Concerts & Rehearsals Schedule',
    description: 'Umutwe w\'igikorwa, itariki, amasaha, aho bizabera, icyiciro, n\'umubare w\'abagaragaje ubushake.',
    icon: Calendar,
    defaultFilenamePrefix: 'la-lumiere-events',
    primaryColor: 'from-amber-600 to-orange-700',
  },
  {
    key: 'songs',
    title: 'Igitabo cy\'Indirimbo (Songs)',
    subtitle: 'Choir Hymns & Lyrics Catalog',
    description: 'Nimero y\'indirimbo, umutwe, uwahimbye, icyiciro, incamake y\'amagambo, amanota, n\'amajwi ahari.',
    icon: BookOpen,
    defaultFilenamePrefix: 'la-lumiere-songs',
    primaryColor: 'from-purple-600 to-violet-700',
  },
  {
    key: 'attendance',
    title: 'Ubwitabire bw\'Ibikorwa (RSVP Attendance)',
    subtitle: 'Event Registrations & Interested Members',
    description: 'Urutonde rw\'abanyamuryango n\'abakunzi ba Korali biyandikishije kugaragaza ubushake bwo kwitabira.',
    icon: UserCheck,
    defaultFilenamePrefix: 'la-lumiere-attendance',
    primaryColor: 'from-cyan-600 to-blue-700',
  },
  {
    key: 'activity_logs',
    title: 'Raporo y\'Ubugenzuzi (Activity Logs)',
    subtitle: 'Administrative Audit Trail',
    description: 'Ibikorwa byose byakozwe n\'abayobozi muri sisitemu, igihe byakoreweho, n\'ibisobanuro.',
    icon: ShieldCheck,
    defaultFilenamePrefix: 'la-lumiere-activity-logs',
    primaryColor: 'from-slate-700 to-slate-900',
  },
];

export const AdminExportTab: React.FC = () => {
  const { token } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<ExportCategoryKey>('members');
  const [dateRangePreset, setDateRangePreset] = useState<'all' | 'today' | '7days' | '30days' | 'year' | 'custom'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Preview State
  const [previewData, setPreviewData] = useState<{
    count: number;
    headers: string[];
    sampleRows: string[][];
    filename: string;
    isEmpty: boolean;
  } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null);

  // Compute actual date filters based on preset
  const computeDates = useCallback(() => {
    const today = new Date();
    const format = (d: Date) => d.toISOString().split('T')[0];

    if (dateRangePreset === 'all') {
      return { from: '', to: '' };
    }
    if (dateRangePreset === 'today') {
      const dStr = format(today);
      return { from: dStr, to: dStr };
    }
    if (dateRangePreset === '7days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 7);
      return { from: format(past), to: format(today) };
    }
    if (dateRangePreset === '30days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 30);
      return { from: format(past), to: format(today) };
    }
    if (dateRangePreset === 'year') {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      return { from: format(startOfYear), to: format(today) };
    }
    return { from: dateFrom, to: dateTo };
  }, [dateRangePreset, dateFrom, dateTo]);

  // Load preview data from server
  const loadPreview = useCallback(async () => {
    setIsLoadingPreview(true);
    setPreviewError(null);

    const dates = computeDates();
    const params = new URLSearchParams();
    params.set('category', selectedCategory);
    if (dates.from) params.set('date_from', dates.from);
    if (dates.to) params.set('date_to', dates.to);
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    if (roleFilter && roleFilter !== 'all') params.set('role', roleFilter);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());

    try {
      const authToken = token || localStorage.getItem('lalumiere_token') || '';
      const res = await fetch(`/api/admin/export/preview?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to fetch preview (${res.status})`);
      }

      const data = await res.json();
      setPreviewData(data);
    } catch (err: any) {
      console.error('Failed to load export preview:', err);
      setPreviewError(err.message || 'Habaye ikosa mu gusuzuma imibare y\'amakuru yo kohereza.');
      setPreviewData(null);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [selectedCategory, computeDates, statusFilter, roleFilter, searchQuery, token]);

  // Trigger preview update on changes
  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  // Reset secondary filters when category changes
  const handleSelectCategory = (cat: ExportCategoryKey) => {
    setSelectedCategory(cat);
    setStatusFilter('all');
    setRoleFilter('all');
    setExportSuccessMessage(null);
    setExportErrorMessage(null);
  };

  // Perform CSV Download
  const handleExecuteExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportSuccessMessage(null);
    setExportErrorMessage(null);

    const dates = computeDates();
    const params = new URLSearchParams();
    if (dates.from) params.set('date_from', dates.from);
    if (dates.to) params.set('date_to', dates.to);
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    if (roleFilter && roleFilter !== 'all') params.set('role', roleFilter);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());

    try {
      const authToken = token || localStorage.getItem('lalumiere_token') || '';
      const url = `/api/admin/export/${selectedCategory}?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        let errorText = 'Habaye ikosa mu gukuramo dosiye ya CSV.';
        try {
          const errObj = await response.json();
          errorText = errObj.error || errorText;
        } catch {
          errorText = `Ikosa rya seriveri (${response.status}: ${response.statusText})`;
        }
        throw new Error(errorText);
      }

      // Extract filename from response header if available
      let downloadFilename = previewData?.filename || `la-lumiere-${selectedCategory}-${new Date().toISOString().split('T')[0]}.csv`;
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.includes('filename=')) {
        const matches = disposition.match(/filename="?([^"]+)"?/);
        if (matches && matches[1]) {
          downloadFilename = matches[1];
        }
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      const count = previewData?.count ?? 0;
      setExportSuccessMessage(
        `Dosiye "${downloadFilename}" yakiriwe neza! Inyandiko ${count.toLocaleString()} zo muri ${selectedCategory} zoherejwe muri CSV.`
      );
    } catch (err: any) {
      console.error('Export download failed:', err);
      setExportErrorMessage(err.message || 'Habaye ikosa mu gukuramo dosiye ya CSV. Ongera ugerageze.');
    } finally {
      setIsExporting(false);
    }
  };

  const currentCategoryMeta = CATEGORIES.find(c => c.key === selectedCategory) || CATEGORIES[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 sm:p-7 shadow-lg border border-blue-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 text-xs font-bold uppercase tracking-wider">
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <span>Gukuramo Dosiye za CSV (Official Data Export)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-serif tracking-tight">
              Kwohereza Amakuru muri CSV (Data Export CMS)
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Kura amakuru yose ya Korali La Lumiere muri dosiye za CSV zujuje ubuziranenge (UTF-8 BOM), zifunguka mu buryo bwizewe muri Microsoft Excel, Google Sheets, na LibreOffice.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <button
              onClick={loadPreview}
              disabled={isLoadingPreview}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              title="Vugurura imibare"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPreview ? 'animate-spin' : ''}`} />
              <span>Vugurura</span>
            </button>
          </div>
        </div>

        {/* Security and Quality Badges */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-3 text-[11px] text-slate-300 font-medium">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            UTF-8 BOM (Excel Compatibility)
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            Formula Injection Protected
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            Leading Zeros Preserved for Phones
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
            Real Database Records Only
          </span>
        </div>
      </div>

      {/* Notifications */}
      {exportSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{exportSuccessMessage}</span>
          </div>
          <button
            onClick={() => setExportSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
          >
            Funga
          </button>
        </div>
      )}

      {exportErrorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-900 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{exportErrorMessage}</span>
          </div>
          <button
            onClick={() => setExportErrorMessage(null)}
            className="text-red-700 hover:text-red-900 font-bold text-xs"
          >
            Funga
          </button>
        </div>
      )}

      {/* 1. Category Selection Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span>1. Hitamo Icyiciro cy'Amakuru Ushaka Kwohereza</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
            Ibyiciro {CATEGORIES.length} biri muri sisitemu
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.key;

            return (
              <button
                key={cat.key}
                onClick={() => handleSelectCategory(cat.key)}
                className={`p-4 rounded-2xl text-left border transition-all cursor-pointer relative flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-blue-950 text-white border-blue-900 shadow-md ring-2 ring-blue-900/30'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-white/15 text-amber-300'
                        : 'bg-slate-100 text-blue-950'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  {isSelected && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                      Byatoranyijwe
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-extrabold text-sm tracking-tight">{cat.title}</h4>
                  <p
                    className={`text-[11px] font-medium mt-0.5 ${
                      isSelected ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {cat.subtitle}
                  </p>
                  <p
                    className={`text-[11px] leading-relaxed mt-1 line-clamp-2 ${
                      isSelected ? 'text-slate-300/90' : 'text-slate-600'
                    }`}
                  >
                    {cat.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Filters & Date Range Controls */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-950" />
            <h3 className="font-black text-sm text-slate-900">
              2. Amashungura n'Igihe (Date Ranges & Category Filters)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Ibyiciro bishunguye: {currentCategoryMeta.title}
          </span>
        </div>

        {/* Date Presets */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            Igihe cy'Amakuru (Date Period):
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'Igihe Cyose (All Time)' },
              { id: 'today', label: 'Uyu Munsi (Today)' },
              { id: '7days', label: 'Iminsi 7 Ishize' },
              { id: '30days', label: 'Ukwezi Gushize (30 Days)' },
              { id: 'year', label: 'Uyu Mwaka (This Year)' },
              { id: 'custom', label: 'Hitamo Amatariki (Custom Range)' },
            ].map(preset => {
              const isActive = dateRangePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setDateRangePreset(preset.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-950 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Date Range Inputs */}
        {dateRangePreset === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kuva ku itariki (Date From):
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-950 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kugeza ku itariki (Date To):
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-950 outline-hidden"
              />
            </div>
          </div>
        )}

        {/* Dynamic Category-Specific Secondary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Members Specific Filter */}
          {selectedCategory === 'members' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Imiterere y'Umunyamuryango (Status):
                </label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer"
                >
                  <option value="all">Bose (All Statuses)</option>
                  <option value="active">Abakora gusa (Active only)</option>
                  <option value="disabled">Abahagaritswe gusa (Disabled)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Inshingano (Role):
                </label>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer"
                >
                  <option value="all">Inshingano zose (All Roles)</option>
                  <option value="choir_member">Abaririmbyi (Choir Members)</option>
                  <option value="super_admin">Abayobozi Bakuru (Super Admins)</option>
                  <option value="admin">Abayobozi (Admins)</option>
                  <option value="content_admin">Abashinzwe Ibirimo (Content Leads)</option>
                  <option value="moderator">Abagenzuzi (Moderators)</option>
                  <option value="supporter">Abafatanyabikorwa (Supporters)</option>
                  <option value="normal_user">Abaririmbyi b'itorero (Normal Users)</option>
                </select>
              </div>
            </>
          )}

          {/* Donations Specific Filter */}
          {selectedCategory === 'donations' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Imiterere y'Ubwishyu (Payment Status):
                </label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer"
                >
                  <option value="all">Imiterere yose (All Transactions)</option>
                  <option value="successful">Ibyagenze neza (Successful only)</option>
                  <option value="pending">Ibigitegerejwe (Pending / Processing)</option>
                  <option value="failed">Ibyanze (Failed)</option>
                  <option value="cancelled">Ibyahagaritswe (Cancelled / Refunded)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Uburyo bwo Kwishyura (Provider):
                </label>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer"
                >
                  <option value="all">Uburyo bwose (All Providers)</option>
                  <option value="mtn-momo">MTN Mobile Money</option>
                  <option value="airtel-money">Airtel Money</option>
                </select>
              </div>
            </>
          )}

          {/* Events Specific Filter */}
          {selectedCategory === 'events' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Imiterere y'Igikorwa (Event Status):
                </label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer"
                >
                  <option value="all">Ibikorwa byose (All)</option>
                  <option value="upcoming">Ibiteganyijwe (Upcoming)</option>
                  <option value="ongoing">Ibirimo gukorwa (Ongoing)</option>
                  <option value="completed">Ibyarangiye (Completed)</option>
                  <option value="cancelled">Ibyasubitswe (Cancelled)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Gushyirwa ku Karubanda (Publish Status):
                </label>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer"
                >
                  <option value="all">Byose (All)</option>
                  <option value="published">Byatangajwe (Published)</option>
                  <option value="draft">Inyandiko y'ibanze (Draft)</option>
                </select>
              </div>
            </>
          )}

          {/* Songs Specific Filter */}
          {selectedCategory === 'songs' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Imiterere yo Gusohoka (Release Status):
              </label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer"
              >
                <option value="all">Indirimbo zose (All Songs)</option>
                <option value="released">Izasohotse ku mugaragaro (Released)</option>
                <option value="unreleased">Ibitarasohoka by'amabanga (Unreleased)</option>
              </select>
            </div>
          )}

          {/* Search Query Filter */}
          <div className={selectedCategory === 'songs' || selectedCategory === 'pledges' || selectedCategory === 'activity_logs' ? 'sm:col-span-2' : ''}>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Shakisha (Optional Search / Keyword):
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Shakisha izina, telefone, cyangwa umutwe..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-950 outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Pre-Export Summary & Data Inspection Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-950" />
              <h3 className="font-black text-sm text-slate-900">
                3. Isubiramo ry'Amakuru Agiye Koherezwa (Pre-Export Inspection)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Reba umubare n'ingero z'amakuru ari buhite yandikwa muri dosiye ya CSV yawe mbere yo kuyikuramo.
            </p>
          </div>

          {/* Record Count Badge */}
          <div className="flex items-center gap-2">
            {isLoadingPreview ? (
              <div className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-500 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Gusesengura...</span>
              </div>
            ) : previewData ? (
              <div
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 ${
                  previewData.count > 0
                    ? 'bg-blue-50 text-blue-950 border border-blue-200'
                    : 'bg-amber-50 text-amber-900 border border-amber-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>
                  {previewData.count.toLocaleString()} {previewData.count === 1 ? 'inyandiko' : 'inyandiko'}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Empty state notice */}
        {!isLoadingPreview && previewData && previewData.count === 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs sm:text-sm font-medium flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-950">Nta makuru ahuye n'ibyo mwashunguye abonetse (No records found)</p>
              <p className="text-xs text-amber-800">
                Guhitamo itariki itarimo ibikorwa cyangwa amashungura akaze bishobora kuba byatumye nta makuru aboneka. Hindura igihe cyangwa uhitemo "Igihe Cyose (All Time)" kugira ngo ubone amakuru.
              </p>
            </div>
          </div>
        )}

        {/* Columns & Sample Preview Table */}
        {previewData && previewData.headers && previewData.headers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
              <span>Inkingi {previewData.headers.length} ziteguye muri dosiye ya CSV (CSV Columns):</span>
              {previewData.filename && (
                <span className="font-mono text-slate-600">{previewData.filename}</span>
              )}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50/50">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700">
                    <th className="p-2.5 font-bold text-[11px] uppercase tracking-wider text-slate-500 w-10 text-center">#</th>
                    {previewData.headers.map((h, i) => (
                      <th key={i} className="p-2.5 font-bold whitespace-nowrap text-slate-800">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.sampleRows && previewData.sampleRows.length > 0 ? (
                    previewData.sampleRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-blue-50/40 transition-colors">
                        <td className="p-2.5 text-center text-[10px] text-slate-400 font-mono">
                          {rIdx + 1}
                        </td>
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className="p-2.5 whitespace-nowrap text-slate-600 max-w-[200px] truncate font-medium"
                            title={cell}
                          >
                            {cell || <span className="text-slate-300 italic">Empty</span>}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={previewData.headers.length + 1}
                        className="p-6 text-center text-xs text-slate-400 font-medium italic"
                      >
                        Nta ngero z'amakuru ziri mu bubiko muri iki gihe.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {previewData.sampleRows && previewData.sampleRows.length > 0 && previewData.count > previewData.sampleRows.length && (
              <p className="text-[11px] text-slate-400 italic">
                * Hagaragajwe ingero {previewData.sampleRows.length} za mbere gusa. Dosiye yuzuye izaba irimo inyandiko zose uko ari {previewData.count.toLocaleString()}.
              </p>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Itariki yo gukuramo dosiye: {new Date().toLocaleDateString('rw-RW')}</span>
          </div>

          <button
            onClick={handleExecuteExport}
            disabled={isExporting || (previewData?.count === 0 && !isLoadingPreview)}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm text-white shadow-md transition-all cursor-pointer ${
              isExporting || (previewData?.count === 0 && !isLoadingPreview)
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-blue-950 hover:bg-blue-900 active:scale-98 hover:shadow-lg'
            }`}
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Gutegura no Kwohereza CSV...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-amber-300" />
                <span>
                  Gukuramo Dosiye ya CSV ({previewData?.count ? previewData.count.toLocaleString() : 0} Records)
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4. Quick Export Shortcuts Cards */}
      <div className="space-y-3">
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
          Gukuramo Dosiye Byihuse (One-Click Quick Exports):
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => {
              setSelectedCategory('members');
              setStatusFilter('active');
              setDateRangePreset('all');
            }}
            className="p-3.5 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 text-left transition-all shadow-2xs hover:border-blue-300 cursor-pointer flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-950 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900">Abaririmbyi Bakora</p>
              <p className="text-[10px] text-slate-500">Active Choir Members</p>
            </div>
          </button>

          <button
            onClick={() => {
              setSelectedCategory('donations');
              setStatusFilter('successful');
              setDateRangePreset('all');
            }}
            className="p-3.5 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 text-left transition-all shadow-2xs hover:border-emerald-300 cursor-pointer flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-950 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900">Inkunga Zemejwe</p>
              <p className="text-[10px] text-slate-500">Successful Donations</p>
            </div>
          </button>

          <button
            onClick={() => {
              setSelectedCategory('events');
              setStatusFilter('upcoming');
              setDateRangePreset('all');
            }}
            className="p-3.5 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 text-left transition-all shadow-2xs hover:border-amber-300 cursor-pointer flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-950 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900">Ibikorwa Biteganyijwe</p>
              <p className="text-[10px] text-slate-500">Upcoming Events</p>
            </div>
          </button>

          <button
            onClick={() => {
              setSelectedCategory('songs');
              setStatusFilter('all');
              setDateRangePreset('all');
            }}
            className="p-3.5 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 text-left transition-all shadow-2xs hover:border-purple-300 cursor-pointer flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-950 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-purple-700" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900">Igitabo cy'Indirimbo</p>
              <p className="text-[10px] text-slate-500">Complete Song Catalog</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
