import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { withAdminAuth, JwtPayload } from '@/lib/auth';

export const PUT = withAdminAuth(async (req: NextRequest, _user: JwtPayload, ctx) => {
  const id = ctx?.params?.id;
  const { display_name, password, role, group_ids, permissions } =
    await req.json().catch(() => ({}));
  try {
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE app_users SET display_name=$1, role=$2, password_hash=$3 WHERE id=$4',
        [display_name, role, hash, id]
      );
    } else {
      await pool.query('UPDATE app_users SET display_name=$1, role=$2 WHERE id=$3', [display_name, role, id]);
    }

    if (group_ids !== undefined) {
      await pool.query('DELETE FROM user_group_access WHERE user_id=$1', [id]);
      for (const gid of group_ids) {
        await pool.query(
          'INSERT INTO user_group_access (user_id, group_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [id, gid]
        );
      }
    }

    if (permissions !== undefined) {
      await pool.query('DELETE FROM user_permissions WHERE user_id=$1', [id]);
      if (role === 'user' && permissions.length > 0) {
        for (const perm of permissions) {
          await pool.query(
            'INSERT INTO user_permissions (user_id, permission) VALUES ($1,$2) ON CONFLICT DO NOTHING',
            [id, perm]
          );
        }
      }
    }

    const updated = await pool.query(
      'SELECT id, username, display_name, role FROM app_users WHERE id=$1',
      [id]
    );
    return NextResponse.json(updated.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
});

export const DELETE = withAdminAuth(async (_req: NextRequest, user: JwtPayload, ctx) => {
  const id = ctx?.params?.id;
  if (parseInt(id!) === user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE attendance_records SET marked_by_user_id = NULL WHERE marked_by_user_id = $1', [id]);
    await client.query('UPDATE attendance_occasions SET created_by = NULL WHERE created_by = $1', [id]);
    await client.query('DELETE FROM app_users WHERE id = $1', [id]);
    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  } finally {
    client.release();
  }
});
