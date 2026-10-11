import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth, withAdminOrViewerAuth, JwtPayload } from '@/lib/auth';

export const GET = withAuth(async () => {
  try {
    const result = await pool.query(
      `SELECT ao.*, u.display_name as created_by_name
       FROM attendance_occasions ao
       LEFT JOIN app_users u ON u.id = ao.created_by
       ORDER BY ao.created_at DESC`
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
});

export const POST = withAdminOrViewerAuth(async (req: NextRequest, user: JwtPayload) => {
  const { name, description } = await req.json().catch(() => ({}));
  if (!name?.trim()) return NextResponse.json({ error: 'Occasion name required' }, { status: 400 });
  try {
    const result = await pool.query(
      'INSERT INTO attendance_occasions (name, description, created_by) VALUES ($1,$2,$3) RETURNING *',
      [name.trim(), description || null, user.id]
    );
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    if ((err as any).code === '23505') {
      return NextResponse.json({ error: 'Occasion name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
});
