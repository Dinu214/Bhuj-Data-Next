'use client';

import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ViewType } from '@/types';
import { logoDataUrl } from '@/assets/logo';

interface AppBarProps {
  currentView: ViewType;
  onMenuOpen: () => void;
  onViewChange: (view: string) => void;
  birthdayCount?: number;
  onOpenBirthdays?: () => void;
}

const AppBar: React.FC<AppBarProps> = ({ onMenuOpen, onViewChange, birthdayCount = 0, onOpenBirthdays }) => {
  const { user } = useAuth();
  const initials = (user?.displayName || user?.username || 'U').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3" style={{ background: '#EFE7DB' }}>
      {/* Menu */}
      <button onClick={onMenuOpen} className="roundbtn">
        <Menu className="w-4 h-4" />
      </button>

      {/* Org chip */}
      <button
        onClick={onMenuOpen}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white border border-surface-line cursor-pointer min-w-0 overflow-hidden"
        style={{ boxShadow: '0 1px 4px rgba(33,21,38,.06)' }}
      >
        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(155deg, #7C2D3B, #4E1B26)' }}>
          <img src={logoDataUrl} alt="Logo" className="w-full h-full object-cover" />
        </div>
        <div className="text-left min-w-0">
          <p className="text-xs font-bold text-ink leading-tight truncate">Hari Prabodham</p>
          <p className="text-[10px] font-semibold leading-tight" style={{ color: '#8F8494' }}>Bhuj</p>
        </div>
      </button>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button
          className="roundbtn relative"
          onClick={onOpenBirthdays || onMenuOpen}
          title={birthdayCount > 0 ? `${birthdayCount} upcoming birthdays` : 'Notifications'}
        >
          <Bell className="w-4 h-4" />
          {birthdayCount > 0 && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pulse"
              style={{ background: '#E39A2D' }}
            >
              {birthdayCount}
            </span>
          )}
        </button>
        <button
          onClick={onMenuOpen}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 cursor-pointer"
          style={{ background: 'conic-gradient(#E39A2D, #7C2D3B, #E39A2D)', padding: 2 }}
        >
          <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: '#7C2D3B' }}>
            {initials}
          </div>
        </button>
      </div>
    </header>
  );
};

export default AppBar;

