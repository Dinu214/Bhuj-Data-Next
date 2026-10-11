'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Shield,
  Search,
  Loader2,
  Eye,
  EyeOff,
  UserCog,
  Info,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// ─── All available feature permissions ───────────────────────────────────────
export const FEATURE_PERMISSIONS = [
  {
    group: 'People',
    items: [
      { key: 'people:read',   label: 'View People',   desc: 'Can view list and profile details of all people' },
      { key: 'people:manage', label: 'Manage People',  desc: 'Can add, edit, and delete people within assigned groups' },
    ],
  },
  {
    group: 'Attendance',
    items: [
      { key: 'attendance:read',   label: 'View Attendance',   desc: 'Can view attendance records (read-only)' },
      { key: 'attendance:manage', label: 'Mark Attendance',   desc: 'Can mark daily/occasion attendance for assigned groups' },
    ],
  },
  {
    group: 'Reports',
    items: [
      { key: 'reports:read', label: 'View Reports', desc: 'Can access and view Attendance Report & analytics' },
    ],
  },
  {
    group: 'Categories & Groups',
    items: [
      { key: 'categories:read', label: 'View Categories', desc: 'Can view member classification categories' },
      { key: 'groups:read',     label: 'View Groups',     desc: 'Can view volunteer teams and mandal groups' },
    ],
  },
];

const ALL_PERMISSION_KEYS = FEATURE_PERMISSIONS.flatMap(g => g.items.map(i => i.key));

interface UserRow {
  id: number;
  username: string;
  display_name: string;
  role: 'admin' | 'viewer_admin' | 'user';
  created_at: string;
  groups: { group_id: number; group_name: string }[];
  permissions: string[];
}

interface Group {
  group_id: number;
  group_name: string;
}

const UsersView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string; username: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    username: '',
    display_name: '',
    password: '',
    role: 'user' as 'admin' | 'viewer_admin' | 'user',
    group_ids: [] as number[],
    permissions: [] as string[],
  });

  const load = async () => {
    setLoading(true);
    try {
      const [uRes, gRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/groups'),
      ]);
      const u = await uRes.json();
      const g = await gRes.json();
      setUsers(Array.isArray(u) ? u : []);
      setGroups(Array.isArray(g) ? g : []);
    } catch {
      setError('Failed to load users or groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      username: '',
      display_name: '',
      password: '',
      role: 'user',
      group_ids: [],
      permissions: ['people:read', 'attendance:read', 'attendance:manage'],
    });
    setError('');
    setShowPassword(false);
    setShowModal(true);
  };

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setForm({
      username: u.username,
      display_name: u.display_name,
      password: '',
      role: u.role,
      group_ids: (u.groups || []).map(g => g.group_id),
      permissions: u.permissions || [],
    });
    setError('');
    setShowPassword(false);
    setShowModal(true);
  };

  // ── Group Selection Helpers ──
  const toggleGroup = (gid: number) => {
    setForm(f => ({
      ...f,
      group_ids: f.group_ids.includes(gid)
        ? f.group_ids.filter(id => id !== gid)
        : [...f.group_ids, gid],
    }));
  };

  const selectAllGroups = () => {
    setForm(f => ({ ...f, group_ids: groups.map(g => g.group_id) }));
  };

  const clearAllGroups = () => {
    setForm(f => ({ ...f, group_ids: [] }));
  };

  // ── Permission Selection Helpers ──
  const togglePermission = (key: string) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter(p => p !== key)
        : [...f.permissions, key],
    }));
  };

  const selectAllPermissions = () => {
    setForm(f => ({ ...f, permissions: [...ALL_PERMISSION_KEYS] }));
  };

  const clearAllPermissions = () => {
    setForm(f => ({ ...f, permissions: [] }));
  };

  const applyPreset = (preset: 'attendance' | 'coordinator' | 'viewer' | 'full') => {
    if (preset === 'attendance') {
      setForm(f => ({ ...f, permissions: ['attendance:read', 'attendance:manage'] }));
    } else if (preset === 'coordinator') {
      setForm(f => ({
        ...f,
        permissions: ['people:read', 'people:manage', 'attendance:read', 'attendance:manage', 'reports:read'],
      }));
    } else if (preset === 'viewer') {
      setForm(f => ({
        ...f,
        permissions: ['people:read', 'attendance:read', 'reports:read', 'categories:read', 'groups:read'],
      }));
    } else if (preset === 'full') {
      selectAllPermissions();
    }
  };

  const handleSave = async () => {
    if (!form.username.trim()) {
      setError('Username is required');
      return;
    }
    if (!editing && (!form.password || form.password.length < 4)) {
      setError('Password must be at least 4 characters for new users');
      return;
    }
    if (editing && form.password && form.password.length < 4) {
      setError('New password must be at least 4 characters');
      return;
    }

    setSaving(true);
    setError('');

    const body: Record<string, unknown> = {
      display_name: form.display_name.trim() || form.username.trim(),
      role: form.role,
      group_ids: form.role === 'user' ? form.group_ids : [],
      permissions: form.role === 'user' ? form.permissions : [],
    };
    if (form.password) body.password = form.password;
    if (!editing) body.username = form.username.trim().toLowerCase();

    try {
      const res = await fetch(editing ? `/api/users/${editing.id}` : '/api/users', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save user');
        setSaving(false);
        return;
      }
      await load();
      setShowModal(false);
    } catch {
      setError('Network error while saving user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to delete user');
        setDeleteTarget(null);
        return;
      }
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch {
      setError('Network error. Could not delete user.');
    }
    setDeleteTarget(null);
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.display_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleStyle = (role: string) => {
    if (role === 'admin') return { bg: '#F1DFE2', c: '#7C2D3B', label: '👑 Admin' };
    if (role === 'viewer_admin') return { bg: '#DEEAE3', c: '#4C7A63', label: '👁️ Viewer Admin' };
    return { bg: '#E2E3EE', c: '#48527A', label: '👤 User / Volunteer' };
  };

  const formatPermissionName = (key: string) => {
    const item = FEATURE_PERMISSIONS.flatMap(g => g.items).find(i => i.key === key);
    return item ? item.label : key;
  };

  return (
    <div className="px-4 pb-6 max-w-7xl mx-auto space-y-4">
      {/* Page Header */}
      <div className="pt-2 pb-1">
        <p className="page-eyebrow">ACCESS CONTROL</p>
        <h1 className="page-title">Users & Permissions</h1>
        <p className="page-subtitle">Manage accounts, assign groups, and control feature-level permissions.</p>
      </div>

      {/* Stats summary & Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap text-xs font-semibold text-ink-muted">
          <span className="px-2.5 py-1 rounded-lg bg-white border border-surface-line text-ink">
            Total: <strong className="text-maroon">{users.length}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-surface-line">
            Admins: <strong className="text-ink">{users.filter(u => u.role === 'admin').length}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-surface-line">
            Viewers: <strong className="text-ink">{users.filter(u => u.role === 'viewer_admin').length}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-surface-line">
            Users: <strong className="text-ink">{users.filter(u => u.role === 'user').length}</strong>
          </span>
        </div>

        <button onClick={openCreate} className="pill-btn pill-solid self-end sm:self-auto shadow-sm">
          <Plus className="w-4 h-4" />
          <span>Add New User</span>
        </button>
      </div>

      {/* Search */}
      <div className="card p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by username or name…"
            className="w-full h-10 pl-9 pr-3 text-xs bg-paper border border-surface-line rounded-xl text-ink placeholder-ink-muted outline-none focus:border-maroon"
          />
        </div>
      </div>

      {/* User list */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-ink-muted gap-2 text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-maroon" /> Loading user accounts…
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(u => {
            const roleStyle = getRoleStyle(u.role);
            const initials = (u.display_name || u.username)
              .split(' ')
              .map(w => w[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <div
                key={u.id}
                className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-150 hover:shadow-md"
              >
                {/* Avatar + Info */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                    style={{ background: 'linear-gradient(155deg, #7C2D3B, #4E1B26)' }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-ink">{u.display_name || u.username}</span>
                      <span className="text-xs text-ink-muted font-medium">@{u.username}</span>
                      <span
                        className="px-2 py-0.5 rounded-lg text-[11px] font-bold"
                        style={{ background: roleStyle.bg, color: roleStyle.c }}
                      >
                        {roleStyle.label}
                      </span>
                      {currentUser?.username === u.username && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-marigold-soft text-maroon">
                          You
                        </span>
                      )}
                    </div>

                    {/* Assigned Groups badge */}
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                        Groups:
                      </span>
                      {u.role === 'admin' || u.role === 'viewer_admin' ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-paper text-ink-soft border border-surface-line">
                          All Groups (Full access)
                        </span>
                      ) : u.groups && u.groups.length > 0 ? (
                        u.groups.map(g => (
                          <span
                            key={g.group_id}
                            className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-paper text-ink border border-surface-line"
                          >
                            {g.group_name}
                          </span>
                        ))
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-rose-soft/40 text-rose border border-rose-soft">
                          No groups assigned
                        </span>
                      )}
                    </div>

                    {/* Permissions summary badge */}
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                        Perms:
                      </span>
                      {u.role === 'admin' ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-maroon-soft text-maroon">
                          Full Admin Control
                        </span>
                      ) : u.role === 'viewer_admin' ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sage-soft text-sage">
                          Read-Only (All Features)
                        </span>
                      ) : u.permissions && u.permissions.length > 0 ? (
                        u.permissions.map(p => (
                          <span
                            key={p}
                            className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-surface-soft text-ink-soft border border-surface-line"
                          >
                            {formatPermissionName(p)}
                          </span>
                        ))
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-rose-soft/40 text-rose border border-rose-soft">
                          No permissions assigned
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-surface-soft w-full md:w-auto justify-end">
                  <button
                    onClick={() => openEdit(u)}
                    className="pill-btn pill-ghost text-xs"
                    title="Edit user"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Permissions</span>
                  </button>
                  {currentUser?.id !== u.id && (
                    <button
                      onClick={() => setDeleteTarget({ id: u.id, name: u.display_name || u.username, username: u.username })}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-ink-muted hover:text-rose hover:bg-rose-soft/40 transition-colors"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="card p-10 flex flex-col items-center justify-center text-center">
              <UserCog className="w-10 h-10 mb-2 text-ink-muted opacity-40" />
              <p className="font-bold text-ink text-sm">No matching users found</p>
            </div>
          )}
        </div>
      )}

      {/* ── Create / Edit User Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="card shadow-modal w-full max-w-3xl my-auto max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-line bg-paper shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-maroon text-white flex items-center justify-center">
                  <UserCog className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-ink text-base">
                    {editing ? `Edit ${editing.display_name || editing.username}` : 'Create New User'}
                  </h2>
                  <p className="text-[11px] text-ink-muted">Configure access credentials, role, and group assignments.</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-line text-ink-muted hover:text-ink transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Error banner */}
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-soft text-rose border border-rose/30 text-xs font-semibold flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. Account Credentials */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                  <span>1. Account Details</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">
                      Username <span className="text-rose">*</span>
                    </label>
                    <input
                      value={form.username}
                      disabled={!!editing}
                      onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                      className="input disabled:bg-surface-soft disabled:text-ink-muted"
                      placeholder="e.g. rahul_bhuj"
                      autoFocus={!editing}
                    />
                    {editing && (
                      <p className="text-[10.5px] text-ink-muted mt-1">Username cannot be changed after creation.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">Display Name</label>
                    <input
                      value={form.display_name}
                      onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                      className="input"
                      placeholder="Full Name (e.g. Rahul Patel)"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-ink mb-1.5">
                      {editing ? 'Change Password (leave empty to keep current)' : 'Password *'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        className="input pr-10"
                        placeholder={editing ? 'Leave blank to preserve current password' : 'Enter strong password (min 4 chars)'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink p-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Role Selector (Segmented Cards) */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  <span>2. Select Role</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Custom User */}
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, role: 'user' }))}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all duration-150 flex flex-col justify-between ${
                      form.role === 'user'
                        ? 'border-maroon bg-maroon-soft/40 shadow-sm'
                        : 'border-surface-line bg-paper hover:bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-ink">👤 Custom User</span>
                        {form.role === 'user' && (
                          <div className="w-4 h-4 rounded-full bg-maroon text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-muted leading-tight">
                        Volunteers with access strictly limited to assigned groups & permissions.
                      </p>
                    </div>
                  </button>

                  {/* Viewer Admin */}
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, role: 'viewer_admin' }))}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all duration-150 flex flex-col justify-between ${
                      form.role === 'viewer_admin'
                        ? 'border-sage bg-sage-soft/50 shadow-sm'
                        : 'border-surface-line bg-paper hover:bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-ink">👁️ Viewer Admin</span>
                        {form.role === 'viewer_admin' && (
                          <div className="w-4 h-4 rounded-full bg-sage text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-muted leading-tight">
                        Read-only access across all people, all groups, and attendance reports.
                      </p>
                    </div>
                  </button>

                  {/* Full Admin */}
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, role: 'admin' }))}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all duration-150 flex flex-col justify-between ${
                      form.role === 'admin'
                        ? 'border-maroon bg-maroon-soft text-maroon shadow-sm'
                        : 'border-surface-line bg-paper hover:bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-ink">👑 Full Admin</span>
                        {form.role === 'admin' && (
                          <div className="w-4 h-4 rounded-full bg-maroon text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-muted leading-tight">
                        Complete authority over all data, occasions, and managing other users.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Notice for Admin / Viewer Admin */}
              {(form.role === 'admin' || form.role === 'viewer_admin') && (
                <div className="p-3.5 rounded-xl bg-surface-soft border border-surface-line text-xs text-ink flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-maroon shrink-0" />
                  <span>
                    <strong>{form.role === 'admin' ? 'Admin' : 'Viewer Admin'}</strong> roles automatically bypass group and permission restrictions across the entire system.
                  </span>
                </div>
              )}

              {/* 3. Group Access (only for custom user) */}
              {form.role === 'user' && (
                <div className="space-y-3 pt-2 border-t border-surface-line">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                        <span>3. Assigned Groups</span>
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-marigold-soft text-maroon">
                          {form.group_ids.length} of {groups.length} selected
                        </span>
                      </h3>
                      <p className="text-[11px] text-ink-muted mt-0.5">
                        This user will ONLY be able to view/manage people and mark attendance in these groups.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={selectAllGroups}
                        className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white border border-surface-line text-ink hover:bg-paper"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={clearAllGroups}
                        className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white border border-surface-line text-ink-muted hover:text-rose"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {groups.length === 0 ? (
                    <p className="text-xs text-ink-muted py-3">No groups created in the system yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {groups.map(g => {
                        const isSelected = form.group_ids.includes(g.group_id);
                        return (
                          <button
                            key={g.group_id}
                            type="button"
                            onClick={() => toggleGroup(g.group_id)}
                            className={`p-2.5 rounded-xl border-2 flex items-center gap-2.5 text-left transition-all duration-150 active:scale-[0.98] ${
                              isSelected
                                ? 'border-maroon bg-maroon-soft text-maroon shadow-sm'
                                : 'border-surface-line bg-paper text-ink hover:border-surface-soft hover:bg-white'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                                isSelected ? 'bg-maroon border-maroon text-white' : 'border-surface-line bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="text-xs font-bold truncate">{g.group_name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 4. Feature Permissions (only for custom user) */}
              {form.role === 'user' && (
                <div className="space-y-3 pt-2 border-t border-surface-line">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                        <span>4. Feature Permissions</span>
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-marigold-soft text-maroon">
                          {form.permissions.length} selected
                        </span>
                      </h3>
                      <p className="text-[11px] text-ink-muted mt-0.5">
                        Controls what specific actions this user can perform in the application.
                      </p>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => applyPreset('attendance')}
                        className="px-2 py-1 rounded-lg text-[10.5px] font-bold bg-white border border-surface-line text-ink hover:bg-marigold-soft"
                        title="Mark Attendance only"
                      >
                        ⚡ Attendance Only
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('coordinator')}
                        className="px-2 py-1 rounded-lg text-[10.5px] font-bold bg-white border border-surface-line text-ink hover:bg-marigold-soft"
                        title="People + Attendance"
                      >
                        👥 Group Leader
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('full')}
                        className="px-2 py-1 rounded-lg text-[10.5px] font-bold bg-white border border-surface-line text-ink hover:bg-marigold-soft"
                      >
                        🌟 All
                      </button>
                      <button
                        type="button"
                        onClick={clearAllPermissions}
                        className="px-2 py-1 rounded-lg text-[10.5px] font-bold bg-white border border-surface-line text-ink-muted hover:text-rose"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Permission Group Cards */}
                  <div className="space-y-3">
                    {FEATURE_PERMISSIONS.map(pg => (
                      <div key={pg.group} className="border border-surface-line rounded-2xl overflow-hidden bg-white">
                        <div className="bg-paper px-3.5 py-2 border-b border-surface-line flex items-center justify-between">
                          <span className="text-xs font-bold text-ink uppercase tracking-wider">{pg.group}</span>
                          <span className="text-[10.5px] text-ink-muted font-semibold">
                            {pg.items.filter(i => form.permissions.includes(i.key)).length} / {pg.items.length}
                          </span>
                        </div>

                        <div className="p-2.5 space-y-1.5">
                          {pg.items.map(item => {
                            const isChecked = form.permissions.includes(item.key);
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => togglePermission(item.key)}
                                className={`w-full p-2.5 rounded-xl border-2 flex items-start gap-3 text-left transition-all duration-150 active:scale-[0.99] ${
                                  isChecked
                                    ? 'border-maroon bg-maroon-soft/30 shadow-sm'
                                    : 'border-transparent hover:bg-paper hover:border-surface-line'
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 mt-0.5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                                    isChecked ? 'bg-maroon border-maroon text-white' : 'border-surface-line bg-white'
                                  }`}
                                >
                                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={`text-xs font-bold leading-tight ${isChecked ? 'text-maroon' : 'text-ink'}`}>
                                    {item.label}
                                  </p>
                                  <p className="text-[11px] text-ink-muted mt-0.5 leading-normal">{item.desc}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-line bg-paper shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-ghost py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary py-2 text-xs shadow-sm"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{saving ? 'Saving…' : editing ? 'Update User' : 'Create User'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-backdrop">
          <div className="modal-card max-w-sm">
            <div className="w-12 h-12 rounded-2xl bg-rose-soft text-rose flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-ink text-base text-center mb-1">Delete User</h3>
            <p className="text-xs text-ink-muted text-center mb-5 leading-relaxed">
              Are you sure you want to delete <strong className="text-ink">{deleteTarget.name}</strong> (@{deleteTarget.username})? This user will permanently lose access to the system.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="btn-ghost flex-1 justify-center py-2 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget.id)}
                className="btn-danger flex-1 justify-center py-2 text-xs"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersView;
