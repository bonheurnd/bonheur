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
  Mail,
  Lock,
  PhoneCall,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { useDonation } from '../context/DonationContext';
import { useAuth } from '../context/AuthContext';
import { PaymentTransaction } from '../types';

interface MomoDonationSectionProps {
  onSuccess?: (transaction: PaymentTransaction) => void;
  onNavigateToAdmin?: () => void;
  className?: string;
}

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 25000, 50000];

export const MomoDonationSection: React.FC<MomoDonationSectionProps> = ({
  onSuccess,
  onNavigateToAdmin,
  className = '',
}) => {
  const { user } = useAuth();
  const {
    recipientSettings,
    gatewaySummary,
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
  const [donorEmail, setDonorEmail] = useState<string>(user?.email || '');
  const [purpose, setPurpose] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Set default purpose from recipient settings
  useEffect(() => {
    if (!purpose && recipientSettings.donation_purpose) {
      setPurpose(recipientSettings.donation_purpose);
    }
  }, [recipientSettings.donation_purpose, purpose]);

  // Auto-detect provider based on phone number prefix
  useEffect(() => {
    if (phone.length >= 3) {
      const res = validateRwandaPhone(phone);
      if (res.provider) {
        setProvider(res.provider);
      }
    }
  }, [phone, validateRwandaPhone]);

  // Status polling when a donation is in pending/processing state
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeDonation && (activeDonation.status === 'pending' || activeDonation.status === 'processing')) {
      let attempts = 0;
      interval = setInterval(async () => {
        attempts++;
        const updated = await checkDonationStatus(activeDonation.internal_reference);
        if (updated) {
          if (updated.status === 'successful') {
            clearInterval(interval);
            if (onSuccess) onSuccess(updated);
          } else if (updated.status === 'failed' || updated.status === 'cancelled' || updated.status === 'expired') {
            clearInterval(interval);
          }
        }
        if (attempts >= 40) {
          clearInterval(interval);
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeDonation, checkDonationStatus, onSuccess]);

  const minAmt = recipientSettings.min_amount || 100;
  const maxAmt = recipientSettings.max_amount || 5000000;
  const finalAmount = isCustom ? Number(customAmount) : selectedAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!recipientSettings.is_enabled) {
      setFormError('Kwakira inkunga byahagaritswe by\'agateganyo.');
      return;
    }

    if (!finalAmount || isNaN(finalAmount)) {
      setFormError('Nyamuneka hitamo cyangwa wandike amafaranga y\'inkunga.');
      return;
    }

    if (finalAmount < minAmt) {
      setFormError(`Amafaranga ntashobora kuba munsi ya ${minAmt.toLocaleString()} RWF`);
      return;
    }

    if (finalAmount > maxAmt) {
      setFormError(`Amafaranga ntashobora kurenga ${maxAmt.toLocaleString()} RWF`);
      return;
    }

    const phoneValidation = validateRwandaPhone(phone);
    if (!phoneValidation.valid) {
      setFormError(phoneValidation.error || 'Nimero ya telefone yanditse nabi');
      return;
    }

    // Generate unique idempotency key for this submission attempt
    const idempotencyKey = `idemp_${phoneValidation.formatted}_${finalAmount}_${Date.now()}`;

    setIsSubmitting(true);
    try {
      const res = await initiateDonation({
        donor_name: isAnonymous ? 'Umugiraneza (Anonymous)' : donorName || 'Umugiraneza',
        donor_phone: phoneValidation.formatted,
        donor_email: donorEmail || undefined,
        amount: finalAmount,
        provider_slug: provider,
        donation_purpose: purpose || recipientSettings.donation_purpose,
        is_anonymous: isAnonymous,
        idempotency_key: idempotencyKey,
      });

      if (!res.success) {
        setFormError(res.error || 'Ntibyashoboye gutangiza inkunga. Ongera ugerageze.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyReference = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  // If donations are disabled by Admin
  if (!recipientSettings.is_enabled) {
    return (
      <div className={`bg-amber-50/70 border border-amber-200/90 rounded-3xl p-6 text-center space-y-2 ${className}`}>
        <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
        <h3 className="font-bold text-base text-amber-950 font-serif">Kwakira Inkunga Byahagaritswe By'Agateganyo</h3>
        <p className="text-xs text-amber-800 max-w-md mx-auto">
          Uburyo bwo gutanga inkunga kuri interineti buri kuvugururwa. Ushobora kuvugisha ubuyobozi bwa Korali La Lumiere.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-7 space-y-6 ${className}`}>
      {/* 1. Header & Dynamic Recipient Banner */}
      <div className="space-y-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-serif">
              {recipientSettings.title || 'Gushyigikira Korali La Lumiere'}
            </h2>
            <p className="text-xs text-slate-500">
              Direct Rwanda Payment Gateway • MTN Mobile Money na Airtel Money mu Rwanda
            </p>
          </div>
        </div>

        {/* Dynamic Recipient Information Card (Configurable from Admin) */}
        <div className="bg-gradient-to-r from-blue-950/5 via-amber-500/5 to-blue-950/5 border border-blue-900/15 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-950 text-white flex items-center justify-center shrink-0 font-bold">
              <PhoneCall className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-slate-900">
                Uwakira: <span className="text-blue-950">{recipientSettings.recipient_name}</span>
              </p>
              <p className="font-mono text-slate-600 text-[11px]">
                Nimero y'Ubwishyu: <span className="font-bold text-slate-900">{recipientSettings.recipient_phone}</span>
                <span className="ml-2 text-[10px] bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded-full">
                  {recipientSettings.donation_purpose}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {gatewaySummary?.environment === 'test' && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full border border-amber-300">
                Sandbox Mode
              </span>
            )}
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Verified Direct Gateway
            </span>
          </div>
        </div>
      </div>

      {/* 2. Active Transaction Card (Waiting for Prompt / Success / Failure) */}
      {activeDonation && (
        <div
          className={`p-5 rounded-2xl border transition-all ${
            activeDonation.status === 'successful'
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950 shadow-xs'
              : activeDonation.status === 'failed' || activeDonation.status === 'cancelled' || activeDonation.status === 'expired'
              ? 'bg-rose-50/90 border-rose-200 text-rose-950'
              : 'bg-amber-50/90 border-amber-200 text-amber-950 animate-pulse'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {activeDonation.status === 'successful' ? (
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              ) : activeDonation.status === 'failed' || activeDonation.status === 'cancelled' || activeDonation.status === 'expired' ? (
                <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              )}
              <div>
                <h3 className="font-extrabold text-sm sm:text-base">
                  {activeDonation.status === 'successful'
                    ? 'Donation Successful / Umusanzu Wakiriwe Neza!'
                    : activeDonation.status === 'failed' || activeDonation.status === 'cancelled' || activeDonation.status === 'expired'
                    ? 'Payment Failed / Kwishyura Ntibyakunze'
                    : 'Waiting for Payment Confirmation (Reba kuri Telefone)'}
                </h3>
                <p className="text-xs opacity-85 mt-0.5 max-w-xl">
                  {activeDonation.status === 'successful'
                    ? 'Imana iguhe umugisha mwinshi ku bw\'inkunga yawe muri uyu murimo wa Korali La Lumiere. Inyemezabwishyu yabitswe mu mateka yawe.'
                    : activeDonation.status === 'failed' || activeDonation.status === 'cancelled' || activeDonation.status === 'expired'
                    ? activeDonation.failure_reason || 'Ubwishyu bwanze cyangwa igihe cyo kwemeza cyarangiye kuri telefone.'
                    : recipientSettings.payment_instructions || 'Ubutumwa bwo kwishyura bwoherejwe kuri telefone yawe. Kanda PIN wemeze.'}
                </p>
              </div>
            </div>

            <button
              onClick={resetActiveDonation}
              className="text-xs font-semibold px-3 py-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-xl shadow-2xs border border-slate-200 cursor-pointer transition-colors"
            >
              {activeDonation.status === 'successful' ? 'Tanga Indi Nkunga' : 'Funga'}
            </button>
          </div>

          {/* Receipt Details Grid */}
          <div className="mt-4 pt-3 border-t border-slate-200/50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold opacity-60">Reference ID</span>
              <div className="flex items-center gap-1 font-mono font-bold">
                <span>{activeDonation.internal_reference}</span>
                <button
                  type="button"
                  onClick={() => handleCopyReference(activeDonation.internal_reference)}
                  className="hover:opacity-75 cursor-pointer text-slate-600"
                  title="Copy reference"
                >
                  {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold opacity-60">Amafaranga</span>
              <p className="font-bold font-mono">{activeDonation.amount.toLocaleString()} RWF</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold opacity-60">Uburyo (Network)</span>
              <p className="font-bold uppercase">{activeDonation.provider_slug}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold opacity-60">Imimerere</span>
              <p className="font-bold capitalize">{activeDonation.status}</p>
            </div>
          </div>

          {/* Action buttons on completion */}
          {(activeDonation.status === 'failed' || activeDonation.status === 'cancelled' || activeDonation.status === 'expired') && (
            <div className="mt-3 pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={resetActiveDonation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ongera Ugerageze (Try Again)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. Main Donation Form (Hidden or Reset when successfully completed) */}
      {(!activeDonation || activeDonation.status !== 'successful') && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Form Error alert */}
          {(formError || contextError) && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError || contextError}</span>
            </div>
          )}

          {/* Amount Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-800">
                Hitamo Amafaranga Ushaka Gutanga (Amount in RWF):
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                Min: {minAmt.toLocaleString()} F • Max: {maxAmt.toLocaleString()} F
              </span>
            </div>

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
                min={minAmt}
                max={maxAmt}
                step="100"
                placeholder={`Andika andi mafaranga wifuza (${minAmt.toLocaleString()} - ${maxAmt.toLocaleString()})...`}
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

          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Hitamo Uburyo bwo Kwishyura (Payment Network):
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProvider('mtn-momo')}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  provider === 'mtn-momo'
                    ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-slate-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>MTN Mobile Money</span>
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
                    ? 'bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
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

          {/* Donor Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Nimero ya Telefone yawe (MoMo Phone):
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
                  placeholder="Amazina yawe (cyangwa hitamo kutitangaza)"
                  disabled={isAnonymous}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Email & Purpose */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Imeyili (Optional Email for Receipt):
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={donorEmail}
                  onChange={e => setDonorEmail(e.target.value)}
                  placeholder="urugero@gmail.com (Optional)"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Intego y'Inkunga (Purpose of Donation):
              </label>
              <input
                type="text"
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="Intego y'inkunga yawe..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
          </div>

          {/* Anonymous toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="momo_anonymous"
              checked={isAnonymous}
              onChange={e => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 text-blue-950 rounded border-slate-300 focus:ring-blue-900 cursor-pointer"
            />
            <label htmlFor="momo_anonymous" className="text-xs text-slate-600 font-medium cursor-pointer">
              Sinshaka ko amazina yanjye agaragara mu ruhame (Anonymous donation)
            </label>
          </div>

          {/* Submit Button with Idempotency Protection */}
          <button
            type="submit"
            disabled={isSubmitting || isLoading || !finalAmount}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 hover:from-blue-900 hover:to-indigo-950 text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting || isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Gutunganya Ubusabe bwa Mobile Money...</span>
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
              <span>Direct Rwanda Payment Gateway (Secured 100%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-900" />
              <span>PIN ibazwa kuri telefone yawe gusa</span>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
