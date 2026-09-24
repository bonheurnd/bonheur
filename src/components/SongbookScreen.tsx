import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Song, SongCategory } from '../types';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
import {
  getAllOfflineSongs,
  downloadAllSongsForOffline,
} from '../services/offlineStorage';
import {
  Search,
  X,
  BookOpen,
  Music,
  ArrowUpDown,
  Heart,
  ChevronRight,
  Layers,
  Flame,
  Cloud,
  ShieldCheck,
  Download,
  CheckCircle2,
  RefreshCw,
  ListFilter,
  SlidersHorizontal,
} from 'lucide-react';

interface SongbookScreenProps {
  onSelectSong: (songId: string) => void;
  initialCategory?: string;
  initialSearchQuery?: string;
  onCategoryChange?: (categoryId: string) => void;
}

export const SongbookScreen: React.FC<SongbookScreenProps> = ({
  onSelectSong,
  initialCategory = 'all',
  initialSearchQuery = '',
  onCategoryChange,
}) => {
  const { user } = useAuth();
  const { playTrack } = useAudio();

  const [songs, setSongs] = useState<Song[]>([]);
  const [categories, setCategories] = useState<SongCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'all');
  const [sortBy, setSortBy] = useState<string>('default');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [offlineSongIds, setOfflineSongIds] = useState<Set<string>>(new Set());
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number; title: string } | null>(null);
  const [downloadNotification, setDownloadNotification] = useState<string | null>(null);

  // Sync initialCategory prop if passed or changed
  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  const refreshOfflineIds = async () => {
    try {
      const offlineSongs = await getAllOfflineSongs();
      setOfflineSongIds(new Set(offlineSongs.map(s => s.id)));
    } catch (e) {
      console.warn('Could not read offline song ids:', e);
    }
  };

  const fetchSongs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (sortBy !== 'default') params.append('sort', sortBy);

      const token = localStorage.getItem('lalumiere_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const url = onlyFavorites ? '/api/favorites' : `/api/songs?${params.toString()}`;
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setSongs(data);
      } else {
        // Fallback to offline stored songs
        await loadFromOfflineStorage();
      }
    } catch (err) {
      console.warn('Network fetch songs failed, using offline storage:', err);
      await loadFromOfflineStorage();
    } finally {
      setIsLoading(false);
      refreshOfflineIds();
    }
  };

  const loadFromOfflineStorage = async () => {
    const offlineSongs = await getAllOfflineSongs();
    if (offlineSongs.length > 0) {
      let filtered = [...offlineSongs];
      if (selectedCategory !== 'all') {
        filtered = filtered.filter(s => s.category_id === selectedCategory);
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(
          s =>
            (s.song_number && s.song_number.toLowerCase().includes(q)) ||
            s.title.toLowerCase().includes(q) ||
            (s.lyrics && s.lyrics.toLowerCase().includes(q))
        );
      }
      setSongs(filtered);
    }
  };

  const handleDownloadAllSongs = async () => {
    if (isDownloadingAll) return;
    setIsDownloadingAll(true);
    setDownloadProgress({ current: 0, total: 92, title: 'Gutangira...' });

    try {
      const count = await downloadAllSongsForOffline((curr, total, title) => {
        setDownloadProgress({ current: curr, total, title });
      });
      await refreshOfflineIds();
      setDownloadNotification(`Indirimbo ${count} zose zabitswe offline kuri telefoni yawe!`);
      setTimeout(() => setDownloadNotification(null), 4000);
    } catch (err) {
      console.error('Failed to download all songs offline:', err);
      alert('Habaye ikibazo mu kubika indirimbo zose offline.');
    } finally {
      setIsDownloadingAll(false);
      setDownloadProgress(null);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/songs/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchSongs();
    }, 150);
    return () => clearTimeout(timeout);
  }, [searchQuery, selectedCategory, sortBy, onlyFavorites]);

  const handleSelectCategory = (catId: string) => {
    setSelectedCategory(catId);
    setOnlyFavorites(false);
    if (onCategoryChange) {
      onCategoryChange(catId);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    if (!user) {
      alert('Ugomba kwinjira muri konti yawe kugira ngo ushyire indirimbo mu zo ukunda (Please login to favorite)');
      return;
    }

    try {
      const token = localStorage.getItem('lalumiere_token');
      const res = await fetch(`/api/favorites/${songId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSongs(prev =>
          prev.map(s => (s.id === songId ? { ...s, is_favorite: data.is_favorite } : s))
        );
      }
    } catch (err) {
      console.error('Favorite toggle failed:', err);
    }
  };

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

  // Find active category info
  const activeCategory = categories.find(c => c.id === selectedCategory);

  const categoryThemes: Record<string, { label: string; icon: any; color: string; badgeBg: string }> = {
    cat_agakiza: { label: 'CATEGORY 1: AGAKIZA', icon: Flame, color: 'text-rose-700', badgeBg: 'bg-rose-100 text-rose-800 border-rose-200' },
    cat_ijuru: { label: 'CATEGORY 2: IJURU', icon: Cloud, color: 'text-sky-700', badgeBg: 'bg-sky-100 text-sky-800 border-sky-200' },
    cat_gushima: { label: 'CATEGORY 3: GUSHIMA', icon: Heart, color: 'text-amber-700', badgeBg: 'bg-amber-100 text-amber-800 border-amber-200' },
    cat_kwizera: { label: 'CATEGORY 4: KWIZERA', icon: ShieldCheck, color: 'text-emerald-700', badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  };

  const activeMeta = selectedCategory !== 'all' ? categoryThemes[selectedCategory] : null;

  return (
    <div className="pb-28 space-y-4">
      {/* Title & Stats */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-serif">
            Igitabo cy'Indirimbo (Songbook)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Indirimbo zose 92 za Korali La Lumiere zateguwe mu byiciro 4
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Download All 92 Songs for 100% Offline Access */}
          <button
            onClick={handleDownloadAllSongs}
            disabled={isDownloadingAll}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 shadow-2xs ${
              offlineSongIds.size >= 90
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Bika indirimbo zose 92 offline ngo ujye uzisoma nta interineti"
          >
            {isDownloadingAll ? (
              <RefreshCw className="w-3.5 h-3.5 text-blue-900 animate-spin" />
            ) : offlineSongIds.size >= 90 ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Download className="w-3.5 h-3.5 text-slate-600" />
            )}
            <span className="hidden sm:inline">
              {isDownloadingAll
                ? 'Kubika...'
                : offlineSongIds.size >= 90
                ? '92 Zabitswe Offline'
                : `Bika Zose Offline (${offlineSongIds.size}/92)`}
            </span>
            <span className="sm:hidden text-[10px]">
              {offlineSongIds.size >= 90 ? 'Offline (92)' : 'Bika Zose'}
            </span>
          </button>

          <span className="text-xs font-mono font-bold bg-blue-900 text-white px-2.5 py-1 rounded-full shadow-2xs">
            {songs.length}
          </span>
        </div>
      </div>

      {/* Download All Progress Bar */}
      {isDownloadingAll && downloadProgress && (
        <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-md border border-slate-700 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="flex items-center gap-1.5 text-amber-300">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Guhunika indirimbo 92 kuri telefoni...
            </span>
            <span className="font-mono text-slate-300">
              {downloadProgress.current} / {downloadProgress.total} ({Math.round((downloadProgress.current / downloadProgress.total) * 100)}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-300 truncate mb-2">
            Ubu: #{downloadProgress.title}
          </p>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-amber-400 h-2 rounded-full transition-all duration-150"
              style={{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Download Notification Banner */}
      {downloadNotification && (
        <div className="bg-emerald-900 text-white px-4 py-2.5 rounded-2xl shadow-md flex items-center justify-between gap-2 text-xs font-semibold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{downloadNotification}</span>
          </div>
          <button
            onClick={() => setDownloadNotification(null)}
            className="text-emerald-300 hover:text-white text-xs font-bold"
          >
            Sawa
          </button>
        </div>
      )}

      {/* Search Input: allows searching by song number, title, or words appearing in lyrics */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Shakisha nimero y'indirimbo, umutwe, cyangwa amagambo..."
          className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 shadow-2xs transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* The 4 Category Tabs */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          <button
            onClick={() => handleSelectCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              selectedCategory === 'all' && !onlyFavorites
                ? 'bg-blue-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            Zose (92)
          </button>

          {categories.map((cat, idx) => {
            const isSelected = selectedCategory === cat.id && !onlyFavorites;
            return (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <span>{idx + 1}. {cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-500'
                }`}>
                  {cat.song_count || 0}
                </span>
              </button>
            );
          })}

          {user && (
            <button
              onClick={() => {
                setOnlyFavorites(true);
                setSelectedCategory('all');
              }}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors shrink-0 ${
                onlyFavorites
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-rose-600 hover:bg-rose-50 border border-rose-200'
              }`}
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>Izo nkunda</span>
            </button>
          )}
        </div>
      </div>

      {/* Dedicated Category Header View (When Category is selected) */}
      {activeCategory && selectedCategory !== 'all' && (
        <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-4 rounded-2xl border border-blue-900/60 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300">
                  {activeMeta?.label || activeCategory.name}
                </span>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-mono font-bold text-slate-200">
                  {activeCategory.song_count} Indirimbo
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white font-serif truncate mt-0.5">
                {activeCategory.name}
              </h2>
              {activeCategory.description && (
                <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                  {activeCategory.description}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => handleSelectCategory('all')}
            className="text-xs text-amber-300 hover:text-amber-200 font-bold shrink-0 underline"
          >
            Reba zose (All 92)
          </button>
        </div>
      )}

      {/* Sort row */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-xs">
        <span className="text-slate-500 font-medium">
          {searchQuery ? `Gushakisha: "${searchQuery}" (${songs.length})` : `Urutonde rw'indirimbo (${songs.length})`}
        </span>

        {/* Sort dropdown */}
        <div className="flex items-center gap-1.5 text-slate-600">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-white border border-slate-200 text-slate-800 py-1 px-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-900"
          >
            <option value="default">Uko zikurikirana mu gitabo (Book Order)</option>
            <option value="number">Kuva ku ya mbere (Song Number)</option>
            <option value="popular">Izakunzwe cyane (Most Popular)</option>
          </select>
        </div>
      </div>

      {/* Songs List */}
      {isLoading ? (
        <div className="space-y-3 py-10 text-center text-slate-400">
          <div className="w-8 h-8 border-3 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs">Gushakisha indirimbo...</p>
        </div>
      ) : songs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-sm text-slate-700">Nta ndirimbo ibonetse</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Ntacyo twabonye gihura n'ibyo mwashakishije. Shakisha nimero y'indirimbo (urugero: 1, 15, 25) cyangwa umutwe wayo.
          </p>
          {(searchQuery || selectedCategory !== 'all' || onlyFavorites) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setOnlyFavorites(false);
              }}
              className="mt-2 text-xs font-bold text-blue-900 hover:underline"
            >
              Kuriho akayunguruzo kose
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {songs.map(song => (
            <div
              key={song.id}
              onClick={() => onSelectSong(song.id)}
              className="bg-white rounded-2xl p-3.5 border border-slate-200 hover:border-blue-900/50 shadow-2xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              {/* Song Information: Song Number & Title prominently visible */}
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Song Number Badge */}
                <div className="w-11 h-11 rounded-xl bg-blue-900 group-hover:bg-blue-950 text-amber-300 font-mono font-extrabold text-sm flex flex-col items-center justify-center shrink-0 shadow-2xs transition-colors">
                  <span className="text-[9px] uppercase font-sans font-medium text-blue-200 tracking-wider">No</span>
                  <span>{song.song_number}</span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {song.category_name && (
                      <span className="text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {song.category_name}
                      </span>
                    )}
                    {offlineSongIds.has(song.id) && (
                      <span className="text-[9px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded-md flex items-center gap-0.5 border border-teal-200">
                        <CheckCircle2 className="w-2.5 h-2.5 text-teal-600" />
                        Offline
                      </span>
                    )}
                    {song.has_audio && (
                      <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded-md flex items-center gap-0.5 border border-emerald-100">
                        <Music className="w-2.5 h-2.5" />
                        Audio
                      </span>
                    )}
                  </div>

                  {/* Song Title */}
                  <h3 className="font-extrabold text-sm text-slate-900 truncate group-hover:text-blue-900 transition-colors mt-1 font-serif">
                    {song.title}
                  </h3>

                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {song.composer || 'La Lumiere Choir'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Favorite Toggle */}
                <button
                  onClick={(e) => toggleFavorite(e, song.id)}
                  className={`p-2 rounded-xl transition-colors ${
                    song.is_favorite
                      ? 'text-rose-600 bg-rose-50'
                      : 'text-slate-300 hover:text-rose-500 hover:bg-slate-50'
                  }`}
                  title={song.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart className={`w-4 h-4 ${song.is_favorite ? 'fill-current' : ''}`} />
                </button>

                {/* Audio quick play if audio available */}
                {song.has_audio && (
                  <button
                    onClick={(e) => handleQuickPlay(e, song)}
                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                    title="Play Audio"
                  >
                    <Music className="w-4 h-4 fill-current" />
                  </button>
                )}

                {/* Open reading page */}
                <div className="p-2 bg-slate-50 group-hover:bg-blue-50 text-slate-400 group-hover:text-blue-900 rounded-xl transition-colors">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
