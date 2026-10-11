import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth, JwtPayload, hasPermission } from '@/lib/auth';

export const GET = withAuth(async (req: NextRequest, user: JwtPayload) => {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const occasion_id = searchParams.get('occasion_id');

  if (!date || !occasion_id) {
    return NextResponse.json({ error: 'date and occasion_id required' }, { status: 400 });
  }

  try {
    const [groupsRes, peopleRes, pgRes, attRes] = await Promise.all([
      pool.query('SELECT * FROM groups ORDER BY group_name'),
      pool.query('SELECT * FROM people ORDER BY full_name'),
      pool.query('SELECT * FROM person_group'),
      pool.query(
        'SELECT person_id, status FROM attendance_records WHERE attendance_date=$1 AND occasion_id=$2',
        [date, occasion_id]
      ),
    ]);

    const groups = groupsRes.rows;
    const people = peopleRes.rows;
    const personGroups = pgRes.rows;

    const attMap: Record<number, string> = {};
    attRes.rows.forEach(r => { attMap[r.person_id] = r.status; });

    const personGroupMap: Record<number, number[]> = {};
    personGroups.forEach(pg => {
      if (!personGroupMap[pg.person_id]) personGroupMap[pg.person_id] = [];
      personGroupMap[pg.person_id].push(pg.group_id);
    });

    const isPrivileged = user.role === 'admin' || user.role === 'viewer_admin';
    const userGroupAccess = user.groupAccess || [];
    const canManageAttendance = hasPermission(user, 'attendance:manage');
    const canReadAttendance = hasPermission(user, 'attendance:read');

    if (!isPrivileged && !canManageAttendance && !canReadAttendance) {
      return NextResponse.json({ error: 'No attendance access' }, { status: 403 });
    }

    const sections = [];

    for (const group of groups) {
      const canManageThisGroup = isPrivileged || (canManageAttendance && userGroupAccess.includes(group.group_id));
      const canSeeGroup = isPrivileged || canManageThisGroup || canReadAttendance;
      if (!canSeeGroup) continue;

      const groupPeople = people.filter(p =>
        (personGroupMap[p.person_id] || []).includes(group.group_id)
      ).map(p => ({
        person_id: p.person_id,
        full_name: p.full_name,
        mobile_number: p.mobile_number,
        status: attMap[p.person_id] || null,
      }));

      sections.push({
        groupId: group.group_id,
        groupName: group.group_name,
        canManage: canManageThisGroup,
        people: groupPeople,
      });
    }

    if (isPrivileged) {
      const groupedPersonIds = new Set(personGroups.map(pg => pg.person_id));
      const ungrouped = people.filter(p => !groupedPersonIds.has(p.person_id)).map(p => ({
        person_id: p.person_id,
        full_name: p.full_name,
        mobile_number: p.mobile_number,
        status: attMap[p.person_id] || null,
      }));
      if (ungrouped.length > 0) {
        sections.push({ groupId: null, groupName: 'No Group', canManage: true, people: ungrouped });
      }
    }

    return NextResponse.json({ sections, date, occasion_id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

