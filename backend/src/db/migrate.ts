/**
 * Run database migrations - creates schema from schema.sql
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { pool } from './client';

export async function runMigrations(): Promise<void> {
  const fromDist = join(__dirname, 'schema.sql');
  const fromSrc = join(__dirname, '..', '..', 'src', 'db', 'schema.sql');
  const schemaPath = existsSync(fromDist) ? fromDist : fromSrc;
  const schema = readFileSync(schemaPath, 'utf-8');
  try {
    await pool.query(schema);
    console.log('Migration completed successfully.');
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
    if (code === '42P07') {
      console.log('Schema already applied (index/relation exists), skipping.');
      return;
    }
    throw err;
  }
}


