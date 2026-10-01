import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EventItem, EventCategory } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  Clock,
  MapPin,
  Heart,
  ChevronRight,
  Share2,
  CalendarPlus,
  X,
  Sparkles,
  Users,
  Check,
  Music,
  Mic,
  Flame,
  Radio,
  Filter,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface UpcomingEventsSectionProps {
  onOpenAuth?: () => void;
  className?: string;
}

export const UpcomingEventsSection: React.FC<UpcomingEventsSectionProps> = ({
  onOpenAuth,
  className = '',
}) => {
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [interestLoadingId, setInterestLoadingId] = useState<string | null>(null);
  const [selectedEventModal, setSelectedEventModal] = useState<EventItem | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState<boolean>(false);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<{ id: string; message: string; type: 'success' | 'info' } | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Load events from server
  const loadEvents = useCallback(async (categoryFilter = selectedCategory) => {
    try {
      const token = localStorage.getItem('lalumiere_token');
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const categoryParam = categoryFilter !== 'all' ? `&category=${encodeURIComponent(categoryFilter)}` : '';
      const res = await fetch(`/api/events?upcoming_only=true${categoryParam}`, { headers });
      if (res.ok) {
        const data: EventItem[] = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.warn('Could not fetch upcoming events:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents, isAuthenticated]);

  // Real-time synchronization via Server-Sent Events (SSE)
  useEffect(() => {
    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource('/api/events/stream');
      eventSourceRef.current = es;

      es.addEventListener('event:interest', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          const { event_id, interested_count, user_id, is_interested } = payload.data || payload;

          setEvents(prevEvents =>
            prevEvents.map(ev => {
              if (ev.id === event_id) {
                const isCurrentUser = user && user.id === user_id;
                return {
                  ...ev,
                  interested_count: interested_count !== undefined ? interested_count : ev.interested_count,
                  is_interested: isCurrentUser ? is_interested : ev.is_interested,
                };
              }
              return ev;
            })
          );
        } catch (err) {
          console.warn('Error parsing SSE event:interest', err);
        }
      });

      es.addEventListener('events:created', () => {
        loadEvents();
      });

      es.addEventListener('events:updated', () => {
        loadEvents();
      });

      es.addEventListener('events:deleted', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          const deletedId = payload.data?.id || payload.id;
          if (deletedId) {
            setEvents(prev => prev.filter(ev => ev.id !== deletedId));
          } else {
            loadEvents();
          }
        } catch {
          loadEvents();
        }
      });

      es.addEventListener('events:cancelled', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          const cancelledId = payload.data?.id || payload.id;
          if (cancelledId) {
            setEvents(prev =>
              prev.map(ev => (ev.id === cancelledId ? { ...ev, event_status: 'cancelled' } : ev))
            );
          } else {
            loadEvents();
          }
        } catch {
          loadEvents();
        }
      });

      es.onerror = () => {
        // EventSource automatically retries connection
      };
    };

    connectSSE();

    // Reconcile and refresh when window regains focus or comes back online
    const handleReconcile = () => {
      loadEvents();
    };

    window.addEventListener('online', handleReconcile);
    window.addEventListener('focus', handleReconcile);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      window.removeEventListener('online', handleReconcile);
      window.removeEventListener('focus', handleReconcile);
    };
  }, [loadEvents, user]);

  // Handle Interested Toggle with Optimistic Feedback
  const handleToggleInterested = async (e: React.MouseEvent, eventItem: EventItem) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }

    const currentInterested = Boolean(eventItem.is_interested);
    const nextInterested = !currentInterested;
    const currentCount = eventItem.interested_count || 0;
    const nextCount = nextInterested ? currentCount + 1 : Math.max(0, currentCount - 1);

    // Optimistic UI update
    setEvents(prevEvents =>
      prevEvents.map(ev =>
        ev.id === eventItem.id
          ? { ...ev, is_interested: nextInterested, interested_count: nextCount }
          : ev
      )
    );

    if (selectedEventModal && selectedEventModal.id === eventItem.id) {
      setSelectedEventModal({
        ...selectedEventModal,
        is_interested: nextInterested,
        interested_count: nextCount,
      });
    }

    setInterestLoadingId(eventItem.id);

    try {
      const token = localStorage.getItem('lalumiere_token');
      const res = await fetch(`/api/events/${eventItem.id}/interest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ interested: nextInterested }),
      });

      if (!res.ok) {
        throw new Error('Failed to update interest');
      }

      const data = await res.json();
      // Synchronize authoritative server state
      setEvents(prevEvents =>
        prevEvents.map(ev =>
          ev.id === eventItem.id
            ? { ...ev, is_interested: data.is_interested, interested_count: data.interested_count }
            : ev
        )
      );

      if (selectedEventModal && selectedEventModal.id === eventItem.id) {
        setSelectedEventModal(prev =>
          prev ? { ...prev, is_interested: data.is_interested, interested_count: data.interested_count } : null
        );
      }

      // Visual feedback banner
      setFeedbackNotice({
        id: eventItem.id,
        message: nextInterested
          ? 'Wiyandikishije kugaragaza ko wishimiye iki gikorwa!'
          : 'Ukwifuza kwitabira kwakuweho.',
        type: 'success',
      });
      setTimeout(() => setFeedbackNotice(null), 3000);
    } catch (err) {
      // Revert optimistic update on failure
      setEvents(prevEvents =>
        prevEvents.map(ev =>
          ev.id === eventItem.id
            ? { ...ev, is_interested: currentInterested, interested_count: currentCount }
            : ev
        )
      );
      setFeedbackNotice({
        id: eventItem.id,
        message: 'Habaye ikosa mu kwandika ubushake. Ongera ugerageze.',
        type: 'info',
      });
      setTimeout(() => setFeedbackNotice(null), 3500);
    } finally {
      setInterestLoadingId(null);
    }
  };

  // Helper for Category styling and icons
  const getCategoryMeta = (catName?: string) => {
    const normalized = (catName || '').toLowerCase();
    if (normalized.includes('practice') || normalized.includes('imyitozo')) {
      return {
        label: 'Imyitozo (Choir Practice)',
        badgeClass: 'bg-blue-100 text-blue-900 border-blue-200',
        icon: Mic,
        cardBg: 'from-blue-900/10 to-indigo-900/5',
        accentColor: 'text-blue-700',
      };
    }
    if (normalized.includes('ministry') || normalized.includes('ivugabutumwa')) {
      return {
        label: 'Ivugabutumwa (Ministry Event)',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-200',
        icon: Flame,
        cardBg: 'from-emerald-900/10 to-teal-900/5',
        accentColor: 'text-emerald-700',
      };
    }
    if (normalized.includes('concert') || normalized.includes('gikomeye')) {
      return {
        label: 'Igitaramo (Concert)',
        badgeClass: 'bg-amber-100 text-amber-950 border-amber-300',
        icon: Music,
        cardBg: 'from-amber-900/10 to-orange-900/5',
        accentColor: 'text-amber-700',
      };
    }
    if (normalized.includes('worship') || normalized.includes('kuramya')) {
      return {
        label: 'Ijoro ryo Kuramya (Worship Night)',
        badgeClass: 'bg-purple-100 text-purple-900 border-purple-200',
        icon: Radio,
        cardBg: 'from-purple-900/10 to-indigo-900/5',
        accentColor: 'text-purple-700',
      };
    }
    return {
      label: catName || 'Igikorwa cya Korali (Special Event)',
      badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-200',
      icon: Sparkles,
      cardBg: 'from-indigo-900/10 to-blue-900/5',
      accentColor: 'text-indigo-700',
    };
  };

  // Date Formatter in Kinyarwanda & International Style
  const formatEventDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return { full: dateStr, short: dateStr, day: '', month: '', dayName: '' };
      }

      const daysRw = [
        'Ku Cyumweru',
        'Kuwa Mbere',
        'Kuwa Kabiri',
        'Kuwa Gatatu',
        'Kuwa Kane',
        'Kuwa Gatanu',
        'Kuwa Gatandatu',
      ];
      const monthsRw = [
        'Mutarama',
        'Gashyantare',
        'Werurwe',
        'Mata',
        'Gicurasi',
        'Kamena',
        'Nyakanga',
        'Kanama',
        'Nzeli',
        'Ukwakira',
        'Ugushyingo',
        'Ukuboza',
      ];

      const dayName = daysRw[date.getDay()];
      const dayNum = date.getDate();
      const monthName = monthsRw[date.getMonth()];
      const year = date.getFullYear();

      return {
        full: `${dayName}, ${dayNum} ${monthName} ${year}`,
        short: `${dayNum} ${monthName}`,
        day: dayNum,
        month: monthName.substring(0, 3).toUpperCase(),
        dayName,
      };
    } catch {
      return { full: dateStr, short: dateStr, day: '', month: '', dayName: '' };
    }
  };

  // Format Time Range
  const formatTimeRange = (startTime?: string, endTime?: string) => {
    if (!startTime && !endTime) return 'Isaha izatangazwa (Time TBD)';
    if (startTime && endTime) return `${startTime} – ${endTime}`;
    if (startTime) return `Saa ${startTime}`;
    return `Kugeza ${endTime}`;
  };

  // Add to Calendar helper
  const handleAddToGoogleCalendar = (ev: EventItem) => {
    try {
      const [year, month, day] = ev.event_date.split('-').map(Number);
      const startTime = ev.start_time || '15:00';
      const endTime = ev.end_time || '18:00';
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      const startDate = new Date(year, (month || 1) - 1, day || 1, startHour || 15, startMin || 0);
      const endDate = new Date(year, (month || 1) - 1, day || 1, endHour || 18, endMin || 0);

      const formatIso = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
      const datesParam = `${formatIso(startDate)}/${formatIso(endDate)}`;

      const title = encodeURIComponent(`${ev.title} - La Lumiere Choir`);
      const details = encodeURIComponent(
        `${ev.description || ''}\n\nOrganized by La Lumiere Choir • ADEPR Nyanza, Kicukiro District, Kigali, Rwanda.`
      );
      const location = encodeURIComponent(ev.location || 'ADEPR Nyanza, Kigali, Rwanda');

      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesParam}&details=${details}&location=${location}`;
      window.open(url, '_blank');
    } catch {
      alert('Could not generate calendar link');
    }
  };

  // Share Event via Web Share or Clipboard
  const handleShareEvent = async (ev: EventItem) => {
    const text = `🎵 ${ev.title}\n📅 ${formatEventDate(ev.event_date).full}\n⏰ ${formatTimeRange(ev.start_time, ev.end_time)}\n📍 ${ev.location || 'ADEPR Nyanza, Kigali'}\n\nKorali La Lumiere ADEPR Nyanza irabatumiye!`;
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: ev.title, text, url });
        return;
      } catch (err) {
        // fallback
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopiedShareId(ev.id);
      setTimeout(() => setCopiedShareId(null), 2500);
    } catch {
      alert('Event details copied to clipboard');
    }
  };

  // Filter events by selected category
  const filteredEvents = events.filter(ev => {
    if (ev.status === 'draft') return false;
    if (ev.event_status === 'cancelled') return false;
    if (selectedCategory === 'all') return true;
    const cat = (ev.category || '').toLowerCase();
    const target = selectedCategory.toLowerCase();
    return cat.includes(target) || target.includes(cat);
  });

  return (
    <section className={`space-y-3.5 ${className}`}>
      {/* Header and Category Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-900 text-amber-300 flex items-center justify-center shadow-xs">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight font-serif flex items-center gap-1.5">
              <span>Ibikorwa Biteganyijwe</span>
              <span className="text-slate-400 font-sans text-xs font-bold font-normal">
                (Upcoming Events)
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Gahunda y'imyitozo, ivugabutumwa n'ibitaramo bya La Lumiere Choir
            </p>
          </div>
        </div>

        {/* Live Active Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-400/15 text-amber-950 border border-amber-400/30">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Updates ako kanya (Real-time)</span>
          </span>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {[
          { id: 'all', label: 'Byose (All)', icon: Filter },
          { id: 'practice', label: 'Imyitozo (Practice)', icon: Mic },
          { id: 'ministry', label: 'Ivugabutumwa (Ministry)', icon: Flame },
          { id: 'performance', label: 'Ibitaramo Byihariye', icon: Sparkles },
          { id: 'concert', label: 'Concerts (Ibitaramo)', icon: Music },
        ].map(cat => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-950 text-white shadow-xs scale-100'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/80 shadow-2xs'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Events Listing */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {[1, 2].map(i => (
            <div
              key={i}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs animate-pulse space-y-3"
            >
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-6 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-10 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        /* Friendly Empty State */
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 text-center space-y-3 shadow-2xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center border border-blue-100 shadow-2xs">
            <Calendar className="w-7 h-7 text-blue-900/80" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 font-serif">
              Nta gikorwa cyashyizwe muri iki cyiciro muri aka kanya
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Ibikorwa bishya n'amatariki y'imyitozo n'ibitaramo bishyirwaho n'ubuyobozi bwa La Lumiere Choir. Garuka vuba kureba gahunda nshya!
            </p>
          </div>
          {selectedCategory !== 'all' && (
            <button
              onClick={() => setSelectedCategory('all')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <span>Reba ibikorwa byose (View All Events)</span>
            </button>
          )}
        </div>
      ) : (
        /* Event Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredEvents.map(ev => {
            const dateInfo = formatEventDate(ev.event_date);
            const timeInfo = formatTimeRange(ev.start_time, ev.end_time);
            const catMeta = getCategoryMeta(ev.category);
            const CategoryIcon = catMeta.icon;
            const isInterested = Boolean(ev.is_interested);
            const isToggling = interestLoadingId === ev.id;
            const interestedCount = ev.interested_count || 0;

            return (
              <div
                key={ev.id}
                onClick={() => setSelectedEventModal(ev)}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group cursor-pointer"
              >
                {/* Poster / Artwork Header */}
                <div className="relative h-40 sm:h-44 w-full bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 overflow-hidden">
                  {ev.image_url ? (
                    <img
                      src={ev.image_url}
                      alt={ev.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                      loading="lazy"
                    />
                  ) : (
                    /* Elegant Choir Abstract Header */
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center relative">
                      <div className="absolute inset-0 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
                      <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xs flex items-center justify-center text-amber-300 mb-2">
                        <Music className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-serif font-bold text-white tracking-wide">
                        La Lumiere Choir
                      </span>
                      <span className="text-[10px] text-amber-300/90 font-medium">
                        ADEPR Nyanza • Kigali
                      </span>
                    </div>
                  )}

                  {/* Gradient Overlay for Legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />

                  {/* Date Badge in Top Left */}
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md rounded-2xl p-2 text-center shadow-lg border border-slate-200/60 min-w-12">
                    <span className="block text-[10px] font-extrabold text-blue-900 uppercase tracking-wider leading-none">
                      {typeof dateInfo === 'object' ? dateInfo.month : ''}
                    </span>
                    <span className="block text-lg font-black text-slate-950 leading-tight">
                      {typeof dateInfo === 'object' ? dateInfo.day : ''}
                    </span>
                  </div>

                  {/* Category Badge in Top Right */}
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shadow-xs backdrop-blur-md ${catMeta.badgeClass}`}
                    >
                      <CategoryIcon className="w-3 h-3" />
                      <span>{ev.category || 'Event'}</span>
                    </span>
                  </div>

                  {/* Bottom Image Overlay Details */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white/90 text-[11px] font-semibold">
                    <div className="flex items-center gap-1.5 truncate">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{timeInfo}</span>
                    </div>
                    {ev.location && (
                      <div className="flex items-center gap-1 truncate max-w-[50%]">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Full Date String */}
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      <span>{typeof dateInfo === 'object' ? dateInfo.full : dateInfo}</span>
                    </div>

                    {/* Title */}
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-blue-950 transition-colors font-serif leading-snug line-clamp-2">
                      {ev.title}
                    </h3>

                    {/* Description preview */}
                    {ev.description && (
                      <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                        {ev.description}
                      </p>
                    )}
                  </div>

                  {/* Footer & Action Controls */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {/* Interested Count Indicator */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          isInterested
                            ? 'bg-rose-100 text-rose-600'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            isInterested ? 'fill-rose-500 text-rose-500' : ''
                          }`}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700">
                        {interestedCount} {interestedCount === 1 ? 'yabyifuje' : 'babyifuje'}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {/* Share Button */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleShareEvent(ev);
                        }}
                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        title="Sangiza iki gikorwa (Share event)"
                      >
                        {copiedShareId === ev.id ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                      </button>

                      {/* Independent "Interested" Button */}
                      <button
                        type="button"
                        onClick={e => handleToggleInterested(e, ev)}
                        disabled={isToggling}
                        aria-pressed={isInterested}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer ${
                          isInterested
                            ? 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100'
                            : 'bg-blue-950 text-white hover:bg-blue-900 border border-blue-900'
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            isInterested ? 'fill-rose-600 text-rose-600' : 'text-amber-400'
                          }`}
                        />
                        <span>
                          {isInterested ? 'Ndabyifuza ✓' : 'Ndashaka Kwitabira'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* In-Card Toast Feedback if active */}
                  {feedbackNotice && feedbackNotice.id === ev.id && (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-[11px] font-bold flex items-center gap-1.5 animate-in fade-in duration-200">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{feedbackNotice.message}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= EVENT DETAILS MODAL ================= */}
      {selectedEventModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header Media */}
            <div className="relative h-48 sm:h-56 w-full bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 shrink-0">
              {selectedEventModal.image_url ? (
                <img
                  src={selectedEventModal.image_url}
                  alt={selectedEventModal.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 mb-2">
                    <Calendar className="w-7 h-7" />
                  </div>
                  <h4 className="text-white font-bold font-serif text-base">La Lumiere Choir ADEPR Nyanza</h4>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

              {/* Close Button */}
              <button
                onClick={() => setSelectedEventModal(null)}
                className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer border border-white/20"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Bottom Header Info */}
              <div className="absolute bottom-3 left-4 right-4 text-white">
                <span className="inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 mb-1.5 shadow-xs">
                  {selectedEventModal.category || 'Special Event'}
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold font-serif leading-tight">
                  {selectedEventModal.title}
                </h3>
              </div>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Timing & Location Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Itariki (Date)</span>
                    <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                      {formatEventDate(selectedEventModal.event_date).full}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Amasaha (Time)</span>
                    <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                      {formatTimeRange(selectedEventModal.start_time, selectedEventModal.end_time)}
                    </span>
                  </div>
                </div>

                {selectedEventModal.location && (
                  <div className="sm:col-span-2 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Ahobizabera (Venue)</span>
                      <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        {selectedEventModal.location}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedEventModal.description && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-1.5 uppercase text-[10px] tracking-wider text-slate-400">
                    Ibisobanuro birambuye (Details)
                  </h4>
                  <p className="text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100 whitespace-pre-line">
                    {selectedEventModal.description}
                  </p>
                </div>
              )}

              {/* Interested Summary */}
              <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-white border border-blue-200 flex items-center justify-center text-rose-500 shadow-2xs">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-extrabold text-slate-900 text-xs">
                      {selectedEventModal.interested_count || 0} Abantu bishimiye iki gikorwa
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {Boolean(selectedEventModal.is_interested)
                        ? 'Uri mu bantu biyandikishije kwitabira.'
                        : 'Kanda ku buto yo hasi kugira ngo wiyandikishe.'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={e => handleToggleInterested(e, selectedEventModal)}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer ${
                    Boolean(selectedEventModal.is_interested)
                      ? 'bg-rose-600 text-white hover:bg-rose-700'
                      : 'bg-blue-950 text-white hover:bg-blue-900'
                  }`}
                >
                  {Boolean(selectedEventModal.is_interested) ? 'Ndabyifuza ✓' : 'Ndashaka Kwitabira'}
                </button>
              </div>

              {/* Calendar & Share Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleAddToGoogleCalendar(selectedEventModal)}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  <CalendarPlus className="w-4 h-4 text-blue-900" />
                  <span>Google Calendar</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShareEvent(selectedEventModal)}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-slate-700" />
                  <span>Sangiza (Share)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= LOGIN PROMPT DIALOG ================= */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-2xs">
              <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
            </div>

            <div>
              <h3 className="font-extrabold text-base text-slate-900 font-serif">
                Injira muri Konti yawe
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Kugira ngo ugaragaze ko wishimiye kwitabira ibikorwa bya La Lumiere Choir, banza winjire muri konti yawe cyangwa wiyandikishe.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowLoginPrompt(false);
                  if (onOpenAuth) onOpenAuth();
                }}
                className="w-full py-2.5 px-4 bg-blue-950 hover:bg-blue-900 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
              >
                Injira / Iyandikishe (Sign In)
              </button>

              <button
                type="button"
                onClick={() => setShowLoginPrompt(false)}
                className="w-full py-2 px-4 text-slate-500 hover:text-slate-800 rounded-xl font-semibold text-xs transition-colors"
              >
                Reka (Cancel)
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
