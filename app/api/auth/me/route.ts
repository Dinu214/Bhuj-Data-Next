import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth, JwtPayload } from '@/lib/auth';

export const GET = withAuth(async (_req: NextRequest, user: JwtPayload) => {
  try {
    const result = await pool.query(
      'SELECT id, username, display_name, role FROM app_users WHERE id = $1',
      [user.id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [groupResult, permResult] = await Promise.all([
      pool.query('SELECT group_id FROM user_group_access WHERE user_id = $1', [user.id]),
      pool.query('SELECT permission FROM user_permissions WHERE user_id = $1', [user.id]),
    ]);

    const u = result.rows[0];
    const permissions: string[] =
      u.role === 'admin' || u.role === 'viewer_admin'
        ? []
        : permResult.rows.map((r) => r.permission);

    return NextResponse.json({
      id:          u.id,
      username:    u.username,
      displayName: u.display_name,
      role:        u.role,
      groupAccess: groupResult.rows.map((r) => r.group_id),
      permissions,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
});
