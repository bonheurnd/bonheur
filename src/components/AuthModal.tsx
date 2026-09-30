import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChoirLogo } from './ChoirLogo';
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  AlertCircle,
  RotateCcw,
  ShieldAlert,
  WifiOff,
  ServerCrash,
  UserX,
  Clock,
  Sparkles,
  HelpCircle,
  KeyRound,
  Send,
  CheckCircle2,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenResetWithToken?: (token: string, email: string) => void;
}

interface AuthErrorInfo {
  statusCode: number;
  title: string;
  message: string;
  advice: string;
  isBackendDirectMessage?: boolean;
}

/**
 * Returns a specific, human-readable error description and actionable guidance
 * based on the HTTP status code returned from the backend.
 */
function getHumanReadableAuthError(
  status?: number,
  fallbackMessage?: string,
  mode: 'login' | 'register' | 'forgot_password' | 'forgot_identifier' = 'login'
): AuthErrorInfo {
  if (!status || status === 0) {
    return {
      statusCode: 0,
      title: "Ikibazo cy'Umurongo (Network Connection Error)",
      message: "Ntabwo bishobotse guhura na seriveri. Nta murongo cyangwa interineti yawe yagize ikibazo.",
      advice: "Suzuma niba interineti yawe ikora neza, hanyuma ukande 'Ongera ugerageze' (Retry).",
    };
  }

  const directMsg = fallbackMessage && fallbackMessage.trim().length > 0 ? fallbackMessage.trim() : null;

  switch (status) {
    case 400: {
      const isAlreadyRegistered =
        Boolean(directMsg && (directMsg.toLowerCase().includes('already registered') || directMsg.toLowerCase().includes('isanzwe ikoreshwa')));

      if (isAlreadyRegistered) {
        return {
          statusCode: 400,
          title: "Imeyili Isanzwe Yanditswe (Email Already Registered - HTTP 400)",
          message: directMsg || "Iyi meyili isanzwe ifite konti muri sisitemu.",
          advice: "Hitamo ahanditse 'Injira (Sign In)' hejuru kugira ngo winjire, cyangwa ukande 'Ongera ugerageze' (Retry) ukoreshe indi meyili.",
          isBackendDirectMessage: Boolean(directMsg),
        };
      }

      return {
        statusCode: 400,
        title: "Amakuru Adahagije (Bad Request - HTTP 400)",
        message:
          directMsg ||
          (mode === 'login'
            ? "Imeyili n'ijambo ry'ibanga birakenewe kugira ngo winjire."
            : "Amazina, imeyili n'ijambo ry'ibanga birakenewe kugira ngo wiyandikishe."),
        advice: "Suzuma ko amakuru yose yuzuye neza, cyangwa ukande 'Ongera ugerageze' (Retry) usubiremo.",
        isBackendDirectMessage: Boolean(directMsg),
      };
    }

    case 401:
      return {
        statusCode: 401,
        title: "Imeyili cyangwa Ijambo ry'Ibanga si byo (Invalid Credentials - HTTP 401)",
        message:
          directMsg ||
          "Imeyili cyangwa ijambo ry'ibanga winjije ntabwo bihuye n'ibiri muri sisitemu.",
        advice:
          "Reba neza niba imeyili n'inyuguti nkuru cyangwa into z'ijambo ry'ibanga byanditse neza, cyangwa ukoreshe 'Wibagiwe Ijambo ry'Ibanga?'.",
        isBackendDirectMessage: Boolean(directMsg),
      };

    case 403:
      return {
        statusCode: 403,
        title: "Konti Yahagaritswe (Account Disabled - HTTP 403)",
        message:
          directMsg ||
          "Konti yawe yahagaritswe n'ubuyobozi bwa Korali kubera impamvu z'umutekano cyangwa imyitwarire.",
        advice: "Vugana n'ubuyobozi bwa Korali (lalumierechoir@gmail.com) kugira ngo bakurebere icyo kibazo.",
        isBackendDirectMessage: Boolean(directMsg),
      };

    case 409:
      return {
        statusCode: 409,
        title: "Imeyili Isanzwe Ikoreshwa (Conflict - HTTP 409)",
        message:
          directMsg ||
          "Iyi meyili isanzwe ifite konti muri Korali La Lumiere.",
        advice: "Hitamo ahanditse 'Injira (Sign In)' winjire, cyangwa ukande 'Wibagiwe Ijambo ry'Ibanga?'.",
        isBackendDirectMessage: Boolean(directMsg),
      };

    case 429:
      return {
        statusCode: 429,
        title: "Mugerageje Kenshi Cyane (Too Many Requests - HTTP 429)",
        message:
          directMsg ||
          "Mwagerageje inshuro nyinshi mu kanya gato cyane kubera umutekano.",
        advice: "Tegereza amasegonda make mbere yo kongera kugerageza.",
        isBackendDirectMessage: Boolean(directMsg),
      };

    default:
      if (status >= 500) {
        return {
          statusCode: status,
          title: `Ikosa rya Seriveri (Server Error - HTTP ${status})`,
          message:
            directMsg ||
            "Habaye ikosa imbere muri seriveri y'urubuga cyangwa database igihe yatunganyaga ubusabe bwawe.",
          advice: "Ntugire ikibazo; kanda 'Ongera ugerageze' (Retry) wongere ushyiremo amakuru yawe.",
          isBackendDirectMessage: Boolean(directMsg),
        };
      }
      return {
        statusCode: status,
        title: `Ikibazo cyo Kwinjira (HTTP ${status})`,
        message: directMsg || "Habaye ikibazo mu gutunganya ubusabe bwawe muri sisitemu.",
        advice: "Kanda 'Ongera ugerageze' (Retry) wongere ushyiremo amakuru yawe.",
        isBackendDirectMessage: Boolean(directMsg),
      };
  }
}

function renderStatusIcon(status: number) {
  if (status === 0) return <WifiOff className="w-5 h-5 text-rose-600 shrink-0" />;
  if (status === 401) return <Lock className="w-5 h-5 text-amber-600 shrink-0" />;
  if (status === 403) return <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />;
  if (status === 409) return <UserX className="w-5 h-5 text-amber-600 shrink-0" />;
  if (status === 429) return <Clock className="w-5 h-5 text-amber-600 shrink-0" />;
  if (status >= 500) return <ServerCrash className="w-5 h-5 text-rose-600 shrink-0" />;
  return <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onOpenResetWithToken }) => {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password' | 'forgot_identifier'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorInfo, setErrorInfo] = useState<AuthErrorInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Recovery states
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [identifierResult, setIdentifierResult] = useState<{
    maskedEmail?: string;
    message: string;
    isAdminAccount?: boolean;
    success?: boolean;
  } | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const recoveryEmailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (mode === 'register' && nameInputRef.current) {
          nameInputRef.current.focus();
        } else if (mode === 'login' && emailInputRef.current) {
          emailInputRef.current.focus();
        } else if (mode === 'forgot_password' && recoveryEmailInputRef.current) {
          recoveryEmailInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInfo(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password, phone);
      }
      onClose();
    } catch (err: any) {
      const statusCode = typeof err.status === 'number' ? err.status : 0;
      const rawMsg = err.message || '';
      const parsedError = getHumanReadableAuthError(statusCode, rawMsg, mode);
      setErrorInfo(parsedError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoverySuccess('');
    setDevResetUrl(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail.trim() }),
      });

      const data = await res.json();

      if (!res.ok && res.status !== 200) {
        throw new Error(data.error || 'Habaye ikosa mu kohereza ubutumwa');
      }

      setRecoverySuccess(
        data.message ||
          "Niba iyi imeyili ifite konti muri sisitemu, amabwiriza yo gusubiramo ijambo ry'ibanga yoherejwe kuri imeyili yawe."
      );

      if (data.devResetUrl) {
        setDevResetUrl(data.devResetUrl);
      }
    } catch (err: any) {
      setRecoveryError(err.message || 'Habaye ikosa mu gusaba gusubiramo ijambo ry\'ibanga.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotIdentifierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setIdentifierResult(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-identifier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: recoveryPhone.trim() }),
      });

      const data = await res.json();
      setIdentifierResult(data);
    } catch (err: any) {
      setRecoveryError(err.message || 'Habaye ikosa mu gushakisha konti yawe.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setErrorInfo(null);
    setRecoveryEmail('');
    setRecoveryPhone('');
    setRecoverySuccess('');
    setRecoveryError('');
    setDevResetUrl(null);
    setIdentifierResult(null);

    setTimeout(() => {
      if (mode === 'register' && nameInputRef.current) {
        nameInputRef.current.focus();
      } else if (mode === 'login' && emailInputRef.current) {
        emailInputRef.current.focus();
      } else if (mode === 'forgot_password' && recoveryEmailInputRef.current) {
        recoveryEmailInputRef.current.focus();
      }
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
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
          <h3 className="font-extrabold text-lg text-slate-900 font-serif">
            {mode === 'login' && 'Injira muri Konti (Sign In)'}
            {mode === 'register' && 'Iyandikishe (Create Account)'}
            {mode === 'forgot_password' && 'Gusubiramo Ijambo ry\'Ibanga'}
            {mode === 'forgot_identifier' && 'Kumenya Imeyili yawe'}
          </h3>
          <p className="text-xs text-slate-500">
            La Lumiere Choir • ADEPR Nyanza, Rwanda
          </p>
        </div>

        {/* Mode Toggle between Login, Register, and Reset views */}
        {(mode === 'login' || mode === 'register' || mode === 'forgot_password') && (
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorInfo(null);
                setRecoveryError('');
                setRecoverySuccess('');
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                mode === 'login' ? 'bg-white text-blue-950 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Injira (Sign In)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorInfo(null);
                setRecoveryError('');
                setRecoverySuccess('');
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                mode === 'register' ? 'bg-white text-blue-950 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Iyandikishe (Sign Up)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('forgot_password');
                setErrorInfo(null);
                setRecoveryEmail(email || '');
                setRecoveryError('');
                setRecoverySuccess('');
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                mode === 'forgot_password' ? 'bg-white text-blue-950 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Gusubiramo (Reset)
            </button>
          </div>
        )}

        {/* Back Button for Forgot Identifier Mode */}
        {mode === 'forgot_identifier' && (
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setRecoveryError('');
              setRecoverySuccess('');
              setDevResetUrl(null);
              setIdentifierResult(null);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-700 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Subira ku Kwinjira (Back to Sign In)</span>
          </button>
        )}

        {/* Status-Code Aware Error Alert */}
        {errorInfo && (
          <div className="p-3.5 bg-rose-50 border border-rose-200/90 text-rose-900 rounded-2xl text-xs space-y-2.5 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-2.5">
              {renderStatusIcon(errorInfo.statusCode)}
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <h4 className="font-extrabold text-rose-950 text-xs">
                    {errorInfo.title}
                  </h4>
                  {errorInfo.statusCode > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-rose-200/70 text-rose-900 font-bold">
                      HTTP {errorInfo.statusCode}
                    </span>
                  )}
                </div>

                <p className="text-[11px] leading-relaxed text-rose-900 font-medium">
                  {errorInfo.message}
                </p>

                {errorInfo.advice && (
                  <p className="text-[10px] text-rose-800 leading-tight pt-0.5 flex items-start gap-1">
                    <span className="font-bold text-rose-950">Inama:</span>
                    <span>{errorInfo.advice}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-rose-200 flex items-center justify-between gap-2">
              <span className="text-[10px] text-rose-700 font-medium">
                Kanda hano usubiremo bushya:
              </span>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-rose-100/60 text-rose-900 text-xs font-bold rounded-xl border border-rose-300 shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Siba ibyari byanditswe usubiremo (Clear inputs and retry)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-700" />
                <span>Ongera ugerageze (Retry)</span>
              </button>
            </div>
          </div>
        )}

        {/* 1. LOGIN & REGISTER FORMS */}
        {(mode === 'login' || mode === 'register') && (
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            {mode === 'register' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Amazina yawe (Full Name):</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    ref={nameInputRef}
                    type="text"
                    required
                    value={name}
                    onChange={e => {
                      setName(e.target.value);
                      if (errorInfo) setErrorInfo(null);
                    }}
                    placeholder="Amazina y'ukuri..."
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all text-xs"
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">Imeyili (Email Address):</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={emailInputRef}
                  type="email"
                  required
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (errorInfo) setErrorInfo(null);
                  }}
                  placeholder="urugero@gmail.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all text-xs"
                  autoComplete="email"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nimero ya Terefone (Rwanda Phone):</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => {
                      setPhone(e.target.value);
                      if (errorInfo) setErrorInfo(null);
                    }}
                    placeholder="078... cyangwa 072..."
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all text-xs"
                    autoComplete="tel"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">Ijambo ry'Ibanga (Password):</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_password');
                      setErrorInfo(null);
                      setRecoveryEmail(email || '');
                    }}
                    className="text-[11px] font-bold text-blue-900 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Wibagiwe?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (errorInfo) setErrorInfo(null);
                  }}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all text-xs"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-950 hover:bg-blue-900 text-white font-extrabold rounded-xl shadow-md transition-transform active:scale-95 disabled:opacity-50 mt-2 cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-amber-400 rounded-full animate-spin" />
                  <span>Gutunganya...</span>
                </>
              ) : mode === 'login' ? (
                'Injira (Sign In)'
              ) : (
                'Komeza (Create Account)'
              )}
            </button>

            {/* Clear links for Forgotten Password and Forgotten Identifier */}
            {mode === 'login' && (
              <div className="pt-2 flex flex-col gap-1.5 text-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot_password');
                    setErrorInfo(null);
                    setRecoveryEmail(email || '');
                  }}
                  className="text-xs font-bold text-blue-950 hover:text-blue-800 inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  <span>Wibagiwe Ijambo ry'Ibanga? (Forgot Password?)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot_identifier');
                    setErrorInfo(null);
                  }}
                  className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Wibagiwe Imeyili cyangwa Umwirondoro? (Forgot Email or Username?)
                </button>
              </div>
            )}
          </form>
        )}

        {/* 2. FORGOT PASSWORD VIEW */}
        {mode === 'forgot_password' && (
          <div className="space-y-3.5 text-xs animate-in fade-in">
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl text-[11px] text-blue-950 leading-relaxed">
              Shyiramo imeyili yawe wandikishije muri Korali. Turakwoherereza link ifite igihe ntarengwa (1 hour) yo gushyiraho ijambo ry'ibanga rishya mu buryo butekanye.
            </div>

            {recoverySuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed font-medium">{recoverySuccess}</p>
                </div>

                {devResetUrl && (
                  <div className="pt-2 border-t border-emerald-200 space-y-1.5">
                    <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                      Uburyo bw'Igerageza (Development Link):
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const urlObj = new URL(devResetUrl);
                        const tokenParam = urlObj.searchParams.get('reset_token');
                        const emailParam = urlObj.searchParams.get('email');
                        if (tokenParam && onOpenResetWithToken) {
                          onOpenResetWithToken(tokenParam, emailParam || recoveryEmail);
                          onClose();
                        } else {
                          window.location.href = devResetUrl;
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer w-full justify-center"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Fungura Link yo Gusubiramo Ako Kanya</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {recoveryError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="text-[11px]">{recoveryError}</span>
              </div>
            )}

            {!recoverySuccess && (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Imeyili yawe (Registered Email):</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      ref={recoveryEmailInputRef}
                      type="email"
                      required
                      value={recoveryEmail}
                      onChange={e => setRecoveryEmail(e.target.value)}
                      placeholder="urugero@gmail.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all text-xs"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-blue-950 hover:bg-blue-900 text-white font-extrabold rounded-xl shadow-md transition-transform active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-amber-400 rounded-full animate-spin" />
                      <span>Gusaba Link...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Recovery Link</span>
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('forgot_identifier');
                  setRecoveryError('');
                  setRecoverySuccess('');
                }}
                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                Wibagiwe imeyili wandikishije? Kanda hano.
              </button>
            </div>
          </div>
        )}

        {/* 3. FORGOT IDENTIFIER (EMAIL) VIEW */}
        {mode === 'forgot_identifier' && (
          <div className="space-y-3.5 text-xs animate-in fade-in">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-700 leading-relaxed">
              Niba wibagiwe imeyili cyangwa izina wakoresheje wiyandikisha, andika nimero yawe ya terefone (Rwanda phone) twakumenyeshe imeyili yawe mu buryo bufunze kandi butekanye.
            </div>

            {identifierResult && (
              <div
                className={`p-3.5 rounded-2xl text-xs space-y-2 ${
                  identifierResult.success
                    ? 'bg-blue-50 border border-blue-200 text-blue-950'
                    : 'bg-amber-50 border border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-start gap-2">
                  {identifierResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 text-[11px] leading-relaxed">
                    <p>{identifierResult.message}</p>
                    {identifierResult.maskedEmail && (
                      <p className="font-mono font-bold text-xs bg-white px-2 py-1 rounded-lg border border-blue-200 inline-block text-blue-950">
                        {identifierResult.maskedEmail}
                      </p>
                    )}
                  </div>
                </div>

                {identifierResult.maskedEmail && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_password');
                      setRecoverySuccess('');
                      setRecoveryError('');
                    }}
                    className="w-full mt-2 py-2 bg-blue-950 text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors shadow-2xs cursor-pointer"
                  >
                    Komeza Gusubiramo Ijambo ry'Ibanga
                  </button>
                )}
              </div>
            )}

            {recoveryError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="text-[11px]">{recoveryError}</span>
              </div>
            )}

            <form onSubmit={handleForgotIdentifierSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nimero ya Terefone (Registered Phone Number):
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={recoveryPhone}
                    onChange={e => setRecoveryPhone(e.target.value)}
                    placeholder="078... cyangwa 072..."
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all text-xs"
                    autoComplete="tel"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-blue-950 hover:bg-blue-900 text-white font-extrabold rounded-xl shadow-md transition-transform active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-amber-400 rounded-full animate-spin" />
                    <span>Gushakisha...</span>
                  </>
                ) : (
                  <>
                    <HelpCircle className="w-4 h-4" />
                    <span>Shakisha Imeyili Yanjye</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500">
            {mode === 'login' && 'Ntabwo uragira konti? Hitamo "Iyandikishe" hejuru.'}
            {mode === 'register' && 'Ufite konti? Hitamo "Injira" hejuru.'}
            {(mode === 'forgot_password' || mode === 'forgot_identifier') && (
              <span>Ukeneye ubufasha bw'ubuyobozi? Andikira lalumierechoir@gmail.com</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
