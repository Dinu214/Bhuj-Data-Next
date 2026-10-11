'use client';

import React, { useState } from 'react';
import { Cake, Phone, MessageSquare, X, Heart } from 'lucide-react';
import { PersonWithDetails } from '@/types';
import {
  useAppSettings,
  formatBirthdayWish,
  formatAnniversaryWish,
  cleanPhoneForWhatsApp,
} from '@/hooks/useAppSettings';

interface BirthdaySheetProps {
  open: boolean;
  onClose: () => void;
  people: PersonWithDetails[];
}

interface UpcomingItem {
  person: PersonWithDetails;
  days: number;
  dateLabel: string;
  milestoneNumber?: number;
  type: 'birthday' | 'anniversary';
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const BirthdaySheet: React.FC<BirthdaySheetProps> = ({ open, onClose, people }) => {
  const { settings } = useAppSettings();
  const [activeTab, setActiveTab] = useState<'birthdays' | 'anniversaries'>('birthdays');

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const windowDays = settings.birthdayWindowDays || 7;

  // Birthdays
  const upcomingBirthdays: UpcomingItem[] = people
    .filter(p => !!p.dob)
    .flatMap<UpcomingItem>(p => {
      const dobStr = p.dob!.split('T')[0];
      const parts = dobStr.split('-');
      if (parts.length < 3) return [];

      const birthYear = parseInt(parts[0], 10);
      const birthMonth = parseInt(parts[1], 10) - 1;
      const birthDay = parseInt(parts[2], 10);

      let nextBday = new Date(today.getFullYear(), birthMonth, birthDay);
      if (nextBday < today) {
        nextBday = new Date(today.getFullYear() + 1, birthMonth, birthDay);
      }

      const diffDays = Math.round((nextBday.getTime() - today.getTime()) / 86400000);
      if (diffDays < 0 || diffDays > windowDays) return [];

      const turningAge = nextBday.getFullYear() - birthYear;
      const dateLabel = diffDays === 0
        ? 'Today'
        : diffDays === 1
          ? 'Tomorrow'
          : `${MONTH_NAMES[birthMonth]} ${birthDay}`;

      return [{ person: p, days: diffDays, dateLabel, milestoneNumber: turningAge, type: 'birthday' }];
    })
    .sort((a, b) => a.days - b.days);

  // Anniversaries
  const upcomingAnniversaries: UpcomingItem[] = (settings.trackAnniversaries ? people : [])
    .filter(p => p.marital_status === 'married' && !!p.anniversary_date)
    .flatMap<UpcomingItem>(p => {
      const annivStr = p.anniversary_date!.split('T')[0];
      const parts = annivStr.split('-');
      if (parts.length < 3) return [];

      const annivYear = parseInt(parts[0], 10);
      const annivMonth = parseInt(parts[1], 10) - 1;
      const annivDay = parseInt(parts[2], 10);

      let nextAnniv = new Date(today.getFullYear(), annivMonth, annivDay);
      if (nextAnniv < today) {
        nextAnniv = new Date(today.getFullYear() + 1, annivMonth, annivDay);
      }

      const diffDays = Math.round((nextAnniv.getTime() - today.getTime()) / 86400000);
      if (diffDays < 0 || diffDays > windowDays) return [];

      const yearsCompleted = nextAnniv.getFullYear() - annivYear;
      const dateLabel = diffDays === 0
        ? 'Today'
        : diffDays === 1
          ? 'Tomorrow'
          : `${MONTH_NAMES[annivMonth]} ${annivDay}`;

      return [{ person: p, days: diffDays, dateLabel, milestoneNumber: yearsCompleted, type: 'anniversary' }];
    })
    .sort((a, b) => a.days - b.days);

  const currentItems = activeTab === 'birthdays' ? upcomingBirthdays : upcomingAnniversaries;
  const todayItems = currentItems.filter(x => x.days === 0);
  const upcomingLater = currentItems.filter(x => x.days > 0);

  const sendWish = (item: UpcomingItem) => {
    if (!item.person.mobile_number) return;
    const cleanPhone = cleanPhoneForWhatsApp(item.person.mobile_number);
    const message = item.type === 'birthday'
      ? formatBirthdayWish(settings.birthdayMessageTemplate, item.person, item.milestoneNumber)
      : formatAnniversaryWish(settings.anniversaryMessageTemplate, item.person, item.milestoneNumber);

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
  };

  const callPerson = (p: PersonWithDetails) => {
    if (!p.mobile_number) return;
    const clean = p.mobile_number.replace(/[^0-9]/g, '');
    window.location.href = `tel:${clean}`;
  };

  const renderRow = (item: UpcomingItem) => {
    const { person, dateLabel, milestoneNumber, days, type } = item;
    const initials = (person.full_name || '?')
      .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

    const milestoneText = type === 'birthday'
      ? (milestoneNumber ? ` · Turning ${milestoneNumber}` : '')
      : (milestoneNumber ? ` · ${milestoneNumber} Year${milestoneNumber > 1 ? 's' : ''}` : '');

    return (
      <div key={`${type}-${person.person_id}`} className="flex items-center gap-3 py-3 border-b border-surface-soft last:border-b-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0"
          style={{
            background: type === 'birthday' ? '#FBEACB' : '#F4DEDA',
            color: type === 'birthday' ? '#7C2D3B' : '#C1544A',
          }}
        >
          {person.photo_url ? (
            <img src={person.photo_url} alt={person.full_name} className="w-full h-full object-cover rounded-xl" />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink truncate">{person.full_name}</p>
          <p className="text-xs font-semibold text-ink-muted">
            <span className={days === 0 ? 'text-maroon font-bold' : ''}>{dateLabel}</span>
            {milestoneText}
            {person.category ? ` · ${person.category.category_name}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {person.mobile_number && (
            <>
              <button
                onClick={() => callPerson(person)}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-paper text-ink-soft hover:bg-surface-line transition-colors"
                title="Call"
              >
                <Phone className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => sendWish(item)}
                className="pill-btn pill-solid py-1.5 px-2.5 text-xs flex items-center gap-1"
                title={`Send WhatsApp ${type === 'birthday' ? 'Birthday' : 'Anniversary'} Wish`}
              >
                <MessageSquare className="w-3 h-3" />
                <span>Wish</span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={`sheet-backdrop ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`sheet ${open ? 'open' : ''}`} style={{ zIndex: 50 }}>
        <div className="sheet-grabber" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-surface-soft">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: activeTab === 'birthdays'
                  ? 'linear-gradient(155deg, #E39A2D, #B67A1E)'
                  : 'linear-gradient(155deg, #C1544A, #8F2D24)',
              }}
            >
              {activeTab === 'birthdays' ? (
                <Cake className="w-5 h-5 text-white" />
              ) : (
                <Heart className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <p className="font-display font-semibold text-ink" style={{ fontSize: 17 }}>
                {activeTab === 'birthdays' ? 'Birthdays' : 'Marriage Anniversaries'}
              </p>
              <p className="text-xs font-semibold text-ink-muted">
                Today and next {windowDays} days
              </p>
            </div>
          </div>
          <button onClick={onClose} className="roundbtn w-8 h-8">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs for Birthdays & Anniversaries */}
        {settings.trackAnniversaries && (
          <div className="flex bg-paper p-1 rounded-xl mb-3.5 border border-surface-line">
            <button
              onClick={() => setActiveTab('birthdays')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'birthdays'
                  ? 'bg-white text-maroon shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Cake className="w-3.5 h-3.5 text-amber-500" />
              <span>Birthdays ({upcomingBirthdays.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('anniversaries')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'anniversaries'
                  ? 'bg-white text-maroon shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>Anniversaries ({upcomingAnniversaries.length})</span>
            </button>
          </div>
        )}

        {/* Today section */}
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wider mb-2 text-ink-muted">Today</p>
          {todayItems.length > 0 ? (
            <div className="card p-3">{todayItems.map(renderRow)}</div>
          ) : (
            <p className="text-xs text-ink-muted px-1">
              No {activeTab === 'birthdays' ? 'birthdays' : 'anniversaries'} today.
            </p>
          )}
        </div>

        {/* Next X Days section */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2 text-ink-muted">
            Next {windowDays} Days
          </p>
          {upcomingLater.length > 0 ? (
            <div className="card p-3">{upcomingLater.map(renderRow)}</div>
          ) : (
            <p className="text-xs text-ink-muted px-1">
              No {activeTab === 'birthdays' ? 'birthdays' : 'anniversaries'} in the next {windowDays} days.
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default BirthdaySheet;
