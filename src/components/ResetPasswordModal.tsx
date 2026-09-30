import React, { useState, useEffect } from 'react';
import { ChoirLogo } from './ChoirLogo';
import {
  X,
  Lock,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight
} from 'lucide-react';

interface ResetPasswordModalProps {
  isOpen: boolean;
  token: string;
  email?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  token,
  email: initialEmail = '',
  onClose,
  onSuccess
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Validate token on mount
  useEffect(() => {
    if (!isOpen || !token) return;

    let isMounted = true;
    setIsVerifying(true);
    setErrorMessage('');

    fetch('/api/auth/verify-reset-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email: initialEmail })
    })
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data.valid) {
          setTokenValid(true);
          if (data.email) setEmail(data.email);
        } else {
          setTokenValid(false);
          setErrorMessage(data.error || 'Iyi link yo gusubiramo ijambo ry\'ibanga yarengeje igihe cyangwa yarakoreshejwe (Invalid or expired reset link).');
        }
      })
      .catch(err => {
        if (!isMounted) return;
        setTokenValid(false);
        setErrorMessage('Habaye ikosa mu kugenzura iyi link. Reba niba interineti yawe ikora neza.');
      })
      .finally(() => {
        if (isMounted) setIsVerifying(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, token, initialEmail]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (newPassword.length < 6) {
      setErrorMessage('Ijambo ry\'ibanga rigomba kugira byibuze inyuguti 6 (Minimum 6 characters required).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Amagambo y\'ibanga yombi ntabwo ahuye (Passwords do not match). Ongera usuzume neza.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          newPassword
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccessMessage('Ijambo ry\'ibanga ryawe ryahinduwe neza! Ushobora kwinjira noneho.');
      setTimeout(() => {
        onSuccess();
      }, 1800);
    } catch (err: any) {
      setErrorMessage(err.message || 'Habaye ikosa mu guhindura ijambo ry\'ibanga. Ongera ugerageze.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-1">
          <ChoirLogo size="md" className="mx-auto mb-1" />
          <h3 className="font-extrabold text-lg text-slate-900 font-serif flex items-center justify-center gap-1.5">
            <KeyRound className="w-5 h-5 text-blue-900" />
            <span>Ijambo ry'Ibanga Rishya</span>
          </h3>
          <p className="text-xs text-slate-500">
            Shyiraho ijambo ry'ibanga rishya rya konti yawe
          </p>
        </div>

        {isVerifying ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-900 border-t-amber-400 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-600 font-medium">Gusuzuma agaciro ka link yo gusubiramo...</p>
          </div>
        ) : tokenValid === false ? (
          <div className="space-y-4 py-2">
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-extrabold text-rose-950">Link Ntiyemewe cyangwa Yarangiye</h4>
                <p className="text-[11px] leading-relaxed text-rose-800">{errorMessage}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-blue-950 text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors cursor-pointer shadow-xs"
            >
              Funga (Saba Indi Link Nshya)
            </button>
          </div>
        ) : (
          <>
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="text-[11px]">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-bold text-[11px]">{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {email && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Imeyili ya Konti:</label>
                  <input
                    type="text"
                    disabled
                    value={email}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-medium text-slate-600 text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ijambo ry'Ibanga Rishya (New Password):
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Byibuze inyuguti 6..."
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all text-xs"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Subiramo Ijambo ry'Ibanga (Confirm Password):
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Ongera wandike rya jambo..."
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all text-xs"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || Boolean(successMessage)}
                className="w-full py-3 bg-blue-950 hover:bg-blue-900 text-white font-extrabold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 mt-2 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-amber-400 rounded-full animate-spin" />
                    <span>Kubika...</span>
                  </>
                ) : (
                  <>
                    <span>Bika Ijambo ry'Ibanga Rishya</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
