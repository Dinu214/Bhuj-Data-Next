'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Plus, Pencil, Trash2, Download, ChevronUp, ChevronDown,
  Phone, MessageSquare, LayoutGrid, List, User, ArrowRight,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/hooks/useAuth';
import { PersonWithDetails } from '@/types';
import { exportToExcel } from '@/utils/export';
import SelectSheet from './SelectSheet';

interface PeopleViewProps {
  onViewChange: (view: string, id?: number) => void;
  filterCategoryId?: number;
  filterGroupId?: number;
}

const PALETTE = [
  { c: '#E39A2D', soft: '#FBEACB' },
  { c: '#48527A', soft: '#E2E3EE' },
  { c: '#4C7A63', soft: '#DEEAE3' },
  { c: '#C1544A', soft: '#F4DEDA' },
  { c: '#7C2D3B', soft: '#F1DFE2' },
  { c: '#8B5E83', soft: '#EEE1EB' },
];

const Avatar: React.FC<{ name: string; photo?: string; size?: 'sm' | 'md' }> = ({
  name,
  photo,
  size = 'md',
}) => {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const dim = size === 'sm' ? 'w-8 h-8 rounded-xl text-xs' : 'w-10 h-10 rounded-xl text-xs';

  return (
    <div className="relative flex-shrink-0">
      {photo ? (
        <img src={photo} alt={name} className={`${dim} object-cover rounded-xl border border-surface-line`} />
      ) : (
        <div className={`${dim} flex items-center justify-center font-bold text-white rounded-xl`} style={{ background: 'linear-gradient(155deg, #7C2D3B, #4E1B26)' }}>
          {initials}
        </div>
      )}
    </div>
  );
};

const DeleteModal: React.FC<{ name: string; onConfirm: () => void; onCancel: () => void }> = ({ name, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="card p-6 max-w-sm w-full" style={{ boxShadow: '0 20px 60px -10px rgba(33,21,38,.22)' }}>
      <h3 className="font-display font-bold text-ink text-base mb-1">Delete Member</h3>
      <p className="text-xs text-ink-muted mb-4 leading-relaxed">
        Are you sure you want to delete <strong className="text-ink">{name}</strong>? This action cannot be undone.
      </p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-ghost flex-1 justify-center py-2 text-xs">Cancel</button>
        <button onClick={onConfirm} className="btn-danger flex-1 justify-center py-2 text-xs">Delete</button>
      </div>
    </div>
  </div>
);

const ContactModal: React.FC<{
  action: { type: 'call' | 'whatsapp'; name: string; phone: string };
  onClose: () => void;
}> = ({ action, onClose }) => {
  const isCall = action.type === 'call';
  const cleanPhone = action.phone.replace(/[^0-9]/g, '');

  const handleProceed = () => {
    if (isCall) {
      window.location.href = `tel:${cleanPhone}`;
    } else {
      const formatted = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
      window.open(`https://wa.me/${formatted}`, '_blank');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card p-6 max-w-xs w-full text-center" style={{ boxShadow: '0 20px 60px -10px rgba(33,21,38,.22)' }}>
        <div
          className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
          style={{
            background: isCall ? '#F1EAE0' : '#DEEAE3',
            color: isCall ? '#7C2D3B' : '#4C7A63',
          }}
        >
          {isCall ? <Phone className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
        </div>
        <h3 className="font-display font-bold text-ink text-base mb-1">
          {isCall ? 'Place Phone Call' : 'Open WhatsApp'}
        </h3>
        <p className="text-xs text-ink-muted mb-4">
          {isCall ? `Call ${action.name} at ${action.phone}?` : `Send WhatsApp message to ${action.name}?`}
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1 justify-center py-2 text-xs">Cancel</button>
          <button
            onClick={handleProceed}
            className="flex-1 justify-center py-2 text-xs text-white rounded-xl font-bold flex items-center gap-1.5 transition-all"
            style={{ background: isCall ? '#7C2D3B' : '#4C7A63' }}
          >
            {isCall ? 'Call Now' : 'Open Chat'}
          </button>
        </div>
      </div>
    </div>
  );
};

const PeopleView: React.FC<PeopleViewProps> = ({ onViewChange, filterCategoryId, filterGroupId }) => {
  const { peopleWithDetails, categories, groups, deletePerson } = useData();
  const { canManageGroup, isAdmin, isViewerAdmin, canEditPeople } = useAuth();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<keyof PersonWithDetails>('full_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [contactConfirm, setContactConfirm] = useState<{ type: 'call' | 'whatsapp'; name: string; phone: string } | null>(null);

  useEffect(() => {
    if (filterCategoryId && categories.length > 0) {
      const match = categories.find(c => c.category_id === filterCategoryId);
      if (match) setFilterCategory(match.category_name);
    }
  }, [filterCategoryId, categories]);

  useEffect(() => {
    if (filterGroupId && groups.length > 0) {
      const match = groups.find(g => g.group_id === filterGroupId);
      if (match) setFilterGroup(match.group_name);
    }
  }, [filterGroupId, groups]);

  const filtered = useMemo(() => {
    let list = peopleWithDetails.filter(p =>
      (p.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.mobile_number && p.mobile_number.includes(search)) ||
      (p.email && p.email.toLowerCase().includes(search.toLowerCase()))
    );
    if (filterCategory) list = list.filter(p => p.category?.category_name === filterCategory);
    if (filterGroup) list = list.filter(p => p.groups?.some(g => g.group_name === filterGroup));

    list.sort((a, b) => {
      let av: any = a[sortBy] ?? '';
      let bv: any = b[sortBy] ?? '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [peopleWithDetails, search, sortBy, sortOrder, filterCategory, filterGroup]);

  const handleSort = (field: keyof PersonWithDetails) => {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
  };

  const SortIcon: React.FC<{ field: keyof PersonWithDetails }> = ({ field }) => {
    if (sortBy !== field) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-black font-bold" /> : <ChevronDown className="w-3 h-3 text-black font-bold" />;
  };

  const canEdit = (person: PersonWithDetails) => {
    if (!canEditPeople()) return false;
    const gids = person.groups?.map(g => g.group_id) || [];
    return isAdmin() || gids.length === 0 || gids.some(gid => canManageGroup(gid));
  };

  const canExport = isAdmin() || isViewerAdmin() || canEditPeople();

  const getCategoryColor = (categoryName?: string) => {
    if (!categoryName) return { c: '#5B4E62', soft: '#F1E9DF' };
    const idx = categories.findIndex(c => c.category_name === categoryName);
    return PALETTE[idx >= 0 ? idx % PALETTE.length : 0];
  };

  const getBirthdayTag = (dob?: string) => {
    if (!dob) return null;
    const parts = dob.split('T')[0].split('-');
    if (parts.length < 3) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const bm = parseInt(parts[1], 10) - 1;
    const bd = parseInt(parts[2], 10);
    let nextB = new Date(today.getFullYear(), bm, bd);
    if (nextB < today) nextB = new Date(today.getFullYear() + 1, bm, bd);
    const days = Math.round((nextB.getTime() - today.getTime()) / 86400000);
    if (days === 0) return 'Birthday today';
    if (days > 0 && days <= 7) return `Birthday in ${days}d`;
    return null;
  };

  return (
    <div className="px-4 pb-4 max-w-7xl mx-auto space-y-3">
      <div className="pt-2 pb-2">
        <h1 className="page-title">People</h1>
        <p className="page-subtitle">{peopleWithDetails.length} total members</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-ink-muted">
          Showing {filtered.length} of {peopleWithDetails.length}
        </span>

        <div className="flex items-center gap-2">
          {canExport && (
            <button
              onClick={() => exportToExcel(filtered, categories, groups)}
              className="pill-btn pill-ghost"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          )}
          {canEditPeople() && (
            <button
              onClick={() => onViewChange('person-detail', 0)}
              className="pill-btn pill-solid"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>

      <div className="card p-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input
              type="text"
              placeholder="Search by name, phone or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-paper border border-surface-line rounded-xl text-ink placeholder-ink-muted outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/20"
            />
          </div>

          <SelectSheet
            label="Group"
            placeholder="All Groups"
            value={filterGroup}
            onChange={val => setFilterGroup(String(val))}
            options={[
              { value: '', label: 'All Groups' },
              ...groups.map(g => ({ value: g.group_name, label: g.group_name })),
            ]}
            buttonClassName="h-9 px-3 text-xs"
            className="min-w-[120px] max-w-[140px] flex-shrink-0"
          />

          <div className="hidden sm:flex items-center bg-paper p-0.5 rounded-xl border border-surface-line flex-shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-white text-ink shadow-sm font-bold' : 'text-ink-muted hover:text-ink'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-white text-ink shadow-sm font-bold' : 'text-ink-muted hover:text-ink'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
          <button
            onClick={() => { setFilterCategory(''); setFilterGroup(''); }}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              !filterCategory && !filterGroup
                ? 'bg-marigold text-maroon shadow-sm'
                : 'bg-paper text-ink-soft hover:bg-surface-soft border border-surface-line'
            }`}
          >
            All
          </button>
          {categories.map(c => {
            const active = filterCategory === c.category_name;
            return (
              <button
                key={c.category_id}
                onClick={() => setFilterCategory(prev => prev === c.category_name ? '' : c.category_name)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  active
                    ? 'bg-marigold text-maroon shadow-sm'
                    : 'bg-paper text-ink-soft hover:bg-surface-soft border border-surface-line'
                }`}
              >
                {c.category_name}
              </button>
            );
          })}
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(person => {
            const catPal = getCategoryColor(person.category?.category_name);
            const bdayTag = getBirthdayTag(person.dob);

            return (
              <div
                key={person.person_id}
                className="card p-3.5 flex flex-col justify-between transition-all duration-200 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={person.full_name} photo={person.photo_url} />
                      <div className="min-w-0">
                        <button
                          onClick={() => onViewChange('person-detail', person.person_id)}
                          className="font-bold text-ink text-sm truncate hover:text-maroon transition-colors text-left block"
                        >
                          {person.full_name}
                        </button>
                        <p className="text-xs text-ink-muted mt-0.5">{person.mobile_number || 'No phone'}</p>
                      </div>
                    </div>

                    {canEdit(person) && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => onViewChange('person-detail', person.person_id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink hover:bg-paper transition-colors"
                          title="Edit member"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: person.person_id, name: person.full_name })}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:text-rose hover:bg-rose-soft/40 transition-colors"
                          title="Delete member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    {person.category && (
                      <span
                        className="px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold"
                        style={{ background: catPal.soft, color: catPal.c }}
                      >
                        {person.category.category_name}
                      </span>
                    )}
                    {person.groups?.slice(0, 2).map(g => (
                      <span
                        key={g.group_id}
                        className="px-2 py-0.5 rounded-lg text-[10.5px] font-semibold bg-paper text-ink-soft border border-surface-line truncate max-w-[110px]"
                      >
                        {g.group_name}
                      </span>
                    ))}
                    {(person.groups?.length || 0) > 2 && (
                      <span className="px-1.5 py-0.5 rounded-lg text-[10.5px] font-bold bg-paper text-ink-muted border border-surface-line">
                        +{(person.groups?.length || 0) - 2}
                      </span>
                    )}
                    {bdayTag && (
                      <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-marigold-soft text-maroon flex items-center gap-1">
                        🎂 {bdayTag}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-surface-soft flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    {person.mobile_number && (
                      <>
                        <button
                          onClick={() => setContactConfirm({ type: 'call', name: person.full_name, phone: person.mobile_number! })}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:text-maroon hover:bg-paper transition-colors"
                          title={`Call ${person.mobile_number}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setContactConfirm({ type: 'whatsapp', name: person.full_name, phone: person.mobile_number! })}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:text-sage hover:bg-sage-soft transition-colors"
                          title="WhatsApp chat"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => onViewChange('person-detail', person.person_id)}
                    className="text-xs font-bold text-ink-soft hover:text-maroon flex items-center gap-1 transition-colors ml-auto"
                  >
                    <span>Profile</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-paper text-ink-muted border-b border-surface-line font-bold">
                <tr>
                  <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort('full_name')}>
                    <div className="flex items-center gap-1">Name <SortIcon field="full_name" /></div>
                  </th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Groups</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-soft">
                {filtered.map(person => {
                  const catPal = getCategoryColor(person.category?.category_name);
                  return (
                    <tr key={person.person_id} className="hover:bg-paper/60 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={person.full_name} photo={person.photo_url} size="sm" />
                          <button
                            onClick={() => onViewChange('person-detail', person.person_id)}
                            className="font-bold text-ink hover:text-maroon transition-colors text-left"
                          >
                            {person.full_name}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-ink-muted font-medium">
                        {person.mobile_number ? (
                          <div className="flex items-center gap-2">
                            <span>{person.mobile_number}</span>
                            <button
                              onClick={() => setContactConfirm({ type: 'call', name: person.full_name, phone: person.mobile_number! })}
                              className="text-ink-muted hover:text-maroon"
                              title="Call"
                            >
                              <Phone className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setContactConfirm({ type: 'whatsapp', name: person.full_name, phone: person.mobile_number! })}
                              className="text-ink-muted hover:text-sage"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-ink-muted/50">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {person.category ? (
                          <span
                            className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold"
                            style={{ background: catPal.soft, color: catPal.c }}
                          >
                            {person.category.category_name}
                          </span>
                        ) : (
                          <span className="text-ink-muted/50">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-ink-muted font-medium">
                        {person.groups && person.groups.length > 0
                          ? person.groups.map(g => g.group_name).join(', ')
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit(person) && (
                            <button
                              onClick={() => onViewChange('person-detail', person.person_id)}
                              className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-paper transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canEdit(person) && (
                            <button
                              onClick={() => setDeleteTarget({ id: person.person_id, name: person.full_name })}
                              className="p-1 rounded-lg text-ink-muted hover:text-rose hover:bg-rose-soft/40 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="card p-10 flex flex-col items-center justify-center text-center">
          <User className="w-10 h-10 mb-2 text-ink-muted opacity-40" />
          <p className="font-bold text-ink text-sm">No members found</p>
          <p className="text-xs text-ink-muted mt-0.5">Try a different name, phone, or category filter</p>
        </div>
      )}

      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          onConfirm={() => {
            deletePerson(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {contactConfirm && (
        <ContactModal
          action={contactConfirm}
          onClose={() => setContactConfirm(null)}
        />
      )}
    </div>
  );
};

export default PeopleView;

