import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { ChoirLogo } from './ChoirLogo';
import {
  Song,
  SongCategory,
  UserProfile,
  Comment,
  PaymentTransaction,
  PaymentProvider,
  AdminMetrics,
} from '../types';
import {
  Shield,
  BookOpen,
  Music,
  HeartHandshake,
  Settings,
  MessageSquare,
  Users,
  RotateCcw,
  Palette,
  Clock,
  Volume2,
  FileText,
  Download,
  CheckCircle,
  ExternalLink,
  PhoneCall,
  Share2,
  BarChart3,
  Calendar,
} from 'lucide-react';

import { AdminLoginPortal } from './admin/AdminLoginPortal';
import { AdminOverviewTab } from './admin/AdminOverviewTab';
import { AdminSongsTab } from './admin/AdminSongsTab';
import { AdminSongManagement } from './AdminSongManagement';
import { AdminEventsTab } from './admin/AdminEventsTab';
import { AdminMediaTab } from './admin/AdminMediaTab';
import { AdminContentTab } from './admin/AdminContentTab';
import { AdminCommentsTab } from './admin/AdminCommentsTab';
import { AdminUsersTab } from './admin/AdminUsersTab';
import { AdminMemberStats } from './admin/AdminMemberStats';
import { AdminLogsTab } from './admin/AdminLogsTab';
import { AdminContactTab } from './admin/AdminContactTab';
import { AdminSocialMediaTab } from './admin/AdminSocialMediaTab';
import { AdminDonationSettingsTab } from './admin/AdminDonationSettingsTab';
import { AdminExportTab } from './admin/AdminExportTab';
import { safeFetchJson } from '../utils/api';

interface AdminDashboardProps {
  onSelectSong: (songId: string) => void;
  onNavigateHome?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onSelectSong,
  onNavigateHome,
}) => {
  const { user, isAdmin, isSuperAdmin, logout, isLoading: isAuthLoading } = useAuth();
  const { branding, choirInfo, updateBranding, refreshBranding } = useBranding();

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'events'
    | 'songs'
    | 'media'
    | 'content'
    | 'contacts'
    | 'social'
    | 'comments'
    | 'users'
    | 'stats'
    | 'logs'
    | 'branding'
    | 'donations'
    | 'payments'
    | 'export'
  >('overview');

  // Stats & Metrics
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  // Entities
  const [songs, setSongs] = useState<Song[]>([]);
  const [categories, setCategories] = useState<SongCategory[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [donations, setDonations] = useState<PaymentTransaction[]>([]);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);

  // Branding Editor Form
  const [brandingForm, setBrandingForm] = useState({
    main_logo_url: branding.main_logo_url || '',
    app_icon_url: branding.app_icon_url || '',
    splash_logo_url: branding.splash_logo_url || '',
    light_logo_url: branding.light_logo_url || '',
    dark_logo_url: branding.dark_logo_url || '',
    banner_image_url: branding.banner_image_url || '',
    primary_color: branding.primary_color || '#1e3a8a',
    secondary_color: branding.secondary_color || '#d97706',
    accent_color: branding.accent_color || '#2563eb',
    choir_name: choirInfo.choir_name || 'La Lumiere Choir',
    affiliation: choirInfo.affiliation || 'ADEPR Nyanza, Kicukiro District, Rwanda',
    welcome_message: choirInfo.welcome_message || "Igitabo cy'Indirimbo 92 zo Guhimbaza no Gusingiza Imana muri Korali La Lumiere.",
    scripture_verse: choirInfo.scripture_verse || '“Zaburi 147:1; Yobu 8:7”',
    songs_badge_text: choirInfo.songs_badge_text || '92',
    about_story: choirInfo.about_story || '',
    mission: choirInfo.mission || '',
    vision: choirInfo.vision || '',
    contact_phone: choirInfo.contact_phone || '',
    contact_email: choirInfo.contact_email || '',
  });
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [brandingSuccess, setBrandingSuccess] = useState(false);

  useEffect(() => {
    setBrandingForm(prev => ({
      ...prev,
      main_logo_url: branding.main_logo_url || prev.main_logo_url,
      app_icon_url: branding.app_icon_url || prev.app_icon_url,
      splash_logo_url: branding.splash_logo_url || prev.splash_logo_url,
      primary_color: branding.primary_color || prev.primary_color,
      secondary_color: branding.secondary_color || prev.secondary_color,
      accent_color: branding.accent_color || prev.accent_color,
      choir_name: choirInfo.choir_name || prev.choir_name,
      affiliation: choirInfo.affiliation || prev.affiliation,
      welcome_message: choirInfo.welcome_message || prev.welcome_message,
      scripture_verse: choirInfo.scripture_verse || prev.scripture_verse,
      songs_badge_text: choirInfo.songs_badge_text || prev.songs_badge_text,
      about_story: choirInfo.about_story || prev.about_story,
      mission: choirInfo.mission || prev.mission,
      vision: choirInfo.vision || prev.vision,
      contact_phone: choirInfo.contact_phone || prev.contact_phone,
      contact_email: choirInfo.contact_email || prev.contact_email,
    }));
  }, [branding, choirInfo]);

  // Load Dashboard Data
  const loadDashboardData = async () => {
    try {
      setIsLoadingMetrics(true);
      const token = localStorage.getItem('lalumiere_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [metricsRes, songsRes, catRes, comRes, usersRes, donRes, provRes] =
        await Promise.all([
          safeFetchJson<AdminMetrics>('/api/admin/metrics', { headers }),
          safeFetchJson<Song[]>('/api/admin/songs', { headers }),
          safeFetchJson<SongCategory[]>('/api/songs/categories'),
          safeFetchJson<Comment[]>('/api/admin/comments', { headers }),
          safeFetchJson<UserProfile[]>('/api/admin/users', { headers }),
          safeFetchJson<PaymentTransaction[]>('/api/admin/donations', { headers }),
          safeFetchJson<PaymentProvider[]>('/api/admin/payment-providers', { headers }),
        ]);

      if (metricsRes.ok && metricsRes.data) setMetrics(metricsRes.data);
      if (songsRes.ok && songsRes.data) setSongs(songsRes.data);
      if (catRes.ok && catRes.data) setCategories(catRes.data);
      if (comRes.ok && comRes.data) setComments(comRes.data);
      if (usersRes.ok && usersRes.data) setUsers(usersRes.data);
      if (donRes.ok && donRes.data) setDonations(donRes.data);
      if (provRes.ok && provRes.data) setProviders(provRes.data);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadDashboardData();

      const handleSongsUpdated = () => {
        loadDashboardData();
      };

      window.addEventListener('songs_updated', handleSongsUpdated);
      return () => {
        window.removeEventListener('songs_updated', handleSongsUpdated);
      };
    }
  }, [isAdmin]);

  // Handle Save Branding
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingBranding(true);
      await updateBranding(brandingForm);
      setBrandingSuccess(true);
      setTimeout(() => setBrandingSuccess(false), 3000);
      refreshBranding();
    } catch (err: any) {
      alert(err.message || 'Failed to save branding');
    } finally {
      setIsSavingBranding(false);
    }
  };

  // Export Donations CSV
  const handleExportDonations = () => {
    if (donations.length === 0) return;
    const headers = [
      'Reference',
      'Donor',
      'Phone',
      'Amount',
      'Currency',
      'Provider',
      'Purpose',
      'Status',
      'Date',
    ];
    const rows = donations.map(d => [
      d.internal_reference,
      d.donor_name,
      d.donor_phone,
      d.amount,
      d.currency,
      d.provider_slug,
      `"${(d.donation_purpose || '').replace(/"/g, '""')}"`,
      d.status,
      d.created_at,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `lalumiere_donations_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Loading state while checking auth
  if (isAuthLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <div className="w-9 h-9 border-3 border-blue-950 border-t-amber-400 rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-semibold">Gusuzuma uburenganzira bw'Ubuyobozi...</p>
      </div>
    );
  }

  // If user is not authenticated as admin, show dedicated Admin Login Portal
  if (!isAdmin) {
    return (
      <AdminLoginPortal
        onBackToHome={onNavigateHome}
        onSuccess={() => loadDashboardData()}
      />
    );
  }

  return (
    <div className="pb-28 space-y-5 max-w-4xl mx-auto px-2 sm:px-4">
      {/* Top Admin Header */}
      <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xs shrink-0">
            <ChoirLogo size="sm" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight font-serif">
                Ubuyobozi bwa Korali (Admin CMS)
              </h1>
              <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-extrabold rounded-md uppercase">
                {user?.role || 'Admin'}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              La Lumiere Choir • ADEPR Nyanza, Kicukiro District, Rwanda
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={loadDashboardData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Vugurura (Refresh)</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar bg-slate-100 p-1.5 rounded-2xl">
        {[
          { id: 'overview', label: 'Incamake', icon: Shield },
          { id: 'events', label: 'Ibikorwa (Events)', icon: Calendar },
          { id: 'songs', label: 'Song Management', icon: BookOpen },
          { id: 'media', label: 'Amajwi & Amafoto', icon: Volume2 },
          { id: 'content', label: 'Ibirimo & Amatangazo', icon: FileText },
          { id: 'contacts', label: 'Kuvugisha Ubuyobozi', icon: PhoneCall },
          { id: 'social', label: 'Imbuga Nkoranyambaga', icon: Share2 },
          { id: 'comments', label: 'Ibitekerezo', icon: MessageSquare },
          { id: 'users', label: 'Abanyamuryango (Members)', icon: Users },
          { id: 'stats', label: 'Imibare (Member Stats)', icon: BarChart3 },
          { id: 'logs', label: 'Admin Audit Log (Ubugenzuzi)', icon: Shield },
          { id: 'branding', label: 'Ibirango & Logo', icon: Palette },
          { id: 'donations', label: 'Inkunga (MoMo)', icon: HeartHandshake },
          { id: 'payments', label: 'Gateway', icon: Settings },
          { id: 'export', label: 'Kwohereza (CSV Export)', icon: Download },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-950 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <AdminOverviewTab
          metrics={metrics}
          isLoading={isLoadingMetrics}
          onNavigateTab={tab => setActiveTab(tab as any)}
          onOpenAddSong={() => setActiveTab('songs')}
          onOpenAddAnnouncement={() => setActiveTab('content')}
          onOpenAddEvent={() => setActiveTab('events')}
        />
      )}

      {/* 1b. EVENTS TAB */}
      {activeTab === 'events' && (
        <AdminEventsTab onRefreshOverview={loadDashboardData} />
      )}

      {/* 2. SONGS TAB (Dedicated AdminSongManagement component with Add, Edit, Delete, Overview tabs) */}
      {activeTab === 'songs' && (
        <AdminSongManagement
          songs={songs}
          categories={categories}
          onRefresh={loadDashboardData}
          onSelectSong={onSelectSong}
          onOpenUploadAudio={songId => setActiveTab('media')}
        />
      )}

      {/* 3. MEDIA (AUDIO & IMAGES) TAB */}
      {activeTab === 'media' && (
        <AdminMediaTab songs={songs} onRefreshSongs={loadDashboardData} />
      )}

      {/* 4. CONTENT (ANNOUNCEMENTS, EVENTS, DOCUMENTS, ARTICLES) */}
      {activeTab === 'content' && <AdminContentTab songs={songs} />}

      {/* 4b. CHOIR LEADERSHIP CONTACTS MANAGEMENT */}
      {activeTab === 'contacts' && (
        <AdminContactTab onSuccessNotice={() => loadDashboardData()} />
      )}

      {/* 4c. SOCIAL MEDIA PLATFORMS MANAGEMENT */}
      {activeTab === 'social' && <AdminSocialMediaTab />}

      {/* 5. COMMENTS MODERATION */}
      {activeTab === 'comments' && (
        <AdminCommentsTab comments={comments} onRefresh={loadDashboardData} />
      )}

      {/* 6. USERS MANAGEMENT */}
      {activeTab === 'users' && (
        <AdminUsersTab
          users={users}
          onRefresh={loadDashboardData}
          currentUserRole={user?.role}
        />
      )}

      {/* MEMBER STATISTICS DASHBOARD VIEW */}
      {activeTab === 'stats' && <AdminMemberStats />}

      {/* 7. ACTIVITY LOGS */}
      {activeTab === 'logs' && <AdminLogsTab />}

      {/* 8. BRANDING & LOGO */}
      {activeTab === 'branding' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-150">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 font-serif">
              Gucunga Ibirango na Logo (Choir Branding & Identity)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Iyi porogaramu ikoresha logo yemewe ya La Lumiere Choir. Ushobora gushyiraho cyangwa kuvugurura logo zose, amabara, n'amakuru arambuye y'amateka ya Korali.
            </p>
          </div>

          {brandingSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Ibirango na Logo byavuguruwe neza muri porogaramu yose!</span>
            </div>
          )}

          {/* Live Preview Panel */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Isubiramo ry'Imiterere (Live Branding Preview):
            </span>
            <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 block mb-1">Choir Logo</span>
                <ChoirLogo size="md" />
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-400 block mb-1">With Title</span>
                <ChoirLogo size="sm" showSubtitle={true} />
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-400 block mb-1">Large Splash</span>
                <ChoirLogo size="lg" variant="splash" />
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveBranding} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Logo Nkuru (Official Main Logo URL):
                </label>
                <input
                  type="url"
                  value={brandingForm.main_logo_url}
                  onChange={e =>
                    setBrandingForm({ ...brandingForm, main_logo_url: e.target.value })
                  }
                  placeholder="https://.../lalumiere-logo.png"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  App Icon Logo URL (Agashusho ka Porogaramu):
                </label>
                <input
                  type="url"
                  value={brandingForm.app_icon_url}
                  onChange={e =>
                    setBrandingForm({ ...brandingForm, app_icon_url: e.target.value })
                  }
                  placeholder="https://.../app-icon.png"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Splash Screen Logo URL:
                </label>
                <input
                  type="url"
                  value={brandingForm.splash_logo_url}
                  onChange={e =>
                    setBrandingForm({ ...brandingForm, splash_logo_url: e.target.value })
                  }
                  placeholder="https://.../splash-logo.png"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Banner / Cover Image URL:
                </label>
                <input
                  type="url"
                  value={brandingForm.banner_image_url}
                  onChange={e =>
                    setBrandingForm({ ...brandingForm, banner_image_url: e.target.value })
                  }
                  placeholder="https://.../choir-banner.jpg"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                />
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-3 gap-3 border-t pt-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Primary Color:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandingForm.primary_color}
                    onChange={e =>
                      setBrandingForm({ ...brandingForm, primary_color: e.target.value })
                    }
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200"
                  />
                  <span className="font-mono text-xs">{brandingForm.primary_color}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Secondary / Gold:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandingForm.secondary_color}
                    onChange={e =>
                      setBrandingForm({ ...brandingForm, secondary_color: e.target.value })
                    }
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200"
                  />
                  <span className="font-mono text-xs">{brandingForm.secondary_color}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Accent Color:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandingForm.accent_color}
                    onChange={e =>
                      setBrandingForm({ ...brandingForm, accent_color: e.target.value })
                    }
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200"
                  />
                  <span className="font-mono text-xs">{brandingForm.accent_color}</span>
                </div>
              </div>
            </div>

            {/* Choir Information Text */}
            <div className="border-t pt-3 space-y-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Izina rya Korali (Choir Name):
                </label>
                <input
                  type="text"
                  value={brandingForm.choir_name}
                  onChange={e =>
                    setBrandingForm({ ...brandingForm, choir_name: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Itorero n'Aho Ibarizwa (Affiliation):
                </label>
                <input
                  type="text"
                  value={brandingForm.affiliation}
                  onChange={e =>
                    setBrandingForm({ ...brandingForm, affiliation: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Ubutumwa bwo Kwakira ku Riburiro (Home Welcome Subtitle):
                </label>
                <textarea
                  rows={2}
                  value={brandingForm.welcome_message}
                  onChange={e =>
                    setBrandingForm({ ...brandingForm, welcome_message: e.target.value })
                  }
                  placeholder="Igitabo cy'Indirimbo 92 zo Guhimbaza no Gusingiza Imana muri Korali La Lumiere."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed font-medium text-xs sm:text-sm text-slate-800"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Iyi nyandiko igaragara munsi y'izina rya Korali ku rubuga rw'ibanze (HomeScreen hero banner).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Icyanditswe cy'Intego (Scripture / Theme Verse):
                  </label>
                  <input
                    type="text"
                    value={brandingForm.scripture_verse}
                    onChange={e =>
                      setBrandingForm({ ...brandingForm, scripture_verse: e.target.value })
                    }
                    placeholder="“Zaburi 147:1; Yobu 8:7”"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-medium italic"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Igaragara ku ibendera ry'ibanze mu nyandiko y'umuhondo.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Badge y'Indirimbo kuri Search Bar (Songs Counter Badge):
                  </label>
                  <input
                    type="text"
                    value={brandingForm.songs_badge_text}
                    onChange={e =>
                      setBrandingForm({ ...brandingForm, songs_badge_text: e.target.value })
                    }
                    placeholder="92"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-mono font-bold"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Imibare igaragara mu gasanduku ko gushakisha indirimbo (urugero: "92" cyangwa "Igitabo cyose").
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Amateka n'Intego (About Story):
                </label>
                <textarea
                  rows={3}
                  value={brandingForm.about_story}
                  onChange={e =>
                    setBrandingForm({ ...brandingForm, about_story: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingBranding}
              className="w-full py-3 bg-blue-950 text-white rounded-2xl font-bold hover:bg-blue-900 transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isSavingBranding
                ? 'Kubika...'
                : 'Bika no Gutangaza Ibirango (Save & Publish Branding)'}
            </button>
          </form>
        </div>
      )}

      {/* 9. DONATIONS & FINANCIALS & PAYMENT GATEWAY */}
      {(activeTab === 'donations' || activeTab === 'payments') && (
        <AdminDonationSettingsTab
          donations={donations}
          providers={providers}
          onRefresh={loadDashboardData}
        />
      )}

      {/* 10. DATA EXPORT / CSV EXPORT CMS */}
      {activeTab === 'export' && <AdminExportTab />}
    </div>
  );
};
