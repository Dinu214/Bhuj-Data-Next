import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { withAdminAuth } from '@/lib/auth';

export const GET = withAdminAuth(async () => {
  try {
    const users = await pool.query(
      'SELECT id, username, display_name, role, created_at FROM app_users ORDER BY created_at DESC'
    );
    const [groupAccess, permAccess] = await Promise.all([
      pool.query(
        'SELECT uga.user_id, uga.group_id, g.group_name FROM user_group_access uga JOIN groups g ON g.group_id = uga.group_id'
      ),
      pool.query('SELECT user_id, permission FROM user_permissions'),
    ]);

    const grouped = groupAccess.rows.reduce<Record<number, { group_id: number; group_name: string }[]>>(
      (acc, row) => {
        if (!acc[row.user_id]) acc[row.user_id] = [];
        acc[row.user_id].push({ group_id: row.group_id, group_name: row.group_name });
        return acc;
      }, {}
    );
    const permsByUser = permAccess.rows.reduce<Record<number, string[]>>((acc, row) => {
      if (!acc[row.user_id]) acc[row.user_id] = [];
      acc[row.user_id].push(row.permission);
      return acc;
    }, {});

    return NextResponse.json(
      users.rows.map((u) => ({
        ...u,
        groups:      grouped[u.id] || [],
        permissions: permsByUser[u.id] || [],
      }))
    );
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (req: NextRequest) => {
  const { username, display_name, password, role, group_ids, permissions } =
    await req.json().catch(() => ({}));

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
  }
  if (!['admin', 'viewer_admin', 'user'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const cleanUser = String(username).trim().toLowerCase();
  if (cleanUser.length < 3) return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
  if (password.length < 4) return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO app_users (username, display_name, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, username, display_name, role',
      [cleanUser, display_name ? String(display_name).trim() : cleanUser, hash, role]
    );
    const newUser = result.rows[0];

    if (group_ids?.length > 0) {
      for (const gid of group_ids) {
        await pool.query(
          'INSERT INTO user_group_access (user_id, group_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [newUser.id, gid]
        );
      }
    }
    if (role === 'user' && permissions?.length > 0) {
      for (const perm of permissions) {
        await pool.query(
          'INSERT INTO user_permissions (user_id, permission) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [newUser.id, perm]
        );
      }
    }
    return NextResponse.json(newUser);
  } catch (err) {
    if ((err as any).code === '23505') {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
});
