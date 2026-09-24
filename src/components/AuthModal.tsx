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
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  mode: 'login' | 'register' = 'login'
): AuthErrorInfo {
  // If no status or status is 0, it's typically a network connection or offline issue
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
          "Reba neza niba imeyili n'inyuguti nkuru cyangwa into z'ijambo ry'ibanga byanditse neza, cyangwa ukande 'Ongera ugerageze' (Retry).",
        isBackendDirectMessage: Boolean(directMsg),
      };

    case 403:
      return {
        statusCode: 403,
        title: "Konti Yahagaritswe (Account Disabled - HTTP 403)",
        message:
          directMsg ||
          "Konti yawe yahagaritswe n'ubuyobozi bwa Korali (is_disabled). Ntabwo ushobora kuyinjiramo muri iki gihe.",
        advice: "Niba ari ikosa, vugana n'ubuyobozi bwa La Lumiere Choir kugira ngo ifungurwe.",
        isBackendDirectMessage: Boolean(directMsg),
      };

    case 404:
      return {
        statusCode: 404,
        title: "Seriveri Ntiyabonetse (Endpoint Not Found - HTTP 404)",
        message:
          directMsg ||
          "Umurongo wa seriveri wo gutunganya konti ntiwabonetse muri aka kanya.",
        advice: "Tegereza gato hanyuma ukande 'Ongera ugerageze' (Retry).",
        isBackendDirectMessage: Boolean(directMsg),
      };

    case 409:
      return {
        statusCode: 409,
        title: "Imeyili Isanzwe Ifite Konti (Email Already Registered - HTTP 409)",
        message:
          directMsg ||
          "Iyi meyili isanzwe yanditswe muri La Lumiere Choir. Ntiwakongera kuyiyandikisha bundi bushya.",
        advice: "Hitamo ahanditse 'Injira (Sign In)' hejuru kugira ngo winjire, cyangwa ukoreshe indi meyili.",
        isBackendDirectMessage: Boolean(directMsg),
      };

    case 429:
      return {
        statusCode: 429,
        title: "Mugerageje Kenshi Cyane (Too Many Requests - HTTP 429)",
        message:
          directMsg ||
          "Mwagerageje kwinjira inshuro nyinshi mu kanya gato cyane kubera umutekano.",
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

/**
 * Returns an appropriate icon based on the HTTP status code
 */
function renderStatusIcon(status: number) {
  if (status === 0) return <WifiOff className="w-5 h-5 text-rose-600 shrink-0" />;
  if (status === 401) return <Lock className="w-5 h-5 text-amber-600 shrink-0" />;
  if (status === 403) return <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />;
  if (status === 409) return <UserX className="w-5 h-5 text-amber-600 shrink-0" />;
  if (status === 429) return <Clock className="w-5 h-5 text-amber-600 shrink-0" />;
  if (status >= 500) return <ServerCrash className="w-5 h-5 text-rose-600 shrink-0" />;
  return <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorInfo, setErrorInfo] = useState<AuthErrorInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on modal open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (mode === 'register' && nameInputRef.current) {
          nameInputRef.current.focus();
        } else if (emailInputRef.current) {
          emailInputRef.current.focus();
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

  /**
   * Clears all previous input state and resets the form, then focuses the first input field
   */
  const handleRetry = () => {
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setErrorInfo(null);

    setTimeout(() => {
      if (mode === 'register' && nameInputRef.current) {
        nameInputRef.current.focus();
      } else if (emailInputRef.current) {
        emailInputRef.current.focus();
      }
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-1">
          <ChoirLogo size="md" className="mx-auto mb-1" />
          <h3 className="font-extrabold text-lg text-slate-900 font-serif">
            {mode === 'login' ? 'Injira muri Konti (Sign In)' : 'Iyandikishe (Create Account)'}
          </h3>
          <p className="text-xs text-slate-500">
            La Lumiere Choir • ADEPR Nyanza, Rwanda
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorInfo(null);
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mode === 'login' ? 'bg-white text-blue-950 shadow-2xs' : 'text-slate-500'
            }`}
          >
            Injira (Sign In)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorInfo(null);
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mode === 'register' ? 'bg-white text-blue-950 shadow-2xs' : 'text-slate-500'
            }`}
          >
            Iyandikishe (Sign Up)
          </button>
        </div>

        {/* Status-Code Aware Error Alert with Clear 'Retry' Action */}
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

            {/* Clear Input State & Retry Action */}
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
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all"
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
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all"
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
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all"
                  autoComplete="tel"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Ijambo ry'Ibanga (Password):</label>
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
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all"
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
        </form>

        <div className="pt-2 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500">
            {mode === 'login'
              ? 'Ntabwo uragira konti? Hitamo "Iyandikishe" hejuru.'
              : 'Ufite konti? Hitamo "Injira" hejuru.'}
          </p>
        </div>
      </div>
    </div>
  );
};
