import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth, JwtPayload, canManageGroup } from '@/lib/auth';

export const GET = withAuth(async (req: NextRequest, user: JwtPayload) => {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const occasion_id = searchParams.get('occasion_id');
  const group_id = searchParams.get('group_id');

  const isAdmin = user.role === 'admin' || user.role === 'viewer_admin';

  if (!isAdmin && group_id) {
    if (!canManageGroup(user, parseInt(group_id))) {
      return NextResponse.json({ error: 'Access denied to this group' }, { status: 403 });
    }
  }

  try {
    let query = `
      SELECT ar.*, p.full_name, p.mobile_number, pg_mapping.group_id,
             g.group_name, ao.name as occasion_name, u.display_name as marked_by_name
      FROM attendance_records ar
      JOIN people p ON p.person_id = ar.person_id
      JOIN attendance_occasions ao ON ao.id = ar.occasion_id
      LEFT JOIN app_users u ON u.id = ar.marked_by_user_id
      LEFT JOIN person_group pg_mapping ON pg_mapping.person_id = p.person_id
      LEFT JOIN groups g ON g.group_id = pg_mapping.group_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (date) {
      params.push(date);
      query += ` AND ar.attendance_date = $${params.length}`;
    }
    if (occasion_id) {
      params.push(occasion_id);
      query += ` AND ar.occasion_id = $${params.length}`;
    }
    if (group_id) {
      params.push(group_id);
      query += ` AND pg_mapping.group_id = $${params.length}`;
    }

    if (!isAdmin && !group_id) {
      if (user.groupAccess && user.groupAccess.length > 0) {
        params.push(user.groupAccess);
        query += ` AND pg_mapping.group_id = ANY($${params.length})`;
      } else {
        return NextResponse.json([]);
      }
    }

    query += ' ORDER BY ar.attendance_date DESC, p.full_name';
    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

