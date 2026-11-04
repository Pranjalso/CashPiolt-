import fs from 'fs';
import path from 'path';
import { Pool, PoolClient, QueryResultRow, types } from 'pg';

// If DATABASE_URL is not yet in process.env, parse it directly from .env
if (!process.env.DATABASE_URL) {
  try {
    const envPaths = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), 'server', '.env'),
      path.resolve(__dirname, '..', '..', '.env'),
    ];
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...vals] = trimmed.split('=');
            const k = key.trim();
            const v = vals.join('=').trim();
            if (!process.env[k]) {
              process.env[k] = v;
            }
          }
        }
        if (process.env.DATABASE_URL) break;
      }
    }
  } catch {}
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('CRITICAL: DATABASE_URL environment variable is missing or empty!');
}

types.setTypeParser(1082, v => v);            // DATE  -> 'YYYY-MM-DD'
types.setTypeParser(1700, v => parseFloat(v)); // NUMERIC -> number (money stored as NUMERIC(14,2))
types.setTypeParser(20, v => parseInt(v, 10)); // BIGINT -> number (ids, counts)

const g = globalThis as unknown as { __pgPool?: Pool };
export const pool = g.__pgPool ?? new Pool({
  connectionString: dbUrl,
  max: 10,
  ssl: dbUrl && dbUrl.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
});
if (process.env.NODE_ENV !== 'production') g.__pgPool = pool;

export async function query<T extends QueryResultRow = any>(sql: string, params: unknown[] = []) {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured in Vercel Environment Variables. Please set DATABASE_URL in Vercel project settings.');
  }
  return (await pool.query<T>(sql, params)).rows;
}
export async function one<T extends QueryResultRow = any>(sql: string, params: unknown[] = []) {
  return (await query<T>(sql, params))[0] ?? null;
}
export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured in Vercel Environment Variables. Please set DATABASE_URL in Vercel project settings.');
  }
  const c = await pool.connect();
  try { await c.query('BEGIN'); const r = await fn(c); await c.query('COMMIT'); return r; }
  catch (e) { await c.query('ROLLBACK'); throw e; }
  finally { c.release(); }
}
