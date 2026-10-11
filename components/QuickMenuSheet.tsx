'use client';

import React from 'react';
import {
  LayoutGrid, Users, Tag, Folder, CalendarCheck, BarChart3, Calendar, UserCog, Settings,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ViewType } from '@/types';

interface QuickMenuSheetProps {
  open: boolean;
  onClose: () => void;
  currentView: ViewType;
  onViewChange: (view: string) => void;
}

const SECTIONS = [
  { key: 'dashboard',         label: 'Dashboard',  color: '#FBEACB', iconColor: '#E39A2D', Icon: LayoutGrid },
  { key: 'people',            label: 'People',     color: '#E2E3EE', iconColor: '#48527A', Icon: Users },
  { key: 'categories',        label: 'Categories', color: '#DEEAE3', iconColor: '#4C7A63', Icon: Tag },
  { key: 'groups',            label: 'Groups',     color: '#F4DEDA', iconColor: '#C1544A', Icon: Folder },
  { key: 'attendance',        label: 'Attendance', color: '#F1DFE2', iconColor: '#7C2D3B', Icon: CalendarCheck },
  { key: 'attendance-report', label: 'Reports',    color: '#EEE1EB', iconColor: '#8B5E83', Icon: BarChart3 },
  { key: 'occasions',         label: 'Occasions',  color: '#FBEACB', iconColor: '#E39A2D', Icon: Calendar },
  { key: 'users',             label: 'Users',      color: '#E9E2EE', iconColor: '#6B46C1', Icon: UserCog },
  { key: 'settings',          label: 'Settings',   color: '#DEEAE3', iconColor: '#4C7A63', Icon: Settings },
] as const;

const QuickMenuSheet: React.FC<QuickMenuSheetProps> = ({ open, onClose, currentView, onViewChange }) => {
  const {
    user,
    logout,
    canManageUsers,
    canViewOccasions,
    canViewPeople,
    canViewAttendance,
    canViewReports,
    canViewCategories,
    canViewGroups,
  } = useAuth();
  const initials = (user?.displayName || user?.username || 'U').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  const visibleSections = SECTIONS.filter(s => {
    if (s.key === 'dashboard') return true;
    if (s.key === 'users') return canManageUsers();
    if (s.key === 'occasions') return canViewOccasions();
    if (s.key === 'people') return canViewPeople();
    if (s.key === 'attendance') return canViewAttendance();
    if (s.key === 'attendance-report') return canViewReports();
    if (s.key === 'categories') return canViewCategories();
    if (s.key === 'groups') return canViewGroups();
    return true;
  });

  const handleNav = (key: string) => { onViewChange(key); onClose(); };

  return (
    <>
      <div className={`sheet-backdrop ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`sheet ${open ? 'open' : ''}`} style={{ zIndex: 50 }}>
        <div className="sheet-grabber" />

        {/* Org header */}
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-surface-soft">
          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(155deg, #7C2D3B, #4E1B26)' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#E39A2D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="block">
              <path d="M12 3c1.6 2.2 2.4 4 2.4 5.6a2.4 2.4 0 1 1-4.8 0C9.6 7 10.4 5.2 12 3z"/>
              <path d="M6 21c0-4 2.7-7 6-7s6 3 6 7"/>
            </svg>
          </div>
          <div>
            <p className="font-display font-semibold text-ink" style={{ fontSize: 17 }}>Hari Prabodham</p>
            <p className="text-xs font-semibold text-ink-muted mt-0.5">Bhuj, Gujarat</p>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {visibleSections.map(s => {
            const active = currentView === s.key;
            const IconComponent = s.Icon;
            return (
              <button
                key={s.key}
                onClick={() => handleNav(s.key)}
                className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border transition-all duration-150"
                style={{
                  background: active ? '#FBEACB' : '#F8F3ED',
                  borderColor: active ? '#E39A2D' : '#ECE2D8',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: s.color, color: s.iconColor }}
                >
                  <IconComponent className="w-5 h-5 block" strokeWidth={1.9} />
                </div>
                <span className="text-xs font-bold text-center leading-tight" style={{ color: '#5B4E62' }}>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* User footer */}
        <div className="flex items-center gap-3 pt-4 border-t border-surface-soft">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'conic-gradient(#E39A2D, #7C2D3B, #E39A2D)', padding: 2 }}>
            <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: '#7C2D3B' }}>
              {initials}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-ink truncate">{user?.displayName || user?.username}</p>
            <p className="text-xs font-semibold text-ink-muted capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
          <button
            onClick={() => { logout(); onClose(); }}
            className="text-xs font-bold cursor-pointer"
            style={{ color: '#C1544A' }}
          >
            Sign out
          </button>
        </div>
      </div>
    </>
  );
};

export default QuickMenuSheet;

