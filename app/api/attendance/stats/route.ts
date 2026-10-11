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
        COUNT(*) FILTER (WHERE ar.status='present') as present,
        COUNT(*) as total,
        ROUND(COUNT(*) FILTER (WHERE ar.status='present') * 100.0 / NULLIF(COUNT(*), 0), 0) as rate
      FROM attendance_records ar
      JOIN people p ON p.person_id = ar.person_id
      JOIN person_group pg ON pg.person_id = p.person_id
      ${user.role !== 'admin' && user.groupAccess?.length > 0 ? 'WHERE pg.group_id = ANY($1)' : ''}
      GROUP BY ar.attendance_date
      ORDER BY ar.attendance_date DESC
      LIMIT 8
    `, user.role !== 'admin' && user.groupAccess?.length > 0 ? [user.groupAccess] : []);

    return NextResponse.json({
      totalRecords: parseInt(totalQuery.rows[0]?.total || '0'),
      todayPresent: parseInt(todayQuery.rows[0]?.present || '0'),
      todayTotal: parseInt(todayQuery.rows[0]?.total || '0'),
      todayRate: todayQuery.rows[0]?.total > 0
        ? Math.round((todayQuery.rows[0].present / todayQuery.rows[0].total) * 100)
        : 0,
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

