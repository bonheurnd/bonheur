import React, { useState, useEffect, useRef } from 'react';
import { Song } from '../types';
import {
  Share2,
  FileText,
  Image as ImageIcon,
  Copy,
  Download,
  Check,
  X,
  Sparkles,
  Palette,
  ExternalLink,
  MessageCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import {
  LyricsTheme,
  LyricsCardLayout,
  generateFormattedLyricsText,
  generateLyricsCanvas,
  generateLyricsImageFile,
  downloadLyricsImage,
  copyLyricsImageToClipboard,
  shareLyricsAsText,
  shareLyricsAsImage,
} from '../utils/lyricsShareUtils';

interface ShareLyricsModalProps {
  song: Song;
  onClose: () => void;
}

export const ShareLyricsModal: React.FC<ShareLyricsModalProps> = ({ song, onClose }) => {
  const [activeTab, setActiveTab] = useState<'image' | 'text'>('image');

  // Image options
  const [theme, setTheme] = useState<LyricsTheme>('navy');
  const [layout, setLayout] = useState<LyricsCardLayout>('dynamic');
  const [selectedExcerptMode, setSelectedExcerptMode] = useState<'all' | 'custom'>('all');
  const [customExcerpt, setCustomExcerpt] = useState<string>('');

  // Previews & loading
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Split stanzas for custom excerpt picker
  const stanzas = React.useMemo(() => {
    if (!song.lyrics) return [];
    return song.lyrics
      .split(/\n\s*\n/)
      .map(s => s.trim())
      .filter(Boolean);
  }, [song.lyrics]);

  const activeLyricsText = selectedExcerptMode === 'custom' && customExcerpt ? customExcerpt : song.lyrics || '';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Render canvas preview whenever options change
  useEffect(() => {
    let isCurrent = true;
    const updatePreview = () => {
      try {
        setIsGenerating(true);
        const canvas = generateLyricsCanvas(song, {
          theme,
          layout,
          selectedText: activeLyricsText,
        });

        if (isCurrent) {
          const dataUrl = canvas.toDataURL('image/png');
          setPreviewDataUrl(dataUrl);
          setIsGenerating(false);
        }
      } catch (err) {
        console.error('Failed to generate preview:', err);
        if (isCurrent) setIsGenerating(false);
      }
    };

    const timer = setTimeout(updatePreview, 50);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [song, theme, layout, activeLyricsText]);

  // Formatted text preview
  const formattedText = React.useMemo(() => {
    return generateFormattedLyricsText(song, {
      customExcerpt: activeLyricsText,
    });
  }, [song, activeLyricsText]);

  // Handle Native Share for PNG Image
  const handleSharePng = async () => {
    try {
      setIsSharing(true);
      const res = await shareLyricsAsImage(song, {
        theme,
        layout,
        selectedText: activeLyricsText,
      });

      if (res.sharedViaNative) {
        showToast('Ikinyuranye cyo gusangiza cyafunguwe (Sharing dialog opened)!');
      } else if (res.downloaded) {
        showToast('Ifoto ya PNG yakuruwe neza muri mudasobwa/terefone yawe!');
      }
    } catch (err) {
      console.error('Share PNG error:', err);
      // Fallback direct download
      try {
        await downloadLyricsImage(song, { theme, layout, selectedText: activeLyricsText });
        showToast('Ifoto ya PNG yakuruwe (Downloaded to device)!');
      } catch (dErr) {
        showToast('Habaye ikibazo mu gusangiza ifoto.');
      }
    } finally {
      setIsSharing(false);
    }
  };

  // Handle Download PNG
  const handleDownloadPng = async () => {
    try {
      setIsGenerating(true);
      await downloadLyricsImage(song, {
        theme,
        layout,
        selectedText: activeLyricsText,
      });
      showToast('Ifoto y\'amagambo yabitswe neza (PNG downloaded)!');
    } catch (err) {
      console.error(err);
      showToast('Habaye ikibazo mu gukuramo ifoto.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Copy PNG Image to clipboard
  const handleCopyImage = async () => {
    const success = await copyLyricsImageToClipboard(song, {
      theme,
      layout,
      selectedText: activeLyricsText,
    });
    if (success) {
      setCopiedImage(true);
      showToast('Ifoto ya PNG yakoporowe mu bubiko (Image copied to clipboard)!');
      setTimeout(() => setCopiedImage(false), 2500);
    } else {
      showToast('Koporora ifoto ntibishobotse, kanda "Kuramo PNG" ngo uyibike.');
    }
  };

  // Handle Native Share for Formatted Text
  const handleShareText = async () => {
    try {
      setIsSharing(true);
      const res = await shareLyricsAsText(song, { customExcerpt: activeLyricsText });
      if (res.sharedViaNative) {
        showToast('Ikinyuranye cyo gusangiza cyafunguwe!');
      } else if (res.copied) {
        setCopiedText(true);
        showToast('Amagambo yakoporowe mu bubiko (Copied to clipboard)!');
        setTimeout(() => setCopiedText(false), 2500);
      }
    } catch (err) {
      console.error(err);
      showToast('Habaye ikibazo mu gusangiza amagambo.');
    } finally {
      setIsSharing(false);
    }
  };

  // Handle Copy Formatted Text
  const handleCopyText = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formattedText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = formattedText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedText(true);
      showToast('Amagambo yakoporowe (Formatted text copied)!');
      setTimeout(() => setCopiedText(false), 2500);
    } catch (err) {
      showToast('Habaye ikibazo mu gukoporora.');
    }
  };

  // Open WhatsApp with formatted text
  const handleOpenWhatsApp = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(formattedText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-blue-900 text-amber-300 flex items-center justify-center shadow-xs shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-base text-slate-900 dark:text-white truncate">
                Sangiza Amagambo y'Indirimbo
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {song.song_number ? `#${song.song_number} ` : ''}
                {song.title} • Chorale La Lumiere
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title="Funga"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Switcher Tabs: PNG Image vs Formatted Text */}
        <div className="px-5 pt-4 shrink-0">
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              onClick={() => setActiveTab('image')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'image'
                  ? 'bg-white dark:bg-slate-900 text-blue-900 dark:text-amber-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Ifoto ya PNG (Image Card)</span>
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'text'
                  ? 'bg-white dark:bg-slate-900 text-blue-900 dark:text-amber-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Inyandiko (Formatted Text)</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: PNG IMAGE CARD GENERATOR */}
          {activeTab === 'image' && (
            <div className="space-y-4">
              {/* Theme & Style Controls */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-blue-900 dark:text-amber-400" />
                    <span>Hitamo Imiterere (Color Theme):</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 uppercase">{theme}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'navy', label: 'Navy & Gold', bg: 'bg-[#0c192c] text-amber-300 border-amber-500/50' },
                    { id: 'white', label: 'Clean White', bg: 'bg-white text-blue-900 border-slate-300' },
                    { id: 'parchment', label: 'Warm Hymnal', bg: 'bg-[#faf5eb] text-amber-900 border-amber-300' },
                    { id: 'dark', label: 'Dark Midnight', bg: 'bg-[#09090b] text-emerald-400 border-zinc-700' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id as LyricsTheme)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${t.bg} ${
                        theme === t.id ? 'ring-2 ring-blue-900 dark:ring-amber-400 scale-[1.02] shadow-xs' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      {theme === t.id && <Check className="w-3.5 h-3.5" />}
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>

                {/* Layout / Aspect Ratio */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Ingano y'Ifoto (Aspect Ratio):
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { id: 'dynamic', label: 'Full Hymn (Auto)' },
                      { id: 'story', label: 'Story (9:16)' },
                      { id: 'square', label: 'Square (1:1)' },
                    ].map(l => (
                      <button
                        key={l.id}
                        onClick={() => setLayout(l.id as LyricsCardLayout)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          layout === l.id
                            ? 'bg-blue-900 dark:bg-amber-400 text-white dark:text-slate-950 shadow-2xs'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Excerpt Selection (Full vs Single Stanza) */}
                {stanzas.length > 1 && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Amagambo ushaka gushyira ku ifoto:
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedExcerptMode('all')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            selectedExcerptMode === 'all'
                              ? 'bg-blue-900 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          Indirimbo Yose
                        </button>
                        <button
                          onClick={() => {
                            setSelectedExcerptMode('custom');
                            if (!customExcerpt && stanzas[0]) setCustomExcerpt(stanzas[0]);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            selectedExcerptMode === 'custom'
                              ? 'bg-blue-900 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          Hitamo Igice (Stanza)
                        </button>
                      </div>
                    </div>

                    {selectedExcerptMode === 'custom' && (
                      <div className="flex gap-1.5 overflow-x-auto py-1">
                        {stanzas.map((stanza, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCustomExcerpt(stanza)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                              customExcerpt === stanza
                                ? 'bg-amber-400 text-slate-950 font-black'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            Igice #{idx + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Live Image Preview Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ishusho y'Ifoto (PNG Preview):</span>
                  </span>
                  {isGenerating && <span className="text-blue-900 animate-pulse font-medium">Kurema ifoto...</span>}
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-3 max-h-80 overflow-y-auto shadow-inner">
                  {previewDataUrl ? (
                    <img
                      src={previewDataUrl}
                      alt={`${song.title} lyrics card`}
                      className="max-h-72 w-auto object-contain rounded-xl shadow-md transition-all"
                    />
                  ) : (
                    <div className="py-16 text-center">
                      <div className="w-8 h-8 border-3 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-xs text-slate-400">Gutunganya ifoto ya PNG...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons for PNG Image */}
              <div className="pt-2 space-y-2.5">
                {/* PRIMARY: Native Sharing Dialog */}
                <button
                  onClick={handleSharePng}
                  disabled={isSharing || isGenerating}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 hover:from-blue-800 hover:to-indigo-800 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-900/20 active:scale-[0.99] transition-all disabled:opacity-50"
                  title="Fungura ikinyuranye cyo gusangiza ku terefone/mudasobwa (Native Share Sheet)"
                >
                  <Share2 className="w-4 h-4 text-amber-300" />
                  <span>
                    {isSharing ? 'Gufungura Ikinyuranye...' : 'Sangiza Ifoto (Native Sharing Dialog)'}
                  </span>
                </button>

                {/* Secondary Actions: Download PNG & Copy Image */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleDownloadPng}
                    disabled={isGenerating}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold transition-all active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-900 dark:text-amber-400" />
                    <span>Kuramo PNG (Download)</span>
                  </button>

                  <button
                    onClick={handleCopyImage}
                    disabled={isGenerating}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold transition-all active:scale-95"
                  >
                    {copiedImage ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Yakoporowe!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Koporora Ifoto (Copy)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FORMATTED TEXT SHARING */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Amagambo yateguwe neza (Formatted Lyrics Preview):
                </span>
                <p className="text-[11px] text-slate-400">
                  Ubutumwa bukubiyemo nimero, umutwe w'indirimbo, amagambo yose, n'umuhamagaro wo kuyisoma muri app.
                </p>
              </div>

              {/* Text Preview Box */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-72 overflow-y-auto shadow-inner leading-relaxed select-all">
                {formattedText}
              </div>

              {/* Action Buttons for Formatted Text */}
              <div className="space-y-2.5 pt-1">
                {/* PRIMARY: Native Sharing Dialog */}
                <button
                  onClick={handleShareText}
                  disabled={isSharing}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 hover:from-blue-800 hover:to-indigo-800 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-900/20 active:scale-[0.99] transition-all disabled:opacity-50"
                  title="Fungura ikinyuranye cyo gusangiza (Native Sharing Dialog)"
                >
                  <Share2 className="w-4 h-4 text-amber-300" />
                  <span>
                    {isSharing ? 'Gufungura Ikinyuranye...' : 'Sangiza Inyandiko (Native Share Dialog)'}
                  </span>
                </button>

                {/* Secondary Actions: Copy Text & WhatsApp */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCopyText}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold transition-all active:scale-95"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Yakoporowe!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Koporora Amagambo (Copy)</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleOpenWhatsApp}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-2xs"
                    title="Sangiza mu itsinda rya WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp Direct</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Notification Toast */}
        {toastMessage && (
          <div className="p-3 bg-slate-900 text-white text-xs font-semibold flex items-center justify-between border-t border-slate-800 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white text-[11px] font-bold ml-2"
            >
              OK
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
