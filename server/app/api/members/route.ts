import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { api } from '@/lib/api';
import { requireRole, HttpError } from '@/lib/auth';
import { query, one, tx } from '@/lib/db';
import { memberSchema } from '@/lib/validators';
export const dynamic = 'force-dynamic';
export const GET = api(async () => {
  const s = await requireRole('OWNER', 'ACCOUNTANT');
  return query(`SELECT u.id, u.name, u.email, u.phone, m.role FROM memberships m JOIN users u ON u.id=m.user_id
                 WHERE m.org_id=$1 ORDER BY m.role, u.name`, [s.orgId]);
});
/** Add a team member: links an existing user, or creates one (name + password required) */
export const POST = api(async req => {
  const s = await requireRole('OWNER');
  const d = memberSchema.parse(await req.json());
  return tx(async c => {
    let { rows: [u] } = await c.query(`SELECT id FROM users WHERE lower(email)=lower($1)`, [d.email]);
    if (!u) {
      if (!d.name || !d.password) throw new HttpError(400, 'New user: name and password (8+ chars) required');
      ({ rows: [u] } = await c.query(`INSERT INTO users(name,email,password_hash) VALUES ($1,lower($2),$3) RETURNING id`,
        [d.name, d.email, await bcrypt.hash(d.password, 10)]));
    }
    await c.query(`INSERT INTO memberships(org_id,user_id,role) VALUES ($1,$2,$3)
                   ON CONFLICT (org_id,user_id) DO UPDATE SET role=EXCLUDED.role`, [s.orgId, u.id, d.role]);
    return { ok: true, user_id: u.id };
  });
});
export const DELETE = api(async req => {
  const s = await requireRole('OWNER');
  const { user_id } = z.object({ user_id: z.coerce.number() }).parse(await req.json());
  if (user_id === s.uid) throw new HttpError(422, 'You cannot remove yourself');
  await one(`DELETE FROM memberships WHERE org_id=$1 AND user_id=$2`, [s.orgId, user_id]);
  return { ok: true };
});
