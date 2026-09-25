import React, { useState } from 'react';
import { useBranding } from '../context/BrandingContext';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  ExternalLink,
  Copy,
  Check,
  UserCheck,
  Building2,
  Calendar,
  Sparkles,
} from 'lucide-react';

export interface LeadershipContactInfo {
  choirLeader: {
    titleKinyarwanda: string;
    titleEnglish: string;
    name: string;
    phone: string;
    whatsapp: string;
  };
  choirSecretary: {
    titleKinyarwanda: string;
    titleEnglish: string;
    name: string;
    phone: string;
    whatsapp: string;
  };
  generalContact: {
    titleKinyarwanda: string;
    titleEnglish: string;
    phone: string;
    whatsapp: string;
    email: string;
  };
  location: {
    titleKinyarwanda: string;
    titleEnglish: string;
    address: string;
    city: string;
    country: string;
  };
  officeHours: {
    titleKinyarwanda: string;
    titleEnglish: string;
    weekdayRange: string;
    weekdayHours: string;
    weekendRange: string;
    weekendHours: string;
  };
}

/**
 * DEFAULT CHOIR LEADERSHIP CONTACT INFORMATION
 * 
 * IMPORTANT:
 * All placeholder values are explicitly identified with [INSERT ...] format
 * for convenient replacement with real choir leadership details.
 */
export const DEFAULT_LEADERSHIP_CONTACTS: LeadershipContactInfo = {
  choirLeader: {
    titleKinyarwanda: 'Umuyobozi wa Korali',
    titleEnglish: 'Choir Leader / President',
    name: '[INSERT NAME]',
    phone: '[INSERT PHONE NUMBER]',
    whatsapp: '[INSERT WHATSAPP NUMBER]',
  },
  choirSecretary: {
    titleKinyarwanda: 'Umunyamabanga wa Korali',
    titleEnglish: 'Choir Secretary',
    name: '[INSERT NAME]',
    phone: '[INSERT PHONE NUMBER]',
    whatsapp: '[INSERT WHATSAPP NUMBER]',
  },
  generalContact: {
    titleKinyarwanda: 'Aderesi Rusange ya Korali',
    titleEnglish: 'General Choir Contact',
    phone: '[INSERT PHONE NUMBER]',
    whatsapp: '[INSERT WHATSAPP NUMBER]',
    email: '[INSERT EMAIL ADDRESS]',
  },
  location: {
    titleKinyarwanda: 'Icyicaro n\'Aho Korali Ibarizwa',
    titleEnglish: 'Choir Location & Address',
    address: '[INSERT CHOIR ADDRESS]',
    city: 'Kigali',
    country: 'Rwanda',
  },
  officeHours: {
    titleKinyarwanda: 'Amasaha y\'Akazi / Aho Mudusanga',
    titleEnglish: 'Office & Contact Hours',
    weekdayRange: 'Kuwa Mbere – Kuwa Gatanu (Monday–Friday)',
    weekdayHours: '[INSERT HOURS]',
    weekendRange: 'Kuwa Gatandatu – Ku Cyumweru (Saturday–Sunday)',
    weekendHours: '[INSERT HOURS]',
  },
};

interface ContactSectionProps {
  contacts?: LeadershipContactInfo;
  className?: string;
}

export const ContactSection: React.FC<ContactSectionProps> = ({
  contacts: propContacts,
  className = '',
}) => {
  const { leadershipContacts } = useBranding();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Map dynamic leadershipContacts into component structure
  const contacts: LeadershipContactInfo = propContacts || {
    choirLeader: {
      titleKinyarwanda: leadershipContacts.leader_title_rw || 'Umuyobozi wa Korali',
      titleEnglish: leadershipContacts.leader_title_en || 'Choir Leader / President',
      name: leadershipContacts.leader_name || '[INSERT NAME]',
      phone: leadershipContacts.leader_phone || '[INSERT PHONE NUMBER]',
      whatsapp: leadershipContacts.leader_whatsapp || '[INSERT WHATSAPP NUMBER]',
    },
    choirSecretary: {
      titleKinyarwanda: leadershipContacts.secretary_title_rw || 'Umunyamabanga wa Korali',
      titleEnglish: leadershipContacts.secretary_title_en || 'Choir Secretary',
      name: leadershipContacts.secretary_name || '[INSERT NAME]',
      phone: leadershipContacts.secretary_phone || '[INSERT PHONE NUMBER]',
      whatsapp: leadershipContacts.secretary_whatsapp || '[INSERT WHATSAPP NUMBER]',
    },
    generalContact: {
      titleKinyarwanda: 'Aderesi Rusange ya Korali',
      titleEnglish: 'General Choir Contact',
      phone: leadershipContacts.general_phone || '[INSERT PHONE NUMBER]',
      whatsapp: leadershipContacts.general_whatsapp || '[INSERT WHATSAPP NUMBER]',
      email: leadershipContacts.general_email || '[INSERT EMAIL ADDRESS]',
    },
    location: {
      titleKinyarwanda: 'Icyicaro n\'Aho Korali Ibarizwa',
      titleEnglish: 'Choir Location & Address',
      address: leadershipContacts.address || '[INSERT CHOIR ADDRESS]',
      city: leadershipContacts.city || 'Kigali',
      country: leadershipContacts.country || 'Rwanda',
    },
    officeHours: {
      titleKinyarwanda: 'Amasaha y\'Akazi / Aho Mudusanga',
      titleEnglish: 'Office & Contact Hours',
      weekdayRange: leadershipContacts.weekday_range || 'Kuwa Mbere – Kuwa Gatanu (Monday–Friday)',
      weekdayHours: leadershipContacts.weekday_hours || '[INSERT HOURS]',
      weekendRange: leadershipContacts.weekend_range || 'Kuwa Gatandatu – Ku Cyumweru (Saturday–Sunday)',
      weekendHours: leadershipContacts.weekend_hours || '[INSERT HOURS]',
    },
  };

  const introTextRw =
    leadershipContacts.contact_description_rw ||
    'Ufite ikibazo, igitekerezo, cyangwa ushaka kumenya byinshi kuri La Lumiere Choir? Twandikire cyangwa utuvugishe ukoresheje bumwe mu buryo bukurikira.';

  const introTextEn =
    leadershipContacts.contact_description_en ||
    'Do you have questions, feedback, or need information about La Lumiere Choir? Get in touch with our leadership team using the options below.';

  const showToast = (message: string) => {
    setFeedbackToast(message);
    setTimeout(() => {
      setFeedbackToast((current) => (current === message ? null : current));
    }, 3500);
  };

  /**
   * Copy to clipboard utility with defensive fallback
   */
  const handleCopy = async (text: string, label: string, key: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedKey(key);
      showToast(`Byakoporowe neza / Copied: ${label}`);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      showToast(`${label}: ${text}`);
    }
  };

  /**
   * Phone dialer trigger with defensive fallback
   */
  const handleCall = (phoneNumber: string) => {
    if (!phoneNumber || phoneNumber.includes('[INSERT')) {
      handleCopy(phoneNumber, 'Telefone', `phone-${phoneNumber}`);
      return;
    }
    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
    try {
      window.location.href = `tel:${cleanNumber}`;
    } catch {
      handleCopy(phoneNumber, 'Telefone', `phone-${phoneNumber}`);
    }
  };

  /**
   * WhatsApp launcher with defensive fallback
   */
  const handleWhatsApp = (whatsappNumber: string, personRole: string) => {
    if (!whatsappNumber || whatsappNumber.includes('[INSERT')) {
      handleCopy(whatsappNumber, 'WhatsApp', `wa-${whatsappNumber}`);
      return;
    }
    const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
    const prefilledMessage = encodeURIComponent(
      `Muraho La Lumiere Choir (${personRole}), nifuzaga kubaza amakuru kuri:`
    );
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${prefilledMessage}`;

    try {
      const openedWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      if (!openedWindow) {
        window.location.href = whatsappUrl;
      }
    } catch {
      handleCopy(whatsappNumber, 'WhatsApp', `wa-${whatsappNumber}`);
    }
  };

  /**
   * Email client launcher with defensive fallback
   */
  const handleEmail = (emailAddress: string) => {
    if (!emailAddress || emailAddress.includes('[INSERT')) {
      handleCopy(emailAddress, 'Imeli (Email)', `email-${emailAddress}`);
      return;
    }
    try {
      const subject = encodeURIComponent('Ibibazo n\'Amakuru / Inquiry - La Lumiere Choir');
      window.location.href = `mailto:${emailAddress}?subject=${subject}`;
    } catch {
      handleCopy(emailAddress, 'Imeli', `email-${emailAddress}`);
    }
  };

  /**
   * Maps navigation launcher with defensive fallback
   */
  const handleOpenMaps = (address: string, city: string, country: string) => {
    let query = `${address}, ${city}, ${country}`;
    if (address.includes('[INSERT')) {
      query = `ADEPR Nyanza, Kicukiro, Kigali, Rwanda`;
    }
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

    try {
      const win = window.open(mapsUrl, '_blank', 'noopener,noreferrer');
      if (!win) {
        window.location.href = mapsUrl;
      }
    } catch {
      handleCopy(query, 'Aderesi (Location)', 'loc-query');
    }
  };

  return (
    <section className={`space-y-4 ${className}`} aria-labelledby="contact-leadership-heading">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white p-5 rounded-3xl border border-blue-900/60 shadow-xs relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Ubuyobozi bwa Korali • Choir Administration</span>
          </div>

          <h3 id="contact-leadership-heading" className="text-lg sm:text-xl font-extrabold tracking-tight font-serif text-white">
            Twandikire / Tuvugishe
            <span className="block text-xs sm:text-sm font-sans font-medium text-slate-300 mt-0.5">
              Contact Choir Leadership
            </span>
          </h3>

          <p className="text-xs text-slate-300 leading-relaxed pt-1">
            {introTextRw}
          </p>
          <p className="text-[11px] text-slate-400 italic">
            ({introTextEn})
          </p>
        </div>
      </div>

      {/* Floating feedback alert */}
      {feedbackToast && (
        <div
          role="status"
          className="p-3 bg-emerald-900/95 text-white text-xs font-semibold rounded-2xl border border-emerald-500/40 shadow-lg flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Check className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="truncate">{feedbackToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackToast(null)}
            className="text-[11px] text-emerald-200 hover:text-white underline shrink-0 cursor-pointer"
          >
            Funga
          </button>
        </div>
      )}

      {/* 1. CHOIR LEADER CARD */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-900/30 transition-all space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-900 text-amber-300 flex items-center justify-center font-bold shadow-xs shrink-0">
              <UserCheck className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md inline-block">
                1. {contacts.choirLeader.titleKinyarwanda}
              </span>
              <h4 className="font-extrabold text-base text-slate-900 font-serif mt-0.5">
                {contacts.choirLeader.name}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                {contacts.choirLeader.titleEnglish}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          {/* Phone Dial */}
          <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Telefone (Phone)
              </span>
              <span className="font-mono font-semibold text-slate-900 truncate block">
                {contacts.choirLeader.phone}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleCall(contacts.choirLeader.phone)}
                className="px-3 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center gap-1.5 text-xs transition-transform active:scale-95 shadow-2xs cursor-pointer"
                title="Hamagara kuri telefone (Call Phone)"
                aria-label={`Call ${contacts.choirLeader.name}`}
              >
                <Phone className="w-3.5 h-3.5 text-amber-300" />
                <span>Hamagara</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopy(contacts.choirLeader.phone, 'Phone', 'lead-phone')}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
                title="Koporora nimero (Copy Phone)"
                aria-label="Copy Leader Phone"
              >
                {copiedKey === 'lead-phone' ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                WhatsApp
              </span>
              <span className="font-mono font-semibold text-emerald-950 truncate block">
                {contacts.choirLeader.whatsapp}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleWhatsApp(contacts.choirLeader.whatsapp, contacts.choirLeader.titleKinyarwanda)}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-1.5 text-xs transition-transform active:scale-95 shadow-2xs cursor-pointer"
                title="Koresha WhatsApp (Chat WhatsApp)"
                aria-label={`WhatsApp chat with ${contacts.choirLeader.name}`}
              >
                <MessageCircle className="w-3.5 h-3.5 text-white" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopy(contacts.choirLeader.whatsapp, 'WhatsApp', 'lead-wa')}
                className="p-2 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-200/60 rounded-xl transition-colors cursor-pointer"
                title="Koporora WhatsApp (Copy WhatsApp)"
                aria-label="Copy Leader WhatsApp"
              >
                {copiedKey === 'lead-wa' ? (
                  <Check className="w-4 h-4 text-emerald-700" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CHOIR SECRETARY CARD */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-900/30 transition-all space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-900 text-indigo-200 flex items-center justify-center font-bold shadow-xs shrink-0">
              <UserCheck className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                2. {contacts.choirSecretary.titleKinyarwanda}
              </span>
              <h4 className="font-extrabold text-base text-slate-900 font-serif mt-0.5">
                {contacts.choirSecretary.name}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                {contacts.choirSecretary.titleEnglish}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          {/* Phone Dial */}
          <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Telefone (Phone)
              </span>
              <span className="font-mono font-semibold text-slate-900 truncate block">
                {contacts.choirSecretary.phone}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleCall(contacts.choirSecretary.phone)}
                className="px-3 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center gap-1.5 text-xs transition-transform active:scale-95 shadow-2xs cursor-pointer"
                title="Hamagara Umunyamabanga (Call Secretary)"
                aria-label={`Call ${contacts.choirSecretary.name}`}
              >
                <Phone className="w-3.5 h-3.5 text-amber-300" />
                <span>Hamagara</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopy(contacts.choirSecretary.phone, 'Phone', 'sec-phone')}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
                title="Koporora nimero (Copy Phone)"
                aria-label="Copy Secretary Phone"
              >
                {copiedKey === 'sec-phone' ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                WhatsApp
              </span>
              <span className="font-mono font-semibold text-emerald-950 truncate block">
                {contacts.choirSecretary.whatsapp}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleWhatsApp(contacts.choirSecretary.whatsapp, contacts.choirSecretary.titleKinyarwanda)}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-1.5 text-xs transition-transform active:scale-95 shadow-2xs cursor-pointer"
                title="Koresha WhatsApp (Chat WhatsApp)"
                aria-label={`WhatsApp chat with ${contacts.choirSecretary.name}`}
              >
                <MessageCircle className="w-3.5 h-3.5 text-white" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopy(contacts.choirSecretary.whatsapp, 'WhatsApp', 'sec-wa')}
                className="p-2 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-200/60 rounded-xl transition-colors cursor-pointer"
                title="Koporora WhatsApp (Copy WhatsApp)"
                aria-label="Copy Secretary WhatsApp"
              >
                {copiedKey === 'sec-wa' ? (
                  <Check className="w-4 h-4 text-emerald-700" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. GENERAL CHOIR CONTACT */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-900/30 transition-all space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs shrink-0">
              <Building2 className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md inline-block">
                3. {contacts.generalContact.titleKinyarwanda}
              </span>
              <h4 className="font-extrabold text-base text-slate-900 font-serif mt-0.5">
                {contacts.generalContact.titleEnglish}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                La Lumiere Choir • Paruwasi ya Nyanza, ADEPR
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          {/* General Phone */}
          <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Phone className="w-3.5 h-3.5 text-blue-900" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Telefone (Phone)</span>
              </div>
              <span className="font-mono font-semibold text-slate-900 break-all text-xs">
                {contacts.generalContact.phone}
              </span>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleCall(contacts.generalContact.phone)}
                className="flex-1 py-1.5 px-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center justify-center gap-1 text-[11px] transition-transform active:scale-95 shadow-2xs cursor-pointer"
                title="Hamagara kuri telefone rusange"
                aria-label="Call general phone"
              >
                <Phone className="w-3 h-3 text-amber-300" />
                <span>Hamagara</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopy(contacts.generalContact.phone, 'General Phone', 'gen-phone')}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Koporora nimero"
                aria-label="Copy general phone"
              >
                {copiedKey === 'gen-phone' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* General WhatsApp */}
          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-800 mb-1">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                <span className="text-[10px] font-bold uppercase tracking-wider">WhatsApp</span>
              </div>
              <span className="font-mono font-semibold text-emerald-950 break-all text-xs">
                {contacts.generalContact.whatsapp}
              </span>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleWhatsApp(contacts.generalContact.whatsapp, 'General Choir Contact')}
                className="flex-1 py-1.5 px-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center justify-center gap-1 text-[11px] transition-transform active:scale-95 shadow-2xs cursor-pointer"
                title="Twandikire kuri WhatsApp"
                aria-label="Chat general WhatsApp"
              >
                <MessageCircle className="w-3 h-3 text-white" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopy(contacts.generalContact.whatsapp, 'General WhatsApp', 'gen-wa')}
                className="p-1.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-200/60 rounded-xl transition-colors cursor-pointer"
                title="Koporora WhatsApp"
                aria-label="Copy general WhatsApp"
              >
                {copiedKey === 'gen-wa' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* General Email */}
          <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/70 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-blue-900 mb-1">
                <Mail className="w-3.5 h-3.5 text-blue-900" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Imeli (Email)</span>
              </div>
              <span className="font-mono font-semibold text-blue-950 break-all text-xs">
                {contacts.generalContact.email}
              </span>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleEmail(contacts.generalContact.email)}
                className="flex-1 py-1.5 px-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center justify-center gap-1 text-[11px] transition-transform active:scale-95 shadow-2xs cursor-pointer"
                title="Ohereza Imeli (Send Email)"
                aria-label="Send email"
              >
                <Mail className="w-3 h-3 text-amber-300" />
                <span>Ohereza Imeli</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopy(contacts.generalContact.email, 'General Email', 'gen-email')}
                className="p-1.5 text-blue-800 hover:text-blue-950 hover:bg-blue-200/60 rounded-xl transition-colors cursor-pointer"
                title="Koporora Imeli"
                aria-label="Copy email"
              >
                {copiedKey === 'gen-email' ? (
                  <Check className="w-3.5 h-3.5 text-blue-900" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. CHOIR LOCATION & MAPS */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-900/30 transition-all space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 border border-rose-100 flex items-center justify-center font-bold shadow-xs shrink-0">
              <MapPin className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md inline-block">
                4. {contacts.location.titleKinyarwanda}
              </span>
              <h4 className="font-extrabold text-base text-slate-900 font-serif mt-0.5">
                {contacts.location.titleEnglish}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                Kigali, Rwanda • ADEPR Nyanza Parish
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Aderesi (Address): {contacts.location.address}</span>
            </div>
            <p className="text-slate-600 pl-6 text-[11px]">
              Umujyi (City): <span className="font-semibold text-slate-800">{contacts.location.city}</span>, Igihugu (Country): <span className="font-semibold text-slate-800">{contacts.location.country}</span>
            </p>
            <p className="text-slate-400 pl-6 text-[10px]">
              (ADEPR Paruwasi ya Nyanza, Akarere ka Kicukiro, Umujyi wa Kigali)
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
            <button
              type="button"
              onClick={() => handleOpenMaps(contacts.location.address, contacts.location.city, contacts.location.country)}
              className="py-2 px-3.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center gap-1.5 text-xs transition-transform active:scale-95 shadow-2xs cursor-pointer"
              title="Fungura muri Google Maps"
              aria-label="Open choir location in Google Maps"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
              <span>Fungura Maps (View Map)</span>
            </button>
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  `${contacts.location.address}, ${contacts.location.city}, ${contacts.location.country}`,
                  'Aderesi',
                  'loc-address'
                )
              }
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Koporora Aderesi (Copy Address)"
              aria-label="Copy location address"
            >
              {copiedKey === 'loc-address' ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 5. OFFICE & CONTACT HOURS */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-900/30 transition-all space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center font-bold shadow-xs shrink-0">
              <Clock className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded-md inline-block">
                5. {contacts.officeHours.titleKinyarwanda}
              </span>
              <h4 className="font-extrabold text-base text-slate-900 font-serif mt-0.5">
                {contacts.officeHours.titleEnglish}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                Igihe cyo Kuganira n'Ubuyobozi bwa Korali (Contact Availability)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Weekdays */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-2 text-blue-950 font-bold">
              <Calendar className="w-4 h-4 text-blue-900" />
              <span>{contacts.officeHours.weekdayRange}</span>
            </div>
            <div className="pl-6">
              <span className="text-slate-500 text-[11px] block">Amasaha (Hours):</span>
              <span className="font-mono font-bold text-slate-900 text-xs">
                {contacts.officeHours.weekdayHours}
              </span>
            </div>
          </div>

          {/* Weekends */}
          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-950 font-bold">
              <Calendar className="w-4 h-4 text-amber-700" />
              <span>{contacts.officeHours.weekendRange}</span>
            </div>
            <div className="pl-6">
              <span className="text-amber-800 text-[11px] block">Amasaha (Hours):</span>
              <span className="font-mono font-bold text-amber-950 text-xs">
                {contacts.officeHours.weekendHours}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
