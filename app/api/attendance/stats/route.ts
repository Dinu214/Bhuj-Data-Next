import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth, JwtPayload } from '@/lib/auth';

export const GET = withAuth(async (_req: NextRequest, user: JwtPayload) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    let groupFilter = '';
    const params: any[] = [today];

    if (user.role !== 'admin' && user.groupAccess?.length > 0) {
      params.push(user.groupAccess);
      groupFilter = `AND pg.group_id = ANY($${params.length})`;
    }

    const totalQuery = await pool.query(`
      SELECT COUNT(*) as total FROM attendance_records ar
      JOIN people p ON p.person_id = ar.person_id
      JOIN person_group pg ON pg.person_id = p.person_id
      WHERE 1=1 ${user.role !== 'admin' && user.groupAccess?.length > 0 ? `AND pg.group_id = ANY($1)` : ''}
    `, user.role !== 'admin' && user.groupAccess?.length > 0 ? [user.groupAccess] : []);

    const todayQuery = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status='present') as present,
        COUNT(*) as total
      FROM attendance_records ar
      JOIN people p ON p.person_id = ar.person_id
      JOIN person_group pg ON pg.person_id = p.person_id
      WHERE ar.attendance_date = $1 ${groupFilter}
    `, params);

    const byGroupQuery = await pool.query(`
      SELECT g.group_name, g.group_id,
        COUNT(*) FILTER (WHERE ar.status='present') as present,
        COUNT(*) as total,
        ROUND(COUNT(*) FILTER (WHERE ar.status='present') * 100.0 / NULLIF(COUNT(*), 0), 1) as rate
      FROM groups g
      JOIN person_group pg ON pg.group_id = g.group_id
      JOIN people p ON p.person_id = pg.person_id
      LEFT JOIN attendance_records ar ON ar.person_id = p.person_id AND ar.attendance_date = $1
      ${user.role !== 'admin' && user.groupAccess?.length > 0 ? 'WHERE g.group_id = ANY($2)' : ''}
      GROUP BY g.group_id, g.group_name
      ORDER BY rate DESC NULLS LAST
    `, user.role !== 'admin' && user.groupAccess?.length > 0 ? [today, user.groupAccess] : [today]);

    const historyQuery = await pool.query(`
      SELECT 
        ar.attendance_date,
        COUNT(DISTINCT ar.person_id) FILTER (WHERE ar.status='present') as present,
        COUNT(DISTINCT ar.person_id) as total,
        ROUND(COUNT(DISTINCT ar.person_id) FILTER (WHERE ar.status='present') * 100.0 / NULLIF(COUNT(DISTINCT ar.person_id), 0), 0) as rate
      FROM attendance_records ar
      JOIN people p ON p.person_id = ar.person_id
      ${user.role !== 'admin' && user.groupAccess?.length > 0 ? 'JOIN person_group pg ON pg.person_id = p.person_id WHERE pg.group_id = ANY($1)' : ''}
      GROUP BY ar.attendance_date
      ORDER BY ar.attendance_date DESC
      LIMIT 8
    `, user.role !== 'admin' && user.groupAccess?.length > 0 ? [user.groupAccess] : []);

    // Query total eligible people count
    const totalPeopleQuery = await pool.query(`
      SELECT COUNT(DISTINCT p.person_id) as total_people
      FROM people p
      ${user.role !== 'admin' && user.groupAccess?.length > 0 ? 'JOIN person_group pg ON pg.person_id = p.person_id WHERE pg.group_id = ANY($1)' : ''}
    `, user.role !== 'admin' && user.groupAccess?.length > 0 ? [user.groupAccess] : []);
    const totalEligiblePeople = parseInt(totalPeopleQuery.rows[0]?.total_people || '0') || 1;

    const lastSessionQuery = await pool.query(`
      SELECT 
        ar.attendance_date::text as attendance_date,
        ao.name as occasion_name,
        COUNT(DISTINCT ar.person_id) FILTER (WHERE ar.status='present') as present
      FROM attendance_records ar
      JOIN attendance_occasions ao ON ao.id = ar.occasion_id
      JOIN people p ON p.person_id = ar.person_id
      ${user.role !== 'admin' && user.groupAccess?.length > 0 ? 'JOIN person_group pg ON pg.person_id = p.person_id WHERE pg.group_id = ANY($2) AND' : 'WHERE'} ar.attendance_date != $1
      GROUP BY ar.attendance_date, ao.id, ao.name
      ORDER BY ar.attendance_date DESC, present DESC
      LIMIT 1
    `, user.role !== 'admin' && user.groupAccess?.length > 0 ? [today, user.groupAccess] : [today]);

    const lastRow = lastSessionQuery.rows[0];
    const lastPresent = parseInt(lastRow?.present || '0');
    const lastAttendance = lastRow ? {
      attendance_date: lastRow.attendance_date,
      occasion_name: lastRow.occasion_name,
      present: lastPresent,
      total: totalEligiblePeople,
      rate: Math.round((lastPresent / totalEligiblePeople) * 100),
    } : null;

    const todayPresentCount = parseInt(todayQuery.rows[0]?.present || '0');

    return NextResponse.json({
      totalRecords: parseInt(totalQuery.rows[0]?.total || '0'),
      todayPresent: todayPresentCount,
      todayTotal: totalEligiblePeople,
      todayRate: Math.round((todayPresentCount / totalEligiblePeople) * 100),
      lastAttendance,
      byGroup: byGroupQuery.rows.map(r => ({
        group_id: r.group_id,
        group_name: r.group_name,
        present: parseInt(r.present || '0'),
        total: parseInt(r.total || '0'),
        rate: parseFloat(r.rate || '0'),
      })),
      history: historyQuery.rows.map(r => ({
        attendance_date: r.attendance_date,
        present: parseInt(r.present || '0'),
        total: parseInt(r.total || '0'),
        rate: parseFloat(r.rate || '0'),
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

