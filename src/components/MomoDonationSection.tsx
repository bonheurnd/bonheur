import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  User,
} from 'lucide-react';
import { useDonation } from '../context/DonationContext';
import { useAuth } from '../context/AuthContext';
import { PaymentTransaction } from '../types';

interface MomoDonationSectionProps {
  onSuccess?: (transaction: PaymentTransaction) => void;
  className?: string;
}

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

const DONATION_PURPOSES = [
  'Gushyigikira Ivugabutumwa (Ministry Outreach)',
  'Gufata no Gutunganya Amajwi n\'Amashusho (Studio & Video)',
  'Kugura no Gusana Ibikoresho by\'Umuziki (Music Instruments)',
  'Ibitaramo n\'Urugendo rw\'Ivugabutumwa (Choir Missions)',
  'Inkunga Rusange ya Korali (General Ministry Support)',
];

export const MomoDonationSection: React.FC<MomoDonationSectionProps> = ({
  onSuccess,
  className = '',
}) => {
  const { user } = useAuth();
  const {
    initiateDonation,
    checkDonationStatus,
    validateRwandaPhone,
    isLoading,
    error: contextError,
    activeDonation,
    resetActiveDonation,
  } = useDonation();

  const [selectedAmount, setSelectedAmount] = useState<number>(5000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [provider, setProvider] = useState<'mtn-momo' | 'airtel-money'>('mtn-momo');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [donorName, setDonorName] = useState<string>(user?.name || '');
  const [purpose, setPurpose] = useState<string>(DONATION_PURPOSES[0]);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<boolean>(false);
  const [pollingStatus, setPollingStatus] = useState<'idle' | 'waiting' | 'success' | 'failed'>('idle');

  // Auto-detect provider based on phone number prefix
  useEffect(() => {
    if (phone.length >= 3) {
      const res = validateRwandaPhone(phone);
      if (res.provider) {
        setProvider(res.provider);
      }
    }
  }, [phone, validateRwandaPhone]);

  // Status polling when a donation is initiated
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeDonation && activeDonation.status === 'pending') {
      setPollingStatus('waiting');
      let attempts = 0;
      interval = setInterval(async () => {
        attempts++;
        const updated = await checkDonationStatus(activeDonation.internal_reference);
        if (updated) {
          if (updated.status === 'successful') {
            setPollingStatus('success');
            clearInterval(interval);
            if (onSuccess) onSuccess(updated);
          } else if (updated.status === 'failed' || updated.status === 'cancelled') {
            setPollingStatus('failed');
            clearInterval(interval);
          }
        }
        if (attempts > 30) {
          clearInterval(interval);
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeDonation, checkDonationStatus, onSuccess]);

  const finalAmount = isCustom ? Number(customAmount) : selectedAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!finalAmount || finalAmount < 100) {
      setFormError('Amafaranga ntashobora kujya munsi ya 100 RWF');
      return;
    }

    const phoneValidation = validateRwandaPhone(phone);
    if (!phoneValidation.valid) {
      setFormError(phoneValidation.error || 'Nimero ya telefone yanditse nabi');
      return;
    }

    const res = await initiateDonation({
      donor_name: isAnonymous ? 'Umukristu (Anonymous)' : donorName || 'Umukristu',
      donor_phone: phoneValidation.formatted,
      amount: finalAmount,
      provider_slug: provider,
      donation_purpose: purpose,
      is_anonymous: isAnonymous,
    });

    if (!res.success) {
      setFormError(res.error || 'Ntibyashoboye gutangiza inkunga. Ongera ugerageze.');
    }
  };

  const handleCopyReference = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  return (
    <div
      className={`bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-7 space-y-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
          <HeartHandshake className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-serif">
            Gushyigikira Korali La Lumiere (Mobile Money)
          </h2>
          <p className="text-xs text-slate-500">
            Tanga inkunga yawe mu mutekano ukoresheje MTN MoMo cyangwa Airtel Money mu Rwanda
          </p>
        </div>
      </div>

      {/* Active Donation / Polling / Receipt Card */}
      {activeDonation && (
        <div
          className={`p-5 rounded-2xl border transition-all ${
            activeDonation.status === 'successful'
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : activeDonation.status === 'failed'
              ? 'bg-rose-50/80 border-rose-200 text-rose-950'
              : 'bg-amber-50/80 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {activeDonation.status === 'successful' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : activeDonation.status === 'failed' ? (
                <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
              ) : (
                <RefreshCw className="w-6 h-6 text-amber-600 animate-spin shrink-0" />
              )}
              <div>
                <h3 className="font-bold text-sm sm:text-base">
                  {activeDonation.status === 'successful'
                    ? 'Murakoze cyane! Inkunga yakiriwe neza.'
                    : activeDonation.status === 'failed'
                    ? 'Kwishyura ntibyakunze.'
                    : 'Tegereza kuri telefone yawe (USSD Prompt)...'}
                </h3>
                <p className="text-xs opacity-80 mt-0.5">
                  {activeDonation.status === 'successful'
                    ? 'Imana iguhe umugisha mwinshi ku bw\'inkunga yawe muri uyu murimo.'
                    : activeDonation.status === 'failed'
                    ? activeDonation.failure_reason || 'Icyemezo cya Mobile Money cyanzwe cyangwa cyatinze.'
                    : 'Kanda PIN yawe kuri telefone ngo wemeze kwishyura amafaranga.'}
                </p>
              </div>
            </div>
            <button
              onClick={resetActiveDonation}
              className="text-xs font-semibold px-2.5 py-1 bg-white/70 hover:bg-white rounded-lg shadow-2xs border border-slate-200/50 cursor-pointer"
            >
              Funga
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/40 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold opacity-60">Reference</span>
              <div className="flex items-center gap-1 font-mono font-bold">
                <span>{activeDonation.internal_reference}</span>
                <button
                  onClick={() => handleCopyReference(activeDonation.internal_reference)}
                  className="hover:opacity-75 cursor-pointer"
                >
                  {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold opacity-60">Amafaranga</span>
              <p className="font-bold">{activeDonation.amount.toLocaleString()} RWF</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold opacity-60">Uburyo</span>
              <p className="font-bold uppercase">{activeDonation.provider_slug}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold opacity-60">Imimerere</span>
              <p className="font-bold capitalize">{activeDonation.status}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Donation Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Error notification */}
        {(formError || contextError) && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError || contextError}</span>
          </div>
        )}

        {/* 1. Amount Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-2">
            Hitamo Amafaranga Ushaka Gutanga (Amount in RWF):
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PRESET_AMOUNTS.map(amt => (
              <button
                key={amt}
                type="button"
                onClick={() => {
                  setSelectedAmount(amt);
                  setIsCustom(false);
                }}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  !isCustom && selectedAmount === amt
                    ? 'bg-blue-950 text-white border-blue-950 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                }`}
              >
                {amt.toLocaleString()} F
              </button>
            ))}
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            <input
              type="number"
              min="100"
              step="100"
              placeholder="Andika andi mafaranga wifuza (Custom)..."
              value={customAmount}
              onChange={e => {
                setCustomAmount(e.target.value);
                setIsCustom(true);
              }}
              className={`flex-1 p-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 ${
                isCustom ? 'border-blue-900 ring-1 ring-blue-900 bg-white' : 'border-slate-200'
              }`}
            />
            {isCustom && (
              <span className="text-xs font-bold text-blue-950 bg-blue-50 px-3 py-2.5 rounded-xl border border-blue-200">
                RWF
              </span>
            )}
          </div>
        </div>

        {/* 2. Provider Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-2">
            Uburyo bwo Kwishyura (Payment Provider):
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setProvider('mtn-momo')}
              className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                provider === 'mtn-momo'
                  ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-slate-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>MTN MoMo</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">078, 079</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                Rwanda
              </span>
            </button>

            <button
              type="button"
              onClick={() => setProvider('airtel-money')}
              className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                provider === 'airtel-money'
                  ? 'bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-slate-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Airtel Money</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">072, 073</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                Rwanda
              </span>
            </button>
          </div>
        </div>

        {/* 3. Phone & Donor Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Nimero ya Telefone (Mobile Money Phone):
            </label>
            <div className="relative">
              <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="078XXXXXXX cyangwa 072XXXXXXX"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Izina ryawe (Donor Name):
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={donorName}
                onChange={e => setDonorName(e.target.value)}
                placeholder="Amazina yawe (cyangwa kanda hepfo utitangaza)"
                disabled={isAnonymous}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* 4. Purpose Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Intego y'Inkunga (Purpose of Donation):
          </label>
          <select
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
          >
            {DONATION_PURPOSES.map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Anonymous option */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="anonymous"
            checked={isAnonymous}
            onChange={e => setIsAnonymous(e.target.checked)}
            className="w-4 h-4 text-blue-950 rounded border-slate-300 focus:ring-blue-900 cursor-pointer"
          />
          <label htmlFor="anonymous" className="text-xs text-slate-600 font-medium cursor-pointer">
            Sinshaka ko amazina yanjye agaragara mu ruhame (Anonymous donation)
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !finalAmount}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 hover:from-blue-900 hover:to-indigo-950 text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Gutunganya Kwishyura...</span>
            </>
          ) : (
            <>
              <HeartHandshake className="w-4 h-4 text-rose-400" />
              <span>Tanga {finalAmount ? `${finalAmount.toLocaleString()} RWF` : ''}</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </>
          )}
        </button>

        {/* Trust Badges */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Kwishyura mu mutekano 100% (Secured MoMo Rwanda)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>ADEPR Nyanza Choir Ministry</span>
          </div>
        </div>
      </form>
    </div>
  );
};
