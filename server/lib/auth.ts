import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE, Role, Session, tokenFrom, verifySession } from './session';
import { one } from './db';

export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }

export async function getSession(): Promise<Session | null> {
  const s = await verifySession(tokenFrom(headers().get('authorization'), cookies().get(COOKIE)?.value));
  if (!s) return null;
  // role is re-read from DB so revoked / changed access applies immediately
  const m = await one(`SELECT m.role FROM memberships m JOIN users u ON u.id=m.user_id
                        WHERE m.org_id=$1 AND m.user_id=$2 AND u.active`, [s.orgId, s.uid]);
  return m ? { ...s, role: m.role } : null;
}

export async function requirePage(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect('/login');
  return s;
}

/** API guard. No roles = any member of the current business. */
export async function requireRole(...roles: Role[]): Promise<Session> {
  const s = await getSession();
  if (!s) throw new HttpError(401, 'Not authenticated');
  if (roles.length && !roles.includes(s.role)) throw new HttpError(403, 'Your role cannot do this');
  return s;
}

export const FINANCE: Role[] = ['OWNER', 'ACCOUNTANT'];          // write cash book
export const READERS: Role[] = ['OWNER', 'ACCOUNTANT', 'VIEWER'];  // see financials (not employees)
