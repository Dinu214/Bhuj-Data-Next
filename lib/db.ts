import { Pool, types } from 'pg';

// Return DATE columns as plain 'yyyy-mm-dd' strings instead of JS Date objects
// (avoids timezone-shift bugs, e.g. -1 day in IST UTC+5:30)
types.setTypeParser(1082, (val: string) => val);

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (connectionString) {
    return new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }

  return new Pool({
    user:     process.env.POSTGRES_USER || process.env.VITE_POSTGRES_USER,
    host:     process.env.POSTGRES_HOST || process.env.VITE_POSTGRES_HOST,
    database: process.env.POSTGRES_DATABASE || process.env.VITE_POSTGRES_DATABASE,
    password: process.env.POSTGRES_PASSWORD || process.env.VITE_POSTGRES_PASSWORD,
    port:     parseInt(process.env.POSTGRES_PORT || process.env.VITE_POSTGRES_PORT || '5432'),
    ssl:      { rejectUnauthorized: false },
    max:      10,
    idleTimeoutMillis:    30_000,
    connectionTimeoutMillis: 10_000,
  });
}

// In development Next.js hot-reloads modules, which would create a new Pool
// on every reload and exhaust DB connections. Cache on globalThis to prevent that.
const pool = globalThis._pgPool ?? createPool();
if (process.env.NODE_ENV !== 'production') globalThis._pgPool = pool;

export default pool;
