'use client';

import React from 'react';
import { Cake, Phone, MessageSquare, X } from 'lucide-react';
import { PersonWithDetails } from '@/types';

interface BirthdaySheetProps {
  open: boolean;
  onClose: () => void;
  people: PersonWithDetails[];
}

interface UpcomingBirthday {
  person: PersonWithDetails;
  days: number;
  dateLabel: string;
  turningAge?: number;
}

export const BirthdaySheet: React.FC<BirthdaySheetProps> = ({ open, onClose, people }) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const upcoming: UpcomingBirthday[] = people
    .filter(p => !!p.dob)
    .flatMap<UpcomingBirthday>(p => {
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
      if (diffDays < 0 || diffDays > 7) return [];

      const turningAge = nextBday.getFullYear() - birthYear;

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateLabel = diffDays === 0
        ? 'Today'
        : diffDays === 1
          ? 'Tomorrow'
          : `${monthNames[birthMonth]} ${birthDay}`;

      return [{ person: p, days: diffDays, dateLabel, turningAge }];
    })
    .sort((a, b) => a.days - b.days);

  const todayBirthdays = upcoming.filter(x => x.days === 0);
  const weekBirthdays = upcoming.filter(x => x.days > 0);

  const sendWish = (p: PersonWithDetails) => {
    if (!p.mobile_number) return;
    const phone = p.mobile_number.replace(/[^0-9]/g, '');
    const clean = phone.startsWith('91') ? phone : `91${phone}`;
    const firstName = p.full_name.split(' ')[0];
    const text = encodeURIComponent(`Jai Swaminarayan ${firstName}! Wishing you a very Happy Birthday! 🎂💐`);
    window.open(`https://wa.me/${clean}?text=${text}`, '_blank');
  };

  const callPerson = (p: PersonWithDetails) => {
    if (!p.mobile_number) return;
    const clean = p.mobile_number.replace(/[^0-9]/g, '');
    window.location.href = `tel:${clean}`;
  };

  const renderRow = (item: UpcomingBirthday) => {
    const { person, dateLabel, turningAge, days } = item;
    const initials = (person.full_name || '?')
      .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

    return (
      <div key={person.person_id} className="flex items-center gap-3 py-3 border-b border-surface-soft last:border-b-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ background: '#FBEACB', color: '#7C2D3B' }}>
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
            {turningAge ? ` · Turning ${turningAge}` : ''}
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
                onClick={() => sendWish(person)}
                className="pill-btn pill-solid py-1.5 px-2.5 text-xs flex items-center gap-1"
                title="Send WhatsApp Wish"
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
        <div className="flex items-center justify-between pb-4 mb-3 border-b border-surface-soft">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(155deg, #E39A2D, #B67A1E)' }}>
              <Cake className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-display font-semibold text-ink" style={{ fontSize: 17 }}>Birthdays</p>
              <p className="text-xs font-semibold text-ink-muted">Today and the next 7 days</p>
            </div>
          </div>
          <button onClick={onClose} className="roundbtn w-8 h-8">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Today section */}
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wider mb-2 text-ink-muted">Today</p>
          {todayBirthdays.length > 0 ? (
            <div className="card p-3">{todayBirthdays.map(renderRow)}</div>
          ) : (
            <p className="text-xs text-ink-muted px-1">No birthdays today.</p>
          )}
        </div>

        {/* This week section */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2 text-ink-muted">Next 7 Days</p>
          {weekBirthdays.length > 0 ? (
            <div className="card p-3">{weekBirthdays.map(renderRow)}</div>
          ) : (
            <p className="text-xs text-ink-muted px-1">No birthdays in the next 7 days.</p>
          )}
        </div>
      </div>
    </>
  );
};

export default BirthdaySheet;

