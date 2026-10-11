import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth, JwtPayload } from '@/lib/auth';
import { runMigrations } from '@/lib/migrations';

export const GET = withAuth(async (_req: NextRequest, _user: JwtPayload) => {
  await runMigrations();
  try {
    const [cats, grps, ppl, pgs] = await Promise.all([
      pool.query('SELECT * FROM categories ORDER BY category_name'),
      pool.query('SELECT * FROM groups ORDER BY group_name'),
      pool.query('SELECT * FROM people ORDER BY full_name'),
      pool.query('SELECT * FROM person_group'),
    ]);
    return NextResponse.json({
      categories:   cats.rows,
      groups:       grps.rows,
      people:       ppl.rows,
      personGroups: pgs.rows,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
});
