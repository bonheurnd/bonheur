import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChoirMemberDirectoryItem } from '../types';
import { safeFetchJson } from '../utils/api';
import {
  Users,
  Search,
  Phone,
  Mail,
  MessageCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  UserCheck,
  Music,
  Filter,
  Check,
  ExternalLink,
  ChevronRight,
  Info,
  Sparkles,
  Settings,
} from 'lucide-react';

interface MemberDirectoryScreenProps {
  onOpenAuth: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const MemberDirectoryScreen: React.FC<MemberDirectoryScreenProps> = ({
  onOpenAuth,
  onNavigateToTab,
}) => {
  const { user, token, updatePrivacy, refreshUser } = useAuth();

  const [members, setMembers] = useState<ChoirMemberDirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('all');

  // Privacy control modal & state
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [privacySuccessMsg, setPrivacySuccessMsg] = useState<string | null>(null);

  // Local state for privacy toggle checkboxes
  const [privacySettings, setPrivacySettings] = useState({
    share_directory: user?.share_directory !== undefined ? Boolean(user.share_directory) : true,
    share_phone: user?.share_phone !== undefined ? Boolean(user.share_phone) : true,
    share_email: user?.share_email !== undefined ? Boolean(user.share_email) : true,
    share_whatsapp: user?.share_whatsapp !== undefined ? Boolean(user.share_whatsapp) : true,
  });

  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => {
      setFeedbackToast(current => (current === msg ? null : current));
    }, 3000);
  };

  // Sync privacy settings when user changes
  useEffect(() => {
    if (user) {
      setPrivacySettings({
        share_directory: user.share_directory !== undefined ? Boolean(user.share_directory) : true,
        share_phone: user.share_phone !== undefined ? Boolean(user.share_phone) : true,
        share_email: user.share_email !== undefined ? Boolean(user.share_email) : true,
        share_whatsapp: user.share_whatsapp !== undefined ? Boolean(user.share_whatsapp) : true,
      });
    }
  }, [user]);

  const fetchMembers = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const url = new URL('/api/members', window.location.origin);
      if (selectedVoice !== 'all') {
        url.searchParams.set('voice', selectedVoice);
      }
      if (searchQuery.trim()) {
        url.searchParams.set('search', searchQuery.trim());
      }

      const res = await safeFetchJson<{ members: ChoirMemberDirectoryItem[]; total: number }>(
        url.pathname + url.search,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok && res.data?.members) {
        setMembers(res.data.members);
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.warn('Failed to load member directory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [token, selectedVoice, searchQuery]);

  const handleSavePrivacy = async () => {
    setIsUpdatingPrivacy(true);
    setPrivacySuccessMsg(null);
    try {
      await updatePrivacy(privacySettings);
      setPrivacySuccessMsg('Amahitamo y\'umutekano n\'ibanga yabitswe neza (Privacy preferences updated).');
      showToast('Igenzura ry\'ibanga ryavuguruwe neza.');
      await fetchMembers();
      setTimeout(() => {
        setShowPrivacyModal(false);
        setPrivacySuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to update privacy settings');
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-999999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showToast(`Byakoporowe: ${label}`);
    } catch {
      showToast(text);
    }
  };

  const voices = [
    { id: 'all', label: 'Bose (All Voices)' },
    { id: 'Soprano', label: 'Soprano' },
    { id: 'Alto', label: 'Alto' },
    { id: 'Tenor', label: 'Tenor' },
    { id: 'Bass', label: 'Bass' },
    { id: 'Musician', label: 'Abacuranzi (Musicians)' },
  ];

  // 1. Unauthenticated Wall (Restricted strictly to logged-in registered members)
  if (!user || !token) {
    return (
      <div className="py-12 px-4 max-w-xl mx-auto text-center space-y-6 animate-in fade-in">
        <div className="w-16 h-16 rounded-3xl bg-blue-950 text-amber-300 flex items-center justify-center mx-auto shadow-md">
          <Lock className="w-8 h-8 text-amber-300" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-950 text-xs font-extrabold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-blue-900" />
            <span>Umutekano n'Ibanga • Secure Member Room</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-serif">
            Igitabo cy'Abaririmbyi ba Korali
            <span className="block text-sm font-sans font-medium text-slate-500 mt-1">
              Registered Choir Members Directory
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto pt-2">
            Iki gice cyagenewe abaririmbyi n'abayobozi ba La Lumiere Choir gusa.
            Injira muri konte yawe cyangwa ufungure konte nshya kugira ngo ubone amakuru y'abandi baririmbyi no gucunga uko amakuru yawe agaragara.
          </p>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3 text-left">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <EyeOff className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Uburinzi bw'Amakuru Bwite (Privacy Controls)</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Buri muririmbyi afite uburenganzira bwo guhisha telefone, imeli, cyangwa kwikura mu gitabo igihe cyose abishakiye (Opt-out anytime).
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={onOpenAuth}
            className="w-full sm:w-auto px-8 py-3 bg-blue-950 hover:bg-blue-900 text-amber-300 font-extrabold rounded-2xl text-xs sm:text-sm transition-transform active:scale-95 shadow-md inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-amber-300" />
            <span>Injira Muri Konte (Sign In to View Directory)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 max-w-4xl mx-auto px-2 sm:px-4">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900/95 text-white text-xs font-semibold rounded-2xl border border-slate-700 shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in"
        >
          <Check className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 rounded-3xl border border-blue-900/60 shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Abaririmbyi Bemewe • Verified Members</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight font-serif text-white">
              Igitabo cy'Abaririmbyi (Member Directory)
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              Ihuze n'abandi baririmbyi ba La Lumiere Choir. Amakuru agaragara hano agengwa n'amahitamo y'ibanga ya buri muririmbyi.
            </p>
          </div>

          {/* Privacy Controls Quick Button */}
          <button
            onClick={() => setShowPrivacyModal(true)}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer backdrop-blur-xs"
          >
            <Settings className="w-4 h-4 text-amber-300" />
            <span>Igenzura ry'Ibanga (My Privacy)</span>
          </button>
        </div>
      </div>

      {/* Current User Status & Privacy Notice */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-950 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900">{user.name}</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-950 text-[10px] font-bold rounded-md">
                {user.choir_voice || 'Choir Member'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Imiterere y'ibanga ryawe:{' '}
              {user.share_directory !== 0 ? (
                <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Uboneka mu gitabo (Public to Members)
                </span>
              ) : (
                <span className="text-rose-700 font-semibold inline-flex items-center gap-1">
                  <EyeOff className="w-3 h-3" /> Urihishye (Opted-Out of Directory)
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowPrivacyModal(true)}
          className="text-xs text-blue-900 font-bold hover:underline self-end sm:self-auto cursor-pointer"
        >
          Hindura Amahitamo
        </button>
      </div>

      {/* Search & Voice Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Shakisha umuririmbyi ku izina, ijwi (Tenor, Soprano...), inshingano..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 shadow-2xs"
          />
        </div>

        {/* Voices Filters Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {voices.map(v => {
            const isSelected = selectedVoice === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setSelectedVoice(v.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-950 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
                }`}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Members Directory Grid */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-blue-950 border-t-amber-400 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Gushakisha abaririmbyi ba Korali...</p>
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Nta muririmbyi ubonetse</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Nta muririmbyi uhuye n'ibyo ushakishije cyangwa abaririmbyi bashobora kuba barahisemo kutagaragara mu gitabo.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedVoice('all');
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Garura Byose (Reset Filters)
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {members.map(member => {
            return (
              <div
                key={member.id}
                className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all ${
                  member.is_self
                    ? 'border-blue-950/40 ring-2 ring-blue-950/10 shadow-xs'
                    : 'border-slate-200/80 hover:border-blue-300 shadow-2xs'
                } flex flex-col justify-between space-y-3`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-950 to-indigo-900 text-amber-300 flex items-center justify-center font-extrabold text-sm shadow-xs shrink-0">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-extrabold text-xs sm:text-sm text-slate-900">
                            {member.name}
                          </h3>
                          {member.is_self && (
                            <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 text-[9px] font-black rounded uppercase">
                              Wowe (You)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-950 text-[10px] font-bold">
                            {member.choir_voice}
                          </span>
                          {member.choir_role && member.choir_role !== 'Member' && (
                            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[140px]">
                              • {member.choir_role}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {member.bio && (
                    <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                      "{member.bio}"
                    </p>
                  )}
                </div>

                {/* Contact Action Triggers with Privacy Status */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Phone button */}
                    {member.has_phone ? (
                      <a
                        href={`tel:${member.phone}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-950 rounded-xl text-xs font-bold transition-colors"
                        title={`Hamagara: ${member.phone}`}
                      >
                        <Phone className="w-3.5 h-3.5 text-blue-900" />
                        <span className="text-[11px] font-mono">{member.phone}</span>
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-medium" title="Telefone yarahishwe">
                        <EyeOff className="w-3 h-3" />
                        <span>Telefone irahishe</span>
                      </span>
                    )}

                    {/* WhatsApp button */}
                    {member.has_whatsapp && member.whatsapp && (
                      <a
                        href={`https://wa.me/${member.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl transition-colors"
                        title="Twandikire kuri WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      </a>
                    )}

                    {/* Email button */}
                    {member.has_email && (
                      <a
                        href={`mailto:${member.email}`}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                        title={`Ohereza imeli: ${member.email}`}
                      >
                        <Mail className="w-3.5 h-3.5 text-slate-700" />
                      </a>
                    )}
                  </div>

                  {member.has_phone && (
                    <button
                      onClick={() => handleCopy(member.phone || '', `Nimero ya ${member.name}`)}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-700 underline cursor-pointer"
                    >
                      Koporora
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PRIVACY CONTROLS MODAL */}
      {showPrivacyModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-950 text-amber-300 flex items-center justify-center font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Igenzura ry'Ibanga n'Umutekano
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Member Directory Privacy Controls
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {privacySuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl text-xs font-bold border border-emerald-200 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{privacySuccessMsg}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed">
              Hitamo uko amakuru yawe y'umwirondoro agaragarira abandi baririmbyi ba Korali La Lumiere. Ushobora kwikura mu gitabo cyangwa guhisha telefone n'imeli igihe icyo ari cyo cyose.
            </p>

            <div className="space-y-3 pt-1">
              {/* Master directory toggle */}
              <label className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-start gap-3 cursor-pointer hover:bg-blue-50/50 transition-colors">
                <input
                  type="checkbox"
                  checked={privacySettings.share_directory}
                  onChange={e =>
                    setPrivacySettings(prev => ({
                      ...prev,
                      share_directory: e.target.checked,
                    }))
                  }
                  className="mt-0.5 rounded text-blue-900 focus:ring-blue-900 w-4 h-4 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Kugaragara mu gitabo cy'abaririmbyi (Opt-in to Directory)
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Niba udashaka ko abandi baririmbyi bakubona mu gitabo, kura hano akamenyetso (Opt-out).
                  </span>
                </div>
              </label>

              {/* Granular controls */}
              <div
                className={`space-y-2.5 pl-3 border-l-2 border-slate-200 ${
                  !privacySettings.share_directory ? 'opacity-40 pointer-events-none' : ''
                }`}
              >
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacySettings.share_phone}
                    onChange={e =>
                      setPrivacySettings(prev => ({
                        ...prev,
                        share_phone: e.target.checked,
                      }))
                    }
                    className="rounded text-blue-900 focus:ring-blue-900 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">
                      Kwereka abandi baririmbyi telefone yanjye (Share phone number)
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacySettings.share_whatsapp}
                    onChange={e =>
                      setPrivacySettings(prev => ({
                        ...prev,
                        share_whatsapp: e.target.checked,
                      }))
                    }
                    className="rounded text-blue-900 focus:ring-blue-900 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">
                      Kwemera kuvugana kuri WhatsApp (Enable WhatsApp contact)
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacySettings.share_email}
                    onChange={e =>
                      setPrivacySettings(prev => ({
                        ...prev,
                        share_email: e.target.checked,
                      }))
                    }
                    className="rounded text-blue-900 focus:ring-blue-900 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">
                      Kwereka abandi baririmbyi imeli yanjye (Share email address)
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Reka (Cancel)
              </button>
              <button
                type="button"
                onClick={handleSavePrivacy}
                disabled={isUpdatingPrivacy}
                className="px-5 py-2 bg-blue-950 hover:bg-blue-900 text-amber-300 text-xs font-extrabold rounded-xl transition-transform active:scale-95 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isUpdatingPrivacy ? 'Birabikwa...' : 'Bika Amahitamo (Save Preferences)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
