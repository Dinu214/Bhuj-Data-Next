'use client';

import React, { useState } from 'react';
import {
  Palette, Cake, RotateCcw, Check, MessageSquare,
  Sun, Moon, Sunrise, Coffee, Layers, Type,
  Heart, AlertCircle, CheckCircle2, Clock
} from 'lucide-react';
import { useAppSettings, formatBirthdayWish, formatAnniversaryWish } from '@/hooks/useAppSettings';
import { useData } from '@/context/DataContext';

interface SettingsViewProps {
  onViewChange: (view: string, id?: number) => void;
}

type TabType = 'appearance' | 'celebrations';

const THEMES = [
  {
    id: 'ivory',
    name: 'Warm Ivory',
    desc: 'Signature Hari Prabodham warm cream & gold devotional tone',
    icon: Coffee,
    bg: 'linear-gradient(135deg, #F1EAE0 0%, #E4DACD 100%)',
    border: '#E39A2D',
    badgeBg: '#7C2D3B',
    titleColor: '#211526',
    descColor: '#5B4E62',
  },
  {
    id: 'light',
    name: 'Clean Slate',
    desc: 'Crisp minimal light interface with pure whites and cool slates',
    icon: Sun,
    bg: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2F6 100%)',
    border: '#CBD5E1',
    badgeBg: '#475569',
    titleColor: '#0F172A',
    descColor: '#475569',
  },
  {
    id: 'dark',
    name: 'Midnight Dark',
    desc: 'Deep elegant dark theme comfortable for low light and battery',
    icon: Moon,
    bg: 'linear-gradient(135deg, #18202F 0%, #101622 100%)',
    border: '#334155',
    badgeBg: '#38BDF8',
    titleColor: '#F8FAFC',
    descColor: '#94A3B8',
  },
  {
    id: 'sunset',
    name: 'Sunset Terracotta',
    desc: 'Rich devotional saffron and warm terracotta aesthetic',
    icon: Sunrise,
    bg: 'linear-gradient(135deg, #FFF0E2 0%, #F8D9C2 100%)',
    border: '#F97316',
    badgeBg: '#C2410C',
    titleColor: '#431407',
    descColor: '#7C2D12',
  },
] as const;

const ACCENTS = [
  { id: 'maroon', name: 'Devotional Maroon', color: '#7C2D3B' },
  { id: 'indigo', name: 'Royal Indigo',      color: '#48527A' },
  { id: 'sage',   name: 'Forest Sage',       color: '#4C7A63' },
  { id: 'plum',   name: 'Deep Plum',         color: '#8B5E83' },
] as const;

const BIRTHDAY_PRESETS = [
  {
    label: 'Devotional English',
    text: 'Jai Swaminarayan {firstName}! 🌸 Wishing you a very Happy Birthday! 🎂💐 May Maharaj & Swami bless you with abundant happiness, good health, and devotion.',
  },
  {
    label: 'Gujarati Traditional',
    text: 'જય સ્વામિનારાયણ {firstName}! 🌸 આપને જન્મદિવસ ની ખૂબ ખૂબ હાર્દિક શુભકામનાઓ! 🎂💐 મહારાજ અને મોટા સ્વામી આપનું જીવન સદૈવ ભક્તિ અને આનંદથી ભરી રાખે એવી પ્રાર્થના.',
  },
  {
    label: 'Short & Warm',
    text: 'Jai Swaminarayan {firstName}! Wishing you a blessed and joyful Birthday! 🎂✨ Warm wishes from {org}.',
  },
];

const ANNIVERSARY_PRESETS = [
  {
    label: 'Devotional English',
    text: 'Jai Swaminarayan {name}! 💐 Wishing you both a very Happy Marriage Anniversary! 💍 May Maharaj & Swami bless your family with lifelong harmony, health, and peace.',
  },
  {
    label: 'Gujarati Traditional',
    text: 'જય સ્વામિનારાયણ {name}! 💐 આપ બંનેને લગ્ન વર્ષગાંઠ ની ખૂબ ખૂબ શુભકામનાઓ! 💍🙏 મહારાજ અને સ્વામીના આશીર્વાદ સદાય આપના પરિવાર પર રહે એવી પ્રાર્થના.',
  },
  {
    label: 'Warm & Sweet',
    text: 'Jai Swaminarayan {name}! Happy Wedding Anniversary! 💐💍 Wishing you many more wonderful years of togetherness and happiness.',
  },
];

export const SettingsView: React.FC<SettingsViewProps> = () => {
  const { settings, updateSettings, resetSettings } = useAppSettings();
  const { peopleWithDetails } = useData();

  const [activeTab, setActiveTab] = useState<TabType>('appearance');
  const [saveToast, setSaveToast] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  const showSavedFeedback = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2200);
  };

  const samplePerson = peopleWithDetails[0] || {
    person_id: 999,
    full_name: 'Pravinbhai Patel',
    mobile_number: '9876543210',
    dob: '1985-06-15',
    marital_status: 'married',
    anniversary_date: '2010-12-20',
    is_ambrish: true,
  };

  const sampleBdayPreview = formatBirthdayWish(
    settings.birthdayMessageTemplate,
    samplePerson,
    41
  );

  const sampleAnnivPreview = formatAnniversaryWish(
    settings.anniversaryMessageTemplate,
    samplePerson,
    15
  );

  return (
    <div className="px-4 pb-12 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2 pb-1">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <span>Settings</span>
          </h1>
          <p className="page-subtitle">
            Customize appearance for this session, and manage celebration messages
          </p>
        </div>

        <button
          onClick={() => setResetConfirm(true)}
          className="pill-btn pill-ghost flex items-center gap-1.5"
          title="Reset settings to original defaults"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset Defaults</span>
        </button>
      </div>

      {/* Tabs (Appearance and Celebrations only) */}
      <div className="card p-1.5 flex gap-1.5">
        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'appearance'
              ? 'bg-marigold text-maroon shadow-sm'
              : 'text-ink-soft hover:bg-surface-soft hover:text-ink'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Appearance</span>
        </button>

        <button
          onClick={() => setActiveTab('celebrations')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'celebrations'
              ? 'bg-marigold text-maroon shadow-sm'
              : 'text-ink-soft hover:bg-surface-soft hover:text-ink'
          }`}
        >
          <Cake className="w-4 h-4" />
          <span>Celebrations & Wishes</span>
        </button>
      </div>

      {/* Tab 1: Appearance */}
      {activeTab === 'appearance' && (
        <div className="space-y-4">
          {/* Session Storage Notice */}
          <div className="p-3 rounded-xl border border-surface-line bg-paper/60 flex items-center gap-2.5 text-xs text-ink-muted">
            <Clock className="w-4 h-4 text-marigold flex-shrink-0" />
            <span>Appearance preferences (theme, spacing, and text size) apply to <strong>this browser session only</strong>.</span>
          </div>

          {/* Theme Palette */}
          <div className="card p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink">Theme & Aesthetic Tone</h3>
                <p className="text-xs text-ink-muted mt-0.5">Choose your preferred visual tone</p>
              </div>
              <span className="badge badge-marigold capitalize font-bold">{settings.theme} Active</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THEMES.map(t => {
                const isSelected = settings.theme === t.id;
                const IconComponent = t.icon;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      updateSettings({ theme: t.id });
                      showSavedFeedback();
                    }}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'border-marigold shadow-md ring-2 ring-marigold/30 scale-[1.01]'
                        : 'border-surface-line hover:border-surface-soft hover:shadow-sm'
                    }`}
                    style={{ background: t.bg }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
                          style={{ background: t.border, color: '#fff' }}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-sm" style={{ color: t.titleColor }}>{t.name}</p>
                          <p className="text-[11px] font-medium" style={{ color: t.descColor }}>{t.desc}</p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-marigold text-maroon flex items-center justify-center flex-shrink-0 shadow font-black">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Preview mini bar */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-black/10">
                      <span className="w-3.5 h-3.5 rounded-full shadow-inner" style={{ background: t.badgeBg }} />
                      <span className="w-3.5 h-3.5 rounded-full shadow-inner" style={{ background: t.border }} />
                      <span className="text-[10.5px] font-bold ml-1" style={{ color: t.titleColor }}>
                        {isSelected ? '✓ Current' : 'Tap to select'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Accent Color */}
          <div className="card p-4 sm:p-5 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-ink">Accent Highlight Color</h3>
              <p className="text-xs text-ink-muted mt-0.5">Highlight accents for focus elements and indicators</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {ACCENTS.map(acc => {
                const isSelected = settings.accentColor === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      updateSettings({ accentColor: acc.id });
                      showSavedFeedback();
                    }}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-all ${
                      isSelected
                        ? 'border-marigold bg-marigold/15 ring-2 ring-marigold/40 font-bold'
                        : 'border-surface-line bg-paper/60 hover:bg-surface-soft font-medium'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-sm"
                      style={{ background: acc.color }}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    <span className="text-xs text-ink font-semibold truncate">{acc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Spacing & Text Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Spacing Density */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-marigold" />
                <h3 className="text-sm font-bold text-ink">Interface Spacing</h3>
              </div>
              <p className="text-xs text-ink-muted">Control card padding and row density</p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {(['comfortable', 'compact'] as const).map(d => {
                  const isSelected = settings.density === d;
                  const label = d === 'comfortable' ? 'Comfortable' : 'Compact';
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        updateSettings({ density: d });
                        showSavedFeedback();
                      }}
                      className={`p-2.5 rounded-xl border text-xs transition-all ${
                        isSelected
                          ? 'bg-marigold text-maroon border-marigold font-extrabold shadow-sm ring-1 ring-marigold/40'
                          : 'border-surface-line bg-paper/60 hover:bg-surface-soft text-ink font-semibold'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Text Size */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-marigold" />
                <h3 className="text-sm font-bold text-ink">Text Size</h3>
              </div>
              <p className="text-xs text-ink-muted">Adjust text scaling for readability</p>

              <div className="grid grid-cols-3 gap-2 pt-1">
                {(['sm', 'md', 'lg'] as const).map(size => {
                  const label = size === 'sm' ? 'Compact' : size === 'md' ? 'Default' : 'Large';
                  const isSelected = settings.fontSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        updateSettings({ fontSize: size });
                        showSavedFeedback();
                      }}
                      className={`p-2.5 rounded-xl border text-xs transition-all ${
                        isSelected
                          ? 'bg-marigold text-maroon border-marigold font-extrabold shadow-sm ring-1 ring-marigold/40'
                          : 'border-surface-line bg-paper/60 hover:bg-surface-soft text-ink font-semibold'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Celebrations & Wishes */}
      {activeTab === 'celebrations' && (
        <div className="space-y-4">
          {/* General Celebration Lookahead */}
          <div className="card p-4 sm:p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-ink">Celebration Reminders & Lookahead</h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Configure reminder lookahead window and wedding anniversary tracking
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                  Reminder Window
                </label>
                <select
                  value={settings.birthdayWindowDays}
                  onChange={e => {
                    updateSettings({ birthdayWindowDays: Number(e.target.value) });
                    showSavedFeedback();
                  }}
                  className="w-full h-11 px-3 bg-paper border border-surface-line rounded-xl text-xs font-bold text-ink outline-none"
                >
                  <option value={3}>Next 3 Days</option>
                  <option value={7}>Next 7 Days (Standard)</option>
                  <option value={14}>Next 14 Days</option>
                  <option value={30}>Next 30 Days (Full Month)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                  Track Anniversaries
                </label>
                <button
                  type="button"
                  onClick={() => {
                    updateSettings({ trackAnniversaries: !settings.trackAnniversaries });
                    showSavedFeedback();
                  }}
                  className={`w-full h-11 px-3.5 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
                    settings.trackAnniversaries
                      ? 'bg-marigold text-maroon border-marigold shadow-sm'
                      : 'border-surface-line bg-paper/60 text-ink hover:bg-surface-soft'
                  }`}
                >
                  <span>Include Wedding Anniversaries</span>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    settings.trackAnniversaries ? 'bg-maroon text-white' : 'bg-gray-300 text-gray-700'
                  }`}>
                    {settings.trackAnniversaries ? '✓' : '✕'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Birthday Message Template */}
          <div className="card p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                  <Cake className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Birthday WhatsApp Wish Template</h3>
                  <p className="text-xs text-ink-muted">Pre-filled message template sent on WhatsApp</p>
                </div>
              </div>
            </div>

            {/* Variable Tags */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] font-bold text-ink-muted mr-1">Insert Tags:</span>
              {[
                { tag: '{firstName}', desc: 'First Name' },
                { tag: '{name}', desc: 'Full Name' },
                { tag: '{age}', desc: 'Turning Age' },
                { tag: '{org}', desc: 'Hari Prabodham' },
              ].map(item => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => {
                    updateSettings({
                      birthdayMessageTemplate: `${settings.birthdayMessageTemplate} ${item.tag}`,
                    });
                    showSavedFeedback();
                  }}
                  className="px-2 py-1 rounded-lg text-[11px] font-bold bg-paper/80 hover:bg-surface-soft border border-surface-line text-ink transition-colors"
                  title={`Insert ${item.desc}`}
                >
                  +{item.tag}
                </button>
              ))}
            </div>

            {/* Template Editor */}
            <textarea
              rows={3}
              value={settings.birthdayMessageTemplate}
              onChange={e => {
                updateSettings({ birthdayMessageTemplate: e.target.value });
                showSavedFeedback();
              }}
              className="w-full px-3 py-2.5 bg-paper border border-surface-line rounded-xl text-xs text-ink leading-relaxed resize-none font-medium outline-none focus:ring-1 focus:ring-maroon"
              placeholder="Enter birthday message template..."
            />

            {/* Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-ink-muted">Presets:</span>
              {BIRTHDAY_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    updateSettings({ birthdayMessageTemplate: preset.text });
                    showSavedFeedback();
                  }}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-paper/80 hover:bg-surface-soft border border-surface-line text-ink transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* WhatsApp Live Preview Bubble */}
            <div className="mt-3 pt-3 border-t border-surface-soft">
              <div className="flex items-center gap-1.5 mb-2">
                <MessageSquare className="w-3.5 h-3.5 text-sage" />
                <span className="text-[11px] font-bold text-ink uppercase tracking-wider">Live WhatsApp Preview</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#EFEAE2] border border-[#DDD6CC] max-w-md shadow-inner">
                <div className="p-3 rounded-2xl rounded-tl-sm bg-[#FFFFFF] shadow-sm text-xs text-gray-800 leading-relaxed relative">
                  <p>{sampleBdayPreview}</p>
                  <div className="flex items-center justify-end gap-1 mt-1.5 text-[9.5px] text-gray-400 font-semibold">
                    <span>10:30 AM</span>
                    <span className="text-[#53BDEB]">✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Anniversary Message Template */}
          <div className="card p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Anniversary WhatsApp Wish Template</h3>
                  <p className="text-xs text-ink-muted">Pre-filled wish message for wedding anniversaries</p>
                </div>
              </div>
            </div>

            {/* Variable Tags */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] font-bold text-ink-muted mr-1">Insert Tags:</span>
              {[
                { tag: '{name}', desc: 'Full Name' },
                { tag: '{firstName}', desc: 'First Name' },
                { tag: '{years}', desc: 'Years Completed' },
                { tag: '{org}', desc: 'Hari Prabodham' },
              ].map(item => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => {
                    updateSettings({
                      anniversaryMessageTemplate: `${settings.anniversaryMessageTemplate} ${item.tag}`,
                    });
                    showSavedFeedback();
                  }}
                  className="px-2 py-1 rounded-lg text-[11px] font-bold bg-paper/80 hover:bg-surface-soft border border-surface-line text-ink transition-colors"
                  title={`Insert ${item.desc}`}
                >
                  +{item.tag}
                </button>
              ))}
            </div>

            {/* Template Editor */}
            <textarea
              rows={3}
              value={settings.anniversaryMessageTemplate}
              onChange={e => {
                updateSettings({ anniversaryMessageTemplate: e.target.value });
                showSavedFeedback();
              }}
              className="w-full px-3 py-2.5 bg-paper border border-surface-line rounded-xl text-xs text-ink leading-relaxed resize-none font-medium outline-none focus:ring-1 focus:ring-maroon"
              placeholder="Enter anniversary message template..."
            />

            {/* Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-ink-muted">Presets:</span>
              {ANNIVERSARY_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    updateSettings({ anniversaryMessageTemplate: preset.text });
                    showSavedFeedback();
                  }}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-paper/80 hover:bg-surface-soft border border-surface-line text-ink transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* WhatsApp Live Preview Bubble */}
            <div className="mt-3 pt-3 border-t border-surface-soft">
              <div className="flex items-center gap-1.5 mb-2">
                <MessageSquare className="w-3.5 h-3.5 text-sage" />
                <span className="text-[11px] font-bold text-ink uppercase tracking-wider">Live WhatsApp Preview</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#EFEAE2] border border-[#DDD6CC] max-w-md shadow-inner">
                <div className="p-3 rounded-2xl rounded-tl-sm bg-[#FFFFFF] shadow-sm text-xs text-gray-800 leading-relaxed relative">
                  <p>{sampleAnnivPreview}</p>
                  <div className="flex items-center justify-end gap-1 mt-1.5 text-[9.5px] text-gray-400 font-semibold">
                    <span>10:30 AM</span>
                    <span className="text-[#53BDEB]">✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Save Notification */}
      {saveToast && (
        <div className="fixed bottom-20 right-6 z-50 flex items-center gap-2 bg-ink text-white px-4 py-2.5 rounded-2xl shadow-float text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Setting updated & applied</span>
        </div>
      )}

      {/* Reset Defaults Confirmation Modal */}
      {resetConfirm && (
        <div className="modal-backdrop">
          <div className="modal-card max-w-sm">
            <div className="w-12 h-12 rounded-2xl bg-rose-soft text-rose flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-ink text-base text-center mb-1">
              Reset All Settings?
            </h3>
            <p className="text-xs text-ink-muted text-center mb-5 leading-relaxed">
              This will restore appearance for this session and celebration templates to their original defaults.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setResetConfirm(false)}
                className="btn-ghost flex-1 justify-center py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  resetSettings();
                  setResetConfirm(false);
                  showSavedFeedback();
                }}
                className="btn-danger flex-1 justify-center py-2 text-xs"
              >
                Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
