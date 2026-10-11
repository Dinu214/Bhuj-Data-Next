import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth, JwtPayload, hasPermission } from '@/lib/auth';
import { cleanStr, cleanDate, cleanInt, cleanEnum } from '@/lib/sanitize';

export const PUT = withAuth(async (req: NextRequest, user: JwtPayload, ctx) => {
  if (user.role === 'viewer_admin') {
    return NextResponse.json({ error: 'Viewer admin cannot modify people data' }, { status: 403 });
  }

  const id = cleanInt(ctx?.params?.id);
  if (!id) return NextResponse.json({ error: 'Valid person ID is required' }, { status: 400 });

  const canManage = user.role === 'admin' || hasPermission(user, 'people:manage');
  if (!canManage) {
    return NextResponse.json(
      { error: 'You do not have permission to edit people.' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT * FROM people WHERE person_id=$1', [id]);
    if (current.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }
    const p = current.rows[0];

    const maritalStatus = cleanEnum(body.marital_status, ['single','married','widowed']);
    const anniversaryDate = maritalStatus === 'married' ? cleanDate(body.anniversary_date) : null;

    const result = await client.query(
      `UPDATE people SET
        full_name=$1, mobile_number=$2, dob=$3, category_id=$4, photo_url=$5,
        address=$6, mobile_number_2=$7, email=$8, blood_group=$9, is_ambrish=$10,
        dixa_date=$11, avd_code=$12, aadhar_card_no=$13, marital_status=$14,
        anniversary_date=$15, attended_mahotsav=$16, education_qualification=$17,
        running_education=$18, occupation=$19, job_business_details=$20,
        reference_person=$21, attending_sabha_since=$22, hobby=$23
      WHERE person_id=$24 RETURNING *`,
      [
        cleanStr(body.full_name) || p.full_name,
        cleanStr(body.mobile_number), cleanDate(body.dob), cleanInt(body.category_id),
        cleanStr(body.photo_url), cleanStr(body.address), cleanStr(body.mobile_number_2),
        cleanStr(body.email), cleanStr(body.blood_group), Boolean(body.is_ambrish),
        cleanDate(body.dixa_date), cleanStr(body.avd_code), cleanStr(body.aadhar_card_no),
        maritalStatus,
        anniversaryDate, cleanStr(body.attended_mahotsav),
        cleanStr(body.education_qualification), cleanStr(body.running_education),
        cleanEnum(body.occupation, ['job','business','student','other']),
        cleanStr(body.job_business_details), cleanStr(body.reference_person),
        cleanStr(body.attending_sabha_since), cleanStr(body.hobby),
        id,
      ]
    );

    if (Array.isArray(body.group_ids)) {
      await client.query('DELETE FROM person_group WHERE person_id=$1', [id]);
      for (const gid of body.group_ids) {
        const numId = cleanInt(gid);
        if (numId) {
          await client.query(
            'INSERT INTO person_group (person_id, group_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
            [id, numId]
          );
        }
      }
    }

    await client.query('COMMIT');
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  } finally {
    client.release();
  }
});
