import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChoirLogo } from '../ChoirLogo';
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  Activity,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Terminal,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  AdminLoginDiagnosticReport,
  runAdminSelfDiagnostic,
} from '../../utils/adminLoginDiagnostic';

interface AdminLoginPortalProps {
  onBackToHome?: () => void;
  onSuccess?: () => void;
}

export const AdminLoginPortal: React.FC<AdminLoginPortalProps> = ({ onBackToHome, onSuccess }) => {
  const { user, adminLogin, logout, lastDiagnosticReport } = useAuth();
  const [email, setEmail] = useState(user?.email || 'lalumierechoir@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<AdminLoginDiagnosticReport | null>(lastDiagnosticReport);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const report = await adminLogin(email.trim(), password);
      setDiagnosticReport(report);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const caughtReport = err.diagnosticReport || null;
      if (caughtReport) {
        setDiagnosticReport(caughtReport);
      }
      setError(
        caughtReport?.rejectionAnalysis?.detailedExplanation ||
        err.message ||
        'Kwinjira byanze. Suzuma imeyili n\'ijambo ry\'ibanga.'
      );
      setShowDiagnostics(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunDiagnosticTest = async (testEmail = email, testPass = password) => {
    setIsDiagnosing(true);
    setError('');
    try {
      const report = await runAdminSelfDiagnostic(testEmail, testPass);
      setDiagnosticReport(report);
      setShowDiagnostics(true);
      if (!report.validation.isValid) {
        setError(report.rejectionAnalysis.detailedExplanation || 'Credentials rejected by server');
      } else {
        setError('');
      }
    } catch (err: any) {
      setError(err?.message || 'Diagnostic failed to run');
    } finally {
      setIsDiagnosing(false);
    }
  };

  const setPresetCredentials = (presetEmail: string, presetPass = 'Amasezerano1') => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setError('');
  };

  return (
    <div className="py-8 px-4 flex flex-col items-center justify-center min-h-[75vh]">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-xl border border-slate-200/90 space-y-6">
        {/* Choir Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-amber-50 border border-amber-200/60 mb-1">
            <ChoirLogo size="md" />
          </div>
          <div className="flex items-center justify-center gap-1.5 text-blue-900 font-extrabold text-xs tracking-wider uppercase">
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <span>Admin Control Portal</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-serif">
            Kwinjira mu Buyobozi
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            La Lumiere Choir • Content Management & Administration System
          </p>
        </div>

        {/* Notice if already logged in with non-admin account */}
        {user && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-2 text-amber-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Konti winjiyemo ntabwo ifite uburenganzira bwa Admin.</p>
                <p className="text-[11px] text-amber-700">
                  Ubu winjiye nka: <span className="font-mono font-semibold">{user.email}</span> ({user.role})
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-1 border-t border-amber-200/60">
              <button
                type="button"
                onClick={logout}
                className="text-xs font-bold text-amber-900 hover:underline"
              >
                Sohoka muri iyi konti (Log out)
              </button>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl font-medium space-y-1.5 animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="font-semibold leading-relaxed">{error}</span>
            </div>
            {diagnosticReport && !diagnosticReport.validation.isValid && (
              <p className="text-[11px] text-rose-700 pl-6">
                Impamvu yagaragaye:{' '}
                <span className="font-bold">{diagnosticReport.rejectionAnalysis.code}</span> (HTTP{' '}
                {diagnosticReport.response.status})
              </p>
            )}
          </div>
        )}

        {/* Secure login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Imeyili y'Ubuyobozi (Admin Email):
              </label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setPresetCredentials('lalumierechoir@gmail.com')}
                  className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md hover:bg-blue-100 transition-colors"
                  title="Use choir admin email"
                >
                  lalumierechoir@
                </button>
                <button
                  type="button"
                  onClick={() => setPresetCredentials('nd.bonheur1@gmail.com')}
                  className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md hover:bg-blue-100 transition-colors"
                  title="Use owner admin email"
                >
                  nd.bonheur1@
                </button>
              </div>
            </div>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="lalumierechoir@gmail.com"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Ijambo ry'Ibanga (Password):
              </label>
              <button
                type="button"
                onClick={() => setPassword('Amasezerano1')}
                className="text-[10px] font-semibold text-amber-700 hover:text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md hover:bg-amber-100 transition-colors"
                title="Fill verified default password"
              >
                Uzuza: Amasezerano1
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password.length > 0 && password.length !== password.trim().length && (
              <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Icyitonderwa: Ijambo ry'ibanga ririmo imyanya (spaces) mu ntangiriro cyangwa mpera.
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isLoading || isDiagnosing}
              className="flex-1 py-3 bg-blue-950 hover:bg-blue-900 text-white text-xs font-extrabold rounded-xl shadow-md transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <span>{isLoading ? 'Gusuzuma uburenganzira...' : 'Injira mu Buyobozi (Admin Sign In)'}</span>
            </button>
            <button
              type="button"
              disabled={isLoading || isDiagnosing}
              onClick={() => handleRunDiagnosticTest()}
              className="px-3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              title="Run credential & payload diagnostic"
            >
              <Activity className={`w-3.5 h-3.5 text-blue-600 ${isDiagnosing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Diagnostic</span>
            </button>
          </div>
        </form>

        {/* Diagnostic Toggle & Drawer */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-blue-600" />
              <span>Admin Login Diagnostics & Telemetry</span>
              {diagnosticReport && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    diagnosticReport.validation.isValid
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  HTTP {diagnosticReport.response.status}
                </span>
              )}
            </div>
            {showDiagnostics ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showDiagnostics && (
            <div className="mt-3 p-4 bg-slate-900 text-slate-200 rounded-2xl space-y-4 text-xs font-mono shadow-inner border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  Live Diagnostic Telemetry
                </span>
                <button
                  type="button"
                  onClick={() => handleRunDiagnosticTest()}
                  disabled={isDiagnosing}
                  className="text-[10px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isDiagnosing ? 'animate-spin' : ''}`} />
                  <span>Re-test</span>
                </button>
              </div>

              {!diagnosticReport ? (
                <p className="text-slate-400 text-[11px] py-2">
                  Nta suzuma ryari ryakorwa. Kanda "Injira" cyangwa "Diagnostic" kugira ngo usuzume payload na headers.
                </p>
              ) : (
                <div className="space-y-3">
                  {/* Rejection Root Cause / Result Highlight */}
                  <div
                    className={`p-3 rounded-xl border ${
                      diagnosticReport.validation.isValid
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {diagnosticReport.validation.isValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <p className="font-bold text-[12px]">
                          {diagnosticReport.validation.isValid
                            ? 'Uruhushya rwemewe (Authentication Approved 200 OK)'
                            : diagnosticReport.rejectionAnalysis.title}
                        </p>
                        <p className="text-[11px] leading-relaxed text-slate-300">
                          {diagnosticReport.validation.isValid
                            ? `Token yemejwe kuri ${diagnosticReport.user?.email} (${diagnosticReport.user?.role}).`
                            : diagnosticReport.rejectionAnalysis.detailedExplanation}
                        </p>
                        {!diagnosticReport.validation.isValid && diagnosticReport.rejectionAnalysis.suggestedFix && (
                          <p className="text-[10px] text-amber-300 pt-1 font-sans">
                            <span className="font-bold">Igisubizo (Fix):</span> {diagnosticReport.rejectionAnalysis.suggestedFix}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 1. Request Payload & Headers */}
                  <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      1. Request Payload & Headers
                    </p>
                    <div className="space-y-1 text-slate-300">
                      <div>
                        <span className="text-slate-500">Endpoint:</span>{' '}
                        <span className="text-emerald-400">{diagnosticReport.request.method}</span>{' '}
                        <span>{diagnosticReport.request.url}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Headers:</span>{' '}
                        <span className="text-blue-300">
                          Content-Type: {diagnosticReport.request.headers['Content-Type']} | Accept: {diagnosticReport.request.headers['Accept']}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Payload email:</span>{' '}
                        <span className="text-amber-300 font-bold">"{diagnosticReport.request.payload.email}"</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Password length:</span>{' '}
                        <span>{diagnosticReport.request.payload.passwordLength} chars</span>{' '}
                        <span className="text-slate-500">({diagnosticReport.request.payload.maskedPassword})</span>
                        {diagnosticReport.request.payload.hasLeadingOrTrailingWhitespace && (
                          <span className="ml-1 text-rose-400 font-bold">[WHITESPACE DETECTED]</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Response Status & Validation */}
                  <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      2. Backend Response Validation
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 text-slate-300">
                      <div>
                        <span className="text-slate-500">HTTP Status:</span>{' '}
                        <span
                          className={`font-bold ${
                            diagnosticReport.validation.isStatusCodeExpected
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {diagnosticReport.response.status} {diagnosticReport.response.statusText}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Expected:</span>{' '}
                        <span className="text-slate-400">200 OK</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Content-Type:</span>{' '}
                        <span
                          className={
                            diagnosticReport.validation.isContentTypeExpected
                              ? 'text-emerald-400'
                              : 'text-amber-400'
                          }
                        >
                          {diagnosticReport.response.contentType || 'none'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Body Format:</span>{' '}
                        <span
                          className={
                            diagnosticReport.validation.isBodyFormatExpected
                              ? 'text-emerald-400 font-bold'
                              : 'text-rose-400 font-bold'
                          }
                        >
                          {diagnosticReport.validation.isBodyFormatExpected ? 'Valid JSON' : 'Failed Format'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Token Returned:</span>{' '}
                        <span className={diagnosticReport.validation.hasToken ? 'text-emerald-400' : 'text-slate-500'}>
                          {diagnosticReport.validation.hasToken ? 'Yes (JWT)' : 'No'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">User Role:</span>{' '}
                        <span className="text-amber-300 font-bold">
                          {diagnosticReport.response.parsedBody?.user?.role ||
                            diagnosticReport.response.parsedBody?.diagnostic?.accountRole ||
                            'n/a'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Raw Response Body Snippet */}
                  {diagnosticReport.response.parsedBody && (
                    <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 space-y-1 text-[10px]">
                      <p className="text-slate-400 font-bold uppercase tracking-wider">
                        3. Raw Response Body
                      </p>
                      <pre className="text-slate-300 overflow-x-auto p-1.5 bg-slate-900 rounded border border-slate-800/80">
                        {JSON.stringify(diagnosticReport.response.parsedBody, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Back and help links */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Subira Ahabanza (Home)</span>
            </button>
          )}
          <div className="flex items-center gap-1 text-[11px] text-slate-400 ml-auto">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>La Lumiere Security Core</span>
          </div>
        </div>
      </div>
    </div>
  );
};
