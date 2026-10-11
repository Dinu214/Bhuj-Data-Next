import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth, withAdminOrViewerAuth, JwtPayload } from '@/lib/auth';

export const GET = withAuth(async () => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY category_name');
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
});

export const POST = withAdminOrViewerAuth(async (req: NextRequest) => {
  const { category_name } = await req.json().catch(() => ({}));
  if (!category_name?.trim()) {
    return NextResponse.json({ error: 'Category name required' }, { status: 400 });
  }
  try {
    const result = await pool.query(
      'INSERT INTO categories (category_name) VALUES ($1) RETURNING *',
      [category_name.trim()]
    );
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
});

export const PUT = withAdminOrViewerAuth(async (req: NextRequest) => {
  const { id, category_name } = await req.json().catch(() => ({}));
  try {
    await pool.query('UPDATE categories SET category_name=$1 WHERE category_id=$2', [category_name, id]);
    const result = await pool.query('SELECT * FROM categories ORDER BY category_name');
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
});

export const DELETE = withAdminOrViewerAuth(async (req: NextRequest) => {
  const { id } = await req.json().catch(() => ({}));
  try {
    await pool.query('DELETE FROM categories WHERE category_id=$1', [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
});
