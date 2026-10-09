import React, { useState, useEffect, useMemo } from 'react';
import {
  HeartHandshake,
  Download,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Settings,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  Save,
  PhoneCall,
  User,
  Sliders,
  Eye,
  EyeOff,
  X,
  CreditCard,
  Lock,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { PaymentTransaction, DonationRecipientSettings, GatewayStatusSummary, PaymentProvider } from '../../types';
import { useDonation } from '../../context/DonationContext';

interface AdminDonationSettingsTabProps {
  donations?: PaymentTransaction[];
  providers?: PaymentProvider[];
  onRefresh?: () => void;
}

export const AdminDonationSettingsTab: React.FC<AdminDonationSettingsTabProps> = ({
  donations: initialDonations,
  providers,
  onRefresh,
}) => {
  const {
    donations: contextDonations,
    fetchAdminDonations,
    checkDonationStatus,
    fetchDonationSettings,
  } = useDonation();

  // Internal sub-tab: 'transactions', 'recipient', 'gateway'
  const [subTab, setSubTab] = useState<'transactions' | 'recipient' | 'gateway'>('transactions');

  // Transactions state
  const [donations, setDonations] = useState<PaymentTransaction[]>(initialDonations || contextDonations || []);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [selectedTx, setSelectedTx] = useState<PaymentTransaction | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isVerifyingTx, setIsVerifyingTx] = useState<string | null>(null);

  // Recipient form state
  const [recipientForm, setRecipientForm] = useState<DonationRecipientSettings>({
    recipient_name: 'ISHIMWECYANE Rahab',
    recipient_phone: '0793917846',
    donation_purpose: 'La Lumiere Choir Donations',
    title: 'Gushyigikira Korali (Support La Lumiere Choir)',
    intro_message: "Umutima wanyu wo gutanga ufasha Korali La Lumiere mu bikorwa by'ivugabutumwa, gufata amajwi n'amashusho y'indirimbo nshya, no kwamamaza Ubutumwa Bwiza bwa Yesu Kristo.",
    payment_instructions: "Reba kuri telefone yawe maze wemeze umubare w'ibanga wa Mobile Money kwishyura (Enter your Mobile Money PIN to approve payment)",
    min_amount: 100,
    max_amount: 5000000,
    is_enabled: true,
    supported_methods: ['mtn-momo', 'airtel-money'],
  });
  const [isSavingRecipient, setIsSavingRecipient] = useState<boolean>(false);
  const [recipientSaveMessage, setRecipientSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Gateway status state
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatusSummary | null>(null);
  const [showMaskedPhones, setShowMaskedPhones] = useState<boolean>(true);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('lalumiere_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Load admin donation settings & gateway status
  const loadAdminSettings = async () => {
    try {
      const res = await fetch('/api/admin/donation-settings', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setRecipientForm(data.settings);
        }
        if (data.gateway) {
          setGatewayStatus(data.gateway);
        }
      }
    } catch (err) {
      console.error('Error loading admin donation settings:', err);
    }
  };

  // Load transactions list
  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const list = await fetchAdminDonations();
      if (list) {
        setDonations(list);
      }
      if (onRefresh) onRefresh();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminSettings();
    loadTransactions();
  }, []);

  useEffect(() => {
    if (initialDonations && initialDonations.length > 0) {
      setDonations(initialDonations);
    }
  }, [initialDonations]);

  // Handle Save Recipient Settings
  const handleSaveRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRecipient(true);
    setRecipientSaveMessage(null);
    try {
      const res = await fetch('/api/admin/donation-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(recipientForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      setRecipientSaveMessage({
        type: 'success',
        text: 'Amakuru y\'uwakira impano yahinduwe neza! (Donation recipient settings updated successfully)',
      });

      if (data.settings) {
        setRecipientForm(data.settings);
      }
      if (data.gateway) {
        setGatewayStatus(data.gateway);
      }

      // Refresh global context
      fetchDonationSettings();
    } catch (err: any) {
      setRecipientSaveMessage({
        type: 'error',
        text: err.message || 'Ntibyashoboye kubika amakuru. Ongera ugerageze.',
      });
    } finally {
      setIsSavingRecipient(false);
    }
  };

  // Verify a single transaction with gateway
  const handleVerifyWithGateway = async (txId: string, ref: string) => {
    setIsVerifyingTx(txId);
    try {
      const res = await fetch(`/api/admin/donations/${encodeURIComponent(txId)}/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.transaction) {
          setDonations(prev => prev.map(t => (t.id === txId ? data.transaction : t)));
          if (selectedTx && selectedTx.id === txId) {
            setSelectedTx(data.transaction);
          }
        }
      }
    } catch (err) {
      console.error('Error verifying transaction:', err);
    } finally {
      setIsVerifyingTx(null);
    }
  };

  // Calculated Metrics
  const metrics = useMemo(() => {
    let totalAmount = 0;
    let successfulCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    let cancelledCount = 0;

    donations.forEach(d => {
      if (d.status === 'successful') {
        totalAmount += Number(d.amount) || 0;
        successfulCount++;
      } else if (d.status === 'pending' || d.status === 'processing') {
        pendingCount++;
      } else if (d.status === 'failed') {
        failedCount++;
      } else if (d.status === 'cancelled' || d.status === 'expired') {
        cancelledCount++;
      }
    });

    const totalCount = donations.length;
    const successRate = totalCount > 0 ? Math.round((successfulCount / totalCount) * 100) : 0;

    return {
      totalAmount,
      successfulCount,
      pendingCount,
      failedCount,
      cancelledCount,
      totalCount,
      successRate,
    };
  }, [donations]);

  // Filtered transactions
  const filteredDonations = useMemo(() => {
    return donations.filter(d => {
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'pending'
          ? d.status === 'pending' || d.status === 'processing'
          : d.status === statusFilter;

      const matchesProvider =
        providerFilter === 'all' ? true : d.provider_slug === providerFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        d.donor_name.toLowerCase().includes(q) ||
        d.donor_phone.toLowerCase().includes(q) ||
        d.internal_reference.toLowerCase().includes(q) ||
        (d.provider_reference && d.provider_reference.toLowerCase().includes(q)) ||
        (d.user_email && d.user_email.toLowerCase().includes(q)) ||
        (d.donor_email && d.donor_email.toLowerCase().includes(q)) ||
        (d.donation_purpose && d.donation_purpose.toLowerCase().includes(q));

      return matchesStatus && matchesProvider && matchesSearch;
    });
  }, [donations, statusFilter, providerFilter, searchQuery]);

  // Export CSV using production server-side export endpoint
  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('lalumiere_token') || '';
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (providerFilter !== 'all') params.set('provider', providerFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/admin/export/donations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Export failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filenameDate = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `la-lumiere-donations-${filenameDate}.csv`);
      document.body.appendChild(link);
      link.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting donations CSV:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const maskPhone = (phone: string): string => {
    if (!phone || phone.length < 7) return phone;
    if (!showMaskedPhones) return phone;
    return phone.slice(0, 3) + '****' + phone.slice(-3);
  };

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Tabs Header */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 font-serif">
              Gucunga Inkunga n'Ubwishyu (Donations & Payment Gateway)
            </h2>
            <p className="text-xs text-slate-500">
              Uruhererekane rwa Mobile Money, Igenzura ry'Uwakira, n'Imimerere ya Gateway
            </p>
          </div>
        </div>

        {/* Subtab selection pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs">
          <button
            onClick={() => setSubTab('transactions')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === 'transactions'
                ? 'bg-white text-blue-950 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-amber-600" />
            <span>Uruhererekane (Transactions)</span>
          </button>

          <button
            onClick={() => setSubTab('recipient')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === 'recipient'
                ? 'bg-white text-blue-950 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-blue-900" />
            <span>Uwakira Inkunga (Recipient Info)</span>
          </button>

          <button
            onClick={() => setSubTab('gateway')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === 'gateway'
                ? 'bg-white text-blue-950 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Gateway & Webhook</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SUBTAB 1: TRANSACTIONS & FINANCIAL METRICS */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'transactions' && (
        <div className="space-y-6">
          {/* Summary Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Amafaranga Yakiriwe</span>
                <HeartHandshake className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                {metrics.totalAmount.toLocaleString()} <span className="text-xs font-sans text-slate-500">RWF</span>
              </p>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                {metrics.successfulCount} inkunga zemejwe
              </span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Zemejwe (Successful)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
                {metrics.successfulCount}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Igipimo cyo kwemeza: {metrics.successRate}%
              </span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Zitegerejwe (Pending)</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-amber-600 font-mono">
                {metrics.pendingCount}
              </p>
              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full inline-block mt-1">
                Zitarashyirwamo PIN
              </span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Zanze (Failed / Cancelled)</span>
                <AlertCircle className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-rose-600 font-mono">
                {metrics.failedCount + metrics.cancelledCount}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {metrics.failedCount} zanze • {metrics.cancelledCount} zateshejwe
              </span>
            </div>
          </div>

          {/* Transactions Table Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
            {/* Table Header & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 font-serif">
                  Urutonde rw'Uruhererekane rwa Mobile Money
                </h3>
                <p className="text-xs text-slate-500">
                  Uruhererekane rwose rwa MTN MoMo na Airtel Money mu Rwanda
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMaskedPhones(!showMaskedPhones)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                  title="Toggle Phone Masking"
                >
                  {showMaskedPhones ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{showMaskedPhones ? 'Erekana Telefone' : 'Hisha Telefone'}</span>
                </button>

                <button
                  type="button"
                  onClick={loadTransactions}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Vugurura</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={filteredDonations.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Shakisha ref, izina, telefone..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(['all', 'successful', 'pending', 'failed'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all capitalize cursor-pointer ${
                      statusFilter === tab
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab === 'all' ? 'Zose' : tab}
                  </button>
                ))}
              </div>

              <div>
                <select
                  value={providerFilter}
                  onChange={e => setProviderFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                >
                  <option value="all">Uburyo bwose (All Networks)</option>
                  <option value="mtn-momo">MTN Mobile Money</option>
                  <option value="airtel-money">Airtel Money</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase font-mono text-[10px]">
                    <th className="py-2.5 px-2">Reference</th>
                    <th className="py-2.5 px-2">Utanze</th>
                    <th className="py-2.5 px-2">Telefone</th>
                    <th className="py-2.5 px-2">Amafaranga</th>
                    <th className="py-2.5 px-2">Network</th>
                    <th className="py-2.5 px-2">Status</th>
                    <th className="py-2.5 px-2">Itariki</th>
                    <th className="py-2.5 px-2 text-right">Igikorwa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDonations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                        Nta nyemezabwishyu zibonetse bijyanye n'ibyo ushakishije.
                      </td>
                    </tr>
                  ) : (
                    filteredDonations.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-2 font-mono font-bold text-slate-800">
                          <button
                            type="button"
                            onClick={() => setSelectedTx(d)}
                            className="hover:underline text-blue-950 font-bold cursor-pointer"
                          >
                            {d.internal_reference}
                          </button>
                        </td>
                        <td className="py-2.5 px-2 font-medium text-slate-900">
                          {d.donor_name}
                          {d.is_anonymous ? (
                            <span className="ml-1 text-[9px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-normal">
                              Anon
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5 px-2 font-mono text-slate-600">
                          {maskPhone(d.donor_phone)}
                        </td>
                        <td className="py-2.5 px-2 font-mono font-bold text-emerald-900">
                          {d.amount.toLocaleString()} RWF
                        </td>
                        <td className="py-2.5 px-2 uppercase font-semibold text-slate-700">
                          {d.provider_slug}
                        </td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              d.status === 'successful'
                                ? 'bg-emerald-100 text-emerald-800'
                                : d.status === 'failed' || d.status === 'cancelled' || d.status === 'expired'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-slate-400 text-[10px] whitespace-nowrap">
                          {new Date(d.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedTx(d)}
                              className="px-2 py-1 text-[11px] font-semibold text-blue-950 hover:bg-blue-50 rounded-lg cursor-pointer"
                            >
                              Amakuru
                            </button>
                            {d.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => handleVerifyWithGateway(d.id, d.internal_reference)}
                                disabled={isVerifyingTx === d.id}
                                className="px-2 py-1 text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg cursor-pointer disabled:opacity-50"
                                title="Check status with gateway"
                              >
                                {isVerifyingTx === d.id ? '...' : 'Verify'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUBTAB 2: DONATION RECIPIENT SETTINGS (Configurable by Admin) */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'recipient' && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 font-serif">
              Igenzura ry'Amakuru y'Uwakira Impano (Donation Recipient Settings)
            </h3>
            <p className="text-xs text-slate-500">
              Hindura amazina y'uwakira, telefone/MoMo account, intego y'inkunga, n'amabwiriza agaragarira abaterankunga.
            </p>
          </div>

          {recipientSaveMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                recipientSaveMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}
            >
              {recipientSaveMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{recipientSaveMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveRecipient} className="space-y-5">
            {/* Recipient Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Izina ry'Uwakira (Registered Account Name):
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={recipientForm.recipient_name}
                    onChange={e => setRecipientForm({ ...recipientForm, recipient_name: e.target.value })}
                    placeholder="urugero: ISHIMWECYANE Rahab"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Izina ryanditswe kuri Mobile Money abaterankunga babona mbere yo kwemeza PIN.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nimero ya Telefone / MoMo Account:
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={recipientForm.recipient_phone}
                    onChange={e => setRecipientForm({ ...recipientForm, recipient_phone: e.target.value })}
                    placeholder="urugero: 0793917846"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Nimero ya Mobile Money mu Rwanda yakira impano (urugero: 0793917846).
                </p>
              </div>
            </div>

            {/* Donation Purpose & Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Umutwe w'Icyiciro (Section Title):
                </label>
                <input
                  type="text"
                  value={recipientForm.title}
                  onChange={e => setRecipientForm({ ...recipientForm, title: e.target.value })}
                  placeholder="Gushyigikira Korali La Lumiere"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Intego Rusange y'Inkunga (Payment Purpose):
                </label>
                <input
                  type="text"
                  value={recipientForm.donation_purpose}
                  onChange={e => setRecipientForm({ ...recipientForm, donation_purpose: e.target.value })}
                  placeholder="La Lumiere Choir Donations"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>
            </div>

            {/* Min and Max Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Amafaranga Fatizo (Minimum Donation in RWF):
                </label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={recipientForm.min_amount}
                  onChange={e => setRecipientForm({ ...recipientForm, min_amount: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Amafaranga ntarengwa (Maximum Donation in RWF):
                </label>
                <input
                  type="number"
                  min="1000"
                  step="10000"
                  value={recipientForm.max_amount}
                  onChange={e => setRecipientForm({ ...recipientForm, max_amount: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>
            </div>

            {/* Payment instructions */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Amabwiriza yo Kwishyura (Payment Instructions):
              </label>
              <textarea
                rows={3}
                value={recipientForm.payment_instructions}
                onChange={e => setRecipientForm({ ...recipientForm, payment_instructions: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>

            {/* Enable/Disable Toggle */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-xs text-slate-900">Emera Kwakira Inkunga kuri Interineti (Online Donations Enabled)</p>
                <p className="text-[11px] text-slate-500">Iyo bihagaritswe, abasura urubuga ntibashobora gutangiza kwishyura.</p>
              </div>
              <input
                type="checkbox"
                checked={recipientForm.is_enabled}
                onChange={e => setRecipientForm({ ...recipientForm, is_enabled: e.target.checked })}
                className="w-5 h-5 text-blue-950 rounded border-slate-300 focus:ring-blue-900 cursor-pointer"
              />
            </div>

            {/* Submit button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingRecipient}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingRecipient ? 'Kubika...' : 'Bika Impinduka (Save Changes)'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUBTAB 3: GATEWAY STATUS & WEBHOOK CONFIGURATION */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'gateway' && (
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 font-serif">
                  Imimerere ya Direct Rwanda Payment Gateway
                </h3>
                <p className="text-xs text-slate-500">
                  Amakuru y'itumanaho hagati ya backend ya La Lumiere na Payment Provider (Paypack / MTN MoMo).
                </p>
              </div>

              {/* Status Badge */}
              <div>
                {gatewayStatus?.status === 'connected' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold border border-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    Payment Gateway: Connected (Live)
                  </span>
                ) : gatewayStatus?.status === 'sandbox_ready' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold border border-amber-300">
                    <Clock className="w-4 h-4" />
                    Payment Gateway: Sandbox Ready (Test)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-bold border border-rose-300">
                    <AlertCircle className="w-4 h-4" />
                    Payment Gateway: Configuration Required
                  </span>
                )}
              </div>
            </div>

            {/* Provider Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400">Provider Yatoranyijwe</span>
                <p className="font-extrabold text-sm text-slate-900">{gatewayStatus?.provider_name}</p>
                <p className="text-slate-600">
                  Environment: <span className="font-mono font-bold uppercase">{gatewayStatus?.environment}</span>
                </p>
                <p className="text-slate-600">
                  Refunds: <span className="font-semibold">{gatewayStatus?.supports_refunds ? 'Supported' : 'Merchant Portal Only'}</span>
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400">Webhook Callback URL</span>
                <div className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800">
                  <span className="truncate flex-1">{gatewayStatus?.webhook_url}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(gatewayStatus?.webhook_url || '')}
                    className="text-slate-500 hover:text-slate-900 shrink-0 cursor-pointer"
                    title="Copy Webhook URL"
                  >
                    {copiedText === gatewayStatus?.webhook_url ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Shyira iyi URL muri Paypack cyangwa MTN developer portal kwakira ibyemezo bya Mobile Money.
                </p>
              </div>
            </div>

            {/* Credentials Checklist (Never reveals secrets!) */}
            <div className="p-4 rounded-2xl border border-slate-200 space-y-3 text-xs bg-slate-50/40">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-600" />
                <h4 className="font-bold text-slate-900">Umutekano n'Ibyangombwa bya Server (Environment Variables)</h4>
              </div>
              <p className="text-slate-500 text-[11px]">
                Ibyangombwa bya Live Gateway bibikwa mu buryo bw'umutekano muri Render Environment Variables gusa. Ntabwo byigera bishyirwa muri frontend cyangwa muri git.
              </p>

              {gatewayStatus?.missing_credentials && gatewayStatus.missing_credentials.length > 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <p className="font-bold text-amber-900 text-xs">Ibyangombwa bikiburamo kuri Server mbere yo kwakira impano nyazo (Live):</p>
                  <ul className="list-disc pl-5 text-[11px] font-mono text-amber-800">
                    {gatewayStatus.missing_credentials.map(k => (
                      <li key={k}>{k}</li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-amber-700 pt-1">
                    Ubuyobozi bubishyira muri Render Dashboard &rarr; Environment Variables.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-900 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Ibyangombwa byose bya gateway byashyizwemo neza kuri server.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TRANSACTION DETAILS MODAL */}
      {/* ------------------------------------------------------------- */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 font-serif">
                  Amakuru y'Inyemezabwishyu
                </h3>
                <p className="text-xs font-mono text-slate-500">{selectedTx.internal_reference}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Amafaranga</span>
                  <p className="font-extrabold text-base text-slate-900 font-mono">
                    {selectedTx.amount.toLocaleString()} RWF
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Imimerere (Status)</span>
                  <p className="mt-0.5">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        selectedTx.status === 'successful'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedTx.status === 'failed' || selectedTx.status === 'cancelled'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {selectedTx.status}
                    </span>
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Utanze (Donor):</span>
                  <span className="font-bold text-slate-900">{selectedTx.donor_name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Telefone:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedTx.donor_phone}</span>
                </div>
                {selectedTx.donor_email && (
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Imeyili:</span>
                    <span className="text-slate-900">{selectedTx.donor_email}</span>
                  </div>
                )}
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Uburyo (Network):</span>
                  <span className="font-bold uppercase text-slate-900">{selectedTx.provider_slug}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Gateway Ref:</span>
                  <span className="font-mono text-slate-800">{selectedTx.provider_reference || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Itariki y'Icyifuzo:</span>
                  <span className="text-slate-800">{new Date(selectedTx.created_at).toLocaleString()}</span>
                </div>
                {selectedTx.completed_at && (
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Igihe Yemejwe:</span>
                    <span className="text-slate-800">{new Date(selectedTx.completed_at).toLocaleString()}</span>
                  </div>
                )}
                {selectedTx.failure_reason && (
                  <div className="flex justify-between py-1.5 border-b border-slate-100 text-rose-700">
                    <span>Impamvu y'Icyanze:</span>
                    <span className="font-medium text-right">{selectedTx.failure_reason}</span>
                  </div>
                )}
                <div className="py-1.5">
                  <span className="text-slate-500 block mb-0.5">Intego y'Inkunga:</span>
                  <p className="text-slate-800 bg-slate-50 p-2 rounded-xl text-[11px]">
                    {selectedTx.donation_purpose || 'La Lumiere Choir Donations'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {selectedTx.status === 'pending' ? (
                <button
                  type="button"
                  onClick={() => handleVerifyWithGateway(selectedTx.id, selectedTx.internal_reference)}
                  disabled={isVerifyingTx === selectedTx.id}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingTx === selectedTx.id ? 'animate-spin' : ''}`} />
                  <span>Sura Imimerere kuri Gateway</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Funga
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
