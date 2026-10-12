import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
  Cpu,
  Key,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  Sliders,
} from 'lucide-react';

export const AdminAiSettingsTab: React.FC = () => {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [model, setModel] = useState<string>('gemini-2.5-flash');
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [supportedModels, setSupportedModels] = useState<string[]>([
    'gemini-2.5-flash',
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-2.5-pro',
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/ai/config');
      const data = await res.json();
      if (data.success) {
        setEnabled(data.enabled);
        setModel(data.model);
        setHasApiKey(data.hasApiKey);
        if (Array.isArray(data.supportedModels)) {
          setSupportedModels(data.supportedModels);
        }
      }
    } catch (err: any) {
      setErrorMessage('Ntabwo byakunze gukuraho amakuru ya AI');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setErrorMessage(null);
      const token = localStorage.getItem('lalumiere_token');

      const res = await fetch('/api/admin/ai/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled,
          model,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
      fetchConfig();
    } catch (err: any) {
      setErrorMessage(err.message || 'Ikosa ryo kubika igenamiterere');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-blue-900 border-t-amber-400 rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Gufungura igenamiterere rya AI...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-blue-950 flex items-center justify-center shadow-inner font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 tracking-tight font-serif">
                Igenamiterere rya La Lumiere AI Assistant
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Genzura imikorere y'umufasha wa AI, model ikoreshwa, n'umutekano w'urufunguzo rwa Google GenAI.
              </p>
            </div>
          </div>

          <button
            onClick={fetchConfig}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors active:scale-95"
            title="Kuvugurura"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* API Key Status Notice */}
      <div
        className={`p-5 rounded-3xl border flex items-start gap-3.5 ${
          hasApiKey
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/70 border-amber-200 text-amber-950'
        }`}
      >
        <div
          className={`p-2 rounded-xl shrink-0 mt-0.5 ${
            hasApiKey ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {hasApiKey ? <CheckCircle2 className="w-5 h-5" /> : <Key className="w-5 h-5" />}
        </div>
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-sm">
            {hasApiKey
              ? 'Urufunguzo rwa Google Gemini API rwahujwe neza'
              : 'GEMINI_API_KEY ntirurashyirwaho kuri Render Environment'}
          </h4>
          <p className="leading-relaxed">
            {hasApiKey
              ? 'Seriveri ya Render ifite urufunguzo rwa GEMINI_API_KEY rurinzwe mu buryo bwa server-side. Ntirishobora kubonwa n\'umukoresha cyangwa muri browser.'
              : 'Kugira ngo AI itangire gutanga ibisubizo by\'ukuri, shyiramo GEMINI_API_KEY mu Igenamiterere rya Render (Render Dashboard > Environment Variables).'}
          </p>
          <div className="pt-1.5 flex items-center gap-2">
            <span className="font-semibold text-[11px] bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
              Umutekano: Inyandiko z'urufunguzo zibitswe kuri seriveri gusa (Server-Side Only)
            </span>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Igenamiterere rya AI Assistant ryabitswe neza muri sisitemu!</span>
          </div>
        )}

        {/* Enable / Disable Switch */}
        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
          <div className="space-y-0.5">
            <span className="font-bold text-sm text-slate-900 block">
              Gufungura AI Assistant ku bakoresha (Enable AI Assistant)
            </span>
            <span className="text-xs text-slate-500">
              Iyo bifunze, abakoresha babona ubutumwa ko umufasha yahagaritswe n'ubuyobozi.
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900"></div>
          </label>
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Model ya Google Gemini ikoreshwa (Selected AI Model)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {supportedModels.map(m => (
              <label
                key={m}
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  model === m
                    ? 'border-blue-900 bg-blue-50/70 text-blue-950 font-bold shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-4 h-4 text-blue-900" />
                  <span className="text-xs font-mono">{m}</span>
                </div>
                <input
                  type="radio"
                  name="model"
                  value={m}
                  checked={model === m}
                  onChange={() => setModel(m)}
                  className="w-4 h-4 text-blue-900"
                />
              </label>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Recommanded: <code>gemini-2.5-flash</code> itanga ibisubizo byihuse kandi bifite ubuhanga bw'indimi n'inyigisho.
          </p>
        </div>

        {/* Grounding & Data sources description */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 text-xs text-slate-600">
          <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-blue-900" />
            Amakuru AI yifashisha (Choir Grounding Sources)
          </h5>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Database y'indirimbo 94+:</strong> AI ishakisha mu magambo y'ukuri (lyrics) n'ibiciro by'indirimbo. Ntabwo ihimba amagambo.</li>
            <li><strong>Gahunda z'ibitaramo (Events):</strong> AI isoma gusa ibitaramo byanditswe n'abayobozi muri sisitemu.</li>
            <li><strong>Ibirango n'Ubuyobozi:</strong> Ibisobanuro bya Korali, ADEPR Nyanza, n'amakuru y'ubuyobozi yemejwe.</li>
          </ul>
        </div>

        {/* Submit button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Kubika...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Bika Igenamiterere (Save AI Settings)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
