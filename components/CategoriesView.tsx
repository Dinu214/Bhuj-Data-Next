'use client';

import React, { useState } from 'react';
import { Search, Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/hooks/useAuth';

interface CategoriesViewProps {
  onViewChange?: (view: string, id?: number) => void;
}

const PALETTE = [
  { c: '#E39A2D', soft: '#FBEACB' },
  { c: '#48527A', soft: '#E2E3EE' },
  { c: '#4C7A63', soft: '#DEEAE3' },
  { c: '#C1544A', soft: '#F4DEDA' },
  { c: '#7C2D3B', soft: '#F1DFE2' },
  { c: '#8B5E83', soft: '#EEE1EB' },
];

const CategoriesView: React.FC<CategoriesViewProps> = ({ onViewChange }) => {
  const { categoriesWithCount, peopleWithDetails, addCategory, updateCategory, deleteCategory } = useData();
  const { isAdmin, isViewerAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [name, setName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const filtered = categoriesWithCount.filter(c =>
    c.category_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPeople = peopleWithDetails.length || 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editing) updateCategory(editing.id, name.trim());
    else addCategory(name.trim());
    setName(''); setEditing(null); setShowModal(false);
  };

  const openEdit = (id: number, catName: string) => {
    setEditing({ id, name: catName }); setName(catName); setShowModal(true);
  };

  const handleDelete = (id: number) => {
    deleteCategory(id); setDeleteTarget(null);
  };

  const canWrite = isAdmin() || isViewerAdmin();

  return (
    <div className="px-4 pb-4 max-w-7xl mx-auto space-y-3">
      {/* Page head */}
      <div className="pt-2 pb-2">
        <p className="page-eyebrow">STRUCTURE</p>
        <h1 className="page-title">Categories</h1>
        <p className="page-subtitle">Classification of sangh members.</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-ink-muted">
          {categoriesWithCount.length} categories
        </span>
        {canWrite && (
          <button
            onClick={() => { setEditing(null); setName(''); setShowModal(true); }}
            className="pill-btn pill-solid"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add category</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="card p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            type="text"
            placeholder="Search categories…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs bg-paper border border-surface-line rounded-xl text-ink placeholder-ink-muted outline-none focus:border-maroon"
          />
        </div>
      </div>

      {/* Categories Cards List */}
      <div className="space-y-2.5">
        {filtered.map((c, idx) => {
          const pal = PALETTE[idx % PALETTE.length];
          const pct = Math.round((c.person_count / totalPeople) * 100);

          return (
            <div
              key={c.category_id}
              className="card p-4 flex items-center gap-3.5 cursor-pointer transition-all duration-150 hover:shadow-md"
              onClick={() => onViewChange?.('people')}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: pal.soft, color: pal.c }}
              >
                <Tag className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-ink text-sm truncate">{c.category_name}</h3>
                  <span className="font-display font-bold text-base flex-shrink-0 ml-2" style={{ color: pal.c }}>
                    {c.person_count}
                  </span>
                </div>
                <p className="text-xs font-semibold text-ink-muted">
                  {c.person_count} {c.person_count === 1 ? 'person' : 'people'} ({pct}%)
                </p>
                <div className="h-1.5 rounded-full bg-paper border border-surface-line overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: pal.c }}
                  />
                </div>
              </div>

              {canWrite && (
                <div className="flex items-center gap-1 flex-shrink-0 ml-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => openEdit(c.category_id, c.category_name)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink hover:bg-paper transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ id: c.category_id, name: c.category_name })}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:text-rose hover:bg-rose-soft/40 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card p-10 flex flex-col items-center justify-center text-center">
          <Tag className="w-10 h-10 mb-2 text-ink-muted opacity-30" />
          <p className="font-bold text-ink text-sm">{search ? 'No categories match your search' : 'No categories yet'}</p>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-sm w-full" style={{ boxShadow: '0 20px 60px -10px rgba(33,21,38,.22)' }}>
            <h3 className="font-display font-bold text-ink text-lg mb-1">
              {editing ? 'Edit Category' : 'New Category'}
            </h3>
            <p className="text-xs text-ink-muted mb-4">Classify members by age or spiritual group</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-1.5">Category Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input"
                  placeholder="e.g. Yuvak, Vadil, Bal"
                  autoFocus
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditing(null); setName(''); }}
                  className="btn-ghost flex-1 justify-center py-2 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 justify-center py-2 text-xs">
                  {editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-sm w-full" style={{ boxShadow: '0 20px 60px -10px rgba(33,21,38,.22)' }}>
            <h3 className="font-display font-bold text-ink text-lg mb-1">Delete Category</h3>
            <p className="text-xs text-ink-muted mb-4 leading-relaxed">
              Are you sure you want to delete <strong className="text-ink">{deleteTarget.name}</strong>? This will unassign it from all associated people without deleting the people themselves.
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
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesView;

