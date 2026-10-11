import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAdminOrViewerAuth } from '@/lib/auth';

export const PUT = withAdminOrViewerAuth(async (req: NextRequest, _user, ctx) => {
  const id = ctx?.params?.id;
  const { name, description } = await req.json().catch(() => ({}));
  if (!name?.trim()) return NextResponse.json({ error: 'Occasion name required' }, { status: 400 });

  try {
    const result = await pool.query(
      'UPDATE attendance_occasions SET name=$1, description=$2 WHERE id=$3 RETURNING *',
      [name.trim(), description || null, id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Occasion not found' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return NextResponse.json({ error: 'Occasion name already exists' }, { status: 409 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

export const DELETE = withAdminOrViewerAuth(async (_req: NextRequest, _user, ctx) => {
  const id = ctx?.params?.id;
  try {
    await pool.query('DELETE FROM attendance_occasions WHERE id=$1', [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

