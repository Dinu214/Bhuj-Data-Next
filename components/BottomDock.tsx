'use client';

import React from 'react';
import { ViewType } from '@/types';

interface BottomDockProps {
  currentView: ViewType;
  onViewChange: (view: string) => void;
  onMenuOpen: () => void;
}

const TABS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/>
        <rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>
      </svg>
    ),
  },
  {
    id: 'people',
    label: 'People',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/>
        <path d="M16.5 6.2A3.2 3.2 0 0 1 17 12.5"/><path d="M15.5 14.3c2.7.4 4.7 2.6 5 5.7"/>
      </svg>
    ),
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4"/><rect x="3" y="4" width="18" height="17" rx="3"/>
        <path d="M8 2v4M16 2v4M3 9h18"/>
      </svg>
    ),
  },
  {
    id: 'attendance-report',
    label: 'Reports',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V10M12 20V4M20 20v-7"/>
      </svg>
    ),
  },
] as const;

import { useAuth } from '@/hooks/useAuth';

const BottomDock: React.FC<BottomDockProps> = ({ currentView, onViewChange }) => {
  const { canViewPeople, canViewAttendance, canViewReports } = useAuth();

  const visibleTabs = TABS.filter(tab => {
    if (tab.id === 'dashboard') return true;
    if (tab.id === 'people') return canViewPeople();
    if (tab.id === 'attendance') return canViewAttendance();
    if (tab.id === 'attendance-report') return canViewReports();
    return true;
  });

  return (
    <nav className="dock">
      {visibleTabs.map(tab => {
        const active = currentView === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={`dock-item ${active ? 'active' : ''}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomDock;

