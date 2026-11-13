import { pool } from './db';
import { NextResponse } from 'next/server';

export interface IdempotencyRecord {
  key: string;
  org_id: number;
  user_id: number;
  endpoint: string;
  response_code: number;
  response_body: any;
  created_at: Date;
}

/**
 * Executes a handler with Idempotency-Key support.
 * If an Idempotency-Key header is provided:
 * 1. Checks if a record already exists for (org_id, key).
 *    - If found and matching, returns the cached response (JSON and status).
 * 2. If not found, executes the handler.
 * 3. Stores the resulting JSON response and status code in the database.
 * If no Idempotency-Key header is present, handler executes normally.
 */
export async function withIdempotency(
  req: Request,
  orgId: number,
  userId: number,
  endpoint: string,
  handler: () => Promise<unknown>
): Promise<unknown> {
  const idempotencyKey = req.headers.get('idempotency-key')?.trim();

  // If client did not provide an Idempotency-Key, execute normally
  if (!idempotencyKey) {
    return handler();
  }

  // Check for existing record within a 24-hour window
  const existing = await pool.query(
    `SELECT response_code, response_body 
     FROM idempotency_keys 
     WHERE org_id = $1 AND key = $2 AND created_at > now() - INTERVAL '24 hours'
     LIMIT 1`,
    [orgId, idempotencyKey]
  );

  if (existing.rows.length > 0) {
    const cached = existing.rows[0];
    return NextResponse.json(cached.response_body, {
      status: cached.response_code,
      headers: { 'X-Idempotent-Replay': 'true' }
    });
  }

  // Execute the underlying financial operation
  const result = await handler();

  let statusCode = 200;
  let bodyData: any = result ?? { ok: true };

  if (result instanceof Response) {
    statusCode = result.status;
    try {
      bodyData = await result.clone().json();
    } catch {
      bodyData = { ok: true };
    }
  }

  // Store in database (ignoring conflict if a concurrent request finished first)
  try {
    await pool.query(
      `INSERT INTO idempotency_keys (key, org_id, user_id, endpoint, response_code, response_body)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (org_id, key) DO NOTHING`,
      [idempotencyKey, orgId, userId, endpoint, statusCode, JSON.stringify(bodyData)]
    );
  } catch (err) {
    console.error('Failed to store idempotency record:', err);
  }

  return result;
}
