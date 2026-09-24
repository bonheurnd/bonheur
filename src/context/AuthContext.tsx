import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { safeFetchJson } from '../utils/api';
import {
  performAdminLoginWithDiagnostics,
  AdminLoginDiagnosticReport
} from '../utils/adminLoginDiagnostic';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<AdminLoginDiagnosticReport>;
  runAdminDiagnostic: (email: string, password: string) => Promise<AdminLoginDiagnosticReport>;
  lastDiagnosticReport: AdminLoginDiagnosticReport | null;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { name?: string; phone?: string; avatar_url?: string }) => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const ADMIN_ROLES = ['super_admin', 'admin', 'content_admin', 'moderator'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('lalumiere_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [lastDiagnosticReport, setLastDiagnosticReport] = useState<AdminLoginDiagnosticReport | null>(null);

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const res = await safeFetchJson<{ user: User }>('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok && res.data?.user) {
        setUser(res.data.user);
      } else {
        localStorage.removeItem('lalumiere_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch auth user:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await safeFetchJson<{
      success?: boolean;
      message?: string;
      token?: string;
      user?: User;
      error?: string;
    }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    if (!res.ok || !res.data?.token || !res.data?.user) {
      const err: any = new Error(res.errorMessage || 'Login failed');
      err.status = res.status;
      err.statusText = res.statusText;
      err.data = res.data;
      throw err;
    }

    localStorage.setItem('lalumiere_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const adminLogin = async (email: string, password: string): Promise<AdminLoginDiagnosticReport> => {
    const report = await performAdminLoginWithDiagnostics(email, password);
    setLastDiagnosticReport(report);

    if (!report.validation.isValid || !report.token || !report.user) {
      const err: any = new Error(
        report.rejectionAnalysis.detailedExplanation ||
        report.errorMessage ||
        'Imeli cyangwa ijambo ry\'ibanga si byo (Invalid admin credentials)'
      );
      err.diagnosticReport = report;
      throw err;
    }

    localStorage.setItem('lalumiere_token', report.token);
    setToken(report.token);
    setUser(report.user);
    return report;
  };

  const runAdminDiagnostic = async (email: string, password: string): Promise<AdminLoginDiagnosticReport> => {
    const report = await performAdminLoginWithDiagnostics(email, password);
    setLastDiagnosticReport(report);
    return report;
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    const res = await safeFetchJson<{
      success?: boolean;
      message?: string;
      token?: string;
      user?: User;
      error?: string;
    }>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password, phone }),
    });

    if (!res.ok || !res.data?.token || !res.data?.user) {
      const err: any = new Error(res.errorMessage || 'Registration failed');
      err.status = res.status;
      err.statusText = res.statusText;
      err.data = res.data;
      throw err;
    }

    localStorage.setItem('lalumiere_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('lalumiere_token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data: { name?: string; phone?: string; avatar_url?: string }) => {
    if (!token) return;
    const res = await safeFetchJson<{ user: User }>('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok || !res.data?.user) {
      throw new Error(res.errorMessage || 'Failed to update profile');
    }

    setUser(res.data.user);
  };

  const deleteAccount = async () => {
    if (!token) return;
    const res = await safeFetchJson('/api/auth/delete-account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(res.errorMessage || 'Failed to delete account');
    }

    logout();
  };

  const refreshUser = async () => {
    if (token) {
      await fetchCurrentUser(token);
    }
  };

  const isAdmin = Boolean(user?.role && ADMIN_ROLES.includes(user.role));
  const isSuperAdmin = Boolean(user?.role === 'super_admin' || user?.role === 'admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        adminLogin,
        runAdminDiagnostic,
        lastDiagnosticReport,
        register,
        logout,
        updateProfile,
        deleteAccount,
        refreshUser,
        isAdmin,
        isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
