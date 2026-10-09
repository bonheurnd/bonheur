import React, { useState, useMemo } from 'react';
import { Song, SongCategory } from '../types';
import { safeFetchJson } from '../utils/api';
import {
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  Search,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  RotateCcw,
  Sparkles,
  Archive,
  BarChart2,
} from 'lucide-react';
import { ConfirmDialog } from './admin/ConfirmDialog';

export interface AdminSongManagementProps {
  songs: Song[];
  categories: SongCategory[];
  onRefresh: () => void;
  onSelectSong?: (songId: string) => void;
  onOpenUploadAudio?: (songId: string) => void;
}

export type SongManagementTab = 'add' | 'edit' | 'delete' | 'overview';

interface SongFormData {
  title: string;
  song_number: string;
  composer: string;
  category_id: string;
  release_status: 'released' | 'unreleased';
  status: 'published' | 'draft';
  release_date: string;
  description: string;
  language: string;
  lyrics: string;
  solfa_notation: string;
}

const DEFAULT_FORM_DATA: SongFormData = {
  title: '',
  song_number: '',
  composer: 'La Lumiere Choir',
  category_id: 'cat_agakiza',
  release_status: 'released',
  status: 'published',
  release_date: new Date().toISOString().split('T')[0],
  description: '',
  language: 'Kinyarwanda',
  lyrics: '',
  solfa_notation: '',
};

interface FormValidationResult {
  isValid: boolean;
  errors: Partial<Record<keyof SongFormData, string>>;
  missingFields: string[];
}

const validateSongFormData = (form: SongFormData): FormValidationResult => {
  const errors: Partial<Record<keyof SongFormData, string>> = {};
  const missingFields: string[] = [];

  if (!form.title.trim()) {
    errors.title = "Umutwe w'indirimbo urakenewe (Title is required)";
    missingFields.push("Umutwe w'indirimbo (Title)");
  }

  if (!form.category_id.trim()) {
    errors.category_id = "Icyiciro cy'indirimbo kigomba guhitwamo (Category is required)";
    missingFields.push("Icyiciro (Category)");
  }

  if (!form.lyrics.trim()) {
    errors.lyrics = "Amagambo y'indirimbo arakenewe (Lyrics are required)";
    missingFields.push("Amagambo y'indirimbo (Lyrics)");
  }

  // Metadata field validations
  if (!form.song_number.trim()) {
    errors.song_number = "Nimero y'indirimbo irakenewe (Song number is required)";
    missingFields.push("Nimero (Song #)");
  }

  if (!form.composer.trim()) {
    errors.composer = "Uwahimbye indirimbo akenewe (Composer is required)";
    missingFields.push("Uwahimbye (Composer)");
  }

  if (!form.description.trim()) {
    errors.description = "Ibisobanuro by'indirimbo birakenewe (Description is required)";
    missingFields.push("Ibisobanuro (Description)");
  }

  if (!form.language.trim()) {
    errors.language = "Ururimi rw'indirimbo rugomba kugaragazwa (Language is required)";
    missingFields.push("Ururimi (Language)");
  }

  if (!form.release_date.trim()) {
    errors.release_date = "Itariki yo gusohoka irakenewe (Release date is required)";
    missingFields.push("Itariki yo gusohoka (Release Date)");
  }

  if (!form.status) {
    errors.status = "Uko ifashwe (Status) kugomba guhitwamo";
    missingFields.push("Status");
  }

  if (!form.release_status) {
    errors.release_status = "Isomwa (Release status) rigomba guhitwamo";
    missingFields.push("Release Status");
  }

  return {
    isValid: missingFields.length === 0,
    errors,
    missingFields,
  };
};

const DEFAULT_CATEGORIES: SongCategory[] = [
  { id: 'cat_agakiza', name: 'AGAKIZA', slug: 'agakiza', description: "Indirimbo z'Agakiza n'Urukundo rwa Yesu", display_order: 1 },
  { id: 'cat_ijuru', name: 'IJURU', slug: 'ijuru', description: "Indirimbo z'Ijuru, Ubugingo bw'iteka n'Amasezerano", display_order: 2 },
  { id: 'cat_gushima', name: 'GUSHIMA', slug: 'gushima', description: "Indirimbo zo Gushima no Guhimbaza Imana", display_order: 3 },
  { id: 'cat_kwizera', name: 'KWIZERA', slug: 'kwizera', description: "Indirimbo zo Kwizera n'Ubutwari mu Mwami", display_order: 4 },
];

export const AdminSongManagement: React.FC<AdminSongManagementProps> = ({
  songs,
  categories,
  onRefresh,
  onSelectSong,
  onOpenUploadAudio,
}) => {
  // Tab state: 'add' | 'edit' | 'delete' | 'overview'
  const [activeTab, setActiveTab] = useState<SongManagementTab>('overview');

  // Add Form State
  const [addForm, setAddForm] = useState<SongFormData>(DEFAULT_FORM_DATA);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [addValidationErrors, setAddValidationErrors] = useState<Partial<Record<keyof SongFormData, string>>>({});

  // Edit Tab State
  const [selectedSongForEdit, setSelectedSongForEdit] = useState<Song | null>(null);
  const [editForm, setEditForm] = useState<SongFormData>(DEFAULT_FORM_DATA);
  const [editSearch, setEditSearch] = useState('');
  const [editCategoryFilter, setEditCategoryFilter] = useState('all');
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [editValidationErrors, setEditValidationErrors] = useState<Partial<Record<keyof SongFormData, string>>>({});

  // Delete Tab State
  const [deleteSearch, setDeleteSearch] = useState('');
  const [deleteCategoryFilter, setDeleteCategoryFilter] = useState('all');
  const [deleteModalSong, setDeleteModalSong] = useState<Song | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Available categories with fallback
  const resolvedCategories: SongCategory[] = useMemo(() => {
    if (categories && categories.length > 0) return categories;
    return DEFAULT_CATEGORIES;
  }, [categories]);

  // Songs overview metrics per category
  const categoryStats = useMemo(() => {
    return resolvedCategories.map(cat => {
      const catSongs = songs.filter(s => {
        if (s.is_deleted) return false;
        if (s.category_id === cat.id) return true;
        const normCat = (s.category_name || '').toUpperCase().trim();
        const normTarget = cat.name.toUpperCase().trim();
        return normCat.includes(normTarget) || normTarget.includes(normCat);
      });

      const published = catSongs.filter(s => s.status !== 'draft').length;
      const draft = catSongs.filter(s => s.status === 'draft').length;
      const released = catSongs.filter(s => s.release_status === 'released').length;

      return {
        ...cat,
        total: catSongs.length,
        published,
        draft,
        released,
      };
    });
  }, [resolvedCategories, songs]);

  const activeSongsCount = useMemo(() => songs.filter(s => !s.is_deleted).length, [songs]);
  const deletedSongsCount = useMemo(() => songs.filter(s => s.is_deleted).length, [songs]);
  const publishedCount = useMemo(() => songs.filter(s => !s.is_deleted && s.status !== 'draft').length, [songs]);
  const draftsCount = useMemo(() => songs.filter(s => !s.is_deleted && s.status === 'draft').length, [songs]);

  // ----------------------------------------------------
  // SUB-COMPONENT: ADD NEW SONG HANDLERS
  // ----------------------------------------------------
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');

    // Comprehensive validation ensuring all fields are present before submission
    const validation = validateSongFormData(addForm);
    if (!validation.isValid) {
      setAddValidationErrors(validation.errors);
      setAddError(`Uzuza imyanya yose isabwa mbere yo kubika: ${validation.missingFields.join(', ')}.`);
      return;
    }
    setAddValidationErrors({});

    try {
      setIsAdding(true);
      const token = localStorage.getItem('token') || '';
      const response = await safeFetchJson<Song>('/api/admin/songs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(addForm),
      });

      if (!response.ok) {
        throw new Error(response.errorMessage || 'Ntibyashobotse kwandika indirimbo.');
      }

      setAddSuccess(`Indirimbo "${response.data?.title || addForm.title}" yongewemo neza!`);
      setAddForm(DEFAULT_FORM_DATA);
      setAddValidationErrors({});
      onRefresh();
    } catch (err: any) {
      setAddError(err.message || 'Habaye ikosa mu kongeramo indirimbo.');
    } finally {
      setIsAdding(false);
    }
  };

  // ----------------------------------------------------
  // SUB-COMPONENT: EDIT SONG HANDLERS
  // ----------------------------------------------------
  const handleSelectSongForEdit = (song: Song) => {
    setSelectedSongForEdit(song);
    setEditError('');
    setEditSuccess('');
    setEditValidationErrors({});
    setEditForm({
      title: song.title || '',
      song_number: song.song_number || '',
      composer: song.composer || 'La Lumiere Choir',
      category_id: song.category_id || 'cat_agakiza',
      release_status: song.release_status || 'released',
      status: song.status || 'published',
      release_date: song.release_date || new Date().toISOString().split('T')[0],
      description: song.description || `Indirimbo y'ubutumwa bwiza ya ${song.composer || 'La Lumiere Choir'}.`,
      language: song.language || 'Kinyarwanda',
      lyrics: song.lyrics || '',
      solfa_notation: song.solfa_notation || '',
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSongForEdit) return;

    setEditError('');
    setEditSuccess('');

    // Comprehensive validation ensuring all fields are present before submission
    const validation = validateSongFormData(editForm);
    if (!validation.isValid) {
      setEditValidationErrors(validation.errors);
      setEditError(`Uzuza imyanya yose isabwa mbere yo kuvugurura: ${validation.missingFields.join(', ')}.`);
      return;
    }
    setEditValidationErrors({});

    try {
      setIsUpdating(true);
      const token = localStorage.getItem('token') || '';
      const response = await safeFetchJson<Song>(`/api/admin/songs/${selectedSongForEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error(response.errorMessage || 'Ntibyashobotse kuvugurura indirimbo.');
      }

      setEditSuccess(`Indirimbo "${editForm.title}" yavuguruwe neza!`);
      setEditValidationErrors({});
      onRefresh();
      setSelectedSongForEdit(prev => (prev ? { ...prev, ...editForm } : null));
    } catch (err: any) {
      setEditError(err.message || 'Habaye ikosa mu kuvugurura.');
    } finally {
      setIsUpdating(false);
    }
  };

  // ----------------------------------------------------
  // SUB-COMPONENT: DELETE SONG HANDLERS
  // ----------------------------------------------------
  const handleExecuteDelete = async (permanent: boolean) => {
    if (!deleteModalSong) return;

    try {
      setIsDeleting(true);
      const token = localStorage.getItem('token') || '';
      const endpoint = permanent
        ? `/api/admin/songs/${deleteModalSong.id}?permanent=true`
        : `/api/admin/songs/${deleteModalSong.id}`;

      const response = await safeFetchJson<{ success: boolean; message: string }>(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(response.errorMessage || 'Ntibyashobotse gusiba indirimbo.');
      }

      setDeleteFeedback({
        type: 'success',
        msg: permanent
          ? `Indirimbo "${deleteModalSong.title}" yasibwe burundu (Permanently deleted).`
          : `Indirimbo "${deleteModalSong.title}" yashyizwe mu bubiko bwasibwe (Soft deleted).`,
      });
      setDeleteModalSong(null);
      onRefresh();
    } catch (err: any) {
      setDeleteFeedback({
        type: 'error',
        msg: err.message || 'Gusiba indirimbo byanze.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreSong = async (songId: string, title: string) => {
    try {
      setIsRestoring(true);
      const token = localStorage.getItem('token') || '';
      const response = await safeFetchJson<{ success: boolean; message: string }>(
        `/api/admin/songs/${songId}/restore`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!response.ok) {
        throw new Error(response.errorMessage || 'Kugarura indirimbo byanze.');
      }

      setDeleteFeedback({
        type: 'success',
        msg: `Indirimbo "${title}" yagaruwe neza mu muzingo w'izikora!`,
      });
      onRefresh();
    } catch (err: any) {
      setDeleteFeedback({
        type: 'error',
        msg: err.message || 'Kugarura indirimbo byanze.',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Filter lists
  const editSongList = useMemo(() => {
    return songs.filter(s => {
      if (s.is_deleted) return false;
      const matchesSearch =
        (s.title || '').toLowerCase().includes(editSearch.toLowerCase()) ||
        (s.composer || '').toLowerCase().includes(editSearch.toLowerCase()) ||
        (s.song_number || '').includes(editSearch);
      const matchesCat = editCategoryFilter === 'all' || s.category_id === editCategoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [songs, editSearch, editCategoryFilter]);

  const deleteSongList = useMemo(() => {
    return songs.filter(s => {
      const matchesSearch =
        (s.title || '').toLowerCase().includes(deleteSearch.toLowerCase()) ||
        (s.composer || '').toLowerCase().includes(deleteSearch.toLowerCase()) ||
        (s.song_number || '').includes(deleteSearch);
      const matchesCat = deleteCategoryFilter === 'all' || s.category_id === deleteCategoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [songs, deleteSearch, deleteCategoryFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-900 border border-blue-200">
              <BookOpen className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight font-serif">
              Song Management (Gucunga Indirimbo)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Injiza, vugurura, siba cyangwa usuzume imbonerahamwe y'indirimbo zose z'Amatsinda na Korali La Lumiere.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl flex-wrap">
          <button
            onClick={() => setActiveTab('overview')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-blue-950 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Incamake (Overview)</span>
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'add'
                ? 'bg-blue-950 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ongeraho (Add New Song)</span>
          </button>

          <button
            onClick={() => setActiveTab('edit')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'edit'
                ? 'bg-blue-950 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Vugurura (Edit Song)</span>
          </button>

          <button
            onClick={() => setActiveTab('delete')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'delete'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Siba / Garura (Delete Song)</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 1. OVERVIEW DASHBOARD TAB */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Zose hamwe (Total)
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">{activeSongsCount}</p>
              <span className="text-[11px] text-emerald-600 font-medium">Mu bubiko buriho</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Zasohotse (Published)
              </span>
              <p className="text-2xl font-black text-blue-950 mt-1">{publishedCount}</p>
              <span className="text-[11px] text-slate-500 font-medium">Zigaragara ku rubuga</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Inyandiko (Drafts)
              </span>
              <p className="text-2xl font-black text-amber-600 mt-1">{draftsCount}</p>
              <span className="text-[11px] text-amber-600/80 font-medium">Zitarashyirwa hanze</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Izishyinguwe (Archived)
              </span>
              <p className="text-2xl font-black text-rose-600 mt-1">{deletedSongsCount}</p>
              <span className="text-[11px] text-rose-600/80 font-medium">Zasibwe mu mutwe</span>
            </div>
          </div>

          {/* Category Breakdown Cards */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Ibyiciro by'Indirimbo (Song Categories Breakdown)
                </h3>
                <p className="text-xs text-slate-500">
                  Ingano y'indirimbo zibitse muri buri cyiciro cya Korali La Lumiere.
                </p>
              </div>
              <button
                onClick={onRefresh}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Vugurura</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categoryStats.map(cat => (
                <div
                  key={cat.id}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 hover:border-blue-200 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-950 font-black text-[11px] tracking-wide uppercase">
                      {cat.name}
                    </span>
                    <span className="text-xl font-black text-slate-900">{cat.total}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 h-8">
                    {cat.description || "Indirimbo z'iki cyiciro"}
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600">
                    <span>Published: <b>{cat.published}</b></span>
                    <span>Drafts: <b>{cat.draft}</b></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Callout */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Ukeneye kongeramo indirimbo nshya?</span>
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                Kanda buto yo kongeramo indirimbo nshya kugira ngo wandike amagambo n'amateka yayo mu buryo bworoshye.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('add')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Ongeraho Indirimbo Nshya</span>
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. SUB-COMPONENT: ADD NEW SONG TAB */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'add' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-serif">
                <Plus className="w-5 h-5 text-blue-950" />
                <span>Kwandika Indirimbo Nshya (Add New Song)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Uzuza ibisobanuro n'amagambo y'indirimbo (Lyrics). Iyi ndirimbo izahita yinjizwa mu bubiko bwa SQLite.
              </p>
            </div>

            {addError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{addError}</span>
              </div>
            )}

            {addSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{addSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-6">
              {/* SECTION 1: TITLE & CATEGORY */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-200">
                  <BookOpen className="w-4 h-4 text-blue-900" />
                  <span>1. Umutwe n'Icyiciro (Title & Category)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Umutwe w'Indirimbo (Title) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={addForm.title}
                      onChange={e => {
                        setAddForm({ ...addForm, title: e.target.value });
                        if (addValidationErrors.title) {
                          setAddValidationErrors(prev => ({ ...prev, title: undefined }));
                        }
                      }}
                      placeholder="Urugero: NGWINO TUJYANE"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 focus:outline-none font-medium transition-colors ${
                        addValidationErrors.title
                          ? 'border-rose-400 bg-rose-50/30 focus:border-rose-600 focus:ring-1 focus:ring-rose-200'
                          : 'border-slate-300 focus:border-blue-900 focus:ring-1 focus:ring-blue-900'
                      }`}
                    />
                    {addValidationErrors.title && (
                      <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{addValidationErrors.title}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Icyiciro (Category) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={addForm.category_id}
                      onChange={e => {
                        setAddForm({ ...addForm, category_id: e.target.value });
                        if (addValidationErrors.category_id) {
                          setAddValidationErrors(prev => ({ ...prev, category_id: undefined }));
                        }
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 focus:outline-none font-medium bg-white transition-colors ${
                        addValidationErrors.category_id
                          ? 'border-rose-400 bg-rose-50/30 focus:border-rose-600'
                          : 'border-slate-300 focus:border-blue-900 focus:ring-1 focus:ring-blue-900'
                      }`}
                    >
                      {resolvedCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({cat.slug})
                        </option>
                      ))}
                    </select>
                    {addValidationErrors.category_id && (
                      <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{addValidationErrors.category_id}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: METADATA */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-200">
                  <Sparkles className="w-4 h-4 text-blue-900" />
                  <span>2. Amakuru y'Inyongera (Song Metadata)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nimero (Song #) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={addForm.song_number}
                      onChange={e => {
                        setAddForm({ ...addForm, song_number: e.target.value });
                        if (addValidationErrors.song_number) {
                          setAddValidationErrors(prev => ({ ...prev, song_number: undefined }));
                        }
                      }}
                      placeholder="Urugero: 01"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 focus:outline-none font-medium transition-colors ${
                        addValidationErrors.song_number
                          ? 'border-rose-400 bg-rose-50/30 focus:border-rose-600'
                          : 'border-slate-300 focus:border-blue-900'
                      }`}
                    />
                    {addValidationErrors.song_number && (
                      <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{addValidationErrors.song_number}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Uwahimbye (Composer) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={addForm.composer}
                      onChange={e => {
                        setAddForm({ ...addForm, composer: e.target.value });
                        if (addValidationErrors.composer) {
                          setAddValidationErrors(prev => ({ ...prev, composer: undefined }));
                        }
                      }}
                      placeholder="La Lumiere Choir"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 focus:outline-none font-medium transition-colors ${
                        addValidationErrors.composer
                          ? 'border-rose-400 bg-rose-50/30 focus:border-rose-600'
                          : 'border-slate-300 focus:border-blue-900'
                      }`}
                    />
                    {addValidationErrors.composer && (
                      <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{addValidationErrors.composer}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ururimi (Language) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={addForm.language}
                      onChange={e => {
                        setAddForm({ ...addForm, language: e.target.value });
                        if (addValidationErrors.language) {
                          setAddValidationErrors(prev => ({ ...prev, language: undefined }));
                        }
                      }}
                      placeholder="Kinyarwanda"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 focus:outline-none font-medium transition-colors ${
                        addValidationErrors.language
                          ? 'border-rose-400 bg-rose-50/30 focus:border-rose-600'
                          : 'border-slate-300 focus:border-blue-900'
                      }`}
                    />
                    {addValidationErrors.language && (
                      <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{addValidationErrors.language}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Itariki (Release Date) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={addForm.release_date}
                      onChange={e => {
                        setAddForm({ ...addForm, release_date: e.target.value });
                        if (addValidationErrors.release_date) {
                          setAddValidationErrors(prev => ({ ...prev, release_date: undefined }));
                        }
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 focus:outline-none font-medium bg-white transition-colors ${
                        addValidationErrors.release_date
                          ? 'border-rose-400 bg-rose-50/30 focus:border-rose-600'
                          : 'border-slate-300 focus:border-blue-900'
                      }`}
                    />
                    {addValidationErrors.release_date && (
                      <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{addValidationErrors.release_date}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Uko ifashwe (Status) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={addForm.status}
                      onChange={e => setAddForm({ ...addForm, status: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-900 bg-white"
                    >
                      <option value="published">Published (Irakora / Iboneka hose)</option>
                      <option value="draft">Draft (Inyandiko y'agateganyo)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Isomwa / Itangazwa (Release) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={addForm.release_status}
                      onChange={e => setAddForm({ ...addForm, release_status: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-900 bg-white"
                    >
                      <option value="released">Released (Yarasohotse)</option>
                      <option value="unreleased">Unreleased (Itegerejwe)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ibisobanuro by'Indirimbo (Description / Summary) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addForm.description}
                    onChange={e => {
                      setAddForm({ ...addForm, description: e.target.value });
                      if (addValidationErrors.description) {
                        setAddValidationErrors(prev => ({ ...prev, description: undefined }));
                      }
                    }}
                    placeholder="Urugero: Indirimbo yo guhimbaza no gushima Imana kubw'urukundo rwayo..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 focus:outline-none font-medium transition-colors ${
                      addValidationErrors.description
                        ? 'border-rose-400 bg-rose-50/30 focus:border-rose-600'
                        : 'border-slate-300 focus:border-blue-900'
                    }`}
                  />
                  {addValidationErrors.description && (
                    <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{addValidationErrors.description}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Solfa Notation (Notes za Muzika - Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={addForm.solfa_notation}
                    onChange={e => setAddForm({ ...addForm, solfa_notation: e.target.value })}
                    placeholder="d : r : m | f : s : l : d'..."
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-900"
                  />
                </div>
              </div>

              {/* SECTION 3: LYRICS */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-200">
                  <Edit2 className="w-4 h-4 text-blue-900" />
                  <span>3. Amagambo y'Indirimbo (Lyrics)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Amagambo y'Indirimbo (Lyrics) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={8}
                    value={addForm.lyrics}
                    onChange={e => {
                      setAddForm({ ...addForm, lyrics: e.target.value });
                      if (addValidationErrors.lyrics) {
                        setAddValidationErrors(prev => ({ ...prev, lyrics: undefined }));
                      }
                    }}
                    placeholder={`1. Ngwino tujyane iwacu aho Imana yateguriye abera...\n\nR/ Uwo yatubereye igitambo...`}
                    className={`w-full p-3 rounded-xl border text-xs font-mono text-slate-900 focus:outline-none transition-colors ${
                      addValidationErrors.lyrics
                        ? 'border-rose-400 bg-rose-50/30 focus:border-rose-600 focus:ring-1 focus:ring-rose-200'
                        : 'border-slate-300 focus:border-blue-900 focus:ring-1 focus:ring-blue-900'
                    }`}
                  />
                  {addValidationErrors.lyrics && (
                    <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{addValidationErrors.lyrics}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAddForm(DEFAULT_FORM_DATA);
                    setAddValidationErrors({});
                    setAddError('');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  Gusiba Byose (Clear)
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-950 hover:bg-blue-900 text-xs font-bold text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isAdding ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Bikomeje kubikwa...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Bika Indirimbo (Save Song)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. SUB-COMPONENT: EDIT SONG TAB */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'edit' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Song selector list (Left col) */}
          <div className="md:col-span-5 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Hitamo Indirimbo yo Kuvugurura</h4>
            
            {/* Search & Category Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={editSearch}
                  onChange={e => setEditSearch(e.target.value)}
                  placeholder="Shakisha izina cyangwa composer..."
                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-900"
                />
              </div>

              <select
                value={editCategoryFilter}
                onChange={e => setEditCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-blue-900"
              >
                <option value="all">Ibyiciro byose (All Categories)</option>
                {resolvedCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* List */}
            <div className="max-h-[500px] overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
              {editSongList.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">Nta ndirimbo ibonetse.</p>
              ) : (
                editSongList.map(s => {
                  const isSelected = selectedSongForEdit?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSongForEdit(s)}
                      className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer flex items-center justify-between border ${
                        isSelected
                          ? 'bg-blue-950 text-white border-blue-950 shadow-xs'
                          : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/60 text-slate-800'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          {s.song_number && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                              #{s.song_number}
                            </span>
                          )}
                          <p className="text-xs font-bold truncate">{s.title}</p>
                        </div>
                        <p className={`text-[11px] truncate mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                          {s.category_name || s.category_slug || 'Agakiza'} • {s.composer || 'La Lumiere'}
                        </p>
                      </div>
                      <Edit2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Edit Form (Right col) */}
          <div className="md:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs">
            {selectedSongForEdit ? (
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Guhindura: <span className="text-blue-950">{selectedSongForEdit.title}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">ID: {selectedSongForEdit.id}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-900 text-[10px] font-bold uppercase">
                    Editing
                  </span>
                </div>

                {editError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{editError}</span>
                  </div>
                )}

                {editSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{editSuccess}</span>
                  </div>
                )}

                {/* SECTION 1: TITLE & CATEGORY */}
                <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider pb-1 border-b border-slate-200">
                    <BookOpen className="w-3.5 h-3.5 text-blue-900" />
                    <span>1. Umutwe n'Icyiciro (Title & Category)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Umutwe w'Indirimbo (Title) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={e => {
                          setEditForm({ ...editForm, title: e.target.value });
                          if (editValidationErrors.title) {
                            setEditValidationErrors(prev => ({ ...prev, title: undefined }));
                          }
                        }}
                        className={`w-full px-3 py-2 text-xs border rounded-xl font-medium focus:outline-none transition-colors ${
                          editValidationErrors.title
                            ? 'border-rose-400 bg-rose-50/30 focus:border-rose-600'
                            : 'border-slate-300 focus:border-blue-900'
                        }`}
                      />
                      {editValidationErrors.title && (
                        <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{editValidationErrors.title}</span>
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Icyiciro (Category) <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={editForm.category_id}
                        onChange={e => {
                          setEditForm({ ...editForm, category_id: e.target.value });
                          if (editValidationErrors.category_id) {
                            setEditValidationErrors(prev => ({ ...prev, category_id: undefined }));
                          }
                        }}
                        className={`w-full px-3 py-2 text-xs border rounded-xl bg-white focus:outline-none font-medium transition-colors ${
                          editValidationErrors.category_id
                            ? 'border-rose-400 bg-rose-50/30 focus:border-rose-600'
                            : 'border-slate-300 focus:border-blue-900'
                        }`}
                      >
                        {resolvedCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name} ({cat.slug})
                          </option>
                        ))}
                      </select>
                      {editValidationErrors.category_id && (
                        <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{editValidationErrors.category_id}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* SECTION 2: METADATA */}
                <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider pb-1 border-b border-slate-200">
                    <Sparkles className="w-3.5 h-3.5 text-blue-900" />
                    <span>2. Amakuru y'Inyongera (Song Metadata)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nimero (Song #) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.song_number}
                        onChange={e => {
                          setEditForm({ ...editForm, song_number: e.target.value });
                          if (editValidationErrors.song_number) {
                            setEditValidationErrors(prev => ({ ...prev, song_number: undefined }));
                          }
                        }}
                        className={`w-full px-3 py-2 text-xs border rounded-xl font-medium focus:outline-none transition-colors ${
                          editValidationErrors.song_number
                            ? 'border-rose-400 bg-rose-50/30 focus:border-rose-600'
                            : 'border-slate-300 focus:border-blue-900'
                        }`}
                      />
                      {editValidationErrors.song_number && (
                        <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{editValidationErrors.song_number}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Uwahimbye (Composer) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.composer}
                        onChange={e => {
                          setEditForm({ ...editForm, composer: e.target.value });
                          if (editValidationErrors.composer) {
                            setEditValidationErrors(prev => ({ ...prev, composer: undefined }));
                          }
                        }}
                        className={`w-full px-3 py-2 text-xs border rounded-xl font-medium focus:outline-none transition-colors ${
                          editValidationErrors.composer
                            ? 'border-rose-400 bg-rose-50/30 focus:border-rose-600'
                            : 'border-slate-300 focus:border-blue-900'
                        }`}
                      />
                      {editValidationErrors.composer && (
                        <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{editValidationErrors.composer}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Ururimi (Language) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.language}
                        onChange={e => {
                          setEditForm({ ...editForm, language: e.target.value });
                          if (editValidationErrors.language) {
                            setEditValidationErrors(prev => ({ ...prev, language: undefined }));
                          }
                        }}
                        className={`w-full px-3 py-2 text-xs border rounded-xl font-medium focus:outline-none transition-colors ${
                          editValidationErrors.language
                            ? 'border-rose-400 bg-rose-50/30 focus:border-rose-600'
                            : 'border-slate-300 focus:border-blue-900'
                        }`}
                      />
                      {editValidationErrors.language && (
                        <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{editValidationErrors.language}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Itariki (Release Date) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={editForm.release_date}
                        onChange={e => {
                          setEditForm({ ...editForm, release_date: e.target.value });
                          if (editValidationErrors.release_date) {
                            setEditValidationErrors(prev => ({ ...prev, release_date: undefined }));
                          }
                        }}
                        className={`w-full px-3 py-2 text-xs border rounded-xl bg-white focus:outline-none transition-colors ${
                          editValidationErrors.release_date
                            ? 'border-rose-400 bg-rose-50/30 focus:border-rose-600'
                            : 'border-slate-300 focus:border-blue-900'
                        }`}
                      />
                      {editValidationErrors.release_date && (
                        <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{editValidationErrors.release_date}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Status <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={editForm.status}
                        onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:border-blue-900"
                      >
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Release Status <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={editForm.release_status}
                        onChange={e => setEditForm({ ...editForm, release_status: e.target.value as any })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:border-blue-900"
                      >
                        <option value="released">Released</option>
                        <option value="unreleased">Unreleased</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ibisobanuro by'Indirimbo (Description / Summary) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.description}
                      onChange={e => {
                        setEditForm({ ...editForm, description: e.target.value });
                        if (editValidationErrors.description) {
                          setEditValidationErrors(prev => ({ ...prev, description: undefined }));
                        }
                      }}
                      placeholder="Ibisobanuro by'indirimbo..."
                      className={`w-full px-3 py-2 text-xs border rounded-xl font-medium focus:outline-none transition-colors ${
                        editValidationErrors.description
                          ? 'border-rose-400 bg-rose-50/30 focus:border-rose-600'
                          : 'border-slate-300 focus:border-blue-900'
                      }`}
                    />
                    {editValidationErrors.description && (
                      <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{editValidationErrors.description}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Solfa Notation (Notes za Muzika - Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={editForm.solfa_notation}
                      onChange={e => setEditForm({ ...editForm, solfa_notation: e.target.value })}
                      placeholder="d : r : m | f : s : l : d'..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:border-blue-900"
                    />
                  </div>
                </div>

                {/* SECTION 3: LYRICS */}
                <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider pb-1 border-b border-slate-200">
                    <Edit2 className="w-3.5 h-3.5 text-blue-900" />
                    <span>3. Amagambo y'Indirimbo (Lyrics)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Amagambo y'Indirimbo (Lyrics) <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={8}
                      value={editForm.lyrics}
                      onChange={e => {
                        setEditForm({ ...editForm, lyrics: e.target.value });
                        if (editValidationErrors.lyrics) {
                          setEditValidationErrors(prev => ({ ...prev, lyrics: undefined }));
                        }
                      }}
                      className={`w-full p-3 rounded-xl border text-xs font-mono focus:outline-none transition-colors ${
                        editValidationErrors.lyrics
                          ? 'border-rose-400 bg-rose-50/30 focus:border-rose-600'
                          : 'border-slate-300 focus:border-blue-900'
                      }`}
                    />
                    {editValidationErrors.lyrics && (
                      <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{editValidationErrors.lyrics}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  {onSelectSong && (
                    <button
                      type="button"
                      onClick={() => onSelectSong(selectedSongForEdit.id)}
                      className="text-xs text-blue-950 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Reba ku rubuga (View in Public App)</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-950 hover:bg-blue-900 text-xs font-bold text-white transition-colors cursor-pointer disabled:opacity-50 ml-auto"
                  >
                    {isUpdating ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                        <span>Bikomeje...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Vugurura Indirimbo (Save Changes)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Edit2 className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs font-semibold">Hitamo indirimbo mu rutonde rw'ibumoso kugira ngo uyivugurure.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. SUB-COMPONENT: DELETE SONG TAB */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'delete' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-bold text-rose-950 flex items-center gap-2 font-serif">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <span>Gusiba cyangwa Kugarura Indirimbo (Delete / Restore)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Gusiba indirimbo binyuzwa mu buryo bubiri: <b>Soft Delete</b> (Ishyirwa mu bubiko butagaragara ku rubuga) cyangwa <b>Permanent Delete</b> (Ihanagurwa burundu muri database hamwe n'ibitekerezo byayo).
            </p>
          </div>

          {deleteFeedback && (
            <div
              className={`p-4 rounded-2xl text-xs flex items-center justify-between border ${
                deleteFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {deleteFeedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{deleteFeedback.msg}</span>
              </div>
              <button
                onClick={() => setDeleteFeedback(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={deleteSearch}
                onChange={e => setDeleteSearch(e.target.value)}
                placeholder="Shakisha indirimbo yo gusiba cyangwa kugarura..."
                className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-rose-600 focus:outline-none"
              />
            </div>
            <select
              value={deleteCategoryFilter}
              onChange={e => setDeleteCategoryFilter(e.target.value)}
              className="px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:border-rose-600"
            >
              <option value="all">Ibyiciro byose</option>
              {resolvedCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Table / List */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Indirimbo</th>
                  <th className="py-3 px-4">Icyiciro</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Igikorwa (Action)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deleteSongList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      Nta ndirimbo ibonetse.
                    </td>
                  </tr>
                ) : (
                  deleteSongList.map(song => {
                    const isSoftDeleted = Boolean(song.is_deleted);
                    return (
                      <tr key={song.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{song.title}</p>
                          <p className="text-[11px] text-slate-500">{song.composer || 'La Lumiere'}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            {song.category_name || song.category_slug || 'General'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {isSoftDeleted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold">
                              <Archive className="w-3 h-3" />
                              Yarasibwe (Deleted)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              <CheckCircle className="w-3 h-3" />
                              Irakora (Active)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {isSoftDeleted ? (
                              <>
                                <button
                                  onClick={() => handleRestoreSong(song.id, song.title)}
                                  disabled={isRestoring}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Garura</span>
                                </button>
                                <button
                                  onClick={() => setDeleteModalSong(song)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-[11px] font-bold transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Siba Burundu</span>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setDeleteModalSong(song)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Siba</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteModalSong && (
        <ConfirmDialog
          isOpen={Boolean(deleteModalSong)}
          title={`Gusiba Indirimbo: "${deleteModalSong.title}"`}
          message={
            deleteModalSong.is_deleted
              ? `Iyi ndirimbo irasibwa burundu mu bubiko bwose (Permanent Delete). Ibi ntibizashobora kugarurwa!`
              : `Wemeje ko ushaka gusiba iyi ndirimbo? Izafatwa nka 'Soft Deleted' kandi ushobora kuyigarura igihe icyo aricyo cyose.`
          }
          confirmText={deleteModalSong.is_deleted ? 'Siba Burundu' : 'Siba (Soft Delete)'}
          cancelText="Reka (Cancel)"
          isDestructive={true}
          isLoading={isDeleting}
          onConfirm={() => handleExecuteDelete(Boolean(deleteModalSong.is_deleted))}
          onCancel={() => setDeleteModalSong(null)}
        />
      )}
    </div>
  );
};
