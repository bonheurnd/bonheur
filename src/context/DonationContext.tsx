import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { PaymentTransaction, PaymentProvider } from '../types';
import { useAuth } from './AuthContext';

interface InitiateDonationParams {
  donor_name: string;
  donor_phone: string;
  amount: number;
  provider_slug: 'mtn-momo' | 'airtel-money' | string;
  donation_purpose: string;
  is_anonymous?: boolean;
}

interface InitiateDonationResult {
  success: boolean;
  transaction?: PaymentTransaction;
  reference?: string;
  instructions?: string;
  error?: string;
}

interface PhoneValidationResult {
  valid: boolean;
  provider: 'mtn-momo' | 'airtel-money' | null;
  formatted: string;
  error?: string;
}

interface DonationContextType {
  providers: PaymentProvider[];
  donations: PaymentTransaction[];
  activeDonation: PaymentTransaction | null;
  isLoading: boolean;
  error: string | null;
  initiateDonation: (params: InitiateDonationParams) => Promise<InitiateDonationResult>;
  checkDonationStatus: (reference: string) => Promise<PaymentTransaction | null>;
  fetchUserDonationHistory: () => Promise<PaymentTransaction[]>;
  fetchAdminDonations: () => Promise<PaymentTransaction[]>;
  fetchPaymentProviders: () => Promise<PaymentProvider[]>;
  validateRwandaPhone: (phone: string) => PhoneValidationResult;
  setActiveDonation: (donation: PaymentTransaction | null) => void;
  resetActiveDonation: () => void;
}

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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = localStorage.getItem('lalumiere_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Validate Rwanda phone number
  const validateRwandaPhone = useCallback((phone: string): PhoneValidationResult => {
    const clean = phone.replace(/[\s\-\(\)\.]/g, '');
    let normalized = clean;
    if (normalized.startsWith('+250')) {
      normalized = normalized.substring(4);
    } else if (normalized.startsWith('250')) {
      normalized = normalized.substring(3);
    } else if (normalized.startsWith('0')) {
      normalized = normalized.substring(1);
    }

    if (normalized.length !== 9) {
      return {
        valid: false,
        provider: null,
        formatted: phone,
        error: 'Nimero ya telefone igomba kuba igizwe n\'imibare 9 (urugero: 078XXXXXXX cyangwa 072XXXXXXX)',
      };
    }

    const prefix = normalized.substring(0, 2);
    let provider: 'mtn-momo' | 'airtel-money' | null = null;
    if (['78', '79'].includes(prefix)) {
      provider = 'mtn-momo';
    } else if (['72', '73'].includes(prefix)) {
      provider = 'airtel-money';
    } else {
      return {
        valid: false,
        provider: null,
        formatted: `+250${normalized}`,
        error: 'Nimero igomba kuba iya MTN (078, 079) cyangwa Airtel (072, 073)',
      };
    }

    return {
      valid: true,
      provider,
      formatted: `+250${normalized}`,
    };
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
  const fetchAdminDonations = useCallback(async (): Promise<PaymentTransaction[]> => {
    try {
      const headers = getAuthHeaders();
      if (!headers.Authorization) return [];
      const res = await fetch('/api/admin/donations', { headers });
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

  // Initiate donation
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
            amount: Number(params.amount),
            provider_slug: params.provider_slug,
            donation_purpose: params.donation_purpose,
            is_anonymous: Boolean(params.is_anonymous),
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
          internal_reference: data.reference || `LLC-${Date.now()}`,
          donor_name: params.donor_name,
          donor_phone: params.donor_phone,
          amount: params.amount,
          currency: 'RWF',
          provider_slug: params.provider_slug,
          donation_purpose: params.donation_purpose,
          status: 'pending',
          is_anonymous: Boolean(params.is_anonymous),
          created_at: new Date().toISOString(),
        };

        setActiveDonation(transaction);
        setDonations(prev => [transaction, ...prev]);

        return {
          success: true,
          transaction,
          reference: data.reference,
          instructions: data.instructions,
        };
      } catch (err: any) {
        const errMsg = err.message || 'Habaye ikosa rya interineti mu gutangiza kwishyura.';
        setError(errMsg);
        return { success: false, error: errMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [getAuthHeaders]
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
    fetchPaymentProviders();
    if (user) {
      fetchUserDonationHistory();
    }
  }, [user, fetchPaymentProviders, fetchUserDonationHistory]);

  const value: DonationContextType = {
    providers,
    donations,
    activeDonation,
    isLoading,
    error,
    initiateDonation,
    checkDonationStatus,
    fetchUserDonationHistory,
    fetchAdminDonations,
    fetchPaymentProviders,
    validateRwandaPhone,
    setActiveDonation,
    resetActiveDonation,
  };

  return <DonationContext.Provider value={value}>{children}</DonationContext.Provider>;
};

export const useDonation = (): DonationContextType => {
  const context = useContext(DonationContext);
  if (!context) {
    // Provide a safe fallback if used outside of DonationProvider
    return {
      providers: defaultProviders,
      donations: [],
      activeDonation: null,
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
