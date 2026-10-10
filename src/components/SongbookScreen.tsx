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
  FileText,
  Printer,
  UploadCloud,
  Link as LinkIcon,
  Trash2,
  Eye,
  AlertCircle,
  ExternalLink,
  FileCheck,
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
  const { user, isAdmin } = useAuth();
  const { playTrack } = useAudio();

  const [songs, setSongs] = useState<Song[]>([]);
  const [categories, setCategories] = useState<SongCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'all');
  const [sortBy, setSortBy] = useState<string>('default');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyPdf, setOnlyPdf] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [offlineSongIds, setOfflineSongIds] = useState<Set<string>>(new Set());
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number; title: string } | null>(null);
  const [downloadNotification, setDownloadNotification] = useState<string | null>(null);

  // PDF Viewer & Management State
  const [pdfModalSong, setPdfModalSong] = useState<Song | null>(null);
  const [adminPdfModalSong, setAdminPdfModalSong] = useState<Song | null>(null);
  const [adminUploadMode, setAdminUploadMode] = useState<'upload' | 'link'>('upload');
  const [adminPdfFile, setAdminPdfFile] = useState<File | null>(null);
  const [adminPdfUrl, setAdminPdfUrl] = useState('');
  const [adminPdfFilename, setAdminPdfFilename] = useState('');
  const [isSubmittingPdf, setIsSubmittingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);
  const [pdfErrorMessage, setPdfErrorMessage] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

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

  const totalAvailableCount = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.song_count || 0), 0) || songs.length || 106;
  }, [categories, songs]);

  const handleDownloadAllSongs = async () => {
    if (isDownloadingAll) return;
    setIsDownloadingAll(true);
    setDownloadProgress({ current: 0, total: totalAvailableCount, title: 'Gutangira...' });

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

    const handleSongsUpdated = () => {
      fetchSongs();
      fetchCategories();
    };

    window.addEventListener('songs_updated', handleSongsUpdated);
    window.addEventListener('focus', handleSongsUpdated);

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events/stream');
      eventSource.addEventListener('songs_updated', handleSongsUpdated);
      eventSource.addEventListener('song_added', handleSongsUpdated);
    } catch {
      // EventSource fallback
    }

    return () => {
      window.removeEventListener('songs_updated', handleSongsUpdated);
      window.removeEventListener('focus', handleSongsUpdated);
      if (eventSource) eventSource.close();
    };
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

  const songsWithPdfCount = useMemo(() => {
    return songs.filter(s => Boolean(s.lyrics_pdf_url)).length;
  }, [songs]);

  const displayedSongs = useMemo(() => {
    if (!onlyPdf) return songs;
    return songs.filter(s => Boolean(s.lyrics_pdf_url));
  }, [songs, onlyPdf]);

  const handleDownloadPdf = (targetSong: Song) => {
    const link = document.createElement('a');
    link.href = `/api/songs/${targetSong.id}/pdf?download=1`;
    link.download = targetSong.lyrics_pdf_filename || `La_Lumiere_No_${targetSong.song_number || targetSong.id}_Lyrics.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPdf = (targetSong: Song) => {
    const printUrl = `/api/songs/${targetSong.id}/pdf?action=print`;
    window.open(printUrl, '_blank');
  };

  const openAdminPdfModal = (targetSong: Song) => {
    setAdminPdfModalSong(targetSong);
    setAdminUploadMode('upload');
    setAdminPdfFile(null);
    setAdminPdfUrl(targetSong.lyrics_pdf_url?.startsWith('http') ? targetSong.lyrics_pdf_url : '');
    setAdminPdfFilename(targetSong.lyrics_pdf_filename || '');
    setPdfErrorMessage(null);
  };

  const handleSavePdfForSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPdfModalSong) return;

    try {
      setIsSubmittingPdf(true);
      setPdfErrorMessage(null);
      const token = localStorage.getItem('lalumiere_token');

      let res: Response;
      if (adminUploadMode === 'upload') {
        if (!adminPdfFile) {
          setPdfErrorMessage('Hitamo idosiye ya PDF ibanza (Please select a PDF file)');
          setIsSubmittingPdf(false);
          return;
        }
        const formData = new FormData();
        formData.append('file', adminPdfFile);
        res = await fetch(`/api/admin/songs/${adminPdfModalSong.id}/lyrics-pdf`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      } else {
        if (!adminPdfUrl.trim()) {
          setPdfErrorMessage('Injiza link ya PDF (Please enter a valid PDF URL)');
          setIsSubmittingPdf(false);
          return;
        }
        res = await fetch(`/api/admin/songs/${adminPdfModalSong.id}/lyrics-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            pdf_url: adminPdfUrl.trim(),
            filename: adminPdfFilename.trim() || undefined,
          }),
        });
      }

      if (res.ok) {
        const data = await res.json();
        setSongs(prev =>
          prev.map(s =>
            s.id === adminPdfModalSong.id
              ? { ...s, lyrics_pdf_url: data.lyrics_pdf_url, lyrics_pdf_filename: data.lyrics_pdf_filename, has_pdf: true }
              : s
          )
        );
        if (pdfModalSong && pdfModalSong.id === adminPdfModalSong.id) {
          setPdfModalSong({
            ...pdfModalSong,
            lyrics_pdf_url: data.lyrics_pdf_url,
            lyrics_pdf_filename: data.lyrics_pdf_filename,
            has_pdf: true,
          });
        }
        setPdfSuccessMessage(`PDF y'indirimbo "${adminPdfModalSong.title}" yashyizwemo neza!`);
        setTimeout(() => setPdfSuccessMessage(null), 4000);
        setAdminPdfModalSong(null);
        setAdminPdfFile(null);
        setAdminPdfUrl('');
        setAdminPdfFilename('');
        window.dispatchEvent(new CustomEvent('songs_updated'));
      } else {
        const err = await res.json();
        setPdfErrorMessage(err.error || 'Habaye ikibazo mu kubika PDF');
      }
    } catch (err: any) {
      setPdfErrorMessage(err.message || 'Habaye ikibazo cya interineti');
    } finally {
      setIsSubmittingPdf(false);
    }
  };

  const handleDeletePdfForSong = async (songId: string) => {
    if (!confirm('Uremeza ko ushaka gukuraho iyi PDF y\'amagambo kuri iyi ndirimbo?')) {
      return;
    }

    try {
      setIsSubmittingPdf(true);
      const token = localStorage.getItem('lalumiere_token');
      const res = await fetch(`/api/admin/songs/${songId}/lyrics-pdf`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setSongs(prev =>
          prev.map(s =>
            s.id === songId
              ? { ...s, lyrics_pdf_url: undefined, lyrics_pdf_filename: undefined, has_pdf: false }
              : s
          )
        );
        if (pdfModalSong && pdfModalSong.id === songId) {
          setPdfModalSong({
            ...pdfModalSong,
            lyrics_pdf_url: undefined,
            lyrics_pdf_filename: undefined,
            has_pdf: false,
          });
        }
        setPdfSuccessMessage('PDF yakuweho neza!');
        setTimeout(() => setPdfSuccessMessage(null), 3000);
        setAdminPdfModalSong(null);
        window.dispatchEvent(new CustomEvent('songs_updated'));
      } else {
        const err = await res.json();
        alert(err.error || 'Habaye ikibazo mu gukuraho PDF');
      }
    } catch (err: any) {
      alert('Habaye ikibazo cya interineti');
    } finally {
      setIsSubmittingPdf(false);
    }
  };

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
            Indirimbo za Korali La Lumiere zateguwe mu byiciro 4 (AGAKIZA, IJURU, GUSHIMA, KWIZERA)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Download All Songs for 100% Offline Access */}
          <button
            onClick={handleDownloadAllSongs}
            disabled={isDownloadingAll}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 shadow-2xs ${
              offlineSongIds.size >= totalAvailableCount
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Bika indirimbo zose offline ngo ujye uzisoma nta interineti"
          >
            {isDownloadingAll ? (
              <RefreshCw className="w-3.5 h-3.5 text-blue-900 animate-spin" />
            ) : offlineSongIds.size >= totalAvailableCount ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Download className="w-3.5 h-3.5 text-slate-600" />
            )}
            <span className="hidden sm:inline">
              {isDownloadingAll
                ? 'Kubika...'
                : offlineSongIds.size >= totalAvailableCount
                ? `${totalAvailableCount} Zabitswe Offline`
                : `Bika Zose Offline (${offlineSongIds.size}/${totalAvailableCount})`}
            </span>
            <span className="sm:hidden text-[10px]">
              {offlineSongIds.size >= totalAvailableCount ? `Offline (${totalAvailableCount})` : 'Bika Zose'}
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
            Zose ({totalAvailableCount})
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
                setOnlyPdf(false);
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

          <button
            onClick={() => {
              setOnlyPdf(!onlyPdf);
              setOnlyFavorites(false);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors shrink-0 ${
              onlyPdf
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
            title="Erekana indirimbo zifite PDF y'amagambo gusa (Filter songs with PDF lyrics)"
          >
            <FileText className="w-3.5 h-3.5 text-rose-500" />
            <span>PDF Lyrics ({songsWithPdfCount})</span>
          </button>
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
            Reba zose (All {totalAvailableCount})
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

      {/* PDF Action Success Toast */}
      {pdfSuccessMessage && (
        <div className="bg-emerald-900 text-white px-4 py-2.5 rounded-2xl shadow-md flex items-center justify-between gap-2 text-xs font-semibold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{pdfSuccessMessage}</span>
          </div>
          <button
            onClick={() => setPdfSuccessMessage(null)}
            className="text-emerald-300 hover:text-white text-xs font-bold"
          >
            Sawa
          </button>
        </div>
      )}

      {/* Songs List */}
      {isLoading ? (
        <div className="space-y-3 py-10 text-center text-slate-400">
          <div className="w-8 h-8 border-3 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs">Gushakisha indirimbo...</p>
        </div>
      ) : displayedSongs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-sm text-slate-700">Nta ndirimbo ibonetse</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {onlyPdf
              ? "Nta ndirimbo ifite dosiye ya PDF y'amagambo muri iki cyiciro."
              : "Ntacyo twabonye gihura n'ibyo mwashakishije. Shakisha nimero y'indirimbo (urugero: 1, 15, 25) cyangwa umutwe wayo."}
          </p>
          {(searchQuery || selectedCategory !== 'all' || onlyFavorites || onlyPdf) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setOnlyFavorites(false);
                setOnlyPdf(false);
              }}
              className="mt-2 text-xs font-bold text-blue-900 hover:underline"
            >
              Kuriho akayunguruzo kose (Reset filters)
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {displayedSongs.map(song => (
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {song.category_name && (
                      <span className="text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {song.category_name}
                      </span>
                    )}
                    {song.lyrics_pdf_url && (
                      <span className="text-[9px] font-bold text-rose-800 bg-rose-50 px-1.5 py-0.2 rounded-md flex items-center gap-0.5 border border-rose-200">
                        <FileCheck className="w-2.5 h-2.5 text-rose-600" />
                        PDF
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
                {/* PDF Lyrics Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPdfModalSong(song);
                    setShowPdfPreview(false);
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    song.lyrics_pdf_url
                      ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-2xs'
                      : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200/80 bg-slate-50'
                  }`}
                  title={
                    song.lyrics_pdf_url
                      ? "Amagambo muri PDF (Dosiye yemejwe) - Kuramo cyangwa Capa"
                      : "Amagambo muri PDF - Kuramo cyangwa Capa (Download / Print PDF)"
                  }
                >
                  <FileText className={`w-3.5 h-3.5 ${song.lyrics_pdf_url ? 'text-rose-600' : 'text-slate-500'}`} />
                  <span className="text-[10px] hidden sm:inline">PDF</span>
                </button>

                {/* Admin Quick Upload / Link Button if no custom PDF */}
                {isAdmin && !song.lyrics_pdf_url && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openAdminPdfModal(song);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl text-[10px] font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-dashed border-blue-300 transition-colors"
                    title="Admin: Shyiraho PDF y'amagambo (Upload or Link PDF)"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-blue-700" />
                    <span className="hidden md:inline">+ PDF</span>
                  </button>
                )}

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

      {/* ------------------------------------------------------------- */}
      {/* 1. PDF LYRICS VIEWER / DOWNLOAD & PRINT MODAL */}
      {/* ------------------------------------------------------------- */}
      {pdfModalSong && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-extrabold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md">
                      No. {pdfModalSong.song_number || '—'}
                    </span>
                    {pdfModalSong.category_name && (
                      <span className="text-[11px] font-bold text-slate-500">
                        {pdfModalSong.category_name}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-900 font-serif truncate mt-1">
                    {pdfModalSong.title}
                  </h2>
                  <p className="text-xs text-slate-500 truncate">
                    {pdfModalSong.composer || 'La Lumiere Choir'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPdfModalSong(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Status Card */}
            <div className={`p-4 rounded-2xl border ${
              pdfModalSong.lyrics_pdf_url
                ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                : 'bg-blue-50/60 border-blue-200 text-blue-950'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  pdfModalSong.lyrics_pdf_url ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-800'
                }`}>
                  {pdfModalSong.lyrics_pdf_url ? (
                    <FileCheck className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold">
                    {pdfModalSong.lyrics_pdf_url
                      ? 'Dosiye ya PDF Yemejwe (Attached PDF Document)'
                      : 'Inyandiko y\'Umwimerere ya PDF (Choir Formatted PDF)'}
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    {pdfModalSong.lyrics_pdf_url ? (
                      <>
                        Idosiye yashyizweho n'ubuyobozi bwa Korali:{' '}
                        <span className="font-semibold text-slate-800 truncate block mt-0.5">
                          {pdfModalSong.lyrics_pdf_filename || 'Amagambo_y_Indirimbo.pdf'}
                        </span>
                      </>
                    ) : (
                      'Inyandiko ifite amagambo yose, ibitero n\'inyikurizo, amanota ya Sol-fa, n\'ibisobanuro byose by\'indirimbo.'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Main Action Buttons: Download & Print */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => handleDownloadPdf(pdfModalSong)}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-900 hover:bg-blue-950 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Kuramo PDF (Download)</span>
              </button>

              <button
                onClick={() => handlePrintPdf(pdfModalSong)}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-2xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Gucapa PDF (Print)</span>
              </button>
            </div>

            {/* Embedded Preview Toggle */}
            <div className="pt-2">
              <button
                onClick={() => setShowPdfPreview(!showPdfPreview)}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>{showPdfPreview ? 'Hisha Inyandiko (Hide Preview)' : 'Reba Inyandiko Hano (Preview PDF)'}</span>
              </button>

              {showPdfPreview && (
                <div className="mt-3 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
                  <iframe
                    src={`/api/songs/${pdfModalSong.id}/pdf`}
                    title={`PDF preview ya ${pdfModalSong.title}`}
                    className="w-full h-80"
                  />
                </div>
              )}
            </div>

            {/* Admin Management Section */}
            {isAdmin && (
              <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/70 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-4 sm:p-5 rounded-b-3xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-blue-950 uppercase tracking-wider">
                    Ubuyobozi (Admin Actions)
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Shyiraho cyangwa hindura PDF
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const songToAdmin = pdfModalSong;
                      setPdfModalSong(null);
                      openAdminPdfModal(songToAdmin);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>
                      {pdfModalSong.lyrics_pdf_url
                        ? 'Hindura Dosiye ya PDF'
                        : 'Shyiraho Dosiye ya PDF'}
                    </span>
                  </button>

                  {pdfModalSong.lyrics_pdf_url && (
                    <button
                      onClick={() => handleDeletePdfForSong(pdfModalSong.id)}
                      disabled={isSubmittingPdf}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                      title="Siba PDF kuri iyi ndirimbo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Siba</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. ADMIN UPLOAD OR LINK PDF MODAL */}
      {/* ------------------------------------------------------------- */}
      {adminPdfModalSong && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-900 text-amber-300 flex items-center justify-center font-bold text-sm shrink-0">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-slate-900 font-serif truncate">
                    Shyiraho PDF y'Amagambo
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    No. {adminPdfModalSong.song_number} - {adminPdfModalSong.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAdminPdfModalSong(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switch (Upload File vs Link URL) */}
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setAdminUploadMode('upload');
                  setPdfErrorMessage(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  adminUploadMode === 'upload'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kwinjiza Dosiye (Upload File)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdminUploadMode('link');
                  setPdfErrorMessage(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  adminUploadMode === 'link'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Gushyiraho Link (Direct URL)
              </button>
            </div>

            {/* Error Banner */}
            {pdfErrorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pdfErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSavePdfForSong} className="space-y-4">
              {adminUploadMode === 'upload' ? (
                /* File Upload Zone */
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Hitamo Dosiye ya PDF (.pdf) *
                  </label>
                  <label className="border-2 border-dashed border-slate-300 hover:border-blue-900 bg-slate-50 hover:bg-blue-50/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={e => {
                        if (e.target.files?.[0]) {
                          setAdminPdfFile(e.target.files[0]);
                          setPdfErrorMessage(null);
                        }
                      }}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 group-hover:border-blue-300 flex items-center justify-center text-slate-600 group-hover:text-blue-900 mb-2 transition-colors">
                      <FileText className="w-6 h-6" />
                    </div>
                    {adminPdfFile ? (
                      <div>
                        <p className="text-xs font-extrabold text-blue-900 truncate max-w-xs">
                          {adminPdfFile.name}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {(adminPdfFile.size / 1024).toFixed(1)} KB • Kanda hano ngo uhindure
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-slate-700">
                          Kanda hano cyangwa ukurure dosiye ya PDF
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Ubwoko bwemewe: PDF gusa (Max 25MB)
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              ) : (
                /* Link URL Zone */
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Link ya Interineti (Direct PDF URL) *
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="url"
                        value={adminPdfUrl}
                        onChange={e => setAdminPdfUrl(e.target.value)}
                        placeholder="https://example.com/indirimbo.pdf"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Urugero: Link ya Google Drive, Dropbox, cyangwa cloud archive ya Korali
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Izina rya Dosiye (Filename - Optional)
                    </label>
                    <input
                      type="text"
                      value={adminPdfFilename}
                      onChange={e => setAdminPdfFilename(e.target.value)}
                      placeholder={`La_Lumiere_No_${adminPdfModalSong.song_number}_Lyrics.pdf`}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                </div>
              )}

              {/* Status of Existing PDF */}
              {adminPdfModalSong.lyrics_pdf_url && (
                <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-slate-800 block text-[11px]">PDF iriho ubu:</span>
                    <span className="text-[10px] text-slate-500 truncate block">
                      {adminPdfModalSong.lyrics_pdf_filename || adminPdfModalSong.lyrics_pdf_url}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeletePdfForSong(adminPdfModalSong.id)}
                    className="text-xs text-rose-600 font-bold hover:underline shrink-0"
                  >
                    Siba
                  </button>
                </div>
              )}

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdminPdfModalSong(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                >
                  Reka (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPdf}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold transition-all shadow-md inline-flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  {isSubmittingPdf ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{isSubmittingPdf ? 'Kubika...' : 'Bika PDF'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
