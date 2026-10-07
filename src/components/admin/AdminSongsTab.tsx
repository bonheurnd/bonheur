import React, { useState, useMemo, useRef } from 'react';
import { parseResponseSafely } from '../../utils/api';
import { Song, SongCategory } from '../../types';
import {
  Plus,
  Search,
  Music,
  Lock,
  Unlock,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  FileText,
  Upload,
  X,
  AlertCircle,
  RotateCcw,
  BookOpen,
  FileUp,
  Layers,
  Sparkles,
  HelpCircle,
  Archive,
  RefreshCw,
} from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

interface AdminSongsTabProps {
  songs: Song[];
  categories: SongCategory[];
  onRefresh: () => void;
  onSelectSong: (id: string) => void;
  onOpenUploadAudio?: (songId: string) => void;
}

const APPROVED_CATEGORIES = [
  { id: 'cat_agakiza', name: 'AGAKIZA', slug: 'agakiza', desc: "Indirimbo z'Agakiza n'Urukundo rwa Yesu" },
  { id: 'cat_ijuru', name: 'IJURU', slug: 'ijuru', desc: "Indirimbo z'Ijuru, Ubugingo bw'iteka n'Amasezerano" },
  { id: 'cat_gushima', name: 'GUSHIMA', slug: 'gushima', desc: "Indirimbo zo Gushima no Guhimbaza Imana" },
  { id: 'cat_kwizera', name: 'KWIZERA', slug: 'kwizera', desc: "Indirimbo zo Kwizera n'Ubutwari mu Mwami" },
];

export const AdminSongsTab: React.FC<AdminSongsTabProps> = ({
  songs,
  categories,
  onRefresh,
  onSelectSong,
  onOpenUploadAudio,
}) => {
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [releaseFilter, setReleaseFilter] = useState<'all' | 'released' | 'unreleased'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewArchive, setViewArchive] = useState<boolean>(false);

  // Add / Edit Modal State
  const [editingSong, setEditingSong] = useState<Partial<Song> | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Delete Confirm State (Requirement 6)
  const [deleteConfirmSong, setDeleteConfirmSong] = useState<Song | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Restore State
  const [isRestoring, setIsRestoring] = useState(false);

  // Word Document / Text Import Modal State (Requirement 1 & 14)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'file' | 'text'>('file');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    skippedCount: number;
    importedSongs?: Array<{ title: string; song_number: string; category_id: string }>;
    skippedSongs?: Array<{ title: string; song_number: string; reason: string }>;
    message?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // REQUIREMENT 15: ADMIN DASHBOARD METRICS CALCULATION
  const activeSongs = useMemo(() => songs.filter(s => !s.is_deleted), [songs]);
  const deletedSongs = useMemo(() => songs.filter(s => Boolean(s.is_deleted)), [songs]);

  const metrics = useMemo(() => {
    const totalSongs = activeSongs.length;
    const publishedSongs = activeSongs.filter(s => s.status === 'published' || !s.status).length;
    const unpublishedSongs = activeSongs.filter(s => s.status === 'draft').length;

    const songsInAgakiza = activeSongs.filter(
      s => s.category_id === 'cat_agakiza' || s.category_name?.toUpperCase() === 'AGAKIZA'
    ).length;
    const songsInIjuru = activeSongs.filter(
      s => s.category_id === 'cat_ijuru' || s.category_name?.toUpperCase() === 'IJURU'
    ).length;
    const songsInGushima = activeSongs.filter(
      s => s.category_id === 'cat_gushima' || s.category_name?.toUpperCase() === 'GUSHIMA'
    ).length;
    const songsInKwizera = activeSongs.filter(
      s => s.category_id === 'cat_kwizera' || s.category_name?.toUpperCase() === 'KWIZERA'
    ).length;

    return {
      totalSongs,
      publishedSongs,
      unpublishedSongs,
      songsInAgakiza,
      songsInIjuru,
      songsInGushima,
      songsInKwizera,
      deletedCount: deletedSongs.length,
    };
  }, [activeSongs, deletedSongs]);

  // Filtered List
  const displayList = useMemo(() => {
    const sourceList = viewArchive ? deletedSongs : activeSongs;

    return sourceList.filter(s => {
      // Search: by song number, title, lyrics, composer
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNum = (s.song_number || '').toLowerCase().includes(q);
        const matchesTitle = s.title.toLowerCase().includes(q);
        const matchesComposer = (s.composer || '').toLowerCase().includes(q);
        const matchesLyrics = (s.lyrics || '').toLowerCase().includes(q);
        if (!matchesNum && !matchesTitle && !matchesComposer && !matchesLyrics) return false;
      }

      // Status
      if (statusFilter !== 'all') {
        const songStatus = s.status || 'published';
        if (songStatus !== statusFilter) return false;
      }

      // Release
      if (releaseFilter !== 'all') {
        if (s.release_status !== releaseFilter) return false;
      }

      // Category
      if (categoryFilter !== 'all') {
        if (s.category_id !== categoryFilter && s.category_slug !== categoryFilter) return false;
      }

      return true;
    });
  }, [activeSongs, deletedSongs, viewArchive, searchQuery, statusFilter, releaseFilter, categoryFilter]);

  // Open Create Form (Requirement 4)
  const handleOpenCreate = () => {
    setEditingSong({
      song_number: '',
      title: '',
      composer: 'La Lumiere Choir',
      category_id: 'cat_agakiza',
      description: '',
      lyrics: '',
      solfa_notation: '',
      release_status: 'released',
      status: 'published',
      release_date: new Date().toISOString().split('T')[0],
      cover_image_url: '',
    });
    setError('');
  };

  // Open Edit Form (Requirement 5)
  const handleOpenEdit = (song: Song) => {
    setEditingSong({
      ...song,
      category_id: song.category_id || 'cat_agakiza',
      status: song.status || 'published',
      release_status: song.release_status || 'released',
    });
    setError('');
  };

  // Save Song (Add New or Edit Existing)
  const handleSaveSong = async (forcedStatus?: 'published' | 'draft') => {
    if (!editingSong || !editingSong.title?.trim()) {
      setError('Umutwe w\'indirimbo urakenewe (Song title is required)');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      const token = localStorage.getItem('lalumiere_token');

      const isNew = !editingSong.id;
      const url = isNew ? '/api/admin/songs' : `/api/admin/songs/${editingSong.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const payload = {
        ...editingSong,
        title: editingSong.title.trim(),
        song_number: editingSong.song_number ? String(editingSong.song_number).trim() : null,
        status: forcedStatus || editingSong.status || 'published',
        category_id: editingSong.category_id || 'cat_agakiza',
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const { errorMessage } = await parseResponseSafely(res);
      if (!res.ok) {
        throw new Error(errorMessage || 'Habaye ikosa mu kubika indirimbo');
      }

      setSuccessMsg(
        isNew
          ? 'Indirimbo nshya yabitswe neza muri database kandi ihita igaragara mu gitabo!'
          : 'Impinduka zose zabitswe neza muri database kandi zahise zigaragara mu gitabo!'
      );
      setTimeout(() => setSuccessMsg(''), 5000);
      setEditingSong(null);
      setIsPreviewOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Ikibazo cyavutse mu kubika indirimbo');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Publish / Unpublish directly (Requirement 7)
  const handleTogglePublish = async (song: Song) => {
    try {
      const token = localStorage.getItem('lalumiere_token');
      const newStatus = song.status === 'draft' ? 'published' : 'draft';
      const res = await fetch(`/api/admin/songs/${song.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setSuccessMsg(
          newStatus === 'published'
            ? `Indirimbo "${song.title}" yemerewe kurebwa na buri wese (Published)!`
            : `Indirimbo "${song.title}" yahinduwe inyandiko mbanziriza (Unpublished)!`
        );
        setTimeout(() => setSuccessMsg(''), 4000);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Song (Requirement 6) - Soft Delete / Archive
  const handleDeleteSong = async () => {
    if (!deleteConfirmSong) return;
    try {
      setIsDeleting(true);
      const token = localStorage.getItem('lalumiere_token');
      const res = await fetch(`/api/admin/songs/${deleteConfirmSong.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setSuccessMsg(`Indirimbo "${deleteConfirmSong.title}" yashyizwe mu bubiko bwasibwe (Archived)!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setDeleteConfirmSong(null);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Restore Soft-deleted Song
  const handleRestoreSong = async (songId: string, title: string) => {
    try {
      setIsRestoring(true);
      const token = localStorage.getItem('lalumiere_token');
      const res = await fetch(`/api/admin/songs/${songId}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setSuccessMsg(`Indirimbo "${title}" yagaruwe neza mu gitabo cy'indirimbo!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRestoring(false);
    }
  };

  // Cover Image Upload Helper
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Ifoto ntigomba kurenza 10MB');
      return;
    }

    try {
      const token = localStorage.getItem('lalumiere_token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const { data, errorMessage } = await parseResponseSafely<{ url: string }>(res);
      if (res.ok && data?.url) {
        setEditingSong(prev => (prev ? { ...prev, cover_image_url: data.url } : null));
      } else {
        setError(errorMessage || 'Upload failed');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to upload image');
    }
  };

  // Handle Document / Word (.docx) Import Submission (Requirement 1 & 14)
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');
    setImportResult(null);

    if (importMode === 'file' && !importFile) {
      setImportError('Nyamuneka hitamo dosiye ya Word (.docx) cyangwa inyandiko (.txt, .json).');
      return;
    }

    if (importMode === 'text' && !importText.trim()) {
      setImportError('Nyamuneka andika cyangwa ukoporore amagambo y\'indirimbo ziri mu byiciro 4.');
      return;
    }

    try {
      setIsImporting(true);
      const token = localStorage.getItem('lalumiere_token');

      let res: Response;
      if (importMode === 'file' && importFile) {
        const formData = new FormData();
        formData.append('file', importFile);
        res = await fetch('/api/admin/songs/import', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      } else {
        res = await fetch('/api/admin/songs/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: importText }),
        });
      }

      const { data, errorMessage } = await parseResponseSafely<any>(res);
      if (!res.ok) {
        throw new Error(errorMessage || 'Habaye ikosa mu kwinjiza indirimbo');
      }

      setImportResult(data);
      onRefresh();
    } catch (err: any) {
      setImportError(err.message || 'Habaye ikosa mu gutunganya dosiye');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* REQUIREMENT 15: ADMIN DASHBOARD METRICS SUMMARY */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-2xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Songs</p>
          <p className="text-xl font-black text-slate-900 font-mono mt-0.5">{metrics.totalSongs}</p>
          <p className="text-[10px] text-slate-500 font-medium">Mu gitabo cyose</p>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-emerald-200/90 shadow-2xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Published</p>
          <p className="text-xl font-black text-emerald-700 font-mono mt-0.5">{metrics.publishedSongs}</p>
          <p className="text-[10px] text-emerald-600 font-medium">Zigaragara ku bose</p>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-amber-200/90 shadow-2xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">Unpublished</p>
          <p className="text-xl font-black text-amber-700 font-mono mt-0.5">{metrics.unpublishedSongs}</p>
          <p className="text-[10px] text-amber-600 font-medium">Mbanziriza (Draft)</p>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-rose-200/90 shadow-2xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600">AGAKIZA</p>
          <p className="text-xl font-black text-rose-700 font-mono mt-0.5">{metrics.songsInAgakiza}</p>
          <p className="text-[10px] text-rose-600 font-medium">Icyiciro cya 1</p>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-sky-200/90 shadow-2xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600">IJURU</p>
          <p className="text-xl font-black text-sky-700 font-mono mt-0.5">{metrics.songsInIjuru}</p>
          <p className="text-[10px] text-sky-600 font-medium">Icyiciro cya 2</p>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-amber-200/90 shadow-2xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">GUSHIMA</p>
          <p className="text-xl font-black text-amber-700 font-mono mt-0.5">{metrics.songsInGushima}</p>
          <p className="text-[10px] text-amber-600 font-medium">Icyiciro cya 3</p>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-emerald-200/90 shadow-2xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">KWIZERA</p>
          <p className="text-xl font-black text-emerald-700 font-mono mt-0.5">{metrics.songsInKwizera}</p>
          <p className="text-[10px] text-emerald-600 font-medium">Icyiciro cya 4</p>
        </div>
      </div>

      {/* Main Control Panel: Title, Action Buttons, Search & Filter Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              <span>Admin Panel</span>
              <span>→</span>
              <span className="text-blue-900 font-extrabold">Song Management</span>
            </div>
            <h2 className="text-base font-black text-slate-900 font-serif flex items-center gap-2">
              <Music className="w-5 h-5 text-blue-900" />
              <span>Song Management (Gucunga Indirimbo)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Uburyo busesuye bwo kwinjiza, guhindura, no gukwirakwiza indirimbo za Korali La Lumiere
            </p>
          </div>

          {/* Action Buttons: Add Song & Import Word Document (.docx) */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setImportResult(null);
                setImportError('');
                setImportFile(null);
                setImportText('');
                setIsImportModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-transform active:scale-95 cursor-pointer"
              title="Injiza indirimbo ziri muri Word document (.docx)"
            >
              <FileUp className="w-4 h-4 text-emerald-200" />
              <span>Injiza Dosiye (Import .docx)</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Ongera Indirimbo Nshya (Add Song)</span>
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {/* Search Input, Status Filter & Release Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Shakisha nimero y'indirimbo, umutwe, amagambo..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter (Published / Draft) */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900"
          >
            <option value="all">Imimerere yose (All Status)</option>
            <option value="published">Byemejwe (Published)</option>
            <option value="draft">Inyandiko mbanziriza (Draft / Unpublished)</option>
          </select>

          {/* Archive / Active Toggle */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setViewArchive(!viewArchive)}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                viewArchive
                  ? 'bg-rose-50 text-rose-800 border-rose-300 font-extrabold'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{viewArchive ? 'Subira ku zikora' : `Izasibwe (${metrics.deletedCount})`}</span>
            </button>
          </div>
        </div>

        {/* 4 Approved Categories Filter Pills (Requirement 2) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-colors ${
              categoryFilter === 'all'
                ? 'bg-blue-950 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ibyiciro byose ({viewArchive ? deletedSongs.length : activeSongs.length})
          </button>

          {APPROVED_CATEGORIES.map(c => {
            const count = (viewArchive ? deletedSongs : activeSongs).filter(
              s => s.category_id === c.id || s.category_name?.toUpperCase() === c.name
            ).length;
            const isSelected = categoryFilter === c.id || categoryFilter === c.slug;

            return (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(c.id)}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-950 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{c.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${
                    isSelected ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Song List Cards / Table */}
      <div className="space-y-2">
        {displayList.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center text-xs text-slate-400 border border-slate-200/80 space-y-2">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-600">Nta ndirimbo ibonetse</p>
            <p>Ntacyo twabonye gihura n'ibyo ushakishije mu byiciro cyangwa ijambo ryinjijwe.</p>
          </div>
        ) : (
          displayList.map(song => {
            const isDraft = song.status === 'draft';
            const isUnreleased = song.release_status === 'unreleased';
            const isDeleted = Boolean(song.is_deleted);
            const audioCount = song.audio_tracks?.length || song.audio_count || 0;

            return (
              <div
                key={song.id}
                className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-900/40 transition-colors"
              >
                {/* Left: Song Number Badge, Title, Category Badge & Details */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  {/* Song Number Box */}
                  <div className="w-11 h-11 rounded-xl bg-blue-950 text-amber-300 font-mono font-extrabold text-xs flex flex-col items-center justify-center shrink-0 shadow-2xs">
                    <span className="text-[8px] uppercase tracking-wider text-blue-200 font-sans font-bold">No</span>
                    <span>{song.song_number || '-'}</span>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        onClick={() => onSelectSong(song.id)}
                        className="font-extrabold text-xs sm:text-sm text-slate-900 hover:text-blue-900 cursor-pointer truncate max-w-sm font-serif"
                        title={song.title}
                      >
                        {song.title}
                      </h3>

                      {/* Category Badge */}
                      {song.category_name && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-950 font-bold text-[10px] rounded-md border border-blue-200">
                          {song.category_name}
                        </span>
                      )}

                      {/* Publishing Status Badge (Requirement 7) */}
                      {isDraft ? (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 font-bold text-[10px] rounded-md border border-amber-200">
                          Unpublished (Draft)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold text-[10px] rounded-md border border-emerald-200">
                          Published
                        </span>
                      )}

                      {isDeleted && (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-800 font-bold text-[10px] rounded-md border border-rose-200">
                          Archived (Deleted)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                      <span>{song.composer || 'La Lumiere Choir'}</span>
                      {song.lyrics && (
                        <>
                          <span>•</span>
                          <span className="text-slate-600 font-medium">Amagambo arimo</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-600 font-semibold">
                        <Music className="w-3 h-3 text-blue-900" />
                        <span>{audioCount} audio</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Quick Admin Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 flex-wrap">
                  {!isDeleted ? (
                    <>
                      {/* Publish / Unpublish Toggle Button (Requirement 7) */}
                      <button
                        onClick={() => handleTogglePublish(song)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                          isDraft
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                        title={isDraft ? 'Emeza indirimbo igaragare (Publish)' : 'Hisha indirimbo ibe draft (Unpublish)'}
                      >
                        {isDraft ? 'Publish' : 'Unpublish'}
                      </button>

                      {/* Preview Song */}
                      <button
                        onClick={() => onSelectSong(song.id)}
                        className="p-1.5 text-slate-500 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Reba uko igaragara (View / Preview)"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Edit Song (Requirement 5) */}
                      <button
                        onClick={() => handleOpenEdit(song)}
                        className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="Hindura amakuru yose (Edit Song)"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete Song (Requirement 6) */}
                      <button
                        onClick={() => setDeleteConfirmSong(song)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Siba indirimbo (Delete / Archive)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    /* Restore Action for Soft-Deleted Songs */
                    <button
                      onClick={() => handleRestoreSong(song.id, song.title)}
                      disabled={isRestoring}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Garura (Restore)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* REQUIREMENT 4 & 5: ADD / EDIT SONG MODAL FORM                             */}
      {/* ========================================================================= */}
      {editingSong && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center">
                  <Music className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 font-serif">
                  {editingSong.id ? 'Vugurura Indirimbo (Edit Song)' : 'Ongera Indirimbo Nshya (Add New Song)'}
                </h3>
              </div>
              <button
                onClick={() => setEditingSong(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              {/* Row 1: Song Number & Song Title (Crucial: Requirement 4 & 5) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nimero y'Indirimbo (Song Number) *
                  </label>
                  <input
                    type="text"
                    value={editingSong.song_number || ''}
                    onChange={e => setEditingSong({ ...editingSong, song_number: e.target.value })}
                    placeholder="Urugero: 1, 14, 25..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Nimero mu gitabo cy'indirimbo</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Umutwe w'Indirimbo (Song Title) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingSong.title || ''}
                    onChange={e => setEditingSong({ ...editingSong, title: e.target.value })}
                    placeholder="Urugero: URUKUNDO"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 uppercase"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Umutwe w'indirimbo mu Kinyarwanda</p>
                </div>
              </div>

              {/* Row 2: Category (Requirement 2 & 4: Selectable from the 4 Approved Categories) & Composer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Icyiciro cy'Indirimbo (Category) *
                  </label>
                  <select
                    value={editingSong.category_id || 'cat_agakiza'}
                    onChange={e => setEditingSong({ ...editingSong, category_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                  >
                    {APPROVED_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.desc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Umwanditsi / Abaririmbyi (Composer)
                  </label>
                  <input
                    type="text"
                    value={editingSong.composer || ''}
                    onChange={e => setEditingSong({ ...editingSong, composer: e.target.value })}
                    placeholder="La Lumiere Choir"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              {/* Row 3: Publishing Status (Requirement 7: Published vs Unpublished) */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <label className="block font-bold text-slate-900">
                  Kugaragara ku Bakoresha Porogaramu (Publishing Status) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      editingSong.status === 'published'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="song_publish_status"
                      checked={editingSong.status === 'published'}
                      onChange={() => setEditingSong({ ...editingSong, status: 'published' })}
                    />
                    <div>
                      <p className="text-xs font-bold text-emerald-900">Bona buri wese (Published)</p>
                      <p className="text-[10px] text-slate-500">Abantu bose bazayibona mu gitabo cy'indirimbo</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      editingSong.status === 'draft'
                        ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="song_publish_status"
                      checked={editingSong.status === 'draft'}
                      onChange={() => setEditingSong({ ...editingSong, status: 'draft' })}
                    />
                    <div>
                      <p className="text-xs font-bold text-amber-900">Inyandiko mbanziriza (Unpublished)</p>
                      <p className="text-[10px] text-slate-500">Igaragara muri Admin gusa, abasanzwe ntibayibona</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Row 4: Complete Lyrics (Requirement 4 & 5) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Amagambo Yose y'Indirimbo (Complete Lyrics) *
                </label>
                <textarea
                  rows={8}
                  value={editingSong.lyrics || ''}
                  onChange={e => setEditingSong({ ...editingSong, lyrics: e.target.value })}
                  placeholder="Injiza amagambo yose y'indirimbo hano mu Kinyarwanda cy'umwimerere..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 text-xs font-mono leading-relaxed"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Bika amagambo yose uko yanditswe (ibitero, inyikurizo R/, n'ibindi)
                </p>
              </div>

              {/* Optional: Description & Solfa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ubusobanuro cyangwa Ubutumwa (Description)
                  </label>
                  <input
                    type="text"
                    value={editingSong.description || ''}
                    onChange={e => setEditingSong({ ...editingSong, description: e.target.value })}
                    placeholder="Amagambo make asobanura indirimbo..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ifoto y'Indirimbo (Cover Image URL / Upload)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingSong.cover_image_url || ''}
                      onChange={e => setEditingSong({ ...editingSong, cover_image_url: e.target.value })}
                      placeholder="https://... cyangwa kanda Hitamo"
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                    <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Hitamo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCoverUpload}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Buttons (Requirement 4: SAVE SONG, Requirement 5: SAVE CHANGES) */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Reba mbere (Preview)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSong(null)}
                  disabled={isSaving}
                  className="px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Reka (Cancel)
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveSong(editingSong.id ? undefined : 'published')}
                  className="px-5 py-2.5 bg-blue-950 hover:bg-blue-900 text-white rounded-xl font-extrabold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Kubika muri Database...</span>
                    </>
                  ) : editingSong.id ? (
                    <span>SAVE CHANGES (Bika Impinduka)</span>
                  ) : (
                    <span>SAVE SONG (Bika Indirimbo)</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REQUIREMENT 1 & 14: IMPORT MODAL (WORD .DOCX, TEXT, JSON)                 */}
      {/* ========================================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                  <FileUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 font-serif">
                    Injiza Indirimbo muri Database (Import Songs)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Shyiramo dosiye ya Word (.docx) nka LA_LUMIERE_INDIRIMBO_14_MUBYICIRO_4.docx cyangwa inyandiko
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {importError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{importError}</span>
              </div>
            )}

            {/* Success Results Banner */}
            {importResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span>Kwinjiza byagenze neza!</span>
                </div>
                <p className="font-medium">{importResult.message}</p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200 text-[11px]">
                  <div>
                    <span className="text-emerald-700 font-bold">Indirimbo nshya zongewemo: </span>
                    <span className="font-mono font-black">{importResult.importedCount}</span>
                  </div>
                  <div>
                    <span className="text-emerald-700 font-bold">Izasimbutswe (zisanzwemo): </span>
                    <span className="font-mono font-black">{importResult.skippedCount}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Import Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setImportMode('file')}
                className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  importMode === 'file' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Dosiye ya Word / File (.docx, .txt)
              </button>
              <button
                type="button"
                onClick={() => setImportMode('text')}
                className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  importMode === 'text' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                2. Andika cyangwa Koporora (Paste Text)
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              {importMode === 'file' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Hitamo dosiye ya Word (.docx) cyangwa Inyandiko (.txt, .json):
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/60"
                  >
                    <FileUp className="w-8 h-8 text-emerald-700 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-800">
                      {importFile ? importFile.name : 'Kanda hano cyangwa shyiramo dosiye ya Word (.docx)'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {importFile
                        ? `${(importFile.size / 1024).toFixed(1)} KB`
                        : 'Yemera: LA_LUMIERE_INDIRIMBO_14_MUBYICIRO_4.docx, .txt, .json'}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx,.txt,.json"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files?.[0]) setImportFile(e.target.files[0]);
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Koporora amagambo y'indirimbo ziri mu byiciro 4 (AGAKIZA, IJURU, GUSHIMA, KWIZERA):
                  </label>
                  <textarea
                    rows={8}
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    placeholder={`Category 1. AGAKIZA\n1. URUKUNDO\n1. Dore urukundo...\n\nCategory 2. IJURU\n1. TURI ABAGENZI...`}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono leading-relaxed text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              )}

              {/* Explanation of Category Verification */}
              <div className="bg-blue-50/70 border border-blue-200/80 p-3 rounded-xl text-[11px] text-blue-900 space-y-1">
                <p className="font-bold flex items-center gap-1 text-blue-950">
                  <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                  <span>Amabwiriza yo Kwinjiza (Import Safety Rules):</span>
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-700 text-[10px]">
                  <li>Sisitemu irategura indirimbo mu byiciro 4 byemewe: AGAKIZA, IJURU, GUSHIMA, KWIZERA.</li>
                  <li>Indirimbo zisanzwe mu gitabo NTIZISIBWA cyangwa ngo zihindurwe (Safe import).</li>
                  <li>Nimero y'indirimbo, umutwe, n'amagambo byose bibikwa nk'uko byakiriwe neza.</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Funga
                </button>

                <button
                  type="submit"
                  disabled={isImporting}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Gusesengura & Kubika...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>INJIZA MURI DATABASE (IMPORT SONGS)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LIVE PREVIEW MODAL                                                        */}
      {/* ========================================================================= */}
      {isPreviewOpen && editingSong && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-extrabold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-blue-900" />
                <span>Uko Izaboneka mu Gitabo (Preview)</span>
              </span>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-blue-950 text-amber-300 font-mono font-extrabold text-xs rounded-lg">
                  No {editingSong.song_number || '1'}
                </span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-900 font-bold text-[10px] rounded-md">
                  {APPROVED_CATEGORIES.find(c => c.id === editingSong.category_id)?.name || 'AGAKIZA'}
                </span>
              </div>

              <h2 className="text-lg font-black text-slate-900 font-serif">
                {editingSong.title || 'Umutwe w\'Indirimbo'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {editingSong.composer || 'La Lumiere Choir'}
              </p>
            </div>

            {editingSong.lyrics ? (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto text-slate-800">
                {editingSong.lyrics}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Nta magambo yashyizwemo</p>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 bg-blue-950 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Funga Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REQUIREMENT 6: DELETE CONFIRMATION DIALOG                                 */}
      {/* ========================================================================= */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmSong)}
        title="Gusiba iyi ndirimbo?"
        message={`Are you sure you want to delete this song? Uremeza ko ushaka gusiba indirimbo "${deleteConfirmSong?.title}"? Izashyirwa mu bubiko bw'izabitswe (soft-delete archive), kandi ishobora kugarurwa igihe cyose.`}
        confirmText="Yego, Siba (Delete)"
        cancelText="Reka (Cancel)"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteSong}
        onCancel={() => setDeleteConfirmSong(null)}
      />
    </div>
  );
};
