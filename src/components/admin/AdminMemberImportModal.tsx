import React, { useState } from 'react';
import { safeFetchJson } from '../../utils/api';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  RefreshCw,
  Users,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface AdminMemberImportModalProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
}

interface PreviewRow {
  row_index: number;
  name: string;
  phone: string;
  email: string;
  voice: string;
  role: string;
  status: 'active' | 'inactive';
  is_valid: boolean;
  is_duplicate: boolean;
  duplicate_reason?: string;
  validation_error?: string;
}

interface PreviewData {
  preview: boolean;
  total_rows: number;
  valid_count: number;
  duplicate_count: number;
  error_count: number;
  can_import: boolean;
  rows: PreviewRow[];
}

export const AdminMemberImportModal: React.FC<AdminMemberImportModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExecutingImport, setIsExecutingImport] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filterPreviewTab, setFilterPreviewTab] = useState<'all' | 'valid' | 'duplicate' | 'error'>('all');

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    processSelectedFile(selected);
  };

  const processSelectedFile = (selected: File) => {
    if (!selected.name.endsWith('.csv') && !selected.type.includes('csv') && !selected.type.includes('text')) {
      setErrorMsg('Hitamo gusa idosiye yo mu bwoko bwa CSV (.csv)');
      return;
    }

    // Limit to 5MB
    if (selected.size > 5 * 1024 * 1024) {
      setErrorMsg('Idosiye irakabije kuba nini (Max 5MB)');
      return;
    }

    setFile(selected);
    setFileName(selected.name);
    setErrorMsg(null);
    setPreviewData(null);

    const reader = new FileReader();
    reader.onload = async event => {
      const text = event.target?.result as string;
      setCsvContent(text);
      await fetchPreview(text);
    };
    reader.onerror = () => {
      setErrorMsg('Habaye ikibazo mu gusoma idosiye');
    };
    reader.readAsText(selected);
  };

  // Fetch validation preview from backend
  const fetchPreview = async (content: string) => {
    try {
      setIsLoadingPreview(true);
      setErrorMsg(null);
      const token = localStorage.getItem('lalumiere_token');

      const res = await safeFetchJson<PreviewData>('/api/members/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          csv_content: content,
          preview: true,
        }),
      });

      if (res.ok && res.data) {
        setPreviewData(res.data);
      } else {
        setErrorMsg(res.error || res.errorMessage || 'Habaye ikibazo mu gusesengura CSV');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Execute actual import
  const handleConfirmImport = async () => {
    if (!csvContent || !previewData || previewData.valid_count === 0) return;

    try {
      setIsExecutingImport(true);
      setErrorMsg(null);
      const token = localStorage.getItem('lalumiere_token');

      const res = await safeFetchJson<{
        success: boolean;
        message: string;
        imported_count: number;
        duplicate_count: number;
        error_count: number;
      }>('/api/members/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          csv_content: csvContent,
          preview: false,
        }),
      });

      if (res.ok && res.data) {
        onSuccess(
          `Abaririmbyi ${res.data.imported_count} binjijwe neza muri sisitemu (${res.data.duplicate_count} bisubiramo basimbutswe)!`
        );
        onClose();
      } else {
        setErrorMsg(res.error || res.errorMessage || 'Habaye ikibazo mu kwinjiza abaririmbyi');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setIsExecutingImport(false);
    }
  };

  // Filter preview rows
  const displayedRows = (previewData?.rows || []).filter(r => {
    if (filterPreviewTab === 'valid') return r.is_valid && !r.is_duplicate;
    if (filterPreviewTab === 'duplicate') return r.is_duplicate;
    if (filterPreviewTab === 'error') return !r.is_valid && !r.is_duplicate;
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-900 text-amber-300 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 font-serif leading-tight">
                Kwinjiza Abaririmbyi muri CSV (CSV Import)
              </h3>
              <p className="text-[11px] text-slate-500">
                Suzuma mbere yo kwinjiza abaririmbyi benshi icyarimwe
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar: Download Sample Template */}
        <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-2xl flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="text-amber-900 font-semibold">
              Ukeneye icyitegererezo cya CSV (Template)?
            </span>
          </div>
          <a
            href="/api/members/template/csv"
            download="la-lumiere-members-template.csv"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold shadow-2xs transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Kura Template Hano</span>
          </a>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          {/* File Picker Drag & Drop Area */}
          {!previewData ? (
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 sm:p-8 text-center space-y-3 hover:border-blue-900 transition-colors">
              <Upload className="w-10 h-10 text-slate-400 mx-auto" />
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Kanda hano cyangwa ukururire dosiye ya CSV hano
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ikoresha inkingi: Name, Phone, Email, Voice, Role, Status
                </p>
              </div>

              <label className="inline-block px-4 py-2 bg-blue-950 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-blue-900 shadow-xs">
                <span>Hitamo Dosiye ya CSV</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {isLoadingPreview && (
                <div className="pt-2 flex items-center justify-center gap-2 text-xs text-blue-900 font-bold">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Gusesengura no kugenzura abaririmbyi bisubiramo...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Preview Stats Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-500 block">Bose hamwe (Total)</span>
                  <span className="text-base font-black text-slate-900">{previewData.total_rows}</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                  <span className="text-[10px] text-emerald-700 block font-bold">Bashya bo kwinjiza (New)</span>
                  <span className="text-base font-black text-emerald-800">{previewData.valid_count}</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                  <span className="text-[10px] text-amber-700 block font-bold">Bisubiramo (Duplicates)</span>
                  <span className="text-base font-black text-amber-800">{previewData.duplicate_count}</span>
                </div>
                <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                  <span className="text-[10px] text-rose-700 block font-bold">Amakosa (Errors)</span>
                  <span className="text-base font-black text-rose-800">{previewData.error_count}</span>
                </div>
              </div>

              {/* Filter Sub-tabs */}
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterPreviewTab('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold ${
                      filterPreviewTab === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Bose ({previewData.rows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterPreviewTab('valid')}
                    className={`px-2.5 py-1 rounded-lg font-bold ${
                      filterPreviewTab === 'valid' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Bashya ({previewData.valid_count})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterPreviewTab('duplicate')}
                    className={`px-2.5 py-1 rounded-lg font-bold ${
                      filterPreviewTab === 'duplicate' ? 'bg-amber-700 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Bisubiramo ({previewData.duplicate_count})
                  </button>
                  {previewData.error_count > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterPreviewTab('error')}
                      className={`px-2.5 py-1 rounded-lg font-bold ${
                        filterPreviewTab === 'error' ? 'bg-rose-700 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Amakosa ({previewData.error_count})
                    </button>
                  )}
                </div>

                <label className="text-[11px] font-bold text-blue-900 hover:underline cursor-pointer flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  <span>Hindura CSV</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 font-bold text-[10px] text-slate-600 uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="p-2 border-b">#</th>
                      <th className="p-2 border-b">Izina</th>
                      <th className="p-2 border-b">Telefone</th>
                      <th className="p-2 border-b">Ijwi</th>
                      <th className="p-2 border-b">Status</th>
                      <th className="p-2 border-b">Igenzura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {displayedRows.map((r, idx) => (
                      <tr
                        key={idx}
                        className={
                          r.is_duplicate
                            ? 'bg-amber-50/50 text-amber-950'
                            : !r.is_valid
                            ? 'bg-rose-50/50 text-rose-950'
                            : 'hover:bg-slate-50'
                        }
                      >
                        <td className="p-2 font-mono text-[10px] text-slate-400">{r.row_index}</td>
                        <td className="p-2 font-bold">{r.name}</td>
                        <td className="p-2 font-mono text-[11px]">{r.phone || '-'}</td>
                        <td className="p-2">{r.voice}</td>
                        <td className="p-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              r.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="p-2">
                          {r.is_valid && !r.is_duplicate ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Biteguye
                            </span>
                          ) : r.is_duplicate ? (
                            <span className="inline-flex items-center gap-1 text-amber-800 text-[10px] font-bold" title={r.duplicate_reason}>
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate max-w-[120px]">{r.duplicate_reason || 'Isanzwe'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 text-[10px] font-bold" title={r.validation_error}>
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate max-w-[120px]">{r.validation_error || 'Ikosa'}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isExecutingImport}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Funga
          </button>

          {previewData && (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isExecutingImport || previewData.valid_count === 0}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isExecutingImport ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Kwinjiza abaririmbyi...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Emeza Kwinjiza Abaririmbyi ({previewData.valid_count})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
