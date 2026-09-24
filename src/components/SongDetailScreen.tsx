import React, { useState, useEffect } from 'react';
import { Song, Comment, AudioTrack } from '../types';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
import {
  saveSongOffline,
  getOfflineSong,
  removeSongOffline,
  saveAudioOffline,
  isSongDownloadedOffline,
} from '../services/offlineStorage';
import {
  ArrowLeft,
  Heart,
  Share2,
  Lock,
  Unlock,
  Play,
  Pause,
  MessageSquare,
  ThumbsUp,
  Flag,
  Sun,
  Moon,
  Coffee,
  Clock,
  Music,
  Send,
  Check,
  Download,
  CheckCircle2,
} from 'lucide-react';

interface SongDetailScreenProps {
  songId: string;
  onBack: () => void;
  onOpenAuth: () => void;
}

export const SongDetailScreen: React.FC<SongDetailScreenProps> = ({
  songId,
  onBack,
  onOpenAuth,
}) => {
  const { user, isAdmin } = useAuth();
  const { playTrack, isPlaying, currentTrack, togglePlay } = useAudio();

  const [song, setSong] = useState<Song | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Unreleased protection state
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Reading interface preferences
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'sepia'>('light');

  // Comment input state
  const [commentText, setCommentText] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Offline download state
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  const checkOfflineStatus = async () => {
    const downloaded = await isSongDownloadedOffline(songId);
    setIsDownloaded(downloaded);
  };

  const fetchSongDetails = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('lalumiere_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/songs/${songId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSong(data);
        // If it was already downloaded or user views it, we can keep cache fresh
        const isOffline = await isSongDownloadedOffline(songId);
        if (isOffline) {
          await saveSongOffline(data);
        }
      } else {
        // Network or server returned error, check offline storage
        const offlineSong = await getOfflineSong(songId);
        if (offlineSong) {
          setSong(offlineSong);
          setIsDownloaded(true);
        }
      }
    } catch (err) {
      console.warn('Network failed to load song, trying offline storage:', err);
      const offlineSong = await getOfflineSong(songId);
      if (offlineSong) {
        setSong(offlineSong);
        setIsDownloaded(true);
      }
    } finally {
      setIsLoading(false);
      checkOfflineStatus();
    }
  };

  const handleToggleDownloadOffline = async () => {
    if (!song) return;

    if (isDownloaded) {
      try {
        await removeSongOffline(song.id);
        setIsDownloaded(false);
        setDownloadSuccessToast('Indirimbo yakuwe mu zibikwa offline.');
        setTimeout(() => setDownloadSuccessToast(null), 3000);
      } catch (err) {
        console.error('Failed to remove offline song:', err);
      }
      return;
    }

    try {
      setIsDownloading(true);
      // Save song with lyrics
      await saveSongOffline(song);

      // If audio tracks exist, download first audio track as well
      if (song.audio_tracks && song.audio_tracks.length > 0) {
        try {
          await saveAudioOffline(song.audio_tracks[0], song.id);
        } catch (audioErr) {
          console.warn('Audio download failed, but song lyrics were saved offline:', audioErr);
        }
      }

      setIsDownloaded(true);
      setDownloadSuccessToast('Indirimbo yabitswe! Ushobora kuyisoma no kuyiririmba niyo waba udafite interineti.');
      setTimeout(() => setDownloadSuccessToast(null), 3500);
    } catch (err) {
      console.error('Download offline error:', err);
      alert('Habaye ikibazo mu kubika indirimbo offline.');
    } finally {
      setIsDownloading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/songs/${songId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  useEffect(() => {
    fetchSongDetails();
    fetchComments();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [songId]);

  const handleUnlockSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    try {
      setIsUnlocking(true);
      setPasswordError('');
      const res = await fetch(`/api/songs/${songId}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || 'Ijambo ry\'ibanga si ryo (Invalid password)');
        return;
      }

      setSong(prev =>
        prev
          ? {
              ...prev,
              is_locked: false,
              lyrics: data.lyrics,
              solfa_notation: data.solfa_notation,
            }
          : null
      );
      setPasswordInput('');
    } catch (err) {
      setPasswordError('Habaye ikibazo mu kugenzura ijambo ry\'ibanga');
    } finally {
      setIsUnlocking(false);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      onOpenAuth();
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
        setSong(prev => (prev ? { ...prev, is_favorite: data.is_favorite } : null));
      }
    } catch (err) {
      console.error('Favorite error:', err);
    }
  };

  const handleShare = async () => {
    if (!song) return;

    // Build absolute URL directly pointing to this song
    const songUrl = `${window.location.origin}${window.location.pathname}?song=${encodeURIComponent(song.id)}`;
    const shareTitle = `${song.song_number ? `#${song.song_number} ` : ''}${song.title} - La Lumiere Choir`;
    const shareText = `Soma amagambo y'indirimbo "${song.title}" ya Chorale La Lumiere (ADEPR Nyanza).`;

    // Attempt Web Share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: songUrl,
        });
        return;
      } catch (err) {
        // User aborted share sheet or browser blocked; proceed to fallback if not abort
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
      }
    }

    // Fallback: Copy song link to clipboard
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(songUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = songUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch (err) {
      console.warn('Failed to copy share link:', err);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!commentText.trim()) return;

    try {
      setIsSubmittingComment(true);
      const token = localStorage.getItem('lalumiere_token');
      const res = await fetch(`/api/songs/${songId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: commentText.trim(),
          parent_id: replyToId,
        }),
      });

      if (res.ok) {
        setCommentText('');
        setReplyToId(null);
        await fetchComments();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to post comment');
      }
    } catch (err) {
      console.error('Comment error:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/like`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setComments(prev =>
          prev.map(c => (c.id === commentId ? { ...c, likes_count: data.likes_count } : c))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReportComment = async (commentId: string) => {
    const reason = prompt('Impamvu yo kurega iki gitekerezo (Reason for reporting):');
    if (!reason) return;

    try {
      const res = await fetch(`/api/comments/${commentId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        alert('Murakoze. Igitekerezo cyoherejwe kubashinzwe kugenzura (Report submitted).');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Gufungura indirimbo...</p>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-sm font-bold text-slate-700">Indirimbo ntiyabonetse</p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Subira inyuma</span>
        </button>
      </div>
    );
  }

  // Theme styles for lyrics reading
  const themeStyles = {
    light: 'bg-white text-slate-900 border-slate-200',
    dark: 'bg-slate-950 text-slate-100 border-slate-800',
    sepia: 'bg-[#faf6ed] text-[#3d3224] border-[#e6decb]',
  };

  const fontSizeClasses = {
    sm: 'text-sm leading-relaxed',
    md: 'text-base leading-loose',
    lg: 'text-lg leading-loose',
    xl: 'text-xl leading-loose font-medium',
  };

  return (
    <div className="pb-32 space-y-5 max-w-2xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl border border-slate-200 text-xs font-bold transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Inyuma</span>
        </button>

        <div className="flex items-center gap-1.5">
          {/* Offline Download Button */}
          <button
            onClick={handleToggleDownloadOffline}
            disabled={isDownloading}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
              isDownloaded
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title={isDownloaded ? 'Bika offline (Downloaded) - Kanda hano ngo uyikuremo' : 'Bika iyi ndirimbo ngo uyisome niyo waba uri offline'}
          >
            {isDownloading ? (
              <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            ) : isDownloaded ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Download className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="hidden sm:inline">
              {isDownloading ? 'Kubika...' : isDownloaded ? 'Offline' : 'Bika Offline'}
            </span>
          </button>

          <button
            onClick={toggleFavorite}
            className={`p-2 rounded-xl border transition-colors ${
              song.is_favorite
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-white border-slate-200 text-slate-600 hover:text-rose-600'
            }`}
            title="Favorite"
          >
            <Heart className={`w-4 h-4 ${song.is_favorite ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl transition-all active:scale-95 relative text-xs font-bold"
            title="Sangiza abandi iyi ndirimbo (Share Song)"
            aria-label="Share Song"
          >
            {copiedShare ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Sangiza</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Download Toast Notification */}
      {downloadSuccessToast && (
        <div className="bg-emerald-900 text-white px-4 py-2.5 rounded-2xl shadow-lg flex items-center justify-between gap-2 text-xs font-semibold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{downloadSuccessToast}</span>
          </div>
          <button
            onClick={() => setDownloadSuccessToast(null)}
            className="text-emerald-300 hover:text-white text-xs font-bold"
          >
            Sawa
          </button>
        </div>
      )}

      {/* Song Header & Metadata Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {song.category_name && (
            <span className="text-[11px] font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60 uppercase tracking-wide">
              {song.category_name}
            </span>
          )}
          {song.song_number && (
            <span className="px-3 py-1 bg-blue-900 text-amber-300 font-mono font-extrabold text-xs rounded-lg shadow-2xs">
              Indirimbo ya #{song.song_number}
            </span>
          )}
        </div>

        {/* Exact Song Title clearly visible and separate from lyrics */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
            Umutwe w'Indirimbo (Song Title)
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-serif leading-tight">
            {song.title}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Chorale La Lumiere • ADEPR Nyanza
          </p>
        </div>
      </div>

      {/* Audio Tracks Inline Bar (Listen while reading!) */}
      {song.audio_tracks && song.audio_tracks.length > 0 && (
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-3.5 shadow-md border border-blue-900/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-100">
                Umuziki n'Amajwi y'Indirimbo (Audio Tracks)
              </span>
            </div>
            <span className="text-[10px] text-amber-300 font-semibold">
              Umva wiga amagambo (Listen while reading)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {song.audio_tracks.map(track => {
              const isThisTrackPlaying = isPlaying && currentTrack?.id === track.id;
              return (
                <button
                  key={track.id}
                  onClick={() => {
                    if (isThisTrackPlaying) {
                      togglePlay();
                    } else {
                      playTrack(track, song);
                    }
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                    currentTrack?.id === track.id
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700/80 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        currentTrack?.id === track.id ? 'bg-slate-950 text-amber-400' : 'bg-blue-900 text-white'
                      }`}
                    >
                      {isThisTrackPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs truncate">{track.title}</p>
                      <p
                        className={`text-[9px] uppercase tracking-wider ${
                          currentTrack?.id === track.id ? 'text-slate-800' : 'text-slate-400'
                        }`}
                      >
                        {track.track_type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Unreleased Protected Content Lock Screen OR Lyrics Viewer */}
      {song.is_locked ? (
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 text-center border-2 border-amber-500/40 shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <span className="px-3 py-1 bg-amber-400/20 text-amber-300 text-xs font-extrabold uppercase tracking-wider rounded-full border border-amber-400/30">
              Coming Soon • Protected Content
            </span>
            <h3 className="text-lg font-bold text-slate-100 mt-2">
              Iyi ndirimbo ntabwo irasohoka ku mugaragaro
            </h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto mt-1 leading-relaxed">
              Amagambo n'umuziki by'iyi ndirimbo birinzwe kubera imyiteguro ya Korali La Lumiere. Niba uri umuririmbyi wa La Lumiere Choir, andika ijambo ry'ibanga wahawe mu myitozo:
            </p>
          </div>

          <form onSubmit={handleUnlockSong} className="max-w-xs mx-auto space-y-2.5 pt-2">
            <input
              type="password"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              placeholder="Andika ijambo ry'ibanga (Access Password)..."
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-center text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {passwordError && <p className="text-[11px] text-rose-400 font-semibold">{passwordError}</p>}
            <button
              type="submit"
              disabled={isUnlocking}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              <Unlock className="w-4 h-4" />
              <span>{isUnlocking ? 'Kugenzura...' : 'Fungura Indirimbo (Unlock Lyrics)'}</span>
            </button>
          </form>
        </div>
      ) : (
        /* Reading Interface with Controls */
        <div className="space-y-3">
          {/* Reading Toolbar: Font Size + Themes */}
          <div className="flex items-center justify-between bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-2xs">
            {/* Font Size Selector */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Inyuguti:</span>
              {(['sm', 'md', 'lg', 'xl'] as const).map(size => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    fontSize === size
                      ? 'bg-blue-900 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {size === 'sm' ? 'A-' : size === 'md' ? 'A' : size === 'lg' ? 'A+' : 'A++'}
                </button>
              ))}
            </div>

            {/* Theme Mode Selector */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setThemeMode('light')}
                className={`p-1.5 rounded-lg border transition-colors ${
                  themeMode === 'light' ? 'bg-white border-blue-900 text-blue-900 shadow-2xs' : 'text-slate-400'
                }`}
                title="White Mode"
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => setThemeMode('sepia')}
                className={`p-1.5 rounded-lg border transition-colors ${
                  themeMode === 'sepia' ? 'bg-[#f4ecd8] border-amber-800 text-amber-900 shadow-2xs' : 'text-slate-400'
                }`}
                title="Sepia Book Mode"
              >
                <Coffee className="w-4 h-4" />
              </button>
              <button
                onClick={() => setThemeMode('dark')}
                className={`p-1.5 rounded-lg border transition-colors ${
                  themeMode === 'dark' ? 'bg-slate-900 border-slate-700 text-white shadow-2xs' : 'text-slate-400'
                }`}
                title="Dark Mode"
              >
                <Moon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lyrics Content Card */}
          <div
            className={`rounded-3xl p-6 sm:p-8 border shadow-sm transition-colors duration-200 ${
              themeStyles[themeMode]
            }`}
          >
            <div className="border-b pb-3 mb-6 flex items-center justify-between border-current/10">
              <span className="font-mono text-xs uppercase tracking-wider opacity-60">
                Amagambo y'Indirimbo (Lyrics)
              </span>
              <span className="text-xs font-semibold opacity-60">
                La Lumiere Choir
              </span>
            </div>

            {song.lyrics ? (
              <div
                className={`font-serif whitespace-pre-wrap tracking-normal ${fontSizeClasses[fontSize]}`}
              >
                {song.lyrics}
              </div>
            ) : (
              <p className="text-center py-8 text-xs opacity-50 italic">
                Amagambo y'iyi ndirimbo azashyirwaho vuba.
              </p>
            )}

            {song.solfa_notation && (
              <div className="mt-8 pt-6 border-t border-current/10">
                <span className="font-mono text-xs uppercase tracking-wider opacity-60 block mb-2 font-bold">
                  Solfa Notation (Amanota y'Umuziki):
                </span>
                <pre className="font-mono text-xs p-3 rounded-xl bg-black/5 overflow-x-auto whitespace-pre">
                  {song.solfa_notation}
                </pre>
              </div>
            )}

            {/* Bottom Sharing Action inside Lyrics Card */}
            <div className="mt-8 pt-6 border-t border-current/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs opacity-75 font-sans">
                Sangiza abandi iyi ndirimbo ngo bafatanye natwe guhimbaza Imana.
              </p>
              <button
                onClick={handleShare}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
              >
                {copiedShare ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Link Yafashwe (Copied)!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>Sangiza Abandi (Share Song)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Community Comments Section */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-900" />
            <h3 className="font-bold text-sm text-slate-900">
              Ibitekerezo by'Abakunda Korali (Comments & Worship Community)
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">
            {comments.length}
          </span>
        </div>

        {/* Comment Form */}
        {user ? (
          <form onSubmit={handlePostComment} className="space-y-2">
            {replyToId && (
              <div className="flex items-center justify-between bg-blue-50 text-blue-900 text-[11px] px-3 py-1 rounded-lg">
                <span>Gusubiza igitekerezo (Replying to comment)...</span>
                <button onClick={() => setReplyToId(null)} className="font-bold">Hagarika</button>
              </div>
            )}
            <div className="relative">
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Tanga igitekerezo, ubuhamya, cyangwa ishimwe ku ndirimbo..."
                rows={3}
                maxLength={500}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 resize-none shadow-2xs"
              />
              <div className="flex items-center justify-between px-1 mt-1 text-[10px] text-slate-400">
                <span>{commentText.length}/500</span>
                <button
                  type="submit"
                  disabled={isSubmittingComment || !commentText.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold text-xs shadow-xs disabled:opacity-50 transition-all active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Ohereza (Post)</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center space-y-2">
            <p className="text-xs text-slate-600 font-medium">
              Kugira ngo usangize abandi igitekerezo cyangwa ubuhamya, ugomba kwinjira muri konti yawe:
            </p>
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              <span>Injira / Iyandikishe (Sign In to Comment)</span>
            </button>
          </div>
        )}

        {/* Comments Feed */}
        <div className="space-y-3 pt-2">
          {comments.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-400">
              Nta gitekerezo kirajyaho. Ba uwa mbere gutanga igitekerezo!
            </p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="p-3 bg-slate-50/70 border border-slate-100 rounded-2xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-900 text-white font-bold text-[10px] flex items-center justify-center">
                      {c.user_name ? c.user_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">{c.user_name}</span>
                      {c.user_role === 'admin' && (
                        <span className="ml-1 px-1.5 py-0.2 bg-amber-100 text-amber-900 text-[9px] font-bold rounded">
                          Admin
                        </span>
                      )}
                      {c.user_role === 'choir_member' && (
                        <span className="ml-1 px-1.5 py-0.2 bg-blue-100 text-blue-900 text-[9px] font-bold rounded">
                          Choir Member
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-slate-700 leading-relaxed pl-8">{c.content}</p>

                <div className="flex items-center gap-4 pl-8 pt-1 text-[11px] text-slate-500">
                  <button
                    onClick={() => handleLikeComment(c.id)}
                    className="inline-flex items-center gap-1 hover:text-blue-900 transition-colors"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{c.likes_count > 0 ? c.likes_count : 'Kunda'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!user) onOpenAuth();
                      else setReplyToId(c.id);
                    }}
                    className="hover:text-blue-900 transition-colors"
                  >
                    Subiza (Reply)
                  </button>

                  <button
                    onClick={() => handleReportComment(c.id)}
                    className="text-slate-400 hover:text-rose-600 transition-colors ml-auto"
                    title="Report"
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
