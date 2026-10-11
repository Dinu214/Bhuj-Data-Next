'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Loader2, Lock, Eye, BarChart2, RefreshCcw, Check, X, Search, ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AttendanceOccasion } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────
interface PersonRow {
  person_id: number;
  full_name: string;
  mobile_number?: string;
  status: 'present' | 'absent' | null;
}

interface GroupSection {
  groupId: number | null;
  groupName: string;
  canManage: boolean;
  people: PersonRow[];
}

type StatusMap   = Record<number, 'present' | 'absent'>;
type SaveState   = 'saving' | 'saved' | 'error';
type SaveStateMap = Record<number, SaveState>;

// ─── Single person row ────────────────────────────────────────────────────────
const PersonRowItem: React.FC<{
  person: PersonRow;
  effective: 'present' | 'absent' | null;
  saveState: SaveState | undefined;
  canManage: boolean;
  onToggle: (pid: number) => void;
}> = ({ person, effective, saveState, canManage, onToggle }) => {
  const isPresent = effective === 'present';
  const isAbsent  = effective === 'absent';
  const initials = person.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 hover:bg-paper/50 transition-colors">
      {/* Person info */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: isPresent ? '#4C7A63' : 'linear-gradient(155deg, #7C2D3B, #4E1B26)' }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-bold text-ink leading-tight truncate">{person.full_name}</p>
          {person.mobile_number && (
            <p className="text-[11px] text-ink-muted">{person.mobile_number}</p>
          )}
        </div>
      </div>

      {/* Right side: save indicator + toggle */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="w-4 h-4 flex items-center justify-center">
          {saveState === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin text-ink-soft" />}
          {saveState === 'saved'  && <Check  className="w-3.5 h-3.5 text-sage font-bold" />}
          {saveState === 'error'  && <span className="text-rose text-xs font-bold">!</span>}
        </span>

        {canManage ? (
          <button
            onClick={() => onToggle(person.person_id)}
            disabled={saveState === 'saving'}
            aria-label={isPresent ? 'Mark absent' : 'Mark present'}
            className={`
              min-w-[64px] h-8 px-2 rounded-xl border text-xs font-bold tracking-wide
              transition-all duration-150 active:scale-95 select-none disabled:opacity-60 flex items-center justify-center gap-1
              ${isPresent
                ? 'bg-sage border-sage text-white shadow-sm'
                : 'bg-white border-surface-line text-ink-muted hover:border-ink-muted hover:text-ink'}
            `}
          >
            {isPresent ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>P</span>
              </>
            ) : (
              <span>ABSENT</span>
            )}
          </button>
        ) : (
          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
            isPresent ? 'bg-sage-soft text-sage' : isAbsent ? 'bg-rose-soft text-rose' : 'bg-paper text-ink-muted'
          }`}>
            {isPresent ? 'Present' : isAbsent ? 'Absent' : 'Unmarked'}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Group Card ───────────────────────────────────────────────────────────────
const GroupCard: React.FC<{
  section: GroupSection;
  statuses: StatusMap;
  saveStates: SaveStateMap;
  markingAll: boolean;
  onToggle: (pid: number) => void;
  onMarkAll: (gid: number | null, s: 'present' | 'absent') => void;
}> = ({ section, statuses, saveStates, markingAll, onToggle, onMarkAll }) => {
  const [collapsed, setCollapsed] = useState(false);
  const people = section.people;

  const presentCount = people.filter(p => (statuses[p.person_id] ?? p.status) === 'present').length;
  const totalCount   = people.length;
  const rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3.5 cursor-pointer select-none bg-white hover:bg-paper/40 transition-colors"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-paper text-ink border border-surface-line flex items-center justify-center flex-shrink-0">
            {section.canManage ? <Users className="w-4 h-4 text-ink-soft" /> : <Eye className="w-4 h-4 text-ink-muted" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-display font-bold text-ink text-sm leading-tight">{section.groupName}</span>
              {!section.canManage && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-ink-muted font-medium">
                  <Lock className="w-3 h-3" /> View only
                </span>
              )}
            </div>
            <span className="text-[11px] text-ink-muted font-semibold">
              <strong className="text-ink font-bold">{presentCount}</strong> / {totalCount} present
              {totalCount > 0 && ` · ${rate}% turnout`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="hidden sm:block w-20 h-1.5 bg-paper rounded-full overflow-hidden border border-surface-line">
            <div className="h-full bg-sage rounded-full transition-all duration-300" style={{ width: `${rate}%` }} />
          </div>
          <ChevronDown className={`w-4 h-4 text-ink-muted transition-transform duration-200 flex-shrink-0 ${collapsed ? '-rotate-90' : ''}`} />
        </div>
      </div>

      {!collapsed && (
        <>
          {section.canManage && people.length > 0 && (
            <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-b border-surface-soft bg-paper/50">
              <button
                onClick={(e) => { e.stopPropagation(); onMarkAll(section.groupId, 'present'); }}
                disabled={markingAll}
                className="pill-btn pill-ghost py-1 px-2.5 text-[11px]"
              >
                <Check className="w-3 h-3 text-sage" />
                <span>Mark All Present</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMarkAll(section.groupId, 'absent'); }}
                disabled={markingAll}
                className="pill-btn pill-ghost py-1 px-2.5 text-[11px]"
              >
                <X className="w-3 h-3 text-rose" />
                <span>Mark All Absent</span>
              </button>
            </div>
          )}

          <div className="divide-y divide-surface-soft">
            {people.map(person => {
              const effective = (statuses[person.person_id] ?? person.status) as 'present' | 'absent' | null;
              const saveState = saveStates[person.person_id];
              return (
                <PersonRowItem
                  key={person.person_id}
                  person={person}
                  effective={effective}
                  saveState={saveState}
                  canManage={section.canManage}
                  onToggle={onToggle}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Main View ────────────────────────────────────────────────────────────────
const AttendanceView: React.FC = () => {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [occasions, setOccasions] = useState<AttendanceOccasion[]>([]);
  const [selectedOccasion, setSelectedOccasion] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchOccasion, setSearchOccasion] = useState('');
  const [sections, setSections] = useState<GroupSection[]>([]);
  const [statuses, setStatuses] = useState<StatusMap>({});
  const [saveStates, setSaveStates] = useState<SaveStateMap>({});
  const [markingAllGroup, setMarkingAllGroup] = useState<number | null | false>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const dateRef     = useRef(date);
  const occasionRef = useRef(selectedOccasion);
  useEffect(() => { dateRef.current = date; }, [date]);
  useEffect(() => { occasionRef.current = selectedOccasion; }, [selectedOccasion]);

  // ── Save a single person record ──────────────────────────────────────────
  const saveSingle = useCallback(async (
    personId: number,
    groupId: number | null,
    status: 'present' | 'absent'
  ) => {
    setSaveStates(prev => ({ ...prev, [personId]: 'saving' }));
    try {
      const res = await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateRef.current,
          occasion_id: parseInt(occasionRef.current),
          group_id: groupId,
          records: [{ person_id: personId, status }],
        }),
      });
      if (res.ok) {
        setSaveStates(prev => ({ ...prev, [personId]: 'saved' }));
        setSections(prev => prev.map(s =>
          s.groupId === groupId
            ? { ...s, people: s.people.map(p => p.person_id === personId ? { ...p, status } : p) }
            : s
        ));
        setTimeout(() => setSaveStates(prev => {
          const n = { ...prev };
          if (n[personId] === 'saved') delete n[personId];
          return n;
        }), 2000);
      } else {
        setSaveStates(prev => ({ ...prev, [personId]: 'error' }));
      }
    } catch {
      setSaveStates(prev => ({ ...prev, [personId]: 'error' }));
    }
  }, []);

  // ── Toggle a single person (present ↔ absent) ────────────────────────────
  const handleToggle = useCallback((pid: number) => {
    const section = sections.find(sec => sec.people.some(p => p.person_id === pid));
    if (!section) return;
    const currentStatus = statuses[pid] ?? section.people.find(p => p.person_id === pid)?.status;
    const newStatus: 'present' | 'absent' = currentStatus === 'present' ? 'absent' : 'present';
    setStatuses(prev => ({ ...prev, [pid]: newStatus }));
    saveSingle(pid, section.groupId, newStatus);
  }, [sections, statuses, saveSingle]);

  // ── Mark all in a group ──────────────────────────────────────────────────
  const handleMarkAll = useCallback(async (groupId: number | null, s: 'present' | 'absent') => {
    const section = sections.find(sec => sec.groupId === groupId);
    if (!section) return;
    setMarkingAllGroup(groupId);

    const updates: StatusMap = {};
    section.people.forEach(p => { updates[p.person_id] = s; });
    setStatuses(prev => ({ ...prev, ...updates }));

    const savingMap: SaveStateMap = {};
    section.people.forEach(p => { savingMap[p.person_id] = 'saving'; });
    setSaveStates(prev => ({ ...prev, ...savingMap }));

    try {
      const res = await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateRef.current,
          occasion_id: parseInt(occasionRef.current),
          group_id: groupId,
          records: section.people.map(p => ({ person_id: p.person_id, status: s })),
        }),
      });
      const resultState: 'saved' | 'error' = res.ok ? 'saved' : 'error';
      const resultMap: SaveStateMap = {};
      section.people.forEach(p => { resultMap[p.person_id] = resultState; });
      setSaveStates(prev => ({ ...prev, ...resultMap }));
      if (res.ok) {
        setSections(prev => prev.map(sec =>
          sec.groupId === groupId
            ? { ...sec, people: sec.people.map(p => ({ ...p, status: s })) }
            : sec
        ));
        setTimeout(() => {
          setSaveStates(prev => {
            const n = { ...prev };
            section.people.forEach(p => { if (n[p.person_id] === 'saved') delete n[p.person_id]; });
            return n;
          });
        }, 2000);
      }
    } catch {
      const errMap: SaveStateMap = {};
      section.people.forEach(p => { errMap[p.person_id] = 'error'; });
      setSaveStates(prev => ({ ...prev, ...errMap }));
    }
    setMarkingAllGroup(false);
  }, [sections]);

  // ── Load occasions ───────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/attendance/occasions')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setOccasions(data);
          setSelectedOccasion(String(data[0].id));
        } else {
          setOccasions(data || []);
        }
      })
      .catch(() => {});
  }, []);

  // ── Load dashboard ───────────────────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    if (!selectedOccasion) return;
    setLoading(true);
    setError('');
    setStatuses({});
    setSaveStates({});
    try {
      const res = await fetch(
        `/api/attendance/dashboard?date=${date}&occasion_id=${selectedOccasion}`
      );
      const data = await res.json();
      if (!res.ok) { setError(data.error); setSections([]); }
      else setSections(data.sections || []);
    } catch {
      setError('Failed to load attendance data');
    }
    setLoading(false);
  }, [date, selectedOccasion]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // ── Summary ──────────────────────────────────────────────────────────────
  const totalPresent = sections.reduce((a, s) =>
    a + s.people.filter(p => (statuses[p.person_id] ?? p.status) === 'present').length, 0);
  const totalPeople = sections.reduce((a, s) => a + s.people.length, 0);
  const totalRemaining = Math.max(totalPeople - totalPresent, 0);
  const overallRate = totalPeople > 0 ? Math.round((totalPresent / totalPeople) * 100) : 0;

  const currentOccasionObj = occasions.find(o => String(o.id) === String(selectedOccasion)) || occasions[0];

  return (
    <div className="px-4 pb-4 max-w-7xl mx-auto space-y-3">
      {/* Page head */}
      <div className="pt-2 pb-2">
        <h1 className="page-title">Mark attendance</h1>
        <p className="page-subtitle">Choose an occasion, then tap each name to mark it.</p>
      </div>

      {/* Occasion & Date Selection Toolbar */}
      <div className="card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Occasion Mobile-Friendly Picker Trigger */}
        <div className="relative flex-1 min-w-[220px]">
          <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">
            Selected Occasion
          </label>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full h-12 px-3.5 bg-paper border border-surface-line hover:border-maroon/40 rounded-xl flex items-center justify-between text-left transition-all active:scale-[0.99] group shadow-sm"
          >
            <div className="min-w-0 pr-2">
              <span className="block text-sm font-bold text-ink truncate group-hover:text-maroon transition-colors">
                {currentOccasionObj ? currentOccasionObj.name : 'Select Occasion...'}
              </span>
              {currentOccasionObj?.description && (
                <span className="block text-[11px] text-ink-muted truncate">
                  {currentOccasionObj.description}
                </span>
              )}
            </div>
            <div className="w-8 h-8 rounded-lg bg-surface-soft flex items-center justify-center text-ink-muted group-hover:text-maroon shrink-0">
              <ChevronDown className="w-4 h-4" />
            </div>
          </button>
        </div>

        {/* Date Picker & Refresh */}
        <div className="flex items-end gap-2">
          <div className="flex-1 sm:flex-initial">
            <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full sm:w-auto"
            />
          </div>

          <button
            onClick={loadDashboard}
            className="h-12 w-12 rounded-xl bg-paper border border-surface-line hover:bg-surface-soft text-ink-soft flex items-center justify-center transition-all flex-shrink-0 shadow-sm"
            title="Refresh Attendance"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats bento */}
      {!loading && totalPeople > 0 && (
        <div className="grid grid-cols-3 gap-2.5">
          <div className="card p-3 text-center">
            <b className="font-display font-semibold block text-sage text-xl">{totalPresent}</b>
            <span className="text-[10px] font-bold text-sage">PRESENT</span>
          </div>
          <div className="card p-3 text-center">
            <b className="font-display font-semibold block text-ink-muted text-xl">{totalRemaining}</b>
            <span className="text-[10px] font-bold text-ink-muted">REMAINING</span>
          </div>
          <div className="card p-3 text-center">
            <b className="font-display font-semibold block text-marigold text-xl">{overallRate}%</b>
            <span className="text-[10px] font-bold text-marigold">TURNOUT</span>
          </div>
        </div>
      )}

      {error && <p className="text-rose text-xs bg-rose-soft border border-rose-soft rounded-xl px-3 py-2 font-medium">{error}</p>}

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-gray-700" /> Loading sabha list…
        </div>
      )}

      {!loading && occasions.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-gray-400">
          <BarChart2 className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium">No occasions created yet</p>
          {(user?.role === 'admin' || user?.role === 'viewer_admin') && (
            <p className="text-sm mt-1">Go to <strong>Occasions</strong> in the sidebar to create one first.</p>
          )}
        </div>
      )}

      {!loading && sections.length > 0 && (
        <div className="space-y-3">
          {sections.map(section => (
            <GroupCard
              key={section.groupId ?? 'ungrouped'}
              section={section}
              statuses={statuses}
              saveStates={saveStates}
              markingAll={markingAllGroup === section.groupId}
              onToggle={handleToggle}
              onMarkAll={handleMarkAll}
            />
          ))}
        </div>
      )}

      {!loading && sections.length === 0 && selectedOccasion && !error && (
        <div className="card p-12 flex flex-col items-center justify-center text-gray-400">
          <Users className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium">No groups or people to show</p>
        </div>
      )}

      {/* Mobile-Friendly Occasion Picker Sheet */}
      {pickerOpen && (
        <div className="sheet-backdrop open" onClick={() => setPickerOpen(false)}>
          <div
            className="sheet open max-w-lg mx-auto"
            onClick={e => e.stopPropagation()}
            style={{ zIndex: 60 }}
          >
            <div className="sheet-grabber" />

            <div className="flex items-center justify-between pb-3 mb-3 border-b border-surface-soft">
              <div>
                <h3 className="font-display font-bold text-ink text-base">Select Occasion</h3>
                <p className="text-xs text-ink-muted font-medium">Choose which event to take attendance for</p>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="roundbtn"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {occasions.length > 4 && (
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchOccasion}
                  onChange={e => setSearchOccasion(e.target.value)}
                  placeholder="Search occasion by name..."
                  className="w-full h-11 pl-9 pr-3 text-xs sm:text-sm font-semibold bg-surface-soft border border-surface-line rounded-xl text-ink outline-none focus:border-maroon"
                />
              </div>
            )}

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1 pb-4">
              {occasions
                .filter(o => o.name.toLowerCase().includes(searchOccasion.toLowerCase()))
                .map(o => {
                  const isSelected = String(o.id) === String(selectedOccasion);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        setSelectedOccasion(String(o.id));
                        setPickerOpen(false);
                        setSearchOccasion('');
                      }}
                      className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-left transition-all active:scale-[0.99] min-h-[52px] ${
                        isSelected
                          ? 'bg-marigold-soft/60 border-marigold shadow-sm'
                          : 'bg-paper border-surface-line hover:bg-surface-soft'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <p className={`text-sm font-bold truncate ${isSelected ? 'text-maroon' : 'text-ink'}`}>
                          {o.name}
                        </p>
                        {o.description && (
                          <p className="text-xs text-ink-muted truncate mt-0.5">{o.description}</p>
                        )}
                      </div>
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-maroon text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-surface-line shrink-0" />
                      )}
                    </button>
                  );
                })}
              {occasions.length === 0 && (
                <p className="text-center text-xs text-ink-muted py-6">No occasions available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceView;

