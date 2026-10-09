import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EventItem, EventCategory, EventStatus, InterestedUser } from '../../types';
import { safeFetchJson, parseResponseSafely } from '../../utils/api';
import { ConfirmDialog } from './ConfirmDialog';
import {
  Calendar,
  Clock,
  MapPin,
  Heart,
  Plus,
  Edit2,
  Trash2,
  Users,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  X,
  Upload,
  RefreshCw,
  Ban,
  Eye,
  EyeOff,
  Download,
  Image as ImageIcon,
  Share2,
} from 'lucide-react';

interface AdminEventsTabProps {
  onRefreshOverview?: () => void;
}

export const AdminEventsTab: React.FC<AdminEventsTabProps> = ({ onRefreshOverview }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [editingEvent, setEditingEvent] = useState<Partial<EventItem> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [viewInterestedEvent, setViewInterestedEvent] = useState<EventItem | null>(null);
  const [interestedUsersList, setInterestedUsersList] = useState<InterestedUser[]>([]);
  const [isLoadingInterested, setIsLoadingInterested] = useState<boolean>(false);
  const [interestedSearch, setInterestedSearch] = useState<string>('');

  // Status banners
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch admin events
  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('lalumiere_token');
      const res = await safeFetchJson<EventItem[]>('/api/admin/events?include_deleted=false', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok && res.data) {
        setEvents(res.data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Real-time SSE synchronization for admin
  useEffect(() => {
    const es = new EventSource('/api/events/stream');
    eventSourceRef.current = es;

    es.addEventListener('event:interest', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        const { event_id, interested_count } = payload.data || payload;
        setEvents(prev =>
          prev.map(ev =>
            ev.id === event_id ? { ...ev, interested_count: interested_count ?? ev.interested_count } : ev
          )
        );
      } catch {
        fetchEvents();
      }
    });

    es.addEventListener('events:created', () => fetchEvents());
    es.addEventListener('events:updated', () => fetchEvents());
    es.addEventListener('events:deleted', () => fetchEvents());
    es.addEventListener('events:cancelled', () => fetchEvents());

    return () => {
      es.close();
    };
  }, [fetchEvents]);

  // Save Event (Create or Update)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !editingEvent.title?.trim() || !editingEvent.event_date?.trim()) {
      setErrorMsg('Umutwe n\'itariki y\'igikorwa birakenewe (Title and date required)');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const token = localStorage.getItem('lalumiere_token');
      const isNew = !editingEvent.id;
      const url = isNew ? '/api/admin/events' : `/api/admin/events/${editingEvent.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editingEvent.title.trim(),
          category: editingEvent.category || 'Choir Practice',
          event_date: editingEvent.event_date.trim(),
          start_time: editingEvent.start_time || '15:00',
          end_time: editingEvent.end_time || '18:00',
          location: editingEvent.location?.trim() || '',
          description: editingEvent.description?.trim() || '',
          image_url: editingEvent.image_url?.trim() || '',
          status: editingEvent.status || 'published',
          event_status: editingEvent.event_status || 'upcoming',
        }),
      });

      const { data, errorMessage } = await parseResponseSafely<any>(res);
      if (!res.ok) {
        throw new Error(errorMessage || 'Failed to save event');
      }

      setSuccessMsg(
        isNew
          ? 'Igikorwa gishya cyashyizwemo neza!'
          : 'Igikorwa cyavuguruwe neza muri gahunda!'
      );
      setTimeout(() => setSuccessMsg(''), 3500);

      setEditingEvent(null);
      fetchEvents();
      if (onRefreshOverview) onRefreshOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Habaye ikosa mu kubika igikorwa');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Event with Confirmation
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const token = localStorage.getItem('lalumiere_token');
      const res = await fetch(`/api/admin/events/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to delete event');
      }

      setSuccessMsg(`Igikorwa "${deleteTarget.title}" cyasibwe neza.`);
      setTimeout(() => setSuccessMsg(''), 3000);
      setDeleteTarget(null);
      fetchEvents();
      if (onRefreshOverview) onRefreshOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Ikosa mu gusiba igikorwa');
    }
  };

  // Toggle Publish / Unpublish Status
  const handleTogglePublish = async (eventItem: EventItem) => {
    try {
      const token = localStorage.getItem('lalumiere_token');
      const nextStatus = eventItem.status === 'published' ? 'draft' : 'published';

      const res = await fetch(`/api/admin/events/${eventItem.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) throw new Error('Status update failed');

      setSuccessMsg(
        nextStatus === 'published'
          ? `Igikorwa "${eventItem.title}" cyashyizwe ku mugaragaro (Published)!`
          : `Igikorwa "${eventItem.title}" cyakuwe ku mugaragaro (Draft)!`
      );
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchEvents();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Cancel Event
  const handleCancelEvent = async (eventItem: EventItem) => {
    if (!window.confirm(`Waba wizeye ko ushaka guhagarika (Cancel) igikorwa "${eventItem.title}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('lalumiere_token');
      const res = await fetch(`/api/admin/events/${eventItem.id}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to cancel event');

      setSuccessMsg(`Igikorwa "${eventItem.title}" cyahagaritswe (Cancelled).`);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchEvents();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Open Interested Users Modal
  const handleOpenInterestedModal = async (ev: EventItem) => {
    setViewInterestedEvent(ev);
    setIsLoadingInterested(true);
    setInterestedSearch('');

    try {
      const token = localStorage.getItem('lalumiere_token');
      const res = await fetch(`/api/admin/events/${ev.id}/interested-users`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setInterestedUsersList(data.users || []);
      }
    } catch (err) {
      console.warn('Could not load interested users:', err);
    } finally {
      setIsLoadingInterested(false);
    }
  };

  // Export Interested Users to CSV
  const handleExportInterestedCSV = () => {
    if (!viewInterestedEvent || interestedUsersList.length === 0) return;

    const headers = ['Amazina (Full Name)', 'Email', 'Telefoni (Phone)', 'Ijwi rya Korali (Voice)', 'Urwego (Role)', 'Itariki yo Kwiyandikisha'];
    const rows = interestedUsersList.map(u => [
      `"${(u.name || '').replace(/"/g, '""')}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      `"'${(u.phone || '').replace(/"/g, '""')}"`,
      `"${(u.choir_voice || '').replace(/"/g, '""')}"`,
      `"${(u.role || '').replace(/"/g, '""')}"`,
      `"${(u.created_at || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `la-lumiere-abitabiriye-${viewInterestedEvent.title.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
  };

  // Export Filtered Events List to CSV
  const handleExportEventsCsv = async () => {
    try {
      const token = localStorage.getItem('lalumiere_token') || '';
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/admin/export/events?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filenameDate = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `la-lumiere-events-${filenameDate}.csv`);
      document.body.appendChild(link);
      link.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export events to CSV:', err);
    }
  };

  // Handle Event Poster Image Upload
  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const token = localStorage.getItem('lalumiere_token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const { data, errorMessage } = await parseResponseSafely<{ url: string }>(res);
      if (res.ok && data?.url) {
        setEditingEvent(prev => (prev ? { ...prev, image_url: data.url } : null));
        setSuccessMsg('Ifoto / Poster yashyizwemo neza!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        throw new Error(errorMessage || 'Upload failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Habaye ikosa mu gushyiraho ifoto');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Filtered Events List
  const filteredEvents = events.filter(ev => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        ev.title.toLowerCase().includes(q) ||
        (ev.location && ev.location.toLowerCase().includes(q)) ||
        (ev.description && ev.description.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (categoryFilter !== 'all') {
      const cat = (ev.category || '').toLowerCase();
      if (!cat.includes(categoryFilter.toLowerCase())) return false;
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'published' && ev.status !== 'published') return false;
      if (statusFilter === 'draft' && ev.status !== 'draft') return false;
      if (statusFilter === 'cancelled' && ev.event_status !== 'cancelled') return false;
    }

    return true;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 font-serif flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-900" />
              <span>Gucunga Ibikorwa bya Korali (Events Management)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tegura, vugurura, siba cyangwa uhagarike amatariki y'imyitozo, ibitaramo n'ivugabutumwa.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={fetchEvents}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Vugurura (Refresh)"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleExportEventsCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Gukuramo Ibikorwa muri CSV"
            >
              <Download className="w-3.5 h-3.5 text-blue-900" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() =>
                setEditingEvent({
                  title: '',
                  category: 'Choir Practice',
                  event_date: new Date().toISOString().split('T')[0],
                  start_time: '15:00',
                  end_time: '18:00',
                  location: 'ADEPR Nyanza - Choir Hall, Kicukiro',
                  description: '',
                  image_url: '',
                  status: 'published',
                  event_status: 'upcoming',
                })
              }
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Ongera Igikorwa Gishya</span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Shakisha igikorwa, ahantu..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900"
            >
              <option value="all">Ibyiciro Byose (All Categories)</option>
              <option value="practice">Imyitozo (Choir Practice)</option>
              <option value="ministry">Ivugabutumwa (Ministry Event)</option>
              <option value="performance">Ibitaramo Byihariye (Special)</option>
              <option value="concert">Concerts (Ibitaramo Bikomeye)</option>
              <option value="worship">Ijoro ryo Kuramya (Worship Night)</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900"
            >
              <option value="all">Imimerere Yose (All Statuses)</option>
              <option value="published">Published (Ku mugaragaro)</option>
              <option value="draft">Draft (Inyandiko mbanziriza)</option>
              <option value="cancelled">Cancelled (Byahagaritswe)</option>
            </select>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Events Table / List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Gufungura ibikorwa...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Nta gikorwa kiguye mu byatoranyijwe. Kanda "Ongera Igikorwa Gishya" hejuru.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredEvents.map(ev => {
              const isCancelled = ev.event_status === 'cancelled';
              const isDraft = ev.status === 'draft';
              const interestedCount = ev.interested_count || 0;

              return (
                <div
                  key={ev.id}
                  className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                    isCancelled ? 'bg-slate-50/80 opacity-80' : 'hover:bg-slate-50/50'
                  }`}
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Poster Thumbnail */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-900 shrink-0 border border-slate-200 relative">
                      {ev.image_url ? (
                        <img
                          src={ev.image_url}
                          alt={ev.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-amber-400 bg-blue-950">
                          <Calendar className="w-6 h-6" />
                        </div>
                      )}
                      {isCancelled && (
                        <div className="absolute inset-0 bg-rose-950/70 flex items-center justify-center text-white text-[9px] font-bold uppercase text-center p-0.5">
                          Cancelled
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-blue-50 text-blue-900 border border-blue-200">
                          {ev.category || 'Choir Event'}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isDraft
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {isDraft ? 'Draft' : 'Published'}
                        </span>

                        {isCancelled && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            Byahagaritswe
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 font-serif leading-snug">
                        {ev.title}
                      </h3>

                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-blue-900" />
                          <span>{ev.event_date}</span>
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>
                            {ev.start_time || '15:00'} - {ev.end_time || '18:00'}
                          </span>
                        </span>

                        {ev.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            <span className="truncate max-w-[200px]">{ev.location}</span>
                          </span>
                        )}
                      </div>

                      {ev.description && (
                        <p className="text-xs text-slate-600 line-clamp-1 max-w-xl">
                          {ev.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Interested Users & Controls */}
                  <div className="flex items-center justify-between lg:justify-end gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                    {/* View Interested Users Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenInterestedModal(ev)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-rose-200/80"
                      title="Reba abantu biyandikishije kwitabira"
                    >
                      <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                      <span>{interestedCount} Bifuza kwitabira</span>
                    </button>

                    {/* Publish / Unpublish Toggle */}
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(ev)}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        isDraft
                          ? 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'
                          : 'text-emerald-700 hover:text-slate-600 hover:bg-slate-100'
                      }`}
                      title={isDraft ? 'Tangaza (Publish)' : 'Kura ku mugaragaro (Unpublish)'}
                    >
                      {isDraft ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>

                    {/* Cancel Event Button */}
                    {!isCancelled && (
                      <button
                        type="button"
                        onClick={() => handleCancelEvent(ev)}
                        className="p-2 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
                        title="Hagarika iki gikorwa (Cancel Event)"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => setEditingEvent(ev)}
                      className="p-2 text-slate-600 hover:text-blue-900 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                      title="Hindura (Edit)"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(ev)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Siba burundu (Delete)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= CREATE / EDIT EVENT MODAL ================= */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-900" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 font-serif">
                  {editingEvent.id ? 'Hindura Igikorwa (Edit Event)' : 'Ongeraho Igikorwa Gishya (New Event)'}
                </h3>
              </div>
              <button
                onClick={() => setEditingEvent(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-3.5 text-xs">
              {/* Title */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Umutwe w'Igikorwa (Event Title) *
                </label>
                <input
                  type="text"
                  required
                  value={editingEvent.title || ''}
                  onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  placeholder="urugero: Ijoro ryo Guhimbaza Imana / Imyitozo Rusange"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              {/* Category & Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Icyiciro (Category) *
                  </label>
                  <select
                    value={editingEvent.category || 'Choir Practice'}
                    onChange={e => setEditingEvent({ ...editingEvent, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="Choir Practice">Imyitozo ya Korali (Choir Practice)</option>
                    <option value="Ministry Event">Ivugabutumwa (Ministry Event)</option>
                    <option value="Special Performance">Ibitaramo Byihariye (Special Performance)</option>
                    <option value="Concert">Concerts (Ibitaramo Bikomeye)</option>
                    <option value="Worship Night">Ijoro ryo Kuramya (Worship Night)</option>
                    <option value="Fellowship">Ubusabane & Amateraniro (Fellowship)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Imimerere yo Gutangaza (Publication)
                  </label>
                  <select
                    value={editingEvent.status || 'published'}
                    onChange={e =>
                      setEditingEvent({ ...editingEvent, status: e.target.value as any })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
                  >
                    <option value="published">Published (Kigaragare ku rubuga)</option>
                    <option value="draft">Draft (Bika nk'inyandiko mbanziriza)</option>
                  </select>
                </div>
              </div>

              {/* Date, Start Time, End Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Itariki (Date) *
                  </label>
                  <input
                    type="date"
                    required
                    value={editingEvent.event_date || ''}
                    onChange={e => setEditingEvent({ ...editingEvent, event_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Isaha yo Gutangira
                  </label>
                  <input
                    type="time"
                    value={editingEvent.start_time || '15:00'}
                    onChange={e => setEditingEvent({ ...editingEvent, start_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Isaha yo Gusoza
                  </label>
                  <input
                    type="time"
                    value={editingEvent.end_time || '18:00'}
                    onChange={e => setEditingEvent({ ...editingEvent, end_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
                  />
                </div>
              </div>

              {/* Venue / Location */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ahobizabera (Venue / Location)
                </label>
                <input
                  type="text"
                  value={editingEvent.location || ''}
                  onChange={e => setEditingEvent({ ...editingEvent, location: e.target.value })}
                  placeholder="urugero: ADEPR Nyanza Main Sanctuary, Kicukiro District"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ibisobanuro birambuye (Description)
                </label>
                <textarea
                  rows={3}
                  value={editingEvent.description || ''}
                  onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  placeholder="Sobanura gahunda, amatsinda azaba ahari, n'ibindi..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 leading-relaxed text-xs"
                />
              </div>

              {/* Poster / Artwork Upload or URL */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Poster cyangwa Ifoto y'Igikorwa (Event Image)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={editingEvent.image_url || ''}
                    onChange={e => setEditingEvent({ ...editingEvent, image_url: e.target.value })}
                    placeholder="https://... (URL) cyangwa kanda buto yo guhitamo ifoto"
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-800"
                  />

                  <label className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingImage ? 'Gushyiraho...' : 'Hitamo Ifoto'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePosterUpload}
                      disabled={isUploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>

                {editingEvent.image_url && (
                  <div className="mt-2 relative w-24 h-16 rounded-xl overflow-hidden border border-slate-200">
                    <img
                      src={editingEvent.image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setEditingEvent({ ...editingEvent, image_url: '' })}
                      className="absolute top-1 right-1 p-0.5 bg-slate-900/80 text-white rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Reka (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-950 hover:bg-blue-900 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Kubika...' : editingEvent.id ? 'Bika Impinduka' : 'Tangaza Igikorwa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= VIEW INTERESTED USERS MODAL ================= */}
      {viewInterestedEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 mb-1 inline-block">
                  {viewInterestedEvent.category || 'Event'}
                </span>
                <h3 className="font-extrabold text-base text-slate-900 font-serif">
                  Abitabiriye / Bifuza Kwitabira: {viewInterestedEvent.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {viewInterestedEvent.event_date} • {viewInterestedEvent.location || 'ADEPR Nyanza'}
                </p>
              </div>
              <button
                onClick={() => setViewInterestedEvent(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-bar with count, search and export */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900">
                  {interestedUsersList.length} Abantu babyifuje
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={interestedSearch}
                  onChange={e => setInterestedSearch(e.target.value)}
                  placeholder="Shakisha umunyamuryango..."
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs text-slate-800"
                />

                <button
                  type="button"
                  onClick={handleExportInterestedCSV}
                  disabled={interestedUsersList.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 border border-slate-200/80 rounded-2xl">
              {isLoadingInterested ? (
                <div className="p-8 text-center text-xs text-slate-400">Gufungura abanyamuryango...</div>
              ) : interestedUsersList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Nta muntu uriyandikisha kuri iki gikorwa kugeza ubu.
                </div>
              ) : (
                interestedUsersList
                  .filter(u => {
                    if (!interestedSearch.trim()) return true;
                    const q = interestedSearch.toLowerCase();
                    return (
                      u.name?.toLowerCase().includes(q) ||
                      u.email?.toLowerCase().includes(q) ||
                      u.phone?.toLowerCase().includes(q) ||
                      u.choir_voice?.toLowerCase().includes(q)
                    );
                  })
                  .map(u => (
                    <div
                      key={u.user_id}
                      className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-blue-900 text-amber-300 font-bold flex items-center justify-center shrink-0">
                          {u.name?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 truncate">{u.name}</h4>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            {u.email && <span>{u.email}</span>}
                            {u.phone && <span>• {u.phone}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {u.choir_voice && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                            {u.choir_voice}
                          </span>
                        )}
                        {u.created_at && (
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            {new Date(u.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Delete */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Gusiba Igikorwa cya Korali"
        message={`Waba wizeye ko ushaka gusiba igikorwa "${deleteTarget?.title}"? Ibi bizagikura mu bikorwa biteganyijwe bya Korali.`}
        confirmText="Yego, Siba Igikorwa"
        cancelText="Reka"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
