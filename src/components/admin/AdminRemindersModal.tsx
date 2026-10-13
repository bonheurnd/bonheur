import React, { useState, useEffect, useCallback } from 'react';
import { EventItem, EventReminder } from '../../types';
import { safeFetchJson } from '../../utils/api';
import {
  Bell,
  Clock,
  Calendar,
  X,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Users,
  RefreshCw,
  Mail,
  Smartphone,
} from 'lucide-react';

interface AdminRemindersModalProps {
  event: EventItem;
  onClose: () => void;
  onRefreshEvents?: () => void;
}

export const AdminRemindersModal: React.FC<AdminRemindersModalProps> = ({
  event,
  onClose,
  onRefreshEvents,
}) => {
  const [reminders, setReminders] = useState<EventReminder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSendingManual, setIsSendingManual] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New reminder form
  const [reminderType, setReminderType] = useState<'24h' | '2h' | '1h' | 'custom'>('24h');
  const [customMinutes, setCustomMinutes] = useState<number>(1440);
  const [targetAudience, setTargetAudience] = useState<'all_members' | 'choir_members' | 'interested_only'>('choir_members');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [channels, setChannels] = useState<string[]>(['in_app']);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchReminders = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('lalumiere_token');
      const res = await safeFetchJson<EventReminder[]>(`/api/reminders?event_id=${event.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok && res.data) {
        setReminders(res.data);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to load reminders');
    } finally {
      setIsLoading(false);
    }
  }, [event.id]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const token = localStorage.getItem('lalumiere_token');

      let minutes = 1440;
      if (reminderType === '24h') minutes = 1440;
      else if (reminderType === '2h') minutes = 120;
      else if (reminderType === '1h') minutes = 60;
      else minutes = customMinutes;

      const payload = {
        event_id: event.id,
        reminder_type: reminderType,
        minutes_before: minutes,
        target_audience: targetAudience,
        custom_message: customMessage || undefined,
        channels,
        is_enabled: true,
      };

      const res = await safeFetchJson<{ message: string; id: string }>('/api/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('Integuza yateguwe neza (Reminder scheduled)!');
        setCustomMessage('');
        fetchReminders();
        if (onRefreshEvents) onRefreshEvents();
      } else {
        setErrorMsg(res.error || 'Habaye ikibazo mu gutegura integuza');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error scheduling reminder');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendNow = async (reminderId: string) => {
    if (!confirm('Uremeza ko ushaka kohereza iyi nteguza ako kanya kubanyamuryango bose?')) return;
    try {
      setIsSendingManual(reminderId);
      const token = localStorage.getItem('lalumiere_token');
      const res = await safeFetchJson<{ success: boolean; message: string }>(
        `/api/reminders/${reminderId}/send-now`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        showToast(res.data?.message || 'Integuza yoherejwe neza!');
        fetchReminders();
      } else {
        setErrorMsg(res.error || 'Habaye ikibazo mu kohereza');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSendingManual(null);
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (!confirm('Uremeza ko ushaka guhagarika iyi nteguza?')) return;
    try {
      const token = localStorage.getItem('lalumiere_token');
      const res = await safeFetchJson(`/api/reminders/${reminderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Integuza yakuweho neza');
        fetchReminders();
      }
    } catch (err) {
      alert('Failed to delete reminder');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Integuza z'Igikorwa (Event Reminders)
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-xs">{event.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback alerts */}
        {toastMsg && (
          <div className="p-3 bg-emerald-900 text-white rounded-2xl flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-900 text-white rounded-2xl flex items-center gap-2 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Event Banner */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-white">📅 {event.event_date}</span>
            <span className="font-mono text-slate-500">⏰ {event.start_time || '15:00'}</span>
          </div>
          <p className="text-slate-500">📍 {event.location || 'ADEPR Nyanza'}</p>
        </div>

        {/* Existing Reminders */}
        <div className="space-y-2">
          <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300">
            Integuza Zateguwe kuri iki Gikorwa ({reminders.length}):
          </h4>

          {isLoading ? (
            <div className="py-6 text-center text-xs text-slate-400">Gushaka integuza...</div>
          ) : reminders.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
              Nta nteguza irashyirwaho kuri iki gikorwa.
            </div>
          ) : (
            <div className="space-y-2">
              {reminders.map(rem => (
                <div
                  key={rem.id}
                  className="p-3 rounded-2xl border border-slate-200 bg-white dark:bg-slate-800 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white">
                        ⏱ {rem.reminder_type === '24h' ? 'Amasaha 24 mbere' : rem.reminder_type === '2h' ? 'Amasaha 2 mbere' : rem.reminder_type === '1h' ? 'Isaha 1 mbere' : `${rem.minutes_before} min mbere`}
                      </span>
                      <span className="px-2 py-0.2 rounded-md bg-blue-50 text-blue-900 text-[10px] font-bold">
                        {rem.target_audience === 'choir_members' ? 'Abaririmbyi' : rem.target_audience === 'interested_only' ? 'Abiyandikishije' : 'Bose'}
                      </span>
                      <span className={`px-2 py-0.2 rounded-md text-[10px] font-bold ${
                        rem.status === 'sent' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {rem.status === 'sent' ? 'Yoherejwe' : 'Itegerejwe'}
                      </span>
                    </div>
                    {rem.custom_message && (
                      <p className="text-[11px] text-slate-500 italic truncate">
                        "{rem.custom_message}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={isSendingManual === rem.id}
                      onClick={() => handleSendNow(rem.id)}
                      className="px-2.5 py-1 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-[11px] font-bold inline-flex items-center gap-1"
                      title="Ohereza ako kanya"
                    >
                      {isSendingManual === rem.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      <span>Ohereza</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteReminder(rem.id)}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"
                      title="Siba"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Schedule New Reminder Form */}
        <form onSubmit={handleCreateReminder} className="pt-3 border-t space-y-3 text-xs">
          <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-blue-900" />
            <span>Tegura Integuza Nshya (Schedule Reminder):</span>
          </h4>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Igihe cy'Integuza (Timeframe)
              </label>
              <select
                value={reminderType}
                onChange={e => setReminderType(e.target.value as any)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="24h">Amasaha 24 mbere (1 Day)</option>
                <option value="2h">Amasaha 2 mbere (2 Hours)</option>
                <option value="1h">Isaha 1 mbere (1 Hour)</option>
                <option value="custom">Iminota Yihariye (Custom)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Abo Igenewe (Target Audience)
              </label>
              <select
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value as any)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="choir_members">Abaririmbyi ba Korali Gusa</option>
                <option value="all_members">Abanyamuryango Bose</option>
                <option value="interested_only">Abakande "RSVP / Interested" Gusa</option>
              </select>
            </div>
          </div>

          {reminderType === 'custom' && (
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Iminota mbere y'igikorwa (Minutes before)
              </label>
              <input
                type="number"
                min="10"
                max="10080"
                value={customMinutes}
                onChange={e => setCustomMinutes(parseInt(e.target.value, 10) || 60)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Ubutumwa bw'Umwihariko (Custom Message - Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Urugero: Ntimwibagirwe kuzana ibitabo by'indirimbo n'umwambaro..."
              value={customMessage}
              onChange={e => setCustomMessage(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Bell className="w-4 h-4 text-amber-300" />
            )}
            <span>Bika Integuza (Schedule Reminder)</span>
          </button>
        </form>
      </div>
    </div>
  );
};
