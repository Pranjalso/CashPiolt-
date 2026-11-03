// Edge-safe JWT helpers — same token works as web cookie and mobile Bearer token
import { SignJWT, jwtVerify } from 'jose';

export type Role = 'OWNER' | 'ACCOUNTANT' | 'EMPLOYEE' | 'VIEWER';
export type Session = { uid: number; name: string; email: string; orgId: number; role: Role };
export const COOKIE = 'cf_session';

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'dev-only-secret-change-me-please-32ch');

export const signSession = (s: Session) =>
  new SignJWT({ ...s }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(secret());

export async function verifySession(token?: string | null): Promise<Session | null> {
  if (!token) return null;
  try { return (await jwtVerify(token, secret())).payload as unknown as Session; } catch { return null; }
}

/** Token from "Authorization: Bearer …" (mobile) or the session cookie (web) */
export function tokenFrom(authHeader: string | null, cookie?: string) {
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return cookie;
}
