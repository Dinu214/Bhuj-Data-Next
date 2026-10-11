import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth, withAdminOrViewerAuth } from '@/lib/auth';

export const GET = withAuth(async () => {
  try {
    const result = await pool.query('SELECT * FROM groups ORDER BY group_name');
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
});

export const POST = withAdminOrViewerAuth(async (req: NextRequest) => {
  const { group_name } = await req.json().catch(() => ({}));
  if (!group_name?.trim()) {
    return NextResponse.json({ error: 'Group name required' }, { status: 400 });
  }
  try {
    const result = await pool.query(
      'INSERT INTO groups (group_name) VALUES ($1) RETURNING *',
      [group_name.trim()]
    );
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    if ((err as any).code === '23505') {
      return NextResponse.json({ error: 'Group name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
});

export const PUT = withAdminOrViewerAuth(async (req: NextRequest) => {
  const { id, group_name } = await req.json().catch(() => ({}));
  try {
    await pool.query('UPDATE groups SET group_name=$1 WHERE group_id=$2', [group_name, id]);
    const result = await pool.query('SELECT * FROM groups ORDER BY group_name');
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
});

export const DELETE = withAdminOrViewerAuth(async (req: NextRequest) => {
  const { id } = await req.json().catch(() => ({}));
  try {
    await pool.query('DELETE FROM groups WHERE group_id=$1', [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
});
