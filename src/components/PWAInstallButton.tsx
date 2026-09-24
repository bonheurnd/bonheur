import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Check } from 'lucide-react';

export const PWAInstallButton: React.FC<{ className?: string; compact?: boolean }> = ({
  className = '',
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running as installed standalone PWA, hide
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      await install();
    } finally {
      setIsInstalling(false);
    }
  };

  // Chromium / Android / Desktop prompt
  if (isInstallable) {
    return (
      <>
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className={
            className ||
            (compact
              ? 'p-2 text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-full transition-all active:scale-95 shadow-2xs'
              : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-transform active:scale-95')
          }
          title="Shyira porogaramu muri telefoni (Install App on Phone / Desktop)"
        >
          <Smartphone className={compact ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          {!compact && <span>Koresha Offline (Install)</span>}
        </button>
      </>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={
            className ||
            (compact
              ? 'p-2 text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-full transition-all active:scale-95 shadow-2xs'
              : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-transform active:scale-95')
          }
          title="Shyira porogaramu muri iPhone (Install on iPhone)"
        >
          <Smartphone className={compact ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          {!compact && <span>Install (iPhone)</span>}
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base font-bold text-slate-900 font-serif">
                    Shyira App muri iPhone / iPad
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-900 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <p>
                    Kanda kuri buto ya <strong>Share</strong> (agakarita karimo akambi kazamuka) muri Safari hasi ku kirere cya telefoni.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-900 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <p>
                    Manuka hasi gato maze ukande kuri <strong>Add to Home Screen</strong> (Kwandika ku Mfuruka y'ibanze).
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-900 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </span>
                  <p>
                    Kanda <strong>Add</strong> hejuru iburyo. App izaba yiteguye gukoreshwa igihe cyose niyo waba udafite internet!
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Nabyumvise (Close)
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
