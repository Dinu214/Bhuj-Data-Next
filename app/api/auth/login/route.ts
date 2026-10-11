import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { signToken, setAuthCookie } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';
import { runMigrations } from '@/lib/migrations';

export async function POST(req: NextRequest) {
  await runMigrations();

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!checkRateLimit(ip).allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again in 15 minutes.' },
      { status: 429 }
    );
  }

  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
  }

  try {
    const cleanUser = String(username).trim();
    const result = await pool.query('SELECT * FROM app_users WHERE LOWER(username) = LOWER($1)', [cleanUser]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const dbUser = result.rows[0];
    const valid = await bcrypt.compare(password, dbUser.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const [groupResult, permResult] = await Promise.all([
      pool.query('SELECT group_id FROM user_group_access WHERE user_id = $1', [dbUser.id]),
      pool.query('SELECT permission FROM user_permissions WHERE user_id = $1', [dbUser.id]),
    ]);

    const groupAccess: number[] = groupResult.rows.map((r) => r.group_id);
    const permissions: string[] =
      dbUser.role === 'admin' || dbUser.role === 'viewer_admin'
        ? []
        : permResult.rows.map((r) => r.permission);

    const payload = {
      id:          dbUser.id,
      username:    dbUser.username,
      displayName: dbUser.display_name,
      role:        dbUser.role,
      groupAccess,
      permissions,
    };

    const token = signToken(payload);
    const res = NextResponse.json({ user: payload });
    setAuthCookie(res, token);
    return res;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
