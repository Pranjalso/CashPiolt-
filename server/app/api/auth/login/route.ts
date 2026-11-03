import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { one, query } from '@/lib/db';
import { COOKIE, signSession } from '@/lib/session';
import { rateLimit, getClientIp } from '@/lib/ratelimit';

/** Web: sets cookie. Mobile: use the returned `token` as "Authorization: Bearer <token>". */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const p = z.object({
    email: z.string().email(),
    password: z.string().min(1),
    org_id: z.number().optional()
  }).safeParse(await req.json().catch(() => ({})));

  if (!p.success) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  // Account-level brute force protection (by email)
  const accountLimiter = rateLimit(`account_login:${p.data.email.toLowerCase()}`, 10, 60_000); // 10 attempts/min per email
  if (!accountLimiter.success) {
    return NextResponse.json(
      { error: 'Account temporarily locked due to excessive failed attempts. Please wait 1 minute.' },
      { status: 429 }
    );
  }

  const u = await one(`SELECT * FROM users WHERE lower(email)=lower($1) AND active`, [p.data.email]);
  if (!u || !(await bcrypt.compare(p.data.password, u.password_hash))) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const orgs = await query(
    `SELECT o.id, o.name, o.business_type, m.role FROM memberships m JOIN organizations o ON o.id=m.org_id
     WHERE m.user_id=$1 ORDER BY o.name`,
    [u.id]
  );
  if (!orgs.length) {
    return NextResponse.json({ error: 'You are not a member of any business' }, { status: 403 });
  }

  const org = orgs.find(o => o.id === p.data.org_id) ?? orgs.find(o => o.id === u.last_org_id) ?? orgs[0];
  const token = await signSession({ uid: u.id, name: u.name, email: u.email, orgId: org.id, role: org.role });
  const res = NextResponse.json({
    token,
    user: { id: u.id, name: u.name, email: u.email },
    business: org,
    businesses: orgs,
  });

  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 30 * 86400,
  });
  return res;
}
