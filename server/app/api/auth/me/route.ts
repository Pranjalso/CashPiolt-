import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
export const dynamic = 'force-dynamic';
export const GET = api(async () => {
  const s = await requireRole();
  const businesses = await query(`SELECT o.id, o.name, o.business_type, o.currency, m.role FROM memberships m
                                   JOIN organizations o ON o.id=m.org_id WHERE m.user_id=$1 ORDER BY o.name`, [s.uid]);
  return { user: { id: s.uid, name: s.name, email: s.email }, role: s.role, business: businesses.find(b => b.id === s.orgId), businesses };
});
