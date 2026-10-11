import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth, JwtPayload, hasPermission, canManageGroup } from '@/lib/auth';

export const POST = withAuth(async (req: NextRequest, user: JwtPayload) => {
  const body = await req.json().catch(() => ({}));
  const { date, occasion_id, group_id, records } = body;

  const isAdmin = user.role === 'admin' || user.role === 'viewer_admin';
  const canManage = isAdmin || hasPermission(user, 'attendance:manage') || (group_id && canManageGroup(user, group_id));

  if (!canManage) {
    return NextResponse.json(
      { error: 'Access denied: You do not have permission to mark attendance for this group' },
      { status: 403 }
    );
  }

  if (!date || !occasion_id || !Array.isArray(records)) {
    return NextResponse.json({ error: 'date, occasion_id, and records[] are required' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const rec of records) {
      if (!rec.person_id || !rec.status) continue;
      await client.query(
        `INSERT INTO attendance_records (person_id, occasion_id, attendance_date, status, marked_by_user_id)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (person_id, occasion_id, attendance_date)
         DO UPDATE SET status=$4, marked_by_user_id=$5`,
        [rec.person_id, occasion_id, date, rec.status, user.id]
      );
    }
    await client.query('COMMIT');
    return NextResponse.json({ success: true, saved: records.length });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
});

