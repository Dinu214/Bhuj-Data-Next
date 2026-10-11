'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Download, CheckCircle2, XCircle, MinusCircle, Loader2, Search,
  BarChart3, PieChart, TrendingUp, UsersRound,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AttendanceRecord, AttendanceOccasion, Group } from '@/types';
import * as XLSX from 'xlsx';
import SelectSheet from './SelectSheet';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'present') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
        <CheckCircle2 className="w-3 h-3" /> Present
      </span>
    );
  }
  if (status === 'leave') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
        <MinusCircle className="w-3 h-3" /> Leave
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
      <XCircle className="w-3 h-3" /> Absent
    </span>
  );
};

interface AttendanceReportProps {
  onViewChange?: (view: string, id?: number) => void;
}

const AttendanceReport: React.FC<AttendanceReportProps> = () => {
  const { user, canManageGroup } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [occasions, setOccasions] = useState<AttendanceOccasion[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(monthAgo);
  const [toDate, setToDate] = useState(today);
  const [occasionFilter, setOccasionFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [viewMode, setViewMode] = useState<'both' | 'charts' | 'table'>('both');

  useEffect(() => {
    const load = async () => {
      try {
        const [oRes, gRes] = await Promise.all([
          fetch('/api/attendance/occasions'),
          fetch('/api/groups'),
        ]);
        const occ = await oRes.json();
        const grp = await gRes.json();
        setOccasions(Array.isArray(occ) ? occ : []);
        const allGroups = Array.isArray(grp) ? grp : [];
        const isPrivileged = user?.role === 'admin' || user?.role === 'viewer_admin';
        const accessible = isPrivileged ? allGroups : allGroups.filter((g: Group) => canManageGroup(g.group_id));
        setGroups(accessible);
      } catch {
        setOccasions([]);
        setGroups([]);
      }
    };
    load();
  }, [user?.role, canManageGroup]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/attendance/report?from_date=${fromDate}&to_date=${toDate}`;
      if (occasionFilter) url += `&occasion_id=${occasionFilter}`;
      if (groupFilter) url += `&group_id=${groupFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, occasionFilter, groupFilter]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const deduped = useMemo(() => {
    if (occasionFilter) return records;
    const seen = new Set<number>();
    return records.filter(r => {
      if (seen.has(r.person_id)) return false;
      seen.add(r.person_id);
      return true;
    });
  }, [records, occasionFilter]);

  const filtered = useMemo(() => {
    return deduped.filter(r =>
      !nameSearch || r.full_name.toLowerCase().includes(nameSearch.toLowerCase())
    );
  }, [deduped, nameSearch]);

  const totalCount = filtered.length;
  const presentCount = filtered.filter(r => r.status === 'present').length;
  const absentCount = filtered.filter(r => r.status === 'absent').length;
  const overallRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const groupByStats = useMemo(() => {
    const map: Record<string, { groupName: string; total: number; present: number; absent: number }> = {};
    filtered.forEach(r => {
      const gname = r.group_name || 'Ungrouped';
      if (!map[gname]) map[gname] = { groupName: gname, total: 0, present: 0, absent: 0 };
      map[gname].total += 1;
      if (r.status === 'present') map[gname].present += 1;
      else map[gname].absent += 1;
    });

    return Object.values(map)
      .map(g => ({
        ...g,
        rate: g.total > 0 ? Math.round((g.present / g.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const dateByStats = useMemo(() => {
    const map: Record<string, { date: string; total: number; present: number }> = {};
    filtered.forEach(r => {
      const d = r.attendance_date.split('T')[0];
      if (!map[d]) map[d] = { date: d, total: 0, present: 0 };
      map[d].total += 1;
      if (r.status === 'present') map[d].present += 1;
    });

    return Object.values(map)
      .map(d => ({
        ...d,
        rate: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
        formatted: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  const exportData = () => {
    const rows = filtered.map(r => ({
      Name: r.full_name,
      Date: new Date(r.attendance_date).toLocaleDateString('en-IN'),
      Occasion: r.occasion_name,
      Group: r.group_name || '',
      Status: r.status,
      'Marked By': r.marked_by_name || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `attendance_report_${fromDate}_to_${toDate}.xlsx`);
  };

  const circumference = 2 * Math.PI * 34;
  const presentOffset = circumference - (overallRate / 100) * circumference;

  return (
    <div className="px-4 pb-4 max-w-7xl mx-auto space-y-3">
      {/* Page head */}
      <div className="pt-2 pb-2">
        <h1 className="page-title">Attendance report</h1>
        <p className="page-subtitle">Filter, review and export attendance across any period.</p>
      </div>

      {/* Toolbar & View mode */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center bg-paper p-1 rounded-xl border border-surface-line text-xs font-bold">
          <button
            onClick={() => setViewMode('both')}
            className={`px-3 py-1 rounded-lg transition-all ${viewMode === 'both' ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
          >
            All
          </button>
          <button
            onClick={() => setViewMode('charts')}
            className={`px-3 py-1 rounded-lg transition-all ${viewMode === 'charts' ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
          >
            Charts
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
          >
            Table
          </button>
        </div>

        <button
          onClick={exportData}
          disabled={filtered.length === 0}
          className="pill-btn pill-solid py-2 px-3.5 text-xs flex items-center gap-1.5 disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* Filters card */}
      <div className="card p-3 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* From Date */}
          <div className="flex items-center gap-1.5 bg-paper border border-surface-line rounded-xl px-2.5 py-1">
            <span className="text-[10px] font-bold text-ink-muted uppercase">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="text-xs bg-transparent outline-none text-ink font-semibold"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-1.5 bg-paper border border-surface-line rounded-xl px-2.5 py-1">
            <span className="text-[10px] font-bold text-ink-muted uppercase">To</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="text-xs bg-transparent outline-none text-ink font-semibold"
            />
          </div>

          {/* Occasion */}
          <SelectSheet
            label="Occasion"
            placeholder="All Occasions"
            value={occasionFilter}
            onChange={(val) => setOccasionFilter(String(val))}
            options={[
              { value: '', label: 'All Occasions' },
              ...occasions.map(o => ({ value: String(o.id), label: o.name })),
            ]}
            buttonClassName="h-9 px-3 text-xs"
            className="min-w-[130px] flex-1 sm:flex-initial"
          />

          {/* Group */}
          <SelectSheet
            label="Group"
            placeholder="All Groups"
            value={groupFilter}
            onChange={(val) => setGroupFilter(String(val))}
            options={[
              { value: '', label: 'All Groups' },
              ...((user?.role === 'admin' || user?.role === 'viewer_admin')
                ? [{ value: 'ungrouped', label: 'No Group (Ungrouped)' }]
                : []),
              ...groups.map(g => ({ value: String(g.group_id), label: g.group_name })),
            ]}
            buttonClassName="h-9 px-3 text-xs"
            className="min-w-[120px] flex-1 sm:flex-initial"
          />

          {/* Search by name */}
          <div className="relative flex-1 min-w-[130px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />
            <input
              type="text"
              placeholder="Search member…"
              value={nameSearch}
              onChange={e => setNameSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-2.5 text-xs bg-paper border border-surface-line rounded-xl text-ink placeholder-ink-muted outline-none focus:border-maroon"
            />
          </div>
        </div>
      </div>

      {/* Report Bento Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="card p-3.5 text-center">
          <b className="font-display font-semibold block text-sage text-2xl">{presentCount}</b>
          <span className="text-[10px] font-bold text-sage">PRESENT</span>
        </div>
        <div className="card p-3.5 text-center">
          <b className="font-display font-semibold block text-rose text-2xl">{absentCount}</b>
          <span className="text-[10px] font-bold text-rose">ABSENT</span>
        </div>
        <div className="card p-3.5 text-center">
          <b className="font-display font-semibold block text-dusk text-2xl">{totalCount}</b>
          <span className="text-[10px] font-bold text-dusk">RECORDS</span>
        </div>
        <div className="card p-3.5 text-center">
          <b className="font-display font-semibold block text-marigold text-2xl">{overallRate}%</b>
          <span className="text-[10px] font-bold text-marigold">RATE</span>
        </div>
      </div>

      {/* Present vs Absent Horizontal Comparison Bar */}
      {totalCount > 0 && (
        <div className="card p-3.5">
          <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">PRESENT VS ABSENT</p>
          <div className="h-3 rounded-full bg-paper flex overflow-hidden border border-surface-line mb-2">
            <div
              className="h-full bg-sage transition-all duration-500"
              style={{ width: `${(presentCount / totalCount) * 100}%` }}
            />
            <div
              className="h-full bg-rose-soft transition-all duration-500"
              style={{ width: `${(absentCount / totalCount) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-sage">
              <span className="w-2.5 h-2.5 rounded-full bg-sage" />
              <span>Present · {presentCount} ({overallRate}%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-rose">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-soft border border-rose" />
              <span>Absent · {absentCount} ({100 - overallRate}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* CHARTS & VISUAL ANALYTICS */}
      {(viewMode === 'both' || viewMode === 'charts') && filtered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* 1. Turnout Overview Donut Card */}
          <div className="card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-800 flex items-center justify-center">
                  <PieChart className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-gray-900 text-xs sm:text-sm">Turnout Overview</h3>
                  <p className="text-[10px] text-gray-400">Present vs Absent ratio</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center my-3">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" className="text-rose-100" strokeWidth="7" stroke="currentColor" fill="transparent" />
                  <circle
                    cx="40" cy="40" r="34"
                    className="text-emerald-500 transition-all duration-700"
                    strokeWidth="7"
                    strokeDasharray={circumference}
                    strokeDashoffset={presentOffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-base font-display font-extrabold text-gray-900">{overallRate}%</span>
                  <span className="text-[9px] text-gray-400 font-semibold uppercase">Turnout</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-center">
              <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                <p className="text-[10px] text-emerald-700 font-medium">Present</p>
                <p className="text-xs font-bold text-emerald-900">{presentCount}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-rose-50/70 border border-rose-100">
                <p className="text-[10px] text-rose-700 font-medium">Absent</p>
                <p className="text-xs font-bold text-rose-900">{absentCount}</p>
              </div>
            </div>
          </div>

          {/* 2. Group-Wise Attendance Comparison */}
          <div className="card p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-800 flex items-center justify-center">
                    <UsersRound className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-gray-900 text-xs sm:text-sm">Group Performance</h3>
                    <p className="text-[10px] text-gray-400">Attendance comparison by group</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 my-1 max-h-44 overflow-y-auto pr-1">
                {groupByStats.map(g => (
                  <div key={g.groupName} className="p-2 rounded-lg bg-gray-50/70 border border-gray-100">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-gray-800 truncate max-w-[120px]">{g.groupName}</span>
                      <span className="text-[11px] text-gray-500">
                        {g.present}/{g.total} · <strong className={g.rate >= 75 ? 'text-emerald-700' : 'text-gray-900'}>{g.rate}%</strong>
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          g.rate >= 80 ? 'bg-emerald-500' : g.rate >= 50 ? 'bg-gray-800' : 'bg-rose-400'
                        }`}
                        style={{ width: `${g.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 mt-2">
              <span>{groupByStats.length} Groups Logged</span>
            </div>
          </div>

          {/* 3. Sabha Timeline Trend Bar Chart */}
          <div className="card p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-800 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-gray-900 text-xs sm:text-sm">Sabha Trend Timeline</h3>
                    <p className="text-[10px] text-gray-400">Turnout rate per sabha date</p>
                  </div>
                </div>
              </div>

              {dateByStats.length > 0 ? (
                <div className="h-32 flex items-end gap-2 px-1 pt-2 pb-1 border-b border-gray-100 my-1 overflow-x-auto">
                  {dateByStats.map((d, i) => (
                    <div key={i} className="flex-1 min-w-[32px] flex flex-col items-center gap-1 h-full justify-end group">
                      <span className="text-[9px] font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        {d.rate}%
                      </span>
                      <div className="w-full max-w-[24px] bg-gray-100 rounded-t-md overflow-hidden h-full flex items-end">
                        <div
                          className={`w-full rounded-t-md transition-all duration-500 ${
                            d.rate >= 80 ? 'bg-emerald-500' : d.rate >= 50 ? 'bg-gray-800' : 'bg-rose-400'
                          }`}
                          style={{ height: `${Math.max(6, d.rate)}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-gray-400 truncate max-w-full text-center mt-0.5">
                        {d.formatted}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-400 text-xs">No sabha dates in range</div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 mt-2">
              <span>{dateByStats.length} Dates Logged</span>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED RECORDS TABLE */}
      {(viewMode === 'both' || viewMode === 'table') && (
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-gray-700" /> Loading records…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <BarChart3 className="w-8 h-8 mb-2 text-gray-300" />
              <p className="font-semibold text-gray-700 text-sm">No records found</p>
              <p className="text-xs text-gray-400 mt-0.5">Try adjusting your date range or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Name</th>
                    <th className="py-2.5 px-3 font-semibold">Date</th>
                    <th className="py-2.5 px-3 font-semibold">Occasion</th>
                    <th className="py-2.5 px-3 font-semibold">Group</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold hidden lg:table-cell">Marked By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-gray-900">{r.full_name}</td>
                      <td className="py-2.5 px-3 text-gray-500">{new Date(r.attendance_date).toLocaleDateString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-gray-600">{r.occasion_name}</td>
                      <td className="py-2.5 px-3">
                        {r.group_name ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200/60">
                            {r.group_name}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3"><StatusBadge status={r.status} /></td>
                      <td className="py-2.5 px-3 text-gray-400 hidden lg:table-cell">{r.marked_by_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceReport;

