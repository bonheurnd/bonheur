import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { PaymentTransaction, PaymentProvider, DonationRecipientSettings, GatewayStatusSummary } from '../types';
import { useAuth } from './AuthContext';

export interface InitiateDonationParams {
  donor_name: string;
  donor_phone: string;
  donor_email?: string;
  amount: number;
  provider_slug: 'mtn-momo' | 'airtel-money' | string;
  donation_purpose?: string;
  is_anonymous?: boolean;
  idempotency_key?: string;
}

export interface InitiateDonationResult {
  success: boolean;
  transaction?: PaymentTransaction;
  reference?: string;
  instructions?: string;
  error?: string;
  gatewayStatus?: string;
}

export interface PhoneValidationResult {
  valid: boolean;
  provider: 'mtn-momo' | 'airtel-money' | null;
  formatted: string;
  formattedInternational?: string;
  error?: string;
}

export interface DonationContextType {
  providers: PaymentProvider[];
  donations: PaymentTransaction[];
  activeDonation: PaymentTransaction | null;
  recipientSettings: DonationRecipientSettings;
  gatewaySummary: GatewayStatusSummary | null;
  isLoading: boolean;
  error: string | null;
  initiateDonation: (params: InitiateDonationParams) => Promise<InitiateDonationResult>;
  checkDonationStatus: (reference: string) => Promise<PaymentTransaction | null>;
  fetchUserDonationHistory: () => Promise<PaymentTransaction[]>;
  fetchAdminDonations: (filters?: Record<string, string>) => Promise<PaymentTransaction[]>;
  fetchPaymentProviders: () => Promise<PaymentProvider[]>;
  fetchDonationSettings: () => Promise<void>;
  validateRwandaPhone: (phone: string) => PhoneValidationResult;
  setActiveDonation: (donation: PaymentTransaction | null) => void;
  resetActiveDonation: () => void;
}

const defaultRecipientSettings: DonationRecipientSettings = {
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
};

const defaultGatewaySummary: GatewayStatusSummary = {
  is_configured: false,
  status: 'sandbox_ready',
  environment: 'test',
  active_provider: 'paypack',
  provider_name: 'Paypack Rwanda Gateway (MTN & Airtel)',
  webhook_url: '/api/payments/webhook',
  missing_credentials: [],
  supports_refunds: true,
  min_amount: 100,
  max_amount: 5000000,
};

const defaultProviders: PaymentProvider[] = [
  {
    id: 'prov_mtn',
    name: 'MTN Mobile Money Rwanda',
    slug: 'mtn-momo',
    is_enabled: 1,
    environment: 'production',
    merchant_account_id: '*182*8*1*...',
  },
  {
    id: 'prov_airtel',
    name: 'Airtel Money Rwanda',
    slug: 'airtel-money',
    is_enabled: 1,
    environment: 'production',
    merchant_account_id: '*500*4*...',
  },
];

const DonationContext = createContext<DonationContextType | null>(null);

export const DonationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<PaymentProvider[]>(defaultProviders);
  const [donations, setDonations] = useState<PaymentTransaction[]>([]);
  const [activeDonation, setActiveDonation] = useState<PaymentTransaction | null>(null);
  const [recipientSettings, setRecipientSettings] = useState<DonationRecipientSettings>(defaultRecipientSettings);
  const [gatewaySummary, setGatewaySummary] = useState<GatewayStatusSummary | null>(defaultGatewaySummary);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = localStorage.getItem('lalumiere_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Real-time SSE listener for donation updates
  useEffect(() => {
    try {
      const es = new EventSource('/api/events/stream');
      eventSourceRef.current = es;

      es.addEventListener('donation_updated', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          const updatedTx: PaymentTransaction = payload.data?.transaction || payload.transaction;
          if (updatedTx && updatedTx.internal_reference) {
            setDonations(prev => {
              const idx = prev.findIndex(item => item.internal_reference === updatedTx.internal_reference);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = updatedTx;
                return next;
              }
              return [updatedTx, ...prev];
            });

            setActiveDonation(current => {
              if (current && current.internal_reference === updatedTx.internal_reference) {
                return updatedTx;
              }
              return current;
            });
          }
        } catch {
          // ignore
        }
      });

      return () => {
        es.close();
      };
    } catch {
      // ignore
    }
  }, []);

  // Validate Rwanda phone number
  const validateRwandaPhone = useCallback((phone: string): PhoneValidationResult => {
    if (!phone) {
      return { valid: false, provider: null, formatted: '', error: 'Nimero ya telefone irakenewe' };
    }
    const clean = phone.replace(/[\s\-\(\)\.]/g, '').replace(/^\+/, '');
    let digits9 = '';
    if (clean.startsWith('250') && clean.length === 12) {
      digits9 = clean.substring(3);
    } else if (clean.startsWith('0') && clean.length === 10) {
      digits9 = clean.substring(1);
    } else if (clean.length === 9) {
      digits9 = clean;
    } else {
      return {
        valid: false,
        provider: null,
        formatted: phone,
        error: "Nimero igomba kuba igizwe n'imibare 10 (urugero: 078XXXXXXX cyangwa 072XXXXXXX)",
      };
    }

    const prefix = digits9.substring(0, 2);
    let provider: 'mtn-momo' | 'airtel-money' | null = null;
    if (['78', '79'].includes(prefix)) {
      provider = 'mtn-momo';
    } else if (['72', '73'].includes(prefix)) {
      provider = 'airtel-money';
    } else {
      return {
        valid: false,
        provider: null,
        formatted: `0${digits9}`,
        error: 'Nimero igomba kuba iya MTN (078, 079) cyangwa Airtel (072, 073)',
      };
    }

    return {
      valid: true,
      provider,
      formatted: `0${digits9}`,
      formattedInternational: `250${digits9}`,
    };
  }, []);

  // Fetch public settings & gateway status
  const fetchDonationSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/donations/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setRecipientSettings({
            ...defaultRecipientSettings,
            ...data.settings,
          });
        }
        if (data.gateway) {
          setGatewaySummary(data.gateway);
        }
      }
    } catch {
      // keep defaults
    }
  }, []);

  // Fetch payment providers
  const fetchPaymentProviders = useCallback(async (): Promise<PaymentProvider[]> => {
    try {
      const res = await fetch('/api/payment-providers');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProviders(data);
          return data;
        }
      }
    } catch {
      // ignore
    }
    return defaultProviders;
  }, []);

  // Fetch history for logged-in user
  const fetchUserDonationHistory = useCallback(async (): Promise<PaymentTransaction[]> => {
    try {
      const headers = getAuthHeaders();
      if (!headers.Authorization) return [];
      const res = await fetch('/api/donations/history', { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setDonations(data);
          return data;
        }
      }
    } catch {
      // ignore
    }
    return [];
  }, [getAuthHeaders]);

  // Fetch all donations for admin
  const fetchAdminDonations = useCallback(
    async (filters?: Record<string, string>): Promise<PaymentTransaction[]> => {
      try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return [];
        const params = new URLSearchParams(filters || {});
        const res = await fetch(`/api/admin/donations?${params.toString()}`, { headers });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.donations || [];
          setDonations(list);
          return list;
        }
      } catch {
        // ignore
      }
      return [];
    },
    [getAuthHeaders]
  );

  // Initiate real donation via backend gateway
  const initiateDonation = useCallback(
    async (params: InitiateDonationParams): Promise<InitiateDonationResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        };

        const res = await fetch('/api/donations/initiate', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            donor_name: params.donor_name.trim(),
            donor_phone: params.donor_phone.trim(),
            donor_email: params.donor_email ? params.donor_email.trim() : null,
            amount: Number(params.amount),
            provider_slug: params.provider_slug,
            donation_purpose: params.donation_purpose || recipientSettings.donation_purpose,
            is_anonymous: Boolean(params.is_anonymous),
            idempotency_key: params.idempotency_key,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          const errMsg = data.error || 'Ntibyashoboye gutangiza kwishyura. Ongera ugerageze.';
          setError(errMsg);
          return { success: false, error: errMsg };
        }

        const transaction: PaymentTransaction = data.transaction || {
          id: data.reference || `momo_${Date.now()}`,
          internal_reference: data.reference || `DON-2026-${Date.now()}`,
          donor_name: params.donor_name,
          donor_phone: params.donor_phone,
          donor_email: params.donor_email,
          amount: params.amount,
          currency: 'RWF',
          provider_slug: params.provider_slug,
          donation_purpose: params.donation_purpose || recipientSettings.donation_purpose,
          status: 'pending',
          is_anonymous: Boolean(params.is_anonymous),
          created_at: new Date().toISOString(),
        };

        setActiveDonation(transaction);
        setDonations(prev => [transaction, ...prev]);

        return {
          success: true,
          transaction,
          reference: data.reference || transaction.internal_reference,
          instructions: data.instructions,
          gatewayStatus: data.gatewayStatus || 'pending',
        };
      } catch (err: any) {
        const errMsg = err.message || 'Habaye ikosa rya interineti mu gutangiza kwishyura.';
        setError(errMsg);
        return { success: false, error: errMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [getAuthHeaders, recipientSettings]
  );

  // Check donation status
  const checkDonationStatus = useCallback(
    async (reference: string): Promise<PaymentTransaction | null> => {
      try {
        const res = await fetch(`/api/donations/status/${encodeURIComponent(reference)}`);
        if (res.ok) {
          const data = await res.json();
          const tx: PaymentTransaction = data.transaction || data;
          if (tx && tx.status) {
            setActiveDonation(tx);
            setDonations(prev =>
              prev.map(item => (item.internal_reference === reference ? tx : item))
            );
            return tx;
          }
        }
      } catch {
        // ignore
      }
      return null;
    },
    []
  );

  const resetActiveDonation = useCallback(() => {
    setActiveDonation(null);
    setError(null);
  }, []);

  useEffect(() => {
    fetchDonationSettings();
    fetchPaymentProviders();
    if (user) {
      fetchUserDonationHistory();
    }
  }, [user, fetchDonationSettings, fetchPaymentProviders, fetchUserDonationHistory]);

  const value: DonationContextType = {
    providers,
    donations,
    activeDonation,
    recipientSettings,
    gatewaySummary,
    isLoading,
    error,
    initiateDonation,
    checkDonationStatus,
    fetchUserDonationHistory,
    fetchAdminDonations,
    fetchPaymentProviders,
    fetchDonationSettings,
    validateRwandaPhone,
    setActiveDonation,
    resetActiveDonation,
  };

  return <DonationContext.Provider value={value}>{children}</DonationContext.Provider>;
};

export const useDonation = (): DonationContextType => {
  const context = useContext(DonationContext);
  if (!context) {
    return {
      providers: defaultProviders,
      donations: [],
      activeDonation: null,
      recipientSettings: defaultRecipientSettings,
      gatewaySummary: defaultGatewaySummary,
      isLoading: false,
      error: null,
      initiateDonation: async () => ({
        success: false,
        error: 'DonationProvider is not mounted',
      }),
      checkDonationStatus: async () => null,
      fetchUserDonationHistory: async () => [],
      fetchAdminDonations: async () => [],
      fetchPaymentProviders: async () => defaultProviders,
      fetchDonationSettings: async () => {},
      validateRwandaPhone: (phone: string) => ({
        valid: false,
        provider: null,
        formatted: phone,
      }),
      setActiveDonation: () => {},
      resetActiveDonation: () => {},
    };
  }
  return context;
};
