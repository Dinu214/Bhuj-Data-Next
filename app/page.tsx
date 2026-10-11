'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AuthProvider from '@/components/AuthProvider';
import LoginPage from '@/components/LoginPage';
import { useAuth } from '@/hooks/useAuth';
import { useData, DataProvider } from '@/context/DataContext';
import AppBar from '@/components/AppBar';
import BottomDock from '@/components/BottomDock';
import Dashboard from '@/components/Dashboard';
import PeopleView from '@/components/PeopleView';
import PersonDetail from '@/components/PersonDetail';
import CategoriesView from '@/components/CategoriesView';
import GroupsView from '@/components/GroupsView';
import AttendanceView from '@/components/AttendanceView';
import AttendanceReport from '@/components/AttendanceReport';
import OccasionsView from '@/components/OccasionsView';
import UsersView from '@/components/UsersView';
import QuickMenuSheet from '@/components/QuickMenuSheet';
import BirthdaySheet from '@/components/BirthdaySheet';
import SettingsView from '@/components/SettingsView';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ViewType } from '@/types';
import { Loader2 } from 'lucide-react';
import { useAppSettings } from '@/hooks/useAppSettings';

const STORAGE_VIEW_KEY = 'app_current_view';
const STORAGE_ID_KEY   = 'app_selected_id';

const AppContent: React.FC = () => {
  const { peopleWithDetails } = useData();
  const { settings } = useAppSettings();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const [birthdayOpen, setBirthdayOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedView = localStorage.getItem(STORAGE_VIEW_KEY) as ViewType | null;
    if (savedView) setCurrentView(savedView);
    const savedId = localStorage.getItem(STORAGE_ID_KEY);
    if (savedId) setSelectedId(Number(savedId));
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_VIEW_KEY, currentView);
    }
  }, [currentView, mounted]);

  useEffect(() => {
    if (mounted) {
      if (selectedId !== undefined) localStorage.setItem(STORAGE_ID_KEY, String(selectedId));
      else localStorage.removeItem(STORAGE_ID_KEY);
    }
  }, [selectedId, mounted]);

  const upcomingCelebrationsCount = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const windowDays = settings.birthdayWindowDays || 7;

    let total = peopleWithDetails.filter(p => {
      if (!p.dob) return false;
      const parts = p.dob.split('T')[0].split('-');
      if (parts.length < 3) return false;
      const bm = parseInt(parts[1], 10) - 1;
      const bd = parseInt(parts[2], 10);
      let nextB = new Date(today.getFullYear(), bm, bd);
      if (nextB < today) nextB = new Date(today.getFullYear() + 1, bm, bd);
      const diff = Math.round((nextB.getTime() - today.getTime()) / 86400000);
      return diff >= 0 && diff <= windowDays;
    }).length;

    if (settings.trackAnniversaries) {
      total += peopleWithDetails.filter(p => {
        if (p.marital_status !== 'married' || !p.anniversary_date) return false;
        const parts = p.anniversary_date.split('T')[0].split('-');
        if (parts.length < 3) return false;
        const am = parseInt(parts[1], 10) - 1;
        const ad = parseInt(parts[2], 10);
        let nextA = new Date(today.getFullYear(), am, ad);
        if (nextA < today) nextA = new Date(today.getFullYear() + 1, am, ad);
        const diff = Math.round((nextA.getTime() - today.getTime()) / 86400000);
        return diff >= 0 && diff <= windowDays;
      }).length;
    }

    return total;
  }, [peopleWithDetails, settings.birthdayWindowDays, settings.trackAnniversaries]);

  const {
    user,
    isLoading,
    isAdmin,
    isViewerAdmin,
    canViewPeople,
    canViewAttendance,
    canViewReports,
    canViewCategories,
    canViewGroups,
    canViewOccasions,
    canManageUsers,
  } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-maroon" />
          <p className="text-xs font-semibold text-ink-muted tracking-wide">Loading Hari Prabodham…</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const handleViewChange = (view: string, id?: number) => {
    if (view === 'users' && !canManageUsers()) return;
    if (view === 'occasions' && !canViewOccasions()) return;
    if (view === 'people' && !canViewPeople()) return;
    if (view === 'attendance' && !canViewAttendance()) return;
    if (view === 'attendance-report' && !canViewReports()) return;
    if (view === 'categories' && !canViewCategories()) return;
    if (view === 'groups' && !canViewGroups()) return;
    setCurrentView(view as ViewType);
    setSelectedId(id);
    setMenuOpen(false);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':        return <Dashboard onViewChange={handleViewChange} onOpenBirthdays={() => setBirthdayOpen(true)} />;
      case 'people':           return canViewPeople() ? <PeopleView onViewChange={handleViewChange} /> : <Dashboard onViewChange={handleViewChange} onOpenBirthdays={() => setBirthdayOpen(true)} />;
      case 'person-detail':    return canViewPeople() ? <PersonDetail personId={selectedId || 0} onBack={() => handleViewChange('people')} /> : <Dashboard onViewChange={handleViewChange} onOpenBirthdays={() => setBirthdayOpen(true)} />;
      case 'categories':       return canViewCategories() ? <CategoriesView onViewChange={handleViewChange} /> : <Dashboard onViewChange={handleViewChange} onOpenBirthdays={() => setBirthdayOpen(true)} />;
      case 'groups':           return canViewGroups() ? <GroupsView onViewChange={handleViewChange} /> : <Dashboard onViewChange={handleViewChange} onOpenBirthdays={() => setBirthdayOpen(true)} />;
      case 'attendance':       return canViewAttendance() ? <AttendanceView /> : <Dashboard onViewChange={handleViewChange} onOpenBirthdays={() => setBirthdayOpen(true)} />;
      case 'attendance-report':return canViewReports() ? <AttendanceReport onViewChange={handleViewChange} /> : <Dashboard onViewChange={handleViewChange} onOpenBirthdays={() => setBirthdayOpen(true)} />;
      case 'occasions':        return canViewOccasions() ? <OccasionsView /> : <Dashboard onViewChange={handleViewChange} onOpenBirthdays={() => setBirthdayOpen(true)} />;
      case 'users':            return canManageUsers() ? <UsersView /> : <Dashboard onViewChange={handleViewChange} onOpenBirthdays={() => setBirthdayOpen(true)} />;
      case 'settings':         return <SettingsView onViewChange={handleViewChange} />;
      default:                 return <Dashboard onViewChange={handleViewChange} onOpenBirthdays={() => setBirthdayOpen(true)} />;
    }
  };

  return (
    <div className="min-h-screen">
      <AppBar
        currentView={currentView}
        onMenuOpen={() => setMenuOpen(true)}
        onViewChange={handleViewChange}
        birthdayCount={upcomingCelebrationsCount}
        onOpenBirthdays={() => setBirthdayOpen(true)}
      />

      <main className="pb-28 min-h-screen">
        {renderContent()}
      </main>

      <div className="fixed bottom-4 left-0 right-0 flex justify-center z-30 pointer-events-none">
        <div className="pointer-events-auto">
          <BottomDock currentView={currentView} onViewChange={handleViewChange} onMenuOpen={() => setMenuOpen(true)} />
        </div>
      </div>

      <QuickMenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} currentView={currentView} onViewChange={handleViewChange} />
      <BirthdaySheet open={birthdayOpen} onClose={() => setBirthdayOpen(false)} people={peopleWithDetails} />
    </div>
  );
};

export default function Home() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

