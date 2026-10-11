'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { AppUser } from '@/types';

// ── Key change from the original: no localStorage, no Bearer token.
// Auth state comes from the httpOnly cookie set by /api/auth/login.
// The cookie is sent automatically with every fetch — we never touch it in JS.

interface AuthContextType {
  user: AppUser | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAdmin: () => boolean;
  isViewerAdmin: () => boolean;
  canViewPeople: () => boolean;
  canEditPeople: () => boolean;
  canViewAttendance: () => boolean;
  canMarkAttendance: () => boolean;
  canViewReports: () => boolean;
  canViewCategories: () => boolean;
  canViewGroups: () => boolean;
  canViewOccasions: () => boolean;
  canManageUsers: () => boolean;
  canManageGroup: (groupId: number) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const useAuthProvider = (): AuthContextType => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network errors on logout
    }
    setUser(null);
  };

  useEffect(() => {
    // On mount: call /api/auth/me to restore session from httpOnly cookie.
    // The cookie is sent automatically — no localStorage needed.
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser({
            id: data.id,
            username: data.username,
            displayName: data.displayName,
            role: data.role,
            groupAccess: data.groupAccess || [],
            permissions: data.permissions || [],
          });
        }
        // 401 = no cookie or expired — just stay logged out, no action needed
      } catch {
        // Network error — stay logged out
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for 401 events dispatched by useDatabase when a request fails
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setIsLoading(false);
        return { success: false, error: data.error || 'Invalid credentials' };
      }
      // Cookie is set by the server — just update local state from the response body
      setUser(data.user);
      setIsLoading(false);
      return { success: true };
    } catch {
      setIsLoading(false);
      return { success: false, error: 'Connection failed. Please check your network.' };
    }
  };

  const isAdmin = () => user?.role === 'admin';
  const isViewerAdmin = () => user?.role === 'viewer_admin';

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'viewer_admin') {
      return permission.endsWith(':read');
    }
    return Array.isArray(user.permissions) && user.permissions.includes(permission);
  };

  const canManageGroup = (groupId: number) => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'viewer_admin') return true;
    return Array.isArray(user.groupAccess) && user.groupAccess.includes(groupId);
  };

  const canViewPeople = () => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'viewer_admin') return true;
    return hasPermission('people:read') || hasPermission('people:manage');
  };

  const canEditPeople = () => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'viewer_admin') return false;
    return hasPermission('people:manage');
  };

  const canViewAttendance = () => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'viewer_admin') return true;
    return hasPermission('attendance:read') || hasPermission('attendance:manage');
  };

  const canMarkAttendance = () => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'viewer_admin') return false;
    return hasPermission('attendance:manage');
  };

  const canViewReports = () => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'viewer_admin') return true;
    return hasPermission('reports:read');
  };

  const canViewCategories = () => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'viewer_admin') return true;
    return hasPermission('categories:read');
  };

  const canViewGroups = () => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'viewer_admin') return true;
    return hasPermission('groups:read');
  };

  const canViewOccasions = () => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'viewer_admin';
  };

  const canManageUsers = () => {
    if (!user) return false;
    return user.role === 'admin';
  };

  return {
    user,
    login,
    logout,
    isLoading,
    isAdmin,
    isViewerAdmin,
    canViewPeople,
    canEditPeople,
    canViewAttendance,
    canMarkAttendance,
    canViewReports,
    canViewCategories,
    canViewGroups,
    canViewOccasions,
    canManageUsers,
    canManageGroup,
    hasPermission,
  };
};

export { AuthContext };

