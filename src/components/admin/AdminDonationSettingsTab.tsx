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
} from 'lucide-react';
import { PaymentTransaction, PaymentProvider } from '../../types';
import { useDonation } from '../../context/DonationContext';

interface AdminDonationSettingsTabProps {
  donations?: PaymentTransaction[];
  providers?: PaymentProvider[];
  onRefresh?: () => void;
}

export const AdminDonationSettingsTab: React.FC<AdminDonationSettingsTabProps> = ({
  donations: propDonations,
  providers: propProviders,
  onRefresh,
}) => {
  const {
    donations: contextDonations,
    providers: contextProviders,
    fetchAdminDonations,
    fetchPaymentProviders,
  } = useDonation();

  const [donations, setDonations] = useState<PaymentTransaction[]>(
    propDonations || contextDonations || []
  );
  const [providers, setProviders] = useState<PaymentProvider[]>(
    propProviders || contextProviders || []
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'successful' | 'pending' | 'failed'>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedDonations, fetchedProviders] = await Promise.all([
        fetchAdminDonations(),
        fetchPaymentProviders(),
      ]);
      if (fetchedDonations) setDonations(fetchedDonations);
      if (fetchedProviders) setProviders(fetchedProviders);
      if (onRefresh) onRefresh();
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (propDonations && propDonations.length > 0) {
      setDonations(propDonations);
    } else {
      loadData();
    }
    if (propProviders && propProviders.length > 0) {
      setProviders(propProviders);
    }
  }, [propDonations, propProviders]);

  // Metrics calculation
  const metrics = useMemo(() => {
    let totalAmount = 0;
    let successfulCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    donations.forEach(d => {
      if (d.status === 'successful') {
        totalAmount += Number(d.amount) || 0;
        successfulCount++;
      } else if (d.status === 'pending' || d.status === 'processing') {
        pendingCount++;
      } else if (d.status === 'failed' || d.status === 'cancelled') {
        failedCount++;
      }
    });

    const totalCount = donations.length;
    const successRate = totalCount > 0 ? Math.round((successfulCount / totalCount) * 100) : 0;

    return {
      totalAmount,
      successfulCount,
      pendingCount,
      failedCount,
      totalCount,
      successRate,
    };
  }, [donations]);

  // Filtered donations list
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
        (d.donation_purpose && d.donation_purpose.toLowerCase().includes(q));

      return matchesStatus && matchesProvider && matchesSearch;
    });
  }, [donations, statusFilter, providerFilter, searchQuery]);

  // CSV Export handler
  const handleExportCSV = () => {
    if (filteredDonations.length === 0) return;
    const headers = [
      'Reference',
      'Donor Name',
      'Donor Phone',
      'Amount (RWF)',
      'Provider',
      'Purpose',
      'Status',
      'Date',
      'Anonymous',
    ];

    const rows = filteredDonations.map(d => [
      d.internal_reference,
      `"${(d.donor_name || '').replace(/"/g, '""')}"`,
      d.donor_phone,
      d.amount,
      d.provider_slug,
      `"${(d.donation_purpose || '').replace(/"/g, '""')}"`,
      d.status,
      d.created_at,
      d.is_anonymous ? 'Yes' : 'No',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `lalumiere_donations_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Amafaranga Yose</span>
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
            <span className="text-[11px] font-bold uppercase tracking-wider">Zemejwe (Success)</span>
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
            <span className="text-[11px] font-bold uppercase tracking-wider">Zanze (Failed)</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-600 font-mono">
            {metrics.failedCount}
          </p>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Ibyanze cyangwa ibyataye igihe
          </span>
        </div>
      </div>

      {/* 2. Main Transactions Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
        {/* Header & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 font-serif">
              Urutonde rw'Impano n'Inkunga (MoMo Transactions)
            </h3>
            <p className="text-xs text-slate-500">
              Ibyinjijwe byose binyuze kuri MTN Mobile Money na Airtel Money mu Rwanda
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Vugurura</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={filteredDonations.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sohora Raporo (CSV)</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Shakisha izina, telefone, ref..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
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
              <option value="all">Uburyo bwose (All Providers)</option>
              <option value="mtn-momo">MTN Mobile Money</option>
              <option value="airtel-money">Airtel Money</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase font-mono text-[10px]">
                <th className="py-2.5 px-2">Ref</th>
                <th className="py-2.5 px-2">Utanze</th>
                <th className="py-2.5 px-2">Telefone</th>
                <th className="py-2.5 px-2">Amafaranga</th>
                <th className="py-2.5 px-2">Uburyo</th>
                <th className="py-2.5 px-2">Intego</th>
                <th className="py-2.5 px-2">Status</th>
                <th className="py-2.5 px-2">Itariki</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDonations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                    Nta nyemezabwishyu zibonetse bijyanye n'ibyo ushakishije.
                  </td>
                </tr>
              ) : (
                filteredDonations.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-2 font-mono font-bold text-slate-800">
                      <div className="flex items-center gap-1">
                        <span>{d.internal_reference}</span>
                        <button
                          onClick={() => handleCopy(d.internal_reference)}
                          className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          title="Copy Reference"
                        >
                          {copiedRef === d.internal_reference ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 font-medium text-slate-900">
                      {d.donor_name}
                      {d.is_anonymous ? (
                        <span className="ml-1.5 text-[9px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-normal">
                          Anonymous
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 px-2 font-mono text-slate-600">{d.donor_phone}</td>
                    <td className="py-2.5 px-2 font-mono font-bold text-emerald-900">
                      {d.amount.toLocaleString()} RWF
                    </td>
                    <td className="py-2.5 px-2 uppercase font-semibold text-slate-700">
                      {d.provider_slug}
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 max-w-xs truncate" title={d.donation_purpose}>
                      {d.donation_purpose || 'General Support'}
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          d.status === 'successful'
                            ? 'bg-emerald-100 text-emerald-800'
                            : d.status === 'failed' || d.status === 'cancelled'
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Payment Gateway Settings Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <Settings className="w-5 h-5 text-blue-950" />
          <div>
            <h3 className="font-extrabold text-base text-slate-900 font-serif">
              Amakuru n'Igenzura rya Payment Gateway (MTN & Airtel Rwanda)
            </h3>
            <p className="text-xs text-slate-500">
              Amakuru y'uburyo bwo kwakira amafaranga akoreshwa n'urubuga (Merchant configuration)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {providers.map(p => (
            <div
              key={p.id}
              className="p-4 rounded-2xl border border-slate-200 space-y-2.5 bg-slate-50/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-900" />
                  <h4 className="font-bold text-sm text-slate-900">{p.name}</h4>
                </div>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-950 font-mono text-[10px] font-bold rounded-full">
                  {p.environment}
                </span>
              </div>

              <div className="text-xs space-y-1 text-slate-600">
                <p>
                  <span className="font-semibold">Provider Slug:</span>{' '}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[11px] font-mono">
                    {p.slug}
                  </code>
                </p>
                <p>
                  <span className="font-semibold">Endpoint:</span>{' '}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[11px] font-mono">
                    {p.api_endpoint || 'Proxy internal gateway'}
                  </code>
                </p>
                <p>
                  <span className="font-semibold">Merchant Code:</span>{' '}
                  <span className="font-mono text-slate-800 font-semibold">
                    {p.merchant_account_id || 'Configured via .env'}
                  </span>
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Active & Ready
                </span>
                <span className="text-[10px]">Webhook: /api/donations/callback</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
