import React, { useState, useEffect } from 'react';
import { Song, Announcement, SongCategory } from '../types';
import { ChoirLogo } from './ChoirLogo';
import { useBranding } from '../context/BrandingContext';
import { useAudio } from '../context/AudioContext';
import { useAuth } from '../context/AuthContext';
import { getAllOfflineSongs } from '../services/offlineStorage';
import { UpcomingEventsSection } from './UpcomingEventsSection';
import {
  Play,
  BookOpen,
  HeartHandshake,
  Sparkles,
  Clock,
  ChevronRight,
  Bell,
  Search,
  X,
  Layers,
  Flame,
  Cloud,
  Heart,
  ShieldCheck,
  Edit3,
  Save,
  CheckCircle2,
} from 'lucide-react';

interface HomeScreenProps {
  onSelectSong: (songId: string) => void;
  onNavigateToTab: (tab: string) => void;
  onSelectCategory?: (categoryId: string) => void;
  onOpenSearch: () => void;
  onOpenAuth?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectSong,
  onNavigateToTab,
  onSelectCategory,
  onOpenSearch,
  onOpenAuth,
}) => {
  const { choirInfo, updateBranding, refreshBranding } = useBranding();
  const { playTrack } = useAudio();
  const { isAdmin } = useAuth();

  const [songs, setSongs] = useState<Song[]>([]);
  const [categories, setCategories] = useState<SongCategory[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [homeSearch, setHomeSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Admin Quick Edit state for home subtitle, motto, and songs badge
  const [isEditingHomeText, setIsEditingHomeText] = useState(false);
  const [editWelcomeMessage, setEditWelcomeMessage] = useState(
    choirInfo.welcome_message || "Igitabo cy'Indirimbo 92 zo Guhimbaza no Gusingiza Imana muri Korali La Lumiere."
  );
  const [editScriptureVerse, setEditScriptureVerse] = useState(
    choirInfo.scripture_verse || '“Zaburi 147:1; Yobu 8:7”'
  );
  const [editSongsBadgeText, setEditSongsBadgeText] = useState(
    choirInfo.songs_badge_text || '92'
  );
  const [isSavingQuickEdit, setIsSavingQuickEdit] = useState(false);
  const [quickEditSaved, setQuickEditSaved] = useState(false);

  useEffect(() => {
    if (choirInfo) {
      if (choirInfo.welcome_message) setEditWelcomeMessage(choirInfo.welcome_message);
      if (choirInfo.scripture_verse) setEditScriptureVerse(choirInfo.scripture_verse);
      if (choirInfo.songs_badge_text) setEditSongsBadgeText(choirInfo.songs_badge_text);
    }
  }, [choirInfo]);

  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingQuickEdit(true);
      await updateBranding({
        welcome_message: editWelcomeMessage,
        scripture_verse: editScriptureVerse,
        songs_badge_text: editSongsBadgeText,
      });
      await refreshBranding();
      setQuickEditSaved(true);
      setTimeout(() => {
        setQuickEditSaved(false);
        setIsEditingHomeText(false);
      }, 1000);
    } catch (err: any) {
      alert(err.message || 'Failed to update home text');
    } finally {
      setIsSavingQuickEdit(false);
    }
  };

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [songsRes, catsRes, annRes] = await Promise.all([
          fetch('/api/songs').catch(() => null),
          fetch('/api/songs/categories').catch(() => null),
          fetch('/api/announcements').catch(() => null),
        ]);

        if (songsRes && songsRes.ok) {
          const songsData = await songsRes.json();
          setSongs(songsData);
        } else {
          const offlineSongs = await getAllOfflineSongs();
          if (offlineSongs.length > 0) setSongs(offlineSongs);
        }

        if (catsRes && catsRes.ok) {
          const catsData = await catsRes.json();
          setCategories(catsData);
        }

        if (annRes && annRes.ok) {
          const annData = await annRes.json();
          setAnnouncements(annData);
        }
      } catch (err) {
        console.warn('Network issue loading home data, attempting offline fallback:', err);
        const offlineSongs = await getAllOfflineSongs();
        if (offlineSongs.length > 0) setSongs(offlineSongs);
      } finally {
        setIsLoading(false);
      }
    };
    loadHomeData();
  }, []);

  // Live search by title or song number
  useEffect(() => {
    if (!homeSearch.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const term = homeSearch.trim().toLowerCase();
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/songs?search=${encodeURIComponent(term)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.slice(0, 8));
        } else {
          fallbackOfflineSearch(term);
        }
      } catch (err) {
        fallbackOfflineSearch(term);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    const fallbackOfflineSearch = async (queryTerm: string) => {
      const offlineSongs = await getAllOfflineSongs();
      const matches = offlineSongs.filter(
        s =>
          (s.song_number && s.song_number.toLowerCase().includes(queryTerm)) ||
          s.title.toLowerCase().includes(queryTerm) ||
          (s.lyrics && s.lyrics.toLowerCase().includes(queryTerm))
      );
      setSearchResults(matches.slice(0, 8));
    };

    return () => clearTimeout(timer);
  }, [homeSearch]);

  const releasedSongs = songs.filter(s => s.release_status === 'released');
  const featuredSongs = releasedSongs.slice(0, 3);
  const latestReleases = releasedSongs.slice(0, 6);

  const handleQuickPlay = async (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/songs/${song.id}`);
      if (res.ok) {
        const detail: Song = await res.json();
        if (detail.audio_tracks && detail.audio_tracks.length > 0) {
          playTrack(detail.audio_tracks[0], detail);
        } else {
          onSelectSong(song.id);
        }
      }
    } catch (err) {
      onSelectSong(song.id);
    }
  };

  const handleCategoryClick = (catId: string) => {
    if (onSelectCategory) {
      onSelectCategory(catId);
    } else {
      onNavigateToTab('songs');
    }
  };

  // Category visual metadata mapping
  const categoryMetadata: Record<string, { icon: any; color: string; bg: string; border: string; subtitle: string }> = {
    cat_agakiza: {
      icon: Flame,
      color: 'text-rose-700',
      bg: 'bg-rose-50 hover:bg-rose-100/80',
      border: 'border-rose-200',
      subtitle: "Urukundo rwa Yesu & Agakiza",
    },
    cat_ijuru: {
      icon: Cloud,
      color: 'text-sky-700',
      bg: 'bg-sky-50 hover:bg-sky-100/80',
      border: 'border-sky-200',
      subtitle: "Ubugingo bw'Iteka & Amasezerano",
    },
    cat_gushima: {
      icon: Heart,
      color: 'text-amber-700',
      bg: 'bg-amber-50 hover:bg-amber-100/80',
      border: 'border-amber-200',
      subtitle: "Gusingiza & Guhimbaza Imana",
    },
    cat_kwizera: {
      icon: ShieldCheck,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 hover:bg-emerald-100/80',
      border: 'border-emerald-200',
      subtitle: "Kwizera & Intwaro z'Umwuka",
    },
  };

  return (
    <div className="pb-24 space-y-6">
      {/* Hero Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-blue-900/40">
        <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-lg mx-auto">
          {/* Official Choir Logo */}
          <ChoirLogo size="lg" variant="splash" className="mb-3.5 shadow-md" />

          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 mb-2">
            ADEPR Nyanza • Kicukiro District, Kigali, Rwanda
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-50 font-serif">
            {choirInfo.choir_name}
          </h1>

          <p className="mt-2 text-sm sm:text-base text-slate-200 font-normal sm:font-medium leading-relaxed tracking-wide drop-shadow-xs max-w-md mx-auto">
            {choirInfo.welcome_message || "Igitabo cy'Indirimbo 92 zo Guhimbaza no Gusingiza Imana muri Korali La Lumiere."}
          </p>

          <p className="mt-1 text-xs text-amber-300/90 font-semibold italic">
            {choirInfo.scripture_verse || "“Zaburi 147:1; Yobu 8:7”"}
          </p>

          {/* Admin Quick Edit Button on Hero */}
          {isAdmin && (
            <button
              onClick={() => setIsEditingHomeText(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-[11px] font-bold rounded-full border border-amber-400/40 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Admin can easily change and update home text"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Hindura Ubutumwa (Admin Edit)</span>
            </button>
          )}

          {/* Quick Action Buttons */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 w-full">
            <button
              onClick={() => onNavigateToTab('songs')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs shadow-lg transition-transform active:scale-95"
            >
              <BookOpen className="w-4 h-4" />
              <span>Indirimbo (92 Songs)</span>
            </button>

            <button
              onClick={() => onNavigateToTab('support')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs border border-white/20 shadow-sm transition-transform active:scale-95"
            >
              <HeartHandshake className="w-4 h-4 text-rose-400" />
              <span>Gushyigikira (Support)</span>
            </button>
          </div>
        </div>
      </section>

      {/* Search songs by title or song number */}
      <section className="relative">
        <div className="bg-white rounded-2xl p-2 sm:p-2.5 border border-slate-200 shadow-sm">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={homeSearch}
              onChange={e => setHomeSearch(e.target.value)}
              placeholder="Shakisha indirimbo (nimero cyangwa umutwe)..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all"
            />
            {homeSearch ? (
              <button
                onClick={() => setHomeSearch('')}
                className="absolute right-3 p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <span className="absolute right-3 text-[10px] sm:text-[11px] font-bold text-blue-950 bg-amber-400/25 border border-amber-400/50 px-2 py-0.5 rounded-full shadow-2xs font-mono tracking-tight flex items-center gap-1">
                {choirInfo.songs_badge_text || (songs.length > 0 ? `${songs.length}` : '92')}
              </span>
            )}
          </div>

          {/* Instant Search Results Dropdown */}
          {homeSearch.trim() && (
            <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
              <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 font-semibold mb-1">
                <span>Ibisubizo byabonetse ({searchResults.length})</span>
                {searchResults.length > 0 && (
                  <button
                    onClick={() => onNavigateToTab('songs')}
                    className="text-blue-900 hover:underline"
                  >
                    Reba zose muri Songbook
                  </button>
                )}
              </div>

              {isSearching ? (
                <p className="text-center py-4 text-xs text-slate-400">Gushakisha...</p>
              ) : searchResults.length > 0 ? (
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {searchResults.map(song => (
                    <div
                      key={song.id}
                      onClick={() => onSelectSong(song.id)}
                      className="p-2.5 hover:bg-slate-50 rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-blue-900 text-amber-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          #{song.song_number}
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 truncate group-hover:text-blue-900">
                            {song.title}
                          </h4>
                          <p className="text-[10px] text-slate-500 truncate">
                            {song.category_name}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-900 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-xs text-slate-400">
                  Nta ndirimbo ibonetse ifite nimero cyangwa umutwe "{homeSearch}"
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Button / Section: Indirimbo */}
      <section className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-blue-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white font-serif">
              Indirimbo za La Lumiere Choir
            </h2>
            <p className="text-xs text-blue-200 mt-0.5">
              Igitabo cyuzuye kirimo indirimbo zose 92 zateguwe mu byiciro 4 by'ingenzi.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateToTab('songs')}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 shrink-0"
        >
          <span>Fungura Indirimbo Zose (92)</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </section>

      {/* Display the 4 song categories */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-900" />
            <h2 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight font-serif">
              Ibyiciro by'Indirimbo (4 Song Categories)
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Indirimbo 92
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((cat, idx) => {
            const meta = categoryMetadata[cat.id] || {
              icon: BookOpen,
              color: 'text-blue-700',
              bg: 'bg-blue-50 hover:bg-blue-100/80',
              border: 'border-blue-200',
              subtitle: cat.description || '',
            };
            const IconComponent = meta.icon;

            return (
              <div
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md flex items-center justify-between gap-3 group ${meta.bg} ${meta.border}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <IconComponent className={`w-5 h-5 ${meta.color}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Category {idx + 1}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-white/90 text-slate-700 rounded-md border border-slate-200/60">
                        {cat.song_count || 0} songs
                      </span>
                    </div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight font-serif">
                      {cat.name}
                    </h3>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5">
                      {meta.subtitle}
                    </p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-white/90 border border-slate-200/80 flex items-center justify-center text-slate-500 group-hover:text-blue-900 group-hover:border-blue-300 transition-colors shrink-0 shadow-2xs">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Announcements */}
      {announcements.length > 0 && (
        <section className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-2">
            <Bell className="w-4 h-4 text-amber-700" />
            <span>Amatangazo n'Amakuru ya Korali (Announcements)</span>
          </div>
          <div className="space-y-2">
            {announcements.map(ann => (
              <div key={ann.id} className="text-xs bg-white/90 p-3 rounded-xl border border-amber-100 shadow-2xs">
                <h4 className="font-bold text-slate-900">{ann.title}</h4>
                <p className="text-slate-600 mt-1 leading-relaxed">{ann.content}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Complete Upcoming Events Component */}
      <UpcomingEventsSection onOpenAuth={onOpenAuth} />

      {/* Featured Songs Section */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="font-bold text-base text-slate-900 tracking-tight font-serif">
              Indirimbo Zatoranyijwe (Featured)
            </h2>
          </div>
          <button
            onClick={() => onNavigateToTab('songs')}
            className="text-xs font-semibold text-blue-800 hover:text-blue-950 flex items-center gap-0.5"
          >
            <span>Zose</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {featuredSongs.map(song => (
            <div
              key={song.id}
              onClick={() => onSelectSong(song.id)}
              className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="px-2 py-0.5 bg-blue-900 text-amber-300 font-mono font-bold text-[10px] rounded-md">
                    #{song.song_number}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {song.category_name}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 line-clamp-2 group-hover:text-blue-900 transition-colors">
                  {song.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {song.composer || 'La Lumiere Choir'}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSong(song.id);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-900" />
                  <span>Soma Amagambo</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Admin Quick Edit Modal for Home Text & Badge */}
      {isEditingHomeText && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 font-serif">
                    Hindura Ubutumwa bw'Ibanze
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Admin can easily change and update home text
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingHomeText(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Ubutumwa bwo Kwakira (Home Welcome Subtitle):
                </label>
                <textarea
                  rows={2}
                  value={editWelcomeMessage}
                  onChange={e => setEditWelcomeMessage(e.target.value)}
                  placeholder="Igitabo cy'Indirimbo 92 zo Guhimbaza no Gusingiza Imana muri Korali La Lumiere."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 font-medium leading-relaxed"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Igaragara munsi y'izina rya Korali ku ibendera ry'ibanze.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Icyanditswe cy'Intego (Scripture / Theme Verse):
                </label>
                <input
                  type="text"
                  value={editScriptureVerse}
                  onChange={e => setEditScriptureVerse(e.target.value)}
                  placeholder="“Zaburi 147:1; Yobu 8:7”"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 italic font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Badge y'Indirimbo kuri Search Bar (Songs Counter Badge):
                </label>
                <input
                  type="text"
                  value={editSongsBadgeText}
                  onChange={e => setEditSongsBadgeText(e.target.value)}
                  placeholder="92"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              {quickEditSaved && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Byavuguruwe neza! (Updated successfully)</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingHomeText(false)}
                  disabled={isSavingQuickEdit}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Reka (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuickEdit}
                  className="px-5 py-2 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingQuickEdit ? 'Kubika...' : 'Bika Impinduka (Save & Update)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
