import React, { useState, useEffect } from 'react';
import { SocialMediaLink } from '../types';
import { safeFetchJson } from '../utils/api';
import {
  ExternalLink,
  Globe,
  Share2,
  Sparkles,
  Check,
  AlertCircle,
  RefreshCw,
  Layers,
} from 'lucide-react';

interface SocialMediaSectionProps {
  className?: string;
  onRefreshTrigger?: () => void;
}

// Custom brand SVG icons for exact official platform branding
const PlatformIcons: Record<string, React.FC<{ className?: string }>> = {
  youtube: ({ className = 'w-5 h-5' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  facebook: ({ className = 'w-5 h-5' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  instagram: ({ className = 'w-5 h-5' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
  tiktok: ({ className = 'w-5 h-5' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  ),
  whatsapp: ({ className = 'w-5 h-5' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.301-.15-1.78-.879-2.056-.979-.275-.1-.476-.15-.677.15-.2.3-.778.979-.953 1.18-.175.2-.35.225-.651.075-.3-.15-1.27-.468-2.42-1.494-.894-.799-1.499-1.786-1.674-2.086-.176-.3-.019-.462.132-.612.135-.135.3-.351.451-.526.15-.175.2-.3.301-.5.1-.2.05-.375-.025-.526-.075-.15-.677-1.631-.927-2.235-.244-.588-.492-.508-.677-.518-.175-.01-.375-.01-.576-.01-.2 0-.526.075-.802.375-.276.3-1.053 1.03-1.053 2.51 0 1.481 1.078 2.91 1.229 3.11.15.2 2.122 3.24 5.141 4.542.718.31 1.279.496 1.716.634.722.23 1.379.197 1.9.119.579-.087 1.78-.727 2.03-1.43.25-.702.25-1.303.175-1.43-.075-.126-.275-.2-.576-.35zM12.04 21.821c-1.78 0-3.52-.48-5.04-1.39l-.36-.21-3.74.98 1-3.65-.23-.37a9.834 9.834 0 0 1-1.51-5.26c0-5.45 4.43-9.88 9.88-9.88 2.64 0 5.12 1.03 6.99 2.9 1.87 1.87 2.9 4.35 2.9 6.99 0 5.45-4.43 9.89-9.89 9.89zM12.04 0C5.4 0 0 5.4 0 12.04c0 2.12.55 4.18 1.6 6l-1.7 6.2 6.35-1.66a12.007 12.007 0 0 0 5.79 1.48c6.64 0 12.04-5.4 12.04-12.04C24.08 5.4 18.68 0 12.04 0z"/>
    </svg>
  ),
  twitter: ({ className = 'w-5 h-5' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  x: ({ className = 'w-5 h-5' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  website: ({ className = 'w-5 h-5' }) => (
    <Globe className={className} />
  ),
};

// Styling badge color themes by platform
const PlatformThemes: Record<
  string,
  {
    bgGradient: string;
    iconBg: string;
    iconColor: string;
    textColor: string;
    badgeBg: string;
    badgeText: string;
    ctaLabelRw: string;
    ctaLabelEn: string;
    appSchemePrefix?: string;
  }
> = {
  youtube: {
    bgGradient: 'hover:border-red-500/50 hover:bg-red-500/5',
    iconBg: 'bg-red-600',
    iconColor: 'text-white',
    textColor: 'group-hover:text-red-700',
    badgeBg: 'bg-red-50 text-red-700 border-red-200',
    badgeText: 'Channel',
    ctaLabelRw: 'Reba Channel',
    ctaLabelEn: 'Watch Channel',
  },
  facebook: {
    bgGradient: 'hover:border-blue-600/50 hover:bg-blue-600/5',
    iconBg: 'bg-[#1877F2]',
    iconColor: 'text-white',
    textColor: 'group-hover:text-blue-700',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeText: 'Page',
    ctaLabelRw: 'Dukurikire',
    ctaLabelEn: 'Follow Page',
  },
  instagram: {
    bgGradient: 'hover:border-pink-500/50 hover:bg-gradient-to-tr hover:from-amber-500/5 hover:to-pink-500/5',
    iconBg: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600',
    iconColor: 'text-white',
    textColor: 'group-hover:text-pink-700',
    badgeBg: 'bg-pink-50 text-pink-700 border-pink-200',
    badgeText: 'Profile',
    ctaLabelRw: 'Dukurikire',
    ctaLabelEn: 'Follow Us',
  },
  tiktok: {
    bgGradient: 'hover:border-slate-800/50 hover:bg-slate-900/5',
    iconBg: 'bg-slate-950',
    iconColor: 'text-white',
    textColor: 'group-hover:text-slate-900',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    badgeText: 'Videos',
    ctaLabelRw: 'Reba Amashusho',
    ctaLabelEn: 'Watch TikTok',
  },
  whatsapp: {
    bgGradient: 'hover:border-emerald-500/50 hover:bg-emerald-500/5',
    iconBg: 'bg-[#25D366]',
    iconColor: 'text-white',
    textColor: 'group-hover:text-emerald-800',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeText: 'Community',
    ctaLabelRw: 'Injira Muri Kominote',
    ctaLabelEn: 'Join Community',
  },
  twitter: {
    bgGradient: 'hover:border-slate-800/50 hover:bg-slate-800/5',
    iconBg: 'bg-black',
    iconColor: 'text-white',
    textColor: 'group-hover:text-slate-900',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    badgeText: 'X / Twitter',
    ctaLabelRw: 'Dukurikire kuri X',
    ctaLabelEn: 'Follow on X',
  },
  x: {
    bgGradient: 'hover:border-slate-800/50 hover:bg-slate-800/5',
    iconBg: 'bg-black',
    iconColor: 'text-white',
    textColor: 'group-hover:text-slate-900',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    badgeText: 'X / Twitter',
    ctaLabelRw: 'Dukurikire kuri X',
    ctaLabelEn: 'Follow on X',
  },
  website: {
    bgGradient: 'hover:border-blue-900/50 hover:bg-blue-900/5',
    iconBg: 'bg-blue-950',
    iconColor: 'text-amber-300',
    textColor: 'group-hover:text-blue-950',
    badgeBg: 'bg-blue-50 text-blue-950 border-blue-200',
    badgeText: 'Website',
    ctaLabelRw: 'Sura Urubuga',
    ctaLabelEn: 'Visit Website',
  },
};

export const SocialMediaSection: React.FC<SocialMediaSectionProps> = ({
  className = '',
  onRefreshTrigger,
}) => {
  const [links, setLinks] = useState<SocialMediaLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(curr => (curr === msg ? null : curr));
    }, 3200);
  };

  const fetchSocialLinks = async () => {
    try {
      setIsLoading(true);
      setErrorNotice(null);
      const res = await safeFetchJson<SocialMediaLink[]>('/api/social-media');
      if (res.ok && res.data) {
        setLinks(res.data);
      } else {
        // Fallback default links so visitors always see official choir channels even during offline
        setLinks([
          {
            id: 'soc_yt',
            platform: 'youtube',
            display_name: 'YouTube Channel',
            url: 'https://www.youtube.com/@LaLumiereChoirADEPRNyanza',
            icon: 'youtube',
            is_enabled: 1,
            display_order: 1,
            description: 'Reba indirimbo nshya, ibitaramo n\'amashusho yose',
          },
          {
            id: 'soc_wa',
            platform: 'whatsapp',
            display_name: 'WhatsApp Community',
            url: 'https://chat.whatsapp.com/invite/lalumierechoir',
            icon: 'whatsapp',
            is_enabled: 1,
            display_order: 2,
            description: 'Injira muri kominote ya WhatsApp ya Korali',
          },
          {
            id: 'soc_ig',
            platform: 'instagram',
            display_name: 'Instagram (@lalumierechoir)',
            url: 'https://www.instagram.com/lalumierechoir',
            icon: 'instagram',
            is_enabled: 1,
            display_order: 3,
            description: 'Amafoto y\'abaririmbyi n\'ibihe by\'amashimwe',
          },
          {
            id: 'soc_fb',
            platform: 'facebook',
            display_name: 'Facebook Page',
            url: 'https://www.facebook.com/lalumierechoir',
            icon: 'facebook',
            is_enabled: 1,
            display_order: 4,
            description: 'Ipaji yemewe ya La Lumiere Choir ADEPR Nyanza',
          },
          {
            id: 'soc_tk',
            platform: 'tiktok',
            display_name: 'TikTok (@lalumierechoir)',
            url: 'https://www.tiktok.com/@lalumierechoir',
            icon: 'tiktok',
            is_enabled: 1,
            display_order: 5,
            description: 'Uduce duto tw\'indirimbo n\'imyitozo',
          },
          {
            id: 'soc_tw',
            platform: 'twitter',
            display_name: 'X (Twitter)',
            url: 'https://x.com/lalumierechoir',
            icon: 'twitter',
            is_enabled: 1,
            display_order: 6,
            description: 'Amakuru mashya ku rubuga rwa X',
          },
          {
            id: 'soc_web',
            platform: 'website',
            display_name: 'Official Website',
            url: 'https://www.lalumierechoir.rw',
            icon: 'website',
            is_enabled: 1,
            display_order: 7,
            description: 'Urubuga rwemewe rw\'itorero rya Korali',
          }
        ]);
      }
    } catch (err) {
      console.warn('Could not load dynamic social links, keeping fallback links:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSocialLinks();
  }, []);

  /**
   * Smart open handler:
   * Handles deep-linking / intent schemes where available, and safely falls back
   * to standard browser navigation without crashing if an app isn't installed.
   */
  const handleOpenLink = (link: SocialMediaLink, e: React.MouseEvent) => {
    e.preventDefault();

    const targetUrl = link.url;
    if (!targetUrl) {
      showToast('Nta murongo washyizweho kuri iyi paji.');
      return;
    }

    try {
      // Validate URL format
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        showToast('Uyu murongo ntabwo wemewe (Invalid link format).');
        return;
      }

      // In Android WebView / browser environment, window.open with _blank or location.href
      // triggers the Android Intent resolver (e.g. YouTube app, Instagram app, etc.)
      // and safely falls back to Chrome/browser if the app is absent.
      const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      if (!win) {
        window.location.href = targetUrl;
      }
      showToast(`Gufungura: ${link.display_name}`);
    } catch (err) {
      console.error('Error opening social media link:', err);
      // Fallback
      try {
        window.location.href = targetUrl;
      } catch {
        showToast('Habaye ikibazo mu gufungura uru rubuga.');
      }
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900/95 text-white text-xs font-semibold rounded-2xl border border-slate-700 shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in"
        >
          <Check className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Section Header Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-amber-400/10 via-blue-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-950 to-indigo-900 text-amber-300 flex items-center justify-center font-bold shadow-xs shrink-0">
              <Share2 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-slate-950 font-serif">
                  Dukurikire (Follow Us)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-950 text-[10px] font-extrabold uppercase">
                  Imbuga Nkoranyambaga
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Choir Official Social Media Platforms & Channels
              </p>
            </div>
          </div>

          <button
            onClick={fetchSocialLinks}
            className="self-end sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
            title="Vugurura imbuga nkoranyambaga"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-900' : ''}`} />
            <span>Vugurura</span>
          </button>
        </div>

        {/* Informative Briefing as requested */}
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-3">
          Dukurikire ku mbuga nkoranyambaga zacu kugira ngo ubone amakuru mashya, ibitaramo, indirimbo n'ibikorwa bya{' '}
          <strong className="text-blue-950 font-extrabold">La Lumiere Choir ADEPR Nyanza</strong>.
        </p>

        {/* Content Area */}
        <div className="pt-4">
          {isLoading ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-7 h-7 border-3 border-blue-950 border-t-amber-400 rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-medium">Gushakisha imbuga nkoranyambaga...</p>
            </div>
          ) : links.length === 0 ? (
            /* Empty State */
            <div className="py-8 px-4 text-center rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-800">
                Imbuga nkoranyambaga zizashyirwaho vuba
              </h3>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Our social media links will be available soon. Ubuyobozi bwa Korali buri kubishyiraho mu buryo bw'ikoranabuhanga.
              </p>
            </div>
          ) : (
            /* Social Media Dynamic Cards Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {links.map(item => {
                const platformKey = item.platform.toLowerCase();
                const IconComponent = PlatformIcons[platformKey] || PlatformIcons[item.icon?.toLowerCase() || ''] || Globe;
                const theme = PlatformThemes[platformKey] || {
                  bgGradient: 'hover:border-slate-400 hover:bg-slate-50',
                  iconBg: 'bg-blue-950',
                  iconColor: 'text-amber-300',
                  textColor: 'group-hover:text-blue-950',
                  badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
                  badgeText: item.platform,
                  ctaLabelRw: 'Dukurikire',
                  ctaLabelEn: 'Follow Us',
                };

                return (
                  <a
                    key={item.id}
                    href={item.url}
                    onClick={e => handleOpenLink(item, e)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group relative p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 bg-white transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${theme.bgGradient} flex flex-col justify-between space-y-3 cursor-pointer`}
                    aria-label={`Fungura ${item.display_name} ya La Lumiere Choir`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl ${theme.iconBg} ${theme.iconColor} flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3
                            className={`text-xs sm:text-sm font-extrabold text-slate-900 truncate transition-colors ${theme.textColor}`}
                          >
                            {item.display_name}
                          </h3>
                          <span
                            className={`inline-block px-1.5 py-0.2 text-[9px] font-bold rounded uppercase mt-0.5 border ${theme.badgeBg}`}
                          >
                            {theme.badgeText}
                          </span>
                        </div>
                      </div>

                      <div className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-blue-950 group-hover:text-amber-300 text-slate-400 flex items-center justify-center shrink-0 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    <div className="pt-2 border-t border-slate-100/80 flex items-center justify-between text-[11px]">
                      <span className="font-extrabold text-blue-950 group-hover:underline inline-flex items-center gap-1">
                        <span>{theme.ctaLabelRw}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">
                        {item.url.replace(/^https?:\/\/(www\.)?/, '')}
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
