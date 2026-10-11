import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth, JwtPayload } from '@/lib/auth';

export const GET = withAuth(async (req: NextRequest, user: JwtPayload) => {
  const { searchParams } = new URL(req.url);
  const from_date = searchParams.get('from_date');
  const to_date = searchParams.get('to_date');
  const occasion_id = searchParams.get('occasion_id');
  const group_id = searchParams.get('group_id');

  if (!from_date || !to_date) {
    return NextResponse.json({ error: 'from_date and to_date required' }, { status: 400 });
  }

  try {
    const isAdmin = user.role === 'admin' || user.role === 'viewer_admin';
    let allowedGroupIds: number[] | null = null;

    if (!isAdmin) {
      allowedGroupIds = user.groupAccess || [];
      if (allowedGroupIds.length === 0) return NextResponse.json([]);
    }
    if (group_id) {
      const gid = parseInt(group_id);
      if (!isAdmin && allowedGroupIds && !allowedGroupIds.includes(gid)) {
        return NextResponse.json({ error: 'Access denied to this group' }, { status: 403 });
      }
      allowedGroupIds = [gid];
    }

    let occQuery = `
      SELECT DISTINCT ao.id as occasion_id, ao.name as occasion_name, ar.attendance_date
      FROM attendance_occasions ao
      JOIN attendance_records ar ON ar.occasion_id = ao.id
      WHERE ar.attendance_date BETWEEN $1 AND $2
    `;
    const occParams: any[] = [from_date, to_date];
    if (occasion_id) {
      occParams.push(occasion_id);
      occQuery += ` AND ao.id = $${occParams.length}`;
    }
    const occRes = await pool.query(occQuery, occParams);
    const sessions = occRes.rows;
    if (sessions.length === 0) return NextResponse.json([]);

    let peopleQuery = '';
    const peopleParams: any[] = [];

    if (group_id) {
      if (group_id === 'ungrouped' || group_id === '0') {
        if (!isAdmin) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        peopleQuery = `
          SELECT p.person_id, p.full_name, p.mobile_number, 0 as group_id, 'No Group' as group_name
          FROM people p
          LEFT JOIN person_group pg ON pg.person_id = p.person_id
          WHERE pg.person_id IS NULL
          ORDER BY p.full_name
        `;
      } else {
        const gid = parseInt(group_id);
        if (!isAdmin && !allowedGroupIds?.includes(gid)) {
          return NextResponse.json({ error: 'Access denied to this group' }, { status: 403 });
        }
        peopleQuery = `
          SELECT p.person_id, p.full_name, p.mobile_number, g.group_id, g.group_name
          FROM people p
          JOIN person_group pg ON pg.person_id = p.person_id
          JOIN groups g ON g.group_id = pg.group_id
          WHERE g.group_id = $1
          ORDER BY g.group_name, p.full_name
        `;
        peopleParams.push(gid);
      }
    } else if (allowedGroupIds) {
      peopleQuery = `
        SELECT p.person_id, p.full_name, p.mobile_number, g.group_id, g.group_name
        FROM people p
        JOIN person_group pg ON pg.person_id = p.person_id
        JOIN groups g ON g.group_id = pg.group_id
        WHERE g.group_id = ANY($1)
        ORDER BY g.group_name, p.full_name
      `;
      peopleParams.push(allowedGroupIds);
    } else {
      // Admin / Viewer Admin viewing All Groups: include all members, with 'No Group' for ungrouped
      peopleQuery = `
        SELECT p.person_id, p.full_name, p.mobile_number,
               COALESCE(g.group_id, 0) as group_id,
               COALESCE(g.group_name, 'No Group') as group_name
        FROM people p
        LEFT JOIN person_group pg ON pg.person_id = p.person_id
        LEFT JOIN groups g ON g.group_id = pg.group_id
        ORDER BY COALESCE(g.group_name, 'No Group'), p.full_name
      `;
    }

    const peopleRes = await pool.query(peopleQuery, peopleParams);
    const people = peopleRes.rows;
    if (people.length === 0) return NextResponse.json([]);

    let arQuery = `
      SELECT ar.person_id, ar.occasion_id, ar.attendance_date, ar.status,
             u.display_name as marked_by_name
      FROM attendance_records ar
      LEFT JOIN app_users u ON u.id = ar.marked_by_user_id
      WHERE ar.attendance_date BETWEEN $1 AND $2
    `;
    const arParams: any[] = [from_date, to_date];
    if (occasion_id) {
      arParams.push(occasion_id);
      arQuery += ` AND ar.occasion_id = $${arParams.length}`;
    }
    const arRes = await pool.query(arQuery, arParams);

    const attMap: Record<string, any> = {};
    arRes.rows.forEach(r => {
      const d = r.attendance_date instanceof Date
        ? r.attendance_date.toISOString().split('T')[0]
        : String(r.attendance_date).split('T')[0];
      attMap[`${r.person_id}-${r.occasion_id}-${d}`] = r;
    });

    const uniqueSessions: any[] = [];
    const seen = new Set<string>();
    for (const s of sessions) {
      const d = s.attendance_date instanceof Date
        ? s.attendance_date.toISOString().split('T')[0]
        : String(s.attendance_date).split('T')[0];
      const sk = `${s.occasion_id}-${d}`;
      if (!seen.has(sk)) {
        seen.add(sk);
        uniqueSessions.push({ ...s, dateStr: d });
      }
    }

    const uniquePeopleMap = new Map<number, any>();
    for (const p of people) {
      if (!uniquePeopleMap.has(p.person_id)) {
        uniquePeopleMap.set(p.person_id, { ...p, groups: [p.group_name] });
      } else {
        const existing = uniquePeopleMap.get(p.person_id);
        if (p.group_name && !existing.groups.includes(p.group_name)) {
          existing.groups.push(p.group_name);
          existing.group_name = existing.groups.join(', ');
        }
      }
    }
    const distinctPeople = Array.from(uniquePeopleMap.values());

    const result: any[] = [];
    let rowId = 0;

    if (!occasion_id) {
      const totalSessions = uniqueSessions.length;
      for (const person of distinctPeople) {
        let presentCount = 0;
        let leaveCount = 0;
        let lastMarkedBy = null;

        for (const session of uniqueSessions) {
          const key = `${person.person_id}-${session.occasion_id}-${session.dateStr}`;
          const att = attMap[key];
          if (att?.status === 'present') {
            presentCount++;
            if (att.marked_by_name) lastMarkedBy = att.marked_by_name;
          } else if (att?.status === 'leave') {
            leaveCount++;
          }
        }

        const isPresentInAll = totalSessions > 0 && presentCount === totalSessions;
        const status = isPresentInAll
          ? 'present'
          : (leaveCount > 0 && presentCount + leaveCount === totalSessions ? 'leave' : 'absent');

        result.push({
          id: ++rowId,
          person_id: person.person_id,
          full_name: person.full_name,
          mobile_number: person.mobile_number,
          group_id: person.group_id,
          group_name: person.group_name,
          occasion_id: 0,
          occasion_name: totalSessions > 1 ? `All Occasions (${presentCount}/${totalSessions})` : (uniqueSessions[0]?.occasion_name || 'All Occasions'),
          attendance_date: to_date,
          status,
          marked_by_name: lastMarkedBy,
        });
      }
    } else {
      for (const person of distinctPeople) {
        for (const session of uniqueSessions) {
          const key = `${person.person_id}-${session.occasion_id}-${session.dateStr}`;
          const att = attMap[key];
          result.push({
            id: ++rowId,
            person_id: person.person_id,
            full_name: person.full_name,
            mobile_number: person.mobile_number,
            group_id: person.group_id,
            group_name: person.group_name,
            occasion_id: session.occasion_id,
            occasion_name: session.occasion_name,
            attendance_date: session.dateStr,
            status: att ? att.status : 'absent',
            marked_by_name: att ? att.marked_by_name : null,
          });
        }
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

