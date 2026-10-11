import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth, JwtPayload, hasPermission, canManageGroup, isAdminOrViewer } from '@/lib/auth';
import { cleanStr, cleanDate, cleanInt, cleanEnum } from '@/lib/sanitize';

export const GET = withAuth(async (_req: NextRequest, _user: JwtPayload) => {
  try {
    const result = await pool.query('SELECT * FROM people ORDER BY full_name');
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, user: JwtPayload) => {
  if (user.role === 'viewer_admin') {
    return NextResponse.json({ error: 'Viewer admin cannot modify people data' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = cleanStr(body.full_name);
  if (!name) return NextResponse.json({ error: 'Full name is required' }, { status: 400 });

  const canManage = user.role === 'admin' || hasPermission(user, 'people:manage');
  if (!canManage) {
    const accessible = (body.group_ids || []).filter((gid: number) => canManageGroup(user, gid));
    if (accessible.length === 0 && (body.group_ids || []).length > 0) {
      return NextResponse.json(
        { error: 'You do not have permission to add people to these groups' },
        { status: 403 }
      );
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO people (
        full_name, mobile_number, dob, category_id, photo_url, address, mobile_number_2,
        email, blood_group, is_ambrish, dixa_date, avd_code, aadhar_card_no,
        marital_status, anniversary_date, attended_mahotsav, education_qualification,
        running_education, occupation, job_business_details, reference_person,
        attending_sabha_since, hobby
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING *`,
      [
        name, cleanStr(body.mobile_number), cleanDate(body.dob), cleanInt(body.category_id),
        cleanStr(body.photo_url), cleanStr(body.address), cleanStr(body.mobile_number_2),
        cleanStr(body.email), cleanStr(body.blood_group), Boolean(body.is_ambrish),
        cleanDate(body.dixa_date), cleanStr(body.avd_code), cleanStr(body.aadhar_card_no),
        cleanEnum(body.marital_status, ['single','married','widowed']),
        cleanDate(body.anniversary_date), cleanStr(body.attended_mahotsav),
        cleanStr(body.education_qualification), cleanStr(body.running_education),
        cleanEnum(body.occupation, ['job','business','student','other']),
        cleanStr(body.job_business_details), cleanStr(body.reference_person),
        cleanStr(body.attending_sabha_since), cleanStr(body.hobby),
      ]
    );
    const newPerson = result.rows[0];
    if (Array.isArray(body.group_ids)) {
      for (const gid of body.group_ids) {
        const numId = cleanInt(gid);
        if (numId) {
          await client.query(
            'INSERT INTO person_group (person_id, group_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
            [newPerson.person_id, numId]
          );
        }
      }
    }
    await client.query('COMMIT');
    return NextResponse.json(newPerson);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  } finally {
    client.release();
  }
});

export const DELETE = withAuth(async (req: NextRequest, user: JwtPayload) => {
  if (user.role === 'viewer_admin') {
    return NextResponse.json({ error: 'Viewer admin cannot modify people data' }, { status: 403 });
  }
  const { id } = await req.json().catch(() => ({}));
  if (!id || isNaN(id)) return NextResponse.json({ error: 'Valid person ID required' }, { status: 400 });

  if (!isAdminOrViewer(user)) {
    const pgCheck = await pool.query('SELECT group_id FROM person_group WHERE person_id=$1', [id]);
    const hasAccess = pgCheck.rows.some((r) => canManageGroup(user, r.group_id));
    if (!hasAccess) return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  const client = await pool.connect();
  try {
    const check = await client.query('SELECT person_id FROM people WHERE person_id=$1', [id]);
    if (check.rows.length === 0) return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    await client.query('BEGIN');
    await client.query('DELETE FROM person_group WHERE person_id=$1', [id]);
    await client.query('DELETE FROM people WHERE person_id=$1', [id]);
    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  } finally {
    client.release();
  }
});
