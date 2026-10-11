'use client';

import { useState, useEffect, useCallback } from 'react';
import { PersonWithDetails } from '@/types';

export interface AppSettings {
  // Appearance (saved to local session only)
  theme: 'ivory' | 'light' | 'dark' | 'sunset';
  accentColor: 'maroon' | 'indigo' | 'sage' | 'plum';
  density: 'comfortable' | 'compact';
  fontSize: 'sm' | 'md' | 'lg';

  // Birthdays & Celebrations
  birthdayMessageTemplate: string;
  anniversaryMessageTemplate: string;
  birthdayWindowDays: number;
  trackAnniversaries: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'ivory',
  accentColor: 'maroon',
  density: 'comfortable',
  fontSize: 'md',

  birthdayMessageTemplate: 'Jai Swaminarayan {firstName}! 🌸 Wishing you a very Happy Birthday! 🎂💐 May Maharaj & Swami bless you with abundant happiness, good health, and devotion.',
  anniversaryMessageTemplate: 'Jai Swaminarayan {name}! 💐 Wishing you both a very Happy Marriage Anniversary! 💍 May Maharaj & Swami bless you with harmony, happiness, and peace.',
  birthdayWindowDays: 7,
  trackAnniversaries: true,
};

// Appearance is saved strictly to this local session only
const APPEARANCE_SESSION_KEY = 'bhuj_appearance_session_v1';
const CELEBRATIONS_STORAGE_KEY = 'bhuj_celebrations_v1';
const EVENT_KEY = 'bhuj:settings-changed';

export function applyThemeToDom(settings: AppSettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', settings.theme);
  root.setAttribute('data-density', settings.density);
  root.setAttribute('data-fontsize', settings.fontSize);
  root.setAttribute('data-accent', settings.accentColor);
}

export function getStoredSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  let sessionAppearance: Partial<AppSettings> = {};
  let storedCelebrations: Partial<AppSettings> = {};

  // Appearance is loaded from sessionStorage (local session only)
  try {
    const rawApp = sessionStorage.getItem(APPEARANCE_SESSION_KEY);
    if (rawApp) sessionAppearance = JSON.parse(rawApp);
  } catch {}

  // Celebration templates from localStorage
  try {
    const rawCel = localStorage.getItem(CELEBRATIONS_STORAGE_KEY);
    if (rawCel) storedCelebrations = JSON.parse(rawCel);
  } catch {}

  return {
    ...DEFAULT_SETTINGS,
    ...storedCelebrations,
    ...sessionAppearance,
  };
}

export function formatBirthdayWish(
  template: string,
  person: PersonWithDetails,
  age?: number
): string {
  const fullName = person.full_name || '';
  const firstName = fullName.split(' ')[0] || fullName;
  let msg = template
    .replace(/\{name\}/g, fullName)
    .replace(/\{firstName\}/g, firstName)
    .replace(/\{org\}/g, 'Hari Prabodham Bhuj');

  if (age !== undefined && age > 0) {
    msg = msg.replace(/\{age\}/g, String(age));
  } else {
    msg = msg.replace(/\s*\(turning \{age\}\)/gi, '').replace(/\{age\}/g, '');
  }
  return msg;
}

export function formatAnniversaryWish(
  template: string,
  person: PersonWithDetails,
  years?: number
): string {
  const fullName = person.full_name || '';
  const firstName = fullName.split(' ')[0] || fullName;
  let msg = template
    .replace(/\{name\}/g, fullName)
    .replace(/\{firstName\}/g, firstName)
    .replace(/\{org\}/g, 'Hari Prabodham Bhuj');

  if (years !== undefined && years > 0) {
    msg = msg.replace(/\{years\}/g, String(years));
  } else {
    msg = msg.replace(/\{years\}/g, '');
  }
  return msg;
}

export function cleanPhoneForWhatsApp(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (!digits) return '';
  // Default to 91 country code for 10-digit mobile numbers
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const s = getStoredSettings();
    setSettings(s);
    applyThemeToDom(s);
    setMounted(true);

    const onSettingsChanged = () => {
      const updated = getStoredSettings();
      setSettings(updated);
      applyThemeToDom(updated);
    };

    window.addEventListener(EVENT_KEY, onSettingsChanged);
    return () => window.removeEventListener(EVENT_KEY, onSettingsChanged);
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      if (typeof window !== 'undefined') {
        try {
          // Appearance changes saved strictly to THIS LOCAL SESSION ONLY (sessionStorage)
          const appearanceKeys = ['theme', 'accentColor', 'density', 'fontSize'];
          const hasAppearanceUpdate = appearanceKeys.some(k => k in partial);
          if (hasAppearanceUpdate) {
            const sessionAppearance = {
              theme: next.theme,
              accentColor: next.accentColor,
              density: next.density,
              fontSize: next.fontSize,
            };
            sessionStorage.setItem(APPEARANCE_SESSION_KEY, JSON.stringify(sessionAppearance));
          }

          // Celebration settings saved to localStorage
          const celebrationKeys = [
            'birthdayMessageTemplate',
            'anniversaryMessageTemplate',
            'birthdayWindowDays',
            'trackAnniversaries',
          ];
          const hasCelebrationUpdate = celebrationKeys.some(k => k in partial);
          if (hasCelebrationUpdate) {
            const celebrationData = {
              birthdayMessageTemplate: next.birthdayMessageTemplate,
              anniversaryMessageTemplate: next.anniversaryMessageTemplate,
              birthdayWindowDays: next.birthdayWindowDays,
              trackAnniversaries: next.trackAnniversaries,
            };
            localStorage.setItem(CELEBRATIONS_STORAGE_KEY, JSON.stringify(celebrationData));
          }

          applyThemeToDom(next);
          window.dispatchEvent(new Event(EVENT_KEY));
        } catch (e) {
          console.error('Failed to save settings:', e);
        }
      }
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(APPEARANCE_SESSION_KEY);
        localStorage.removeItem(CELEBRATIONS_STORAGE_KEY);
        applyThemeToDom(DEFAULT_SETTINGS);
        setSettings(DEFAULT_SETTINGS);
        window.dispatchEvent(new Event(EVENT_KEY));
      } catch (e) {
        console.error('Failed to reset settings:', e);
      }
    }
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
    mounted,
  };
}
