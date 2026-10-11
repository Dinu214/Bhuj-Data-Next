'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Cake } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/hooks/useAuth';
import { exportToExcel } from '@/utils/export';
import { AttendanceStats } from '@/types';
import { useAppSettings } from '@/hooks/useAppSettings';

interface DashboardProps {
  onViewChange: (view: string, id?: number) => void;
  onOpenBirthdays?: () => void;
}

const PAL = [
  { c: '#E39A2D', soft: '#FBEACB' },
  { c: '#48527A', soft: '#E2E3EE' },
  { c: '#4C7A63', soft: '#DEEAE3' },
  { c: '#C1544A', soft: '#F4DEDA' },
  { c: '#7C2D3B', soft: '#F1DFE2' },
  { c: '#8B5E83', soft: '#EEE1EB' },
];

function DonutSVG({ segments, size, thickness }: { segments: { count: number; color: string }[]; size: number; thickness: number }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.count, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ECE2D8" strokeWidth={thickness} />
      {segments.map((s, i) => {
        const len = (s.count / total) * c;
        const el = (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={s.color} strokeWidth={thickness}
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-offset}
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

function RingProgress({ pct, size = 68 }: { pct: number; size?: number }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 78 78" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="39" cy="39" r={r} fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="6.5" />
        <circle cx="39" cy="39" r={r} fill="none" stroke="#E39A2D" strokeWidth="6.5"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <b className="font-display font-bold text-white text-[16px] leading-none">{pct}%</b>
        <span className="text-[7.5px] font-bold tracking-wider mt-0.5" style={{ color: '#E9D3B8' }}>TURNOUT</span>
      </div>
    </div>
  );
}

const Dashboard: React.FC<DashboardProps> = ({ onViewChange, onOpenBirthdays }) => {
  const { peopleWithDetails, categoriesWithCount, groupsWithCount } = useData();
  const { settings } = useAppSettings();
  const {
    isAdmin,
    isViewerAdmin,
    canViewPeople,
    canViewAttendance,
    canMarkAttendance,
    canViewReports,
    canViewCategories,
    canViewGroups,
  } = useAuth();
  const [attStats, setAttStats] = useState<AttendanceStats | null>(null);

  useEffect(() => {
    fetch('/api/attendance/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => setAttStats(d))
      .catch(() => {});
  }, []);

  const ambrishCount = useMemo(() => {
    return peopleWithDetails.filter(p => Boolean(p.is_ambrish)).length;
  }, [peopleWithDetails]);

  const upcomingCelebrations = useMemo(() => {
    const now = new Date();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const windowDays = settings.birthdayWindowDays || 7;

    const bdays = peopleWithDetails
      .filter(p => !!p.dob)
      .map(p => {
        const dobStr = p.dob!.split('T')[0];
        const parts = dobStr.split('-');
        if (parts.length < 3) return null;
        const bm = parseInt(parts[1], 10) - 1;
        const bd = parseInt(parts[2], 10);
        let nextB = new Date(todayDate.getFullYear(), bm, bd);
        if (nextB < todayDate) nextB = new Date(todayDate.getFullYear() + 1, bm, bd);
        const diff = Math.round((nextB.getTime() - todayDate.getTime()) / 86400000);
        return { person: p, days: diff, type: 'birthday' as const };
      })
      .filter((x): x is { person: typeof peopleWithDetails[0]; days: number; type: 'birthday' } => x !== null && x.days >= 0 && x.days <= windowDays);

    const annivs = (settings.trackAnniversaries ? peopleWithDetails : [])
      .filter(p => p.marital_status === 'married' && !!p.anniversary_date)
      .map(p => {
        const parts = p.anniversary_date!.split('T')[0].split('-');
        if (parts.length < 3) return null;
        const am = parseInt(parts[1], 10) - 1;
        const ad = parseInt(parts[2], 10);
        let nextA = new Date(todayDate.getFullYear(), am, ad);
        if (nextA < todayDate) nextA = new Date(todayDate.getFullYear() + 1, am, ad);
        const diff = Math.round((nextA.getTime() - todayDate.getTime()) / 86400000);
        return { person: p, days: diff, type: 'anniversary' as const };
      })
      .filter((x): x is { person: typeof peopleWithDetails[0]; days: number; type: 'anniversary' } => x !== null && x.days >= 0 && x.days <= windowDays);

    return [...bdays, ...annivs].sort((a, b) => a.days - b.days);
  }, [peopleWithDetails, settings.birthdayWindowDays, settings.trackAnniversaries]);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const rate = attStats?.todayRate ?? 0;

  const catSegments = categoriesWithCount.slice(0, 6).map((c, i) => ({
    count: c.person_count,
    color: PAL[i % PAL.length].c,
  }));

  return (
    <div className="px-4 pb-4">
      {/* Page head */}
      <div className="pt-2 pb-4">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">A live snapshot of your — people, activity and today's attendance.</p>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-2 gap-2.5 mb-2.5">

        {/* Hero attendance card — full width */}
        <div className="col-span-2 card p-5 relative overflow-hidden" style={{ background: 'linear-gradient(150deg, #7C2D3B 0%, #4E1B26 100%)', border: 'none' }}>
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(227,154,45,.35), transparent 70%)' }} />

          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11.5px] font-bold" style={{ color: '#F0D9B8', letterSpacing: '.01em' }}>TODAY'S TURNOUT</span>
            <span className="text-[11px] font-semibold" style={{ color: '#D9B8A5' }}>{today}</span>
          </div>

          {/* 3 Metrics: Perfectly balanced equal 3-column layout */}
          <div className="grid grid-cols-3 items-center gap-1.5 my-3.5 py-3 px-2 rounded-2xl bg-black/20 backdrop-blur-sm border border-white/10 relative z-10">
            {/* Metric 1: Turnout Rate */}
            <div className="flex flex-col items-center justify-center text-center">
              <RingProgress pct={rate} size={64} />
            </div>

            {/* Metric 2: Present Count */}
            <div className="flex flex-col items-center justify-center text-center border-x border-white/10 px-1">
              <span className="text-[10px] font-bold tracking-wider uppercase mb-1" style={{ color: '#F0D9B8' }}>
                PRESENT
              </span>
              <b className="font-display font-bold text-white text-2xl tracking-tight leading-none">
                {attStats?.todayPresent ?? 0}
              </b>
              <span className="text-[10px] font-semibold text-white/60 mt-1">
                Attended
              </span>
            </div>

            {/* Metric 3: Total Count */}
            <div className="flex flex-col items-center justify-center text-center px-1">
              <span className="text-[10px] font-bold tracking-wider uppercase mb-1" style={{ color: '#F0D9B8' }}>
                TOTAL
              </span>
              <b className="font-display font-bold text-white text-2xl tracking-tight leading-none">
                {peopleWithDetails.length}
              </b>
              <span className="text-[10px] font-semibold text-white/60 mt-1">
                Members
              </span>
            </div>
          </div>

          {canViewAttendance() && (
            <button
              onClick={() => onViewChange('attendance')}
              className="mt-3.5 w-full py-2.5 rounded-xl font-bold text-sm relative z-10 transition-all duration-150 active:scale-[.98]"
              style={{ background: '#E39A2D', color: '#7C2D3B' }}
            >
              {canMarkAttendance() ? "Mark today's attendance" : "View attendance records"}
            </button>
          )}
        </div>

        {/* People tile */}
        <button
          onClick={() => canViewPeople() && onViewChange('people')}
          disabled={!canViewPeople()}
          className={`card p-3.5 text-left group ${!canViewPeople() ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="item-badge w-8 h-8 rounded-[10px]" style={{ background: '#FBEACB' }}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#E39A2D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16.5 6.2A3.2 3.2 0 0 1 17 12.5"/><path d="M15.5 14.3c2.7.4 4.7 2.6 5 5.7"/>
              </svg>
            </div>
            {ambrishCount > 0 && (
              <span className="badge badge-marigold text-[10px]">
                ★ {ambrishCount} Ambrish
              </span>
            )}
          </div>
          <b className="font-display font-semibold text-ink block" style={{ fontSize: 23 }}>{peopleWithDetails.length}</b>
          <span className="text-[11px] font-bold text-ink-muted">PEOPLE</span>
        </button>

        {/* Categories tile */}
        <button
          onClick={() => canViewCategories() && onViewChange('categories')}
          disabled={!canViewCategories()}
          className={`card p-3.5 text-left ${!canViewCategories() ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="item-badge w-8 h-8 rounded-[10px]" style={{ background: '#E2E3EE' }}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#48527A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.6 20.6L16 16"/><circle cx="10" cy="10" r="7"/>
              </svg>
            </div>
            <span className="badge" style={{ background: '#E2E3EE', color: '#48527A', fontSize: 10 }}>{categoriesWithCount.length}</span>
          </div>
          <b className="font-display font-semibold text-ink block" style={{ fontSize: 23 }}>{categoriesWithCount.length}</b>
          <span className="text-[11px] font-bold text-ink-muted">CATEGORIES</span>
        </button>

        {/* Groups tile */}
        <button
          onClick={() => canViewGroups() && onViewChange('groups')}
          disabled={!canViewGroups()}
          className={`card p-3.5 text-left ${!canViewGroups() ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="item-badge w-8 h-8 rounded-[10px]" style={{ background: '#EEE1EB' }}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#8B5E83" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M3 7l3-4h5l2 3"/>
              </svg>
            </div>
          </div>
          <b className="font-display font-semibold text-ink block" style={{ fontSize: 23 }}>{groupsWithCount.length}</b>
          <span className="text-[11px] font-bold text-ink-muted">GROUPS</span>
        </button>

        {/* Last Attendance tile (-1 from current) */}
        <button
          onClick={() => (canViewReports() || canViewAttendance()) && onViewChange('attendance-report')}
          disabled={!canViewReports() && !canViewAttendance()}
          className={`card p-3.5 text-left ${!canViewReports() && !canViewAttendance() ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="item-badge w-8 h-8 rounded-[10px]" style={{ background: '#F4DEDA' }}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#C1544A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
            {attStats?.lastAttendance && (
              <span className="badge text-[10px]" style={{ background: '#F4DEDA', color: '#C1544A' }}>
                {new Date(attStats.lastAttendance.attendance_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
          <b className="font-display font-semibold text-ink block" style={{ fontSize: 23 }}>
            {attStats?.lastAttendance ? `${attStats.lastAttendance.present}` : '—'}
          </b>
          <span className="text-[11px] font-bold text-ink-muted block">LAST ATTENDANCE</span>
          {attStats?.lastAttendance && (
            <p className="text-[10px] text-ink-muted font-medium truncate mt-0.5">
              {attStats.lastAttendance.occasion_name} · {attStats.lastAttendance.rate}% turnout
            </p>
          )}
        </button>
      </div>

      {/* Celebration banner */}
      {upcomingCelebrations.length > 0 && (
        <div
          onClick={onOpenBirthdays}
          className="card p-3.5 mb-2.5 flex items-center gap-3 cursor-pointer transition-all duration-150 active:scale-[0.99] select-none"
          style={{ background: 'linear-gradient(120deg, #FBEACB 0%, #FDF4E4 100%)', border: '1px solid #E39A2D' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#E39A2D' }}>
            <Cake className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: '#7C2D3B' }}>
              {upcomingCelebrations.filter(x => x.days === 0).length > 0
                ? `${upcomingCelebrations.filter(x => x.days === 0).map(x => `${x.person.full_name.split(' ')[0]} (${x.type === 'birthday' ? 'Birthday' : 'Anniversary'})`).join(' & ')} today!`
                : `${upcomingCelebrations.length} celebration${upcomingCelebrations.length > 1 ? 's' : ''} in the next ${settings.birthdayWindowDays || 7} days`}
            </p>
            <p className="text-xs text-ink-soft mt-0.5">Tap to view birthdays & anniversaries and send wishes</p>
          </div>
          <div className="flex -space-x-2 flex-shrink-0">
            {upcomingCelebrations.slice(0, 3).map(b => (
              <div
                key={`${b.type}-${b.person.person_id}`}
                className="w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center border-2 border-white text-white shadow-sm"
                style={{ background: b.type === 'birthday' ? '#7C2D3B' : '#C1544A' }}
              >
                {(b.person.full_name || '?').slice(0, 2).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories donut */}
      {categoriesWithCount.length > 0 && (
        <>
          <div className="flex items-center justify-between pt-3 pb-2.5">
            <h3 className="font-display font-semibold text-ink" style={{ fontSize: 17 }}>Categories</h3>
            <button onClick={() => onViewChange('categories')} className="text-xs font-bold flex items-center gap-1" style={{ color: '#7C2D3B' }}>
              View all
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
          <div className="card p-4 mb-2.5">
            <div className="flex items-center gap-4">
              <DonutSVG segments={catSegments} size={110} thickness={16} />
              <div className="flex-1 space-y-2">
                {categoriesWithCount.slice(0, 6).map((cat, i) => (
                  <div key={cat.category_id} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: PAL[i % PAL.length].c }} />
                    <span className="flex-1 font-semibold text-ink-soft truncate">{cat.category_name}</span>
                    <span className="font-bold text-ink">{cat.person_count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Today's attendance by group */}
      {attStats && attStats.byGroup.length > 0 && (
        <>
          <div className="flex items-center justify-between pt-3 pb-2.5">
            <h3 className="font-display font-semibold text-ink" style={{ fontSize: 17 }}>Today's attendance</h3>
            <button onClick={() => onViewChange('attendance')} className="text-xs font-bold flex items-center gap-1" style={{ color: '#7C2D3B' }}>
              Mark
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
          <div className="space-y-2">
            {attStats.byGroup.slice(0, 6).map((g, i) => {
              const pal = PAL[i % PAL.length];
              const r = g.rate ?? 0;
              const c = 2 * Math.PI * 18;
              return (
                <div key={g.group_id} className="card p-3.5 flex items-center gap-3 cursor-pointer" onClick={() => onViewChange('attendance')}>
                  <div className="relative flex-shrink-0" style={{ width: 46, height: 46 }}>
                    <svg width="46" height="46" viewBox="0 0 46 46" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="23" cy="23" r="18" fill="none" stroke="#ECE2D8" strokeWidth="5" />
                      <circle cx="23" cy="23" r="18" fill="none" stroke={pal.c} strokeWidth="5"
                        strokeDasharray={c} strokeDashoffset={c - (r / 100) * c} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[9.5px] font-bold" style={{ color: pal.c }}>{r}%</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink truncate">{g.group_name}</p>
                    <p className="text-xs font-semibold text-ink-muted mt-0.5">{g.present} / {g.total} present · {r}%</p>
                  </div>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#C9BEB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Export */}
      {(isAdmin() || isViewerAdmin()) && (
        <div className="mt-4">
          <button onClick={() => exportToExcel(peopleWithDetails, categoriesWithCount, groupsWithCount)} className="btn-ghost w-full justify-center">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 21h16"/></svg>
            Export all data
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

