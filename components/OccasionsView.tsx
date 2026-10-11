'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, CalendarClock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AttendanceOccasion } from '@/types';

const PALETTE = [
  { c: '#E39A2D', soft: '#FBEACB' },
  { c: '#48527A', soft: '#E2E3EE' },
  { c: '#4C7A63', soft: '#DEEAE3' },
  { c: '#C1544A', soft: '#F4DEDA' },
  { c: '#7C2D3B', soft: '#F1DFE2' },
  { c: '#8B5E83', soft: '#EEE1EB' },
];

const OccasionsView: React.FC = () => {
  useAuth();
  const [occasions, setOccasions] = useState<AttendanceOccasion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AttendanceOccasion | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/occasions');
      const data = await res.json();
      setOccasions(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '' }); setError(''); setShowModal(true); };
  const openEdit = (o: AttendanceOccasion) => { setEditing(o); setForm({ name: o.name, description: o.description || '' }); setError(''); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Occasion name is required'); return; }
    setSaving(true); setError('');
    const res = await fetch(editing ? `/api/attendance/occasions/${editing.id}` : '/api/attendance/occasions', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed to save'); setSaving(false); return; }
    await load();
    setShowModal(false);
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/attendance/occasions/${id}`, { method: 'DELETE' });
    setOccasions(prev => prev.filter(o => o.id !== id));
    setDeleteTarget(null);
  };

  return (
    <div className="px-4 pb-4 max-w-7xl mx-auto space-y-3">
      {/* Page head */}
      <div className="pt-2 pb-2">
        <p className="page-eyebrow">EVENTS</p>
        <h1 className="page-title">Occasions</h1>
        <p className="page-subtitle">Regular sabhas, pujan and special events.</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-ink-muted">
          {occasions.length} occasions
        </span>
        <button onClick={openCreate} className="pill-btn pill-solid">
          <Plus className="w-3.5 h-3.5" />
          <span>Add occasion</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-ink-muted gap-2 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-ink-soft" /> Loading occasions…
        </div>
      ) : occasions.length === 0 ? (
        <div className="card p-10 flex flex-col items-center justify-center text-center">
          <CalendarClock className="w-10 h-10 mb-2 text-ink-muted opacity-30" />
          <p className="font-bold text-ink text-sm">No occasions yet</p>
          <p className="text-xs text-ink-muted mt-0.5">Create occasions like Regular Sabha, Pujan, Bal Sabha, etc.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {occasions.map((o, idx) => {
            const pal = PALETTE[idx % PALETTE.length];
            return (
              <div
                key={o.id}
                className="card p-4 flex items-center gap-3.5 transition-all duration-150 hover:shadow-md"
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: pal.soft, color: pal.c }}
                >
                  <CalendarClock className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-ink text-sm truncate">{o.name}</h3>
                  <p className="text-xs text-ink-muted truncate mt-0.5">
                    {o.description || 'No description'}
                    {o.created_by_name && ` · Added by ${o.created_by_name}`}
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(o)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink hover:bg-paper transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ id: o.id, name: o.name })}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:text-rose hover:bg-rose-soft/40 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-sm w-full" style={{ boxShadow: '0 20px 60px -10px rgba(33,21,38,.22)' }}>
            <h3 className="font-display font-bold text-ink text-lg mb-1">
              {editing ? 'Edit Occasion' : 'New Occasion'}
            </h3>
            <p className="text-xs text-ink-muted mb-4">Event type for tracking attendance</p>

            {error && (
              <p className="text-rose text-xs bg-rose-soft border border-rose-soft rounded-xl px-3 py-2 font-medium mb-3">
                {error}
              </p>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-1">Occasion Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input"
                  placeholder="e.g. Regular Sabha, Yuva Milan"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="input"
                  placeholder="Brief note about this event"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-ghost flex-1 justify-center py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary flex-1 justify-center py-2 text-xs"
                >
                  {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
                </button>
              </div>
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
            <h3 className="font-display font-bold text-ink text-base text-center mb-1">Delete Occasion</h3>
            <p className="text-xs text-ink-muted text-center mb-5 leading-relaxed">
              Are you sure you want to delete <strong className="text-ink">{deleteTarget.name}</strong>? Past attendance records associated with this occasion may be affected.
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
                Delete Occasion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OccasionsView;

