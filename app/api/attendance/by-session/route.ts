import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth, JwtPayload, canManageGroup } from '@/lib/auth';

export const GET = withAuth(async (req: NextRequest, user: JwtPayload) => {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const occasion_id = searchParams.get('occasion_id');
  const group_id = searchParams.get('group_id');

  if (!date || !occasion_id || !group_id) {
    return NextResponse.json({ error: 'date, occasion_id, group_id required' }, { status: 400 });
  }

  const numGroupId = parseInt(group_id);
  if (!canManageGroup(user, numGroupId)) {
    return NextResponse.json({ error: 'Access denied to this group' }, { status: 403 });
  }

  try {
    const result = await pool.query(
      `SELECT ar.person_id, ar.status FROM attendance_records ar
       JOIN people p ON p.person_id = ar.person_id
       JOIN person_group pg ON pg.person_id = p.person_id
       WHERE ar.attendance_date = $1 AND ar.occasion_id = $2 AND pg.group_id = $3`,
      [date, occasion_id, numGroupId]
    );
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

