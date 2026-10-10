import React, { useState, useMemo } from 'react';
import { parseResponseSafely } from '../../utils/api';
import { UserProfile, UserRole } from '../../types';
import {
  Users,
  Search,
  Shield,
  UserCheck,
  UserX,
  Key,
  Edit2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  X,
  Download,
  BarChart3,
  Activity,
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { AdminMemberStats } from './AdminMemberStats';
import { AdminMemberActivityLog } from './AdminMemberActivityLog';

interface AdminUsersTabProps {
  users: UserProfile[];
  onRefresh: () => void;
  currentUserRole?: UserRole;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  onRefresh,
  currentUserRole,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');

  // Bulk Selection & Removal State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkActionModal, setBulkActionModal] = useState<{
    isOpen: boolean;
    action: 'disable' | 'delete';
    count: number;
  } | null>(null);
  const [bulkReason, setBulkReason] = useState('');
  const [isExecutingBulkAction, setIsExecutingBulkAction] = useState(false);

  // Edit Role modal
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('member');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Reset Password modal
  const [passwordResetUser, setPasswordResetUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Toggle status state
  const [toggleStatusUser, setToggleStatusUser] = useState<UserProfile | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Sub-navigation view inside Member Management
  const [subView, setSubView] = useState<'members' | 'stats' | 'activity'>('members');

  // Alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (u.full_name || '').toLowerCase().includes(q);
        const matchesEmail = (u.email || '').toLowerCase().includes(q);
        const matchesPhone = (u.phone || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone) return false;
      }

      if (roleFilter !== 'all') {
        if (u.role !== roleFilter) return false;
      }

      if (statusFilter !== 'all') {
        const isActive = u.is_disabled !== 1;
        if (statusFilter === 'active' && !isActive) return false;
        if (statusFilter === 'disabled' && isActive) return false;
      }

      return true;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Export filtered member list to CSV file using production server-side export endpoint
  const handleDownloadCsv = async () => {
    try {
      const token = localStorage.getItem('lalumiere_token') || '';
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/admin/export/members?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Export failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filenameDate = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `la-lumiere-members-${filenameDate}.csv`);
      document.body.appendChild(link);
      link.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  };

  // Update Role
  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setIsUpdatingRole(true);
      setErrorMsg('');
      const token = localStorage.getItem('lalumiere_token');

      const res = await fetch(`/api/admin/users/${editingUser.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      const { errorMessage } = await parseResponseSafely(res);
      if (!res.ok) throw new Error(errorMessage || 'Failed to update role');

      setSuccessMsg(`Inshingano za ${editingUser.full_name} zahinduwe kuri ${selectedRole}`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setEditingUser(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Guhindura inshingano byanze');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Toggle Enable / Disable
  const handleToggleStatus = async () => {
    if (!toggleStatusUser) return;
    try {
      setIsTogglingStatus(true);
      const token = localStorage.getItem('lalumiere_token');
      const shouldDisable = toggleStatusUser.is_disabled !== 1;

      const res = await fetch(`/api/admin/users/${toggleStatusUser.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_disabled: shouldDisable }),
      });

      const { errorMessage } = await parseResponseSafely(res);
      if (!res.ok) throw new Error(errorMessage || 'Failed to update user status');

      setToggleStatusUser(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Guhagarika/Gufungura byanze');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetUser || !newPassword) return;

    if (newPassword.length < 6) {
      setErrorMsg('Ijambobanga rigomba kugira byibuze inyuguti 6');
      return;
    }

    try {
      setIsResettingPassword(true);
      setErrorMsg('');
      const token = localStorage.getItem('lalumiere_token');

      const res = await fetch(`/api/admin/users/${passwordResetUser.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ new_password: newPassword }),
      });

      const { errorMessage } = await parseResponseSafely(res);
      if (!res.ok) throw new Error(errorMessage || 'Failed to reset password');

      setSuccessMsg(`Ijambobanga rya ${passwordResetUser.full_name} ryahinduwe neza!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setPasswordResetUser(null);
      setNewPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Guhindura ijambobanga byanze');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    }
  };

  const handleExecuteBulkAction = async () => {
    if (!bulkActionModal || selectedUserIds.length === 0) return;
    try {
      setIsExecutingBulkAction(true);
      const token = localStorage.getItem('lalumiere_token');
      const res = await fetch('/api/admin/users/bulk-remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userIds: selectedUserIds,
          action: bulkActionModal.action,
          reason: bulkReason || 'Bulk administrative removal from directory',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk action failed');

      setSuccessMsg(data.message || `Abanyamuryango ${selectedUserIds.length} bakozweho neza!`);
      setTimeout(() => setSuccessMsg(''), 4500);
      setSelectedUserIds([]);
      setBulkActionModal(null);
      setBulkReason('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Habaye ikosa mu gukora iki gikorwa');
    } finally {
      setIsExecutingBulkAction(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header & Search */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 font-serif flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-900" />
              <span>Gucunga Abakoresha n'Abanyamuryango (Member Management & Directory)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Guhindura inshingano (Roles), guhagarika kwinjira, gusohora raporo ya CSV, no gukurikirana ibikorwa
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              title="Download CSV"
              aria-label="Download CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV ({filteredUsers.length})</span>
            </button>

            <button
              onClick={onRefresh}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
              title="Vugurura"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-view Navigation inside Member Directory */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => setSubView('members')}
            className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              subView === 'members' ? 'bg-white text-blue-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-900" />
            <span>Urutonde rw'Abanyamuryango ({filteredUsers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('stats')}
            className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              subView === 'stats' ? 'bg-white text-blue-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-700" />
            <span>Imibare n'Ibishushanyo (Statistics)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('activity')}
            className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              subView === 'activity' ? 'bg-white text-blue-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-700" />
            <span>Ibikorwa 10 Biheruka (Activity Log)</span>
          </button>
        </div>

        {/* Alerts */}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Filters (only visible when viewing members list) */}
        {subView === 'members' && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Shakisha umunyamuryango ukoresheje izina cyangwa imeyili..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>

            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900"
            >
              <option value="all">Inshingano zose ({users.length})</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="content_admin">Content Admin</option>
              <option value="moderator">Moderator</option>
              <option value="member">Choir Member</option>
              <option value="supporter">Supporter</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900"
            >
              <option value="all">Imimerere yose</option>
              <option value="active">Abafite uburenganzira (Active)</option>
              <option value="disabled">Abahagaritswe (Disabled)</option>
            </select>
          </div>
        )}
      </div>

      {/* Render Sub-View Component */}
      {subView === 'stats' && <AdminMemberStats />}
      {subView === 'activity' && <AdminMemberActivityLog />}

      {/* Users List (Only when subView === 'members') */}
      {subView === 'members' && (
      <div className="space-y-2">
        {/* Bulk Action Bar when users are selected */}
        {selectedUserIds.length > 0 && (
          <div className="bg-slate-900 text-white rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg border border-slate-700 animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">
                {selectedUserIds.length}
              </span>
              <span className="text-xs font-bold text-slate-100">
                Abanyamuryango batoranyijwe (Selected Users)
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setBulkActionModal({ isOpen: true, action: 'disable', count: selectedUserIds.length })}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Hagarika Bose (Bulk Disable)</span>
              </button>

              <button
                type="button"
                onClick={() => setBulkActionModal({ isOpen: true, action: 'delete', count: selectedUserIds.length })}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Siba Burundu (Bulk Delete)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedUserIds([])}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Reka Byose
              </button>
            </div>
          </div>
        )}

        {/* Select All Checkbox Header */}
        {filteredUsers.length > 0 && (
          <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-500 font-semibold bg-white/60 rounded-xl border border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded text-blue-900 border-slate-300 focus:ring-blue-900 cursor-pointer"
              />
              <span>
                {selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0
                  ? 'Kureka Byose (Deselect All)'
                  : `Hitamo Bose (${filteredUsers.length} Members)`}
              </span>
            </label>
            {selectedUserIds.length > 0 && (
              <span className="text-[11px] text-amber-700 font-bold">
                {selectedUserIds.length} muri {filteredUsers.length} batoranyijwe
              </span>
            )}
          </div>
        )}

        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center text-xs text-slate-400 border border-slate-200/80">
            Nta mukoresha ubonywe uhuye n'ibyo ushakishije
          </div>
        ) : (
          filteredUsers.map(u => {
            const isDisabled = u.is_disabled === 1;
            const isSelected = selectedUserIds.includes(u.id);
            const isAdmin = ['super_admin', 'admin', 'content_admin', 'moderator'].includes(
              u.role
            );

            return (
              <div
                key={u.id}
                className={`bg-white rounded-2xl p-4 border transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isSelected ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/10' : 'border-slate-200/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Row Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectUser(u.id)}
                    className="w-4 h-4 rounded text-blue-900 border-slate-300 focus:ring-blue-900 cursor-pointer shrink-0"
                    aria-label={`Hitamo ${u.full_name}`}
                  />

                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 ${
                      isAdmin
                        ? 'bg-blue-950 text-amber-400 border border-amber-400/30'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {(u.full_name || 'U').charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                        {u.full_name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${
                          isAdmin
                            ? 'bg-blue-50 text-blue-900 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {u.role}
                      </span>
                      {isDisabled && (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-[10px] font-bold">
                          Bahagaritswe
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                      <span>{u.email}</span>
                      {u.phone && <span>• {u.phone}</span>}
                      {u.choir_voice && <span>• Ijwi: {u.choir_voice}</span>}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                  {/* Change Role */}
                  <button
                    onClick={() => {
                      setEditingUser(u);
                      setSelectedRole(u.role);
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold inline-flex items-center gap-1"
                    title="Hindura Inshingano"
                  >
                    <Shield className="w-3.5 h-3.5 text-blue-900" />
                    <span>Inshingano</span>
                  </button>

                  {/* Reset Password */}
                  <button
                    onClick={() => {
                      setPasswordResetUser(u);
                      setNewPassword('');
                    }}
                    className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg"
                    title="Guhindura Ijambobanga"
                  >
                    <Key className="w-4 h-4" />
                  </button>

                  {/* Enable / Disable */}
                  <button
                    onClick={() => setToggleStatusUser(u)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isDisabled
                        ? 'text-emerald-700 hover:bg-emerald-50'
                        : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                    }`}
                    title={isDisabled ? 'Fungura uyu mukoresha' : 'Hagarika uyu mukoresha'}
                  >
                    {isDisabled ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
      )}

      {/* ROLE MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900">
                Hindura Inshingano za: {editingUser.full_name}
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Hitamo Inshingano Nshya (User Role)
                </label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                >
                  <option value="super_admin">Super Admin (Ubuyobozi Bukuru bwose)</option>
                  <option value="admin">Admin (Gucunga indirimbo n'ibirimo)</option>
                  <option value="content_admin">Content Admin (Amatangazo n'inyandiko)</option>
                  <option value="moderator">Moderator (Gusuzuma ibitekerezo)</option>
                  <option value="member">Choir Member (Umunyamuryango wa Korali)</option>
                  <option value="supporter">Supporter (Umukunzi wa Korali)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Reka
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingRole}
                  className="px-4 py-2 bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs rounded-xl"
                >
                  {isUpdatingRole ? 'Guhindura...' : 'Emeza Inshingano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900">
                Guhindura Ijambobanga: {passwordResetUser.full_name}
              </h3>
              <button
                onClick={() => setPasswordResetUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ijambobanga Rishya (New Password) *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Byibuze inyuguti 6..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordResetUser(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Reka
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword}
                  className="px-4 py-2 bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs rounded-xl"
                >
                  {isResettingPassword ? 'Guhindura...' : 'Bika Ijambobanga'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM STATUS TOGGLE */}
      <ConfirmDialog
        isOpen={Boolean(toggleStatusUser)}
        title={
          toggleStatusUser?.is_disabled === 1
            ? 'Gufungura Uyu Mukoresha?'
            : 'Guhagarika Uyu Mukoresha?'
        }
        message={
          toggleStatusUser?.is_disabled === 1
            ? `Uremeza ko ushaka gusubiza uburenganzira ${toggleStatusUser?.full_name}?`
            : `Uremeza ko ushaka guhagarika ${toggleStatusUser?.full_name}? Ntabwo azashobora kwinjira muri porogaramu.`
        }
        confirmText={toggleStatusUser?.is_disabled === 1 ? 'Fungura' : 'Hagarika'}
        cancelText="Reka"
        isDestructive={toggleStatusUser?.is_disabled !== 1}
        isLoading={isTogglingStatus}
        onConfirm={handleToggleStatus}
        onCancel={() => setToggleStatusUser(null)}
      />

      {/* BULK ACTION CONFIRMATION MODAL */}
      {bulkActionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 pb-2 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  {bulkActionModal.action === 'delete'
                    ? `Kwemeza Gusiba Abakoresha ${bulkActionModal.count} Burundu`
                    : `Kwemeza Guhagarika Abakoresha ${bulkActionModal.count}`}
                </h3>
                <p className="text-xs text-slate-500">
                  Iki gikorwa cyandikwa muri Audit Log y'umutekano
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {bulkActionModal.action === 'delete'
                ? `Witeguye gusiba burundu abakoresha ${bulkActionModal.count}? Amakuru yabo n'ibikorwa byabo bizasibwa burundu kandi ntibizashobora kugarurwa.`
                : `Witeguye guhagarika kwinjira kw'abakoresha ${bulkActionModal.count}? Ntibazashobora kongera kwinjira kugeza bakomorewe.`}
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Impamvu y'iki gikorwa (Audit Trail Reason):
              </label>
              <input
                type="text"
                value={bulkReason}
                onChange={e => setBulkReason(e.target.value)}
                placeholder="Urugero: Isuku muri konti zidafite ibikorwa..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBulkActionModal(null)}
                disabled={isExecutingBulkAction}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Reka (Cancel)
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkAction}
                disabled={isExecutingBulkAction}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer transition-all ${
                  bulkActionModal.action === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {isExecutingBulkAction
                  ? 'Birakorwa...'
                  : bulkActionModal.action === 'delete'
                  ? 'Yego, Siba Burundu'
                  : 'Yego, Hagarika'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
