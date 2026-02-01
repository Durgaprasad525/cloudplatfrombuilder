import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://gpucloud:gpucloud_secret@localhost:5432/gpucloud';

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'test' && duration > 100) {
    console.warn(`Slow query (${duration}ms):`, text.substring(0, 80));
  }
  return result;
}

export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

export async function healthCheck(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT 1');
    return result.rowCount === 1;
  } catch {
    return false;
  }
}
