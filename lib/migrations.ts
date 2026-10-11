import pool from './db';
import bcrypt from 'bcryptjs';

let migrationRan = false;

export async function runMigrations(): Promise<void> {
  if (migrationRan) return;
  migrationRan = true;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE people
      ADD COLUMN IF NOT EXISTS photo_url              VARCHAR(500),
      ADD COLUMN IF NOT EXISTS address                TEXT,
      ADD COLUMN IF NOT EXISTS mobile_number_2        VARCHAR(20),
      ADD COLUMN IF NOT EXISTS email                  VARCHAR(100),
      ADD COLUMN IF NOT EXISTS blood_group            VARCHAR(10),
      ADD COLUMN IF NOT EXISTS is_ambrish             BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS dixa_date              DATE,
      ADD COLUMN IF NOT EXISTS avd_code               VARCHAR(50),
      ADD COLUMN IF NOT EXISTS aadhar_card_no         VARCHAR(20),
      ADD COLUMN IF NOT EXISTS marital_status         VARCHAR(20) CHECK (marital_status IN ('single','married','widowed')),
      ADD COLUMN IF NOT EXISTS anniversary_date       DATE,
      ADD COLUMN IF NOT EXISTS attended_mahotsav      TEXT,
      ADD COLUMN IF NOT EXISTS education_qualification VARCHAR(200),
      ADD COLUMN IF NOT EXISTS running_education      VARCHAR(200),
      ADD COLUMN IF NOT EXISTS occupation             VARCHAR(20) CHECK (occupation IN ('job','business','student','other')),
      ADD COLUMN IF NOT EXISTS job_business_details   VARCHAR(300),
      ADD COLUMN IF NOT EXISTS reference_person       VARCHAR(100),
      ADD COLUMN IF NOT EXISTS attending_sabha_since  VARCHAR(100),
      ADD COLUMN IF NOT EXISTS hobby                  TEXT
    `);

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='people' AND column_name='attending_sabha_since' AND data_type='date'
        ) THEN
          ALTER TABLE people ALTER COLUMN attending_sabha_since TYPE VARCHAR(100) USING attending_sabha_since::VARCHAR;
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id            SERIAL PRIMARY KEY,
        username      VARCHAR(50) UNIQUE NOT NULL,
        display_name  VARCHAR(100),
        password_hash VARCHAR(255) NOT NULL,
        role          VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin','viewer_admin','user')),
        created_at    TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_group_access (
        user_id  INT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
        group_id INT NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, group_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_occasions (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_by  INT REFERENCES app_users(id),
        created_at  TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id                SERIAL PRIMARY KEY,
        person_id         INT NOT NULL REFERENCES people(person_id) ON DELETE CASCADE,
        occasion_id       INT NOT NULL REFERENCES attendance_occasions(id) ON DELETE CASCADE,
        attendance_date   DATE NOT NULL,
        status            VARCHAR(20) NOT NULL DEFAULT 'absent' CHECK (status IN ('present','absent','leave')),
        marked_by_user_id INT REFERENCES app_users(id),
        created_at        TIMESTAMP DEFAULT NOW(),
        UNIQUE(person_id, occasion_id, attendance_date)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        user_id    INT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
        permission VARCHAR(60) NOT NULL,
        PRIMARY KEY (user_id, permission)
      )
    `);

    const { rows } = await client.query(
      `SELECT COUNT(*) FROM app_users WHERE role IN ('admin','viewer_admin')`
    );
    if (parseInt(rows[0].count) === 0) {
      const [h1, h2, h3] = await Promise.all([
        bcrypt.hash('Admin@123', 10),
        bcrypt.hash('Admin@456', 10),
        bcrypt.hash('Viewer@789', 10),
      ]);
      await client.query(
        `INSERT INTO app_users (username, display_name, password_hash, role)
         VALUES ($1,$2,$3,$4),($5,$6,$7,$8),($9,$10,$11,$12)
         ON CONFLICT (username) DO NOTHING`,
        ['admin1','Administrator 1',h1,'admin','admin2','Administrator 2',h2,'admin','viewer1','Data Viewer',h3,'viewer_admin']
      );
    }

    await client.query('COMMIT');
    console.log('✅ Migrations complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', (err as Error).message);
  } finally {
    client.release();
  }

  const idx = await pool.connect();
  try {
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_people_full_name       ON people(full_name)`,
      `CREATE INDEX IF NOT EXISTS idx_people_category_id     ON people(category_id)`,
      `CREATE INDEX IF NOT EXISTS idx_person_group_person_id ON person_group(person_id)`,
      `CREATE INDEX IF NOT EXISTS idx_person_group_group_id  ON person_group(group_id)`,
      `CREATE INDEX IF NOT EXISTS idx_att_records_date       ON attendance_records(attendance_date)`,
      `CREATE INDEX IF NOT EXISTS idx_att_records_occasion   ON attendance_records(occasion_id)`,
      `CREATE INDEX IF NOT EXISTS idx_att_records_person     ON attendance_records(person_id)`,
      `CREATE INDEX IF NOT EXISTS idx_att_composite          ON attendance_records(attendance_date, occasion_id)`,
    ];
    for (const sql of indexes) await idx.query(sql).catch(() => {});
  } finally {
    idx.release();
  }
}
