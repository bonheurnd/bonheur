import React, { useState, useEffect } from 'react';
import { useBranding } from '../../context/BrandingContext';
import { LeadershipContactRecord } from '../../types';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  Building2,
  Calendar,
  Save,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  Info,
} from 'lucide-react';

interface AdminContactTabProps {
  onSuccessNotice?: (message: string) => void;
}

export const AdminContactTab: React.FC<AdminContactTabProps> = ({ onSuccessNotice }) => {
  const { leadershipContacts, updateContacts, refreshContacts } = useBranding();

  // Form State
  const [formData, setFormData] = useState<LeadershipContactRecord>({
    leader_name: leadershipContacts.leader_name || '',
    leader_phone: leadershipContacts.leader_phone || '',
    leader_whatsapp: leadershipContacts.leader_whatsapp || '',
    leader_title_rw: leadershipContacts.leader_title_rw || 'Umuyobozi wa Korali',
    leader_title_en: leadershipContacts.leader_title_en || 'Choir Leader / President',
    secretary_name: leadershipContacts.secretary_name || '',
    secretary_phone: leadershipContacts.secretary_phone || '',
    secretary_whatsapp: leadershipContacts.secretary_whatsapp || '',
    secretary_title_rw: leadershipContacts.secretary_title_rw || 'Umunyamabanga wa Korali',
    secretary_title_en: leadershipContacts.secretary_title_en || 'Choir Secretary',
    general_phone: leadershipContacts.general_phone || '',
    general_whatsapp: leadershipContacts.general_whatsapp || '',
    general_email: leadershipContacts.general_email || '',
    address: leadershipContacts.address || '',
    city: leadershipContacts.city || 'Kigali',
    country: leadershipContacts.country || 'Rwanda',
    weekday_range: leadershipContacts.weekday_range || 'Kuwa Mbere – Kuwa Gatanu (Monday–Friday)',
    weekday_hours: leadershipContacts.weekday_hours || '',
    weekend_range: leadershipContacts.weekend_range || 'Kuwa Gatandatu – Ku Cyumweru (Saturday–Sunday)',
    weekend_hours: leadershipContacts.weekend_hours || '',
    contact_description_rw: leadershipContacts.contact_description_rw || '',
    contact_description_en: leadershipContacts.contact_description_en || '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state if context changes externally
  useEffect(() => {
    setFormData({
      leader_name: leadershipContacts.leader_name || '',
      leader_phone: leadershipContacts.leader_phone || '',
      leader_whatsapp: leadershipContacts.leader_whatsapp || '',
      leader_title_rw: leadershipContacts.leader_title_rw || 'Umuyobozi wa Korali',
      leader_title_en: leadershipContacts.leader_title_en || 'Choir Leader / President',
      secretary_name: leadershipContacts.secretary_name || '',
      secretary_phone: leadershipContacts.secretary_phone || '',
      secretary_whatsapp: leadershipContacts.secretary_whatsapp || '',
      secretary_title_rw: leadershipContacts.secretary_title_rw || 'Umunyamabanga wa Korali',
      secretary_title_en: leadershipContacts.secretary_title_en || 'Choir Secretary',
      general_phone: leadershipContacts.general_phone || '',
      general_whatsapp: leadershipContacts.general_whatsapp || '',
      general_email: leadershipContacts.general_email || '',
      address: leadershipContacts.address || '',
      city: leadershipContacts.city || 'Kigali',
      country: leadershipContacts.country || 'Rwanda',
      weekday_range: leadershipContacts.weekday_range || 'Kuwa Mbere – Kuwa Gatanu (Monday–Friday)',
      weekday_hours: leadershipContacts.weekday_hours || '',
      weekend_range: leadershipContacts.weekend_range || 'Kuwa Gatandatu – Ku Cyumweru (Saturday–Sunday)',
      weekend_hours: leadershipContacts.weekend_hours || '',
      contact_description_rw: leadershipContacts.contact_description_rw || '',
      contact_description_en: leadershipContacts.contact_description_en || '',
    });
  }, [leadershipContacts]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleResetDefaults = () => {
    if (window.confirm('Wifuza gusubizaho amakuru asanzwe (Reset to default placeholders)?')) {
      setFormData({
        leader_name: '[INSERT NAME]',
        leader_phone: '[INSERT PHONE NUMBER]',
        leader_whatsapp: '[INSERT WHATSAPP NUMBER]',
        leader_title_rw: 'Umuyobozi wa Korali',
        leader_title_en: 'Choir Leader / President',
        secretary_name: '[INSERT NAME]',
        secretary_phone: '[INSERT PHONE NUMBER]',
        secretary_whatsapp: '[INSERT WHATSAPP NUMBER]',
        secretary_title_rw: 'Umunyamabanga wa Korali',
        secretary_title_en: 'Choir Secretary',
        general_phone: '[INSERT PHONE NUMBER]',
        general_whatsapp: '[INSERT WHATSAPP NUMBER]',
        general_email: '[INSERT EMAIL ADDRESS]',
        address: '[INSERT CHOIR ADDRESS]',
        city: 'Kigali',
        country: 'Rwanda',
        weekday_range: 'Kuwa Mbere – Kuwa Gatanu (Monday–Friday)',
        weekday_hours: '[INSERT HOURS]',
        weekend_range: 'Kuwa Gatandatu – Ku Cyumweru (Saturday–Sunday)',
        weekend_hours: '[INSERT HOURS]',
        contact_description_rw:
          'Ufite ikibazo, igitekerezo, cyangwa ushaka kumenya byinshi kuri La Lumiere Choir? Twandikire cyangwa utuvugishe ukoresheje bumwe mu buryo bukurikira.',
        contact_description_en:
          'Do you have questions, feedback, or need information about La Lumiere Choir? Get in touch with our leadership team using the options below.',
      });
      setErrorMessage(null);
    }
  };

  const handleCancel = () => {
    setFormData({
      leader_name: leadershipContacts.leader_name || '',
      leader_phone: leadershipContacts.leader_phone || '',
      leader_whatsapp: leadershipContacts.leader_whatsapp || '',
      leader_title_rw: leadershipContacts.leader_title_rw || 'Umuyobozi wa Korali',
      leader_title_en: leadershipContacts.leader_title_en || 'Choir Leader / President',
      secretary_name: leadershipContacts.secretary_name || '',
      secretary_phone: leadershipContacts.secretary_phone || '',
      secretary_whatsapp: leadershipContacts.secretary_whatsapp || '',
      secretary_title_rw: leadershipContacts.secretary_title_rw || 'Umunyamabanga wa Korali',
      secretary_title_en: leadershipContacts.secretary_title_en || 'Choir Secretary',
      general_phone: leadershipContacts.general_phone || '',
      general_whatsapp: leadershipContacts.general_whatsapp || '',
      general_email: leadershipContacts.general_email || '',
      address: leadershipContacts.address || '',
      city: leadershipContacts.city || 'Kigali',
      country: leadershipContacts.country || 'Rwanda',
      weekday_range: leadershipContacts.weekday_range || 'Kuwa Mbere – Kuwa Gatanu (Monday–Friday)',
      weekday_hours: leadershipContacts.weekday_hours || '',
      weekend_range: leadershipContacts.weekend_range || 'Kuwa Gatandatu – Ku Cyumweru (Saturday–Sunday)',
      weekend_hours: leadershipContacts.weekend_hours || '',
      contact_description_rw: leadershipContacts.contact_description_rw || '',
      contact_description_en: leadershipContacts.contact_description_en || '',
    });
    setErrorMessage(null);
    setSaveSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(null);

    // Client-side validation
    if (!formData.leader_name.trim()) {
      setErrorMessage("Amazina y'Umuyobozi wa Korali arashakishwa (Leader Name is required)");
      return;
    }
    if (!formData.leader_phone.trim()) {
      setErrorMessage("Nimero ya telefone y'Umuyobozi irashakishwa (Leader Phone is required)");
      return;
    }
    if (!formData.secretary_name.trim()) {
      setErrorMessage("Amazina y'Umunyamabanga wa Korali arashakishwa (Secretary Name is required)");
      return;
    }
    if (!formData.secretary_phone.trim()) {
      setErrorMessage("Nimero ya telefone y'Umunyamabanga irashakishwa (Secretary Phone is required)");
      return;
    }
    if (!formData.general_phone.trim()) {
      setErrorMessage('Telefone rusange ya korali irashakishwa (General Phone is required)');
      return;
    }
    if (!formData.general_email.trim()) {
      setErrorMessage('Imeli ya korali irashakishwa (General Email is required)');
      return;
    }
    if (!formData.address.trim()) {
      setErrorMessage('Aderesi y\'aho korali ibarizwa irashakishwa (Address is required)');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = formData.general_email.trim();
    if (!cleanEmail.includes('[INSERT') && !emailRegex.test(cleanEmail)) {
      setErrorMessage('Imeli yanditse nabi. Urugero ruzima: info@lalumierechoir.rw (Invalid Email Format)');
      return;
    }

    setIsSaving(true);
    try {
      await updateContacts(formData);
      const successText = 'Amakuru yabitswe neza. Contact information updated successfully.';
      setSaveSuccess(successText);
      if (onSuccessNotice) {
        onSuccessNotice(successText);
      }
      setTimeout(() => {
        setSaveSuccess(null);
      }, 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Habaye ikosa mu kubika amakuru. Ongera ugerageze.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-5 rounded-3xl border border-blue-900/60 shadow-xs relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Icyumba cy'Ubuyobozi • Admin Management Room</span>
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight font-serif text-white">
            Tunganya Amakuru yo Kuvugisha Ubuyobozi
            <span className="block text-xs sm:text-sm font-sans font-medium text-slate-300 mt-0.5">
              Manage Choir Leadership & Contact Information
            </span>
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed pt-1">
            Hindura cyangwa uvugurure amakuru y'Umuyobozi wa Korali, Umunyamabanga, aderesi, imeli, na telefone.
            Ibi bibikwa mu bubiko bw'amakuru (database) maze bigahita byigaragaza ku rubuga nta kenera gukora APK nshya.
          </p>
        </div>
      </div>

      {/* Status Messages */}
      {saveSuccess && (
        <div
          role="status"
          className="p-4 bg-emerald-900/90 text-white text-xs font-semibold rounded-2xl border border-emerald-500/40 shadow-lg flex items-center justify-between gap-3 animate-in fade-in"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-300 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccess(null)}
            className="text-[11px] text-emerald-200 hover:text-white underline cursor-pointer shrink-0"
          >
            Funga
          </button>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="p-4 bg-rose-900/90 text-white text-xs font-semibold rounded-2xl border border-rose-500/40 shadow-lg flex items-center justify-between gap-3 animate-in fade-in"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-[11px] text-rose-200 hover:text-white underline cursor-pointer shrink-0"
          >
            Funga
          </button>
        </div>
      )}

      {/* Main Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: CHOIR LEADER */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-900 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
              <UserCheck className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                1. Umuyobozi wa Korali (Choir Leader / President)
              </h3>
              <p className="text-[11px] text-slate-500">
                Amakuru n'inzira zo kuvugana n'Umuyobozi mukuru wa Korali
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Amazina y'Umuyobozi (Leader Name) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="leader_name"
                value={formData.leader_name}
                onChange={handleChange}
                placeholder="[INSERT NAME]"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Icyubahiro / Title (Kinyarwanda & English)
              </label>
              <input
                type="text"
                name="leader_title_rw"
                value={formData.leader_title_rw}
                onChange={handleChange}
                placeholder="Umuyobozi wa Korali"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nimero ya Telefone (Phone Number) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  name="leader_phone"
                  value={formData.leader_phone}
                  onChange={handleChange}
                  placeholder="+250 788 000 000 cyangwa [INSERT PHONE NUMBER]"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nimero ya WhatsApp (WhatsApp Number)
              </label>
              <div className="relative">
                <MessageCircle className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
                <input
                  type="text"
                  name="leader_whatsapp"
                  value={formData.leader_whatsapp}
                  onChange={handleChange}
                  placeholder="+250 788 000 000 cyangwa [INSERT WHATSAPP NUMBER]"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: CHOIR SECRETARY */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-900 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
              <UserCheck className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                2. Umunyamabanga wa Korali (Choir Secretary)
              </h3>
              <p className="text-[11px] text-slate-500">
                Amakuru n'inzira zo kwandikira Umunyamabanga ushinzwe iby'ubwanditsi
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Amazina y'Umunyamabanga (Secretary Name) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="secretary_name"
                value={formData.secretary_name}
                onChange={handleChange}
                placeholder="[INSERT NAME]"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Icyubahiro / Title (Kinyarwanda & English)
              </label>
              <input
                type="text"
                name="secretary_title_rw"
                value={formData.secretary_title_rw}
                onChange={handleChange}
                placeholder="Umunyamabanga wa Korali"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nimero ya Telefone (Phone Number) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  name="secretary_phone"
                  value={formData.secretary_phone}
                  onChange={handleChange}
                  placeholder="+250 788 000 000 cyangwa [INSERT PHONE NUMBER]"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nimero ya WhatsApp (WhatsApp Number)
              </label>
              <div className="relative">
                <MessageCircle className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
                <input
                  type="text"
                  name="secretary_whatsapp"
                  value={formData.secretary_whatsapp}
                  onChange={handleChange}
                  placeholder="+250 788 000 000 cyangwa [INSERT WHATSAPP NUMBER]"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: GENERAL CHOIR CONTACT */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0">
              <Building2 className="w-4 h-4 text-slate-950" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                3. Aderesi Rusange ya Korali (General Choir Contact)
              </h3>
              <p className="text-[11px] text-slate-500">
                Telefone rusange, WhatsApp, ndetse na imeli yakirirwaho ibaruwa n'ubutumwa
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Telefone Rusange (General Phone) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-blue-900 absolute left-3 top-3" />
                <input
                  type="text"
                  name="general_phone"
                  value={formData.general_phone}
                  onChange={handleChange}
                  placeholder="+250 788 000 000"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                WhatsApp Rusange (General WhatsApp)
              </label>
              <div className="relative">
                <MessageCircle className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
                <input
                  type="text"
                  name="general_whatsapp"
                  value={formData.general_whatsapp}
                  onChange={handleChange}
                  placeholder="+250 788 000 000"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Imeli Rusange (Email Address) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-blue-900 absolute left-3 top-3" />
                <input
                  type="email"
                  name="general_email"
                  value={formData.general_email}
                  onChange={handleChange}
                  placeholder="info@lalumierechoir.rw"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: LOCATION & ADDRESS */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center font-bold text-xs shrink-0">
              <MapPin className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                4. Icyicaro n'Aho Korali Ibarizwa (Location & Address)
              </h3>
              <p className="text-[11px] text-slate-500">
                Aderesi ikoreshwa mu kugaragaza aho korali ikorera no gufungura kuri Google Maps
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Aderesi y'Aho Korali Ibarizwa (Physical Address) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="ADEPR Paruwasi ya Nyanza, Akarere ka Kicukiro"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Umujyi (City / District)
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Kigali"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: OFFICE & CONTACT HOURS */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center font-bold text-xs shrink-0">
              <Clock className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                5. Amasaha yo Kuganira n'Ubuyobozi (Office / Contact Hours)
              </h3>
              <p className="text-[11px] text-slate-500">
                Igihe ubuyobozi buboneka mu minsi y'akazi no mu mpera z'icyumweru
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                <Calendar className="w-4 h-4 text-blue-900" />
                <span>Kuwa Mbere – Kuwa Gatanu (Monday–Friday)</span>
              </div>
              <input
                type="text"
                name="weekday_hours"
                value={formData.weekday_hours}
                onChange={handleChange}
                placeholder="Urugero: 09:00 - 17:00 cyangwa [INSERT HOURS]"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-2">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                <Calendar className="w-4 h-4 text-amber-700" />
                <span>Kuwa Gatandatu – Ku Cyumweru (Saturday–Sunday)</span>
              </div>
              <input
                type="text"
                name="weekend_hours"
                value={formData.weekend_hours}
                onChange={handleChange}
                placeholder="Urugero: 14:00 - 18:00 cyangwa [INSERT HOURS]"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: CONTACT INTRODUCTORY MESSAGE */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
              <Info className="w-4 h-4 text-slate-700" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                6. Ubutumwa bw'Ibanze (Introductory Description Message)
              </h3>
              <p className="text-[11px] text-slate-500">
                Ubutumwa bwerekanwa hejuru mu gice cyo kuvugisha ubuyobozi
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ubutumwa mu Kinyarwanda (Kinyarwanda Description)
              </label>
              <textarea
                name="contact_description_rw"
                rows={2}
                value={formData.contact_description_rw}
                onChange={handleChange}
                placeholder="Ufite ikibazo, igitekerezo, cyangwa ushaka kumenya byinshi kuri La Lumiere Choir?..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ubutumwa mu Cyongereza (English Description)
              </label>
              <textarea
                name="contact_description_en"
                rows={2}
                value={formData.contact_description_en}
                onChange={handleChange}
                placeholder="Do you have questions, feedback, or need information about La Lumiere Choir?..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Garura Ibiri Banza (Reset Defaults)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
            >
              Reka (Cancel)
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-950 hover:bg-blue-900 text-amber-300 font-extrabold rounded-2xl text-xs transition-transform active:scale-95 shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
                  <span>Birabikwa (Saving)...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-amber-300" />
                  <span>Bika Impinduka (Save Changes)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
