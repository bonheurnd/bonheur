import React, { useState, useEffect } from 'react';
import { SocialMediaLink } from '../../types';
import { safeFetchJson } from '../../utils/api';
import {
  Share2,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Save,
  Globe,
  ArrowUpDown,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

export const AdminSocialMediaTab: React.FC = () => {
  const [links, setLinks] = useState<SocialMediaLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    platform: 'youtube',
    display_name: '',
    url: '',
    icon: 'youtube',
    is_enabled: true,
    display_order: 1,
    description: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const showNotification = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccessMessage(msg);
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(msg);
      setSuccessMessage(null);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const loadLinks = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('lalumiere_token');
      const res = await safeFetchJson<SocialMediaLink[]>('/api/admin/social-media', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok && res.data) {
        setLinks(res.data);
      }
    } catch (err: any) {
      showNotification('error', 'Failed to load social media links');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      platform: 'youtube',
      display_name: 'YouTube Channel',
      url: 'https://youtube.com/@',
      icon: 'youtube',
      is_enabled: true,
      display_order: (links.length > 0 ? Math.max(...links.map(l => l.display_order)) + 1 : 1),
      description: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (link: SocialMediaLink) => {
    setIsEditing(true);
    setEditingId(link.id);
    setFormData({
      platform: link.platform,
      display_name: link.display_name,
      url: link.url,
      icon: link.icon || link.platform,
      is_enabled: Boolean(link.is_enabled),
      display_order: link.display_order,
      description: link.description || '',
    });
    setIsModalOpen(true);
  };

  const handlePlatformChange = (newPlatform: string) => {
    let defaultName = formData.display_name;
    let defaultUrl = formData.url;

    if (!isEditing || !defaultName) {
      switch (newPlatform) {
        case 'youtube':
          defaultName = 'YouTube Channel';
          defaultUrl = 'https://www.youtube.com/@';
          break;
        case 'whatsapp':
          defaultName = 'WhatsApp Community';
          defaultUrl = 'https://chat.whatsapp.com/';
          break;
        case 'instagram':
          defaultName = 'Instagram Profile';
          defaultUrl = 'https://www.instagram.com/';
          break;
        case 'facebook':
          defaultName = 'Facebook Page';
          defaultUrl = 'https://www.facebook.com/';
          break;
        case 'tiktok':
          defaultName = 'TikTok Profile';
          defaultUrl = 'https://www.tiktok.com/@';
          break;
        case 'twitter':
          defaultName = 'X (Twitter)';
          defaultUrl = 'https://x.com/';
          break;
        case 'website':
          defaultName = 'Official Website';
          defaultUrl = 'https://www.lalumierechoir.rw';
          break;
        default:
          defaultName = 'Social Platform';
      }
    }

    setFormData(prev => ({
      ...prev,
      platform: newPlatform,
      icon: newPlatform,
      display_name: defaultName,
      url: defaultUrl,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.display_name.trim() || !formData.url.trim()) {
      showNotification('error', 'Shyiramo izina n\'umurongo wa URL (Name and URL are required)');
      return;
    }

    // Validate URL syntax
    try {
      const parsed = new URL(formData.url.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        showNotification('error', 'URL igomba gutangizwa na https:// cyangwa http:// (Please enter a valid HTTP or HTTPS URL)');
        return;
      }
    } catch {
      showNotification('error', 'URL wanditse ntabwo yemewe. Urugero: https://youtube.com/...');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('lalumiere_token');
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      if (isEditing && editingId) {
        const res = await safeFetchJson(`/api/admin/social-media/${editingId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          throw new Error(res.errorMessage || 'Failed to update link');
        }
        showNotification('success', 'Urutonde rwa mbere rwavuguruwe neza (Social link updated)');
      } else {
        const res = await safeFetchJson('/api/admin/social-media', {
          method: 'POST',
          headers,
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          throw new Error(res.errorMessage || 'Failed to create link');
        }
        showNotification('success', 'Urubuga rushya rwongerewe neza (New social link added)');
      }

      setIsModalOpen(false);
      await loadLinks();
    } catch (err: any) {
      showNotification('error', err.message || 'Habaye ikibazo mu kubika');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleEnable = async (link: SocialMediaLink) => {
    try {
      const token = localStorage.getItem('lalumiere_token');
      const updatedStatus = !link.is_enabled;
      const res = await safeFetchJson(`/api/admin/social-media/${link.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_enabled: updatedStatus }),
      });

      if (res.ok) {
        setLinks(prev =>
          prev.map(l => (l.id === link.id ? { ...l, is_enabled: updatedStatus ? 1 : 0 } : l))
        );
        showNotification(
          'success',
          updatedStatus
            ? `${link.display_name} yashyizwe ku mbuga zigaragara (Enabled)`
            : `${link.display_name} yahagaritswe kugaragara (Disabled)`
        );
      }
    } catch {
      showNotification('error', 'Kunanirwa guhindura imiterere');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Wizera neza ko ushaka gusiba "${name}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('lalumiere_token');
      const res = await safeFetchJson(`/api/admin/social-media/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setLinks(prev => prev.filter(l => l.id !== id));
        showNotification('success', `"${name}" yasibwe neza.`);
      } else {
        throw new Error(res.errorMessage || 'Failed to delete');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Gusiba byanze.');
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= links.length) return;

    const newLinks = [...links];
    const currentItem = newLinks[index];
    const targetItem = newLinks[targetIndex];

    // Swap positions
    newLinks[index] = targetItem;
    newLinks[targetIndex] = currentItem;

    // Recalculate display_order (1-indexed)
    const reorderedPayload = newLinks.map((item, idx) => ({
      id: item.id,
      display_order: idx + 1,
    }));

    // Optimistically update UI
    setLinks(newLinks.map((item, idx) => ({ ...item, display_order: idx + 1 })));

    try {
      const token = localStorage.getItem('lalumiere_token');
      const res = await safeFetchJson<{ success: boolean; links: SocialMediaLink[] }>('/api/admin/social-media/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items: reorderedPayload }),
      });

      if (res.ok && res.data && res.data.links) {
        setLinks(res.data.links);
        showNotification('success', 'Urutonde rwahinduwe neza (Order updated successfully)');
      }
    } catch (err: any) {
      showNotification('error', 'Kunanirwa guhindura urutonde');
      loadLinks(); // rollback
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-base text-slate-900 font-serif">
              Gucunga Imbuga Nkoranyambaga (Social Media Management)
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-950 text-[10px] font-extrabold uppercase">
              {links.length} Platforms
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Ongeraho, hindura cyangwa hagarika imbuga nkoranyambaga zigaragara kuri porogaramu ya rubanda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadLinks}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Vugurura</span>
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-950 hover:bg-blue-900 text-amber-300 rounded-xl text-xs font-extrabold transition-transform active:scale-95 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>Ongeraho Urubuga (Add Platform)</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Social Links Table */}
      {isLoading ? (
        <div className="py-12 text-center space-y-2">
          <div className="w-7 h-7 border-3 border-blue-950 border-t-amber-400 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Gupakira imbuga nkoranyambaga...</p>
        </div>
      ) : links.length === 0 ? (
        <div className="py-10 px-4 text-center rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
            <Share2 className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-700">Nta mbuga nkoranyambaga zirashyirwaho</p>
          <p className="text-[11px] text-slate-400">
            Kanda "Ongeraho Urubuga" hejuru kugira ngo ushyireho paji ya mbere.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200/80 rounded-2xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono text-[10px]">
                <th className="py-2.5 px-3">Order</th>
                <th className="py-2.5 px-3">Platform</th>
                <th className="py-2.5 px-3">Display Name</th>
                <th className="py-2.5 px-3">URL Link</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {links.map((link, index) => {
                const isEnabled = Boolean(link.is_enabled);
                const isFirst = index === 0;
                const isLast = index === links.length - 1;
                return (
                  <tr key={link.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-700 min-w-[24px]">
                          #{link.display_order}
                        </span>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(index, 'up')}
                            disabled={isFirst}
                            className="p-0.5 text-slate-400 hover:text-blue-900 disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer"
                            title="Zamura hejuru (Move up)"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(index, 'down')}
                            disabled={isLast}
                            className="p-0.5 text-slate-400 hover:text-blue-900 disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer"
                            title="Manura hasi (Move down)"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 text-blue-950 font-bold uppercase text-[10px]">
                        {link.platform}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-extrabold text-slate-900">
                      {link.display_name}
                      {link.description && (
                        <span className="block font-normal text-[10px] text-slate-400 truncate max-w-[200px]">
                          {link.description}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 max-w-[240px] truncate">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-900 hover:underline inline-flex items-center gap-1"
                        title={link.url}
                      >
                        <span className="truncate">{link.url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => handleToggleEnable(link)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold cursor-pointer transition-all ${
                          isEnabled
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                        title="Kanda hano uhindure niba igaragara"
                      >
                        {isEnabled ? (
                          <>
                            <Eye className="w-3 h-3 text-emerald-700" />
                            <span>Kugaragara (Active)</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3 text-slate-400" />
                            <span>Yahagaritswe (Hidden)</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(link)}
                          className="p-1.5 hover:bg-blue-50 text-blue-900 rounded-lg transition-colors cursor-pointer"
                          title="Hindura amakuru"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(link.id, link.display_name)}
                          className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors cursor-pointer"
                          title="Siba urubuga"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-950 text-amber-300 flex items-center justify-center font-bold text-xs">
                  <Share2 className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {isEditing ? 'Hindura Urubuga Nkoranyambaga' : 'Ongeraho Urubuga Rushya'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Manage official choir social media channel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Hitamo Urubuga (Platform):
                </label>
                <select
                  value={formData.platform}
                  onChange={e => handlePlatformChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold cursor-pointer"
                >
                  <option value="youtube">YouTube (Official Channel)</option>
                  <option value="facebook">Facebook (Page)</option>
                  <option value="instagram">Instagram (@lalumierechoir)</option>
                  <option value="tiktok">TikTok (Short clips)</option>
                  <option value="whatsapp">WhatsApp (Community / Invite Link)</option>
                  <option value="twitter">X / Twitter</option>
                  <option value="website">Official Choir Website</option>
                  <option value="other">Other Platform (Urubuga Rundiri)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Izina Rigaragara (Display Name):
                </label>
                <input
                  type="text"
                  required
                  value={formData.display_name}
                  onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Urugero: YouTube Channel, Instagram..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Umurongo wa URL (Official Link):
                </label>
                <input
                  type="url"
                  required
                  value={formData.url}
                  onChange={e => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Ugomba kwandika URL yuzuye itangizwa na https:// (Valid HTTPS URL required)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Urutonde (Display Order):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={formData.display_order}
                    onChange={e =>
                      setFormData({ ...formData, display_order: parseInt(e.target.value) || 1 })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Imiterere (Status):
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer mt-0.5">
                    <input
                      type="checkbox"
                      checked={formData.is_enabled}
                      onChange={e => setFormData({ ...formData, is_enabled: e.target.checked })}
                      className="rounded text-blue-900 focus:ring-blue-900 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-bold text-slate-800 text-xs">
                      Bika nk'Icyemewe (Enabled)
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Ibisobanuro Bigufi (Short Description - Optional):
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Urugero: Reba indirimbo nshya n'amashusho yose..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Reka (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-950 hover:bg-blue-900 text-amber-300 text-xs font-extrabold rounded-xl transition-transform active:scale-95 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Birabikwa...' : 'Bika Urubuga (Save Changes)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
