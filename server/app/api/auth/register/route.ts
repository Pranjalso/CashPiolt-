import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { tx } from '@/lib/db';
import { COOKIE, signSession } from '@/lib/session';
import { registerSchema } from '@/lib/validators';
import { api } from '@/lib/api';

/** Sign up = new user + first business (with categories for its business type) */
export const POST = api(async req => {
  const d = registerSchema.parse(await req.json());
  const out = await tx(async c => {
    const { rows: [u] } = await c.query(`INSERT INTO users(name,email,phone,password_hash) VALUES ($1,lower($2),$3,$4) RETURNING id,name,email`,
      [d.name, d.email, d.phone, await bcrypt.hash(d.password, 10)]);
    const { rows: [{ id }] } = await c.query(`SELECT create_business($1,$2,$3) AS id`, [d.business_name, d.business_type, u.id]);
    return { u, orgId: id };
  });
  const token = await signSession({ uid: out.u.id, name: out.u.name, email: out.u.email, orgId: out.orgId, role: 'OWNER' });
  const res = NextResponse.json({ token, user: out.u, business: { id: out.orgId, name: d.business_name, role: 'OWNER' } });
  res.cookies.set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 30 * 86400 });
  return res;
});
