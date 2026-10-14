import React, { useState } from 'react';
import { safeFetchJson } from '../../utils/api';
import { X, UserPlus, CheckCircle2, AlertCircle, Shield } from 'lucide-react';

interface AdminMemberModalProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
  editingMember?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    choir_voice?: string;
    choir_role?: string;
    status?: 'active' | 'inactive';
    bio?: string;
  } | null;
}

const VOICES = [
  'Soprano',
  'Alto',
  'Tenor',
  'Bass',
  'Musician',
  'Director',
  'Choir Member',
];

const ROLES = [
  'Member',
  'Voice Leader',
  'Assistant Leader',
  'Pianist',
  'Guitarist',
  'Drummer',
  'Conductor',
  'Choir Leadership',
  'Advisor',
];

export const AdminMemberModal: React.FC<AdminMemberModalProps> = ({
  onClose,
  onSuccess,
  editingMember,
}) => {
  const isEditing = Boolean(editingMember);
  const [name, setName] = useState(editingMember?.name || '');
  const [phone, setPhone] = useState(editingMember?.phone || '');
  const [email, setEmail] = useState(editingMember?.email || '');
  const [choirVoice, setChoirVoice] = useState(editingMember?.choir_voice || 'Soprano');
  const [choirRole, setChoirRole] = useState(editingMember?.choir_role || 'Member');
  const [status, setStatus] = useState<'active' | 'inactive'>(editingMember?.status || 'active');
  const [bio, setBio] = useState(editingMember?.bio || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Amazina y\'umunyamuryango arakenewe (Member name is required)');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const token = localStorage.getItem('lalumiere_token');

      const url = isEditing
        ? `/api/members/${editingMember!.id}`
        : '/api/members';

      const method = isEditing ? 'PUT' : 'POST';

      const res = await safeFetchJson(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          choir_voice: choirVoice,
          choir_role: choirRole,
          status,
          bio: bio.trim() || null,
        }),
      });

      if (res.ok) {
        onSuccess(
          isEditing
            ? `Amakuru ya ${name.trim()} yavuguruwe neza!`
            : `Umunyamuryango mushya "${name.trim()}" yongewemo neza!`
        );
        onClose();
      } else {
        setErrorMsg(res.error || res.errorMessage || 'Habaye ikibazo mu kubika amakuru');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Habaye ikosa ry\'itumanaho');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-900 text-amber-300 flex items-center justify-center shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 font-serif leading-tight">
                {isEditing ? 'Hindura Umunyamuryango' : 'Ongeramo Umunyamuryango'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isEditing ? 'Vugurura amakuru n\'imimerere' : 'Iyandikishe ry\'umunyamuryango mushya'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Full Name */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Amazina Yose (Full Name) <span className="text-rose-500">*</span>:
            </label>
            <input
              type="text"
              required
              placeholder="Urugero: Uwase Aline"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-blue-900 transition-colors outline-none"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nimero ya Telefone (Phone Number):
            </label>
            <input
              type="tel"
              placeholder="078... cyangwa +25078..."
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white focus:border-blue-900 transition-colors outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Izafasha kumenya no gukumira abaririmbyi bisubiramo (Duplicate prevention).
            </span>
          </div>

          {/* Email Address */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Imeli (Email - Optional):
            </label>
            <input
              type="email"
              placeholder="urugero@gmail.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white focus:border-blue-900 transition-colors outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Choir Voice Part */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Ijwi aririmbamo (Voice Part):
              </label>
              <select
                value={choirVoice}
                onChange={e => setChoirVoice(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-blue-900 transition-colors outline-none"
              >
                {VOICES.map(v => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Choir Role */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Inshingano muri Korali (Role):
              </label>
              <select
                value={choirRole}
                onChange={e => setChoirRole(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:border-blue-900 transition-colors outline-none"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active / Inactive Status Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Imimerere y'Umunyamuryango (Membership Status):
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  status === 'active'
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>✓ Arakora (Active)</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('inactive')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  status === 'inactive'
                    ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>✕ Ntakora (Inactive)</span>
              </button>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Abaririmbyi badakora (Inactive) ntibaza ku rutonde rw'ibanze rwo gufata ubwitabire ariko amateka yabo yose ararinzwe.
            </span>
          </div>

          {/* Optional Bio / Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Ibisobanuro cyangwa Icyitonderwa (Notes - Optional):
            </label>
            <textarea
              rows={2}
              placeholder="Andika amakuru yihariye cyangwa amateka y'umunyamuryango..."
              value={bio}
              onChange={e => setBio(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-blue-900 transition-colors outline-none resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
            >
              Reka (Cancel)
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-blue-950 hover:bg-blue-900 text-white rounded-xl font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Kubika...</span>
              ) : (
                <span>{isEditing ? 'Bika Impinduka' : 'Ongeraho Umunyamuryango'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
